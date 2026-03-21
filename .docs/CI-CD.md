# CI / CD

### PROD

```bash
docker-compose -f .\docker-compose.prod.yml up --build -d
```

### DEV (Docker)

```bash
docker compose -f .\docker-compose.dev.yml up --build
```

### DEV (локально, без Docker)

```bash
# Backend (терминал 1)
cd server && npm install && npm run dev

# Frontend (терминал 2)
npm run dev
```

### Очистка БД отпечатков

```bash
curl -X DELETE http://localhost:3001/api/fingerprints
```
