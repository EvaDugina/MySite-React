import { CursorImages } from "./CursorSettings.js"

export const PublicCursorConfig = {
    MAX_CURSORS: 8,
    SEND_INTERVAL_MS: 50,
    LERP_FACTOR: 0.15,
    OPACITY: 1,
    FADE_IN_DURATION: 300,
    FADE_OUT_DURATION: 5000,
    CURSOR_SIZE_REM: 1.9,
    HOTSPOT_X: 0.265,
    HOTSPOT_Y: 0.09,
    IMAGE_URL: CursorImages.POINTER,
    RECONNECT_BASE_MS: 1000,
    RECONNECT_MAX_MS: 30000,
    RECONNECT_MULTIPLIER: 1.5,
    STALE_BATCH_COUNT: 12,
    WS_PATH: '/ws',
    Z_INDEX: 998,
    MIN_HEALTHY_CONNECTION_MS: 5000,
}
