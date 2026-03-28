export function runPingSweep({ registry, cleanupClient }) {
    const deadClients = []

    for (const client of registry.connectionsByWs.values()) {
        if (!client.isAlive) {
            deadClients.push(client)
            continue
        }

        client.isAlive = false
        try {
            client.ws.ping()
        } catch {
            deadClients.push(client)
        }
    }

    for (const client of deadClients) {
        cleanupClient(client, {
            reason: 'dead',
            terminate: true,
        })
    }
}

