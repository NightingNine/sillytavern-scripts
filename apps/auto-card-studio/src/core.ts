import {
  ARTIFACT_RULES,
  WORKFLOW_STEP_COUNT,
  WORKFLOW_STEPS,
  artifactDisplayName,
  isStepNumber,
  stepDefinition,
  type StepNumber,
} from "./workflow-config.ts";

export const STUDIO_SCHEMA_VERSION = 2;
export const WORKSPACE_ID = "primary";
export const PROJECT_ARCHIVE_FORMAT = "auto-card-studio-project";
export const PROJECT_ARCHIVE_VERSION = 2;
export const MAX_CONTEXT_CHARACTERS = 420_000;

export type StepStatus = "idle" | "draft" | "accepted";
export type TurnRole = "user" | "assistant";
export type ArtifactSource = "generated" | "manual" | "migrated";
export type CommandType =
  | "create-project" | "switch-project" | "delete-project" | "update-project"
  | "navigate-step" | "generate-step" | "accept-step" | "edit-turn" | "delete-turn"
  | "clear-step" | "add-artifact" | "edit-artifact" | "select-artifact" | "delete-artifact"
  | "update-context" | "import-project";

export interface StudioTurn {
  id: string;
  role: TurnRole;
  content: string;
  step: StepNumber;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactVersion {
  id: string;
  step: StepNumber;
  identity: string;
  content: string;
  source: ArtifactSource;
  accepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudioStepState {
  number: StepNumber;
  status: StepStatus;
  turns: StudioTurn[];
  updatedAt: string | null;
}

export interface ProjectPreferences {
  aiRole: string;
  creatorRole: string;
  wordCount: string;
  language: string;
  person: string;
}

export interface StudioProject {
  id: string;
  name: string;
  brief: string;
  currentStep: StepNumber;
  preferences: ProjectPreferences;
  output: {
    characterName: string;
    worldbookName: string;
  };
  steps: Record<string, StudioStepState>;
  artifacts: {
    versions: ArtifactVersion[];
    selectedVersionIds: Record<string, string>;
  };
  context: {
    hiddenArtifactKeys: string[];
    shieldedDialogueSteps: StepNumber[];
    includeFutureArtifacts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PresetResource {
  id: string;
  name: string;
  sourceFileName: string;
  sourceSha256: string;
  profileVersion: string;
  promptCount: number;
  regexCount: number;
  importedAt: string;
  raw?: Record<string, unknown>;
}

export interface RegexResource {
  id: string;
  name: string;
  enabled: boolean;
  findRegex: string;
  replaceString: string;
  placement: number[];
  minDepth: number | null;
  maxDepth: number | null;
  raw: Record<string, unknown>;
}

export interface WorkspaceResources {
  preset: PresetResource;
  regexes: RegexResource[];
  compatibilityNotes: string[];
}

export interface CommandReceipt {
  commandId: string;
  fingerprint: string;
  type: CommandType;
  baseRevision: number;
  nextRevision: number;
  outcome: "committed";
  ack: "sqlite-cas-readback" | "memory-cas";
  createdAt: string;
  summary: Record<string, string | number | boolean | null | undefined>;
}

export interface StudioSnapshot {
  schemaVersion: 2;
  workspaceId: string;
  revision: number;
  activeProjectId: string;
  projects: StudioProject[];
  resources: WorkspaceResources;
  receipts: CommandReceipt[];
  migrations: string[];
  updatedAt: string;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

export interface ArtifactCandidate {
  identity: string;
  content: string;
  recovered?: boolean;
}

export interface MutationCommand {
  type: CommandType;
  commandId: string;
  expectedRevision: number;
  payload: Record<string, unknown>;
}

export class RevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT";
  constructor(expected: number, actual: number) {
    super(`项目版本已变化：预期 revision ${expected}，实际为 ${actual}。`);
    this.name = "RevisionConflictError";
  }
}

export class ProtocolConflictError extends Error {
  readonly code = "PROTOCOL_CONFLICT";
  constructor(commandId: string) {
    super(`命令 ${commandId} 已被另一份内容使用。`);
    this.name = "ProtocolConflictError";
  }
}

export class WorkspaceRecoveryRequiredError extends Error {
  readonly code = "WORKSPACE_RECOVERY_REQUIRED";
  readonly backupRevision: number;
  constructor(backupRevision: number) {
    super(`当前工程无法读取；检测到 revision ${backupRevision} 的上一份有效备份。`);
    this.name = "WorkspaceRecoveryRequiredError";
    this.backupRevision = backupRevision;
  }
}

export function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function fingerprint(value: unknown): string {
  const source = JSON.stringify(stableValue(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function artifactKey(step: number, identity: string): string {
  return `${step}:${identity}`;
}

function emptySteps(): Record<string, StudioStepState> {
  return Object.fromEntries(WORKFLOW_STEPS.map((step) => [
    String(step.number),
    { number: step.number, status: "idle", turns: [], updatedAt: null },
  ]));
}

export function createProject(options: { id: string; now: string; name?: string; brief?: string }): StudioProject {
  const name = options.name?.trim() || "未命名世界";
  return {
    id: options.id,
    name,
    brief: options.brief?.trim() || "",
    currentStep: 1,
    preferences: {
      aiRole: "A.U.T.O.",
      creatorRole: "创作者",
      wordCount: "3000",
      language: "中文",
      person: "第三人称",
    },
    output: {
      characterName: name,
      worldbookName: `${name} · 世界书`,
    },
    steps: emptySteps(),
    artifacts: { versions: [], selectedVersionIds: {} },
    context: {
      hiddenArtifactKeys: [],
      shieldedDialogueSteps: [],
      includeFutureArtifacts: false,
    },
    createdAt: options.now,
    updatedAt: options.now,
  };
}

export function createInitialSnapshot(options: {
  now: string;
  projectId: string;
  resources: WorkspaceResources;
}): StudioSnapshot {
  const project = createProject({ id: options.projectId, now: options.now });
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    workspaceId: WORKSPACE_ID,
    revision: 0,
    activeProjectId: project.id,
    projects: [project],
    resources: cloneSnapshot(options.resources),
    receipts: [],
    migrations: [],
    updatedAt: options.now,
  };
}

export function activeProject(snapshot: StudioSnapshot): StudioProject {
  const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId);
  if (!project) throw new Error("当前项目不存在。");
  return project;
}

export function stepState(project: StudioProject, step = project.currentStep): StudioStepState {
  const state = project.steps[String(step)];
  if (!state || !isStepNumber(step)) throw new Error(`Step ${step} 数据不存在。`);
  return state;
}

export function selectedArtifacts(project: StudioProject, step?: number): ArtifactVersion[] {
  const selected = new Set(Object.values(project.artifacts.selectedVersionIds));
  return project.artifacts.versions.filter((artifact) => (
    selected.has(artifact.id) && (step === undefined || artifact.step === step)
  ));
}

export function selectedArtifact(project: StudioProject, step: number, identity: string): ArtifactVersion | null {
  const id = project.artifacts.selectedVersionIds[artifactKey(step, identity)];
  return project.artifacts.versions.find((artifact) => artifact.id === id) ?? null;
}

export function commandFingerprint(command: MutationCommand): string {
  return fingerprint({
    type: command.type,
    expectedRevision: command.expectedRevision,
    payload: command.payload,
  });
}

export function receiptForCommand(
  snapshot: StudioSnapshot,
  commandId: string,
  expectedFingerprint: string,
): CommandReceipt | null {
  const receipt = snapshot.receipts.find((item) => item.commandId === commandId) ?? null;
  if (receipt && receipt.fingerprint !== expectedFingerprint) throw new ProtocolConflictError(commandId);
  return receipt;
}

export function commitMutation(options: {
  snapshot: StudioSnapshot;
  command: MutationCommand;
  now: string;
  ack: CommandReceipt["ack"];
  mutate: (next: StudioSnapshot) => void;
  summary?: CommandReceipt["summary"];
}): { nextSnapshot: StudioSnapshot; receipt: CommandReceipt } {
  if (options.snapshot.revision !== options.command.expectedRevision) {
    throw new RevisionConflictError(options.command.expectedRevision, options.snapshot.revision);
  }
  const nextSnapshot = cloneSnapshot(options.snapshot);
  options.mutate(nextSnapshot);
  nextSnapshot.revision = options.snapshot.revision + 1;
  nextSnapshot.updatedAt = options.now;
  const receipt: CommandReceipt = {
    commandId: options.command.commandId,
    fingerprint: commandFingerprint(options.command),
    type: options.command.type,
    baseRevision: options.command.expectedRevision,
    nextRevision: nextSnapshot.revision,
    outcome: "committed",
    ack: options.ack,
    createdAt: options.now,
    summary: options.summary ?? {},
  };
  nextSnapshot.receipts.push(receipt);
  if (nextSnapshot.receipts.length > 200) {
    nextSnapshot.receipts.splice(0, nextSnapshot.receipts.length - 200);
  }
  return { nextSnapshot, receipt };
}

interface XmlBlock {
  tag: string;
  content: string;
  start: number;
  end: number;
}

interface FencedBlock extends XmlBlock {
  language: string;
}

export function extractXmlBlocks(text: string): XmlBlock[] {
  const source = String(text || "");
  const blocks: XmlBlock[] = [];
  const stacks = new Map<string, number[]>();
  const pattern = /<(\/)?([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)(?:\s[^>]*)?>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const tag = match[2];
    if (!match[1]) {
      const starts = stacks.get(tag) ?? [];
      starts.push(match.index);
      stacks.set(tag, starts);
      continue;
    }
    const starts = stacks.get(tag);
    if (!starts?.length) continue;
    const start = starts.pop();
    if (start === undefined) continue;
    const end = match.index + match[0].length;
    blocks.push({ tag, content: source.slice(start, end), start, end });
  }
  return blocks.sort((left, right) => left.start - right.start || left.end - right.end);
}

export function extractFencedBlocks(text: string): FencedBlock[] {
  const source = String(text || "");
  const blocks: FencedBlock[] = [];
  const pattern = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const language = match[1].trim().split(/\s+/)[0].toLowerCase();
    const rawContent = match[2];
    const leading = rawContent.match(/^\s*/)?.[0].length || 0;
    const trailing = rawContent.match(/\s*$/)?.[0].length || 0;
    const start = match.index + match[0].indexOf(rawContent) + leading;
    const end = start + Math.max(0, rawContent.length - leading - trailing);
    blocks.push({
      tag: language || "code",
      language,
      content: source.slice(start, end),
      start,
      end,
    });
  }
  return blocks;
}

function statusbarFenceTag(block: FencedBlock): string {
  if (/<body\b/i.test(block.content) && /<\/body>/i.test(block.content)) return "STATUSBAR_HTML";
  if (/<SOURCE_statusbar_data_guide\b/.test(block.content)) return "SOURCE_statusbar_data_guide";
  if (/<STATUSBAR_DATA>/.test(block.content) && /<\/STATUSBAR_DATA>/.test(block.content)) return "STATUSBAR_REGEX";
  return "";
}

function schemaRootIdentity(content: string): string {
  return String(content || "").match(/^\s*([^#\s][^:\r\n]*?)\s*:\s*z\.object\s*\(/m)?.[1]?.trim() || "";
}

function ruleMatches(tag: string, step: number): boolean {
  const rule = ARTIFACT_RULES[step];
  return Boolean(
    rule?.tags?.includes(tag)
    || rule?.prefixes?.some((prefix) => tag.startsWith(prefix))
    || rule?.patterns?.some((pattern) => pattern.test(tag)),
  );
}

export function extractArtifacts(text: string, step: number): ArtifactCandidate[] {
  const rules = ARTIFACT_RULES[step];
  if (!rules) return [];
  const xml = extractXmlBlocks(text).filter((block) => ruleMatches(block.tag, step));

  if (rules.recoverableXmlFences?.length) {
    const openingPattern = /^<([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)(?:\s[^>]*)?>/;
    for (const fence of extractFencedBlocks(text)) {
      if (!rules.recoverableXmlFences.includes(fence.language)) continue;
      const tag = fence.content.match(openingPattern)?.[1];
      if (!tag || !ruleMatches(tag, step)) continue;
      const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`</${escaped}\\s*>`).test(fence.content)) continue;
      if (xml.some((block) => block.tag === tag && block.start >= fence.start && block.end <= fence.end)) continue;
      xml.push({ ...fence, tag, content: `${fence.content.trimEnd()}\n</${tag}>` });
    }
  }

  const fenced: XmlBlock[] = extractFencedBlocks(text)
    .filter((block) => rules.fences?.includes(block.language));
  if (rules.statusbarFences) {
    for (const block of extractFencedBlocks(text)) {
      const tag = statusbarFenceTag(block);
      if (tag && !xml.some((item) => item.tag === tag)) fenced.push({ ...block, tag });
    }
  }

  const siblings = [...xml, ...fenced].sort((left, right) => left.start - right.start || left.end - right.end);
  const seen = new Set<string>();
  return siblings.flatMap((block) => {
    let identity = block.tag;
    if (step === 18 && block.tag === "schema") {
      const current = siblings.find((item) => item.tag.startsWith("WORLD_current_"));
      const root = current?.tag.slice("WORLD_current_".length) || schemaRootIdentity(block.content);
      identity = root ? `schema_${root}` : "schema";
    }
    const key = `${identity}\u0000${block.content}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ identity, content: block.content }];
  });
}

function parseRegexLiteral(value: string): RegExp | null {
  const source = value.trim();
  if (!source.startsWith("/")) return null;
  let slash = source.length - 1;
  while (slash > 0 && /[a-z]/i.test(source[slash])) slash -= 1;
  if (source[slash] !== "/") return null;
  try {
    return new RegExp(source.slice(1, slash), source.slice(slash + 1));
  } catch {
    return null;
  }
}

export function normalizeRegexResource(raw: Record<string, unknown>, index = 0): RegexResource {
  const placement = Array.isArray(raw.placement)
    ? raw.placement.map(Number).filter(Number.isFinite)
    : [1, 2];
  return {
    id: String(raw.id || `regex-${index + 1}`),
    name: String(raw.scriptName || raw.script_name || `正则 ${index + 1}`),
    enabled: raw.disabled !== true && raw.enabled !== false,
    findRegex: String(raw.findRegex || raw.find_regex || ""),
    replaceString: String(raw.replaceString || raw.replace_string || ""),
    placement,
    minDepth: Number.isFinite(raw.minDepth) ? Number(raw.minDepth) : null,
    maxDepth: Number.isFinite(raw.maxDepth) ? Number(raw.maxDepth) : null,
    raw: cloneSnapshot(raw),
  };
}

export function applyResponseRegexes(text: string, regexes: readonly RegexResource[]): string {
  let output = text;
  for (const resource of regexes) {
    if (!resource.enabled || !resource.placement.includes(2) || !resource.findRegex) continue;
    const pattern = parseRegexLiteral(resource.findRegex);
    if (!pattern) continue;
    output = output.replace(pattern, resource.replaceString);
  }
  return output;
}

export function buildStepMessages(options: {
  snapshot: StudioSnapshot;
  project: StudioProject;
  step: StepNumber;
  input: string;
  profileMessages: ModelMessage[];
}): { messages: ModelMessage[]; trace: { blockCount: number; characters: number; omitted: string[] } } {
  const definition = stepDefinition(options.step);
  const state = stepState(options.project, options.step);
  const effectiveInput = options.input.trim() || definition.guide.placeholder;
  const hiddenKeys = new Set(options.project.context.hiddenArtifactKeys);
  const selected = selectedArtifacts(options.project)
    .filter((artifact) => !hiddenKeys.has(artifactKey(artifact.step, artifact.identity)))
    .filter((artifact) => (
      artifact.step < options.step
      || artifact.step === options.step
      || options.project.context.includeFutureArtifacts
    ));

  const priorArtifacts = selected.filter((artifact) => artifact.step < options.step);
  const currentArtifacts = selected.filter((artifact) => artifact.step === options.step);
  const futureArtifacts = selected.filter((artifact) => artifact.step > options.step);
  const blocks: { name: string; content: string; removable: boolean }[] = [
    {
      name: "模板变量保护",
      removable: false,
      content: [
        "{{char}} 与 {{user}} 是角色卡模板变量，必须保持字面值。",
        "普通说明中的“用户”不是 {{user}}，不得替换。",
        "只有当前步骤规则允许的完整 XML 或代码围栏才会成为正式产物。",
      ].join("\n"),
    },
    ...options.profileMessages.map((message) => ({
      name: message.name || "预设模块",
      content: message.content,
      removable: false,
    })),
    {
      name: "项目上下文",
      removable: false,
      content: [
        "<STUDIO_PROJECT_CONTEXT>",
        `项目名称: ${options.project.name}`,
        `创作母题:\n${options.project.brief || "尚未填写"}`,
        `当前阶段: Step ${options.step} ${definition.name}`,
        `本阶段目标: ${definition.goal}`,
        "</STUDIO_PROJECT_CONTEXT>",
      ].join("\n"),
    },
    {
      name: "此前正式产物",
      removable: true,
      content: priorArtifacts.map((artifact) => (
        `<!-- Step ${artifact.step} · ${artifactDisplayName(artifact.identity, artifact.step)} -->\n${artifact.content}`
      )).join("\n\n"),
    },
    {
      name: "当前步骤正式产物",
      removable: true,
      content: currentArtifacts.map((artifact) => artifact.content).join("\n\n"),
    },
    {
      name: "未来步骤参考产物",
      removable: true,
      content: futureArtifacts.map((artifact) => artifact.content).join("\n\n"),
    },
  ].filter((block) => block.content.trim());

  const omitted: string[] = [];
  let characters = blocks.reduce((total, block) => total + block.content.length, 0)
    + state.turns.reduce((total, turn) => total + turn.content.length, 0)
    + effectiveInput.length;
  // 只按完整语义块裁剪，绝不截断规则或当前输入。
  for (const name of ["未来步骤参考产物", "当前步骤正式产物", "此前正式产物"]) {
    if (characters <= MAX_CONTEXT_CHARACTERS) break;
    const index = blocks.findIndex((block) => block.name === name && block.removable);
    if (index < 0) continue;
    characters -= blocks[index].content.length;
    omitted.push(name);
    blocks.splice(index, 1);
  }
  if (characters > MAX_CONTEXT_CHARACTERS) {
    throw new Error(`上下文约 ${characters.toLocaleString()} 字符，超过 ${MAX_CONTEXT_CHARACTERS.toLocaleString()} 字符安全上限。请清理本步骤会话或隐藏部分产物。`);
  }

  const messages: ModelMessage[] = blocks.map((block, index) => ({
    role: "system",
    name: block.name,
    content: block.content,
    ...(index === 0 ? {} : {}),
  }));
  if (!options.project.context.shieldedDialogueSteps.includes(options.step)) {
    for (const turn of state.turns) {
      messages.push({ role: turn.role, content: turn.content, name: `Step ${options.step} 会话` });
    }
  }
  messages.push({ role: "user", content: effectiveInput, name: "本轮输入" });
  return { messages, trace: { blockCount: blocks.length, characters, omitted } };
}

function assertProject(project: StudioProject): void {
  if (!project || typeof project.id !== "string" || !project.id) throw new Error("项目身份无效。");
  if (typeof project.name !== "string" || project.name.length > 200) throw new Error("项目名称无效。");
  if (typeof project.brief !== "string" || project.brief.length > 1_000_000) throw new Error("创作母题无效。");
  if (!isStepNumber(project.currentStep)) throw new Error("当前步骤无效。");
  if (!project.steps || !project.artifacts || !Array.isArray(project.artifacts.versions)) {
    throw new Error("项目步骤或产物库无效。");
  }
  for (let number = 1; number <= WORKFLOW_STEP_COUNT; number += 1) {
    const state = project.steps[String(number)];
    if (!state || state.number !== number || !["idle", "draft", "accepted"].includes(state.status)) {
      throw new Error(`Step ${number} 数据无效。`);
    }
    if (!Array.isArray(state.turns) || state.turns.length > 5_000) throw new Error(`Step ${number} 会话无效。`);
  }
  if (project.artifacts.versions.length > 20_000) throw new Error("产物版本数量超过安全上限。");
}

export function assertSnapshot(value: unknown): StudioSnapshot {
  const snapshot = value as StudioSnapshot;
  if (!snapshot || snapshot.schemaVersion !== STUDIO_SCHEMA_VERSION) {
    throw new Error("工作区 Schema 版本不受支持。");
  }
  if (snapshot.workspaceId !== WORKSPACE_ID) throw new Error("工作区身份不受支持。");
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 0) throw new Error("工作区 revision 无效。");
  if (!Array.isArray(snapshot.projects) || !snapshot.projects.length || snapshot.projects.length > 500) {
    throw new Error("项目库无效。");
  }
  snapshot.projects.forEach(assertProject);
  if (!snapshot.projects.some((project) => project.id === snapshot.activeProjectId)) {
    throw new Error("当前项目指针无效。");
  }
  if (!snapshot.resources?.preset || !Array.isArray(snapshot.resources.regexes)) {
    throw new Error("资源库无效。");
  }
  if (!Array.isArray(snapshot.receipts) || !Array.isArray(snapshot.migrations)) throw new Error("工作区元数据无效。");
  return snapshot;
}

interface LegacyV1Snapshot {
  schemaVersion: 1;
  workspaceId: string;
  revision: number;
  project: {
    id: string;
    name: string;
    brief: string;
    currentStep: 1;
    createdAt: string;
    updatedAt: string;
  };
  stepOne: {
    number: 1;
    status: StepStatus;
    turns: Array<Omit<StudioTurn, "updatedAt">>;
    updatedAt: string | null;
  };
  artifacts: {
    versions: Array<Omit<ArtifactVersion, "accepted" | "updatedAt"> & { updatedAt?: string }>;
    selectedVersionIds: Record<string, string>;
  };
  receipts: CommandReceipt[];
  updatedAt: string;
}

export function migrateSnapshot(value: unknown, fallbackResources: WorkspaceResources): StudioSnapshot {
  const candidate = value as { schemaVersion?: unknown };
  if (candidate?.schemaVersion === STUDIO_SCHEMA_VERSION) return cloneSnapshot(assertSnapshot(value));
  if (candidate?.schemaVersion !== 1) throw new Error("工作区 Schema 版本不受支持。");
  const legacy = value as LegacyV1Snapshot;
  if (!legacy.project?.id || legacy.project.currentStep !== 1 || !legacy.stepOne) {
    throw new Error("旧版工作区缺少 Step 1 数据。");
  }
  const project = createProject({
    id: legacy.project.id,
    now: legacy.project.createdAt || legacy.updatedAt,
    name: legacy.project.name,
    brief: legacy.project.brief,
  });
  project.updatedAt = legacy.project.updatedAt || legacy.updatedAt;
  project.steps["1"] = {
    number: 1,
    status: legacy.stepOne.status,
    updatedAt: legacy.stepOne.updatedAt,
    turns: (legacy.stepOne.turns || []).map((turn) => ({
      ...turn,
      step: 1,
      updatedAt: turn.createdAt,
    })),
  };
  project.artifacts.versions = (legacy.artifacts?.versions || []).map((artifact) => ({
    ...artifact,
    step: 1,
    accepted: legacy.stepOne.status === "accepted",
    source: artifact.source || "migrated",
    updatedAt: artifact.updatedAt || artifact.createdAt,
  }));
  for (const [identity, id] of Object.entries(legacy.artifacts?.selectedVersionIds || {})) {
    project.artifacts.selectedVersionIds[artifactKey(1, identity)] = id;
  }
  const migrated: StudioSnapshot = {
    schemaVersion: 2,
    workspaceId: WORKSPACE_ID,
    revision: legacy.revision,
    activeProjectId: project.id,
    projects: [project],
    resources: cloneSnapshot(fallbackResources),
    receipts: Array.isArray(legacy.receipts) ? legacy.receipts : [],
    migrations: ["schema-1-to-2"],
    updatedAt: legacy.updatedAt,
  };
  return assertSnapshot(migrated);
}

export interface ProjectArchive {
  format: typeof PROJECT_ARCHIVE_FORMAT;
  formatVersion: typeof PROJECT_ARCHIVE_VERSION;
  exportedAt: string;
  source: {
    appSchemaVersion: number;
    presetFileName: string;
    presetSha256: string;
    profileVersion: string;
  };
  payload: { project: StudioProject };
  integrity: { algorithm: "fnv1a-32"; projectDigest: string };
}

export function safeFileStem(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().slice(0, 80) || "未命名世界";
}

export function createProjectArchive(snapshot: StudioSnapshot, exportedAt: string): string {
  const project = cloneSnapshot(activeProject(assertSnapshot(snapshot)));
  const archive: ProjectArchive = {
    format: PROJECT_ARCHIVE_FORMAT,
    formatVersion: PROJECT_ARCHIVE_VERSION,
    exportedAt,
    source: {
      appSchemaVersion: snapshot.schemaVersion,
      presetFileName: snapshot.resources.preset.sourceFileName,
      presetSha256: snapshot.resources.preset.sourceSha256,
      profileVersion: snapshot.resources.preset.profileVersion,
    },
    payload: { project },
    integrity: { algorithm: "fnv1a-32", projectDigest: fingerprint(project) },
  };
  return JSON.stringify(archive, null, 2);
}

export function parseProjectArchive(source: string, fallbackResources: WorkspaceResources): {
  project: StudioProject;
  digest: string;
  sourceVersion: number;
} {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("项目文件不是有效的 JSON。");
  }
  const archive = value as {
    format?: unknown;
    formatVersion?: unknown;
    payload?: { project?: unknown; snapshot?: unknown };
    integrity?: { projectDigest?: unknown; snapshotDigest?: unknown };
  };
  if (archive.format !== PROJECT_ARCHIVE_FORMAT) throw new Error("这不是 A.U.T.O 独立创作台项目文件。");
  if (archive.formatVersion === 1 && archive.payload?.snapshot) {
    const sourceDigest = fingerprint(archive.payload.snapshot);
    if (archive.integrity?.snapshotDigest !== sourceDigest) throw new Error("旧项目文件完整性校验失败。");
    const migrated = migrateSnapshot(archive.payload.snapshot, fallbackResources);
    const project = activeProject(migrated);
    return { project: cloneSnapshot(project), digest: sourceDigest, sourceVersion: 1 };
  }
  if (archive.formatVersion !== PROJECT_ARCHIVE_VERSION) {
    throw new Error(`项目文件版本 ${String(archive.formatVersion)} 暂不支持。`);
  }
  const project = cloneSnapshot(archive.payload?.project) as StudioProject;
  assertProject(project);
  const digest = fingerprint(project);
  if (archive.integrity?.projectDigest !== digest) throw new Error("项目文件完整性校验失败。");
  return { project, digest, sourceVersion: 2 };
}
