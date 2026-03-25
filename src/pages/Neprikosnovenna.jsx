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
import Button from "../components/button/Button.jsx";
import ImagePortrait from "../components/portrait/ImagePortrait.jsx";
// import CursorClickTracker from "../components/cursor/CursorClickTracker.jsx";
import useSoundEffect from "../hooks/useSoundEffect.js";
import { FlashType } from "../components/flash/FlashSettings.js";
import FlashProvider from "../components/flash/FlashProvider.jsx";
import CursorFingerprintTracker from "../components/cursor/CursorFingerprintTracker.jsx";
import { FingerprintConfig } from "../components/cursor/CursorFingerprintTrackerSettings.js";

const Zone = {
  NONE: 0,
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
  OBEZZHIRIT: 4,
};

const Neprikosnovenna = () => {
  const cursorRef = useRef(null);
  const articleRef = useRef(null);
  const cursorTrackerRef = useRef(null);
  const buttonRef = useRef(null);
  const obezzhiritRef = useRef(null);
  const flashProviderRef = useRef(null);

  const [isPortraitLoaded, setIsPortraitLoaded] = useState(false);
  const [isClickedOnPortrait, setIisClickedOnPortrait] = useState(false);
  const [isObezzhiritVisible, setIsObezzhiritVisible] = useState(false);
  const dbHasFingerprintsRef = useRef(null);
  const fadeInTimerRef = useRef(null);

  //
  // AUDIO CONTROL
  //

  const { playAudio } = useSoundEffect(
    useMemo(() => "/audio/СимуляцияОргазма.mov", []),
  );

  //
  // CURSOR CONTROL
  //

  const handleTrackerReady = useCallback((count) => {
    if (count > 20) {
      dbHasFingerprintsRef.current = true;
      fadeInTimerRef.current = setTimeout(() => {
        setIsObezzhiritVisible(true);
      }, FingerprintConfig.FADE_IN_DURATION);
    } else {
      dbHasFingerprintsRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (fadeInTimerRef.current) clearTimeout(fadeInTimerRef.current);
    };
  }, []);

  const handleOnButton = () => {
    buttonRef.current.hover();
  };

  const handleOffButton = () => {
    buttonRef.current.reset();
  };

  const handleOnObezzhirit = () => {
    obezzhiritRef.current?.hover();
  };

  const handleOffObezzhirit = () => {
    obezzhiritRef.current?.reset();
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
      [Zone.OBEZZHIRIT]: {
        elementId: "BtnObezzhirit",
        imgCursor: CursorImages.POINTER,
        imgCursorClicked: CursorImages.POINTER_CLICKED,
        handleOn: handleOnObezzhirit,
        handleOff: handleOffObezzhirit,
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
        buttonRef.current.click();
      } else if (currentElementId === "BtnObezzhirit") {
        obezzhiritRef.current.click();
        cursorTrackerRef.current.clearAllFingerprints();
        setIsObezzhiritVisible(false);
        dbHasFingerprintsRef.current = false;
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

        if (dbHasFingerprintsRef.current === false) {
          setIsObezzhiritVisible(true);
          dbHasFingerprintsRef.current = true;
        }
      }
    },
    [isClickedOnPortrait],
  );

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (currentElementId === "BtnNeprikosnovenna") {
      buttonRef.current.hover();
    } else if (currentElementId === "BtnObezzhirit") {
      obezzhiritRef.current.hover();
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
              zIndex={6}
              text="неприкосновенна"
            />

            <FlashProvider ref={flashProviderRef} zIndex={5} />

            {/* {isObezzhiritVisible && (
              <Button
                ref={obezzhiritRef}
                id="BtnObezzhirit"
                variant="obezzhirit"
                zIndex={6}
                text="обезжирить"
              />
            )} */}

            {isPortraitLoaded && (
              <CursorFingerprintTracker
                ref={cursorTrackerRef}
                zIndex={4}
                onReady={handleTrackerReady}
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

      <Background id="Background-0" variant="white" zIndex={0} />
    </>
  );
};

export { Neprikosnovenna };
export default Neprikosnovenna;
