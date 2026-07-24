import assert from "node:assert/strict";
import test from "node:test";
import {
  activeProject,
  artifactKey,
  createInitialSnapshot,
  createProjectArchive,
  extractArtifacts,
  fingerprint,
  migrateSnapshot,
  normalizeRegexResource,
  parseProjectArchive,
  type WorkspaceResources,
} from "./core.ts";

const NOW = "2026-07-24T00:00:00.000Z";
const RESOURCES: WorkspaceResources = {
  preset: {
    id: "test-preset",
    name: "测试预设",
    sourceFileName: "preset.json",
    sourceSha256: "ABC",
    profileVersion: "test-v1",
    promptCount: 30,
    regexCount: 0,
    importedAt: NOW,
  },
  regexes: [],
  compatibilityNotes: [],
};

test("29 步配置的 XML、围栏与状态栏产物按步骤提取", () => {
  assert.deepEqual(
    extractArtifacts(
      "<WORLD_interaction_paradigm>交互</WORLD_interaction_paradigm>\n<WORLD_blueprint>越界</WORLD_blueprint>",
      1,
    ).map((item) => item.identity),
    ["WORLD_interaction_paradigm"],
  );
  assert.deepEqual(
    extractArtifacts(
      "```html\n<body>状态栏</body>\n```\n```regex\n<STATUSBAR_DATA>[\\s\\S]*?</STATUSBAR_DATA>\n```",
      23,
    ).map((item) => item.identity),
    ["STATUSBAR_HTML", "STATUSBAR_REGEX"],
  );
  assert.deepEqual(
    extractArtifacts("```opening\n<NARRATIVE>开场</NARRATIVE>\n```", 29).map((item) => item.identity),
    ["opening"],
  );
});

test("旧 Schema 1 原位迁移到 29 步项目，并保留 Step 1 会话与产物", () => {
  const legacy = {
    schemaVersion: 1,
    workspaceId: "primary",
    revision: 7,
    project: {
      id: "legacy-project",
      name: "旧项目",
      brief: "旧母题",
      currentStep: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    stepOne: {
      number: 1,
      status: "accepted",
      turns: [{ id: "turn-1", role: "assistant", content: "旧回复", step: 1, createdAt: NOW }],
      updatedAt: NOW,
    },
    artifacts: {
      versions: [{
        id: "artifact-1",
        step: 1,
        identity: "WORLD_interaction_paradigm",
        content: "<WORLD_interaction_paradigm>旧产物</WORLD_interaction_paradigm>",
        source: "generated",
        createdAt: NOW,
        updatedAt: NOW,
      }],
      selectedVersionIds: { WORLD_interaction_paradigm: "artifact-1" },
    },
    receipts: [],
    updatedAt: NOW,
  };
  const migrated = migrateSnapshot(legacy, RESOURCES);
  const project = activeProject(migrated);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.revision, 7);
  assert.equal(Object.keys(project.steps).length, 29);
  assert.equal(project.steps["1"].turns[0].content, "旧回复");
  assert.equal(project.artifacts.selectedVersionIds[artifactKey(1, "WORLD_interaction_paradigm")], "artifact-1");
  assert.deepEqual(migrated.migrations, ["schema-1-to-2"]);
});

test("项目归档往返只携带项目与资源来源指纹，不含模型密钥", () => {
  const snapshot = createInitialSnapshot({ now: NOW, projectId: "project-export", resources: RESOURCES });
  activeProject(snapshot).name = "离线世界";
  const source = createProjectArchive(snapshot, NOW);
  const parsed = parseProjectArchive(source, RESOURCES);
  assert.equal(parsed.project.name, "离线世界");
  assert.equal(parsed.sourceVersion, 2);
  assert.equal(/apiKey|passphrase|baseUrl/i.test(source), false);
});

test("归档篡改、未知格式与无效 JSON 会在导入前拒绝", () => {
  const snapshot = createInitialSnapshot({ now: NOW, projectId: "project-corrupt", resources: RESOURCES });
  const archive = JSON.parse(createProjectArchive(snapshot, NOW));
  archive.payload.project.name = "被篡改";
  assert.throws(() => parseProjectArchive(JSON.stringify(archive), RESOURCES), /完整性校验失败/);
  archive.formatVersion = 99;
  assert.throws(() => parseProjectArchive(JSON.stringify(archive), RESOURCES), /暂不支持/);
  assert.throws(() => parseProjectArchive("{broken", RESOURCES), /不是有效的 JSON/);
});

test("旧版项目归档先按原始 v1 快照验签，再迁移为 Schema 2 项目", () => {
  const legacySnapshot = {
    schemaVersion: 1,
    workspaceId: "primary",
    revision: 3,
    project: {
      id: "legacy-import",
      name: "旧归档",
      brief: "旧版可携工程",
      currentStep: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    stepOne: { number: 1, status: "idle", turns: [], updatedAt: null },
    artifacts: { versions: [], selectedVersionIds: {} },
    receipts: [],
    updatedAt: NOW,
  };
  // v1 的完整性摘要针对原始 v1 快照，不是迁移后的 v2 结构。
  const archive = {
    format: "auto-card-studio-project",
    formatVersion: 1,
    exportedAt: NOW,
    payload: { snapshot: legacySnapshot },
    integrity: {
      algorithm: "fnv1a-32",
      snapshotDigest: fingerprint(legacySnapshot),
    },
  };
  const parsed = parseProjectArchive(JSON.stringify(archive), RESOURCES);
  assert.equal(parsed.sourceVersion, 1);
  assert.equal(parsed.project.name, "旧归档");
  assert.equal(Object.keys(parsed.project.steps).length, 29);
});

test("独立正则保留未知字段，并只处理 AI 输出位置", () => {
  const resource = normalizeRegexResource({
    id: "regex-1",
    scriptName: "隐藏分析",
    disabled: false,
    findRegex: "/<THINK>[\\s\\S]*?<\\/THINK>/g",
    replaceString: "",
    placement: [2],
    unknownField: { keep: true },
  });
  assert.equal(resource.enabled, true);
  assert.deepEqual(resource.raw.unknownField, { keep: true });
});
