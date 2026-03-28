import { CursorImages } from './CursorSettings.js'

export const PublicCursorIconKey = Object.freeze({
    DEFAULT: 'default',
    POINTER: 'pointer',
    POINTER_CLICKED: 'pointer_clicked',
    HAND_OPEN: 'hand_open',
    HAND_CLOSE: 'hand_close',
    UNAVAILABLE: 'unavailable',
})

export const DEFAULT_PUBLIC_CURSOR_ICON_KEY = PublicCursorIconKey.POINTER

export const PublicCursorIconMap = Object.freeze({
    [PublicCursorIconKey.DEFAULT]: CursorImages.DEFAULT,
    [PublicCursorIconKey.POINTER]: CursorImages.POINTER,
    [PublicCursorIconKey.POINTER_CLICKED]: CursorImages.POINTER_CLICKED,
    [PublicCursorIconKey.HAND_OPEN]: CursorImages.HAND_OPEN,
    [PublicCursorIconKey.HAND_CLOSE]: CursorImages.HAND_CLOSE,
    [PublicCursorIconKey.UNAVAILABLE]: CursorImages.UNAVAILABLE,
})

const ICON_KEY_BY_URL = Object.freeze(
    Object.fromEntries(
        Object.entries(PublicCursorIconMap).map(([iconKey, url]) => [url, iconKey])
    )
)

export function resolvePublicCursorIconUrl(iconKey) {
    if (typeof iconKey === 'string' && PublicCursorIconMap[iconKey]) {
        return PublicCursorIconMap[iconKey]
    }
    return PublicCursorIconMap[DEFAULT_PUBLIC_CURSOR_ICON_KEY]
}

export function getPublicCursorIconKeyByUrl(url) {
    if (typeof url !== 'string') return DEFAULT_PUBLIC_CURSOR_ICON_KEY
    return ICON_KEY_BY_URL[url] || DEFAULT_PUBLIC_CURSOR_ICON_KEY
}

