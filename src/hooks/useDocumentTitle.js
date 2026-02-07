import { useEffect, useRef } from "react"

export function useDocumentTitle(title, keepOnUnmount = true) {
    const defaultTitle = useRef(document.title)

    useEffect(() => {
        document.title = title
    }, [title])

    useEffect(() => {
        return () => {
            if (!keepOnUnmount) {
                document.title = defaultTitle.current
            }
        }
    }, [keepOnUnmount])
}
