import React, { useRef } from "react"
import styles from "./CursorMoveParalax.module.scss"
import useCursorParallax from "../../hooks/useCursorParallax.js"

/**
 * Decorative cursor-driven image parallax.
 * @param {Object} props
 * @param {string} [props.imageSrc]
 * @param {string} [props.alt]
 * @param {number} [props.maxOffsetX]
 * @param {number} [props.maxOffsetY]
 * @param {number} [props.direction]
 * @param {number} [props.transitionMs]
 * @param {string} [props.transitionTiming]
 * @param {boolean} [props.isVisible]
 * @param {boolean} [props.enableGyroscope]
 * @param {boolean} [props.fallbackToMouse]
 * @param {string} [props.className]
 * @param {number} [props.zIndex]
 */
const CursorMoveParalax = ({
    imageSrc = "/images/РУКИ.png",
    alt = "Руки",
    maxOffsetX = 12,
    maxOffsetY = 12,
    direction = -1,
    transitionMs = 120,
    transitionTiming = "ease-out",
    isVisible = true,
    enableGyroscope = true,
    fallbackToMouse = true,
    className = "",
    zIndex,
}) => {
    const imageRef = useRef(null)

    useCursorParallax(imageRef, {
        maxOffsetX,
        maxOffsetY,
        direction,
        enabled: isVisible,
        enableGyroscope,
        fallbackToMouse,
    })

    const visibleModifierClassName = isVisible
        ? styles["cursor-move-paralax--visible"]
        : ""
    const wrapperClassName = [
        styles["cursor-move-paralax"],
        visibleModifierClassName,
        className,
    ]
        .filter(Boolean)
        .join(" ")

    return (
        <>
            {isVisible && (
                <img
                    className={`not-allowed z-${8}`}
                    style={{
                        position: "absolute",
                        width: "110%",
                        top: "12%",
                        left: "50%",
                        transform: "translate(-50%, 0)",
                        pointerEvents: "none",
                    }}
                    src={"/images/ВЗГЛЯД.jpg"}
                    alt="ВЗГЛЯД"
                />
            )}
            <div className={wrapperClassName} style={{ zIndex }}>
                <div className={styles["cursor-move-paralax__mask"]}>
                    <img
                        ref={imageRef}
                        className={styles["cursor-move-paralax__image"]}
                        src={imageSrc}
                        alt={alt}
                        draggable={false}
                        data-legacy-transition-ms={transitionMs}
                        data-legacy-transition-timing={transitionTiming}
                    />
                </div>
            </div>
        </>
    )
}

CursorMoveParalax.displayName = "CursorMoveParalax"

export default CursorMoveParalax
