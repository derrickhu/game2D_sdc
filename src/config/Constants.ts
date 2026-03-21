/** 全局常量 - 三国轻搜打撤（横版，设计坐标基于 designWidth=750） */

// ═══════════════ 网格 ═══════════════
export const TILE = 32;

// ═══════════════ 房间 ═══════════════
export const ROOM_INNER_W = 22;
export const ROOM_INNER_H = 16;
export const ROOM_WALL = 2;
export const ROOM_W = ROOM_INNER_W + ROOM_WALL * 2;
export const ROOM_H = ROOM_INNER_H + ROOM_WALL * 2;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const MAP_COLS = GRID_COLS * ROOM_W;
export const MAP_ROWS = GRID_ROWS * ROOM_H;
export const MAP_WIDTH = MAP_COLS * TILE;
export const MAP_HEIGHT = MAP_ROWS * TILE;

// ═══════════════ Tile 类型 ═══════════════
export const enum TileType {
  AIR = 0,
  WALL = 1,
  PLATFORM = 2,
  LADDER = 3,
  SEARCH_POINT = 4,
  SPAWN_POINT = 5,
  EXTRACTION_POINT = 6,
  ENEMY_SPAWN = 7,
}

// ═══════════════ 物理 ═══════════════
export const GRAVITY = 680;
export const MAX_FALL = 500;
export const PLAYER_W = 20;
export const PLAYER_H = 36;

// ═══════════════ 玩家基础（武将覆盖） ═══════════════
export const BASE_PLAYER_SPEED = 180;
export const PLAYER_HP = 100;
export const PLAYER_IFRAMES = 0.5;
export const KNOCKBACK_DIST = 40;

// ═══════════════ 搜索/拾取 ═══════════════
export const SEARCH_TRIGGER_DIST = 1.5;
export const SEARCH_CANCEL_DIST = 2.5;
export const SEARCH_DURATION = 1.5;
export const PICKUP_RANGE = 1.2;

// ═══════════════ 撤离 ═══════════════
export const EXTRACTION_SIZE = 3;
/** 撤离读条秒数（5~8 秒） */
export const EXTRACTION_COUNTDOWN = 6;
/** 第一个撤离点出现的时间 (秒) */
export const EXTRACTION_APPEAR_TIME = 45;

// ═══════════════ 相机 ═══════════════
export const CAMERA_LERP = 0.1;

// ═══════════════ 逻辑帧 ═══════════════
export const LOGIC_FPS = 30;
export const LOGIC_STEP = 1 / LOGIC_FPS;

// ═══════════════ 自动攻击 ═══════════════
export const AIM_LOCK_COOLDOWN = 0.2;

// ═══════════════ 摇杆 ═══════════════
export const JOYSTICK_RADIUS = 60;
export const JOYSTICK_DEADZONE = 0.15;
export const JOYSTICK_KNOB_RADIUS = 20;

// ═══════════════ 迷雾探索 ═══════════════
export const FOG_REVEAL_DURATION = 0.4;
export const FOG_EXPLORED_ALPHA = 0.45;
export const FOG_PLAYER_LIGHT_RADIUS = 6;
export const FOG_ROOM_DIM_ALPHA = 0.12;

// ═══════════════ 波次系统 ═══════════════
export const WAVE_PREVIEW_DURATION = 3;
export const WAVE_REST_DURATION = 5;
export const WAVE_SEARCH_EXTRA_COUNT = 2;

// ═══════════════ 投射物 ═══════════════
export const PROJECTILE_POOL_SIZE = 30;

// ═══════════════ 资源类型 ═══════════════
export type ResourceType =
  | 'copper'       // 铜钱（通用货币）
  | 'grain'        // 粮秣
  | 'wood'         // 木材
  | 'iron'         // 铁料
  | 'exp_book'     // 经验书（武将升级）
  | 'soul'         // 将魂（武将升星）
  | 'class_scroll' // 职业残卷（职业专精）
  | 'seal';        // 将印（高价值稀有）

// ═══════════════ 兼容旧引用 ═══════════════
export const TILE_SIZE = TILE;
export const PLAYER_RADIUS = 14;
export const FOG_VIEW_RADIUS = 6;
export const BULLET_RADIUS = 4;
export const BULLET_SPEED = 8;
export const BULLET_POOL_SIZE = PROJECTILE_POOL_SIZE;
export const PLAYER_SPEED = BASE_PLAYER_SPEED;
export const PLAYER_SPEED_LOADED = 130;
