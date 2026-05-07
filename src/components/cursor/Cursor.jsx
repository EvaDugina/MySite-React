import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import "./Cursor.css";
import styles from "./Cursor.module.css";
import useCursor from "./hooks/useCursor.js";
import { getPublicCursorIconKeyByUrl } from "./PublicCursorIcons.js";

/**
 * Custom physics-based cursor with zone detection.
 * @param {Object} props
 * @param {Object} props.settings - cursor config from createCursorSettings()
 * @param {React.MutableRefObject} props.zoneSettingsRef - ref with zone config from createCursorZoneSettings()
 * @description Imperative ref API:
 * hide(), show(), disable(), enable(), stopVideo(), start(), getPosition(), getIsReady()
 */
const Cursor = forwardRef((props, ref) => {
    const { settings, zoneSettingsRef, onPublicIconChange = null } = props;

    const [src, setSrc] = useState(settings.imgCursor);
    const changeCursorSrc = useCallback((newSrc) => {
        if (newSrc === undefined || newSrc === null) return;
        setSrc(newSrc);
    }, []);

    const [isHidden, setIsHidden] = useState(true);
    const hideCursor = useCallback(() => setIsHidden(true), []);
    const showCursor = useCallback(() => setIsHidden(false), []);

    const handleLeftClickDownRef = useRef(null);
    const handleLeftClickUpRef = useRef(null);

    const {
        position,
        enableCursor,
        disableCursor,
        stopCursor,
        startCursor,
        getIsCursorReady,
        currentZoneDataRef,
    } = useCursor(
        settings,
        showCursor,
        changeCursorSrc,
        zoneSettingsRef,
        handleLeftClickDownRef,
        handleLeftClickUpRef,
    );

    const positionRef = useRef(position);
    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const getPosition = useCallback(() => {
        return { ...positionRef.current }
    }, [])

    const handleLeftClickDown = useCallback((event) => {
        changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
        settings.handleLeftClickDown?.(currentZoneDataRef.current.elementId, event);
    }, [changeCursorSrc, settings, currentZoneDataRef]);

    const handleLeftClickUp = useCallback((event) => {
        changeCursorSrc(currentZoneDataRef.current.imgCursor);
        settings.handleLeftClickUp?.(currentZoneDataRef.current.elementId, event);
    }, [changeCursorSrc, settings, currentZoneDataRef]);

    useEffect(() => {
        handleLeftClickDownRef.current = handleLeftClickDown;
        handleLeftClickUpRef.current = handleLeftClickUp;
    }, [handleLeftClickDown, handleLeftClickUp]);

    useEffect(() => {
        onPublicIconChange?.(getPublicCursorIconKeyByUrl(src));
    }, [onPublicIconChange, src]);

    useImperativeHandle(ref, () => ({
        hide: hideCursor,
        show: showCursor,
        disable: disableCursor,
        enable: enableCursor,
        stopVideo: stopCursor,
        start: startCursor,
        getPosition: getPosition,
        getIsReady: getIsCursorReady,
        // Imperative-метод для смены иконки курсора в обход zone-системы.
        // Будет перекрыт следующей сменой зоны — для устойчивого override
        // вызывайте на каждом pointermove (см. 01_01.jsx).
        setSrc: changeCursorSrc,
    }));

    const className = [
        styles.cursor,
        "ignore-cursor",
        "not-allowed",
        "z-999",
    ].join(" ");

    return (
        <img
            id="Cursor"
            className={className}
            src={src}
            alt="муха"
            style={{
                transform: `translate(-26.5%, -9%) translate3d(${position.x}px, ${position.y}px, 0)`,
                display: isHidden ? "none" : "block",
            }}
        />
    );
});

Cursor.displayName = "Cursor";

export default Cursor;
