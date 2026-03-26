'use strict';

// ===== file: ui/window.js =====

const { Gtk, Gdk, GLib, Gio } = imports.gi;
const { ChatView }  = imports.ui.chat_view;
const { TwitchIRC } = imports.services.twitch_irc;

// ── Optional: gtk4-layer-shell ─────────────────────────────────────────────
//
// gtk4-layer-shell gives the window a real Wayland layer-shell surface:
// it will be anchored to the right edge of the screen, always visible above
// all normal application windows, and will not steal focus.
//
// Without it the app still works — it's just a normal window.
// Install on most distros: `sudo dnf install gtk4-layer-shell` (Fedora)
//                          `sudo apt install libgtk4-layer-shell0` (Ubuntu 24+)
//
let LayerShell = null;
try {
    LayerShell = imports.gi.Gtk4LayerShell;
    log('[window] gtk4-layer-shell detected — using Wayland layer surface');
} catch (_e) {
    log('[window] gtk4-layer-shell not found — window will behave normally');
}

const WINDOW_WIDTH = 400;

// Window background opacity levels — the CSS class is applied directly on
// the ApplicationWindow widget so the compositor surface colour changes.
const WIN_BG_LEVELS = [
    { name: 'Nenhum', cssClass: null           },
    { name: 'Leve',   cssClass: 'win-bg-low'   },
    { name: 'Médio',  cssClass: 'win-bg-medium' },
    { name: 'Escuro', cssClass: 'win-bg-high'  },
];
const WIN_BG_DEFAULT = 0; // Nenhum (totalmente transparente)

// CSS used as a last-resort fallback when styles.css cannot be found on disk.
const FALLBACK_CSS = `
window, .csd, decoration { background-color: transparent; box-shadow: none; }
.overlay-root, scrolledwindow, viewport { background-color: transparent; }
.chat-message { background-color: transparent; padding: 2px 6px;
                opacity: 0; transition: opacity 280ms ease-in-out; }
.chat-message.visible { opacity: 1; }
label { color: #f0f0f0;
        text-shadow: 1px 1px 2px rgba(0,0,0,.95), 0 0 6px rgba(0,0,0,.8); }
`;

/**
 * Cosmic Twitch Chat overlay window.
 *
 * Wraps a Gtk.ApplicationWindow, wires it to the ChatView and TwitchIRC
 * service, and handles keyboard shortcuts and compositor-level hints.
 */
var CosmicTwitchChatWindow = class CosmicTwitchChatWindow {
    /**
     * @param {{ application: Gtk.Application, channel: string }} params
     */
    constructor({ application, channel }) {
        this._app     = application;
        this._channel = channel;
        this._chat    = new ChatView();
        this._irc     = null;

        this._win = new Gtk.ApplicationWindow({
            application,
            title:          `Twitch — #${channel}`,
            default_width:  WINDOW_WIDTH,
            default_height: 600,
            decorated:      false,
            resizable:      true,
        });

        this._loadCSS();
        this._buildLayout();
        this._applyLayerShell();
        this._bindShortcuts();
        this._startIRC();
        this._bgIndex = WIN_BG_DEFAULT;
    }

    present() {
        this._win.present();
    }

    // ── private ────────────────────────────────────────────────────────────────

    _loadCSS() {
        const provider = new Gtk.CssProvider();
        const cssPath  = GLib.build_filenamev([
            GLib.get_current_dir(), 'ui', 'styles.css',
        ]);

        try {
            provider.load_from_path(cssPath);
        } catch (_e) {
            log('[window] styles.css not found on disk — applying fallback CSS');
            this._loadCSSString(provider, FALLBACK_CSS);
        }

        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
    }

    /** Load a CSS string into a provider, handling GTK 4.x API variance. */
    _loadCSSString(provider, css) {
        try {
            // GTK 4.12+
            provider.load_from_string(css);
        } catch (_e) {
            // Pre-4.12 fallback
            provider.load_from_data(css, css.length);
        }
    }

    _buildLayout() {
        const root = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['overlay-root'],
            vexpand:     true,
            hexpand:     true,
        });

        // ── Control bar ────────────────────────────────────────────────
        const bar = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            css_classes: ['control-bar'],
            spacing:     6,
            hexpand:     true,
        });

        bar.append(new Gtk.Label({
            label:   `#${this._channel}`,
            hexpand: true,
            xalign:  0.0,
        }));

        this._bgBtn = new Gtk.Button({ label: 'BG: Nenhum' });
        this._bgBtn.connect('clicked', () => this._cycleBg());
        bar.append(this._bgBtn);

        root.append(bar);
        root.append(this._chat.widget);
        this._win.set_child(root);
    }

    /** Cycle the window background opacity and update the button label. */
    _cycleBg() {
        const prev = WIN_BG_LEVELS[this._bgIndex];
        if (prev.cssClass) this._win.remove_css_class(prev.cssClass);

        this._bgIndex = (this._bgIndex + 1) % WIN_BG_LEVELS.length;

        const next = WIN_BG_LEVELS[this._bgIndex];
        if (next.cssClass) this._win.add_css_class(next.cssClass);

        this._bgBtn.set_label(`BG: ${next.name}`);
    }

    _applyLayerShell() {
        if (!LayerShell) return;
        try {
            LayerShell.init_for_window(this._win);
            LayerShell.set_layer(this._win,     LayerShell.Layer.OVERLAY);
            // Anchor to right edge, full vertical stretch
            LayerShell.set_anchor(this._win,    LayerShell.Edge.RIGHT,  true);
            LayerShell.set_anchor(this._win,    LayerShell.Edge.TOP,    true);
            LayerShell.set_anchor(this._win,    LayerShell.Edge.BOTTOM, true);
            // 12 px gap from the screen edge
            LayerShell.set_margin(this._win,    LayerShell.Edge.RIGHT,  12);
            // Don't reserve space — other windows draw under this overlay
            LayerShell.set_exclusive_zone(this._win, 0);
            LayerShell.set_namespace(this._win, 'cosmic-twitch-chat');
        } catch (e) {
            logError(e, '[window] LayerShell setup failed — falling back to normal window');
        }
    }

    _bindShortcuts() {
        const add = (name, accels, fn) => {
            const action = new Gio.SimpleAction({ name });
            action.connect('activate', fn);
            this._app.add_action(action);
            this._app.set_accels_for_action(`app.${name}`, accels);
        };

        // ESC → quit the app
        add('quit',       ['Escape'],            () => this._app.quit());
        // Ctrl+Shift+C → wipe the chat history
        add('clear-chat', ['<Control><Shift>c'], () => this._chat.clear());
        // Ctrl+B → cycle window background opacity
        add('cycle-bg',   ['<Control>b'],        () => this._cycleBg());
    }

    _startIRC() {
        this._irc = new TwitchIRC(
            this._channel,
            (msg) => this._chat.addMessage(msg),
            ()    => log(`[IRC] joined #${this._channel}`),
        );
        this._irc.connect();

        // Clean up the WebSocket when the window is closed
        this._win.connect('destroy', () => {
            if (this._irc) {
                this._irc.disconnect();
                this._irc = null;
            }
        });
    }
};
