import React, { useState, useEffect } from "react";
import "./Cursor.css";

import { useCursor } from "./hooks/useCursor";
import {
  CursorSettings,
  CursorZoneConfig,
  CursorImages,
} from "./CursorConstants";

function Cursor({
  cursorSettings = new CursorSettings(),
  cursorZoneConfig = new CursorZoneConfig(),
}) {
  const handleLeftClickDown = () => {
    changeCursorSrc(CursorImages.DEFAULT);
  };

  const handleLeftClickUp = () => {
    changeCursorSrc(CursorImages.DEFAULT);
  };

  const handleOnZone = (elementZone) => {
    if (elementZone.id == "Portrait") {
      changeCursorSrc(CursorImages.POINTER);
    }
  };

  const handleOffZone = (elementZone) => {};

  // Используем встроенный хук useCursor с передачей только settings
  const { cursorState, showCursor, hideCursor } = useCursor(
    cursorSettings,
    handleLeftClickDown,
    handleLeftClickUp,
  );

  const changeCursorSrc = (newSrc) => {
    if (!newSrc && newSrc != null) return;
    if (newSrc == null) newSrc = CursorImages.DEFAULT;
    setSrc(newSrc);
  };

  const [src, setSrc] = useState(cursorSettings.imgCursor);

  // Добавим безопасное извлечение данных из cursorState
  const position = cursorState.position;
  const isHidden = cursorState.isHidden;

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
