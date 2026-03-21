/** 武器升级费用表（10级） */

export interface UpgradeCost {
  level: number;
  coins: number;
  shards: number;
}

export const WEAPON_UPGRADE_COSTS: UpgradeCost[] = [
  { level: 1,  coins: 0,    shards: 0 },
  { level: 2,  coins: 100,  shards: 5 },
  { level: 3,  coins: 200,  shards: 10 },
  { level: 4,  coins: 400,  shards: 20 },
  { level: 5,  coins: 700,  shards: 35 },
  { level: 6,  coins: 1100, shards: 55 },
  { level: 7,  coins: 1600, shards: 80 },
  { level: 8,  coins: 2200, shards: 110 },
  { level: 9,  coins: 3000, shards: 150 },
  { level: 10, coins: 4000, shards: 200 },
];

/** 每级武器属性加成比例 */
export const UPGRADE_STAT_MUL = 0.08;
