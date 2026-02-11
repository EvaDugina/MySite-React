import "./Background.css";

function Background({ id = "", classes = "bg-white z-0 d-none" }) {
  return <div id={id} className={"background  " + classes}></div>;
}

export default Background;
