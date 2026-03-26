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

/**
 * Custom physics-based cursor with zone detection.
 * @param {Object} props
 * @param {Object} props.settings - cursor config from createCursorSettings()
 * @param {React.MutableRefObject} props.zoneSettingsRef - ref with zone config from createCursorZoneSettings()
 */
const Cursor = forwardRef((props, ref) => {
    const { settings, zoneSettingsRef } = props;

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
        currentZoneDataRef,
    } = useCursor(
        settings,
        showCursor,
        changeCursorSrc,
        zoneSettingsRef,
        handleLeftClickDownRef,
        handleLeftClickUpRef,
    );

    const getPosition = useCallback(() => {
        return {...position}
    }, [position])

    const handleLeftClickDown = useCallback(() => {
        changeCursorSrc(currentZoneDataRef.current.imgCursorClicked);
        settings.handleLeftClickDown?.(currentZoneDataRef.current.elementId);
    }, [changeCursorSrc, settings, currentZoneDataRef]);

    const handleLeftClickUp = useCallback(() => {
        changeCursorSrc(currentZoneDataRef.current.imgCursor);
        settings.handleLeftClickUp?.(currentZoneDataRef.current.elementId);
    }, [changeCursorSrc, settings, currentZoneDataRef]);

    useEffect(() => {
        handleLeftClickDownRef.current = handleLeftClickDown;
        handleLeftClickUpRef.current = handleLeftClickUp;
    }, [handleLeftClickDown, handleLeftClickUp]);

    useImperativeHandle(ref, () => ({
        hide: hideCursor,
        show: showCursor,
        disable: disableCursor,
        enable: enableCursor,
        stopVideo: stopCursor,
        start: startCursor,
        getPosition: getPosition
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
