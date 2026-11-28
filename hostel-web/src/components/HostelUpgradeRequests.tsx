import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Building2, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  approveUpgradeRequest, listUpgradeRequests, rejectUpgradeRequest,
  type UpgradeRequestView,
} from "@/lib/upgradeRequests";

const errMsg = (e: unknown, fallback: string) =>
  axios.isAxiosError(e) ? e.response?.data?.message || fallback : fallback;

/**
 * Pending customer upgrade requests, shown inside the Hostels list.
 * Returns the pending rows plus the Accept / Reject dialogs to render once on the page.
 */
export function usePendingUpgradeRequests(onHostelsChanged: () => void) {
  const [pending, setPending] = useState<UpgradeRequestView[]>([]);
  const [approving, setApproving] = useState<UpgradeRequestView | null>(null);
  const [rejecting, setRejecting] = useState<UpgradeRequestView | null>(null);
  const [note, setNote] = useState("");
  const [bedPrice, setBedPrice] = useState("");
  const [duration, setDuration] = useState("1");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try { setPending(await listUpgradeRequests("PENDING")); } catch { setPending([]); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // Pick up new requests when the super admin comes back to this tab.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const openApprove = (r: UpgradeRequestView) => {
    setApproving(r); setNote(""); setBedPrice("");
    setDuration(String(r.durationMonths ?? 1));
  };
  const openReject = (r: UpgradeRequestView) => { setRejecting(r); setNote(""); };

  const doApprove = async () => {
    if (!approving || bedPrice === "" || Number(bedPrice) < 0) return;
    setBusy(true);
    try {
      await approveUpgradeRequest(approving.id, {
        note: note.trim() || undefined,
        bedPrice: Number(bedPrice),
        durationMonths: Number(duration),
      });
      toast.success("Hostel created. Login details emailed to the customer.");
      setApproving(null);
      await reload();
      onHostelsChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not accept the request"));
    } finally { setBusy(false); }
  };

  const doReject = async () => {
    if (!rejecting || !note.trim()) return;
    setBusy(true);
    try {
      await rejectUpgradeRequest(rejecting.id, note.trim());
      toast.success("Request rejected");
      setRejecting(null);
      await reload();
    } catch (e) {
      toast.error(errMsg(e, "Could not reject the request"));
    } finally { setBusy(false); }
  };

  const dialogs = (
    <>
      <Dialog open={!!approving} onOpenChange={(o) => !o && !busy && setApproving(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Accept &amp; create hostel</DialogTitle>
            <DialogDescription>
              {approving?.hostelName} ({approving?.city}) — {approving?.customerEmail}. The customer becomes the hostel Admin
              and receives a new password by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button className="rounded-xl" disabled={busy || bedPrice === ""} onClick={() => void doApprove()}>
              {busy ? "Accepting…" : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && !busy && setRejecting(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>{rejecting?.hostelName} — {rejecting?.customerEmail}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Reason (shown to the customer)</Label>
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
    </>
  );

  return { pending, openApprove, openReject, dialogs };
}

/** One pending request, laid out in the same 7 columns as a hostel row. */
export function PendingRequestRow({
  r, onAccept, onReject,
}: { r: UpgradeRequestView; onAccept: () => void; onReject: () => void }) {
  return (
    <tr style={{ background: "#fffbeb" }}>
      <td>
        <div className="h-cell-hostel">
          <div className="h-cell-icon" style={{ background: "#fef3c7" }}>
            <Building2 size={20} color="#d97706" aria-hidden="true" />
          </div>
          <div>
            <div className="h-cell-name">{r.hostelName}</div>
            <div className="h-cell-sub">{r.city} • {r.address}</div>
          </div>
        </div>
      </td>
      <td>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "#fef3c7", padding: "4px 10px", borderRadius: 6 }}>
          Price not set
        </span>
        <div className="h-cell-sub" style={{ marginTop: 4 }}>Set when you accept</div>
      </td>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{r.ownerName}</div>
        <div className="h-cell-sub">{r.customerEmail}</div>
        <div className="h-cell-sub">{r.phone}</div>
      </td>
      <td>
        <div style={{ fontWeight: 600, color: "#0f172a" }}>0 / {r.totalBeds ?? "—"}</div>
        <div className="h-cell-sub">beds requested</div>
      </td>
      <td><div className="h-cell-sub">—</div></td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#b45309" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#b45309" }}>Pending</span>
        </div>
      </td>
      <td style={{ textAlign: "right" }}>
        <div className="h-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="h-btn-primary" style={{ height: 32, padding: "0 14px" }}
            onClick={onAccept} aria-label={`Accept request for ${r.hostelName}`}>
            <Check size={14} aria-hidden="true" /> Accept
          </button>
          <button type="button" className="h-btn-outline" style={{ height: 32, padding: "0 14px" }}
            onClick={onReject} aria-label={`Reject request for ${r.hostelName}`}>
            <XIcon size={14} aria-hidden="true" /> Reject
          </button>
        </div>
      </td>
    </tr>
  );
}