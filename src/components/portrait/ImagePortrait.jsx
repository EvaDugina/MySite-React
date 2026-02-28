import styles from "./Portrait.module.scss";

/**
 * Статичный портрет (изображение).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const ImagePortrait = ({ zIndex }) => (
    <>
        <figure className={styles.figure}>
            <img
                id="Portrait"
                className={`${styles.portrait} ${styles["portrait--image"]} not-allowed z-${zIndex}`}
                src="/images/НЕПРИКОСНОВЕННА.png"
                alt="НЕПРИКОСНОВЕННА"
            />
        </figure>
    </>
);

export default ImagePortrait;
