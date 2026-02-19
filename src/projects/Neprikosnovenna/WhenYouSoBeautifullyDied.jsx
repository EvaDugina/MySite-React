import React, { useCallback, useMemo, useRef } from "react";
import "./WhenYouSoBeautifullyDied.css";

import {
  CursorImages,
  CursorSettings,
  CursorZoneSettings,
} from "./components/cursor/CursorSettingsHandler";
import Cursor from "./components/cursor/Cursor";
import Portrait, { PortraitType } from "./components/portrait/Portrait";
import Flash, { FlashType } from "./components/Flash/Flash";
import Background from "./components/background/Background";
import Button from "./components/button/Button";

const Zone = {
  NONE: 0,
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
};

function WhenYouSoBeautifullyDied() {

  const cursorRef = useRef();
  const backgroundRef = useRef();
  const buttonRef = useRef()

  const handleOnButton = () => {
    backgroundRef.current?.hide()
    // buttonRef.current.hover()
  }
  
  const handleOffButton = () => {
    backgroundRef.current?.show()
    // buttonRef.current.reset()
  }

const cursorZoneSettingsRef = useRef(new CursorZoneSettings({
    Zone: Zone,
    Data: {
      [Zone.NONE]: {
        elementId: null,
        imgCursor: CursorImages.DEFAULT,
        imgCursorClicked: CursorImages.DEFAULT,
        handleOn: null,
        handleOff: null,
      },
      [Zone.BACK]: {
        elementId: "Background-0",
        imgCursor: CursorImages.DEFAULT,
        imgCursorClicked: CursorImages.DEFAULT,
        handleOn: null,
        handleOff: null,
      },
      [Zone.PORTRAIT]: {
        elementId: "Portrait",
        imgCursor: CursorImages.DEFAULT,
        imgCursorClicked: CursorImages.DEFAULT,
        handleOn: null,
        handleOff: null,
      },
      [Zone.BUTTON]: {
        elementId: "BtnNeprikosnovenna",
        imgCursor: CursorImages.POINTER,
        imgCursorClicked: CursorImages.POINTER_CLICKED,
        handleOn: handleOnButton,
        handleOff: handleOffButton,
      },
    },
  }))

  const handleLeftClickDown = useCallback((currentElementId) => {
    if (currentElementId == "BtnNeprikosnovenna") {
      buttonRef.current.focus()
    }
    // cursorControllRef.current?.hideCursor();
  }, []);

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (currentElementId == "BtnNeprikosnovenna") {
      // buttonRef.current.hover()
    }
  }, []);

  const cursorSettings = useMemo(() => {
    return new CursorSettings({
      imgCursor: CursorImages.DEFAULT,
      startX: null, // Начальная позиция от width по X
      startY: null, // Начальная позиция от рушпре по Y
      handleLeftClickDown: handleLeftClickDown,
      handleLeftClickUp: handleLeftClickUp,
      stiffness: 0.4, // Жесткость пружины (скорость реакции)
      damping: 0.1, // Затухание (плавность остановки)
      mass: 0.1, // Масса объекта
      maxSpeed: 15, // Максимальная скорость
    });
  }, []);

  return (
    <>
      <Cursor ref={cursorRef}
        settings={cursorSettings}
        zoneSettingsRef={cursorZoneSettingsRef}
      />

      <main>
        <article id="PortraitContainer" className="portrait-container-default">
          <div id="CursorsContainer" className="ignore-cursor d-none"></div>

          <Button ref={buttonRef} id="BtnNeprikosnovenna" text="неприкосновенна"/>

          <Flash type={FlashType.BEHIND} />
          <Flash type={FlashType.FRONT} />
          <Flash />

          <Portrait portraitType={PortraitType.VIDEO} />
        </article>

        <Background ref={backgroundRef} id="Background-1" classes="bg-blue z-3" />
      </main>

      <Background id="Background-0" classes="bg-white z-0" />
    </>
  );
}

export default WhenYouSoBeautifullyDied;
