const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function isValidId(value, min, max) {
    if (typeof value !== 'string') return false
    if (value.length < min || value.length > max) return false
    return ID_PATTERN.test(value)
}

function getPayloadLength(data) {
    if (typeof data === 'string') return Buffer.byteLength(data)
    if (Buffer.isBuffer(data)) return data.length
    if (data instanceof ArrayBuffer) return data.byteLength
    if (ArrayBuffer.isView(data)) return data.byteLength
    if (Array.isArray(data)) {
        let length = 0
        for (const chunk of data) {
            length += getPayloadLength(chunk)
        }
        return length
    }
    return Number.POSITIVE_INFINITY
}

function toUtf8String(data) {
    if (typeof data === 'string') return data
    if (Buffer.isBuffer(data)) return data.toString('utf8')
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
    if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
    if (Array.isArray(data)) return Buffer.concat(data.map(part => Buffer.from(part))).toString('utf8')
    return ''
}

function isValidHello(msg, config) {
    if (msg === null || typeof msg !== 'object') return false
    if (msg.t !== 'hello') return false
    if (!isValidId(msg.cid, config.CLIENT_ID_MIN_LEN, config.CLIENT_ID_MAX_LEN)) return false
    if (!isValidId(msg.sid, config.SESSION_ID_MIN_LEN, config.SESSION_ID_MAX_LEN)) return false
    return true
}

function isValidPosition(msg) {
    return (
        msg !== null &&
        typeof msg === 'object' &&
        msg.t === 'p' &&
        typeof msg.x === 'number' &&
        Number.isFinite(msg.x) &&
        msg.x >= -200 &&
        msg.x <= 200 &&
        typeof msg.y === 'number' &&
        Number.isFinite(msg.y) &&
        msg.y >= -200 &&
        msg.y <= 200 &&
        (msg.d === 'd' || msg.d === 'm')
    )
}

function isIconMessage(msg) {
    return (
        msg !== null &&
        typeof msg === 'object' &&
        msg.t === 'i' &&
        Object.prototype.hasOwnProperty.call(msg, 'i')
    )
}

function isValidBye(msg) {
    return msg !== null && typeof msg === 'object' && msg.t === 'bye'
}

function normalizeIconKey(rawValue, config) {
    if (typeof rawValue !== 'string') return config.DEFAULT_ICON_KEY
    if (rawValue.length < config.ICON_KEY_MIN_LEN) return config.DEFAULT_ICON_KEY
    if (rawValue.length > config.ICON_KEY_MAX_LEN) return config.DEFAULT_ICON_KEY
    if (!ID_PATTERN.test(rawValue)) return config.DEFAULT_ICON_KEY
    if (!config.ALLOWED_ICON_KEYS.includes(rawValue)) {
        return config.DEFAULT_ICON_KEY
    }
    return rawValue
}

export function getSessionKey(cid, sid) {
    return `${cid}:${sid}`
}

export function parseIncomingMessage(rawData, config) {
    const payloadLength = getPayloadLength(rawData)
    if (payloadLength > config.MAX_PAYLOAD) {
        return { kind: 'drop', reason: 'payload_too_large' }
    }

    let msg
    try {
        msg = JSON.parse(toUtf8String(rawData))
    } catch {
        return { kind: 'drop', reason: 'invalid_json' }
    }

    if (isValidHello(msg, config)) {
        return {
            kind: 'hello',
            cid: msg.cid,
            sid: msg.sid,
        }
    }

    if (isValidBye(msg)) {
        return { kind: 'bye' }
    }

    if (isValidPosition(msg)) {
        const hasIconKey = Object.prototype.hasOwnProperty.call(msg, 'i')
        return {
            kind: 'position',
            x: msg.x,
            y: msg.y,
            device: msg.d,
            iconKey: hasIconKey
                ? normalizeIconKey(msg.i, config)
                : undefined,
        }
    }

    if (isIconMessage(msg)) {
        return {
            kind: 'icon',
            iconKey: normalizeIconKey(msg.i, config),
        }
    }

    return { kind: 'drop', reason: 'invalid_shape' }
}

export function serializeBatchMessage(cursors) {
    return JSON.stringify({ t: 'b', c: cursors })
}
