import { parseInventory } from "/lib/model.js";
import { scanMcpConfig } from "/lib/mcp.js";
import { evaluate, inventoryMarkdown, mcpMarkdown } from "/lib/report.js";
import { agentRisk } from "/lib/agentrisk.js";

const $ = (id) => document.getElementById(id);
function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function table(headers, rows, classes = []) {
  const t = document.createElement("table");
  const h = document.createElement("tr");
  headers.forEach((x) => h.append(el("th", x)));
  t.append(h);
  rows.forEach((r) => { const tr = document.createElement("tr"); r.forEach((c, i) => tr.append(el("td", String(c), classes[i] ? classes[i](c) : undefined))); t.append(tr); });
  return t;
}
function cards(items) {
  const box = el("div", undefined, "cards");
  for (const [label, value, cls] of items) { const c = el("div", undefined, `card ${cls ?? ""}`); c.append(el("b", String(value)), el("span", label)); box.append(c); }
  return box;
}
function panel(title, ...kids) { const p = el("div", undefined, "panel"); p.append(el("h2", title), ...kids); return p; }
function copyButton(getMd) {
  const b = el("button", "Copy markdown");
  b.type = "button";
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(getMd()); b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy markdown"; }, 1500); } catch { /* clipboard blocked */ } });
  return b;
}
function downloadButton(getMd, name) {
  const b = el("button", "Download .md");
  b.type = "button";
  b.addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([getMd()], { type: "text/markdown" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); });
  return b;
}
async function sample(name) { return (await fetch(`/examples/${name}`)).text(); }
function showError(box, e) { box.replaceChildren(el("p", String(e.message ?? e), "err")); }
function setupTabs() {
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".tab").forEach((s) => { s.hidden = s.id !== `p-${b.dataset.tab}`; });
  }));
}
const cls = (map) => (v) => map[v] ?? "";


const TIER = { prohibited: "s-high", "high-risk": "s-medium", transparency: "", minimal: "s-low" };
const LEVEL = { high: "s-high", medium: "s-medium", low: "s-low" };

function runInv() {
  const out = $("inv-out");
  out.replaceChildren();
  const t = $("inv-text").value.trim();
  if (!t) return;
  try {
    const inv = parseInventory(t);
    const rows = evaluate(inv);
    const md = inventoryMarkdown(inv, rows);
    const n = (tier) => rows.filter((r) => r.c.tier === tier).length;
    out.append(cards([["Prohibited", n("prohibited"), n("prohibited") ? "bad" : "ok"], ["High-risk", n("high-risk"), n("high-risk") ? "warn" : "ok"], ["Transparency duties", n("transparency")], ["High agent risk", rows.filter((r) => r.risk.level === "high").length, rows.some((r) => r.risk.level === "high") ? "bad" : "ok"]]));
    out.append(panel("Systems", table(["System", "Owner", "Tier", "Agent risk", "Open points"], rows.map((r) => [r.c.system.name, r.c.system.owner || "none", r.c.tier, `${r.risk.level} (${r.risk.score})`, r.c.unknown.join("; ") || "-"]), [null, null, cls(TIER), (v) => LEVEL[String(v).split(" ")[0]] ?? ""])));
    for (const r of rows.filter((x) => x.c.tier !== "minimal" || x.risk.level !== "low")) {
      out.append(panel(`${r.c.system.name}: ${r.c.tier}`,
        ...r.c.reasons.map((x) => el("p", x)), ...r.c.obligations.map((x) => el("p", `• ${x}`, "hint")),
        ...(r.risk.advice.length ? [el("p", `Reduce the risk: ${r.risk.advice.join(" ")}`)] : [])));
    }
    const row = el("div", undefined, "row");
    row.append(copyButton(() => md), downloadButton(() => md, "ai-inventory.md"));
    out.append(row);
  } catch (e) { showError(out, e); }
}

function runMcp() {
  const out = $("mcp-out");
  out.replaceChildren();
  const t = $("mcp-text").value.trim();
  if (!t) return;
  try {
    const scan = scanMcpConfig(t);
    const md = mcpMarkdown(scan);
    const risk = agentRisk(scan.system);
    const hi = scan.findings.filter((f) => f.severity === "high").length;
    out.append(cards([["Servers", scan.servers.length], ["High findings", hi, hi ? "bad" : "ok"], ["All findings", scan.findings.length, scan.findings.length ? "warn" : "ok"], ["Agent risk", `${risk.level} (${risk.score})`, risk.level === "high" ? "bad" : risk.level === "medium" ? "warn" : "ok"]]));
    out.append(panel("Findings", scan.findings.length ? table(["Severity", "Server", "Finding"], scan.findings.map((f) => [f.severity, f.server, f.text]), [cls(LEVEL)]) : el("p", "No findings."), ...risk.advice.map((a) => el("p", `• ${a}`, "hint"))));
    const row = el("div", undefined, "row");
    row.append(copyButton(() => md), downloadButton(() => md, "mcp-review.md"));
    out.append(row);
  } catch (e) { showError(out, e); }
}

setupTabs();
$("inv-sample").addEventListener("click", async () => { $("inv-text").value = await sample("inventory.json"); runInv(); });
$("mcp-sample").addEventListener("click", async () => { $("mcp-text").value = await sample("mcp-config.json"); runMcp(); });
$("inv-text").addEventListener("input", runInv);
$("mcp-text").addEventListener("input", runMcp);
