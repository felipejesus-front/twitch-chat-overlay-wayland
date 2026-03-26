'use strict';

// ===== file: services/twitch_irc.js =====

const { GLib, Soup } = imports.gi;
const { parseIRCMessage } = imports.utils.parser;

// Trailing slash is required — libsoup 3 sends a malformed HTTP request
// line when the URI has no path component (GET  HTTP/1.1 instead of GET / …)
const WS_URL        = 'wss://irc-ws.chat.twitch.tv:443/';
const ANON_NICK     = 'justinfan12345'; // Anonymous read-only nick (no OAuth needed)
const RECONNECT_MS  = 5000;

/**
 * Twitch IRC-over-WebSocket client.
 *
 * Connects anonymously (read-only) and fires onMessage for every PRIVMSG
 * received in the joined channel.  Auto-reconnects on unexpected disconnects.
 */
var TwitchIRC = class TwitchIRC {
    /**
     * @param {string}   channel
     * @param {(msg: { username: string, message: string }) => void} onMessage
     * @param {() => void} [onConnect]
     */
    constructor(channel, onMessage, onConnect = () => {}) {
        this._channel   = channel;
        this._onMessage = onMessage;
        this._onConnect = onConnect;
        this._session   = null;
        this._ws        = null;
        this._alive     = false;
        this._timerId   = null;
    }

    /** Open the WebSocket connection and start listening. */
    connect() {
        this._alive   = true;
        this._session = new Soup.Session();
        this._openWS();
    }

    /** Permanently shut down — no further reconnect attempts. */
    disconnect() {
        this._alive = false;
        this._cancelTimer();
        this._closeWS();
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }

    // ── private ────────────────────────────────────────────────────────────────

    _openWS() {
        // Soup.Message.new() normalises the URI and ensures a valid HTTP
        // request line (GET / HTTP/1.1) even when no explicit path is given.
        let msg;
        try {
            msg = Soup.Message.new('GET', WS_URL);
        } catch (e) {
            logError(e, '[TwitchIRC] failed to create WebSocket message');
            this._scheduleReconnect();
            return;
        }

        this._session.websocket_connect_async(
            msg,
            null,                  // origin — libsoup will omit the header (Twitch accepts both)
            [],                    // no subprotocols required for IRC
            GLib.PRIORITY_DEFAULT,
            null,                  // cancellable
            (src, result) => {
                try {
                    this._ws = this._session.websocket_connect_finish(result);
                    this._wire();
                } catch (e) {
                    logError(e, '[TwitchIRC] WebSocket connection error');
                    this._scheduleReconnect();
                }
            }
        );
    }

    _wire() {
        // Receive incoming frames
        this._ws.connect('message', (_c, type, bytes) => {
            if (type !== Soup.WebsocketDataType.TEXT) return;
            const text = this._decode(bytes);
            for (const line of text.split('\r\n')) {
                if (line.trim()) this._handle(line);
            }
        });

        // Handle close
        this._ws.connect('closed', () => {
            log('[TwitchIRC] connection closed');
            this._ws = null;
            this._scheduleReconnect();
        });

        // Log errors (closed signal will also fire, triggering reconnect)
        this._ws.connect('error', (_c, err) => {
            logError(err, '[TwitchIRC] socket error');
        });

        // IRC handshake — anonymous, no OAuth token needed for read-only
        this._send(`PASS oauth:anonymous`);
        this._send(`NICK ${ANON_NICK}`);
        this._send(`JOIN #${this._channel}`);

        this._onConnect();
    }

    _handle(raw) {
        const msg = parseIRCMessage(raw);
        if (!msg) return;

        switch (msg.type) {
        case 'PING':
            this._send(`PONG :${msg.server}`);
            break;
        case 'PRIVMSG':
            this._onMessage({ username: msg.username, message: msg.message });
            break;
        default:
            // JOIN confirmations, MOTDs, USERSTATE, etc. — silently ignore
            break;
        }
    }

    _send(text) {
        if (!this._ws) return;
        if (this._ws.get_state() !== Soup.WebsocketState.OPEN) return;
        try {
            this._ws.send_text(text + '\r\n');
        } catch (e) {
            logError(e, '[TwitchIRC] send failed');
        }
    }

    _closeWS() {
        if (!this._ws) return;
        try { this._ws.close(Soup.WebsocketCloseCode.NORMAL, null); } catch (_e) {}
        this._ws = null;
    }

    _scheduleReconnect() {
        if (!this._alive) return;
        this._cancelTimer();
        log(`[TwitchIRC] reconnecting in ${RECONNECT_MS / 1000}s…`);
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, RECONNECT_MS, () => {
            this._timerId = null;
            if (this._alive) this._openWS();
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelTimer() {
        if (this._timerId !== null) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
    }

    /** Safely decode a GLib.Bytes object to a UTF-8 string. */
    _decode(bytes) {
        try {
            return new TextDecoder('utf-8').decode(bytes.get_data());
        } catch (_e) {
            // Fallback for older GJS where get_data() returns a plain ByteArray
            return String.fromCharCode.apply(null, Array.from(bytes.get_data()));
        }
    }
};
