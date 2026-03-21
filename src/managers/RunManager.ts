/**
 * 三国单局状态机 - 准备 → 搜索 → 撤离 → 结算
 */
import { EXTRACTION_APPEAR_TIME, EXTRACTION_COUNTDOWN, EXTRACTION_SIZE,
         TILE, SEARCH_TRIGGER_DIST, SEARCH_CANCEL_DIST, type ResourceType } from '@/config/Constants';
import { SEARCH_TYPE_LOOT } from '@/config/LootTable';
import { MapManager, type GridPos, type SearchPointData } from './MapManager';
import { PlayerManager } from './PlayerManager';
import { DangerManager } from './DangerManager';
import { LootManager } from './LootManager';
import { EventBus } from '@/core/EventBus';

export const enum RunState { PREP, PLAYING, EXTRACTING, SUCCESS, DEAD }

class RunManagerClass {
  state = RunState.PREP;
  prepTimer = 3;
  extractionCountdown = 0;
  extractionActive = false;
  extractionPos: GridPos | null = null;

  /** 本局收集的资源 */
  runCopper = 0;
  runGrain = 0;
  runWood = 0;
  runIron = 0;
  runExpBook = 0;
  runSoul = 0;
  runClassScroll = 0;
  runSeal = 0;
  totalKills = 0;
  searchedCount = 0;

  /** 本局游戏时间 */
  gameTimer = 0;

  /** 兼容旧引用 */
  get totalCoins(): number { return this.runCopper; }
  set totalCoins(v: number) { this.runCopper = v; }
  get totalShards(): number { return this.runExpBook; }
  get totalStones(): number { return this.runWood; }
  get totalKeys(): number { return this.runSeal; }

  reset(): void {
    this.state = RunState.PREP;
    this.prepTimer = 3;
    this.extractionCountdown = 0;
    this.extractionActive = false;
    this.extractionPos = null;
    this.runCopper = 0;
    this.runGrain = 0;
    this.runWood = 0;
    this.runIron = 0;
    this.runExpBook = 0;
    this.runSoul = 0;
    this.runClassScroll = 0;
    this.runSeal = 0;
    this.totalKills = 0;
    this.searchedCount = 0;
    this.gameTimer = 0;
  }

  /** 累加单项资源 */
  addResource(type: ResourceType, count: number): void {
    switch (type) {
      case 'copper': this.runCopper += count; break;
      case 'grain': this.runGrain += count; break;
      case 'wood': this.runWood += count; break;
      case 'iron': this.runIron += count; break;
      case 'exp_book': this.runExpBook += count; break;
      case 'soul': this.runSoul += count; break;
      case 'class_scroll': this.runClassScroll += count; break;
      case 'seal': this.runSeal += count; break;
    }
  }

  update(dt: number): void {
    switch (this.state) {
      case RunState.PREP:
        this.prepTimer -= dt;
        if (this.prepTimer <= 0) {
          this.state = RunState.PLAYING;
          EventBus.emit('run:start');
        }
        break;

      case RunState.PLAYING:
        this.gameTimer += dt;
        this._checkSearch(dt);
        if (DangerManager.elapsed >= EXTRACTION_APPEAR_TIME && !this.extractionActive) {
          this._activateExtraction();
        }
        break;

      case RunState.EXTRACTING:
        this.gameTimer += dt;
        this.extractionCountdown -= dt;
        if (this.extractionCountdown <= 0) {
          if (this._playerInExtractionZone()) {
            this.state = RunState.SUCCESS;
            EventBus.emit('run:success', this.runCopper);
          } else {
            this.state = RunState.PLAYING;
            this.extractionActive = false;
          }
        }
        break;
    }
  }

  startExtraction(): void {
    if (this.state !== RunState.PLAYING || !this.extractionActive) return;
    if (!this._playerInExtractionZone()) return;

    this.state = RunState.EXTRACTING;
    this.extractionCountdown = EXTRACTION_COUNTDOWN;
    EventBus.emit('run:extracting');
  }

  get formattedTime(): string {
    const s = Math.floor(this.gameTimer);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  private _activateExtraction(): void {
    const map = MapManager.map;
    if (!map || map.extractionPoints.length === 0) return;
    this.extractionActive = true;
    this.extractionPos = map.extractionPoints[0];
    EventBus.emit('run:extractionAvailable', this.extractionPos);
  }

  private _playerInExtractionZone(): boolean {
    if (!this.extractionPos) return false;
    const halfSize = (EXTRACTION_SIZE / 2) * TILE;
    const cx = this.extractionPos.gx * TILE + TILE / 2;
    const cy = this.extractionPos.gy * TILE + TILE / 2;
    return Math.abs(PlayerManager.x - cx) <= halfSize && Math.abs(PlayerManager.y - cy) <= halfSize;
  }

  private _checkSearch(dt: number): void {
    const map = MapManager.map;
    if (!map) return;

    const px = PlayerManager.x, py = PlayerManager.y;

    if (PlayerManager.searchTarget) {
      const sp = this._findSearchPoint(PlayerManager.searchTarget.gx, PlayerManager.searchTarget.gy);
      if (!sp || sp.searched) { PlayerManager.searchTarget = null; PlayerManager.searchProgress = 0; return; }

      const dx = px - (sp.pos.gx * TILE + TILE / 2);
      const dy = py - (sp.pos.gy * TILE + TILE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy) / TILE;

      if (dist > SEARCH_CANCEL_DIST) {
        PlayerManager.searchTarget = null;
        PlayerManager.searchProgress = 0;
        return;
      }

      PlayerManager.searchProgress += dt;
      if (PlayerManager.searchProgress >= PlayerManager.effectiveSearchDuration) {
        sp.searched = true;
        PlayerManager.searchTarget = null;
        PlayerManager.searchProgress = 0;
        this.searchedCount++;

        const spx = sp.pos.gx * TILE + TILE / 2;
        const spy = sp.pos.gy * TILE + TILE / 2;
        const lootTableId = SEARCH_TYPE_LOOT[sp.searchType] || 'search_liangcao';
        const result = LootManager.rollSearchDrop(spx, spy, lootTableId);
        const displayCount = result.type === 'copper' ? result.count : 1;
        EventBus.emit('search:complete', sp.pos, displayCount, sp.isHighValue);

        DangerManager.triggerSearchWave();
      }
      return;
    }

    for (const sp of map.searchPoints) {
      if (sp.searched) continue;
      const sx = sp.pos.gx * TILE + TILE / 2;
      const sy = sp.pos.gy * TILE + TILE / 2;
      const dx = px - sx, dy = py - sy;
      const dist = Math.sqrt(dx * dx + dy * dy) / TILE;
      if (dist <= SEARCH_TRIGGER_DIST) {
        PlayerManager.searchTarget = sp.pos;
        PlayerManager.searchProgress = 0;
        EventBus.emit('search:start', sp.pos);
        break;
      }
    }
  }

  private _findSearchPoint(gx: number, gy: number): SearchPointData | undefined {
    return MapManager.map?.searchPoints.find(sp => sp.pos.gx === gx && sp.pos.gy === gy);
  }
}

export const RunManager = new RunManagerClass();
