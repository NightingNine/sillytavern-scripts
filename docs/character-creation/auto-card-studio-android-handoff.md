# A.U.T.O 独立 Android 应用交接文档

## 1. 当前结论

A.U.T.O 角色卡创作台已经从 SillyTavern 内嵌脚本迁移为可独立运行的 Android APK。

当前完成状态：

- 29 步创作流程、项目与会话持久化、产物版本、模型网关、加密密钥仓、工程备份和 Character Card V3 交付均已迁移。
- schema 1 数据可以原位升级到 schema 2，旧 M1 项目、会话和产物可保留。
- 移动端布局已从错误的“顶部横向步骤 + 底部导航”重构为旧脚本的信息架构：
  - 顶部紧凑工具栏
  - 左侧常驻 56px 航站轨道
  - 可展开的流程/项目抽屉
  - 中央单栏创作区
  - 右侧产物/设置/发布检查器
  - 输入区四联操作
- 旧脚本 `dist/character-creation/auto-card-studio/index.js` 未被修改，仍可作为回退版本和布局基准。

当前不是“最终发布完成”状态。最新版 APK 已构建并覆盖安装到 MuMu，但由于用户要求先上传代码，最后一次重启、系统状态栏间距截图和完整交互复验被中断。接手后应先完成第 9 节的验收清单。

## 2. Git 与评审入口

- 仓库：`NightingNine/sillytavern-scripts`
- 分支：`feat/auto-card-studio-android`
- 远端：`origin/feat/auto-card-studio-android`
- 当前 HEAD：`7b90f2c56efe6a1303cb1c552eb4394866109dc7`
- 草稿 PR：<https://github.com/NightingNine/sillytavern-scripts/pull/4>
- PR 目标分支：`main`

本次迁移的两笔主要提交：

1. `9f565b37c9ed07d3e351dc827facb24f346f268c`  
   `feat: complete independent Android studio migration`
2. `7b90f2c56efe6a1303cb1c552eb4394866109dc7`  
   `fix: align Android layout with legacy studio`

分支建立在 `auto-card-studio-mobile-test` 的 `9d699359ad46c9b2621387891f53e5385a8c02e3` 之上；`main` 是其祖先，因此 PR 会包含测试分支累积的脚本改动，不只有上述两笔提交。如果后续只想评审独立 APK 的两笔提交，应把 PR 目标改为 `auto-card-studio-mobile-test`，或另建干净分支挑选这两笔提交。

工作区中还有用户原有且未跟踪的：

`docs/character-creation/auto-card-studio-handoff.md`

不要把它当作本迁移生成文件覆盖或误提交。本文件使用新的文件名与它并存。

## 3. 主要目录

```text
apps/auto-card-studio/
├─ src/
│  ├─ main.ts                         # UI 渲染、事件与移动端抽屉
│  ├─ styles.css                      # 桌面/移动响应式布局
│  ├─ core.ts                         # schema、产物、工程归档与迁移
│  ├─ workflow.ts                     # 29 步工作流内核
│  ├─ workflow-config.ts              # 阶段、步骤与产物规则
│  ├─ profile.ts                      # 提示词装配与受限宏
│  ├─ auto-workflow-profile.generated.ts
│  ├─ model.ts                        # OpenAI-compatible 网关
│  ├─ adapters.ts                     # SQLite、Stronghold、文件与 Stub
│  ├─ delivery.ts                     # Character Card V3 交付
│  └─ *.test.ts
├─ scripts/
│  └─ extract-step-one-profile.mjs    # 从旧脚本与预设机械派生配置
└─ src-tauri/
   ├─ src/
   ├─ capabilities/
   └─ gen/android/
```

辅助资料：

- `docs/character-creation/auto-card-studio-app-migration.md`
- `docs/character-creation/auto-card-studio-mobile-migration-report.md`
- `docs/character-creation/auto-card-studio-m1-stage-record.md`
- `docs/character-creation/auto-card-studio-m1b-stage-record.md`
- `docs/character-creation/auto-card-studio-android-probe-report.md`
- `probes/tauri-android/`

## 4. 架构边界

核心原则是只维护一套业务逻辑：

```text
UI（手机/桌面响应式）
        │
        ▼
StudioKernel（项目、步骤、会话、产物命令）
        │
        ├─ WorkflowProfile（29 步提示词与提取规则）
        ├─ ModelGateway（Stub / OpenAI-compatible）
        ├─ Delivery（Character Card V3）
        └─ Ports
            ├─ SQLite Repository
            ├─ Stronghold Secret Store
            └─ Android File Port
```

后续桌面端应复用 `core.ts`、`workflow.ts`、`profile.ts`、`model.ts`、`delivery.ts` 和 SQLite schema，只为桌面窗口调整布局与打包，不要复制第二套工作流。

## 5. 已迁移功能

| 能力 | 状态 |
| --- | --- |
| 完整 29 步流程与阶段导航 | 已完成 |
| 旧脚本/预设机械派生提示词 | 已完成 |
| 多项目新建、切换、编辑、删除 | 已完成 |
| 会话编辑、删除、清空、重试 | 已完成 |
| 产物提取、手工添加、版本切换与修订 | 已完成 |
| 上下文范围与提示词预览 | 已完成 |
| OpenAI-compatible 模型与 SSE | 已完成 |
| 本地离线演示模型 | 已完成 |
| Stronghold API Key 存储 | 已完成 |
| 工程导入导出与摘要校验 | 已完成 |
| 外部预设、文本和 JSON 资源导入 | 已完成 |
| Character Card V3 JSON 交付 | 已完成 |
| 世界书、首条消息、状态栏与 regex | 已完成 |
| schema 1 → 2 原位迁移 | 已完成 |
| 与旧脚本一致的移动端信息架构 | 已实现；最新版待最后复验 |

世界书交付目前使用旧脚本定义的安全目标映射，保证离线可生成结构合法的角色卡。隐藏模型重组提示词仍保留在内置配置中，但交付不依赖额外模型调用。

## 6. 数据与安全

- 包名：`com.nightingnine.autocardstudio`
- `versionName`：`0.2.0`
- `versionCode`：`2000`
- 项目、会话和产物：SQLite
- API Key：Stronghold
- 密钥仓口令：不保存
- 工程导出：不包含模型连接、API Key 或口令
- 角色卡导出：不包含 `apiKey`、`passphrase` 或 `baseUrl`
- 损坏主快照不会被当作空项目覆盖；可以恢复有效备份

MuMu 中已有的旧工程备份：

`C:\Users\Lanan\Documents\MuMu共享文件夹\未命名世界.auto-card-studio.json`

端到端导出的角色卡：

`C:\Users\Lanan\Documents\MuMu共享文件夹\aAUTO_MOBILE_E2E_CARD.json`

该角色卡上一轮校验结果：

- `spec = chara_card_v3`
- 世界书条目 3
- regex 10
- 首条消息包含叙事、选项与状态栏数据
- 不含连接或密钥字段
- SHA-256：`235F79D44AFE63C201E5CE1FC25FC0BE6509623D6DB2A7DF60013B661C3D85B7`

## 7. 自动化验证

最近一次结果：

- `pnpm test`：20/20 通过
- `pnpm check`：TypeScript 与 Vite production build 通过
- Android ARM64 Debug：Gradle `assembleArm64Debug` 通过
- Vite 只有单包超过 500 kB 的警告；原因是完整内置预设约 1.9 MB，不影响当前正确性

测试覆盖：

- 29 步配置、提取、生成与确认
- schema 1 → 2 迁移
- 工程归档往返、篡改拒绝与 v1 兼容
- SSE 分片、取消、401、截断与无终态
- 幂等 commandId 与 revision 冲突
- 会话和产物隔离
- Character Card V3 与敏感字段过滤

常用命令：

```powershell
cd E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio
pnpm check
pnpm test
```

## 8. Android 构建与安装

最新版 APK：

`E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk`

- 大小：253,233,097 bytes
- SHA-256：`9BB697A32FE0372DB69304864EADE81115891092595B6B56C943551684C9CDAA`
- 性质：ARM64 Debug、开发签名，不是商店发布包

Windows 本机需要预编译 Android libsodium：

`E:\SillyTavern\_toolchains\libsodium\android-aarch64\lib\libsodium.a`

构建步骤：

```powershell
cd E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio
$env:SODIUM_LIB_DIR='E:\SillyTavern\_toolchains\libsodium\android-aarch64\lib'
pnpm android:build
```

Rust 编译成功后，Tauri CLI 会因为 Windows 未允许创建 JNI 符号链接而停止。这是已知的本机环境限制。把同一次编译产生的 `.so` 复制到生成目录，再让 Gradle 组装：

```powershell
$sourceSo = 'E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\target\aarch64-linux-android\debug\libauto_card_studio_lib.so'
$jniSo = 'E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a\libauto_card_studio_lib.so'
Copy-Item -LiteralPath $sourceSo -Destination $jniSo -Force

cd E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\gen\android
.\gradlew.bat assembleArm64Debug -x rustBuildArm64Debug
```

MuMu 安装：

```powershell
$adb = 'E:\SillyTavern\_toolchains\android-sdk\platform-tools\adb.exe'
$apk = 'E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk'

& $adb connect 127.0.0.1:7555
& $adb -s 127.0.0.1:7555 install -r $apk
& $adb -s 127.0.0.1:7555 shell am force-stop com.nightingnine.autocardstudio
& $adb -s 127.0.0.1:7555 shell monkey -p com.nightingnine.autocardstudio -c android.intent.category.LAUNCHER 1
```

最新版 APK 的安装时间已显示为 `2026-07-24 09:38:10`，但安装后的重启与截图命令在用户要求先上传时被中断。

## 9. 接手后的第一件事

不要继续开发新功能，先完成最新版布局复验：

1. 强制停止并重开 `com.nightingnine.autocardstudio`。
2. 确认 Android 状态栏不再覆盖 `CHARACTER FORGE` 和右上角按钮。
3. 默认页应保持：
   - 左侧 56px 纵向轨道
   - 中央阶段标题、创作母题、对话和底部输入
   - 无顶部横向步骤条
   - 无底部导航
4. 点击左上航站按钮：
   - 展开宽度约 82vw，最大 310px
   - 显示当前项目、进度、阶段和完整步骤名
   - 进度条使用陶土红/金色，不应是 Android 系统绿色
5. 从展开抽屉进入项目库，检查新建、切换、编辑、导入和导出入口。
6. 点击右上检查器，检查“产物 / 设置 / 发布”三个标签。
7. 回到创作页，验证“产物 / 提示词 / 生成 / 下一站”四联按钮。
8. 查看 logcat，确认没有 `FATAL EXCEPTION` 或 WebView 致命错误。
9. 通过后更新：
   - `docs/character-creation/auto-card-studio-mobile-migration-report.md`
   - APK SHA-256
   - 最终 MuMu 截图
10. 完成验收后再发送带声音的 Windows 桌面通知。

上一轮在 MuMu 中已经看到的结构：

- 默认页：旧脚本式纵向轨道与中央工作台
- 展开流程：项目进度、阶段图标、步骤时间线和背景遮罩正常
- 右侧检查器：产物、设置、发布标签与抽屉遮罩正常

最后一笔 CSS 修改只调整了 Android 状态栏预留、进度条颜色和检查器密度，因此最需要复验的是这三处。

## 10. 已知限制

- 当前只有 Debug APK，没有 release keystore、正式签名、版本发布流水线或商店包。
- 没有使用用户的真实外部模型凭据做内容质量验收；真实 HTTP、SSE、错误和密钥链路已由模拟供应商与单元测试覆盖。
- 没有生成带头像 PNG payload 的角色卡；交付格式是 SillyTavern 可导入的 Character Card V3 JSON。
- Windows 构建依赖预编译 libsodium 和 JNI `.so` 复制步骤；正式发布建议使用 Linux CI。
- 完整内置预设使 Debug APK 约 253 MB；发布前可评估 release strip、压缩和资源拆分，但不要在移动端验收前提前优化。

## 11. 调试清理

完成调试后：

```powershell
cd E:\SillyTavern\_codex_publish_sillytavern_scripts\apps\auto-card-studio\src-tauri\gen\android
.\gradlew.bat --stop

$adb = 'E:\SillyTavern\_toolchains\android-sdk\platform-tools\adb.exe'
& $adb disconnect 127.0.0.1:7555
& $adb kill-server
```

只清理本轮启动的 Gradle/Kotlin/ADB 进程，不关闭用户的 MuMu 模拟器，也不结束原先已存在的服务。
