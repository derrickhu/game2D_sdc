/**
 * 楼层制摄像机
 * Y 轴锁定当前楼层中心，X 轴跟随玩家，平滑过渡 + 屏幕震动
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { CAMERA_LERP, MAP_WIDTH, MAP_HEIGHT,
         TILE, ROOM_H, GRID_ROWS } from '@/config/Constants';
import { type RoomData } from '@/managers/MapManager';

const FLOOR_H = ROOM_H * TILE; // 一层楼的像素高度

class CameraSystemClass {
  x = 0; y = 0;
  private _zoom = 2.0;
  private _trauma = 0;
  private _shakeX = 0; _shakeY = 0;
  private _time = 0;
  private _mapContainer: PIXI.Container | null = null;
  private _rooms: RoomData[] = [];
  private _currentFloor = 0;

  get zoom(): number { return this._zoom; }
  get viewWidth(): number { return Game.logicWidth / this._zoom; }
  get viewHeight(): number { return Game.logicHeight / this._zoom; }
  get currentFloor(): number { return this._currentFloor; }

  setMapContainer(container: PIXI.Container): void {
    this._mapContainer = container;
  }

  setRooms(rooms: RoomData[]): void {
    this._rooms = rooms;
    // zoom 使一层楼高度刚好填满屏幕
    this._zoom = Game.logicHeight / FLOOR_H;
  }

  snapTo(targetX: number, targetY: number): void {
    this._currentFloor = this._detectFloor(targetY);
    const hw = this.viewWidth / 2;
    const floorCenterY = (this._currentFloor + 0.5) * FLOOR_H;
    this.x = Math.max(0, Math.min(targetX - hw, MAP_WIDTH - this.viewWidth));
    this.y = floorCenterY - this.viewHeight / 2;
    this._clampY();
    this._apply();
  }

  update(targetX: number, targetY: number, dt: number): void {
    this._currentFloor = this._detectFloor(targetY);

    const hw = this.viewWidth / 2;
    const desiredX = targetX - hw;
    const floorCenterY = (this._currentFloor + 0.5) * FLOOR_H;
    const desiredY = floorCenterY - this.viewHeight / 2;

    const lerp = 1 - Math.pow(1 - CAMERA_LERP, dt * 60);
    this.x += (desiredX - this.x) * lerp;
    // Y 轴楼层切换也用平滑过渡
    this.y += (desiredY - this.y) * lerp;

    this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.viewWidth));
    this._clampY();

    this._time += dt;
    this._trauma = Math.max(0, this._trauma - dt * 1.8);
    const shake = this._trauma * this._trauma;
    this._shakeX = shake * 6 * Math.sin(this._time * 37);
    this._shakeY = shake * 6 * Math.cos(this._time * 43);

    this._apply();
  }

  addTrauma(amount: number): void {
    this._trauma = Math.min(1, this._trauma + amount);
  }

  get offsetX(): number { return -this.x + this._shakeX; }
  get offsetY(): number { return -this.y + this._shakeY; }

  private _detectFloor(py: number): number {
    const floor = Math.floor(py / FLOOR_H);
    return Math.max(0, Math.min(floor, GRID_ROWS - 1));
  }

  private _clampY(): void {
    this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.viewHeight));
  }

  private _apply(): void {
    if (this._mapContainer) {
      this._mapContainer.scale.set(this._zoom, this._zoom);
      this._mapContainer.position.set(
        (-this.x + this._shakeX) * this._zoom,
        (-this.y + this._shakeY) * this._zoom,
      );
    }
  }
}

export const CameraSystem = new CameraSystemClass();
