import { isKind, type Kind } from "./types";

const TRANSCRIPT_CAP = 8000;
const MAX_ITEMS = 12;

export type ExtractedMemory = {
  kind: Exclude<Kind, "conversation">;
  title: string;
  body: string;
  pinned: boolean;
};

export type ExtractResult =
  | {
      ok: true;
      conversationTitle: string;
      conversationSummary: string;
      memories: ExtractedMemory[];
    }
  | { ok: false; error: string };

type Rule = {
  kind: Exclude<Kind, "conversation">;
  test: RegExp;
  pinned?: boolean;
};

const RULES: Rule[] = [
  { kind: "identity", test: /\b(?:my name is|i(?:'m| am) called)\b/i },
  { kind: "identity", test: /\bi live (?:in|at|near)\b/i, pinned: true },
  { kind: "identity", test: /\bi(?:'m| am) from\b/i },
  { kind: "identity", test: /\bi work (?:as|at|in|nights|nights? shifts?)\b/i },
  { kind: "voice", test: /\b(?:be (?:direct|concise|brief|short)|don'?t (?:flatter|pep talk)|no pep talk|don'?t call me)\b/i, pinned: true },
  { kind: "preference", test: /\bi (?:like|love|prefer|hate|can'?t stand|don'?t like)\b/i },
  { kind: "project", test: /\bi(?:'m| am) (?:working on|building|learning|shipping)\b/i },
  { kind: "person", test: /\bmy (?:wife|husband|partner|girlfriend|boyfriend|mom|dad|mother|father|kid|son|daughter|friend|boss|dog|cat)\b/i },
  { kind: "event", test: /\b(?:last (?:week|month|year)|yesterday|this morning|moved|moving in)\b/i },
  { kind: "fact", test: /\bi (?:have|use|own|need|usually|always|never)\b/i },
];

function thirdPerson(sentence: string) {
  return sentence
    .replace(/\bI(?:'m| am)\b/gi, "They are")
    .replace(/\bI(?:'ve| have)\b/gi, "They have")
    .replace(/\bI(?:'ll| will)\b/gi, "They will")
    .replace(/\bI(?:'d| would)\b/gi, "They would")
    .replace(/\bmy\b/gi, "their")
    .replace(/\bmine\b/gi, "theirs")
    .replace(/\bme\b/gi, "them")
    .replace(/\bI\b/g, "They")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFrom(sentence: string, kind: Kind) {
  const clipped = sentence.replace(/^[-\s]+/, "").slice(0, 72);
  if (clipped.length > 0) return clipped.replace(/[.?!,:;]+$/, "");
  return kind;
}

function userLines(transcript: string) {
  const lines = transcript.split(/\r?\n/);
  const user: string[] = [];
  let taking = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const labeled = /^(user|human|you|me)\s*[:\-—]\s*(.*)$/i.exec(line);
    const assistant = /^(assistant|grok|ai|bot|chatgpt|claude)\s*[:\-—]/i.test(line);
    if (labeled) {
      taking = true;
      if (labeled[2]) user.push(labeled[2]);
      continue;
    }
    if (assistant) {
      taking = false;
      continue;
    }
    if (taking) user.push(line);
  }
  if (user.length === 0) {
    return transcript
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return user;
}

function sentences(text: string) {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && s.length < 400);
}

function extractLocal(transcript: string): ExtractResult {
  const spoken = userLines(transcript);
  const blob = spoken.join(" ");
  const items: ExtractedMemory[] = [];
  const seen = new Set<string>();

  for (const sentence of spoken.flatMap(sentences)) {
    for (const rule of RULES) {
      if (!rule.test.test(sentence)) continue;
      const body = thirdPerson(sentence).slice(0, 800);
      const key = body.toLowerCase();
      if (seen.has(key)) break;
      seen.add(key);
      items.push({
        kind: isKind(rule.kind) && rule.kind !== "conversation" ? rule.kind : "fact",
        title: titleFrom(sentence, rule.kind),
        body,
        pinned: Boolean(rule.pinned),
      });
      break;
    }
    if (items.length >= MAX_ITEMS) break;
  }

  const summary = spoken.join(" ").slice(0, 900);
  const title =
    spoken[0]?.replace(/[.?!].*$/, "").slice(0, 80) || "Pasted conversation";

  return {
    ok: true,
    conversationTitle: title,
    conversationSummary: summary,
    memories: items,
  };
}

export async function extractMemories(input: { data: { transcript: string } }): Promise<ExtractResult> {
  const transcript = typeof input?.data?.transcript === "string" ? input.data.transcript.trim() : "";
  if (transcript.length < 20) {
    return { ok: false, error: "Paste a longer conversation first." };
  }
  return extractLocal(transcript.slice(0, TRANSCRIPT_CAP));
}
