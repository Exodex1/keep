export const KINDS = [
  { id: "identity", label: "Identity", hint: "Who you are" },
  { id: "person", label: "People", hint: "Names that matter" },
  { id: "preference", label: "Preferences", hint: "Likes, defaults, dislikes" },
  { id: "project", label: "Projects", hint: "Ongoing work" },
  { id: "event", label: "Events", hint: "Things that happened" },
  { id: "voice", label: "Voice", hint: "How the assistant should talk" },
  { id: "fact", label: "Facts", hint: "Durable truths" },
  { id: "conversation", label: "Chats", hint: "Conversation notes" },
] as const;

export type Kind = (typeof KINDS)[number]["id"];

export type MemorySource = "typed" | "pasted" | "extracted" | "sample";

export type Memory = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  source: MemorySource;
};

export type KeepSettings = {
  displayName: string;
  assistantName: string;
  standingInstruction: string;
  onboardingDone: boolean;
};

export type KeepSnapshot = KeepSettings & {
  version: 1;
  exportedAt: number;
  memories: Memory[];
};

export const KIND_IDS = KINDS.map((k) => k.id) as Kind[];

export const DEFAULT_STANDING =
  "Treat the following as durable memory. Do not invent extra biographical facts. Do not recap this block unless asked. If a later message from the user contradicts a line here, the later message wins.";

export function isKind(value: string): value is Kind {
  return KIND_IDS.includes(value as Kind);
}

export function kindMeta(id: Kind) {
  return KINDS.find((k) => k.id === id) ?? KINDS[6];
}
