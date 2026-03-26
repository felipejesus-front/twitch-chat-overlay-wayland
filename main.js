#!/usr/bin/env gjs
'use strict';

// ===== file: main.js =====

// ── gtk4-layer-shell auto-preload ─────────────────────────────────────────────
//
// gtk4-layer-shell intercepta wl_display_connect via LD_PRELOAD, o que deve
// ocorrer ANTES de qualquer conexão GTK/Wayland.  Em GJS a typelib é carregada
// tarde demais, então se o preload ainda não estiver ativo o processo se
// re-executa com LD_PRELOAD configurado.  O sentinel _COSMIC_PRELOADED evita
// loop infinito.
{
    const _GLib   = imports.gi.GLib;
    // A lib principal deve ser precarregada — não o wrapper — para que ela
    // intercepte wl_registry_add_listener antes que GTK faça a conexão Wayland.
    const PRELOAD = '/usr/local/lib/x86_64-linux-gnu/libgtk4-layer-shell.so';

    if (!_GLib.getenv('_COSMIC_PRELOADED') &&
        _GLib.file_test(PRELOAD, _GLib.FileTest.EXISTS)) {

        let env = _GLib.get_environ();
        env = _GLib.environ_setenv(env, 'LD_PRELOAD',        PRELOAD, true);
        env = _GLib.environ_setenv(env, '_COSMIC_PRELOADED', '1',     true);

        const script = _GLib.build_filenamev([_GLib.get_current_dir(), 'main.js']);
        try {
            _GLib.spawn_async(
                _GLib.get_current_dir(),
                ['gjs', script, ...ARGV],
                env,
                _GLib.SpawnFlags.SEARCH_PATH,
                null,
            );
        } catch (_e) { /* falhou — continua sem preload */ }
        imports.system.exit(0);
    }
}

// ── GI version constraints — must be set before any imports ──────────────────
imports.gi.versions.Gtk  = '4.0';
imports.gi.versions.Gdk  = '4.0';
imports.gi.versions.Soup = '3.0';

const { GLib, Gtk, Gio } = imports.gi;

// ── Module search path ────────────────────────────────────────────────────────
//
// All sub-modules (ui/, services/, utils/) are resolved relative to the
// *current working directory*, so always run this script from the project root:
//
//   cd /path/to/cosmic-twitch-chat
//   gjs main.js gaules
//
imports.searchPath.unshift(GLib.get_current_dir());

const { CosmicTwitchChatWindow } = imports.ui.window;

// ── CLI argument validation ───────────────────────────────────────────────────

if (ARGV.length < 1) {
    printerr('Usage:   gjs main.js <channel>');
    printerr('Example: gjs main.js gaules');
    imports.system.exit(1);
}

const rawChannel = ARGV[0];

// Strip a leading '#' so both "gaules" and "#gaules" are accepted.
const channel = rawChannel.replace(/^#/, '').toLowerCase().trim();

if (!/^[a-zA-Z0-9_]{1,25}$/.test(channel)) {
    printerr(`Error: "${rawChannel}" is not a valid Twitch channel name.`);
    printerr('Channel names are 1–25 characters: letters, digits, underscores.');
    imports.system.exit(1);
}

// ── GTK application ───────────────────────────────────────────────────────────

const app = new Gtk.Application({
    application_id: 'dev.cosmic.twitch-chat',
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect('activate', () => {
    const win = new CosmicTwitchChatWindow({ application: app, channel });
    win.present();
});

// app.run() blocks until the application exits; its return value is the
// POSIX exit code.
imports.system.exit(app.run([]));
