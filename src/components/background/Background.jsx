import "./Background.css";
import {forwardRef, useCallback, useImperativeHandle, useState} from "react";
import styles from "./Background.module.css";
import {BackgroundType} from "./BackgroundSettings.js";

/**
 * Фоновый слой с возможностью скрывать/показывать через ref.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.variant] - 'white' | 'blue'
 * @param {string} [props.extraClass] - дополнительные глобальные классы (например d-none)
 * @param {number} [props.zIndex]
 */
const Background = forwardRef((props, ref) => {
    const {id = "", type = BackgroundType.WHITE, zIndex} = props;

    const [isHidden, setIsHidden] = useState(false);
    const hide = useCallback(() => setIsHidden(true), []);
    const show = useCallback(() => setIsHidden(false), []);

    const [modifierClass, setModifierClass] = useState(styles[`background--${type}`]);

    const changeType = useCallback((newBackgroundType) => {
        if (!Object.values(BackgroundType).includes(newBackgroundType)) {
            const validValues = Object.values(BackgroundType);
            throw new Error(`Invalid value: ${newBackgroundType}. Expected one of: ${validValues.join(', ')}`);
        }
        setModifierClass(styles[`background--${newBackgroundType}`])
    }, []);

    useImperativeHandle(ref, () => ({hide, show, changeType}));

    return (<div
            id={id}
            key={`${id}`}
            className={`${styles.background} ${modifierClass} z-${zIndex}`}
            style={{display: isHidden ? "none" : "block",}}
        />);
});

Background.displayName = "Background";

export default Background;
