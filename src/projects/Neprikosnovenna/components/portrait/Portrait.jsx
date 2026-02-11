import "./Portrait.css";

export const PortraitType = {
  IMAGE: 0,
  VIDEO: 1,
};

function Portrait({ portraitType = PortraitType.IMAGE }) {
  if (portraitType === PortraitType.VIDEO) {
    return (
      <figure>
        <video
          id="Portrait"
          className="portrait not-allowed z-2"
          poster="/images/НЕПРИКОСНОВЕННА.png"
          muted
        >
          <source
            src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).webm"
            type="video/webm"
          />
          <source src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).mp4" type="video/mp4" />
        </video>
      </figure>
    );
  }

  // Для изображения (по умолчанию)
  return (
    <figure>
      <img
        id="Portrait"
        className="portrait not-allowed z-1"
        src="/images/НЕПРИКОСНОВЕННА.png"
        alt="НЕПРИКОСНОВЕННА"
      />
    </figure>
  );
}

export default Portrait;
