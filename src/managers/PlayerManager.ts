/**
 * 横版玩家状态管理 - HP、背包、Buff、武器、无敌帧、重力物理
 */
import * as PIXI from 'pixi.js';
import { TILE, PLAYER_HP, PLAYER_W, PLAYER_H, PLAYER_SPEED,
         PLAYER_SPEED_LOADED, PLAYER_IFRAMES, KNOCKBACK_DIST, SEARCH_DURATION } from '@/config/Constants';
import { WEAPONS, DEFAULT_WEAPON, type WeaponDef } from '@/config/WeaponConfig';
import { type BuffDef, randomBuff } from '@/config/BuffConfig';
import { CollisionSystem, type PhysicsBody } from '@/systems/CollisionSystem';
import { CameraSystem } from '@/systems/CameraSystem';
import { VFXSystem } from '@/systems/VFXSystem';
import { Platform } from '@/core/PlatformService';
import { EventBus } from '@/core/EventBus';

export interface BackpackItem {
  type: 'coin' | 'material' | 'weapon_shard' | 'key';
  id: string;
  count: number;
}

export interface ActiveBuff {
  def: BuffDef;
  stacks: number;
}

const BACKPACK_SIZE = 8;

class PlayerManagerClass {
  /** 中心坐标（兼容旧代码） */
  get x(): number { return this.body.x + this.body.w / 2; }
  set x(v: number) { this.body.x = v - this.body.w / 2; }
  get y(): number { return this.body.y + this.body.h / 2; }
  set y(v: number) { this.body.y = v - this.body.h / 2; }

  body: PhysicsBody = {
    x: 0, y: 0, vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    onGround: false, onLadder: false, climbing: false,
  };

  facingRight = true;

  hp = PLAYER_HP;
  maxHp = PLAYER_HP;
  alive = true;
  sprite: PIXI.Graphics | null = null;

  weapon: WeaponDef = WEAPONS[DEFAULT_WEAPON];
  fireCooldown = 0;

  backpack: (BackpackItem | null)[] = Array(BACKPACK_SIZE).fill(null);
  backpackCount = 0;

  iframeTimer = 0;
  searchTarget: { gx: number; gy: number } | null = null;
  searchProgress = 0;

  activeBuffs: ActiveBuff[] = [];
  atkMultiplier = 1;
  defMultiplier = 1;
  spdMultiplier = 1;
  searchSpeedMul = 1;
  isLucky = false;

  slowTimer = 0;
  slowFactor = 1;

  reset(spawnX: number, spawnY: number): void {
    this.body.x = spawnX - PLAYER_W / 2;
    this.body.y = spawnY - PLAYER_H / 2;
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.onGround = false;
    this.body.onLadder = false;
    this.body.climbing = false;
    this.facingRight = true;
    this.hp = PLAYER_HP;
    this.maxHp = PLAYER_HP;
    this.alive = true;
    this.iframeTimer = 0;
    this.fireCooldown = 0;
    this.weapon = WEAPONS[DEFAULT_WEAPON];
    this.backpack = Array(BACKPACK_SIZE).fill(null);
    this.backpackCount = 0;
    this.searchTarget = null;
    this.searchProgress = 0;
    this.activeBuffs = [];
    this.atkMultiplier = 1;
    this.defMultiplier = 1;
    this.spdMultiplier = 1;
    this.searchSpeedMul = 1;
    this.isLucky = false;
    this.slowTimer = 0;
    this.slowFactor = 1;
  }

  get speed(): number {
    const base = this.backpackCount >= BACKPACK_SIZE ? PLAYER_SPEED_LOADED : PLAYER_SPEED;
    return base * this.spdMultiplier * this.slowFactor;
  }

  get effectiveSearchDuration(): number {
    return SEARCH_DURATION / this.searchSpeedMul;
  }

  /** 横版移动：设置水平速度 */
  moveHorizontal(dir: number): void {
    this.body.vx = dir * this.speed;
    if (dir > 0) this.facingRight = true;
    else if (dir < 0) this.facingRight = false;
  }

  /** 梯子攀爬 - 立即抓住梯子并清除下落速度 */
  climbVertical(dir: number): void {
    if (this.body.onLadder) {
      if (!this.body.climbing) {
        this.body.vy = 0;
      }
      this.body.climbing = true;
      this.body.vy = dir * this.speed * 0.7;
    } else {
      this.body.climbing = false;
    }
  }

  /** 停止攀爬 */
  stopClimb(): void {
    this.body.climbing = false;
  }

  addBuff(buffDef: BuffDef): void {
    const existing = this.activeBuffs.find(b => b.def.id === buffDef.id);
    if (existing) {
      if (existing.stacks < buffDef.maxStack) existing.stacks++;
    } else {
      this.activeBuffs.push({ def: buffDef, stacks: 1 });
    }
    if (buffDef.specialEffect === 'heal_30') {
      this.hp = Math.min(this.maxHp, this.hp + 30);
      VFXSystem.showCoinPickup(this.x, this.y - 20, 30);
    }
    this._recalcBuffStats();
    VFXSystem.spawnSparks(this.x, this.y, 8, buffDef.color, 1);
    EventBus.emit('buff:gained', buffDef);
  }

  gainRandomBuff(): void { this.addBuff(randomBuff()); }

  private _recalcBuffStats(): void {
    let atk = 1, def = 1, spd = 1, searchSpd = 1;
    let lucky = false;
    for (const ab of this.activeBuffs) {
      for (let s = 0; s < ab.stacks; s++) {
        if (ab.def.atkMul) atk *= ab.def.atkMul;
        if (ab.def.defMul) def *= ab.def.defMul;
        if (ab.def.spdMul) spd *= ab.def.spdMul;
        if (ab.def.specialEffect === 'search_speed') searchSpd *= 1.5;
        if (ab.def.specialEffect === 'lucky') lucky = true;
      }
    }
    this.atkMultiplier = atk;
    this.defMultiplier = def;
    this.spdMultiplier = spd;
    this.searchSpeedMul = searchSpd;
    this.isLucky = lucky;
  }

  applySlow(duration: number, factor: number): void {
    this.slowTimer = duration;
    this.slowFactor = factor;
  }

  takeDamage(amount: number, fromX: number, fromY: number): void {
    if (!this.alive || this.iframeTimer > 0) return;
    const realDamage = Math.ceil(amount * this.defMultiplier);
    this.hp -= realDamage;
    this.iframeTimer = PLAYER_IFRAMES;

    // 击退（水平方向为主）
    const dx = this.x - fromX;
    const dir = dx > 0 ? 1 : -1;
    this.body.vx = dir * KNOCKBACK_DIST * 3;
    this.body.vy = -120;

    this.searchTarget = null;
    this.searchProgress = 0;

    CameraSystem.addTrauma(0.35);
    VFXSystem.flashHurt();
    VFXSystem.showDamage(this.x, this.y, realDamage, 0xff4444);
    VFXSystem.spawnSparks(this.x, this.y, 6, 0xff6644);
    Platform.vibrateShort('medium');

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      CameraSystem.addTrauma(0.8);
      EventBus.emit('player:dead');
    } else {
      EventBus.emit('player:hurt');
    }
  }

  pickup(item: BackpackItem): boolean {
    if (item.type === 'coin') return true;
    for (let i = 0; i < BACKPACK_SIZE; i++) {
      const slot = this.backpack[i];
      if (slot && slot.type === item.type && slot.id === item.id) {
        slot.count += item.count;
        return true;
      }
    }
    for (let i = 0; i < BACKPACK_SIZE; i++) {
      if (!this.backpack[i]) {
        this.backpack[i] = { ...item };
        this.backpackCount++;
        return true;
      }
    }
    return false;
  }

  getItemCount(type: string): number {
    let total = 0;
    for (const slot of this.backpack) {
      if (slot && slot.type === type) total += slot.count;
    }
    return total;
  }

  update(dt: number): void {
    if (this.iframeTimer > 0) this.iframeTimer -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    // 物理更新
    CollisionSystem.updateBody(this.body, dt);
    // 离开梯子范围自动解除攀爬
    if (this.body.climbing && !this.body.onLadder) {
      this.body.climbing = false;
    }
  }
}

export const PlayerManager = new PlayerManagerClass();
