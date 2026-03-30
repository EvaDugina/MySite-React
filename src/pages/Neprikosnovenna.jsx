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
import { BackgroundType } from "../components/background/BackgroundSettings.js";
import Button from "../components/button/Button.jsx";
import PortraitProvider from "../components/portrait/PortraitProvider.jsx";
// import ImagePortrait from "../components/portrait/ImagePortrait.jsx";
// import useSoundEffect from "../hooks/useSoundEffect.js";
import { FlashType } from "../components/flash/FlashSettings.js";
import FlashProvider from "../components/flash/FlashProvider.jsx";
import CursorFingerprintTracker from "../components/cursor/CursorFingerprintTracker.jsx";
import CursorMoveParalax from "../components/parallax/CursorMoveParalax.jsx";
// import CursorPublicTracker from "../components/cursor/CursorPublicTracker.jsx";
import { DEFAULT_PUBLIC_CURSOR_ICON_KEY } from "../components/cursor/PublicCursorIcons.js";

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
  const portraitRef = useRef(null);
  const buttonObeszhiritRef = useRef(null);
  const buttonNeprikosnovennaRef = useRef(null);
  const flashProviderRef = useRef(null);
  const backgroundMainRef = useRef(null);
  const backgroundSecondaryRef = useRef(null);
  const pointerDeviceRef = useRef("d");

  const [isPortraitLoaded, setIsPortraitLoaded] = useState(false);
  const [isClickedOnPortrait, setIsClickedOnPortrait] = useState(false);
  const [isObezzhiritVisible, setIsObezzhiritVisible] = useState(false);
  const [isPublicCursorsUnlocked, setIsPublicCursorsUnlocked] = useState(false);
  const [isParallaxVisible, setIsParallaxVisible] = useState(false);
  const [publicCursorIconKey, setPublicCursorIconKey] = useState(
    DEFAULT_PUBLIC_CURSOR_ICON_KEY,
  );

  const isVideoEndedRef = useRef(false);
  const isFadeInCompleteRef = useRef(false);
  const isObezzhiritVisibleRef = useRef(false);
  const dbHasFingerprintsRef = useRef(false);


  //
  // VIDEO CONTROL
  //

  useEffect(() => {
    portraitRef.current.showVideo(false);
  }, []);

  const handleVideoEnded = useCallback(() => {
      isVideoEndedRef.current = true;
      // backgroundSecondaryRef.current.changeType(BackgroundType.KETCHUP)
  }, []);

  const videoSettings = useMemo(() => {
      return {
          onEnded: handleVideoEnded,
      };
  }, [handleVideoEnded]);

  //
  // AUDIO CONTROL
  //

  // const { playAudio } = useSoundEffect("/audio/СимуляцияОргазма.mov");

  //
  // НЕПРИКОСНОВЕННА / ОБЕЗЖИРИТЬ — логика поведения / появления
  //

  const enableButtonNeprikosnovenna = useCallback(() => {
    buttonNeprikosnovennaRef.current.reset();
  }, []);

  const showObezzhirit = useCallback(() => {
    isObezzhiritVisibleRef.current = true;
    setIsObezzhiritVisible(true);
  }, []);

  const hideObezzhirit = useCallback(() => {
    isObezzhiritVisibleRef.current = false;
    setIsObezzhiritVisible(false);
  }, []);

  const handleTrackerReady = useCallback((count) => {
    dbHasFingerprintsRef.current = count > 0;
  }, []);

  const handleFadeInComplete = useCallback(() => {
    if (dbHasFingerprintsRef.current && !isFadeInCompleteRef.current) {
      isFadeInCompleteRef.current = true;
      setIsParallaxVisible(true);
      showObezzhirit();
      enableButtonNeprikosnovenna();
    }
  }, [showObezzhirit, enableButtonNeprikosnovenna]);

  //
  // CURSOR CONTROL
  //

  const handleOnButton = () => {
    if (isFadeInCompleteRef.current) {
      buttonNeprikosnovennaRef.current.hover();
    }
  };
  const handleOffButton = () => {
    if (isFadeInCompleteRef.current) {
      buttonNeprikosnovennaRef.current.reset();
    }
  };

  const handleOnObezzhirit = () => {
    buttonObeszhiritRef.current?.hover();
  };

  const handleOffObezzhirit = () => {
    buttonObeszhiritRef.current?.reset();
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
        elementId: "BtnObeszhirit",
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

  useEffect(() => {
    const handlePointerEvent = (event) => {
      pointerDeviceRef.current = event.pointerType === "touch" ? "m" : "d";
    };

    window.addEventListener("pointermove", handlePointerEvent, { passive: true });
    window.addEventListener("pointerdown", handlePointerEvent, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerEvent);
      window.removeEventListener("pointerdown", handlePointerEvent);
    };
  }, []);

  const getPublicTrackerArticleRect = useCallback(() => {
    return articleRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const getPublicTrackerArticleElement = useCallback(() => {
    return articleRef.current ?? null;
  }, []);

  const getPublicTrackerCursorPosition = useCallback(() => {
    return cursorRef.current?.getPosition() ?? null;
  }, []);

  const getPublicTrackerIsCursorReady = useCallback(() => {
    return cursorRef.current?.getIsReady?.() === true;
  }, []);

  const getPublicTrackerPointerDevice = useCallback(() => {
    return pointerDeviceRef.current;
  }, []);

  const handlePublicCursorIconChange = useCallback((iconKey) => {
    setPublicCursorIconKey(iconKey);
  }, []);

  const handleLeftClickDown = useCallback(
    (currentElementId) => {
      if (currentElementId === "BtnNeprikosnovenna") {
        if (!isPublicCursorsUnlocked) {
          portraitRef.current.playVideo();
          setIsPublicCursorsUnlocked(true);
          backgroundSecondaryRef.current.hide();
          buttonNeprikosnovennaRef.current.disable();
          // setTimeout(() => {
          //   playAudio();
          // }, 4400);
        } else if (isFadeInCompleteRef.current) {
          buttonNeprikosnovennaRef.current.click();
        }
      } else if (currentElementId === "BtnObeszhirit") {
        buttonObeszhiritRef.current.click();
        cursorTrackerRef.current.clearAllFingerprints();
        hideObezzhirit();
        dbHasFingerprintsRef.current = false;
      } else if (currentElementId === "Portrait") {
        if (!isClickedOnPortrait) {
          setIsClickedOnPortrait(true);
          backgroundMainRef.current.changeType(BackgroundType.KETCHUP, "cubic-bezier(1,-0.01,1,-0.37)", 45_000, 0.1);
        }
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

        if (!dbHasFingerprintsRef.current && !isObezzhiritVisibleRef.current) {
          const count = cursorTrackerRef.current.getSessionClickCount();
          if (count >= 30) {
            showObezzhirit();
          }
        }
      }
    },
    [
      hideObezzhirit,
      isClickedOnPortrait,
      isPublicCursorsUnlocked,
      showObezzhirit,
    ],
  );

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (currentElementId === "BtnNeprikosnovenna") {
      buttonNeprikosnovennaRef.current.hover();
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
        onPublicIconChange={handlePublicCursorIconChange}
      />

      <main className={styles.main}>
          <article
            ref={articleRef}
            className={`${styles["portrait-container-default"]}`}
          >
            {/* <ImagePortrait
              id="Painting"
              zIndex={1}
              setIsLoadedCallback={setIsPortraitLoaded}
            /> */}

            <PortraitProvider
                id="Painting"
                ref={portraitRef}
                zIndex={1}
                settings={videoSettings}
                setIsLoadedCallback={setIsPortraitLoaded}
            />

            {/* <CursorMoveParalax
              zIndex={10}
              maxOffsetX={12}
              maxOffsetY={12}
              direction={-1}
              transitionMs={120}
              transitionTiming="ease-out"
              isVisible={isParallaxVisible}
              enableGyroscope={true}
              fallbackToMouse={true}
            /> */}

            {/*<CursorPublicTracker
              enabled={isPublicCursorsUnlocked}
              currentIconKey={publicCursorIconKey}
              getArticleRect={getPublicTrackerArticleRect}
              getArticleElement={getPublicTrackerArticleElement}
              getCursorPosition={getPublicTrackerCursorPosition}
              getIsCursorReady={getPublicTrackerIsCursorReady}
              getPointerDevice={getPublicTrackerPointerDevice}
              zIndex={9}
            />*/}

            <Button
              ref={buttonNeprikosnovennaRef}
              id="BtnNeprikosnovenna"
              variant="neprikosnovenna"
              zIndex={8}
              text="неприкосновенна"
            />

            {/* {isObezzhiritVisible && (
              <Button
                ref={buttonObeszhiritRef}
                id="BtnObeszhirit"
                variant="obeszhirit"
                zIndex={7}
                text="обезжирить"
              />
            )} */}

            <FlashProvider ref={flashProviderRef} zIndex={5} />

            {isPortraitLoaded && (
              <CursorFingerprintTracker
                ref={cursorTrackerRef}
                zIndex={4}
                onReady={handleTrackerReady}
                onFadeInComplete={handleFadeInComplete}
                startFadeIn={isClickedOnPortrait}
              />
            )}

            <div
              id="Portrait"
              className={`not-allowed z-${3}`}
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

          <Background id="Background-1" ref={backgroundSecondaryRef} type={BackgroundType.BLUE} zIndex={6} />
        </main>

      <Background id="Background-0" ref={backgroundMainRef} type={BackgroundType.WHITE} zIndex={0} />
    </>
  );
};

export { Neprikosnovenna };
export default Neprikosnovenna;
