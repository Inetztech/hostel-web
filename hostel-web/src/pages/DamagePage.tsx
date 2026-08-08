import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, ImageIcon, X, IndianRupee,
  CheckCircle2, Clock, Ban, Building2, Lock, ChevronDown,
  MapPin, FileText, Users,
} from "lucide-react";

import { getUserRole } from "@/lib/auth";
import {
  fetchDamages, createDamage, updateDamage, updateDamageStatus, deleteDamage,
  fetchBranches, fetchRooms, getActiveTenantsByRoom, getBranchId,
} from "@/lib/store";
import type { Damage, DamageStatus, DamageRequest, Branch, Room, Tenant } from "@/lib/types";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_META: Record<DamageStatus, { label: string; className: string; icon: any }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-50 text-amber-700 ring-amber-200",     icon: Clock },
  PAID:      { label: "Paid",      className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500 ring-slate-200",     icon: Ban },
};

const emptyForm = {
  hostelId: 0,
  branchId: 0,
  roomIds: [] as number[],
  title: "",
  description: "",
  damageDate: new Date().toISOString().slice(0, 10),
  totalAmount: 0,
  tenantIds: [] as number[],
  notes: "",
  photos: [] as File[],
};

// Small reusable section header so each block of the form reads as its own
// step in the flow, rather than an undifferentiated grid of fields.
function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 -mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function DamagePage() {
  const role = getUserRole();

  const [damages, setDamages] = useState<Damage[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTenants, setRoomTenants] = useState<Tenant[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const sessionHostelId = Number(sessionStorage.getItem("hostelId") || 0);
  const sessionHostelName = sessionStorage.getItem("hostelName") || "";
  const sessionBranchId = role === "WARDEN" ? getBranchId() : null;

  const loadDamages = async (pg = pageIndex) => {
    setLoading(true);
    try {
      const res = await fetchDamages(pg, pageSize);
      setDamages(res.content);
      setTotal(res.totalElements);
    } catch {
      toast.error("Failed to load damage records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDamages(0); }, []);
  useEffect(() => { loadDamages(pageIndex); }, [pageIndex]);

  useEffect(() => {
    if (!dialogOpen) return;

    let cancelled = false;
    setLoadingLookups(true);
    setBranches([]);
    setRooms([]);
    setRoomTenants([]);

    Promise.all([
      fetchBranches(0, 200),
      fetchRooms(0, 200),
    ])
      .then(([branchesRes, roomsRes]) => {
        if (cancelled) return;
        setBranches(branchesRes.content.filter((b) => !sessionHostelId || b.hostelId === sessionHostelId));
        setRooms(roomsRes.content);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load branch/room data");
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => { cancelled = true; };
  }, [dialogOpen, sessionHostelId]);

  const roomIdsKey = form.roomIds.slice().sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (form.roomIds.length === 0) {
      setRoomTenants([]);
      setForm((f) => (f.tenantIds.length ? { ...f, tenantIds: [] } : f));
      return;
    }

    let cancelled = false;
    setLoadingTenants(true);

    Promise.all(form.roomIds.map((id) => getActiveTenantsByRoom(id)))
      .then((results) => {
        if (cancelled) return;
        const merged = results.flat();
        const unique = Array.from(new Map(merged.map((t) => [t.id, t])).values());
        setRoomTenants(unique);
        setForm((f) => {
          const prunedTenantIds = f.tenantIds.filter((tid) => unique.some((t) => t.id === tid));
          return prunedTenantIds.length === f.tenantIds.length
            ? f
            : { ...f, tenantIds: prunedTenantIds };
        });
      })
      .catch(() => {
        if (!cancelled) setRoomTenants([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTenants(false);
      });

    return () => { cancelled = true; };
  }, [roomIdsKey]);

  const roomsForBranch = useMemo(
    () => rooms.filter((r) => !form.branchId || r.unitId === form.branchId),
    [rooms, form.branchId]
  );

  const selectedRoomLabel = useMemo(() => {
    if (form.roomIds.length === 0) return "";
    const names = roomsForBranch
      .filter((r) => form.roomIds.includes(r.id))
      .map((r) => r.roomNumber);
    return names.length ? names.join(", ") : `${form.roomIds.length} room(s) selected`;
  }, [form.roomIds, roomsForBranch]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      hostelId: sessionHostelId,
      branchId: sessionBranchId ?? 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (dmg: Damage) => {
    setEditingId(dmg.id);
    setForm({
      hostelId: dmg.hostelId,
      branchId: dmg.branchId,
      roomIds: dmg.roomIds ?? [],
      title: dmg.title,
      description: dmg.description ?? "",
      damageDate: dmg.damageDate,
      totalAmount: dmg.totalAmount,
      tenantIds: dmg.tenantIds,
      notes: dmg.notes ?? "",
      photos: [],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setRoomDropdownOpen(false);
    setBranches([]);
    setRooms([]);
    setRoomTenants([]);
  };

  const toggleRoom = (id: number) => {
    setForm((f) => ({
      ...f,
      roomIds: f.roomIds.includes(id)
        ? f.roomIds.filter((r) => r !== id)
        : [...f.roomIds, id],
    }));
  };

  const toggleTenant = (id: number) => {
    setForm((f) => ({
      ...f,
      tenantIds: f.tenantIds.includes(id)
        ? f.tenantIds.filter((t) => t !== id)
        : [...f.tenantIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.hostelId) return toast.error("No hostel is linked to your account");
    if (!form.branchId) return toast.error("Select a branch");
    if (form.roomIds.length === 0) return toast.error("Select at least one room");
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.totalAmount || form.totalAmount <= 0) return toast.error("Enter a valid amount");
    if (form.tenantIds.length === 0) return toast.error("Select at least one responsible tenant");

    const payload = { ...form, roomIds: form.roomIds } as DamageRequest;

    setSaving(true);
    try {
      if (editingId) {
        await updateDamage(editingId, payload as Partial<DamageRequest>);
        toast.success("Damage record updated");
      } else {
        await createDamage(payload);
        toast.success("Damage record created");
      }
      closeDialog();
      loadDamages(0);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save damage record");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: DamageStatus) => {
    try {
      await updateDamageStatus(id, status);
      toast.success(`Marked as ${STATUS_META[status].label}`);
      loadDamages(pageIndex);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDamage(id);
      toast.success("Damage record deleted");
      loadDamages(pageIndex);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Cannot delete this damage record");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const roomFieldDisabled = !!editingId || !form.branchId || loadingLookups;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Damage / Penalty Management</h2>
          <p className="text-sm text-slate-500">Track property damage and bill responsible tenants.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Report Damage
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Room</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Tenants</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : damages.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">No damage records yet</td></tr>
            ) : (
              damages.map((dmg) => {
                const meta = STATUS_META[dmg.status];
                const anyBilled = dmg.tenants?.some((t) => t.rentId != null) ?? false;
                const editDisabled = dmg.status === "PAID" || anyBilled;

                return (
                  <tr key={dmg.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{dmg.title}</div>
                      {dmg.description && (
                        <div className="text-xs text-slate-400 line-clamp-1">{dmg.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{dmg.roomNumbers?.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{dmg.damageDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />{dmg.totalAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {dmg.tenants?.map((t) => t.tenantName).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <Select
                          value={dmg.status}
                          onValueChange={(v) => handleStatusChange(dmg.id, v as DamageStatus)}
                        >
                          <SelectTrigger className={`h-7 text-xs px-2.5 rounded-full ring-1 border-0 gap-1 ${meta.className}`}>
                            <meta.icon className="h-3 w-3" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_META) as DamageStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          title={editDisabled ? "Cannot edit a paid or billed record" : "Edit"}
                          disabled={editDisabled}
                          onClick={(e) => { e.stopPropagation(); if (!editDisabled) openEdit(dmg); }}
                          className={`
                            group inline-flex items-center justify-center h-8 w-8 rounded-full
                            border border-slate-200 bg-white
                            ${editDisabled
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"}
                            transition-colors
                          `}
                        >
                          <Pencil className="h-4 w-4 stroke-[1.75] text-slate-600 group-hover:text-blue-600 shrink-0" />
                        </button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              title={anyBilled ? "Cannot delete a billed record" : "Delete"}
                              disabled={anyBilled}
                              onClick={(e) => e.stopPropagation()}
                              className={`
                                group inline-flex items-center justify-center h-8 w-8 rounded-full
                                border border-slate-200 bg-white
                                ${anyBilled
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 cursor-pointer"}
                                transition-colors
                              `}
                            >
                              <Trash2 className="h-4 w-4 stroke-[1.75] text-slate-600 group-hover:text-red-600 shrink-0" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this damage record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{dmg.title}" and all its tenant shares. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={() => handleDelete(dmg.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>Page {pageIndex + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pageIndex + 1 >= totalPages}
                onClick={() => setPageIndex((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent
          className="
            max-w-3xl w-[95vw]
            rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl rounded-br-3xl
            overflow-hidden
            p-0
            max-h-[88vh]
            [&>button]:hidden
          "
        >
          <div className="flex flex-col max-h-[88vh]">
            <DialogHeader className="relative px-6 pt-6 pb-4 shrink-0 border-b border-slate-100">
              <DialogTitle>{editingId ? "Edit Damage Record" : "Report Damage"}</DialogTitle>

              <button
                type="button"
                onClick={closeDialog}
                className="
                  absolute right-4 top-4
                  inline-flex items-center justify-center h-8 w-8 rounded-full
                  bg-white border border-slate-200 text-slate-400
                  hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50
                  transition-colors
                "
              >
                <X className="h-4 w-4" />
              </button>
            </DialogHeader>

            <div className="overflow-y-auto px-6 py-5 space-y-6">

              {/* Section 1 — Location & Room: the context every other field depends on.
                  Locked fields (Hostel, sometimes Branch) are visually demoted so they
                  don't compete with the fields the user actually has to act on. */}
              <section>
                <SectionHeading icon={MapPin} title="Location & Room" subtitle="Where the damage occurred" />
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Hostel</Label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate flex-1">{sessionHostelName || "—"}</span>
                        <Lock className="h-3 w-3 text-slate-300 shrink-0" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Branch</Label>
                      {sessionBranchId ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <span className="truncate flex-1">
                            {branches.find((b) => b.id === sessionBranchId)?.unitName ?? "—"}
                          </span>
                          <Lock className="h-3 w-3 text-slate-300 shrink-0" />
                        </div>
                      ) : (
                        <Select
                          value={form.branchId ? String(form.branchId) : undefined}
                          onValueChange={(v) => setForm((f) => ({ ...f, branchId: Number(v), roomIds: [], tenantIds: [] }))}
                          disabled={!!editingId || loadingLookups}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder={loadingLookups ? "Loading…" : "Select branch"} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <Label className="text-xs text-slate-500">Room(s)</Label>
                    <button
                      type="button"
                      disabled={roomFieldDisabled}
                      onClick={() => setRoomDropdownOpen((o) => !o)}
                      className={`
                        w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200
                        bg-white px-3 py-2 text-sm text-left transition-colors
                        ${roomFieldDisabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "hover:border-slate-300"}
                      `}
                    >
                      <span className={`truncate ${form.roomIds.length ? "text-slate-800" : "text-slate-400"}`}>
                        {loadingLookups ? "Loading…" : selectedRoomLabel || "Select room(s)"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>

                    {roomDropdownOpen && !roomFieldDisabled && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setRoomDropdownOpen(false)} />
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg divide-y">
                          {roomsForBranch.length === 0 ? (
                            <p className="text-xs text-slate-400 px-3 py-2">No rooms in this branch</p>
                          ) : (
                            roomsForBranch.map((r) => (
                              <label
                                key={r.id}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                              >
                                <Checkbox
                                  checked={form.roomIds.includes(r.id)}
                                  onCheckedChange={() => toggleRoom(r.id)}
                                />
                                {r.roomNumber}
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 2 — Damage Details: what happened, when, how much, and photo
                  evidence — grouped together since Photos supports Title/Description. */}
              <section>
                <SectionHeading icon={FileText} title="Damage Details" subtitle="What happened and how much it costs" />
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Title</Label>
                      <Input
                        className="rounded-xl"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Broken window pane"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Damage Date</Label>
                      <Input
                        className="rounded-xl"
                        type="date"
                        value={form.damageDate}
                        onChange={(e) => setForm((f) => ({ ...f, damageDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <Textarea
                      className="rounded-xl"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Total Amount</Label>
                      <Input
                        className="rounded-xl"
                        type="number"
                        min={0}
                        value={form.totalAmount || ""}
                        onChange={(e) => setForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Photos
                      </Label>
                      <Input
                        className="rounded-xl"
                        type="file" accept="image/*" multiple
                        onChange={(e) => setForm((f) => ({ ...f, photos: Array.from(e.target.files ?? []) }))}
                      />
                    </div>
                  </div>

                  {form.photos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.photos.map((p, i) => (
                        <span key={i} className="text-xs bg-slate-100 rounded-full px-2.5 py-1 flex items-center gap-1">
                          {p.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3 — Tenants & Billing: who pays, split preview, and notes.
                  Kept last since it depends on Room(s) selected in section 1. */}
              <section>
                <SectionHeading icon={Users} title="Tenants & Billing" subtitle="Who's responsible and how the cost splits" />
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Responsible Tenants</Label>
                    <div className="rounded-xl border border-slate-200 divide-y max-h-36 overflow-y-auto">
                      {form.roomIds.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2">Select room(s) first</p>
                      ) : loadingTenants ? (
                        <p className="text-xs text-slate-400 px-3 py-2">Loading tenants…</p>
                      ) : roomTenants.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2">No active tenants in the selected room(s)</p>
                      ) : (
                        roomTenants.map((t) => (
                          <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                            <Checkbox checked={form.tenantIds.includes(t.id)} onCheckedChange={() => toggleTenant(t.id)} />
                            {t.name}
                          </label>
                        ))
                      )}
                    </div>
                    {form.tenantIds.length > 0 && form.totalAmount > 0 && (
                      <p className="text-xs text-slate-500">
                        Each of {form.tenantIds.length} tenant{form.tenantIds.length > 1 ? "s" : ""} pays ₹
                        {(form.totalAmount / form.tenantIds.length).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Notes (optional)</Label>
                    <Textarea
                      className="rounded-xl"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create Record"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}