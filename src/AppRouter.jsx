import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { routes } from "./AppRouter.config.js";
import HeadController from "./components/HeadController";
import ScrollToTop from "./hooks/scrollToTop.js";

function AppRouter() {
  return (
    <Router>
      {/* HeadController для динамического обновления мета-данных */}
      <HeadController />
      <ScrollToTop />
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={<route.component />} />
        ))}
        {/* Маршрут 404 */}
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
