import { DEFAULT_PUBLIC_CURSOR_ICON_KEY } from '../../PublicCursorIcons.js'

export function parseBatchMessage(rawData) {
    let msg
    try {
        msg = JSON.parse(rawData)
    } catch {
        return null
    }

    if (msg.t !== 'b' || !Array.isArray(msg.c)) return null

    const entries = []
    for (const entry of msg.c) {
        if (!Array.isArray(entry)) continue

        const hasSessionId = entry.length >= 5
        const cid = entry[0]
        const sid = hasSessionId ? entry[1] : 'legacy'
        const x = hasSessionId ? entry[2] : entry[1]
        const y = hasSessionId ? entry[3] : entry[2]
        const device = hasSessionId ? entry[4] : entry[3]
        const iconKey = hasSessionId && entry.length >= 6
            ? entry[5]
            : DEFAULT_PUBLIC_CURSOR_ICON_KEY

        if (typeof cid !== 'string' || typeof sid !== 'string') continue

        entries.push({
            cid,
            sid,
            x,
            y,
            device,
            iconKey: typeof iconKey === 'string'
                ? iconKey
                : DEFAULT_PUBLIC_CURSOR_ICON_KEY,
        })
    }

    return entries
}

export function buildHelloMessage(clientId, sessionId) {
    return JSON.stringify({ t: 'hello', cid: clientId, sid: sessionId })
}

export function buildPositionMessage(x, y, device, iconKey) {
    if (typeof iconKey === 'string' && iconKey.length > 0) {
        return JSON.stringify({ t: 'p', x, y, d: device, i: iconKey })
    }
    return JSON.stringify({ t: 'p', x, y, d: device })
}

export function buildIconMessage(iconKey) {
    return JSON.stringify({ t: 'i', i: iconKey })
}

export function buildByeMessage() {
    return JSON.stringify({ t: 'bye' })
}
