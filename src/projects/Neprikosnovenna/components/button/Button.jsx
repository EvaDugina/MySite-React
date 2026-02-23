import "./Button.scss";
import {forwardRef, useCallback, useImperativeHandle, useRef, useState,} from "react";

const ButtonType = {
    DEFAULT: 0, HOVER: 1, ACTIVE: 2, DISABLE: 3,
};

const getClassNameByButtonType = (buttonType) => {
    return buttonType === ButtonType.ACTIVE ? "active" : buttonType === ButtonType.HOVER ? "hovered" : buttonType === ButtonType.DISABLE ? "disabled" : "";
};

const Button = forwardRef((props, ref) => {
    const {id, text} = props;

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

    useImperativeHandle(ref, () => ({
        reset, hover, click, disable,
    }));

    const classes = getClassNameByButtonType(buttonType);

    return (<button id={id} className={`btn-neprikosnovenna not-allowed z-6 ${classes}`}>
        {text}
    </button>);
});

export default Button;
