/**
 * 三国武将技能系统 - 专属主动技 + CD管理
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TILE } from '@/config/Constants';
import { ACTIVE_SKILLS, type ActiveSkillDef } from '@/config/SkillConfig';
import { PlayerManager } from '@/managers/PlayerManager';
import { EnemyManager } from '@/managers/EnemyManager';
import { InputSystem } from './InputSystem';
import { CameraSystem } from './CameraSystem';
import { VFXSystem } from './VFXSystem';
import { Platform } from '@/core/PlatformService';
import { EventBus } from '@/core/EventBus';

class SkillSystemClass {
  private _skillDef: ActiveSkillDef | null = null;
  private _cooldown = 0;
  private _button: PIXI.Container | null = null;
  private _btnBg: PIXI.Graphics | null = null;
  private _cdOverlay: PIXI.Graphics | null = null;
  private _btnText: PIXI.Text | null = null;
  private _hudContainer: PIXI.Container | null = null;

  shieldActive = false;
  private _shieldTimer = 0;

  private _dashing = false;
  private _dashVx = 0;
  private _dashTimer = 0;
  private _dashDuration = 0.15;

  init(hudContainer: PIXI.Container, skillId: string): void {
    this._hudContainer = hudContainer;
    this._skillDef = ACTIVE_SKILLS[skillId] || null;
    this._cooldown = 0;
    this.shieldActive = false;
    this._shieldTimer = 0;
    this._dashing = false;

    if (!this._skillDef) return;

    this._button = new PIXI.Container();
    this._button.position.set(Game.logicWidth - 90, Game.logicHeight - 160);
    this._button.eventMode = 'static';
    this._button.on('pointerdown', () => this.activate());

    this._btnBg = new PIXI.Graphics();
    this._btnBg.beginFill(this._skillDef.color, 0.7);
    this._btnBg.drawCircle(0, 0, 32);
    this._btnBg.endFill();
    this._btnBg.lineStyle(2, 0xffffff, 0.5);
    this._btnBg.drawCircle(0, 0, 32);
    this._button.addChild(this._btnBg);

    this._cdOverlay = new PIXI.Graphics();
    this._cdOverlay.eventMode = 'none';
    this._button.addChild(this._cdOverlay);

    this._btnText = new PIXI.Text(this._skillDef.name, {
      fontSize: 14, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold',
    });
    this._btnText.anchor.set(0.5);
    this._btnText.eventMode = 'none';
    this._button.addChild(this._btnText);

    hudContainer.addChild(this._button);
  }

  activate(): void {
    if (!this._skillDef || this._cooldown > 0 || !PlayerManager.alive) return;
    this._cooldown = this._skillDef.cooldown;
    Platform.vibrateShort('medium');

    switch (this._skillDef.id) {
      case 'qijinqichu': this._executeQijinqichu(); break;
      case 'qinglongduanyue': this._executeQinglongduanyue(); break;
      case 'dash': this._executeDash(); break;
      default: this._executeDash(); break;
    }
    EventBus.emit('skill:used', this._skillDef.id);
  }

  update(dt: number): void {
    if (this._cooldown > 0) {
      this._cooldown = Math.max(0, this._cooldown - dt);
      this._drawCD();
    }
    if (this.shieldActive) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) this.shieldActive = false;
    }
    if (this._dashing) {
      this._dashTimer -= dt;
      if (this._dashTimer <= 0) {
        this._dashing = false;
        PlayerManager.iframeTimer = 0;
      } else {
        const speed = this._dashDuration > 0
          ? (this._skillDef?.range || 3 * TILE) / this._dashDuration * dt
          : 0;
        PlayerManager.body.vx = this._dashVx * speed / dt;
        VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 2, this._skillDef?.color || 0x33ccff, 0.5);
      }
    }

    // 被动技能 - 武圣：低血量攻击加成
    const passive = PlayerManager.heroDef.passiveSkill;
    if (passive === 'wusheng') {
      const hpRatio = PlayerManager.hp / PlayerManager.maxHp;
      if (hpRatio < 0.3) {
        PlayerManager.atkMultiplier = Math.max(PlayerManager.atkMultiplier, 1.4);
      }
    }
  }

  /** 赵云 - 七进七出：前冲 + 路径伤害 + 无敌 */
  private _executeQijinqichu(): void {
    const dir = PlayerManager.facingRight ? 1 : -1;
    if (Math.abs(InputSystem.input.moveX) > 0.3) {
      this._dashVx = InputSystem.input.moveX > 0 ? 1 : -1;
    } else {
      this._dashVx = dir;
    }
    this._dashing = true;
    this._dashTimer = this._skillDef?.duration || 0.2;
    this._dashDuration = this._dashTimer;
    PlayerManager.iframeTimer = this._dashTimer + 0.1;
    CameraSystem.addTrauma(0.1);
    VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 10, 0x33ccff, 1.5);

    // 路径上对敌人造成伤害
    const dmg = PlayerManager.effectiveAtk * (this._skillDef?.damageMul || 2);
    const rangePx = this._skillDef?.range || 3 * TILE;
    for (const e of EnemyManager.activeEnemies) {
      const relX = (e.x - PlayerManager.x) * this._dashVx;
      if (relX >= 0 && relX <= rangePx && Math.abs(e.y - PlayerManager.y) <= 40) {
        EnemyManager.damageEnemy(e, dmg);
        VFXSystem.showDamage(e.x, e.y - e.def.radius, dmg, 0x33ccff);
        VFXSystem.spawnSparks(e.x, e.y, 6, 0x33ccff, 1);
      }
    }
  }

  /** 关羽 - 青龙断岳：前方大范围横斩 */
  private _executeQinglongduanyue(): void {
    const px = PlayerManager.x, py = PlayerManager.y;
    const dir = PlayerManager.facingRight ? 1 : -1;
    const dmg = PlayerManager.effectiveAtk * (this._skillDef?.damageMul || 3);
    const rangePx = this._skillDef?.range || 100;

    VFXSystem.spawnSparks(px + dir * 40, py, 15, 0xff6644, 2);
    CameraSystem.addTrauma(0.18);
    VFXSystem.hitstopFrames = 4;

    for (const e of EnemyManager.activeEnemies) {
      const relX = (e.x - px) * dir;
      if (relX >= 0 && relX <= rangePx && Math.abs(e.y - py) <= 60) {
        EnemyManager.damageEnemy(e, dmg);
        VFXSystem.showDamage(e.x, e.y - e.def.radius, dmg, 0xff6644);
        // 击退
        e.physics.vx = dir * 300;
        e.physics.vy = -100;
        if (e.hp <= 0) {
          VFXSystem.spawnDeathExplosion(e.x, e.y, e.def.color);
          VFXSystem.addBloodSplatter(e.x, e.y, 0x661111);
          VFXSystem.addKill();
        }
      }
    }
  }

  /** 通用闪避 */
  private _executeDash(): void {
    const dir = PlayerManager.facingRight ? 1 : -1;
    if (Math.abs(InputSystem.input.moveX) > 0.3) {
      this._dashVx = InputSystem.input.moveX > 0 ? 1 : -1;
    } else {
      this._dashVx = dir;
    }
    this._dashing = true;
    this._dashTimer = 0.15;
    this._dashDuration = 0.15;
    PlayerManager.iframeTimer = 0.25;
    CameraSystem.addTrauma(0.08);
    VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 8, 0xaaaacc, 1.5);
  }

  private _drawCD(): void {
    if (!this._cdOverlay || !this._skillDef) return;
    this._cdOverlay.clear();
    if (this._cooldown <= 0) return;
    const ratio = this._cooldown / this._skillDef.cooldown;
    this._cdOverlay.beginFill(0x000000, 0.6);
    this._cdOverlay.moveTo(0, 0);
    const startAngle = -Math.PI / 2;
    this._cdOverlay.arc(0, 0, 32, startAngle, startAngle + Math.PI * 2 * ratio);
    this._cdOverlay.lineTo(0, 0);
    this._cdOverlay.endFill();
  }

  get isDashing(): boolean { return this._dashing; }

  destroy(): void {
    if (this._button) { this._button.destroy({ children: true }); this._button = null; }
    this._skillDef = null;
    this._hudContainer = null;
    this.shieldActive = false;
    this._dashing = false;
  }
}

export const SkillSystem = new SkillSystemClass();
