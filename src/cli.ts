#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { InventoryError, parseInventory } from "./model.js";
import { McpError, scanMcpConfig } from "./mcp.js";
import { evaluate, inventoryMarkdown, mcpMarkdown } from "./report.js";

const USAGE = `agent-inventory

  agent-inventory inventory <inventory.json> [--fail-on-prohibited] [--fail-on-high-agent-risk]
  agent-inventory mcp <mcp-config.json> [--fail-on high|medium]

Exit codes: 0 ok, 1 gate failed, 2 bad input.`;

function main(argv: string[]): number {
  const [cmd, file, ...rest] = argv;
  if (!file) { console.error(USAGE); return 2; }
  try {
    const text = readFileSync(file, "utf8");
    if (cmd === "inventory") {
      const inv = parseInventory(text);
      const rows = evaluate(inv);
      process.stdout.write(inventoryMarkdown(inv, rows));
      if (rest.includes("--fail-on-prohibited") && rows.some((r) => r.c.tier === "prohibited")) return 1;
      if (rest.includes("--fail-on-high-agent-risk") && rows.some((r) => r.risk.level === "high")) return 1;
      return 0;
    }
    if (cmd === "mcp") {
      const scan = scanMcpConfig(text);
      process.stdout.write(mcpMarkdown(scan));
      const i = rest.indexOf("--fail-on");
      const lvl = i >= 0 ? rest[i + 1] : undefined;
      if (lvl === "high" && scan.findings.some((f) => f.severity === "high")) return 1;
      if (lvl === "medium" && scan.findings.some((f) => f.severity !== "low")) return 1;
      return 0;
    }
    console.error(USAGE);
    return 2;
  } catch (e) {
    if (e instanceof InventoryError || e instanceof McpError) { console.error(`error: ${e.message}`); return 2; }
    if ((e as NodeJS.ErrnoException).code === "ENOENT") { console.error(`error: cannot read ${(e as NodeJS.ErrnoException).path}`); return 2; }
    throw e;
  }
}

process.exitCode = main(process.argv.slice(2));
