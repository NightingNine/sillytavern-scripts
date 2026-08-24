import autoWorkflowProfileData from "./auto-workflow-profile.generated.ts";
import type { ModelMessage, ProjectPreferences } from "./core.ts";
import type { StepNumber } from "./workflow-config.ts";

const PROJECT_PREFERENCE_DEFAULTS: Readonly<ProjectPreferences> = Object.freeze({
  aiRole: "A.U.T.O.",
  creatorRole: "创作者",
  wordCount: "3000",
  language: "中文",
  person: "第三人称",
});

const PRESET_MACRO_PATTERN = /\{\{setvar::([^:{}]+)::([\s\S]*?)\}\}|\{\{getvar::([^{}]+)\}\}|\{\{\/\/[\s\S]*?\}\}/g;
const WORKFLOW_PROMPT_IDS = new Set(autoWorkflowProfileData.steps.map((step) => step.promptId));
const HIDDEN_REORG_PROMPT_ID = "bdc8f3a0-37a3-415a-b01d-b91359b79104";
const PLACEHOLDER_IDS = new Set([
  "worldInfoBefore", "personaDescription", "charDescription", "charPersonality",
  "scenario", "worldInfoAfter", "dialogueExamples", "chatHistory", "user_input",
]);

export interface AutoWorkflowSource {
  fileName: string;
  sha256: string;
  legacyScriptFileName: string;
  legacyScriptSha256: string;
  moduleCount: number;
  contentCharacters: number;
  promptCount: number;
  regexCount: number;
}

export interface AutoWorkflowSampling {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxTokens: number;
  maxContext: number;
}

export interface WorkflowProfile {
  id: string;
  version: string;
  label: string;
  source: AutoWorkflowSource;
  sampling: AutoWorkflowSampling;
  messagesForStep(step: StepNumber, preferences?: Partial<ProjectPreferences>): ModelMessage[];
}

function macroOverrides(preferences: Partial<ProjectPreferences>): Readonly<Record<string, string>> {
  const resolved = { ...PROJECT_PREFERENCE_DEFAULTS, ...preferences };
  return {
    AI_role: resolved.aiRole,
    creator_role: resolved.creatorRole,
    word_count: resolved.wordCount,
    language: resolved.language,
    person: resolved.person,
  };
}

export function expandPresetModules(
  modules: ReadonlyArray<{
    name: string;
    role: "system" | "user" | "assistant";
    content: string;
  }>,
  overrides: Readonly<Record<string, string>>,
): ModelMessage[] {
  const variables = new Map<string, string>();
  return modules.map((module) => {
    const content = module.content.replace(
      PRESET_MACRO_PATTERN,
      (_match, setKey: string | undefined, setValue: string | undefined, getKey: string | undefined) => {
        if (setKey !== undefined) {
          variables.set(setKey, overrides[setKey] ?? setValue ?? "");
          return "";
        }
        if (getKey !== undefined) return variables.get(getKey) ?? "";
        return "";
      },
    ).trim();
    return { role: module.role, name: module.name, content };
  }).filter((message) => message.content.length > 0);
}

export const AUTO_WORKFLOW_SOURCE: AutoWorkflowSource = {
  ...autoWorkflowProfileData.source,
};

export const AUTO_WORKFLOW_SAMPLING: AutoWorkflowSampling = {
  ...autoWorkflowProfileData.sampling,
};

export const EMBEDDED_PRESET_REGEXES = autoWorkflowProfileData.regexes as unknown as readonly Record<string, unknown>[];

export function validatePresetSource(value: unknown): {
  raw: Record<string, unknown>;
  promptCount: number;
  regexes: Record<string, unknown>[];
  notes: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("预设根节点必须是对象。");
  const raw = value as Record<string, unknown>;
  const prompts = raw.prompts;
  const promptOrder = (raw.prompt_order as Array<{ order?: unknown }> | undefined)?.[0]?.order;
  if (!Array.isArray(prompts) || !Array.isArray(promptOrder)) throw new Error("预设缺少 prompts 或 prompt_order。");
  const identifiers = new Set(prompts.map((prompt) => String((prompt as Record<string, unknown>).identifier ?? "")));
  const missing = [...WORKFLOW_PROMPT_IDS, HIDDEN_REORG_PROMPT_ID].filter((id) => !identifiers.has(id));
  if (missing.length) throw new Error(`预设缺少 ${missing.length} 个 A.U.T.O 工作流提示词。`);
  const extensions = raw.extensions as Record<string, unknown> | undefined;
  const regexes = Array.isArray(extensions?.regex_scripts)
    ? extensions.regex_scripts.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
  const notes: string[] = [];
  if (regexes.length !== 37) notes.push(`检测到 ${regexes.length} 条正则；审计基线为 37 条。`);
  return { raw, promptCount: prompts.length, regexes, notes };
}

export function messagesFromPreset(
  raw: Record<string, unknown>,
  step: StepNumber,
  preferences: Partial<ProjectPreferences> = {},
): ModelMessage[] {
  const validated = validatePresetSource(raw);
  const prompts = new Map(
    (validated.raw.prompts as Record<string, unknown>[]).map((prompt) => [
      String(prompt.identifier ?? prompt.id),
      prompt,
    ]),
  );
  const order = ((validated.raw.prompt_order as Array<{ order: Array<Record<string, unknown>> }>)[0]).order;
  const selected: Array<{ name: string; role: "system" | "user" | "assistant"; content: string }> = [];
  for (const entry of order) {
    const identifier = String(entry.identifier ?? "");
    if (PLACEHOLDER_IDS.has(identifier)) continue;
    const workflowStep = autoWorkflowProfileData.steps.find((candidate) => candidate.promptId === identifier)?.number;
    const hidden = identifier === HIDDEN_REORG_PROMPT_ID;
    if (hidden || (workflowStep && workflowStep !== step)) continue;
    if (!workflowStep && entry.enabled !== true) continue;
    const prompt = prompts.get(identifier);
    const content = String(prompt?.content ?? "");
    if (!content.trim()) continue;
    selected.push({
      name: String(prompt?.name || identifier),
      role: prompt?.role === "user" || prompt?.role === "assistant" ? prompt.role : "system",
      content,
    });
  }
  return expandPresetModules(selected, macroOverrides(preferences));
}

export const AUTO_WORKFLOW_PROFILE: WorkflowProfile = {
  id: autoWorkflowProfileData.id,
  version: `${autoWorkflowProfileData.id}-${autoWorkflowProfileData.source.sha256.slice(0, 12).toLowerCase()}`,
  label: autoWorkflowProfileData.label,
  source: AUTO_WORKFLOW_SOURCE,
  sampling: AUTO_WORKFLOW_SAMPLING,
  messagesForStep(step, preferences = {}) {
    const selected = autoWorkflowProfileData.modules.filter((module) => (
      module.workflowStep === step
      || (module.workflowStep === null && module.hiddenWorkflow === null && module.enabled)
    ));
    return expandPresetModules(selected, macroOverrides(preferences));
  },
};
