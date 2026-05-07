import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Хук строит карту непрозрачности (alpha hit-map) изображения при его
 * загрузке и предоставляет O(1) функцию для проверки, находится ли точка
 * в screen-координатах над непрозрачным пикселем.
 *
 * Сценарий использования: pixel-perfect блокировка кликов и hit-testing для
 * полупрозрачных PNG (например, изображение рук, перекрывающее кнопку).
 *
 * @param {string} src — URL изображения (same-origin для getImageData).
 * @param {Object} [options]
 * @param {number} [options.threshold=32] — α > threshold считается непрозрачным.
 * @returns {{
 *     imgRef: React.RefObject<HTMLImageElement>,
 *     isPixelOpaqueAt: (screenX: number, screenY: number) => boolean,
 *     isReady: boolean,
 * }}
 *   imgRef — навешивается на тот же `<img>`, что показывается в DOM
 *            (используется для получения текущего bounding-box с учётом
 *            transform/parallax).
 *   isPixelOpaqueAt — true если в данной screen-точке у изображения пиксель
 *            с α > threshold; false если вне bbox или пиксель прозрачный.
 *   isReady — карта построена и готова к чтению.
 */
const useImageAlphaHitMap = (src, { threshold = 32 } = {}) => {
    const imgRef = useRef(null)
    const hitMapRef = useRef(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        if (!src) return undefined

        let cancelled = false
        const loader = new Image()
        loader.crossOrigin = "anonymous"
        loader.onload = () => {
            if (cancelled) return
            const w = loader.naturalWidth
            const h = loader.naturalHeight
            if (!w || !h) return

            const canvas = document.createElement("canvas")
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext("2d")
            if (!ctx) return
            ctx.drawImage(loader, 0, 0)

            let data
            try {
                data = ctx.getImageData(0, 0, w, h).data
            } catch {
                // Tainted canvas (cross-origin) — карту не построить.
                return
            }

            const map = new Uint8Array(w * h)
            for (let i = 0; i < map.length; i++) {
                map[i] = data[i * 4 + 3]
            }
            hitMapRef.current = map
            sizeRef.current = { w, h }
            if (!cancelled) setIsReady(true)
        }
        loader.src = src

        return () => {
            cancelled = true
        }
    }, [src])

    const isPixelOpaqueAt = useCallback(
        (screenX, screenY) => {
            const node = imgRef.current
            const map = hitMapRef.current
            if (!node || !map) return false

            const rect = node.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return false
            if (
                screenX < rect.left ||
                screenX > rect.right ||
                screenY < rect.top ||
                screenY > rect.bottom
            ) {
                return false
            }

            const { w: natW, h: natH } = sizeRef.current
            if (!natW || !natH) return false

            // Учитываем object-fit изображения. Для object-fit: contain
            // изображение вписано в rect с letterbox-полосами по сторонам.
            // Без этого допуска курсор на letterbox-области маппится в
            // прозрачные края natural-image, а не пропускается как
            // «вне изображения».
            const objectFit = getComputedStyle(node).objectFit || "fill"

            let renderedW = rect.width
            let renderedH = rect.height
            let offsetX = 0
            let offsetY = 0

            if (objectFit === "contain" || objectFit === "cover") {
                const containerAspect = rect.width / rect.height
                const naturalAspect = natW / natH
                const fitToWidth =
                    objectFit === "contain"
                        ? containerAspect > naturalAspect
                        : containerAspect < naturalAspect
                if (fitToWidth) {
                    // Image fits to height; horizontal letterbox/crop.
                    renderedH = rect.height
                    renderedW = renderedH * naturalAspect
                    offsetX = (rect.width - renderedW) / 2
                } else {
                    renderedW = rect.width
                    renderedH = renderedW / naturalAspect
                    offsetY = (rect.height - renderedH) / 2
                }
            }
            // "fill" / "scale-down" / "none" — упрощённо считаем что image
            // занимает полный rect (для "none" и "scale-down" нужны более
            // сложные расчёты, но в проекте они не используются).

            const visibleX = screenX - rect.left - offsetX
            const visibleY = screenY - rect.top - offsetY

            // Для contain — клик в letterbox-области = пиксель прозрачный
            // (изображения там нет).
            if (objectFit === "contain") {
                if (
                    visibleX < 0 ||
                    visibleX > renderedW ||
                    visibleY < 0 ||
                    visibleY > renderedH
                ) {
                    return false
                }
            }

            const localX = Math.floor((visibleX / renderedW) * natW)
            const localY = Math.floor((visibleY / renderedH) * natH)
            if (localX < 0 || localX >= natW || localY < 0 || localY >= natH) {
                return false
            }
            return map[localY * natW + localX] > threshold
        },
        [threshold],
    )

    return { imgRef, isPixelOpaqueAt, isReady }
}

export default useImageAlphaHitMap
