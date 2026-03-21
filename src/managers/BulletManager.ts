/**
 * 子弹管理器 - 对象池 + 发光拖尾效果
 */
import * as PIXI from 'pixi.js';
import { TILE, BULLET_RADIUS, BULLET_SPEED, BULLET_POOL_SIZE } from '@/config/Constants';
import { CollisionSystem } from '@/systems/CollisionSystem';
import { VFXSystem } from '@/systems/VFXSystem';

interface Bullet {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  life: number;
  gfx: PIXI.Graphics;
  isPlayerBullet: boolean;
}

const PLAYER_BULLET_COLOR = 0xffdd44;
const ENEMY_BULLET_COLOR = 0xff4444;

class BulletManagerClass {
  private _pool: Bullet[] = [];
  private _container: PIXI.Container | null = null;

  init(container: PIXI.Container): void {
    this._container = container;
    this._pool = [];
    for (let i = 0; i < BULLET_POOL_SIZE; i++) {
      const gfx = new PIXI.Graphics();
      gfx.visible = false;
      gfx.eventMode = 'none';
      container.addChild(gfx);
      this._pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, life: 0, gfx, isPlayerBullet: true });
    }
  }

  fire(x: number, y: number, targetX: number, targetY: number, damage: number, range: number, isPlayerBullet: boolean): void {
    const bullet = this._pool.find(b => !b.active);
    if (!bullet) return;

    const dx = targetX - x, dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const speedPx = BULLET_SPEED * TILE;
    bullet.active = true;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = (dx / dist) * speedPx;
    bullet.vy = (dy / dist) * speedPx;
    bullet.damage = damage;
    bullet.life = range / BULLET_SPEED;
    bullet.isPlayerBullet = isPlayerBullet;

    const color = isPlayerBullet ? PLAYER_BULLET_COLOR : ENEMY_BULLET_COLOR;
    this._drawBullet(bullet.gfx, color);
    bullet.gfx.visible = true;
    bullet.gfx.position.set(x, y);
  }

  private _trailTimer = 0;

  update(dt: number): void {
    this._trailTimer += dt;
    const spawnTrail = this._trailTimer > 0.03;
    if (spawnTrail) this._trailTimer = 0;

    for (const b of this._pool) {
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.gfx.position.set(b.x, b.y);

      if (spawnTrail) {
        VFXSystem.spawnBulletTrail(b.x, b.y, b.isPlayerBullet ? PLAYER_BULLET_COLOR : ENEMY_BULLET_COLOR);
      }

      if (b.life <= 0 || CollisionSystem.collides(b.x, b.y, BULLET_RADIUS)) {
        this._deactivate(b);
      }
    }
  }

  get activeBullets(): Bullet[] {
    return this._pool.filter(b => b.active);
  }

  deactivateBullet(b: Bullet): void {
    this._deactivate(b);
  }

  private _deactivate(b: Bullet): void {
    b.active = false;
    b.gfx.visible = false;
  }

  private _drawBullet(gfx: PIXI.Graphics, color: number): void {
    gfx.clear();
    gfx.beginFill(color, 0.3);
    gfx.drawCircle(0, 0, BULLET_RADIUS + 3);
    gfx.endFill();
    gfx.beginFill(color);
    gfx.drawCircle(0, 0, BULLET_RADIUS + 1);
    gfx.endFill();
    gfx.beginFill(0xffffff, 0.8);
    gfx.drawCircle(0, 0, 1.5);
    gfx.endFill();
  }

  destroy(): void {
    for (const b of this._pool) b.gfx.destroy();
    this._pool = [];
    this._container = null;
  }
}

export const BulletManager = new BulletManagerClass();
