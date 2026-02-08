export class CursorController {
    constructor(
        CURSOR_SETTINGS,
        CURSOR_IMAGES,
        ZONES,
        ZONES_SETTINGS,
        updateCallback,
    ) {
        // Сохраняем конфигурацию
        this.CURSOR_SETTINGS = CURSOR_SETTINGS
        this.CURSOR_IMAGES = CURSOR_IMAGES
        this.ZONES = ZONES
        this.ZONES_SETTINGS = ZONES_SETTINGS
        this.updateCallback = updateCallback // Для обновления React состояния

        // Состояние курсора
        this.state = {
            position: { x: 0, y: 0 },
            src: CURSOR_IMAGES.NONE,
            zone: ZONES.NONE,
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
        this.rectZones = new Map()
        this.animationId = null
        this.isMouseDown = false
        this.isFrozen = false
        this.dbClickCount = 0
        this.dbClickTimeout = null
        this.clickStartTime = 0
        this.lastClickTime = 0

        // DOM элементы
        this.zoneElements = null
        this.cursorElement = null

        // Привязка контекста
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.handleMosemove = this.handleMosemove.bind(this)
        this.handleBlur = this.handleBlur.bind(this)
        this.updatePosition = this.updatePosition.bind(this)
        this.handleOnResize = this.handleOnResize.bind(this) // Добавлено: отсутствовало
    }

    //
    // PUBLIC METHODS
    //

    getCursorState() {
        return this.state
    }

    isCursorZone(zoneType) {
        return this.state.zone === zoneType
    }

    // Метод для установки DOM элементов зон
    setZoneElements(zoneElements) {
        this.zoneElements = zoneElements
        this.initRectZones()
    }

    setCursorElement(element) {
        this.cursorElement = element
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
        window.removeEventListener("blur", this.handleBlur)

        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    restartCursor() {
        this.initRectZones()
        this.updateState({ isStopped: false })
        this.startAnimation()
        this.updateCurrentZone()
    }

    disableCursor() {
        window.removeEventListener("mousedown", this.onMouseDown)
        window.removeEventListener("mouseup", this.onMouseUp)
    }

    destroy() {
        this.stopCursor()
        this.disableCursor()
        window.removeEventListener("resize", this.handleOnResize)
    }

    //
    // LOCAL METHODS
    //

    // Обновление React состояния
    updateState(newState) {
        this.state = { ...this.state, ...newState }
        if (this.updateCallback && typeof this.updateCallback === "function") {
            this.updateCallback(this.state)
        }
    }

    //
    // INIT METHODS
    //

    init() {
        // Проверяем доступность window (для SSR)
        if (typeof window === "undefined") return

        this.initPosition()
        this.startAnimation()

        let timeout = this.CURSOR_SETTINGS.timeout || 0

        setTimeout(() => {
            window.addEventListener("mousemove", this.handleMosemove)
            window.addEventListener("mousedown", this.onMouseDown)
            window.addEventListener("mouseup", this.onMouseUp)
            window.addEventListener("blur", this.handleBlur)
            window.addEventListener("resize", this.handleOnResize)
        }, timeout * 1000)

        return this.state
    }

    // Инициализация начальной позиции
    initPosition() {
        if (
            this.CURSOR_SETTINGS.startX !== null &&
            this.CURSOR_SETTINGS.startY !== null
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

    // Инициализация Rect ZONES
    initRectZones() {
        if (!this.zoneElements) return

        this.rectZones.clear()

        Object.entries(this.ZONES).forEach(([key, zoneId]) => {
            const zoneConfig = this.ZONES_SETTINGS[zoneId]
            if (zoneConfig && this.zoneElements[zoneId]) {
                const element = this.zoneElements[zoneId].current
                if (element) {
                    this.rectZones.set(zoneId, element.getBoundingClientRect())
                }
            }
        })
    }

    startAnimation() {
        if (!this.animationId && !this.state.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    //
    // Handlers
    //

    // Обработчики событий мыши
    async onMouseDown(event) {
        if (event.which === 1) {
            if (this.isMouseDown) return

            this.isMouseDown = true
            this.clickStartTime = Date.now()

            this.changeCursorSrc(
                this.ZONES_SETTINGS[this.currentZone].imgCursorClicked,
            )

            // Обработка двойного клика
            const now = Date.now()
            if (now - this.lastClickTime < 300) {
                // 300ms для двойного клика
                this.dbClickCount++

                if (this.dbClickCount === 2) {
                    // Двойной клик
                    if (this.CURSOR_SETTINGS.handleDoubleLeftClick) {
                        this.CURSOR_SETTINGS.handleDoubleLeftClick(event)
                    }
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
                if (this.CURSOR_SETTINGS.handleLeftClickDown) {
                    await this.CURSOR_SETTINGS.handleLeftClickDown(event)
                }
            }

            this.lastClickTime = now
        }
    }

    async onMouseUp(event) {
        if (event.which === 1) {
            if (!this.isMouseDown) return

            this.isMouseDown = false

            if (this.CURSOR_SETTINGS.handleLeftClickUp) {
                await this.CURSOR_SETTINGS.handleLeftClickUp(event)
            }

            // Проверяем, что кнопка ещё не нажата снова
            if (!this.isMouseDown) {
                this.changeCursorSrc(
                    this.ZONES_SETTINGS[this.state.zone].imgCursor,
                )
            }
        }
    }

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

    // Обработка ресайза
    handleBlur() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    handleOnResize() {
        this.initRectZones()
    }

    handleOnCurrentZone() {
        if (this.ZONES_SETTINGS[this.currentZone].handleOn === null) return
        this.ZONES_SETTINGS[this.currentZone].handleOn()
    }

    handleOffCurrentZone() {
        if (this.ZONES_SETTINGS[this.currentZone].handleOff === null) return
        this.ZONES_SETTINGS[this.currentZone].handleOff()
    }

    //
    // UPDATES
    //

    // Функция для плавного обновления позиции
    // ФИЗИКА ДВИЖЕНИЯ
    updatePosition() {
        if (this.state.isStopped || !this.state.position) {
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

        this.updateCurrentZone()

        // Продолжаем анимацию
        if (!this.state.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    updateCurrentZone() {
        if (!this.rectZones.size) return

        let foundZone = null

        // Проверяем зоны в обратном порядке (от последней к первой)
        const zoneEntries = Object.entries(this.ZONES).reverse()

        for (const [key, zoneId] of zoneEntries) {
            if (this.isCursorInZone(zoneId)) {
                foundZone = zoneId
                break
            }
        }

        // Если зона не найдена, используем NONE
        const newZone = foundZone !== null ? foundZone : this.ZONES.NONE

        // Если зона изменилась
        if (newZone !== this.state.zone) {
            // Вызываем обработчик выхода из старой зоны
            if (this.ZONES_SETTINGS[this.state.zone]?.handleOff) {
                this.ZONES_SETTINGS[this.state.zone].handleOff()
            }

            // Обновляем состояние
            this.updateState({ zone: newZone })
            this.changeCursorSrc(this.ZONES_SETTINGS[newZone].imgCursor)

            // Вызываем обработчик входа в новую зону
            if (this.ZONES_SETTINGS[newZone]?.handleOn) {
                this.ZONES_SETTINGS[newZone].handleOn()
            }
        }
    }

    //
    // CURSOR
    //

    isCursorInZone(zoneType) {
        if (zoneType === this.ZONES.NONE) return true
        if (this.currentX === null || this.currentY === null) return false

        const rect = this.rectZones.get(zoneType)
        if (!rect) return false

        // Проверяем, находится ли курсор внутри прямоугольника
        return (
            this.currentX >= rect.left &&
            this.currentX <= rect.right &&
            this.currentY >= rect.top &&
            this.currentY <= rect.bottom
        )
    }

    changeCursorSrc(newSrc) {
        if (!newSrc && newSrc !== null) return
        if (newSrc === null) newSrc = this.CURSOR_IMAGES.NONE
        if (newSrc === this.state.src) return

        this.updateState({ src: newSrc })
    }
}
