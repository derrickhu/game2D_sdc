/** 武器配置表 */

export interface WeaponDef {
  id: string;
  name: string;
  damage: number;
  fireRate: number;   // 发/秒
  range: number;      // 格
  bulletCount: number; // 每次射击弹丸数（霰弹枪为3）
  spreadAngle: number; // 弹丸散布角度（弧度），0=单发直线
}

export const WEAPONS: Record<string, WeaponDef> = {
  pistol: {
    id: 'pistol', name: '手枪',
    damage: 25, fireRate: 3, range: 4,
    bulletCount: 1, spreadAngle: 0,
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪',
    damage: 60, fireRate: 1, range: 2,
    bulletCount: 3, spreadAngle: Math.PI / 6,
  },
  smg: {
    id: 'smg', name: '冲锋枪',
    damage: 12, fireRate: 6, range: 4,
    bulletCount: 1, spreadAngle: 0,
  },
};

export const DEFAULT_WEAPON = 'pistol';
