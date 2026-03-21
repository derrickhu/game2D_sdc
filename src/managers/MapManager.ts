/**
 * 楼层制地图管理器
 * 每行 = 一个楼层，同层房间水平直通，楼层间梯子连接，房间内部扁平
 */
import { TileType, TILE, ROOM_INNER_W, ROOM_INNER_H, ROOM_WALL, ROOM_W, ROOM_H,
         GRID_COLS, GRID_ROWS, MAP_COLS, MAP_ROWS } from '@/config/Constants';
import { MAP_TEMPLATES, DEFAULT_MAP, type MapTemplate } from '@/config/MapTemplates';
import { SaveManager } from './SaveManager';

export interface GridPos { gx: number; gy: number; }
export interface RoomData {
  rx: number; ry: number;
  /** 房间左上角(含墙)的 tile 坐标 */
  ox: number; oy: number;
  /** 内部起始坐标 */
  ix: number; iy: number;
  center: GridPos;
  distToSpawn: number;
  theme: 'storage' | 'prison' | 'library' | 'ritual' | 'corridor';
}
export interface SearchPointData { pos: GridPos; isHighValue: boolean; searched: boolean; }
export interface MapData {
  width: number; height: number;
  tiles: number[][];
  rooms: RoomData[];
  spawnPoint: GridPos;
  extractionPoints: GridPos[];
  searchPoints: SearchPointData[];
  enemySpawnPoints: GridPos[];
}

const THEMES: RoomData['theme'][] = ['storage', 'prison', 'library', 'ritual', 'corridor'];

class MapManagerClass {
  private _map: MapData | null = null;
  private _template: MapTemplate = MAP_TEMPLATES[DEFAULT_MAP];
  get map(): MapData | null { return this._map; }
  get template(): MapTemplate { return this._template; }

  generate(): MapData {
    const tplId = SaveManager.data?.selectedMap || DEFAULT_MAP;
    this._template = MAP_TEMPLATES[tplId] || MAP_TEMPLATES[DEFAULT_MAP];

    const tiles = this._fill(MAP_COLS, MAP_ROWS, TileType.WALL);
    const rooms: RoomData[] = [];

    // 1. 创建房间：内部全部挖空为 AIR，保留底部 2 行地板
    for (let ry = 0; ry < GRID_ROWS; ry++) {
      for (let rx = 0; rx < GRID_COLS; rx++) {
        const ox = rx * ROOM_W;
        const oy = ry * ROOM_H;
        const ix = ox + ROOM_WALL;
        const iy = oy + ROOM_WALL;
        const room: RoomData = {
          rx, ry, ox, oy, ix, iy,
          center: { gx: ix + Math.floor(ROOM_INNER_W / 2), gy: iy + Math.floor(ROOM_INNER_H / 2) },
          distToSpawn: 0,
          theme: THEMES[Math.floor(Math.random() * THEMES.length)],
        };
        rooms.push(room);
        // 扁平房间：除底部 2 行地板外全部为 AIR
        for (let y = iy; y < iy + ROOM_INNER_H - 2; y++) {
          for (let x = ix; x < ix + ROOM_INNER_W; x++) {
            tiles[y][x] = TileType.AIR;
          }
        }
      }
    }

    // 2. 同层房间全部水平连通
    for (let ry = 0; ry < GRID_ROWS; ry++) {
      for (let rx = 0; rx < GRID_COLS - 1; rx++) {
        const left = rooms.find(r => r.rx === rx && r.ry === ry)!;
        const right = rooms.find(r => r.rx === rx + 1 && r.ry === ry)!;
        this._carveHorizontalDoor(tiles, left, right);
      }
    }

    // 3. 楼层间梯子：每对相邻楼层 1~2 个
    for (let ry = 0; ry < GRID_ROWS - 1; ry++) {
      const ladderCount = 1 + Math.floor(Math.random() * 2);
      const usedRx = new Set<number>();
      for (let i = 0; i < ladderCount; i++) {
        let rx = Math.floor(Math.random() * GRID_COLS);
        while (usedRx.has(rx) && usedRx.size < GRID_COLS) rx = Math.floor(Math.random() * GRID_COLS);
        usedRx.add(rx);
        const top = rooms.find(r => r.rx === rx && r.ry === ry)!;
        const bot = rooms.find(r => r.rx === rx && r.ry === ry + 1)!;
        this._carveVerticalPassage(tiles, top, bot);
      }
    }

    // 4. 放置功能点
    const spawnRoom = rooms.find(r => r.rx === 1 && r.ry === GRID_ROWS - 1)
      || rooms[Math.floor(rooms.length / 2)];
    const floorStandY = (room: RoomData) => room.iy + ROOM_INNER_H - 3;
    const spawnPoint: GridPos = { gx: spawnRoom.ix + Math.floor(ROOM_INNER_W / 2), gy: floorStandY(spawnRoom) };

    for (const room of rooms) {
      room.distToSpawn = Math.abs(room.rx - spawnRoom.rx) + Math.abs(room.ry - spawnRoom.ry);
    }

    // 撤离点 — 最远房间
    const sortedByDist = [...rooms].sort((a, b) => b.distToSpawn - a.distToSpawn);
    const extractionPoints: GridPos[] = [];
    for (let i = 0; i < Math.min(2, sortedByDist.length); i++) {
      if (sortedByDist[i].distToSpawn >= 2) {
        extractionPoints.push({ gx: sortedByDist[i].ix + Math.floor(ROOM_INNER_W / 2), gy: floorStandY(sortedByDist[i]) });
      }
    }
    if (extractionPoints.length === 0) {
      extractionPoints.push({ gx: sortedByDist[0].ix + Math.floor(ROOM_INNER_W / 2), gy: floorStandY(sortedByDist[0]) });
    }

    // 搜索点 — 每个非出生房间 1~2 个，直接放地板上
    const searchPoints: SearchPointData[] = [];
    for (const room of rooms) {
      if (room === spawnRoom) continue;
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const gx = room.ix + 2 + Math.floor(Math.random() * (ROOM_INNER_W - 4));
        const gy = floorStandY(room);
        searchPoints.push({ pos: { gx, gy }, isHighValue: room.distToSpawn >= 3 && i === 0, searched: false });
      }
    }

    // 怪物刷新点
    const enemySpawnPoints: GridPos[] = [];
    for (const room of rooms) {
      if (room.distToSpawn < 1) continue;
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const gx = room.ix + 2 + Math.floor(Math.random() * (ROOM_INNER_W - 4));
        const gy = floorStandY(room);
        enemySpawnPoints.push({ gx, gy });
      }
    }

    this._map = { width: MAP_COLS, height: MAP_ROWS, tiles, rooms, spawnPoint, extractionPoints, searchPoints, enemySpawnPoints };
    return this._map;
  }

  // ═══════════════ 开门 ═══════════════

  private _carveHorizontalDoor(tiles: number[][], left: RoomData, right: RoomData): void {
    const a = left.rx < right.rx ? left : right;
    // 门贴着地板，高度 5 格
    const floorY = a.iy + ROOM_INNER_H - 2;
    const doorTop = floorY - 5;
    const wallX = a.ix + ROOM_INNER_W;
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < ROOM_WALL * 2; dx++) {
        const x = wallX + dx, y = doorTop + dy;
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
          tiles[y][x] = TileType.AIR;
        }
      }
    }
  }

  private _carveVerticalPassage(tiles: number[][], top: RoomData, bot: RoomData): void {
    const a = top.ry < bot.ry ? top : bot;
    const b = top.ry < bot.ry ? bot : top;
    const ladderX = a.ix + 3 + Math.floor(Math.random() * (ROOM_INNER_W - 6));

    // 梯子必须从上层地板一直延伸到下层地板，否则玩家够不到
    const topStart = a.iy + ROOM_INNER_H - 3; // 上层地板上方 1 格
    const botEnd = b.iy + ROOM_INNER_H - 3;   // 下层地板上方 1 格
    for (let y = topStart; y <= botEnd; y++) {
      if (y >= 0 && y < MAP_ROWS) {
        tiles[y][ladderX] = TileType.LADDER;
        tiles[y][ladderX + 1] = TileType.LADDER;
      }
    }
  }

  // ═══════════════ 工具 ═══════════════

  private _fill(cols: number, rows: number, val: number): number[][] {
    return Array.from({ length: rows }, () => Array(cols).fill(val));
  }

  isSolid(gx: number, gy: number): boolean {
    if (!this._map) return true;
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return true;
    return this._map.tiles[gy][gx] === TileType.WALL;
  }

  isPlatform(gx: number, gy: number): boolean {
    if (!this._map) return false;
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return false;
    return this._map.tiles[gy][gx] === TileType.PLATFORM;
  }

  isLadder(gx: number, gy: number): boolean {
    if (!this._map) return false;
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return false;
    return this._map.tiles[gy][gx] === TileType.LADDER;
  }
}

export const MapManager = new MapManagerClass();
