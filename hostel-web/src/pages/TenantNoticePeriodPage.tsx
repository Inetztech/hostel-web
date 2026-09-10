import { useEffect, useState, useCallback } from "react";
import { submitMyCheckoutNotice, cancelCheckoutNotice } from "@/lib/store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarClock, Ban, Loader2, Calendar, FileText, Clock } from "lucide-react";

interface MyTenantNotice {
  id: number;
  name: string;
  checkoutStatus: "NOTICE_ACTIVE" | "NOTICE_COMPLETED" | "CHECKED_OUT" | null;
  checkoutStatusLabel?: string | null;
  checkoutRequestDate?: string | null;
  noticePeriodEndDate?: string | null;
  remainingNoticeDays?: number | null;
  noticeNote?: string | null;
  status: string;
}

const TenantNoticePeriodPage = () => {
  const [tenant, setTenant] = useState<MyTenantNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("1");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tenants/me");
      setTenant(res.data?.data ?? null);
    } catch {
      toast.error("Failed to load your notice period status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    const m = Number(months);
    if (!m || m < 1 || m > 6) {
      toast.error("Notice period must be between 1 and 6 months");
      return;
    }
    setSubmitting(true);
    try {
      await submitMyCheckoutNotice({ noticePeriodMonths: m, note: note.trim() || undefined });
      toast.success("Checkout notice submitted");
      setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to submit notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!tenant) return;
    try {
      await cancelCheckoutNotice(tenant.id);
      toast.success("Notice cancelled");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to cancel notice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading notice period details…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {tenant?.checkoutStatus ? (
        <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden transition-all">
          {/* Card Header Banner */}
          <div className="bg-indigo-50/70 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-sm">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Status</span>
                <h2 className="text-base font-bold text-slate-900">{tenant.checkoutStatusLabel}</h2>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Active Notice
            </span>
          </div>

          {/* Card Body Content */}
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Submitted On
                </div>
                <p className="text-sm font-semibold text-slate-800">{tenant.checkoutRequestDate ?? "-"}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Expected Checkout
                </div>
                <p className="text-sm font-semibold text-slate-800">{tenant.noticePeriodEndDate ?? "-"}</p>
              </div>

              {tenant.checkoutStatus !== "CHECKED_OUT" && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" /> Days Remaining
                  </div>
                  <p className="text-sm font-semibold text-indigo-600">{tenant.remainingNoticeDays ?? "-"} days</p>
                </div>
              )}
            </div>

            {tenant.noticeNote && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 text-slate-700 text-sm">
                <FileText className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-amber-900">Note: </span>
                  <span>{tenant.noticeNote}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              You'll be checked out automatically on your expected checkout date — no further action is needed from you or your Admin/Warden.
            </div>

            {tenant.checkoutStatus === "NOTICE_ACTIVE" && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  onClick={handleCancel}
                >
                  <Ban className="h-4 w-4 mr-1.5" /> Cancel Notice
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Initiate Checkout Notice</h2>
            <p className="text-sm text-slate-500 mt-1">
              Submit your checkout notice below. Your expected checkout date will be calculated automatically, and your bed and account will be released once the notice period ends.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Notice Period (months)
              </label>
              <Input
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                type="number"
                min={1}
                max={6}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">Select a duration between 1 to 6 months.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Note (optional)
              </label>
              <Input
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                placeholder="e.g. Relocating for a new job"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 shadow-sm" 
              disabled={submitting} 
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…
                </>
              ) : (
                "Submit Checkout Notice"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantNoticePeriodPage;