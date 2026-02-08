export class CursorController {
    constructor(CURSOR_SETTINGS, updateCallback) {
        // Сохраняем конфигурацию
        this.CURSOR_SETTINGS = CURSOR_SETTINGS
        this.updateCallback = updateCallback // Для обновления React состояния

        // Состояние курсора
        this.state = {
            position: { x: 0, y: 0 },
            isHidden: false,
            isStopped: false,
        }

        // Инициализация переменных состояния
        this.targetX = 0
        this.targetY = 0
        this.currentX = 0
        this.currentY = 0
        this.velocityX = 0
        this.velocityY = 0

        // Внутренние состояния
        this.animationId = null

        // Привязка контекста
        this.handleMosemove = this.handleMosemove.bind(this)
        this.updatePosition = this.updatePosition.bind(this)
    }

    // PUBLIC METHODS
    getCursorState() {
        return this.state
    }

    hideCursor() {
        this.updateState({
            isHidden: true,
        })
    }

    showCursor() {
        this.updateState({
            isHidden: false,
        })
    }

    stopCursor() {
        this.updateState({ isStopped: true })
        window.removeEventListener("mousemove", this.handleMosemove)

        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    restartCursor() {
        this.updateState({ isStopped: false })
        this.startAnimation()
    }

    destroy() {
        this.stopCursor()
        window.removeEventListener("mousemove", this.handleMosemove)
    }

    // Локальные методы
    updateState(newState) {
        this.state = { ...this.state, ...newState }
        if (this.updateCallback && typeof this.updateCallback === "function") {
            this.updateCallback(this.state)
        }
    }

    // INIT METHODS
    init() {
        // Проверяем доступность window (для SSR)
        if (typeof window === "undefined") return

        this.initPosition()
        this.startAnimation()

        let timeout = this.CURSOR_SETTINGS.timeout || 0

        setTimeout(() => {
            window.addEventListener("mousemove", this.handleMosemove)
        }, timeout * 1000)

        return this.state
    }

    // Инициализация начальной позиции
    initPosition() {
        if (
            this.CURSOR_SETTINGS.startX !== undefined &&
            this.CURSOR_SETTINGS.startY !== undefined
        ) {
            this.currentX = this.targetX =
                window.innerWidth * this.CURSOR_SETTINGS.startX
            this.currentY = this.targetY =
                window.innerHeight * this.CURSOR_SETTINGS.startY

            this.updateState({
                position: { x: this.currentX, y: this.currentY },
            })
        }
    }

    startAnimation() {
        if (!this.animationId && !this.state.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    // Handlers
    handleMosemove(e) {
        const clientX = e.clientX
        const clientY = e.clientY

        if ((!clientX && clientX !== 0) || (!clientY && clientY !== 0)) return

        this.targetX = clientX
        this.targetY = clientY

        if (this.currentX === null || this.currentY === null) {
            this.currentX = this.targetX
            this.currentY = this.targetY
        }

        this.startAnimation()
    }

    // UPDATES
    updatePosition() {
        if (this.state.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
            return
        }

        // Рассчитываем разницу
        const dx = this.targetX - this.currentX
        const dy = this.targetY - this.currentY

        // Если разница очень маленькая, останавливаемся
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            this.currentX = this.targetX
            this.currentY = this.targetY
        } else {
            // Пружинная физика
            const forceX = dx * this.CURSOR_SETTINGS.stiffness
            const forceY = dy * this.CURSOR_SETTINGS.stiffness

            const accelerationX = forceX / this.CURSOR_SETTINGS.mass
            const accelerationY = forceY / this.CURSOR_SETTINGS.mass

            this.velocityX =
                (this.velocityX + accelerationX) * this.CURSOR_SETTINGS.damping
            this.velocityY =
                (this.velocityY + accelerationY) * this.CURSOR_SETTINGS.damping

            // Ограничение скорости
            const speed = Math.sqrt(
                this.velocityX * this.velocityX +
                    this.velocityY * this.velocityY,
            )
            const maxSpeed = this.CURSOR_SETTINGS.maxSpeed || 50

            if (speed > maxSpeed) {
                this.velocityX = (this.velocityX / speed) * maxSpeed
                this.velocityY = (this.velocityY / speed) * maxSpeed
            }

            this.currentX += this.velocityX
            this.currentY += this.velocityY
        }

        // Обновляем состояние
        this.updateState({
            position: { x: this.currentX, y: this.currentY },
        })

        // Продолжаем анимацию
        if (!this.state.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }
}
