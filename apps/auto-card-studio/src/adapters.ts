import { isTauri } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import Database from "@tauri-apps/plugin-sql";
import { Client, Stronghold, Store } from "@tauri-apps/plugin-stronghold";
import {
  RevisionConflictError,
  WorkspaceRecoveryRequiredError,
  cloneSnapshot,
  migrateSnapshot,
  type StudioSnapshot,
  type WorkspaceResources,
} from "./core.ts";
import type {
  CommitAck,
  ModelSettings,
  ModelSettingsRepository,
  ModelGateway,
  ModelRequest,
  ModelStreamEvent,
  ProjectFilePort,
  SecretStatus,
  SecretStore,
  StudioRepository,
} from "./ports.ts";
import { DEFAULT_MODEL_SETTINGS } from "./ports.ts";
import type { FetchLike } from "./model.ts";

interface WorkspaceRow {
  snapshot: string;
  revision: number;
}

interface ModelSettingsRow {
  mode: string;
  base_url: string;
  model: string;
  timeout_ms: number;
  updated_at: string;
}

function cloneModelSettings(settings: ModelSettings): ModelSettings {
  return { ...settings };
}

function settingsFromRow(row: ModelSettingsRow): ModelSettings {
  return {
    mode: row.mode === "openai-compatible" ? "openai-compatible" : "stub",
    baseUrl: String(row.base_url || DEFAULT_MODEL_SETTINGS.baseUrl),
    model: String(row.model || ""),
    timeoutMs: Number(row.timeout_ms) || DEFAULT_MODEL_SETTINGS.timeoutMs,
    updatedAt: String(row.updated_at || ""),
  };
}

export class MemoryStudioRepository implements StudioRepository, ModelSettingsRepository {
  readonly ackKind = "memory-cas" as const;
  readonly label = "内存预览（刷新后重置）";
  private stored: StudioSnapshot | null;
  private modelSettings = cloneModelSettings(DEFAULT_MODEL_SETTINGS);

  constructor(snapshot: StudioSnapshot | null = null) {
    this.stored = snapshot ? cloneSnapshot(snapshot) : null;
  }

  async loadOrCreate(initialSnapshot: StudioSnapshot): Promise<StudioSnapshot> {
    if (!this.stored) this.stored = cloneSnapshot(initialSnapshot);
    return cloneSnapshot(this.stored);
  }

  async commit(expectedRevision: number, nextSnapshot: StudioSnapshot): Promise<CommitAck> {
    if (!this.stored) throw new Error("内存工作区尚未初始化。");
    if (this.stored.revision !== expectedRevision) {
      throw new RevisionConflictError(expectedRevision, this.stored.revision);
    }
    this.stored = cloneSnapshot(nextSnapshot);
    return { level: this.ackKind, snapshot: cloneSnapshot(this.stored) };
  }

  async loadModelSettings(): Promise<ModelSettings> {
    return cloneModelSettings(this.modelSettings);
  }

  async saveModelSettings(settings: ModelSettings): Promise<ModelSettings> {
    this.modelSettings = cloneModelSettings(settings);
    return cloneModelSettings(this.modelSettings);
  }

  async getRecoveryCandidate(): Promise<null> {
    return null;
  }

  async recoverFromBackup(): Promise<StudioSnapshot> {
    throw new Error("内存预览没有可恢复的本地备份。");
  }
}

export class SqliteStudioRepository implements StudioRepository, ModelSettingsRepository {
  readonly ackKind = "sqlite-cas-readback" as const;
  readonly label = "SQLite · CAS 读回确认";
  private database: Database | null = null;
  private pendingRecovery: StudioSnapshot | null = null;
  private fallbackResources: WorkspaceResources | null = null;

  private async db(): Promise<Database> {
    if (!this.database) this.database = await Database.load("sqlite:auto-card-studio.db");
    return this.database;
  }

  private decodeSnapshot(source: string): StudioSnapshot {
    if (!this.fallbackResources) throw new Error("SQLite 工作区尚未初始化资源迁移器。");
    return migrateSnapshot(JSON.parse(source), this.fallbackResources);
  }

  private async read(): Promise<StudioSnapshot | null> {
    const database = await this.db();
    const rows = await database.select<WorkspaceRow[]>(
      "SELECT snapshot, revision FROM studio_workspace WHERE id = $1 LIMIT 1",
      ["primary"],
    );
    if (!rows.length) return null;
    const snapshot = this.decodeSnapshot(rows[0].snapshot);
    if (snapshot.revision !== Number(rows[0].revision)) {
      throw new Error("SQLite revision 与快照正文不一致，已停止写入。");
    }
    return snapshot;
  }

  private async readBackup(): Promise<StudioSnapshot | null> {
    const database = await this.db();
    const rows = await database.select<WorkspaceRow[]>(
      "SELECT snapshot, revision FROM studio_workspace_backup WHERE id = $1 LIMIT 1",
      ["primary"],
    );
    if (!rows.length) return null;
    const snapshot = this.decodeSnapshot(rows[0].snapshot);
    if (snapshot.revision !== Number(rows[0].revision)) {
      throw new Error("SQLite 备份 revision 与快照正文不一致。");
    }
    return snapshot;
  }

  private async writeBackup(snapshot: StudioSnapshot): Promise<void> {
    const database = await this.db();
    await database.execute(
      "INSERT INTO studio_workspace_backup (id, schema_version, revision, snapshot, updated_at) VALUES ($1, $2, $3, $4, $5) \
       ON CONFLICT(id) DO UPDATE SET schema_version = excluded.schema_version, revision = excluded.revision, \
       snapshot = excluded.snapshot, updated_at = excluded.updated_at",
      [
        snapshot.workspaceId,
        snapshot.schemaVersion,
        snapshot.revision,
        JSON.stringify(snapshot),
        snapshot.updatedAt,
      ],
    );
    const readback = await this.readBackup();
    if (!readback || readback.revision !== snapshot.revision) {
      throw new Error("上一份有效工程备份写入后无法读回。");
    }
  }

  async loadOrCreate(initialSnapshot: StudioSnapshot): Promise<StudioSnapshot> {
    this.fallbackResources = cloneSnapshot(initialSnapshot.resources);
    const database = await this.db();
    await database.execute(
      "INSERT OR IGNORE INTO studio_workspace (id, schema_version, revision, snapshot, updated_at) VALUES ($1, $2, $3, $4, $5)",
      [
        initialSnapshot.workspaceId,
        initialSnapshot.schemaVersion,
        initialSnapshot.revision,
        JSON.stringify(initialSnapshot),
        initialSnapshot.updatedAt,
      ],
    );
    let stored: StudioSnapshot | null;
    try {
      const rows = await database.select<WorkspaceRow[]>(
        "SELECT snapshot, revision FROM studio_workspace WHERE id = $1 LIMIT 1",
        ["primary"],
      );
      const raw = rows.length ? JSON.parse(rows[0].snapshot) as { schemaVersion?: unknown } : null;
      if (raw?.schemaVersion === 1) {
        // 迁移前先把原始 v1 行复制到备份表；恢复时会再次走同一幂等迁移。
        await database.execute(
          "INSERT INTO studio_workspace_backup (id, schema_version, revision, snapshot, updated_at) \
           SELECT id, schema_version, revision, snapshot, updated_at FROM studio_workspace WHERE id = $1 \
           ON CONFLICT(id) DO UPDATE SET schema_version = excluded.schema_version, revision = excluded.revision, \
           snapshot = excluded.snapshot, updated_at = excluded.updated_at",
          ["primary"],
        );
        const migrated = migrateSnapshot(raw, initialSnapshot.resources);
        await database.execute(
          "UPDATE studio_workspace SET schema_version = $1, snapshot = $2, updated_at = $3 WHERE id = $4 AND revision = $5",
          [migrated.schemaVersion, JSON.stringify(migrated), migrated.updatedAt, migrated.workspaceId, migrated.revision],
        );
      }
      stored = await this.read();
    } catch {
      const backup = await this.readBackup().catch(() => null);
      if (!backup) {
        throw new Error("当前工程无法读取，且没有可验证的上一份备份；已停止写入。");
      }
      this.pendingRecovery = cloneSnapshot(backup);
      throw new WorkspaceRecoveryRequiredError(backup.revision);
    }
    if (!stored) throw new Error("SQLite 工作区初始化后无法读回。");
    const backup = await this.readBackup().catch(() => null);
    if (!backup) await this.writeBackup(stored);
    return cloneSnapshot(stored);
  }

  async commit(expectedRevision: number, nextSnapshot: StudioSnapshot): Promise<CommitAck> {
    const database = await this.db();
    const current = await this.read();
    if (!current || current.revision !== expectedRevision) {
      throw new RevisionConflictError(expectedRevision, current?.revision ?? -1);
    }
    await this.writeBackup(current);
    const result = await database.execute(
      "UPDATE studio_workspace SET schema_version = $1, revision = $2, snapshot = $3, updated_at = $4 WHERE id = $5 AND revision = $6",
      [
        nextSnapshot.schemaVersion,
        nextSnapshot.revision,
        JSON.stringify(nextSnapshot),
        nextSnapshot.updatedAt,
        nextSnapshot.workspaceId,
        expectedRevision,
      ],
    );
    if (result.rowsAffected !== 1) {
      const actual = await this.read();
      throw new RevisionConflictError(expectedRevision, actual?.revision ?? -1);
    }
    const readback = await this.read();
    if (!readback || readback.revision !== nextSnapshot.revision) {
      throw new Error("SQLite 写入完成，但 revision 读回校验失败。");
    }
    const expectedReceipt = nextSnapshot.receipts.at(-1);
    const readbackReceipt = readback.receipts.at(-1);
    if (!expectedReceipt || readbackReceipt?.commandId !== expectedReceipt.commandId) {
      throw new Error("SQLite 写入完成，但命令收据读回校验失败。");
    }
    return { level: this.ackKind, snapshot: cloneSnapshot(readback) };
  }

  async getRecoveryCandidate(): Promise<StudioSnapshot | null> {
    if (this.pendingRecovery) return cloneSnapshot(this.pendingRecovery);
    const backup = await this.readBackup().catch(() => null);
    return backup ? cloneSnapshot(backup) : null;
  }

  async recoverFromBackup(): Promise<StudioSnapshot> {
    const backup = this.pendingRecovery ?? await this.readBackup();
    if (!backup) throw new Error("没有可恢复的上一份有效工程备份。");
    const database = await this.db();
    const result = await database.execute(
      "UPDATE studio_workspace SET schema_version = $1, revision = $2, snapshot = $3, updated_at = $4 WHERE id = $5",
      [
        backup.schemaVersion,
        backup.revision,
        JSON.stringify(backup),
        backup.updatedAt,
        backup.workspaceId,
      ],
    );
    if (result.rowsAffected !== 1) throw new Error("恢复备份时无法替换损坏的主工程。");
    const readback = await this.read();
    if (!readback || readback.revision !== backup.revision) {
      throw new Error("备份恢复完成，但主工程读回校验失败。");
    }
    this.pendingRecovery = null;
    return cloneSnapshot(readback);
  }

  async loadModelSettings(): Promise<ModelSettings> {
    const database = await this.db();
    const rows = await database.select<ModelSettingsRow[]>(
      "SELECT mode, base_url, model, timeout_ms, updated_at FROM app_model_settings WHERE id = $1 LIMIT 1",
      ["primary"],
    );
    return rows.length ? settingsFromRow(rows[0]) : cloneModelSettings(DEFAULT_MODEL_SETTINGS);
  }

  async saveModelSettings(settings: ModelSettings): Promise<ModelSettings> {
    const database = await this.db();
    await database.execute(
      "INSERT INTO app_model_settings (id, mode, base_url, model, timeout_ms, updated_at) VALUES ($1, $2, $3, $4, $5, $6) \
       ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, base_url = excluded.base_url, model = excluded.model, \
       timeout_ms = excluded.timeout_ms, updated_at = excluded.updated_at",
      [
        "primary",
        settings.mode,
        settings.baseUrl,
        settings.model,
        settings.timeoutMs,
        settings.updatedAt,
      ],
    );
    const readback = await this.loadModelSettings();
    if (
      readback.mode !== settings.mode
      || readback.baseUrl !== settings.baseUrl
      || readback.model !== settings.model
      || readback.timeoutMs !== settings.timeoutMs
    ) {
      throw new Error("模型设置写入后读回校验失败。");
    }
    return readback;
  }
}

const STRONGHOLD_CLIENT = "auto-card-studio";
const API_KEY_RECORD = "model-api-key";

export class TauriStrongholdSecretStore implements SecretStore {
  private stronghold: Stronghold | null = null;
  private store: Store | null = null;
  private hasApiKey = false;

  status(): SecretStatus {
    return {
      supported: true,
      unlocked: this.stronghold !== null,
      hasApiKey: this.stronghold !== null && this.hasApiKey,
    };
  }

  async unlock(passphrase: string): Promise<SecretStatus> {
    if (passphrase.length < 8) throw new Error("密钥仓口令至少需要 8 个字符。");
    await this.lock();
    const vaultPath = await join(await appLocalDataDir(), "auto-card-studio-vault.hold");
    let stronghold: Stronghold | null = null;
    try {
      stronghold = await Stronghold.load(vaultPath, passphrase);
      let client: Client;
      try {
        client = await stronghold.loadClient(STRONGHOLD_CLIENT);
      } catch {
        client = await stronghold.createClient(STRONGHOLD_CLIENT);
      }
      const store = client.getStore();
      const existing = await store.get(API_KEY_RECORD);
      this.hasApiKey = existing !== null;
      existing?.fill(0);
      this.stronghold = stronghold;
      this.store = store;
      return this.status();
    } catch {
      await stronghold?.unload().catch(() => undefined);
      throw new Error("无法解锁密钥仓。若已保存过密钥，请检查口令是否正确。");
    }
  }

  async readApiKey(): Promise<string | null> {
    if (!this.store || !this.stronghold) return null;
    const encoded = await this.store.get(API_KEY_RECORD);
    if (!encoded) {
      this.hasApiKey = false;
      return null;
    }
    try {
      this.hasApiKey = true;
      return new TextDecoder().decode(encoded);
    } finally {
      encoded.fill(0);
    }
  }

  async saveApiKey(apiKey: string): Promise<SecretStatus> {
    if (!this.store || !this.stronghold) throw new Error("请先解锁密钥仓。");
    const normalized = apiKey.trim();
    if (!normalized) throw new Error("API Key 不能为空。");
    const encoded = new TextEncoder().encode(normalized);
    try {
      await this.store.insert(API_KEY_RECORD, Array.from(encoded));
      await this.stronghold.save();
      this.hasApiKey = true;
      return this.status();
    } finally {
      encoded.fill(0);
    }
  }

  async removeApiKey(): Promise<SecretStatus> {
    if (!this.store || !this.stronghold) throw new Error("请先解锁密钥仓。");
    const removed = await this.store.remove(API_KEY_RECORD);
    removed?.fill(0);
    await this.stronghold.save();
    this.hasApiKey = false;
    return this.status();
  }

  async lock(): Promise<SecretStatus> {
    const current = this.stronghold;
    this.stronghold = null;
    this.store = null;
    this.hasApiKey = false;
    await current?.unload();
    return this.status();
  }
}

export class UnsupportedSecretStore implements SecretStore {
  status(): SecretStatus {
    return { supported: false, unlocked: false, hasApiKey: false };
  }

  async unlock(): Promise<SecretStatus> {
    throw new Error("浏览器预览不提供密钥仓，请在 APK 或桌面应用中配置真实模型。");
  }

  async readApiKey(): Promise<null> {
    return null;
  }

  async saveApiKey(): Promise<SecretStatus> {
    return this.unlock();
  }

  async removeApiKey(): Promise<SecretStatus> {
    return this.unlock();
  }

  async lock(): Promise<SecretStatus> {
    return this.status();
  }
}

const MAX_PROJECT_FILE_BYTES = 20 * 1024 * 1024;
const PROJECT_FILE_FILTERS = [{
  name: "A.U.T.O 项目",
  extensions: ["json"],
}];

function projectFileSize(contents: string): number {
  return new TextEncoder().encode(contents).byteLength;
}

function assertProjectFileSize(contents: string): void {
  if (projectFileSize(contents) > MAX_PROJECT_FILE_BYTES) {
    throw new Error("JSON 文件超过 20 MB，当前版本为避免设备卡死已停止处理。");
  }
}

function fileNameFromPath(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // 非 URI 路径保持原样；文件读写结果不受展示名称影响。
  }
  const leaf = decoded.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  return leaf.split(":").filter(Boolean).at(-1) ?? "未命名项目.json";
}

export class TauriProjectFilePort implements ProjectFilePort {
  readonly label = "系统文件选择器";

  async importProject() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: PROJECT_FILE_FILTERS,
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return { status: "cancelled" as const };
    const contents = await readTextFile(path);
    assertProjectFileSize(contents);
    return {
      status: "selected" as const,
      name: fileNameFromPath(path),
      contents,
    };
  }

  async exportProject(options: { suggestedName: string; contents: string }) {
    assertProjectFileSize(options.contents);
    const path = await save({
      defaultPath: options.suggestedName,
      filters: PROJECT_FILE_FILTERS,
    });
    if (!path) return { status: "cancelled" as const };
    await writeTextFile(path, options.contents);
    // 文件写入后立即读回，避免把“对话框已关闭”误当成保存成功。
    const readback = await readTextFile(path);
    if (readback !== options.contents) {
      throw new Error("项目文件已写入，但读回校验失败。");
    }
    return {
      status: "saved" as const,
      name: fileNameFromPath(path),
    };
  }
}

export class BrowserProjectFilePort implements ProjectFilePort {
  readonly label = "浏览器下载";

  importProject(): ReturnType<ProjectFilePort["importProject"]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.hidden = true;
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) {
          resolve({ status: "cancelled" });
          return;
        }
        if (file.size > MAX_PROJECT_FILE_BYTES) {
          reject(new Error("JSON 文件超过 20 MB，当前版本为避免设备卡死已停止处理。"));
          return;
        }
        void file.text().then((contents) => {
          assertProjectFileSize(contents);
          resolve({ status: "selected", name: file.name, contents });
        }, reject);
      }, { once: true });
      document.body.append(input);
      input.click();
    });
  }

  async exportProject(options: { suggestedName: string; contents: string }) {
    assertProjectFileSize(options.contents);
    const url = URL.createObjectURL(new Blob([options.contents], { type: "application/json" }));
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = options.suggestedName;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { status: "saved" as const, name: options.suggestedName };
  }
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request canceled", "AbortError"));
      return;
    }
    const timer = globalThis.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException("Request canceled", "AbortError"));
    }, { once: true });
  });
}

function safeExcerpt(value: string, maxLength = 120): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function stubArtifactResponse(step: number, excerpt: string): string {
  const note = `这是 Step ${step} 的可控离线样例，用于验证移动端完整链路。参考输入：${excerpt}`;
  const responses: Record<number, string> = {
    1: `<WORLD_interaction_paradigm>\n${note}\nAI 推动世界与 NPC，但不替玩家作关键选择。\n</WORLD_interaction_paradigm>\n\n<WORLD_aesthetic_program>\n以具体行动、环境反馈和可追溯后果呈现体验。\n</WORLD_aesthetic_program>`,
    2: `<WORLD_implementation_mechanisms_core>\n${note}\n通过线索、关系与资源消耗持续驱动体验。\n</WORLD_implementation_mechanisms_core>`,
    3: `<WORLD_arc_framework_main>\n${note}\n起点：陌生；转折：共同承担；终点：形成可信赖的合作。\n</WORLD_arc_framework_main>`,
    4: `<WORLD_blueprint>\n${note}\n世界由边境城、旧航路与记忆规则三根支柱组成。\n</WORLD_blueprint>`,
    5: `<WORLD_main_characters_向导_原点>\n坚守承诺，不替玩家决定。\n</WORLD_main_characters_向导_原点>\n<WORLD_main_characters_向导_画像>\n谨慎、敏锐、表达克制。\n</WORLD_main_characters_向导_画像>\n<WORLD_main_characters_向导_状态>\n初始信任较低，正在观察玩家。\n</WORLD_main_characters_向导_状态>`,
    6: `<WORLD_relationship_map_main>\n${note}\n玩家—向导：合作与试探；向导—公会：责任与戒备。\n</WORLD_relationship_map_main>`,
    7: `<WORLD_generative_rules_places>\n${note}\n每个地点都由一种资源、一个风险和一个社会矛盾塑造。\n</WORLD_generative_rules_places>`,
    8: `<WORLD_specific_instances_harbor>\n${note}\n灰帆港依赖雾灯矿，风暴会暴露被掩埋的旧航道。\n</WORLD_specific_instances_harbor>`,
    9: `<WORLD_lore_customs>\n${note}\n当地人在交易前交换一段真实记忆，拒绝意味着不信任。\n</WORLD_lore_customs>`,
    10: `<SOURCE_spatial_planning>\n${note}\n区域：灰帆港、断潮航路、风暴核心。\n</SOURCE_spatial_planning>`,
    11: `<SOURCE_plot_graph_main>\n${note}\n港口→获得许可→进入航路→选择救援或追踪→抵达核心。\n</SOURCE_plot_graph_main>`,
    12: `<WORLD_dimension_harbor>\n${note}\n灰帆港包含公会、码头、记忆市场与夜间风暴事件。\n</WORLD_dimension_harbor>`,
    13: `<WORLD_narrative_core>\n${note}\n第三人称近距离；优先动作与感官；未知信息不提前揭示。\n</WORLD_narrative_core>`,
    14: `<WORLD_language_materials_harbor>\n${note}\n常用意象：盐、旧铜、湿绳、被风切碎的灯光。\n</WORLD_language_materials_harbor>`,
    15: `<WORLD_scene_strategies_exploration>\n${note}\n探索场景依次给出可感知线索、角色反应和可行动入口。\n</WORLD_scene_strategies_exploration>`,
    16: `<SOURCE_待变量化>\n位置、信任、资源、风暴等级。\n</SOURCE_待变量化>\n<SOURCE_待条件化>\n区域知识、关系阶段、特殊事件。\n</SOURCE_待条件化>`,
    17: `<SOURCE_variable_system_planning>\n${note}\n变量分为 world、player、relationships 三簇。\n</SOURCE_variable_system_planning>`,
    18: `<WORLD_current_demo>\nworld:\n  location: 灰帆港\n  storm: 1\n</WORLD_current_demo>\n\n\`\`\`schema\ndemo: z.object({ world: z.object({ location: z.string(), storm: z.number() }) })\n\`\`\``,
    19: `<WORLD_variable_update_guide>\n${note}\n只根据已发生事件更新变量，保持路径与类型稳定。\n</WORLD_variable_update_guide>\n<SOURCE_step19_plan>\n位置影响区域注入；信任影响关系内容。\n</SOURCE_step19_plan>`,
    20: `<WORLD_location_harbor>\n${note}\n条件：world.location === '灰帆港'。\n</WORLD_location_harbor>`,
    21: `<WORLD_relationship_trusted>\n${note}\n当信任达到阈值时，向导会分享隐秘航路。\n</WORLD_relationship_trusted>`,
    22: `<WORLD_root_index>\n${note}\n世界→区域→灰帆港；人物→向导；规则→记忆交换。\n</WORLD_root_index>`,
    23: `<SOURCE_statusbar_data_guide>\n字段：位置、风暴、信任。\n</SOURCE_statusbar_data_guide>\n\n\`\`\`html\n<body><section class="auto-status"><b>灰帆港</b><span>风暴 1</span></section></body>\n\`\`\`\n\n\`\`\`regex\n<STATUSBAR_DATA>[\\s\\S]*?</STATUSBAR_DATA>\n\`\`\``,
    24: `<SYS_output_format>\n${note}\n<NARRATIVE>正文</NARRATIVE> 后输出 <CONTEXT_options> 和 <STATUSBAR_DATA>。\n</SYS_output_format>`,
    25: `<SOURCE_task_list>\n${note}\n任务一：维护区域世界书；任务二：根据已发生事件更新变量。\n</SOURCE_task_list>`,
    26: `<SYS_task_worldbook_maintenance>\n${note}\n读取当前区域和事实，只修改对应世界书条目。\n</SYS_task_worldbook_maintenance>`,
    27: `<SYS_task_variable_update>\n${note}\n使用 MVU 路径更新发生变化的字段，不改写未涉及变量。\n</SYS_task_variable_update>`,
    28: `<SOURCE_entry_plan>\n${note}\n常驻：核心规则；条件：区域与关系；禁用：设计过程。\n</SOURCE_entry_plan>\n\n\`\`\`autotask_config\n{"tasks":[{"name":"变量更新","enabled":true}]}\n\`\`\``,
    29: `\`\`\`opening\n<NARRATIVE>海风把旧铜铃吹响。向导在灰帆港的雾里停下，等待 {{user}} 作出第一个选择。</NARRATIVE>\n<CONTEXT_options>1. 询问航路 2. 前往记忆市场</CONTEXT_options>\n<STATUSBAR_DATA>位置: 灰帆港 | 风暴: 1</STATUSBAR_DATA>\n\`\`\``,
  };
  return responses[step] || `<WORLD_step_${step}>\n${note}\n</WORLD_step_${step}>`;
}

export class StubModelGateway implements ModelGateway {
  readonly id = "m1-stub";
  readonly label = "可控演示模型";
  readonly chunkDelayMs: number;
  calls = 0;

  constructor(chunkDelayMs = 45) {
    this.chunkDelayMs = chunkDelayMs;
  }

  async *stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelStreamEvent> {
    this.calls += 1;
    const context = request.messages.find((message) => message.name === "项目上下文")?.content ?? "";
    const input = request.messages.at(-1)?.content ?? "";
    const excerpt = safeExcerpt(`${context}\n${input}`) || "尚未补充细节";
    const response = stubArtifactResponse(request.step, excerpt);

    const chunkSize = 34;
    for (let offset = 0; offset < response.length; offset += chunkSize) {
      await abortableDelay(this.chunkDelayMs, signal);
      yield { type: "chunk", delta: response.slice(offset, offset + chunkSize) };
    }
    yield { type: "completed", finishReason: "stub_complete" };
  }
}

export function createStudioRepository(): StudioRepository & ModelSettingsRepository {
  return isTauri() ? new SqliteStudioRepository() : new MemoryStudioRepository();
}

export function createSecretStore(): SecretStore {
  return isTauri() ? new TauriStrongholdSecretStore() : new UnsupportedSecretStore();
}

export function createProjectFilePort(): ProjectFilePort {
  return isTauri() ? new TauriProjectFilePort() : new BrowserProjectFilePort();
}

export const platformFetch: FetchLike = (input, init) => (
  isTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init)
);
