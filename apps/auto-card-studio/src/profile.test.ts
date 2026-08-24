import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_WORKFLOW_PROFILE,
  AUTO_WORKFLOW_SOURCE,
  EMBEDDED_PRESET_REGEXES,
  expandPresetModules,
} from "./profile.ts";

test("内置资源完整覆盖 29 步、隐藏重组提示与 37 条正则", () => {
  assert.equal(
    AUTO_WORKFLOW_SOURCE.sha256,
    "A61CFB93053EEC5A7ED6769C42FBF6E58513135D2A3131E6C7EB658098633244",
  );
  assert.equal(AUTO_WORKFLOW_SOURCE.moduleCount, 48);
  assert.equal(AUTO_WORKFLOW_SOURCE.contentCharacters, 884_814);
  assert.equal(AUTO_WORKFLOW_SOURCE.promptCount, 139);
  assert.equal(EMBEDDED_PRESET_REGEXES.length, 37);
  for (let step = 1; step <= 29; step += 1) {
    const messages = AUTO_WORKFLOW_PROFILE.messagesForStep(step as never);
    const legacyLabel = step === 29 ? "Step30 " : `Step${step} `;
    assert.ok(messages.some((message) => message.name?.startsWith(legacyLabel)), `缺少 Step ${step} 提示词`);
    assert.equal(messages.some((message) => /^Step\d+ /.test(message.name || "") && !message.name?.startsWith(legacyLabel)), false);
  }
});

test("受限宏只展开 setvar/getvar/注释，并保留角色卡模板变量", () => {
  const [message] = expandPresetModules([
    {
      name: "macro",
      role: "system",
      content: [
        "{{setvar::creator_role::旧值}}",
        "{{getvar::creator_role}} 与 {{char}} / {{user}}",
        "{{// 这是一条注释 }}",
      ].join("\n"),
    },
  ], { creator_role: "创作者" });
  assert.equal(message.content, "创作者 与 {{char}} / {{user}}");
});
