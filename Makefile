APP_ID   = dev.cosmic.twitch-chat
VERSION ?= 1.0.0
PREFIX  ?= /usr
DESTDIR ?=

APP_DIR  = $(PREFIX)/share/cosmic-twitch-chat
BIN_DIR  = $(PREFIX)/bin
DESK_DIR = $(PREFIX)/share/applications

.PHONY: install uninstall deb clean

# ── install ────────────────────────────────────────────────────────────────────

install:
	install -d "$(DESTDIR)$(APP_DIR)" "$(DESTDIR)$(APP_DIR)/ui" \
	           "$(DESTDIR)$(APP_DIR)/services" "$(DESTDIR)$(APP_DIR)/utils"
	install -m 644 main.js "$(DESTDIR)$(APP_DIR)/"
	install -m 644 ui/window.js ui/chat_view.js ui/styles.css "$(DESTDIR)$(APP_DIR)/ui/"
	install -m 644 services/twitch_irc.js "$(DESTDIR)$(APP_DIR)/services/"
	install -m 644 utils/parser.js "$(DESTDIR)$(APP_DIR)/utils/"
	install -d "$(DESTDIR)$(BIN_DIR)"
	printf '#!/bin/bash\ncd "$(APP_DIR)" || exit 1\nexec gjs main.js "$$@"\n' \
	  > "$(DESTDIR)$(BIN_DIR)/cosmic-twitch-chat"
	chmod 755 "$(DESTDIR)$(BIN_DIR)/cosmic-twitch-chat"
	install -d "$(DESTDIR)$(DESK_DIR)"
	install -m 644 cosmic-twitch-chat.desktop "$(DESTDIR)$(DESK_DIR)/"

# ── uninstall ──────────────────────────────────────────────────────────────────

uninstall:
	rm -rf "$(DESTDIR)$(APP_DIR)"
	rm -f  "$(DESTDIR)$(BIN_DIR)/cosmic-twitch-chat"
	rm -f  "$(DESTDIR)$(DESK_DIR)/cosmic-twitch-chat.desktop"

# ── deb package ────────────────────────────────────────────────────────────────

deb: clean
	$(MAKE) install DESTDIR=build/deb PREFIX=/usr
	mkdir -p build/deb/DEBIAN
	printf '%s\n' \
	  'Package: cosmic-twitch-chat' \
	  'Version: $(VERSION)' \
	  'Section: net' \
	  'Priority: optional' \
	  'Architecture: all' \
	  'Depends: gjs, gir1.2-gtk-4.0, gir1.2-soup-3.0' \
	  'Recommends: gtk4-layer-shell' \
	  'Homepage: https://github.com/felipejesus-front/twitch-chat-overlay-wayland' \
	  'Maintainer: Felipe Jesus' \
	  'Description: Transparent Twitch chat overlay for Wayland' \
	  ' Native GJS/GTK4 overlay that displays Twitch chat on top of' \
	  ' any application. Designed for Wayland compositors with' \
	  ' gtk4-layer-shell support (COSMIC, Sway, Hyprland).' \
	  > build/deb/DEBIAN/control
	dpkg-deb --root-owner-group --build build/deb "build/cosmic-twitch-chat_$(VERSION)_all.deb"
	@echo ""
	@echo "  => build/cosmic-twitch-chat_$(VERSION)_all.deb"

# ── clean ──────────────────────────────────────────────────────────────────────

clean:
	rm -rf build/
