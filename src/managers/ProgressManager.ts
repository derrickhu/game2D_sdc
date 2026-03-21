/**
 * 局外养成管理器 - 武器升级 / 技能解锁
 */
import { WEAPONS, type WeaponDef } from '@/config/WeaponConfig';
import { SKILLS, type SkillDef } from '@/config/SkillConfig';
import { WEAPON_UPGRADE_COSTS, UPGRADE_STAT_MUL } from '@/config/UpgradeConfig';
import { SaveManager } from './SaveManager';

class ProgressManagerClass {
  /** 获取武器当前等级 */
  getWeaponLevel(weaponId: string): number {
    return SaveManager.data.weaponLevels[weaponId] || 1;
  }

  /** 尝试升级武器，返回是否成功 */
  upgradeWeapon(weaponId: string): boolean {
    const currentLevel = this.getWeaponLevel(weaponId);
    if (currentLevel >= 10) return false;

    const cost = WEAPON_UPGRADE_COSTS[currentLevel];
    if (!cost) return false;

    const data = SaveManager.data;
    if (data.coins < cost.coins || data.shards < cost.shards) return false;

    SaveManager.spendCoins(cost.coins);
    SaveManager.spendShards(cost.shards);
    (data as any).weaponLevels[weaponId] = currentLevel + 1;
    SaveManager.save();
    return true;
  }

  /** 获取升级后的武器定义（含等级加成） */
  getUpgradedWeapon(weaponId: string): WeaponDef {
    const base = WEAPONS[weaponId];
    if (!base) return WEAPONS['pistol'];
    const level = this.getWeaponLevel(weaponId);
    const mul = 1 + (level - 1) * UPGRADE_STAT_MUL;
    return {
      ...base,
      damage: Math.round(base.damage * mul),
      fireRate: base.fireRate * (1 + (level - 1) * 0.03),
    };
  }

  /** 获取已解锁的武器ID列表 */
  getUnlockedWeapons(): string[] {
    return Object.keys(WEAPONS);
  }

  /** 获取已解锁的技能列表 */
  getUnlockedSkills(): string[] {
    return SaveManager.data.unlockedSkills;
  }

  /** 检查并解锁新技能（基于累计局数） */
  checkSkillUnlocks(): string[] {
    const newUnlocks: string[] = [];
    const runs = SaveManager.data.totalRuns;
    const unlocked = SaveManager.data.unlockedSkills;

    for (const [id, skill] of Object.entries(SKILLS)) {
      if (!unlocked.includes(id) && runs >= skill.unlockRuns) {
        unlocked.push(id);
        newUnlocks.push(id);
      }
    }

    if (newUnlocks.length > 0) SaveManager.save();
    return newUnlocks;
  }

  /** 获取技能定义 */
  getSkill(skillId: string): SkillDef | null {
    return SKILLS[skillId] || null;
  }
}

export const ProgressManager = new ProgressManagerClass();
