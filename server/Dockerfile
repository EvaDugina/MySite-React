FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/data

ENV DB_DIR=/app/data

EXPOSE 3001

CMD ["node", "index.js"]
