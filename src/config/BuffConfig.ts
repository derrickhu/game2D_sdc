/** Buff 配置表（6类 Buff + 叠加规则） */

export type BuffCategory = 'attack' | 'defense' | 'speed' | 'special' | 'search' | 'rare';

export interface BuffDef {
  id: string;
  name: string;
  category: BuffCategory;
  description: string;
  /** 同属性最多叠加层数 */
  maxStack: number;
  /** 属性修改器 */
  atkMul?: number;
  defMul?: number;
  spdMul?: number;
  /** 特殊效果标记 */
  specialEffect?: string;
  /** 图标颜色 */
  color: number;
}

export const BUFFS: Record<string, BuffDef> = {
  atk_up: {
    id: 'atk_up', name: '攻击强化', category: 'attack',
    description: '攻击力+20%', maxStack: 3, atkMul: 1.2, color: 0xff4444,
  },
  def_up: {
    id: 'def_up', name: '防御强化', category: 'defense',
    description: '受伤-20%', maxStack: 3, defMul: 0.8, color: 0x4488ff,
  },
  spd_up: {
    id: 'spd_up', name: '移速强化', category: 'speed',
    description: '移速+25%', maxStack: 3, spdMul: 1.25, color: 0x44ff88,
  },
  hp_regen: {
    id: 'hp_regen', name: '生命恢复', category: 'special',
    description: '恢复30HP', maxStack: 1, specialEffect: 'heal_30', color: 0xff88aa,
  },
  search_fast: {
    id: 'search_fast', name: '快速搜索', category: 'search',
    description: '搜索速度+50%', maxStack: 2, specialEffect: 'search_speed', color: 0xffdd44,
  },
  lucky: {
    id: 'lucky', name: '幸运', category: 'rare',
    description: '掉落品质提升', maxStack: 1, specialEffect: 'lucky', color: 0xffaa00,
  },
};

const BUFF_IDS = Object.keys(BUFFS);

/** 随机获取一个 Buff */
export function randomBuff(): BuffDef {
  return BUFFS[BUFF_IDS[Math.floor(Math.random() * BUFF_IDS.length)]];
}
