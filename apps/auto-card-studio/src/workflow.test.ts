import assert from "node:assert/strict";
import test from "node:test";
import { MemoryStudioRepository, StubModelGateway } from "./adapters.ts";
import {
  ProtocolConflictError,
  RevisionConflictError,
  activeProject,
  selectedArtifacts,
  stepState,
} from "./core.ts";
import type { ModelGateway, ModelStreamEvent } from "./ports.ts";
import { StudioKernel } from "./workflow.ts";

function deterministicKernel(repository: MemoryStudioRepository, gateway: ModelGateway): StudioKernel {
  let sequence = 0;
  let clock = Date.parse("2026-07-23T00:00:00.000Z");
  return new StudioKernel({
    repository,
    gateway,
    nextId: (prefix) => `${prefix}-${++sequence}`,
    now: () => new Date(clock += 1000).toISOString(),
  });
}

test("正常生成保存会话与独立产物，并可从同一仓库重开", async () => {
  const repository = new MemoryStudioRepository();
  const gateway = new StubModelGateway(0);
  const kernel = deterministicKernel(repository, gateway);
  await kernel.open();
  await kernel.updateProject({ name: "雾港", brief: "未知探索与同伴信任" });
  const outcome = await kernel.generateStep({ input: "不要替玩家决定", signal: new AbortController().signal });
  const project = activeProject(outcome.snapshot);
  assert.equal(outcome.status, "committed");
  assert.equal(stepState(project, 1).turns.length, 2);
  assert.equal(selectedArtifacts(project, 1).length, 2);
  assert.equal(gateway.calls, 1);

  const reopened = deterministicKernel(repository, new StubModelGateway(0));
  const restored = await reopened.open();
  assert.equal(restored.revision, outcome.snapshot.revision);
  assert.equal(stepState(activeProject(restored), 1).turns[1].content, stepState(project, 1).turns[1].content);
});

test("流式取消与模型失败不污染正式状态", async () => {
  const repository = new MemoryStudioRepository();
  const gateway = new StubModelGateway(1);
  const kernel = deterministicKernel(repository, gateway);
  await kernel.open();
  await kernel.updateProject({ name: "边境城", brief: "调查员寻找同伴" });
  const controller = new AbortController();
  const cancelled = await kernel.generateStep({
    input: "开始",
    signal: controller.signal,
    onDraft: () => controller.abort(),
  });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(stepState(activeProject(cancelled.snapshot), 1).turns.length, 0);

  const failing: ModelGateway = {
    id: "fail",
    label: "失败",
    async *stream(): AsyncIterable<ModelStreamEvent> {
      throw new Error("MODEL_UNAVAILABLE");
    },
  };
  const second = deterministicKernel(new MemoryStudioRepository(), failing);
  await second.open();
  await second.updateProject({ name: "失败测试", brief: "不污染" });
  await assert.rejects(second.generateStep({ input: "开始", signal: new AbortController().signal }));
  assert.equal(stepState(activeProject(second.snapshot()), 1).turns.length, 0);
});

test("重复 commandId 幂等，冲突 payload 与旧 revision 在模型前拒绝", async () => {
  const gateway = new StubModelGateway(0);
  const kernel = deterministicKernel(new MemoryStudioRepository(), gateway);
  await kernel.open();
  await kernel.updateProject({ name: "回声塔", brief: "测试幂等" });
  const command = {
    commandId: "repeat",
    attemptId: "attempt",
    expectedRevision: 1,
    input: "开始",
    signal: new AbortController().signal,
  };
  const first = await kernel.generateStep(command);
  const second = await kernel.generateStep(command);
  assert.equal(first.receipt?.commandId, second.receipt?.commandId);
  assert.equal(gateway.calls, 1);
  await assert.rejects(kernel.generateStep({ ...command, input: "冲突" }), ProtocolConflictError);
  await assert.rejects(
    kernel.generateStep({ input: "旧 revision", expectedRevision: 0, signal: new AbortController().signal }),
    RevisionConflictError,
  );
});

test("完整 29 步均可生成、识别产物、确认并保存", async () => {
  const kernel = deterministicKernel(new MemoryStudioRepository(), new StubModelGateway(0));
  await kernel.open();
  await kernel.updateProject({ name: "完整迁移验收", brief: "验证 29 步移动端闭环" });
  for (let step = 1; step <= 29; step += 1) {
    if (step > 1) await kernel.navigateStep(step);
    const generated = await kernel.generateStep({ input: `执行 Step ${step}`, signal: new AbortController().signal });
    const project = activeProject(generated.snapshot);
    assert.ok(selectedArtifacts(project, step).length > 0, `Step ${step} 未提取产物`);
    await kernel.acceptStep(step as never);
  }
  const project = activeProject(kernel.snapshot());
  assert.equal(Object.values(project.steps).filter((state) => state.status === "accepted").length, 29);
  assert.equal(project.currentStep, 29);
});

test("会话编辑和清空不会修改独立产物，产物编辑创建新版本", async () => {
  const kernel = deterministicKernel(new MemoryStudioRepository(), new StubModelGateway(0));
  await kernel.open();
  await kernel.updateProject({ name: "隔离测试", brief: "对话与产物隔离" });
  await kernel.generateStep({ input: "开始", signal: new AbortController().signal });
  let project = activeProject(kernel.snapshot());
  const original = selectedArtifacts(project, 1)[0];
  const assistant = stepState(project, 1).turns.find((turn) => turn.role === "assistant")!;
  await kernel.editTurn(assistant.id, "只修改会话");
  await kernel.clearStepConversation(1);
  project = activeProject(kernel.snapshot());
  assert.equal(project.artifacts.versions.find((item) => item.id === original.id)?.content, original.content);
  await kernel.editArtifact(original.id, `${original.content}\n新版本`);
  project = activeProject(kernel.snapshot());
  assert.equal(project.artifacts.versions.filter((item) => item.identity === original.identity).length, 2);
});
