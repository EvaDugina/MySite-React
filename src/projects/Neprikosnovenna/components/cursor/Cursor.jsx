import { useCallback, useEffect, useState } from "react";
import "./Cursor.css";

import { useCursorMove } from "./hooks/useCursorMove";

import { CursorSettings, CursorZoneConfig } from "./CursorConstants";
import { useCursorZone } from "./hooks/useCursorZone";
import useCursorEvents from "./hooks/useCursorEvents";

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

  const { enableCursor, disableCursor } = useCursorEvents(
    handleLeftClickDown,
    handleLeftClickUp,
  );

  const { position } = useCursorMove(
    cursorSettings,
    showCursor,
    enableCursor,
    disableCursor,
  );

  const { currentZoneDataRef } = useCursorZone(
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
