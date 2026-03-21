/**
 * 武将配置表
 * M1 首发：赵云（枪将）、关羽（刀将）
 * M2 扩展：黄忠（射手）、诸葛亮（谋士）
 */

export type HeroClass = 'spear' | 'blade' | 'archer' | 'strategist';

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  heroClass: HeroClass;

  /** 基础属性（Lv.1） */
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpeed: number;

  /** 攻击参数 */
  attackRange: number;   // 攻击范围（像素）
  attackRate: number;     // 攻击/秒
  attackWidth: number;    // 攻击判定宽度（像素），近战用
  isRanged: boolean;      // 远程攻击

  /** 主动技能 ID */
  activeSkill: string;
  /** 固有被动 ID */
  passiveSkill: string;

  /** 外观（色块渲染） */
  bodyColor: number;
  accentColor: number;

  /** 每级成长系数 */
  hpPerLevel: number;
  atkPerLevel: number;
  defPerLevel: number;
}

export const HEROES: Record<string, HeroDef> = {
  zhaoYun: {
    id: 'zhaoYun',
    name: '赵云',
    title: '常山赵子龙',
    heroClass: 'spear',
    baseHp: 100,
    baseAtk: 28,
    baseDef: 12,
    baseSpeed: 200,
    attackRange: 80,
    attackRate: 2.5,
    attackWidth: 60,
    isRanged: false,
    activeSkill: 'qijinqichu',
    passiveSkill: 'longdan',
    bodyColor: 0x3388cc,
    accentColor: 0x66bbff,
    hpPerLevel: 12,
    atkPerLevel: 3,
    defPerLevel: 1.5,
  },
  guanYu: {
    id: 'guanYu',
    name: '关羽',
    title: '美髯公',
    heroClass: 'blade',
    baseHp: 130,
    baseAtk: 38,
    baseDef: 16,
    baseSpeed: 160,
    attackRange: 65,
    attackRate: 1.8,
    attackWidth: 80,
    isRanged: false,
    activeSkill: 'qinglongduanyue',
    passiveSkill: 'wusheng',
    bodyColor: 0xcc3333,
    accentColor: 0xff6644,
    hpPerLevel: 16,
    atkPerLevel: 4,
    defPerLevel: 2,
  },
};

export const DEFAULT_HERO = 'zhaoYun';

/** 获取升级后的攻击力 */
export function getHeroAtk(def: HeroDef, level: number): number {
  return Math.round(def.baseAtk + (level - 1) * def.atkPerLevel);
}
/** 获取升级后的生命值 */
export function getHeroHp(def: HeroDef, level: number): number {
  return Math.round(def.baseHp + (level - 1) * def.hpPerLevel);
}
/** 获取升级后的防御 */
export function getHeroDef(def: HeroDef, level: number): number {
  return Math.round(def.baseDef + (level - 1) * def.defPerLevel);
}
