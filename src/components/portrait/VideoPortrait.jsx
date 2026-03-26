import styles from "./Portrait.module.scss";
import React, {forwardRef} from "react";

/**
 * Статичный портрет (изображение).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const VideoPortrait = forwardRef((props, ref) => {

    const {id, zIndex} = props;

    return (<video
        id={id}
        ref={ref}
        className={`${styles.portrait} ${styles["portrait--video"]} not-allowed z-${zIndex}`}
        poster="/images/НЕПРИКОСНОВЕННА.webp"
        preload="metadata"
        muted
    >
        <source
            src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).webm"
            type="video/webm"
        />
        <source
            src="/videos/ЛИЗА ПЛАЧЕТ (22 секунды).mp4"
            type="video/mp4"
        />
    </video>);
});

VideoPortrait.displayName = "VideoPortrait";

export default VideoPortrait;
