/**
 * 横版主动技能系统 - 冲刺/手雷/护盾/急救 + CD管理
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TILE } from '@/config/Constants';
import { SKILLS, type SkillDef } from '@/config/SkillConfig';
import { PlayerManager } from '@/managers/PlayerManager';
import { EnemyManager } from '@/managers/EnemyManager';
import { InputSystem } from './InputSystem';
import { CameraSystem } from './CameraSystem';
import { VFXSystem } from './VFXSystem';
import { Platform } from '@/core/PlatformService';
import { EventBus } from '@/core/EventBus';

const DASH_DISTANCE = 3;
const GRENADE_DAMAGE = 80;
const GRENADE_RANGE = 2;
const SHIELD_DURATION = 3;
const HEAL_AMOUNT = 40;

class SkillSystemClass {
  private _skillDef: SkillDef | null = null;
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
    this._skillDef = SKILLS[skillId] || null;
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
      fontSize: 16, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold',
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
      case 'dash': this._executeDash(); break;
      case 'grenade': this._executeGrenade(); break;
      case 'shield': this._executeShield(); break;
      case 'heal': this._executeHeal(); break;
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
        const speed = DASH_DISTANCE * TILE / this._dashDuration * dt;
        PlayerManager.body.vx = this._dashVx * speed / dt;
        VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 2, 0x33ccff, 0.5);
      }
    }
  }

  private _executeDash(): void {
    // 横版冲刺：仅水平方向
    const dir = PlayerManager.facingRight ? 1 : -1;
    if (Math.abs(InputSystem.input.moveX) > 0.3) {
      this._dashVx = InputSystem.input.moveX > 0 ? 1 : -1;
    } else {
      this._dashVx = dir;
    }
    this._dashing = true;
    this._dashTimer = this._dashDuration;
    PlayerManager.iframeTimer = this._dashDuration + 0.1;
    CameraSystem.addTrauma(0.15);
    VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 8, 0x33ccff, 1.5);
  }

  private _executeGrenade(): void {
    const px = PlayerManager.x, py = PlayerManager.y;
    const throwDist = 3 * TILE;
    const dir = PlayerManager.facingRight ? 1 : -1;
    const tx = px + dir * throwDist;
    const ty = py;

    VFXSystem.spawnSparks(tx, ty, 15, 0xff8844, 2);
    VFXSystem.spawnSparks(tx, ty, 8, 0xffdd44, 1.5);
    CameraSystem.addTrauma(0.4);
    VFXSystem.hitstopFrames = 4;

    const rangePx = GRENADE_RANGE * TILE;
    for (const e of EnemyManager.activeEnemies) {
      const edx = e.x - tx, edy = e.y - ty;
      if (edx * edx + edy * edy < rangePx * rangePx) {
        EnemyManager.damageEnemy(e, GRENADE_DAMAGE);
        if (e.hp <= 0) {
          VFXSystem.spawnDeathExplosion(e.x, e.y, e.def.color);
          VFXSystem.addBloodSplatter(e.x, e.y, 0x661111);
          VFXSystem.addKill();
        }
      }
    }
  }

  private _executeShield(): void {
    this.shieldActive = true;
    this._shieldTimer = SHIELD_DURATION;
    PlayerManager.iframeTimer = SHIELD_DURATION;
    VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 10, 0x44aaff, 1.2);
  }

  private _executeHeal(): void {
    PlayerManager.hp = Math.min(PlayerManager.maxHp, PlayerManager.hp + HEAL_AMOUNT);
    VFXSystem.showCoinPickup(PlayerManager.x, PlayerManager.y - 20, HEAL_AMOUNT);
    VFXSystem.spawnSparks(PlayerManager.x, PlayerManager.y, 8, 0x44ff88, 1);
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
