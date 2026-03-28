export function createRegistry() {
    return {
        connectionsByWs: new Map(),
        clientsBySession: new Map(),
    }
}

export function getActiveStats(registry) {
    return {
        identifiedSessions: registry.clientsBySession.size,
        openConnections: registry.connectionsByWs.size,
    }
}

export function createClientState({ ws, wsId, now, defaultIconKey = 'pointer' }) {
    return {
        wsId,
        cid: null,
        sid: null,
        sessionKey: null,
        x: null,
        y: null,
        device: 'd',
        iconKey: defaultIconKey,
        lastSeen: now,
        hasPosition: false,
        ws,
        isAlive: true,
        rateWindow: {
            count: 0,
            startedAt: now,
        },
        connectedAt: now,
        cleanedUp: false,
    }
}

export function addConnection(registry, client) {
    registry.connectionsByWs.set(client.ws, client)
}

export function removeConnection(registry, client) {
    registry.connectionsByWs.delete(client.ws)
    removeClientFromSessionIndex(registry, client)
}

export function removeClientFromSessionIndex(registry, client) {
    if (!client.sessionKey) return
    if (registry.clientsBySession.get(client.sessionKey) === client) {
        registry.clientsBySession.delete(client.sessionKey)
    }
}

export function bindClientSession(registry, client, cid, sid, sessionKey) {
    let wasReassigned = false
    let oldSessionKey = null
    if (client.sessionKey && client.sessionKey !== sessionKey) {
        oldSessionKey = client.sessionKey
        wasReassigned = true
        removeClientFromSessionIndex(registry, client)
    }

    const previousClient = registry.clientsBySession.get(sessionKey) || null
    if (previousClient && previousClient !== client) {
        registry.clientsBySession.delete(sessionKey)
    }

    client.cid = cid
    client.sid = sid
    client.sessionKey = sessionKey
    registry.clientsBySession.set(sessionKey, client)

    return {
        wasReassigned,
        oldSessionKey,
        previousClient,
    }
}
