import { useRef } from "react";
import "./Cursor.css";

import { useCursor } from "./hooks/useCursor";

import { CursorSettings, CursorZoneConfig } from "./CursorConstants";

function Cursor({
  cursorSettings = new CursorSettings(),
  cursorZoneConfig = new CursorZoneConfig(),
}) {
  const elementZoneRef = useRef(null);
  const currentZoneData = useRef(
    cursorZoneConfig.Data[cursorZoneConfig.Zone.NONE],
  );

  const handleLeftClickDown = () => {
    changeCursorSrc(currentZoneData.current.imgCursorClicked);
  };

  const handleLeftClickUp = () => {
    changeCursorSrc(currentZoneData.current.imgCursor);
  };

  const handleOnZone = (elementZone) => {
    Object.entries(cursorZoneConfig.Data).forEach(([key, settings]) => {
      const data = cursorZoneConfig.Data[parseInt(key)];
      if (data.elementId == elementZone.id) {
        changeCursorSrc(data.imgCursor);
        currentZoneData.current = data;
      }
    });
  };

  const handleOffZone = (elementZone) => {};

  const updateCurrentZone = (cursorPositionX, cursorPositionY) => {
    const elementUnder = document.elementFromPoint(
      cursorPositionX,
      cursorPositionY,
    );
    if (elementZoneRef.current == elementUnder) return;

    if (handleOffZone) handleOffZone(elementZoneRef.current);
    elementZoneRef.current = elementUnder;
    if (handleOnZone) handleOnZone(elementZoneRef.current);
  };

  // Используем встроенный хук useCursor с передачей только settings
  const { cursorState, showCursor, hideCursor, changeCursorSrc } = useCursor(
    cursorSettings,
    updateCurrentZone,
    handleLeftClickDown,
    handleLeftClickUp,
    handleOnZone,
    handleOffZone,
  );

  // Добавим безопасное извлечение данных из cursorState
  const position = cursorState.position;
  const isHidden = cursorState.isHidden;
  const src = cursorState.src;

  return (
    <img
      id="Cursor"
      className="cursor ignore-cursor not-allowed z-999"
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
