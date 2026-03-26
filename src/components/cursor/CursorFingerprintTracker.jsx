import {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useFingerprintAPI } from "./hooks/useFingerprintAPI.js";
import { useFingerprintAnimation } from "./hooks/useFingerprintAnimation.js";
import { FingerprintConfig } from "./CursorFingerprintTrackerSettings.js";
import "./CursorFingerprintTracker.css";

const getSpriteSizePx = (spriteRem) =>
  spriteRem * parseFloat(getComputedStyle(document.documentElement).fontSize);

/**
 * CursorFingerprintTracker — двухслойный рендер отпечатков.
 *
 * Layer 1 (WebGL): все отпечатки из БД, render-once, instanced draw.
 * Layer 2 (2D Canvas): отпечатки текущей сессии с анимацией кликов.
 */
const CursorFingerprintTracker = forwardRef((props, ref) => {
  const { zIndex, onReady, startFadeIn } = props;
  const {
    SPRITE_REM,
    ALPHA,
    CANVAS_OPACITY,
    THROTTLE_MS,
    FADE_IN_DURATION,
    FADE_IN_EASING,
    HOTSPOT_X,
    HOTSPOT_Y,
    IMAGE_URL,
    IMAGE_CLICKED_URL,
  } = FingerprintConfig;

  // Динамический размер спрайта: rem → px (совпадает с CSS-размером курсора)
  const spriteSizePxRef = useRef(null);

  // API hook
  const { dbFingerprints, isReady, addFingerprint, clearAll } =
    useFingerprintAPI();

  // Animation hook
  const { startAnimation, stopAnimation } = useFingerprintAnimation();

  // Refs
  const webglCanvasRef = useRef(null);
  const sessionCanvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const instanceBufferRef = useRef(null);
  const textureRef = useRef(null);
  const vaoRef = useRef(null);
  const extRef = useRef(null);
  const isWebGL2Ref = useRef(false);
  const textureLoadedRef = useRef(false);
  const webglRenderRef = useRef(null);
  const dbFingerprintsRef = useRef([]);
  const lastSpawnTimeRef = useRef(0);

  // Fade-in
  const [isVisible, setIsVisible] = useState(false);

  // Layer 2 state
  const sessionClicksRef = useRef([]);
  const [sessionClicks, setSessionClicks] = useState([]);
  const pointerImgRef = useRef(null);
  const pointerClickedImgRef = useRef(null);
  const imagesLoadedRef = useRef(0);
  const sessionCtxRef = useRef(null);

  // Sync refs
  useEffect(() => {
    dbFingerprintsRef.current = dbFingerprints;
  }, [dbFingerprints]);

  useEffect(() => {
    sessionClicksRef.current = sessionClicks;
  }, [sessionClicks]);

  useEffect(() => {
    if (isReady && onReady) onReady(dbFingerprints.length);
  }, [isReady]);

  // ===== LAYER 2: Preload images =====
  useEffect(() => {
    const onLoad = () => {
      imagesLoadedRef.current++;
    };

    const img1 = new Image();
    img1.src = IMAGE_URL;
    img1.onload = onLoad;
    pointerImgRef.current = img1;

    const img2 = new Image();
    img2.src = IMAGE_CLICKED_URL;
    img2.onload = onLoad;
    pointerClickedImgRef.current = img2;
  }, [IMAGE_URL, IMAGE_CLICKED_URL]);

  // ===== FADE-IN =====
  useEffect(() => {
    if (!startFadeIn) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, [startFadeIn]);

  // ===== LAYER 1: WebGL init (render-once) =====
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    let gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
    });
    let isWebGL2 = !!gl;

    if (!gl) {
      gl =
        canvas.getContext("webgl", {
          alpha: true,
          premultipliedAlpha: true,
        }) ||
        canvas.getContext("experimental-webgl", {
          alpha: true,
          premultipliedAlpha: true,
        });
    }

    if (!gl) {
      console.error("CursorFingerprintTracker: WebGL not supported");
      return;
    }

    glRef.current = gl;
    isWebGL2Ref.current = isWebGL2;

    if (!isWebGL2) {
      const ext = gl.getExtension("ANGLE_instanced_arrays");
      if (!ext) {
        console.error(
          "CursorFingerprintTracker: ANGLE_instanced_arrays not supported",
        );
        return;
      }
      extRef.current = ext;
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      const width = Math.floor(displayWidth * dpr);
      const height = Math.floor(displayHeight * dpr);

      // Пересчитать размер спрайта (rem мог измениться при пересечении медиа-запроса)
      spriteSizePxRef.current = getSpriteSizePx(SPRITE_REM);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      // Перерендер нужен всегда: даже если canvas не изменился, font-size мог
      webglRenderRef.current?.();
    };

    // Шейдеры — идентичны WebGLCursorTracker
    // Hotspot shift: сдвигаем квад так, чтобы горячая точка курсора
    // (HOTSPOT_X, HOTSPOT_Y от верхнего-левого угла) совпала с a_offset.
    // Квад идёт от -1 до 1, hotspot в этих координатах:
    // hx = -1 + HOTSPOT_X * 2, hy = 1 - HOTSPOT_Y * 2
    // Сдвиг = -hotspot: (-hx, -hy)
    const hotspotShiftX = -(-1 + HOTSPOT_X * 2); // = 1 - HOTSPOT_X * 2 = 0.47
    const hotspotShiftY = -(1 - HOTSPOT_Y * 2); // = -1 + HOTSPOT_Y * 2 = -0.82

    const vertexShaderSource = isWebGL2
      ? `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;
            in vec2 a_offset;
            out vec2 v_texCoord;
            uniform vec2 u_size;
            uniform vec2 u_hotspotShift;
            void main() {
                vec2 position = (a_position + u_hotspotShift) * u_size + a_offset;
                gl_Position = vec4(position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `
      : `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            attribute vec2 a_offset;
            varying vec2 v_texCoord;
            uniform vec2 u_size;
            uniform vec2 u_hotspotShift;
            void main() {
                vec2 position = (a_position + u_hotspotShift) * u_size + a_offset;
                gl_Position = vec4(position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

    const fragmentShaderSource = isWebGL2
      ? `#version 300 es
            precision mediump float;
            in vec2 v_texCoord;
            out vec4 fragColor;
            uniform sampler2D u_texture;
            uniform float u_alpha;
            void main() {
                vec4 color = texture(u_texture, v_texCoord);
                float a = color.a * u_alpha;
                fragColor = vec4(color.rgb * a, a);
            }
        `
      : `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform float u_alpha;
            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                float a = color.a * u_alpha;
                gl_FragColor = vec4(color.rgb * a, a);
            }
        `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    if (isWebGL2) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      vaoRef.current = vao;
    }

    const quadVertices = new Float32Array([
      -1.0, -1.0, 0.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0, -1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0,
    ]);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "a_position");
    const texCoordLoc = gl.getAttribLocation(program, "a_texCoord");
    const offsetLoc = gl.getAttribLocation(program, "a_offset");

    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

    const instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    instanceBufferRef.current = instanceBuffer;

    gl.enableVertexAttribArray(offsetLoc);
    gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);

    if (isWebGL2) {
      gl.vertexAttribDivisor(offsetLoc, 1);
    } else {
      extRef.current.vertexAttribDivisorANGLE(offsetLoc, 1);
    }

    if (isWebGL2) {
      gl.bindVertexArray(null);
    }

    // Текстура
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    textureRef.current = texture;

    const image = new Image();
    image.src = IMAGE_URL;
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textureLoadedRef.current = true;
      webglRenderRef.current?.();
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Render-once функция
    function render() {
      if (!textureLoadedRef.current) return;

      const gl = glRef.current;
      const program = programRef.current;
      const data = dbFingerprintsRef.current;

      if (!gl || !program) return;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const instanceCount = data.length;
      if (instanceCount === 0) return;

      const canvasWidth = gl.canvas.width;
      const canvasHeight = gl.canvas.height;
      const spriteSize = spriteSizePxRef.current;
      const sizeNdcX = spriteSize / canvasWidth;
      const sizeNdcY = spriteSize / canvasHeight;

      const instanceData = new Float32Array(instanceCount * 2);
      for (let i = 0; i < instanceCount; i++) {
        const fp = data[i];
        instanceData[i * 2] = (fp.x / 100) * 2 - 1;
        instanceData[i * 2 + 1] = -((fp.y / 100) * 2 - 1);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBufferRef.current);
      gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);

      gl.useProgram(program);

      const sizeLoc = gl.getUniformLocation(program, "u_size");
      const alphaLoc = gl.getUniformLocation(program, "u_alpha");
      const textureLoc = gl.getUniformLocation(program, "u_texture");
      const hotspotLoc = gl.getUniformLocation(program, "u_hotspotShift");

      gl.uniform2f(sizeLoc, sizeNdcX, sizeNdcY);
      gl.uniform1f(alphaLoc, ALPHA);
      gl.uniform1i(textureLoc, 0);
      gl.uniform2f(hotspotLoc, hotspotShiftX, hotspotShiftY);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

      if (isWebGL2) {
        gl.bindVertexArray(vaoRef.current);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
        gl.bindVertexArray(null);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const posLoc = gl.getAttribLocation(program, "a_position");
        const texLoc = gl.getAttribLocation(program, "a_texCoord");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBufferRef.current);
        const offLoc = gl.getAttribLocation(program, "a_offset");
        gl.enableVertexAttribArray(offLoc);
        gl.vertexAttribPointer(offLoc, 2, gl.FLOAT, false, 0, 0);
        extRef.current.vertexAttribDivisorANGLE(offLoc, 1);

        extRef.current.drawArraysInstancedANGLE(
          gl.TRIANGLES,
          0,
          6,
          instanceCount,
        );
      }
    }

    webglRenderRef.current = render;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (gl) {
        if (programRef.current) gl.deleteProgram(programRef.current);
        if (textureRef.current) gl.deleteTexture(textureRef.current);
        if (quadBuffer) gl.deleteBuffer(quadBuffer);
        if (instanceBufferRef.current)
          gl.deleteBuffer(instanceBufferRef.current);
        if (vaoRef.current && isWebGL2) gl.deleteVertexArray(vaoRef.current);
      }
    };
  }, [SPRITE_REM, ALPHA, IMAGE_URL]);

  // Layer 1: render при готовности данных + текстуры
  // Задержка 1с для отладки (гарантирует что текстура и данные загружены)
  useEffect(() => {
    if (!isReady || dbFingerprints.length === 0) return;

    const timerId = setTimeout(() => {
      webglRenderRef.current?.();
      console.log(
        `Layer 1: rendering ${dbFingerprints.length} fingerprints from DB`,
      );
    }, 1000);

    return () => clearTimeout(timerId);
  }, [isReady, dbFingerprints]);

  // ===== LAYER 2: 2D Canvas setup =====
  useEffect(() => {
    const canvas = sessionCanvasRef.current;
    if (!canvas) return;

    const resizeSessionCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);

      // Пересчитать размер спрайта (rem мог измениться)
      spriteSizePxRef.current = getSpriteSizePx(SPRITE_REM);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        sessionCtxRef.current = ctx;
      }
      // Перерисовать всегда: font-size мог измениться без изменения canvas
      redrawSession();
    };

    const ctx = canvas.getContext("2d");
    sessionCtxRef.current = ctx;

    resizeSessionCanvas();
    window.addEventListener("resize", resizeSessionCanvas);

    return () => {
      window.removeEventListener("resize", resizeSessionCanvas);
    };
  }, []);

  // Перерисовка Layer 2
  const redrawSession = useCallback(() => {
    const ctx = sessionCtxRef.current;
    const canvas = sessionCanvasRef.current;
    if (!ctx || !canvas) return;

    const pointerImg = pointerImgRef.current;
    const clickedImg = pointerClickedImgRef.current;
    if (!pointerImg || imagesLoadedRef.current < 2) return;

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const spriteSize = spriteSizePxRef.current;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.globalAlpha = ALPHA;

    const clicks = sessionClicksRef.current;
    for (let i = 0; i < clicks.length; i++) {
      const click = clicks[i];
      const img = click.isClicked ? clickedImg : pointerImg;
      const px = (click.x / 100) * displayWidth - spriteSize * HOTSPOT_X;
      const py = (click.y / 100) * displayHeight - spriteSize * HOTSPOT_Y;
      ctx.drawImage(img, px, py, spriteSize, spriteSize);
    }
  }, [ALPHA, HOTSPOT_X, HOTSPOT_Y]);

  // Перерисовка при изменении сессионных кликов
  useEffect(() => {
    redrawSession();
  }, [sessionClicks, redrawSession]);

  // ===== LAYER 2: Animation =====
  useEffect(() => {
    const getCount = () => sessionClicksRef.current.length;

    const setClickState = (index, isClicked) => {
      setSessionClicks((prev) => {
        if (index >= prev.length) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], isClicked };
        return updated;
      });
    };

    startAnimation(getCount, setClickState);

    return () => {
      stopAnimation();
    };
  }, [startAnimation, stopAnimation]);

  // ===== Imperative API =====
  const saveClickPosition = useCallback(
    (cursorPosition) => {
      const now = Date.now();
      if (now - lastSpawnTimeRef.current < THROTTLE_MS) return;
      lastSpawnTimeRef.current = now;

      const { x, y } = cursorPosition;

      // Layer 2: добавить в сессию
      setSessionClicks((prev) => [...prev, { x, y, isClicked: false }]);

      // API: сохранить в БД (batched)
      addFingerprint(x, y);
    },
    [addFingerprint, THROTTLE_MS],
  );

  const clearAllFingerprints = useCallback(async () => {
    // Очистить БД
    await clearAll();

    // Очистить сессию
    setSessionClicks([]);

    // Очистить Layer 1 (WebGL canvas)
    const gl = glRef.current;
    if (gl) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Очистить Layer 2
    const ctx = sessionCtxRef.current;
    const canvas = sessionCanvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  }, [clearAll]);

  useImperativeHandle(ref, () => ({
    saveClickPosition,
    clearAllFingerprints,
    getSessionClickCount: () => sessionClicksRef.current.length,
  }));

  return (
    <div
      className="fingerprint-container"
      style={{
        zIndex,
      }}
    >
      <canvas
        ref={webglCanvasRef}
        style={{
          opacity: isVisible ? CANVAS_OPACITY : 0,
          transition: `opacity ${FADE_IN_DURATION}ms ${FADE_IN_EASING}`,
        }}
        aria-hidden
      />
      <canvas ref={sessionCanvasRef} aria-hidden />
    </div>
  );
});

CursorFingerprintTracker.displayName = "CursorFingerprintTracker";
export default CursorFingerprintTracker;
