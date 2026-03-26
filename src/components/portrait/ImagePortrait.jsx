import styles from "./Portrait.module.scss";
import React, { useCallback } from "react";
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

  const imagePortraitSrc = StaticData[type].src;

  const handleLoad = useCallback(() => {
    setIsLoadedCallback?.(true);
  }, [setIsLoadedCallback]);

  return (
    <img
      id={id}
      className={`${styles.portrait} ${styles["portrait--image"]} not-allowed z-${zIndex}`}
      src={imagePortraitSrc}
      alt="НЕПРИКОСНОВЕННА"
      onLoad={handleLoad}
    />
  );
};

ImagePortrait.displayName = "ImagePortrait";

export default ImagePortrait;
