import "./Background.css";
import { forwardRef, useImperativeHandle, useCallback, useState } from "react";

const Background = forwardRef((props, ref) => {
  const { id = "", classes = "bg-white z-0 d-none" } = props

  const [isHidden, setIsHidden] = useState(false);
  const hide = useCallback(() => {
    setIsHidden(true);
  }, []);

  const show = useCallback(() => {
    setIsHidden(false);
  }, []);

  useImperativeHandle(ref, () => ({
    hide,
    show
  }));

  return <div 
  id={id} className={"background  " + classes}
        style={{
        display: isHidden ? "none" : "block",
      }}></div>;
});

export default Background;
