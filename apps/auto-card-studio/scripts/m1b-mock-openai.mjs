import { createServer } from "node:http";

const port = Number(process.argv[2] || 18_765);
const expectedAuthorization = "Bearer m1b-demo-key";
const evidence = [];

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 2_000_000) {
        reject(new Error("request too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function streamChunks(response, chunks, delayMs) {
  response.writeHead(200, {
    "cache-control": "no-cache",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
  });
  let index = 0;
  const timer = setInterval(() => {
    if (response.destroyed || index >= chunks.length) {
      clearInterval(timer);
      if (!response.destroyed) {
        response.write('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n');
        response.end("data: [DONE]\n\n");
      }
      return;
    }
    response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[index] } }] })}\n\n`);
    index += 1;
  }, delayMs);
}

const server = createServer(async (request, response) => {
  if (request.headers.authorization !== expectedAuthorization) {
    json(response, 401, { error: { code: "invalid_api_key" } });
    return;
  }
  if (request.method === "GET" && request.url === "/__evidence") {
    json(response, 200, { events: evidence });
    return;
  }
  if (request.method === "GET" && request.url === "/v1/models") {
    const event = { type: "models", status: 200, at: new Date().toISOString() };
    evidence.push(event);
    console.log(JSON.stringify(event));
    json(response, 200, { object: "list", data: [{ id: "m1b-mock-model", object: "model" }] });
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    json(response, 404, { error: { code: "not_found" } });
    return;
  }
  try {
    const body = await readJson(request);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const promptCharacters = messages.reduce(
      (total, message) => total + String(message?.content ?? "").length,
      0,
    );
    const event = {
      type: "chat",
      status: 200,
      at: new Date().toISOString(),
      model: body.model,
      stream: body.stream === true,
      messageCount: messages.length,
      promptCharacters,
      hasStepPrompt: messages.some((message) => (
        String(message?.content ?? "").includes("WORLD_interaction_paradigm")
        && String(message?.content ?? "").includes("WORLD_aesthetic_program")
      )),
      hasProjectContext: messages.some((message) => (
        String(message?.content ?? "").includes("<STUDIO_PROJECT_CONTEXT>")
      )),
    };
    evidence.push(event);
    console.log(JSON.stringify(event));
    if (body.model !== "m1b-mock-model" || body.stream !== true) {
      json(response, 400, { error: { code: "invalid_request" } });
      return;
    }
    const output = [
      "<WORLD_interaction_paradigm>\n",
      "# 模拟供应商验收\n",
      "玩家保留关键选择权；AI 只推进世界、NPC 与可观察后果，不代写玩家未表达的内心结论。\n",
      "</WORLD_interaction_paradigm>\n\n",
      "<WORLD_aesthetic_program>\n",
      "# 模拟供应商验收\n",
      "以具体行动、环境变化和关系反馈呈现边境调查的未知感；每次推进都能回指已确认的母题。\n",
      "</WORLD_aesthetic_program>",
    ];
    // 留出足够时间在模拟器上人工触发 Abort，完成后仍会给出合法终态。
    streamChunks(response, output, 5_000);
  } catch {
    json(response, 400, { error: { code: "invalid_json" } });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ event: "listening", port }));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
