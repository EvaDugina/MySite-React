import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react";
import { useClicks } from './hooks/useClicks.js';
import "./Cursor.css";
import "./CursorClickTracker.css";
import { CursorImages } from "./CursorSettings.js";

function getIdHash(clickId) {
    return String(clickId)
        .split('')
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

const CursorClickTracker = forwardRef((props, ref) => {

    const {zIndex} = props;

    const { clicks, addClick, clearClicks } = useClicks();
    const lastSpawnTimeRef = useRef(0);
    const [visibleRange, setVisibleRange] = useState({start: 0, end: 200});

    // Виртуализация - вычисляем видимые курсоры
    const visibleClicks = useMemo(() => {
        return clicks.slice(visibleRange.start, visibleRange.end);
    }, [clicks, visibleRange]);

    // Обновляем видимый диапазон при добавлении новых курсоров
    useEffect(() => {
        if (clicks.length > visibleRange.end) {
            setVisibleRange(prev => ({
                ...prev,
                end: Math.min(clicks.length, prev.end + 100)
            }));
        }
    }, [clicks.length, visibleRange.end]);

    // Сохранение позиции клика с уникальным идентификатором
    const saveClickPosition = useCallback((cursorPosition) => {
        const now = Date.now();
        
        // Проверяем, что с последнего спавна прошло не менее 200ms
        if (now - lastSpawnTimeRef.current < 150) {
            return; // Пропускаем добавление курсора
        }
        
        lastSpawnTimeRef.current = now;
        addClick(cursorPosition.x, cursorPosition.y);
    }, [addClick]);

    useImperativeHandle(ref, () => ({
        saveClickPosition,
    }));

    const getCursorVars = useMemo(() => (click) => {
        const id = click?.id ?? click?.timestamp;
        const hash = getIdHash(id);

        // 0.5 / 1 / 2 => разные частоты
        const speedMult = (hash % 3) === 0 ? 0.5 : (hash % 3) === 1 ? 1 : 2;
        const delayMs = (hash % 10) * 50;

        // «Случайные пропуски» реализуем как периодические паузы:
        // часть элементов получает режим skip (без клика) на основе hash, но это не детерминирует
        // общую «синхронизацию» + задержка и частота разные.
        const skip = (hash % 5) === 0;

        return {
            id,
            speedMult,
            delayMs,
            skip,
            speedClass: speedMult === 0.5 ? 'cursor-speed-slow' : 
                       speedMult === 1 ? 'cursor-speed-normal' : 'cursor-speed-fast',
            delayClass: `cursor-delay-${hash % 10}`
        };
    }, []);

    // Мемоизация вычислений для всех видимых курсоров
    const memoizedCursorVars = useMemo(() => {
        const vars = new Map();
        visibleClicks.forEach(click => {
            vars.set(click.id, getCursorVars(click));
        });
        return vars;
    }, [visibleClicks, getCursorVars]);

    return (
        <div className="cursor-container" aria-hidden>
            {visibleClicks.map((click) => {
                const vars = memoizedCursorVars.get(click.id);

                return (
                    <div
                        key={click.id}
                        className={`cursor cursor-print ignore-cursor not-allowed${vars.skip ? ' cursor-skip' : ''} ${vars.speedClass} ${vars.delayClass}`}
                        style={{
                            zIndex: zIndex,
                            transform: `translate(-26.5%, -9%)`,
                            top: `${click.y}%`,
                            left: `${click.x}%`,
                        }}
                    />
                );
            })}
        </div>
    );
});

CursorClickTracker.displayName = "CursorClickTracker";
export default CursorClickTracker;