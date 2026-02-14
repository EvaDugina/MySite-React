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

  const handleLeftClickDown = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
    cursorSettings.handleLeftClickDown?.();
  }, [cursorSettings]);

  const handleLeftClickUp = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursor);
    cursorSettings.handleLeftClickUp?.();
  }, [cursorSettings]);

  const [src, setSrc] = useState(cursorSettings.imgCursor);
  const changeCursorSrc = useCallback((newSrc) => {
    if (!newSrc && newSrc != null) return;
    if (newSrc === null) newSrc = CursorImages.DEFAULT;
    setSrc(newSrc);
  }, []);

  const [isHidden, setIsHidden] = useState(true);
  const hideCursor = useCallback(() => {
    setIsHidden(true);
  }, []);

  const showCursor = useCallback(() => {
    setIsHidden(false);
  }, []);

  const [position, setPosition] = useState({ x: null, y: null });
  // const [isHidden, setIsHidden] = useState(true);
  const {} = useCursor(
    cursorSettings,
    position,
    setPosition,
    // isHidden,
    showCursor,
    // setIsHidden,
    handleLeftClickDown,
    handleLeftClickUp,
  );

  const { currentZoneDataRef } = useZone(
    position,
    cursorZoneConfig,
    changeCursorSrc,
  );

  return (
    <img
      id="Cursor"
      className="cursor ignore-cursor not-allowed z-999"
      src={src}
      alt="муха"
      style={{
        transform: `translate(-26.5%, -9%) translate3d(${position.x}px, ${position.y}px, 0)`,
        display: isHidden ? "none" : "block",
      }}
    />
  );
}

export default Cursor;
