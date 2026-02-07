import React from "react";
import "./Cursor.css";

function Cursor({
  settings = new CursorSettings(),
  zoneConfig = new ZoneConfig(),
}) {
  return (
    <img
      id="Cursor"
      className="cursor not-allowed z-999"
      src={StaticData[CursorType.NONE].src}
      alt="муха"
    />
  );
}

export default Cursor;

//
//
//

export const CursorType = {
  NONE: 0,
  DEFAULT: 1,
  POINTER: 2,
  POINTER_CLICKED: 3,
  HAND_OPEN: 4,
  HAND_CLOSE: 5,
  UNAVAILABLE: 6,
};

export const StaticData = {
  [CursorType.NONE]: {
    src: "/images/cursors/none.png",
  },
  [CursorType.DEFAULT]: {
    src: "/images/cursors/default.png",
  },
  [CursorType.POINTER]: {
    src: "/images/cursors/pointer.png",
  },
  [CursorType.POINTER_CLICKED]: {
    src: "/images/cursors/pointer_clicked.png",
  },
  [CursorType.HAND_OPEN]: {
    src: "/images/cursors/hand_open.png",
  },
  [CursorType.HAND_CLOSE]: {
    src: "/images/cursors/hand_close.png",
  },
  [CursorType.UNAVAILABLE]: {
    src: "/images/cursors/unavailable.png",
  },
};

export class CursorSettings {
  constructor({
    timeout = 0,
    startX = null,
    startY = null,
    handleLeftClickDown = null,
    handleLeftClickUp = null,
    handleDoubleLeftClick = null,
    stiffness = 0.4,
    damping = 0.1,
    mass = 0.1,
    maxSpeed = 50,
  } = {}) {
    this.timeout = timeout;
    this.startX = startX;
    this.startY = startY;
    this.handleLeftClickDown = handleLeftClickDown;
    this.handleLeftClickUp = handleLeftClickUp;
    this.handleDoubleLeftClick = handleDoubleLeftClick;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.maxSpeed = maxSpeed;
  }
}

export class ZoneConfig {
  constructor(config = {}) {
    // Определяем Zone
    this.Zone = {
      NONE: 0,
      ...config.Zone,
    };

    // Настройки по умолчанию
    const defaultData = {
      element: null,
      imgCursor: StaticData[CursorType.NONE].src,
      imgCursorClicked: StaticData[CursorType.NONE].src,
      handleOn: null,
      handleOff: null,
    };

    // Инициализируем Data
    this.Data = {};

    // Устанавливаем значения по умолчанию для всех зон
    Object.values(this.Zone).forEach((zoneValue) => {
      if (!this.Data[zoneValue]) {
        this.Data[zoneValue] = { ...defaultData };
      }
    });

    // Заполняем переданными настройками
    if (config.Data) {
      Object.entries(config.Data).forEach(([key, settings]) => {
        const zoneValue = resolveZoneKey(key);
        if (zoneValue !== undefined) {
          this.Data[zoneValue] = {
            ...defaultData,
            ...settings,
          };
        }
      });
    }

    // Функция для преобразования ключа в значение Zone
    const resolveZoneKey = (key) => {
      if (typeof key === "string") {
        // Если ключ вида "Zone.NONE" или "NONE"
        const zoneName = key.replace(/^Zone\./, "");
        return this.Zone[zoneName];
      }
      return key; // Если уже число
    };
  }
}
