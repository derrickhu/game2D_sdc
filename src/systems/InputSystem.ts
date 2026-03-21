/**
 * 横版输入系统 - 虚拟摇杆
 * 摇杆: 左半屏触摸, 左右移动 + 上下攀爬梯子
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { JOYSTICK_RADIUS, JOYSTICK_DEADZONE, JOYSTICK_KNOB_RADIUS } from '@/config/Constants';

export interface SideInput {
  moveX: number;      // -1 ~ 1 水平
  moveY: number;      // -1(上) ~ 1(下) 垂直（梯子用）
  magnitude: number;
}

interface RawTouch { id: number; x: number; y: number; sx: number; sy: number; }
declare const GameGlobal: any;

function cssToLogic(): number { return Game.designWidth / Game.screenWidth; }

class InputSystemClass {
  readonly input: SideInput = { moveX: 0, moveY: 0, magnitude: 0 };

  // 兼容旧接口
  get joystick() { return { dx: this.input.moveX, dy: this.input.moveY, magnitude: this.input.magnitude }; }
  skillPressed = false;
  extractPressed = false;

  private _trackingId: number | null = null;
  private _originLx = 0;
  private _originLy = 0;

  private _base: PIXI.Graphics | null = null;
  private _knob: PIXI.Graphics | null = null;
  private _hudContainer: PIXI.Container | null = null;

  private _baseX = 120;
  private _baseY = 0;

  init(hudContainer: PIXI.Container): void {
    this._hudContainer = hudContainer;
    this._baseY = Game.logicHeight - 160;

    // 虚拟摇杆底座
    this._base = new PIXI.Graphics();
    this._base.beginFill(0xffffff, 0.12);
    this._base.drawCircle(0, 0, JOYSTICK_RADIUS);
    this._base.endFill();
    this._base.position.set(this._baseX, this._baseY);
    this._base.eventMode = 'none';
    hudContainer.addChild(this._base);

    // 摇杆头
    this._knob = new PIXI.Graphics();
    this._knob.beginFill(0xffffff, 0.35);
    this._knob.drawCircle(0, 0, JOYSTICK_KNOB_RADIUS);
    this._knob.endFill();
    this._knob.position.set(this._baseX, this._baseY);
    this._knob.eventMode = 'none';
    hudContainer.addChild(this._knob);
  }

  resetFrame(): void {
    this.skillPressed = false;
    this.extractPressed = false;
  }

  pollTouch(): void {
    const touches: RawTouch[] = (typeof GameGlobal !== 'undefined' ? (GameGlobal as any).__sdcTouches : null)
      || (globalThis as any).__sdcTouches || [];
    const scale = cssToLogic();
    const halfW = Game.logicWidth / 2;

    // ── 摇杆逻辑 ──
    if (this._trackingId !== null) {
      const t = touches.find((tt: RawTouch) => tt.id === this._trackingId);
      if (!t) {
        this._trackingId = null;
        this.input.moveX = 0;
        this.input.moveY = 0;
        this.input.magnitude = 0;
        if (this._base) this._base.position.set(this._baseX, this._baseY);
        if (this._knob) this._knob.position.set(this._baseX, this._baseY);
      } else {
        const lx = t.x * scale, ly = t.y * scale;
        const dx = lx - this._originLx, dy = ly - this._originLy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < JOYSTICK_RADIUS * JOYSTICK_DEADZONE) {
          this.input.moveX = 0;
          this.input.moveY = 0;
          this.input.magnitude = 0;
          if (this._knob) this._knob.position.set(this._originLx, this._originLy);
        } else {
          const clamped = Math.min(dist, JOYSTICK_RADIUS);
          const nx = dx / dist, ny = dy / dist;
          this.input.moveX = nx;
          this.input.moveY = ny;
          this.input.magnitude = Math.min(clamped / JOYSTICK_RADIUS, 1);
          if (this._knob) this._knob.position.set(this._originLx + nx * clamped, this._originLy + ny * clamped);
        }
      }
    } else {
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.magnitude = 0;
    }

    // 查找新的左半屏触摸（摇杆）
    if (this._trackingId === null) {
      for (const t of touches) {
        const lx = t.sx * scale;
        if (lx < halfW) {
          this._trackingId = t.id;
          this._originLx = lx;
          this._originLy = t.sy * scale;
          if (this._base) this._base.position.set(this._originLx, this._originLy);
          if (this._knob) this._knob.position.set(this._originLx, this._originLy);
          break;
        }
      }
    }
  }

  destroy(): void {
    this._trackingId = null;
    if (this._base) { this._base.destroy(); this._base = null; }
    if (this._knob) { this._knob.destroy(); this._knob = null; }
  }
}

export const InputSystem = new InputSystemClass();
