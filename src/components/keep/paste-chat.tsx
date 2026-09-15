import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractMemories, type ExtractedMemory } from "@/lib/keep/extract";
import { useKeep } from "@/lib/keep/store";
import { kindMeta } from "@/lib/keep/types";
import { cn } from "@/lib/utils";

export function PasteChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addMemory = useKeep((s) => s.addMemory);
  const addMany = useKeep((s) => s.addMany);
  const setSettings = useKeep((s) => s.setSettings);

  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory[] | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTranscript("");
    setBusy(false);
    setExtracted(null);
    setSelected({});
    setSummary("");
    setTitle("");
    setError(null);
  }

  function saveConversationOnly() {
    const text = transcript.trim();
    if (text.length < 20) {
      toast.error("Paste a longer conversation first.");
      return;
    }
    addMemory({
      kind: "conversation",
      title: title.trim() || "Pasted conversation",
      body: summary.trim() || text.slice(0, 2000),
      source: "pasted",
    });
    setSettings({ onboardingDone: true });
    toast("Conversation kept.");
    reset();
    onOpenChange(false);
  }

  async function extract() {
    const text = transcript.trim();
    if (text.length < 20) {
      toast.error("Paste a longer conversation first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await extractMemories({ data: { transcript: text } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle(result.conversationTitle);
      setSummary(result.conversationSummary);
      setExtracted(result.memories);
      const next: Record<number, boolean> = {};
      result.memories.forEach((_, i) => {
        next[i] = true;
      });
      setSelected(next);
      if (result.memories.length === 0) {
        toast("Nothing durable was found. You can still keep the chat as a note.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  function keepSelected() {
    const text = transcript.trim();
    addMemory({
      kind: "conversation",
      title: title.trim() || "Pasted conversation",
      body: summary.trim() || text.slice(0, 2000),
      source: "pasted",
    });
    if (extracted) {
      addMany(
        extracted
          .filter((_, i) => selected[i])
          .map((item) => ({
            kind: item.kind,
            title: item.title,
            body: item.body,
            pinned: item.pinned,
            source: "extracted" as const,
          })),
      );
    }
    setSettings({ onboardingDone: true });
    toast("Chat and selected facts kept.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paste a conversation</DialogTitle>
          <DialogDescription>
            Drop in a Grok transcript. Keep stores it here, then Grok can pull out only the durable facts.
          </DialogDescription>
        </DialogHeader>

        {extracted === null ? (
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="keep-transcript">Transcript</Label>
              <Textarea
                id="keep-transcript"
                className="mt-2 min-h-48"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the chat here…"
              />
              <p className="mt-2 text-xs text-faint">Longer pastes are trimmed to keep extraction cheap.</p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={saveConversationOnly} disabled={busy}>
                Keep as a note
              </Button>
              <Button onClick={() => void extract()} disabled={busy}>
                {busy ? "Reading…" : "Extract facts"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <p className="font-display text-lg">{title || "Pasted conversation"}</p>
              {summary ? <p className="mt-1 text-sm text-muted-foreground">{summary}</p> : null}
            </div>
            <ul className="space-y-2">
              {extracted.map((item, i) => (
                <li key={`${item.title}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [i]: !s[i] }))}
                    className={cn(
                      "w-full rounded-lg p-3 text-left shadow-[var(--shadow-border)] transition-colors duration-150",
                      selected[i] ? "bg-secondary" : "bg-transparent opacity-50",
                    )}
                  >
                    <p className="text-xs font-medium tracking-wide text-muted-foreground">
                      {kindMeta(item.kind).label}
                    </p>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </button>
                </li>
              ))}
            </ul>
            {extracted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No extra facts. The conversation note will still be saved.
              </p>
            ) : (
              <p className="text-xs text-faint">Tap a card to skip it.</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setExtracted(null)}>
                Back
              </Button>
              <Button onClick={keepSelected}>Keep selected</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
