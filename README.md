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
> In this mode, keyboard shortcuts (Esc, Ctrl+B, Ctrl+Shift+C) **will work** because the window receives focus.

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

### Alternative: Install system-wide

Instead of running from the project directory, you can install the app globally:

#### Method A: Via make install
```bash
sudo make install      # installs to /usr/share and /usr/bin
cosmic-twitch-chat --set-channel gaules   # save default channel
cosmic-twitch-chat     # run with saved channel
```

#### Method B: Via .deb package
```bash
make deb               # generates build/cosmic-twitch-chat_1.0.0_all.deb
sudo dpkg -i build/cosmic-twitch-chat_1.0.0_all.deb
```

Once installed, the app appears in your COSMIC launcher as **"Cosmic Twitch Chat"**.

#### Method C: Set a default channel
```bash
# Save channel for later
gjs main.js --set-channel gaules

# Run without arguments — it uses the saved channel
gjs main.js
```

Default channel is stored in `~/.config/cosmic-twitch-chat/channel`.

#### Uninstall
```bash
sudo make uninstall    # if installed via make install
# or
sudo dpkg -r cosmic-twitch-chat   # if installed via deb
```

### Closing the overlay

Since the chat is transparent and click-through (mouse events pass to the game), keyboard shortcuts don't work while it has focus.

**How to close:**

- Via command line:
  ```bash
  gjs main.js --quit    # terminates the running instance
  ```

- In terminal:
  ```bash
  Ctrl+C    # stops the process
  ```

- Custom COSMIC shortcut:
  - Open **COSMIC Settings → Keyboard → Shortcuts**
  - Click **+** to add custom shortcut
  - Set **Command** to: `gjs /usr/share/cosmic-twitch-chat/main.js --quit`
  - Bind to (e.g.) **Ctrl+Shift+Esc**

### Keyboard shortcuts (legacy)

If you're running in **non-overlay mode** (without gtk4-layer-shell or with a modified setup), keyboard shortcuts work:

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
- [ ] Config file (font size, opacity, width, channel)
- [ ] Multi-channel with tabs
- [ ] Username mention highlighting
- [ ] Edit mode toggle — temporarily make window moveable & focusable for repositioning

---

## Build & Packaging

### Requirements

- `gjs` (GNOME JavaScript runtime)
- `gir1.2-gtk-4.0` and `gir1.2-soup-3.0` (GObject Introspection bindings)
- `make` (to build the package)
- `dpkg-deb` (to generate .deb package; comes with `dpkg`)

All are lightweight text/script tools — no compilation needed.

### Makefile targets

```bash
make install              # Install globally to /usr/share and /usr/bin
make uninstall            # Remove system-wide installation
make deb                  # Generate .deb package in build/
make clean                # Remove build/ directory
```

### Custom version in .deb

```bash
make deb VERSION=2.0.0    # Generates cosmic-twitch-chat_2.0.0_all.deb
```

### For distribution maintainers

The package declares:
- **Depends:** `gjs`, `gir1.2-gtk-4.0`, `gir1.2-soup-3.0`
- **Recommends:** `gtk4-layer-shell` (optional but highly recommended)
- **Architecture:** `all` (script-based, runs on any system with GJS/GTK4)

All files are placed under `/usr/share/cosmic-twitch-chat/` with a simple bash wrapper at `/usr/bin/cosmic-twitch-chat`.

---

## Technical Details (v1.x changes)

### Key improvements

#### `main.js` — auto-preload mechanism & CLI features
- **Auto-preload:** Detects if gtk4-layer-shell is available and re-executes with `LD_PRELOAD` set before GTK connects to Wayland.
- **Multi-path search:** Looks for the library in standard locations: `/usr/local/lib/...`, `/usr/lib/...`, `/usr/lib64/...`
- **`--quit` flag:** Reads PID from `~/.cache/cosmic-twitch-chat/pid` and sends `kill` signal to the running instance.
- **`--set-channel` flag:** Saves channel name to `~/.config/cosmic-twitch-chat/channel` for future runs without arguments.
- **PID file:** Automatically written by the app at startup and cleaned on shutdown (SIGTERM/SIGINT handlers).

#### `ui/window.js` — initialization order & keyboard mode
- **Init order fix:** `_applyLayerShell()` now runs **before** `_buildLayout()`, as the layer-shell spec requires.
- **Keyboard mode:** Added `LayerShell.set_keyboard_mode(..., ON_DEMAND)` — with the default `NONE` mode, overlay windows silently dropped all keyboard events, breaking shortcuts like `Esc`, `Ctrl+B`, `Ctrl+Shift+C`.
- **Visual indicator:** Shows `⚠ Overlay OFF` in the control bar if the lib is not found, with a tooltip explaining what to install.

#### Mouse & Keyboard input
- **Click-through:** The window uses an empty `cairo.Region()` for input handling, allowing all mouse clicks to pass through to the underlying window (your game).
- **Keyboard mode:** Set to `KeyboardMode.NONE` — the overlay cannot receive keyboard or mouse input by design (this prevents interfering with gameplay).
- **Closing:** Use `gjs main.js --quit` (or a custom COSMIC keyboard shortcut) to terminate the app without window focus.

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
