import test from "node:test";
import assert from "node:assert/strict";
import { auditKeybindings, MCP_TOOL_DEFINITION } from "./index.js";

test("MCP_TOOL_DEFINITION exposes valid tool schema", () => {
  assert.equal(MCP_TOOL_DEFINITION.name, "audit_keybindings");
});

test("auditKeybindings detects duplicate bindings and chord shadowing", () => {
  const report = auditKeybindings([
    { key: "ctrl+k", command: "workbench.action.clear", when: "editorTextFocus" },
    { key: "ctrl+k", command: "cursor.inlineEdit", when: "editorTextFocus" },
    { key: "ctrl+k ctrl+s", command: "workbench.action.openGlobalKeybindings", when: "editorTextFocus" }
  ]);
  assert.equal(report.conflictCount, 2);
  assert.equal(report.conflicts[0].type, "duplicate-binding");
  assert.equal(report.conflicts[1].type, "chord-shadowing");
});
