import { useCallback, useEffect, useRef } from 'react';

/**
 * Single audio file playback hook via HTMLAudioElement.
 * @param {string} src - audio URL
 * @param {number|null} [volume=null] - volume (0–1)
 * @returns {{ playAudio: () => void, pauseAudio: () => void, stopAudio: () => void }}
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
