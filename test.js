import test from "node:test";
import assert from "node:assert/strict";
import { auditKeybindings, handleMcpRequest, MCP_TOOL_DEFINITION } from "./index.js";

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

test("handleMcpRequest responds to initialize, tools/list, and tools/call", () => {
  const initRes = handleMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05" }
  });
  assert.equal(initRes.result.serverInfo.name, "mcp-keymap-inspector");

  const listRes = handleMcpRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  });
  assert.equal(listRes.result.tools.length, 1);
  assert.equal(listRes.result.tools[0].name, "audit_keybindings");

  const callRes = handleMcpRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "audit_keybindings",
      arguments: {
        bindings: [
          { key: "ctrl+b", command: "cmd.one", when: "editorTextFocus" },
          { key: "ctrl+b", command: "cmd.two", when: "editorTextFocus" }
        ]
      }
    }
  });
  const parsed = JSON.parse(callRes.result.content[0].text);
  assert.equal(parsed.conflictCount, 1);
});
