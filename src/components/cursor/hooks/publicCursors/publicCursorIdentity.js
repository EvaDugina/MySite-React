const SESSION_CLIENT_ID_KEY = 'public_cursor_client_id'
const PAGE_SESSION_ID = createSessionId()
const PAGE_BOOT_AT = Date.now()
const PAGE_BOOT_SEQ = createBootSeq()
let clientIdMemoryFallback = null

function createClientId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `pc_${crypto.randomUUID().replace(/-/g, '')}`
    }
    return `pc_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

function tryReadClientIdFromSessionStorage() {
    try {
        if (typeof sessionStorage === 'undefined') return null
        const existing = sessionStorage.getItem(SESSION_CLIENT_ID_KEY)
        if (typeof existing !== 'string' || existing.length === 0) return null
        return existing
    } catch {
        return null
    }
}

function tryWriteClientIdToSessionStorage(clientId) {
    try {
        if (typeof sessionStorage === 'undefined') return false
        sessionStorage.setItem(SESSION_CLIENT_ID_KEY, clientId)
        return true
    } catch {
        return false
    }
}

export function getOrCreateClientId() {
    const existing = tryReadClientIdFromSessionStorage()
    if (existing) {
        clientIdMemoryFallback = existing
        return existing
    }

    if (clientIdMemoryFallback) return clientIdMemoryFallback

    const next = createClientId()
    clientIdMemoryFallback = next
    tryWriteClientIdToSessionStorage(next)
    return next
}

function createSessionId() {
    return createClientId().replace('pc_', 'ps_')
}

function createBootSeq() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().slice(0, 8)
    }
    return Math.random().toString(36).slice(2, 10)
}

export function getPageSessionId() {
    return PAGE_SESSION_ID
}

export function getPageLineage() {
    return {
        bootAt: PAGE_BOOT_AT,
        pageSeq: PAGE_BOOT_SEQ,
    }
}
