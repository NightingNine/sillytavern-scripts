import autoWorkflowProfileData from "./auto-workflow-profile.generated.ts";

export type StepNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29;
export type WorkflowRequirement = "required" | "recommended" | "advanced";

export interface StepGuide {
  title: string;
  description: string;
  prompts: readonly string[];
  placeholder: string;
}

export interface WorkflowStep {
  number: StepNumber;
  promptId: string;
  name: string;
  goal: string;
  phase: string;
  requirement: WorkflowRequirement;
  guide: StepGuide;
}

export interface ArtifactRule {
  tags?: readonly string[];
  prefixes?: readonly string[];
  patterns?: readonly RegExp[];
  fences?: readonly string[];
  recoverableXmlFences?: readonly string[];
  statusbarFences?: boolean;
}

type SerializedRule = {
  tags?: readonly string[];
  prefixes?: readonly string[];
  patterns?: readonly { source: string; flags: string }[];
  fences?: readonly string[];
  recoverableXmlFences?: readonly string[];
  statusbarFences?: boolean;
};

export const WORKFLOW_PHASES = autoWorkflowProfileData.phases;
export const WORKFLOW_STEPS = autoWorkflowProfileData.steps as unknown as readonly WorkflowStep[];
export const WORKFLOW_STEP_COUNT = 29;
export const HIDDEN_REORG_STEP = 30;

export const ARTIFACT_RULES: Readonly<Record<number, ArtifactRule>> = Object.freeze(
  Object.fromEntries(
    Object.entries(autoWorkflowProfileData.artifactRules as unknown as Record<string, SerializedRule>)
      .map(([step, rule]) => [
        Number(step),
        Object.freeze({
          ...rule,
          patterns: rule.patterns?.map((pattern) => new RegExp(pattern.source, pattern.flags)),
        }),
      ]),
  ),
);

export function stepDefinition(step: number): WorkflowStep {
  const definition = WORKFLOW_STEPS[step - 1];
  if (!definition || definition.number !== step) throw new Error(`无效步骤：${step}`);
  return definition;
}

export function isStepNumber(value: unknown): value is StepNumber {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= WORKFLOW_STEP_COUNT;
}

export function artifactDisplayName(identity: string, step: number): string {
  const exact: Record<string, string> = {
    WORLD_interaction_paradigm: "交互范式",
    WORLD_aesthetic_program: "美学纲领",
    WORLD_blueprint: "世界蓝图",
    SOURCE_spatial_planning: "空间规划",
    WORLD_narrative_core: "叙事指南核心",
    SOURCE_待变量化: "数据盘点 · 待变量化",
    SOURCE_待条件化: "数据盘点 · 待条件化",
    SOURCE_variable_system_planning: "变量体系规划",
    WORLD_variable_update_guide: "变量更新指南",
    SOURCE_step19_plan: "条件显示规划",
    WORLD_root_index: "世界根目录",
    SOURCE_statusbar_data_guide: "状态栏数据指南",
    STATUSBAR_HTML: "状态栏界面",
    STATUSBAR_REGEX: "状态栏数据正则",
    SYS_output_format: "输出格式",
    SOURCE_task_list: "副 AI 任务清单",
    SOURCE_entry_plan: "世界书条目规划表",
    autotask_config: "AutoTask 配置",
    opening: "正式开场白",
  };
  if (exact[identity]) return exact[identity];
  const prefixes: readonly [string, string][] = [
    ["WORLD_implementation_mechanisms", "实现机制"],
    ["WORLD_arc_framework_", "弧光识别"],
    ["WORLD_relationship_map", "角色关系图谱"],
    ["WORLD_generative_rules_", "世界生成规则"],
    ["WORLD_specific_instances_", "世界具体实例"],
    ["WORLD_lore_", "世界知识"],
    ["SOURCE_plot_graph_", "情节图谱"],
    ["WORLD_dimension_", "叙事维度内容"],
    ["WORLD_language_materials_", "语料库"],
    ["WORLD_scene_strategies_", "场景策略集"],
    ["WORLD_current_", "当前变量"],
    ["SOURCE_condition_mapping_", "条件映射"],
  ];
  const prefix = prefixes.find(([candidate]) => identity.startsWith(candidate));
  return prefix ? `${prefix[1]} · ${identity.slice(prefix[0].length) || step}` : identity;
}
