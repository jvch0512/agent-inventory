import { AiSystem } from "./model.js";

/** Dates as applied after the Digital Omnibus on AI. Verify against the Official Journal. */
export const DATES = {
  prohibitedAndLiteracy: "2025-02-02",
  gpai: "2025-08-02",
  generalAndTransparency: "2026-08-02",
  highRiskAnnexIII: "2027-12-02",
  highRiskAnnexI: "2028-08-02",
} as const;

export const PRACTICES: Record<string, string> = {
  "manipulation": "Subliminal, manipulative or deceptive techniques that distort behaviour and cause significant harm (Art. 5(1)(a))",
  "exploit-vulnerabilities": "Exploiting vulnerabilities due to age, disability or social or economic situation (Art. 5(1)(b))",
  "social-scoring": "Social scoring leading to detrimental or unjustified treatment (Art. 5(1)(c))",
  "crime-prediction": "Predicting criminal offences based solely on profiling or personality traits (Art. 5(1)(d))",
  "face-scraping": "Untargeted scraping of facial images from the internet or CCTV to build recognition databases (Art. 5(1)(e))",
  "emotion-recognition-work-education": "Inferring emotions of people in the workplace or in education, except for medical or safety reasons (Art. 5(1)(f))",
  "biometric-categorisation-sensitive": "Biometric categorisation that infers race, political opinions, religion, sex life or similar (Art. 5(1)(g))",
  "realtime-biometric-id-law-enforcement": "Real-time remote biometric identification in public spaces for law enforcement, outside the narrow exceptions (Art. 5(1)(h))",
};

export const AREAS: Record<string, string> = {
  "biometrics": "Annex III (1) Biometrics: remote identification, categorisation, emotion recognition",
  "critical-infrastructure": "Annex III (2) Critical infrastructure: safety components in digital infrastructure, road traffic, utilities",
  "education": "Annex III (3) Education and vocational training: admission, assessment, proctoring",
  "employment": "Annex III (4) Employment and workers management: recruitment, selection, promotion, termination, monitoring",
  "essential-services": "Annex III (5) Access to essential services: public benefits, credit scoring, life and health insurance pricing, emergency triage",
  "law-enforcement": "Annex III (6) Law enforcement",
  "migration": "Annex III (7) Migration, asylum and border control",
  "justice-democracy": "Annex III (8) Administration of justice and democratic processes",
};

export type Tier = "prohibited" | "high-risk" | "transparency" | "minimal";

export interface Classification {
  system: AiSystem;
  tier: Tier;
  reasons: string[];
  obligations: string[];
  dates: string[];
  unknown: string[];
}

export function classify(s: AiSystem): Classification {
  const reasons: string[] = [];
  const obligations: string[] = ["AI literacy for staff who operate or use the system (Art. 4)"];
  const dates: string[] = [`Art. 4 literacy and Art. 5 prohibitions: since ${DATES.prohibitedAndLiteracy}`];
  const unknown: string[] = [];
  let tier: Tier = "minimal";

  const banned = s.practices.filter((p) => p in PRACTICES);
  for (const p of s.practices) if (!(p in PRACTICES)) unknown.push(`unknown practice "${p}"`);
  for (const a of s.areas) if (!(a in AREAS)) unknown.push(`unknown area "${a}"`);
  if (banned.length) {
    tier = "prohibited";
    for (const p of banned) reasons.push(PRACTICES[p]!);
    obligations.push("Stop or redesign before use: prohibited practices carry the highest fines (Art. 99)");
  } else {
    const areas = s.areas.filter((a) => a in AREAS);
    if (areas.length) {
      const relief = s.exemptionClaimed && !s.profiling;
      tier = "high-risk";
      for (const a of areas) reasons.push(AREAS[a]!);
      if (relief) {
        reasons.push("Exemption under Art. 6(3) claimed: it must be documented before the system is placed on the market and the system still has to be registered (Art. 6(4), Art. 49(2))");
        obligations.push("Keep the Art. 6(3) assessment on file and register the system");
      } else {
        if (s.exemptionClaimed && s.profiling) reasons.push("Exemption claimed but the system profiles natural persons, so Art. 6(3) does not apply");
        if (s.role !== "deployer") obligations.push("Provider: risk management system, data governance, technical documentation, logging, transparency, human oversight, accuracy and robustness, quality management, conformity assessment, CE marking and registration (Arts. 8 to 17, 43, 47, 49)");
        if (s.role !== "provider") obligations.push("Deployer: use per instructions, assign competent human oversight, monitor, keep logs for at least six months, inform workers and affected people, run a fundamental rights impact assessment where required (Arts. 26, 27)");
      }
      dates.push(`High-risk obligations (Annex III): from ${DATES.highRiskAnnexIII}`);
    }
    const t: string[] = [];
    if (s.interactsWithPeople) t.push("Tell people they are interacting with an AI system unless it is obvious (Art. 50(1))");
    if (s.generatesContent && s.role !== "deployer") t.push("Provider: mark synthetic audio, image, video and text outputs in a machine-readable way (Art. 50(2))");
    if (s.deepfake) t.push("Deployer: disclose deepfakes and AI-generated text published to inform the public (Art. 50(4))");
    if (s.areas.includes("biometrics")) t.push("Inform people exposed to emotion recognition or biometric categorisation (Art. 50(3))");
    if (t.length) { obligations.push(...t); dates.push(`Art. 50 transparency: from ${DATES.generalAndTransparency}`); if (tier === "minimal") tier = "transparency"; }
    if (s.usesGpai) obligations.push("Built on a general-purpose model: the model provider carries the Art. 53 and 55 duties (in force since " + DATES.gpai + "); you carry yours as provider or deployer of the system, and a substantial modification of the model can make you its provider");
  }
  if (s.owner === "") unknown.push("no accountable owner");
  if (tier === "high-risk" && !s.logging) unknown.push("high-risk system without logging");
  return { system: s, tier, reasons, obligations, dates, unknown };
}
