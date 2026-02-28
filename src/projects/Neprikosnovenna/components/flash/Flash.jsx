import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useState,
} from "react";
import styles from "./Flash.module.css";
import { FlashType } from "./FlashSettingsHandler.js";

const StaticData = {
    [FlashType.DEFAULT]: { src: "" },
    [FlashType.FRONT]: { src: "/images/01.jpg" },
    [FlashType.BEHIND]: { src: "/images/02.jpg" },
};

/**
 * Компонент вспышки (одна картинка или пустой фон). Управление через ref.flash().
 * @param {Object} props
 * @param {number} [props.type]
 * @param {number} [props.zIndex]
 * @param {number} [props.duration]
 */
const Flash = forwardRef((props, ref) => {
    const { type = FlashType.DEFAULT, zIndex, duration } = props;

    const [isHidden, setIsHidden] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);

    const flash = useCallback(async () => {
        setIsHidden(false);
        setIsAnimating(true);

        await new Promise((resolve) => setTimeout(resolve, duration));

        setIsAnimating(false);
        setIsHidden(true);
    }, [duration]);

    useImperativeHandle(ref, () => ({ flash }));

    const containerClass = [
        styles.flash__container,
        isAnimating && styles["flash__container--animation"],
        isHidden && styles["flash__container--hidden"],
        "ignore-cursor",
        `z-${zIndex}`,
    ]
        .filter(Boolean)
        .join(" ");

    if (type === FlashType.DEFAULT) {
        return (
            <div
                id={`FlashContainer${type}`}
                className={`${containerClass} ${styles["flash--blend-exclusion"]} not-allowed`}
            >
                <div
                    id="FlashBack"
                    className={`${styles.flash__container} ${styles.flash__back} not-allowed`}
                />
            </div>
        );
    }

    const imageModifier =
        type === FlashType.FRONT
            ? styles["flash__image--type1"]
            : styles["flash__image--type2"];

    return (
        <div id={`FlashContainer${type}`} className={containerClass}>
            <img
                id={`Flash${type}`}
                className={`${styles.flash__image} ${imageModifier} not-allowed`}
                src={StaticData[type].src}
                alt="ВСПЫШКА"
            />
        </div>
    );
});

Flash.displayName = "Flash";

export { Flash };
export default Flash;
