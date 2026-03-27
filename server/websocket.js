import { WebSocketServer, WebSocket } from 'ws'
import crypto from 'node:crypto'

const MAX_CONNECTIONS = 100
const MAX_PAYLOAD = 256
const BROADCAST_INTERVAL_MS = 66 // ~15Hz
const PING_INTERVAL_MS = 30000
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 1000
const STALE_TTL_MOBILE_MS = 2000
const STALE_TTL_DESKTOP_MS = 5000
const OLD_LINEAGE_GRACE_MS = 1200
const MAX_CURSORS_PER_CLIENT = 8
const CLIENT_ID_MIN_LEN = 12
const CLIENT_ID_MAX_LEN = 64
const SESSION_ID_MIN_LEN = 12
const SESSION_ID_MAX_LEN = 64
const DEBUG_WS = process.env.WS_DEBUG === '1'

let wss = null
let broadcastInterval = null
let pingInterval = null
const connectionsByWs = new Map()
const clientsBySession = new Map()

function logWs(message, data = null) {
    if (!DEBUG_WS) return
    if (data === null) {
        console.log(`[ws] ${message}`)
        return
    }
    console.log(`[ws] ${message}`, data)
}

function isValidId(value, min, max) {
    if (typeof value !== 'string') return false
    if (value.length < min || value.length > max) return false
    return /^[a-zA-Z0-9_-]+$/.test(value)
}

function isValidClientId(cid) {
    return isValidId(cid, CLIENT_ID_MIN_LEN, CLIENT_ID_MAX_LEN)
}

function isValidSessionId(sid) {
    return isValidId(sid, SESSION_ID_MIN_LEN, SESSION_ID_MAX_LEN)
}

function getSessionKey(cid, sid) {
    return `${cid}:${sid}`
}

function getActiveStats() {
    return {
        identifiedSessions: clientsBySession.size,
        openConnections: connectionsByWs.size,
    }
}

function isValidPosition(msg) {
    return (
        msg !== null &&
        typeof msg === 'object' &&
        msg.t === 'p' &&
        typeof msg.x === 'number' &&
        Number.isFinite(msg.x) &&
        msg.x >= -200 && msg.x <= 200 &&
        typeof msg.y === 'number' &&
        Number.isFinite(msg.y) &&
        msg.y >= -200 && msg.y <= 200 &&
        (msg.d === 'd' || msg.d === 'm')
    )
}

function isRateLimited(client) {
    const now = Date.now()
    if (now - client.msgWindowStart > RATE_LIMIT_WINDOW_MS) {
        client.msgCount = 0
        client.msgWindowStart = now
    }
    client.msgCount++
    return client.msgCount > RATE_LIMIT_MAX
}

function removeClientFromIndex(client) {
    if (!client.sessionKey) return
    if (clientsBySession.get(client.sessionKey) === client) {
        clientsBySession.delete(client.sessionKey)
    }
}

function startBroadcast() {
    if (broadcastInterval) return
    broadcastInterval = setInterval(broadcast, BROADCAST_INTERVAL_MS)
}

function stopBroadcast() {
    if (broadcastInterval) {
        clearInterval(broadcastInterval)
        broadcastInterval = null
    }
}

function broadcast() {
    const now = Date.now()
    const newestConnectedAtByCid = new Map()

    for (const [, client] of clientsBySession) {
        if (!client.cid) continue
        const currentNewest = newestConnectedAtByCid.get(client.cid) || 0
        if (client.connectedAt > currentNewest) {
            newestConnectedAtByCid.set(client.cid, client.connectedAt)
        }
    }

    const staleClients = []
    for (const [, client] of clientsBySession) {
        if (!client.hasPosition) continue
        const baseTtl = client.device === 'm' ? STALE_TTL_MOBILE_MS : STALE_TTL_DESKTOP_MS
        const newestConnectedAt = newestConnectedAtByCid.get(client.cid) || client.connectedAt
        const isOldLineageSession = newestConnectedAt > client.connectedAt
        const ttl = isOldLineageSession ? Math.min(baseTtl, OLD_LINEAGE_GRACE_MS) : baseTtl
        if (now - client.lastSeen > ttl) staleClients.push(client)
    }

    for (const client of staleClients) {
        removeClientFromIndex(client)
        logWs('terminate stale client', {
            cid: client.cid,
            sid: client.sid,
            wsId: client.wsId,
            ...getActiveStats(),
        })
        client.ws.terminate()
    }

    if (connectionsByWs.size === 0) {
        stopBroadcast()
        stopPingPong()
        return
    }

    const allCursors = []
    for (const [, client] of clientsBySession) {
        if (!client.hasPosition) continue
        allCursors.push({
            cid: client.cid,
            sid: client.sid,
            sessionKey: client.sessionKey,
            wsId: client.wsId,
            x: client.x,
            y: client.y,
            device: client.device,
            lastSeen: client.lastSeen,
        })
    }
    allCursors.sort((a, b) => b.lastSeen - a.lastSeen)

    for (const [, client] of clientsBySession) {
        if (client.ws.readyState !== WebSocket.OPEN) continue
        if (!client.hasPosition) continue

        const cursors = []
        for (const cursor of allCursors) {
            if (cursor.sessionKey === client.sessionKey) continue
            if (cursor.wsId === client.wsId) continue
            cursors.push([cursor.cid, cursor.sid, cursor.x, cursor.y, cursor.device])
            if (cursors.length >= MAX_CURSORS_PER_CLIENT) break
        }

        try {
            client.ws.send(JSON.stringify({ t: 'b', c: cursors }))
        } catch {
        }
    }
}

function startPingPong() {
    if (pingInterval) return
    pingInterval = setInterval(() => {
        const deadClients = []
        for (const [, client] of connectionsByWs) {
            if (!client.isAlive) {
                deadClients.push(client)
                continue
            }
            client.isAlive = false
            client.ws.ping()
        }
        for (const client of deadClients) {
            removeClientFromIndex(client)
            logWs('terminate dead client', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                ...getActiveStats(),
            })
            client.ws.terminate()
        }
    }, PING_INTERVAL_MS)
}

function stopPingPong() {
    if (pingInterval) {
        clearInterval(pingInterval)
        pingInterval = null
    }
}

export function setupWebSocket(httpServer) {
    wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD })

    httpServer.on('upgrade', (request, socket, head) => {
        if (request.url !== '/ws') {
            socket.destroy()
            return
        }

        if (connectionsByWs.size >= MAX_CONNECTIONS) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n')
            socket.destroy()
            return
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request)
        })
    })

    wss.on('connection', (ws) => {
        const wsId = crypto.randomUUID()
        const client = {
            wsId,
            cid: null,
            sid: null,
            sessionKey: null,
            x: 0,
            y: 0,
            device: 'd',
            lastSeen: Date.now(),
            hasPosition: false,
            ws,
            isAlive: true,
            msgCount: 0,
            msgWindowStart: Date.now(),
            connectedAt: Date.now(),
        }
        connectionsByWs.set(ws, client)
        logWs('connection opened', {
            wsId: client.wsId,
            ...getActiveStats(),
        })

        startBroadcast()
        startPingPong()

        ws.on('pong', () => {
            client.isAlive = true
        })

        ws.on('message', (data) => {
            if (data.length > MAX_PAYLOAD) return
            if (isRateLimited(client)) return

            let msg
            try {
                msg = JSON.parse(data.toString())
            } catch {
                return
            }

            if (msg?.t === 'hello') {
                if (!isValidClientId(msg.cid)) return
                if (!isValidSessionId(msg.sid)) return

                const nextSessionKey = getSessionKey(msg.cid, msg.sid)

                if (client.sessionKey && client.sessionKey !== nextSessionKey) {
                    logWs('client session reassigned', {
                        oldSessionKey: client.sessionKey,
                        nextSessionKey,
                        wsId: client.wsId,
                    })
                    removeClientFromIndex(client)
                }

                const previousClient = clientsBySession.get(nextSessionKey)
                if (previousClient && previousClient !== client) {
                    clientsBySession.delete(nextSessionKey)
                    logWs('replace previous connection for session', {
                        sessionKey: nextSessionKey,
                        prevWsId: previousClient.wsId,
                        nextWsId: client.wsId,
                        ...getActiveStats(),
                    })
                    previousClient.ws.close(4002, 'replaced')
                }

                client.cid = msg.cid
                client.sid = msg.sid
                client.sessionKey = nextSessionKey
                clientsBySession.set(client.sessionKey, client)

                logWs('hello accepted', {
                    cid: client.cid,
                    sid: client.sid,
                    wsId: client.wsId,
                    ...getActiveStats(),
                })
                return
            }

            if (msg?.t === 'bye') {
                logWs('bye received', {
                    cid: client.cid,
                    sid: client.sid,
                    wsId: client.wsId,
                })
                client.hasPosition = false
                removeClientFromIndex(client)
                ws.close(1000, 'bye')
                return
            }

            if (!client.sessionKey) return
            if (!isValidPosition(msg)) return

            client.x = msg.x
            client.y = msg.y
            client.device = msg.d
            client.lastSeen = Date.now()
            client.hasPosition = true
        })

        ws.on('close', (code, reasonBuffer) => {
            connectionsByWs.delete(ws)
            removeClientFromIndex(client)

            logWs('connection closed', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                code,
                reason: reasonBuffer?.toString?.() || '',
                ...getActiveStats(),
            })

            if (connectionsByWs.size === 0) {
                stopBroadcast()
                stopPingPong()
            }
        })

        ws.on('error', () => {
            ws.terminate()
        })
    })

    console.log('WebSocket сервер готов на /ws')
}

export function closeWebSocket() {
    stopBroadcast()
    stopPingPong()
    if (wss) {
        for (const [, client] of connectionsByWs) {
            client.ws.terminate()
        }
        clientsBySession.clear()
        connectionsByWs.clear()
        wss.close()
        wss = null
    }
}
