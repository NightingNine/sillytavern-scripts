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

test("移动端步骤标题栏不再显示阶段计数", async () => {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.doesNotMatch(
    source,
    /<p class="step-kicker">PHASE/,
  );
});

test("步骤说明按钮跟随标题，不占用右侧操作按钮区域", async () => {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /<div class="stage-title-line">[\s\S]*?<button class="stage-guide-button"[^>]*data-action="open-step-guide"[\s\S]*?<\/button>\s*<\/div>\s*<p>/,
  );
  assert.doesNotMatch(source, /<details class="stage-guide">/);
});

test("移动端长标题保持正常字距并在剩余空间内省略", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(
    stylesheet,
    /\.stage-title-line h1\s*\{[^}]*letter-spacing:\s*-/,
  );
  assert.match(
    stylesheet,
    /\.studio-view\.is-overview-collapsed \.stage-title-line h1\s*\{[^}]*min-width:\s*0;[^}]*flex:\s*1;[^}]*overflow:\s*hidden;[^}]*letter-spacing:\s*normal;[^}]*text-overflow:\s*ellipsis;/,
  );
});

test("移动端步骤标题栏图框明显缩小到 19px", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /\.stage-guide-button,\s*\.stage-icon-button\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;[^}]*font-size:\s*6px;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.requirement\s*\{[^}]*height:\s*19px;[^}]*place-items:\s*center;/,
  );
});

test("移动端必做标签使用更小的 6px 常规字重", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.requirement\s*\{[^}]*font:\s*600 6px\/1 var\(--mono\);/,
  );
  assert.doesNotMatch(
    stylesheet,
    /\.studio-view\.is-overview-collapsed \.stage-title-line \.requirement\s*\{[^}]*font:/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 420px\)[\s\S]*?\.requirement\s*\{[^}]*padding:\s*0 5px;/,
  );
});

test("移动端标题和操作控件沿同一条顶部基线对齐", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.stage-heading-copy\s*\{[^}]*align-content:\s*start;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.stage-title-line\s*\{[^}]*min-height:\s*19px;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.stage-heading-actions\s*\{[^}]*align-self:\s*start;/,
  );
});

test("移动端创作母题展开时标题栏保持 54px 高度", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.stage-heading\s*\{[^}]*min-height:\s*54px;[^}]*height:\s*54px;[^}]*padding:\s*6px 7px 6px 9px;/,
  );
  assert.doesNotMatch(
    stylesheet,
    /\.studio-view\.is-overview-collapsed \.stage-heading\s*\{/,
  );
});

test("移动端创作母题外框占满内容区宽度", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.brief-panel\s*\{[^}]*width:\s*100%;[^}]*margin:\s*0 0 7px;[^}]*border-radius:\s*0;/,
  );
});

test("移动端创作母题通过高度和位移过渡滑出", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.brief-panel\s*\{[^}]*max-height:\s*180px;[^}]*transition:[^;]*max-height[^;]*transform/,
  );
  assert.match(
    stylesheet,
    /\.studio-view\.is-overview-collapsed \.brief-panel\s*\{[^}]*max-height:\s*2px;[^}]*transform:\s*translateY\(-7px\);/,
  );
  assert.doesNotMatch(
    stylesheet,
    /\.studio-view\.is-overview-collapsed \.brief-panel > \*\s*\{[^}]*display:\s*none/,
  );
});

test("步骤说明使用原脚本的模态标题和四张说明卡片", async () => {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(source, /class="step-guide-overlay"/);
  assert.match(source, /class="step-guide-dialog" role="dialog" aria-modal="true"/);
  assert.match(source, /data-step-guide-close/);
  for (const heading of ["完成建议", "建议怎么做", "本步最终产物", "教程提醒"]) {
    assert.match(source, new RegExp(`<span>${heading}</span>`));
  }
});

test("步骤说明可通过关闭按钮、遮罩、Escape 和 Android 返回关闭", async () => {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");

  assert.match(source, /querySelectorAll\("\[data-step-guide-close\]"\)/);
  assert.match(source, /event\.target === overlay/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /window\.history\.pushState/);
  assert.match(source, /window\.addEventListener\("popstate"/);
});

test("步骤说明完整复用原脚本的 29 步教程数据", async () => {
  const source = await readFile(new URL("./step-tutorial-notes.ts", import.meta.url), "utf8").catch(() => "");

  assert.match(source, /export const STEP_TUTORIAL_NOTES/);
  assert.equal(source.match(/^\s{2}\["/gm)?.length, 29);
  assert.match(source, /"体验锚定"/);
  assert.match(source, /"启动场景"/);
});

test("步骤说明复用原脚本弹层样式并在移动端保持关闭按钮可见", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /\.step-guide-overlay\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*display:\s*grid;[^}]*background:\s*rgba\(18,\s*16,\s*14,\s*0\.76\);[^}]*backdrop-filter:\s*blur\(10px\);/,
  );
  assert.match(
    stylesheet,
    /\.step-guide-dialog\s*\{[^}]*width:\s*min\(720px,\s*94vw\);[^}]*max-height:\s*min\(780px,\s*90vh\);[^}]*overflow:\s*auto;[^}]*border-radius:\s*18px;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.step-guide-overlay\s*\{[^}]*display:\s*block;[^}]*padding:\s*0;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.step-guide-dialog\s*\{[^}]*width:\s*100%;[^}]*height:\s*100dvh;[^}]*max-height:\s*none;[^}]*border:\s*0;[^}]*border-radius:\s*0;/,
  );
  assert.match(
    stylesheet,
    /@media \(max-width: 760px\)[\s\S]*?\.step-guide-head\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/,
  );
});
