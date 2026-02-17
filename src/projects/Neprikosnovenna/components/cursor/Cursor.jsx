import { useCallback, useEffect, useState } from "react";
import "./Cursor.css";

import { useCursorMove } from "./hooks/useCursorMove";

import { CursorSettings, CursorZoneConfig } from "./CursorConstants";
import { useCursorZone } from "./hooks/useCursorZone";
import useCursorEvents from "./hooks/useCursorEvents";

const defaultSettings = new CursorSettings();
const defaultZoneConfig = new CursorZoneConfig();

function Cursor({ cursorSettings, cursorZoneConfig}) {

  const settings = cursorSettings || defaultSettings;
  const zoneConfig = cursorZoneConfig || defaultZoneConfig;

  const [src, setSrc] = useState(settings.imgCursor);
  const changeCursorSrc = useCallback((newSrc) => {
    if (newSrc === undefined || newSrc === null) return;
    setSrc(newSrc);
  }, []);

  const handleLeftClickDown = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
    settings.handleLeftClickDown?.();
  }, [settings]);

  const handleLeftClickUp = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursor);
    settings.handleLeftClickUp?.();
  }, [settings]);

  const { enableCursor, disableCursor } = useCursorEvents(
    handleLeftClickDown,
    handleLeftClickUp,
  );

  const [isHidden, setIsHidden] = useState(true);
  const hideCursor = useCallback(() => {
    setIsHidden(true);
  }, []);

  const showCursor = useCallback(() => {
    setIsHidden(false);
  }, []);

  const {position, getPositionStable} = useCursorMove(
    settings,
    showCursor,
    enableCursor,
    disableCursor,
  );

  const { currentZoneDataRef } = useCursorZone(
    getPositionStable,
    zoneConfig,
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
