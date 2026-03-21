/**
 * 军符（局内 Buff）配置表
 * 搜索到军符后随机获得一个增益效果
 */

export type BuffCategory = 'attack' | 'defense' | 'speed' | 'search' | 'special';

export interface BuffDef {
  id: string;
  name: string;
  category: BuffCategory;
  description: string;
  maxStack: number;
  atkMul?: number;
  defMul?: number;
  spdMul?: number;
  specialEffect?: string;
  color: number;
}

export const BUFFS: Record<string, BuffDef> = {
  /** 战意激昂 - 攻击力 +20% */
  zhanyi: {
    id: 'zhanyi', name: '战意激昂', category: 'attack',
    description: '攻击力+20%', maxStack: 3, atkMul: 1.2, color: 0xff4444,
  },
  /** 铁壁防御 - 受伤 -20% */
  tiebi: {
    id: 'tiebi', name: '铁壁防御', category: 'defense',
    description: '受伤-20%', maxStack: 3, defMul: 0.8, color: 0x4488ff,
  },
  /** 轻功身法 - 移速 +25% */
  qinggong: {
    id: 'qinggong', name: '轻功身法', category: 'speed',
    description: '移速+25%', maxStack: 3, spdMul: 1.25, color: 0x44ff88,
  },
  /** 华佗秘方 - 立即回复 30 HP */
  huatuo: {
    id: 'huatuo', name: '华佗秘方', category: 'special',
    description: '恢复30HP', maxStack: 1, specialEffect: 'heal_30', color: 0xff88aa,
  },
  /** 慧眼识珠 - 搜索速度 +50% */
  huiyan: {
    id: 'huiyan', name: '慧眼识珠', category: 'search',
    description: '搜索速度+50%', maxStack: 2, specialEffect: 'search_speed', color: 0xffdd44,
  },
  /** 天命所归 - 掉落品质提升 */
  tianming: {
    id: 'tianming', name: '天命所归', category: 'special',
    description: '掉落品质提升', maxStack: 1, specialEffect: 'lucky', color: 0xffaa00,
  },
};

const BUFF_IDS = Object.keys(BUFFS);

/** 随机获取一个军符 Buff */
export function randomBuff(): BuffDef {
  return BUFFS[BUFF_IDS[Math.floor(Math.random() * BUFF_IDS.length)]];
}
