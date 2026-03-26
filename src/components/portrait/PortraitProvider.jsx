import styles from "./Portrait.module.scss";
import React, {forwardRef, useCallback, useImperativeHandle, useRef, useState} from "react";
import useVideoController from "./hooks/useVideoController.js";
import ImagePortrait from "./ImagePortrait.jsx";
import {ImagePortraitType} from "./ImagePortraitSettings.js";
import VideoPortrait from "./VideoPortrait.jsx";

/**
 * Портрет с видео и постером, управление через ref (show, hide, play, pause, stop, scrollToEnd).
 * @param {Object} props
 * @param {Object} [props.settings]
 * @param {number} [props.zIndex]
 */
const PortraitProvider = forwardRef((props, ref) => {
    const {id, settings, zIndex} = props;

    const videoRef = useRef(null);

    const [imagePortraitType, setImagePortraitType] = useState(ImagePortraitType.DEFAULT);
    const {
        showVideo,
        hideVideo,
        playVideo,
        pauseVideo,
        stopVideo,
        scrollToEndVideo,
        scrollToStartVideo
    } = useVideoController(settings, videoRef);

    const changeImagePortraitType = useCallback((newImagePortraitType) => {
        if (!Object.values(ImagePortraitType).includes(newImagePortraitType)) {
            const validValues = Object.values(ImagePortraitType);
            throw new Error(`Invalid value: ${newImagePortraitType}. Expected one of: ${validValues.join(', ')}`);
        }
        setImagePortraitType(newImagePortraitType);
    }, [])

    useImperativeHandle(ref, () => ({
        showVideo,
        hideVideo,
        playVideo,
        pauseVideo,
        stopVideo,
        scrollToEndVideo,
        scrollToStartVideo,
        changeImagePortraitType
    }));

    return (<>
        <figure className={styles.figure}>
            <VideoPortrait
                id={id}
                ref={videoRef}
                zIndex={zIndex + 1}
            />
            <ImagePortrait
                id={id}
                type={imagePortraitType}
                zIndex={zIndex}
            />
        </figure>
    </>);
});

PortraitProvider.displayName = "PortraitProvider";

export default PortraitProvider;
