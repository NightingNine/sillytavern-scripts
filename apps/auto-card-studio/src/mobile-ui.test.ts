import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("移动端交互控件禁用 WebView 默认蓝色点击高亮", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /button[\s\S]*summary[\s\S]*-webkit-tap-highlight-color:\s*transparent/,
  );
});

test("顶部通知使用 1000ms 自动消失计时器", async () => {
  const module = await import("./notice-timer.ts").catch(() => ({
    AutoDismissTimer: undefined,
  }));

  assert.equal(typeof module.AutoDismissTimer, "function");

  let scheduledDelay = 0;
  let scheduledCallback: (() => void) | null = null;
  let elapsed = 0;
  const timer = new module.AutoDismissTimer(
    1000,
    () => { elapsed += 1; },
    (callback: () => void, delay: number) => {
      scheduledCallback = callback;
      scheduledDelay = delay;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    () => {},
  );

  timer.restart();
  assert.equal(scheduledDelay, 1000);
  assert.equal(elapsed, 0);

  assert.ok(scheduledCallback);
  (scheduledCallback as () => void)();
  assert.equal(elapsed, 1);
});

test("自动消失计时器以 WebView 要求的全局对象调用原生计时器", async () => {
  const { AutoDismissTimer } = await import("./notice-timer.ts");
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let scheduledCallback: (() => void) | null = null;

  try {
    globalThis.setTimeout = function (
      this: typeof globalThis,
      callback: (...args: unknown[]) => void,
      _delay?: number,
    ): ReturnType<typeof setTimeout> {
      assert.equal(this, globalThis);
      scheduledCallback = () => callback();
      return 1 as unknown as ReturnType<typeof setTimeout>;
    } as typeof setTimeout;
    globalThis.clearTimeout = function (
      this: typeof globalThis,
      _handle?: ReturnType<typeof setTimeout>,
    ): void {
      assert.equal(this, globalThis);
    } as typeof clearTimeout;

    const timer = new AutoDismissTimer(1000, () => {});
    timer.restart();
    assert.ok(scheduledCallback);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("检查器仅首次打开时滑入，页签切换不重复动画", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(
    stylesheet,
    /\.mobile-inspector\s*\{[^}]*animation:/,
  );
  assert.match(
    stylesheet,
    /\.mobile-inspector\.is-entering\s*\{[^}]*animation:\s*inspector-in/,
  );
});
