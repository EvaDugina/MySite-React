import test from 'node:test'
import assert from 'node:assert/strict'
import { RealtimeConfig } from './config.js'
import { parseIncomingMessage } from './protocol.js'

test('protocol parses valid hello message', () => {
    const msg = parseIncomingMessage(
        Buffer.from(
            JSON.stringify({
                t: 'hello',
                cid: 'abcdefghijkl',
                sid: 'mnopqrstuvwx',
            })
        ),
        RealtimeConfig
    )

    assert.equal(msg.kind, 'hello')
    assert.equal(msg.cid, 'abcdefghijkl')
    assert.equal(msg.sid, 'mnopqrstuvwx')
})

test('protocol rejects malformed messages in strict v2', () => {
    const msg = parseIncomingMessage(
        Buffer.from(JSON.stringify({ t: 'hello', cid: 'short', sid: 'short' })),
        RealtimeConfig
    )

    assert.equal(msg.kind, 'drop')
    assert.equal(msg.reason, 'invalid_shape')
})

test('protocol rejects payloads over max size', () => {
    const oversized = 'x'.repeat(RealtimeConfig.MAX_PAYLOAD + 1)
    const msg = parseIncomingMessage(Buffer.from(oversized), RealtimeConfig)

    assert.equal(msg.kind, 'drop')
    assert.equal(msg.reason, 'payload_too_large')
})

test('protocol parses valid position payload', () => {
    const msg = parseIncomingMessage(
        Buffer.from(JSON.stringify({ t: 'p', x: 10, y: -5, d: 'd', i: 'pointer_clicked' })),
        RealtimeConfig
    )

    assert.equal(msg.kind, 'position')
    assert.equal(msg.x, 10)
    assert.equal(msg.y, -5)
    assert.equal(msg.device, 'd')
    assert.equal(msg.iconKey, 'pointer_clicked')
})

test('protocol normalizes invalid icon key in position payload', () => {
    const msg = parseIncomingMessage(
        Buffer.from(JSON.stringify({ t: 'p', x: 0, y: 0, d: 'm', i: '!!!' })),
        RealtimeConfig
    )

    assert.equal(msg.kind, 'position')
    assert.equal(msg.iconKey, RealtimeConfig.DEFAULT_ICON_KEY)
})

test('protocol parses icon update payload', () => {
    const msg = parseIncomingMessage(
        Buffer.from(JSON.stringify({ t: 'i', i: 'pointer_clicked' })),
        RealtimeConfig
    )

    assert.equal(msg.kind, 'icon')
    assert.equal(msg.iconKey, 'pointer_clicked')
})
