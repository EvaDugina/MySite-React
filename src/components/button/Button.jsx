import styles from "./Button.module.scss";
import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

const ButtonType = {
    DEFAULT: 0,
    HOVER: 1,
    ACTIVE: 2,
    DISABLE: 3,
};

const getModifierClass = (buttonType, stylesMap) => {
    if (buttonType === ButtonType.ACTIVE) return stylesMap["button--active"];
    if (buttonType === ButtonType.HOVER) return stylesMap["button--hovered"];
    if (buttonType === ButtonType.DISABLE) return stylesMap["button--disabled"];
    return "";
};

/**
 * Кнопка с состояниями (hover, active, disabled), управление через ref.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {number} [props.zIndex]
 * @param {string} [props.text]
 * @param {string} [props.ariaLabel]
 */
const Button = forwardRef((props, ref) => {
    const { id, zIndex, text, ariaLabel } = props;

    const [buttonType, setButtonType] = useState(ButtonType.DEFAULT);
    const buttonTypeRef = useRef(buttonType);
    const isClickAbleRef = useRef(true);

    const reset = useCallback(() => {
        buttonTypeRef.current = ButtonType.DEFAULT;
        setButtonType(buttonTypeRef.current);
        isClickAbleRef.current = true;
    }, []);

    const hover = useCallback(() => {
        if (!isClickAbleRef.current) return;
        buttonTypeRef.current = ButtonType.HOVER;
        setButtonType(buttonTypeRef.current);
    }, []);

    const click = useCallback(() => {
        if (!isClickAbleRef.current) return;
        buttonTypeRef.current = ButtonType.ACTIVE;
        setButtonType(buttonTypeRef.current);
    }, []);

    const disable = useCallback(() => {
        buttonTypeRef.current = ButtonType.DISABLE;
        setButtonType(buttonTypeRef.current);
        isClickAbleRef.current = false;
    }, []);

    useImperativeHandle(ref, () => ({ reset, hover, click, disable }));

    const modifierClass = getModifierClass(buttonType, styles);
    const className = [
        styles.button,
        styles["button--neprikosnovenna"],
        modifierClass,
        "not-allowed",
        `z-${zIndex}`,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            id={id}
            type="button"
            className={className}
            aria-label={ariaLabel ?? text}
        >
            {text}
        </button>
    );
});

Button.displayName = "Button";

export default Button;
