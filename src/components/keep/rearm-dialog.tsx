import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
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
import { buildRearmPack, REARM_TARGETS, selectForPack, type RearmTarget } from "@/lib/keep/rearm";
import { useKeep } from "@/lib/keep/store";
import { cn } from "@/lib/utils";

const TARGET_COPY: Record<
  RearmTarget,
  { chat: string; toast: string; file: string }
> = {
  grok: {
    chat: "Grok",
    toast: "Re-arm pack copied. Paste it as the first message in a new Grok chat.",
    file: "keep-rearm-grok.md",
  },
  chatgpt: {
    chat: "ChatGPT",
    toast: "Re-arm pack copied. Paste it as the first message in a new ChatGPT chat.",
    file: "keep-rearm-chatgpt.md",
  },
  claude: {
    chat: "Claude",
    toast: "Re-arm pack copied. Paste it as the first message in a new Claude chat.",
    file: "keep-rearm-claude.md",
  },
};

export function RearmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const memories = useKeep((s) => s.memories);
  const displayName = useKeep((s) => s.displayName);
  const assistantName = useKeep((s) => s.assistantName);
  const standingInstruction = useKeep((s) => s.standingInstruction);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<RearmTarget>("grok");

  const pack = useMemo(
    () =>
      buildRearmPack(memories, { displayName, assistantName, standingInstruction }, target),
    [memories, displayName, assistantName, standingInstruction, target],
  );
  const stats = useMemo(() => selectForPack(memories), [memories]);
  const copy = TARGET_COPY[target];

  async function copyPack() {
    try {
      await navigator.clipboard.writeText(pack);
      setCopied(true);
      toast(copy.toast);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Select the text and copy it yourself.");
    }
  }

  function download() {
    const blob = new Blob([pack], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = copy.file;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-arm pack</DialogTitle>
          <DialogDescription>
            Paste this as the first message in a new {copy.chat} chat. The model cannot read this vault on its own.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Label>Pack for</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REARM_TARGETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTarget(item.id);
                  setCopied(false);
                }}
                className={cn(
                  "h-11 rounded-full px-4 text-xs font-medium transition-colors duration-150",
                  target === item.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-4 space-y-1 text-sm text-muted-foreground">
          <li>1. Copy the pack.</li>
          <li>2. Open a new {copy.chat} chat.</li>
          <li>3. Paste, send, then talk normally.</li>
        </ol>
        {stats.omitted > 0 ? (
          <p className="mt-3 text-xs text-faint">
            This pack includes {stats.kept.length}{" "}
            {stats.kept.length === 1 ? "memory" : "memories"}. {stats.omitted} older{" "}
            {stats.omitted === 1 ? "one was" : "ones were"} left out so the model actually reads it.
          </p>
        ) : null}
        <pre className="rearm-preview mt-4 max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-muted-foreground">
          {pack}
        </pre>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={download}>
            Download markdown
          </Button>
          <Button onClick={() => void copyPack()}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy pack"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
