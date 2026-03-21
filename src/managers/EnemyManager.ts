/**
 * 横版怪物管理器 - 重力物理 + 平台巡逻 + 追踪AI + 受击闪白 + HP条 + 胖子自爆
 */
import * as PIXI from 'pixi.js';
import { TILE } from '@/config/Constants';
import { ENEMIES, type EnemyDef } from '@/config/EnemyConfig';
import { PlayerManager } from './PlayerManager';
import { CollisionSystem, type PhysicsBody } from '@/systems/CollisionSystem';
import { VFXSystem } from '@/systems/VFXSystem';
import { CameraSystem } from '@/systems/CameraSystem';
import { EventBus } from '@/core/EventBus';

export const enum EnemyState { IDLE, CHASE, ATTACK, DEAD, EXPLODING }

export interface Enemy {
  active: boolean;
  def: EnemyDef;
  /** 中心 x/y（兼容旧代码） */
  x: number; y: number;
  hp: number;
  state: EnemyState;
  attackTimer: number;
  container: PIXI.Container;
  body: PIXI.Graphics;
  hpBar: PIXI.Graphics;
  flashTimer: number;
  /** 物理体 */
  physics: PhysicsBody;
  /** 巡逻方向 */
  patrolDir: number;
  patrolTimer: number;
  /** 胖子自爆蓄力 */
  explodeTimer: number;
  explodeWarning: PIXI.Graphics | null;
  // 保留兼容字段
  pathId: number;
  path: { x: number; y: number }[] | null;
  pathIndex: number;
}

const MAX_ENEMIES = 25;
const FLASH_DURATION = 0.12;
const FATTY_EXPLODE_RANGE = 2;
const FATTY_EXPLODE_CHARGE = 2;
const ELITE_SLOW_DURATION = 2;
const ELITE_SLOW_FACTOR = 0.5;

class EnemyManagerClass {
  private _pool: Enemy[] = [];
  private _parentContainer: PIXI.Container | null = null;

  init(container: PIXI.Container): void {
    this._parentContainer = container;
    this._pool = [];
    const defaultDef = ENEMIES['grunt'];
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const ct = new PIXI.Container();
      ct.visible = false;
      ct.eventMode = 'none';
      const body = new PIXI.Graphics();
      ct.addChild(body);
      const hpBar = new PIXI.Graphics();
      ct.addChild(hpBar);
      container.addChild(ct);

      this._pool.push({
        active: false, def: defaultDef, x: 0, y: 0, hp: 0,
        state: EnemyState.IDLE, attackTimer: 0,
        container: ct, body, hpBar, flashTimer: 0,
        physics: { x: 0, y: 0, vx: 0, vy: 0, w: 24, h: 24, onGround: false, onLadder: false, climbing: false },
        patrolDir: 1, patrolTimer: 0,
        explodeTimer: 0, explodeWarning: null,
        pathId: -1, path: null, pathIndex: 0,
      });
    }
  }

  spawn(typeId: string, gx: number, gy: number): Enemy | null {
    const def = ENEMIES[typeId];
    if (!def) return null;
    const enemy = this._pool.find(e => !e.active);
    if (!enemy) return null;

    const size = def.radius * 2;
    const centerX = gx * TILE + TILE / 2;
    const centerY = gy * TILE + TILE / 2;

    enemy.active = true;
    enemy.def = def;
    enemy.x = centerX;
    enemy.y = centerY;
    enemy.hp = def.hp;
    enemy.state = EnemyState.IDLE;
    enemy.attackTimer = 0;
    enemy.flashTimer = 0;
    enemy.explodeTimer = 0;
    enemy.patrolDir = Math.random() < 0.5 ? 1 : -1;
    enemy.patrolTimer = 2 + Math.random() * 3;

    enemy.physics.x = centerX - size / 2;
    enemy.physics.y = centerY - size / 2;
    enemy.physics.w = size;
    enemy.physics.h = size;
    enemy.physics.vx = 0;
    enemy.physics.vy = 0;
    enemy.physics.onGround = false;
    enemy.physics.onLadder = false;
    enemy.physics.climbing = false;

    enemy.pathId = -1;
    enemy.path = null;
    enemy.pathIndex = 0;

    this._drawBody(enemy, def.color);
    this._drawHpBar(enemy);
    enemy.container.visible = true;
    enemy.container.position.set(enemy.x, enemy.y);

    return enemy;
  }

  update(dt: number): void {
    const px = PlayerManager.x, py = PlayerManager.y;

    for (const e of this._pool) {
      if (!e.active) continue;

      // 闪白衰减
      if (e.flashTimer > 0) {
        e.flashTimer -= dt;
        if (e.flashTimer <= 0) this._drawBody(e, e.def.color);
      }

      const dx = px - e.x, dy = py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const distTiles = dist / TILE;

      switch (e.state) {
        case EnemyState.IDLE:
          this._patrol(e, dt);
          if (distTiles <= e.def.senseRange && PlayerManager.alive) {
            e.state = EnemyState.CHASE;
          }
          break;

        case EnemyState.CHASE: {
          if (distTiles > e.def.chaseRange || !PlayerManager.alive) {
            e.state = EnemyState.IDLE;
            break;
          }
          if (e.def.id === 'fatty' && distTiles <= e.def.attackRange) {
            e.state = EnemyState.EXPLODING;
            e.explodeTimer = FATTY_EXPLODE_CHARGE;
            this._showExplodeWarning(e);
            break;
          }
          if (distTiles <= e.def.attackRange && e.def.id !== 'fatty') {
            e.state = EnemyState.ATTACK;
            e.attackTimer = 0;
            break;
          }
          this._chasePlayer(e, dx, dt);
          break;
        }

        case EnemyState.ATTACK: {
          if (!PlayerManager.alive || distTiles > e.def.attackRange * 1.5) {
            e.state = EnemyState.CHASE;
            break;
          }
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            if (e.def.attackRange <= 1.5) {
              PlayerManager.takeDamage(e.def.damage, e.x, e.y);
              if (e.def.id === 'elite') PlayerManager.applySlow(ELITE_SLOW_DURATION, ELITE_SLOW_FACTOR);
            } else {
              EventBus.emit('enemy:shoot', e.x, e.y, px, py, e.def.damage, e.def.attackRange);
              if (e.def.id === 'elite') PlayerManager.applySlow(ELITE_SLOW_DURATION, ELITE_SLOW_FACTOR);
            }
            e.attackTimer = e.def.attackInterval;
          }
          break;
        }

        case EnemyState.EXPLODING: {
          e.explodeTimer -= dt;
          const flashRate = Math.max(0.05, e.explodeTimer * 0.15);
          if (Math.floor(e.explodeTimer / flashRate) % 2 === 0) {
            this._drawBody(e, 0xff2222);
          } else {
            this._drawBody(e, e.def.color);
          }
          if (e.explodeTimer <= 0) this._explode(e);
          break;
        }
      }

      // 物理更新
      CollisionSystem.updateBody(e.physics, dt);
      e.x = e.physics.x + e.physics.w / 2;
      e.y = e.physics.y + e.physics.h / 2;
      e.container.position.set(e.x, e.y);
    }
  }

  /** 巡逻：在平台上来回走 */
  private _patrol(e: Enemy, dt: number): void {
    e.patrolTimer -= dt;
    if (e.patrolTimer <= 0) {
      e.patrolDir *= -1;
      e.patrolTimer = 2 + Math.random() * 3;
    }
    if (e.physics.onGround) {
      const speed = e.def.speed * TILE * 0.3;
      e.physics.vx = e.patrolDir * speed;
      // 边缘检测：脚下前方是否有地面
      const checkX = e.x + e.patrolDir * (e.physics.w / 2 + 4);
      const checkY = e.physics.y + e.physics.h + 4;
      const gx = Math.floor(checkX / TILE), gy = Math.floor(checkY / TILE);
      if (!CollisionSystem.pointSolid(checkX, checkY) && !this._isPlatformAt(gx, gy)) {
        e.patrolDir *= -1;
        e.patrolTimer = 2 + Math.random() * 2;
        e.physics.vx = 0;
      }
    }
  }

  /** 追踪：向玩家X方向移动 */
  private _chasePlayer(e: Enemy, dx: number, _dt: number): void {
    if (!e.physics.onGround) return;
    const speed = e.def.speed * TILE;
    e.physics.vx = dx > 0 ? speed : -speed;
  }

  private _isPlatformAt(gx: number, gy: number): boolean {
    return !!CollisionSystem.pointSolid(gx * TILE + TILE / 2, gy * TILE + TILE / 2);
  }

  private _explode(e: Enemy): void {
    const rangePx = FATTY_EXPLODE_RANGE * TILE;
    const dx = PlayerManager.x - e.x, dy = PlayerManager.y - e.y;
    if (dx * dx + dy * dy < rangePx * rangePx) {
      PlayerManager.takeDamage(e.def.damage, e.x, e.y);
    }
    VFXSystem.spawnSparks(e.x, e.y, 20, 0xff4422, 2.5);
    VFXSystem.spawnSparks(e.x, e.y, 10, 0xffdd44, 1.5);
    VFXSystem.addBloodSplatter(e.x, e.y, 0x883333);
    CameraSystem.addTrauma(0.5);
    VFXSystem.hitstopFrames = 5;
    e.active = false;
    e.container.visible = false;
    if (e.explodeWarning) e.explodeWarning.visible = false;
    EventBus.emit('enemy:killed', e.x, e.y, e.def.id);
  }

  private _showExplodeWarning(e: Enemy): void {
    if (!e.explodeWarning) {
      e.explodeWarning = new PIXI.Graphics();
      e.explodeWarning.eventMode = 'none';
      e.container.addChild(e.explodeWarning);
    }
    const g = e.explodeWarning;
    g.clear();
    g.lineStyle(2, 0xff2222, 0.5);
    g.drawCircle(0, 0, FATTY_EXPLODE_RANGE * TILE);
    g.visible = true;
  }

  damageEnemy(enemy: Enemy, amount: number): void {
    enemy.hp -= amount;
    enemy.flashTimer = FLASH_DURATION;
    this._drawBody(enemy, 0xffffff);
    this._drawHpBar(enemy);
    if (enemy.hp <= 0) {
      enemy.active = false;
      enemy.container.visible = false;
      EventBus.emit('enemy:killed', enemy.x, enemy.y, enemy.def.id);
    }
  }

  get activeEnemies(): Enemy[] { return this._pool.filter(e => e.active); }
  get aliveCount(): number { return this._pool.filter(e => e.active).length; }

  destroy(): void {
    for (const e of this._pool) e.container.destroy({ children: true });
    this._pool = [];
    this._parentContainer = null;
  }

  private _drawBody(enemy: Enemy, color: number): void {
    const g = enemy.body;
    const r = enemy.def.radius;
    g.clear();
    g.beginFill(color, 0.2);
    g.drawCircle(0, 0, r + 4);
    g.endFill();
    switch (enemy.def.shape) {
      case 'triangle':
        g.beginFill(color);
        g.moveTo(0, -r); g.lineTo(r * 0.87, r * 0.5); g.lineTo(-r * 0.87, r * 0.5); g.closePath();
        g.endFill(); break;
      case 'square':
        g.beginFill(color);
        g.drawRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
        g.endFill(); break;
      case 'diamond':
        g.beginFill(color);
        g.moveTo(0, -r); g.lineTo(r * 0.7, 0); g.lineTo(0, r); g.lineTo(-r * 0.7, 0); g.closePath();
        g.endFill(); break;
      default:
        g.beginFill(color);
        g.drawCircle(0, 0, r);
        g.endFill();
    }
    g.beginFill(0xffffff);
    g.drawCircle(-r * 0.25, -r * 0.15, 2.5);
    g.drawCircle(r * 0.25, -r * 0.15, 2.5);
    g.endFill();
    g.beginFill(0x000000);
    g.drawCircle(-r * 0.25, -r * 0.15, 1.2);
    g.drawCircle(r * 0.25, -r * 0.15, 1.2);
    g.endFill();
  }

  private _drawHpBar(enemy: Enemy): void {
    const g = enemy.hpBar;
    const r = enemy.def.radius;
    const barW = r * 2, barH = 3;
    const ratio = Math.max(0, enemy.hp / enemy.def.hp);
    g.clear();
    if (ratio >= 1) return;
    const yy = -r - 6;
    g.beginFill(0x333333, 0.8);
    g.drawRect(-barW / 2, yy, barW, barH);
    g.endFill();
    const hpColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa44 : 0xff4444;
    g.beginFill(hpColor);
    g.drawRect(-barW / 2, yy, barW * ratio, barH);
    g.endFill();
  }
}

export const EnemyManager = new EnemyManagerClass();
