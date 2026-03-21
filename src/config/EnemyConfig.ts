/** 怪物配置表（适配 TILE_SIZE=48 的比例） */

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
  usePathfinding: boolean;
  color: number;
  shape: 'circle' | 'triangle' | 'diamond' | 'square';
}

export const ENEMIES: Record<string, EnemyDef> = {
  grunt: {
    id: 'grunt', name: '小兵',
    hp: 50, damage: 15, speed: 2, radius: 16,
    senseRange: 5, chaseRange: 10, attackRange: 1, attackInterval: 1,
    usePathfinding: false, color: 0xcc3333, shape: 'circle',
  },
  patrol: {
    id: 'patrol', name: '巡逻怪',
    hp: 100, damage: 25, speed: 2.5, radius: 16,
    senseRange: 6, chaseRange: 12, attackRange: 3, attackInterval: 1.5,
    usePathfinding: true, color: 0xdd7700, shape: 'triangle',
  },
  fatty: {
    id: 'fatty', name: '胖子',
    hp: 150, damage: 80, speed: 1.5, radius: 22,
    senseRange: 4, chaseRange: Infinity, attackRange: 1, attackInterval: 3,
    usePathfinding: false, color: 0x883333, shape: 'square',
  },
  elite: {
    id: 'elite', name: '精英怪',
    hp: 200, damage: 35, speed: 3.5, radius: 18,
    senseRange: 8, chaseRange: 15, attackRange: 4, attackInterval: 2,
    usePathfinding: true, color: 0xcc33cc, shape: 'diamond',
  },
};
