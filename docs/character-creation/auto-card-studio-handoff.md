# A.U.T.O 角色卡创作台交接文档

> 文档版本：0.6.57 对应版本  
> 更新日期：2026-08-09  
> 面向对象：后续维护脚本、排查线上问题或发布新版本的开发者。

## 1. 项目定位

`A.U.T.O 角色卡创作台`是运行在 SillyTavern 酒馆助手（TavernHelper）中的浏览器端脚本。它把 A.U.T.O v2.0 的创作预设拆成 30 个步骤，负责：

- 维护项目、步骤对话和结构化产物；
- 用独立导入的 A.U.T.O 预设组织每轮模型请求；
- 根据产物生成、校验并发布角色卡与世界书；
- 提供续作导入、附属世界书、自建产物、独立创作助手与 GitHub 云仓库。

它不是 SillyTavern 插件，也不直接修改 SillyTavern 核心文件；主体通过酒馆助手脚本的 `import` 加载。

## 2. 仓库与文件地图

| 位置 | 用途 | 修改注意事项 |
| --- | --- | --- |
| `dist/character-creation/auto-card-studio/index.js` | 创作台主体。样式、HTML、状态、提示词、发布、云仓库均在此文件。 | 当前是有意维持的单文件浏览器脚本；改动时按功能区就近维护，避免引入构建依赖。 |
| `dist/character-creation/auto-card-studio-bootstrap/index.js` | 固定导入入口。读取正式目录版本后加载对应版本标签。 | 用户实际安装的是该入口，通常不应改成直接加载 `main`。 |
| `catalog.json` | 正式版本目录。Bootstrap 以此决定应加载哪个标签。 | 发布时版本号必须与 Git tag、主体常量一致。 |
| `docs/character-creation/auto-card-studio.md` | 面向普通用户的安装与功能说明。 | 新功能需要补充简明说明，避免把维护细节塞入该文档。 |
| `services/auto-card-cloud-auth/src/index.js` | Cloudflare Worker：GitHub 设备授权及刷新令牌中转。 | 不存令牌，不处理仓库文件；仅代理 `/device` 与 `/token`。 |
| `services/auto-card-cloud-auth/wrangler.jsonc` | Worker 的 Wrangler 配置。 | 部署 Worker 前核对 Worker 名称、账户及 GitHub App 配置。 |

远程仓库：`https://github.com/NightingNine/sillytavern-scripts.git`。

## 3. 运行与更新链路

用户在酒馆助手中安装的是：

```js
import 'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-bootstrap-v4/dist/character-creation/auto-card-studio-bootstrap/index.js';
```

启动顺序如下：

1. Bootstrap 先读取浏览器本地的正式版本缓存；缓存有效期为 6 小时。
2. 缓存无效时，从 GitHub Raw、jsDelivr 两个地址依次读取 `catalog.json`。
3. 从 `character-creation / auto-card-studio / version` 读取版本号。
4. Bootstrap 从固定 Git tag `auto-card-studio-vX.Y.Z` 加载主体脚本。
5. 主体脚本建立单例运行时，加载本地数据，再渲染创作台。

这意味着：

- 正常刷新不一定访问 GitHub；6 小时内会直接使用版本缓存。
- 标题栏的“检查更新”会强制联网，不受缓存限制。
- 正式发布必须同时更新主体版本号、`catalog.json`，并创建同名版本 tag；只推送 `main` 而没有 tag，已安装用户无法加载新主体。
- Bootstrap 加载失败不会回退旧版，会明确提示用户检查网络并刷新，避免新旧逻辑混用。

## 4. 主要数据与存储边界

### 4.1 浏览器本地数据

| 数据 | 默认存储 | 内容 |
| --- | --- | --- |
| 项目元数据 | IndexedDB：`auto-card-studio-projects / projects` | 项目名称、母题、当前步骤、创作偏好、输出目标、步骤状态等。 |
| 步骤数据 | IndexedDB：`auto-card-studio-projects / steps` | 每一步的多会话记录、当前会话和状态。 |
| 产物库 | IndexedDB：`auto-card-studio-artifacts / project-vaults` | 正式产物、历史版本、当前选中版本与上下文开关。 |
| 创作资源 | IndexedDB：`auto-card-studio-resources / resources` | 独立预设、独立正则、附属世界书快照等。 |
| 兼容数据 | localStorage 与旧 IndexedDB | 只为旧版本迁移或 IndexedDB 不可用时回退。 |
| 云仓库登录 | localStorage：`auto-card-studio:cloud:v1` | GitHub 登录信息、仓库、分支及令牌刷新信息。 |
| 更新缓存 | localStorage：`auto-card-studio:update-state:v1` | 最近确认的正式版本及检查时间。 |

项目数据默认不上传。只有用户显式执行“云仓库上传”时，角色卡、头像、嵌入的世界书快照和索引才会写入其指定 GitHub 仓库。

### 4.2 角色卡中的续作快照

发布角色卡时，会把精简后的项目续作快照写入：

```text
character.extensions.auto_card_studio
```

其中保留项目母题、创作偏好、步骤状态、当前已发布产物和世界书信息。它用于把已发布角色卡重新导入创作台继续创作，不是完整项目备份：不会恢复历史对话、旧产物版本、未选中的产物或被重组方案废弃的世界书内容。

## 5. 核心业务数据流

### 5.1 正常步骤生成

每次点击“生成”或“重试”时，核心入口是 `runStepGeneration`。它会：

1. 读取当前项目、当前步骤、当前独立预设与连接配置。
2. 通过 `buildOrderedPrompts` 组装实际消息队列。
3. 在写入对话或请求模型前，用“输入 Token + 最大回复 Token”校验上下文上限。
4. 先将用户输入写进当前会话并立即重渲染，再请求模型。
5. 保存 AI 回复并解析符合该步骤协议的正式产物。
6. 将同身份产物作为新历史版本写入产物库，当前选中版本决定后续上下文和发布内容。

正常消息顺序为：模板变量保护系统消息 → 已启用预设条目与当前步骤条目 → 项目上下文 → 已激活的附属世界书 → 当前步骤历史会话 → 本轮输入。

重试会额外找出“被重试的那条旧 AI 回复”所产出的产物，并在本轮项目上下文中排除它们，避免把同一产物回传给 AI 后重复生成。

### 5.2 项目上下文规则

- 默认发送前序步骤的当前正式产物。
- 当前步骤已有正式产物也会发送，用于继续完善；重试时会排除该旧回复产生的同批产物。
- 后序步骤产物默认不发送；用户开启“后序产物”后才会追加。
- 每个产物可单独关闭上下文发送；关闭不会删除产物。
- 产物正文会使用当前选中版本，过程说明、评分、追问和未识别文本不会自动混入。

### 5.3 创作偏好

项目偏好保存在 `project.preferences`：`aiRole`、`creatorRole`、`wordCount`、`language`、`person`。

脚本会在正常生成时，将它们替换进 A.U.T.O 原预设固定“设置”条目中的 `setvar` 值。作用是创作提示词约束，不是模型硬参数：

- `wordCount` 只是目标字数，不等于最大回复 Token；
- `language`、`person` 是提示词偏好，模型不保证绝对服从；
- `creatorRole` 还会写入最终角色卡的 `creator` 字段；
- `aiRole` 同时用作 AI 回复气泡的显示名称。

当前实现按预设条目固定 ID 注入，因此只保证 A.U.T.O 原配预设有效。接入其他预设时，必须把这套机制改为“预设声明变量能力”，不能假设所有预设都有相同条目 ID 或变量名。

### 5.4 附属世界书与自建产物

- 附属世界书是全项目共用的参考快照；每个项目可单独启用整本或单条。
- 常驻条目每轮发送；关键词条目仅在本轮用户输入命中关键词时发送。
- 附属世界书只作为参考，不进入正式产物、Step 29 重组或最终发布。
- 自建产物绑定一个步骤，和 AI 产物一样具备版本、上下文与发布能力。

### 5.5 多会话和独立创作助手

- 一个步骤可保存多个命名会话；会话切换只改变当前步骤对话，不会删产物。
- 独立创作助手与步骤流程、A.U.T.O 预设和步骤对话隔离；其身份、系统提示词单独保存在浏览器。
- 用户可在独立助手中手动勾选要附带的正式产物。未勾选时，助手不会读取任何项目内容。

## 6. 世界书重组与发布

### 6.1 Step 29 与发布阶段

Step 29 是“世界书重组”步骤：

1. 用户先点击“分析当前产物”，脚本将当前有效世界书类产物转为带稳定 `blockId` 的结构报告。
2. 用户再正常生成，AI 输出 `reorg_plan` JSON 方案。
3. 脚本校验方案是否覆盖、重复或伪造 `blockId`，通过后才把方案入产物库。

最终发布时，脚本会再次以选中的正式产物和有效方案执行内部重组请求。该发布专用请求只发送重组相关上下文，不发送普通项目会话、附属世界书或创作偏好。

### 6.2 发布结果

发布入口会让用户勾选本次交付产物。成功后：

- 依据重组方案创建或覆盖目标世界书；
- 被方案判为废弃的世界书条目不写入最终世界书，但原产物仍在创作台保留；
- 创建或覆盖角色卡，写入开场白、`creator`、世界书绑定、局部正则和续作快照；
- 发布时选中的输出格式可写入配套正则；
- 修改产物集合后会让旧结构报告与重组方案失效，必须重新执行 Step 29。

发布失败优先查看浏览器控制台中 `[A.U.T.O Card Studio] 发布失败`、`生成诊断` 和网络请求；不要在未确认原因时重复删除项目数据。

## 7. GitHub 云仓库

### 7.1 认证与安全边界

云仓库使用 GitHub App Device Flow：

1. 浏览器在用户点击“连接 GitHub”的同步阶段打开 GitHub 设备授权页，以兼容移动端弹窗限制。
2. Cloudflare Worker 仅转发设备码与刷新令牌请求到 GitHub，不保存令牌，也不读取仓库。
3. 浏览器把访问令牌和刷新令牌保存在本机 localStorage；访问令牌临近过期时自动刷新。
4. 刷新令牌到期或失效后，用户必须重新授权。

不要把用户令牌写进仓库、文档、日志或 Worker 环境变量。GitHub App 的 Client ID 是公开标识，不是密钥。

### 7.2 仓库文件协议

云仓库根目录维护：

```text
registry.json
cards/<cardId>/character.json
cards/<cardId>/avatar.png
```

上传时会优先读取角色当前绑定世界书的真实条目，并嵌入 `character.character_book.entries`。这是跨设备同步世界书完整结构的关键；只同步世界书名称会导致另一台设备出现条目数和结构不一致。

下载时会为避免覆盖本地同名角色而自动改名，并根据嵌入条目创建新的本地世界书。旧版云端角色若没有世界书快照，脚本会停止导入并提示回原设备升级后重新上传，不能静默生成空世界书。

上传前会比较云端 revision；发现另一设备已更新时要求用户确认是否覆盖。删除云端角色目前是“归档”：索引设为 `archived`，不直接删除 GitHub 文件。

## 8. 常用维护入口

主体文件较大，建议使用函数名搜索而不是依赖固定行号：

| 目标 | 关键函数或常量 |
| --- | --- |
| 创建、迁移、保存项目 | `createDefaultProject`、`normalizeProject`、`saveProject`、`persistProjectSnapshot` |
| 产物版本与上下文 | `effectiveStepArtifacts`、`artifactIdsProducedInTurns`、`buildProjectContext` |
| 提示词预览与生成 | `buildOrderedPrompts`、`openPromptPreview`、`runStepGeneration`、`generateRawWithOpaqueRetry` |
| 世界书重组 | `buildReorgStructureReport`、`reorgPlanFromResponse`、`runDeliveryReorg` |
| 发布与续作 | `openDeliveryDialog`、`buildCharacterProjectSnapshot`、`importContinuationCharacter` |
| 附属世界书 | `buildReferenceWorldbookContext`、`enabledReferenceWorldbookEntries` |
| 独立助手 | `openCreativeAssistant`、`creativeAssistantSystemPrompt` |
| 云仓库 | `beginCloudDeviceLogin`、`uploadCharacterToCloud`、`importCloudCharacter` |
| 版本更新 | `getLatestPublishedVersion`、`checkForUpdatesManually`、Bootstrap 的 `fetchPublishedVersion` |

## 9. 验证与排障清单

### 9.1 改动后最低验证

1. 运行 `node --check dist/character-creation/auto-card-studio/index.js`，确认脚本可解析。
2. 用已导入 A.U.T.O 预设的 SillyTavern 测试：打开创作台、切换项目、发送一条步骤消息、查看提示词预览。
3. 若改动产物或发布链路：新增/切换一个产物版本，执行 Step 29 分析与方案生成，再在测试角色上发布。
4. 若改动移动端：至少检查约 360px 和约 430px 宽度，确认弹窗、下拉框、步骤栏和底部四按钮可操作。
5. 若改动云仓库：上传含绑定世界书的测试角色，在另一浏览器配置文件或设备下载，核对条目数量、UID、关键词、启用状态及注入设置。
6. 若改动 Worker：验证 `/device`、轮询 `/token`、刷新令牌三条路径；不得输出令牌。

### 9.2 常见症状

| 症状 | 优先检查 |
| --- | --- |
| AI 没遵循创作偏好 | 在“查看提示词”中搜索设置值；确认导入的是原配 A.U.T.O 预设且设置条目仍保留变量。 |
| 重试后产物重复 | 检查 `artifactIdsProducedInTurns` 和 `excludedArtifactIds` 是否仍同时传入 `buildProjectContext`。 |
| 发布清单条数不对 | 检查 `collectArtifactGroups`、选中版本和重组方案产物是否被过滤；不要只看对话条数。 |
| 世界书重组校验失败但 AI 有方案 | 查看控制台错误和 `reorgPlanFromResponse` 的解析结果；确认方案完整引用结构报告中的 `blockId`。 |
| 云端下载后世界书不一致 | 检查上传角色是否带 `character.character_book.entries`；旧云端卡需要从更新后的原设备重新上传。 |
| 移动端连接 GitHub无反应 | 检查是否在点击事件同步阶段调用 `hostWindow.open`，以及浏览器是否拦截弹窗。 |
| 更新后反复提示更新 | 检查 Bootstrap 与主体是否都使用同一 `auto-card-studio:update-state:v1` 缓存协议，以及 `catalog.json`、tag、主体版本是否一致。 |

## 10. 当前已知限制与后续建议

1. 主体脚本是单文件，定位功能区依赖函数搜索。短期应继续保持单文件，除非引入可靠的构建、热更新和回归验证流程后再拆分。
2. 创作偏好对 A.U.T.O 预设使用固定条目 ID 注入；其他预设暂不具备等价保证。后续多预设支持应定义“预设能力声明”和可映射变量，而不是继续增加硬编码 ID。
3. 目标字数是提示词软约束。若要增加硬控制，应另行设计与模型最大输出 Token 的关系，不能直接把两个数互相覆盖。
4. 云仓库只同步最终角色卡及其嵌入世界书快照，不同步完整创作项目、对话和产物历史。
5. 附属世界书依据用户本轮输入的关键词激活；它是资料而非高优先级指令，也不会进入最终发布。
6. 发布会写入 SillyTavern 的角色卡和世界书，调试时优先使用独立测试角色与测试世界书，避免覆盖用户正在使用的正式角色。

## 11. 正式发布流程

仅在功能完成、验证通过且决定进入正式版时执行：

1. 将 `AUTO_CARD_STUDIO_VERSION` 改为新版本号。
2. 更新 `catalog.json` 的同一版本号，并补充面向用户的 `docs/character-creation/auto-card-studio.md`。
3. 完成第 9 节对应验证；至少运行 `node --check`。
4. 审核 `git diff`，确认不包含令牌、个人测试数据、临时日志或无关文件。
5. 提交并推送 `main`。
6. 创建并推送与目录一致的 tag：`auto-card-studio-vX.Y.Z`。
7. 用已安装 Bootstrap 的干净浏览器环境确认：目录版本可读取、对应 tag 脚本可加载、标题栏版本正确。

发布顺序不可颠倒：`catalog.json` 指向的版本必须已经存在对应 Git tag，否则新用户或刷新后的用户会加载失败。

## 12. 交接时应一并提供的环境信息

交接给新维护者时，除本文件外，还应私下、安全地提供：

- GitHub 仓库的维护权限；
- GitHub App 的所有者、Client Secret 管理位置和回调/设备授权配置；
- Cloudflare 账户及 `auto-card-cloud-auth` Worker 的部署权限；
- 用于测试的 SillyTavern + TavernHelper 环境；
- 测试角色卡和测试世界书（不得包含真实用户隐私或 API Key）。

这些敏感信息不要写进 Git 仓库，也不要嵌入脚本。
