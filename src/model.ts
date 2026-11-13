export type Role = "provider" | "deployer" | "both";
export type Autonomy = "assistive" | "supervised" | "autonomous";
export type Access = "read" | "write" | "exec" | "network";
export type DataClass = "public" | "confidential" | "personal" | "special";

export interface Tool { name: string; access: Access }

export interface AiSystem {
  id: string;
  name: string;
  owner: string;
  role: Role;
  purpose: string;
  /** Annex III areas, see AREAS in classify.ts */
  areas: string[];
  /** Article 5 practices, see PRACTICES in classify.ts */
  practices: string[];
  usesGpai: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  deepfake: boolean;
  profiling: boolean;
  /** the provider claims the Article 6(3) exemption */
  exemptionClaimed: boolean;
  autonomy: Autonomy;
  humanApproval: boolean;
  tools: Tool[];
  data: DataClass[];
  logging: boolean;
}

export interface Inventory { organisation: string; systems: AiSystem[] }

export class InventoryError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, set: readonly T[], f: string, dflt: T): T => {
  if (v === undefined) return dflt;
  if (!set.includes(v as T)) throw new InventoryError(`${f} must be one of ${set.join(", ")}`);
  return v as T;
};
const strList = (v: unknown, f: string): string[] => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new InventoryError(`${f} must be a list of strings`);
  return v as string[];
};
const bool = (v: unknown, dflt: boolean): boolean => (typeof v === "boolean" ? v : dflt);

export function parseInventory(text: string): Inventory {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new InventoryError("inventory is not valid JSON"); }
  if (!isObj(raw) || !Array.isArray(raw["systems"])) throw new InventoryError('inventory must be an object with a "systems" list');
  const ids = new Set<string>();
  const systems = raw["systems"].map((s, i): AiSystem => {
    if (!isObj(s)) throw new InventoryError(`systems[${i}] must be an object`);
    const name = typeof s["name"] === "string" && s["name"].trim() ? s["name"].slice(0, 120) : "";
    if (!name) throw new InventoryError(`systems[${i}] needs a name`);
    const id = typeof s["id"] === "string" && s["id"] ? s["id"] : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (ids.has(id)) throw new InventoryError(`duplicate id: ${id}`);
    ids.add(id);
    const tools = Array.isArray(s["tools"]) ? s["tools"].map((t, j): Tool => {
      if (!isObj(t) || typeof t["name"] !== "string") throw new InventoryError(`${name}: tools[${j}] needs a name`);
      return { name: t["name"], access: oneOf(t["access"], ["read", "write", "exec", "network"] as const, `${name}: tools[${j}].access`, "read") };
    }) : [];
    return {
      id, name, owner: typeof s["owner"] === "string" ? s["owner"] : "", role: oneOf(s["role"], ["provider", "deployer", "both"] as const, `${name}: role`, "deployer"),
      purpose: typeof s["purpose"] === "string" ? s["purpose"].slice(0, 300) : "", areas: strList(s["areas"], `${name}: areas`), practices: strList(s["practices"], `${name}: practices`),
      usesGpai: bool(s["usesGpai"], false), interactsWithPeople: bool(s["interactsWithPeople"], false), generatesContent: bool(s["generatesContent"], false), deepfake: bool(s["deepfake"], false),
      profiling: bool(s["profiling"], false), exemptionClaimed: bool(s["exemptionClaimed"], false),
      autonomy: oneOf(s["autonomy"], ["assistive", "supervised", "autonomous"] as const, `${name}: autonomy`, "assistive"), humanApproval: bool(s["humanApproval"], true),
      tools, data: strList(s["data"], `${name}: data`).map((d) => oneOf(d, ["public", "confidential", "personal", "special"] as const, `${name}: data`, "public")), logging: bool(s["logging"], false),
    };
  });
  return { organisation: typeof raw["organisation"] === "string" ? raw["organisation"] : "", systems };
}
