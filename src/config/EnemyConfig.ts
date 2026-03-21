/**
 * 三国敌人配置表
 * M1：乱兵、弓手、守仓校尉（精英）
 */

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  radius: number;
  senseRange: number;
  chaseRange: number;
  attackRange: number;
  attackInterval: number;
  /** 是否远程 */
  isRanged: boolean;
  /** 是否精英 */
  isElite: boolean;
  /** 显示颜色 */
  color: number;
  shape: 'circle' | 'triangle' | 'diamond' | 'square';
  /** 掉落表 ID */
  lootTableId: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  /** 乱兵 - 最基础近战单位，低血量低伤害 */
  luanbing: {
    id: 'luanbing', name: '乱兵',
    hp: 40, damage: 12, speed: 2, radius: 14,
    senseRange: 5, chaseRange: 10, attackRange: 1, attackInterval: 1.2,
    isRanged: false, isElite: false,
    color: 0x886644, shape: 'circle',
    lootTableId: 'enemy_common',
  },
  /** 弓手 - 远程单位，保持距离射箭 */
  gongShou: {
    id: 'gongShou', name: '弓手',
    hp: 30, damage: 18, speed: 1.8, radius: 14,
    senseRange: 7, chaseRange: 12, attackRange: 5, attackInterval: 2,
    isRanged: true, isElite: false,
    color: 0x669944, shape: 'triangle',
    lootTableId: 'enemy_common',
  },
  /** 刀盾兵 - 高血量近战，移速慢 */
  daoTun: {
    id: 'daoTun', name: '刀盾兵',
    hp: 80, damage: 20, speed: 1.5, radius: 16,
    senseRange: 4, chaseRange: 8, attackRange: 1, attackInterval: 1.5,
    isRanged: false, isElite: false,
    color: 0x888866, shape: 'square',
    lootTableId: 'enemy_common',
  },
  /** 守仓校尉 - 精英，高属性 + 特殊攻击模式 */
  xiaoWei: {
    id: 'xiaoWei', name: '守仓校尉',
    hp: 200, damage: 30, speed: 2.5, radius: 20,
    senseRange: 8, chaseRange: 15, attackRange: 2, attackInterval: 1.8,
    isRanged: false, isElite: true,
    color: 0xcc6633, shape: 'diamond',
    lootTableId: 'enemy_elite',
  },
};

/** 兼容旧代码：usePathfinding 字段不再使用但保留接口兼容 */
export type EnemyDefCompat = EnemyDef & { usePathfinding?: boolean };
