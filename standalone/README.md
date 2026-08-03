# A.U.T.O 独立版

阶段 1 已完成：本地启动、三栏工作区、29 步导航、多项目和项目安全保存。

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

阶段验收记录见 [standalone-stage-1-acceptance.md](../docs/standalone-stage-1-acceptance.md)。
