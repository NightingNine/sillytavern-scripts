import {
  activeProject,
  artifactKey,
  cloneSnapshot,
  extractXmlBlocks,
  safeFileStem,
  selectedArtifacts,
  type ArtifactVersion,
  type StudioProject,
  type StudioSnapshot,
} from "./core.ts";

export type DeliveryTargetKind =
  | "worldbook" | "opening" | "character_regex_replace" | "character_regex_find";

export interface DeliveryArtifact {
  key: string;
  artifact: ArtifactVersion;
  target: { kind: DeliveryTargetKind; name: string };
}

interface WorldbookEntry {
  uid: number;
  name: string;
  enabled: boolean;
  strategy: {
    type: "constant";
    keys: string[];
    keys_secondary: { logic: "and_any"; keys: string[] };
    scan_depth: "same_as_global";
  };
  position: {
    type: "before_character_definition";
    role: "system";
    depth: number;
    order: number;
  };
  content: string;
  probability: number;
  recursion: { prevent_incoming: boolean; prevent_outgoing: boolean; delay_until: null };
  effect: { sticky: null; cooldown: null; delay: null };
  extra: Record<string, unknown>;
}

function suffixLabel(value: string): string {
  return value.replace(/[_-]+/g, " ").trim();
}

export function deliveryTargetForArtifact(identity: string, step: number): DeliveryArtifact["target"] | null {
  const exact: Record<string, string> = {
    WORLD_interaction_paradigm: "🕹️交互范式",
    WORLD_aesthetic_program: "🕹️美学纲领",
    WORLD_blueprint: "🧩世界蓝图",
    SOURCE_spatial_planning: "🗑️空间规划1️⃣",
    WORLD_narrative_core: "🕹️叙事指南核心",
    SOURCE_待变量化: "🗑️数据盘点3️⃣",
    SOURCE_待条件化: "🗑️数据盘点3️⃣",
    SOURCE_variable_system_planning: "🗑️变量体系规划2️⃣",
    WORLD_variable_update_guide: "🕹️更新指南2️⃣[mvu_update]",
    SOURCE_step19_plan: "🗑️条件显示规划3️⃣",
    WORLD_root_index: "🕹️世界根目录",
    SOURCE_statusbar_data_guide: "🗑️状态栏更新提示4️⃣",
    SYS_output_format: "🕹️输出格式[mvu_plot]",
    SOURCE_task_list: "🗑️副AI任务清单5️⃣",
    SOURCE_entry_plan: "🗑️条目规划表6️⃣",
    autotask_config: "[AutoTask配置-请勿修改]",
    opening: "角色卡 · 其他开场",
  };
  if (exact[identity]) {
    return { kind: identity === "opening" ? "opening" : "worldbook", name: exact[identity] };
  }
  if (identity === "STATUSBAR_HTML") {
    return { kind: "character_regex_replace", name: "角色卡局部正则 · 🕹️显示状态栏（替换内容）" };
  }
  if (identity === "STATUSBAR_REGEX") {
    return { kind: "character_regex_find", name: "角色卡局部正则 · 🕹️显示状态栏（查找表达式）" };
  }
  const mappings: readonly [string, string][] = [
    ["WORLD_implementation_mechanisms", "🕹️实现机制"],
    ["WORLD_arc_framework_", "🗑️弧光识别1️⃣"],
    ["WORLD_relationship_map", "🧩关系图谱"],
    ["WORLD_generative_rules_", "🧩生成规则"],
    ["WORLD_specific_instances_", "🧩具体实例"],
    ["WORLD_lore_", "🧩世界知识"],
    ["SOURCE_plot_graph_", "🗑️情节图谱"],
    ["WORLD_dimension_", "🧩维度内容"],
    ["WORLD_language_materials_", "🧩语料库"],
    ["WORLD_scene_strategies_", "🧩场景策略集"],
    ["WORLD_current_", "🕹️当前变量"],
    ["SOURCE_condition_mapping_", "🗑️条件地图2️⃣"],
  ];
  const mapped = mappings.find(([prefix]) => identity.startsWith(prefix));
  if (mapped) return { kind: "worldbook", name: mapped[1] };
  if (identity.startsWith("WORLD_main_characters_") || identity.startsWith("SOURCE_main_characters_")) {
    if (identity.endsWith("_原点")) return { kind: "worldbook", name: "🕹️主要角色-原点" };
    if (identity.endsWith("_画像")) return { kind: "worldbook", name: "🧩主要角色-画像" };
    if (identity.endsWith("_状态")) return { kind: "worldbook", name: "🗑️主要角色-状态2️⃣" };
  }
  if (identity.startsWith("SYS_task_")) {
    if (step === 26) return { kind: "worldbook", name: "🔇世界书提示词" };
    if (step === 27) return { kind: "worldbook", name: "🔇变量提示词" };
  }
  if (step === 20 && identity.startsWith("WORLD_")) {
    return { kind: "worldbook", name: `🔢${suffixLabel(identity.slice("WORLD_".length)) || "条件显示内容"}` };
  }
  if (step === 21 && identity.startsWith("WORLD_")) {
    return { kind: "worldbook", name: "🔢其他条件展示内容" };
  }
  return null;
}

export function collectDeliveryArtifacts(project: StudioProject): DeliveryArtifact[] {
  return selectedArtifacts(project).flatMap((artifact) => {
    const target = deliveryTargetForArtifact(artifact.identity, artifact.step);
    return target ? [{ key: artifactKey(artifact.step, artifact.identity), artifact, target }] : [];
  });
}

function worldbookEntryEnabled(name: string): boolean {
  return name.startsWith("🕹️") || name.startsWith("🧩");
}

export function buildDefaultWorldbook(project: StudioProject, artifacts: DeliveryArtifact[]): WorldbookEntry[] {
  const grouped = new Map<string, string[]>();
  for (const item of artifacts.filter((candidate) => candidate.target.kind === "worldbook")) {
    const contents = grouped.get(item.target.name) ?? [];
    // 正文相同的不同产物仍单独保留，避免交付时静默遗漏。
    contents.push(item.artifact.content);
    grouped.set(item.target.name, contents);
  }
  return [...grouped.entries()].map(([name, contents], index) => ({
    uid: index,
    name,
    enabled: worldbookEntryEnabled(name),
    strategy: {
      type: "constant",
      keys: [],
      keys_secondary: { logic: "and_any", keys: [] },
      scan_depth: "same_as_global",
    },
    position: {
      type: "before_character_definition",
      role: "system",
      depth: 4,
      order: 1000 - index,
    },
    content: contents.join("\n\n"),
    probability: 100,
    recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
    effect: { sticky: null, cooldown: null, delay: null },
    extra: {
      auto_card_studio: {
        projectId: project.id,
        sourceArtifacts: artifacts
          .filter((candidate) => candidate.target.kind === "worldbook" && candidate.target.name === name)
          .map((candidate) => candidate.artifact.id),
      },
    },
  }));
}

const OUTPUT_FORMAT_REGEX_BUNDLE = [
  ["7ccce287-970f-48e2-a151-0dddc79d3ab2", "🕹️去除conception", "/<CONTEXT_conception>[\\s\\S]*?</CONTEXT_conception>/gs", [1, 2], true, true, null],
  ["139f6568-218c-40bc-9d05-53888efeab67", "🧩不发送剧情", "/<NARRATIVE>[\\s\\S]*?</NARRATIVE>/gs", [1, 2], false, true, 5],
  ["1f719870-73ce-4cee-aab9-ef32b587a427", "🧩不发送副剧情", "/<NARRATIVE_parallel>.*?</NARRATIVE_parallel>/gs", [1, 2], false, true, 5],
  ["0f340cb5-f1e6-4790-978a-53b63d7fad9c", "🕹️去除选择区", "/<CONTEXT_options>[\\s\\S]*?</CONTEXT_options>/gs", [1, 2], true, true, 2],
  ["f3284806-c7db-4508-90f3-454bd9a0e349", "🕹️隐藏摘要", "/<CONTEXT_summary>[\\s\\S]*?</CONTEXT_summary>/gs", [1, 2], true, false, null],
  ["4ce83bde-111d-4453-9e6d-afd7328bd017", "🕹️隐藏隐藏摘要", "/<CONTEXT_hidden_summary>[\\s\\S]*?</CONTEXT_hidden_summary>/gs", [1, 2], true, false, null],
  ["f4a96e51-622d-45cd-bbe9-2f69c2888b54", "🕹️隐藏变量更新", "/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs", [1, 2], true, false, null],
  ["44f1f813-69ef-4262-bf3d-1bbc4ce071c0", "🕹️去除变量更新", "/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs", [1], true, true, 2],
  ["1eb350ef-e06a-4e5c-9cef-237eb7e9aa6a", "🕹️去除状态栏", "/<STATUSBAR_DATA>[\\s\\S]*?</STATUSBAR_DATA>/gs", [1, 2], true, true, 3],
] as const;

function outputRegexScripts(): Record<string, unknown>[] {
  return OUTPUT_FORMAT_REGEX_BUNDLE.map(([id, name, findRegex, placement, display, prompt, minDepth]) => ({
    id,
    script_name: name,
    enabled: true,
    find_regex: findRegex,
    trim_strings: [],
    replace_string: "",
    source: {
      user_input: (placement as readonly number[]).includes(1),
      ai_output: (placement as readonly number[]).includes(2),
      slash_command: false,
      world_info: false,
      reasoning: false,
    },
    destination: { display, prompt },
    run_on_edit: true,
    min_depth: minDepth,
    max_depth: null,
  }));
}

function buildCharacterRegexScripts(artifacts: DeliveryArtifact[]): Record<string, unknown>[] {
  const scripts = outputRegexScripts();
  const html = artifacts.find((item) => item.target.kind === "character_regex_replace");
  const find = artifacts.find((item) => item.target.kind === "character_regex_find");
  if (!html && !find) return scripts;
  if (!html?.artifact.content.trim()) throw new Error("选择了状态栏正则，但缺少状态栏 HTML。");
  scripts.push({
    id: `auto-statusbar-${html.artifact.id}`,
    script_name: "🕹️显示状态栏",
    enabled: true,
    find_regex: find?.artifact.content.trim() || "<StatusPlaceHolderImpl/>",
    trim_strings: [],
    replace_string: html.artifact.content.trim(),
    source: {
      user_input: false,
      ai_output: true,
      slash_command: false,
      world_info: false,
      reasoning: false,
    },
    destination: { display: true, prompt: false },
    run_on_edit: true,
    min_depth: null,
    max_depth: null,
  });
  return scripts;
}

function openingMessage(project: StudioProject, artifacts: DeliveryArtifact[]): string {
  const opening = artifacts.find((item) => item.target.kind === "opening")?.artifact.content;
  if (!opening) return `欢迎来到「${project.name}」。`;
  const wanted = new Set([
    "NARRATIVE", "NARRATIVE_parallel", "CONTEXT_options", "CONTEXT_summary",
    "CONTEXT_hidden_summary", "UpdateVariable", "STATUSBAR_DATA",
  ]);
  const blocks = extractXmlBlocks(opening).filter((block) => wanted.has(block.tag));
  return blocks.length ? blocks.map((block) => block.content).join("\n\n") : opening;
}

function cardWorldbookEntries(entries: WorldbookEntry[]): Record<string, unknown>[] {
  return entries.map((entry, index) => ({
    id: index,
    keys: entry.strategy.keys,
    secondary_keys: entry.strategy.keys_secondary.keys,
    comment: entry.name,
    content: entry.content,
    constant: entry.strategy.type === "constant",
    selective: false,
    insertion_order: entry.position.order,
    enabled: entry.enabled,
    position: "before_char",
    use_regex: true,
    extensions: {
      position: entry.position.depth,
      probability: entry.probability,
      ...entry.extra,
    },
  }));
}

export function defaultDeliveryKeys(project: StudioProject): string[] {
  return collectDeliveryArtifacts(project)
    .filter((item) => item.artifact.accepted)
    .map((item) => item.key);
}

export function createCharacterCardExport(options: {
  snapshot: StudioSnapshot;
  selectedKeys?: readonly string[];
  exportedAt: string;
}): { fileName: string; contents: string; artifactCount: number; worldbookCount: number } {
  const snapshot = cloneSnapshot(options.snapshot);
  const project = activeProject(snapshot);
  const allowed = options.selectedKeys ? new Set(options.selectedKeys) : null;
  const artifacts = collectDeliveryArtifacts(project).filter((item) => !allowed || allowed.has(item.key));
  if (!artifacts.length) throw new Error("至少选择一项正式产物后才能导出。");
  const worldbook = buildDefaultWorldbook(project, artifacts);
  const regexScripts = buildCharacterRegexScripts(artifacts);
  const card = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: project.output.characterName.trim() || project.name,
      description: project.brief,
      personality: "",
      scenario: project.brief,
      first_mes: openingMessage(project, artifacts),
      mes_example: "",
      creator_notes: `由 A.U.T.O 独立创作台移动端导出于 ${options.exportedAt}`,
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: ["A.U.T.O", "auto-card-studio"],
      creator: "A.U.T.O Card Studio",
      character_version: "1.0",
      character_book: {
        name: project.output.worldbookName.trim() || `${project.name} · 世界书`,
        description: `由 A.U.T.O 29 步工作流生成，共 ${worldbook.length} 个条目。`,
        scan_depth: 4,
        token_budget: 0,
        recursive_scanning: false,
        extensions: {},
        entries: cardWorldbookEntries(worldbook),
      },
      extensions: {
        regex_scripts: regexScripts,
        auto_card_studio: {
          exportFormat: 1,
          projectId: project.id,
          projectName: project.name,
          exportedAt: options.exportedAt,
          appSchemaVersion: snapshot.schemaVersion,
          profileVersion: snapshot.resources.preset.profileVersion,
          presetSource: {
            fileName: snapshot.resources.preset.sourceFileName,
            sha256: snapshot.resources.preset.sourceSha256,
          },
          selectedArtifacts: artifacts.map((item) => ({
            key: item.key,
            versionId: item.artifact.id,
            identity: item.artifact.identity,
            step: item.artifact.step,
            target: item.target,
          })),
        },
      },
    },
  };
  return {
    fileName: `${safeFileStem(project.output.characterName || project.name)}.json`,
    contents: JSON.stringify(card, null, 2),
    artifactCount: artifacts.length,
    worldbookCount: worldbook.length,
  };
}
