/** 主动技能配置表 */

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  /** 解锁需要的累计局数 */
  unlockRuns: number;
  /** 图标颜色 */
  color: number;
}

export const SKILLS: Record<string, SkillDef> = {
  dash: {
    id: 'dash', name: '冲刺',
    description: '前冲3格，途中无敌',
    cooldown: 8, unlockRuns: 0, color: 0x33ccff,
  },
  grenade: {
    id: 'grenade', name: '手雷',
    description: '投掷手雷，范围伤害80',
    cooldown: 15, unlockRuns: 3, color: 0xff8844,
  },
  shield: {
    id: 'shield', name: '护盾',
    description: '3秒无敌护盾',
    cooldown: 20, unlockRuns: 5, color: 0x44aaff,
  },
  heal: {
    id: 'heal', name: '急救',
    description: '回复40HP',
    cooldown: 25, unlockRuns: 8, color: 0x44ff88,
  },
};

export const DEFAULT_SKILL = 'dash';
