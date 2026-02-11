export const CursorType = {
    NONE: 0,
    DEFAULT: 1,
    POINTER: 2,
    POINTER_CLICKED: 3,
    HAND_OPEN: 4,
    HAND_CLOSE: 5,
    UNAVAILABLE: 6,
}

export const CursorImages = {
    DEFAULT: "/images/cursors/default.png",
    POINTER: "/images/cursors/pointer.png",
    POINTER_CLICKED: "/images/cursors/pointer_clicked.png",
    HAND_OPEN: "/images/cursors/hand_open.png",
    HAND_CLOSE: "/images/cursors/hand_close.png",
    UNAVAILABLE: "/images/cursors/unavailable.png",
}

const CursorConfig = {
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
}

export class CursorSettings {
    constructor({
        timeout = 0,
        imgCursor = CursorImages.DEFAULT,
        isHidden = false,
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
        this.timeout = timeout
        this.imgCursor = imgCursor
        this.isHidden = isHidden
        this.startX = startX
        this.startY = startY
        this.handleLeftClickDown = handleLeftClickDown
        this.handleLeftClickUp = handleLeftClickUp
        this.handleDoubleLeftClick = handleDoubleLeftClick
        this.stiffness = stiffness
        this.damping = damping
        this.mass = mass
        this.maxSpeed = maxSpeed
    }
}

export class CursorZoneConfig {
    constructor(config = {}) {
        // Определяем Zone
        this.Zone = {
            NONE: 0,
            ...config.Zone,
        }

        // Настройки по умолчанию
        const defaultData = {
            elementId: null,
            imgCursor: CursorConfig[CursorType.POINTER].src,
            imgCursorClicked: CursorConfig[CursorType.POINTER].src,
            handleOn: null,
            handleOff: null,
        }

        // Инициализируем Data
        this.Data = {}

        // Устанавливаем значения по умолчанию для всех зон
        Object.values(this.Zone).forEach((zoneValue) => {
            if (!this.Data[zoneValue]) {
                this.Data[zoneValue] = { ...defaultData }
            }
        })

        // Заполняем переданными настройками
        if (config.Data) {
            Object.entries(config.Data).forEach(([key, settings]) => {
                this.Data[parseInt(key)] = {
                    ...defaultData,
                    ...settings,
                }
            })
        }
    }
}
