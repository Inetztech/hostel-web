import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { CheckCircle2, Clock3, XCircle, Inbox, Building2, Phone, MapPin, BedDouble, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  approveUpgradeRequest, listSaasPlans, listUpgradeRequests, rejectUpgradeRequest,
  type BillingCycle, type SaasPlanOption, type UpgradeRequestView, type UpgradeStatus,
} from "@/lib/upgradeRequests";

const FILTERS: { key: UpgradeStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

const statusClass: Record<UpgradeStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const errMsg = (e: unknown, fallback: string) =>
  axios.isAxiosError(e) ? e.response?.data?.message || fallback : fallback;

export default function SuperAdminUpgradeRequestsPage() {
  const [filter, setFilter] = useState<UpgradeStatus | "ALL">("PENDING");
  const [rows, setRows] = useState<UpgradeRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [plans, setPlans] = useState<SaasPlanOption[]>([]);
  const [approving, setApproving] = useState<UpgradeRequestView | null>(null);
  const [rejecting, setRejecting] = useState<UpgradeRequestView | null>(null);
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [note, setNote] = useState("");
  const [bedPrice, setBedPrice] = useState("");
  const [duration, setDuration] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        listUpgradeRequests(filter === "ALL" ? undefined : filter),
        listUpgradeRequests("PENDING"),
      ]);
      setRows(list);
      setPendingCount(pending.length);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load requests"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    listSaasPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const selectedPlan = useMemo(() => plans.find((p) => String(p.id) === planId), [plans, planId]);
  const needsCycle = !!selectedPlan && !selectedPlan.free;

  const openApprove = (r: UpgradeRequestView) => {
    setApproving(r);
    setPlanId("");
    setCycle("MONTHLY");
    setNote("");
    setBedPrice("");
    setDuration(String(r.durationMonths ?? 1));
  };
  const openReject = (r: UpgradeRequestView) => {
    setRejecting(r);
    setNote("");
  };

  const doApprove = async () => {
    if (!approving || !planId || bedPrice === "" || Number(bedPrice) < 0) return;
    setBusy(true);
    try {
      await approveUpgradeRequest(approving.id, {
        planId: Number(planId),
        billingCycle: needsCycle ? cycle : undefined,
        note: note.trim() || undefined,
        bedPrice: Number(bedPrice),
        durationMonths: Number(duration),
      });
      toast.success("Hostel created. Login details emailed to the customer.");
      setApproving(null);
      void load();
    } catch (e) {
      toast.error(errMsg(e, "Could not approve the request"));
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejecting || !note.trim()) return;
    setBusy(true);
    try {
      await rejectUpgradeRequest(rejecting.id, note.trim());
      toast.success("Request rejected");
      setRejecting(null);
      void load();
    } catch (e) {
      toast.error(errMsg(e, "Could not reject the request"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter requests">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
              {f.key === "PENDING" && pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-white/90 px-1.5 text-xs font-semibold text-blue-700">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500" role="status">Loading requests…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-slate-500">
              <Inbox className="h-8 w-8" aria-hidden="true" />
              <p className="text-sm">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead>Owner &amp; contact</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.customerName ?? "—"}</div>
                        <div className="text-xs text-slate-500">{r.customerEmail ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium"><Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />{r.hostelName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{r.address}, {r.city}</div>
                      </TableCell>
                      <TableCell>
                        <div>{r.ownerName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{r.phone}</div>
                      </TableCell>
                      <TableCell><span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-slate-400" aria-hidden="true" />{r.totalBeds}</span></TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{fmt(r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass[r.status]}>
                          {r.status === "PENDING" && <Clock3 className="mr-1 h-3 w-3" aria-hidden="true" />}
                          {r.status === "APPROVED" && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />}
                          {r.status === "REJECTED" && <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                          {r.status}
                        </Badge>
                        {r.status !== "PENDING" && (
                          <div className="mt-1 text-xs text-slate-500">
                            {r.reviewedBy ? `by ${r.reviewedBy}` : ""} {r.reviewedAt ? `· ${fmt(r.reviewedAt)}` : ""}
                            {r.adminNote ? <div className="max-w-[220px] truncate" title={r.adminNote}>“{r.adminNote}”</div> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="rounded-xl" onClick={() => openApprove(r)}>Approve</Button>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openReject(r)}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve */}
      <Dialog open={!!approving} onOpenChange={(o) => !o && !busy && setApproving(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Approve &amp; create hostel</DialogTitle>
            <DialogDescription>
              {approving?.hostelName} ({approving?.city}) — {approving?.customerEmail}. The customer becomes the hostel Admin
              and receives a new password by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}{p.free ? " (free)" : ""}{!p.active ? " · inactive" : ""} — {p.modules.length} modules
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan?.free && (
                <p className="text-xs text-amber-700">A free plan gives the owner only the modules it includes (usually just the Absconded List).</p>
              )}
            </div>
            {needsCycle && (
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly (1 month)</SelectItem>
                    <SelectItem value="YEARLY">Yearly (1 year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="approve-bed-price">Price per bed (₹) *</Label>
                <Input id="approve-bed-price" inputMode="numeric" value={bedPrice} className="rounded-xl"
                  onChange={(e) => setBedPrice(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration *</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {approving && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Customer chose: {approving.propertyType ?? "—"} · {approving.rentBillingMode?.replace(/_/g, " ").toLowerCase() ?? "—"} ·
                EB {approving.ebMode?.toLowerCase() ?? "—"}{approving.ebValue ? ` (₹${approving.ebValue})` : ""} ·
                due {approving.rentDueMode === "FIXED_DUE" ? `₹${approving.fixedDuePerDay}/day` : "none"}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="approve-note">Note (optional)</Label>
              <Textarea id="approve-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => setApproving(null)}>Cancel</Button>
            <Button className="rounded-xl" disabled={busy || !planId || bedPrice === ""} onClick={() => void doApprove()}>
              {busy ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && !busy && setRejecting(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>{rejecting?.hostelName} — {rejecting?.customerEmail}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Reason</Label>
            <Textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
              placeholder="Why is this request being rejected?" className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" disabled={busy || !note.trim()} onClick={() => void doReject()}>
              {busy ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}