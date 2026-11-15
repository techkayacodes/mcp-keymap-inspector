#!/usr/bin/env node
/**
 * mcp-keymap-inspector
 * Keybinding conflict auditor and Model Context Protocol (MCP) stdio server
 * for inspecting VS Code, Cursor, and Windsurf keybindings.json files.
 */

import readline from "node:readline";
import { fileURLToPath } from "node:url";

export const MCP_TOOL_DEFINITION = {
  name: "audit_keybindings",
  description:
    "Audits a list of VS Code, Cursor, or Windsurf keybinding entries for duplicate key collisions and chord shadowing.",
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

/**
 * Handles a single JSON-RPC 2.0 MCP request message and returns the response object (or null for notifications).
 * @param {object} msg
 */
export function handleMcpRequest(msg) {
  if (!msg || typeof msg !== "object") return null;
  const { id, method, params } = msg;

  // Notifications do not have an id and do not expect a response
  if (id === undefined || id === null) {
    return null;
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: (params && params.protocolVersion) || "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "mcp-keymap-inspector",
          version: "1.0.0"
        }
      }
    };
  }

  if (method === "ping") {
    return {
      jsonrpc: "2.0",
      id,
      result: {}
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [MCP_TOOL_DEFINITION]
      }
    };
  }

  if (method === "tools/call") {
    const toolName = params && params.name;
    const args = (params && params.arguments) || {};
    if (toolName !== "audit_keybindings") {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32602,
          message: `Unknown tool: ${toolName}`
        }
      };
    }
    const report = auditKeybindings(Array.isArray(args.bindings) ? args.bindings : []);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2)
          }
        ]
      }
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  };
}

export function startStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      const res = handleMcpRequest(msg);
      if (res) {
        process.stdout.write(JSON.stringify(res) + "\n");
      }
    } catch {
      // Ignore malformed lines
    }
  });
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isMain) {
  startStdioServer();
}
