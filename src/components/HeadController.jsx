import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { routes } from "../AppRouter.config.js";

/**
 * HeadController - компонент для динамического обновления мета-данных страницы
 * Обновляет title, favicon и другие мета-теги при изменении маршрута
 */
function HeadController() {
  const location = useLocation();

  useEffect(() => {
    // Находим маршрут по текущему пути
    const currentRoute = routes.find(
      (route) => route.path === location.pathname,
    );

    // Обновляем заголовок страницы
    document.title = currentRoute?.title || "Palkh";

    // Обновляем favicon, если указан
    if (currentRoute?.icon) {
      updateFavicon(currentRoute.icon);
    }

    // Обновляем другие мета-теги, если они есть
    updateMetaTags(currentRoute);
  }, [location.pathname]);

  return null;
}

/**
 * Функция для обновления favicon страницы
 * @param {string} iconUrl - URL иконки
 */
function updateFavicon(iconUrl) {
  // Удаляем существующие динамические favicon
  const existingFavicons = document.querySelectorAll(
    'link[data-dynamic-favicon="true"]',
  );
  existingFavicons.forEach((favicon) => favicon.remove());

  // Определяем тип иконки по расширению файла
  const getMimeType = (url) => {
    const extension = url.split(".").pop().toLowerCase();
    switch (extension) {
      case "ico":
        return "image/x-icon";
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "svg":
        return "image/svg+xml";
      case "gif":
        return "image/gif";
      default:
        return "image/x-icon";
    }
  };

  const mimeType = getMimeType(iconUrl);

  // Создаем основной favicon
  const faviconLink = document.createElement("link");
  faviconLink.rel = "icon";
  faviconLink.href = iconUrl;
  faviconLink.type = mimeType;
  faviconLink.setAttribute("data-dynamic-favicon", "true");
  document.head.appendChild(faviconLink);

  // Создаем shortcut icon для старых браузеров
  const shortcutLink = document.createElement("link");
  shortcutLink.rel = "shortcut icon";
  shortcutLink.href = iconUrl;
  shortcutLink.type = mimeType;
  shortcutLink.setAttribute("data-dynamic-favicon", "true");
  document.head.appendChild(shortcutLink);

  // Создаем apple-touch-icon для iOS устройств
  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    const appleTouchLink = document.createElement("link");
    appleTouchLink.rel = "apple-touch-icon";
    appleTouchLink.href = iconUrl;
    appleTouchLink.setAttribute("data-dynamic-favicon", "true");
    document.head.appendChild(appleTouchLink);
  }
}

/**
 * Функция для обновления других мета-тегов
 * @param {Object} routeData - данные текущего маршрута
 */
function updateMetaTags(routeData) {
  if (!routeData) return;

  // Обновление meta description
  if (routeData.description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = routeData.description;
  }

  // Обновление meta keywords
  if (routeData.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = routeData.keywords;
  }

  // Обновление Open Graph тегов
  updateOpenGraphTags(routeData);
}

/**
 * Функция для обновления Open Graph тегов (для соцсетей)
 * @param {Object} routeData - данные текущего маршрута
 */
function updateOpenGraphTags(routeData) {
  if (!routeData) return;

  // Open Graph Title
  if (routeData.title) {
    updateOrCreateMetaTag("og:title", routeData.title);
  }

  // Open Graph Description
  if (routeData.description) {
    updateOrCreateMetaTag("og:description", routeData.description);
  }

  // Open Graph Image
  if (routeData.ogImage || routeData.icon) {
    updateOrCreateMetaTag("og:image", routeData.ogImage || routeData.icon);
  }

  // Open Graph URL
  updateOrCreateMetaTag("og:url", window.location.href);
}

/**
 * Вспомогательная функция для обновления или создания meta тегов
 * @param {string} property - свойство meta тега
 * @param {string} content - содержимое
 */
function updateOrCreateMetaTag(property, content) {
  let metaTag = document.querySelector(`meta[property="${property}"]`);

  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.setAttribute("property", property);
    document.head.appendChild(metaTag);
  }

  metaTag.setAttribute("content", content);
}

export default HeadController;
