# Cosmic Twitch Chat

> **VibeCoded project** — built with vibes, AI and love for Linux.

🌐 [Versão em Português](README_pt.md)

---

## What is this?

Ever wanted to watch your Twitch chat while gaming — without alt-tabbing, opening a browser, or sacrificing screen real estate?

**Cosmic Twitch Chat** solves exactly that.

It's a native Linux (Wayland) overlay that displays a Twitch channel's chat **on top of your game**, with a transparent background, no browser, no Electron, no bloat. Messages appear in real time while you play, without interfering with your gameplay.

Built with GJS + GTK4, it connects directly to Twitch IRC over WebSocket — lightweight, fast, and with no account or OAuth token required.

### Features

- **Transparent overlay** — chat floats above any window
- **Adjustable background** — toolbar button cycles through 4 opacity levels for the window background (`Ctrl+B`)
- **Per-message background** — each message has its own semi-transparent dark backdrop for readability
- **Real-time** — Twitch IRC via WebSocket, no polling
- **Anonymous** — no login, no OAuth, read-only
- **Auto-reconnect** — silently recovers dropped connections
- **Coloured usernames** — each user gets a consistent, deterministic colour
- **Smooth fade-in** — messages animate in on arrival
- **Message cap** — keeps the last 50 messages; older ones are evicted automatically

---

## Installation & usage

### 1. Install dependencies

```bash
sudo apt install gjs gir1.2-gtk-4.0 gir1.2-soup-3.0 glib-networking
```

### 2. Install or build gtk4-layer-shell (optional but recommended)

**gtk4-layer-shell** enables native Wayland overlay mode: the chat window anchors to the screen edge, stays **always on top**, and never steals focus.

#### For Fedora / COSMIC (DNF)
```bash
sudo dnf install gtk4-layer-shell
```

#### For Arch
```bash
sudo pacman -S gtk4-layer-shell
```

#### For Ubuntu 24.04+ (if available in your mirror)
```bash
sudo add-apt-repository universe
sudo apt update
sudo apt install libgtk4-layer-shell0 gir1.2-gtk4layershell-0.1
```

#### For Pop!_OS 24.04 or if packages are unavailable
Pop!_OS mirrors don't include the package — compile from source:

```bash
# Install build dependencies
sudo apt install -y meson ninja-build gobject-introspection libwayland-dev \
  wayland-protocols libgtk-4-dev valac git

# Clone and build
cd /tmp
git clone --depth=1 https://github.com/wmww/gtk4-layer-shell.git
cd gtk4-layer-shell
meson setup build -Dexamples=false -Ddocs=false -Dtests=false
ninja -C build
sudo ninja -C build install
sudo ldconfig

# Fix GJS symbol lookup (connect installer lib to systemwide repos)
sudo ln -sf /usr/local/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib \
  /usr/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib
```

> **Without gtk4-layer-shell:** the app still works as a normal window — just position it manually over your game. If the lib is not found, the window shows a `⚠ Overlay OFF` indicator.

### 3. Clone the repository

```bash
git clone https://github.com/felipejesus-front/twitch-chat-overlay-wayland.git
cd cosmic-twitch-chat
```

### 4. Run

```bash
gjs main.js <channel>
```

Examples:
```bash
gjs main.js gaules
gjs main.js '#gaules'   # with or without # — both work
```

> **Important:** always run from the project root directory.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Quit the app |
| `Ctrl`+`Shift`+`C` | Clear chat |
| `Ctrl`+`B` | Cycle window background opacity |

---

## Project structure

```
cosmic-twitch-chat/
├── main.js                 Entry point — arg validation, GTK Application
├── ui/
│   ├── window.js           Window, control bar, shortcuts, IRC wiring
│   ├── chat_view.js        Scrollable message list widget
│   └── styles.css          Overlay stylesheet
├── services/
│   └── twitch_irc.js       WebSocket IRC client with auto-reconnect
└── utils/
    └── parser.js           Raw IRC line parser
```

---

## Wayland Overlay Mode (gtk4-layer-shell)

### How it works

When **gtk4-layer-shell** is installed, the app automatically:

1. **Auto-preloads the library** — `main.js` detects the lib and re-executes itself with `LD_PRELOAD` set, ensuring the intercept happens before GTK connects to the Wayland compositor.
2. **Creates a layer-shell surface** — instead of a normal window, the app uses the Wayland `wl-layer-shell` protocol to request an `OVERLAY` layer.
3. **Anchors to the screen edge** — positioned `12px` from the right edge, full vertical stretch, always on top.
4. **Enables keyboard mode** — configured to `ON_DEMAND` so keyboard shortcuts (`Esc`, `Ctrl+B`, `Ctrl+Shift+C`) work in overlay mode.

### Troubleshooting

- **No `⚠ Overlay OFF` warning** — lib is installed and active.
- **`⚠ Overlay OFF` shown** — gtk4-layer-shell not found. Install it (see section 2).
- **Transparency** works automatically on any RGBA compositor (COSMIC, Mutter, KWin Wayland).  
  If you see a black background, make sure transparency is enabled in your compositor: `echo $XDG_SESSION_TYPE` should return `wayland`.
- **XWayland / X11** — also supported without gtk4-layer-shell; use your window manager's "always on top" feature.

---

## Future improvements

- [ ] Emote support (BetterTTV / FFZ / 7TV)
- [ ] Subscriber, moderator and broadcaster badges
- [ ] Click-through — mouse events pass through to the app underneath
- [ ] Config file (font size, opacity, width, channel)
- [ ] Multi-channel with tabs
- [ ] Username mention highlighting

---

## Technical Details (v1.x changes)

### Key improvements

#### `main.js` — auto-preload mechanism
- **Problem:** gtk4-layer-shell must intercept the Wayland `wl_registry_add_listener` call, but GJS loads the typelib too late (after GTK already connects).
- **Solution:** At startup, `main.js` detects if the lib is available and re-executes itself with `LD_PRELOAD=/usr/local/lib/x86_64-linux-gnu/libgtk4-layer-shell.so`. A sentinel variable `_COSMIC_PRELOADED=1` prevents infinite recursion.
- **Result:** `gjs main.js channel` now works out-of-the-box without manual `LD_PRELOAD`.

#### `ui/window.js` — initialization order & keyboard mode
- **Init order fix:** `_applyLayerShell()` now runs **before** `_buildLayout()`, as the layer-shell spec requires.
- **Keyboard mode:** Added `LayerShell.set_keyboard_mode(..., ON_DEMAND)` — with the default `NONE` mode, overlay windows silently dropped all keyboard events, breaking shortcuts like `Esc`, `Ctrl+B`, `Ctrl+Shift+C`.
- **Visual indicator:** Shows `⚠ Overlay OFF` in the control bar if the lib is not found, with a tooltip explaining what to install.

#### Window positioning
- Anchors to the **right edge** of the screen with a 12px margin (customizable via `LayerShell.set_margin()`).
- Stretches **full height** (top + bottom anchors enabled).
- Stays on the **OVERLAY layer** — always above other windows, cannot be covered.

### Debugging

If overlay mode isn't working:

```bash
# Check if you're on Wayland
echo $XDG_SESSION_TYPE

# Check if the lib is accessible
ls /usr/local/lib/x86_64-linux-gnu/libgtk4-layer-shell.so
ls /usr/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib

# Run with verbose logging
gjs main.js <channel> 2>&1 | grep -i layer
```
