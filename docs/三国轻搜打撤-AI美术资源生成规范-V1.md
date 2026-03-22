# 三国轻搜打撤 — AI美术资源生成规范 V1

> 版本：v1.0
>
> 更新时间：2026-03-21
>
> 关联文档：
>
> - `docs/三国轻搜打撤整体方案-V1.md`
> - `docs/三国轻搜打撤-武将系统详细稿-V1.md`
> - `docs/三国轻搜打撤-MVP开发拆解稿-V1.md`

---

## 一、文档目标

本文档用于解决后续 AI 美术资源生产中的 4 个核心问题：

- 项目整体视觉风格到底是什么
- 哪些 AI 图可以当参考，哪些不能直接进游戏
- Midjourney 和 Nanabanana2 的提示词应该如何稳定复用
- 角色、场景、道具、UI 图标的出图方式应该如何区分

本文档的目标不是讨论“美不美”，而是：

**让后续所有 AI 出图都服务于可落地、可迭代、可复用的小游戏生产流程。**

---

## 二、核心判断

### 2.1 AI 帅图不等于可直接用的游戏资源

像 Midjourney 常见的那种单张角色插画，通常只能作为：

- 角色风格参考
- 立绘参考
- 选将卡面参考
- 宣传图参考

通常**不能直接作为局内角色资源**，原因包括：

- 不是严格横版侧视角
- 头身比、武器比例、服装结构不稳定
- 细节过多，小屏幕缩放后识别度下降
- 不是标准透明底资源
- 不能直接接动作帧、骨骼切片或战斗动画

### 2.2 本项目的 AI 美术必须分成两条产线

后续所有资源都应明确分成：

#### A. 形象产线

用于：

- 武将立绘
- 选将界面
- 宣传图
- 风格设定图

特点：

- 可以更帅
- 可以细节更多
- 可以更偏概念图

#### B. 资源产线

用于：

- 局内角色
- 敌人
- 搜索点
- 场景道具
- UI 图标

特点：

- 必须高识别
- 必须轮廓稳定
- 必须适合小屏幕
- 必须便于后续统一生产

**后续做图时，绝对不能把这两条产线混成一种图。**

---

## 三、项目视觉风格定案

### 3.1 风格关键词

本项目统一视觉风格定义为：

**暗色军旅国风 + 卡通写实 + 横版高识别度**

### 3.2 风格目标

需要同时满足：

- 有三国军旅感
- 有乱世残破感
- 有横版动作游戏的清晰轮廓
- 在微信小游戏小屏幕里依然能一眼看懂

### 3.3 视觉规则

- 视角：横版侧视 2D
- 人物比例：3.5 到 4 头身
- 线条：清晰外轮廓，中等细节
- 上色：厚涂感卡通写实
- 材质重点：木头、铁甲、皮革、旧布、火光
- 主角轮廓：明显强于背景和杂兵
- 精英怪轮廓：明显强于普通敌人
- 搜索点轮廓：必须带高价值强调，不能淹没在背景里

### 3.4 主色系

场景底色：

- 暗棕
- 灰绿
- 铁灰
- 炭黑

强调色：

- 赵云：蓝银
- 关羽：赤金
- 将印：金色
- 撤离点：青绿

---

## 四、资源是否可直接进游戏的判断标准

### 4.1 可以直接作为参考图的资源

- 风格基准图
- 武将立绘
- 宣传图
- 场景概念图

### 4.2 可以直接作为游戏资源底稿的资源

- 局内角色设定图
- 敌人设定图
- 单体道具图
- 搜索点图
- 技能图标
- 资源图标
- 平铺贴图

### 4.3 不能直接用于局内战斗的图

出现以下问题的图，不应直接进入游戏生产流程：

- 不是横版侧视
- 背景太复杂
- 多人物
- 轮廓太碎
- 服装层次过多
- 武器遮挡严重
- 透明底不可分离
- 细节远超小游戏显示需要

---

## 五、提示词复用规则

### 5.1 不要把风格基准词和资源词分开使用

后续每一条提示词都应该是：

**风格锚点 + 主体资源描述 + 游戏用途约束 + 模型限制**

而不是：

- 一条单独的风格提示词
- 一条单独的角色提示词

然后临时拼接

正确做法是：

**每次生成具体资源时，都带上统一风格锚点。**

这样做的好处是：

- 赵云和关羽不会像两个项目
- 场景和角色不会风格断裂
- 搜索点和 UI 也能保持统一

### 5.2 统一提示词结构

后续所有资源提示词，统一用下面这个结构：

`[风格锚点] + [主体描述] + [用途与构图] + [限制词/参数]`

四段含义如下：

- 风格锚点：项目固定风格，不轻易改
- 主体描述：当前这张图具体是什么
- 用途与构图：是立绘、角色、道具、场景还是图标
- 限制词/参数：防止出错、跑偏、加杂质

---

## 六、Midjourney 复用模板

### 6.1 Midjourney 风格锚点

```text
Three Kingdoms war era, side-scrolling 2D game art, dark military Chinese style, stylized semi-realistic, hand-painted texture, strong silhouette, high readability for mobile game, layered side view, wood, iron armor, leather, torchlight, worn banners, gritty but not horror
```

### 6.2 Midjourney 合并公式

```text
[风格锚点] + [主体描述] + [用途/构图] + [参数]
```

### 6.3 Midjourney 示例：赵云立绘

```text
Three Kingdoms war era, side-scrolling 2D game art, dark military Chinese style, stylized semi-realistic, hand-painted texture, strong silhouette, high readability for mobile game, layered side view, wood, iron armor, leather, torchlight, worn banners, gritty but not horror, Zhao Yun, young heroic general, silver-blue light armor, spear weapon, agile breakout fighter, elegant and handsome, side view inspired full body illustration, single character, character splash art, clean composition --ar 2:3 --stylize 150 --v 6.1
```

### 6.4 Midjourney 示例：赵云局内角色底稿

```text
Three Kingdoms war era, side-scrolling 2D game art, dark military Chinese style, stylized semi-realistic, hand-painted texture, strong silhouette, high readability for mobile game, layered side view, wood, iron armor, leather, torchlight, worn banners, gritty but not horror, Zhao Yun, silver-blue light armor, spear, agile fighter, simplified costume layers, clean readable silhouette, side view full body, single character, suitable for in-game sprite production, minimal background, game asset design --ar 2:3 --stylize 90 --v 6.1
```

### 6.5 Midjourney 示例：关羽局内角色底稿

```text
Three Kingdoms war era, side-scrolling 2D game art, dark military Chinese style, stylized semi-realistic, hand-painted texture, strong silhouette, high readability for mobile game, layered side view, wood, iron armor, leather, torchlight, worn banners, gritty but not horror, Guan Yu, red and dark green heavy armor, long beard, Green Dragon Crescent Blade, powerful heavy fighter, simplified armor layers, strong readable silhouette, side view full body, single character, suitable for in-game sprite production, minimal background, game asset design --ar 2:3 --stylize 90 --v 6.1
```

### 6.6 Midjourney 参数建议

建议默认使用：

- 角色立绘：`--ar 2:3 --stylize 120~180`
- 角色底稿：`--ar 2:3 --stylize 70~110`
- 场景概念图：`--ar 16:9 --stylize 120~180`
- 道具/图标：`--ar 1:1 --stylize 80~120`

---

## 七、Nanabanana2 复用模板

### 7.1 Nanabanana2 风格锚点

```text
中国三国乱世题材，横版2D游戏美术，侧视角，暗色军旅国风，卡通写实，厚涂质感，清晰外轮廓，高识别度，适合微信小游戏，小屏幕可读性强，木头、铁甲、皮革、火把、破旧旗帜等材质明确，整体压迫、紧张、残破但不恐怖
```

### 7.2 Nanabanana2 合并公式

```text
[风格锚点]。请生成[主体描述]，[用途与构图要求]，[限制条件]。
```

### 7.3 Nanabanana2 示例：赵云立绘

```text
中国三国乱世题材，横版2D游戏美术，侧视角，暗色军旅国风，卡通写实，厚涂质感，清晰外轮廓，高识别度，适合微信小游戏，小屏幕可读性强，木头、铁甲、皮革、火把、破旧旗帜等材质明确，整体压迫、紧张、残破但不恐怖。请生成赵云的立绘，单角色，全身，银蓝色轻甲，长枪，年轻英武，灵活敏捷，突出先锋与突围气质，允许更帅、更有立绘感，但保持侧视倾向和轮廓清晰，不要文字，不要水印，不要多人物。
```

### 7.4 Nanabanana2 示例：赵云局内角色底稿

```text
中国三国乱世题材，横版2D游戏美术，侧视角，暗色军旅国风，卡通写实，厚涂质感，清晰外轮廓，高识别度，适合微信小游戏，小屏幕可读性强，木头、铁甲、皮革、火把、破旧旗帜等材质明确，整体压迫、紧张、残破但不恐怖。请生成赵云的局内角色底稿，单角色，全身，横版严格侧视，银蓝色轻甲，长枪，3.5到4头身，服装层次适中，轮廓利落，适合后续做小游戏角色资源，不要复杂背景，不要文字，不要水印，不要多人物。
```

### 7.5 Nanabanana2 示例：粮草车道具

```text
中国三国乱世题材，横版2D游戏美术，侧视角，暗色军旅国风，卡通写实，厚涂质感，清晰外轮廓，高识别度，适合微信小游戏，小屏幕可读性强，木头、铁甲、皮革、火把、破旧旗帜等材质明确，整体压迫、紧张、残破但不恐怖。请生成粮草车道具，单体资源，横版侧视，木质推车，车上装满粮袋和干草，轮廓清楚，作为可搜索点使用，适合直接做游戏资源，不要背景，不要文字，不要水印。
```

---

## 八、M1 美术资源出图顺序

为了避免前期大规模返工，建议固定按下面顺序出图：

### 8.1 第一轮：定风格

- 风格基准图
- 赵云立绘
- 关羽立绘
- 废弃军营场景概念图
- 官仓地牢场景概念图

目标：

**先确认项目气质是否统一。**

### 8.2 第二轮：定战斗资源

- 赵云局内角色底稿
- 关羽局内角色底稿
- 乱兵
- 弓手
- 守仓校尉

目标：

**确认局内轮廓和小屏阅读是否成立。**

### 8.3 第三轮：定交互资源

- 粮草车
- 军械架
- 密诏匣
- 将印残匣
- 撤离点地标

目标：

**确认搜索点和交互点能否被玩家快速识别。**

### 8.4 第四轮：定 UI 与补充资源

- 技能图标
- 资源图标
- 平铺贴图
- 小型装饰物

---

## 九、后续复用时的强制规则

为了避免项目后期风格飘掉，后续所有 AI 美术生成必须遵守：

### 9.1 每次都带风格锚点

不能只写“赵云、长枪、蓝甲”，必须带项目固定风格锚点。

### 9.2 立绘和局内角色分开出

不能试图让一张图同时满足：

- 宣传立绘
- 选将卡面
- 局内战斗角色

这三种需求要分开。

### 9.3 场景图和游戏资源分开出

场景概念图用于定氛围，不等于可直接切片的关卡资源。

### 9.4 小屏识别优先于“帅”

本项目是微信小游戏。

局内资源判断标准不是“单张图够不够帅”，而是：

- 玩家在缩小尺寸后还能不能一眼看懂
- 主角和敌人会不会混
- 搜索点会不会看不出来

---

## 十、当前阶段结论

当前项目阶段，应当统一认知为：

- Midjourney 适合先定大风格、立绘、概念图
- Nanabanana2 更适合中文控制、局内资源底稿和道具资源
- 所有提示词都要把“风格锚点”和“主体资源提示词”合并
- 不能把单张帅图直接当成可用的局内战斗角色

本文档后续可以继续扩充：

- 武将逐个资源提示词库
- 敌人资源提示词库
- 搜索点资源提示词库
- UI 图标提示词库
- 不同模型的参数调优经验
