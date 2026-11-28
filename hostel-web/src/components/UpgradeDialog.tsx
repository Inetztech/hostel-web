// src/components/UpgradeDialog.tsx
import { Lock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  /** Name of the locked module the user tried to open. */
  moduleName?: string;
  onOpenChange: (open: boolean) => void;
}

/** Shown when a user clicks a locked sidebar item or hits a locked URL/API. */
export default function UpgradeDialog({ open, moduleName, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
            {moduleName ? `${moduleName} is locked` : "This feature is locked"}
          </DialogTitle>
          <DialogDescription className="text-sm pt-1">
            This feature is locked. Upgrade your plan to access it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
