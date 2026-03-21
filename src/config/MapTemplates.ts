/**
 * 三国地图模板配置
 * M1：废弃军营、官仓地牢
 * M2：渡口粮道
 */

export interface MapTemplate {
  name: string;
  /** 敌人密度倍率 */
  enemyDensity: number;
  /** 搜索收益倍率 */
  lootMultiplier: number;
  /** 推荐武将等级 */
  recommendLevel: number;
  /** 配色主题 */
  theme: {
    wallColor: number;
    floorColor: number;
    bgColor: number;
    platformColor: number;
    ladderColor: number;
    accentColor: number;
  };
  /** 可出现的搜索点类型 */
  searchTypes: string[];
  /** 可出现的敌人类型 */
  enemyTypes: string[];
}

export const MAP_TEMPLATES: Record<string, MapTemplate> = {
  /** 废弃军营 - 入门图，敌人少收益低 */
  camp: {
    name: '废弃军营',
    enemyDensity: 1.0,
    lootMultiplier: 1.0,
    recommendLevel: 1,
    theme: {
      wallColor: 0x5a4a3a,
      floorColor: 0x6a5a4a,
      bgColor: 0x1a1510,
      platformColor: 0x7a6a54,
      ladderColor: 0x8a7a5a,
      accentColor: 0xaa7733,
    },
    searchTypes: ['liangcao', 'junxie'],
    enemyTypes: ['luanbing', 'gongShou'],
  },
  /** 官仓地牢 - 中等难度，收益高 */
  dungeon: {
    name: '官仓地牢',
    enemyDensity: 1.3,
    lootMultiplier: 1.4,
    recommendLevel: 3,
    theme: {
      wallColor: 0x44445a,
      floorColor: 0x33334a,
      bgColor: 0x0a0a14,
      platformColor: 0x55556a,
      ladderColor: 0x66667a,
      accentColor: 0x6666cc,
    },
    searchTypes: ['liangcao', 'junxie', 'mizhao', 'jiangyin'],
    enemyTypes: ['luanbing', 'gongShou', 'daoTun', 'xiaoWei'],
  },
};

export const DEFAULT_MAP = 'camp';
