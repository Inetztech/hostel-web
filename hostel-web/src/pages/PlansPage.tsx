import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, Loader2, Clock, XCircle, Phone, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useEntitlements } from "@/lib/entitlements";
import BusinessModelRentBilling from "@/components/BusinessModelRentBilling";
import type { RentBillingMode } from "@/lib/rentCycle";

type UpgradeRequest = {
  id: number; status: "PENDING" | "APPROVED" | "REJECTED"; hostelName: string; city: string;
  adminNote?: string | null;
};

const EMPTY = {
  hostelName: "", address: "", city: "", totalBeds: "", ownerName: "", phone: "",
  // Business model: same options as Super Admin > Add Hostel. (Price per bed is NOT asked here.)
  propertyType: "", rentBillingMode: "", ebMode: "", ebValue: "",
  rentDueMode: "", fixedDuePerDay: "", rentDueDay: "1",
};

const inputCls =
  "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const selectCls = inputCls;

// BusinessModelRentBilling is styled by classes that live in the Super Admin Hostels page stylesheet.
// These are the same base rules, so the "Rent Cycle Example" panel looks identical here.
const RENT_EXAMPLE_CSS = `
  .plans-bm .h-bm-block { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
  .plans-bm .h-bm-block-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #0f172a; }
  .plans-bm .h-bm-icon { width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .plans-bm .h-bm-field { display: flex; flex-direction: column; gap: 3px; }
  .plans-bm .h-bm-field-label { font-size: 11px; font-weight: 600; color: #475569; padding-left: 4px; }
  .plans-bm .h-bm-field-hint { font-size: 10.5px; color: #64748b; padding-left: 4px; }
`;

// Optional hostel photos (not mandatory): up to MAX_PHOTOS images.
const MAX_PHOTOS = 10;
const MAX_PHOTO_MB = 5;

export default function PlansPage() {
  const { planName, status } = useEntitlements();

  const [latest, setLatest] = useState<UpgradeRequest | null>(null);
  const [loadingReq, setLoadingReq] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);
  const [contact, setContact] = useState<{ name?: string | null; phone?: string | null } | null>(null);

  useEffect(() => {
    api.get("/customer/upgrade-requests/contact")
      .then((res) => setContact(res.data?.data ?? null))
      .catch(() => setContact(null));
  }, []);

  const loadLatest = async () => {
    try {
      const res = await api.get("/customer/upgrade-requests/mine");
      setLatest(res.data?.data ?? null);
    } catch {
      setLatest(null);
    } finally {
      setLoadingReq(false);
    }
  };
  useEffect(() => { void loadLatest(); }, []);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addPhotos = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    const bad = picked.find((f) => !/^image\/(jpeg|jpg|png|webp)$/.test(f.type));
    if (bad) { setError("Only JPG, PNG or WEBP photos are allowed."); return; }
    if (picked.some((f) => f.size > MAX_PHOTO_MB * 1024 * 1024)) { setError(`Each photo must be under ${MAX_PHOTO_MB} MB.`); return; }
    if (photos.length + picked.length > MAX_PHOTOS) { setError(`You can add up to ${MAX_PHOTOS} photos.`); return; }
    setError("");
    setPhotos((p) => [...p, ...picked]);
  };

  const submit = async () => {
    setError("");
    if (!form.hostelName.trim() || !form.address.trim() || !form.city.trim() || !form.ownerName.trim()) {
      setError("Please fill in the hostel name, address, city and your name."); return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) { setError("Enter a valid 10-digit phone number."); return; }
    if (!form.totalBeds || Number(form.totalBeds) < 1) { setError("Enter the total number of beds."); return; }
    if (!form.propertyType) { setError("Select the property type."); return; }
    if (!form.rentBillingMode) { setError("Select the tenant rent cycle."); return; }
    if (!form.ebMode) { setError("Select the EB calculation."); return; }
    if (form.ebMode !== "EXACTLY" && !(Number(form.ebValue) > 0)) {
      setError(form.ebMode === "FIXED" ? "Enter a valid fixed EB amount." : "Enter a valid EB rate per unit."); return;
    }
    if (!form.rentDueMode) { setError("Select the rent due option."); return; }
    if (form.rentDueMode === "FIXED_DUE" && !(Number(form.fixedDuePerDay) > 0)) { setError("Enter a valid due amount per day."); return; }
    const day = form.rentDueMode === "FIXED_DUE" ? Number(form.rentDueDay) : 1;
    if (!Number.isInteger(day) || day < 1 || day > 28) { setError("Rent due day must be between 1 and 28."); return; }
    setSending(true);
    try {
      const created = await api.post("/customer/upgrade-requests", {
        propertyType: form.propertyType, rentBillingMode: form.rentBillingMode,
        ebMode: form.ebMode, ebValue: form.ebMode === "EXACTLY" ? null : Number(form.ebValue),
        rentDueMode: form.rentDueMode,
        fixedDuePerDay: form.rentDueMode === "FIXED_DUE" ? Number(form.fixedDuePerDay) : null,
        rentDueDay: day,
        hostelName: form.hostelName.trim(), address: form.address.trim(), city: form.city.trim(),
        totalBeds: form.totalBeds ? Number(form.totalBeds) : null,
        ownerName: form.ownerName.trim(), phone: form.phone.trim(),
      });
      // Photos are optional; if they fail the request itself is still sent.
      const newId = created.data?.data?.id;
      if (photos.length > 0 && newId) {
        try {
          const fd = new FormData();
          photos.forEach((f) => fd.append("files", f));
          await api.post(`/customer/upgrade-requests/${newId}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch { /* ignore: request already sent */ }
      }
      setForm(EMPTY);
      setPhotos([]);
      await loadLatest();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const showForm = !loadingReq && (!latest || latest.status === "REJECTED");

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" /> Upgrade your plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current plan: <b>{planName ?? "Free"}</b> ({status}). Send your hostel details and our team will set up your account.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Hostel details</h2>

        {loadingReq && <div className="text-sm text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</div>}

        {latest?.status === "PENDING" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Your request for <b>{latest.hostelName}</b> ({latest.city}) is waiting for approval. We will email your login details once it is accepted.</span>
          </div>
        )}
        {latest?.status === "APPROVED" && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span><b>{latest.hostelName}</b> was approved. Your username and password were sent to your registered email. Please log in again with them.</span>
          </div>
        )}
        {latest?.status === "REJECTED" && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Your last request for <b>{latest.hostelName}</b> was not accepted{latest.adminNote ? `: ${latest.adminNote}` : "."} You can send a new request below.</span>
          </div>
        )}

        {contact?.phone && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <Phone className="h-4 w-4 shrink-0" />
            <span>Need help or pricing? Call {contact.name ? <b>{contact.name}</b> : "us"} at{" "}
              <a className="font-semibold underline" href={`tel:${contact.phone}`}>{contact.phone}</a>.</span>
          </div>
        )}

        {showForm && (
          <div className="space-y-3">
            {/* 1. Hostel details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">Hostel name *
                <input className={inputCls} value={form.hostelName} onChange={set("hostelName")} maxLength={100} />
              </label>
              <label className="text-xs font-medium text-slate-600">City *
                <input className={inputCls} value={form.city} onChange={set("city")} maxLength={50} />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">Address *
                <input className={inputCls} value={form.address} onChange={set("address")} maxLength={200} />
              </label>
              <label className="text-xs font-medium text-slate-600">Your name *
                <input className={inputCls} value={form.ownerName} onChange={set("ownerName")} maxLength={100} />
              </label>
              <label className="text-xs font-medium text-slate-600">Phone *
                <input className={inputCls} value={form.phone} onChange={set("phone")} inputMode="numeric" maxLength={10} />
              </label>
              <label className="text-xs font-medium text-slate-600">Total beds *
                <input className={inputCls} value={form.totalBeds} onChange={set("totalBeds")} inputMode="numeric" />
              </label>
            </div>

            {/* 2. Hostel photos */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hostel photos <span className="font-normal normal-case text-slate-400">(optional, up to {MAX_PHOTOS})</span>
              </div>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Upload hostel photos"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              {photos.length > 0 && (
                <>
                  <p className="text-xs text-slate-500">{photos.length} photo{photos.length === 1 ? "" : "s"} selected</p>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {previews.map((url, i) => (
                      <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        <img src={url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" aria-label={`Remove photo ${i + 1}`}
                          onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/75 text-white">
                          <XIcon className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 3. Business model */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business model</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-600">Property type *
                  <select className={selectCls} value={form.propertyType} onChange={set("propertyType")}>
                    <option value="">Select Property Type</option>
                    <option value="ROOM">Room</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">Tenant rent cycle *
                  <select className={selectCls} value={form.rentBillingMode} onChange={set("rentBillingMode")}>
                    <option value="">Select Tenant Rent Cycle</option>
                    <option value="CALENDAR_MONTH">Calendar Month</option>
                    <option value="JOINING_DATE_CYCLE">Joining-Date Cycle</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  {form.propertyType === "FLAT" ? "Flat EB *" : form.propertyType === "ROOM" ? "Room EB *" : "EB calculation *"}
                  <select className={selectCls} value={form.ebMode} onChange={set("ebMode")} disabled={!form.propertyType}>
                    <option value="">{form.propertyType ? "Select EB calculation" : "Select Property Type first"}</option>
                    <option value="EXACTLY">Exactly (actual EB reading)</option>
                    <option value="APPROXIMATE">Approximate (units × rate)</option>
                    <option value="FIXED">Fixed (amount per {form.propertyType === "FLAT" ? "flat" : "room"})</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">Rent due *
                  <select className={selectCls} value={form.rentDueMode} onChange={set("rentDueMode")}>
                    <option value="">Select Rent Due</option>
                    <option value="NO_DUE">No Due</option>
                    <option value="FIXED_DUE">Fixed Due (per overdue day)</option>
                  </select>
                </label>
                {(form.ebMode === "APPROXIMATE" || form.ebMode === "FIXED") && (
                  <label className="text-xs font-medium text-slate-600">
                    {form.ebMode === "FIXED" ? "Fixed EB amount (₹) *" : "EB rate per unit (₹) *"}
                    <input className={inputCls} value={form.ebValue} inputMode="decimal"
                      onChange={(e) => setForm((f) => ({ ...f, ebValue: e.target.value.replace(/[^\d.]/g, "") }))} />
                  </label>
                )}
                {form.rentDueMode === "FIXED_DUE" && (
                  <>
                    <label className="text-xs font-medium text-slate-600">Rent due day (1-28) *
                      <input className={inputCls} value={form.rentDueDay} inputMode="numeric" maxLength={2}
                        onChange={(e) => setForm((f) => ({ ...f, rentDueDay: e.target.value.replace(/\D/g, "") }))} />
                    </label>
                    <label className="text-xs font-medium text-slate-600">Due amount per day (₹) *
                      <input className={inputCls} value={form.fixedDuePerDay} inputMode="decimal"
                        onChange={(e) => setForm((f) => ({ ...f, fixedDuePerDay: e.target.value.replace(/[^\d.]/g, "") }))} />
                    </label>
                  </>
                )}
              </div>

              {/* Same "Rent Cycle Example" as Super Admin > Add Hostel: a worked example for the chosen cycle. */}
              {form.rentBillingMode && (
                <div className="plans-bm">
                  <style>{RENT_EXAMPLE_CSS}</style>
                  <BusinessModelRentBilling idPrefix="plans-billing" value={form.rentBillingMode as RentBillingMode} />
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">Price per bed and plan duration are set by our team after review. Your login details will be sent to the email you registered with.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="rounded-xl" onClick={submit} disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}