/**
 * 主菜单场景 - 地图选择 + 武器选择 + 技能选择 + 升级入口
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { type Scene, SceneManager } from '@/core/SceneManager';
import { SaveManager } from '@/managers/SaveManager';
import { ProgressManager } from '@/managers/ProgressManager';
import { WEAPONS } from '@/config/WeaponConfig';
import { SKILLS } from '@/config/SkillConfig';
import { MAP_TEMPLATES } from '@/config/MapTemplates';
import { WEAPON_UPGRADE_COSTS } from '@/config/UpgradeConfig';

export class MenuScene implements Scene {
  readonly name = 'menu';
  readonly container = new PIXI.Container();
  private _upgradeTexts: PIXI.Text[] = [];

  onEnter(): void {
    SaveManager.load();
    ProgressManager.checkSkillUnlocks();

    // 背景
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a2e);
    bg.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    bg.endFill();
    this.container.addChild(bg);

    // 标题
    const title = new PIXI.Text('搜 打 撤', {
      fontSize: 64, fontWeight: 'bold', fill: 0x33ccff, fontFamily: 'Arial',
    });
    title.anchor.set(0.5);
    title.position.set(Game.logicWidth / 2, Game.logicHeight * 0.1);
    this.container.addChild(title);

    // 存档信息
    const save = SaveManager.data;
    const infoText = new PIXI.Text(`金币: ${save.coins}  碎片: ${save.shards}  局数: ${save.totalRuns}`, {
      fontSize: 20, fill: 0x888899, fontFamily: 'Arial',
    });
    infoText.anchor.set(0.5);
    infoText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.17);
    this.container.addChild(infoText);

    // ═══════════════ 地图选择 ═══════════════
    this._addSectionLabel('选择地图', Game.logicHeight * 0.22);
    let mapX = Game.logicWidth * 0.15;
    const templateIds = Object.keys(MAP_TEMPLATES);
    for (const tplId of templateIds) {
      const tpl = MAP_TEMPLATES[tplId];
      const selected = save.selectedMap === tplId;
      const btn = this._makeSelectionBtn(
        tpl.name, '', tpl.theme.accentColor, selected, mapX, Game.logicHeight * 0.26,
        () => {
          (save as any).selectedMap = tplId;
          SaveManager.save();
          this._refresh();
        }
      );
      this.container.addChild(btn);
      mapX += Game.logicWidth * 0.28;
    }

    // ═══════════════ 武器选择 ═══════════════
    this._addSectionLabel('选择武器', Game.logicHeight * 0.39);
    let wpnX = Game.logicWidth * 0.12;
    const weapons = ProgressManager.getUnlockedWeapons();
    this._upgradeTexts = [];
    for (const wid of weapons) {
      const w = WEAPONS[wid];
      const level = ProgressManager.getWeaponLevel(wid);
      const selected = save.selectedWeapon === wid;
      const btn = this._makeSelectionBtn(
        `${w.name} Lv.${level}`, `伤害:${w.damage} 射速:${w.fireRate}`, 0x33ccff, selected,
        wpnX, Game.logicHeight * 0.43,
        () => {
          (save as any).selectedWeapon = wid;
          SaveManager.save();
          this._refresh();
        }
      );
      this.container.addChild(btn);

      // 升级按钮
      if (level < 10) {
        const cost = WEAPON_UPGRADE_COSTS[level];
        const canAfford = save.coins >= cost.coins && save.shards >= cost.shards;
        const upBtn = new PIXI.Container();
        const upBg = new PIXI.Graphics();
        upBg.beginFill(canAfford ? 0x44aa44 : 0x444444, canAfford ? 0.8 : 0.4);
        upBg.drawRoundedRect(-35, -12, 70, 24, 6);
        upBg.endFill();
        upBtn.addChild(upBg);
        const upTxt = new PIXI.Text(`升级 $${cost.coins}`, { fontSize: 12, fill: 0xffffff, fontFamily: 'Arial' });
        upTxt.anchor.set(0.5);
        upBtn.addChild(upTxt);
        upBtn.position.set(wpnX + 45, Game.logicHeight * 0.51);
        upBtn.eventMode = 'static';
        upBtn.on('pointerdown', () => {
          if (ProgressManager.upgradeWeapon(wid)) {
            this._refresh();
          }
        });
        this.container.addChild(upBtn);
      }

      wpnX += Game.logicWidth * 0.28;
    }

    // ═══════════════ 技能选择 ═══════════════
    this._addSectionLabel('选择技能', Game.logicHeight * 0.57);
    let skillX = Game.logicWidth * 0.1;
    const unlockedSkills = ProgressManager.getUnlockedSkills();
    for (const sid of Object.keys(SKILLS)) {
      const skill = SKILLS[sid];
      const unlocked = unlockedSkills.includes(sid);
      const selected = save.selectedSkill === sid;
      const label = unlocked ? skill.name : `??(${skill.unlockRuns}局解锁)`;
      const btn = this._makeSelectionBtn(
        label, unlocked ? skill.description : '未解锁',
        unlocked ? skill.color : 0x444444, selected && unlocked,
        skillX, Game.logicHeight * 0.61,
        () => {
          if (!unlocked) return;
          (save as any).selectedSkill = sid;
          SaveManager.save();
          this._refresh();
        }
      );
      if (!unlocked) btn.alpha = 0.5;
      this.container.addChild(btn);
      skillX += Game.logicWidth * 0.22;
    }

    // ═══════════════ 开始按钮 ═══════════════
    const startBtn = new PIXI.Container();
    const startBg = new PIXI.Graphics();
    startBg.beginFill(0x33ccff);
    startBg.drawRoundedRect(-120, -30, 240, 60, 16);
    startBg.endFill();
    startBtn.addChild(startBg);
    const startTxt = new PIXI.Text('开始战斗', {
      fontSize: 32, fontWeight: 'bold', fill: 0x1a1a2e, fontFamily: 'Arial',
    });
    startTxt.anchor.set(0.5);
    startBtn.addChild(startTxt);
    startBtn.position.set(Game.logicWidth / 2, Game.logicHeight * 0.80);
    startBtn.eventMode = 'static';
    startBtn.on('pointerdown', () => {
      SceneManager.switchTo('battle');
    });
    this.container.addChild(startBtn);

    // 版本号
    const sub = new PIXI.Text('v0.2 完整版', {
      fontSize: 18, fill: 0x444466, fontFamily: 'Arial',
    });
    sub.anchor.set(0.5);
    sub.position.set(Game.logicWidth / 2, Game.logicHeight * 0.92);
    this.container.addChild(sub);
  }

  onExit(): void {
    this.container.removeChildren();
    this._upgradeTexts = [];
  }

  private _refresh(): void {
    this.container.removeChildren();
    this._upgradeTexts = [];
    this.onEnter();
  }

  private _addSectionLabel(text: string, y: number): void {
    const label = new PIXI.Text(text, {
      fontSize: 20, fill: 0x666688, fontFamily: 'Arial', fontWeight: 'bold',
    });
    label.position.set(16, y);
    this.container.addChild(label);
  }

  private _makeSelectionBtn(
    title: string, desc: string, color: number, selected: boolean,
    x: number, y: number, onClick: () => void
  ): PIXI.Container {
    const btn = new PIXI.Container();
    const w = 90, h = 65;
    const bg = new PIXI.Graphics();
    bg.beginFill(selected ? color : 0x222244, selected ? 0.4 : 0.6);
    bg.drawRoundedRect(0, 0, w, h, 8);
    bg.endFill();
    if (selected) {
      bg.lineStyle(2, color, 0.9);
      bg.drawRoundedRect(0, 0, w, h, 8);
    } else {
      bg.lineStyle(1, 0x444466, 0.4);
      bg.drawRoundedRect(0, 0, w, h, 8);
    }
    btn.addChild(bg);

    const titleText = new PIXI.Text(title, {
      fontSize: 14, fill: selected ? 0xffffff : 0xaaaacc, fontFamily: 'Arial', fontWeight: 'bold',
    });
    titleText.position.set(6, 6);
    btn.addChild(titleText);

    const descText = new PIXI.Text(desc, {
      fontSize: 10, fill: 0x888899, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: w - 12,
    });
    descText.position.set(6, 28);
    btn.addChild(descText);

    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', onClick);
    return btn;
  }
}
