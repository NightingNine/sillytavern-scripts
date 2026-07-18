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
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-v0.4.0/dist/character-creation/auto-card-studio/index.js';
```

## 数据与更新

- 当前发布版本：`0.4.0`
- 项目内容保存在浏览器本地存储中，更新远程脚本不会主动清空项目。
- 发布地址使用固定版本标签；更新时只需要修改导入地址中的版本号。
- 不要同时启用旧的 SillyTavern 插件版，以免出现重复按钮或界面冲突。

## 文件位置

脚本入口：`dist/character-creation/auto-card-studio/index.js`
