import styles from "./Portrait.module.scss";
import React, {useEffect, useRef, useState} from "react";
import {ImagePortraitType, StaticData} from "./ImagePortraitSettings.js";

/**
 * Статичный портрет (изображение).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const ImagePortrait = ({type = ImagePortraitType.DEFAULT, zIndex}) => {

    const [imagePortraitSrc, setImagePortraitSrc] = useState(StaticData[type].src);

    useEffect(() => {
        setImagePortraitSrc(StaticData[type].src);
    }, [type]);

    return (<img
            id="Portrait"
            className={`${styles.portrait} ${styles["portrait--image"]} not-allowed z-${zIndex}`}
            src={imagePortraitSrc}
            alt="НЕПРИКОСНОВЕННА"
        />);
}

export default ImagePortrait;
