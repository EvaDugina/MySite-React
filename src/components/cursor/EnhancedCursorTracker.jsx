import { forwardRef, useEffect, useRef, useState } from 'react';
import WebGLCursorTracker from './WebGLCursorTracker.jsx';
import CursorClickTracker from './CursorClickTracker.jsx';

const EnhancedCursorTracker = forwardRef((props, ref) => {
    const [webglSupported, setWebglSupported] = useState(true);
    const checkTimeoutRef = useRef(null);

    useEffect(() => {
        // Проверка поддержки WebGL
        const checkWebGLSupport = () => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                setWebglSupported(false);
                return;
            }

            setWebglSupported(true);
        };

        // Отложенная проверка для избежания блокировки рендера
        checkTimeoutRef.current = setTimeout(checkWebGLSupport, 100);

        return () => {
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }
        };
    }, []);

    // Временно всегда используем простую WebGL версию для тестирования
    return <WebGLCursorTracker {...props} ref={ref} />;
});

EnhancedCursorTracker.displayName = "EnhancedCursorTracker";
export default EnhancedCursorTracker;
