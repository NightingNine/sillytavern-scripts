# A.U.T.O 创作台独立应用迁移讨论稿

> 状态：M1b 有条件通过；真实 Step 1 配置与模型网关已在 MuMu 模拟供应商链路通过，真实外部供应商仍未验收
> 分支：`feat/auto-card-studio-android`
> 建立日期：2026-07-23

## 当前结论

| 决定 | 状态 | 说明 |
| --- | --- | --- |
| 从移动端开始，再复用同一核心支持桌面端 | 已确定 | 用户指定的开发顺序。 |
| 不直接在现有 63 万字节单文件上套 WebView | 暂定 | 先建立宿主接口，再迁移一条可运行生成链。 |
| 原酒馆助手版本继续可用 | 暂定 | 用 `SillyTavernAdapter` 维持现有发布渠道，不要求一次性替换。 |
| 独立应用采用 Tauri 2 作为 Android 与桌面共用宿主 | 已确定 | OnePlus Android 16 真机已证明核心原生能力可用；文件选择器兼容差异由 `FilePort` 隔离。 |
| APK 完全独立运行，不要求连接 SillyTavern | 已确定 | 手机直接连接模型、本地保存项目，并导出 SillyTavern 兼容交付文件。 |

## Task Envelope

- 目标：把 A.U.T.O 创作台迁移为可安装的 Android APK，并让领域核心和 UI 能在后续桌面端复用。
- 保留行为：29 步工作流、项目与步骤对话、独立产物版本库、提示词组装、正则后处理、重组完整性校验、项目导入导出。
- 必须替换的宿主能力：模型生成与流式、取消、模型列表、token 统计、宏替换、Markdown、角色卡/世界书交付、工具栏启动事件。
- 禁止事项：不把 API Key 写入普通存储、日志或导出；不让新旧存储同时成为权威；不静默丢弃未知预设字段、宏、正则或角色卡扩展；不在未确认路线前安装生产依赖或重写现有发布版。
- 第一阶段完成标准：Android 真机上完成“导入资源 → 新建项目 → Step 1 流式生成 → 停止/重试 → 产物入库 → 杀进程重开恢复 → 导出项目”的闭环。

## 现有宿主耦合

当前脚本直接使用：

- `window.parent`、宿主 DOM 和工具栏事件；
- `TavernHelper.generateRaw`、`stopGenerationById`、`getModelList`；
- SillyTavern tokenizer、宏替换和 Markdown 渲染；
- `getCharacterNames`、`getWorldbookNames`、`getCharacter`、`createOrReplaceWorldbook`、`createOrReplaceCharacter`；
- 宿主页面的 IndexedDB、localStorage、sessionStorage 和下载行为。

项目、步骤、产物和资源已经分别保存在 IndexedDB，因此业务数据不需要重新设计；需要先把存储调用包进接口，并建立显式的跨宿主导入包。

## 当前实现结构

```text
apps/
  auto-card-studio/
    src/core.ts           Step 1 状态、Command、收据与产物纯逻辑
    src/ports.ts          ModelGateway / StudioRepository 契约
    src/workflow.ts       唯一正式状态 owner 与流式事务边界
    src/adapters.ts       Stub Model、内存预览与 Tauri SQLite
    src/main.ts           Android/桌面共用全屏 UI
    src-tauri/            Tauri 2 壳与最小 SQL capability
dist/character-creation/
  auto-card-studio/       现有酒馆助手单文件发布入口，迁移期间保持只读回退
```

M1 先保持一个应用、四个职责文件，避免在只有一个消费者时提前拆出多个 package。出现第二个真实消费者或独立发布需求后再物理拆包；依赖方向仍保持：

```text
UI → Studio Core → Port Contract
                    ↑          ↑
             ST Adapter    Tauri Adapter
```

`studio-core` 不得读取 `window.parent`、`TavernHelper`、Tauri 全局对象或具体数据库。

## 迁移阶段

### M0：兼容基线与平台探针

- 固定现有项目导出样本、提示词队列样本、产物提取样本和世界书重组样本。
- 在隔离 Probe 中验证 Android：SSE/流式响应、Abort 取消、长响应、切后台恢复、安全存储、文件分享与导入。
- Probe 不进入生产代码；构建链路和 Android 16 真机核心能力已经通过。DocumentsUI“最近”导入路径存在回调兼容问题，但 ColorOS 文件管理器路径可完成导入，因此先替换或封装文件适配器，不整体回退 Capacitor。

### M1：建立 Core 与 Host Ports

- M1a 已完成：不改动旧单文件，建立独立应用的 Step 1 状态核心、`ModelGateway`、`StudioRepository`、流式取消、解析门、CAS 收据和 SQLite 真机恢复。
- M1a 只迁移 `WORLD_interaction_paradigm` 与 `WORLD_aesthetic_program`；模型使用明确标记的确定性 Stub，不冒充真实生成质量。
- M1b 已完成：从旧单文件提取真实 Step 1 提示词/预设标准化规则，接入 OpenAI-compatible 流式模型、SQLite 全局设置与 Stronghold `SecretStore`；MuMu 模拟供应商链路通过。
- `ArtifactRepository` 等接口只在数据确实需要独立生命周期时再拆分，避免把同一 SQLite 快照包装成多层仓库。

#### M1b Task Envelope：真实 Step 1 模型链路

- 目标：在不改变 M1a 正式事实边界的前提下，让独立 APK 能使用 A.U.T.O v2.0 的 Step 1 提示词，通过用户配置的 OpenAI-compatible 接口进行可取消的流式生成。
- 提示词来源：`A.U.T.O.预设_v2.0.json`，源文件 SHA-256 为 `A61CFB93053EEC5A7ED6769C42FBF6E58513135D2A3131E6C7EB658098633244`；只打包 Step 1 和当时启用的公共模块，不打包连接凭据。
- 保留顺序：模板变量保护 → 当前步骤及启用的公共预设模块（原顺序）→ 项目上下文 → 当前 Step 1 会话 → 本轮输入。
- 宏边界：独立运行时只解释该切片实际使用的 `setvar/getvar` 与注释宏；`{{char}}`、`{{user}}` 保持字面值；EJS 和未知脚本不执行。
- 设置所有权：供应商模式、Base URL 与模型名进入 SQLite 的全局应用设置；它们不进入项目快照 revision。
- 密钥所有权：API Key 只进入 Stronghold vault；解锁口令不保存，冷启动后必须重新输入。项目 SQLite、日志、导出包和提示词派生文件都不得包含密钥正文。
- 数据披露：测试连接只向配置端点请求模型列表；正式生成才发送 A.U.T.O 提示词、项目母题、当前 Step 1 对话与本轮输入。HTTP 明文端点必须在界面上警告。
- 完成语义：只有收到流式终态、正文非空且两个必需 WORLD 标签完整时才进入候选和 CAS 提交；取消、超时、鉴权失败、截断、流异常或解析失败均不修改正式 revision。
- 本轮验收：自动化覆盖 SSE 分片、取消、HTTP 错误、截断与不完整流；随后在 MuMu 模拟器中用本机模拟 OpenAI-compatible 服务验证真实 HTTP/流式/Stronghold/冷启动链路。该证据标记为“模拟供应商”，不冒充真实模型质量。

### M2：Android 首条垂直切片

- 独立全屏入口替换宿主弹窗和 `window.parent`。
- 首批只支持一个 OpenAI-compatible 模型适配器。
- 跑通 Step 1 的流式、取消、错误归一、保存与重开恢复。
- API Key 只进入安全存储；诊断只记录 ID、耗时、错误码和响应指纹。

### M3：完整项目与数据迁移

- 迁移 29 步、项目库、产物库、资源库和轻量设置。
- 定义版本化 portable archive；包含项目、产物、预设/正则来源与哈希，但永不包含 API Key。
- 从 SillyTavern 导出后由 APK 显式导入，不尝试跨应用读取 WebView 私有 IndexedDB。
- 保留未知字段并生成兼容报告。

### M4：原生交付

- 将现有“直接写入 SillyTavern”改成 `CardDeliveryPort`。
- Android MVP 先导出并分享 ST 兼容角色卡/世界书/正则包。
- 后续可选增加局域网 SillyTavern Bridge，实现一键推送；它不作为本地项目事实源。

### M5：桌面端

- 复用同一 `studio-core`、`studio-ui` 和 Tauri Adapter。
- 只增加桌面文件选择、窗口状态、快捷键、更新和安装包签名。
- 若 Android Probe 迫使移动端采用 Capacitor，桌面端再选择 Tauri 或 Electron，但仍复用 Core/UI/Contracts。

## 数据与安全约束

- 当前连接设置会把自定义 API Key 随配置写入 localStorage；独立应用迁移时必须移除该行为，并为旧数据提供一次性读取、写入安全存储、清除明文的迁移流程。
- 远程模型意味着项目母题、提示词和产物会发送给用户选择的供应商；设置页必须明确显示数据接收方。
- 预设、正则和角色卡按不可信数据处理。脚本/EJS 默认只保留不执行；正则执行需要大小限制、错误隔离和超时策略。
- APK 内不沿用 jsDelivr 动态加载主程序的更新模式；发布包使用签名安装包或应用商店更新。

## 已确认的产品形态

APK 采用完全独立模式：

- 手机直接连接模型 API。
- 项目、对话、产物、预设与正则保存在应用本地。
- SillyTavern 不在线时仍可完成创作流程。
- 交付阶段导出 ST 兼容角色卡、世界书、正则和工程包。
- 局域网一键推送到 SillyTavern 只作为后续可选能力，不是 MVP 依赖。

## M0 结果与 M1 验收门

OnePlus PLK110、Android 16 真机已经完成：

1. HTTP 分块读取与 Abort 取消；
2. SQLite migration、UPSERT、强制停止后的直接读回；
3. Stronghold 写入、保存、冷启动后重新打开，且演示密钥正文未进入应用日志；
4. 应用私有 JSON 往返与系统选择器导出；
5. ColorOS 文件管理器导入；
6. 切后台与 HOT 恢复。

M0 判定为有条件通过，可以进入 M1。遗留项是 Android DocumentsUI“最近”路径回调挂起、系统分享和真实断网恢复。前者由 `FilePort` 隔离并在 M1 最早处理；后两项与 Step 1 垂直切片一起验收。只有多个宿主能力同时出现不可维护的问题时，才整体回退 Capacitor。

## 讨论记录

### 2026-07-23：启动宿主迁移

- 用户要求：新建分支，开始规划桌面端与移动端 APK，先做移动端。
- 已完成：从 `auto-card-studio-mobile-test` 创建本地分支 `feat/auto-card-studio-android`。
- 证据：现有项目是酒馆助手单文件脚本；核心数据在 IndexedDB，关键生成与发布能力依赖 SillyTavern/TavernHelper。
- 推荐：先确认独立 APK 形态，再执行 M0 Probe；暂不安装依赖或改动正式运行代码。

### 2026-07-23：确认 APK 独立运行

- 用户决定：APK 完全独立运行。
- 影响：模型网关、密钥、存储、文件交付与更新机制都由应用自身负责；SillyTavern 仅作为导出格式兼容目标。
- 下一决定：在 Tauri 2 统一宿主与 Capacitor 移动优先宿主之间选择。

### 2026-07-23：确认 Tauri 2 并启动 M0 Probe

- 用户决定：同意按 Tauri 2 推荐路线继续。
- 已完成：安装 Rust 与 Android SDK/NDK；生成隔离 Probe；Web/TypeScript 和桌面 Rust 编译检查通过；ARM64 Android Rust 库与 Debug APK 构建通过。
- APK 标识：`com.nightingnine.autocardstudio.probe`，最低 Android 7.0（API 24），目标 API 36，只包含 `arm64-v8a`。
- 已发现风险：Windows 直接交叉编译 Stronghold 的 `libsodium` 需要预编译库；未开启 Windows 开发者模式时 Tauri CLI 无法创建符号链接。两项均为本机构建限制，未向生产源码加入兼容补丁；正式 Android 构建建议放入 Linux CI。
- 尚未验证：当前未连接 Android 设备，HTTP/SQLite/Stronghold/文件选择器的真机运行结果仍为“未验证”。
- 详细证据：见 `auto-card-studio-android-probe-report.md`。

### 2026-07-23：完成 Android 16 真机 Probe

- 设备：OnePlus PLK110，Android 16（API 36），`arm64-v8a`。
- 已通过：安装与启动、Tauri 原生命令、HTTP 分块与取消、SQLite 强制停止后持久化、Stronghold 冷启动重开、应用私有文件、系统导出、后台恢复。
- 已定位：首次运行缺少两项 capability，补充 `sql:allow-execute` 与 `stronghold:allow-destroy` 后自动探针全通过。
- 文件导入：ColorOS 文件管理器路径通过；Android DocumentsUI“最近”直接点选会回到应用但 Promise 不结束，必须保持在 `FilePort` 内解决。
- 路线决定：Tauri 2 M0 有条件通过，下一步进入 M1 的 Step 1 垂直切片，不整体回退 Capacitor。
- 仍待验收：系统分享和真实断网恢复；不把这两项误记为已通过。

### 2026-07-23：完成 M1a Step 1 Stub 垂直切片

- 新增正式应用 `apps/auto-card-studio`，包名 `com.nightingnine.autocardstudio`；旧版 `dist/character-creation/auto-card-studio/index.js` 未修改。
- 建立单一 `StudioSnapshot`、revision/CAS、命令收据和四层事实边界：StreamDraft、Raw response、正式产物候选、Committed facts。
- Web 预览使用内存仓库；Android/桌面 Tauri 使用 SQLite。UI 不直接读写数据库或模型。
- OnePlus PLK110 Android 16 真机通过：流式取消不提交、完整生成两个产物、确认 Step 1、强制停止重开恢复、覆盖安装后仍恢复 revision 3。
- 自动化测试 9 项通过，覆盖正常、取消、模型失败、解析失败、revision 冲突、重复 commandId（已提交/in-flight/不同 payload）和持久化失败的非污染语义。
- 仍是 Stub 证据：真实供应商、API Key 解锁策略、真实断网、CAS 结果未知、损坏恢复与导出都未进入本切片。
- 阶段记录：见 `auto-card-studio-m1-stage-record.md`。

### 2026-07-23：完成 M1b 真实配置与模型网关

- 从 `A.U.T.O.预设_v2.0.json` 按固定 SHA-256 派生 Step 1 配置；19 个源模块，受限宏展开后实际发送 18 条消息，未打包连接凭据。
- 新增 OpenAI-compatible `/models` 连接测试与 `/chat/completions` SSE 流；鉴权、限流、超时、截断、不完整终态和取消均有稳定失败语义。
- Base URL、模型名、模式与超时保存在 SQLite 全局设置；API Key 只保存在 Stronghold，用户口令不保存。
- MuMu Android 12 上以本机模拟供应商通过：连接测试、正式配置/项目上下文发送、完整流提交、流中取消不提交、强制停止后 revision/产物恢复、密钥重新锁定与口令重开。
- 模拟器应用私有目录与 logcat 对演示 API Key、演示口令的明文扫描均为 0 命中。
- 此证据只证明真实 HTTP/Stronghold/事务链路，不证明真实模型内容质量或外部供应商兼容性。详细证据见 `auto-card-studio-m1b-stage-record.md`。
