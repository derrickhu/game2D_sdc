/**
 * 三国波次系统 - 波次预告 → 刷怪 → 清场 → 休息 → 循环
 */
import { TILE, WAVE_PREVIEW_DURATION, WAVE_REST_DURATION,
         WAVE_SEARCH_EXTRA_COUNT } from '@/config/Constants';
import { MapManager } from './MapManager';
import { EnemyManager } from './EnemyManager';
import { PlayerManager } from './PlayerManager';
import { RunManager, RunState } from './RunManager';
import { EventBus } from '@/core/EventBus';

export const enum WavePhase { PREVIEW, ACTIVE, CLEAR, REST }

interface WaveConfig {
  enemyCount: number;
  enemyTypes: string[];
}

const BASE_WAVES: WaveConfig[] = [
  { enemyCount: 3, enemyTypes: ['luanbing'] },
  { enemyCount: 4, enemyTypes: ['luanbing', 'gongShou'] },
  { enemyCount: 5, enemyTypes: ['luanbing', 'gongShou'] },
  { enemyCount: 5, enemyTypes: ['luanbing', 'gongShou', 'daoTun'] },
  { enemyCount: 6, enemyTypes: ['luanbing', 'gongShou', 'daoTun'] },
  { enemyCount: 7, enemyTypes: ['luanbing', 'gongShou', 'daoTun', 'xiaoWei'] },
];

class DangerManagerClass {
  private _elapsed = 0;
  private _level = 0;
  private _waveNum = 0;
  private _phase = WavePhase.REST;
  private _phaseTimer = 0;
  private _waveEnemiesSpawned = 0;
  private _waveEnemiesTotal = 0;
  private _spawnTimer = 0;

  get level(): number { return this._level; }
  get elapsed(): number { return this._elapsed; }
  get waveNum(): number { return this._waveNum; }
  get phase(): WavePhase { return this._phase; }
  get waveEnemiesTotal(): number { return this._waveEnemiesTotal; }

  reset(): void {
    this._elapsed = 0;
    this._level = 0;
    this._waveNum = 0;
    this._phase = WavePhase.REST;
    this._phaseTimer = 2; // 开局 2s 后第一波
    this._waveEnemiesSpawned = 0;
    this._waveEnemiesTotal = 0;
    this._spawnTimer = 0;
  }

  update(dt: number): void {
    this._elapsed += dt;

    if (this._elapsed >= 90) this._level = 3;
    else if (this._elapsed >= 60) this._level = 2;
    else if (this._elapsed >= 30) this._level = 1;
    else this._level = 0;

    switch (this._phase) {
      case WavePhase.REST:
        this._phaseTimer -= dt;
        if (this._phaseTimer <= 0) {
          this._startPreview();
        }
        break;

      case WavePhase.PREVIEW:
        this._phaseTimer -= dt;
        if (this._phaseTimer <= 0) {
          this._startActive();
        }
        break;

      case WavePhase.ACTIVE:
        this._spawnTimer += dt;
        // 每 0.5s 刷一只，直到全部刷完
        if (this._waveEnemiesSpawned < this._waveEnemiesTotal && this._spawnTimer >= 0.5) {
          this._spawnTimer = 0;
          this._spawnOne();
          this._waveEnemiesSpawned++;
        }
        // 全部刷完 + 全部击杀 → 清场
        if (this._waveEnemiesSpawned >= this._waveEnemiesTotal && EnemyManager.aliveCount === 0) {
          this._phase = WavePhase.CLEAR;
          this._phaseTimer = 1.5;
          EventBus.emit('wave:clear', this._waveNum);
        }
        break;

      case WavePhase.CLEAR:
        this._phaseTimer -= dt;
        if (this._phaseTimer <= 0) {
          this._phase = WavePhase.REST;
          const rest = RunManager.state === RunState.EXTRACTING
            ? WAVE_REST_DURATION * 0.4
            : WAVE_REST_DURATION;
          this._phaseTimer = rest;
        }
        break;
    }
  }

  /** 搜索完成时触发额外小波 */
  triggerSearchWave(): void {
    const cfg = this._getWaveConfig();
    for (let i = 0; i < WAVE_SEARCH_EXTRA_COUNT; i++) {
      const typeId = cfg.enemyTypes[Math.floor(Math.random() * cfg.enemyTypes.length)];
      this._spawnOneType(typeId);
    }
  }

  private _startPreview(): void {
    this._waveNum++;
    const cfg = this._getWaveConfig();
    this._waveEnemiesTotal = cfg.enemyCount;
    this._waveEnemiesSpawned = 0;
    this._phase = WavePhase.PREVIEW;
    this._phaseTimer = WAVE_PREVIEW_DURATION;
    EventBus.emit('wave:preview', this._waveNum, this._waveEnemiesTotal);
  }

  private _startActive(): void {
    this._phase = WavePhase.ACTIVE;
    this._spawnTimer = 0;
    EventBus.emit('wave:start', this._waveNum);
  }

  private _getWaveConfig(): WaveConfig {
    const idx = Math.min(this._waveNum - 1, BASE_WAVES.length - 1);
    const base = BASE_WAVES[Math.max(0, idx)];
    // 超出预设波次后递增数量
    const extraCount = Math.max(0, this._waveNum - BASE_WAVES.length);
    return {
      enemyCount: base.enemyCount + extraCount,
      enemyTypes: base.enemyTypes,
    };
  }

  private _spawnOne(): void {
    const cfg = this._getWaveConfig();
    const typeId = cfg.enemyTypes[Math.floor(Math.random() * cfg.enemyTypes.length)];
    this._spawnOneType(typeId);
  }

  private _spawnOneType(typeId: string): void {
    const map = MapManager.map;
    if (!map || map.enemySpawnPoints.length === 0) return;

    const px = PlayerManager.x, py = PlayerManager.y;
    const minDistPx = 6 * TILE;

    let candidates = map.enemySpawnPoints.filter(sp => {
      const dx = sp.gx * TILE - px, dy = sp.gy * TILE - py;
      return dx * dx + dy * dy > minDistPx * minDistPx;
    });

    if (candidates.length === 0) {
      let maxDist = 0, best = map.enemySpawnPoints[0];
      for (const sp of map.enemySpawnPoints) {
        const dx = sp.gx * TILE - px, dy = sp.gy * TILE - py;
        const d = dx * dx + dy * dy;
        if (d > maxDist) { maxDist = d; best = sp; }
      }
      candidates = [best];
    }

    const sp = candidates[Math.floor(Math.random() * candidates.length)];
    EnemyManager.spawn(typeId, sp.gx, sp.gy);
  }
}

export const DangerManager = new DangerManagerClass();
