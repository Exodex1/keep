import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_STANDING,
  type KeepSettings,
  type KeepSnapshot,
  type Kind,
  type Memory,
  type MemorySource,
} from "./types";

type NewMemory = {
  kind: Kind;
  title: string;
  body: string;
  pinned?: boolean;
  source?: MemorySource;
};

type KeepState = KeepSettings & {
  memories: Memory[];
  addMemory: (input: NewMemory) => string;
  addMany: (inputs: NewMemory[]) => void;
  updateMemory: (id: string, patch: Partial<Pick<Memory, "kind" | "title" | "body" | "pinned">>) => void;
  removeMemory: (id: string) => void;
  togglePin: (id: string) => void;
  setSettings: (patch: Partial<KeepSettings>) => void;
  importSnapshot: (snapshot: KeepSnapshot, mode: "merge" | "replace") => number;
  reset: () => void;
};

const emptySettings: KeepSettings = {
  displayName: "",
  assistantName: "Grok",
  standingInstruction: DEFAULT_STANDING,
  onboardingDone: false,
};

function stamp(partial: NewMemory): Memory {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    kind: partial.kind,
    title: partial.title.trim(),
    body: partial.body.trim(),
    pinned: Boolean(partial.pinned),
    createdAt: now,
    updatedAt: now,
    source: partial.source ?? "typed",
  };
}

export const useKeep = create<KeepState>()(
  persist(
    (set, get) => ({
      ...emptySettings,
      memories: [],
      addMemory: (input) => {
        const memory = stamp(input);
        if (!memory.title && !memory.body) return memory.id;
        set({ memories: [memory, ...get().memories] });
        return memory.id;
      },
      addMany: (inputs) => {
        const next = inputs
          .map(stamp)
          .filter((m) => m.title || m.body);
        if (next.length === 0) return;
        set({ memories: [...next, ...get().memories] });
      },
      updateMemory: (id, patch) => {
        set({
          memories: get().memories.map((m) =>
            m.id === id
              ? {
                  ...m,
                  ...patch,
                  title: patch.title !== undefined ? patch.title.trim() : m.title,
                  body: patch.body !== undefined ? patch.body.trim() : m.body,
                  updatedAt: Date.now(),
                }
              : m,
          ),
        });
      },
      removeMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },
      togglePin: (id) => {
        set({
          memories: get().memories.map((m) =>
            m.id === id ? { ...m, pinned: !m.pinned, updatedAt: Date.now() } : m,
          ),
        });
      },
      setSettings: (patch) => set(patch),
      importSnapshot: (snapshot, mode) => {
        const incoming = Array.isArray(snapshot.memories) ? snapshot.memories : [];
        const existingIds = new Set(get().memories.map((m) => m.id));
        const cleaned = incoming.filter((m) => m && typeof m.id === "string" && (m.title || m.body));
        if (mode === "replace") {
          set({
            memories: cleaned,
            displayName: snapshot.displayName ?? get().displayName,
            assistantName: snapshot.assistantName ?? get().assistantName,
            standingInstruction: snapshot.standingInstruction ?? get().standingInstruction,
          });
          return cleaned.length;
        }
        const merged = cleaned.filter((m) => !existingIds.has(m.id));
        set({ memories: [...merged, ...get().memories] });
        return merged.length;
      },
      reset: () => set({ ...emptySettings, memories: [] }),
    }),
    {
      name: "keep.vault.v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        memories: state.memories,
        displayName: state.displayName,
        assistantName: state.assistantName,
        standingInstruction: state.standingInstruction,
        onboardingDone: state.onboardingDone,
      }),
    },
  ),
);

export function toSnapshot(state: Pick<KeepState, keyof KeepSettings | "memories">): KeepSnapshot {
  return {
    version: 1,
    exportedAt: Date.now(),
    displayName: state.displayName,
    assistantName: state.assistantName,
    standingInstruction: state.standingInstruction,
    onboardingDone: state.onboardingDone,
    memories: state.memories,
  };
}
