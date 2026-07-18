# SillyTavern Scripts

一个按用途分类维护的 SillyTavern 脚本与创作工具库。

## 脚本目录

| 分类 | 脚本 | 当前版本 | 使用说明 |
| --- | --- | --- | --- |
| 角色卡创作 | A.U.T.O 角色卡创作台 | 0.4.0 | [查看文档](docs/character-creation/auto-card-studio.md) |

## 酒馆助手导入

在酒馆助手中新建一个脚本，并填入：

```javascript
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-v0.4.0/dist/character-creation/auto-card-studio/index.js';
```

版本号固定后，即使仓库后续继续更新，当前脚本也不会被意外替换。升级时只需更换导入地址中的版本号。

## 目录约定

- `dist/character-creation/`：可由酒馆助手直接加载的角色卡创作类脚本。
- `docs/character-creation/`：对应脚本的说明文档。
- `catalog.json`：供人或工具读取的脚本索引。

> 本仓库不包含 A.U.T.O 预设和世界书本体。请在 SillyTavern 中自行导入配套内容。
