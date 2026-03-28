import test from 'node:test'
import assert from 'node:assert/strict'
import { createRegistry } from './registry.js'
import { runPingSweep } from './liveness.js'

function makeClient({ wsId, isAlive }) {
    let pingCount = 0
    return {
        wsId,
        isAlive,
        ws: {
            ping() {
                pingCount += 1
            },
        },
        get pingCount() {
            return pingCount
        },
    }
}

test('liveness pings alive clients and marks them pending', () => {
    const registry = createRegistry()
    const client = makeClient({ wsId: 'ws-1', isAlive: true })
    registry.connectionsByWs.set(client.ws, client)

    runPingSweep({
        registry,
        cleanupClient: () => {},
    })

    assert.equal(client.pingCount, 1)
    assert.equal(client.isAlive, false)
})

test('liveness cleans up dead clients', () => {
    const registry = createRegistry()
    const dead = makeClient({ wsId: 'ws-2', isAlive: false })
    registry.connectionsByWs.set(dead.ws, dead)

    const cleaned = []
    runPingSweep({
        registry,
        cleanupClient: client => cleaned.push(client.wsId),
    })

    assert.deepEqual(cleaned, ['ws-2'])
})

