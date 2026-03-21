/**
 * A* 寻路系统 - 网格寻路 + 节点上限 + 并发控制
 */
import { MapManager } from '@/managers/MapManager';
import { MAP_COLS, MAP_ROWS, TILE } from '@/config/Constants';

interface PathNode {
  x: number; y: number;
  g: number; h: number; f: number;
  parent: PathNode | null;
}

const MAX_SEARCH_NODES = 200;
const MAX_CONCURRENT = 5;
const REPATH_INTERVAL = 0.5;

interface PathRequest {
  id: number;
  startX: number; startY: number;
  endX: number; endY: number;
  callback: (path: { x: number; y: number }[] | null) => void;
  timer: number;
}

class PathfindingSystemClass {
  private _requests: Map<number, PathRequest> = new Map();
  private _nextId = 0;

  /** 注册一个需要持续寻路的实体，返回 ID */
  register(
    startX: number, startY: number,
    endX: number, endY: number,
    callback: (path: { x: number; y: number }[] | null) => void,
  ): number {
    const id = this._nextId++;
    this._requests.set(id, {
      id, startX, startY, endX, endY, callback,
      timer: REPATH_INTERVAL,
    });
    return id;
  }

  unregister(id: number): void {
    this._requests.delete(id);
  }

  /** 更新实体位置 */
  updatePosition(id: number, sx: number, sy: number, ex: number, ey: number): void {
    const req = this._requests.get(id);
    if (req) { req.startX = sx; req.startY = sy; req.endX = ex; req.endY = ey; }
  }

  update(dt: number): void {
    let computed = 0;
    for (const req of this._requests.values()) {
      req.timer -= dt;
      if (req.timer <= 0 && computed < MAX_CONCURRENT) {
        req.timer = REPATH_INTERVAL;
        const path = this._findPath(
          Math.floor(req.startX / TILE),
          Math.floor(req.startY / TILE),
          Math.floor(req.endX / TILE),
          Math.floor(req.endY / TILE),
        );
        req.callback(path);
        computed++;
      }
    }
  }

  /** A* 核心 */
  private _findPath(sx: number, sy: number, ex: number, ey: number): { x: number; y: number }[] | null {
    const map = MapManager.map;
    if (!map) return null;
    if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
    if (sx < 0 || sx >= MAP_COLS || sy < 0 || sy >= MAP_ROWS) return null;
    if (ex < 0 || ex >= MAP_COLS || ey < 0 || ey >= MAP_ROWS) return null;
    if (MapManager.isSolid(ex, ey)) return null;

    const open: PathNode[] = [];
    const closed = new Set<number>();
    const key = (x: number, y: number) => y * MAP_COLS + x;

    const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);
    const start: PathNode = { x: sx, y: sy, g: 0, h: h(sx, sy), f: h(sx, sy), parent: null };
    open.push(start);

    let searched = 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (open.length > 0 && searched < MAX_SEARCH_NODES) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const ck = key(current.x, current.y);
      if (closed.has(ck)) continue;
      closed.add(ck);
      searched++;

      if (current.x === ex && current.y === ey) {
        return this._reconstructPath(current);
      }

      for (const [ddx, ddy] of dirs) {
        const nx = current.x + ddx, ny = current.y + ddy;
        if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
        if (MapManager.isSolid(nx, ny)) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;

        const ng = current.g + 1;
        const nh = h(nx, ny);
        open.push({ x: nx, y: ny, g: ng, h: nh, f: ng + nh, parent: current });
      }
    }

    return null;
  }

  private _reconstructPath(node: PathNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: PathNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  destroy(): void {
    this._requests.clear();
  }
}

export const PathfindingSystem = new PathfindingSystemClass();
