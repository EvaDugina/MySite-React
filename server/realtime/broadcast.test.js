import test from 'node:test'
import assert from 'node:assert/strict'
import { RealtimeConfig } from './config.js'
import { createRegistry } from './registry.js'
import { runBroadcast, collectStaleClients } from './broadcast.js'

function makeClient({
    wsId,
    cid,
    sid,
    hasPosition = true,
    x = 1,
    y = 2,
    device = 'd',
    iconKey = RealtimeConfig.DEFAULT_ICON_KEY,
    lastSeen,
    connectedAt,
}) {
    const sent = []
    const ws = {
        readyState: 1,
        send(payload) {
            sent.push(payload)
        },
    }

    return {
        wsId,
        cid,
        sid,
        sessionKey: `${cid}:${sid}`,
        x,
        y,
        device,
        iconKey,
        lastSeen,
        hasPosition,
        connectedAt,
        ws,
        _sent: sent,
    }
}

test('broadcast sends only positioned cursors and excludes self', () => {
    const now = Date.now()
    const registry = createRegistry()

    const receiver = makeClient({
        wsId: 'ws-1',
        cid: 'abcdefghijkl',
        sid: 'mnopqrstuvwx',
        hasPosition: false,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    const other = makeClient({
        wsId: 'ws-2',
        cid: 'zzzzzzzzzzzz',
        sid: 'yyyyyyyyyyyy',
        x: 10,
        y: 11,
        device: 'm',
        iconKey: 'pointer_clicked',
        lastSeen: now,
        connectedAt: now - 1000,
    })

    const withoutPosition = makeClient({
        wsId: 'ws-3',
        cid: 'aaaaaaaaaaaa',
        sid: 'bbbbbbbbbbbb',
        hasPosition: false,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    registry.connectionsByWs.set(receiver.ws, receiver)
    registry.connectionsByWs.set(other.ws, other)
    registry.connectionsByWs.set(withoutPosition.ws, withoutPosition)
    registry.clientsBySession.set(receiver.sessionKey, receiver)
    registry.clientsBySession.set(other.sessionKey, other)
    registry.clientsBySession.set(withoutPosition.sessionKey, withoutPosition)

    runBroadcast({
        registry,
        config: RealtimeConfig,
        now,
        cleanupClient: () => {},
        log: { debug: () => {} },
    })

    assert.equal(receiver._sent.length, 1)
    const payload = JSON.parse(receiver._sent[0])
    assert.equal(payload.t, 'b')
    assert.deepEqual(payload.c, [[other.cid, other.sid, 10, 11, 'm', 'pointer_clicked']])
})

test('broadcast sends empty list to identified client when no active cursors', () => {
    const now = Date.now()
    const registry = createRegistry()

    const receiver = makeClient({
        wsId: 'ws-1',
        cid: 'abcdefghijkl',
        sid: 'mnopqrstuvwx',
        hasPosition: false,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    registry.connectionsByWs.set(receiver.ws, receiver)
    registry.clientsBySession.set(receiver.sessionKey, receiver)

    runBroadcast({
        registry,
        config: RealtimeConfig,
        now,
        cleanupClient: () => {},
        log: { debug: () => {} },
    })

    assert.equal(receiver._sent.length, 1)
    const payload = JSON.parse(receiver._sent[0])
    assert.equal(payload.t, 'b')
    assert.deepEqual(payload.c, [])
})

test('broadcast uses default icon key when cursor icon is missing', () => {
    const now = Date.now()
    const registry = createRegistry()

    const receiver = makeClient({
        wsId: 'ws-1',
        cid: 'abcdefghijkl',
        sid: 'mnopqrstuvwx',
        hasPosition: false,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    const other = makeClient({
        wsId: 'ws-2',
        cid: 'zzzzzzzzzzzz',
        sid: 'yyyyyyyyyyyy',
        x: 10,
        y: 11,
        device: 'd',
        iconKey: null,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    registry.connectionsByWs.set(receiver.ws, receiver)
    registry.connectionsByWs.set(other.ws, other)
    registry.clientsBySession.set(receiver.sessionKey, receiver)
    registry.clientsBySession.set(other.sessionKey, other)

    runBroadcast({
        registry,
        config: RealtimeConfig,
        now,
        cleanupClient: () => {},
        log: { debug: () => {} },
    })

    const payload = JSON.parse(receiver._sent[0])
    assert.deepEqual(payload.c, [[other.cid, other.sid, 10, 11, 'd', RealtimeConfig.DEFAULT_ICON_KEY]])
})

test('broadcast does not send to non-identified connection', () => {
    const now = Date.now()
    const registry = createRegistry()

    const anonymous = makeClient({
        wsId: 'ws-1',
        cid: 'abcdefghijkl',
        sid: 'mnopqrstuvwx',
        hasPosition: false,
        lastSeen: now,
        connectedAt: now - 1000,
    })

    registry.connectionsByWs.set(anonymous.ws, anonymous)

    runBroadcast({
        registry,
        config: RealtimeConfig,
        now,
        cleanupClient: () => {},
        log: { debug: () => {} },
    })

    assert.equal(anonymous._sent.length, 0)
})

test('stale collection applies ttl based on device and lineage', () => {
    const now = Date.now()
    const registry = createRegistry()
    const staleDesktop = makeClient({
        wsId: 'ws-1',
        cid: 'abcdefghijkl',
        sid: 'mnopqrstuvwx',
        lastSeen: now - RealtimeConfig.STALE_TTL_DESKTOP_MS - 50,
        connectedAt: now - 10_000,
    })
    const newestLineage = makeClient({
        wsId: 'ws-2',
        cid: 'abcdefghijkl',
        sid: 'yyyyyyyyyyyy',
        lastSeen: now - 100,
        connectedAt: now - 1_000,
    })

    registry.clientsBySession.set(staleDesktop.sessionKey, staleDesktop)
    registry.clientsBySession.set(newestLineage.sessionKey, newestLineage)

    const stale = collectStaleClients(registry, RealtimeConfig, now)
    assert.equal(stale.includes(staleDesktop), true)
})
