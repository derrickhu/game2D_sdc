/**
 * 三国结算场景 - 资源入账 + 统计
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { type Scene, SceneManager } from '@/core/SceneManager';
import { SaveManager } from '@/managers/SaveManager';
import { ProgressManager } from '@/managers/ProgressManager';
import { Ease, TweenManager } from '@/core/TweenManager';

export interface ResultData {
  success: boolean;
  copper: number;
  grain: number;
  wood: number;
  iron: number;
  expBook: number;
  soul: number;
  classScroll: number;
  seal: number;
  kills: number;
  survivalTime: number;
  searchedCount: number;
}

let _pendingResult: ResultData | null = null;

export function setResultData(data: ResultData): void {
  _pendingResult = data;
}

export class ResultScene implements Scene {
  readonly name = 'result';
  readonly container = new PIXI.Container();

  onEnter(): void {
    const data = _pendingResult;
    if (!data) { SceneManager.switchTo('menu'); return; }

    // 结算入账
    SaveManager.settleRun(
      data.success,
      data.copper, data.grain, data.wood, data.iron,
      data.expBook, data.soul, data.classScroll, data.seal,
      data.kills,
    );

    // 背景
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0a0a10, 0.95);
    bg.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    bg.endFill();
    this.container.addChild(bg);

    // 标题
    const title = new PIXI.Text(data.success ? '撤离成功!' : '阵亡', {
      fontSize: 52, fontWeight: 'bold',
      fill: data.success ? 0x33cc66 : 0xff4444,
      fontFamily: 'Arial', stroke: 0x000000, strokeThickness: 4,
    });
    title.anchor.set(0.5);
    title.position.set(Game.logicWidth / 2, Game.logicHeight * 0.12);
    title.scale.set(0.5);
    this.container.addChild(title);
    TweenManager.to({ target: title.scale, duration: 0.4, ease: Ease.easeOutBack, props: { x: 1, y: 1 } });

    // 统计
    const mul = data.success ? 1 : 0.3;
    const entries: [string, string, number][] = [
      ['铜钱', data.success ? `+${data.copper}` : `+${Math.floor(data.copper * mul)} (损${Math.floor(data.copper * 0.7)})`, 0xffdd44],
      ['粮秣', `+${data.grain}`, 0x88cc44],
      ['木材', `+${data.wood}`, 0x886644],
      ['铁料', `+${data.iron}`, 0x8888aa],
      ['经验书', `+${data.expBook}`, 0x44aaff],
      ['将魂', `+${data.soul}`, 0xaa88ff],
      ['职业卷', `+${data.classScroll}`, 0xff8844],
      ['将印', `+${data.seal}`, 0xff4488],
      ['击杀', `${data.kills}`, 0xcccccc],
      ['搜索', `${data.searchedCount}处`, 0xcccccc],
    ];

    let statY = Game.logicHeight * 0.22;
    for (let i = 0; i < entries.length; i++) {
      const [label, value, color] = entries[i];
      if (value === '+0' && label !== '铜钱') continue;
      const row = new PIXI.Container();
      const lbl = new PIXI.Text(label, { fontSize: 20, fill: 0x888866, fontFamily: 'Arial' });
      lbl.position.set(Game.logicWidth * 0.2, 0);
      row.addChild(lbl);
      const val = new PIXI.Text(value, { fontSize: 20, fill: color, fontFamily: 'Arial', fontWeight: 'bold' });
      val.position.set(Game.logicWidth * 0.55, 0);
      row.addChild(val);
      row.position.set(0, statY);
      row.alpha = 0;
      this.container.addChild(row);
      TweenManager.to({ target: row, duration: 0.3, ease: Ease.easeOutQuad, props: { alpha: 1 }, delay: 0.1 + i * 0.06 });
      statY += 30;
    }

    // 操作按钮
    const actionY = Game.logicHeight * 0.78;
    this.container.addChild(this._makeBtn('再战一局', 0xcc6633, actionY, () => {
      SceneManager.switchTo('battle');
    }));
    this.container.addChild(this._makeBtn('返回营地', 0x555544, actionY + 65, () => {
      SceneManager.switchTo('menu');
    }));

    // 累计存档信息
    const save = SaveManager.data;
    const footer = new PIXI.Text(
      `累计: ${save.totalRuns}局 | ${save.totalWins}胜 | ${save.totalKills}杀`,
      { fontSize: 16, fill: 0x666655, fontFamily: 'Arial' },
    );
    footer.anchor.set(0.5);
    footer.position.set(Game.logicWidth / 2, Game.logicHeight * 0.95);
    this.container.addChild(footer);
  }

  onExit(): void {
    this.container.removeChildren();
    _pendingResult = null;
  }

  private _makeBtn(label: string, color: number, y: number, cb: () => void): PIXI.Container {
    const btn = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.drawRoundedRect(-110, -25, 220, 50, 12);
    bg.endFill();
    btn.addChild(bg);
    const txt = new PIXI.Text(label, {
      fontSize: 24, fontWeight: 'bold', fontFamily: 'Arial',
      fill: 0xffffff,
    });
    txt.anchor.set(0.5);
    btn.addChild(txt);
    btn.position.set(Game.logicWidth / 2, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', cb);
    return btn;
  }
}
