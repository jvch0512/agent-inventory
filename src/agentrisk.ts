import { AiSystem } from "./model.js";

export interface AgentRisk { score: number; level: "low" | "medium" | "high"; drivers: string[]; advice: string[] }

/** Excessive-agency style score: how much damage a misled agent could do. Weights are deliberately simple and visible. */
export function agentRisk(s: AiSystem): AgentRisk {
  let score = 0;
  const drivers: string[] = [];
  const advice: string[] = [];
  const add = (n: number, why: string) => { score += n; drivers.push(`+${n} ${why}`); };
  if (s.autonomy === "autonomous") add(3, "acts autonomously");
  else if (s.autonomy === "supervised") add(1, "acts under supervision");
  const access = new Set(s.tools.map((t) => t.access));
  if (access.has("exec")) add(3, "can execute code or commands");
  if (access.has("write")) add(2, "can write or change data");
  if (access.has("network")) add(1, "can reach the network");
  if (s.data.includes("special")) add(3, "handles special-category personal data");
  else if (s.data.includes("personal")) add(2, "handles personal data");
  if (s.data.includes("confidential")) add(1, "handles confidential data");
  if ((access.has("exec") || access.has("write")) && !s.humanApproval) { add(3, "writes or executes without human approval"); advice.push("Require human approval for write and execute actions, or limit them to a sandbox."); }
  if (!s.logging && s.tools.length) { add(2, "no action logging"); advice.push("Log every tool call with its arguments and the user who triggered it."); }
  if (s.owner === "") { add(2, "no accountable owner"); advice.push("Assign an owner who answers for what the agent does."); }
  if (access.has("exec")) advice.push("Run execution in an isolated environment with no inherited credentials.");
  if (s.data.includes("personal") || s.data.includes("special")) advice.push("Scope the agent's data access to what the task needs and record the lawful basis.");
  const level = score >= 9 ? "high" : score >= 5 ? "medium" : "low";
  return { score, level, drivers, advice: [...new Set(advice)] };
}
