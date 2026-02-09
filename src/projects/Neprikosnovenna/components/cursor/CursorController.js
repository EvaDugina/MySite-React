import { CursorImages } from "./CursorConstants"

export class CursorController {
    constructor(cursorState, cursorSettings, cursorZoneConfig, updateCallback) {
        // Сохраняем конфигурацию
        this.CURSOR_SETTINGS = cursorSettings
        this.ZONE = cursorZoneConfig.Zone
        this.ZONES_SETTINGS = cursorZoneConfig.Data
        this.updateCallback = updateCallback

        // Состояние курсора
        this.state = {
            position: {
                x: 0,
                y: 0,
            },
            src: CursorImages.NONE,
            zone: this.ZONE.NONE,
            isHidden: false,
        }
        this.state = { ...this.state, ...cursorState }

        // Инициализация переменных состояния
        this.targetX = 0
        this.targetY = 0
        this.currentX = 0
        this.currentY = 0
        this.velocityX = 0
        this.velocityY = 0

        // Внутренние состояния
        this.isStopped = false
        this.isMouseDown = false
        this.clickStartTime = 0
        this.lastClickTime = 0
        this.dbClickCount = 0

        // Внутренние переменные
        this.animationId = null

        // Привязка контекста
        this.onMosemove = this.onMosemove.bind(this)
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.onBlur = this.onBlur.bind(this)
        this.onResize = this.onResize.bind(this)
        this.updatePosition = this.updatePosition.bind(this)
    }

    // PUBLIC METHODS

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
        this.isStopped = true
        window.removeEventListener("mousemove", this.onMosemove)
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    restartCursor() {
        this.isStopped = false
        this.startAnimation()
    }

    disableCursor() {
        window.removeEventListener("mousedown", this.onMouseDown)
        window.removeEventListener("mouseup", this.onMouseUp)
    }

    destroy() {
        this.stopCursor()
        window.removeEventListener("blur", this.onBlur)
        window.removeEventListener("resize", this.onResize)
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
            window.addEventListener("mousemove", this.onMosemove)
            window.addEventListener("mousedown", this.onMouseDown)
            window.addEventListener("mouseup", this.onMouseUp)
            window.addEventListener("blur", this.onBlur)
            window.addEventListener("resize", this.onResize)
        }, timeout * 1000)

        return this.state
    }

    // Инициализация Rect ZONES
    // initRectZones() {
    //     if (!this.zoneElements) return

    //     this.rectZones.clear()

    //     Object.entries(this.ZONES).forEach(([key, zoneId]) => {
    //         const zoneConfig = this.ZONES_SETTINGS[zoneId]
    //         if (zoneConfig && this.zoneElements[zoneId]) {
    //             const element = this.zoneElements[zoneId].current
    //             if (element) {
    //                 this.rectZones.set(zoneId, element.getBoundingClientRect())
    //             }
    //         }
    //     })
    // }

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
        if (!this.animationId && !this.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    // Handlers

    onMosemove(e) {
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

    // Обработчики событий мыши
    async onMouseDown(event) {
        if (event.which === 1) {
            if (this.isMouseDown) return

            this.isMouseDown = true
            this.clickStartTime = Date.now()

            // this.changeCursorSrc(
            //     this.ZONES_SETTINGS[this.currentZone].imgCursorClicked,
            // )
            this.changeCursorSrc(CursorImages.POINTER_CLICKED)

            // Обработка двойного клика
            const now = Date.now()
            if (now - this.lastClickTime < 300) {
                // 300ms для двойного клика
                this.dbClickCount++

                if (this.dbClickCount === 2) {
                    // Двойной клик
                    // if (this.CURSOR_SETTINGS.handleDoubleLeftClick) {
                    //     this.CURSOR_SETTINGS.handleDoubleLeftClick(event)
                    // }
                    this.dbClickCount = 0
                    clearTimeout(this.dbClickTimeout)
                }
            } else {
                this.dbClickCount = 1

                // Таймаут для сброса счетчика двойного клика
                clearTimeout(this.dbClickTimeout)
                this.dbClickTimeout = setTimeout(() => {
                    this.dbClickCount = 0
                }, 300)

                // Обычный клик
                // if (this.CURSOR_SETTINGS.handleLeftClickDown) {
                //     await this.CURSOR_SETTINGS.handleLeftClickDown(event)
                // }
            }

            this.lastClickTime = now
        }
    }

    async onMouseUp(event) {
        if (event.which === 1) {
            if (!this.isMouseDown) return

            this.isMouseDown = false

            // if (this.CURSOR_SETTINGS.handleLeftClickUp) {
            //     await this.CURSOR_SETTINGS.handleLeftClickUp(event)
            // }

            // Проверяем, что кнопка ещё не нажата снова
            if (!this.isMouseDown) {
                // this.changeCursorSrc(
                //     this.ZONES_SETTINGS[this.state.zone].imgCursor,
                // )
                this.changeCursorSrc(CursorImages.POINTER)
            }
        }
    }

    onBlur() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    onResize() {
        // this.initRectZones()
    }

    // UPDATES

    updatePosition() {
        if (this.isStopped) {
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
        if (!this.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    changeCursorSrc(newSrc) {
        if (!newSrc && newSrc !== null) return
        if (newSrc === null) newSrc = CursorImages.NONE
        if (newSrc === this.state.src) return

        this.updateState({ src: newSrc })
    }
}
