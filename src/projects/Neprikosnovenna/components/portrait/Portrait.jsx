import "./Portrait.scss";
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from "react";

export const PortraitType = {
  IMAGE: 0,
  VIDEO: 1,
};

const Portrait = forwardRef((props, ref) => {

  const { portraitType = PortraitType.IMAGE, settings } = props

  const isPlayingRef = useRef(false)
  const videoRef = useRef(null)

  const init = async () => {
      // 1. Подготавливаем видео (загружаем, но не показываем)
      videoRef.current.load()

      // 2. Ждем, когда видео сможет воспроизводиться
      await new Promise((resolve) => {
          if (videoRef.current.readyState >= 2) {
              resolve()
          } else {
              videoRef.current.addEventListener("canplay", resolve)
          }
      })

  }

  const onEnded = () => {
    if (settings.onEnded != null) settings.onEnded()
  }

  // Инициализация
  useEffect(() => {
    init()
    videoRef.current.addEventListener("ended", onEnded)
    return () => {
        // videoRef.current.removeEventListener("ended", onEnded)
    }
  }, [])

  // Функция для безопасного запуска
  const play = useCallback(() => {
    if (isPlayingRef.current) return

    // 3. Плавно показываем видео
    videoRef.current.style.opacity = 1
    // videoRef.current.classList.remove("d-none")

    // 5. После завершения анимации скрываем изображение полностью
    // setTimeout(() => {
    //     videoRef.current.style.opacity = 1
    // }, 800) // Должно совпадать с длительностью transition (0.8s)

    videoRef.current.play()
        .then(() => {
            isPlayingRef.current = true
        })
        .catch((error) => {
            console.error("Ошибка воспроизведения:", error.name, error.message)
        })
  }, [])

  // Функция для паузы
  const pause = useCallback(() => {
      if (!isPlayingRef.current) return
      videoRef.current.pause()
      isPlayingRef.current = false
  }, [])

  // Функция для остановки
  const stop = useCallback(() => {
      pause()
      videoRef.current.currentTime = 0
  }, [])
  
  useImperativeHandle(ref, () => ({
    play,
    pause,
    stop
  }));

    return (
      <>
      <figure>
        <video id="Portrait" ref={videoRef}
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
      <img id="Portrait" 
        className="portrait image not-allowed z-1"
        src="/images/НЕПРИКОСНОВЕННА.png"
        alt="НЕПРИКОСНОВЕННА"
      />
    </figure>
    </>
  );
})

export default Portrait;
