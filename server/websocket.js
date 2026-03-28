import { createRealtimeRuntime } from './realtime/runtime.js'

let runtime = null

export function setupWebSocket(httpServer) {
    if (runtime) {
        runtime.stop()
    }

    runtime = createRealtimeRuntime()
    runtime.start(httpServer)
}

export function closeWebSocket() {
    if (!runtime) return
    runtime.stop()
    runtime = null
}

