import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agentRisk } from "../src/agentrisk.js";
import { classify } from "../src/classify.js";
import { InventoryError, parseInventory } from "../src/model.js";
import { McpError, scanMcpConfig } from "../src/mcp.js";
import { evaluate, inventoryMarkdown, mcpMarkdown } from "../src/report.js";

const ex = (n: string): string => readFileSync(new URL(`../../examples/${n}`, import.meta.url), "utf8");
const inv = () => parseInventory(ex("inventory.json"));
const sys = (id: string) => inv().systems.find((s) => s.id === id)!;

test("emotion recognition at work is prohibited and wins over high-risk", () => {
  const c = classify(sys("mood-monitor"));
  assert.equal(c.tier, "prohibited");
  assert.match(c.reasons[0]!, /Art\. 5\(1\)\(f\)/);
  assert.ok(c.unknown.length === 0 || c.unknown.includes("no accountable owner") === false);
});

test("employment screening is high-risk with deployer duties and the Annex III date", () => {
  const c = classify(sys("cv-screener"));
  assert.equal(c.tier, "high-risk");
  assert.ok(c.obligations.some((o) => /^Deployer:/.test(o)));
  assert.ok(!c.obligations.some((o) => /^Provider:/.test(o)));
  assert.ok(c.dates.some((d) => d.includes("2027-12-02")));
});

test("a system that is both provider and deployer gets both sets", () => {
  const c = classify(sys("credit-score"));
  assert.ok(c.obligations.some((o) => /^Provider:/.test(o)) && c.obligations.some((o) => /^Deployer:/.test(o)));
});

test("Art. 6(3) exemption is ignored when the system profiles people", () => {
  const s = sys("cv-screener");
  s.exemptionClaimed = true;
  assert.ok(classify(s).reasons.some((r) => /profiles natural persons/.test(r)));
  s.profiling = false;
  assert.ok(classify(s).obligations.some((o) => /Art\. 6\(3\) assessment/.test(o)));
});

test("chatbots and generators get transparency duties, spam filters stay minimal", () => {
  assert.equal(classify(sys("support-bot")).tier, "transparency");
  assert.ok(classify(sys("support-bot")).obligations.some((o) => /Art\. 50\(1\)/.test(o)));
  const mk = classify(sys("marketing-gen"));
  assert.ok(mk.obligations.some((o) => /Art\. 50\(4\)/.test(o)));
  assert.equal(classify(sys("spam-filter")).tier, "minimal");
});

test("open points: missing owner and high-risk without logging", () => {
  assert.ok(classify(sys("devops-agent")).unknown.includes("no accountable owner"));
  const s = sys("credit-score");
  s.logging = false;
  assert.ok(classify(s).unknown.includes("high-risk system without logging"));
  const bad = parseInventory('{"systems":[{"name":"x","areas":["nope"],"practices":["zzz"]}]}');
  assert.equal(classify(bad.systems[0]!).unknown.length, 3);
});

test("agent risk: autonomous shell agent without approval or owner is high, a filter is low", () => {
  const r = agentRisk(sys("devops-agent"));
  assert.equal(r.level, "high");
  assert.ok(r.drivers.some((d) => /without human approval/.test(d)));
  assert.ok(r.advice.some((a) => /approval/.test(a)));
  assert.equal(agentRisk(sys("spam-filter")).level, "low");
  assert.equal(agentRisk(sys("support-bot")).level, "medium");
});

test("inventory validation", () => {
  assert.throws(() => parseInventory("x"), InventoryError);
  assert.throws(() => parseInventory("{}"), /systems/);
  assert.throws(() => parseInventory('{"systems":[{}]}'), /name/);
  assert.throws(() => parseInventory('{"systems":[{"name":"a"},{"name":"a"}]}'), /duplicate/);
  assert.throws(() => parseInventory('{"systems":[{"name":"a","autonomy":"wild"}]}'), /autonomy/);
  assert.throws(() => parseInventory('{"systems":[{"name":"a","tools":[{"name":"t","access":"root"}]}]}'), /access/);
});

test("evaluation sorts prohibited first and the report names the counts", () => {
  const i = inv();
  const rows = evaluate(i);
  assert.equal(rows[0]!.c.tier, "prohibited");
  const md = inventoryMarkdown(i, rows);
  assert.match(md, /7 systems: \*\*1 prohibited\*\*, \*\*2 high-risk\*\*, 2 with transparency duties, 2 minimal/);
});

test("MCP scan finds the planted problems and redacts secrets", () => {
  const scan = scanMcpConfig(ex("mcp-config.json"));
  const key = scan.findings.map((f) => `${f.server}:${f.id}`);
  for (const k of ["github:inline-secret", "filesystem:unpinned", "remote-crm:plain-http", "remote-crm:secret-in-url", "shell:exec-capability", "shell:unpinned", "postgres:unpinned-image"]) assert.ok(key.includes(k), k);
  assert.ok(!key.includes("docs:inline-secret"));
  const md = mcpMarkdown(scan);
  assert.ok(!md.includes("ghp_demo1234567890"));
  assert.match(md, /ghp\*\*\*/);
  assert.equal(scan.findings[0]!.severity, "high");
});

test("MCP scan: pinned package, root filesystem, docker socket, localhost http", () => {
  const scan = scanMcpConfig(JSON.stringify({ mcpServers: {
    pinned: { command: "npx", args: ["pkg@1.2.3"] },
    latest: { command: "npx", args: ["pkg@latest"] },
    fsroot: { command: "npx", args: ["server-filesystem@1.0.0", "/"] },
    sock: { command: "docker", args: ["run", "--privileged", "-v", "/var/run/docker.sock:/var/run/docker.sock", "img:1.0"] },
    local: { url: "http://localhost:3000/mcp" },
  } }));
  const key = scan.findings.map((f) => `${f.server}:${f.id}`);
  assert.ok(!key.includes("pinned:unpinned"));
  assert.ok(key.includes("latest:unpinned"));
  assert.ok(key.includes("fsroot:fs-root"));
  assert.ok(key.includes("sock:privileged") && key.includes("sock:docker-socket"));
  assert.ok(!key.some((k) => k.startsWith("local:")));
});

test("MCP scan accepts the VS Code style 'servers' key and rejects other shapes", () => {
  assert.equal(scanMcpConfig('{"servers":{"a":{"command":"node","args":["x.js"]}}}').servers.length, 1);
  assert.throws(() => scanMcpConfig("nope"), McpError);
  assert.throws(() => scanMcpConfig("{}"), /mcpServers/);
});

test("discovered tool access is inferred from server names", () => {
  const scan = scanMcpConfig(ex("mcp-config.json"));
  const acc = new Set(scan.system.tools.map((t) => t.access));
  assert.ok(acc.has("exec") && acc.has("write") && acc.has("network") && acc.has("read"));
  assert.equal(agentRisk(scan.system).level, "high");
});
