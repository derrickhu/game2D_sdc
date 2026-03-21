/**
 * 存档管理器 - wx.setStorageSync 持久化
 */
import { Platform } from '@/core/PlatformService';

export interface SaveData {
  coins: number;
  shards: number;
  stones: number;
  keys: number;
  /** 武器等级 { weaponId: level } */
  weaponLevels: Record<string, number>;
  /** 已解锁技能列表 */
  unlockedSkills: string[];
  /** 已选装备（武器ID） */
  selectedWeapon: string;
  /** 已选技能ID */
  selectedSkill: string;
  /** 已选地图ID */
  selectedMap: string;
  /** 累计完成局数 */
  totalRuns: number;
  /** 累计成功撤离次数 */
  totalWins: number;
  /** 累计击杀 */
  totalKills: number;
}

const SAVE_KEY = 'sdc_save_v1';

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  shards: 0,
  stones: 0,
  keys: 0,
  weaponLevels: { pistol: 1 },
  unlockedSkills: ['dash'],
  selectedWeapon: 'pistol',
  selectedSkill: 'dash',
  selectedMap: 'warehouse',
  totalRuns: 0,
  totalWins: 0,
  totalKills: 0,
};

class SaveManagerClass {
  private _data: SaveData = { ...DEFAULT_SAVE };

  get data(): Readonly<SaveData> { return this._data; }

  load(): void {
    try {
      const raw = Platform.getStorageSync(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._data = { ...DEFAULT_SAVE, ...parsed };
      }
    } catch (e) {
      console.warn('[SaveManager] 读取存档失败:', e);
    }
  }

  save(): void {
    try {
      Platform.setStorageSync(SAVE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('[SaveManager] 保存存档失败:', e);
    }
  }

  /** 局结束结算：成功时物资入账，失败时只入账部分 */
  settleRun(success: boolean, runCoins: number, runShards: number, runStones: number, runKeys: number, kills: number): void {
    if (success) {
      this._data.coins += runCoins;
      this._data.shards += runShards;
      this._data.stones += runStones;
      this._data.keys += runKeys;
      this._data.totalWins++;
    } else {
      this._data.coins += Math.floor(runCoins * 0.3);
    }
    this._data.totalRuns++;
    this._data.totalKills += kills;
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this._data.coins < amount) return false;
    this._data.coins -= amount;
    this.save();
    return true;
  }

  spendShards(amount: number): boolean {
    if (this._data.shards < amount) return false;
    this._data.shards -= amount;
    this.save();
    return true;
  }
}

export const SaveManager = new SaveManagerClass();
