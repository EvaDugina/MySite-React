import "./Background.css";

function Background({ zIndex = 0 }) {
  return (
    <div
      id="Background"
      className={"background bg-blue z-" + zIndex + " d-none"}
    ></div>
  );
}

export default Background;
