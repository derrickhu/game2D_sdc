/** 掉落表配置（权重概率驱动） */

export interface LootDrop {
  type: 'coin' | 'material' | 'weapon_shard' | 'buff' | 'key';
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
  search_normal: {
    id: 'search_normal',
    drops: [
      { type: 'coin', itemId: 'gold', weight: 60, minCount: 15, maxCount: 40 },
      { type: 'weapon_shard', itemId: 'shard', weight: 15, minCount: 1, maxCount: 3 },
      { type: 'material', itemId: 'stone', weight: 10, minCount: 1, maxCount: 2 },
      { type: 'buff', itemId: 'random', weight: 10, minCount: 1, maxCount: 1 },
      { type: 'key', itemId: 'key', weight: 5, minCount: 1, maxCount: 1 },
    ],
  },
  search_high_value: {
    id: 'search_high_value',
    drops: [
      { type: 'coin', itemId: 'gold', weight: 40, minCount: 40, maxCount: 80 },
      { type: 'weapon_shard', itemId: 'shard', weight: 20, minCount: 2, maxCount: 5 },
      { type: 'material', itemId: 'stone', weight: 15, minCount: 2, maxCount: 4 },
      { type: 'buff', itemId: 'random', weight: 20, minCount: 1, maxCount: 1 },
      { type: 'key', itemId: 'key', weight: 5, minCount: 1, maxCount: 1 },
    ],
  },
  enemy_kill: {
    id: 'enemy_kill',
    drops: [
      { type: 'coin', itemId: 'gold', weight: 70, minCount: 5, maxCount: 15 },
      { type: 'weapon_shard', itemId: 'shard', weight: 20, minCount: 1, maxCount: 1 },
      { type: 'material', itemId: 'stone', weight: 10, minCount: 1, maxCount: 1 },
    ],
  },
};

/** 从掉落表中随机选一个结果 */
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
