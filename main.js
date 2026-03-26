#!/usr/bin/env gjs
'use strict';

// ===== file: main.js =====

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
