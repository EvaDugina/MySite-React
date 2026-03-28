import test from 'node:test'
import assert from 'node:assert/strict'
import {
    createRegistry,
    addConnection,
    bindClientSession,
    createClientState,
} from './registry.js'

function makeClient(wsId) {
    return createClientState({
        ws: {},
        wsId,
        now: Date.now(),
    })
}

test('registry reassigns session without stale map entries', () => {
    const registry = createRegistry()
    const client = makeClient('ws-1')
    addConnection(registry, client)

    bindClientSession(
        registry,
        client,
        'abcdefghijkl',
        'mnopqrstuvwx',
        'abcdefghijkl:mnopqrstuvwx'
    )

    const result = bindClientSession(
        registry,
        client,
        'abcdefghijkl',
        'zzzzzzzzzzzz',
        'abcdefghijkl:zzzzzzzzzzzz'
    )

    assert.equal(result.wasReassigned, true)
    assert.equal(
        registry.clientsBySession.has('abcdefghijkl:mnopqrstuvwx'),
        false
    )
    assert.equal(
        registry.clientsBySession.get('abcdefghijkl:zzzzzzzzzzzz'),
        client
    )
})

test('registry replaces previous client for the same session key', () => {
    const registry = createRegistry()
    const firstClient = makeClient('ws-1')
    const secondClient = makeClient('ws-2')

    addConnection(registry, firstClient)
    addConnection(registry, secondClient)

    bindClientSession(
        registry,
        firstClient,
        'abcdefghijkl',
        'mnopqrstuvwx',
        'abcdefghijkl:mnopqrstuvwx'
    )

    const result = bindClientSession(
        registry,
        secondClient,
        'abcdefghijkl',
        'mnopqrstuvwx',
        'abcdefghijkl:mnopqrstuvwx'
    )

    assert.equal(result.previousClient, firstClient)
    assert.equal(
        registry.clientsBySession.get('abcdefghijkl:mnopqrstuvwx'),
        secondClient
    )
})

