---
name: docker-best-practices
description: "Оптимизация Docker-образов для React-приложений (Vite + Nginx)"
---

# Docker Best Practices для React-приложений

## Многоступенчатая сборка (multi-stage)

Проект использует стандартный паттерн:

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: run
FROM nginx:alpine
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/dist /usr/share/nginx/html
COPY for-docker/nginx.conf /etc/nginx/conf.d/default.conf
USER appuser
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

## Кэширование слоёв

- Сначала копируйте только `package.json` и `package-lock.json` (или `yarn.lock`), затем выполняйте `npm ci`. Это позволяет кэшировать слой зависимостей.
- Используйте `npm ci` вместо `npm install` для чистой установки (быстрее, детерминированно).
- Если есть dev-зависимости, которые не нужны в рантайме, устанавливайте их отдельно или используйте `--only=production` после копирования всего кода.

## Безопасность

- Запускайте контейнер от **non-root** пользователя (см. `adduser` / `addgroup`).
- Удаляйте ненужные пакеты (например, `apk del ...` в Alpine).
- Не храните секреты в образе.
- Используйте `.dockerignore` для исключения лишних файлов (`node_modules`, `.git`, локальные конфиги).

## Оптимизация размера образа

- Базовый образ `node:20-alpine` весит ~130 МБ, но в финальном образе используется `nginx:alpine` (~40 МБ).
- Убирайте `npm cache` после установки:
  ```dockerfile
  RUN npm ci && npm cache clean --force
  ```
- В production-образе не должно быть исходников, только собранные статические файлы.

## Nginx конфигурация

Проект использует конфиг `for-docker/nginx.conf` со следующими настройками:

- **SPA fallback**:
  ```nginx
  try_files $uri $uri/ /index.html;
  ```
- **Кэширование статики**:
  ```nginx
  expires 1y;
  add_header Cache-Control "public, immutable";
  ```
  для файлов с хэшем в имени.
- **Сжатие**:
  ```nginx
  gzip on;
  gzip_types text/css application/javascript ...;
  ```
- **Безопасные заголовки**:
  `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`

## Docker Compose

- Для разработки: `docker-compose.dev.yml` с монтированием исходников и hot-reload.

- Для продакшена: `docker-compose.prod.yml` с собранным образом и переменными окружения.

## Healthcheck

Добавьте в Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
```

## Логи

В production-режиме логи nginx пишутся в `stdout` / `stderr`, что удобно для Docker.

## Проверка образа

- `docker scout quick` — анализ уязвимостей (если доступен).
- `docker images | grep <your-image>` — проверка размера.
