import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export default function ScrollToTop() {
    const { pathname } = useLocation()

    useEffect(() => {
        // Scrolls to the top instantly on route change
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Use "smooth" for animated scrolling
        })
    }, [pathname]) // Rerun the effect whenever the pathname changes

    return null // This component doesn't render anything to the DOM
}
