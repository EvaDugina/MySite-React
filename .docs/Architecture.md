# Архитектура проекта

![Static Badge](https://img.shields.io/badge/react19-cyan)
![Static Badge](https://img.shields.io/badge/vite7-purple)
![Static Badge](https://img.shields.io/badge/javascript-yellow)
![Static Badge](https://img.shields.io/badge/nginx-green)
![Static Badge](https://img.shields.io/badge/docker-grey)

## Технологический стек

- React 19.2 + Vite 7.2
- react-router-dom 7.13 (SPA routing)
- CSS Modules / SCSS
- Express 5 + better-sqlite3 + ws (backend)
- Docker + Nginx

## Архитектурные особенности

- SPA с клиентским роутингом.
- Кастомный курсор с физикой движения.
- Императивная оркестрация UI-компонентов через `forwardRef`.
- Две серверные подсистемы:
  - REST API `/api/fingerprints` (SQLite);
  - WebSocket realtime `/ws` для публичных курсоров.

## Структура репозитория

```text
Neprikosnovenna/
  src/
    App.jsx
    index.jsx
    AppRouter.jsx
    AppRouter.config.js
    components/
      cursor/
      background/
      button/
      portrait/
      flash/
    pages/
  server/
    index.js                  # composition root backend
    db.js                     # SQLite слой для fingerprints
    websocket.js              # facade setupWebSocket/closeWebSocket
    realtime/                 # декомпозированная WS-подсистема
      runtime.js
      transport.js
      protocol.js
      registry.js
      presence.js
      broadcast.js
      liveness.js
      config.js
      logger.js
      *.test.js
  for-docker/
    nginx.conf
  docker-compose.dev.yml
  docker-compose.prod.yml
```

