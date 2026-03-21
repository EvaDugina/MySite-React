# Fingerprints API Server — Архитектура

Минимальный REST API сервер для хранения отпечатков курсора. Общая БД для всех пользователей.

---

## Структура файлов

```
server/
    index.js          # Express сервер (HTTP endpoints)
    db.js             # SQLite слой данных (better-sqlite3)
    package.json      # Зависимости
    Dockerfile        # Контейнеризация
```

---

## Стек

- **Express 5** — HTTP сервер
- **better-sqlite3** — синхронный SQLite-драйвер (самый быстрый для Node.js)
- **cors** — CORS middleware
- **Node.js 20** (Alpine в Docker)

---

## API Endpoints

### GET /api/fingerprints

Возвращает все отпечатки из БД.

```json
// Response
{ "fingerprints": [{ "x": 45.2, "y": 67.8 }, ...] }
```

### POST /api/fingerprints

Batch-добавление отпечатков. Все вставки в одной транзакции.

```json
// Request
{ "fingerprints": [{ "x": 45.2, "y": 67.8 }, { "x": 12.1, "y": 33.4 }] }

// Response
{ "added": 2, "total": 1523 }
```

**Валидация:**
- `fingerprints` — непустой массив
- Каждый элемент: `x` и `y` — числа в диапазоне [0, 100]

### DELETE /api/fingerprints

Очистка всех отпечатков.

```json
// Response
{ "cleared": true }
```

---

## База данных (SQLite)

### Схема

```sql
CREATE TABLE fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x REAL NOT NULL,
    y REAL NOT NULL
);
```

Минимальный формат: только координаты в процентах. Без timestamp, без user info.

### Оптимизации

- **WAL mode** (`journal_mode = WAL`) — параллельное чтение и запись
- **NORMAL synchronous** — баланс скорости и надёжности
- **Prepared statements** — `stmtGetAll`, `stmtInsert`, `stmtCount` создаются один раз
- **Batch insert в транзакции** — `db.transaction()` для атомарной вставки массива

### Путь к файлу БД

- Локально: `server/fingerprints.db` (рядом с index.js)
- Docker: `/app/data/fingerprints.db` (через `DB_DIR=/app/data`)

---

## Функции db.js

| Функция | Описание |
|---------|----------|
| `getAll()` | `SELECT x, y FROM fingerprints` — все записи |
| `addBatch(fingerprints)` | INSERT массива в одной транзакции |
| `getCount()` | `SELECT COUNT(*) FROM fingerprints` |
| `clear()` | `DELETE FROM fingerprints` |
| `close()` | Закрытие соединения с БД |

---

## Docker

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
RUN mkdir -p /app/data
ENV DB_DIR=/app/data
EXPOSE 3001
CMD ["node", "index.js"]
```

### docker-compose.dev.yml (сервис api)

```yaml
api:
    build:
        context: ./server
        dockerfile: Dockerfile
    container_name: fingerprints-api
    ports:
        - "3001:3001"
    volumes:
        - ./server/data:/app/data    # Персистентное хранение БД
    environment:
        - PORT=3001
```

---

## Интеграция с Frontend

### Vite Proxy (vite.config.js)

```js
server: {
    proxy: {
        '/api': {
            target: process.env.API_URL || 'http://localhost:3001',
            changeOrigin: true,
        },
    },
}
```

- Локально: proxy на `http://localhost:3001`
- Docker: proxy на `http://api:3001` (через env `API_URL`)

### Клиентский хук (useFingerprintAPI.js)

- `GET /api/fingerprints` — при монтировании компонента
- `POST /api/fingerprints` — debounced batch (500ms)
- `DELETE /api/fingerprints` — при вызове `clearAllFingerprints()`

---

## Graceful Shutdown

Сервер корректно закрывает соединение с SQLite при SIGINT/SIGTERM:

```js
process.on('SIGINT', () => { close(); process.exit(0) })
process.on('SIGTERM', () => { close(); process.exit(0) })
```

---

## Производительность

| Операция | Скорость |
|----------|----------|
| SELECT ALL (10k записей) | < 5ms |
| Batch INSERT (100 записей) | < 1ms |
| COUNT | < 0.1ms |
| DELETE ALL | < 1ms |

---

## Запуск

```bash
# Локально
cd server && npm install && npm run dev

# Docker
docker compose -f docker-compose.dev.yml up --build -d

# Отладка — очистка БД
curl -X DELETE http://localhost:3001/api/fingerprints

# Или из DevTools Console
fetch('/api/fingerprints', { method: 'DELETE' })
```
