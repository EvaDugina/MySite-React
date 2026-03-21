# Архитектура проекта

![Static Badge](https://img.shields.io/badge/react19-cyan)
![Static Badge](https://img.shields.io/badge/vite7-purple)
![Static Badge](https://img.shields.io/badge/html5-orange)
![Static Badge](https://img.shields.io/badge/css3-blue)
![Static Badge](https://img.shields.io/badge/javascript-yellow)
![Static Badge](https://img.shields.io/badge/nginx-green)
![Static Badge](https://img.shields.io/badge/docker-grey)

### Технологический стек

React 19.2 + Vite 7.2
react-router-dom 7.13 (SPA routing)
SCSS/CSS Modules (стилизация)
Express 5 + better-sqlite3 (Fingerprints API backend)
Docker + Nginx (production deployment)

### Архитектурные особенности

SPA с клиентским роутингом
Кастомный курсор с физикой движения (spring physics)
Компонентная архитектура с forwardRef для императивного управления
Зонная система для курсора (определение элементов под курсором)
Shared DB для отпечатков курсора (Express + SQLite API, общая для всех пользователей)

### Структура

```angular2html
Neprikosnovenna/
├── src/
│   ├── App.jsx                 # Корневой компонент
│   ├── index.jsx               # Entry point
│   ├── AppRouter.jsx           # Роутинг
│   ├── AppRouter.config.js     # Конфигурация маршрутов
│   ├── index.css               # Глобальные стили
│   ├── components/
│   │   ├── cursor/             # Кастомный курсор
│   │   ├── background/         # Фоновые слои
│   │   ├── button/             # Кнопка
│   │   ├── portrait/           # Портрет (изображение + видео)
│   │   ├── flash/              # Эффект вспышки
│   │   └── HeadController.jsx  # Управление мета-тегами
│   ├── hooks/                  # Глобальные хуки
│   └── pages/                  # Страницы
├── public/
│   ├── images/                 # Изображения (~6.5 MB)
│   ├── videos/                 # Видео (~3.2 MB)
│   └── audio/                  # Аудио (~20 KB)
├── server/
│   ├── index.js                # Express API сервер (3 эндпоинта)
│   ├── db.js                   # SQLite слой данных (better-sqlite3)
│   ├── package.json            # Зависимости backend
│   └── Dockerfile              # Контейнеризация API
├── for-docker/
│   └── nginx.conf              # Конфигурация Nginx
├── Dockerfile.prod
├── Dockerfile.dev.react
├── docker-compose.prod.yml
└── docker-compose.dev.yml
```
