import { CursorImages } from "./CursorSettings.js";

export const FingerprintConfig = {
  SPRITE_REM: 1.9,
  ALPHA: 0.15,
  CANVAS_OPACITY: 0.8,
  THROTTLE_MS: 150,
  FADE_IN_DURATION: 45_000,
  FADE_IN_EASING: "cubic-bezier(1,.01,1,.49)",
  HOTSPOT_X: 0.265,
  HOTSPOT_Y: 0.09,
  IMAGE_URL: CursorImages.POINTER,
  IMAGE_CLICKED_URL: CursorImages.POINTER_CLICKED,
};
