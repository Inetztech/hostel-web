// src/components/PermissionMatrix.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserPermissions, getAssignablePermissions, assignUserPermissions } from "@/lib/store";
import { PermissionCatalogItem } from "@/lib/types";

interface PermissionMatrixProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The subordinate user whose permissions are being viewed/edited. */
  userId: number | null;
  /** Optional label shown in the dialog title, e.g. the user's name or email. */
  userLabel?: string;
  onSaved?: () => void;
}

export default function PermissionMatrix({
  open,
  onOpenChange,
  userId,
  userLabel,
  onSaved,
}: PermissionMatrixProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [assignable, setAssignable] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getUserPermissions(userId), getAssignablePermissions()])
      .then(([target, mine]) => {
        if (cancelled) return;
        setCatalog(target.catalog);
        setSelected(new Set(target.catalog.filter((c) => c.granted).map((c) => c.name)));
        setAssignable(new Set(mine.filter((c) => c.granted).map((c) => c.name)));
      })
      .catch(() => toast.error("Failed to load permissions"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const toggle = (name: string) => {
    if (!assignable.has(name)) return; // can't grant beyond your own access
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await assignUserPermissions(userId, Array.from(selected));
      toast.success("Permissions updated");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const grouped = catalog.reduce<Record<string, PermissionCatalogItem[]>>((acc, item) => {
    (acc[item.module] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions{userLabel ? ` — ${userLabel}` : ""}</DialogTitle>
          <DialogDescription>
            You can only grant permissions you hold yourself. Greyed-out items are outside your own access.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading permissions…</p>
        ) : catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No permissions available.</p>
        ) : (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([module, items]) => (
              <div key={module}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  {module}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((item) => {
                    const disabled = !assignable.has(item.name);
                    const isChecked = selected.has(item.name);
                    
                    return (
                      <div
                        key={item.name}
                        onClick={() => !disabled && toggle(item.name)}
                        className={`flex items-center justify-between text-sm rounded-md border px-3 py-2 transition-colors select-none ${
                          disabled
                            ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100"
                            : "cursor-pointer hover:bg-slate-50/50 border-slate-200 bg-white"
                        }`}
                        title={disabled ? "You don't hold this permission yourself" : undefined}
                      >
                        <span className="text-slate-700 font-medium">{item.label}</span>
                        
                        {/* Custom Pill Toggle Switch Track */}
                        <div
                          className={`h-5 w-9 rounded-full relative transition-colors duration-200 shrink-0 ${
                            isChecked ? "bg-blue-600" : "bg-slate-200"
                          }`}
                        >
                          {/* Sliding white center circle indicator */}
                          <span
                            className={`h-4 w-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-sm ${
                              isChecked ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}