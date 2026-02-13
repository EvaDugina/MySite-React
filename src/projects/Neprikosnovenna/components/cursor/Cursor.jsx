import { useCallback, useEffect, useState } from "react";
import "./Cursor.css";

import { useCursor } from "./hooks/useCursor";

import { CursorSettings, CursorZoneConfig } from "./CursorConstants";
import { useZone } from "./hooks/useZone";

function Cursor({
  cursorSettings = new CursorSettings(),
  cursorZoneConfig = new CursorZoneConfig(),
}) {
  // useEffect(() => {
  //   console.log("Render!");
  // });

  const [src, setSrc] = useState(cursorSettings.imgCursor);
  const changeCursorSrc = (newSrc) => {
    if (!newSrc && newSrc != null) return;
    if (newSrc == null) newSrc = CursorImages.DEFAULT;
    setSrc(newSrc);
  };

  const { currentZoneDataRef, updateCurrentZone } = useZone(
    cursorZoneConfig,
    changeCursorSrc,
  );
  const handleLeftClickDown = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
    cursorSettings.handleLeftClickDown?.();
  }, [cursorSettings]);

  const handleLeftClickUp = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursor);
    cursorSettings.handleLeftClickUp?.();
  }, [cursorSettings]);

  const [position, setPosition] = useState({ x: null, y: null });
  const [isHidden, setIsHidden] = useState(true);
  const { showCursor, hideCursor } = useCursor(
    cursorSettings,
    position,
    setPosition,
    isHidden,
    setIsHidden,
    updateCurrentZone,
    handleLeftClickDown,
    handleLeftClickUp,
  );

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
