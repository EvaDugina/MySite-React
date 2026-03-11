import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'clicks';
const DEBOUNCE_DELAY = 1000; // 1 секунда для debounce

// Функция debounce для оптимизации localStorage записи
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Асинхронная запись в localStorage
const asyncSaveToStorage = debounce((clicks) => {
    try {
        // Используем setTimeout для неблокирующей записи
        setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
        }, 0);
    } catch (error) {
        console.warn('Не удалось сохранить клики в localStorage:', error);
    }
}, DEBOUNCE_DELAY);

export function useClicks() {
    const [clicksMap, setClicksMap] = useState(() => new Map());
    const [clicksOrder, setClicksOrder] = useState([]);

    const clicks = useMemo(() => {
        return clicksOrder.map((id) => clicksMap.get(id)).filter(Boolean);
    }, [clicksMap, clicksOrder]);

    // Загружаем сохранённые клики при монтировании
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const map = new Map();
                    const order = [];

                    for (const click of parsed) {
                        let id = click?.id;

                        map.set(id, click);
                        order.push(id);
                    }

                    setClicksMap(map);
                    setClicksOrder(order);
                }
            } catch (error) {
                console.error('Ошибка парсинга кликов:', error);
            }
        }
    }, []);

    // Оптимизированное сохранение с debounce
    useEffect(() => {
        if (clicks.length > 0) {
            console.log(clicks.length)
            asyncSaveToStorage(clicks);
        }
    }, [clicks]);

    // Добавление нового клика
    const addClick = useCallback((x, y) => {
        const id = crypto.randomUUID();

        const clickData = {
            id: id,
            x: x,
            y: y,
            timestamp: new Date().toISOString()
        };

        // Пакетное обновление состояния - правильный способ
        setClicksMap(prev => new Map(prev).set(id, clickData));
        setClicksOrder(prev => [...prev, id]);
    }, []);

    // Очистка всех кликов (опционально)
    const clearClicks = useCallback(() => {
        setClicksMap(new Map());
        setClicksOrder([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Не удалось очистить клики в localStorage:', error);
        }
    }, []);

    return { clicks, addClick, clearClicks };
}