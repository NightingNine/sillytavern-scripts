# SillyTavern Scripts

一个按用途分类维护的 SillyTavern 脚本与创作工具库。

## 脚本目录

| 分类 | 脚本 | 当前版本 | 使用说明 |
| --- | --- | --- | --- |
| 角色卡创作 | A.U.T.O 角色卡创作台 | 0.7.3 | [查看文档](docs/character-creation/auto-card-studio.md) |
| 世界书创作 | 世界书创作台 | 0.1.0 | [查看文档](docs/worldbook-creation/worldbook-studio.md) |

## 角色卡创作台扩展安装

在 SillyTavern 的扩展管理中点击“安装扩展”，输入：

`https://github.com/NightingNine/sillytavern-scripts`

刷新后从魔法棒菜单打开“A.U.T.O 角色卡创作台”。扩展版为 `0.7.3`，仍依赖酒馆助手 API，但不需要在酒馆助手中运行创作台脚本。迁移时停用原正式版及测试版脚本，原项目与设置沿用；后续通过扩展管理更新。

标题栏双箭头可在 AUTO 与简洁模式间切换。AUTO 保留步骤、产物、预设及正则；两种模式共用原来的三栏界面；简洁模式清空步骤和 AUTO 预设/正则，系统提示词通过手动新建预设条目配置，正则也可手动新建，产物只手动添加。

## 旧版酒馆助手导入（兼容保留）

在酒馆助手中新建一个脚本，并填入：

```javascript
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-bootstrap-v4/dist/character-creation/auto-card-studio-bootstrap/index.js';
```

这个入口只负责读取 `catalog.json` 并加载对应的固定正式版本，不内置任何旧版创作台。检查或加载失败时会明确报错，不会静默回退到历史版本；创作台标题栏仍可手动检查更新。

### 世界书创作台

世界书创作台直接使用固定正式版本，不经过额外入口：

```javascript
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@worldbook-studio-v0.1.0/dist/worldbook-creation/worldbook-studio/index.js';
```

## 目录约定

- `dist/character-creation/`：可由酒馆助手直接加载的角色卡创作类脚本。
- `docs/character-creation/`：对应脚本的说明文档。
- `dist/worldbook-creation/`：可由酒馆助手直接加载的世界书创作类脚本。
- `docs/worldbook-creation/`：世界书创作类脚本的说明文档。
- `catalog.json`：供人或工具读取的脚本索引。

> 本仓库不包含 A.U.T.O 预设和世界书本体。请在 SillyTavern 中自行导入配套内容。
