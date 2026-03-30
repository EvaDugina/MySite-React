import "./Background.css";
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, memo} from "react";
import styles from "./Background.module.css";
import {BackgroundType} from "./BackgroundSettings.js";

const DEFAULT_DURATION_MS = 500;
const DEFAULT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const EASING_FALLBACK = "ease";

const CUBIC_BEZIER_REGEX = /^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/i;

const isValidCubicBezier = (value) => {
    if (typeof value !== "string") {
        return false;
    }

    const trimmed = value.trim();
    const match = trimmed.match(CUBIC_BEZIER_REGEX);
    if (!match) {
        return false;
    }

    const x1 = Number.parseFloat(match[1]);
    const x2 = Number.parseFloat(match[3]);

    return Number.isFinite(x1) && Number.isFinite(x2) && x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1;
};

const normalizeDuration = (duration, defaultDurationMs) => {
    if (typeof duration === "undefined") {
        return defaultDurationMs;
    }

    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
        return defaultDurationMs;
    }

    return duration;
};

const normalizeEasing = (easing) => {
    if (typeof easing === "undefined") {
        return DEFAULT_EASING;
    }

    return isValidCubicBezier(easing) ? easing.trim() : EASING_FALLBACK;
};

const normalizeOpacity = (opacity) => {
    if (typeof opacity === "undefined" || opacity === null) {
        return 1;
    }

    if (typeof opacity !== "number" || !Number.isFinite(opacity)) {
        return 1;
    }

    return Math.min(1, Math.max(0, opacity));
};

const resolveAnimationConfig = (easingOrOptions, durationArg, opacityArg) => {
    if (typeof easingOrOptions === "undefined") {
        return {
            hasAnimationConfig: false,
            easing: undefined,
            duration: undefined,
            opacity: opacityArg
        };
    }

    if (typeof easingOrOptions === "string") {
        return {
            hasAnimationConfig: true,
            easing: easingOrOptions,
            duration: durationArg,
            opacity: opacityArg
        };
    }

    if (easingOrOptions === null) {
        return {
            hasAnimationConfig: false,
            easing: undefined,
            duration: undefined,
            opacity: opacityArg
        };
    }

    return {
        hasAnimationConfig: true,
        easing: easingOrOptions.easing,
        duration: typeof durationArg === "number" ? durationArg : easingOrOptions.duration,
        opacity: typeof opacityArg !== "undefined" ? opacityArg : easingOrOptions.opacity
    };
};

/**
 * Background layer with show/hide control via ref.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.type] - 'white' | 'blue' | 'ketchup'
 * @param {number} [props.zIndex]
 */
const Background = forwardRef((props, ref) => {
    const {id = "", type = BackgroundType.WHITE, zIndex} = props;

    const [isHidden, setIsHidden] = useState(false);
    const hide = useCallback(() => setIsHidden(true), []);
    const show = useCallback(() => setIsHidden(false), []);

    const [currentType, setCurrentType] = useState(type);
    const [currentOpacity, setCurrentOpacity] = useState(1);
    const [incomingType, setIncomingType] = useState(null);
    const [incomingOpacity, setIncomingOpacity] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionStyle, setTransitionStyle] = useState({
        transitionDuration: `${DEFAULT_DURATION_MS}ms`,
        transitionTimingFunction: DEFAULT_EASING
    });

    const incomingTypeRef = useRef(incomingType);
    const rafRef = useRef(null);
    const transitionTokenRef = useRef(0);

    useEffect(() => {
        incomingTypeRef.current = incomingType;
    }, [incomingType]);

    useEffect(() => () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }
    }, []);

    const changeType = useCallback((newBackgroundType, easingOrOptions, durationArg, opacityArg) => {
        if (!Object.values(BackgroundType).includes(newBackgroundType)) {
            const validValues = Object.values(BackgroundType);
            throw new Error(`Invalid value: ${newBackgroundType}. Expected one of: ${validValues.join(', ')}`);
        }

        if (newBackgroundType === currentType && incomingTypeRef.current === null) {
            return;
        }

        const {hasAnimationConfig, easing, duration, opacity} = resolveAnimationConfig(easingOrOptions, durationArg, opacityArg);
        const normalizedEasing = normalizeEasing(easing);
        const normalizedDuration = normalizeDuration(duration, hasAnimationConfig ? DEFAULT_DURATION_MS : 0);
        const normalizedOpacity = normalizeOpacity(opacity);
        const transitionToken = transitionTokenRef.current + 1;
        transitionTokenRef.current = transitionToken;

        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }

        setTransitionStyle({
            transitionDuration: `${normalizedDuration}ms`,
            transitionTimingFunction: normalizedEasing
        });

        if (normalizedDuration === 0) {
            setCurrentType(newBackgroundType);
            setCurrentOpacity(normalizedOpacity);
            setIncomingType(null);
            setIncomingOpacity(1);
            setIsTransitioning(false);
            return;
        }

        setIsTransitioning(false);
        setIncomingType(newBackgroundType);
        setIncomingOpacity(normalizedOpacity);

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (transitionTokenRef.current !== transitionToken) {
                return;
            }

            setIsTransitioning(true);
        });
    }, [currentType]);

    const handleIncomingTransitionEnd = useCallback((event) => {
        if (event.propertyName !== "opacity") {
            return;
        }

        const nextType = incomingTypeRef.current;
        if (!nextType) {
            return;
        }

        setCurrentType(nextType);
        setCurrentOpacity(incomingOpacity);
        setIncomingType(null);
        setIncomingOpacity(1);
        setIsTransitioning(false);
    }, [incomingOpacity]);

    useImperativeHandle(ref, () => ({hide, show, changeType}), [hide, show, changeType]);

    const zIndexClass = typeof zIndex === "number" ? `z-${zIndex}` : "";

    return (<div
            id={id}
            className={`${styles.background} ${zIndexClass}`}
            style={{display: isHidden ? "none" : "block",}}
        >
            <div
                className={`${styles.backgroundLayer} ${styles.backgroundBase} ${styles[`background--${currentType}`]}`}
                style={{opacity: currentOpacity}}
            />
            {incomingType && <div
                className={`${styles.backgroundLayer} ${styles.backgroundIncoming} ${isTransitioning ? styles["backgroundIncoming--active"] : ""} ${styles[`background--${incomingType}`]}`}
                style={{...transitionStyle, opacity: isTransitioning ? incomingOpacity : 0}}
                onTransitionEnd={handleIncomingTransitionEnd}
            />}
        </div>);
});

Background.displayName = "Background";

export default memo(Background);
