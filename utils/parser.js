'use strict';

// ===== file: utils/parser.js =====

/**
 * Parse a single raw Twitch IRC line into a structured object.
 *
 * Supported patterns:
 *   PING :tmi.twitch.tv
 *   :nick!nick@nick.tmi.twitch.tv PRIVMSG #channel :message text
 *
 * @param {string} raw - A single raw IRC line (no trailing \r\n)
 * @returns {{ type: string, server?: string, username?: string, channel?: string, message?: string, raw?: string } | null}
 */
var parseIRCMessage = function parseIRCMessage(raw) {
    raw = raw.trim();
    if (!raw) return null;

    // ── PING ─────────────────────────────────────────────────────────────────
    if (raw.startsWith('PING ')) {
        return { type: 'PING', server: raw.slice(5).replace(/^:/, '') };
    }

    // ── PRIVMSG ───────────────────────────────────────────────────────────────
    // :nick!nick@nick.tmi.twitch.tv PRIVMSG #channel :message
    const privmsgRe = /^:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #(\w+) :(.+)$/;
    const match = raw.match(privmsgRe);
    if (match) {
        return {
            type:     'PRIVMSG',
            username: match[1],
            channel:  match[2],
            message:  match[3],
        };
    }

    return { type: 'UNKNOWN', raw };
};
