# A.U.T.O Android M0 平台探针报告

> 日期：2026-07-23
> 分支：`feat/auto-card-studio-android`
> Probe：`probes/tauri-android`
> 真机：OnePlus PLK110，Android 16（API 36），`arm64-v8a`
> 结论：M0 有条件通过。Tauri 2 的 Android 运行时与核心原生能力可用，可以进入 M1；文件导入选择器需由独立 `FilePort` 隔离兼容差异。

## 本轮范围

该 Probe 是可丢弃的 M0 验证物，只验证独立应用宿主能力，不迁移 A.U.T.O 正式业务代码，也不修改现有酒馆助手发布版。

覆盖的目标能力：

- Tauri 原生命令与应用私有目录；
- 原生 HTTP 流式读取和 Abort 取消；
- SQLite migration、UPSERT 与读回；
- Stronghold 加密存储写入、保存与读回；
- 应用私有文件读写，以及 Android 系统文件导入/导出选择器。

## 构建环境

- Node.js：24.13.1
- pnpm：11.9.0
- Rust：1.97.1，MSVC stable
- Java：17
- Android SDK：API 36
- Android Build Tools：35.0.0、36.0.0
- Android NDK：27.2.12479018
- 目标 ABI：`arm64-v8a`

## 证据矩阵

| 验证项 | 状态 | 证据或限制 |
| --- | --- | --- |
| TypeScript 类型检查与 Vite 生产构建 | 通过 | `pnpm check` 退出码 0。 |
| Windows Rust 宿主编译 | 通过 | `cargo check --locked` 退出码 0。 |
| Android ARM64 Rust 交叉编译 | 通过 | 生成 `libprobestauri_android_lib.so`；HTTP、SQL、Stronghold、文件与对话框插件均完成链接。 |
| Android Debug APK 打包 | 通过 | Gradle `:app:assembleArm64Debug` 成功。 |
| APK 元数据 | 通过 | 包名 `com.nightingnine.autocardstudio.probe`；minSdk 24；targetSdk 36；仅 `arm64-v8a`。 |
| APK 真机安装与冷启动 | 通过 | `adb install -r -t` 成功；冷启动约 224–242 ms，应用进入前台且无崩溃。 |
| Tauri 宿主信息 | 通过 | 真机读到 `android/aarch64`、应用私有目录和 Android System WebView；页面地址为 `tauri.localhost`。 |
| HTTP 流式读取 | 通过 | HTTP 200；一次记录 18 个读取块、5,670 bytes，首包 1,248 ms、总计 1,565 ms。 |
| HTTP Abort 取消 | 通过 | 20 秒 drip 请求开始后约 1.5 秒取消，稳定进入 `Request canceled` 终态。实际关闭手机网络未执行。 |
| SQLite 持久化与重启恢复 | 通过 | migration、UPSERT、读回成功；强制停止后数据库仍为 20,480 bytes，并由 `sqlite3` 直接读回同一 revision。 |
| Stronghold 密钥读回 | 通过 | 18 bytes 演示密钥写入、保存、读回成功；强制停止并冷启动后可重新打开 vault。应用日志未出现演示密钥正文。 |
| 应用私有文件往返 | 通过 | JSON 写入、读回成功，177 bytes；强制停止后文件仍存在。 |
| 系统文件导出 | 通过 | 经 ColorOS 保存选择器导出到 `Download/auto-card-studio-probe.json`，外部读取并解析成功。测试后已删除该文件。 |
| 系统文件导入 | 有兼容问题 | 从“文件管理 → Download”选择同一文件可成功读回 177 bytes；直接从 Android DocumentsUI“最近”列表点选时，应用回到前台但 Promise 不结束。 |
| 后台恢复 | 通过 | Home 切后台 3 秒后恢复为 HOT 启动，55 ms 回到前台，原 WebView 可继续调用 Tauri 命令。 |
| 系统分享与真实断网 | 未执行 | 为避免改变手机全局网络状态，本轮未关闭 Wi-Fi/蜂窝网络；分享动作尚未实现为独立探针。两项移入 M1 垂直切片验收。 |

## 真机运行证据

- 设备序列号：`3B165S00Y7L00000`；型号：OnePlus PLK110。
- Android：16；API：36；ABI：`arm64-v8a`。
- WebView：Chrome 150.0.7871.124。
- 应用私有目录：`/data/user/0/com.nightingnine.autocardstudio.probe`。
- 强制停止后仍存在：`probe.db`、`probe-vault.hold`、`stronghold-salt.txt`、`probe-roundtrip.json`。
- 当前 Stronghold 证据只证明应用加密 vault 可用，不代表 Android 硬件级 Keystore 已通过验证。
- 全程只使用 `not-a-real-api-key` 演示值，没有输入真实 API Key。

## 构建产物

本机 Debug APK：

`probes/tauri-android/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`

- SHA-256：`B9DAFD111F7491FB0AC88830050CC6F7B07F151000DA1D78886E60BF68B7A6D9`
- 大小：499,762,008 bytes
- 说明：这是包含 Rust 调试符号的临时 Probe 包，体积不代表正式 APK；未签生产证书，不应发布。

## 已发现问题与决定

1. Stronghold 依赖的 `libsodium` 无法由当前 Windows 主机直接执行 Unix `configure` 脚本。Probe 使用 NDK 预编译 ARM64 静态库完成验证，没有改动生产源码。正式构建优先放在 Linux CI，避免维护本机特例。
2. 当前 Windows 未开启开发者模式，Tauri CLI 无权创建 Android JNI 符号链接。Probe 采用复制已编译 `.so` 后调用 Gradle 的方式打包，没有修改系统安全设置。
3. Kotlin 增量编译在 Cargo 缓存位于 C 盘、工程位于 E 盘时会报告跨盘根目录问题，但 Gradle 自动回退为非增量编译并成功完成。正式 CI 使用同一文件系统根可规避。
4. 首轮真机运行发现 `sql.execute` 与 `stronghold.destroy` 缺少 capability。已只补充 `sql:allow-execute` 和 `stronghold:allow-destroy`，重新打包后五个自动探针全部通过。
5. Android DocumentsUI“最近”路径与 ColorOS 文件管理器的返回行为不一致。生产代码不得把选择器调用散落在 UI；统一放入 `FilePort`，先采用当前插件，若同类设备仍挂起，只替换该 Android 适配器。

这些问题没有构成 Tauri Android 的系统性阻塞。M0 的路线决定是继续采用 Tauri 2，不回退 Capacitor；M1 优先验证文件导入适配器和首条真实模型请求。

## M1 下一验收步骤

1. 建立最小 `ModelGateway`、`ProjectRepository`、`SecretStore`、`FilePort` 契约，不迁移整套 29 步。
2. 只迁移 Step 1 垂直切片：流式生成、取消、保存、杀进程恢复、导出。
3. 在 `FilePort` 内复测 DocumentsUI 与 ColorOS 路径；必要时改用 Android `ACTION_OPEN_DOCUMENT` 并复制到应用缓存后读取。
4. 用用户自己的模型供应商做一次真实流式请求，但日志只记录请求 ID、耗时、状态码和字节数。
5. 在可控时段执行断网恢复和系统分享验收，并立即恢复手机原网络状态。

## 回滚

删除 `probes/tauri-android` 和本报告即可完整撤销 Probe。Probe 的数据库、vault 与文件是唯一运行时状态源，未读取正式项目数据。现有 `dist/character-creation/auto-card-studio/index.js` 未被修改，原酒馆助手版本不受影响。
