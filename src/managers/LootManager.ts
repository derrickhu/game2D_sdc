/**
 * 三国掉落物管理器 - 地面掉落物生成、显示、自动拾取
 */
import * as PIXI from 'pixi.js';
import { TILE, PICKUP_RANGE, type ResourceType } from '@/config/Constants';
import { rollLoot, type LootDrop } from '@/config/LootTable';
import { PlayerManager } from './PlayerManager';
import { RunManager } from './RunManager';
import { VFXSystem } from '@/systems/VFXSystem';
import { EventBus } from '@/core/EventBus';

interface GroundItem {
  active: boolean;
  drop: LootDrop;
  count: number;
  x: number; y: number;
  gfx: PIXI.Graphics;
  age: number;
}

const POOL_SIZE = 40;
const PICKUP_DIST = PICKUP_RANGE * TILE;
const ITEM_LIFETIME = 30;

const COLOR_MAP: Record<string, number> = {
  copper: 0xffdd44,
  grain: 0x88cc44,
  wood: 0x886644,
  iron: 0x8888aa,
  exp_book: 0x44aaff,
  soul: 0xaa88ff,
  class_scroll: 0xff8844,
  seal: 0xff4488,
};

class LootManagerClass {
  private _pool: GroundItem[] = [];
  private _container: PIXI.Container | null = null;

  init(container: PIXI.Container): void {
    this._container = container;
    this._pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const gfx = new PIXI.Graphics();
      gfx.visible = false;
      gfx.eventMode = 'none';
      container.addChild(gfx);
      this._pool.push({
        active: false,
        drop: { type: 'copper' as ResourceType, itemId: 'copper', weight: 1, minCount: 1, maxCount: 1 },
        count: 0, x: 0, y: 0, gfx, age: 0,
      });
    }
  }

  /** 搜索完成时根据掉落表生成物品 */
  rollSearchDrop(x: number, y: number, lootTableId: string): { type: string; count: number } {
    const drop = rollLoot(lootTableId);
    if (!drop) return { type: 'copper', count: 20 };

    const count = drop.minCount + Math.floor(Math.random() * (drop.maxCount - drop.minCount + 1));

    if (drop.type === 'copper') {
      RunManager.runCopper += count;
      PlayerManager.pickup({ type: 'copper', id: 'copper', count });
      return { type: 'copper', count };
    }

    this._spawn(x, y, drop, count);
    return { type: drop.type, count };
  }

  /** 敌人击杀时散落物品 */
  spawnEnemyDrop(x: number, y: number, lootTableId: string = 'enemy_common'): void {
    const dropCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dropCount; i++) {
      const drop = rollLoot(lootTableId);
      if (!drop) continue;
      const count = drop.minCount + Math.floor(Math.random() * (drop.maxCount - drop.minCount + 1));
      const ox = (Math.random() - 0.5) * TILE;
      const oy = (Math.random() - 0.5) * TILE;
      this._spawn(x + ox, y + oy, drop, count);
    }
  }

  update(dt: number): void {
    const px = PlayerManager.x, py = PlayerManager.y;

    for (const item of this._pool) {
      if (!item.active) continue;

      item.age += dt;
      if (item.age > ITEM_LIFETIME) {
        this._deactivate(item);
        continue;
      }

      item.gfx.y = item.y + Math.sin(item.age * 3) * 3;

      const dx = px - item.x, dy = py - item.y;
      if (dx * dx + dy * dy < PICKUP_DIST * PICKUP_DIST) {
        this._pickupItem(item);
      }
    }
  }

  private _spawn(x: number, y: number, drop: LootDrop, count: number): void {
    const item = this._pool.find(i => !i.active);
    if (!item) return;

    item.active = true;
    item.drop = drop;
    item.count = count;
    item.x = x;
    item.y = y;
    item.age = 0;

    const color = COLOR_MAP[drop.type] || 0xffffff;
    const r = drop.type === 'copper' ? 4 : 5;
    item.gfx.clear();
    item.gfx.beginFill(color, 0.3);
    item.gfx.drawCircle(0, 0, r + 3);
    item.gfx.endFill();
    item.gfx.beginFill(color);
    item.gfx.drawCircle(0, 0, r);
    item.gfx.endFill();
    item.gfx.beginFill(0xffffff, 0.5);
    item.gfx.drawCircle(-1, -1, 1.5);
    item.gfx.endFill();
    item.gfx.position.set(x, y);
    item.gfx.visible = true;
  }

  private _pickupItem(item: GroundItem): void {
    if (item.drop.type === 'copper') {
      RunManager.runCopper += item.count;
    } else {
      const bpItem = { type: item.drop.type as ResourceType, id: item.drop.itemId, count: item.count };
      if (!PlayerManager.pickup(bpItem)) {
        EventBus.emit('backpack:full');
        return;
      }
      RunManager.addResource(item.drop.type as ResourceType, item.count);
    }

    VFXSystem.showCoinPickup(item.x, item.y - 10, item.count);
    EventBus.emit('loot:pickup', item.drop.type, item.count);
    this._deactivate(item);
  }

  private _deactivate(item: GroundItem): void {
    item.active = false;
    item.gfx.visible = false;
  }

  destroy(): void {
    for (const i of this._pool) i.gfx.destroy();
    this._pool = [];
    this._container = null;
  }
}

export const LootManager = new LootManagerClass();
