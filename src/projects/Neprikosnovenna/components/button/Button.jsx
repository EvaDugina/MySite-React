import "./Button.css";
import { forwardRef, useImperativeHandle, useState, useCallback } from "react";

const ButtonType = {
    DEFAULT: 0,
    HOVER: 1,
    ACTIVE: 2,
    DISABLE: 3,
}

const getClassNameByButtonType = (buttonType) => {
    return buttonType == ButtonType.ACTIVE ? 'active' : 
    buttonType == ButtonType.HOVER ? 'hovered' : 
    buttonType == ButtonType.DISABLE ? 'disabled' : 
    ''
}

const Button = forwardRef((props, ref) => {
    
    const {id, text} = props
    
    const [buttonType, setButtonType] = useState(ButtonType.DEFAULT)

    const reset = useCallback(() => {
        setButtonType(ButtonType.DEFAULT)
    }, [])
    
    const hover = useCallback(() => {
        setButtonType(ButtonType.HOVER)
    }, [])

    const focus = useCallback(() => {
        setButtonType(ButtonType.ACTIVE)
    }, [])
    
    const disable = useCallback(() => {
        setButtonType(ButtonType.DISABLE)
    }, [])

    useImperativeHandle(ref, () => ({
        reset,
        hover,
        focus,
        disable
    }));

    const classes = getClassNameByButtonType(buttonType);

    return (
        <button id={id} className={`not-allowed z-6 ${classes}`}>
            {text}
        </button>
    )
})

export default Button