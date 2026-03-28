export function createLogger({ enabled }) {
    function debug(message, data = null) {
        if (!enabled) return
        if (data === null) {
            console.log(`[ws] ${message}`)
            return
        }
        console.log(`[ws] ${message}`, data)
    }

    return {
        debug,
    }
}

