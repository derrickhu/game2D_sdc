/**
 * 单局状态机 - 准备 → 搜索 → 撤离 → 结算
 */
import { EXTRACTION_APPEAR_TIME, EXTRACTION_COUNTDOWN, EXTRACTION_SIZE,
         TILE, SEARCH_TRIGGER_DIST, SEARCH_CANCEL_DIST } from '@/config/Constants';
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

  totalCoins = 0;
  totalShards = 0;
  totalStones = 0;
  totalKeys = 0;
  totalKills = 0;
  searchedCount = 0;

  /** 本局游戏时间（PLAYING 阶段累积） */
  gameTimer = 0;

  reset(): void {
    this.state = RunState.PREP;
    this.prepTimer = 3;
    this.extractionCountdown = 0;
    this.extractionActive = false;
    this.extractionPos = null;
    this.totalCoins = 0;
    this.totalShards = 0;
    this.totalStones = 0;
    this.totalKeys = 0;
    this.totalKills = 0;
    this.searchedCount = 0;
    this.gameTimer = 0;
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
            EventBus.emit('run:success', this.totalCoins);
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

  /** 格式化的游戏时间 mm:ss */
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
        const result = LootManager.rollSearchDrop(spx, spy, sp.isHighValue);
        const displayCount = result.type === 'coin' ? result.count : 1;
        EventBus.emit('search:complete', sp.pos, displayCount, sp.isHighValue);

        // 搜索完成触发额外小波怪物
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
