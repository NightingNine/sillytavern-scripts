# A.U.T.O 角色卡创作台

把 `A.U.T.O 预设_v2.0` 与配套世界书的角色卡创作流程界面化，提供分步骤创作、对话补全、结构化产物整理与模型连接选择。

## 依赖

- SillyTavern
- 酒馆助手（TavernHelper）
- `A.U.T.O 预设_v2.0`
- 配套世界书 `A.U.T.O预设 v2.0`

## 安装

1. 在酒馆助手中新建“脚本”。
2. 将下方内容粘贴到脚本正文并保存。
3. 启用脚本，然后点击“打开 A.U.T.O 创作台”。

```javascript
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-bootstrap-v2/dist/character-creation/auto-card-studio/index.js';
```

## 数据与更新

- 当前发布版本：`0.5.1`
- `index.js` 内置自动更新器；刷新 SillyTavern 时自动检查并加载更高版本。
- 更新检查或新版加载失败时，会继续使用入口内置版本，不影响创作台打开。
- 工具栏入口显示为紧凑的小锤子图标，悬停可查看完整名称。
- 左侧魔法棒菜单中也提供“A.U.T.O 角色卡创作台”入口。
- 支持同时保存多个项目；点击左侧文件夹图标即可切换、新建或删除项目。
- 从旧版升级时，原来的单个本地项目会自动迁移进项目库，不需要手工导入。
- 设置页下拉菜单使用与创作台一致的自定义样式，不再显示系统原生白色菜单。
- 缺少 `A.U.T.O预设_v2.0` 时仍可查看和编辑项目，但生成按钮会禁用，也不会改用其他预设。
- 项目内容保存在浏览器本地存储中，更新远程脚本不会主动清空项目。
- 酒馆助手使用固定的 `auto-card-studio-bootstrap-v2` 入口，后续更新无需再修改导入地址。
- 更新器最多每 6 小时检查一次 GitHub 内容索引，以避免频繁请求；刷新页面时若检查间隔已到便会执行检查。
- 不要同时启用旧的 SillyTavern 插件版，以免出现重复按钮或界面冲突。

## 文件位置

脚本入口：`dist/character-creation/auto-card-studio/index.js`
