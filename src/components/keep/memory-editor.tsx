import { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKeep } from "@/lib/keep/store";
import { KINDS, type Kind, type Memory } from "@/lib/keep/types";
import { cn } from "@/lib/utils";

export function MemoryEditor({
  open,
  memory,
  onOpenChange,
}: {
  open: boolean;
  memory: Memory | null;
  onOpenChange: (open: boolean) => void;
}) {
  const addMemory = useKeep((s) => s.addMemory);
  const updateMemory = useKeep((s) => s.updateMemory);
  const setSettings = useKeep((s) => s.setSettings);

  const [kind, setKind] = useState<Kind>("fact");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(memory?.kind ?? "fact");
    setTitle(memory?.title ?? "");
    setBody(memory?.body ?? "");
    setPinned(memory?.pinned ?? false);
  }, [open, memory]);

  function save() {
    if (!title.trim() && !body.trim()) {
      toast.error("Write a title or a body.");
      return;
    }
    if (memory) {
      updateMemory(memory.id, { kind, title, body, pinned });
      toast("Memory updated.");
    } else {
      addMemory({ kind, title, body, pinned, source: "typed" });
      setSettings({ onboardingDone: true });
      toast("Memory kept.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{memory ? "Edit memory" : "New memory"}</DialogTitle>
          <DialogDescription>
            Short, durable, and specific. This is what Grok should still know in a new chat.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <div>
            <Label>Kind</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "h-9 rounded-full px-3 text-xs font-medium transition-colors duration-150",
                    kind === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="keep-title">Title</Label>
            <Input
              id="keep-title"
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lives in Asheboro"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="keep-body">Body</Label>
            <Textarea
              id="keep-body"
              className="mt-2 min-h-36"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The fact, in one or two sentences."
            />
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" className="justify-start" onClick={() => setPinned((v) => !v)}>
              <Pin className={cn("size-4", pinned && "fill-foreground")} />
              {pinned ? "Pinned — always first in the pack" : "Pin this"}
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={save}>{memory ? "Save" : "Keep this"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
