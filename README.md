# **_[Neprikosnovenna](http://82.202.138.61/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood) Web-Триптих_**

Динамическая инсталляция [**_«Неприкосновенна»_**](http://82.202.138.61/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood) посвящена снятию оппозиции между руктоворным и сакральным. Потому как и само сакральное только тогда становится сакральным, когда его хочется украсть, уничтожить, спасти или сохранить. Так или иначе, но до живого всегда хочется дотронуться. 

<kbd>
<img src=".docs/screenshots/1-01.webp" alt="Скриншот 01 - Неприкосновенна" align="center">
</kbd>

<kbd>
<img src=".docs/screenshots/1-02.webp" alt="Скриншот 02 - Джоконда неприкосновенна" align="center">
</kbd>

<kbd>
<img src=".docs/screenshots/1-06.webp" alt="Скриншот 03 - Джоконда под вспышками" align="center">
</kbd>

<kbd>
<img src=".docs/screenshots/1-04.webp" alt="Скриншот 04 - Джоконда истекающая кровью / Ожившая" align="center">
</kbd>

<kbd>
<img src=".docs/screenshots/1-05.webp" alt="Скриншот 05 - Джоконда которой не больно" align="center">
</kbd>

<kbd>
<img src=".docs/screenshots/1-08.webp" alt="Скриншот 06 - Кетчуп" align="center">
</kbd>

---
---

## Архитектура проекта

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
Docker + Nginx (production deployment)

### Архитектурные особенности
SPA с клиентским роутингом
Кастомный курсор с физикой движения (spring physics)
Компонентная архитектура с forwardRef для императивного управления
Зонная система для курсора (определение элементов под курсором)

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
├── for-docker/
│   └── nginx.conf              # Конфигурация Nginx
├── Dockerfile.prod
├── Dockerfile.dev.react
├── docker-compose.prod.yml
└── docker-compose.dev.yml
```

---

## CI / CD

### PROD

```bash
docker-compose -f .\docker-compose.prod.yml up --build -d
```

### DEV

```bash
docker compose -f .\docker-compose.dev.yml up --build
```
