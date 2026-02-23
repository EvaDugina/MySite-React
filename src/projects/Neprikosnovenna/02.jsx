import "./Neprikosnovenna.css";
import React, {useCallback, useEffect, useMemo, useRef,} from "react";

import {CursorImages, CursorSettings, CursorZoneSettings,} from "./components/cursor/CursorSettingsHandler";
import Cursor from "./components/cursor/Cursor";
import Flash from "./components/Flash/Flash";
import {FlashType} from "./components/Flash/FlashSettingsHandler";
import Background from "./components/background/Background";
import Button from "./components/button/Button";
import ImagePortrait from "./components/portrait/ImagePortrait.jsx";

const Zone = {
    NONE: 0, BACK: 1, PORTRAIT: 2, BUTTON: 3,
};

const WhenYouSoBeautifullyDied = () => {
    const cursorRef = useRef(null);
    const buttonRef = useRef(null);

    //
    //
    //

    const handleOnButton = () => {
    };

    const handleOffButton = () => {
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
            }, [Zone.BACK]: {
                elementId: "Background-0",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            }, [Zone.PORTRAIT]: {
                elementId: "Portrait",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            }, [Zone.BUTTON]: {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnButton,
                handleOff: handleOffButton,
            },
        };

        cursorZoneSettingsRef.current = new CursorZoneSettings({
            Zone: Zone, Data: {...ZoneData},
        });
    }, [])

    //
    //
    //

    const handleLeftClickDown = useCallback(() => {

    }, []);

    const handleLeftClickUp = useCallback(() => {
    }, []);

    const cursorSettings = useMemo(() => {
        // Линтер принимает обращение к current внутри фнукций handle* за ошибку, но они не вызываются при рендере => норм
        return new CursorSettings({
            imgCursor: CursorImages.DEFAULT, // Начальное изображение курсора
            startX: null, // Начальная позиция от width по X
            startY: null, // Начальная позиция от рушпре по Y
            handleLeftClickDown: handleLeftClickDown, // Функци обработки нажатия
            handleLeftClickUp: handleLeftClickUp, // Функци обработки отжатия
            stiffness: 0.4, // Жесткость пружины (скорость реакции)
            damping: 0.1, // Затухание (плавность остановки)
            mass: 0.1, // Масса объекта
            maxSpeed: 25, // Максимальная скорость
        });
    }, [handleLeftClickDown, handleLeftClickUp]);

    //
    //
    //

    return (<>
        <Cursor
            ref={cursorRef}
            settings={cursorSettings}
            zoneSettingsRef={cursorZoneSettingsRef}
        />

        <main>
            <article className="portrait-container-default">
                <div className="cursor-container ignore-cursor d-none"></div>

                <Button
                    ref={buttonRef}
                    id="BtnNeprikosnovenna"
                    text="неприкосновенна"
                />

                <Flash type={FlashType.BEHIND}/>
                <Flash type={FlashType.FRONT}/>
                <Flash/>

                <ImagePortrait/>
            </article>
        </main>

        <Background id="Background-0" classes="bg-white z-0"/>
    </>);
};

export default WhenYouSoBeautifullyDied;
