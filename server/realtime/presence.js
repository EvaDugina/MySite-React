export function applyPosition(client, { x, y, device }, now) {
    client.x = x
    client.y = y
    client.device = device
    client.lastSeen = now
    client.hasPosition = true
}

export function clearPosition(client) {
    client.x = null
    client.y = null
    client.hasPosition = false
}

