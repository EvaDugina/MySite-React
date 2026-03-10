import { useCallback, useEffect, useRef } from 'react';

/**
 * Хук воспроизведения одного аудиофайла через HTMLAudioElement.
 * @param {string} src - URL аудио
 * @param {number|null} [volume=null] - громкость (0–1)
 * @returns {{ play: () => void, pause: () => void, stop: () => void }}
 */
function useAudio(src, volume = null) {
    const audioRef = useRef(null);

    useEffect(() => {
        if (!src) return;

        const audio = new Audio(src);
        audio.load();
        audioRef.current = audio;

        if (volume !== null && volume !== undefined) {
            audioRef.current.volume = volume;
        }

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [src, volume]);

    const play = useCallback(() => {
        audioRef.current?.play().catch(console.error);
    }, []);

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);

    return { playAudio: play, pauseAudio: pause, stopAudio: stop };
}

export { useAudio };
export default useAudio;
