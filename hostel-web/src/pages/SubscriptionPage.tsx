import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMySubscription, getMySubscriptionHistory, renewMySubscription, addOnBeds,
  Subscription, SubscriptionPayment,
} from "@/lib/store";
import { logout } from "@/lib/auth";
import {
  CreditCard, Calendar, Clock, CheckCircle2, AlertCircle, TimerReset,
  RefreshCw, Receipt, LogOut, ShieldCheck, IndianRupee, Lock, BedDouble,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_OPTIONS = [
  { label: "1 Month",  months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year",   months: 12 },
];

const PAYMENT_MODES = ["CASH", "UPI", "BANK_TRANSFER", "CARD"];

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [showRenewForm, setShowRenewForm] = useState(false);
  const [planName, setPlanName] = useState("Standard Plan");
  const [monthlyRate, setMonthlyRate] = useState(0);      // ₹ per month, derived from current plan
  const [amount, setAmount] = useState("");               // auto-computed, read-only
  const [durationMonths, setDurationMonths] = useState(1);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [remarks, setRemarks] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState("");
  const [renewSuccess, setRenewSuccess] = useState(false);

  // ── Shared bed-pricing info ───────────────────────────────────────
  // Read-only, always mirrors the hostel's configured bed price and
  // current capacity. Feeds ONLY the "Add Beds Mid-Cycle" card now —
  // the renewal form no longer has its own bed-request section (that
  // was redundant with the standalone mid-cycle add-on below, and it
  // always defaulted to 0 beds anyway).
  const [currentPlanBedLimit, setCurrentPlanBedLimit] = useState(0);
  const [pricePerBed, setPricePerBed] = useState(0);            // number, locked, from server
  // ─────────────────────────────────────────────────────────────────────

  // ── Add Beds Mid-Cycle (immediate, standalone — POST /subscriptions/my/add-on-beds) ──
  // Pays for and grants extra bed capacity right now, without touching the
  // current cycle's start/end dates. Kept in its own "addOn*" state.
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [addOnBedsCount, setAddOnBedsCount] = useState("");
  const [addOnRemarks, setAddOnRemarks] = useState("");
  const [addOnSubmitting, setAddOnSubmitting] = useState(false);
  const [addOnError, setAddOnError] = useState("");
  const [addOnSuccess, setAddOnSuccess] = useState(false);

  const addOnBedsNum = Number(addOnBedsCount) || 0;
  const addOnAmountPreview = addOnBedsNum * pricePerBed;
  // ─────────────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    setLoadError(false);
    try {
      const [sub, hist] = await Promise.all([
        getMySubscription(),
        getMySubscriptionHistory(),
      ]);
      setSubscription(sub);
      setHistory(hist);

      // Pre-fill the renewal form with the current plan as a sensible default.
      const resolvedPlanName = sub.planName === "No active plan" ? "Standard Plan" : sub.planName;
      setPlanName(resolvedPlanName);

      // Derive a per-month rate so we can auto-price any duration the admin
      // picks. Prefer bed-capacity x bed-price: any additional beds paid
      // for previously (via the mid-cycle add-on) get permanently merged
      // into the hostel's bed capacity server-side, so this always reflects
      // the up-to-date base plan — e.g. 100 beds @ ₹85 = ₹8,500/mo; after a
      // 50-bed add-on, capacity becomes 150 beds and this recomputes to
      // ₹12,750/mo automatically.
      // Falls back to amountPaid/duration only when bed pricing isn't
      // configured for this hostel (legacy data).
      const baseMonths = sub.durationMonths && sub.durationMonths > 0 ? sub.durationMonths : 1;
      const bedLimit = sub.currentPlanBedLimit || 0;
      const bedRate = sub.pricePerAdditionalBed || 0;
      const rate = bedLimit && bedRate
        ? bedLimit * bedRate
        : (sub.amountPaid ? sub.amountPaid / baseMonths : 0);
      setMonthlyRate(rate);

      const initialMonths = sub.durationMonths || 1;
      setDurationMonths(initialMonths);
      setAmount(rate ? String(Math.round(rate * initialMonths)) : "");

      // Bring in the read-only bed limit and per-bed price straight from
      // the server response — always fresh from Hostel.bedPrice via the
      // subscription DTO. Used by the "Add Beds Mid-Cycle" card.
      setCurrentPlanBedLimit(sub.currentPlanBedLimit || 0);
      setPricePerBed(sub.pricePerAdditionalBed || 0);

      // Reset the mid-cycle add-on form.
      setAddOnBedsCount("");
      setAddOnRemarks("");

      // Expired admins land here needing to act — open the form immediately.
      if (sub.status === "EXPIRED") setShowRenewForm(true);
    } catch (err) {
      console.error("Failed to load subscription", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Whenever the duration changes, recompute the amount from the monthly
  // rate — the admin can pick a duration but can't type a custom amount.
  function handleSelectDuration(months: number) {
    setDurationMonths(months);
    setAmount(monthlyRate ? String(Math.round(monthlyRate * months)) : "");
  }

  async function handleRenew() {
    if (renewing) return;
    setRenewError("");

    const amt = Number(amount);
    if (!planName.trim()) { setRenewError("Plan name is required"); return; }
    if (!amt || amt < 0)  { setRenewError("Amount could not be calculated. Please contact support."); return; }
    if (!durationMonths)  { setRenewError("Select a duration"); return; }

    setRenewing(true);
    try {
      const updated = await renewMySubscription({
        planName: planName.trim(),
        amount: amt,
        durationMonths,
        paymentMode,
        remarks: remarks.trim() || undefined,
        // No additionalBedsRequested here anymore — bed top-ups go through
        // the standalone "Add Beds Mid-Cycle" card instead.
      });
      setSubscription(updated);
      setRenewSuccess(true);
      setShowRenewForm(false);
      setRemarks("");
      const hist = await getMySubscriptionHistory();
      setHistory(hist);
      setTimeout(() => setRenewSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to renew subscription", err);
      setRenewError(err?.response?.data?.message || "Failed to renew subscription. Please try again.");
    } finally {
      setRenewing(false);
    }
  }

  async function handleAddOnBeds() {
    if (addOnSubmitting) return;
    setAddOnError("");

    if (addOnBedsNum <= 0) { setAddOnError("Enter a number of beds greater than zero"); return; }
    if (pricePerBed <= 0) { setAddOnError("This hostel has no bed price configured — contact support"); return; }

    setAddOnSubmitting(true);
    try {
      const updated = await addOnBeds({
        additionalBedsRequested: addOnBedsNum,
        remarks: addOnRemarks.trim() || undefined,
      });
      setSubscription(updated);
      setCurrentPlanBedLimit(updated.currentPlanBedLimit || 0);
      setPricePerBed(updated.pricePerAdditionalBed || 0);
      setAddOnSuccess(true);
      setShowAddOnForm(false);
      setAddOnBedsCount("");
      setAddOnRemarks("");
      const hist = await getMySubscriptionHistory();
      setHistory(hist);
      setTimeout(() => setAddOnSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to add on beds", err);
      setAddOnError(err?.response?.data?.message || "Failed to add beds. Please try again.");
    } finally {
      setAddOnSubmitting(false);
    }
  }

  const expired = subscription?.status === "EXPIRED";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Subscription & Renewal</h1>
              <p className="text-sm text-gray-500">{subscription?.hostelName ?? "Your hostel"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-white transition-colors bg-white shadow-sm"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        {expired && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Access restricted — subscription expired</p>
              <p className="text-sm text-red-600 mt-0.5">
                Your other modules (Dashboard, Tenants, Rooms, Payments, Reports, etc.) are locked
                until you renew. Only your profile and this page remain accessible.
              </p>
            </div>
          </div>
        )}

        {renewSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-5 py-4 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Subscription renewed — full access has been restored.
          </div>
        )}

        {addOnSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-5 py-4 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Beds added — the extra capacity is available right away.
          </div>
        )}

        {/* Current plan card */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                expired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
              )}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[17px] font-bold text-gray-900">Current Plan</h4>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {expired ? "Expired — renew to restore access" : "Active and in good standing"}
                </p>
              </div>
            </div>
            {!showRenewForm && (
              <button
                onClick={() => setShowRenewForm(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm",
                  expired
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-white"
                )}
              >
                <RefreshCw className="h-4 w-4" /> {expired ? "Renew Subscription" : "Renew Early"}
              </button>
            )}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : loadError || !subscription ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-50 px-4 py-3 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" /> Couldn't load subscription details.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stat icon={CreditCard} label="Plan Name" value={subscription.planName} />
                <Stat icon={IndianRupee} label="Amount Paid" value={`₹${Number(subscription.amountPaid).toLocaleString("en-IN")}`} />
                <Stat icon={Calendar} label="Start Date" value={subscription.startDate ?? "—"} />
                <Stat icon={Calendar} label="End Date" value={subscription.endDate ?? "—"} />
                <Stat icon={TimerReset} label="Duration" value={subscription.durationLabel} />
                <Stat
                  icon={subscription.status === "ACTIVE" ? CheckCircle2 : AlertCircle}
                  label="Status"
                  value={subscription.status === "ACTIVE" ? "Active" : "Expired"}
                  valueColor={subscription.status === "ACTIVE" ? "text-emerald-600" : "text-red-600"}
                />
                <Stat icon={Clock} label="Days Remaining" value={subscription.status === "ACTIVE" ? `${subscription.daysRemaining} days` : "0 days"} />
                <Stat icon={RefreshCw} label="Renewal Status" value={subscription.renewalStatus} valueColor={subscription.renewalRequired ? "text-red-600" : "text-emerald-600"} />
                <Stat icon={BedDouble} label="Plan Bed Limit" value={`${subscription.currentPlanBedLimit} beds`} />
                {subscription.additionalBedsRequested > 0 && (
                  <Stat
                    icon={IndianRupee}
                    label="Total Subscription Amount"
                    value={`₹${Number(subscription.totalSubscriptionAmount).toLocaleString("en-IN")}`}
                    valueColor="text-indigo-600"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Beds Mid-Cycle — immediate, standalone, no renewal required */}
        {!loading && !expired && subscription && (
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[17px] font-bold text-gray-900">Add Beds Request</h4>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Pay for extra beds any time this cycle — access is granted immediately.
                  </p>
                </div>
              </div>
              {!showAddOnForm && (
                <button
                  onClick={() => setShowAddOnForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-white transition-colors shadow-sm"
                >
                  <BedDouble className="h-4 w-4" /> Add Beds Now
                </button>
              )}
            </div>

            {showAddOnForm && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Current Bed Limit
                    </label>
                    <input type="text" value={`${currentPlanBedLimit} beds`} disabled readOnly
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Additional Beds
                    </label>
                    <input type="number" min={1} value={addOnBedsCount}
                      onChange={(e) => setAddOnBedsCount(e.target.value)} placeholder="e.g. 50"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Price Per Bed (₹) <Lock className="h-3 w-3" />
                    </label>
                    <input type="text" value={pricePerBed ? `₹${pricePerBed.toLocaleString("en-IN")}` : "—"} disabled readOnly
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Amount to Pay Now (₹) <Lock className="h-3 w-3" />
                    </label>
                    <input type="text" value={`₹${addOnAmountPreview.toLocaleString("en-IN")}`} disabled readOnly
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Remarks (optional)
                  </label>
                  <input value={addOnRemarks} onChange={(e) => setAddOnRemarks(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                    placeholder="Transaction reference, etc." />
                </div>

                <p className="text-[12px] text-gray-400">
                  At your next renewal, the plan amount recalculates automatically off your new bed
                  total ({currentPlanBedLimit + addOnBedsNum} beds) — you won't need to add these beds again.
                </p>

                {addOnError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {addOnError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleAddOnBeds} disabled={addOnSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    <BedDouble className="h-4 w-4" /> {addOnSubmitting ? "Processing…" : "Pay & Add Beds"}
                  </button>
                  <button onClick={() => setShowAddOnForm(false)} disabled={addOnSubmitting}
                    className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Renewal form */}
        {showRenewForm && (
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h4 className="text-[17px] font-bold text-gray-900">Renew Subscription</h4>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Choose a billing cycle — the amount is calculated automatically.
                {subscription?.status === "ACTIVE" && " Renewing early extends from your current end date."}
              </p>
            </div>
            <div className="p-6 space-y-4">

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => handleSelectDuration(opt.months)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors",
                        durationMonths === opt.months
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Plan Name
                  </label>
                  <input
                    value={planName}
                    disabled
                    readOnly
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Plan Amount (₹) <Lock className="h-3 w-3" />
                  </label>
                  <input
                    type="text"
                    value={amount ? `₹${Number(amount).toLocaleString("en-IN")}` : "—"}
                    disabled
                    readOnly
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Set automatically based on the selected duration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                  >
                    {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Remarks (optional)
                  </label>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                    placeholder="Transaction reference, etc."
                  />
                </div>
              </div>

              {renewError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {renewError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRenew}
                  disabled={renewing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> {renewing ? "Processing…" : "Confirm & Renew"}
                </button>
                {!expired && (
                  <button
                    onClick={() => setShowRenewForm(false)}
                    disabled={renewing}
                    className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment history */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[17px] font-bold text-gray-900">Payment History</h4>
              <p className="text-[13px] text-gray-500 mt-0.5">Every renewal is kept — nothing is ever overwritten</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-50">
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Plan</th>
                    <th className="px-6 py-3 font-semibold">Cycle</th>
                    <th className="px-6 py-3 font-semibold">Duration</th>
                    <th className="px-6 py-3 font-semibold">Mode</th>
                    <th className="px-6 py-3 font-semibold text-right">Plan Amount</th>
                    <th className="px-6 py-3 font-semibold text-right">Extra Beds</th>
                    <th className="px-6 py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3.5 text-gray-700">{p.paymentDate}</td>
                      <td className="px-6 py-3.5 text-gray-700 font-medium">
                        {p.planName}
                        {p.paymentMode === "ADD_ON" && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Add-on
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">{p.cycleStartDate} → {p.cycleEndDate}</td>
                      <td className="px-6 py-3.5 text-gray-500">{p.durationMonths} mo</td>
                      <td className="px-6 py-3.5 text-gray-500">{p.paymentMode}</td>
                      <td className="px-6 py-3.5 text-gray-900 text-right">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-right">
                        {p.additionalBedsRequested > 0
                          ? `${p.additionalBedsRequested} × ₹${p.pricePerAdditionalBed} = ₹${Number(p.additionalBedAmount).toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-gray-900 font-semibold text-right">
                        ₹{Number(p.totalSubscriptionAmount ?? p.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {!expired && (
          <div className="text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, valueColor = "text-gray-900" }: any) {
  return (
    <div className="flex items-center p-4 rounded-xl border border-gray-100 bg-white">
      <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 mr-4">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium mb-1 truncate">{label}</p>
        <p className={cn("text-sm font-bold truncate", valueColor)}>{value}</p>
      </div>
    </div>
  );
}