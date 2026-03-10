import { useCallback, useEffect, useRef } from 'react';

const MAX_LOAD_RETRIES = 5;

/**
 * Хук для воспроизведения звукового эффекта через Web Audio API.
 * @param {string} src - URL аудиофайла
 * @param {number} [volume=1] - громкость (0–1)
 * @returns {{ play: () => void, error?: string }}
 */
function useSoundEffect(src, volume = 1) {
    const audioContextRef = useRef(null);
    const gainNodeRef = useRef(null);
    const bufferRef = useRef(null);
    const lastSourceRef = useRef(null);
    const srcRef = useRef(src);
    const volumeRef = useRef(volume);

    const initContext = useCallback(async () => {
        if (
            audioContextRef.current
            && audioContextRef.current.state !== 'closed'
        ) {
            await audioContextRef.current.close();
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContextClass();
        const gainNode = context.createGain();
        gainNode.gain.value = volumeRef.current;
        gainNode.connect(context.destination);

        audioContextRef.current = context;
        gainNodeRef.current = gainNode;

        const responseSrc = async () => {
            const response = await fetch(srcRef.current);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            return await context.decodeAudioData(arrayBuffer);
        };

        let attempts = 0;
        while (bufferRef.current === null && attempts < MAX_LOAD_RETRIES) {
            try {
                bufferRef.current = await responseSrc();
            } catch (err) {
                console.error('Ошибка загрузки звука:', err);
                bufferRef.current = null;
                attempts += 1;
            }
        }
    }, []);

    useEffect(() => {
        srcRef.current = src;
        volumeRef.current = volume;
        initContext();

        return () => {
            if (
                audioContextRef.current
                && audioContextRef.current.state !== 'closed'
            ) {
                audioContextRef.current.close();
            }
        };
    }, [src, volume, initContext]);

    const play = useCallback(() => {
        const context = audioContextRef.current;
        const gainNode = gainNodeRef.current;
        const buffer = bufferRef.current;

        if (!context || !gainNode || !buffer) {
            console.warn('Звук ещё не загружен или контекст не готов');
            return;
        }

        if (context.state === 'closed') {
            console.warn('AudioContext закрыт, пересоздаём...');
            initContext().then(() => play());
            return;
        }

        const playSound = () => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
            source.start();
            lastSourceRef.current = source;

            source.onended = () => {
                if (lastSourceRef.current === source) {
                    lastSourceRef.current = null;
                }
            };
        };

        if (context.state === 'suspended') {
            context.resume().then(playSound).catch((err) => {
                console.error('Не удалось возобновить AudioContext:', err);
            });
        } else {
            playSound();
        }
    }, [initContext]);

    return { playAudio: play };
}

export { useSoundEffect };
export default useSoundEffect;
