export function applyPosition(client, { x, y, device, iconKey }, now) {
    client.x = x
    client.y = y
    client.device = device
    if (typeof iconKey === 'string' && iconKey.length > 0) {
        client.iconKey = iconKey
    }
    client.lastSeen = now
    client.hasPosition = true
}

export function applyIconKey(client, iconKey) {
    if (typeof iconKey !== 'string' || iconKey.length === 0) return
    client.iconKey = iconKey
}

export function clearPosition(client) {
    client.x = null
    client.y = null
    client.hasPosition = false
}
