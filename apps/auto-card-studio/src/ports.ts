import type {
  CommandReceipt,
  ModelMessage,
  StudioSnapshot,
} from "./core.ts";

export interface CommitAck {
  level: CommandReceipt["ack"];
  snapshot: StudioSnapshot;
}

export interface StudioRepository {
  readonly ackKind: CommandReceipt["ack"];
  readonly label: string;
  loadOrCreate(initialSnapshot: StudioSnapshot): Promise<StudioSnapshot>;
  commit(expectedRevision: number, nextSnapshot: StudioSnapshot): Promise<CommitAck>;
  getRecoveryCandidate(): Promise<StudioSnapshot | null>;
  recoverFromBackup(): Promise<StudioSnapshot>;
}

export interface ModelRequest {
  commandId: string;
  attemptId: string;
  task: "workflow-step";
  step: number;
  profileVersion: string;
  outputContractVersion: "auto-artifacts-v2";
  messages: ModelMessage[];
}

export type ModelStreamEvent =
  | { type: "chunk"; delta: string }
  | { type: "completed"; finishReason: string };

export interface ModelGateway {
  readonly id: string;
  readonly label: string;
  stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelStreamEvent>;
}

export type ModelProviderMode = "stub" | "openai-compatible";

export interface ModelSettings {
  mode: ModelProviderMode;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  updatedAt: string;
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = Object.freeze({
  mode: "stub",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  timeoutMs: 120_000,
  updatedAt: "",
});

export interface ModelSettingsRepository {
  loadModelSettings(): Promise<ModelSettings>;
  saveModelSettings(settings: ModelSettings): Promise<ModelSettings>;
}

export interface SecretStatus {
  supported: boolean;
  unlocked: boolean;
  hasApiKey: boolean;
}

export interface SecretStore {
  status(): SecretStatus;
  unlock(passphrase: string): Promise<SecretStatus>;
  readApiKey(): Promise<string | null>;
  saveApiKey(apiKey: string): Promise<SecretStatus>;
  removeApiKey(): Promise<SecretStatus>;
  lock(): Promise<SecretStatus>;
}

export interface ConnectionTestResult {
  endpoint: string;
  modelCount: number | null;
  elapsedMs: number;
}

export interface ProjectFileSelection {
  status: "selected";
  name: string;
  contents: string;
}

export interface ProjectFileSaved {
  status: "saved";
  name: string;
}

export interface ProjectFilePort {
  readonly label: string;
  importProject(): Promise<ProjectFileSelection | { status: "cancelled" }>;
  exportProject(options: {
    suggestedName: string;
    contents: string;
  }): Promise<ProjectFileSaved | { status: "cancelled" }>;
}
