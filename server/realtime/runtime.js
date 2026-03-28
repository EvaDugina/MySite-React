import crypto from 'node:crypto'
import { RealtimeConfig } from './config.js'
import { createLogger } from './logger.js'
import { parseIncomingMessage, getSessionKey } from './protocol.js'
import {
    createRegistry,
    getActiveStats,
    createClientState,
    addConnection,
    removeConnection,
    bindClientSession,
} from './registry.js'
import { applyPosition, applyIconKey, clearPosition } from './presence.js'
import { runBroadcast } from './broadcast.js'
import { runPingSweep } from './liveness.js'
import {
    createSocketServer,
    attachTransport,
    attachClientEvents,
} from './transport.js'

export function createRealtimeRuntime(configOverrides = {}) {
    const config = { ...RealtimeConfig, ...configOverrides }
    const log = createLogger({ enabled: config.DEBUG_WS })
    const registry = createRegistry()

    let wss = null
    let detachTransport = null
    let broadcastInterval = null
    let pingInterval = null

    function stats() {
        return getActiveStats(registry)
    }

    function stopBroadcastLoop() {
        if (!broadcastInterval) return
        clearInterval(broadcastInterval)
        broadcastInterval = null
    }

    function stopPingLoop() {
        if (!pingInterval) return
        clearInterval(pingInterval)
        pingInterval = null
    }

    function stopLoops() {
        stopBroadcastLoop()
        stopPingLoop()
    }

    function maybeStopLoops() {
        if (registry.connectionsByWs.size > 0) return
        stopLoops()
    }

    function startLoopsIfNeeded() {
        if (!broadcastInterval) {
            broadcastInterval = setInterval(() => {
                runBroadcastOnce(Date.now())
            }, config.BROADCAST_INTERVAL_MS)
        }

        if (!pingInterval) {
            pingInterval = setInterval(() => {
                runPingSweep({
                    registry,
                    cleanupClient,
                })
            }, config.PING_INTERVAL_MS)
        }
    }

    function isRateLimited(client, now) {
        const window = client.rateWindow
        if (now - window.startedAt > config.RATE_LIMIT_WINDOW_MS) {
            window.count = 0
            window.startedAt = now
        }
        window.count += 1
        return window.count > config.RATE_LIMIT_MAX
    }

    function logDrop(client, reason) {
        log.debug('drop message', {
            reason,
            wsId: client.wsId,
            cid: client.cid,
            sid: client.sid,
        })
    }

    function runBroadcastOnce(now) {
        const result = runBroadcast({
            registry,
            config,
            now,
            cleanupClient,
            log,
        })
        if (result.shouldStopLoops) {
            stopLoops()
        }
    }

    function cleanupClient(client, options = {}) {
        if (client.cleanedUp) return false
        client.cleanedUp = true

        if (typeof client.detachEvents === 'function') {
            client.detachEvents()
            client.detachEvents = null
        }

        clearPosition(client)
        removeConnection(registry, client)

        const reason = options.reason || 'cleanup'
        if (reason === 'stale') {
            log.debug('terminate stale client', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                ...stats(),
            })
        } else if (reason === 'dead') {
            log.debug('terminate dead client', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                ...stats(),
            })
        } else if (reason === 'bye') {
            log.debug('bye received', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
            })
        } else if (reason === 'closed') {
            log.debug('connection closed', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                code: options.code,
                reasonText: options.reasonText || '',
                ...stats(),
            })
        } else if (reason === 'error') {
            log.debug('terminate errored client', {
                cid: client.cid,
                sid: client.sid,
                wsId: client.wsId,
                error: options.errorMessage || '',
                ...stats(),
            })
        }

        if (options.terminate) {
            try {
                client.ws.terminate()
            } catch {
            }
        } else if (typeof options.closeCode === 'number') {
            try {
                client.ws.close(options.closeCode, options.closeReason || '')
            } catch {
            }
        }

        maybeStopLoops()
        return true
    }

    function handleHello(client, message) {
        const sessionKey = getSessionKey(message.cid, message.sid)
        const { wasReassigned, oldSessionKey, previousClient } = bindClientSession(
            registry,
            client,
            message.cid,
            message.sid,
            sessionKey
        )

        if (wasReassigned) {
            log.debug('client session reassigned', {
                oldSessionKey,
                nextSessionKey: sessionKey,
                wsId: client.wsId,
            })
        }

        if (previousClient && previousClient !== client) {
            log.debug('replace previous connection for session', {
                sessionKey,
                prevWsId: previousClient.wsId,
                nextWsId: client.wsId,
                ...stats(),
            })
            try {
                previousClient.ws.close(4002, 'replaced')
            } catch {
                cleanupClient(previousClient, {
                    reason: 'error',
                    terminate: true,
                    errorMessage: 'failed_to_close_replaced_client',
                })
            }
        }

        log.debug('hello accepted', {
            cid: client.cid,
            sid: client.sid,
            wsId: client.wsId,
            ...stats(),
        })
    }

    function handlePosition(client, message) {
        if (!client.sessionKey) {
            logDrop(client, 'position_before_hello')
            return
        }
        applyPosition(client, message, Date.now())
    }

    function handleIcon(client, message) {
        if (!client.sessionKey) {
            logDrop(client, 'icon_before_hello')
            return
        }
        applyIconKey(client, message.iconKey)
        runBroadcastOnce(Date.now())
    }

    function handleMessage(client, rawData) {
        const now = Date.now()
        if (isRateLimited(client, now)) {
            logDrop(client, 'rate_limited')
            return
        }

        const message = parseIncomingMessage(rawData, config)
        if (message.kind === 'drop') {
            logDrop(client, message.reason)
            return
        }

        if (message.kind === 'hello') {
            handleHello(client, message)
            return
        }

        if (message.kind === 'bye') {
            cleanupClient(client, {
                reason: 'bye',
                closeCode: 1000,
                closeReason: 'bye',
            })
            return
        }

        if (message.kind === 'position') {
            handlePosition(client, message)
            return
        }

        if (message.kind === 'icon') {
            handleIcon(client, message)
        }
    }

    function handleConnection(ws) {
        const client = createClientState({
            ws,
            wsId: crypto.randomUUID(),
            now: Date.now(),
            defaultIconKey: config.DEFAULT_ICON_KEY,
        })
        addConnection(registry, client)

        log.debug('connection opened', {
            wsId: client.wsId,
            ...stats(),
        })

        startLoopsIfNeeded()
        client.detachEvents = attachClientEvents({
            client,
            onPong: targetClient => {
                targetClient.isAlive = true
            },
            onMessage: handleMessage,
            onClose: (targetClient, code, reasonBuffer) => {
                cleanupClient(targetClient, {
                    reason: 'closed',
                    code,
                    reasonText: reasonBuffer?.toString?.() || '',
                })
            },
            onError: (targetClient, error) => {
                cleanupClient(targetClient, {
                    reason: 'error',
                    terminate: true,
                    errorMessage: error?.message || '',
                })
            },
        })
    }

    function start(httpServer) {
        if (wss) return
        wss = createSocketServer(config)
        detachTransport = attachTransport({
            httpServer,
            wss,
            config,
            getOpenConnectionsCount: () => registry.connectionsByWs.size,
            onConnection: handleConnection,
            log,
        })

        console.log(`WebSocket server ready on ${config.WS_PATH}`)
    }

    function stop() {
        stopLoops()
        const clients = [...registry.connectionsByWs.values()]
        for (const client of clients) {
            cleanupClient(client, {
                reason: 'shutdown',
                terminate: true,
            })
        }

        registry.connectionsByWs.clear()
        registry.clientsBySession.clear()

        if (detachTransport) {
            detachTransport()
            detachTransport = null
        }

        if (wss) {
            wss.close()
            wss = null
        }
    }

    return {
        start,
        stop,
    }
}
