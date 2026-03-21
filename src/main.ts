/**
 * 搜打撤小游戏 - 入口文件
 */
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { SaveManager } from '@/managers/SaveManager';
import { MenuScene } from '@/scenes/MenuScene';
import { BattleScene } from '@/scenes/BattleScene';
import { ResultScene } from '@/scenes/ResultScene';

const _canvas = typeof canvas !== 'undefined' ? canvas
  : (typeof wx !== 'undefined' ? wx.createCanvas() : null);

if (!_canvas) {
  console.error('[main] 无法获取 canvas');
} else {
  Game.init(_canvas);

  // 加载存档
  SaveManager.load();

  // 注册场景
  SceneManager.register(new MenuScene());
  SceneManager.register(new BattleScene());
  SceneManager.register(new ResultScene());

  SceneManager.switchTo('menu');

  // 暂停/恢复 + 暂停遮罩逻辑
  let _wasInBattle = false;

  Platform.onHide(() => {
    console.log('[main] onHide');
    _wasInBattle = SceneManager.current?.name === 'battle';
    Game.ticker.stop();
  });

  Platform.onShow(() => {
    console.log('[main] onShow');
    if (_wasInBattle) {
      // 不直接恢复 ticker，等用户点击"继续"
      // 暂时先直接恢复（后续加暂停菜单）
      Game.ticker.start();
    } else {
      Game.ticker.start();
    }
  });

  console.log('[main] 搜打撤小游戏启动完毕');
}
