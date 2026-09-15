import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ClipboardPaste,
  Copy,
  Download,
  Menu,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { KeepMark } from "@/components/keep/mark";
import { MemoryEditor } from "@/components/keep/memory-editor";
import { PasteChat } from "@/components/keep/paste-chat";
import { RearmDialog } from "@/components/keep/rearm-dialog";
import { SettingsDialog } from "@/components/keep/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { sampleMemories } from "@/lib/keep/sample";
import { toSnapshot, useKeep } from "@/lib/keep/store";
import { KINDS, kindMeta, type Kind, type Memory } from "@/lib/keep/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "pinned" | Kind;

export function KeepApp() {
  const memories = useKeep((s) => s.memories);
  const addMany = useKeep((s) => s.addMany);
  const togglePin = useKeep((s) => s.togglePin);
  const removeMemory = useKeep((s) => s.removeMemory);
  const importSnapshot = useKeep((s) => s.importSnapshot);
  const onboardingDone = useKeep((s) => s.onboardingDone);
  const setSettings = useKeep((s) => s.setSettings);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rearmOpen, setRearmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.resolve(useKeep.persist.rehydrate());
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (!typing && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNew();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: memories.length, pinned: 0 };
    for (const kind of KINDS) map[kind.id] = 0;
    for (const memory of memories) {
      map[memory.kind] += 1;
      if (memory.pinned) map.pinned += 1;
    }
    return map;
  }, [memories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memories
      .filter((m) => {
        if (filter === "pinned") return m.pinned;
        if (filter !== "all") return m.kind === filter;
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        return (
          m.title.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          kindMeta(m.kind).label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [memories, filter, query]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(memory: Memory) {
    setEditing(memory);
    setEditorOpen(true);
  }

  function loadSample() {
    addMany(sampleMemories());
    setSettings({ onboardingDone: true });
    toast("Sample vault loaded. Copy the re-arm pack to try it.");
  }

  function downloadBackup() {
    const snapshot = toSnapshot(useKeep.getState());
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keep-vault.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded.");
  }

  async function onImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Parameters<typeof importSnapshot>[0];
      const added = importSnapshot(parsed, memories.length === 0 ? "replace" : "merge");
      toast(added === 1 ? "Imported 1 memory." : `Imported ${added} memories.`);
    } catch {
      toast.error("That file is not a Keep vault.");
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside
          className={cn(
            "z-40 w-64 shrink-0 flex-col border-r border-border bg-background p-5",
            navOpen ? "fixed inset-y-0 left-0 flex md:static" : "hidden md:flex",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <KeepMark />
              <div>
                <p className="font-display text-2xl leading-none italic">Keep</p>
                <p className="mt-1 text-xs text-muted-foreground">Private vault</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setNavOpen(false)}
              aria-label="Close menu"
            >
              <X />
            </Button>
          </div>

          <nav className="mt-8 flex flex-col gap-0.5">
            <NavItem
              label="All"
              count={counts.all}
              active={filter === "all"}
              onClick={() => {
                setFilter("all");
                setNavOpen(false);
              }}
            />
            <NavItem
              label="Pinned"
              count={counts.pinned}
              active={filter === "pinned"}
              onClick={() => {
                setFilter("pinned");
                setNavOpen(false);
              }}
            />
            <Separator className="my-3" />
            {KINDS.map((kind) => (
              <NavItem
                key={kind.id}
                label={kind.label}
                count={counts[kind.id] ?? 0}
                active={filter === kind.id}
                onClick={() => {
                  setFilter(kind.id);
                  setNavOpen(false);
                }}
              />
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start px-2 text-muted-foreground"
              onClick={() => {
                setSettingsOpen(true);
                setNavOpen(false);
              }}
            >
              <Settings />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="justify-start px-2 text-muted-foreground"
              onClick={downloadBackup}
            >
              <Download />
              Download backup
            </Button>
            <Button
              variant="ghost"
              className="justify-start px-2 text-muted-foreground"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              Import vault
            </Button>
          </div>
        </aside>

        {navOpen ? (
          <button
            className="fixed inset-0 z-30 bg-background/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </Button>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memories"
                  className="pl-9"
                  aria-label="Search memories"
                />
              </div>
              <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => setPasteOpen(true)}>
                Paste a chat
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="sm:hidden"
                onClick={() => setPasteOpen(true)}
                aria-label="Paste a chat"
              >
                <ClipboardPaste />
              </Button>
              <Button onClick={() => setRearmOpen(true)} disabled={memories.length === 0}>
                <Copy />
                <span className="hidden sm:inline">Copy re-arm pack</span>
                <span className="sm:hidden">Re-arm</span>
              </Button>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 pb-32 sm:px-6">
            {!onboardingDone && memories.length === 0 ? (
              <Onboarding
                onAdd={openNew}
                onPaste={() => setPasteOpen(true)}
                onSample={loadSample}
              />
            ) : visible.length === 0 ? (
              <div className="mx-auto max-w-lg py-16 text-center keep-enter">
                <h2 className="font-display text-3xl italic">Nothing in this view</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {query ? "No memories match that search." : "This shelf is empty."}
                </p>
                <Button className="mt-6" onClick={openNew}>
                  <Plus />
                  Add a memory
                </Button>
              </div>
            ) : (
              <ul className="mx-auto max-w-2xl keep-stagger">
                {visible.map((memory) => (
                  <li key={memory.id}>
                    <MemoryRow
                      memory={memory}
                      onOpen={() => openEdit(memory)}
                      onPin={() => togglePin(memory.id)}
                      onDelete={() => {
                        removeMemory(memory.id);
                        toast("Memory removed.");
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      <Button
        size="icon"
        className="fixed right-5 bottom-24 z-30 size-14 rounded-full shadow-[var(--shadow-float)] md:right-8 md:bottom-28"
        onClick={openNew}
        aria-label="Add a memory"
      >
        <Plus className="size-5" />
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImportFile(file);
          e.target.value = "";
        }}
      />

      <MemoryEditor
        open={editorOpen}
        memory={editing}
        onOpenChange={setEditorOpen}
      />
      <PasteChat open={pasteOpen} onOpenChange={setPasteOpen} />
      <RearmDialog open={rearmOpen} onOpenChange={setRearmOpen} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onBackup={downloadBackup}
        onImport={() => fileRef.current?.click()}
      />
    </div>
  );
}

function NavItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-md px-2 text-sm transition-colors duration-150",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-xs text-faint">{count}</span>
    </button>
  );
}

function MemoryRow({
  memory,
  onOpen,
  onPin,
  onDelete,
}: {
  memory: Memory;
  onOpen: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group border-b border-border py-4">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {kindMeta(memory.kind).label}
            </span>
            {memory.pinned ? <Pin className="size-3 text-foreground" /> : null}
          </div>
          <h3 className="mt-1 font-display text-xl font-medium tracking-tight text-foreground">
            {memory.title || "Untitled"}
          </h3>
          {memory.body ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{memory.body}</p>
          ) : null}
          <p className="mt-2 text-xs text-faint">
            {formatDistanceToNow(memory.updatedAt, { addSuffix: true })}
          </p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Memory actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onPin}>
              {memory.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

function Onboarding({
  onAdd,
  onPaste,
  onSample,
}: {
  onAdd: () => void;
  onPaste: () => void;
  onSample: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl py-6 keep-stagger sm:py-16">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        For Grok chats
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight italic sm:text-5xl">
        A place memory can actually live.
      </h1>
      <p className="mt-4 max-w-prose text-base text-muted-foreground">
        Grok starts every new chat blank. Keep is the private vault on this device.
        Copy a re-arm pack, paste it as the first message, and the next chat already knows you.
      </p>
      <ol className="mt-8 space-y-4">
        {[
          "Add what should never be forgotten — identity, people, voice, projects.",
          "Paste old chats and keep the durable facts. The rest can stay as notes.",
          "Copy the re-arm pack into any new Grok chat. Download a backup so it survives this browser.",
        ].map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-foreground">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onAdd}>
          <Plus />
          Add a memory
        </Button>
        <Button variant="secondary" onClick={onPaste}>
          Paste a chat
        </Button>
        <Button variant="ghost" onClick={onSample}>
          Load a sample vault
        </Button>
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs text-faint">
        <Check className="mt-0.5 size-3.5 shrink-0" />
        Memories stay in this browser unless you download a backup. They are not uploaded, and other Grok chats cannot read this vault on their own.
      </p>
    </section>
  );
}
