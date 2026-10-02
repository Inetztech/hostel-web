import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Clock, CheckCircle2, Ban, X,
  MapPin, FileText, Users, Building2, Lock, ChevronDown, ImageIcon,
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
  PENDING:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",   icon: Clock },
  PAID:      { label: "Paid",      className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200",     icon: Ban },
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

function SectionHeading({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
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
      {/* Header Section matching Room & Bed page style */}
      <div className="flex items-center justify-between">
        <div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" /> Report Damage
        </button>
      </div>

      {/* Main Data Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-3.5">Title</th>
              <th className="text-left px-5 py-3.5">Room</th>
              <th className="text-left px-5 py-3.5">Date</th>
              <th className="text-left px-5 py-3.5">Amount</th>
              <th className="text-left px-5 py-3.5">Tenants</th>
              <th className="text-left px-5 py-3.5">Status</th>
              <th className="text-right px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading records…</td></tr>
            ) : damages.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No damage records found</td></tr>
            ) : (
              damages.map((dmg) => {
                const meta = STATUS_META[dmg.status];
                const anyBilled = dmg.tenants?.some((t) => t.rentId != null) ?? false;
                const editDisabled = dmg.status === "PAID" || anyBilled;

                return (
                  <tr key={dmg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 uppercase text-xs tracking-wide">{dmg.title}</div>
                      {dmg.description && (
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{dmg.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">{dmg.roomNumbers?.join(", ") || "—"}</td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{dmg.damageDate}</td>
                    <td className="px-5 py-4  text-slate-900 tracking-tight">
                      ₹ {dmg.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {dmg.tenants?.map((t) => t.tenantName).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        value={dmg.status}
                        onValueChange={(v) => handleStatusChange(dmg.id, v as DamageStatus)}
                      >
                        <SelectTrigger className={`h-7 text-xs font-medium px-3 rounded-full border shadow-none gap-1.5 ${meta.className}`}>
                          <meta.icon className="h-3.5 w-3.5" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {(Object.keys(STATUS_META) as DamageStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="rounded-lg text-xs font-medium">
                              {STATUS_META[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          title={editDisabled ? "Cannot edit a paid/billed record" : "Edit"}
                          disabled={editDisabled}
                          onClick={(e) => { e.stopPropagation(); if (!editDisabled) openEdit(dmg); }}
                          className={`
                            h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white
                            ${editDisabled
                              ? "text-slate-300 cursor-not-allowed border-slate-100"
                              : "text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50"}
                            transition-all
                          `}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              title={anyBilled ? "Cannot delete a billed record" : "Delete"}
                              disabled={anyBilled}
                              onClick={(e) => e.stopPropagation()}
                              className={`
                                h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white
                                ${anyBilled
                                  ? "text-slate-300 cursor-not-allowed border-slate-100"
                                  : "text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50"}
                                transition-all
                              `}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-slate-900 font-bold">Delete this damage record?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-500">
                                Permanent operation: "{dmg.title}" and its assigned tenant balances will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
            <span>Page {pageIndex + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 shadow-xs"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageIndex + 1 >= totalPages}
                onClick={() => setPageIndex((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent
          className="
            max-w-2xl w-[95vw]
            rounded-2xl
            overflow-hidden
            p-0
            max-h-[85vh]
            [&>button]:hidden
          "
        >
          <div className="flex flex-col max-h-[85vh]">
            <DialogHeader className="relative px-6 py-4 shrink-0 border-b border-slate-100 bg-slate-50/50">
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingId ? "Edit Damage Record" : "Report Damage"}
              </DialogTitle>

              <button
                type="button"
                onClick={closeDialog}
                className="
                  absolute right-4 top-4
                  flex items-center justify-center h-7 w-7 rounded-full
                  bg-white border border-slate-200 text-slate-400
                  hover:text-slate-700 hover:border-slate-300 hover:bg-slate-100
                  transition-all
                "
              >
                <X className="h-4 w-4" />
              </button>
            </DialogHeader>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <section>
                <SectionHeading icon={MapPin} title="Location & Room" subtitle="Where the damage occurred" />
                <div className="rounded-xl border border-slate-200/80 p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Hostel</Label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-medium">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate flex-1">{sessionHostelName || "—"}</span>
                        <Lock className="h-3 w-3 text-slate-300 shrink-0" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Branch</Label>
                      {sessionBranchId ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-medium">
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
                          <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder={loadingLookups ? "Loading…" : "Select branch"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <Label className="text-xs font-semibold text-slate-600">Room(s)</Label>
                    <button
                      type="button"
                      disabled={roomFieldDisabled}
                      onClick={() => setRoomDropdownOpen((o) => !o)}
                      className={`
                        w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200
                        bg-white px-3 py-2 text-sm text-left transition-colors font-medium
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
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                          {roomsForBranch.length === 0 ? (
                            <p className="text-xs text-slate-400 px-3 py-2">No rooms in this branch</p>
                          ) : (
                            roomsForBranch.map((r) => (
                              <label
                                key={r.id}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium cursor-pointer hover:bg-slate-50 text-slate-700"
                              >
                                <Checkbox
                                  checked={form.roomIds.includes(r.id)}
                                  onCheckedChange={() => toggleRoom(r.id)}
                                />
                                Room {r.roomNumber}
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <SectionHeading icon={FileText} title="Damage Details" subtitle="What happened and total cost" />
                <div className="rounded-xl border border-slate-200/80 p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Title</Label>
                      <Input
                        className="rounded-xl border-slate-200"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Broken window pane"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Damage Date</Label>
                      <Input
                        className="rounded-xl border-slate-200"
                        type="date"
                        value={form.damageDate}
                        onChange={(e) => setForm((f) => ({ ...f, damageDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Description</Label>
                    <Textarea
                      className="rounded-xl border-slate-200"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Total Amount (₹)</Label>
                      <Input
                        className="rounded-xl border-slate-200"
                        type="number"
                        min={0}
                        value={form.totalAmount || ""}
                        onChange={(e) => setForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5 text-slate-400" /> Photos
                      </Label>
                      <Input
                        className="rounded-xl border-slate-200 text-xs text-slate-500"
                        type="file" accept="image/*" multiple
                        onChange={(e) => setForm((f) => ({ ...f, photos: Array.from(e.target.files ?? []) }))}
                      />
                    </div>
                  </div>

                  {form.photos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {form.photos.map((p, i) => (
                        <span key={i} className="text-xs font-medium bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 flex items-center gap-1.5 border border-slate-200">
                          {p.name}
                          <X
                            className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-700"
                            onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionHeading icon={Users} title="Tenants & Billing" subtitle="Targeted tenants and split distribution" />
                <div className="rounded-xl border border-slate-200/80 p-4 space-y-3 bg-white">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Responsible Tenants</Label>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-y-auto">
                      {form.roomIds.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2 font-medium">Select room(s) first</p>
                      ) : loadingTenants ? (
                        <p className="text-xs text-slate-400 px-3 py-2 font-medium">Loading tenants…</p>
                      ) : roomTenants.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2 font-medium">No active tenants in selected room(s)</p>
                      ) : (
                        roomTenants.map((t) => (
                          <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium cursor-pointer hover:bg-slate-50 text-slate-700">
                            <Checkbox checked={form.tenantIds.includes(t.id)} onCheckedChange={() => toggleTenant(t.id)} />
                            {t.name}
                          </label>
                        ))
                      )}
                    </div>
                    {form.tenantIds.length > 0 && form.totalAmount > 0 && (
                      <p className="text-xs font-medium text-blue-600 pt-1">
                        Each of {form.tenantIds.length} tenant{form.tenantIds.length > 1 ? "s" : ""} will be billed ₹
                        {(form.totalAmount / form.tenantIds.length).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Notes (optional)</Label>
                    <Textarea
                      className="rounded-xl border-slate-200"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-all shadow-xs"
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