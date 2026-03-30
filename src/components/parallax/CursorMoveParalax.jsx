import React, { useCallback, useEffect, useMemo, useRef } from "react";
import styles from "./CursorMoveParalax.module.scss";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);
const LERP_FACTOR = 0.16;
const STOP_THRESHOLD = 0.05;

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
  const imageRef = useRef(null);
  const inputModeRef = useRef("mouse");
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef(null);
  const isAnimatingRef = useRef(false);

  const safeMaxOffsetX = useMemo(() => Math.max(0, Number(maxOffsetX) || 0), [maxOffsetX]);
  const safeMaxOffsetY = useMemo(() => Math.max(0, Number(maxOffsetY) || 0), [maxOffsetY]);
  const normalizedDirection = useMemo(() => (Number(direction) < 0 ? -1 : 1), [direction]);

  const applyTransform = useCallback((x, y) => {
    if (!imageRef.current) return;
    imageRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const stopAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isAnimatingRef.current = false;
  }, []);

  const animate = useCallback(() => {
    const target = targetOffsetRef.current;
    const current = currentOffsetRef.current;

    const nextX = current.x + (target.x - current.x) * LERP_FACTOR;
    const nextY = current.y + (target.y - current.y) * LERP_FACTOR;
    currentOffsetRef.current = { x: nextX, y: nextY };
    applyTransform(nextX, nextY);

    const deltaX = Math.abs(target.x - nextX);
    const deltaY = Math.abs(target.y - nextY);
    if (deltaX < STOP_THRESHOLD && deltaY < STOP_THRESHOLD) {
      currentOffsetRef.current = { ...target };
      applyTransform(target.x, target.y);
      stopAnimation();
      return;
    }

    rafIdRef.current = requestAnimationFrame(animate);
  }, [applyTransform, stopAnimation]);

  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    rafIdRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const setTargetFromNormalized = useCallback(
    (normalizedX, normalizedY) => {
      targetOffsetRef.current = {
        x: clamp(normalizedX, -1, 1) * safeMaxOffsetX * normalizedDirection,
        y: clamp(normalizedY, -1, 1) * safeMaxOffsetY * normalizedDirection,
      };
      startAnimation();
    },
    [normalizedDirection, safeMaxOffsetX, safeMaxOffsetY, startAnimation],
  );

  const resetTargetOffset = useCallback(() => {
    targetOffsetRef.current = { x: 0, y: 0 };
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!isVisible) {
      stopAnimation();
      targetOffsetRef.current = { x: 0, y: 0 };
      currentOffsetRef.current = { x: 0, y: 0 };
      applyTransform(0, 0);
      return undefined;
    }

    const getCenter = () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const handleMouseMove = (event) => {
      if (!fallbackToMouse) return;
      if (inputModeRef.current === "gyro-active") return;

      const center = getCenter();
      if (center.x === 0 || center.y === 0) {
        resetTargetOffset();
        return;
      }

      const normalizedX = (event.clientX - center.x) / center.x;
      const normalizedY = (event.clientY - center.y) / center.y;
      setTargetFromNormalized(normalizedX, normalizedY);
    };

    const handleMouseLeave = () => {
      if (inputModeRef.current !== "gyro-active") {
        resetTargetOffset();
      }
    };

    const handleBlur = () => {
      resetTargetOffset();
    };

    const handleResize = () => {
      resetTargetOffset();
    };

    const handleDeviceOrientation = (event) => {
      if (!enableGyroscope) return;

      const { beta, gamma } = event;
      if (!isFiniteNumber(beta) || !isFiniteNumber(gamma)) return;

      // Approximate a comfortable motion range for mobile tilt.
      const normalizedX = gamma / 30;
      const normalizedY = beta / 30;

      inputModeRef.current = "gyro-active";
      setTargetFromNormalized(normalizedX, normalizedY);
    };

    const supportsGyroscope =
      enableGyroscope && typeof window.DeviceOrientationEvent !== "undefined";

    if (supportsGyroscope) {
      window.addEventListener("deviceorientation", handleDeviceOrientation, true);
      inputModeRef.current = fallbackToMouse ? "gyro-pending" : "gyro-only";
    } else {
      inputModeRef.current = "mouse";
    }

    if (fallbackToMouse) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    }

    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (supportsGyroscope) {
        window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
      }

      if (fallbackToMouse) {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseleave", handleMouseLeave);
      }

      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);
      stopAnimation();
    };
  }, [
    enableGyroscope,
    fallbackToMouse,
    isVisible,
    applyTransform,
    resetTargetOffset,
    setTargetFromNormalized,
    stopAnimation,
  ]);

  useEffect(() => {
    applyTransform(0, 0);
  }, [applyTransform]);

  const visibleModifierClassName = isVisible
    ? styles["cursor-move-paralax--visible"]
    : "";
  const wrapperClassName = [
    styles["cursor-move-paralax"],
    visibleModifierClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
    {isVisible && <img
        className={`not-allowed z-${8}`}
        style={{
          position: "absolute",
          width: "110%",
          top: "12%",
          left: "50%",
          transform: "translate(-50%, 0)",
          pointerEvents: "none"
        }}
        src={"/images/ВЗГЛЯД.jpg"}
        alt="ВЗГЛЯД"
      />}
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
  );
};

CursorMoveParalax.displayName = "CursorMoveParalax";

export default CursorMoveParalax;
