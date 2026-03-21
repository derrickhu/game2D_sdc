/**
 * 战雾系统 - 横版简化版（光照遮罩由 BattleScene 接管，这里仅保留接口兼容）
 */
import * as PIXI from 'pixi.js';

class FogOfWarSystemClass {
  init(_mapContainer: PIXI.Container): void {}
  update(_playerX: number, _playerY: number): void {}
  destroy(): void {}
}

export const FogOfWarSystem = new FogOfWarSystemClass();
