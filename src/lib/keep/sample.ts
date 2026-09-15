import type { Kind, MemorySource } from "./types";

export function sampleMemories(): Array<{
  kind: Kind;
  title: string;
  body: string;
  pinned?: boolean;
  source?: MemorySource;
}> {
  return [
    {
      kind: "identity",
      title: "Lives in Portland",
      body: "Works night shifts and is usually free after 10am local time.",
      pinned: true,
      source: "sample",
    },
    {
      kind: "voice",
      title: "How to talk",
      body: "Be direct. No pep talk. Short answers unless asked to go deep.",
      pinned: true,
      source: "sample",
    },
    {
      kind: "preference",
      title: "Do not call them buddy",
      body: "Hates being called buddy, pal, or champ.",
      source: "sample",
    },
    {
      kind: "project",
      title: "Learning Japanese",
      body: "Currently around N4. Wants daily correction, not cheerleading.",
      source: "sample",
    },
    {
      kind: "conversation",
      title: "Moving in spring",
      body: "Talked about leaving in April if housing works out. Undecided on neighborhood. Asked the assistant to remember the timeline, not to plan the move unprompted.",
      source: "sample",
    },
  ];
}
