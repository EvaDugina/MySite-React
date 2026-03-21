import express from 'express'
import cors from 'cors'
import { getAll, addBatch, getCount, clear, close } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.get('/api/fingerprints', (req, res) => {
    const fingerprints = getAll()
    res.json({ fingerprints })
})

app.post('/api/fingerprints', (req, res) => {
    const { fingerprints } = req.body

    if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
        return res.status(400).json({ error: 'fingerprints must be a non-empty array' })
    }

    const valid = fingerprints.every(f =>
        typeof f.x === 'number' && typeof f.y === 'number' &&
        f.x >= 0 && f.x <= 100 && f.y >= 0 && f.y <= 100
    )

    if (!valid) {
        return res.status(400).json({ error: 'each fingerprint must have x,y in range [0,100]' })
    }

    addBatch(fingerprints)
    const total = getCount()
    res.json({ added: fingerprints.length, total })
})

app.delete('/api/fingerprints', (req, res) => {
    clear()
    res.json({ cleared: true })
})

app.listen(PORT, () => {
    console.log(`Fingerprints API running on port ${PORT}`)
})

process.on('SIGINT', () => {
    close()
    process.exit(0)
})

process.on('SIGTERM', () => {
    close()
    process.exit(0)
})
