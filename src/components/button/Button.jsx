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
  HOVERED: 1,
  ACTIVE: 2,
  DISABLED: 3,
};

const getModifierClass = (buttonType, stylesMap) => {
  if (buttonType === ButtonType.ACTIVE) return stylesMap["button--active"];
  if (buttonType === ButtonType.HOVERED) return stylesMap["button--hovered"];
  if (buttonType === ButtonType.DISABLED) return stylesMap["button--disabled"];
  return "";
};

/**
 * Button with states (hover, active, disabled), controlled via ref.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {number} [props.zIndex]
 * @param {string} [props.text]
 * @param {string} [props.ariaLabel]
 * @param {string} [props.variant] - 'neprikosnovenna' | 'obeszhirit'
 * @param {boolean} [props.isHoverAble=true] - whether hover is allowed
 * @param {boolean} [props.isClickAble=true] - whether click is allowed
 */
const Button = forwardRef((props, ref) => {
  const {
    id,
    zIndex,
    text,
    ariaLabel,
    variant,
    isHoverAble = true,
    isClickAble = true,
  } = props;

  const [buttonType, setButtonType] = useState(ButtonType.DEFAULT);
  const buttonTypeRef = useRef(buttonType);
  const canClicked = useRef(true);
  const isClickAbleRef = useRef(isClickAble);
  const isHoverAbleRef = useRef(isHoverAble);

  const isDisabled = useCallback(() => {
    return buttonTypeRef.current === ButtonType.DISABLED;
  }, []);

  const reset = useCallback(() => {
    buttonTypeRef.current = ButtonType.DEFAULT;
    setButtonType(buttonTypeRef.current);
    canClicked.current = true;
  }, []);

  const hover = useCallback(() => {
    if (!isHoverAbleRef.current) return;
    if (!canClicked.current) return;
    buttonTypeRef.current = ButtonType.HOVERED;
    setButtonType(buttonTypeRef.current);
  }, []);

  const click = useCallback(() => {
    if (!isClickAbleRef.current) return;
    if (!canClicked.current) return;
    buttonTypeRef.current = ButtonType.ACTIVE;
    setButtonType(buttonTypeRef.current);
  }, []);

  const disable = useCallback(() => {
    buttonTypeRef.current = ButtonType.DISABLED;
    setButtonType(buttonTypeRef.current);
    canClicked.current = false;
  }, []);

  useImperativeHandle(ref, () => ({
    isDisabled,
    reset,
    hover,
    click,
    disable,
  }));

  const modifierClass = getModifierClass(buttonType, styles);
  const className = [
    styles.button,
    variant ? styles[`button__${variant}`] : null,
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
