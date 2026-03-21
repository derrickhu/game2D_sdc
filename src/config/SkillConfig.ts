/**
 * 武将技能配置表
 * 主动技能：每个武将一个专属主动技 + 通用冲刺
 * 被动技能：每个武将一个固有被动
 */

export interface ActiveSkillDef {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  /** 伤害倍率（基于武将 ATK） */
  damageMul: number;
  /** 效果范围（像素） */
  range: number;
  /** 持续时间（秒），0 = 瞬发 */
  duration: number;
  /** 图标颜色 */
  color: number;
}

export interface PassiveSkillDef {
  id: string;
  name: string;
  description: string;
  /** 触发类型 */
  trigger: 'always' | 'on_hit' | 'on_kill' | 'on_search' | 'low_hp';
  /** 效果参数 */
  params: Record<string, number>;
  color: number;
}

export const ACTIVE_SKILLS: Record<string, ActiveSkillDef> = {
  /** 赵云 - 七进七出：前冲 3 格，途中对路径敌人造成 2 倍 ATK 伤害，无敌 */
  qijinqichu: {
    id: 'qijinqichu',
    name: '七进七出',
    description: '前冲3格，途中伤害敌人，短暂无敌',
    cooldown: 10,
    damageMul: 2.0,
    range: 3 * 32,
    duration: 0.2,
    color: 0x33ccff,
  },
  /** 关羽 - 青龙断岳：前方大范围横斩，3 倍 ATK 伤害，击退 */
  qinglongduanyue: {
    id: 'qinglongduanyue',
    name: '青龙断岳',
    description: '前方大范围横斩，高伤害并击退敌人',
    cooldown: 12,
    damageMul: 3.0,
    range: 100,
    duration: 0,
    color: 0xff6644,
  },
  /** 通用冲刺（所有武将可用的替代技能） */
  dash: {
    id: 'dash',
    name: '闪避',
    description: '快速闪避，短暂无敌',
    cooldown: 6,
    damageMul: 0,
    range: 2 * 32,
    duration: 0.15,
    color: 0xaaaacc,
  },
};

export const PASSIVE_SKILLS: Record<string, PassiveSkillDef> = {
  /** 赵云 - 龙胆：击杀回复 5% 最大 HP */
  longdan: {
    id: 'longdan',
    name: '龙胆',
    description: '击杀敌人回复5%最大生命值',
    trigger: 'on_kill',
    params: { healRatio: 0.05 },
    color: 0x33ccff,
  },
  /** 关羽 - 武圣：HP < 30% 时攻击力 +40% */
  wusheng: {
    id: 'wusheng',
    name: '武圣',
    description: '低血量时攻击力大幅提升',
    trigger: 'low_hp',
    params: { hpThreshold: 0.3, atkBonus: 0.4 },
    color: 0xff4444,
  },
};

export const DEFAULT_SKILL = 'dash';
/** 兼容旧引用 */
export const SKILLS: Record<string, ActiveSkillDef> = ACTIVE_SKILLS;
