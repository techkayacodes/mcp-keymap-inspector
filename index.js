/**
 * mcp-keymap-inspector
 * Keybinding conflict auditor and MCP tool definition for inspecting
 * VS Code, Cursor, and Windsurf keybindings.json files.
 */

export const MCP_TOOL_DEFINITION = {
  name: "audit_keybindings",
  description: "Audits a list of VS Code / Cursor keybinding entries for duplicate key collisions and chord shadowing.",
  inputSchema: {
    type: "object",
    properties: {
      bindings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            command: { type: "string" },
            when: { type: "string" }
          },
          required: ["key", "command"]
        }
      }
    },
    required: ["bindings"]
  }
};

export function normalizeKeyBinding(keyStr) {
  return String(keyStr || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((chord) =>
      chord
        .split("+")
        .map((p) => p.trim())
        .sort()
        .join("+")
    )
    .join(" ");
}

/**
 * Audits an array of `{ key, command, when }` bindings for exact collisions and chord shadowing.
 * @param {Array<{ key: string; command: string; when?: string }>} bindings
 */
export function auditKeybindings(bindings = []) {
  const byKeyAndWhen = new Map();
  const singleChords = new Map();
  const multiChords = [];
  const conflicts = [];

  for (const b of bindings) {
    if (!b || !b.key || !b.command || b.command.startsWith("-")) continue;
    const normKey = normalizeKeyBinding(b.key);
    const whenCtx = String(b.when || "*").trim();
    const signature = `${normKey}::${whenCtx}`;

    if (byKeyAndWhen.has(signature)) {
      const prev = byKeyAndWhen.get(signature);
      if (prev.command !== b.command) {
        conflicts.push({
          type: "duplicate-binding",
          key: b.key,
          when: whenCtx,
          commands: [prev.command, b.command]
        });
      }
    } else {
      byKeyAndWhen.set(signature, b);
    }

    const parts = normKey.split(" ");
    if (parts.length === 1) {
      singleChords.set(parts[0], b);
    } else if (parts.length > 1) {
      multiChords.push({ prefix: parts[0], full: normKey, binding: b });
    }
  }

  for (const mc of multiChords) {
    if (singleChords.has(mc.prefix)) {
      const blocker = singleChords.get(mc.prefix);
      if ((blocker.when || "*") === (mc.binding.when || "*")) {
        conflicts.push({
          type: "chord-shadowing",
          key: mc.binding.key,
          prefixKey: blocker.key,
          commands: [blocker.command, mc.binding.command]
        });
      }
    }
  }

  return {
    totalChecked: bindings.length,
    conflictCount: conflicts.length,
    conflicts
  };
}
