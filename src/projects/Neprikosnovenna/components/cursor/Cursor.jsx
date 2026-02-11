import { useRef, useState } from "react";
import "./Cursor.css";

import { useCursor } from "./hooks/useCursor";

import { CursorSettings, CursorZoneConfig } from "./CursorConstants";
import { useZone } from "./hooks/useZone";

function Cursor({
  cursorSettings = new CursorSettings(),
  cursorZoneConfig = new CursorZoneConfig(),
}) {
  const [src, setSrc] = useState(cursorSettings.imgCursor);
  const changeCursorSrc = (newSrc) => {
    if (!newSrc && newSrc != null) return;
    if (newSrc == null) newSrc = CursorImages.DEFAULT;
    setSrc(newSrc);
  };

  const handleLeftClickDown = () => {
    changeCursorSrc(currentZoneData.current.imgCursorClicked);
  };

  const handleLeftClickUp = () => {
    changeCursorSrc(currentZoneData.current.imgCursor);
  };

  const { currentZoneData, updateCurrentZone } = useZone(
    cursorZoneConfig,
    changeCursorSrc,
  );
  const { cursorState, showCursor, hideCursor } = useCursor(
    cursorSettings,
    updateCurrentZone,
    handleLeftClickDown,
    handleLeftClickUp,
  );

  // Добавим безопасное извлечение данных из cursorState
  const position = cursorState.position;
  const isHidden = cursorState.isHidden;

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
