/**
 * 三国主菜单场景 - 武将选择 + 地图选择 + 养成入口
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { type Scene, SceneManager } from '@/core/SceneManager';
import { SaveManager } from '@/managers/SaveManager';
import { ProgressManager } from '@/managers/ProgressManager';
import { HEROES } from '@/config/HeroConfig';
import { MAP_TEMPLATES } from '@/config/MapTemplates';
import { HERO_LEVEL_COSTS } from '@/config/UpgradeConfig';

export class MenuScene implements Scene {
  readonly name = 'menu';
  readonly container = new PIXI.Container();

  onEnter(): void {
    SaveManager.load();

    // 背景
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1510);
    bg.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    bg.endFill();
    this.container.addChild(bg);

    // 标题
    const title = new PIXI.Text('三国·搜打撤', {
      fontSize: 52, fontWeight: 'bold', fill: 0xffcc44, fontFamily: 'Arial',
    });
    title.anchor.set(0.5);
    title.position.set(Game.logicWidth / 2, Game.logicHeight * 0.08);
    this.container.addChild(title);

    const sub = new PIXI.Text('乱世求生 · 择将而战', {
      fontSize: 18, fill: 0x886644, fontFamily: 'Arial',
    });
    sub.anchor.set(0.5);
    sub.position.set(Game.logicWidth / 2, Game.logicHeight * 0.12);
    this.container.addChild(sub);

    // 存档信息
    const save = SaveManager.data;
    const infoText = new PIXI.Text(
      `铜钱:${save.copper}  粮秣:${save.grain}  铁料:${save.iron}  营地Lv.${save.campLevel}`,
      { fontSize: 16, fill: 0x888866, fontFamily: 'Arial' },
    );
    infoText.anchor.set(0.5);
    infoText.position.set(Game.logicWidth / 2, Game.logicHeight * 0.16);
    this.container.addChild(infoText);

    // ═══════════════ 武将选择 ═══════════════
    this._addSectionLabel('选择武将', Game.logicHeight * 0.20);
    let heroX = Game.logicWidth * 0.15;
    const unlocked = ProgressManager.getUnlockedHeroes();
    for (const heroId of unlocked) {
      const hero = HEROES[heroId];
      if (!hero) continue;
      const level = ProgressManager.getHeroLevel(heroId);
      const selected = save.selectedHero === heroId;
      const btn = this._makeHeroBtn(hero.name, hero.title, `Lv.${level}`, hero.bodyColor, selected, heroX, Game.logicHeight * 0.24,
        () => {
          (save as any).selectedHero = heroId;
          SaveManager.save();
          this._refresh();
        },
      );
      this.container.addChild(btn);

      // 升级按钮
      if (level < HERO_LEVEL_COSTS.length) {
        const cost = HERO_LEVEL_COSTS[level];
        const canAfford = save.copper >= cost.copper && save.expBook >= cost.expBook;
        const upBtn = this._makeSmallBtn(
          `升级 ${cost.copper}铜/${cost.expBook}书`, canAfford ? 0x44aa44 : 0x444444, canAfford,
          heroX + 55, Game.logicHeight * 0.37,
          () => {
            if (ProgressManager.upgradeHero(heroId)) this._refresh();
          },
        );
        this.container.addChild(upBtn);
      }

      heroX += Game.logicWidth * 0.40;
    }

    // ═══════════════ 地图选择 ═══════════════
    this._addSectionLabel('选择战场', Game.logicHeight * 0.44);
    let mapX = Game.logicWidth * 0.15;
    for (const tplId of Object.keys(MAP_TEMPLATES)) {
      const tpl = MAP_TEMPLATES[tplId];
      const selected = save.selectedMap === tplId;
      const btn = this._makeSelectionBtn(
        tpl.name, `推荐Lv.${tpl.recommendLevel}`, tpl.theme.accentColor, selected,
        mapX, Game.logicHeight * 0.48,
        () => {
          (save as any).selectedMap = tplId;
          SaveManager.save();
          this._refresh();
        },
      );
      this.container.addChild(btn);
      mapX += Game.logicWidth * 0.35;
    }

    // ═══════════════ 营地升级 ═══════════════
    this._addSectionLabel(`营地 Lv.${save.campLevel}`, Game.logicHeight * 0.60);
    if (save.campLevel < 8) {
      const campUpBtn = this._makeSmallBtn(
        '升级营地', 0x886644, true,
        Game.logicWidth * 0.15 + 55, Game.logicHeight * 0.64,
        () => {
          if (ProgressManager.upgradeCamp()) this._refresh();
        },
      );
      this.container.addChild(campUpBtn);
    }

    // ═══════════════ 出战按钮 ═══════════════
    const startBtn = new PIXI.Container();
    const startBg = new PIXI.Graphics();
    startBg.beginFill(0xcc6633);
    startBg.drawRoundedRect(-120, -30, 240, 60, 16);
    startBg.endFill();
    startBtn.addChild(startBg);
    const startTxt = new PIXI.Text('出战', {
      fontSize: 36, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'Arial',
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
    const ver = new PIXI.Text('v0.3 三国轻搜打撤 M1', {
      fontSize: 14, fill: 0x444433, fontFamily: 'Arial',
    });
    ver.anchor.set(0.5);
    ver.position.set(Game.logicWidth / 2, Game.logicHeight * 0.92);
    this.container.addChild(ver);
  }

  onExit(): void {
    this.container.removeChildren();
  }

  private _refresh(): void {
    this.container.removeChildren();
    this.onEnter();
  }

  private _addSectionLabel(text: string, y: number): void {
    const label = new PIXI.Text(text, {
      fontSize: 20, fill: 0xaa9966, fontFamily: 'Arial', fontWeight: 'bold',
    });
    label.position.set(16, y);
    this.container.addChild(label);
  }

  private _makeHeroBtn(
    name: string, title: string, levelStr: string, color: number, selected: boolean,
    x: number, y: number, onClick: () => void,
  ): PIXI.Container {
    const btn = new PIXI.Container();
    const w = 130, h = 90;
    const bg = new PIXI.Graphics();
    bg.beginFill(selected ? color : 0x222211, selected ? 0.3 : 0.6);
    bg.drawRoundedRect(0, 0, w, h, 10);
    bg.endFill();
    if (selected) {
      bg.lineStyle(2, color, 0.9);
      bg.drawRoundedRect(0, 0, w, h, 10);
    }
    btn.addChild(bg);

    // 武将色块头像
    const avatar = new PIXI.Graphics();
    avatar.beginFill(color, 0.8);
    avatar.drawCircle(25, 30, 18);
    avatar.endFill();
    avatar.beginFill(0xffffff, 0.6);
    avatar.drawCircle(20, 26, 3);
    avatar.drawCircle(30, 26, 3);
    avatar.endFill();
    btn.addChild(avatar);

    const nameText = new PIXI.Text(name, {
      fontSize: 18, fill: selected ? 0xffffff : 0xccccaa, fontFamily: 'Arial', fontWeight: 'bold',
    });
    nameText.position.set(52, 8);
    btn.addChild(nameText);

    const titleText = new PIXI.Text(title, {
      fontSize: 11, fill: 0x888866, fontFamily: 'Arial',
    });
    titleText.position.set(52, 28);
    btn.addChild(titleText);

    const lvText = new PIXI.Text(levelStr, {
      fontSize: 14, fill: 0xffcc44, fontFamily: 'Arial', fontWeight: 'bold',
    });
    lvText.position.set(52, 46);
    btn.addChild(lvText);

    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', onClick);
    return btn;
  }

  private _makeSelectionBtn(
    title: string, desc: string, color: number, selected: boolean,
    x: number, y: number, onClick: () => void,
  ): PIXI.Container {
    const btn = new PIXI.Container();
    const w = 100, h = 65;
    const bg = new PIXI.Graphics();
    bg.beginFill(selected ? color : 0x222211, selected ? 0.4 : 0.6);
    bg.drawRoundedRect(0, 0, w, h, 8);
    bg.endFill();
    if (selected) {
      bg.lineStyle(2, color, 0.9);
      bg.drawRoundedRect(0, 0, w, h, 8);
    }
    btn.addChild(bg);

    const titleText = new PIXI.Text(title, {
      fontSize: 16, fill: selected ? 0xffffff : 0xaaaaaa, fontFamily: 'Arial', fontWeight: 'bold',
    });
    titleText.position.set(8, 8);
    btn.addChild(titleText);

    const descText = new PIXI.Text(desc, {
      fontSize: 11, fill: 0x888866, fontFamily: 'Arial',
    });
    descText.position.set(8, 30);
    btn.addChild(descText);

    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', onClick);
    return btn;
  }

  private _makeSmallBtn(label: string, color: number, enabled: boolean, x: number, y: number, onClick: () => void): PIXI.Container {
    const btn = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(color, enabled ? 0.8 : 0.3);
    bg.drawRoundedRect(-45, -12, 90, 24, 6);
    bg.endFill();
    btn.addChild(bg);
    const txt = new PIXI.Text(label, { fontSize: 11, fill: 0xffffff, fontFamily: 'Arial' });
    txt.anchor.set(0.5);
    btn.addChild(txt);
    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', () => { if (enabled) onClick(); });
    return btn;
  }
}
