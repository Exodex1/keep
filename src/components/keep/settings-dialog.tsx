import { useMemo } from "react";
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
import { findDuplicates } from "@/lib/keep/rearm";
import { useKeep } from "@/lib/keep/store";
import { DEFAULT_STANDING } from "@/lib/keep/types";

export function SettingsDialog({
  open,
  onOpenChange,
  onBackup,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackup: () => void;
  onImport: () => void;
}) {
  const displayName = useKeep((s) => s.displayName);
  const assistantName = useKeep((s) => s.assistantName);
  const standingInstruction = useKeep((s) => s.standingInstruction);
  const setSettings = useKeep((s) => s.setSettings);
  const memories = useKeep((s) => s.memories);
  const removeMemory = useKeep((s) => s.removeMemory);
  const reset = useKeep((s) => s.reset);

  const dupes = useMemo(() => findDuplicates(memories), [memories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            These lines sit at the top of every re-arm pack.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="keep-name">Your name</Label>
            <Input
              id="keep-name"
              className="mt-2"
              value={displayName}
              onChange={(e) => setSettings({ displayName: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="keep-assistant">Assistant name</Label>
            <Input
              id="keep-assistant"
              className="mt-2"
              value={assistantName}
              onChange={(e) => setSettings({ assistantName: e.target.value })}
              placeholder="Grok"
            />
          </div>
          <div>
            <Label htmlFor="keep-standing">Standing instruction</Label>
            <Textarea
              id="keep-standing"
              className="mt-2"
              value={standingInstruction}
              onChange={(e) => setSettings({ standingInstruction: e.target.value })}
            />
            <button
              type="button"
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSettings({ standingInstruction: DEFAULT_STANDING })}
            >
              Reset to default
            </button>
          </div>

          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm font-medium">Why Keep exists</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Grok chats do not share memory. Keep is the better store: private, on this device, exportable.
              The re-arm pack is the handoff into a new chat. There is no way for this app to write into Grok itself.
            </p>
          </div>

          {dupes.length > 0 ? (
            <div>
              <p className="text-sm font-medium">Possible duplicates</p>
              <ul className="mt-2 space-y-2">
                {dupes.map((pair) => (
                  <li
                    key={`${pair.a.id}-${pair.b.id}`}
                    className="rounded-md bg-secondary p-3 text-sm text-muted-foreground"
                  >
                    <p className="text-foreground">{pair.a.title || "Untitled"}</p>
                    <p className="mt-1 text-xs">and</p>
                    <p className="text-foreground">{pair.b.title || "Untitled"}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => removeMemory(pair.b.id)}>
                        Delete the second
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={onBackup}>
              Download backup
            </Button>
            <Button variant="secondary" onClick={onImport}>
              Import vault
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              reset();
              toast("Vault cleared on this device.");
              onOpenChange(false);
            }}
          >
            Clear this device
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
