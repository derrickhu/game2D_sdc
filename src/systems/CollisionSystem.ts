/**
 * 横版碰撞系统 - AABB vs 瓦片碰撞、重力、单向平台、梯子
 */
import { TILE, MAP_COLS, MAP_ROWS, TileType, GRAVITY, MAX_FALL } from '@/config/Constants';
import { MapManager } from '@/managers/MapManager';

export interface PhysicsBody {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  onGround: boolean;
  onLadder: boolean;
  /** 是否正在主动攀爬梯子 */
  climbing: boolean;
}

export class CollisionSystem {
  /** 对物理体施加重力并处理碰撞，返回是否触地 */
  static updateBody(body: PhysicsBody, dt: number): void {
    const map = MapManager.map;
    if (!map) return;

    // 梯子检测 - 检测身体中心、脚底、头顶三个点，任意一个在梯子上即可
    const cx = Math.floor((body.x + body.w / 2) / TILE);
    const headGy = Math.floor(body.y / TILE);
    const centerGy = Math.floor((body.y + body.h / 2) / TILE);
    const feetGy = Math.floor((body.y + body.h - 1) / TILE);
    body.onLadder = MapManager.isLadder(cx, centerGy)
      || MapManager.isLadder(cx, feetGy)
      || MapManager.isLadder(cx, headGy);

    // 攀爬状态下完全忽略重力
    if (body.climbing && body.onLadder) {
      // 不施加重力，vy 由 climbVertical 控制
    } else if (body.climbing && !body.onLadder) {
      // 离开梯子 → 解除攀爬，恢复重力
      body.climbing = false;
      body.vy += GRAVITY * dt;
      if (body.vy > MAX_FALL) body.vy = MAX_FALL;
    } else {
      body.vy += GRAVITY * dt;
      if (body.vy > MAX_FALL) body.vy = MAX_FALL;
    }

    // X 轴移动
    if (body.vx !== 0) {
      body.x += body.vx * dt;
      this._resolveX(body, map.tiles);
    }

    // Y 轴移动
    body.onGround = false;
    if (body.vy !== 0 || body.climbing) {
      body.y += body.vy * dt;
      this._resolveY(body, map.tiles);
    } else {
      // 检测是否仍在地面上
      body.onGround = this._checkGround(body, map.tiles);
      if (!body.onGround && !body.climbing) {
        // 开始下落
        body.vy = 1;
      }
    }
  }

  /** 检测点是否在实体tile内 */
  static pointSolid(px: number, py: number): boolean {
    return MapManager.isSolid(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  /** 检测 AABB 是否与实体tile重叠（子弹碰墙用） */
  static collides(px: number, py: number, radius: number): boolean {
    const gxMin = Math.floor((px - radius) / TILE);
    const gxMax = Math.floor((px + radius) / TILE);
    const gyMin = Math.floor((py - radius) / TILE);
    const gyMax = Math.floor((py + radius) / TILE);
    for (let gy = gyMin; gy <= gyMax; gy++) {
      for (let gx = gxMin; gx <= gxMax; gx++) {
        if (MapManager.isSolid(gx, gy)) return true;
      }
    }
    return false;
  }

  /** 射线检测（简化的 Bresenham） */
  static lineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    const map = MapManager.map;
    if (!map) return false;
    const gx0 = Math.floor(ax / TILE), gy0 = Math.floor(ay / TILE);
    const gx1 = Math.floor(bx / TILE), gy1 = Math.floor(by / TILE);
    let x = gx0, y = gy0;
    const dx = Math.abs(gx1 - gx0), dy = Math.abs(gy1 - gy0);
    const sx = gx0 < gx1 ? 1 : -1, sy = gy0 < gy1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (MapManager.isSolid(x, y)) return false;
      if (x === gx1 && y === gy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return true;
  }

  // ═══════════════ X 轴碰撞解算 ═══════════════

  private static _resolveX(body: PhysicsBody, tiles: number[][]): void {
    const left = body.x, right = body.x + body.w;
    const top = body.y + 2, bottom = body.y + body.h - 2;
    const gyMin = Math.floor(top / TILE), gyMax = Math.floor(bottom / TILE);

    if (body.vx > 0) {
      const gx = Math.floor(right / TILE);
      for (let gy = gyMin; gy <= gyMax; gy++) {
        if (this._tileBlocks(tiles, gx, gy)) {
          body.x = gx * TILE - body.w;
          body.vx = 0;
          return;
        }
      }
    } else if (body.vx < 0) {
      const gx = Math.floor(left / TILE);
      for (let gy = gyMin; gy <= gyMax; gy++) {
        if (this._tileBlocks(tiles, gx, gy)) {
          body.x = (gx + 1) * TILE;
          body.vx = 0;
          return;
        }
      }
    }
  }

  // ═══════════════ Y 轴碰撞解算（含单向平台） ═══════════════

  private static _resolveY(body: PhysicsBody, tiles: number[][]): void {
    const left = body.x + 2, right = body.x + body.w - 2;
    const gxMin = Math.floor(left / TILE), gxMax = Math.floor(right / TILE);

    if (body.vy >= 0) {
      // 下落/站立 → 检测脚底
      const footY = body.y + body.h;
      const gy = Math.floor(footY / TILE);
      for (let gx = gxMin; gx <= gxMax; gx++) {
        // 实体墙壁
        if (this._tileBlocks(tiles, gx, gy)) {
          body.y = gy * TILE - body.h;
          body.vy = 0;
          body.onGround = true;
          return;
        }
        // 单向平台（只有下落时才碰撞，且上一帧脚底在平台上方）
        if (this._tilePlatform(tiles, gx, gy) && !body.climbing) {
          const platTop = gy * TILE;
          if (footY >= platTop && footY <= platTop + body.vy * 0.1 + 8) {
            body.y = platTop - body.h;
            body.vy = 0;
            body.onGround = true;
            return;
          }
        }
      }
    } else {
      // 上跳 → 检测头顶
      const headY = body.y;
      const gy = Math.floor(headY / TILE);
      for (let gx = gxMin; gx <= gxMax; gx++) {
        if (this._tileBlocks(tiles, gx, gy)) {
          body.y = (gy + 1) * TILE;
          body.vy = 0;
          return;
        }
      }
    }
  }

  private static _checkGround(body: PhysicsBody, tiles: number[][]): boolean {
    const left = body.x + 2, right = body.x + body.w - 2;
    const footY = body.y + body.h + 1;
    const gy = Math.floor(footY / TILE);
    const gxMin = Math.floor(left / TILE), gxMax = Math.floor(right / TILE);
    for (let gx = gxMin; gx <= gxMax; gx++) {
      if (this._tileBlocks(tiles, gx, gy) || this._tilePlatform(tiles, gx, gy)) return true;
    }
    return false;
  }

  private static _tileBlocks(tiles: number[][], gx: number, gy: number): boolean {
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return true;
    return tiles[gy][gx] === TileType.WALL;
  }

  private static _tilePlatform(tiles: number[][], gx: number, gy: number): boolean {
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return false;
    return tiles[gy][gx] === TileType.PLATFORM;
  }

  /** 兼容旧接口 */
  static moveWithSlide(x: number, y: number, dx: number, dy: number, _radius: number): { x: number; y: number } {
    const nx = x + dx, ny = y + dy;
    if (!this.collides(nx, ny, 8)) return { x: nx, y: ny };
    if (dx !== 0 && !this.collides(x + dx, y, 8)) return { x: x + dx, y };
    if (dy !== 0 && !this.collides(x, y + dy, 8)) return { x, y: y + dy };
    return { x, y };
  }
}
