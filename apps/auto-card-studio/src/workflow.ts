import {
  ProtocolConflictError,
  RevisionConflictError,
  activeProject,
  applyResponseRegexes,
  artifactKey,
  buildStepMessages,
  cloneSnapshot,
  commandFingerprint,
  commitMutation,
  createInitialSnapshot,
  createProject,
  extractArtifacts,
  normalizeRegexResource,
  receiptForCommand,
  selectedArtifacts,
  stepState,
  type ArtifactCandidate,
  type CommandReceipt,
  type MutationCommand,
  type PresetResource,
  type StudioProject,
  type StudioSnapshot,
  type WorkspaceResources,
} from "./core.ts";
import {
  AUTO_WORKFLOW_PROFILE,
  AUTO_WORKFLOW_SOURCE,
  EMBEDDED_PRESET_REGEXES,
  messagesFromPreset,
  validatePresetSource,
  type WorkflowProfile,
} from "./profile.ts";
import { isStepNumber, stepDefinition, type StepNumber } from "./workflow-config.ts";
import type { ModelGateway, StudioRepository } from "./ports.ts";

export interface KernelOptions {
  repository: StudioRepository;
  gateway: ModelGateway;
  profile?: WorkflowProfile;
  now?: () => string;
  nextId?: (prefix: string) => string;
}

export interface GenerationOutcome {
  status: "committed" | "cancelled";
  snapshot: StudioSnapshot;
  receipt: CommandReceipt | null;
  rawResponseCharacters: number;
  artifactCount: number;
}

export interface MutationOutcome {
  snapshot: StudioSnapshot;
  receipt: CommandReceipt | null;
}

interface InFlightGeneration {
  fingerprint: string;
  promise: Promise<GenerationOutcome>;
}

function defaultId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : /abort|cancel|取消|停止/i.test(String((error as Error)?.message ?? error));
}

async function sha256Hex(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function createEmbeddedResources(now: string): WorkspaceResources {
  return {
    preset: {
      id: "auto-v2-embedded",
      name: "A.U.T.O v2.0（内置）",
      sourceFileName: AUTO_WORKFLOW_SOURCE.fileName,
      sourceSha256: AUTO_WORKFLOW_SOURCE.sha256,
      profileVersion: AUTO_WORKFLOW_PROFILE.version,
      promptCount: AUTO_WORKFLOW_SOURCE.promptCount,
      regexCount: AUTO_WORKFLOW_SOURCE.regexCount,
      importedAt: now,
    },
    regexes: EMBEDDED_PRESET_REGEXES.map((raw, index) => normalizeRegexResource(raw, index)),
    compatibilityNotes: [],
  };
}

export class StudioKernel {
  readonly repository: StudioRepository;
  readonly gateway: ModelGateway;
  readonly profile: WorkflowProfile;
  private readonly now: () => string;
  private readonly nextId: (prefix: string) => string;
  private currentSnapshot: StudioSnapshot | null = null;
  private readonly inFlight = new Map<string, InFlightGeneration>();

  constructor(options: KernelOptions) {
    this.repository = options.repository;
    this.gateway = options.gateway;
    this.profile = options.profile ?? AUTO_WORKFLOW_PROFILE;
    this.now = options.now ?? (() => new Date().toISOString());
    this.nextId = options.nextId ?? defaultId;
  }

  async open(): Promise<StudioSnapshot> {
    const now = this.now();
    const initial = createInitialSnapshot({
      now,
      projectId: this.nextId("project"),
      resources: createEmbeddedResources(now),
    });
    this.currentSnapshot = await this.repository.loadOrCreate(initial);
    return this.snapshot();
  }

  snapshot(): StudioSnapshot {
    if (!this.currentSnapshot) throw new Error("StudioKernel 尚未打开工作区。");
    return cloneSnapshot(this.currentSnapshot);
  }

  project(): StudioProject {
    return cloneSnapshot(activeProject(this.requireSnapshot()));
  }

  previewPrompt(input = ""): ReturnType<typeof buildStepMessages> {
    const snapshot = this.requireSnapshot();
    const project = activeProject(snapshot);
    const preset = snapshot.resources.preset;
    const profileMessages = preset.raw
      ? messagesFromPreset(preset.raw, project.currentStep, project.preferences)
      : this.profile.messagesForStep(project.currentStep, project.preferences);
    return buildStepMessages({
      snapshot,
      project,
      step: project.currentStep,
      input,
      profileMessages,
    });
  }

  async getRecoveryCandidate(): Promise<StudioSnapshot | null> {
    return this.repository.getRecoveryCandidate();
  }

  async recoverWorkspace(): Promise<StudioSnapshot> {
    this.currentSnapshot = await this.repository.recoverFromBackup();
    return this.snapshot();
  }

  private requireSnapshot(): StudioSnapshot {
    if (!this.currentSnapshot) throw new Error("StudioKernel 尚未打开工作区。");
    return this.currentSnapshot;
  }

  private async mutate(options: {
    type: MutationCommand["type"];
    payload: Record<string, unknown>;
    mutate: (next: StudioSnapshot, now: string) => void;
    summary?: CommandReceipt["summary"];
    commandId?: string;
    expectedRevision?: number;
  }): Promise<MutationOutcome> {
    const snapshot = this.requireSnapshot();
    const command: MutationCommand = {
      type: options.type,
      commandId: options.commandId ?? this.nextId("command"),
      expectedRevision: options.expectedRevision ?? snapshot.revision,
      payload: options.payload,
    };
    const fingerprint = commandFingerprint(command);
    const existing = receiptForCommand(snapshot, command.commandId, fingerprint);
    if (existing) return { snapshot: this.snapshot(), receipt: existing };
    if (snapshot.revision !== command.expectedRevision) {
      throw new RevisionConflictError(command.expectedRevision, snapshot.revision);
    }
    const now = this.now();
    const candidate = commitMutation({
      snapshot,
      command,
      now,
      ack: this.repository.ackKind,
      mutate: (next) => options.mutate(next, now),
      summary: options.summary,
    });
    const ack = await this.repository.commit(snapshot.revision, candidate.nextSnapshot);
    this.currentSnapshot = ack.snapshot;
    return { snapshot: this.snapshot(), receipt: candidate.receipt };
  }

  async createProject(options: { name?: string; brief?: string } = {}): Promise<MutationOutcome> {
    const id = this.nextId("project");
    return this.mutate({
      type: "create-project",
      payload: { id, name: options.name ?? "", brief: options.brief ?? "" },
      mutate: (next, now) => {
        const project = createProject({ id, now, name: options.name, brief: options.brief });
        next.projects.push(project);
        next.activeProjectId = project.id;
      },
    });
  }

  async switchProject(projectId: string): Promise<MutationOutcome> {
    const snapshot = this.requireSnapshot();
    if (snapshot.activeProjectId === projectId) return { snapshot: this.snapshot(), receipt: null };
    if (!snapshot.projects.some((project) => project.id === projectId)) throw new Error("要切换的项目不存在。");
    return this.mutate({
      type: "switch-project",
      payload: { projectId },
      mutate: (next) => { next.activeProjectId = projectId; },
    });
  }

  async deleteProject(projectId: string): Promise<MutationOutcome> {
    const snapshot = this.requireSnapshot();
    if (snapshot.projects.length <= 1) throw new Error("至少保留一个项目。");
    if (!snapshot.projects.some((project) => project.id === projectId)) throw new Error("要删除的项目不存在。");
    return this.mutate({
      type: "delete-project",
      payload: { projectId },
      mutate: (next) => {
        next.projects = next.projects.filter((project) => project.id !== projectId);
        if (next.activeProjectId === projectId) next.activeProjectId = next.projects[0].id;
      },
    });
  }

  async updateProject(options: {
    name: string;
    brief: string;
    characterName?: string;
    worldbookName?: string;
    preferences?: Partial<StudioProject["preferences"]>;
  }): Promise<MutationOutcome> {
    return this.mutate({
      type: "update-project",
      payload: cloneSnapshot(options),
      mutate: (next, now) => {
        const project = activeProject(next);
        project.name = options.name.trim() || "未命名世界";
        project.brief = options.brief.trim();
        project.output.characterName = options.characterName?.trim() || project.output.characterName || project.name;
        project.output.worldbookName = options.worldbookName?.trim() || project.output.worldbookName || `${project.name} · 世界书`;
        project.preferences = { ...project.preferences, ...options.preferences };
        project.updatedAt = now;
      },
    });
  }

  async navigateStep(step: number): Promise<MutationOutcome> {
    if (!isStepNumber(step)) throw new Error("步骤必须在 1—29 之间。");
    const project = activeProject(this.requireSnapshot());
    if (project.currentStep === step) return { snapshot: this.snapshot(), receipt: null };
    return this.mutate({
      type: "navigate-step",
      payload: { step },
      mutate: (next, now) => {
        const target = activeProject(next);
        target.currentStep = step;
        target.updatedAt = now;
      },
    });
  }

  async acceptStep(step = activeProject(this.requireSnapshot()).currentStep): Promise<MutationOutcome> {
    if (!isStepNumber(step)) throw new Error("步骤必须在 1—29 之间。");
    const project = activeProject(this.requireSnapshot());
    const artifacts = selectedArtifacts(project, step);
    if (!artifacts.length) throw new Error(`Step ${step} 尚无已选正式产物，不能确认。`);
    return this.mutate({
      type: "accept-step",
      payload: { projectId: project.id, step },
      mutate: (next, now) => {
        const target = activeProject(next);
        const state = stepState(target, step);
        state.status = "accepted";
        state.updatedAt = now;
        for (const artifact of selectedArtifacts(target, step)) artifact.accepted = true;
        target.updatedAt = now;
      },
    });
  }

  async editTurn(turnId: string, content: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const state = stepState(project);
    if (!state.turns.some((turn) => turn.id === turnId)) throw new Error("要编辑的消息不存在。");
    return this.mutate({
      type: "edit-turn",
      payload: { projectId: project.id, step: project.currentStep, turnId, content },
      mutate: (next, now) => {
        const target = stepState(activeProject(next));
        const turn = target.turns.find((item) => item.id === turnId);
        if (!turn) throw new Error("要编辑的消息不存在。");
        turn.content = content.trim();
        turn.updatedAt = now;
        target.updatedAt = now;
      },
    });
  }

  async deleteTurn(turnId: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const state = stepState(project);
    if (!state.turns.some((turn) => turn.id === turnId)) throw new Error("要删除的消息不存在。");
    return this.mutate({
      type: "delete-turn",
      payload: { projectId: project.id, step: project.currentStep, turnId },
      mutate: (next, now) => {
        const target = stepState(activeProject(next));
        target.turns = target.turns.filter((turn) => turn.id !== turnId);
        target.updatedAt = now;
      },
    });
  }

  async clearStepConversation(step = activeProject(this.requireSnapshot()).currentStep): Promise<MutationOutcome> {
    return this.mutate({
      type: "clear-step",
      payload: { projectId: activeProject(this.requireSnapshot()).id, step },
      mutate: (next, now) => {
        const state = stepState(activeProject(next), step);
        state.turns = [];
        state.updatedAt = now;
      },
    });
  }

  private addCandidates(project: StudioProject, step: StepNumber, candidates: ArtifactCandidate[], now: string): void {
    for (const candidate of candidates) {
      const version = {
        id: this.nextId("artifact"),
        step,
        identity: candidate.identity,
        content: candidate.content,
        source: "generated" as const,
        accepted: false,
        createdAt: now,
        updatedAt: now,
      };
      project.artifacts.versions.push(version);
      project.artifacts.selectedVersionIds[artifactKey(step, candidate.identity)] = version.id;
    }
  }

  async extractTurnArtifacts(turnId: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const state = stepState(project);
    const turn = state.turns.find((item) => item.id === turnId && item.role === "assistant");
    if (!turn) throw new Error("请选择一条 AI 回复进行提取。");
    const candidates = extractArtifacts(turn.content, project.currentStep);
    if (!candidates.length) throw new Error("这条回复中没有当前步骤认可的完整产物。");
    return this.mutate({
      type: "add-artifact",
      payload: { projectId: project.id, step: project.currentStep, turnId, count: candidates.length },
      mutate: (next, now) => {
        this.addCandidates(activeProject(next), project.currentStep, candidates, now);
      },
    });
  }

  async addManualArtifact(identity: string, content: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    if (!identity.trim() || !content.trim()) throw new Error("产物身份与正文不能为空。");
    const candidate = { identity: identity.trim(), content: content.trim() };
    return this.mutate({
      type: "add-artifact",
      payload: { projectId: project.id, step: project.currentStep, identity: candidate.identity },
      mutate: (next, now) => {
        this.addCandidates(activeProject(next), project.currentStep, [candidate], now);
        const version = activeProject(next).artifacts.versions.at(-1);
        if (version) version.source = "manual";
      },
    });
  }

  async editArtifact(versionId: string, content: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const source = project.artifacts.versions.find((artifact) => artifact.id === versionId);
    if (!source) throw new Error("要编辑的产物版本不存在。");
    if (!content.trim()) throw new Error("产物正文不能为空。");
    return this.mutate({
      type: "edit-artifact",
      payload: { projectId: project.id, versionId, content },
      mutate: (next, now) => {
        const target = activeProject(next);
        const original = target.artifacts.versions.find((artifact) => artifact.id === versionId);
        if (!original) throw new Error("要编辑的产物版本不存在。");
        const version = {
          ...cloneSnapshot(original),
          id: this.nextId("artifact"),
          content: content.trim(),
          source: "manual" as const,
          accepted: false,
          createdAt: now,
          updatedAt: now,
        };
        target.artifacts.versions.push(version);
        target.artifacts.selectedVersionIds[artifactKey(version.step, version.identity)] = version.id;
      },
    });
  }

  async selectArtifact(versionId: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const version = project.artifacts.versions.find((artifact) => artifact.id === versionId);
    if (!version) throw new Error("要选择的产物版本不存在。");
    return this.mutate({
      type: "select-artifact",
      payload: { projectId: project.id, versionId },
      mutate: (next) => {
        const target = activeProject(next);
        const selected = target.artifacts.versions.find((artifact) => artifact.id === versionId);
        if (!selected) throw new Error("要选择的产物版本不存在。");
        target.artifacts.selectedVersionIds[artifactKey(selected.step, selected.identity)] = selected.id;
      },
    });
  }

  async deleteArtifact(versionId: string): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    const version = project.artifacts.versions.find((artifact) => artifact.id === versionId);
    if (!version) throw new Error("要删除的产物版本不存在。");
    return this.mutate({
      type: "delete-artifact",
      payload: { projectId: project.id, versionId },
      mutate: (next) => {
        const target = activeProject(next);
        const removing = target.artifacts.versions.find((artifact) => artifact.id === versionId);
        if (!removing) return;
        target.artifacts.versions = target.artifacts.versions.filter((artifact) => artifact.id !== versionId);
        const key = artifactKey(removing.step, removing.identity);
        if (target.artifacts.selectedVersionIds[key] === versionId) {
          const replacement = target.artifacts.versions
            .filter((artifact) => artifact.step === removing.step && artifact.identity === removing.identity)
            .at(-1);
          if (replacement) target.artifacts.selectedVersionIds[key] = replacement.id;
          else delete target.artifacts.selectedVersionIds[key];
        }
      },
    });
  }

  async updateContext(options: {
    hiddenArtifactKeys?: string[];
    shieldedDialogueSteps?: StepNumber[];
    includeFutureArtifacts?: boolean;
  }): Promise<MutationOutcome> {
    const project = activeProject(this.requireSnapshot());
    return this.mutate({
      type: "update-context",
      payload: { projectId: project.id, ...cloneSnapshot(options) },
      mutate: (next) => {
        const context = activeProject(next).context;
        if (options.hiddenArtifactKeys) context.hiddenArtifactKeys = [...new Set(options.hiddenArtifactKeys)];
        if (options.shieldedDialogueSteps) context.shieldedDialogueSteps = [...new Set(options.shieldedDialogueSteps)];
        if (options.includeFutureArtifacts !== undefined) context.includeFutureArtifacts = options.includeFutureArtifacts;
      },
    });
  }

  async importProject(options: { project: StudioProject; archiveDigest: string }): Promise<MutationOutcome> {
    const snapshot = this.requireSnapshot();
    const imported = cloneSnapshot(options.project);
    const originalId = imported.id;
    imported.id = this.nextId("project");
    const names = new Set(snapshot.projects.map((project) => project.name));
    if (names.has(imported.name)) imported.name = `${imported.name}（导入）`;
    return this.mutate({
      type: "import-project",
      payload: { sourceProjectId: originalId, archiveDigest: options.archiveDigest },
      summary: { sourceProjectId: originalId, archiveDigest: options.archiveDigest },
      mutate: (next, now) => {
        imported.updatedAt = now;
        next.projects.push(imported);
        next.activeProjectId = imported.id;
      },
    });
  }

  async importPreset(source: string, fileName: string): Promise<MutationOutcome> {
    let rawValue: unknown;
    try {
      rawValue = JSON.parse(source);
    } catch {
      throw new Error("预设文件不是有效的 JSON。");
    }
    const validated = validatePresetSource(rawValue);
    const sha256 = await sha256Hex(source);
    const now = this.now();
    const preset: PresetResource = {
      id: `preset-${sha256.slice(0, 12).toLowerCase()}`,
      name: String((validated.raw as { name?: unknown }).name || fileName.replace(/\.json$/i, "")),
      sourceFileName: fileName,
      sourceSha256: sha256,
      profileVersion: `imported-${sha256.slice(0, 12).toLowerCase()}`,
      promptCount: validated.promptCount,
      regexCount: validated.regexes.length,
      importedAt: now,
      raw: cloneSnapshot(validated.raw),
    };
    return this.mutate({
      type: "update-context",
      payload: { resource: "preset", sha256 },
      mutate: (next) => {
        next.resources.preset = preset;
        next.resources.regexes = validated.regexes.map((raw, index) => normalizeRegexResource(raw, index));
        next.resources.compatibilityNotes = validated.notes;
      },
    });
  }

  async restoreEmbeddedPreset(): Promise<MutationOutcome> {
    const resources = createEmbeddedResources(this.now());
    return this.mutate({
      type: "update-context",
      payload: { resource: "preset", restore: "embedded" },
      mutate: (next) => { next.resources = resources; },
    });
  }

  async generateStep(options: {
    input: string;
    signal: AbortSignal;
    onDraft?: (draft: string) => void;
    commandId?: string;
    attemptId?: string;
    expectedRevision?: number;
  }): Promise<GenerationOutcome> {
    const snapshot = this.requireSnapshot();
    const project = activeProject(snapshot);
    if (!project.brief.trim()) throw new Error("请先写下一两句创作母题。");
    const step = project.currentStep;
    const attemptId = options.attemptId ?? this.nextId("attempt");
    const command: MutationCommand = {
      type: "generate-step",
      commandId: options.commandId ?? this.nextId("command"),
      expectedRevision: options.expectedRevision ?? snapshot.revision,
      payload: {
        projectId: project.id,
        step,
        input: options.input.trim(),
        attemptId,
        profileVersion: snapshot.resources.preset.profileVersion,
      },
    };
    const fingerprint = commandFingerprint(command);
    const receipt = receiptForCommand(snapshot, command.commandId, fingerprint);
    if (receipt) {
      return {
        status: "committed",
        snapshot: this.snapshot(),
        receipt,
        rawResponseCharacters: Number(receipt.summary.responseCharacters || 0),
        artifactCount: Number(receipt.summary.artifactCount || 0),
      };
    }
    const flight = this.inFlight.get(command.commandId);
    if (flight) {
      if (flight.fingerprint !== fingerprint) throw new ProtocolConflictError(command.commandId);
      return flight.promise;
    }
    if (snapshot.revision !== command.expectedRevision) {
      throw new RevisionConflictError(command.expectedRevision, snapshot.revision);
    }
    const promise = this.performGeneration({ snapshot: cloneSnapshot(snapshot), projectId: project.id, step, command, ...options });
    this.inFlight.set(command.commandId, { fingerprint, promise });
    const cleanup = () => {
      if (this.inFlight.get(command.commandId)?.promise === promise) this.inFlight.delete(command.commandId);
    };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  private async performGeneration(options: {
    snapshot: StudioSnapshot;
    projectId: string;
    step: StepNumber;
    command: MutationCommand;
    input: string;
    signal: AbortSignal;
    onDraft?: (draft: string) => void;
  }): Promise<GenerationOutcome> {
    let rawResponse = "";
    let finishReason = "";
    try {
      const project = activeProject(options.snapshot);
      const preset = options.snapshot.resources.preset;
      const profileMessages = preset.raw
        ? messagesFromPreset(preset.raw, options.step, project.preferences)
        : this.profile.messagesForStep(options.step, project.preferences);
      const assembly = buildStepMessages({
        snapshot: options.snapshot,
        project,
        step: options.step,
        input: options.input,
        profileMessages,
      });
      for await (const event of this.gateway.stream({
        commandId: options.command.commandId,
        attemptId: String(options.command.payload.attemptId),
        task: "workflow-step",
        step: options.step,
        profileVersion: preset.profileVersion,
        outputContractVersion: "auto-artifacts-v2",
        messages: assembly.messages,
      }, options.signal)) {
        if (options.signal.aborted) throw new DOMException("Request canceled", "AbortError");
        if (event.type === "chunk") {
          rawResponse += event.delta;
          options.onDraft?.(rawResponse);
        } else {
          finishReason = event.finishReason;
        }
      }
      if (!finishReason) throw new Error("模型流没有给出完成终态。");
      if (!rawResponse.trim()) throw new Error("模型没有返回正文。");

      const current = this.requireSnapshot();
      if (current.revision !== options.command.expectedRevision) {
        throw new RevisionConflictError(options.command.expectedRevision, current.revision);
      }
      if (activeProject(current).id !== options.projectId) {
        throw new Error("生成期间切换了项目，本轮未保存。");
      }
      const processedResponse = applyResponseRegexes(rawResponse, current.resources.regexes);
      const artifacts = extractArtifacts(processedResponse, options.step);
      const now = this.now();
      const effectiveInput = options.input.trim() || stepDefinition(options.step).guide.placeholder;
      const candidate = commitMutation({
        snapshot: current,
        command: options.command,
        now,
        ack: this.repository.ackKind,
        summary: {
          attemptId: String(options.command.payload.attemptId),
          profileVersion: String(options.command.payload.profileVersion),
          responseCharacters: rawResponse.length,
          artifactCount: artifacts.length,
          finishReason,
          promptCharacters: assembly.trace.characters,
          omittedBlocks: assembly.trace.omitted.join("、"),
        },
        mutate: (next) => {
          const target = activeProject(next);
          const state = stepState(target, options.step);
          state.turns.push(
            {
              id: this.nextId("turn"),
              role: "user",
              content: effectiveInput,
              step: options.step,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: this.nextId("turn"),
              role: "assistant",
              content: processedResponse,
              step: options.step,
              createdAt: now,
              updatedAt: now,
            },
          );
          this.addCandidates(target, options.step, artifacts, now);
          state.status = "draft";
          state.updatedAt = now;
          target.updatedAt = now;
        },
      });
      const ack = await this.repository.commit(current.revision, candidate.nextSnapshot);
      this.currentSnapshot = ack.snapshot;
      return {
        status: "committed",
        snapshot: this.snapshot(),
        receipt: candidate.receipt,
        rawResponseCharacters: rawResponse.length,
        artifactCount: artifacts.length,
      };
    } catch (error) {
      if (options.signal.aborted || isAbortError(error)) {
        return {
          status: "cancelled",
          snapshot: this.snapshot(),
          receipt: null,
          rawResponseCharacters: rawResponse.length,
          artifactCount: 0,
        };
      }
      throw error;
    }
  }
}
