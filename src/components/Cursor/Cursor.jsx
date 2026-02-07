import React from "react";
import "./Cursor.css";

export const CursorType = {
  NONE: 0,
  DEFAULT: 1,
  POINTER: 2,
  POINTER_CLICKED: 3,
  HAND_OPEN: 4,
  HAND_CLOSE: 5,
  UNAVAILABLE: 6,
};

const StaticData = {
  [CursorType.NONE]: {
    src: "./images/cursors/none.png",
  },
  [CursorType.DEFAULT]: {
    src: "./images/cursors/default.png",
  },
  [CursorType.POINTER]: {
    src: "./images/cursors/pointer.png",
  },
  [CursorType.POINTER_CLICKED]: {
    src: "./images/cursors/pointer_clicked.png",
  },
  [CursorType.HAND_OPEN]: {
    src: "./images/cursors/hand_open.png",
  },
  [CursorType.HAND_CLOSE]: {
    src: "./images/cursors/hand_close.png",
  },
  [CursorType.UNAVAILABLE]: {
    src: "./images/cursors/unavailable.png",
  },
};

function Cursor({ type = CursorType.NONE }) {
  return (
    <img
      id="Cursor"
      className="cursor not-allowed z-999"
      src={StaticData[type].src}
      alt="муха"
    />
  );
}

export default Cursor;
