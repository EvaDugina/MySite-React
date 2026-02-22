import React from "react";
import "./Flash.css";
import {FlashType} from "./FlashSettingsHandler.js";

const StaticData = {
    [FlashType.DEFAULT]: {
        src: "",
    }, [FlashType.FRONT]: {
        src: "/images/01.jpg",
    }, [FlashType.BEHIND]: {
        src: "/images/02.jpg",
    },
};

function Flash({type = FlashType.DEFAULT}) {
    if (type === FlashType.DEFAULT) {
        return (<div
            // key={crypto?.randomUUID() ?? Date.now().toString()}
            id={`FlashContainer${type}`}
            className="flash-container ignore-cursor blend-exclusion z-3 d-none"
        >
            <div id="FlashBack" className="flash-container not-allowed"/>
        </div>);
    }

    return (<div
        id={`FlashContainer${type}`}
        className={`flash-container ignore-cursor z-3 d-none`}
    >
        <img
            id={`Flash${type}`}
            className="flash not-allowed"
            src={StaticData[type].src}
            alt="ВСПЫШКА"
        />
    </div>);
}

export default Flash;
