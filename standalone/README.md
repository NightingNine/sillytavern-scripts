# A.U.T.O 独立版

阶段 1 已完成：本地启动、三栏工作区、29 步导航、多项目和项目安全保存。

阶段 2 已实现：可导入完整 A.U.T.O 预设与正则，建立全局模型连接，并在步骤内进行流式或非流式对话。API 密钥只保存到当前 Windows 用户的凭据管理器，不进入 `data`。真实外部模型仍需使用用户自己的连接做最终联调。

## 开发启动

```powershell
dotnet run --project .\AutoCardStudio.Host\AutoCardStudio.Host.csproj
```

## 存储自检

```powershell
dotnet run --project .\AutoCardStudio.Host\AutoCardStudio.Host.csproj -- --self-test
```

## 便携发布

```powershell
dotnet publish .\AutoCardStudio.Host\AutoCardStudio.Host.csproj -c Release -o .\publish
```

发布目录只生成一个内置界面的 `A.U.T.O.exe`。程序会在自身旁创建 `data` 文件夹；开发或自动检查时可通过 `ACS_DATA_DIR` 指向临时目录，避免使用真实资料。

阶段验收记录见 [阶段 1](../docs/standalone-stage-1-acceptance.md)与[阶段 2](../docs/standalone-stage-2-acceptance.md)。
