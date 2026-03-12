import { forwardRef, useEffect, useRef, useCallback, useImperativeHandle, useState } from 'react';
import { useClicks } from './hooks/useClicks.js';
import "./WebGLCursorTracker.css";

/**
 * WebGL Cursor Tracker с instancing для отрисовки 10k+ одинаковых изображений.
 * Использует ANGLE_instanced_arrays (WebGL1) или нативный instancing (WebGL2).
 * Render-once: рендерит только при изменении данных, без постоянного rAF цикла.
 */
const WebGLCursorTracker = forwardRef((props, ref) => {
    const { zIndex, imageUrl = '/images/cursors/pointer.png', spriteSize = 30 } = props;
    const { clicks, addClick } = useClicks();
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const renderRef = useRef(null);
    const clicksRef = useRef([]);
    const programRef = useRef(null);
    const textureRef = useRef(null);
    const instanceBufferRef = useRef(null);
    const vaoRef = useRef(null);
    const extRef = useRef(null);
    const isWebGL2Ref = useRef(false);
    const textureLoadedRef = useRef(false);
    const needsRenderRef = useRef(false);
    const lastSpawnTimeRef = useRef(0);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        clicksRef.current = clicks;
    }, [clicks]);

    // Сохранение позиции клика с троттлингом
    const saveClickPosition = useCallback((cursorPosition) => {
        const now = Date.now();
        if (now - lastSpawnTimeRef.current < 150) {
            return;
        }
        lastSpawnTimeRef.current = now;
        addClick(cursorPosition.x, cursorPosition.y);
        needsRenderRef.current = true;
    }, [addClick]);

    useImperativeHandle(ref, () => ({
        saveClickPosition,
    }));

    // Инициализация WebGL (один раз при монтировании)
    useEffect(() => {

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Пытаемся получить WebGL2, fallback на WebGL1
        let gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
        let isWebGL2 = !!gl;
        
        if (!gl) {
            gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
                 canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
        }
        
        if (!gl) {
            console.error('WebGLCursorTracker: WebGL not supported');
            return;
        }

        glRef.current = gl;
        isWebGL2Ref.current = isWebGL2;
        console.log(`WebGLCursorTracker: Using ${isWebGL2 ? 'WebGL2' : 'WebGL1'}`);

        // Для WebGL1 получаем расширение instancing
        if (!isWebGL2) {
            const ext = gl.getExtension('ANGLE_instanced_arrays');
            if (!ext) {
                console.error('WebGLCursorTracker: ANGLE_instanced_arrays not supported');
                return;
            }
            extRef.current = ext;
        }

        // Установка размера canvas
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;
            
            const width = Math.floor(displayWidth * dpr);
            const height = Math.floor(displayHeight * dpr);
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
                needsRenderRef.current = true;
                renderRef.current?.();
            }
        };

        // Шейдеры для instancing
        // Vertex shader: базовая геометрия + instance offset
        const vertexShaderSource = isWebGL2 ? `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;
            in vec2 a_offset;  // Instance attribute: позиция в NDC
            
            out vec2 v_texCoord;
            
            uniform float u_size;
            
            void main() {
                vec2 position = a_position * u_size + a_offset;
                gl_Position = vec4(position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        ` : `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            attribute vec2 a_offset;  // Instance attribute: позиция в NDC
            
            varying vec2 v_texCoord;
            
            uniform float u_size;
            
            void main() {
                vec2 position = a_position * u_size + a_offset;
                gl_Position = vec4(position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = isWebGL2 ? `#version 300 es
            precision mediump float;
            
            in vec2 v_texCoord;
            out vec4 fragColor;
            
            uniform sampler2D u_texture;
            uniform float u_alpha;
            
            void main() {
                vec4 color = texture(u_texture, v_texCoord);
                fragColor = vec4(color.rgb, color.a * u_alpha);
            }
        ` : `
            precision mediump float;
            
            varying vec2 v_texCoord;
            
            uniform sampler2D u_texture;
            uniform float u_alpha;
            
            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                gl_FragColor = vec4(color.rgb, color.a * u_alpha);
            }
        `;

        // Компиляция шейдеров
        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        programRef.current = program;

        // Создаём VAO (для WebGL2) или настраиваем атрибуты напрямую
        if (isWebGL2) {
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            vaoRef.current = vao;
        }

        // Базовая геометрия: один квад (6 вершин, 2 треугольника)
        // Нормализованные координаты: центр в (0,0), размер 2x2
        const quadVertices = new Float32Array([
            // position    texCoord
            -1.0, -1.0,    0.0, 1.0,  // левый верхний
             1.0, -1.0,    1.0, 1.0,  // правый верхний
            -1.0,  1.0,    0.0, 0.0,  // левый нижний
             1.0, -1.0,    1.0, 1.0,  // правый верхний (дубль)
             1.0,  1.0,    1.0, 0.0,  // правый нижний
            -1.0,  1.0,    0.0, 0.0   // левый нижний (дубль)
        ]);

        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        const offsetLoc = gl.getAttribLocation(program, 'a_offset');

        // Настраиваем vertex attributes для базового квада
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
        
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

        // Instance buffer для позиций
        const instanceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        instanceBufferRef.current = instanceBuffer;

        // Настраиваем instance attribute
        gl.enableVertexAttribArray(offsetLoc);
        gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Указываем, что этот атрибут обновляется для каждого instance
        if (isWebGL2) {
            gl.vertexAttribDivisor(offsetLoc, 1);
        } else {
            extRef.current.vertexAttribDivisorANGLE(offsetLoc, 1);
        }

        // Отвязываем VAO (WebGL2)
        if (isWebGL2) {
            gl.bindVertexArray(null);
        }

        // Загрузка текстуры
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Временная текстура 1x1
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
            new Uint8Array([255, 255, 255, 255]));
        
        textureRef.current = texture;

        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            textureLoadedRef.current = true;
            needsRenderRef.current = true;
            renderRef.current?.();
            console.log('WebGLCursorTracker: Texture loaded');
        };
        image.onerror = () => {
            console.error('WebGLCursorTracker: Failed to load texture:', imageUrl);
        };

        // Включаем blending для прозрачности
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setIsInitialized(true);

        // Функция рендера (вызывается по требованию, не в цикле)
        function render() {
            if (!textureLoadedRef.current || !needsRenderRef.current) return;
            
            const gl = glRef.current;
            const program = programRef.current;
            const clicksData = clicksRef.current;
            
            if (!gl || !program) return;

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const instanceCount = clicksData.length;
            if (instanceCount === 0) {
                needsRenderRef.current = false;
                return;
            }

            // Вычисляем размер спрайта в NDC (нормализованные координаты)
            // spriteSize в CSS-пикселях -> NDC: size_px / (canvas_width/2) * 2 = size_px * 2 / canvas_width
            // НЕ используем DPR, т.к. spriteSize указан в CSS-пикселях
            const canvasWidth = gl.canvas.width;
            const canvasHeight = gl.canvas.height;
            const sizeNdcX = (spriteSize / canvasWidth) * 2;
            const sizeNdcY = (spriteSize / canvasHeight) * 2;
            const sizeNdc = Math.min(sizeNdcX, sizeNdcY);

            // Подготавливаем instance данные
            const instanceData = new Float32Array(instanceCount * 2);
            
            for (let i = 0; i < instanceCount; i++) {
                const click = clicksData[i];
                // Проценты [0..100] -> NDC [-1..1]
                const x = (click.x / 100) * 2 - 1;
                const y = -((click.y / 100) * 2 - 1); // Инверсия Y
                instanceData[i * 2] = x;
                instanceData[i * 2 + 1] = y;
            }

            // Обновляем instance buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, instanceBufferRef.current);
            gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

            gl.useProgram(program);

            // Uniforms
            const sizeLoc = gl.getUniformLocation(program, 'u_size');
            const alphaLoc = gl.getUniformLocation(program, 'u_alpha');
            const textureLoc = gl.getUniformLocation(program, 'u_texture');
            
            gl.uniform1f(sizeLoc, sizeNdc);
            gl.uniform1f(alphaLoc, 0.3);
            gl.uniform1i(textureLoc, 0);

            // Bind texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

            // Рендерим instances
            if (isWebGL2) {
                gl.bindVertexArray(vaoRef.current);
                gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
                gl.bindVertexArray(null);
            } else {
                // Для WebGL1 нужно заново настроить атрибуты перед draw
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
                const posLoc = gl.getAttribLocation(program, 'a_position');
                const texLoc = gl.getAttribLocation(program, 'a_texCoord');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
                gl.enableVertexAttribArray(texLoc);
                gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
                
                gl.bindBuffer(gl.ARRAY_BUFFER, instanceBufferRef.current);
                const offLoc = gl.getAttribLocation(program, 'a_offset');
                gl.enableVertexAttribArray(offLoc);
                gl.vertexAttribPointer(offLoc, 2, gl.FLOAT, false, 0, 0);
                extRef.current.vertexAttribDivisorANGLE(offLoc, 1);
                
                extRef.current.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, instanceCount);
            }

            needsRenderRef.current = false;
        }

        renderRef.current = render;
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            
            // Освобождение GPU ресурсов
            if (gl) {
                if (programRef.current) gl.deleteProgram(programRef.current);
                if (textureRef.current) gl.deleteTexture(textureRef.current);
                if (quadBuffer) gl.deleteBuffer(quadBuffer);
                if (instanceBufferRef.current) gl.deleteBuffer(instanceBufferRef.current);
                if (vaoRef.current) gl.deleteVertexArray(vaoRef.current);
            }
        };
    }, []); // Пустой массив — инициализация один раз

    // Рендер при изменении clicks
    useEffect(() => {
        if (!isInitialized) return;
        needsRenderRef.current = true;
        
        renderRef.current?.();
    }, [clicks, isInitialized]);

    return (
        <canvas
            ref={canvasRef}
            className="webgl-cursor-container"
            style={{ 
                zIndex,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
            aria-hidden
        />
    );
});

WebGLCursorTracker.displayName = "WebGLCursorTracker";
export default WebGLCursorTracker;
