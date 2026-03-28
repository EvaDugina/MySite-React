import { WebSocketServer } from 'ws'

export function createSocketServer(config) {
    return new WebSocketServer({
        noServer: true,
        maxPayload: config.MAX_PAYLOAD,
    })
}

export function attachTransport({
    httpServer,
    wss,
    config,
    getOpenConnectionsCount,
    onConnection,
    log,
}) {
    const handleUpgrade = (request, socket, head) => {
        if (request.url !== config.WS_PATH) {
            socket.destroy()
            return
        }

        if (getOpenConnectionsCount() >= config.MAX_CONNECTIONS) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n')
            socket.destroy()
            return
        }

        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit('connection', ws, request)
        })
    }

    const handleConnection = (ws, request) => {
        onConnection(ws, request)
    }

    httpServer.on('upgrade', handleUpgrade)
    wss.on('connection', handleConnection)

    return () => {
        httpServer.removeListener('upgrade', handleUpgrade)
        wss.removeListener('connection', handleConnection)
    }
}

export function attachClientEvents({
    client,
    onPong,
    onMessage,
    onClose,
    onError,
}) {
    const handlePong = () => onPong(client)
    const handleMessage = data => onMessage(client, data)
    const handleClose = (code, reasonBuffer) => onClose(client, code, reasonBuffer)
    const handleError = error => onError(client, error)

    client.ws.on('pong', handlePong)
    client.ws.on('message', handleMessage)
    client.ws.on('close', handleClose)
    client.ws.on('error', handleError)

    return () => {
        client.ws.removeListener('pong', handlePong)
        client.ws.removeListener('message', handleMessage)
        client.ws.removeListener('close', handleClose)
        client.ws.removeListener('error', handleError)
    }
}

