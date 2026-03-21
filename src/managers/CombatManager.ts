/**
 * 横版战斗管理器 - 自动射击 + 碰撞 + 全套特效
 */
import { TILE, AIM_LOCK_COOLDOWN, BULLET_RADIUS, PLAYER_W, PLAYER_H } from '@/config/Constants';
import { PlayerManager } from './PlayerManager';
import { EnemyManager, type Enemy } from './EnemyManager';
import { BulletManager } from './BulletManager';
import { RunManager } from './RunManager';
import { LootManager } from './LootManager';
import { CollisionSystem } from '@/systems/CollisionSystem';
import { CameraSystem } from '@/systems/CameraSystem';
import { VFXSystem } from '@/systems/VFXSystem';
import { Platform } from '@/core/PlatformService';
import { EventBus } from '@/core/EventBus';

const PLAYER_HIT_RADIUS = Math.max(PLAYER_W, PLAYER_H) / 2;

class CombatManagerClass {
  private _lockTarget: Enemy | null = null;
  private _lockCooldown = 0;

  get currentTarget(): Enemy | null { return this._lockTarget; }

  init(): void {
    EventBus.on('enemy:shoot', (ex: number, ey: number, px: number, py: number, dmg: number, range: number) => {
      BulletManager.fire(ex, ey, px, py, dmg, range, false);
    });
  }

  update(dt: number): void {
    if (!PlayerManager.alive) { VFXSystem.clearAimLine(); return; }

    this._lockCooldown -= dt;
    this._autoShoot(dt);

    const enemies = EnemyManager.activeEnemies;
    for (const b of BulletManager.activeBullets) {
      if (!b.active) continue;

      if (b.isPlayerBullet) {
        for (const e of enemies) {
          const dx = b.x - e.x, dy = b.y - e.y;
          const hitDist = BULLET_RADIUS + e.def.radius;
          if (dx * dx + dy * dy < hitDist * hitDist) {
            VFXSystem.showDamage(e.x, e.y - e.def.radius, b.damage, 0xffdd44);
            VFXSystem.spawnSparks(b.x, b.y, 5, 0xffaa22);

            const wasAlive = e.hp > 0;
            EnemyManager.damageEnemy(e, b.damage);
            if (wasAlive && e.hp <= 0) {
              VFXSystem.spawnDeathExplosion(e.x, e.y, e.def.color);
              VFXSystem.addBloodSplatter(e.x, e.y, 0x661111);
              VFXSystem.addKill();
              CameraSystem.addTrauma(0.2);
              RunManager.totalKills++;
              LootManager.spawnEnemyDrop(e.x, e.y);
            }

            BulletManager.deactivateBullet(b);
            break;
          }
        }
      } else {
        const dx = b.x - PlayerManager.x, dy = b.y - PlayerManager.y;
        const hitDist = BULLET_RADIUS + PLAYER_HIT_RADIUS;
        if (dx * dx + dy * dy < hitDist * hitDist) {
          PlayerManager.takeDamage(b.damage, b.x, b.y);
          BulletManager.deactivateBullet(b);
        }
      }
    }

    if (this._lockTarget && this._lockTarget.active) {
      VFXSystem.drawAimLine(PlayerManager.x, PlayerManager.y, this._lockTarget.x, this._lockTarget.y);
    } else {
      VFXSystem.clearAimLine();
    }
  }

  private _autoShoot(_dt: number): void {
    const weapon = PlayerManager.weapon;
    if (PlayerManager.fireCooldown > 0) return;

    const px = PlayerManager.x, py = PlayerManager.y;
    const rangePx = weapon.range * TILE;

    const candidates: { enemy: Enemy; dist: number }[] = [];
    for (const e of EnemyManager.activeEnemies) {
      const dx = e.x - px, dy = e.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= rangePx && CollisionSystem.lineOfSight(px, py, e.x, e.y)) {
        candidates.push({ enemy: e, dist });
      }
    }

    if (candidates.length === 0) {
      this._lockTarget = null;
      return;
    }

    let target: Enemy;
    if (this._lockTarget && this._lockCooldown > 0 && candidates.find(c => c.enemy === this._lockTarget)) {
      target = this._lockTarget;
    } else {
      candidates.sort((a, b) => a.dist - b.dist);
      target = candidates[0].enemy;
      if (target !== this._lockTarget) {
        this._lockTarget = target;
        this._lockCooldown = AIM_LOCK_COOLDOWN;
      }
    }

    const dmg = weapon.damage * PlayerManager.atkMultiplier;
    const angle = Math.atan2(target.y - py, target.x - px);

    if (weapon.bulletCount > 1) {
      const step = weapon.spreadAngle / (weapon.bulletCount - 1);
      const startAngle = angle - weapon.spreadAngle / 2;
      for (let i = 0; i < weapon.bulletCount; i++) {
        const a = startAngle + step * i;
        BulletManager.fire(px, py, px + Math.cos(a) * rangePx, py + Math.sin(a) * rangePx, dmg, weapon.range, true);
      }
    } else {
      BulletManager.fire(px, py, target.x, target.y, dmg, weapon.range, true);
    }

    VFXSystem.showMuzzleFlash(px, py, angle);
    CameraSystem.addTrauma(0.04);
    Platform.vibrateShort('light');
    PlayerManager.fireCooldown = 1 / weapon.fireRate;
  }

  destroy(): void {
    this._lockTarget = null;
  }
}

export const CombatManager = new CombatManagerClass();
