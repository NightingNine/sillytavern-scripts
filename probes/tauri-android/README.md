# A.U.T.O Tauri Android M0 Probe

这是可丢弃的平台探针，不是 A.U.T.O 正式应用。它用于在迁移业务代码前验证 Tauri 2 的 Android 宿主能力。

## 验证内容

- 原生命令与应用私有目录；
- HTTP 响应流和 Abort 取消；
- SQLite migration、UPSERT、读回；
- Stronghold 加密存储；
- 私有文件读写与系统文件选择器。

页面内置逐项运行和“一键运行全部”。Stronghold 只允许使用演示值，不要输入真实 API Key。

## 常用命令

```powershell
pnpm install
pnpm check
pnpm exec tauri android init --ci
pnpm exec tauri android build --apk --debug --ci --target aarch64
```

构建 Android 前需要配置 `JAVA_HOME`、`ANDROID_HOME`、`ANDROID_SDK_ROOT` 和 `NDK_HOME`，并安装 Rust 的 `aarch64-linux-android` 目标。

当前 Windows 环境存在两个已记录限制：Stronghold 的 `libsodium` 需要预编译 Android 静态库；未开启 Windows 开发者模式时 Tauri CLI 不能创建 JNI 符号链接。正式 Android 构建建议使用 Linux CI。完整证据与本机临时处理见 `docs/character-creation/auto-card-studio-android-probe-report.md`。

## 证据边界

编译或 APK 打包成功不等于真机功能通过。只有在 Android 设备上逐项运行并记录结果后，HTTP、SQLite、Stronghold 和文件选择器才可标记为已验证。
