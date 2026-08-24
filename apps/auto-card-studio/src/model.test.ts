import assert from "node:assert/strict";
import test from "node:test";
import {
  ModelGatewayError,
  OpenAICompatibleGateway,
  modelEndpoint,
  type FetchLike,
} from "./model.ts";
import type {
  ModelRequest,
  ModelSettings,
  SecretStatus,
  SecretStore,
} from "./ports.ts";
import { AUTO_WORKFLOW_SAMPLING } from "./profile.ts";

const SETTINGS: ModelSettings = {
  mode: "openai-compatible",
  baseUrl: "https://example.test/v1/",
  model: "test-model",
  timeoutMs: 10_000,
  updatedAt: "2026-07-23T00:00:00.000Z",
};

const REQUEST: ModelRequest = {
  commandId: "command-1",
  attemptId: "attempt-1",
  task: "workflow-step",
  step: 1,
  profileVersion: "profile-1",
  outputContractVersion: "auto-artifacts-v2",
  messages: [{ role: "user", content: "hello", name: "不发送 name" }],
};

class TestSecretStore implements SecretStore {
  status(): SecretStatus {
    return { supported: true, unlocked: true, hasApiKey: true };
  }

  async unlock(): Promise<SecretStatus> {
    return this.status();
  }

  async readApiKey(): Promise<string> {
    return "test-secret";
  }

  async saveApiKey(): Promise<SecretStatus> {
    return this.status();
  }

  async removeApiKey(): Promise<SecretStatus> {
    return { supported: true, unlocked: true, hasApiKey: false };
  }

  async lock(): Promise<SecretStatus> {
    return { supported: true, unlocked: false, hasApiKey: false };
  }
}

function gateway(fetcher: FetchLike): OpenAICompatibleGateway {
  return new OpenAICompatibleGateway({
    settings: () => SETTINGS,
    secretStore: new TestSecretStore(),
    sampling: AUTO_WORKFLOW_SAMPLING,
    fetcher,
  });
}

function streamResponse(blocks: string[], splits: number[]): Response {
  const encoded = new TextEncoder().encode(blocks.join(""));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let offset = 0;
      for (const size of splits) {
        controller.enqueue(encoded.slice(offset, offset + size));
        offset += size;
      }
      if (offset < encoded.length) controller.enqueue(encoded.slice(offset));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}

async function collect(model: OpenAICompatibleGateway): Promise<Array<{ type: string; value: string }>> {
  const events = [];
  for await (const event of model.stream(REQUEST, new AbortController().signal)) {
    events.push({
      type: event.type,
      value: event.type === "chunk" ? event.delta : event.finishReason,
    });
  }
  return events;
}

test("Base URL 只接受 http(s)，并归一到兼容端点", () => {
  assert.equal(
    modelEndpoint("https://example.test/v1/chat/completions", "models"),
    "https://example.test/v1/models",
  );
  assert.throws(
    () => modelEndpoint("file:///tmp/model", "models"),
    (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_CONFIG_INVALID",
  );
});

test("SSE 跨任意字节分片仍按 delta 与终态输出", async () => {
  let sentBody = "";
  const model = gateway(async (_input, init) => {
    sentBody = String(init?.body);
    return streamResponse([
      'data: {"choices":[{"delta":{"content":"甲"}}]}\r\n\r\n',
      'data: {"choices":[{"delta":{"content":"乙"},"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ], [1, 2, 5, 11, 3, 29]);
  });
  assert.deepEqual(await collect(model), [
    { type: "chunk", value: "甲" },
    { type: "chunk", value: "乙" },
    { type: "completed", value: "stop" },
  ]);
  const body = JSON.parse(sentBody) as { stream: boolean; messages: Array<Record<string, unknown>> };
  assert.equal(body.stream, true);
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
});

test("调用方取消时返回 AbortError，不产生完成终态", async () => {
  const model = gateway(async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  }));
  const controller = new AbortController();
  const iterator = model.stream(REQUEST, controller.signal)[Symbol.asyncIterator]();
  const pending = iterator.next();
  controller.abort();
  await assert.rejects(pending, (error: unknown) => (
    error instanceof DOMException && error.name === "AbortError"
  ));
});

test("鉴权失败被归一为稳定错误码", async () => {
  const model = gateway(async () => new Response("", { status: 401 }));
  await assert.rejects(
    collect(model),
    (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_AUTH_FAILED",
  );
});

test("长度截断即使已有正文也拒绝完成", async () => {
  const model = gateway(async () => streamResponse([
    'data: {"choices":[{"delta":{"content":"残缺"},"finish_reason":"length"}]}\n\n',
    "data: [DONE]\n\n",
  ], [13]));
  const iterator = model.stream(REQUEST, new AbortController().signal)[Symbol.asyncIterator]();
  assert.deepEqual(await iterator.next(), { done: false, value: { type: "chunk", delta: "残缺" } });
  await assert.rejects(
    iterator.next(),
    (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_OUTPUT_TRUNCATED",
  );
});

test("连接无终态结束时拒绝把草稿当完成结果", async () => {
  const model = gateway(async () => streamResponse([
    'data: {"choices":[{"delta":{"content":"仅草稿"}}]}\n\n',
  ], [7]));
  await assert.rejects(
    collect(model),
    (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_STREAM_INCOMPLETE",
  );
});
