import React, {forwardRef, useCallback, useImperativeHandle, useRef, memo} from "react";
import styles from "./Flash.module.css";
import {FlashType, StaticData} from "./FlashSettings.js";

/**
 * Single flash component (image or blank). Controlled via ref.flash().
 * @param {Object} props
 * @param {number} [props.type]
 * @param {number} [props.zIndex]
 */
const Flash = forwardRef((props, ref) => {
    const {type = FlashType.PORTRAIT_NEGATIVE, zIndex} = props;

    const containerRef = useRef(null);

    const flash = useCallback(() => {
        return new Promise((resolve) => {
            const container = containerRef.current;
            container.classList.remove(styles["flash__container--animation"]);
            container.classList.remove(styles["flash__container--hidden"]);
            void container.offsetHeight;
            container.classList.add(styles["flash__container--animation"]);
            container.addEventListener("animationend", () => {
                container.classList.remove(styles["flash__container--animation"]);
                container.classList.add(styles["flash__container--hidden"]);
                resolve();
            }, { once: true });
        });
    }, []);

    useImperativeHandle(ref, () => ({flash}));

    const containerClass = [styles.flash__container, styles["flash__container--hidden"], "ignore-cursor", `z-${zIndex}`]
        .join(" ");

    if (type === FlashType.NEGATIVE || type === FlashType.PORTRAIT_NEGATIVE) {
        const blendMode = type === FlashType.NEGATIVE ? styles["flash__container--blend-color-dodge"] : styles["flash__container--blend-exclusion"];
        const style = type === FlashType.NEGATIVE ? styles["flash__negative"] : styles["flash__portrait-negative"];
        const containerStyle = type === FlashType.NEGATIVE ? styles["flash__container--negative"] : "";
        return (<div
                ref={containerRef}
                id={`FlashContainer${type}`}
                className={`${containerClass} ${blendMode} ${containerStyle} not-allowed`}
            >
                <div
                    id={`Flash${type}`}
                    className={`${styles.flash__container} ${style} not-allowed`}
                />
            </div>);
    }

    const imageModifier = type === FlashType.FRONT ? styles["flash__image--type1"] : type === FlashType.VZGLAD ? styles["flash__image--type-vzglad"] : styles["flash__image--type2"];

    return (<div
            ref={containerRef}
            id={`FlashContainer${type}`}
            className={`${containerClass} not-allowed`}>
            <img
                id={`Flash${type}`}
                className={`${styles.flash__image} ${imageModifier} not-allowed`}
                src={StaticData[type].src}
                alt="ВСПЫШКА"
            />
        </div>);
});

Flash.displayName = "Flash";

export default memo(Flash);
