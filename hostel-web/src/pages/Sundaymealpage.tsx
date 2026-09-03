import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getUserRole,
  getNextSunday,
  getMySundayMealResponse,
  submitSundayMealResponse,
  getSundayMealCount,
  getSundayMealHistory,
} from "@/lib/store";
import { hasPermission } from "@/lib/auth";
import { SundayMealConfirmation, SundayMealCount } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Drumstick,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  History,
  Building2,
  Utensils,
  AlertCircle,
} from "lucide-react";

/* =====================================================
   HELPERS
===================================================== */
const formatDate = (iso: string) => {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

/* =====================================================
   COMPONENT
===================================================== */
const SundayMealPage = () => {
  const role = getUserRole()?.toUpperCase();
  const isTenant = role === "TENANT";
  const canManage = hasPermission("MANAGE_SUNDAY_MEAL");

  /* ── SHARED STATE ── */
  const [mealDate, setMealDate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  /* ── TENANT STATE ── */
  const [myResponse, setMyResponse] = useState<SundayMealConfirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ── ADMIN/WARDEN STATE ── */
  const [count, setCount] = useState<SundayMealCount | null>(null);
  const [history, setHistory] = useState<SundayMealCount[]>([]);

  /* ── HISTORY PAGINATION ──
     getSundayMealHistory() returns every past Sunday's record with no
     server-side paging, and this list only grows week over week. Paginate
     it client-side the same way the other list pages in the app do —
     prev/numbered/next control, 10 rows per page. */
  const [historyPage, setHistoryPage] = useState(0);
  const historyPageSize = 10;

  const paginatedHistory = useMemo(
    () =>
      history.slice(
        historyPage * historyPageSize,
        (historyPage + 1) * historyPageSize
      ),
    [history, historyPage]
  );

  /* ── BRANCH BREAKDOWN PAGINATION ──
     count.branchBreakdown has one row per branch — 53 in this hostel's
     case — rendered as one long scrolling list. Paginate it the same
     way as history, 10 rows per page. Reset to page 0 whenever a fresh
     count loads. */
  const [branchPage, setBranchPage] = useState(0);
  const branchPageSize = 10;

  const branchBreakdown = count?.branchBreakdown ?? [];

  const paginatedBranchBreakdown = useMemo(
    () =>
      branchBreakdown.slice(
        branchPage * branchPageSize,
        (branchPage + 1) * branchPageSize
      ),
    [branchBreakdown, branchPage]
  );

  const didLoad = useRef(false);

  /* ── LOAD ── */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const nextSunday = await getNextSunday();
      setMealDate(nextSunday);

      if (isTenant) {
        const resp = await getMySundayMealResponse(nextSunday);
        setMyResponse(resp);
      }

      if (canManage) {
        const [c, h] = await Promise.all([
          getSundayMealCount(nextSunday),
          getSundayMealHistory(),
        ]);
        setCount(c);
        setHistory(h);
        setHistoryPage(0);
        setBranchPage(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Sunday meal data");
    } finally {
      setLoading(false);
    }
  }, [isTenant, canManage]);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, [reload]);

  /* ── TENANT RESPOND ── */
  const handleRespond = async (response: "YES" | "NO") => {
    if (!mealDate) return;
    try {
      setSubmitting(true);
      const saved = await submitSundayMealResponse({ mealDate, response });
      setMyResponse(saved);
      toast.success(
        response === "YES"
          ? "You're in for Sunday's chicken meal!"
          : "Got it — you won't be counted for Sunday's chicken meal."
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = myResponse?.response ?? "PENDING";

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <style>{`
        .sm-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 600px; }
        .sm-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 18px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.05em; }
        .sm-table td { padding: 16px 18px; border-bottom: 1px solid #f8fafc; vertical-align: middle; font-size: 13px; font-weight: 500; }
        .sm-table tr:hover td { background: #fcfcfd; }
      `}</style>

      {/* HERO / MEAL DATE + CUTOFF INFO */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Drumstick className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Sunday Chicken Meal
              </h1>
              {mealDate && (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  {formatDate(mealDate)}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              Confirmations close every Sunday at 10:00 AM
            </p>
          </div>
        </div>
      </div>

      {/* TENANT: RESPOND CARD */}
      {isTenant && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Will you be present for the chicken meal?
              </h2>
            </div>
            <div>
              {currentStatus === "YES" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> You're in
                </span>
              )}
              {currentStatus === "NO" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
                  <XCircle className="h-3.5 w-3.5" /> You're out
                </span>
              )}
              {currentStatus === "PENDING" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
                  <Clock className="h-3.5 w-3.5" /> Not submitted
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <Button
              disabled={submitting || loading}
              onClick={() => handleRespond("YES")}
              className={`h-11 px-6 font-bold rounded-xl transition-all shadow-sm ${
                currentStatus === "YES"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Yes, Count Me In
            </Button>
            <Button
              disabled={submitting || loading}
              onClick={() => handleRespond("NO")}
              className={`h-11 px-6 font-bold rounded-xl transition-all shadow-sm ${
                currentStatus === "NO"
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                  : "bg-white border border-rose-200 text-rose-700 hover:bg-rose-50"
              }`}
            >
              <XCircle className="h-4 w-4 mr-2" /> No, I'll Pass
            </Button>
          </div>
        </div>
      )}

      {/* ADMIN/WARDEN: COUNT METRICS & BREAKDOWN */}
      {canManage && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" /> Sunday Chicken Count Status
            </h2>
          </div>

          {loading || !count ? (
            <div className="text-center py-12 text-slate-400 font-medium text-sm">
              Loading meal response metrics...
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Active
                  </p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {count.totalActiveTenants}
                  </p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    Yes (Confirmed)
                  </p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {count.yesCount}
                  </p>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                    No (Opted Out)
                  </p>
                  <p className="text-2xl font-black text-rose-700 mt-1">
                    {count.noCount}
                  </p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    Pending
                  </p>
                  <p className="text-2xl font-black text-amber-700 mt-1">
                    {count.pendingCount}
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-4 col-span-2 md:col-span-1">
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    🍗 Chicken Required
                  </p>
                  <p className="text-2xl font-black text-amber-900 mt-1">
                    {count.chickenCount}
                  </p>
                </div>
              </div>

              {/* Branch Breakdown Table */}
              {branchBreakdown.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="sm-table">
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Active</th>
                          <th>Yes</th>
                          <th>No</th>
                          <th>Pending</th>
                          <th>🍗 Chicken Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBranchBreakdown.map((b) => (
                          <tr key={b.branchId}>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">
                                  {b.branchName}
                                </span>
                              </div>
                            </td>
                            <td className="text-slate-600">{b.totalActiveTenants}</td>
                            <td className="font-bold text-emerald-600">{b.yesCount}</td>
                            <td className="font-bold text-rose-600">{b.noCount}</td>
                            <td className="font-bold text-amber-600">{b.pendingCount}</td>
                            <td className="font-black text-amber-900">{b.chickenCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  {branchBreakdown.length > branchPageSize && (
                    <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                      <div className="text-[13px] text-[#64748b] font-medium">
                        Showing {branchPage * branchPageSize + 1} to {Math.min((branchPage + 1) * branchPageSize, branchBreakdown.length)} of {branchBreakdown.length} branches
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                          disabled={branchPage === 0}
                          onClick={() => setBranchPage(p => p - 1)}
                        >
                          &#8249;
                        </button>

                        {(() => {
                          const totalPages = Math.ceil(branchBreakdown.length / branchPageSize) || 1;
                          const pages: (number | string)[] = [];
                          for (let i = 0; i < totalPages; i++) {
                            if (i === 0 || i === totalPages - 1 || Math.abs(i - branchPage) <= 1) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== '...') {
                              pages.push('...');
                            }
                          }

                          return pages.map((p, idx) => {
                            if (p === '...') {
                              return <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium">...</span>;
                            }
                            const isCurrent = p === branchPage;
                            return (
                              <button
                                type="button"
                                key={p}
                                className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-amber-500 text-white border border-amber-500' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                                onClick={() => setBranchPage(p as number)}
                              >
                                {(p as number) + 1}
                              </button>
                            );
                          });
                        })()}

                        <button
                          type="button"
                          className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                          disabled={(branchPage + 1) * branchPageSize >= branchBreakdown.length}
                          onClick={() => setBranchPage(p => p + 1)}
                        >
                          &#8250;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ADMIN/WARDEN: HISTORY TABLE */}
      {canManage && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" /> Previous Sundays History
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Sunday</th>
                  <th>Active Tenants</th>
                  <th>Yes</th>
                  <th>No</th>
                  <th>Pending</th>
                  <th>🍗 Chicken Count</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      Loading history records...
                    </td>
                  </tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No past Sunday logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((h) => (
                    <tr key={h.mealDate}>
                      <td className="font-bold text-slate-800">
                        {formatDate(h.mealDate)}
                      </td>
                      <td className="text-slate-600">{h.totalActiveTenants}</td>
                      <td className="font-bold text-emerald-600">{h.yesCount}</td>
                      <td className="font-bold text-rose-600">{h.noCount}</td>
                      <td className="font-bold text-amber-600">{h.pendingCount}</td>
                      <td className="font-black text-amber-900">{h.chickenCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading && history.length > 0 && (
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <div className="text-[13px] text-[#64748b] font-medium">
                Showing {paginatedHistory.length === 0 ? 0 : historyPage * historyPageSize + 1} to {Math.min((historyPage + 1) * historyPageSize, history.length)} of {history.length} Sundays
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                  disabled={historyPage === 0}
                  onClick={() => setHistoryPage(p => p - 1)}
                >
                  &#8249;
                </button>

                {(() => {
                  const totalPages = Math.ceil(history.length / historyPageSize) || 1;
                  const pages: (number | string)[] = [];
                  for (let i = 0; i < totalPages; i++) {
                    if (i === 0 || i === totalPages - 1 || Math.abs(i - historyPage) <= 1) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== '...') {
                      pages.push('...');
                    }
                  }

                  return pages.map((p, idx) => {
                    if (p === '...') {
                      return <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium">...</span>;
                    }
                    const isCurrent = p === historyPage;
                    return (
                      <button
                        type="button"
                        key={p}
                        className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-amber-500 text-white border border-amber-500' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                        onClick={() => setHistoryPage(p as number)}
                      >
                        {(p as number) + 1}
                      </button>
                    );
                  });
                })()}

                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                  disabled={(historyPage + 1) * historyPageSize >= history.length}
                  onClick={() => setHistoryPage(p => p + 1)}
                >
                  &#8250;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SundayMealPage;