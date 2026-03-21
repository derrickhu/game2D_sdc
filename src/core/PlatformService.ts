/**
 * 平台服务抽象层 - 统一封装微信/抖音双平台 API
 */

export type PlatformName = 'wechat' | 'douyin' | 'unknown';

class PlatformServiceClass {
  readonly name: PlatformName;
  private _api: any;

  constructor() {
    if (typeof wx !== 'undefined') { this._api = wx; this.name = 'wechat'; }
    else if (typeof tt !== 'undefined') { this._api = tt; this.name = 'douyin'; }
    else { this._api = null; this.name = 'unknown'; }
  }

  get isMinigame(): boolean { return this._api !== null; }
  get api(): any { return this._api; }

  // ═══════════════ 存储 ═══════════════
  getStorageSync(key: string): string | null {
    try { return this._api?.getStorageSync(key) || null; } catch (_) { return null; }
  }
  setStorageSync(key: string, value: string): void {
    try { this._api?.setStorageSync(key, value); } catch (_) {}
  }

  // ═══════════════ 系统信息 ═══════════════
  getSystemInfoSync(): any {
    try { return this._api?.getSystemInfoSync?.() || null; } catch (_) { return null; }
  }

  // ═══════════════ 震动 ═══════════════
  vibrateShort(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    try {
      if (this.name === 'wechat') this._api?.vibrateShort({ type });
      else if (this.name === 'douyin') this._api?.vibrateShort?.({ success() {}, fail() {} });
    } catch (_) {}
  }
  vibrateLong(): void {
    try { this._api?.vibrateLong?.({ success() {}, fail() {} }); } catch (_) {}
  }

  // ═══════════════ 广告 ═══════════════
  createRewardedVideoAd(adUnitId: string): any {
    try { return this._api?.createRewardedVideoAd?.({ adUnitId }) || null; } catch (_) { return null; }
  }
  createInterstitialAd(adUnitId: string): any {
    try { return this._api?.createInterstitialAd?.({ adUnitId }) || null; } catch (_) { return null; }
  }

  // ═══════════════ 分享 ═══════════════
  shareAppMessage(opts: { title: string; imageUrl?: string; query?: string }): void {
    try { this._api?.shareAppMessage?.(opts); } catch (_) {}
  }
  onShareAppMessage(cb: () => { title: string; imageUrl?: string; query?: string }): void {
    try { this._api?.onShareAppMessage?.(cb); } catch (_) {}
  }

  // ═══════════════ 生命周期 ═══════════════
  onHide(cb: () => void): void { try { this._api?.onHide?.(cb); } catch (_) {} }
  onShow(cb: (res?: any) => void): void { try { this._api?.onShow?.(cb); } catch (_) {} }

  showToast(title: string, icon: 'success' | 'none' | 'error' = 'none'): void {
    try { this._api?.showToast?.({ title, icon, duration: 2000 }); } catch (_) {}
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};
if (!_global.__platformService) _global.__platformService = new PlatformServiceClass();
export const Platform: PlatformServiceClass = _global.__platformService;
