import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

type Req = {
  id: number; customerName?: string | null; customerEmail?: string | null;
  hostelName: string; address: string; city: string; totalBeds?: number | null;
  ownerName: string; phone: string; status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string | null; createdAt?: string | null; reviewedBy?: string | null;
};
type Plan = { id: number; name: string; active: boolean; free: boolean };

const badge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};
const inputCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400";

export default function UpgradeRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [approving, setApproving] = useState<Req | null>(null);
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState("MONTHLY");
  const [rejecting, setRejecting] = useState<Req | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/super-admin/upgrade-requests", { params: filter ? { status: filter } : {} });
      setRows(res.data?.data ?? []);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Failed to load requests");
    } finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    api.get("/super-admin/saas/plans").then((r) => {
      const list: Plan[] = (r.data?.data ?? []).filter((p: Plan) => p.active && !p.free);
      setPlans(list);
      if (list[0]) setPlanId(String(list[0].id));
    }).catch(() => setPlans([]));
  }, []);

  const approve = async () => {
    if (!approving) return;
    if (!planId) { setDialogError("Choose a plan first."); return; }
    setBusy(true); setDialogError("");
    try {
      await api.put(`/super-admin/upgrade-requests/${approving.id}/approve`, {
        planId: Number(planId), billingCycle: cycle,
      });
      setMsg(`${approving.hostelName} approved. Login details were emailed to ${approving.customerEmail}.`);
      setApproving(null);
      await load();
    } catch (e: any) {
      setDialogError(e?.response?.data?.message || "Could not approve this request.");
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) { setDialogError("Enter a reason."); return; }
    setBusy(true); setDialogError("");
    try {
      await api.put(`/super-admin/upgrade-requests/${rejecting.id}/reject`, { note: reason.trim() });
      setMsg(`${rejecting.hostelName} rejected.`);
      setRejecting(null); setReason("");
      await load();
    } catch (e: any) {
      setDialogError(e?.response?.data?.message || "Could not reject this request.");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Upgrade Requests</h1>
        <select className="h-9 rounded-lg border border-slate-200 px-2 text-sm" value={filter}
          onChange={(e) => setFilter(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      {msg && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}</div>}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              {["Customer", "Hostel", "Address", "Beds", "Phone", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">No requests.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2"><div className="font-medium">{r.ownerName}</div><div className="text-xs text-slate-500">{r.customerEmail}</div></td>
                <td className="px-3 py-2">{r.hostelName}<div className="text-xs text-slate-500">{r.city}</div></td>
                <td className="px-3 py-2 max-w-[220px] break-words">{r.address}</td>
                <td className="px-3 py-2">{r.totalBeds ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.phone}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${badge[r.status]}`}>{r.status}</span>
                  {r.adminNote && <div className="text-xs text-slate-500 mt-1 max-w-[160px] break-words">{r.adminNote}</div>}
                </td>
                <td className="px-3 py-2">
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 rounded-lg" onClick={() => { setApproving(r); setDialogError(""); }}>Accept</Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => { setRejecting(r); setReason(""); setDialogError(""); }}>Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {approving && (
        <Modal title={`Accept ${approving.hostelName}`} onClose={() => setApproving(null)}>
          <p className="text-sm text-slate-600">
            This creates the hostel and turns <b>{approving.customerEmail}</b> into its admin. A new password is generated
            and emailed to that address along with the login email.
          </p>
          <label className="text-xs font-medium text-slate-600 block mt-3">Plan
            <select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.length === 0 && <option value="">No active paid plan</option>}
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 block mt-3">Billing
            <select className={inputCls} value={cycle} onChange={(e) => setCycle(e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </label>
          {dialogError && <p className="text-sm text-red-600 mt-2">{dialogError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            <Button onClick={approve} disabled={busy || plans.length === 0}>{busy ? "Working…" : "Accept & send login"}</Button>
          </div>
        </Modal>
      )}

      {rejecting && (
        <Modal title={`Reject ${rejecting.hostelName}`} onClose={() => setRejecting(null)}>
          <label className="text-xs font-medium text-slate-600 block">Reason (shown to the customer)
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </label>
          {dialogError && <p className="text-sm text-red-600 mt-2">{dialogError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>{busy ? "Working…" : "Reject"}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-2">{title}</h2>
        {children}
      </div>
    </div>
  );
}
