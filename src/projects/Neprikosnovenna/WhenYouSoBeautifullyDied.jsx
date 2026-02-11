import React, { useRef } from "react";
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

const cursorSettings = new CursorSettings({
  timeout: 0, // Задержка перед началом
  imgCursor: CursorImages.DEFAULT,
  startX: null, // Начальная позиция от width по X
  startY: null, // Начальная позиция от рушпре по Y
  handleLeftClickDown: null,
  handleLeftClickUp: null,
  handleDoubleLeftClick: null,
  stiffness: 0.4, // Жесткость пружины (скорость реакции)
  damping: 0.1, // Затухание (плавность остановки)
  mass: 0.1, // Масса объекта
  maxSpeed: 10, // Максимальная скорость
});

const Zone = {
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
};

const cursorZoneConfig = new CursorZoneConfig({
  Zone: Zone,
  Data: {
    [Zone.BACK]: {
      elementId: "Background",
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER,
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
  return (
    <>
      <Cursor
        cursorSettings={cursorSettings}
        cursorZoneConfig={cursorZoneConfig}
      />

      <main>
        <article id="PortraitContainer" className="portrait-container-default">
          <div id="CursorsContainer" className="d-none"></div>

          <button id="BtnNeprikosnovenna" className="not-allowed z-6">
            неприкосновенна
          </button>

          <Flash type={FlashType.BEHIND} />
          <Flash type={FlashType.FRONT} />
          <Flash />

          <Portrait portraitType={PortraitType.VIDEO} />
        </article>

        <Background zIndex="3" />
      </main>
    </>
  );
}

export default WhenYouSoBeautifullyDied;
