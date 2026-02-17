import React, { useCallback, useMemo, useRef } from "react";
import "./WhenYouSoBeautifullyDied.css";

import {
  CursorImages,
  CursorSettings,
  CursorZoneConfig,
} from "./components/cursor/CursorConstants";
import Cursor from "./components/cursor/Cursor";
import Portrait, { PortraitType } from "./components/portrait/Portrait";
import Flash, { FlashType } from "./components/Flash/Flash";
import Background from "./components/background/Background";

const Zone = {
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
};

const cursorZoneConfig = new CursorZoneConfig({
  Zone: Zone,
  Data: {
    [Zone.BACK]: {
      elementId: "Background-0",
      imgCursor: CursorImages.DEFAULT,
      imgCursorClicked: CursorImages.DEFAULT,
      handleOn: null,
      handleOff: null,
    },
    [Zone.PORTRAIT]: {
      elementId: "Portrait",
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER_CLICKED,
      handleOn: null,
      handleOff: null,
    },
    [Zone.BUTTON]: {
      elementId: "BtnNeprikosnovenna",
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER_CLICKED,
      handleOn: null,
      handleOff: null,
    },
  },
});

function WhenYouSoBeautifullyDied() {
  const handleLeftClickDown = useCallback((val) => {}, []);

  const handleLeftClickUp = useCallback((val) => {}, []);

  const cursorSettings = useMemo(() => {
    return new CursorSettings({
      imgCursor: CursorImages.DEFAULT,
      startX: 0.9, // Начальная позиция от width по X
      startY: 0.25, // Начальная позиция от рушпре по Y
      handleLeftClickDown: handleLeftClickDown,
      handleLeftClickUp: handleLeftClickUp,
      stiffness: 0.4, // Жесткость пружины (скорость реакции)
      damping: 0.1, // Затухание (плавность остановки)
      mass: 0.1, // Масса объекта
      maxSpeed: 20, // Максимальная скорость
    });
  }, []);

  return (
    <>
      <Cursor
        settings={cursorSettings}
        zoneConfig={cursorZoneConfig}
      />

      <main>
        <article id="PortraitContainer" className="portrait-container-default">
          <div id="CursorsContainer" className="ignore-cursor d-none"></div>

          <button id="BtnNeprikosnovenna" className="not-allowed z-6">
            неприкосновенна
          </button>

          <Flash type={FlashType.BEHIND} />
          <Flash type={FlashType.FRONT} />
          <Flash />

          <Portrait portraitType={PortraitType.VIDEO} />
        </article>

        <Background id="Background-1" classes="bg-blue z-3 d-none" />
      </main>

      <Background id="Background-0" classes="bg-white z-0" />
    </>
  );
}

export default WhenYouSoBeautifullyDied;
