import "./Portrait.scss";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from "react";

export const PortraitType = {
  IMAGE: 0,
  VIDEO: 1,
};

const Portrait = forwardRef((props, ref) => {
  const { portraitType = PortraitType.IMAGE, settings } = props;

  const isPlayingRef = useRef(false);
  const videoRef = useRef(null);

  const init = async () => {
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
  };

  const onEnded = () => {
    if (settings.onEnded != null) settings.onEnded();
  };

  // Инициализация
  useEffect(() => {
    init();
    videoRef.current.addEventListener("ended", onEnded);
    return () => {
      // videoRef.current.removeEventListener("ended", onEnded)
    };
  }, []);

  const show = useCallback((isSmoothly) => {
    // 3. Плавно показываем видео
    if (isSmoothly) videoRef.current.classList.add("show-smoothly");
    videoRef.current.style.opacity = 1;
  }, []);

  // Функция для безопасного запуска
  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    videoRef.current
      .play()
      .then(() => {
        isPlayingRef.current = true;
      })
      .catch((error) => {
        console.error("Ошибка воспроизведения:", error.name, error.message);
      });
  }, []);

  // Функция для паузы
  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    videoRef.current.pause();
    isPlayingRef.current = false;
  }, []);

  const rewindToEnd = useCallback(() => {
    if (videoRef.current.readyState >= 1) {
      // уже есть метаданные
      videoRef.current.currentTime = videoRef.current.duration;
    } else {
      videoRef.current.addEventListener("loadedmetadata", () => {
        videoRef.current.currentTime = videoRef.current.duration;
      });
    }
  }, []);

  // Функция для остановки
  const stop = useCallback(() => {
    pause();
    videoRef.current.currentTime = 0;
  }, []);

  useImperativeHandle(ref, () => ({
    show,
    play,
    pause,
    stop,
    rewindToEnd,
  }));

  return (
    <>
      <figure>
        <video
          id="Portrait"
          ref={videoRef}
          className="portrait video not-allowed z-2"
          poster="/images/НЕПРИКОСНОВЕННА.png"
          muted
        >
          <source
            src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).webm"
            type="video/webm"
          />
          <source src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).mp4" type="video/mp4" />
        </video>
        <img
          id="Portrait"
          className="portrait image not-allowed z-1"
          src="/images/НЕПРИКОСНОВЕННА.png"
          alt="НЕПРИКОСНОВЕННА"
        />
      </figure>
    </>
  );
});

export default Portrait;
