FROM node:20-alpine3.21

WORKDIR /app

# 1. Копируем манифесты зависимостей — слой кэшируется до изменения package*.json
COPY package.json package-lock.json* ./

# 2. Устанавливаем только production-зависимости через npm ci
# --omit=dev исключает devDependencies, уменьшая размер образа
RUN npm ci --omit=dev

# 3. Копируем исходный код
COPY . .

# su-exec для переключения на non-root пользователя в entrypoint
RUN apk add --no-cache su-exec

# Создаём директорию для SQLite базы данных
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_DIR=/app/data
ENV PORT=3001

EXPOSE 3001

# Entrypoint: исправляет права на /app/data и переключается на node
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Healthcheck: проверяем что Express отвечает на /api/fingerprints
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/fingerprints || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "index.js"]
