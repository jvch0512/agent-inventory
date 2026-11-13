import { AgentRisk, agentRisk } from "./agentrisk.js";
import { Classification, DATES, Tier, classify } from "./classify.js";
import { McpScan } from "./mcp.js";
import { Inventory } from "./model.js";

const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const TIER_ORDER: Record<Tier, number> = { prohibited: 0, "high-risk": 1, transparency: 2, minimal: 3 };

export interface Row { c: Classification; risk: AgentRisk }

export function evaluate(inv: Inventory): Row[] {
  return inv.systems.map((s) => ({ c: classify(s), risk: agentRisk(s) }))
    .sort((a, b) => TIER_ORDER[a.c.tier] - TIER_ORDER[b.c.tier] || b.risk.score - a.risk.score || a.c.system.name.localeCompare(b.c.system.name));
}

export function inventoryMarkdown(inv: Inventory, rows: Row[]): string {
  const count = (t: Tier) => rows.filter((r) => r.c.tier === t).length;
  const L = [`# AI inventory${inv.organisation ? `: ${inv.organisation}` : ""}`, ""];
  L.push(`${rows.length} systems: **${count("prohibited")} prohibited**, **${count("high-risk")} high-risk**, ${count("transparency")} with transparency duties, ${count("minimal")} minimal.`, "");
  L.push(`Key dates: prohibitions and AI literacy since ${DATES.prohibitedAndLiteracy}; general-purpose model duties since ${DATES.gpai}; transparency (Art. 50) from ${DATES.generalAndTransparency}; high-risk Annex III from ${DATES.highRiskAnnexIII}; Annex I products from ${DATES.highRiskAnnexI}.`, "");
  L.push("| System | Owner | Tier | Agent risk | Open points |", "|---|---|---|---|---|");
  for (const r of rows) L.push(`| ${cell(r.c.system.name)} | ${cell(r.c.system.owner || "none")} | ${r.c.tier} | ${r.risk.level} (${r.risk.score}) | ${cell(r.c.unknown.join("; ") || "-")} |`);
  L.push("");
  for (const r of rows.filter((x) => x.c.tier !== "minimal" || x.risk.level !== "low")) {
    L.push(`## ${r.c.system.name}`, "", `Tier: **${r.c.tier}**. Agent risk: **${r.risk.level}** (${r.risk.score}).`, "");
    if (r.c.reasons.length) { L.push("Why:", ""); for (const x of r.c.reasons) L.push(`- ${x}`); L.push(""); }
    if (r.c.obligations.length) { L.push("Obligations:", ""); for (const x of r.c.obligations) L.push(`- ${x}`); L.push(""); }
    if (r.risk.drivers.length) { L.push(`Risk drivers: ${r.risk.drivers.join(", ")}.`, ""); }
    if (r.risk.advice.length) { L.push("Reduce the risk:", ""); for (const x of r.risk.advice) L.push(`- ${x}`); L.push(""); }
  }
  L.push("_Indicative classification from the answers in the inventory. A legal assessment is still needed for borderline cases._", "");
  return L.join("\n");
}

export function mcpMarkdown(scan: McpScan): string {
  const L = [`# MCP configuration review`, "", `${scan.servers.length} servers: ${scan.servers.join(", ") || "none"}.`, ""];
  if (scan.findings.length === 0) L.push("No findings.", "");
  else {
    L.push("| Severity | Server | Finding |", "|---|---|---|");
    for (const f of scan.findings) L.push(`| ${f.severity} | ${cell(f.server)} | ${cell(f.text)} |`);
    L.push("");
  }
  const risk = agentRisk(scan.system);
  L.push(`Agent risk of this tool set: **${risk.level}** (${risk.score}).`, "");
  for (const a of risk.advice) L.push(`- ${a}`);
  if (risk.advice.length) L.push("");
  L.push("_Static review only: no server was started. Pair with a runtime test such as mcp-red-team._", "");
  return L.join("\n");
}
