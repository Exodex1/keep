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
import { buildRearmPack } from "@/lib/keep/rearm";
import { useKeep } from "@/lib/keep/store";

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

  const pack = useMemo(
    () => buildRearmPack(memories, { displayName, assistantName, standingInstruction }),
    [memories, displayName, assistantName, standingInstruction],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(pack);
      setCopied(true);
      toast("Re-arm pack copied. Paste it as the first message in a new Grok chat.");
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
    a.download = "keep-rearm.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-arm pack</DialogTitle>
          <DialogDescription>
            Paste this as the first message in a new Grok chat. Grok cannot read this vault on its own.
          </DialogDescription>
        </DialogHeader>
        <ol className="mt-4 space-y-1 text-sm text-muted-foreground">
          <li>1. Copy the pack.</li>
          <li>2. Open a new Grok chat.</li>
          <li>3. Paste, send, then talk normally.</li>
        </ol>
        <pre className="rearm-preview mt-4 max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-muted-foreground">
          {pack}
        </pre>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={download}>
            Download markdown
          </Button>
          <Button onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy pack"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
