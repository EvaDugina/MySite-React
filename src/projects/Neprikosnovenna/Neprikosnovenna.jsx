import "./01.css";
import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";

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

const WhenYouSoBeautifullyDied = ({}) => {
  const cursorRef = useRef(null);
  const backgroundRef = useRef(null);
  const buttonRef = useRef(null);
  const portraitRef = useRef(null);

  const isClickedRef = useRef(false);
  const isVideoEndedRef = useRef(false);

  // Инициализация состояния из localStorage (или 0, если там ничего нет)
  const [isBloody, setIsBloody] = useState(() => {
    return JSON.parse(localStorage.getItem("01-isBloody")) ?? false;
  });

  useEffect(() => {
    if (isBloody) {
      portraitRef.current.rewindToEnd();
      portraitRef.current.show(false);
    }
  }, []);

  // При каждом изменении count обновляем localStorage
  useEffect(() => {
    localStorage.setItem("01-isBloody", JSON.stringify(isBloody));
  }, [isBloody]);

  //
  //
  //

  // useEffect(() => {
  //   console.log("WhenYouSoBeautifullyDied");
  // });

  const handleOnButton = () => {
    backgroundRef.current?.hide();
  };

  const handleOffButton = () => {
    backgroundRef.current?.show();
  };

  const ZoneData = {
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
  };

  const cursorZoneSettingsRef = useRef(
      new CursorZoneSettings({
        Zone: Zone,
        Data: { ...ZoneData },
      }),
  );

  //
  //
  //

  const handleLeftClickDown = useCallback((currentElementId) => {
    if (isVideoEndedRef.current) return;
    if (isBloody) return;
    if (currentElementId == "BtnNeprikosnovenna") {
      isClickedRef.current = true;
      portraitRef.current.show(true);
      portraitRef.current.play();
      setIsBloody(true);
      buttonRef.current.click();
      buttonRef.current.disable();
    }
  }, []);

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (isVideoEndedRef.current) return;
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
      maxSpeed: 25, // Максимальная скорость
    });
  }, []);

  //
  //
  //

  const handleVideoEnded = useCallback(() => {
    isVideoEndedRef.current = true;
    buttonRef.current.reset();
  }, []);

  const videoSettings = useMemo(() => {
    return {
      onEnded: handleVideoEnded,
    };
  }, []);

  return (
      <>
        <Cursor
            ref={cursorRef}
            settings={cursorSettings}
            zoneSettingsRef={cursorZoneSettingsRef}
        />

        <main>
          <article id="PortraitContainer" className="portrait-container-default">
            <div id="CursorsContainer" className="ignore-cursor d-none"></div>

            <Button
                ref={buttonRef}
                id="BtnNeprikosnovenna"
                text="неприкосновенна"
            />

            <Flash type={FlashType.BEHIND} />
            <Flash type={FlashType.FRONT} />
            <Flash />

            <Portrait
                ref={portraitRef}
                portraitType={PortraitType.VIDEO}
                settings={videoSettings}
            />
          </article>
        </main>

        <Background id="Background-0" classes="bg-white z-0" />
      </>
  );
};

export default WhenYouSoBeautifullyDied;
