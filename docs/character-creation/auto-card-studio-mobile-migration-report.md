# A.U.T.O 创作台移动端迁移完成报告

## 交付概览

- 分支：`feat/auto-card-studio-android`
- 应用版本：`0.2.0`
- 运行方式：完全独立 Android APK，不依赖 SillyTavern 运行时
- 迁移范围：旧脚本的 29 步创作流程、项目管理、会话与产物版本、模型配置、资源与预设导入、项目备份、角色卡交付
- 视觉方向：以旧脚本 360 × 640 移动界面为 1:1 基准；只保留 Android 安全区、键盘避让、原生文件选择器和最小触控区等平台差异
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

- Node 测试：38/38 通过。
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
  - 移动端折叠状态、标题栏、概览滑出、点击高亮、Toast 自动消失和检查器切换动画回归
  - 原脚本 29 步说明数据、四卡说明弹窗，以及关闭键、遮罩、Escape 和 Android 返回关闭路径

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

### 2026-07-24 最终移动布局复验

本轮只操作用户当前打开的 MuMu 12（Android 12，ADB `127.0.0.1:7555`），没有向其他已连接 Android 设备发送安装、启动、点击或文件操作命令。

| 检查项 | 结果 |
| --- | --- |
| 冷启动与状态栏 | 通过。状态栏没有覆盖 `CHARACTER FORGE` 或右上角按钮。 |
| 默认创作页 | 通过。保持左侧 56px 纵向轨道、中央单栏创作区和底部四联操作；没有顶部横向步骤条或底部导航。 |
| 流程/项目抽屉 | 通过。宽度适配竖屏，显示当前项目、`0/29` 进度、阶段和完整步骤名；进度强调色为陶土红/金色。 |
| 项目库 | 通过。新建、切换、编辑、导入和导出入口均可见，编辑表单可正常展开。 |
| 右侧检查器 | 通过。`产物 / 设置 / 发布` 三个标签均可切换，竖屏无横向溢出。 |
| 四联操作 | 通过。`后序`切换是否发送后续步骤产物，`提示词`显示本轮上下文清单，`生成`在母题为空时给出明确校验提示，`下一站`保持禁用。 |
| 稳定性 | 通过。前台进程持续存活，logcat 无 `FATAL EXCEPTION`、AndroidRuntime 崩溃或 JavaScript 致命错误。 |

MuMu WebView 记录了 wasm Code Cache 目录不可用警告；应用页面、导航和交互均正常，因此判定为模拟器 WebView 环境警告，不属于本应用验收阻断项。

### 2026-07-24 原脚本 1:1 复验

复验基准为当前酒馆环境中打开的原脚本，视口为 360 × 640 CSS px。Android 顶部额外保留 24px 系统状态栏安全区，其余关键尺寸保持原脚本口径：左轨 56px、主区 304px、折叠标题 54px、折叠概览 2px、输入区 304 × 163px、输入框 284 × 78px、四联操作 284 × 38px。

| 检查项 | 结果 |
| --- | --- |
| 首屏航标 | 通过。恢复原脚本的字号、色板、标题控件位置、航标间距和三张独立编号问题卡。 |
| 图标体系 | 通过。顶部工具、九个阶段、步骤操作、四联操作、项目库与发布动作均改用原脚本同系列 Font Awesome 6 SVG，不再使用 Unicode 占位字符。 |
| 后序上下文 | 通过。Android 真机由“未包含”切换为“已包含”，再恢复为“未包含”；不再错误地把首键替换成产物库入口。 |
| 流程与项目 | 通过。`STATION MAP / 创作流程 · 29 站`、当前项目、进度、项目库和新建入口均与原脚本结构一致。 |
| 阶段收纳 | 通过。九个阶段均显示原脚本同款展开箭头，可独立折叠；收起“实体内容设计层”后关闭并重开流程抽屉，折叠状态保持。 |
| 右侧检查器 | 通过。产物、设置、发布三页均按原脚本的紧凑首屏密度显示。 |
| 检查器切换 | 通过。首次打开仍保留原脚本的入场反馈；`产物 / 设置 / 发布` 页签间切换时右栏容器固定，只直接更新内容，不再重复横向滑入。 |
| 设置收纳 | 通过。模型、密钥、资源、偏好、诊断均可独立展开/收起；展开“创作资源”后切换到产物页再返回设置页，展开状态保持。 |
| 步骤标题栏 | 通过。移除 `PHASE 01/29` 阶段计数；中文标题使用正常字距并获得完整剩余空间；必做、说明、清空和概览折叠图框统一明显缩小为 19px 并沿同一顶部基线对齐；必做标签改为 6px、600 字重。标题栏在概览收起和展开时均固定为 54px，不再发生高度跳变。 |
| 创作母题收纳 | 通过。展开面板横向占满内容区，不再保留无用途的左右空隙；展开和收起使用 240ms 高度、位移与透明度过渡，面板从标题下方滑出。 |
| 步骤说明 | 通过。移除无法可靠关闭的 `<details>` 浮层，恢复原脚本的步骤编号、标题、引导语和“完成建议 / 建议怎么做 / 本步最终产物 / 教程提醒”四卡结构，并完整复用 29 步教程内容。移动端改为全屏说明面板和顶部固定关闭键；MuMu 实测右上角 X 与 Android 返回键均可关闭，自动化测试同时覆盖遮罩和 Escape。 |
| 点击反馈 | 通过。Android WebView 默认蓝色点击框已关闭，界面自身的按压态和键盘 `focus-visible` 焦点提示保留。 |
| 顶部通知 | 通过。切换步骤后 Toast 正常显示，并在 1000ms 后自动消失；Android WebView 原生计时器调用已由专项回归测试覆盖。 |
| 系统状态栏 | 通过。Android edge-to-edge 明确使用深色系统栏样式，时间、网络和电量图标为浅色，不再出现黑底黑字。 |
| 设备隔离 | 通过。所有安装、启动、点击、截图和 UI dump 命令均显式指定 `127.0.0.1:7555`；未操作另外两台 ADB 设备。 |

最终真机证据位于 `.gstack/qa-reports/screenshots/`：

- `ui-parity-mumu-main-systembar-final-20260724.png`
- `ui-parity-mumu-flow-final-20260724.png`
- `ui-parity-mumu-project-library-final-20260724.png`
- `ui-parity-mumu-inspector-artifacts-final-20260724.png`
- `ui-parity-mumu-inspector-settings-final-20260724.png`
- `ui-parity-mumu-inspector-publish-final-20260724.png`
- `ui-parity-mumu-icons-fold-main-final-20260724.png`
- `ui-parity-mumu-flow-fold-open-final-20260724.png`
- `ui-parity-mumu-flow-fold-collapsed-final-20260724.png`
- `ui-parity-mumu-flow-fold-persist-final-20260724.png`
- `ui-parity-mumu-settings-fold-open-final-20260724.png`
- `ui-parity-mumu-settings-fold-collapsed-final-20260724.png`
- `ui-parity-mumu-settings-fold-persist-final-20260724.png`
- `ui-regression-current-final-20260724.png`
- `ui-regression-stage-overview-before-v2-20260724.png`
- `ui-regression-stage-overview-collapsed-final-20260724.png`
- `ui-regression-stage-overview-expanded-final-20260724.png`
- `ui-regression-stage-overview-slide-final-20260724.mp4`
- `ui-regression-step-guide-modal-final-20260724.png`
- `ui-regression-step-guide-closed-final-20260724.png`
- `ui-regression-step-guide-back-closed-final-20260724.png`
- `ui-regression-notice-before-20260724.png`
- `ui-regression-tap-highlight-final-20260724.png`
- `ui-regression-toast-visible-final-20260724.png`
- `ui-regression-toast-dismissed-final-20260724.png`
- `ui-regression-inspector-open-final-20260724.png`
- `ui-regression-inspector-tabs-final-20260724.png`
- `ui-regression-inspector-tabs-final-20260724.mp4`
- `ui-regression-stage-header-before-20260724.png`
- `ui-regression-stage-header-after-20260724.png`
- `ui-regression-stage-header-expanded-after-20260724.png`
- `ui-regression-stage-header-guide-after-20260724.png`
- `ui-regression-stage-header-final-20260724.png`
- `ui-regression-stage-header-before-v3-20260724.png`
- `ui-regression-stage-header-collapsed-final-v3-20260724.png`
- `ui-regression-stage-header-expanded-final-v3-20260724.png`
- `ui-regression-stage-header-slide-final-v3-20260724.mp4`
- `ui-regression-stage-header-compact-final-v4-20260724.png`
- `ui-regression-stage-header-required-compact-final-v4-20260724.png`
- `ui-regression-stage-header-required-expanded-compact-final-v4-20260724.png`

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
- 大小：498,782,721 bytes
- SHA-256：`FCD20B25FA711222EAFC43BE73269E17C4DCA516F8C01359F978DAA4480A9D3C`

这是 ARM64 Debug APK，使用开发签名并包含调试内容，适合当前 MuMu 调试，不是应用商店发布包。Windows 当前环境不能创建 Tauri Android 构建所需的 JNI 符号链接，因此组装时复制同一次 Rust 编译产生的 `.so` 后由 Gradle 完成 APK；没有修改系统安全设置，也没有为此向业务代码加入兼容补丁。

## 交付文件

- APK：`apps/auto-card-studio/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- 旧项目备份：`C:\Users\Lanan\Documents\MuMu共享文件夹\未命名世界.auto-card-studio.json`
- MuMu 验收角色卡：`C:\Users\Lanan\Documents\MuMu共享文件夹\aAUTO_MOBILE_E2E_CARD.json`
- 最终界面截图：`.gstack/qa-reports/screenshots/ui-regression-step-guide-modal-final-20260724.png`
- 展开动画录屏：`.gstack/qa-reports/screenshots/ui-regression-stage-header-slide-final-v3-20260724.mp4`

后续桌面端应直接复用当前 TypeScript 核心、SQLite schema、模型网关和交付模块，只新增桌面窗口布局与桌面安装包，不再复制一套业务逻辑。
