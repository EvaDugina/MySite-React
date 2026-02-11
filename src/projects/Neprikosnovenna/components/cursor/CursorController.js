import { useRef } from "react"
import { CursorImages } from "./CursorConstants"

export class CursorController {
    constructor(cursorState, cursorSettings, cursorZoneConfig, updateCallback) {
        // Сохраняем конфигурацию
        this.CursorSettings = cursorSettings
        // this.Zone = cursorZoneConfig.Zone
        // this.ZoneSettings = cursorZoneConfig.Data
        this.updateCallback = updateCallback

        // Состояние курсора
        this.state = {
            position: {
                x: null,
                y: null,
            },
            src: CursorImages.DEFAULT,
            elementZoneRef: useRef(null),
            // zone: this.Zone.NONE,
            isHidden: false,
        }
        this.state = { ...this.state, ...cursorState }

        // Инициализация переменных состояния
        this.targetX = null
        this.targetY = null
        this.velocityX = 0
        this.velocityY = 0

        // Внутренние состояния
        this.isStopped = false
        this.isMouseDown = false
        this.lastClickTime = 0
        this.dbClickCount = 0

        // Внутренние переменные
        this.animationId = null
        // this.rectZones = new Map()

        // Привязка контекста
        this.onMosemove = this.onMosemove.bind(this)
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.onBlur = this.onBlur.bind(this)
        this.onResize = this.onResize.bind(this)
        this.updatePosition = this.updatePosition.bind(this)
    }

    //
    // PUBLIC METHODS
    //

    // isCursorZone(zoneType) {
    //     return this.state.zone === zoneType
    // }

    hideCursor() {
        if (isHidden) return
        this.updateState({
            isHidden: true,
        })
    }

    showCursor() {
        if (!isHidden) return
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
        this.disableCursor()
        window.removeEventListener("blur", this.onBlur)
        window.removeEventListener("resize", this.onResize)
    }

    //
    // INIT METHODS
    //

    init() {
        // Проверяем доступность window (для SSR)
        if (typeof window === "undefined") return

        this.initPosition()
        // this.initRectZones()
        this.startAnimation()

        let timeout = this.CursorSettings.timeout || 0

        setTimeout(() => {
            window.addEventListener("mousemove", this.onMosemove)
            window.addEventListener("mousedown", this.onMouseDown)
            window.addEventListener("mouseup", this.onMouseUp)
            window.addEventListener("blur", this.onBlur)
            window.addEventListener("resize", this.onResize)
        }, timeout * 1000)

        return this.state
    }

    // Инициализация начальной позиции
    initPosition() {
        if (
            this.CursorSettings.startX != null &&
            this.CursorSettings.startY != null
        ) {
            this.updateState({
                position: {
                    x: window.innerWidth * this.CursorSettings.startX,
                    y: window.innerHeight * this.CursorSettings.startY,
                },
            })
        }
    }

    // Инициализация Rect ZONES
    // initRectZones() {
    //     this.rectZones.clear()

    //     Object.entries(this.Zone).forEach(([key, zoneType]) => {
    //         const elementRef = this.ZoneSettings[zoneType].elementRef
    //         if (elementRef != null) {
    //             const element = document.getElementById(elementRef)
    //             this.rectZones.set(zoneType, element.getBoundingClientRect())
    //         }
    //     })
    // }

    //
    // Handlers
    //

    onMosemove(e) {
        this.targetX = e.clientX
        this.targetY = e.clientY
        this.startAnimation()
    }

    // Обработчики событий мыши
    async onMouseDown(event) {
        if (event.which === 1) {
            if (this.isMouseDown) return

            this.isMouseDown = true

            // this.changeCursorSrc(
            //     this.ZoneSettings[this.state.zone].imgCursorClicked,
            // )
            // this.changeCursorSrc(CursorImages.POINTER_CLICKED)

            // Обработка двойного клика
            const now = Date.now()
            if (now - this.lastClickTime < 300) {
                // 300ms для двойного клика
                this.dbClickCount++

                if (this.dbClickCount === 2) {
                    // Двойной клик
                    if (this.CursorSettings.handleDoubleLeftClick) {
                        this.CursorSettings.handleDoubleLeftClick(event)
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
                if (this.CursorSettings.handleLeftClickDown) {
                    await this.CursorSettings.handleLeftClickDown(event)
                }
            }

            this.lastClickTime = now
        }
    }

    async onMouseUp(event) {
        if (event.which === 1) {
            if (!this.isMouseDown) return

            this.isMouseDown = false

            if (this.CursorSettings.handleLeftClickUp) {
                await this.CursorSettings.handleLeftClickUp(event)
            }

            // Проверяем, что кнопка ещё не нажата снова
            // this.changeCursorSrc(
            //     this.ZoneSettings[this.state.zone].imgCursor,
            // )
            // this.changeCursorSrc(CursorImages.POINTER)
        }
    }

    onBlur() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    // onResize() {
    //     this.initRectZones()
    // }

    //
    // LOCAL METHODS
    //

    updateState(newState) {
        this.state = { ...this.state, ...newState }
        if (this.updateCallback && typeof this.updateCallback === "function") {
            this.updateCallback(this.state)
        }
    }

    updatePosition() {
        if (this.isStopped || this.targetX == null || this.targetY == null) {
            this.animationId = requestAnimationFrame(this.updatePosition)
            return
        }

        let currentPosition = { ...this.state.position }

        // Инициализация на месте указателя
        if (currentPosition.x == null || currentPosition.y == null) {
            currentPosition.x = this.targetX
            currentPosition.y = this.targetY
        }

        // Рассчитываем разницу
        const dx = this.targetX - currentPosition.x
        const dy = this.targetY - currentPosition.y

        // Если разница очень маленькая, останавливаемся
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            currentPosition.x = this.targetX
            currentPosition.y = this.targetY
        } else {
            // Пружинная физика
            const forceX = dx * this.CursorSettings.stiffness
            const forceY = dy * this.CursorSettings.stiffness

            const accelerationX = forceX / this.CursorSettings.mass
            const accelerationY = forceY / this.CursorSettings.mass

            this.velocityX =
                (this.velocityX + accelerationX) * this.CursorSettings.damping
            this.velocityY =
                (this.velocityY + accelerationY) * this.CursorSettings.damping

            // Ограничение скорости
            const speed = Math.sqrt(
                this.velocityX * this.velocityX +
                    this.velocityY * this.velocityY,
            )
            if (speed > this.CursorSettings.maxSpeed) {
                this.velocityX =
                    (this.velocityX / speed) * this.CursorSettings.maxSpeed
                this.velocityY =
                    (this.velocityY / speed) * this.CursorSettings.maxSpeed
            }

            currentPosition.x += this.velocityX
            currentPosition.y += this.velocityY
        }

        if (
            currentPosition.x != this.state.position.x ||
            currentPosition.y != this.state.position.y
        ) {
            // Обновляем состояние
            this.updateState({
                position: { ...currentPosition },
            })

            this.updateCurrentZone()
        }

        // Продолжаем анимацию
        this.animationId = requestAnimationFrame(this.updatePosition)
    }

    updateCurrentZone() {
        const elementUnder = document.elementFromPoint(
            this.state.position.x,
            this.state.position.y,
        )
        currentElementRef.current = {
            elementUnder,
        }
    }

    // updateCurrentZone() {
    //     if (!this.rectZones.size) return

    //     let foundZone = null

    //     // Проверяем зоны в обратном порядке (от последней к первой)
    //     const zoneEntries = Object.entries(this.Zone).reverse()

    //     for (const [key, zoneType] of zoneEntries) {
    //         if (this.isCursorInZone(zoneType)) {
    //             foundZone = zoneType
    //             break
    //         }
    //     }

    //     // Если зона не найдена, используем NONE
    //     const newZone = foundZone != null ? foundZone : this.Zone.NONE

    //     // Если зона изменилась
    //     if (newZone !== this.state.zone) {
    //         // Вызываем обработчик выхода из старой зоны
    //         if (this.ZoneSettings[this.state.zone]?.handleOff) {
    //             this.ZoneSettings[this.state.zone].handleOff()
    //         }

    //         // Обновляем состояние
    //         this.updateState({ zone: newZone })

    //         this.changeCursorSrc(this.ZoneSettings[newZone].imgCursor)

    //         // Вызываем обработчик входа в новую зону
    //         if (this.ZoneSettings[newZone]?.handleOn) {
    //             this.ZoneSettings[newZone].handleOn()
    //         }
    //     }
    // }

    startAnimation() {
        if (!this.animationId && !this.isStopped) {
            this.animationId = requestAnimationFrame(this.updatePosition)
        }
    }

    // isCursorInZone(zoneType) {
    //     const elementUnder = document.elementFromPoint(
    //         this.state.position.x,
    //         this.state.position.y,
    //     )

    //     if (zoneType == this.Zone.NONE) return true

    //     let currentPosition = { ...this.state.position }
    //     if (currentPosition.x === null || currentPosition.y === null)
    //         return false

    //     let radius = 0
    //     let rect = this.rectZones.get(zoneType)

    //     return (
    //         currentPosition.x + radius >= rect.left &&
    //         currentPosition.x - radius <= rect.right &&
    //         currentPosition.y + radius >= rect.top &&
    //         currentPosition.y - radius <= rect.bottom
    //     )
    // }

    changeCursorSrc(newSrc) {
        if (!newSrc && newSrc != null) return
        if (newSrc == null) newSrc = CursorImages.DEFAULT
        if (newSrc == this.state.src) return

        this.updateState({ src: newSrc })
    }
}
