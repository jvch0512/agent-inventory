/** Static review of an MCP client configuration (Claude Desktop, Claude Code .mcp.json, Cursor and similar). Never starts a server. */
import { Access, AiSystem } from "./model.js";

export interface McpFinding { server: string; severity: "high" | "medium" | "low"; id: string; text: string }
export interface McpScan { servers: string[]; findings: McpFinding[]; system: AiSystem }

export class McpError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const SECRET_KEY = /(token|secret|passw(or)?d|api[_-]?key|private[_-]?key|credential|auth)/i;
const RUNNERS = new Set(["npx", "bunx", "pnpm", "yarn", "uvx", "pipx", "deno", "docker", "podman"]);

function infer(name: string, args: string[]): Access[] {
  const s = `${name} ${args.join(" ")}`.toLowerCase();
  const out = new Set<Access>();
  if (/(shell|exec|terminal|ssh|command|bash|powershell|code-runner|sandbox-run)/.test(s)) out.add("exec");
  if (/(filesystem|file-system|fs\b|files)/.test(s)) { out.add("read"); out.add("write"); }
  if (/(fetch|browser|puppeteer|playwright|http|web|search|scrape)/.test(s)) out.add("network");
  if (/(github|gitlab|git\b|jira|linear|notion|slack|email|mail|calendar|drive|salesforce|hubspot|stripe)/.test(s)) { out.add("read"); out.add("write"); }
  if (/(postgres|mysql|sqlite|mongo|redis|sql|database|db\b)/.test(s)) { out.add("read"); out.add("write"); }
  if (out.size === 0) out.add("read");
  return [...out];
}

const WITH_VALUE = new Set(["-v", "--volume", "-e", "--env", "--name", "-p", "--publish", "--network", "-w", "--workdir", "-u", "--user", "--mount", "--env-file"]);
function dockerImage(args: string[]): string {
  const run = args.indexOf("run");
  for (let i = run + 1; i < args.length; i++) {
    const a = args[i]!;
    if (WITH_VALUE.has(a)) { i++; continue; }
    if (!a.startsWith("-")) return a;
  }
  return "";
}

function pinned(spec: string): boolean {
  const at = spec.lastIndexOf("@");
  if (at <= 0) return false;
  const v = spec.slice(at + 1);
  return /^\d/.test(v) && v !== "latest";
}

export function scanMcpConfig(text: string): McpScan {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new McpError("configuration is not valid JSON"); }
  if (!isObj(raw)) throw new McpError("configuration must be a JSON object");
  const servers = isObj(raw["mcpServers"]) ? raw["mcpServers"] : isObj(raw["servers"]) ? raw["servers"] : null;
  if (!servers) throw new McpError('no "mcpServers" object found');
  const findings: McpFinding[] = [];
  const tools: AiSystem["tools"] = [];
  const names = Object.keys(servers).sort();
  for (const name of names) {
    const s = servers[name];
    if (!isObj(s)) { findings.push({ server: name, severity: "low", id: "malformed", text: "entry is not an object" }); continue; }
    const cmd = typeof s["command"] === "string" ? s["command"] : "";
    const args = Array.isArray(s["args"]) ? s["args"].filter((a): a is string => typeof a === "string") : [];
    const url = typeof s["url"] === "string" ? s["url"] : "";
    const base = cmd.split(/[\\/]/).pop() ?? "";
    const add = (severity: McpFinding["severity"], id: string, text: string) => findings.push({ server: name, severity, id, text });
    if (url) {
      if (/^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url)) add("high", "plain-http", `Remote server over plain HTTP: ${url.replace(/\/\/[^/@]*@/, "//***@").replace(/\?.*$/, "?***")}`);
      if (/[?&](token|key|api_key|apikey|secret|access_token)=/i.test(url)) add("high", "secret-in-url", "Credential in the URL query string, which ends up in logs");
    }
    if (RUNNERS.has(base)) {
      const pkg = base === "docker" || base === "podman" ? dockerImage(args) : args.find((a) => !a.startsWith("-")) ?? "";
      if (base === "docker" || base === "podman") {
        if (args.includes("--privileged")) add("high", "privileged", "Container runs with --privileged");
        if (args.some((a) => /docker\.sock/.test(a))) add("high", "docker-socket", "Container mounts the Docker socket, which is root on the host");
        if (args.some((a) => /^(-v|--volume)$/.test(a)) && args.some((a) => /^\/(:|$)|^~?\/?:/.test(a))) add("medium", "broad-mount", "Container mounts a very broad host path");
        if (pkg && !/[:@]\d/.test(pkg) && !/@sha256:/.test(pkg)) add("medium", "unpinned-image", `Image "${pkg}" is not pinned to a version or digest`);
      } else if (pkg && !pinned(pkg)) {
        add("medium", "unpinned", `Package "${pkg}" is fetched without a pinned version, so every start can run different code`);
      }
      if ((base === "npx" || base === "bunx") && args.includes("-y")) add("low", "auto-install", "-y installs and runs the package without a prompt");
    }
    if (isObj(s["env"])) {
      for (const [k, v] of Object.entries(s["env"])) {
        if (SECRET_KEY.test(k) && typeof v === "string" && v !== "" && !/^\$\{?[A-Z_a-z0-9]+\}?$/.test(v) && !/^(env:|op:\/\/|keychain:)/.test(v)) add("high", "inline-secret", `${k} holds an inline value (${v.slice(0, 3)}***). Reference an environment variable or a secret manager instead.`);
      }
    }
    const joined = `${name} ${args.join(" ")}`.toLowerCase();
    if (/(shell|terminal|ssh|bash|powershell|exec)/.test(joined)) add("high", "exec-capability", "Server exposes command execution to the model");
    if (/filesystem|file-system/.test(joined)) {
      const roots = args.filter((a) => a.startsWith("/") || a.startsWith("~") || /^[A-Za-z]:[\\/]/.test(a));
      if (roots.some((r) => r === "/" || r === "~" || /^[A-Za-z]:[\\/]?$/.test(r) || /^\/(Users|home)\/?$/.test(r))) add("high", "fs-root", "Filesystem server is rooted at the whole disk or the home directory");
      else if (roots.length === 0) add("medium", "fs-unscoped", "Filesystem server has no explicit directory argument");
    }
    for (const a of infer(name, args)) tools.push({ name, access: a });
    if (url) tools.push({ name, access: "network" });
  }
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.server.localeCompare(b.server) || a.id.localeCompare(b.id));
  const system: AiSystem = {
    id: "mcp-configuration", name: "MCP-connected agent (from configuration)", owner: "", role: "deployer", purpose: "Agent with tools from the scanned MCP configuration",
    areas: [], practices: [], usesGpai: true, interactsWithPeople: true, generatesContent: true, deepfake: false, profiling: false, exemptionClaimed: false,
    autonomy: "supervised", humanApproval: true, tools, data: ["confidential"], logging: false,
  };
  return { servers: names, findings, system };
}
