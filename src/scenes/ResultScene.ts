/**
 * 结算场景 - 完整统计 + 物资入账 + 广告占位 + 再来/返回
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { type Scene, SceneManager } from '@/core/SceneManager';
import { SaveManager } from '@/managers/SaveManager';
import { ProgressManager } from '@/managers/ProgressManager';
import { Ease, TweenManager } from '@/core/TweenManager';

export interface ResultData {
  success: boolean;
  coins: number;
  shards: number;
  stones: number;
  keys: number;
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
    SaveManager.settleRun(data.success, data.coins, data.shards, data.stones, data.keys, data.kills);
    const newSkills = ProgressManager.checkSkillUnlocks();

    // 背景
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0a0a1a, 0.95);
    bg.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    bg.endFill();
    this.container.addChild(bg);

    // 标题
    const title = new PIXI.Text(data.success ? '撤离成功!' : '任务失败', {
      fontSize: 52, fontWeight: 'bold',
      fill: data.success ? 0x33ff66 : 0xff4444,
      fontFamily: 'Arial', stroke: 0x000000, strokeThickness: 4,
    });
    title.anchor.set(0.5);
    title.position.set(Game.logicWidth / 2, Game.logicHeight * 0.15);
    title.scale.set(0.5);
    this.container.addChild(title);
    TweenManager.to({ target: title.scale, duration: 0.4, ease: Ease.easeOutBack, props: { x: 1, y: 1 } });

    // 统计
    const entries: [string, string][] = [
      ['金币', data.success ? `+${data.coins}` : `+${Math.floor(data.coins * 0.3)} (损失${Math.floor(data.coins * 0.7)})`],
      ['碎片', `+${data.shards}`],
      ['强化石', `+${data.stones}`],
      ['钥匙', `+${data.keys}`],
      ['击杀', `${data.kills}`],
      ['存活', `${Math.floor(data.survivalTime)}s`],
      ['搜索', `${data.searchedCount}个`],
    ];

    let statY = Game.logicHeight * 0.28;
    for (const [label, value] of entries) {
      const row = new PIXI.Container();
      const lbl = new PIXI.Text(label, { fontSize: 24, fill: 0x888899, fontFamily: 'Arial' });
      lbl.position.set(Game.logicWidth * 0.25, 0);
      row.addChild(lbl);
      const val = new PIXI.Text(value, { fontSize: 24, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold' });
      val.position.set(Game.logicWidth * 0.55, 0);
      row.addChild(val);
      row.position.set(0, statY);
      row.alpha = 0;
      this.container.addChild(row);
      TweenManager.to({ target: row, duration: 0.3, ease: Ease.easeOutQuad, props: { alpha: 1 }, delay: 0.2 + entries.indexOf([label, value] as any) * 0.08 });
      statY += 36;
    }

    // 新解锁技能
    if (newSkills.length > 0) {
      const unlockText = new PIXI.Text(`新技能解锁: ${newSkills.join(', ')}`, {
        fontSize: 22, fill: 0xffdd44, fontFamily: 'Arial', fontWeight: 'bold',
      });
      unlockText.anchor.set(0.5);
      unlockText.position.set(Game.logicWidth / 2, statY + 10);
      this.container.addChild(unlockText);
      statY += 40;
    }

    // 广告按钮（占位）
    const adBtnY = Game.logicHeight * 0.68;
    if (!data.success) {
      const adBtn = this._makeBtn('广告复活(占位)', 0xffaa44, adBtnY, () => {
        console.log('[ResultScene] 广告复活（占位）');
      });
      this.container.addChild(adBtn);
    }

    const doubleBtn = this._makeBtn(data.success ? '看广告翻倍(占位)' : '', 0xffdd44, data.success ? adBtnY : adBtnY + 65, () => {
      console.log('[ResultScene] 看广告翻倍（占位）');
    });
    if (data.success) this.container.addChild(doubleBtn);

    // 操作按钮
    const actionY = Game.logicHeight * 0.80;
    this.container.addChild(this._makeBtn('再来一局', 0x33ccff, actionY, () => {
      SceneManager.switchTo('battle');
    }));
    this.container.addChild(this._makeBtn('返回菜单', 0x555577, actionY + 65, () => {
      SceneManager.switchTo('menu');
    }));

    // 累计存档信息
    const save = SaveManager.data;
    const footer = new PIXI.Text(
      `累计: ${save.totalRuns}局 | ${save.totalWins}胜 | ${save.totalKills}杀 | $${save.coins}`,
      { fontSize: 18, fill: 0x666688, fontFamily: 'Arial' }
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
      fill: color === 0x33ccff || color === 0xffaa44 || color === 0xffdd44 ? 0x1a1a2e : 0xffffff,
    });
    txt.anchor.set(0.5);
    btn.addChild(txt);
    btn.position.set(Game.logicWidth / 2, y);
    btn.eventMode = 'static';
    btn.on('pointerdown', cb);
    return btn;
  }
}
