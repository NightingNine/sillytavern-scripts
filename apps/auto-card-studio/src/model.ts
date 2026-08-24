import type {
  ConnectionTestResult,
  ModelGateway,
  ModelRequest,
  ModelSettings,
  ModelStreamEvent,
  SecretStore,
} from "./ports.ts";
import type { AutoWorkflowSampling } from "./profile.ts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ModelGatewayErrorCode =
  | "MODEL_CONFIG_INVALID"
  | "MODEL_SECRET_LOCKED"
  | "MODEL_AUTH_FAILED"
  | "MODEL_RATE_LIMITED"
  | "MODEL_HTTP_FAILED"
  | "MODEL_TIMEOUT"
  | "MODEL_STREAM_INVALID"
  | "MODEL_STREAM_INCOMPLETE"
  | "MODEL_OUTPUT_TRUNCATED";

export class ModelGatewayError extends Error {
  readonly code: ModelGatewayErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(
    code: ModelGatewayErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ModelGatewayError";
    this.code = code;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export interface OpenAICompatibleGatewayOptions {
  settings: () => ModelSettings;
  secretStore: SecretStore;
  sampling: AutoWorkflowSampling;
  fetcher: FetchLike;
  now?: () => number;
}

function normalizedBaseUrl(value: string): URL {
  const source = value.trim().replace(/\/+$/, "");
  if (!source) {
    throw new ModelGatewayError("MODEL_CONFIG_INVALID", "请填写 API Base URL。");
  }
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new ModelGatewayError("MODEL_CONFIG_INVALID", "API Base URL 不是有效网址。");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ModelGatewayError("MODEL_CONFIG_INVALID", "API Base URL 只支持 http 或 https。");
  }
  if (/\/chat\/completions$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/chat\/completions$/i, "");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

export function modelEndpoint(baseUrl: string, resource: "chat/completions" | "models"): string {
  const base = normalizedBaseUrl(baseUrl);
  base.pathname = `${base.pathname}/${resource}`.replace(/\/{2,}/g, "/");
  return base.toString();
}

function httpFailure(status: number): ModelGatewayError {
  if (status === 401 || status === 403) {
    return new ModelGatewayError(
      "MODEL_AUTH_FAILED",
      `模型服务拒绝了凭据（HTTP ${status}）。请检查 API Key。`,
      { status },
    );
  }
  if (status === 429) {
    return new ModelGatewayError(
      "MODEL_RATE_LIMITED",
      "模型服务当前限流（HTTP 429），请稍后重试。",
      { status, retryable: true },
    );
  }
  return new ModelGatewayError(
    "MODEL_HTTP_FAILED",
    `模型服务请求失败（HTTP ${status}）。`,
    { status, retryable: status >= 500 },
  );
}

function requireSettings(settings: ModelSettings): void {
  normalizedBaseUrl(settings.baseUrl);
  if (!settings.model.trim()) {
    throw new ModelGatewayError("MODEL_CONFIG_INVALID", "请填写模型名称。");
  }
  if (!Number.isFinite(settings.timeoutMs) || settings.timeoutMs < 5_000) {
    throw new ModelGatewayError("MODEL_CONFIG_INVALID", "请求超时至少需要 5 秒。");
  }
}

function timeoutController(signal: AbortSignal, timeoutMs: number): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  dispose: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const cancelFromCaller = () => controller.abort(signal.reason);
  if (signal.aborted) cancelFromCaller();
  else signal.addEventListener("abort", cancelFromCaller, { once: true });
  const timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      globalThis.clearTimeout(timer);
      signal.removeEventListener("abort", cancelFromCaller);
    },
  };
}

function abortError(): DOMException {
  return new DOMException("Request canceled", "AbortError");
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (cause) {
    throw new ModelGatewayError(
      "MODEL_STREAM_INVALID",
      "模型返回了无法解析的流式数据；本轮未保存。",
      { cause },
    );
  }
}

function sseBoundary(buffer: string): { index: number; length: number } | null {
  const match = /\r?\n\r?\n/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

function sseData(block: string): string | null {
  const values = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  return values.length ? values.join("\n") : null;
}

interface ChatCompletionChoice {
  delta?: { content?: unknown };
  message?: { content?: unknown };
  finish_reason?: unknown;
}

function completionChoice(value: unknown): ChatCompletionChoice | null {
  if (!value || typeof value !== "object") return null;
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length || !choices[0] || typeof choices[0] !== "object") {
    return null;
  }
  return choices[0] as ChatCompletionChoice;
}

export class OpenAICompatibleGateway implements ModelGateway {
  readonly id = "openai-compatible";
  readonly label = "OpenAI-compatible · SSE";
  private readonly settings: () => ModelSettings;
  private readonly secretStore: SecretStore;
  private readonly sampling: AutoWorkflowSampling;
  private readonly fetcher: FetchLike;
  private readonly now: () => number;

  constructor(options: OpenAICompatibleGatewayOptions) {
    this.settings = options.settings;
    this.secretStore = options.secretStore;
    this.sampling = options.sampling;
    this.fetcher = options.fetcher;
    this.now = options.now ?? (() => performance.now());
  }

  private async apiKey(): Promise<string> {
    const apiKey = await this.secretStore.readApiKey();
    if (!apiKey) {
      throw new ModelGatewayError(
        "MODEL_SECRET_LOCKED",
        "密钥仓尚未解锁，或还没有保存 API Key。",
      );
    }
    return apiKey;
  }

  async testConnection(settings = this.settings()): Promise<ConnectionTestResult> {
    requireSettings(settings);
    const apiKey = await this.apiKey();
    const startedAt = this.now();
    const deadline = timeoutController(new AbortController().signal, settings.timeoutMs);
    try {
      const endpoint = modelEndpoint(settings.baseUrl, "models");
      const response = await this.fetcher(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: deadline.signal,
      });
      if (!response.ok) throw httpFailure(response.status);
      let modelCount: number | null = null;
      try {
        const payload = await response.json() as { data?: unknown };
        if (Array.isArray(payload.data)) modelCount = payload.data.length;
      } catch {
        // 有些兼容服务只返回空成功响应；连接仍然成立。
      }
      return {
        endpoint: new URL(endpoint).origin,
        modelCount,
        elapsedMs: Math.max(0, Math.round(this.now() - startedAt)),
      };
    } catch (error) {
      if (error instanceof ModelGatewayError) throw error;
      if (deadline.didTimeout()) {
        throw new ModelGatewayError("MODEL_TIMEOUT", "连接测试超时。", { retryable: true });
      }
      throw error;
    } finally {
      deadline.dispose();
    }
  }

  async *stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const settings = this.settings();
    requireSettings(settings);
    const apiKey = await this.apiKey();
    if (signal.aborted) throw abortError();

    const deadline = timeoutController(signal, settings.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(modelEndpoint(settings.baseUrl, "chat/completions"), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.model.trim(),
          messages: request.messages.map(({ role, content }) => ({ role, content })),
          stream: true,
          temperature: this.sampling.temperature,
          top_p: this.sampling.topP,
          frequency_penalty: this.sampling.frequencyPenalty,
          presence_penalty: this.sampling.presencePenalty,
          max_tokens: this.sampling.maxTokens,
        }),
        signal: deadline.signal,
      });
      if (!response.ok) throw httpFailure(response.status);

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/event-stream")) {
        const choice = completionChoice(await response.json());
        const content = choice?.message?.content;
        if (typeof content !== "string" || !content) {
          throw new ModelGatewayError(
            "MODEL_STREAM_INVALID",
            "模型没有返回可识别的正文；本轮未保存。",
          );
        }
        const finishReason = typeof choice?.finish_reason === "string"
          ? choice.finish_reason
          : "stop";
        if (finishReason === "length" || finishReason === "max_tokens") {
          throw new ModelGatewayError(
            "MODEL_OUTPUT_TRUNCATED",
            "模型输出达到长度上限；为避免保存残缺产物，本轮未保存。",
          );
        }
        yield { type: "chunk", delta: content };
        yield { type: "completed", finishReason };
        return;
      }

      if (!response.body) {
        throw new ModelGatewayError("MODEL_STREAM_INVALID", "模型流没有响应正文。");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finishReason = "";
      let sawDone = false;
      let receivedCharacters = 0;

      const consumeBlock = (block: string): string | null => {
        const data = sseData(block);
        if (data === null) return null;
        if (data.trim() === "[DONE]") {
          sawDone = true;
          return null;
        }
        const payload = parseJson(data);
        const choice = completionChoice(payload);
        if (!choice) return null;
        if (typeof choice.finish_reason === "string") finishReason = choice.finish_reason;
        const delta = choice.delta?.content;
        if (typeof delta === "string" && delta) {
          receivedCharacters += delta.length;
          return delta;
        }
        return null;
      };

      while (!sawDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = sseBoundary(buffer);
        while (boundary) {
          const block = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary.length);
          const delta = consumeBlock(block);
          if (delta) yield { type: "chunk", delta };
          if (sawDone) break;
          boundary = sseBoundary(buffer);
        }
      }
      buffer += decoder.decode();
      if (!sawDone && buffer.trim()) {
        const delta = consumeBlock(buffer);
        if (delta) yield { type: "chunk", delta };
      }
      if (!receivedCharacters) {
        throw new ModelGatewayError("MODEL_STREAM_INVALID", "模型流完成，但没有正文。");
      }
      if (finishReason === "length" || finishReason === "max_tokens") {
        throw new ModelGatewayError(
          "MODEL_OUTPUT_TRUNCATED",
          "模型输出达到长度上限；为避免保存残缺产物，本轮未保存。",
        );
      }
      if (!sawDone && !finishReason) {
        throw new ModelGatewayError(
          "MODEL_STREAM_INCOMPLETE",
          "模型连接在完成信号前结束；本轮未保存。",
          { retryable: true },
        );
      }
      yield { type: "completed", finishReason: finishReason || "stop" };
    } catch (error) {
      if (error instanceof ModelGatewayError) throw error;
      if (signal.aborted) throw abortError();
      if (deadline.didTimeout()) {
        throw new ModelGatewayError(
          "MODEL_TIMEOUT",
          "模型请求超时；已经收到的草稿未保存。",
          { retryable: true },
        );
      }
      throw error;
    } finally {
      deadline.dispose();
    }
  }
}

export class ModelGatewayRouter implements ModelGateway {
  private readonly settings: () => ModelSettings;
  private readonly stub: ModelGateway;
  readonly compatible: OpenAICompatibleGateway;

  constructor(options: {
    settings: () => ModelSettings;
    stub: ModelGateway;
    compatible: OpenAICompatibleGateway;
  }) {
    this.settings = options.settings;
    this.stub = options.stub;
    this.compatible = options.compatible;
  }

  get id(): string {
    return this.settings().mode === "openai-compatible" ? this.compatible.id : this.stub.id;
  }

  get label(): string {
    return this.settings().mode === "openai-compatible" ? this.compatible.label : this.stub.label;
  }

  stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelStreamEvent> {
    return this.settings().mode === "openai-compatible"
      ? this.compatible.stream(request, signal)
      : this.stub.stream(request, signal);
  }
}
