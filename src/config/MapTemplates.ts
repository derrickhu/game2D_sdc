/**
 * 横版地图模板配置
 */
export interface MapTemplate {
  name: string;
  enemyDensity: number;
  lootMultiplier: number;
  theme: {
    wallColor: number;
    floorColor: number;
    bgColor: number;
    platformColor: number;
    ladderColor: number;
    accentColor: number;
  };
}

export const MAP_TEMPLATES: Record<string, MapTemplate> = {
  warehouse: {
    name: '废弃仓库',
    enemyDensity: 1.0,
    lootMultiplier: 1.0,
    theme: {
      wallColor: 0x4a3a2a,
      floorColor: 0x5a4a3a,
      bgColor: 0x1a1510,
      platformColor: 0x6a5a44,
      ladderColor: 0x7a6644,
      accentColor: 0xaa7733,
    },
  },
  school: {
    name: '废弃学校',
    enemyDensity: 1.2,
    lootMultiplier: 1.1,
    theme: {
      wallColor: 0x556666,
      floorColor: 0x445555,
      bgColor: 0x0e1818,
      platformColor: 0x556655,
      ladderColor: 0x667766,
      accentColor: 0x66aa88,
    },
  },
  lab: {
    name: '地下实验室',
    enemyDensity: 1.5,
    lootMultiplier: 1.4,
    theme: {
      wallColor: 0x44445a,
      floorColor: 0x33334a,
      bgColor: 0x0a0a14,
      platformColor: 0x55556a,
      ladderColor: 0x66667a,
      accentColor: 0x6666cc,
    },
  },
};

export const DEFAULT_MAP = 'warehouse';
