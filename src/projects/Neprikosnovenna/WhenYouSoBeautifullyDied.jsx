import React from "react";

import Cursor, {
  CursorType,
  StaticData,
  CursorSettings,
  ZoneConfig,
} from "./components/cursor/Cursor";
import PortraitContainer, {
  PortraitContainerType,
} from "./components/portraitContainer/PortraitContainer";
import Background from "./components/background/Background";

function WhenYouSoBeautifullyDied({ type = PortraitContainerType.DEFAULT }) {
  return (
    <>
      <Cursor settings={cursorSettings} />
      <PortraitContainer type={PortraitContainerType.DEFAULT} />
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
  maxSpeed: 0.5, // Максимальная скорость
});

const Zone = {
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
};

const settings = new ZoneConfig({
  Zone: Zone,
  ZONES_SETTINGS: {
    [Zone.BACK]: {
      element: null,
      imgCursor: StaticData[CursorType.POINTER].src,
      imgCursorClicked: StaticData[CursorType.POINTER].src,
      handleOn: null,
      handleOff: null,
    },
    [Zone.PORTRAIT]: {
      element: null,
      imgCursor: StaticData[CursorType.POINTER].src,
      imgCursorClicked: StaticData[CursorType.POINTER_CLICKED].src,
      handleOn: null,
      handleOff: null,
    },
    [Zone.BUTTON]: {
      element: null,
      imgCursor: StaticData[CursorType.POINTER].src,
      imgCursorClicked: StaticData[CursorType.POINTER_CLICKED].src,
      handleOn: null,
      handleOff: null,
    },
  },
});
