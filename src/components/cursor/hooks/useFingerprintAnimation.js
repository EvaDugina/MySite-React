import { useRef, useCallback } from "react";

const BASE_INTERVAL = 1000;
const CLICK_DURATION = 150;
const MAX_DEVIATION = 1000;
const SKIP_PROBABILITY = 0.6;

/**
 * Хук анимации отпечатков для Layer 2.
 * На каждом тике каждому отпечатку:
 * - 60% шанс пропустить
 * - рандомное отклонение от базового интервала
 * - кратковременная смена на CLICKED, затем возврат
 */
export function useFingerprintAnimation() {
  const intervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  const clearTimeouts = useCallback(() => {
    for (const id of timeoutsRef.current) {
      clearTimeout(id);
    }
    timeoutsRef.current = [];
  }, []);

  /**
   * @param {Function} getClicksCount - возвращает текущее количество отпечатков
   * @param {Function} setClickState - (index, isClicked) => void
   */
  const startAnimation = useCallback((getClicksCount, setClickState) => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const count = getClicksCount();
      if (count === 0) return;

      for (let i = 0; i < count; i++) {
        if (Math.random() < SKIP_PROBABILITY) continue;

        const deviation = Math.random() * MAX_DEVIATION;
        const timeoutId = setTimeout(() => {
          setClickState(i, true);

          const revertId = setTimeout(() => {
            setClickState(i, false);
          }, CLICK_DURATION);

          timeoutsRef.current.push(revertId);
        }, deviation);

        timeoutsRef.current.push(timeoutId);
      }
    }, BASE_INTERVAL);
  }, []);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearTimeouts();
  }, [clearTimeouts]);

  return { startAnimation, stopAnimation };
}
