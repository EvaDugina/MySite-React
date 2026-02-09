import React from "react";
import "./WhenYouSoBeautifullyDied.css";

import {
  CursorType,
  CursorImages,
  CursorSettings,
  CursorZoneConfig,
} from "./components/cursor/CursorConstants";
import Cursor from "./components/cursor/Cursor";
import Portrait, { PortraitType } from "./components/portrait/Portrait";
import Flash, { FlashType } from "./components/Flash/Flash";
import Background from "./components/background/Background";

function WhenYouSoBeautifullyDied() {
  return (
    <>
      <Cursor
        cursorSettings={cursorSettings}
        cursorZoneConfig={cursorZoneConfig}
      />

      <div id="PortraitContainer" className="portrait-container-default">
        <div id="CursorsContainer" className="d-none"></div>

        <button id="BtnNeprikosnovenna" className="not-allowed z-6">
          неприкосновенна
        </button>

        <Flash flashType={FlashType.BEHIND} />
        <Flash flashType={FlashType.FRONT} />
        <Flash />

        <Portrait portraitType={PortraitType.VIDEO} />
      </div>

      <Background />
    </>
  );
}

export default WhenYouSoBeautifullyDied;

const cursorSettings = new CursorSettings({
  timeout: 0, // Задержка перед началом
  startX: 0.9, // Начальная позиция от width по X
  startY: 0.25, // Начальная позиция от рушпре по Y
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
      element: null,
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER,
      handleOn: null,
      handleOff: null,
    },
    [Zone.PORTRAIT]: {
      element: null,
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER_CLICKED,
      handleOn: null,
      handleOff: null,
    },
    [Zone.BUTTON]: {
      element: null,
      imgCursor: CursorImages.POINTER,
      imgCursorClicked: CursorImages.POINTER_CLICKED,
      handleOn: null,
      handleOff: null,
    },
  },
});
