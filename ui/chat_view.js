'use strict';

// ===== file: ui/chat_view.js =====

const { Gtk, GLib, Pango } = imports.gi;

const MAX_MESSAGES = 50;

// Accessible, visually distinct palette for username colouring
const USERNAME_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D',
    '#C77DFF', '#80FFDB', '#FF9F1C', '#A8DADC', '#E9C46A',
    '#FFB4A2', '#52D9D9', '#FF6F61', '#B5EAD7', '#F4A261',
];

/**
 * Deterministic color assignment: same username always gets the same color.
 * @param {string} name
 * @returns {string} CSS hex color
 */
function userColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++)
        h = Math.imul(31, h) + name.charCodeAt(i) | 0;
    return USERNAME_COLORS[Math.abs(h) % USERNAME_COLORS.length];
}

/**
 * Escape characters that are special in Pango markup.
 * @param {string} s
 * @returns {string}
 */
function escMarkup(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Scrollable, auto-growing chat message list.
 *
 * Messages stack from top to bottom (newest at bottom).
 * Old messages are evicted once MAX_MESSAGES is reached.
 * Each new message fades in via a CSS transition.
 */
var ChatView = class ChatView {
    constructor() {
        this._rows = [];
        this._build();
    }

    /** The root GTK widget — attach this to your window. */
    get widget() {
        return this._scroll;
    }

    /**
     * Append a chat message and scroll to it.
     * @param {{ username: string, message: string }} msg
     */
    addMessage({ username, message }) {
        const row = this._makeRow(username, message);
        this._box.append(row);
        this._rows.push(row);

        // Evict oldest messages when over the cap
        while (this._rows.length > MAX_MESSAGES) {
            this._box.remove(this._rows.shift());
        }

        // Trigger CSS fade-in: add .visible on the next idle pass so the
        // initial opacity:0 state is actually rendered first.
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            row.add_css_class('visible');
            return GLib.SOURCE_REMOVE;
        });

        // Scroll to bottom on a subsequent (lower-priority) pass so the
        // layout has been updated with the new row height.
        GLib.idle_add(GLib.PRIORITY_LOW, () => {
            const adj = this._scroll.get_vadjustment();
            adj.set_value(adj.get_upper() - adj.get_page_size());
            return GLib.SOURCE_REMOVE;
        });
    }

    /** Remove every message from the view. */
    clear() {
        for (const row of this._rows)
            this._box.remove(row);
        this._rows = [];
    }

    // ── private ────────────────────────────────────────────────────────────────

    _build() {
        this._scroll = new Gtk.ScrolledWindow({
            vexpand:             true,
            hexpand:             true,
            hscrollbar_policy:   Gtk.PolicyType.NEVER,
            vscrollbar_policy:   Gtk.PolicyType.EXTERNAL,
        });

        // valign: END makes the box "stick" to the bottom when there are
        // fewer messages than the viewport height.
        this._box = new Gtk.Box({
            orientation:  Gtk.Orientation.VERTICAL,
            spacing:      3,
            valign:       Gtk.Align.END,
            vexpand:      true,
            margin_start: 8,
            margin_end:   8,
            margin_top:   6,
            margin_bottom: 6,
        });

        this._scroll.set_child(this._box);
    }

    _makeRow(username, message) {
        const color  = userColor(username);
        const markup =
            `<span weight="bold" foreground="${color}">${escMarkup(username)}</span>` +
            `  <span foreground="#f0f0f0">${escMarkup(message)}</span>`;

        const label = new Gtk.Label({
            label:       markup,
            use_markup:  true,
            wrap:        true,
            wrap_mode:   Pango.WrapMode.WORD_CHAR,
            xalign:      0.0,
            selectable:  false,
            hexpand:     true,
        });

        const row = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            css_classes: ['chat-message'],
        });
        row.append(label);
        return row;
    }
};
