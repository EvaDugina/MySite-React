import { useCallback, useEffect, useRef } from "react";

export function useVideoController(settings, videoRef) {
    const isPlayingRef = useRef(false);

    const init = useCallback(async () => {
        // 1. Подготавливаем видео (загружаем, но не показываем)
        videoRef.current.load();

        // 2. Ждем, когда видео сможет воспроизводиться
        await new Promise((resolve) => {
            if (videoRef.current.readyState >= 2) {
                resolve();
            } else {
                videoRef.current.addEventListener("canplay", resolve);
            }
        });
    }, [videoRef]);

    const onEnded = useCallback(() => {
        if (settings.onEnded !== null && settings.onEnded !== undefined) {
            settings.onEnded();
        }
    }, [settings]);

    useEffect(() => {
        let videoElement = videoRef.current;
        init().then(() => {
            videoElement.addEventListener("ended", onEnded);
        });
        return () => {
            videoElement.removeEventListener("ended", onEnded);
        };
    }, [init, videoRef, onEnded]);

    const show = useCallback(
        (isSmoothly= false) => {
            // 3. Плавно показываем видео
            if (isSmoothly) videoRef.current.classList.add("show-smoothly");
            videoRef.current.style.opacity = 1;
        },
        [videoRef],
    );

    const hide = useCallback(
        (isSmoothly= false) => {
            if (isSmoothly) videoRef.current.classList.add("show-smoothly");
            videoRef.current.style.opacity = 0;
        },
        [videoRef],
    );

    const play = useCallback(() => {
        if (isPlayingRef.current) return;

        videoRef.current
            .play()
            .then(() => {
                isPlayingRef.current = true;
            })
            .catch((error) => {
                console.error(
                    "Ошибка воспроизведения:",
                    error.name,
                    error.message,
                );
            });
    }, [videoRef]);

    const pause = useCallback(() => {
        if (!isPlayingRef.current) return;
        videoRef.current.pause();
        isPlayingRef.current = false;
    }, [videoRef]);

    //
    //
    //

    const scrollTo = useCallback(
        (time) => {
            if (videoRef.current.readyState >= 1) {
                // уже есть метаданные
                videoRef.current.currentTime = time;
            } else {
                videoRef.current.addEventListener(
                    "loadedmetadata",
                    () => {
                        videoRef.current.currentTime = time;
                    },
                    { once: true },
                );
            }
        },
        [videoRef],
    );

    const getVideoDuration = useCallback(() => {
        if (videoRef.current.readyState > 0) {
            return videoRef.current.duration;
        }
        // If not ready, wait for the metadata to be loaded
        return new Promise((resolve) => {
            videoRef.current.addEventListener(
                "loadedmetadata",
                () => {
                    resolve(videoRef.current.duration);
                },
                { once: true },
            ); // Use once: true to automatically remove the listener
        });
    }, [videoRef]);

    const scrollToStart = useCallback(() => scrollTo(0), [scrollTo]);

    const scrollToEnd = useCallback(async () => {
        const duration = await getVideoDuration();
        scrollTo(duration);
    }, [getVideoDuration, scrollTo]);

    //
    //
    //

    const stop = useCallback(() => {
        pause();
        scrollToStart();
    }, [pause, scrollToStart]);

    //
    //
    //

    return {
        showVideo: show, hideVideo: hide,
        playVideo: play, pauseVideo: pause, stopVideo: stop,
        scrollToEndVideo: scrollToEnd, scrollToStartVideo: scrollToStart
    };
}

export default useVideoController;
