import { useRef } from "react"
import styles from "./Glass.module.scss"
import useCursorParallax from "../../hooks/useCursorParallax.js"

/**
 * Glassmorphism layer in Apple "Liquid Glass" pattern:
 *   .glass-container
 *     ├── .glass-filter   — SVG-distortion (refraction) + backdrop-blur
 *     ├── .glass-overlay  — полупрозрачная белая заливка
 *     ├── .glass-specular — внутренний highlight-rim (грань линзы)
 *     └── .glass-content  — контейнер для содержимого (по умолчанию пустой)
 *
 * Параллакс — переносит весь .glass-container по движению курсора/гироскопу.
 *
 * @param {Object} props
 * @param {number} [props.maxOffsetX=10]
 * @param {number} [props.maxOffsetY=10]
 * @param {boolean} [props.enableGyroscope=true]
 * @param {boolean} [props.fallbackToMouse=true]
 * @param {boolean} [props.enabled=true]
 * @param {number} [props.zIndex]
 * @param {React.ReactNode} [props.children]
 */
const Glass = ({
    maxOffsetX = 10,
    maxOffsetY = 10,
    enableGyroscope = true,
    fallbackToMouse = true,
    enabled = true,
    zIndex,
    children,
}) => {
    const containerRef = useRef(null)

    useCursorParallax(containerRef, {
        maxOffsetX,
        maxOffsetY,
        enabled,
        enableGyroscope,
        fallbackToMouse,
    })

    return (
        <>
            {/* SVG-фильтр искажения (Liquid Glass distortion) */}
            <svg
                className={styles.svgFilters}
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter
                        id="lensFilter"
                        x="0%"
                        y="0%"
                        width="100%"
                        height="100%"
                    >
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.012 0.012"
                            numOctaves="2"
                            seed="92"
                            result="noise"
                        />
                        <feGaussianBlur
                            in="noise"
                            stdDeviation="1.5"
                            result="softNoise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="softNoise"
                            scale="14"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                ref={containerRef}
                className={styles.glassContainer}
                style={{ zIndex }}
                aria-hidden="true"
            >
                <div className={styles.glassFilter} />
                <div className={styles.glassOverlay} />
                <div className={styles.glassSpecular} />
                <div className={styles.glassContent}>{children}</div>
            </div>
        </>
    )
}

Glass.displayName = "Glass"

export default Glass
