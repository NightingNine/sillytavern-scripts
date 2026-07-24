# SillyTavern Scripts

一个按用途分类维护的 SillyTavern 脚本与创作工具库。

## 脚本目录

| 分类 | 脚本 | 当前版本 | 使用说明 |
| --- | --- | --- | --- |
| 角色卡创作 | A.U.T.O 角色卡创作台 | 0.6.39 | [查看文档](docs/character-creation/auto-card-studio.md) |

## 酒馆助手导入

在酒馆助手中新建一个脚本，并填入：

```javascript
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-bootstrap-v3/dist/character-creation/auto-card-studio/index.js';
```

这个入口内置自动更新器。刷新 SillyTavern 时会检查 `catalog.json`，也可以在创作台标题栏中手动检查更新；发现更高版本后自动加载对应的固定版本，检查或加载失败时继续运行当前版本。

## 目录约定

- `dist/character-creation/`：可由酒馆助手直接加载的角色卡创作类脚本。
- `docs/character-creation/`：对应脚本的说明文档。
- `catalog.json`：供人或工具读取的脚本索引。

> 本仓库不包含 A.U.T.O 预设和世界书本体。请在 SillyTavern 中自行导入配套内容。
