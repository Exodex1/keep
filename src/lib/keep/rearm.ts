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

function byKind(memories: Memory[], kind: Kind) {
  return memories
    .filter((m) => m.kind === kind)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

function line(memory: Memory) {
  const title = memory.title.trim();
  const body = memory.body.trim();
  if (title && body) return `- ${title}: ${body}`;
  if (title) return `- ${title}`;
  return `- ${body}`;
}

export function buildRearmPack(
  memories: Memory[],
  settings: Pick<KeepSettings, "displayName" | "assistantName" | "standingInstruction">,
) {
  const assistant = settings.assistantName.trim() || "Grok";
  const who = settings.displayName.trim();
  const pinned = memories.filter((m) => m.pinned);
  const rest = memories.filter((m) => !m.pinned);

  const parts: string[] = [];
  parts.push("[KEEP RE-ARM]");
  parts.push(
    `${assistant}: load this block as durable memory for the rest of the chat. Internalize it. Do not recap it unless asked. Reply with one short acknowledgement, then wait for the human.`,
  );
  if (who) parts.push(`The human's name is ${who}.`);
  parts.push("");
  parts.push(settings.standingInstruction.trim() || "Do not invent extra biographical facts.");

  if (pinned.length > 0) {
    parts.push("");
    parts.push("## Pinned (always true unless later contradicted)");
    for (const memory of pinned) parts.push(line(memory));
  }

  for (const kind of KIND_ORDER) {
    const items = byKind(rest, kind);
    if (items.length === 0) continue;
    const meta = KINDS.find((k) => k.id === kind)!;
    parts.push("");
    parts.push(`## ${meta.label}`);
    if (kind === "conversation") {
      for (const memory of items) {
        const when = format(memory.updatedAt, "d MMM yyyy");
        parts.push(`### ${memory.title || "Untitled chat"} (${when})`);
        parts.push(memory.body);
        parts.push("");
      }
    } else {
      for (const memory of items) parts.push(line(memory));
    }
  }

  parts.push("[/KEEP RE-ARM]");
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type DuplicatePair = {
  a: Memory;
  b: Memory;
  score: number;
};

function tokens(text: string) {
  return new Set(
    text
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
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < memories.length; i++) {
    const left = memories[i];
    const leftTokens = tokens(`${left.title} ${left.body}`);
    for (let j = i + 1; j < memories.length; j++) {
      const right = memories[j];
      if (left.kind !== right.kind && left.kind !== "fact" && right.kind !== "fact") continue;
      const score = jaccard(leftTokens, tokens(`${right.title} ${right.body}`));
      if (score >= 0.42) pairs.push({ a: left, b: right, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score).slice(0, 12);
}
