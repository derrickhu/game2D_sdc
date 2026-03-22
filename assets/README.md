# 游戏资产目录说明

## 目录分层

- `00_inbox`
  - 临时投放区，先把外部生成或下载的图片丢进来
- `01_references`
  - 纯参考图，不直接进游戏
- `02_concepts`
  - 概念图、定妆图、风格图
- `03_game_assets`
  - 目标可进入游戏生产流程的资源
- `99_exports`
  - 最终导出或整理后的成品

## 当前建议

如果你现在要先放 `赵云.png`，建议先放到：

`assets/00_inbox/zhaoyun/`

如果确认它只是风格参考，再移动到：

`assets/01_references/characters/`

如果确认它是赵云定妆或立绘方向图，再移动到：

`assets/02_concepts/characters/heroes/zhaoyun/`

如果后面产出了真正偏局内可用的角色底稿，再放到：

`assets/03_game_assets/characters/heroes/zhaoyun/in_game/`
