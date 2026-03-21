/**
 * 横版战斗场景 - 系统性升级版
 * 集成：迷雾探索 + 紧凑视口 + 搜索物件 + 波次系统 + 重设计HUD + 高密度装饰 + 流程优化
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { type Scene, SceneManager } from '@/core/SceneManager';
import { EventBus } from '@/core/EventBus';
import { TILE, MAP_COLS, MAP_ROWS, PLAYER_W, PLAYER_H,
         LOGIC_STEP, TileType, ROOM_INNER_W, ROOM_INNER_H, ROOM_WALL, ROOM_W, ROOM_H,
         GRID_COLS, GRID_ROWS } from '@/config/Constants';
import { MapManager, type MapData, type GridPos, type RoomData } from '@/managers/MapManager';
import { PlayerManager } from '@/managers/PlayerManager';
import { EnemyManager } from '@/managers/EnemyManager';
import { BulletManager } from '@/managers/BulletManager';
import { CombatManager } from '@/managers/CombatManager';
import { DangerManager, WavePhase } from '@/managers/DangerManager';
import { RunManager, RunState } from '@/managers/RunManager';
import { LootManager } from '@/managers/LootManager';
import { SaveManager } from '@/managers/SaveManager';
import { ProgressManager } from '@/managers/ProgressManager';
import { CameraSystem } from '@/systems/CameraSystem';
import { FogSystem } from '@/systems/FogSystem';
import { InputSystem } from '@/systems/InputSystem';
import { VFXSystem } from '@/systems/VFXSystem';
import { SkillSystem } from '@/systems/SkillSystem';
import { Platform } from '@/core/PlatformService';
import { setResultData } from './ResultScene';

// ═══════════════ 配色板 ═══════════════
const C = {
  BG:           0x12121e,
  ROOM_BG:      0x2a2535,
  WALL:         0x554a62,
  WALL_LIGHT:   0x6a5e78,
  WALL_DARK:    0x3a3448,
  BRICK_LINE:   0x4a4458,
  FLOOR:        0x6a5e4a,
  FLOOR_PLANK:  0x7c6e56,
  FLOOR_DARK:   0x544838,
  PLATFORM:     0x6a5a44,
  PLAT_EDGE:    0x8a7a60,
  PLAT_SUPPORT: 0x4a3a28,
  LADDER:       0x6a5a3a,
  LADDER_RUNG:  0x7a6a4a,
  SEARCH:       0xddaa33,
  SEARCH_HV:    0xffcc00,
  EXTRACT:      0x33ff66,
  TORCH_STEM:   0x664422,
  TORCH_FLAME:  0xffaa22,
  TORCH_GLOW:   0xffdd44,
  LIGHT_WARM:   0xffaa44,
  COBWEB:       0x998877,
  CHAIN:        0x888899,
  BARREL:       0x664422,
  CRATE:        0x5a4422,
  BONE:         0xccccaa,
  BOOKSHELF:    0x553322,
  PIPE:         0x556677,
  CRACK:        0x221a14,
  POSTER:       0x885533,
  MOSS:         0x334422,
  DRIP:         0x3366aa,
  RAIL:         0x667788,
};

const T = TILE;

// ═══════════════ 搜索物件类型（根据房间主题映射） ═══════════════
type SearchObjType = 'ammo_crate' | 'locker' | 'safe' | 'toolbox' | 'backpack';
const THEME_SEARCH_MAP: Record<string, SearchObjType> = {
  storage: 'ammo_crate', prison: 'toolbox', library: 'locker', ritual: 'safe', corridor: 'backpack',
};

export class BattleScene implements Scene {
  readonly name = 'battle';
  readonly container = new PIXI.Container();

  private _mapContainer = new PIXI.Container();
  private _entityContainer = new PIXI.Container();
  private _foregroundContainer = new PIXI.Container();
  private _lightingContainer = new PIXI.Container();
  private _hudContainer = new PIXI.Container();
  private _logicAcc = 0;
  private _tickerFn: ((delta: number) => void) | null = null;
  private _paused = false;
  private _prevDangerLevel = 0;
  private _breathT = 0;
  private _mapData: MapData | null = null;

  // HUD 元素
  private _hpBarBg: PIXI.Graphics | null = null;
  private _hpBarFg: PIXI.Graphics | null = null;
  private _hpText: PIXI.Text | null = null;
  private _levelNameText: PIXI.Text | null = null;
  private _timerText: PIXI.Text | null = null;
  private _dangerBadge: PIXI.Container | null = null;
  private _dangerText: PIXI.Text | null = null;
  private _coinText: PIXI.Text | null = null;
  private _ammoText: PIXI.Text | null = null;
  private _searchPrompt: PIXI.Text | null = null;
  private _searchRing: PIXI.Graphics | null = null;
  private _countdownText: PIXI.Text | null = null;
  private _extractBtn: PIXI.Container | null = null;
  private _searchMarkers: Map<string, { gfx: PIXI.Graphics; objType: SearchObjType; searched: boolean; glowT: number }> = new Map();
  private _extractionMarkers: PIXI.Graphics[] = [];
  private _extractPulseT = 0;
  private _minimapGfx: PIXI.Graphics | null = null;
  private _extractArrow: PIXI.Graphics | null = null;
  private _buffContainer: PIXI.Container | null = null;
  private _backpackContainer: PIXI.Container | null = null;
  private _backpackSlots: PIXI.Graphics[] = [];
  private _backpackTexts: PIXI.Text[] = [];
  private _waveText: PIXI.Text | null = null;
  private _prepText: PIXI.Text | null = null;

  // ═══════════════ 场景生命周期 ═══════════════

  onEnter(): void {
    const map = MapManager.generate();
    this._mapData = map;

    this._renderBackground();
    this._renderRoomBackgrounds(map);
    this._renderWalls(map);
    this._renderPlatformsAndLadders(map);
    this._renderDecorations(map);
    this._renderSearchMarkers(map);
    this._renderExtractionPoints(map);

    this._mapContainer.eventMode = 'none';
    this._entityContainer.eventMode = 'none';
    this._foregroundContainer.eventMode = 'none';
    this._lightingContainer.eventMode = 'none';
    this._mapContainer.addChild(this._entityContainer);
    this._mapContainer.addChild(this._foregroundContainer);
    this._renderForeground(map);
    this._mapContainer.addChild(this._lightingContainer);
    this.container.addChild(this._mapContainer);
    this.container.addChild(this._hudContainer);

    CameraSystem.setMapContainer(this._mapContainer);
    CameraSystem.setRooms(map.rooms);
    const spawnX = map.spawnPoint.gx * T + T / 2;
    const spawnY = map.spawnPoint.gy * T + T / 2;

    PlayerManager.reset(spawnX, spawnY);
    const upgradedWeapon = ProgressManager.getUpgradedWeapon(SaveManager.data.selectedWeapon);
    PlayerManager.weapon = upgradedWeapon;
    this._createPlayerSprite();

    EnemyManager.init(this._entityContainer);
    BulletManager.init(this._entityContainer);
    CombatManager.init();
    DangerManager.reset();
    RunManager.reset();
    LootManager.init(this._entityContainer);
    VFXSystem.init(this._entityContainer, this._hudContainer);
    FogSystem.init(this._lightingContainer, map.rooms);
    FogSystem.revealSpawnRoom(spawnX, spawnY);

    this._hudContainer.eventMode = 'passive';
    this.container.eventMode = 'passive';
    InputSystem.init(this._hudContainer);
    SkillSystem.init(this._hudContainer, SaveManager.data.selectedSkill);
    CameraSystem.snapTo(spawnX, spawnY);

    this._createHUD();
    this._createMinimap();
    this._createBuffBar();
    this._createBackpackUI();
    this._bindEvents();

    this._logicAcc = 0;
    this._paused = false;
    this._prevDangerLevel = 0;
    this._extractPulseT = 0;
    this._breathT = 0;

    this._tickerFn = (delta: number) => this._mainLoop(delta);
    Game.ticker.add(this._tickerFn);

    console.log(`[BattleScene] 横版开始: ${map.rooms.length}房间, ${map.searchPoints.length}搜索点`);
  }

  onExit(): void {
    if (this._tickerFn) { Game.ticker.remove(this._tickerFn); this._tickerFn = null; }
    this._unbindEvents();
    InputSystem.destroy();
    VFXSystem.destroy();
    FogSystem.destroy();
    SkillSystem.destroy();
    EnemyManager.destroy();
    BulletManager.destroy();
    CombatManager.destroy();
    LootManager.destroy();
    this._searchMarkers.clear();
    this._extractionMarkers = [];
    this._backpackSlots = [];
    this._backpackTexts = [];
    this._mapContainer.removeChildren();
    this._entityContainer.removeChildren();
    this._foregroundContainer.removeChildren();
    this._lightingContainer.removeChildren();
    this._hudContainer.removeChildren();
    this.container.removeChildren();
    this._mapData = null;
  }

  // ═══════════════ 主循环 ═══════════════

  private _dustTimer = 0;
  private _prevPlayerX = 0;
  private _prevPlayerY = 0;

  private _mainLoop(delta: number): void {
    if (this._paused) return;
    const dt = delta / 60;
    InputSystem.resetFrame();
    InputSystem.pollTouch();

    if (VFXSystem.hitstopFrames > 0) {
      VFXSystem.hitstopFrames--;
    } else {
      this._logicAcc += dt;
      while (this._logicAcc >= LOGIC_STEP) {
        this._logicUpdate(LOGIC_STEP);
        this._logicAcc -= LOGIC_STEP;
      }
    }

    const pdx = PlayerManager.x - this._prevPlayerX;
    const pdy = PlayerManager.y - this._prevPlayerY;
    if (pdx * pdx + pdy * pdy > 4) {
      this._dustTimer += dt;
      if (this._dustTimer > 0.08 && PlayerManager.body.onGround) {
        VFXSystem.spawnMoveDust(PlayerManager.x, PlayerManager.y + PLAYER_H / 2);
        this._dustTimer = 0;
      }
    }
    this._prevPlayerX = PlayerManager.x;
    this._prevPlayerY = PlayerManager.y;

    CameraSystem.update(PlayerManager.x, PlayerManager.y, dt);
    FogSystem.update(dt, PlayerManager.x, PlayerManager.y);
    VFXSystem.update(dt, PlayerManager.x, PlayerManager.y);
    VFXSystem.updatePermaVignette(DangerManager.level);
    LootManager.update(dt);
    SkillSystem.update(dt);
    this._updatePlayerSprite(dt);
    this._updateHUD(dt);
    this._updateMinimap();
    this._updateSearchMarkersAnim(dt);
    this._updateExtractionPulse(dt);
    this._updateExtractArrow();
    this._updateBuffBar();
    this._updateBackpackUI();
  }

  private _logicUpdate(dt: number): void {
    const runState = RunManager.state;
    if (runState === RunState.SUCCESS || runState === RunState.DEAD) return;

    RunManager.update(dt);
    if (runState === RunState.PREP) {
      this._updatePrepUI();
      return;
    }

    const newLevel = DangerManager.level;
    if (newLevel > this._prevDangerLevel) {
      const labels = ['Lv.1 平静', 'Lv.2 警戒', 'Lv.3 危险', 'Lv.4 崩溃'];
      VFXSystem.showDangerWarning(labels[newLevel] || '危险升级');
      CameraSystem.addTrauma(0.3);
      this._prevDangerLevel = newLevel;
    }

    DangerManager.update(dt);

    const inp = InputSystem.input;
    if (PlayerManager.alive && !SkillSystem.isDashing) {
      if (Math.abs(inp.moveX) > 0.3) {
        PlayerManager.moveHorizontal(inp.moveX > 0 ? 1 : -1);
      } else {
        if (PlayerManager.body.onGround) {
          PlayerManager.body.vx *= 0.7;
          if (Math.abs(PlayerManager.body.vx) < 5) PlayerManager.body.vx = 0;
        } else {
          PlayerManager.body.vx *= 0.95;
        }
      }

      if (PlayerManager.body.onLadder && Math.abs(inp.moveY) > 0.3) {
        PlayerManager.climbVertical(inp.moveY > 0 ? 1 : -1);
      } else if (PlayerManager.body.climbing && Math.abs(inp.moveY) < 0.2) {
        PlayerManager.body.vy = 0;
      }
      if (!PlayerManager.body.onLadder) {
        PlayerManager.stopClimb();
      }

    }

    PlayerManager.update(dt);
    EnemyManager.update(dt);
    BulletManager.update(dt);
    CombatManager.update(dt);
  }

  // ═══════════════ 玩家精灵 ═══════════════

  private _createPlayerSprite(): void {
    const gfx = new PIXI.Graphics();
    this._drawPlayer(gfx);
    gfx.position.set(PlayerManager.x, PlayerManager.y);
    gfx.eventMode = 'none';
    this._entityContainer.addChild(gfx);
    PlayerManager.sprite = gfx;
  }

  private _drawPlayer(g: PIXI.Graphics): void {
    const hw = PLAYER_W / 2, hh = PLAYER_H / 2;
    g.clear();
    g.beginFill(0x000000, 0.2);
    g.drawEllipse(0, hh + 2, hw * 0.8, 3);
    g.endFill();
    g.beginFill(0x2288cc);
    g.drawRoundedRect(-hw, -hh, PLAYER_W, PLAYER_H, 4);
    g.endFill();
    g.beginFill(0x33aaee, 0.6);
    g.drawRoundedRect(-hw + 2, -hh + 2, PLAYER_W - 4, 8, 2);
    g.endFill();
    g.beginFill(0x33ccff);
    g.drawCircle(0, -hh + 10, 7);
    g.endFill();
    g.beginFill(0xffffff);
    g.drawCircle(-3, -hh + 9, 2);
    g.drawCircle(3, -hh + 9, 2);
    g.endFill();
    g.beginFill(0x111133);
    g.drawCircle(-2.5, -hh + 9, 1);
    g.drawCircle(3.5, -hh + 9, 1);
    g.endFill();
    g.beginFill(0x224466);
    g.drawRect(-hw, 2, PLAYER_W, 3);
    g.endFill();
    g.beginFill(0x1a6699);
    g.drawRect(-hw + 1, 6, hw - 2, hh - 6);
    g.drawRect(1, 6, hw - 2, hh - 6);
    g.endFill();
  }

  private _updatePlayerSprite(dt: number): void {
    const sprite = PlayerManager.sprite;
    if (!sprite) return;
    sprite.position.set(PlayerManager.x, PlayerManager.y);
    sprite.alpha = PlayerManager.iframeTimer > 0
      ? (Math.floor(PlayerManager.iframeTimer * 10) % 2 === 0 ? 0.3 : 1) : 1;
    sprite.scale.x = PlayerManager.facingRight ? 1 : -1;
    this._breathT += dt * 3;
    sprite.scale.y = 1 + Math.sin(this._breathT) * 0.02;
  }

  // ═══════════════ 地图渲染：总背景 ═══════════════

  private _renderBackground(): void {
    const gfx = new PIXI.Graphics();
    gfx.beginFill(C.BG);
    gfx.drawRect(0, 0, MAP_COLS * T, MAP_ROWS * T);
    gfx.endFill();
    gfx.eventMode = 'none';
    this._mapContainer.addChild(gfx);
  }

  // ═══════════════ 房间背景（后墙） ═══════════════

  private _renderRoomBackgrounds(map: MapData): void {
    const gfx = new PIXI.Graphics();

    for (const room of map.rooms) {
      const x0 = room.ix * T, y0 = room.iy * T;
      const w = ROOM_INNER_W * T, h = ROOM_INNER_H * T;

      gfx.beginFill(C.ROOM_BG);
      gfx.drawRect(x0, y0, w, h);
      gfx.endFill();

      const brickH = 10, brickW = 18;
      for (let by = 0; by < h / brickH; by++) {
        const offset = (by % 2) * (brickW / 2);
        for (let bx = -1; bx < w / brickW + 1; bx++) {
          const px = x0 + bx * brickW + offset;
          const py = y0 + by * brickH;
          if (px >= x0 && px < x0 + w && py >= y0 && py < y0 + h) {
            gfx.lineStyle(1, C.BRICK_LINE, 0.15);
            gfx.drawRect(px, py, brickW, brickH);
            gfx.lineStyle(0);
          }
        }
      }

      const seed = (room.rx * 73 + room.ry * 137) % 100;
      if (seed < 30) {
        const wx = x0 + w * 0.3 + (seed % 5) * 20;
        const wy = y0 + 30;
        gfx.lineStyle(2, 0x334455, 0.3);
        gfx.drawRect(wx, wy, 28, 24);
        gfx.beginFill(0x1a2233, 0.3);
        gfx.drawRect(wx + 2, wy + 2, 24, 20);
        gfx.endFill();
        gfx.lineStyle(1, 0x334455, 0.2);
        gfx.moveTo(wx + 14, wy); gfx.lineTo(wx + 14, wy + 24);
        gfx.moveTo(wx, wy + 12); gfx.lineTo(wx + 28, wy + 12);
        gfx.lineStyle(0);
      }
      if (seed > 60) {
        const px = x0 + w * 0.7;
        gfx.lineStyle(2, 0x445566, 0.2);
        gfx.moveTo(px, y0); gfx.lineTo(px, y0 + h);
        gfx.lineStyle(0);
      }
    }

    gfx.eventMode = 'none';
    this._mapContainer.addChild(gfx);
  }

  // ═══════════════ 墙壁渲染 ═══════════════

  private _renderWalls(map: MapData): void {
    const gfx = new PIXI.Graphics();

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (map.tiles[y][x] !== TileType.WALL) continue;
        const px = x * T, py = y * T;
        const airBelow = y < MAP_ROWS - 1 && map.tiles[y + 1][x] !== TileType.WALL;
        const airAbove = y > 0 && map.tiles[y - 1][x] !== TileType.WALL;
        const airLeft  = x > 0 && map.tiles[y][x - 1] !== TileType.WALL;
        const airRight = x < MAP_COLS - 1 && map.tiles[y][x + 1] !== TileType.WALL;

        if (airBelow) {
          gfx.beginFill(C.WALL_DARK); gfx.drawRect(px, py, T, T); gfx.endFill();
          gfx.beginFill(C.WALL_LIGHT, 0.3); gfx.drawRect(px, py + T - 3, T, 3); gfx.endFill();
        } else if (airAbove) {
          gfx.beginFill(C.FLOOR); gfx.drawRect(px, py, T, T); gfx.endFill();
          gfx.lineStyle(1, C.FLOOR_DARK, 0.3);
          gfx.moveTo(px, py + T / 3); gfx.lineTo(px + T, py + T / 3);
          gfx.moveTo(px, py + T * 2 / 3); gfx.lineTo(px + T, py + T * 2 / 3);
          gfx.lineStyle(0);
          gfx.beginFill(0x000000, 0.15); gfx.drawRect(px, py, T, 2); gfx.endFill();
        } else if (airLeft || airRight) {
          gfx.beginFill(C.WALL); gfx.drawRect(px, py, T, T); gfx.endFill();
          const bh = T / 3;
          for (let i = 0; i < 3; i++) {
            const offset = (i % 2) * (T / 2);
            gfx.lineStyle(1, C.BRICK_LINE, 0.25);
            gfx.moveTo(px, py + i * bh); gfx.lineTo(px + T, py + i * bh);
            gfx.moveTo(px + T / 2 + offset, py + i * bh);
            gfx.lineTo(px + T / 2 + offset, py + (i + 1) * bh);
            gfx.lineStyle(0);
          }
          if (airLeft) { gfx.beginFill(0x000000, 0.1); gfx.drawRect(px, py, 3, T); gfx.endFill(); }
          if (airRight) { gfx.beginFill(0x000000, 0.1); gfx.drawRect(px + T - 3, py, 3, T); gfx.endFill(); }
        } else {
          gfx.beginFill(C.WALL_DARK); gfx.drawRect(px, py, T, T); gfx.endFill();
        }
      }
    }

    gfx.eventMode = 'none';
    this._mapContainer.addChild(gfx);
  }

  // ═══════════════ 平台和梯子 ═══════════════

  private _renderPlatformsAndLadders(map: MapData): void {
    const gfx = new PIXI.Graphics();
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const tile = map.tiles[y][x];
        const px = x * T, py = y * T;
        if (tile === TileType.PLATFORM) {
          gfx.beginFill(C.PLATFORM); gfx.drawRect(px, py, T, 6); gfx.endFill();
          gfx.beginFill(C.PLAT_EDGE); gfx.drawRect(px, py, T, 2); gfx.endFill();
          gfx.lineStyle(1, C.FLOOR_DARK, 0.2);
          gfx.moveTo(px + 4, py + 1); gfx.lineTo(px + T - 4, py + 1);
          gfx.lineStyle(0);
          const isLeftEdge = x === 0 || map.tiles[y][x - 1] !== TileType.PLATFORM;
          const isRightEdge = x >= MAP_COLS - 1 || map.tiles[y][x + 1] !== TileType.PLATFORM;
          if (isLeftEdge) { gfx.beginFill(C.PLAT_SUPPORT, 0.6); gfx.drawRect(px + 2, py + 6, 3, T - 6); gfx.endFill(); }
          if (isRightEdge) { gfx.beginFill(C.PLAT_SUPPORT, 0.6); gfx.drawRect(px + T - 5, py + 6, 3, T - 6); gfx.endFill(); }
        }
        if (tile === TileType.LADDER) {
          gfx.beginFill(C.LADDER, 0.8);
          gfx.drawRect(px + 6, py, 3, T);
          gfx.drawRect(px + T - 9, py, 3, T);
          gfx.endFill();
          gfx.beginFill(C.LADDER_RUNG);
          gfx.drawRect(px + 6, py + 4, T - 12, 2);
          gfx.drawRect(px + 6, py + T / 2, T - 12, 2);
          gfx.drawRect(px + 6, py + T - 6, T - 12, 2);
          gfx.endFill();
        }
      }
    }
    gfx.eventMode = 'none';
    this._mapContainer.addChild(gfx);
  }

  // ═══════════════ 装饰物（高密度版） ═══════════════

  private _renderDecorations(map: MapData): void {
    const gfx = new PIXI.Graphics();
    const rng = (a: number, b: number) => ((a * 73 + b * 137 + 42) * 2654435761 >>> 0) / 4294967296;

    for (const room of map.rooms) {
      const x0 = room.ix * T, y0 = room.iy * T;
      const w = ROOM_INNER_W * T, h = ROOM_INNER_H * T;

      // 火把（每房间 2-3 个）
      const torchCount = 2 + Math.floor(rng(room.rx + 5, room.ry + 3) * 2);
      for (let i = 0; i < torchCount; i++) {
        const wallSide = i % 2;
        const tx = wallSide === 0 ? x0 + 6 : x0 + w - 10;
        const ty = y0 + 20 + Math.floor(rng(room.rx + i * 7, room.ry + i * 11) * (h * 0.5));
        gfx.beginFill(C.TORCH_STEM); gfx.drawRect(tx, ty, 4, 12); gfx.endFill();
        gfx.beginFill(C.TORCH_FLAME, 0.9);
        gfx.moveTo(tx + 2, ty - 6); gfx.lineTo(tx + 6, ty + 2); gfx.lineTo(tx - 2, ty + 2); gfx.closePath();
        gfx.endFill();
        for (let r = 3; r >= 1; r--) {
          gfx.beginFill(C.TORCH_GLOW, 0.03 * r);
          gfx.drawCircle(tx + 2, ty, T * r * 0.8);
          gfx.endFill();
        }
      }

      // 地面物件（4-7 个 - 高密度）
      const objCount = 4 + Math.floor(rng(room.rx + 1, room.ry + 1) * 4);
      for (let i = 0; i < objCount; i++) {
        const ox = x0 + 16 + Math.floor(rng(room.rx + i * 3, room.ry + i * 5) * (w - 32));
        let oy = y0 + h - 2 * T;
        for (let yy = room.iy; yy < room.iy + ROOM_INNER_H; yy++) {
          const gxCheck = Math.floor(ox / T);
          if (gxCheck >= 0 && gxCheck < MAP_COLS && yy >= 0 && yy < MAP_ROWS) {
            if (map.tiles[yy][gxCheck] === TileType.WALL || map.tiles[yy][gxCheck] === TileType.PLATFORM) {
              oy = yy * T; break;
            }
          }
        }
        const type = Math.floor(rng(room.rx + i * 11, room.ry + i * 13) * 8);

        if (type === 0) {
          // 木桶
          gfx.beginFill(C.BARREL, 0.8); gfx.drawEllipse(ox, oy - 8, 8, 10); gfx.endFill();
          gfx.lineStyle(1, 0x443311, 0.5); gfx.drawEllipse(ox, oy - 8, 8, 10);
          gfx.moveTo(ox - 7, oy - 12); gfx.lineTo(ox + 7, oy - 12);
          gfx.moveTo(ox - 7, oy - 4); gfx.lineTo(ox + 7, oy - 4); gfx.lineStyle(0);
        } else if (type === 1) {
          // 木箱
          gfx.beginFill(C.CRATE, 0.8); gfx.drawRect(ox - 7, oy - 14, 14, 14); gfx.endFill();
          gfx.lineStyle(1, 0x443311, 0.4); gfx.drawRect(ox - 7, oy - 14, 14, 14);
          gfx.moveTo(ox - 7, oy - 14); gfx.lineTo(ox + 7, oy);
          gfx.moveTo(ox + 7, oy - 14); gfx.lineTo(ox - 7, oy); gfx.lineStyle(0);
        } else if (type === 2) {
          // 书架
          gfx.beginFill(C.BOOKSHELF, 0.7); gfx.drawRect(ox - 10, oy - 28, 20, 28); gfx.endFill();
          for (let s = 0; s < 3; s++) {
            gfx.beginFill(0x442211, 0.5); gfx.drawRect(ox - 9, oy - 26 + s * 9, 18, 1); gfx.endFill();
            const bColors = [0x993333, 0x339933, 0x333399, 0x996633, 0x669999];
            for (let b = 0; b < 3; b++) {
              gfx.beginFill(bColors[(room.rx + s + b) % bColors.length], 0.6);
              gfx.drawRect(ox - 8 + b * 6, oy - 25 + s * 9, 5, 7); gfx.endFill();
            }
          }
        } else if (type === 3) {
          // 骨头
          gfx.lineStyle(2, C.BONE, 0.4);
          gfx.moveTo(ox - 5, oy - 3); gfx.lineTo(ox + 4, oy - 1); gfx.lineStyle(0);
          gfx.beginFill(C.BONE, 0.3); gfx.drawCircle(ox - 5, oy - 3, 1.5); gfx.drawCircle(ox + 4, oy - 1, 1.5); gfx.endFill();
        } else if (type === 4) {
          // 锁链
          const chainY = y0 + 4;
          gfx.lineStyle(1, C.CHAIN, 0.3);
          for (let cy = chainY; cy < chainY + 40; cy += 6) gfx.drawEllipse(ox, cy, 2, 3);
          gfx.lineStyle(0);
        } else if (type === 5) {
          // 碎石堆
          gfx.beginFill(C.WALL, 0.5);
          for (let j = 0; j < 4; j++) {
            const rx2 = (rng(room.rx + i + j, room.ry + j) - 0.5) * 14;
            const rs = 2 + rng(i + j, room.ry) * 3;
            gfx.drawCircle(ox + rx2, oy - rs, rs);
          }
          gfx.endFill();
        } else if (type === 6) {
          // 倒塌架子
          gfx.beginFill(C.BOOKSHELF, 0.4);
          gfx.drawRect(ox - 12, oy - 4, 24, 4);
          gfx.endFill();
          gfx.lineStyle(1, 0x443311, 0.3);
          gfx.drawRect(ox - 12, oy - 4, 24, 4);
          gfx.lineStyle(0);
        } else {
          // 水渍/苔藓
          gfx.beginFill(C.MOSS, 0.25);
          gfx.drawEllipse(ox, oy - 1, 8 + rng(i, room.rx) * 6, 2);
          gfx.endFill();
        }
      }

      // 墙面装饰（2-3 种）
      const wallDecCount = 2 + Math.floor(rng(room.rx + 10, room.ry + 10) * 2);
      for (let i = 0; i < wallDecCount; i++) {
        const wdx = x0 + 30 + Math.floor(rng(room.rx + i * 17, room.ry + i * 23) * (w - 60));
        const wdy = y0 + 10 + Math.floor(rng(room.rx + i * 31, room.ry + i * 37) * (h * 0.35));
        const wtype = Math.floor(rng(room.rx + i * 41, room.ry + i * 43) * 4);

        if (wtype === 0) {
          // 墙面裂缝
          gfx.lineStyle(1, C.CRACK, 0.4);
          gfx.moveTo(wdx, wdy);
          gfx.lineTo(wdx + 8, wdy + 12);
          gfx.lineTo(wdx + 3, wdy + 20);
          gfx.moveTo(wdx + 8, wdy + 12);
          gfx.lineTo(wdx + 15, wdy + 16);
          gfx.lineStyle(0);
        } else if (wtype === 1) {
          // 水平管道
          gfx.lineStyle(3, C.PIPE, 0.3);
          gfx.moveTo(wdx - 20, wdy); gfx.lineTo(wdx + 20, wdy);
          gfx.lineStyle(0);
          // 接头
          gfx.beginFill(C.PIPE, 0.4);
          gfx.drawRect(wdx - 3, wdy - 3, 6, 6);
          gfx.endFill();
        } else if (wtype === 2) {
          // 告示牌/海报
          gfx.beginFill(C.POSTER, 0.3);
          gfx.drawRect(wdx - 8, wdy - 6, 16, 12);
          gfx.endFill();
          gfx.lineStyle(1, 0x443322, 0.25);
          gfx.drawRect(wdx - 8, wdy - 6, 16, 12);
          gfx.lineStyle(0);
          // 模拟文字线
          for (let l = 0; l < 3; l++) {
            gfx.beginFill(0x443322, 0.2);
            gfx.drawRect(wdx - 5, wdy - 3 + l * 3, 10, 1);
            gfx.endFill();
          }
        } else {
          // 血迹飞溅
          gfx.beginFill(0x661111, 0.25);
          for (let s = 0; s < 3; s++) {
            const sx = wdx + (rng(i + s, room.rx + s) - 0.5) * 16;
            const sy = wdy + (rng(i + s + 1, room.ry + s) - 0.5) * 12;
            gfx.drawCircle(sx, sy, 1.5 + rng(s, i) * 2);
          }
          gfx.endFill();
        }
      }

      // 天花板装饰（1-2 种）
      if (rng(room.rx + 20, room.ry + 20) > 0.3) {
        const cx = x0 + w * 0.3 + rng(room.rx + 30, room.ry) * w * 0.4;
        // 吊灯
        gfx.lineStyle(1, C.CHAIN, 0.3);
        gfx.moveTo(cx, y0); gfx.lineTo(cx, y0 + 18);
        gfx.lineStyle(0);
        gfx.beginFill(C.TORCH_GLOW, 0.15);
        gfx.drawCircle(cx, y0 + 22, 8);
        gfx.endFill();
        gfx.beginFill(C.TORCH_FLAME, 0.4);
        gfx.drawCircle(cx, y0 + 20, 3);
        gfx.endFill();
      }

      // 蜘蛛网（角落）
      if (rng(room.rx + 2, room.ry + 2) > 0.4) {
        const wx = x0 + 2, wy = y0 + 2;
        gfx.lineStyle(1, C.COBWEB, 0.2);
        gfx.moveTo(wx, wy); gfx.lineTo(wx + 25, wy);
        gfx.moveTo(wx, wy); gfx.lineTo(wx, wy + 25);
        gfx.moveTo(wx, wy); gfx.lineTo(wx + 18, wy + 18);
        gfx.moveTo(wx + 5, wy + 5); gfx.lineTo(wx + 20, wy + 5);
        gfx.moveTo(wx + 5, wy + 5); gfx.lineTo(wx + 5, wy + 20);
        gfx.lineStyle(0);
      }
      // 右上角蜘蛛网
      if (rng(room.rx + 3, room.ry + 3) > 0.6) {
        const wx = x0 + w - 2, wy = y0 + 2;
        gfx.lineStyle(1, C.COBWEB, 0.15);
        gfx.moveTo(wx, wy); gfx.lineTo(wx - 22, wy);
        gfx.moveTo(wx, wy); gfx.lineTo(wx, wy + 22);
        gfx.moveTo(wx, wy); gfx.lineTo(wx - 16, wy + 16);
        gfx.lineStyle(0);
      }
    }

    gfx.eventMode = 'none';
    this._mapContainer.addChild(gfx);
  }

  // ═══════════════ 前景层（在实体之上，半透明） ═══════════════

  private _renderForeground(map: MapData): void {
    const gfx = new PIXI.Graphics();
    const rng = (a: number, b: number) => ((a * 73 + b * 137 + 42) * 2654435761 >>> 0) / 4294967296;

    for (const room of map.rooms) {
      const x0 = room.ix * T, y0 = room.iy * T;
      const w = ROOM_INNER_W * T, h = ROOM_INNER_H * T;

      // 前景铁栏杆（部分房间）
      if (rng(room.rx + 50, room.ry + 50) > 0.6) {
        const railY = y0 + h - 2 * T - 20;
        const railStartX = x0 + 20;
        const railEndX = x0 + w * 0.4;
        gfx.lineStyle(2, C.RAIL, 0.15);
        gfx.moveTo(railStartX, railY);
        gfx.lineTo(railEndX, railY);
        gfx.lineStyle(0);
        for (let rx2 = railStartX; rx2 < railEndX; rx2 += 12) {
          gfx.beginFill(C.RAIL, 0.12);
          gfx.drawRect(rx2, railY, 2, 20);
          gfx.endFill();
        }
      }

      // 前景碎石/灰尘（漂浮感）
      const dustCount = 2 + Math.floor(rng(room.rx + 60, room.ry + 60) * 3);
      for (let i = 0; i < dustCount; i++) {
        const dx = x0 + rng(room.rx + i * 71, room.ry + i * 83) * w;
        const dy = y0 + rng(room.rx + i * 97, room.ry + i * 101) * h;
        gfx.beginFill(0xaaaacc, 0.06 + rng(i, room.rx) * 0.04);
        gfx.drawCircle(dx, dy, 1 + rng(i + 1, room.ry) * 1.5);
        gfx.endFill();
      }
    }

    gfx.eventMode = 'none';
    this._foregroundContainer.addChild(gfx);
  }

  // ═══════════════ 搜索点标记（具象物件版） ═══════════════

  private _renderSearchMarkers(map: MapData): void {
    for (const sp of map.searchPoints) {
      const room = map.rooms.find(r =>
        sp.pos.gx >= r.ix && sp.pos.gx < r.ix + ROOM_INNER_W &&
        sp.pos.gy >= r.iy && sp.pos.gy < r.iy + ROOM_INNER_H,
      );
      const objType = room ? (THEME_SEARCH_MAP[room.theme] || 'ammo_crate') : 'ammo_crate';

      const g = new PIXI.Graphics();
      this._drawSearchObject(g, objType, sp.isHighValue, false);
      g.position.set(sp.pos.gx * T, sp.pos.gy * T);
      g.eventMode = 'none';
      this._mapContainer.addChild(g);
      this._searchMarkers.set(`${sp.pos.gx},${sp.pos.gy}`, { gfx: g, objType, searched: false, glowT: Math.random() * 6 });
    }
  }

  private _drawSearchObject(g: PIXI.Graphics, type: SearchObjType, hv: boolean, opened: boolean): void {
    g.clear();
    const cx = T / 2, cy = T / 2;

    if (opened) {
      // 已搜索：灰化 + 打开状态
      g.beginFill(0x444444, 0.4);
      g.drawRect(cx - 10, cy - 6, 20, 12);
      g.endFill();
      g.lineStyle(1, 0x555555, 0.3);
      g.drawRect(cx - 10, cy - 6, 20, 12);
      // 翻开的盖子
      g.drawRect(cx - 10, cy - 10, 20, 4);
      g.lineStyle(0);
      return;
    }

    const baseColor = hv ? 0xffcc00 : 0xddaa33;
    const darkColor = hv ? 0xaa8800 : 0x886622;

    switch (type) {
      case 'ammo_crate':
        // 军绿弹药箱
        g.beginFill(0x445533, 0.9); g.drawRect(cx - 10, cy - 8, 20, 16); g.endFill();
        g.lineStyle(1, 0x334422, 0.6); g.drawRect(cx - 10, cy - 8, 20, 16); g.lineStyle(0);
        g.beginFill(0x667744, 0.5); g.drawRect(cx - 8, cy - 6, 16, 2); g.endFill();
        g.beginFill(baseColor, 0.7);
        g.moveTo(cx - 3, cy - 3); g.lineTo(cx + 3, cy - 3); g.lineTo(cx + 3, cy + 3);
        g.lineTo(cx - 3, cy + 3); g.closePath();
        g.endFill();
        g.beginFill(baseColor, 0.7);
        g.drawRect(cx - 1, cy - 5, 2, 4);
        g.drawRect(cx - 5, cy - 1, 4, 2);
        g.endFill();
        break;
      case 'locker':
        // 高柜子
        g.beginFill(0x555566, 0.9); g.drawRect(cx - 8, cy - 12, 16, 24); g.endFill();
        g.lineStyle(1, 0x444455, 0.5); g.drawRect(cx - 8, cy - 12, 16, 24); g.lineStyle(0);
        g.beginFill(baseColor, 0.6); g.drawCircle(cx + 4, cy, 2); g.endFill();
        break;
      case 'safe':
        // 保险箱
        g.beginFill(0x555555, 0.9); g.drawRoundedRect(cx - 9, cy - 8, 18, 16, 2); g.endFill();
        g.lineStyle(1, 0x444444, 0.6); g.drawRoundedRect(cx - 9, cy - 8, 18, 16, 2); g.lineStyle(0);
        g.lineStyle(2, baseColor, 0.7); g.drawCircle(cx, cy, 5); g.lineStyle(0);
        g.beginFill(baseColor, 0.5); g.drawCircle(cx + 6, cy - 2, 1.5); g.endFill();
        break;
      case 'toolbox':
        // 工具箱
        g.beginFill(0x994433, 0.9); g.drawRect(cx - 10, cy - 6, 20, 12); g.endFill();
        g.lineStyle(1, 0x773322, 0.5); g.drawRect(cx - 10, cy - 6, 20, 12); g.lineStyle(0);
        g.beginFill(darkColor, 0.7); g.drawRect(cx - 4, cy - 9, 8, 3); g.endFill();
        g.beginFill(baseColor, 0.6); g.drawRect(cx - 2, cy - 2, 4, 4); g.endFill();
        break;
      case 'backpack':
        // 军绿背包
        g.beginFill(0x556633, 0.9); g.drawRoundedRect(cx - 8, cy - 10, 16, 20, 3); g.endFill();
        g.lineStyle(1, 0x445522, 0.5); g.drawRoundedRect(cx - 8, cy - 10, 16, 20, 3); g.lineStyle(0);
        g.beginFill(baseColor, 0.5); g.drawRect(cx - 4, cy - 4, 8, 2); g.endFill();
        g.beginFill(0x445522, 0.6); g.drawRect(cx - 6, cy + 2, 12, 6); g.endFill();
        break;
    }
  }

  /** 每帧更新搜索点动画（靠近时发光） */
  private _updateSearchMarkersAnim(dt: number): void {
    const map = this._mapData;
    if (!map) return;

    for (const sp of map.searchPoints) {
      const key = `${sp.pos.gx},${sp.pos.gy}`;
      const marker = this._searchMarkers.get(key);
      if (!marker) continue;

      if (sp.searched && !marker.searched) {
        marker.searched = true;
        this._drawSearchObject(marker.gfx, marker.objType, sp.isHighValue, true);
        continue;
      }
      if (marker.searched) continue;

      marker.glowT += dt;
      const sx = sp.pos.gx * T + T / 2, sy = sp.pos.gy * T + T / 2;
      const dx = PlayerManager.x - sx, dy = PlayerManager.y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy) / T;

      // 靠近时的发光闪烁
      if (dist < 3) {
        const pulse = 0.7 + Math.sin(marker.glowT * 4) * 0.3;
        marker.gfx.alpha = pulse;
      } else {
        // 远处微弱闪烁
        marker.gfx.alpha = 0.6 + Math.sin(marker.glowT * 1.5) * 0.15;
      }
    }
  }

  // ═══════════════ 撤离点 ═══════════════

  private _renderExtractionPoints(map: MapData): void {
    for (const ep of map.extractionPoints) {
      const g = new PIXI.Graphics();
      g.eventMode = 'none';
      g.position.set(ep.gx * T + T / 2, ep.gy * T + T / 2);
      this._mapContainer.addChild(g);
      this._extractionMarkers.push(g);
    }
  }

  private _updateExtractionPulse(dt: number): void {
    this._extractPulseT += dt;
    const pulse = (Math.sin(this._extractPulseT * 3) + 1) / 2;
    for (const g of this._extractionMarkers) {
      g.clear();
      const r1 = T * 1.2, r2 = r1 + pulse * 10;
      g.lineStyle(2, C.EXTRACT, 0.3 + pulse * 0.3); g.drawCircle(0, 0, r2);
      g.lineStyle(2, C.EXTRACT, 0.8); g.drawCircle(0, 0, r1);
      g.beginFill(C.EXTRACT, 0.1 + pulse * 0.05); g.drawCircle(0, 0, r1); g.endFill();
      g.lineStyle(2, C.EXTRACT, 0.9);
      g.moveTo(-8, 0); g.lineTo(8, 0);
      g.moveTo(0, -8); g.lineTo(0, 8);
    }
  }

  // ═══════════════ HUD（重设计版） ═══════════════

  private _createHUD(): void {
    const topY = Game.safeTop + 8;

    // ── 顶部信息栏 ──

    // 关卡名 + 计时器（居中）
    const tplName = MapManager.template?.name || '未知区域';
    this._levelNameText = new PIXI.Text(tplName, {
      fontSize: 18, fill: 0xcccccc, fontFamily: 'Arial', fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 3,
    });
    this._levelNameText.anchor.set(0.5, 0);
    this._levelNameText.position.set(Game.logicWidth / 2, topY);
    this._levelNameText.eventMode = 'none';
    this._hudContainer.addChild(this._levelNameText);

    this._timerText = new PIXI.Text('00:00', {
      fontSize: 14, fill: 0x999999, fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 2,
    });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(Game.logicWidth / 2, topY + 22);
    this._timerText.eventMode = 'none';
    this._hudContainer.addChild(this._timerText);

    // 血条（左上）
    this._hpBarBg = new PIXI.Graphics();
    this._hpBarBg.beginFill(0x000000, 0.7);
    this._hpBarBg.drawRoundedRect(16, topY + 44, 160, 14, 5);
    this._hpBarBg.endFill();
    this._hpBarBg.lineStyle(1, 0x555555, 0.4);
    this._hpBarBg.drawRoundedRect(16, topY + 44, 160, 14, 5);
    this._hpBarBg.eventMode = 'none';
    this._hudContainer.addChild(this._hpBarBg);

    this._hpBarFg = new PIXI.Graphics();
    this._hpBarFg.eventMode = 'none';
    this._hudContainer.addChild(this._hpBarFg);

    this._hpText = new PIXI.Text('100', { fontSize: 11, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold' });
    this._hpText.anchor.set(0.5, 0.5);
    this._hpText.position.set(96, topY + 51);
    this._hpText.eventMode = 'none';
    this._hudContainer.addChild(this._hpText);

    // 危险等级徽章（居中，名称下方）
    this._dangerBadge = new PIXI.Container();
    this._dangerBadge.position.set(Game.logicWidth / 2, topY + 40);
    this._dangerBadge.eventMode = 'none';
    this._hudContainer.addChild(this._dangerBadge);
    const badgeBg = new PIXI.Graphics();
    badgeBg.beginFill(0x881111, 0.7);
    badgeBg.drawRoundedRect(-40, -10, 80, 20, 10);
    badgeBg.endFill();
    this._dangerBadge.addChild(badgeBg);
    this._dangerText = new PIXI.Text('Lv.1', { fontSize: 13, fill: 0xff4444, fontFamily: 'Arial', fontWeight: 'bold' });
    this._dangerText.anchor.set(0.5);
    this._dangerBadge.addChild(this._dangerText);

    // 金币（右上）
    this._coinText = new PIXI.Text('$0', { fontSize: 20, fill: 0xffdd44, fontWeight: 'bold', fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 3 });
    this._coinText.anchor.set(1, 0);
    this._coinText.position.set(Game.logicWidth - 16, topY);
    this._coinText.eventMode = 'none';
    this._hudContainer.addChild(this._coinText);

    // 弹药（右侧中部）
    this._ammoText = new PIXI.Text('', { fontSize: 14, fill: 0xcccccc, fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 2 });
    this._ammoText.anchor.set(1, 0);
    this._ammoText.position.set(Game.logicWidth - 16, topY + 24);
    this._ammoText.eventMode = 'none';
    this._hudContainer.addChild(this._ammoText);

    // ── 中央搜索/倒计时 ──

    this._searchPrompt = new PIXI.Text('', {
      fontSize: 20, fill: 0xffdd44, fontFamily: 'Arial', fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 3,
    });
    this._searchPrompt.anchor.set(0.5);
    this._searchPrompt.position.set(Game.logicWidth / 2, Game.logicHeight * 0.35);
    this._searchPrompt.visible = false;
    this._searchPrompt.eventMode = 'none';
    this._hudContainer.addChild(this._searchPrompt);

    this._searchRing = new PIXI.Graphics();
    this._searchRing.visible = false;
    this._searchRing.eventMode = 'none';
    this._hudContainer.addChild(this._searchRing);

    this._countdownText = new PIXI.Text('', {
      fontSize: 64, fill: 0x33ff66, fontWeight: 'bold', fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 4,
    });
    this._countdownText.anchor.set(0.5);
    this._countdownText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.3);
    this._countdownText.visible = false;
    this._countdownText.eventMode = 'none';
    this._hudContainer.addChild(this._countdownText);

    // 波次预告文字
    this._waveText = new PIXI.Text('', {
      fontSize: 32, fill: 0xff4444, fontWeight: 'bold', fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 4,
    });
    this._waveText.anchor.set(0.5);
    this._waveText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.22);
    this._waveText.visible = false;
    this._waveText.eventMode = 'none';
    this._hudContainer.addChild(this._waveText);

    // 准备阶段倒计时
    this._prepText = new PIXI.Text('', {
      fontSize: 72, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'Arial',
      stroke: 0x000000, strokeThickness: 5,
    });
    this._prepText.anchor.set(0.5);
    this._prepText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.4);
    this._prepText.visible = false;
    this._prepText.eventMode = 'none';
    this._hudContainer.addChild(this._prepText);

    // ── 底部操作栏 ──

    // 撤离按钮（右下角，更大更醒目）
    this._extractBtn = new PIXI.Container();
    const btnBg = new PIXI.Graphics();
    btnBg.beginFill(0x33dd66, 0.9);
    btnBg.drawRoundedRect(-55, -22, 110, 44, 10);
    btnBg.endFill();
    btnBg.lineStyle(2, 0x22aa44, 0.8);
    btnBg.drawRoundedRect(-55, -22, 110, 44, 10);
    this._extractBtn.addChild(btnBg);
    const btnText = new PIXI.Text('紧急撤离', { fontSize: 20, fill: 0x000000, fontWeight: 'bold', fontFamily: 'Arial' });
    btnText.anchor.set(0.5);
    this._extractBtn.addChild(btnText);
    this._extractBtn.position.set(Game.logicWidth - 80, Game.logicHeight - 220);
    this._extractBtn.eventMode = 'static';
    this._extractBtn.on('pointerdown', () => {
      RunManager.startExtraction();
      Platform.vibrateLong();
    });
    this._extractBtn.visible = false;
    this._hudContainer.addChild(this._extractBtn);

    this._extractArrow = new PIXI.Graphics();
    this._extractArrow.visible = false;
    this._extractArrow.eventMode = 'none';
    this._hudContainer.addChild(this._extractArrow);
  }

  private _updatePrepUI(): void {
    if (!this._prepText) return;
    const t = Math.ceil(RunManager.prepTimer);
    if (t > 0) {
      this._prepText.visible = true;
      this._prepText.text = `${t}`;
      this._prepText.scale.set(1 + (RunManager.prepTimer % 1) * 0.3);
      this._prepText.alpha = 0.5 + (RunManager.prepTimer % 1) * 0.5;
    } else {
      this._prepText.text = '开始!';
      this._prepText.alpha = Math.max(0, this._prepText.alpha - 0.05);
      if (this._prepText.alpha <= 0) this._prepText.visible = false;
    }
  }

  private _updateHUD(dt: number): void {
    const topY = Game.safeTop + 8;

    // HP
    if (this._hpBarFg && this._hpText) {
      const ratio = Math.max(0, PlayerManager.hp / PlayerManager.maxHp);
      const barW = 156 * ratio;
      const hpColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa44 : 0xff4444;
      this._hpBarFg.clear();
      this._hpBarFg.beginFill(hpColor);
      this._hpBarFg.drawRoundedRect(18, topY + 46, barW, 10, 3);
      this._hpBarFg.endFill();
      this._hpText.text = `${Math.ceil(PlayerManager.hp)}/${PlayerManager.maxHp}`;
    }

    // 计时器
    if (this._timerText) {
      this._timerText.text = RunManager.formattedTime;
    }

    // 危险等级
    if (this._dangerText) {
      const level = DangerManager.level;
      const labels = ['血月 Lv.1', '血月 Lv.2', '血月 Lv.3', '血月 Lv.4'];
      const colors = [0xff6644, 0xff4444, 0xff2222, 0xff0000];
      this._dangerText.text = labels[level] || labels[0];
      (this._dangerText.style as PIXI.TextStyle).fill = colors[level] || colors[0];
    }

    // 金币
    if (this._coinText) {
      const t = `$${RunManager.totalCoins}`;
      if (this._coinText.text !== t) { this._coinText.text = t; this._coinText.scale.set(1.3); }
      if (this._coinText.scale.x > 1) this._coinText.scale.set(Math.max(1, this._coinText.scale.x - dt * 3));
    }

    // 弹药
    if (this._ammoText && PlayerManager.weapon) {
      this._ammoText.text = `${PlayerManager.weapon.name}`;
    }

    // 波次 UI
    if (this._waveText) {
      const phase = DangerManager.phase;
      if (phase === WavePhase.PREVIEW) {
        this._waveText.visible = true;
        this._waveText.text = `第${DangerManager.waveNum}波  ×${DangerManager.waveEnemiesTotal}`;
        (this._waveText.style as PIXI.TextStyle).fill = 0xff4444;
        const pulse = 0.8 + Math.sin(this._breathT * 5) * 0.2;
        this._waveText.alpha = pulse;
      } else if (phase === WavePhase.CLEAR) {
        this._waveText.visible = true;
        this._waveText.text = 'WAVE CLEAR!';
        (this._waveText.style as PIXI.TextStyle).fill = 0x44ff44;
        this._waveText.alpha = 1;
      } else {
        if (this._waveText.visible) {
          this._waveText.alpha -= dt * 2;
          if (this._waveText.alpha <= 0) this._waveText.visible = false;
        }
      }
    }

    // 搜索提示
    if (this._searchPrompt && this._searchRing) {
      if (PlayerManager.searchTarget && PlayerManager.searchProgress > 0) {
        this._searchPrompt.text = '搜索中...';
        this._searchPrompt.visible = true;
        const progress = PlayerManager.searchProgress / PlayerManager.effectiveSearchDuration;
        const cx = Game.logicWidth / 2, cy = Game.logicHeight * 0.40, r = 26;
        this._searchRing.visible = true;
        this._searchRing.clear();
        this._searchRing.lineStyle(5, 0x333333, 0.6);
        this._searchRing.drawCircle(cx, cy, r);
        this._searchRing.lineStyle(5, 0xffdd44, 1);
        this._searchRing.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      } else {
        const map = MapManager.map;
        let nearSearch = false;
        if (map) {
          for (const sp of map.searchPoints) {
            if (sp.searched) continue;
            const sx = sp.pos.gx * T + T / 2, sy = sp.pos.gy * T + T / 2;
            const d = Math.sqrt((PlayerManager.x - sx) ** 2 + (PlayerManager.y - sy) ** 2) / T;
            if (d <= 2) { nearSearch = true; break; }
          }
        }
        this._searchPrompt.visible = nearSearch;
        if (nearSearch) this._searchPrompt.text = '靠近自动搜索';
        this._searchRing.visible = false;
      }
    }

    // 撤离倒计时
    if (this._countdownText) {
      if (RunManager.state === RunState.EXTRACTING) {
        this._countdownText.visible = true;
        this._countdownText.text = `${Math.ceil(RunManager.extractionCountdown)}`;
      } else {
        this._countdownText.visible = false;
      }
    }

    // PREP 阶段隐藏倒计时后显示 "开始!" 然后淡出
    if (RunManager.state !== RunState.PREP && this._prepText && this._prepText.visible) {
      this._prepText.alpha -= dt * 3;
      if (this._prepText.alpha <= 0) this._prepText.visible = false;
    }
  }

  private _updateExtractArrow(): void {
    if (!this._extractArrow || !RunManager.extractionActive || !RunManager.extractionPos) {
      if (this._extractArrow) this._extractArrow.visible = false;
      return;
    }
    const ep = RunManager.extractionPos;
    const epx = ep.gx * T + T / 2, epy = ep.gy * T + T / 2;
    const sx = (epx - CameraSystem.x) * CameraSystem.zoom;
    const sy = (epy - CameraSystem.y) * CameraSystem.zoom;
    const margin = 50;
    if (sx > margin && sx < Game.logicWidth - margin && sy > margin && sy < Game.logicHeight - margin) {
      this._extractArrow.visible = false;
      return;
    }
    const dx = epx - PlayerManager.x, dy = epy - PlayerManager.y;
    const angle = Math.atan2(dy, dx);
    const cx = Game.logicWidth / 2, cy = Game.logicHeight / 2;
    const ax = cx + Math.cos(angle) * (cx - 60);
    const ay = cy + Math.sin(angle) * (cy - 60);
    this._extractArrow.visible = true;
    this._extractArrow.clear();
    this._extractArrow.beginFill(C.EXTRACT, 0.8);
    this._extractArrow.moveTo(ax + Math.cos(angle) * 14, ay + Math.sin(angle) * 14);
    this._extractArrow.lineTo(ax + Math.cos(angle + 2.5) * 12, ay + Math.sin(angle + 2.5) * 12);
    this._extractArrow.lineTo(ax + Math.cos(angle - 2.5) * 12, ay + Math.sin(angle - 2.5) * 12);
    this._extractArrow.closePath();
    this._extractArrow.endFill();
  }

  // ═══════════════ Buff 图标行 ═══════════════

  private _createBuffBar(): void {
    this._buffContainer = new PIXI.Container();
    this._buffContainer.position.set(16, Game.safeTop + 66);
    this._buffContainer.eventMode = 'none';
    this._hudContainer.addChild(this._buffContainer);
  }

  private _updateBuffBar(): void {
    if (!this._buffContainer) return;
    this._buffContainer.removeChildren();
    let x = 0;
    for (const ab of PlayerManager.activeBuffs) {
      const g = new PIXI.Graphics();
      g.beginFill(ab.def.color, 0.7);
      g.drawRoundedRect(0, 0, 22, 22, 4);
      g.endFill();
      if (ab.stacks > 1) {
        const st = new PIXI.Text(`${ab.stacks}`, { fontSize: 12, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold' });
        st.anchor.set(1, 1); st.position.set(20, 22);
        g.addChild(st);
      }
      g.position.set(x, 0);
      this._buffContainer.addChild(g);
      x += 26;
    }
  }

  // ═══════════════ 背包 UI ═══════════════

  private _createBackpackUI(): void {
    this._backpackContainer = new PIXI.Container();
    const slotSize = 28;
    const startX = 16;
    const startY = Game.logicHeight - 70;
    this._backpackContainer.position.set(startX, startY);
    this._backpackContainer.eventMode = 'none';
    this._backpackSlots = [];
    this._backpackTexts = [];

    // 背包图标标签
    const label = new PIXI.Text('背包', { fontSize: 12, fill: 0x888888, fontFamily: 'Arial' });
    label.anchor.set(0, 1);
    label.position.set(0, -4);
    this._backpackContainer.addChild(label);

    for (let i = 0; i < 8; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const g = new PIXI.Graphics();
      g.beginFill(0x222233, 0.6);
      g.drawRoundedRect(col * (slotSize + 3), row * (slotSize + 3), slotSize, slotSize, 4);
      g.endFill();
      this._backpackContainer.addChild(g);
      this._backpackSlots.push(g);
      const txt = new PIXI.Text('', { fontSize: 10, fill: 0xffffff, fontFamily: 'Arial' });
      txt.anchor.set(0.5);
      txt.position.set(col * (slotSize + 3) + slotSize / 2, row * (slotSize + 3) + slotSize / 2);
      this._backpackContainer.addChild(txt);
      this._backpackTexts.push(txt);
    }
    this._hudContainer.addChild(this._backpackContainer);
  }

  private _updateBackpackUI(): void {
    if (!this._backpackContainer) return;
    const colorMap: Record<string, number> = { coin: 0xffdd44, material: 0xaa88ff, weapon_shard: 0x44aaff, key: 0xff8844 };
    const labelMap: Record<string, string> = { material: '石', weapon_shard: '碎', key: '钥' };
    for (let i = 0; i < 8; i++) {
      const slot = PlayerManager.backpack[i];
      const g = this._backpackSlots[i];
      const txt = this._backpackTexts[i];
      g.clear();
      const cx = (i % 4) * 31, cy = Math.floor(i / 4) * 31;
      if (slot) {
        g.beginFill(colorMap[slot.type] || 0x444466, 0.4);
        g.drawRoundedRect(cx, cy, 28, 28, 4);
        g.endFill();
        txt.text = `${labelMap[slot.type] || ''}${slot.count}`;
      } else {
        g.beginFill(0x222233, 0.4);
        g.drawRoundedRect(cx, cy, 28, 28, 4);
        g.endFill();
        txt.text = '';
      }
    }
  }

  // ═══════════════ 小地图（房间为单位） ═══════════════

  private _createMinimap(): void {
    this._minimapGfx = new PIXI.Graphics();
    this._minimapGfx.eventMode = 'none';
    this._minimapGfx.position.set(Game.logicWidth - 100, Game.safeTop + 64);
    this._hudContainer.addChild(this._minimapGfx);
  }

  private _updateMinimap(): void {
    if (!this._minimapGfx) return;
    const map = MapManager.map;
    if (!map) return;

    const mmW = 84, rowH = 14, gap = 3;
    const mmH = GRID_ROWS * rowH + (GRID_ROWS - 1) * gap;

    this._minimapGfx.clear();
    this._minimapGfx.beginFill(0x000000, 0.7);
    this._minimapGfx.drawRoundedRect(-3, -3, mmW + 6, mmH + 6, 4);
    this._minimapGfx.endFill();

    // 楼层制：每层一个横条
    const curFloor = FogSystem.currentFloor;
    for (let ry = 0; ry < GRID_ROWS; ry++) {
      const barY = ry * (rowH + gap);
      const visited = FogSystem.visitedFloors.has(ry);
      const isCurrent = ry === curFloor;

      if (isCurrent) {
        this._minimapGfx.beginFill(0x556688, 0.9);
      } else if (visited) {
        this._minimapGfx.beginFill(0x333344, 0.6);
      } else {
        this._minimapGfx.beginFill(0x111122, 0.4);
      }
      this._minimapGfx.drawRoundedRect(0, barY, mmW, rowH, 3);
      this._minimapGfx.endFill();

      // 当前楼层显示玩家 X 位置
      if (isCurrent) {
        const floorW = GRID_COLS * ROOM_W * T;
        const ratio = Math.max(0, Math.min(PlayerManager.x / floorW, 1));
        this._minimapGfx.beginFill(0x33ccff);
        this._minimapGfx.drawCircle(ratio * mmW, barY + rowH / 2, 3);
        this._minimapGfx.endFill();
      }
    }
  }

  // ═══════════════ 事件 ═══════════════

  private _onPlayerDead = (): void => {
    RunManager.state = RunState.DEAD;
    this._paused = true;
    this._goToResult(false);
  };
  private _onRunSuccess = (_coins: number): void => {
    this._paused = true;
    this._goToResult(true);
  };
  private _onSearchComplete = (pos: GridPos, _amount: number, _hv: boolean): void => {
    const key = `${pos.gx},${pos.gy}`;
    const marker = this._searchMarkers.get(key);
    if (marker) {
      marker.searched = true;
      this._drawSearchObject(marker.gfx, marker.objType, _hv, true);
    }
    VFXSystem.showCoinPickup(pos.gx * T + T / 2, pos.gy * T, _amount);
  };
  private _onExtractionAvailable = (_pos: GridPos): void => {
    if (this._extractBtn) this._extractBtn.visible = true;
    VFXSystem.showDangerWarning('撤离点已激活!');
  };
  private _onLootBuff = (_x: number, _y: number): void => {
    PlayerManager.gainRandomBuff();
  };
  private _onBackpackFull = (): void => {
    VFXSystem.showDangerWarning('背包已满!');
  };
  private _onWavePreview = (_waveNum: number, _count: number): void => {
    CameraSystem.addTrauma(0.15);
  };
  private _onWaveClear = (_waveNum: number): void => {
    // 波次清场时的轻微震动
  };

  private _bindEvents(): void {
    EventBus.on('player:dead', this._onPlayerDead);
    EventBus.on('run:success', this._onRunSuccess);
    EventBus.on('search:complete', this._onSearchComplete);
    EventBus.on('run:extractionAvailable', this._onExtractionAvailable);
    EventBus.on('loot:buff', this._onLootBuff);
    EventBus.on('backpack:full', this._onBackpackFull);
    EventBus.on('wave:preview', this._onWavePreview);
    EventBus.on('wave:clear', this._onWaveClear);
  }
  private _unbindEvents(): void {
    EventBus.off('player:dead', this._onPlayerDead);
    EventBus.off('run:success', this._onRunSuccess);
    EventBus.off('search:complete', this._onSearchComplete);
    EventBus.off('run:extractionAvailable', this._onExtractionAvailable);
    EventBus.off('loot:buff', this._onLootBuff);
    EventBus.off('backpack:full', this._onBackpackFull);
    EventBus.off('wave:preview', this._onWavePreview);
    EventBus.off('wave:clear', this._onWaveClear);
  }

  private _goToResult(success: boolean): void {
    setResultData({
      success,
      coins: RunManager.totalCoins,
      shards: RunManager.totalShards + PlayerManager.getItemCount('weapon_shard'),
      stones: RunManager.totalStones + PlayerManager.getItemCount('material'),
      keys: RunManager.totalKeys + PlayerManager.getItemCount('key'),
      kills: RunManager.totalKills,
      survivalTime: DangerManager.elapsed,
      searchedCount: RunManager.searchedCount,
    });
    setTimeout(() => SceneManager.switchTo('result'), 1500);
  }
}
