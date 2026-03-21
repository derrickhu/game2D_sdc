/**
 * 楼层制迷雾系统
 * 当前楼层全亮，已探索楼层半暗，未探索楼层深暗
 * 无玩家灯光
 */
import * as PIXI from 'pixi.js';
import { TILE, ROOM_W, ROOM_H, GRID_COLS, GRID_ROWS,
         FOG_REVEAL_DURATION, FOG_EXPLORED_ALPHA } from '@/config/Constants';
import { type RoomData } from '@/managers/MapManager';

class FogSystemClass {
  private _fogGfx: PIXI.Graphics | null = null;
  private _visitedFloors = new Set<number>();
  private _currentFloor = -1;
  private _revealTimers = new Map<number, number>();
  private _rooms: RoomData[] = [];

  get currentRoomIdx(): number {
    // 兼容旧接口：返回当前楼层中间房间的索引
    if (this._currentFloor < 0) return -1;
    const midRx = Math.floor(GRID_COLS / 2);
    return this._rooms.findIndex(r => r.rx === midRx && r.ry === this._currentFloor);
  }
  get visitedRooms(): ReadonlySet<number> {
    // 兼容旧接口：返回所有已探索楼层的房间索引
    const set = new Set<number>();
    for (const floor of this._visitedFloors) {
      for (let i = 0; i < this._rooms.length; i++) {
        if (this._rooms[i].ry === floor) set.add(i);
      }
    }
    return set;
  }
  get currentFloor(): number { return this._currentFloor; }
  get visitedFloors(): ReadonlySet<number> { return this._visitedFloors; }

  init(lightingContainer: PIXI.Container, rooms: RoomData[]): void {
    this._rooms = rooms;
    this._visitedFloors.clear();
    this._revealTimers.clear();
    this._currentFloor = -1;

    this._fogGfx = new PIXI.Graphics();
    this._fogGfx.eventMode = 'none';
    lightingContainer.addChild(this._fogGfx);
  }

  revealSpawnRoom(px: number, py: number): void {
    const floor = this._detectFloor(py);
    if (floor >= 0) {
      this._visitedFloors.add(floor);
      this._revealTimers.set(floor, 1);
      this._currentFloor = floor;
    }
    this._renderFog();
  }

  update(dt: number, _playerX: number, playerY: number): void {
    const newFloor = this._detectFloor(playerY);
    if (newFloor >= 0 && newFloor !== this._currentFloor) {
      this._currentFloor = newFloor;
      if (!this._visitedFloors.has(newFloor)) {
        this._visitedFloors.add(newFloor);
        this._revealTimers.set(newFloor, 0);
      }
    }

    for (const [floor, t] of this._revealTimers) {
      if (t < 1) {
        this._revealTimers.set(floor, Math.min(1, t + dt / FOG_REVEAL_DURATION));
      }
    }

    this._renderFog();
  }

  private _detectFloor(py: number): number {
    const floor = Math.floor(py / (ROOM_H * TILE));
    if (floor < 0 || floor >= GRID_ROWS) return -1;
    return floor;
  }

  private _renderFog(): void {
    const g = this._fogGfx;
    if (!g) return;
    g.clear();

    const roomW = ROOM_W * TILE;
    const roomH = ROOM_H * TILE;

    for (let i = 0; i < this._rooms.length; i++) {
      const room = this._rooms[i];
      const floor = room.ry;

      if (floor === this._currentFloor) continue; // 当前楼层全亮

      const rx = room.ox * TILE;
      const ry = room.oy * TILE;

      let alpha: number;
      if (this._visitedFloors.has(floor)) {
        const t = this._revealTimers.get(floor) ?? 1;
        alpha = t < 1 ? (1 - t) * 0.5 + FOG_EXPLORED_ALPHA : FOG_EXPLORED_ALPHA;
      } else {
        alpha = 0.85;
      }

      g.beginFill(0x050510, alpha);
      g.drawRect(rx, ry, roomW, roomH);
      g.endFill();
    }
  }

  destroy(): void {
    if (this._fogGfx) { this._fogGfx.destroy(); this._fogGfx = null; }
    this._visitedFloors.clear();
    this._revealTimers.clear();
    this._rooms = [];
  }
}

export const FogSystem = new FogSystemClass();
