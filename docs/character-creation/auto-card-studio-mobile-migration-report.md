# A.U.T.O 创作台移动端迁移完成报告

## 交付概览

- 分支：`feat/auto-card-studio-android`
- 应用版本：`0.2.0`
- 运行方式：完全独立 Android APK，不依赖 SillyTavern 运行时
- 迁移范围：旧脚本的 29 步创作流程、项目管理、会话与产物版本、模型配置、资源与预设导入、项目备份、角色卡交付
- 视觉方向：延续旧脚本的暖灰、陶土红、金色强调色与卡片式信息层级，并针对手机触控和窄屏重新排版
- 旧版回退：`dist/character-creation/auto-card-studio/index.js` 保持只读，迁移没有接管或修改旧脚本

## 已迁移能力

| 模块 | 移动端实现 |
| --- | --- |
| 完整流程 | 29 个步骤、阶段导航、步骤说明、输入提示、生成/停止、结果提取、接纳状态均已迁移。 |
| 提示词来源 | 从经过审计的旧脚本和 `A.U.T.O.预设_v2.0.json` 机械派生，保留模块顺序、采样参数、输出标签和隐藏交付提示词。 |
| 项目管理 | 支持新建、切换、重命名和删除多个本地项目；活动项目和当前步骤自动恢复。 |
| 会话管理 | 用户输入与助手回复独立保存，可编辑、删除和清空；取消或失败的生成不会污染正式历史。 |
| 产物管理 | 每个步骤独立保存产物与多个版本，支持接纳、编辑、删除、切换历史版本和手工提取。 |
| 上下文管理 | 可按步骤控制已接纳产物是否进入后续提示词，并提供提示词预览和长度预算。 |
| 模型接入 | 支持 OpenAI-compatible 模型列表与流式生成、超时、取消、鉴权错误和不完整响应保护。 |
| 凭据安全 | Base URL、模型和超时保存在普通设置；API Key 只写入 Stronghold，加密口令不保存。 |
| 离线演示 | 未配置模型时可使用本地演示模型，便于验证完整移动端流程，不伪装为真实模型输出。 |
| 工程备份 | `.auto-card-studio.json` 可导入导出，带摘要校验；导入会创建新项目，不覆盖现有项目。 |
| 预设与资源 | 支持导入外部预设、恢复内置预设，以及导入文本/JSON 参考资源。 |
| 角色卡交付 | 输出 SillyTavern Character Card V3 JSON，包含选中世界书、首条消息、状态栏和输出正则；不携带 API Key、口令或 Base URL。 |

世界书交付采用旧脚本定义的安全目标映射：剧情类内容进入主世界书，角色、地点、阵营、规则等内容进入对应条目。这样即使没有额外调用模型做隐藏重组，APK 也能离线、稳定地生成结构合法的角色卡；隐藏重组提示词仍随内置配置保留，后续若要恢复“发布前再调用一次模型优化分组”，无需重新抽取旧脚本。

## 数据与兼容性

- 本地快照已从 schema 1 迁移到 schema 2；首次打开旧版 M1 数据时自动迁移，并保留迁移前原始备份。
- 旧项目的 brief、会话、产物和版本在覆盖安装后保持可用。
- regex 扩展在导入、编辑和再导出时保留未知字段，避免破坏 SillyTavern 扩展兼容性。
- 项目工程与最终角色卡分开：工程文件用于继续创作，Character Card V3 JSON 用于导入 SillyTavern。

## 自动化验收

- Node 测试：20/20 通过。
- TypeScript：`tsc --noEmit` 通过。
- Vite production build：通过。
- Android ARM64 Debug APK：Gradle 组装通过。
- 覆盖内容：
  - 29 步配置、隐藏模块和 37 条 regex 来源校验
  - 29 步逐步生成、提取和接纳
  - 普通生成、流式取消、模型失败、幂等与 revision 冲突
  - schema 1 → 2 数据迁移
  - 工程导入导出、摘要篡改检测和旧工程兼容
  - Character Card V3、世界书、首条消息、状态栏和敏感信息过滤

## MuMu 端到端验收

验收环境为用户已打开的 MuMu Android 12 模拟器，ADB 地址 `127.0.0.1:7555`。

| 场景 | 结果 |
| --- | --- |
| 从 M1 旧版本覆盖安装 | 旧项目、4 条会话、4 个产物版本保留；自动升级到 29 步和 schema 2。 |
| 旧工程备份 | 通过 APK 自身的 Android 文件保存流程成功导出。 |
| 全新安装 | 应用正常启动，无崩溃和致命 logcat。 |
| 保存项目 brief | 成功保存并在后续生成中使用。 |
| Step 1 | 本地演示模型生成 2 个产物，成功接纳。 |
| Step 23 | 生成状态栏相关 3 个产物，成功接纳。 |
| Step 29 | 生成开场白，成功接纳。 |
| 角色卡交付 | 交付页自动选择 6/6 个当前产物，成功通过 Android 系统文件选择器导出。 |
| 强制停止并重开 | 当前 Step 29、接纳状态、项目数据和 6/6 交付选择均恢复。 |
| 最终覆盖安装 | `0.2.0` APK 安装成功，数据继续保留；横向步骤栏自动滚动到当前 Step 29。 |

导出的端到端角色卡校验结果：

- `spec = chara_card_v3`
- 世界书条目：3
- 输出 regex：10
- 首条消息同时包含叙事、选项和状态栏数据
- 不包含 `apiKey`、`passphrase` 或 `baseUrl`
- SHA-256：`235F79D44AFE63C201E5CE1FC25FC0BE6509623D6DB2A7DF60013B661C3D85B7`

## APK

- 文件：`apps/auto-card-studio/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- 包名：`com.nightingnine.autocardstudio`
- `versionName`：`0.2.0`
- `versionCode`：`2000`
- 大小：253,229,001 bytes
- SHA-256：`E372D289E4167D0AA05A747E7F6D15BF4714D2C261EB0C4F722BF73B71F4DD35`

这是 ARM64 Debug APK，使用开发签名并包含调试内容，适合当前 MuMu 调试，不是应用商店发布包。Windows 当前环境不能创建 Tauri Android 构建所需的 JNI 符号链接，因此组装时复制同一次 Rust 编译产生的 `.so` 后由 Gradle 完成 APK；没有修改系统安全设置，也没有为此向业务代码加入兼容补丁。

## 交付文件

- APK：`apps/auto-card-studio/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- 旧项目备份：`C:\Users\Lanan\Documents\MuMu共享文件夹\未命名世界.auto-card-studio.json`
- MuMu 验收角色卡：`C:\Users\Lanan\Documents\MuMu共享文件夹\aAUTO_MOBILE_E2E_CARD.json`
- 最终界面截图：`apps/auto-card-studio/dist/final-installed.png`

后续桌面端应直接复用当前 TypeScript 核心、SQLite schema、模型网关和交付模块，只新增桌面窗口布局与桌面安装包，不再复制一套业务逻辑。
