import React, { useEffect, useContext } from "react";
import "./Cursor.css";

import { useCursor } from "./hooks/useCursor";
import { CursorSettings, CursorZoneConfig } from "./CursorConstants";

function Cursor({
  cursorSettings = new CursorSettings(),
  cursorZoneConfig = new CursorZoneConfig(),
}) {
  // Используем встроенный хук useCursor с передачей только settings
  const { cursorState } = useCursor(cursorSettings, cursorZoneConfig);

  // Добавим безопасное извлечение данных из cursorState
  const position = cursorState.position;
  const src = cursorState.src;
  const isHidden = cursorState.isHidden;

  // Пример использования методов (опционально)
  useEffect(() => {
    // Вы можете использовать методы из хука здесь
  }, []);

  return (
    <img
      id="Cursor"
      className="cursor not-allowed z-999"
      src={src}
      alt="муха"
      style={{
        left: position.x,
        top: position.y,
        display: isHidden ? "none" : "block",
      }}
    />
  );
}

export default Cursor;

//
//
//
