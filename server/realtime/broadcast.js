import { WebSocket } from 'ws'
import { serializeBatchMessage } from './protocol.js'

function getNewestConnectedAtByCid(clientsBySession) {
    const newestConnectedAtByCid = new Map()
    for (const client of clientsBySession.values()) {
        if (!client.cid) continue
        const currentNewest = newestConnectedAtByCid.get(client.cid) || 0
        if (client.connectedAt > currentNewest) {
            newestConnectedAtByCid.set(client.cid, client.connectedAt)
        }
    }
    return newestConnectedAtByCid
}

export function collectStaleClients(registry, config, now) {
    const staleClients = []
    const newestConnectedAtByCid = getNewestConnectedAtByCid(registry.clientsBySession)

    for (const client of registry.clientsBySession.values()) {
        if (!client.hasPosition) continue
        const baseTtl =
            client.device === 'm'
                ? config.STALE_TTL_MOBILE_MS
                : config.STALE_TTL_DESKTOP_MS
        const newestConnectedAt =
            newestConnectedAtByCid.get(client.cid) || client.connectedAt
        const isOldLineageSession = newestConnectedAt > client.connectedAt
        const ttl = isOldLineageSession
            ? Math.min(baseTtl, config.OLD_LINEAGE_GRACE_MS)
            : baseTtl

        if (now - client.lastSeen > ttl) {
            staleClients.push(client)
        }
    }

    return staleClients
}

function snapshotCursors(registry) {
    const allCursors = []
    for (const client of registry.clientsBySession.values()) {
        if (!client.hasPosition) continue
        allCursors.push({
            cid: client.cid,
            sid: client.sid,
            sessionKey: client.sessionKey,
            wsId: client.wsId,
            x: client.x,
            y: client.y,
            device: client.device,
            iconKey: client.iconKey,
            lastSeen: client.lastSeen,
        })
    }
    allCursors.sort((a, b) => b.lastSeen - a.lastSeen)
    return allCursors
}

function buildCursorsForClient(client, allCursors, maxCursorsPerClient, defaultIconKey) {
    const cursors = []
    for (const cursor of allCursors) {
        if (cursor.sessionKey === client.sessionKey) continue
        if (cursor.wsId === client.wsId) continue
        cursors.push([
            cursor.cid,
            cursor.sid,
            cursor.x,
            cursor.y,
            cursor.device,
            cursor.iconKey || defaultIconKey,
        ])
        if (cursors.length >= maxCursorsPerClient) break
    }
    return cursors
}

export function runBroadcast({
    registry,
    config,
    now,
    cleanupClient,
    log,
}) {
    const staleClients = collectStaleClients(registry, config, now)
    for (const client of staleClients) {
        cleanupClient(client, {
            reason: 'stale',
            terminate: true,
        })
    }

    if (registry.connectionsByWs.size === 0) {
        return { shouldStopLoops: true }
    }

    const allCursors = snapshotCursors(registry)
    for (const client of registry.clientsBySession.values()) {
        if (client.ws.readyState !== WebSocket.OPEN) continue

        const cursors = buildCursorsForClient(
            client,
            allCursors,
            config.MAX_CURSORS_PER_CLIENT,
            config.DEFAULT_ICON_KEY
        )

        try {
            client.ws.send(serializeBatchMessage(cursors))
        } catch (error) {
            log.debug('broadcast send failed', {
                wsId: client.wsId,
                cid: client.cid,
                sid: client.sid,
                reason: error?.message || 'send_failed',
            })
        }
    }

    return { shouldStopLoops: false }
}
