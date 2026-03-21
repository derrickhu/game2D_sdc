/**
 * 三国战斗管理器 - 自动攻击（近战/远程）+ 碰撞 + 特效
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
    this._autoAttack(dt);

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
              this._onEnemyKilled(e);
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

  private _autoAttack(_dt: number): void {
    if (PlayerManager.fireCooldown > 0) return;

    const px = PlayerManager.x, py = PlayerManager.y;
    const heroDef = PlayerManager.heroDef;
    const rangePx = heroDef.attackRange;

    const candidates: { enemy: Enemy; dist: number }[] = [];
    for (const e of EnemyManager.activeEnemies) {
      const dx = e.x - px, dy = e.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= rangePx) {
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

    const dmg = PlayerManager.effectiveAtk;

    if (heroDef.isRanged) {
      BulletManager.fire(px, py, target.x, target.y, dmg, heroDef.attackRange / TILE, true);
      VFXSystem.showMuzzleFlash(px, py, Math.atan2(target.y - py, target.x - px));
    } else {
      // 近战：直接判定范围内所有敌人
      const atkWidth = heroDef.attackWidth;
      const dir = PlayerManager.facingRight ? 1 : -1;
      let hitAny = false;
      for (const c of candidates) {
        const e = c.enemy;
        const relX = (e.x - px) * dir;
        if (relX >= 0 && relX <= rangePx && Math.abs(e.y - py) <= atkWidth / 2) {
          const wasAlive = e.hp > 0;
          EnemyManager.damageEnemy(e, dmg);
          VFXSystem.showDamage(e.x, e.y - e.def.radius, dmg, 0xffdd44);
          VFXSystem.spawnSparks(e.x, e.y, 4, heroDef.accentColor);
          if (wasAlive && e.hp <= 0) {
            this._onEnemyKilled(e);
          }
          hitAny = true;
        }
      }
      if (hitAny) {
        // 近战挥砍特效
        const angle = PlayerManager.facingRight ? 0 : Math.PI;
        VFXSystem.showMuzzleFlash(px + dir * 20, py, angle);
      }
    }

    CameraSystem.addTrauma(0.04);
    Platform.vibrateShort('light');
    PlayerManager.fireCooldown = 1 / heroDef.attackRate;
  }

  private _onEnemyKilled(e: Enemy): void {
    VFXSystem.spawnDeathExplosion(e.x, e.y, e.def.color);
    VFXSystem.addBloodSplatter(e.x, e.y, 0x661111);
    VFXSystem.addKill();
    CameraSystem.addTrauma(0.2);
    RunManager.totalKills++;
    LootManager.spawnEnemyDrop(e.x, e.y, e.def.lootTableId || 'enemy_common');

    // 触发被动技能：击杀回复
    const passive = PlayerManager.heroDef.passiveSkill;
    if (passive === 'longdan') {
      const healAmount = Math.floor(PlayerManager.maxHp * 0.05);
      PlayerManager.hp = Math.min(PlayerManager.maxHp, PlayerManager.hp + healAmount);
      if (healAmount > 0) {
        VFXSystem.showCoinPickup(PlayerManager.x, PlayerManager.y - 20, healAmount);
      }
    }
  }

  destroy(): void {
    this._lockTarget = null;
  }
}

export const CombatManager = new CombatManagerClass();
