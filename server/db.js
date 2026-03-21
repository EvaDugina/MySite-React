import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DB_DIR || __dirname
const DB_PATH = join(dataDir, 'fingerprints.db')

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

db.exec(`
    CREATE TABLE IF NOT EXISTS fingerprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x REAL NOT NULL,
        y REAL NOT NULL
    )
`)

const stmtGetAll = db.prepare('SELECT x, y FROM fingerprints')
const stmtInsert = db.prepare('INSERT INTO fingerprints (x, y) VALUES (?, ?)')
const stmtCount = db.prepare('SELECT COUNT(*) as count FROM fingerprints')

const insertMany = db.transaction((fingerprints) => {
    for (const { x, y } of fingerprints) {
        stmtInsert.run(x, y)
    }
})

export function getAll() {
    return stmtGetAll.all()
}

export function addBatch(fingerprints) {
    insertMany(fingerprints)
}

export function clear() {
    db.exec('DELETE FROM fingerprints')
}

export function getCount() {
    return stmtCount.get().count
}

export function close() {
    db.close()
}
