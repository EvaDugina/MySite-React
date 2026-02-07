import "./PortraitContainer.css";
import Portrait, { PortraitType } from "./Portrait/Portrait";
import Flash, { FlashType } from "./Flash/Flash";

export const PortraitContainerType = {
  DEFAULT: 0,
};

const StaticData = {
  [PortraitContainerType.DEFAULT]: {
    classes: "portrait-container-default",
  },
};

function PortraitContainer({ type = PortraitContainerType.DEFAULT }) {
  return (
    <div id="PortraitContainer" className={StaticData[type].classes}>
      <div id="CursorsContainer" className="d-none"></div>

      <button id="BtnNeprikosnovenna" className="not-allowed z-6">
        неприкосновенна
      </button>

      <Flash flashType={FlashType.BEHIND} />
      <Flash flashType={FlashType.FRONT} />
      <Flash />

      <Portrait portraitType={PortraitType.VIDEO} />
    </div>
  );
}

export default PortraitContainer;
