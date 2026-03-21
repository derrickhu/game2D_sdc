/**
 * 存档管理器 - wx.setStorageSync 持久化
 * 三层养成数据结构
 */
import { Platform } from '@/core/PlatformService';
import type { HeroClass } from '@/config/HeroConfig';

export interface HeroSaveData {
  level: number;
  skillLevel: number;
}

export interface SaveData {
  // ═══════════════ 通用资源 ═══════════════
  copper: number;
  grain: number;
  wood: number;
  iron: number;
  expBook: number;
  soul: number;
  classScroll: number;
  seal: number;

  // ═══════════════ 第1层：营地（账号共享） ═══════════════
  campLevel: number;

  // ═══════════════ 第2层：职业熟练度（同职业共享） ═══════════════
  classProficiency: Record<HeroClass, number>;

  // ═══════════════ 第3层：武将个体 ═══════════════
  heroes: Record<string, HeroSaveData>;
  unlockedHeroes: string[];

  // ═══════════════ 选择状态 ═══════════════
  selectedHero: string;
  selectedMap: string;

  // ═══════════════ 统计 ═══════════════
  totalRuns: number;
  totalWins: number;
  totalKills: number;

  // ═══════════════ 兼容旧引用 ═══════════════
  /** @deprecated 旧字段，映射到 copper */
  coins: number;
  /** @deprecated 旧字段，映射到 expBook */
  shards: number;
  stones: number;
  keys: number;
  weaponLevels: Record<string, number>;
  unlockedSkills: string[];
  selectedWeapon: string;
  selectedSkill: string;
}

const SAVE_KEY = 'sdc_sg_save_v1';

const DEFAULT_SAVE: SaveData = {
  copper: 0,
  grain: 0,
  wood: 0,
  iron: 0,
  expBook: 0,
  soul: 0,
  classScroll: 0,
  seal: 0,

  campLevel: 1,
  classProficiency: { spear: 1, blade: 1, archer: 1, strategist: 1 },

  heroes: {
    zhaoYun: { level: 1, skillLevel: 1 },
    guanYu: { level: 1, skillLevel: 1 },
  },
  unlockedHeroes: ['zhaoYun', 'guanYu'],

  selectedHero: 'zhaoYun',
  selectedMap: 'camp',

  totalRuns: 0,
  totalWins: 0,
  totalKills: 0,

  // 兼容旧引用
  coins: 0,
  shards: 0,
  stones: 0,
  keys: 0,
  weaponLevels: {},
  unlockedSkills: ['dash'],
  selectedWeapon: 'zhaoYun',
  selectedSkill: 'dash',
};

class SaveManagerClass {
  private _data: SaveData = { ...DEFAULT_SAVE };

  get data(): SaveData { return this._data; }

  load(): void {
    try {
      const raw = Platform.getStorageSync(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._data = { ...DEFAULT_SAVE, ...parsed };
        // 确保嵌套对象也有默认值
        this._data.classProficiency = { ...DEFAULT_SAVE.classProficiency, ...parsed.classProficiency };
        this._data.heroes = { ...DEFAULT_SAVE.heroes, ...parsed.heroes };
      }
    } catch (e) {
      console.warn('[SaveManager] 读取存档失败:', e);
    }
    this._syncCompat();
  }

  save(): void {
    this._syncCompat();
    try {
      Platform.setStorageSync(SAVE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('[SaveManager] 保存存档失败:', e);
    }
  }

  /** 局结束结算：成功时物资全额入账，失败时只入账部分 */
  settleRun(
    success: boolean,
    runCopper: number,
    runGrain: number,
    runWood: number,
    runIron: number,
    runExpBook: number,
    runSoul: number,
    runClassScroll: number,
    runSeal: number,
    kills: number,
  ): void {
    const mul = success ? 1 : 0.3;
    this._data.copper += Math.floor(runCopper * mul);
    this._data.grain += Math.floor(runGrain * mul);
    this._data.wood += Math.floor(runWood * mul);
    this._data.iron += Math.floor(runIron * mul);
    this._data.expBook += Math.floor(runExpBook * (success ? 1 : 0.5));
    this._data.soul += Math.floor(runSoul * (success ? 1 : 0));
    this._data.classScroll += Math.floor(runClassScroll * (success ? 1 : 0.5));
    this._data.seal += Math.floor(runSeal * (success ? 1 : 0));

    this._data.totalRuns++;
    if (success) this._data.totalWins++;
    this._data.totalKills += kills;
    this.save();
  }

  spendCopper(amount: number): boolean {
    if (this._data.copper < amount) return false;
    this._data.copper -= amount;
    this.save();
    return true;
  }

  /** 旧接口兼容 */
  spendCoins(amount: number): boolean { return this.spendCopper(amount); }
  spendShards(amount: number): boolean {
    if (this._data.expBook < amount) return false;
    this._data.expBook -= amount;
    this.save();
    return true;
  }

  /** 同步新旧字段 */
  private _syncCompat(): void {
    this._data.coins = this._data.copper;
    this._data.shards = this._data.expBook;
    this._data.selectedWeapon = this._data.selectedHero;
  }
}

export const SaveManager = new SaveManagerClass();
