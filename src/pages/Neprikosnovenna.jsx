import "./Neprikosnovenna.css";
import styles from "./Neprikosnovenna.module.scss";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createCursorSettings,
  createCursorZoneSettings,
  CursorImages,
} from "../components/cursor/CursorSettings.js";
import Cursor from "../components/cursor/Cursor.jsx";
import Background from "../components/background/Background.jsx";
import {BackgroundType} from "../components/background/BackgroundSettings.js";
import Button from "../components/button/Button.jsx";
import ImagePortrait from "../components/portrait/ImagePortrait.jsx";
// import CursorClickTracker from "../components/cursor/CursorClickTracker.jsx";
import useSoundEffect from "../hooks/useSoundEffect.js";
import { FlashType } from "../components/flash/FlashSettings.js";
import FlashProvider from "../components/flash/FlashProvider.jsx";
import CursorFingerprintTracker from "../components/cursor/CursorFingerprintTracker.jsx";

const Zone = {
  NONE: 0,
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
};

const Neprikosnovenna = () => {
  const cursorRef = useRef(null);
  const articleRef = useRef(null);
  const cursorTrackerRef = useRef(null);
  const buttonRef = useRef(null);
  const flashProviderRef = useRef(null);
  const backgroundRef = useRef(null);

  const [isPortraitLoaded, setIsPortraitLoaded] = useState(false);
  const [isClickedOnPortrait, setIisClickedOnPortrait] = useState(false);

  //
  // AUDIO CONTROL
  //

  const { playAudio } = useSoundEffect(
    useMemo(() => "/audio/СимуляцияОргазма.mov", []),
  );

  //
  // CURSOR CONTROL
  //

  const handleOnButton = () => {
    // buttonRef.current.hover();
  };

  const handleOffButton = () => {
    // buttonRef.current.reset();
  };

  const cursorZoneSettingsRef = useRef(null);
  useEffect(() => {
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
        imgCursor: CursorImages.POINTER,
        imgCursorClicked: CursorImages.POINTER_CLICKED,
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

    cursorZoneSettingsRef.current = createCursorZoneSettings({
      Zone,
      Data: { ...ZoneData },
    });
  }, []);

  const handleLeftClickDown = useCallback(
    (currentElementId) => {
      if (currentElementId === "BtnNeprikosnovenna") {
        if (!buttonRef.current.isDisabled()){
          backgroundRef.current.hide();
          buttonRef.current.disable();
        }
      } else if (currentElementId === "Portrait") {
        if (!isClickedOnPortrait) setIisClickedOnPortrait(true);
        playAudio();
        flashProviderRef.current.flashes(FlashType.VZGLAD);
        let cursorPosition = cursorRef.current.getPosition();
        const articleRect = articleRef.current.getBoundingClientRect();
        const topValue = articleRef.current.offsetTop;
        const leftValue = articleRef.current.offsetLeft;
        let cursorPositionPercents = {
          x: ((cursorPosition.x - leftValue) / articleRect.width) * 100,
          y: ((cursorPosition.y - topValue) / articleRect.height) * 100,
        };
        cursorTrackerRef.current.saveClickPosition(cursorPositionPercents);
      }
    },
    [isClickedOnPortrait],
  );

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (currentElementId === "BtnNeprikosnovenna") {
      buttonRef.current.hover();
    } else if (currentElementId === "Portrait") {
    }
  }, []);

  const cursorSettings = useMemo(
    () =>
      createCursorSettings({
        imgCursor: CursorImages.DEFAULT,
        startX: null,
        startY: null,
        handleLeftClickDown,
        handleLeftClickUp,
        stiffness: 0.4,
        damping: 0.1,
        mass: 0.1,
        maxSpeed: 25,
      }),
    [handleLeftClickDown, handleLeftClickUp],
  );

  return (
    <>
      <Cursor
        ref={cursorRef}
        settings={cursorSettings}
        zoneSettingsRef={cursorZoneSettingsRef}
      />

      <main className={styles.main}>
        <div className={`${styles.container} z-1`}>
          <article
            ref={articleRef}
            className={`${styles["portrait-container-default"]}`}
          >
            <ImagePortrait
              id="Painting"
              zIndex={2}
              setIsLoadedCallback={setIsPortraitLoaded}
            />

            <Button
              ref={buttonRef}
              id="BtnNeprikosnovenna"
              variant="neprikosnovenna"
              zIndex={7}
              text="неприкосновенна"
            />

            <Background id="Background-1" ref={backgroundRef} type={BackgroundType.BLUE} zIndex={6} />

            <FlashProvider ref={flashProviderRef} zIndex={5} />

            {isPortraitLoaded && (
              <CursorFingerprintTracker
                ref={cursorTrackerRef}
                zIndex={4}
                startFadeIn={isClickedOnPortrait}
              />
            )}

            <div
              id="Portrait"
              className="z-3"
              style={{
                position: "absolute",
                width: "68%",
                height: "76%",
                top: "50.5%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "transparent",
              }}
            ></div>
          </article>
        </div>
      </main>

      <Background id="Background-0" type={BackgroundType.WHITE} zIndex={0} />
    </>
  );
};

export { Neprikosnovenna };
export default Neprikosnovenna;
