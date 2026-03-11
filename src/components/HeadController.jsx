import { useLocation } from 'react-router-dom';
import { routes } from '../AppRouter.config.js';

const getAbsoluteUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = window.location.origin;
    return `${base}${path}`;
};

function HeadController() {
    const location = useLocation();
    const currentRoute = routes.find(route => route.path === location.pathname);

    const title = currentRoute?.title || '';
    const description = currentRoute?.description || '';
    const keywords = currentRoute?.keywords || '';
    const icon = currentRoute?.icon || null;
    const ogImage = currentRoute?.ogImage || currentRoute?.icon || null;

    return (
        <>
            {/* Title */}
            <title>{title}</title>

            {/* Мета-теги */}
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph */}
            <meta property="og:title" content={title} />
            {description && <meta property="og:description" content={description} />}
            {ogImage && <meta property="og:image" content={getAbsoluteUrl(ogImage)} />}
            <meta property="og:url" content={window.location.href} />

            {/* Favicon */}
            {icon && (
                <>
                    <link rel="icon" href={getAbsoluteUrl(icon)} />
                    <link rel="shortcut icon" href={getAbsoluteUrl(icon)} />
                    {/* React 19 автоматически определит MIME-тип */}
                </>
            )}
        </>
    );
}

export default HeadController;