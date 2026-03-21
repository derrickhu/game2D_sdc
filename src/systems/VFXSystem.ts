/**
 * VFX 系统 - 全套视觉果汁：飘字、火花、死亡爆散、枪口闪光、
 * 移动扬尘、环境浮尘、红色暗角、常驻暗角、连杀提示、瞄准线、血迹
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TILE } from '@/config/Constants';
import { Ease, TweenManager } from '@/core/TweenManager';

// ═══════════════ 池配置 ═══════════════
const FLOAT_POOL = 24;
const SPARK_POOL = 80;
const DUST_POOL = 40;
const AMBIENT_COUNT = 20;

interface FloatingText { text: PIXI.Text; active: boolean; }
interface Spark { gfx: PIXI.Graphics; active: boolean; vx: number; vy: number; life: number; maxLife: number; }
interface AmbientDust { gfx: PIXI.Graphics; vx: number; vy: number; life: number; maxLife: number; }

class VFXSystemClass {
  private _floats: FloatingText[] = [];
  private _sparks: Spark[] = [];
  private _dusts: AmbientDust[] = [];
  private _world: PIXI.Container | null = null;
  private _hud: PIXI.Container | null = null;

  // HUD 层
  private _hurtVignette: PIXI.Graphics | null = null;
  private _permaVignette: PIXI.Graphics | null = null;
  private _warningText: PIXI.Text | null = null;
  private _comboText: PIXI.Text | null = null;

  // 世界层
  private _aimLine: PIXI.Graphics | null = null;
  private _muzzleFlash: PIXI.Graphics | null = null;
  private _bloodLayer: PIXI.Graphics | null = null;

  // 状态
  private _muzzleTimer = 0;
  private _comboCount = 0;
  private _comboTimer = 0;

  /** hitstop 剩余帧数（逻辑帧冻结用） */
  hitstopFrames = 0;

  init(worldContainer: PIXI.Container, hudContainer: PIXI.Container): void {
    this._world = worldContainer;
    this._hud = hudContainer;

    // 血迹层（最底层）
    this._bloodLayer = new PIXI.Graphics();
    this._bloodLayer.eventMode = 'none';
    worldContainer.addChildAt(this._bloodLayer, 0);

    // 瞄准线
    this._aimLine = new PIXI.Graphics();
    this._aimLine.eventMode = 'none';
    worldContainer.addChild(this._aimLine);

    // 枪口闪光
    this._muzzleFlash = new PIXI.Graphics();
    this._muzzleFlash.visible = false;
    this._muzzleFlash.eventMode = 'none';
    worldContainer.addChild(this._muzzleFlash);

    // 飘字池
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new PIXI.Text('', { fontSize: 22, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'Arial', stroke: 0x000000, strokeThickness: 3 });
      t.anchor.set(0.5); t.visible = false; t.eventMode = 'none';
      worldContainer.addChild(t);
      this._floats.push({ text: t, active: false });
    }

    // 火花池（通用：命中/爆散/扬尘/拖尾）
    for (let i = 0; i < SPARK_POOL; i++) {
      const g = new PIXI.Graphics();
      g.visible = false; g.eventMode = 'none';
      worldContainer.addChild(g);
      this._sparks.push({ gfx: g, active: false, vx: 0, vy: 0, life: 0, maxLife: 0.3 });
    }

    // 环境浮尘
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const g = new PIXI.Graphics();
      const s = 1 + Math.random() * 1.5;
      g.beginFill(0xaaaacc, 0.2 + Math.random() * 0.15);
      g.drawCircle(0, 0, s);
      g.endFill();
      g.eventMode = 'none';
      g.visible = false;
      worldContainer.addChild(g);
      this._dusts.push({ gfx: g, vx: 0, vy: 0, life: 0, maxLife: 0 });
    }

    // 受击红边
    this._hurtVignette = new PIXI.Graphics();
    this._hurtVignette.alpha = 0;
    this._hurtVignette.eventMode = 'none';
    hudContainer.addChild(this._hurtVignette);
    this._drawHurtVignette();

    // 常驻暗角（氛围用，始终显示）
    this._permaVignette = new PIXI.Graphics();
    this._permaVignette.eventMode = 'none';
    hudContainer.addChild(this._permaVignette);
    this._drawPermaVignette();

    // 危险警告
    this._warningText = new PIXI.Text('', { fontSize: 44, fontWeight: 'bold', fill: 0xff4444, fontFamily: 'Arial', stroke: 0x000000, strokeThickness: 4 });
    this._warningText.anchor.set(0.5);
    this._warningText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.18);
    this._warningText.visible = false;
    this._warningText.eventMode = 'none';
    hudContainer.addChild(this._warningText);

    // 连杀提示
    this._comboText = new PIXI.Text('', { fontSize: 36, fontWeight: 'bold', fill: 0xff8844, fontFamily: 'Arial', stroke: 0x000000, strokeThickness: 4 });
    this._comboText.anchor.set(0.5);
    this._comboText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.32);
    this._comboText.visible = false;
    this._comboText.eventMode = 'none';
    hudContainer.addChild(this._comboText);
  }

  // ═══════════════ 伤害飘字 ═══════════════

  showDamage(x: number, y: number, amount: number, color = 0xffffff): void {
    const ft = this._floats.find(f => !f.active);
    if (!ft) return;
    ft.active = true;
    ft.text.text = `-${Math.ceil(amount)}`;
    ft.text.style.fill = color;
    ft.text.position.set(x + (Math.random() - 0.5) * 24, y - 12);
    ft.text.alpha = 1;
    ft.text.scale.set(0.6);
    ft.text.visible = true;
    const sy = ft.text.y;
    TweenManager.to({ target: ft.text, duration: 0.5, ease: Ease.easeOutQuad, props: { y: sy - 45 },
      onUpdate: () => { ft.text.alpha = Math.max(0, 1 - (sy - ft.text.y) / -45 * 0.7); },
      onComplete: () => { ft.text.visible = false; ft.active = false; },
    });
  }

  showCoinPickup(x: number, y: number, amount: number): void {
    const ft = this._floats.find(f => !f.active);
    if (!ft) return;
    ft.active = true;
    ft.text.text = `+${amount}`;
    ft.text.style.fill = 0x44ff66;
    ft.text.position.set(x, y - 20);
    ft.text.alpha = 1;
    ft.text.scale.set(0.3);
    ft.text.visible = true;
    TweenManager.to({ target: ft.text.scale, duration: 0.15, ease: Ease.easeOutBack, props: { x: 1.1, y: 1.1 } });
    const sy = ft.text.y;
    TweenManager.to({ target: ft.text, duration: 0.9, ease: Ease.easeOutQuad, props: { y: sy - 55 },
      onUpdate: () => { const p = (sy - ft.text.y) / 55; ft.text.alpha = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5); },
      onComplete: () => { ft.text.visible = false; ft.active = false; },
    });
  }

  // ═══════════════ 火花/粒子 ═══════════════

  spawnSparks(x: number, y: number, count: number, color = 0xffdd44, speedMul = 1): void {
    for (let i = 0; i < count; i++) {
      const sp = this._sparks.find(s => !s.active);
      if (!sp) break;
      sp.active = true;
      const a = Math.random() * Math.PI * 2;
      const spd = (60 + Math.random() * 120) * speedMul;
      sp.vx = Math.cos(a) * spd;
      sp.vy = Math.sin(a) * spd;
      sp.maxLife = 0.15 + Math.random() * 0.2;
      sp.life = sp.maxLife;
      const sz = 1.5 + Math.random() * 2;
      sp.gfx.clear();
      sp.gfx.beginFill(color); sp.gfx.drawCircle(0, 0, sz); sp.gfx.endFill();
      sp.gfx.position.set(x, y);
      sp.gfx.alpha = 1;
      sp.gfx.visible = true;
    }
  }

  /** 死亡爆散（大量粒子 + 不同大小） */
  spawnDeathExplosion(x: number, y: number, color: number): void {
    this.spawnSparks(x, y, 12, color, 1.8);
    this.spawnSparks(x, y, 6, 0xffffff, 0.8);
    this.hitstopFrames = 3;
  }

  /** 地面血迹 */
  addBloodSplatter(x: number, y: number, color: number): void {
    if (!this._bloodLayer) return;
    const g = this._bloodLayer;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 20;
      const oy = (Math.random() - 0.5) * 20;
      const r = 2 + Math.random() * 4;
      g.beginFill(color, 0.3 + Math.random() * 0.2);
      g.drawCircle(x + ox, y + oy, r);
      g.endFill();
    }
  }

  // ═══════════════ 枪口闪光 ═══════════════

  showMuzzleFlash(x: number, y: number, angle: number): void {
    if (!this._muzzleFlash) return;
    const g = this._muzzleFlash;
    g.clear();
    const len = 14, w = 6;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const ox = x + dx * 20, oy = y + dy * 20;
    g.beginFill(0xffee88, 0.9);
    g.moveTo(ox, oy);
    g.lineTo(ox + dx * len - dy * w, oy + dy * len + dx * w);
    g.lineTo(ox + dx * len + dy * w, oy + dy * len - dx * w);
    g.closePath();
    g.endFill();
    g.beginFill(0xffffff, 0.7);
    g.drawCircle(ox, oy, 5);
    g.endFill();
    g.visible = true;
    this._muzzleTimer = 0.06;
  }

  // ═══════════════ 瞄准线 ═══════════════

  drawAimLine(px: number, py: number, tx: number, ty: number): void {
    if (!this._aimLine) return;
    this._aimLine.clear();
    this._aimLine.lineStyle(1, 0xff4444, 0.2);
    this._aimLine.moveTo(px, py);
    this._aimLine.lineTo(tx, ty);
    // 目标十字
    this._aimLine.lineStyle(1, 0xff4444, 0.35);
    this._aimLine.drawCircle(tx, ty, 6);
    this._aimLine.moveTo(tx - 8, ty); this._aimLine.lineTo(tx + 8, ty);
    this._aimLine.moveTo(tx, ty - 8); this._aimLine.lineTo(tx, ty + 8);
  }

  clearAimLine(): void {
    if (this._aimLine) this._aimLine.clear();
  }

  // ═══════════════ 移动扬尘 ═══════════════

  spawnMoveDust(x: number, y: number): void {
    const sp = this._sparks.find(s => !s.active);
    if (!sp) return;
    sp.active = true;
    sp.vx = (Math.random() - 0.5) * 20;
    sp.vy = -10 - Math.random() * 20;
    sp.maxLife = 0.25;
    sp.life = sp.maxLife;
    sp.gfx.clear();
    sp.gfx.beginFill(0x888899, 0.3);
    sp.gfx.drawCircle(0, 0, 2 + Math.random());
    sp.gfx.endFill();
    sp.gfx.position.set(x + (Math.random() - 0.5) * 10, y + 12);
    sp.gfx.alpha = 0.4;
    sp.gfx.visible = true;
  }

  // ═══════════════ 子弹拖影 ═══════════════

  spawnBulletTrail(x: number, y: number, color: number): void {
    const sp = this._sparks.find(s => !s.active);
    if (!sp) return;
    sp.active = true;
    sp.vx = 0; sp.vy = 0;
    sp.maxLife = 0.1;
    sp.life = sp.maxLife;
    sp.gfx.clear();
    sp.gfx.beginFill(color, 0.4);
    sp.gfx.drawCircle(0, 0, 2);
    sp.gfx.endFill();
    sp.gfx.position.set(x, y);
    sp.gfx.alpha = 0.4;
    sp.gfx.visible = true;
  }

  // ═══════════════ HUD 特效 ═══════════════

  flashHurt(): void {
    if (!this._hurtVignette) return;
    this._hurtVignette.alpha = 0.7;
    TweenManager.cancelTarget(this._hurtVignette);
    TweenManager.to({ target: this._hurtVignette, duration: 0.35, ease: Ease.easeOutQuad, props: { alpha: 0 } });
  }

  /** 更新常驻暗角颜色（危险度高时边缘变红） */
  updatePermaVignette(dangerLevel: number): void {
    if (!this._permaVignette) return;
    this._permaVignette.clear();
    const w = Game.logicWidth, h = Game.logicHeight;
    const t = 80;
    const baseAlpha = 0.2 + dangerLevel * 0.08;
    const color = dangerLevel >= 3 ? 0x440000 : dangerLevel >= 2 ? 0x220000 : 0x000000;
    this._permaVignette.beginFill(color, baseAlpha);
    this._permaVignette.drawRect(0, 0, w, t); // 上
    this._permaVignette.drawRect(0, h - t, w, t); // 下
    this._permaVignette.drawRect(0, t, t, h - t * 2); // 左
    this._permaVignette.drawRect(w - t, t, t, h - t * 2); // 右
    this._permaVignette.endFill();
  }

  showDangerWarning(label: string): void {
    if (!this._warningText) return;
    this._warningText.text = `${label}`;
    this._warningText.visible = true;
    this._warningText.alpha = 1;
    this._warningText.scale.set(0.5);
    TweenManager.cancelTarget(this._warningText);
    TweenManager.cancelTarget(this._warningText.scale);
    TweenManager.to({ target: this._warningText.scale, duration: 0.25, ease: Ease.easeOutBack, props: { x: 1.2, y: 1.2 } });
    TweenManager.to({ target: this._warningText, duration: 2.0, ease: Ease.linear, props: { alpha: 0 }, delay: 1.0,
      onComplete: () => { if (this._warningText) this._warningText.visible = false; },
    });
  }

  /** 波次预告："下一波敌人 xN" */
  showWavePreview(waveNum: number, enemyCount: number): void {
    if (!this._warningText) return;
    this._warningText.text = `第${waveNum}波  ×${enemyCount}`;
    (this._warningText.style as PIXI.TextStyle).fill = 0xff4444;
    this._warningText.visible = true;
    this._warningText.alpha = 1;
    this._warningText.scale.set(0.3);
    TweenManager.cancelTarget(this._warningText);
    TweenManager.cancelTarget(this._warningText.scale);
    TweenManager.to({ target: this._warningText.scale, duration: 0.35, ease: Ease.easeOutBack, props: { x: 1.1, y: 1.1 } });
  }

  /** 隐藏波次预告 */
  hideWavePreview(): void {
    if (!this._warningText) return;
    TweenManager.cancelTarget(this._warningText);
    TweenManager.to({ target: this._warningText, duration: 0.3, ease: Ease.easeOutQuad, props: { alpha: 0 },
      onComplete: () => { if (this._warningText) this._warningText.visible = false; },
    });
  }

  /** 波次清场提示 */
  showWaveClear(): void {
    if (!this._warningText) return;
    this._warningText.text = 'WAVE CLEAR!';
    (this._warningText.style as PIXI.TextStyle).fill = 0x44ff44;
    this._warningText.visible = true;
    this._warningText.alpha = 1;
    this._warningText.scale.set(0.6);
    TweenManager.cancelTarget(this._warningText);
    TweenManager.cancelTarget(this._warningText.scale);
    TweenManager.to({ target: this._warningText.scale, duration: 0.3, ease: Ease.easeOutBack, props: { x: 1.3, y: 1.3 } });
    TweenManager.to({ target: this._warningText, duration: 1.5, ease: Ease.linear, props: { alpha: 0 }, delay: 1.0,
      onComplete: () => { if (this._warningText) this._warningText.visible = false; },
    });
  }

  // ═══════════════ 连杀系统 ═══════════════

  addKill(): void {
    this._comboCount++;
    this._comboTimer = 3;
    if (this._comboCount >= 2 && this._comboText) {
      this._comboText.text = `x${this._comboCount} KILL!`;
      this._comboText.visible = true;
      this._comboText.alpha = 1;
      this._comboText.scale.set(0.4);
      TweenManager.cancelTarget(this._comboText.scale);
      TweenManager.to({ target: this._comboText.scale, duration: 0.2, ease: Ease.easeOutBack, props: { x: 1, y: 1 } });
    }
  }

  // ═══════════════ 每帧更新 ═══════════════

  update(dt: number, playerX = 0, playerY = 0): void {
    // 火花
    for (const sp of this._sparks) {
      if (!sp.active) continue;
      sp.life -= dt;
      if (sp.life <= 0) { sp.active = false; sp.gfx.visible = false; continue; }
      sp.gfx.x += sp.vx * dt;
      sp.gfx.y += sp.vy * dt;
      sp.vy += 180 * dt;
      sp.gfx.alpha = Math.max(0, sp.life / sp.maxLife);
    }

    // 枪口闪光衰减
    if (this._muzzleTimer > 0) {
      this._muzzleTimer -= dt;
      if (this._muzzleTimer <= 0 && this._muzzleFlash) this._muzzleFlash.visible = false;
    }

    // 环境浮尘
    for (const d of this._dusts) {
      d.life -= dt;
      if (d.life <= 0) {
        d.gfx.visible = true;
        d.gfx.position.set(playerX + (Math.random() - 0.5) * TILE * 10, playerY + (Math.random() - 0.5) * TILE * 10);
        d.vx = (Math.random() - 0.5) * 8;
        d.vy = -2 - Math.random() * 5;
        d.maxLife = 3 + Math.random() * 4;
        d.life = d.maxLife;
      }
      d.gfx.x += d.vx * dt;
      d.gfx.y += d.vy * dt;
      const ratio = d.life / d.maxLife;
      d.gfx.alpha = ratio < 0.3 ? ratio / 0.3 * 0.3 : ratio > 0.7 ? (1 - ratio) / 0.3 * 0.3 : 0.3;
    }

    // 连杀计时
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        this._comboCount = 0;
        if (this._comboText) this._comboText.visible = false;
      } else if (this._comboText && this._comboText.visible && this._comboTimer < 1) {
        this._comboText.alpha = this._comboTimer;
      }
    }
  }

  // ═══════════════ 内部绘制 ═══════════════

  private _drawHurtVignette(): void {
    if (!this._hurtVignette) return;
    const w = Game.logicWidth, h = Game.logicHeight, t = 70;
    this._hurtVignette.clear();
    this._hurtVignette.beginFill(0xff0000, 0.8);
    this._hurtVignette.drawRect(0, 0, w, t);
    this._hurtVignette.drawRect(0, h - t, w, t);
    this._hurtVignette.drawRect(0, 0, t, h);
    this._hurtVignette.drawRect(w - t, 0, t, h);
    this._hurtVignette.endFill();
  }

  private _drawPermaVignette(): void {
    this.updatePermaVignette(0);
  }

  destroy(): void {
    for (const f of this._floats) f.text.destroy();
    for (const s of this._sparks) s.gfx.destroy();
    for (const d of this._dusts) d.gfx.destroy();
    this._floats = []; this._sparks = []; this._dusts = [];
    if (this._hurtVignette) { this._hurtVignette.destroy(); this._hurtVignette = null; }
    if (this._permaVignette) { this._permaVignette.destroy(); this._permaVignette = null; }
    if (this._warningText) { this._warningText.destroy(); this._warningText = null; }
    if (this._comboText) { this._comboText.destroy(); this._comboText = null; }
    if (this._aimLine) { this._aimLine.destroy(); this._aimLine = null; }
    if (this._muzzleFlash) { this._muzzleFlash.destroy(); this._muzzleFlash = null; }
    if (this._bloodLayer) { this._bloodLayer.destroy(); this._bloodLayer = null; }
    this._world = null; this._hud = null;
  }
}

export const VFXSystem = new VFXSystemClass();
