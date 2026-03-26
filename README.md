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

**Optional dependency** — native Wayland overlay (anchors to the right edge of the screen, always above other windows, never stealing focus):

```bash
# Ubuntu 24.04+
sudo apt install libgtk4-layer-shell0 gir1.2-gtk4layershell-0.1

# Fedora / COSMIC OS
sudo dnf install gtk4-layer-shell

# Arch
sudo pacman -S gtk4-layer-shell
```

> Without `gtk4-layer-shell` the app still works as a normal window — just position it manually over your game.

### 2. Clone the repository

```bash
git clone https://github.com/felipejesus-front/twitch-chat-overlay-wayland.git
cd cosmic-twitch-chat
```

### 3. Run

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

## Wayland notes

- **Transparency** works automatically on any RGBA compositor (COSMIC, Mutter, KWin Wayland).  
  If you see a black background, make sure transparency is enabled in your compositor and confirm you're on Wayland: `echo $XDG_SESSION_TYPE`
- **Always-on-top** is not guaranteed via standard GTK APIs on Wayland. With `gtk4-layer-shell` installed, the window uses a real layer-shell surface and stays above all other windows without stealing focus.
- **XWayland / X11** is also supported — use your window manager's "always on top" feature.

---

## Future improvements

- [ ] Emote support (BetterTTV / FFZ / 7TV)
- [ ] Subscriber, moderator and broadcaster badges
- [ ] Click-through — mouse events pass through to the app underneath
- [ ] Config file (font size, opacity, width, channel)
- [ ] Multi-channel with tabs
- [ ] Username mention highlighting
