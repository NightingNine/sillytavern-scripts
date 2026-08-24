# A.U.T.O 创作台 M1a 阶段记录与验收报告

## 验收概览

- 项目/阶段/版本：A.U.T.O 独立创作台 / M1a Step 1 Stub 垂直切片 / 0.1.0
- 分支与基线：`feat/auto-card-studio-android`，基线 `9d699359ad46c9b2621387891f53e5385a8c02e3`
- 当前判定：M1a 有条件通过；这不是完整 M1，也不是可连接真实模型的发布版。
- 验收环境：2026-07-23，OnePlus PLK110，Android 16 / API 36，`arm64-v8a`
- 旧版回退：`dist/character-creation/auto-card-studio/index.js` 保持只读、未改动。

## 目标体验与边界

用户可在完全独立的 APK 中填写项目母题，观察 Step 1 流式草稿，取消而不污染正式状态，或完成生成并得到两个独立正式产物；确认后杀进程重开，项目、对话、产物与 revision 都能从 SQLite 恢复。

本切片只包含：

- Step 1“交互范式和美学纲领”；
- `WORLD_interaction_paradigm` 与 `WORLD_aesthetic_program`；
- 确定性 `StubModelGateway`，用于验证链路而非内容质量；
- 一个 SQLite 工作区快照、revision/CAS 与最多 100 条幂等收据；
- Android 与未来桌面共用的响应式界面。

明确不包含：真实模型供应商、API Key、安全解锁方案、29 步全量迁移、资源导入、角色卡导出、分享、旧档迁移、断网恢复和发布签名。

## 结构与所有权

| 区域 | 当前 owner | 契约与不变量 |
| --- | --- | --- |
| Command/State | `src/workflow.ts` + `src/core.ts` | `StudioKernel` 是唯一正式状态 owner；只有 CAS 成功并读回后才发布新快照。 |
| Model | `ModelGateway` | 流只产生 `StreamDraft`；完成终态且两个必需 WORLD 产物齐全后才可提交。 |
| Save | `StudioRepository` | Web 仅内存；Tauri 使用 SQLite `UPDATE ... WHERE revision = ?`，随后校验 revision 与 command receipt。 |
| UI | `src/main.ts` | 只调用 Kernel；不直接访问 SQL，不把流式草稿当正式对话。 |
| Legacy | 旧单文件 | 本切片不修改、不接管其事实源。 |

## 完成标准

| 标准 | 证据等级 | 结果 | 证据位置 |
| --- | --- | --- | --- |
| Android 独立安装、冷启动 | 真机 | 通过 | 包名 `com.nightingnine.autocardstudio`；本报告“真机轨迹” |
| 正常生成只提交一次 | Stub + 自动化 | 通过 | `apps/auto-card-studio/src/workflow.test.ts` |
| 取消不改变正式 Step 1 状态 | Stub + 真机 | 通过 | 自动化测试与本报告“真机轨迹” |
| 对话与产物语义分离 | 纯函数测试 | 通过 | `apps/auto-card-studio/src/core.test.ts` |
| 两个必需产物不完整时拒绝提交 | Stub + 自动化 | 通过 | `apps/auto-card-studio/src/workflow.ts` 与测试 |
| SQLite 保存、强制停止、重开恢复 | 真机 SQLite | 通过 | 本报告“真机轨迹” |
| 真实模型内容质量与失败恢复 | 无 | 未验证 | M1b 入口 |

## 真机轨迹

同一安装实例上的可观察状态：

| 时点 | revision | 正式对话 | 正式产物 | Step 1 | 结果 |
| --- | ---: | ---: | ---: | --- | --- |
| 冷启动 | 0 | 0 | 0 | 未开始 | `TAURI · SQLITE`，工作区读回成功 |
| 流式中 | 1 | 仅 1 条 `StreamDraft` | 0 | 未开始 | 项目元数据已保存，草稿 102 字符 |
| 取消后 | 1 | 0 | 0 | 未开始 | 草稿丢弃，revision 不增长 |
| 完整生成 | 2 | 2 | 2 | 草案 | SQLite CAS + 收据读回 |
| 确认后 | 3 | 2 | 2 | 已确认 | 最近提交为 2 → 3 |
| 强制停止并冷启动 | 3 | 2 | 2 | 已确认 | 项目名与状态全部恢复 |
| 当前代码覆盖安装后冷启动 | 3 | 2 | 2 | 已确认 | 数据继续恢复，证明升级未清档 |

## 第一切片强制覆盖矩阵

| 场景 | 状态 | 实际环境/模型 | revision 与正式状态结果 | 影响与再验证入口 |
| --- | --- | --- | --- | --- |
| 正常回合 | 仅 Mock | Android 真机 + Stub + SQLite | 1 → 2；2 对话、2 产物 | M1b 换真实供应商复验 |
| 取消 | 仅 Mock | Android 真机 + Stub + SQLite | 保持 1；0 正式对话、0 产物 | M1b 用真实流复验 |
| 模型失败 | 仅 Mock | 失败 Gateway 单测 | 保持 1；不发布候选 | M1b 注入 HTTP/供应商错误 |
| 解析失败 | 仅 Mock | 缺少一个 WORLD 标签的 Gateway 单测 | 保持 1；不发布候选 | M1b 用真实异常响应语料复验 |
| 规则拒绝 | 未验证 | 尚无 M1 规则层 | 无证据 | 规则 owner 进入切片时补测 |
| revision conflict | 仅 Mock | 内存仓库单测 | 调模型前拒绝，保持 1 | 增加双窗口/双 Kernel 集成测试 |
| 重复 commandId：已提交/in-flight/不同 payload | 仅 Mock | 内存仓库单测 | 相同命令只调用模型一次；不同 payload 拒绝 | SQLite 集成层复验 |
| 持久化失败 | 仅 Mock | 失败仓库单测 | 候选不发布，保持 1 | Android 注入磁盘/事务失败 |
| CAS 结果未知与启动对账 | 未验证 | 尚无 unknown ack 状态 | 无证据 | M1b 设计 pending command journal 后复验 |
| durable 后取消 | 未验证 | 当前仅验证提交前取消 | 无证据 | 明确 commit point 后做竞态测试 |
| 保存、退出、重开 | 通过 | Android 真机 + SQLite | revision 3 与 2 个产物恢复 | 已有真机入口可重复 |
| 损坏检测与恢复 | 未验证 | 仅有 schema/revision 读回校验 | 可检测部分不一致，未演练恢复 | 加备份/恢复策略后破坏数据库复验 |

## 平台、构建与安全

- Web/TypeScript：9 项测试通过；`tsc --noEmit` 与 Vite production build 通过。
- Rust：`cargo check --locked` 通过；Tauri 2.11.5，SQL plugin 2.4.0。
- APK：Debug ARM64，169,434,158 字节，SHA-256 `AAC78917CE0DA7EA3429B0579A925624582B410C01A219D107412DA457F9D7A3`。
- 本机限制：Windows 未开启 Developer Mode，Tauri CLI 无法创建 Android `.so` 符号链接；本次只在生成目录复制同一编译产物，再由 Gradle 组装。生产构建应放到 Linux CI 或启用正式受控构建环境。
- 当前没有 HTTP 模型客户端、真实 API Key 或 SecretStore，也不会在普通存储、日志或导出中写入密钥。M1b 必须先确认“用户口令”还是“设备密钥/生物识别”解锁策略。
- 调试包使用开发签名且含符号，只用于当前真机验收，不可视为发布包。

## 已知限制与回退

| 限制 | 当前结果 | 恢复/后续入口 |
| --- | --- | --- |
| Stub 不代表正式 A.U.T.O 内容质量 | 只能验证状态链路 | M1b 接真实 Step 1 预设与模型 |
| 浏览器预览刷新会重置 | 明确显示 `WEB PREVIEW · MEMORY` | 持久化验收必须在 APK/桌面 Tauri 中做 |
| 单工作区快照 | 还没有项目列表 | 项目库切片到来时再拆 repository |
| 无导入导出 | 不能交付 ST 文件 | 后续 `FilePort` / `CardDeliveryPort` 切片 |
| 无损坏恢复 | 检测后会停止写入 | 设计备份/恢复 UI 后复验 |

代码回退点是删除 `apps/auto-card-studio` 与本阶段文档；旧单文件未变。设备回退可卸载 `com.nightingnine.autocardstudio`，但这会删除当前测试存档，执行前需另行确认。

## 门建议

- 建议：M1a 有条件通过，继续 M1b；不要把状态写成“完整 M1 完成”。
- 通过依据：真机取消、CAS、确认、冷启动恢复、覆盖安装恢复均有可观察证据；核心失败语义有 9 项自动化测试。
- 条件：接真实模型前先确定密钥解锁方案，并补 CAS unknown、durable 后取消、损坏恢复和真实断网验证。
- 用户确认：待用户验收当前手机中的 0.1.0 调试包。
