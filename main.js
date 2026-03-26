#!/usr/bin/env gjs
'use strict';

// ===== file: main.js =====

// ── --quit: encerra a instância em execução (deve rodar ANTES do auto-preload)
{
    if (ARGV.includes('--quit')) {
        const _GLib = imports.gi.GLib;
        const _pidDir  = _GLib.build_filenamev([_GLib.get_user_cache_dir(), 'cosmic-twitch-chat']);
        const _pidFile = _GLib.build_filenamev([_pidDir, 'pid']);
        try {
            const [ok, data] = _GLib.file_get_contents(_pidFile);
            if (ok) {
                const pid = imports.byteArray.toString(data).trim();
                _GLib.spawn_command_line_sync(`kill ${pid}`);
                print(`Cosmic Twitch Chat (PID ${pid}) encerrado.`);
            }
        } catch (_) {
            printerr('Nenhuma instância em execução encontrada.');
            imports.system.exit(1);
        }
        imports.system.exit(0);
    }
}

// ── --set-channel: salva canal padrão em ~/.config ────────────────────────────
{
    if (ARGV[0] === '--set-channel') {
        const _GLib = imports.gi.GLib;
        const name  = (ARGV[1] || '').replace(/^#/, '').toLowerCase().trim();
        if (!name || !/^[a-zA-Z0-9_]{1,25}$/.test(name)) {
            printerr('Usage: cosmic-twitch-chat --set-channel <channel>');
            imports.system.exit(1);
        }
        const _dir = _GLib.build_filenamev([
            _GLib.get_user_config_dir(), 'cosmic-twitch-chat',
        ]);
        _GLib.mkdir_with_parents(_dir, 0o755);
        _GLib.file_set_contents(
            _GLib.build_filenamev([_dir, 'channel']), name,
        );
        print(`Canal padrão definido: ${name}`);
        imports.system.exit(0);
    }
}

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
    const _PRELOAD_SEARCH = [
        '/usr/local/lib/x86_64-linux-gnu/libgtk4-layer-shell.so',
        '/usr/lib/x86_64-linux-gnu/libgtk4-layer-shell.so',
        '/usr/lib64/libgtk4-layer-shell.so',
        '/usr/lib/libgtk4-layer-shell.so',
    ];
    const PRELOAD = _PRELOAD_SEARCH.find(p => _GLib.file_test(p, _GLib.FileTest.EXISTS));

    if (!_GLib.getenv('_COSMIC_PRELOADED') && PRELOAD) {

        let env = _GLib.get_environ();
        env = _GLib.environ_setenv(env, 'LD_PRELOAD',        PRELOAD, true);
        env = _GLib.environ_setenv(env, '_COSMIC_PRELOADED', '1',     true);

        const script = _GLib.build_filenamev([_GLib.get_current_dir(), 'main.js']);
        try {
            const [ok, childPid] = _GLib.spawn_async(
                _GLib.get_current_dir(),
                ['gjs', script, ...ARGV],
                env,
                _GLib.SpawnFlags.SEARCH_PATH  |
                _GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null,
            );
            if (ok && childPid) {
                // Escreve o PID do filho: é ele que roda de verdade
                _GLib.mkdir_with_parents(
                    _GLib.build_filenamev([_GLib.get_user_cache_dir(), 'cosmic-twitch-chat']),
                    0o755,
                );
                _GLib.file_set_contents(
                    _GLib.build_filenamev([_GLib.get_user_cache_dir(), 'cosmic-twitch-chat', 'pid']),
                    `${childPid}`,
                );
            }
        } catch (_e) { /* falhou — continua sem preload */ }
        imports.system.exit(0);
    }
}

// ── GI version constraints — must be set before any imports ──────────────────
imports.gi.versions.Gtk  = '4.0';
imports.gi.versions.Gdk  = '4.0';
imports.gi.versions.Soup = '3.0';

const { GLib, Gtk, Gio } = imports.gi;

// ── PID file helpers ──────────────────────────────────────────────────────────
const PID_DIR  = GLib.build_filenamev([GLib.get_user_cache_dir(), 'cosmic-twitch-chat']);
const PID_FILE = GLib.build_filenamev([PID_DIR, 'pid']);

function _writePid() {
    GLib.mkdir_with_parents(PID_DIR, 0o755);
    try {
        const [, data] = GLib.file_get_contents('/proc/self/stat');
        const pid = imports.byteArray.toString(data).split(' ')[0];
        GLib.file_set_contents(PID_FILE, pid);
    } catch (_) { /* melhor esforço */ }
}

function _removePid() {
    try { GLib.unlink(PID_FILE); } catch (_) { /* ok */ }
}

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

let rawChannel = ARGV[0];

if (!rawChannel) {
    const _cfgPath = GLib.build_filenamev([
        GLib.get_user_config_dir(), 'cosmic-twitch-chat', 'channel',
    ]);
    try {
        const [ok, data] = GLib.file_get_contents(_cfgPath);
        if (ok) rawChannel = imports.byteArray.toString(data).trim();
    } catch (_) { /* sem config */ }
}

if (!rawChannel) {
    printerr('Usage:   cosmic-twitch-chat <channel>');
    printerr('         cosmic-twitch-chat --set-channel <channel>');
    printerr('Example: cosmic-twitch-chat gaules');
    imports.system.exit(1);
}

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
    _writePid();
    const win = new CosmicTwitchChatWindow({ application: app, channel });
    win.present();
});

// Encerra limpo ao receber SIGTERM (kill) ou SIGINT (Ctrl+C)
// GLibUnix é a API moderna (GLib ≥ 2.78); fallback para GLib.unix_signal_add
let _GLibUnix = null;
try { _GLibUnix = imports.gi.GLibUnix; } catch (_) { /* não disponível */ }

function _onSignal(signum, callback) {
    if (_GLibUnix)
        _GLibUnix.signal_add_full(GLib.PRIORITY_DEFAULT, signum, callback);
    else
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signum, callback);
}

_onSignal(15 /* SIGTERM */, () => {
    log('[main] SIGTERM recebido — encerrando...');
    _removePid();
    app.quit();
    return GLib.SOURCE_REMOVE;
});
_onSignal(2 /* SIGINT */, () => {
    log('[main] SIGINT recebido — encerrando...');
    _removePid();
    app.quit();
    return GLib.SOURCE_REMOVE;
});

// Remove PID file ao sair normalmente
app.connect('shutdown', () => _removePid());

// app.run() blocks until the application exits; its return value is the
// POSIX exit code.
imports.system.exit(app.run([]));