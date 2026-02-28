import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Хук воспроизведения нескольких звуков (случайный или по индексу) через Web Audio API.
 * @param {string[]} sources - массив URL аудиофайлов
 * @returns {{ play: (index?: number | null) => void, isLoaded: boolean, error: string | null }}
 */
function useSoundEffects(sources) {
    const audioContextRef = useRef(null);
    const buffersRef = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!sources || sources.length === 0) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContextClass();
        audioContextRef.current = context;

        const loadAll = async () => {
            try {
                const fetchPromises = sources.map(async (src) => {
                    const response = await fetch(src);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} для ${src}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    return await context.decodeAudioData(arrayBuffer);
                });

                buffersRef.current = await Promise.all(fetchPromises);
                setIsLoaded(true);
                setError(null);
            } catch (err) {
                console.error('Ошибка загрузки звуков:', err);
                setError(err.message);
            }
        };

        loadAll();

        return () => {
            context.close();
            audioContextRef.current = null;
        };
    }, [sources]);

    const play = useCallback((index = null) => {
        const context = audioContextRef.current;
        const buffers = buffersRef.current;

        if (!context || context.state === 'closed' || buffers.length === 0) return;

        const randomIndex = index === null
            ? Math.floor(Math.random() * buffers.length)
            : index;
        const buffer = buffers[randomIndex];

        const playSound = () => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start();
        };

        if (context.state === 'suspended') {
            context.resume().then(playSound);
        } else {
            playSound();
        }
    }, []);

    return { play, isLoaded, error };
}

export { useSoundEffects };
export default useSoundEffects;
