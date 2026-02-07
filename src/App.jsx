import React from "react";
import Cursor, { CursorType } from "./components/Cursor/Cursor";
import PortraitContainer, {
  PortraitContainerType,
} from "./components/PortraitContainer/PortraitContainer";
import "./App.css";
import Background from "./components/Background/Background";
// Пока не импортируем CSS из public, скопируем их в src позже

function App() {
  return (
    <div className="app">
      <Cursor type={CursorType.NONE} />

      <PortraitContainer type={PortraitContainerType.DEFAULT} />

      <Background />
    </div>
  );
}

export default App;
