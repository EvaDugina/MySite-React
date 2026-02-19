import { forwardRef, useImperativeHandle, useCallback, useState } from "react";
import "./Cursor.css";

import { useCursorMove } from "./hooks/useCursorMove";
import useCursorEvents from "./hooks/useCursorEvents";

const Cursor = forwardRef((props, ref) => {

  const { settings, zoneSettingsRef} = props 

  const [src, setSrc] = useState(settings.imgCursor);
  const changeCursorSrc = useCallback((newSrc) => {
    if (newSrc === undefined || newSrc === null) return;
    setSrc(newSrc);
  }, []);

  const handleLeftClickDown = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
    settings.handleLeftClickDown?.(currentZoneDataRef.current.elementId);
  }, []);

  const handleLeftClickUp = useCallback(() => {
    changeCursorSrc(currentZoneDataRef.current.imgCursor);
    settings.handleLeftClickUp?.(currentZoneDataRef.current.elementId);
  }, []);

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

  const {position, stopCursor, startCursor, currentZoneDataRef} = useCursorMove(
    settings,
    showCursor,
    enableCursor,
    disableCursor,
    changeCursorSrc,
    zoneSettingsRef
  );

  useImperativeHandle(ref, () => ({
    hideCursor,
    showCursor,
    disableCursor,
    enableCursor,
    stopCursor, 
    startCursor
  }));

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
});

export default Cursor;
