import "./Button.scss";
import { forwardRef, useImperativeHandle, useState, useCallback, useRef } from "react";

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
    const buttonTypeRef = useRef(buttonType)

    const reset = useCallback(() => {
        buttonTypeRef.current = ButtonType.DEFAULT
        setButtonType(buttonTypeRef.current)
    }, [])
    
    const hover = useCallback(() => {
        if (buttonTypeRef.current == ButtonType.DISABLE) return
        buttonTypeRef.current = ButtonType.HOVER
        setButtonType(buttonTypeRef.current)
    }, [])
    
    const focus = useCallback(() => {
        if (buttonTypeRef.current == ButtonType.DISABLE) return
        buttonTypeRef.current = ButtonType.ACTIVE
        setButtonType(buttonTypeRef.current)
    }, [])
    
    const disable = useCallback(() => {
        buttonTypeRef.current = ButtonType.DISABLE
        setButtonType(buttonTypeRef.current)
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