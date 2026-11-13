# mcp-keymap-inspector 🔍⌨️

Keybinding conflict auditor and **Model Context Protocol (MCP)** tool helper for inspecting VS Code, Cursor, and Windsurf `keybindings.json` files.

Detects duplicate key collisions in identical `when` contexts as well as single-chord bindings that shadow two-step key chords (e.g. `ctrl+k` shadowing `ctrl+k ctrl+s`).

## 🚀 Usage

```js
import { auditKeybindings } from "mcp-keymap-inspector";

const report = auditKeybindings([
  { key: "ctrl+k", command: "cursor.inlineEdit", when: "editorTextFocus" },
  { key: "ctrl+k ctrl+s", command: "workbench.action.openGlobalKeybindings", when: "editorTextFocus" }
]);

console.log(report.conflicts);
```

## 📄 License

MIT © [Kemal Codes (@techkayacodes)](https://github.com/techkayacodes)
