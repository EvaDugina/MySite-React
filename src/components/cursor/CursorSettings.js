export const CursorType = {
    NONE: 0,
    DEFAULT: 1,
    POINTER: 2,
    POINTER_CLICKED: 3,
    HAND_OPEN: 4,
    HAND_CLOSE: 5,
    UNAVAILABLE: 6,
};

export const CursorImages = {
    DEFAULT: '/images/cursors/default.png',
    POINTER: '/images/cursors/pointer.png',
    POINTER_CLICKED: '/images/cursors/pointer_clicked.png',
    HAND_OPEN: '/images/cursors/hand_open.png',
    HAND_CLOSE: '/images/cursors/hand_close.png',
    UNAVAILABLE: '/images/cursors/unavailable.png',
};

const CursorConfig = {
    [CursorType.DEFAULT]: { src: '/images/cursors/default.png' },
    [CursorType.POINTER]: { src: '/images/cursors/pointer.png' },
    [CursorType.POINTER_CLICKED]: { src: '/images/cursors/pointer_clicked.png' },
    [CursorType.HAND_OPEN]: { src: '/images/cursors/hand_open.png' },
    [CursorType.HAND_CLOSE]: { src: '/images/cursors/hand_close.png' },
    [CursorType.UNAVAILABLE]: { src: '/images/cursors/unavailable.png' },
};

/**
 * Creates cursor configuration object.
 * @param {Object} options
 * @returns {Object} cursor settings
 */
export function createCursorSettings({
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
    return {
        imgCursor,
        isHidden,
        startX,
        startY,
        handleLeftClickDown,
        handleLeftClickUp,
        handleDoubleLeftClick,
        stiffness,
        damping,
        mass,
        maxSpeed,
    };
}

/**
 * Creates zone detection configuration (maps element IDs to cursor behaviors).
 * @param {Object} config
 * @returns {Object} zone settings with Zone and Data
 */
export function createCursorZoneSettings(config = {}) {
    const Zone = { NONE: 0, ...config.Zone };
    const defaultData = {
        elementId: null,
        imgCursor: CursorConfig[CursorType.DEFAULT].src,
        imgCursorClicked: CursorConfig[CursorType.DEFAULT].src,
        handleOn: null,
        handleOff: null,
    };
    const Data = {};

    Object.values(Zone).forEach((zoneValue) => {
        if (!Data[zoneValue]) {
            Data[zoneValue] = { ...defaultData };
        }
    });

    if (config.Data) {
        Object.entries(config.Data).forEach(([key, settings]) => {
            Data[parseInt(key, 10)] = { ...defaultData, ...settings };
        });
    }

    return { Zone, Data };
}
