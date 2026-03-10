import styles from "./Portrait.module.scss";
import React from "react";
import {ImagePortraitType, StaticData} from "./ImagePortraitSettings.js";

/**
 * Статичный портрет (изображение).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const ImagePortrait = ({type = ImagePortraitType.DEFAULT, zIndex}) => {

    const imagePortraitSrc = StaticData[type].src;

    return (<img
        id="Portrait"
        className={`${styles.portrait} ${styles["portrait--image"]} not-allowed z-${zIndex}`}
        src={imagePortraitSrc}
        alt="НЕПРИКОСНОВЕННА"
    />);
}

ImagePortrait.displayName = "ImagePortrait";

export default ImagePortrait;
