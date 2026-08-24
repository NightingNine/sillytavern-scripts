# A.U.T.O 创作台 M1b 阶段记录与验收报告

## 验收概览

- 项目/阶段/版本：A.U.T.O 独立创作台 / M1b 真实 Step 1 配置与模型网关 / 0.1.0 Debug
- 分支与基线：`feat/auto-card-studio-android`，基线 `9d699359ad46c9b2621387891f53e5385a8c02e3`
- 当前判定：M1b 有条件通过；可进入下一个垂直切片，但不能写成“真实模型质量已验收”。
- 验收环境：MuMu Android 12，设备模型 `HBN-AL00`，900×1600；ARM64 APK 通过模拟器转译运行。
- 旧版回退：`dist/character-creation/auto-card-studio/index.js` 保持只读、未修改。

## 本切片交付

| 能力 | 实现与边界 |
| --- | --- |
| 正式 Step 1 配置 | 从 `A.U.T.O.预设_v2.0.json` 机械派生；源 SHA-256 `A61CFB93053EEC5A7ED6769C42FBF6E58513135D2A3131E6C7EB658098633244`。 |
| 提示词顺序 | 模板变量保护 → 18 条有效预设消息 → 项目上下文 → 当前会话 → 本轮输入。19 个源模块中的“预设设置”只写入变量，展开后为空。 |
| 宏兼容 | 只解释当前切片实际出现的 `setvar/getvar` 和注释宏；`{{char}}` 保持字面值；不执行 EJS 或未知脚本。 |
| 模型网关 | OpenAI-compatible `GET /models` 与 `POST /chat/completions`；支持 SSE 分片、Abort、超时与终态校验。 |
| 普通设置 | 模式、Base URL、模型名和超时进入 SQLite `app_model_settings`，不进入项目 revision。 |
| API Key | 只进入 `auto-card-studio-vault.hold`；Stronghold 使用用户口令，口令不保存，冷启动后重新锁定。 |
| 正式事实门 | 只有非空完整终态且两个 WORLD 标签都闭合时，才生成候选并执行 SQLite CAS。 |
| UI 披露 | 设置页显示测试连接与正式生成的数据范围；HTTP 明文端点显示警告。 |

## 自动化证据

- Node 测试：18/18 通过。
- 覆盖：SSE 任意字节分片、调用方取消、401 归一、长度截断、不完整流、URL 校验、Step 1 来源/顺序/宏、M1a 的正常/取消/失败/CAS/幂等/持久化失败语义。
- TypeScript/Vite：`tsc --noEmit` 与 production build 通过。
- Rust：包含 HTTP、SQL、Stronghold 的 `cargo check --offline` 通过；Cargo lock 已更新。
- 提示词派生扫描：只包含 19 个选定模块和采样参数；未复制 `proxy_password`、反向代理或 API Key 字段。

## MuMu 模拟供应商轨迹

本轮使用只监听电脑 `127.0.0.1:18765` 的测试服务，并通过 `adb reverse` 暴露给模拟器。演示值不是有效凭据，测试服务结束后立即关闭。

| 场景 | 可观察证据 | 正式状态 |
| --- | --- | --- |
| 首次安装 | `TAURI · SQLITE`、`MODEL · STUB`、revision 0 | 全新模拟器，无旧项目数据。 |
| 保存配置与密钥 | SQLite 写入 Base URL/模型名；Stronghold 显示“已解锁 · 有 Key” | 项目 revision 不变化。 |
| 连接测试 | `GET /v1/models` 成功；界面显示 1 个模型、211 ms | 未发送项目或提示词。 |
| 强制停止后重开 | 普通设置恢复为 `m1b-mock-model`；模型状态显示 `LOCKED` | 证明设置与密钥锁状态分离。 |
| 口令重新解锁 | 未重新输入 API Key，Stronghold 恢复“有 Key” | 证明 vault 冷启动读回。 |
| 完整流 | 请求为 21 条消息、39,743 字符，包含 Step 1 输出契约与 `<STUDIO_PROJECT_CONTEXT>` | 完成后 revision 2，提取两个正式产物；后续一次完整重试推进到 revision 3。 |
| 流中取消 | 第二条慢速请求收到 84 字符草稿后 Abort | revision 保持 3，草稿未进入正式状态。 |
| 最终强制停止重开 | `MODEL · LOCKED`、revision 3、219 字符完整终态、2 个当前选中产物 | SQLite 项目与产物恢复，Key 自动重新锁定。 |
| 明文扫描 | 应用私有目录和 logcat 中，演示 API Key 与演示口令均为 0 命中 | 未发现写入 SQLite、WebView 存储或日志的明文。 |

## APK

- 路径：`apps/auto-card-studio/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- 大小：406,014,216 bytes
- SHA-256：`951E507F40274B086FE435C04BDDAF99111C20CE8BB995A095130E8F0B62607D`
- 性质：ARM64 Debug 包，含调试符号与开发签名，不可作为发布包。

Windows 主机仍无法创建 Tauri JNI 符号链接。本轮和 M1a 一样，只把刚编译的同一 `.so` 复制到明确的 `arm64-v8a` JNI 目录，并用 Gradle 跳过重复 Rust 任务完成组装；没有更改系统安全设置或加入生产兼容补丁。

## 未完成与下一闸门

- 未使用用户的真实模型供应商，因此内容质量、供应商专有字段、真实限流和账单行为仍未验证。
- 未演练真实断网、CAS 结果未知、durable 后取消、SQLite 损坏恢复和项目导出。
- 当前只迁移 Step 1；29 步、资源导入与 ST 兼容交付尚未开始。
- 下一切片建议优先补 portable project export/import 与损坏恢复，再由用户在设置页自行填入真实供应商做一次受控请求。

回退代码时删除 M1b 新增的模型、配置与报告文件并恢复应用依赖即可；旧酒馆助手版本未被接管。模拟器中的测试实例可直接保留供用户检查，演示 API Key 不具备外部权限。
