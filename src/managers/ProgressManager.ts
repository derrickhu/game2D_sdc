/**
 * 三层养成管理器
 * 第1层：营地（账号共享）
 * 第2层：职业熟练度（同职业共享）
 * 第3层：武将等级/技能等级（个体）
 */
import { HEROES, type HeroDef, type HeroClass } from '@/config/HeroConfig';
import { ACTIVE_SKILLS, type ActiveSkillDef } from '@/config/SkillConfig';
import { CAMP_UPGRADE_COSTS, CLASS_PROF_COSTS, HERO_LEVEL_COSTS } from '@/config/UpgradeConfig';
import { SaveManager } from './SaveManager';

class ProgressManagerClass {
  // ═══════════════ 第1层：营地 ═══════════════

  getCampLevel(): number {
    return SaveManager.data.campLevel || 1;
  }

  /** 营地 HP 加成比例 */
  getCampHpBonus(): number {
    const lv = this.getCampLevel();
    const cost = CAMP_UPGRADE_COSTS[lv - 1];
    return cost?.hpBonus || 0;
  }

  /** 营地搜索速度加成比例 */
  getCampSearchBonus(): number {
    const lv = this.getCampLevel();
    const cost = CAMP_UPGRADE_COSTS[lv - 1];
    return cost?.searchBonus || 0;
  }

  upgradeCamp(): boolean {
    const currentLevel = this.getCampLevel();
    if (currentLevel >= CAMP_UPGRADE_COSTS.length) return false;
    const cost = CAMP_UPGRADE_COSTS[currentLevel];
    if (!cost) return false;
    const d = SaveManager.data;
    if (d.copper < cost.copper || d.wood < cost.wood || d.iron < cost.iron) return false;
    d.copper -= cost.copper;
    d.wood -= cost.wood;
    d.iron -= cost.iron;
    (d as any).campLevel = currentLevel + 1;
    SaveManager.save();
    return true;
  }

  // ═══════════════ 第2层：职业熟练度 ═══════════════

  getClassProficiency(heroClass: HeroClass): number {
    return SaveManager.data.classProficiency[heroClass] || 1;
  }

  /** 职业 ATK 加成比例 */
  getClassAtkBonus(heroClass: HeroClass): number {
    const lv = this.getClassProficiency(heroClass);
    const cost = CLASS_PROF_COSTS[lv - 1];
    return cost?.atkBonus || 0;
  }

  upgradeClassProf(heroClass: HeroClass): boolean {
    const currentLevel = this.getClassProficiency(heroClass);
    if (currentLevel >= CLASS_PROF_COSTS.length) return false;
    const cost = CLASS_PROF_COSTS[currentLevel];
    if (!cost) return false;
    const d = SaveManager.data;
    if (d.copper < cost.copper || d.classScroll < cost.classScroll) return false;
    d.copper -= cost.copper;
    d.classScroll -= cost.classScroll;
    d.classProficiency[heroClass] = currentLevel + 1;
    SaveManager.save();
    return true;
  }

  // ═══════════════ 第3层：武将个体 ═══════════════

  getHeroLevel(heroId: string): number {
    return SaveManager.data.heroes[heroId]?.level || 1;
  }

  getHeroSkillLevel(heroId: string): number {
    return SaveManager.data.heroes[heroId]?.skillLevel || 1;
  }

  upgradeHero(heroId: string): boolean {
    const data = SaveManager.data;
    const hero = data.heroes[heroId];
    if (!hero) return false;
    const currentLevel = hero.level;
    if (currentLevel >= HERO_LEVEL_COSTS.length) return false;
    const cost = HERO_LEVEL_COSTS[currentLevel];
    if (!cost) return false;
    if (data.copper < cost.copper || data.expBook < cost.expBook) return false;
    data.copper -= cost.copper;
    data.expBook -= cost.expBook;
    hero.level = currentLevel + 1;
    SaveManager.save();
    return true;
  }

  // ═══════════════ 综合查询 ═══════════════

  /** 获取已解锁的武将 ID 列表 */
  getUnlockedHeroes(): string[] {
    return SaveManager.data.unlockedHeroes;
  }

  /** 获取武将定义 */
  getHeroDef(heroId: string): HeroDef | null {
    return HEROES[heroId] || null;
  }

  /** 获取武将主动技能定义 */
  getHeroActiveSkill(heroId: string): ActiveSkillDef | null {
    const hero = HEROES[heroId];
    if (!hero) return null;
    return ACTIVE_SKILLS[hero.activeSkill] || null;
  }

  // ═══════════════ 兼容旧接口 ═══════════════

  getWeaponLevel(weaponId: string): number {
    return this.getHeroLevel(weaponId);
  }

  getUnlockedWeapons(): string[] {
    return this.getUnlockedHeroes();
  }

  getUnlockedSkills(): string[] {
    return SaveManager.data.unlockedSkills;
  }

  getUpgradedWeapon(heroId: string): any {
    const def = HEROES[heroId] || HEROES['zhaoYun'];
    const level = this.getHeroLevel(heroId);
    return {
      id: heroId,
      name: def.name,
      damage: def.baseAtk + (level - 1) * def.atkPerLevel,
      fireRate: def.attackRate,
      range: def.attackRange / 32,
      bulletCount: 1,
      spreadAngle: 0,
    };
  }

  upgradeWeapon(heroId: string): boolean {
    return this.upgradeHero(heroId);
  }

  checkSkillUnlocks(): string[] { return []; }

  getSkill(skillId: string): ActiveSkillDef | null {
    return ACTIVE_SKILLS[skillId] || null;
  }
}

export const ProgressManager = new ProgressManagerClass();
