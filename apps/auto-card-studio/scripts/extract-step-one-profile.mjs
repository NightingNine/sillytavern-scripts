import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const EXPECTED_SOURCE_SHA256 = "A61CFB93053EEC5A7ED6769C42FBF6E58513135D2A3131E6C7EB658098633244";
const HIDDEN_REORG_PROMPT_ID = "bdc8f3a0-37a3-415a-b01d-b91359b79104";

const WORKFLOW_PROMPT_IDS = [
  "9376366e-bf35-446f-babe-438959ccc452",
  "94e2bf01-18df-4be8-9377-aa12d53e654a",
  "487bb55b-da3f-4ee7-8f6d-0c23b5591bc2",
  "ac469228-bd1a-444b-a61e-fa91bea00042",
  "91be7e14-4169-4e4e-b0b2-c4a32c8809f0",
  "e9b91a84-50d3-40db-b642-084797782bc6",
  "bb9bb9b7-3b3d-4b1a-8eb9-0a23ed3d799d",
  "2eeba189-911a-4d15-bf46-7caba49581b7",
  "835fe974-b281-4077-9ef1-10ad92ce65ba",
  "07688972-a290-4b22-a210-3f9df7ef0781",
  "430d57cf-d2ea-46ce-b83d-624ca2300f2b",
  "6ab76630-4988-4dcb-a1b7-2e2635ec7a00",
  "c6a34ba6-393f-48c7-993d-86c47de6a35c",
  "324e85a9-0fc1-4e8b-85cf-1ff9851f5b03",
  "35ea2ccc-99c5-4731-a25a-0693614b07fa",
  "d491235e-9535-48b0-8b15-6c0e777114fb",
  "60b1db7c-30d4-4a86-bd41-67e13c5084e0",
  "dace3da4-0f0d-4c81-8e7c-02db7e716acf",
  "5255b750-60b7-4f53-ad3b-3a950452d0f1",
  "d8f77e8f-ab6c-486f-a422-c136d7d5cb95",
  "db7539c5-8920-4899-bbdc-9c0d910beb43",
  "5472b214-c260-4ce8-97c2-7e9831cce93d",
  "d6d362c4-5556-4bd0-a08c-067afb3424b1",
  "268aa2ec-491c-4232-827d-8dbe291d4917",
  "829abf27-660e-4df4-8925-d7041bfd2868",
  "3a430168-7280-44ed-ab33-a0e8e4bbaf35",
  "ca6d2266-d37f-4596-bd2b-b61ac0f7ba49",
  "4c520657-a4b7-460f-95cf-96c1931c4cdc",
  "0b166044-370f-428d-ba4c-35531287b921",
];
const WORKFLOW_PROMPT_SET = new Set([...WORKFLOW_PROMPT_IDS, HIDDEN_REORG_PROMPT_ID]);

const PLACEHOLDER_IDS = new Set([
  "worldInfoBefore",
  "personaDescription",
  "charDescription",
  "charPersonality",
  "scenario",
  "worldInfoAfter",
  "dialogueExamples",
  "chatHistory",
  "user_input",
]);

function extractBalanced(source, marker, opening, closing) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`旧脚本缺少 ${marker}`);
  const start = source.indexOf(opening, markerIndex + marker.length);
  if (start < 0) throw new Error(`${marker} 缺少 ${opening}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    else if (character === closing) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${marker} 的 ${opening}${closing} 未闭合`);
}

function evaluateLiteral(source, marker, opening, closing) {
  return vm.runInNewContext(`(${extractBalanced(source, marker, opening, closing)})`, Object.create(null));
}

function serializeRules(rules) {
  return Object.fromEntries(Object.entries(rules).map(([step, rule]) => [
    step,
    {
      ...rule,
      patterns: rule.patterns?.map((pattern) => ({ source: pattern.source, flags: pattern.flags })),
    },
  ]));
}

const presetPath = process.argv[2];
if (!presetPath) {
  throw new Error("用法：node scripts/extract-step-one-profile.mjs <A.U.T.O.预设_v2.0.json> [旧脚本路径]");
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const legacyScriptPath = resolve(
  process.argv[3] || resolve(scriptDir, "../../../dist/character-creation/auto-card-studio/index.js"),
);
const sourceBytes = await readFile(resolve(presetPath));
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex").toUpperCase();
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`预设哈希不匹配：预期 ${EXPECTED_SOURCE_SHA256}，实际 ${sourceSha256}`);
}

const source = JSON.parse(sourceBytes.toString("utf8"));
const legacySource = await readFile(legacyScriptPath, "utf8");
const promptOrder = source.prompt_order?.[0]?.order;
if (!Array.isArray(source.prompts) || !Array.isArray(promptOrder)) {
  throw new Error("预设缺少 prompts 或 prompt_order。");
}

const prompts = new Map(source.prompts.map((prompt) => [String(prompt.identifier ?? prompt.id), prompt]));
const modules = [];
for (const [order, orderEntry] of promptOrder.entries()) {
  const identifier = String(orderEntry.identifier);
  if (PLACEHOLDER_IDS.has(identifier)) continue;
  const workflowIndex = WORKFLOW_PROMPT_IDS.indexOf(identifier);
  const hiddenReorg = identifier === HIDDEN_REORG_PROMPT_ID;
  if (!WORKFLOW_PROMPT_SET.has(identifier) && !orderEntry.enabled) continue;
  const prompt = prompts.get(identifier);
  if (!prompt || !String(prompt.content ?? "").trim()) continue;
  modules.push({
    id: identifier,
    name: String(prompt.name || identifier),
    role: prompt.role === "user" || prompt.role === "assistant" ? prompt.role : "system",
    content: String(prompt.content),
    enabled: Boolean(orderEntry.enabled),
    order,
    workflowStep: workflowIndex >= 0 ? workflowIndex + 1 : null,
    hiddenWorkflow: hiddenReorg ? "reorg" : null,
  });
}

const stepRows = evaluateLiteral(legacySource, "const STEPS =", "[", "]");
const phases = evaluateLiteral(legacySource, "const PHASES =", "[", "]");
const requirements = evaluateLiteral(legacySource, "const STEP_REQUIREMENTS =", "[", "]");
const guides = evaluateLiteral(legacySource, "const STEP_GUIDES =", "[", "]");
const artifactRules = serializeRules(
  evaluateLiteral(legacySource, "const STEP_ARTIFACT_RULES =", "{", "}"),
);

if (
  stepRows.length !== 29
  || phases.length !== 9
  || requirements.length !== 29
  || guides.length !== 29
  || WORKFLOW_PROMPT_IDS.some((id) => !modules.some((module) => module.id === id))
  || !modules.some((module) => module.id === HIDDEN_REORG_PROMPT_ID)
) {
  throw new Error("旧脚本或预设的 29 步资源不完整，已停止生成。");
}

const steps = stepRows.map(([promptId, name, goal], index) => ({
  number: index + 1,
  promptId,
  name,
  goal,
  phase: phases.find((phase) => index + 1 >= phase.range[0] && index + 1 <= phase.range[1])?.id,
  requirement: requirements[index],
  guide: guides[index],
}));

const contentCharacters = modules.reduce((total, module) => total + module.content.length, 0);
const derived = {
  format: "auto-card-studio-workflow-profile",
  version: 2,
  id: "auto-v2-mobile-workflow",
  label: "A.U.T.O v2.0 · 完整 29 步",
  source: {
    fileName: basename(resolve(presetPath)),
    sha256: sourceSha256,
    legacyScriptFileName: basename(legacyScriptPath),
    legacyScriptSha256: createHash("sha256").update(legacySource).digest("hex").toUpperCase(),
    moduleCount: modules.length,
    contentCharacters,
    promptCount: source.prompts.length,
    regexCount: source.extensions?.regex_scripts?.length ?? 0,
  },
  sampling: {
    temperature: Number(source.temperature ?? 1),
    topP: Number(source.top_p ?? 1),
    frequencyPenalty: Number(source.frequency_penalty ?? 0),
    presencePenalty: Number(source.presence_penalty ?? 0),
    maxTokens: Number(source.openai_max_tokens ?? 30000),
    maxContext: Number(source.openai_max_context ?? 420000),
  },
  phases,
  steps,
  artifactRules,
  modules,
  regexes: Array.isArray(source.extensions?.regex_scripts)
    ? source.extensions.regex_scripts
    : [],
};

const outputPath = resolve(scriptDir, "../src/auto-workflow-profile.generated.ts");
const output = [
  "// 由 scripts/extract-step-one-profile.mjs 从已审计旧脚本与 A.U.T.O v2.0 预设机械生成，请勿手改。",
  `const autoWorkflowProfileData = ${JSON.stringify(derived, null, 2)} as const;`,
  "",
  "export default autoWorkflowProfileData;",
  "",
].join("\n");
await writeFile(outputPath, output, "utf8");
console.log(`已生成 ${outputPath}`);
console.log(`${steps.length} steps / ${modules.length} modules / ${contentCharacters} chars / ${derived.source.regexCount} regexes`);
