import assert from "node:assert/strict";
import test from "node:test";
import { MemoryStudioRepository, StubModelGateway } from "./adapters.ts";
import { activeProject } from "./core.ts";
import { createCharacterCardExport, defaultDeliveryKeys } from "./delivery.ts";
import { StudioKernel } from "./workflow.ts";

test("移动端成品导出为可导入的 Character Card V3，且不泄露连接或密钥", async () => {
  const kernel = new StudioKernel({
    repository: new MemoryStudioRepository(),
    gateway: new StubModelGateway(0),
  });
  await kernel.open();
  await kernel.updateProject({ name: "交付世界", brief: "角色卡交付验证" });
  await kernel.generateStep({ input: "开始", signal: new AbortController().signal });
  await kernel.acceptStep(1);
  const snapshot = kernel.snapshot();
  const output = createCharacterCardExport({
    snapshot,
    selectedKeys: defaultDeliveryKeys(activeProject(snapshot)),
    exportedAt: "2026-07-24T00:00:00.000Z",
  });
  const card = JSON.parse(output.contents);
  assert.equal(card.spec, "chara_card_v3");
  assert.equal(card.spec_version, "3.0");
  assert.ok(card.data.character_book.entries.length >= 2);
  assert.ok(card.data.extensions.regex_scripts.length >= 9);
  assert.equal(/apiKey|passphrase|baseUrl/i.test(output.contents), false);
});
