import { format } from "date-fns";
import { KINDS, type KeepSettings, type Kind, type Memory } from "./types";

const KIND_ORDER: Kind[] = [
  "voice",
  "identity",
  "person",
  "preference",
  "project",
  "event",
  "fact",
  "conversation",
];

const PER_KIND = 8;
const MAX_TOTAL = 50;

export const REARM_TARGETS = [
  { id: "grok", label: "Grok" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
] as const;

export type RearmTarget = (typeof REARM_TARGETS)[number]["id"];

type RearmSettings = Partial<
  Pick<KeepSettings, "displayName" | "assistantName" | "standingInstruction">
>;

function byKind(memories: Memory[], kind: Kind) {
  return memories
    .filter((m) => m.kind === kind)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

function line(memory: Memory) {
  const title = (memory.title || "").trim();
  const body = (memory.body || "").trim();
  if (title && body) return `- ${title}: ${body}`;
  if (title) return `- ${title}`;
  return `- ${body}`;
}

function rank(a: Memory, b: Memory) {
  return Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt;
}

export function selectForPack(memories: Memory[] | null | undefined) {
  const list = Array.isArray(memories) ? memories : [];
  const candidates: Memory[] = [];
  for (const kind of KIND_ORDER) {
    candidates.push(...byKind(list, kind).slice(0, PER_KIND));
  }
  candidates.sort(rank);
  const kept = candidates.slice(0, MAX_TOTAL);
  const keptIds = new Set(kept.map((m) => m.id));
  return {
    kept,
    omitted: list.filter((m) => !keptIds.has(m.id)).length,
  };
}

function formatFor(target: RearmTarget) {
  if (target === "claude") {
    return {
      open: "<memory_block>",
      close: "</memory_block>",
      defaultAssistant: "Claude",
      heading: (label: string) => `## ${label}`,
      subheading: (title: string) => `### ${title}`,
    };
  }
  if (target === "chatgpt") {
    return {
      open: "# Memory pack",
      close: "",
      defaultAssistant: "ChatGPT",
      heading: (label: string) => `## ${label}`,
      subheading: (title: string) => `### ${title}`,
    };
  }
  return {
    open: "[KEEP RE-ARM]",
    close: "[/KEEP RE-ARM]",
    defaultAssistant: "Grok",
    heading: (label: string) => `## ${label}`,
    subheading: (title: string) => `### ${title}`,
  };
}

export function buildRearmPack(
  memories: Memory[] | null | undefined,
  settings: RearmSettings = {},
  target: RearmTarget = "grok",
) {
  const fmt = formatFor(target);
  const s = settings ?? {};
  const assistant = (s.assistantName || "").trim() || fmt.defaultAssistant;
  const who = (s.displayName || "").trim();
  const standing =
    (s.standingInstruction || "").trim() || "Do not invent extra biographical facts.";
  const { kept, omitted } = selectForPack(memories);
  const pinned = kept.filter((m) => m.pinned);
  const rest = kept.filter((m) => !m.pinned);

  const parts: string[] = [];
  parts.push(fmt.open);
  parts.push(
    `${assistant}: load this block as durable memory for the rest of the chat. Internalize it. Do not recap it unless asked. Reply with one short acknowledgement, then wait for the human.`,
  );
  if (who) parts.push(`The human's name is ${who}.`);
  parts.push("");
  parts.push(standing);

  if (pinned.length > 0) {
    parts.push("");
    parts.push(fmt.heading("Pinned (always true unless later contradicted)"));
    for (const memory of pinned) parts.push(line(memory));
  }

  for (const kind of KIND_ORDER) {
    const items = byKind(rest, kind);
    if (items.length === 0) continue;
    const meta = KINDS.find((k) => k.id === kind);
    if (!meta) continue;
    parts.push("");
    parts.push(fmt.heading(meta.label));
    if (kind === "conversation") {
      for (const memory of items) {
        const when = format(memory.updatedAt || Date.now(), "d MMM yyyy");
        parts.push(fmt.subheading(`${(memory.title || "Untitled chat").trim()} (${when})`));
        parts.push((memory.body || "").trim());
        parts.push("");
      }
    } else {
      for (const memory of items) parts.push(line(memory));
    }
  }

  if (omitted > 0) {
    parts.push("");
    parts.push(`...and ${omitted} more ${omitted === 1 ? "memory" : "memories"} omitted.`);
  }

  if (fmt.close) parts.push(fmt.close);
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type DuplicatePair = {
  a: Memory;
  b: Memory;
  score: number;
};

function tokens(text: string) {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

export function findDuplicates(memories: Memory[]): DuplicatePair[] {
  const list = Array.isArray(memories) ? memories : [];
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < list.length; i++) {
    const left = list[i];
    const leftTokens = tokens(`${left.title} ${left.body}`);
    for (let j = i + 1; j < list.length; j++) {
      const right = list[j];
      if (left.kind !== right.kind && left.kind !== "fact" && right.kind !== "fact") continue;
      const score = jaccard(leftTokens, tokens(`${right.title} ${right.body}`));
      if (score >= 0.42) pairs.push({ a: left, b: right, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score).slice(0, 12);
}
