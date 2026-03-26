import styles from "./Portrait.module.scss";
import React, { useEffect, useRef } from "react";
import { ImagePortraitType, StaticData } from "./ImagePortraitSettings.js";

/**
 * Static portrait image.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {number} [props.type] - ImagePortraitType value
 * @param {number} [props.zIndex]
 * @param {Function} [props.setIsLoadedCallback] - called when image is loaded
 */
const ImagePortrait = (props) => {
  const {
    id,
    type = ImagePortraitType.DEFAULT,
    zIndex,
    setIsLoadedCallback,
  } = props;

  const imageRef = useRef(null);
  const imagePortraitSrc = StaticData[type].src;

  useEffect(() => {
    setIsLoadedCallback?.(true);
  }, [imageRef.current]);

  return (
    <img
      ref={imageRef}
      id={id}
      className={`${styles.portrait} ${styles["portrait--image"]} not-allowed z-${zIndex}`}
      src={imagePortraitSrc}
      alt="НЕПРИКОСНОВЕННА"
    />
  );
};

ImagePortrait.displayName = "ImagePortrait";

export default ImagePortrait;
