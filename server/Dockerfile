FROM node:20-alpine

WORKDIR /app

# 1. Копируем манифесты зависимостей — слой кэшируется до изменения package*.json
COPY package.json package-lock.json* ./

# 2. Устанавливаем только production-зависимости через npm ci
# --omit=dev исключает devDependencies, уменьшая размер образа
RUN npm ci --omit=dev

# 3. Копируем исходный код
COPY . .

# Создаём директорию для SQLite базы данных
RUN mkdir -p /app/data

ENV DB_DIR=/app/data
ENV PORT=3001

EXPOSE 3001

# Переключаемся на встроенного non-root пользователя node (uid=1000)
# Директорию /app/data делаем доступной для этого пользователя
RUN chown -R node:node /app/data

USER node

# Healthcheck: проверяем что Express отвечает на /api/fingerprints
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/fingerprints || exit 1

CMD ["node", "index.js"]
