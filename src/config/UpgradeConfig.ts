/**
 * 三层养成消耗配置
 * 第1层 - 账号共享（营地等级）
 * 第2层 - 职业共享（武器熟练度）
 * 第3层 - 武将个体（武将等级 / 技能等级）
 */

// ═══════════════ 第1层：营地等级 ═══════════════
export interface CampUpgradeCost {
  level: number;
  copper: number;
  wood: number;
  iron: number;
  /** 营地等级带来的全局加成 */
  hpBonus: number;      // HP 百分比加成
  searchBonus: number;   // 搜索速度加成
}

export const CAMP_UPGRADE_COSTS: CampUpgradeCost[] = [
  { level: 1, copper: 0,    wood: 0,    iron: 0,    hpBonus: 0,    searchBonus: 0 },
  { level: 2, copper: 200,  wood: 50,   iron: 20,   hpBonus: 0.05, searchBonus: 0.05 },
  { level: 3, copper: 500,  wood: 120,  iron: 50,   hpBonus: 0.10, searchBonus: 0.10 },
  { level: 4, copper: 1000, wood: 250,  iron: 100,  hpBonus: 0.15, searchBonus: 0.15 },
  { level: 5, copper: 2000, wood: 500,  iron: 200,  hpBonus: 0.20, searchBonus: 0.20 },
  { level: 6, copper: 4000, wood: 1000, iron: 400,  hpBonus: 0.25, searchBonus: 0.25 },
  { level: 7, copper: 7000, wood: 1800, iron: 700,  hpBonus: 0.30, searchBonus: 0.30 },
  { level: 8, copper: 11000, wood: 3000, iron: 1200, hpBonus: 0.35, searchBonus: 0.35 },
];

// ═══════════════ 第2层：职业熟练度 ═══════════════
export interface ClassProfCost {
  level: number;
  copper: number;
  classScroll: number;
  /** 同职业武将共享的攻击加成 */
  atkBonus: number;
}

export const CLASS_PROF_COSTS: ClassProfCost[] = [
  { level: 1, copper: 0,    classScroll: 0,  atkBonus: 0 },
  { level: 2, copper: 100,  classScroll: 3,  atkBonus: 0.05 },
  { level: 3, copper: 300,  classScroll: 8,  atkBonus: 0.10 },
  { level: 4, copper: 600,  classScroll: 15, atkBonus: 0.15 },
  { level: 5, copper: 1200, classScroll: 25, atkBonus: 0.20 },
  { level: 6, copper: 2500, classScroll: 40, atkBonus: 0.25 },
];

// ═══════════════ 第3层：武将等级 ═══════════════
export interface HeroLevelCost {
  level: number;
  copper: number;
  expBook: number;
}

export const HERO_LEVEL_COSTS: HeroLevelCost[] = [
  { level: 1,  copper: 0,    expBook: 0 },
  { level: 2,  copper: 50,   expBook: 2 },
  { level: 3,  copper: 100,  expBook: 4 },
  { level: 4,  copper: 200,  expBook: 8 },
  { level: 5,  copper: 400,  expBook: 14 },
  { level: 6,  copper: 700,  expBook: 22 },
  { level: 7,  copper: 1100, expBook: 32 },
  { level: 8,  copper: 1600, expBook: 44 },
  { level: 9,  copper: 2200, expBook: 58 },
  { level: 10, copper: 3000, expBook: 75 },
];

/** 兼容旧引用 */
export const WEAPON_UPGRADE_COSTS = HERO_LEVEL_COSTS.map(c => ({
  level: c.level,
  coins: c.copper,
  shards: c.expBook,
}));
export const UPGRADE_STAT_MUL = 0.08;
