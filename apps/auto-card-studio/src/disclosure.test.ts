import assert from "node:assert/strict";
import test from "node:test";
import { DisclosureState } from "./disclosure.ts";

test("折叠状态按分组独立切换并保留默认展开项", () => {
  const state = new DisclosureState(["concept", "entity"]);

  assert.equal(state.isOpen("concept"), true);
  assert.equal(state.isOpen("entity"), true);
  assert.equal(state.isOpen("writing"), false);

  assert.equal(state.toggle("entity"), false);
  assert.equal(state.isOpen("concept"), true);
  assert.equal(state.isOpen("entity"), false);

  state.setOpen("writing", true);
  assert.equal(state.isOpen("writing"), true);
});
