# mcp-keymap-inspector 🔍⌨️

[![techkayacodes/mcp-keymap-inspector MCP server](https://glama.ai/mcp/servers/techkayacodes/mcp-keymap-inspector/badges/score.svg)](https://glama.ai/mcp/servers/techkayacodes/mcp-keymap-inspector)

Keybinding conflict auditor and **Model Context Protocol (MCP)** stdio server for inspecting VS Code, Cursor, and Windsurf `keybindings.json` files.

Detects duplicate key collisions in identical `when` contexts as well as single-chord bindings that shadow two-step key chords (e.g. `ctrl+k` shadowing `ctrl+k ctrl+s`).

## 🚀 Programmatic Usage

```js
import { auditKeybindings } from "mcp-keymap-inspector";

const report = auditKeybindings([
  { key: "ctrl+k", command: "cursor.inlineEdit", when: "editorTextFocus" },
  { key: "ctrl+k ctrl+s", command: "workbench.action.openGlobalKeybindings", when: "editorTextFocus" }
]);

console.log(report.conflicts);
```

## 🔌 MCP Server Configuration

```json
{
  "mcpServers": {
    "keymap-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-keymap-inspector"]
    }
  }
}
```

## 📄 License

MIT © [Kemal Codes (@techkayacodes)](https://github.com/techkayacodes)
