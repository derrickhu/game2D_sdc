/**
 * 三国资源掉落表
 * 资源类型与 Constants.ResourceType 对应
 */

import type { ResourceType } from './Constants';

export interface LootDrop {
  type: ResourceType;
  itemId: string;
  weight: number;
  minCount: number;
  maxCount: number;
}

export interface LootTable {
  id: string;
  drops: LootDrop[];
}

export const LOOT_TABLES: Record<string, LootTable> = {
  /** 粮草车 - 基础搜索点 */
  search_liangcao: {
    id: 'search_liangcao',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 50, minCount: 20, maxCount: 50 },
      { type: 'grain', itemId: 'grain', weight: 30, minCount: 2, maxCount: 5 },
      { type: 'exp_book', itemId: 'exp_book', weight: 15, minCount: 1, maxCount: 2 },
      { type: 'class_scroll', itemId: 'class_scroll', weight: 5, minCount: 1, maxCount: 1 },
    ],
  },
  /** 军械架 - 武器/材料为主 */
  search_junxie: {
    id: 'search_junxie',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 30, minCount: 15, maxCount: 30 },
      { type: 'iron', itemId: 'iron', weight: 35, minCount: 2, maxCount: 6 },
      { type: 'wood', itemId: 'wood', weight: 20, minCount: 2, maxCount: 4 },
      { type: 'class_scroll', itemId: 'class_scroll', weight: 15, minCount: 1, maxCount: 1 },
    ],
  },
  /** 密诏匣 - 高价值搜索点 */
  search_mizhao: {
    id: 'search_mizhao',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 25, minCount: 50, maxCount: 100 },
      { type: 'exp_book', itemId: 'exp_book', weight: 25, minCount: 2, maxCount: 4 },
      { type: 'soul', itemId: 'soul', weight: 20, minCount: 1, maxCount: 2 },
      { type: 'class_scroll', itemId: 'class_scroll', weight: 20, minCount: 1, maxCount: 2 },
      { type: 'seal', itemId: 'seal', weight: 10, minCount: 1, maxCount: 1 },
    ],
  },
  /** 将印残匣 - 最高价值 */
  search_jiangyin: {
    id: 'search_jiangyin',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 20, minCount: 80, maxCount: 150 },
      { type: 'soul', itemId: 'soul', weight: 30, minCount: 2, maxCount: 4 },
      { type: 'seal', itemId: 'seal', weight: 25, minCount: 1, maxCount: 2 },
      { type: 'exp_book', itemId: 'exp_book', weight: 25, minCount: 3, maxCount: 5 },
    ],
  },
  /** 普通敌人掉落 */
  enemy_common: {
    id: 'enemy_common',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 60, minCount: 5, maxCount: 15 },
      { type: 'grain', itemId: 'grain', weight: 25, minCount: 1, maxCount: 2 },
      { type: 'exp_book', itemId: 'exp_book', weight: 15, minCount: 1, maxCount: 1 },
    ],
  },
  /** 精英敌人掉落 */
  enemy_elite: {
    id: 'enemy_elite',
    drops: [
      { type: 'copper', itemId: 'copper', weight: 30, minCount: 30, maxCount: 60 },
      { type: 'iron', itemId: 'iron', weight: 20, minCount: 2, maxCount: 4 },
      { type: 'exp_book', itemId: 'exp_book', weight: 20, minCount: 2, maxCount: 3 },
      { type: 'soul', itemId: 'soul', weight: 15, minCount: 1, maxCount: 2 },
      { type: 'seal', itemId: 'seal', weight: 15, minCount: 1, maxCount: 1 },
    ],
  },
};

/** 搜索点类型 → 掉落表映射 */
export const SEARCH_TYPE_LOOT: Record<string, string> = {
  liangcao: 'search_liangcao',
  junxie: 'search_junxie',
  mizhao: 'search_mizhao',
  jiangyin: 'search_jiangyin',
};

/** 从掉落表中按权重随机选一项 */
export function rollLoot(tableId: string): LootDrop | null {
  const table = LOOT_TABLES[tableId];
  if (!table) return null;

  const totalWeight = table.drops.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const drop of table.drops) {
    roll -= drop.weight;
    if (roll <= 0) return drop;
  }
  return table.drops[0];
}
