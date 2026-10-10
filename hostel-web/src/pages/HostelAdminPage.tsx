import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentProps } from "react";
import {
  getAllHostelsWithAdmins, createHostelWithAdmin, updateHostelWithAdmin,
  deleteHostelWithAdmin, updateHostelStatus, fetchAllPages, uploadHostelImages,
  getBusinessModel, saveBusinessModel,
} from "@/lib/store";
import api from "@/lib/api";
import {
  HostelAdmin, HostelAdminRequest, BusinessModel, BusinessModelRequest,
  EbCalculationMode, RentDueMode, PropertyType,
} from "@/lib/types";
// Rent Billing mode (CALENDAR_MONTH | JOINING_DATE_CYCLE) + its settings block.
import type { RentBillingMode } from "@/lib/rentCycle";
import BusinessModelRentBilling, { RENT_CYCLE_OPTIONS } from "@/components/BusinessModelRentBilling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Building2, Users, Download, Filter, Plus, Pencil, Trash2, Eye, MoreVertical,
  Search, ChevronRight, ChevronLeft, ChevronDown, RefreshCw, ShieldCheck, ShieldOff,
  Wallet, FileText, CheckCircle2, PauseCircle, Ban, User, FileUp, BedDouble,
  Image as ImageIcon, X as XIcon, Zap, Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Accessible colour tokens (WCAG AA = 4.5:1 for normal text)          */
/* ------------------------------------------------------------------ */
const C = {
  muted:    "#64748b", // 4.8:1 on white  (was #94a3b8 → 2.6:1)
  subtle:   "#475569", // 7.6:1 on white
  success:  "#166534", // 7.1:1 on white / 6.9:1 on #f0fdf4 (was #16a34a → 3.3:1)
  warning:  "#b45309", // 5.0:1 on white  (was #f59e0b → 2.1:1)
  danger:   "#b91c1c", // 6.5:1 on white  (was #ef4444 → 3.8:1)
  primary:  "#2563eb", // white text 5.2:1 (was #3b82f6 → 3.7:1)
  primaryHover: "#1d4ed8",
};

// Minimum number of hostel gallery photos required when creating a hostel.
const MIN_HOSTEL_PHOTOS = 5;

/* ------------------------------------------------------------------ */
/* Business Model (Property Type → Rent Cycle / EB / Rent Due) — helpers */
/* ------------------------------------------------------------------ */

// Form-side representation: numeric inputs are kept as strings while typing.
interface BusinessModelForm {
  // Step 1: decides which of the settings below apply.
  //   ROOM → Room EB (+ Tenant Rent Cycle + Rent Due)
  //   FLAT → Flat EB (+ Tenant Rent Cycle + Rent Due)
  propertyType: PropertyType | "";   // "" = not selected yet

  // Room EB: EXACTLY | APPROXIMATE (₹/unit) | FIXED (₹ per room)
  roomEbMode: EbCalculationMode | "";
  roomRate: string;     // Approximate Room EB → rate per unit
  roomFixed: string;    // Fixed Room EB → fixed amount

  // Flat EB: EXACTLY | APPROXIMATE (₹/unit) | FIXED (₹ per flat)
  flatEbMode: EbCalculationMode | "";
  flatRate: string;     // Approximate Flat EB → rate per unit
  flatFixed: string;    // Fixed Flat EB → fixed amount

  rentDueMode: RentDueMode | "";
  dueAmount: string;    // Fixed Due → amount per day
  dueDay: string;       // Rent falls due on day of month (1–28)
  // How rent periods are cut for the whole hostel.
  //   CALENDAR_MONTH     → joining month pro-rated by days, later months full (existing behaviour)
  //   JOINING_DATE_CYCLE → joining date → same date next month = one full cycle
  rentBillingMode: RentBillingMode | "";
}

const EMPTY_BM: BusinessModelForm = {
  propertyType: "",
  roomEbMode: "",
  roomRate: "",
  roomFixed: "",
  flatEbMode: "",
  flatRate: "",
  flatFixed: "",
  rentDueMode: "",
  dueAmount: "",
  dueDay: "1",
  rentBillingMode: "",
};

// Works whether or not lib/types.ts already declares rentBillingMode.
type BusinessModelWithBilling = BusinessModel & { rentBillingMode?: RentBillingMode | null };

// Always yields a value the dropdowns know; legacy "EXTRACT"/null/blank → "EXACTLY".
const normalizeEbMode = (v?: string | null): EbCalculationMode => {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "APPROXIMATE") return "APPROXIMATE";
  if (s === "FIXED") return "FIXED";
  return "EXACTLY";
};

const numStr = (v?: number | null): string => (v != null && Number(v) > 0 ? String(v) : "");

// Converts a saved model (or nothing / an older backend response) into form state.
const toBmForm = (m?: BusinessModel | null): BusinessModelForm => {
  if (!m) return { ...EMPTY_BM };
  const saved = m as BusinessModelWithBilling;

  const roomEbMode = normalizeEbMode(m.roomEbMode);
  let flatEbMode = normalizeEbMode(m.flatEbMode);

  // Legacy row: flat APPROXIMATE that carries only a fixed amount (no rate)
  // is a FIXED flat. The backend already reports it as FIXED; this keeps the
  // form correct against an older response too.
  const legacyFlatAmount = Number(m.flatApproximateEbAmount ?? 0);
  const hasFlatRate = Number(m.flatApproximateEbRate ?? 0) > 0;
  if (flatEbMode === "APPROXIMATE" && !hasFlatRate && legacyFlatAmount > 0) {
    flatEbMode = "FIXED";
  }

  const flatFixed =
    numStr(m.flatFixedEbAmount) ||
    (flatEbMode === "FIXED" && legacyFlatAmount > 0 ? String(legacyFlatAmount) : "");

  return {
    // Older responses carry no propertyType: a Flat-only non-exact setup is FLAT.
    propertyType: m.propertyType
      ?? (flatEbMode !== "EXACTLY" && roomEbMode === "EXACTLY" ? "FLAT" : "ROOM"),
    roomEbMode,
    roomRate: numStr(m.roomApproximateEbRate),
    roomFixed: numStr(m.roomFixedEbAmount),
    flatEbMode,
    flatRate: numStr(m.flatApproximateEbRate),
    flatFixed,
    rentDueMode: m.rentDueMode ?? "NO_DUE",
    dueAmount: m.fixedDuePerDay != null ? String(m.fixedDuePerDay) : "",
    dueDay: String(m.rentDueDay ?? 1),
    // Older backend responses (or hostels never configured) → existing behaviour.
    rentBillingMode: saved.rentBillingMode ?? "CALENDAR_MONTH",
  };
};

// Returns an error message, or null when the business model is valid.
const validateBm = (bm: BusinessModelForm): string | null => {
  if (!bm.propertyType)    return "Select the property type";
  if (!bm.rentBillingMode) return "Select the tenant rent cycle";
  if (bm.propertyType === "ROOM" && !bm.roomEbMode) return "Select the Room EB calculation";
  if (bm.propertyType === "FLAT" && !bm.flatEbMode) return "Select the Flat EB calculation";
  if (!bm.rentDueMode)     return "Select the rent due option";

  if (bm.propertyType === "ROOM") {
    if (bm.roomEbMode === "APPROXIMATE" && !(Number(bm.roomRate) > 0)) {
      return "Enter a valid EB rate for Approximate Room EB";
    }
    if (bm.roomEbMode === "FIXED" && !(Number(bm.roomFixed) > 0)) {
      return "Enter a valid fixed EB amount for Fixed Room EB";
    }
  }
  if (bm.propertyType === "FLAT") {
    if (bm.flatEbMode === "APPROXIMATE" && !(Number(bm.flatRate) > 0)) {
      return "Enter a valid EB rate for Approximate Flat EB";
    }
    if (bm.flatEbMode === "FIXED" && !(Number(bm.flatFixed) > 0)) {
      return "Enter a valid fixed EB amount for Fixed Flat EB";
    }
  }

  if (bm.rentDueMode === "FIXED_DUE" && !(Number(bm.dueAmount) > 0)) {
    return "Enter a valid due amount per day for Fixed Due";
  }
  const day = Number(bm.dueDay);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return "Rent due day must be a whole number between 1 and 28";
  }
  return null;
};

// Only the selected Property Type's settings are sent; the other type stays on the
// existing (Exactly) calculation. Within a mode, only that mode's value is sent —
// the other columns are sent as null so the backend clears them (e.g. switching
// Approximate → Fixed leaves the rate column NULL).
const buildBmPayload = (hostelId: number, bm: BusinessModelForm): BusinessModelRequest => {
  const isRoom = bm.propertyType === "ROOM";
  const roomEbMode: EbCalculationMode = isRoom ? (bm.roomEbMode || "EXACTLY") : "EXACTLY";
  const flatEbMode: EbCalculationMode = isRoom ? "EXACTLY" : (bm.flatEbMode || "EXACTLY");
  const rentDueMode: RentDueMode = bm.rentDueMode || "NO_DUE";
  return {
    hostelId,
    propertyType: bm.propertyType || "ROOM",

    roomEbMode,
    roomApproximateEbRate: roomEbMode === "APPROXIMATE" ? Number(bm.roomRate) : null,
    roomFixedEbAmount:     roomEbMode === "FIXED"       ? Number(bm.roomFixed) : null,

    flatEbMode,
    flatApproximateEbRate: flatEbMode === "APPROXIMATE" ? Number(bm.flatRate) : null,
    flatFixedEbAmount:     flatEbMode === "FIXED"       ? Number(bm.flatFixed) : null,
    flatApproximateEbAmount: null, // legacy column — superseded by flatFixedEbAmount

    rentDueMode,
    fixedDuePerDay: rentDueMode === "FIXED_DUE" ? Number(bm.dueAmount) : null,
    rentDueDay: Number(bm.dueDay),
    rentBillingMode: bm.rentBillingMode || "CALENDAR_MONTH",
  };
};

// Keeps digits and at most one decimal point.
const sanitizeDecimal = (v: string): string => {
  const cleaned = v.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
};

interface CombinedForm {
  name: string; address: string; city: string;
  totalBeds: string; duration: string; document: File | null;
  bedPrice: string;
  adminName: string; adminPhone: string; adminEmail: string;
  photos: File[]; // hostel gallery images (min MIN_HOSTEL_PHOTOS on create)
  bm: BusinessModelForm; // property type + rent cycle / EB / rent due configuration
}

const EMPTY_FORM: CombinedForm = {
  name: "", address: "", city: "",
  totalBeds: "", duration: "", document: null,
  bedPrice: "",
  adminName: "", adminPhone: "", adminEmail: "",
  photos: [],
  bm: { ...EMPTY_BM },
};

interface EditCombinedForm extends CombinedForm {
  adminPassword: string;
}

const EMPTY_EDIT_FORM: EditCombinedForm = {
  ...EMPTY_FORM,
  adminPassword: "",
};

const DURATION_OPTIONS: { label: string; months: number }[] = [
  { label: "1 Month",  months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year",   months: 12 },
];

const STATUS_ACTIONS: { status: "ACTIVE" | "INACTIVE" | "SUSPENDED"; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { status: "ACTIVE",    label: "Mark Active",    icon: CheckCircle2, color: C.success },
  { status: "INACTIVE",  label: "Mark Inactive",  icon: PauseCircle,  color: C.warning },
  { status: "SUSPENDED", label: "Suspend Hostel", icon: Ban,          color: C.danger },
];

const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const resolveDocumentUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = api.defaults.baseURL || "";
  let origin: string;
  try {
    origin = new URL(base, window.location.origin).origin;
  } catch {
    origin = window.location.origin;
  }
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

function PriceBadge({ bedPrice }: { bedPrice: number }) {
  if (!bedPrice) {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: C.subtle, background: "#f1f5f9", padding: "4px 10px", borderRadius: 6 }}>
        No Price Set
      </span>
    );
  }
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: C.success, background: "#f0fdf4", padding: "4px 10px", borderRadius: 6 }}>
      {formatINR(bedPrice)}/bed
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isAct = status === "Active";
  const isSus = status === "Suspended";
  const color = isAct ? C.success : isSus ? C.danger : C.warning;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{status}</span>
    </div>
  );
}

type EnrichedHostel = Omit<HostelAdmin, "status"> & {
  activeTenantCount: number;
  branchCount: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  capacityBeds: number;
  bedPrice: number;
  durationMonths: number;
  totalPrice: number;
  status: string;
  rawStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  city: string;
};

function AdminBadge({ hostel }: { hostel: EnrichedHostel }) {
  if (!hostel.adminId) {
    return <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No admin assigned</span>;
  }
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
        {hostel.adminName || hostel.adminEmail}
        {hostel.adminActive
          ? <ShieldCheck size={13} color={C.success} aria-label="Admin active" role="img" />
          : <ShieldOff size={13} color={C.danger} aria-label="Admin inactive" role="img" />}
      </div>
      <div style={{ fontSize: 12, color: C.muted }}>{hostel.adminEmail}</div>
    </div>
  );
}

const normalizeHostelStatus = (status?: string | null): string | undefined => {
  if (!status) return undefined;
  switch (status.toUpperCase()) {
    case "ACTIVE":    return "Active";
    case "INACTIVE":  return "Inactive";
    case "SUSPENDED": return "Suspended";
    default:          return status;
  }
};

const toRawHostelStatus = (status?: string | null): "ACTIVE" | "INACTIVE" | "SUSPENDED" => {
  const upper = (status || "").toUpperCase();
  if (upper === "INACTIVE" || upper === "SUSPENDED") return upper;
  return "ACTIVE";
};

// Safe numeric coercion for counts coming back from the API (number | string | null | undefined).
const toCount = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function buildHostelAdminPayload(
  base: Omit<HostelAdminRequest, "document">,
  document: File | null
): HostelAdminRequest | FormData {
  if (!document) return base;
  const fd = new FormData();
  Object.entries(base).forEach(([key, value]) => {
    if (value !== undefined && value !== null) fd.append(key, String(value));
  });
  fd.append("document", document);
  return fd;
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map(row => row.map(csvEscape).join(","));
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function TotalPricePreview({ totalBeds, bedPrice, durationMonths }: {
  totalBeds: string; bedPrice: string; durationMonths: string;
}) {
  const beds = Number(totalBeds) || 0;
  const price = Number(bedPrice) || 0;
  const months = Number(durationMonths) || 1;
  if (!beds || !price) return null;
  const total = beds * price * months;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
      padding: "8px 12px", marginTop: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.success, fontWeight: 600 }}>
        <Wallet size={14} aria-hidden="true" />
        {beds} beds × {formatINR(price)}/bed × {months} mo
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>{formatINR(total)}</div>
    </div>
  );
}

function HostelPhotosPicker({
  photos, onChange,
}: { photos: File[]; onChange: (files: File[]) => void }) {
  // Create object URLs once per photo list and revoke them on change/unmount.
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onChange([...photos, ...Array.from(fileList)]);
  };

  const removeAt = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  const belowMin = photos.length < MIN_HOSTEL_PHOTOS;

  return (
    <div>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        multiple
        aria-label="Upload hostel photos"
        className="rounded-full"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div style={{
        fontSize: 11, marginTop: 4, fontWeight: 600,
        color: belowMin ? C.danger : C.success,
      }}>
        {photos.length} / {MIN_HOSTEL_PHOTOS} minimum photos selected
        {belowMin ? ` — add ${MIN_HOSTEL_PHOTOS - photos.length} more` : ""}
      </div>

      {previews.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 4, marginTop: 6, maxWidth: 340 }}>
          {previews.map((url, idx) => (
            <div
              key={url}
              style={{
                position: "relative", aspectRatio: "1", borderRadius: 6,
                overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9",
              }}
            >
              <img src={url} alt={`Selected photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                title="Remove photo"
                aria-label={`Remove photo ${idx + 1}`}
                style={{
                  position: "absolute", top: 1, right: 1, width: 13, height: 13,
                  borderRadius: "50%", background: "rgba(15,23,42,0.75)", border: "none",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", padding: 0,
                }}
              >
                <XIcon size={8} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Business Model fields (shared by Add + Edit modals) — DROPDOWN UI   */
/* ------------------------------------------------------------------ */

interface BmSelectOption { value: string; label: string; description: string }

// Form-style dropdown: small label above, "Select …" placeholder inside, plain list of options.
// The description of the selected option is shown as a hint underneath.
function BmSelect({
  id, label, value, onValueChange, options, disabled, placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: BmSelectOption[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="h-bm-field h-bm-select-cell">
      <label htmlFor={id} className="h-bm-select-label">
        {label} <span className="h-bm-req" aria-hidden="true">*</span>
      </label>
      <div className="h-bm-select">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full" aria-label={label}>
            <SelectValue placeholder={placeholder ?? `Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected && <div className="h-bm-field-hint">{selected.description}</div>}
    </div>
  );
}

// Labelled numeric field with an optional prefix (₹) and hint line.
function BmField({
  id, label, prefix, hint, ...inputProps
}: { id: string; label: string; prefix?: string; hint?: string } & ComponentProps<typeof Input>) {
  return (
    <div className="h-bm-field">
      <label htmlFor={id} className="h-bm-field-label">{label}</label>
      <div className="h-bm-input-wrap">
        {prefix && <span className="h-bm-prefix" aria-hidden="true">{prefix}</span>}
        <Input id={id} className={prefix ? "has-prefix" : ""} {...inputProps} />
      </div>
      {hint && <div className="h-bm-field-hint">{hint}</div>}
    </div>
  );
}

const PROPERTY_TYPE_OPTIONS: BmSelectOption[] = [
  { value: "ROOM", label: "Room", description: "Tenant rent cycle, Room EB and rent due" },
  { value: "FLAT", label: "Flat", description: "Tenant rent cycle, Flat EB and rent due" },
];

const ROOM_EB_OPTIONS: BmSelectOption[] = [
  { value: "EXACTLY",     label: "Exactly",     description: "Use actual EB reading calculation" },
  { value: "APPROXIMATE", label: "Approximate", description: "Room units × EB rate, split by tenant occupancy days" },
  { value: "FIXED",       label: "Fixed",       description: "Fixed amount per room, split by tenant occupancy days" },
];

const FLAT_EB_OPTIONS: BmSelectOption[] = [
  { value: "EXACTLY",     label: "Exactly",     description: "Use actual Flat EB reading calculation" },
  { value: "APPROXIMATE", label: "Approximate", description: "Flat units × EB rate, split by tenant occupancy days" },
  { value: "FIXED",       label: "Fixed",       description: "Fixed amount per flat, split by tenant occupancy days" },
];

const RENT_DUE_OPTIONS: BmSelectOption[] = [
  { value: "NO_DUE",    label: "No Due",           description: "Never add a due amount (Due = ₹0)" },
  { value: "FIXED_DUE", label: "Due / Fixed Due",  description: "Fixed amount for each overdue day" },
];

function BusinessModelFields({
  idPrefix, value, onChange, disabled, status,
}: {
  idPrefix: string;
  value: BusinessModelForm;
  onChange: (next: BusinessModelForm) => void;
  disabled?: boolean;
  status?: "loading" | "error";
}) {
  const set = (patch: Partial<BusinessModelForm>) => onChange({ ...value, ...patch });
  const isRoom = value.propertyType === "ROOM";
  const isFlat = value.propertyType === "FLAT";

  const needsRoomRate  = isRoom && value.roomEbMode === "APPROXIMATE";
  const needsRoomFixed = isRoom && value.roomEbMode === "FIXED";
  const needsFlatRate  = isFlat && value.flatEbMode === "APPROXIMATE";
  const needsFlatFixed = isFlat && value.flatEbMode === "FIXED";
  const needsEbInput = needsRoomRate || needsRoomFixed || needsFlatRate || needsFlatFixed;
  const needsDueInput = value.rentDueMode === "FIXED_DUE";

  return (
    <div className="h-form-card h-form-card-compact h-bm-card">
      <div className="h-card-header">
        <Zap size={14} className="text-blue-600" aria-hidden="true" />
        <span>Business Model</span>
      </div>

      {status === "loading" && (
        <div className="h-bm-banner" role="status">
          <RefreshCw size={12} className="animate-spin" aria-hidden="true" /> Loading saved business model…
        </div>
      )}
      {status === "error" && (
        <div className="h-bm-banner error" role="alert">
          <Info size={12} aria-hidden="true" /> Couldn't load the saved business model — it won't be changed on save.
        </div>
      )}

      {/* 2 x 2 dropdowns: Property Type, Tenant Rent Cycle, Room/Flat EB, Rent Due */}
      <div className="h-bm-selects">
        <BmSelect
          id={`${idPrefix}-property-type`}
          label="Property Type"
          value={value.propertyType}
          onValueChange={(v) => set({ propertyType: v as PropertyType })}
          options={PROPERTY_TYPE_OPTIONS}
          disabled={disabled}
        />

        <BmSelect
          id={`${idPrefix}-rent-cycle`}
          label="Tenant Rent Cycle"
          value={value.rentBillingMode}
          onValueChange={(v) => set({ rentBillingMode: v as RentBillingMode })}
          options={RENT_CYCLE_OPTIONS}
          disabled={disabled}
        />

        {isFlat ? (
          <BmSelect
            id={`${idPrefix}-flat-eb-mode`}
            label="Flat EB"
            value={value.flatEbMode}
            onValueChange={(v) => set({ flatEbMode: v as EbCalculationMode })}
            options={FLAT_EB_OPTIONS}
            disabled={disabled}
          />
        ) : (
          <BmSelect
            id={`${idPrefix}-room-eb-mode`}
            label={isRoom ? "Room EB" : "EB Calculation"}
            value={value.roomEbMode}
            onValueChange={(v) => set({ roomEbMode: v as EbCalculationMode })}
            options={ROOM_EB_OPTIONS}
            disabled={disabled || !value.propertyType}
            placeholder={isRoom ? "Select Room EB" : "Select Property Type first"}
          />
        )}

        <BmSelect
          id={`${idPrefix}-rent-due-mode`}
          label="Rent Due"
          value={value.rentDueMode}
          onValueChange={(v) => set({ rentDueMode: v as RentDueMode })}
          options={RENT_DUE_OPTIONS}
          disabled={disabled}
        />
      </div>

      {/* Extra inputs — only when a chosen option needs them */}
      {(needsEbInput || needsDueInput) && (
        <div className="h-bm-extra">
          {needsRoomRate && (
            <BmField
              id={`${idPrefix}-room-rate`}
              label="Room EB rate per unit *"
              prefix="₹"
              placeholder="e.g. 8"
              inputMode="decimal"
              disabled={disabled}
              value={value.roomRate}
              onChange={(e) => set({ roomRate: sanitizeDecimal(e.target.value) })}
            />
          )}
          {needsRoomFixed && (
            <BmField
              id={`${idPrefix}-room-fixed`}
              label="Fixed Room EB amount *"
              prefix="₹"
              placeholder="e.g. 600"
              inputMode="decimal"
              disabled={disabled}
              value={value.roomFixed}
              onChange={(e) => set({ roomFixed: sanitizeDecimal(e.target.value) })}
            />
          )}
          {needsFlatRate && (
            <BmField
              id={`${idPrefix}-flat-rate`}
              label="Flat EB rate per unit *"
              prefix="₹"
              placeholder="e.g. 13"
              inputMode="decimal"
              disabled={disabled}
              value={value.flatRate}
              onChange={(e) => set({ flatRate: sanitizeDecimal(e.target.value) })}
            />
          )}
          {needsFlatFixed && (
            <BmField
              id={`${idPrefix}-flat-fixed`}
              label="Fixed Flat EB amount *"
              prefix="₹"
              placeholder="e.g. 3000"
              inputMode="decimal"
              disabled={disabled}
              value={value.flatFixed}
              onChange={(e) => set({ flatFixed: sanitizeDecimal(e.target.value) })}
            />
          )}
          {needsDueInput && (
            <>
              <BmField
                id={`${idPrefix}-due-amount`}
                label="Due amount per day *"
                prefix="₹"
                placeholder="e.g. 100"
                inputMode="decimal"
                disabled={disabled}
                value={value.dueAmount}
                onChange={(e) => set({ dueAmount: sanitizeDecimal(e.target.value) })}
              />
              <BmField
                id={`${idPrefix}-due-day`}
                label="Rent due day (1–28) *"
                hint={
                  value.rentBillingMode === "JOINING_DATE_CYCLE"
                    ? "Not used in Joining-date cycle — rent falls due on each cycle's start date"
                    : "Day of the month rent falls due"
                }
                placeholder="1"
                inputMode="numeric"
                maxLength={2}
                disabled={disabled}
                value={value.dueDay}
                onChange={(e) => set({ dueDay: e.target.value.replace(/\D/g, "") })}
              />
            </>
          )}
        </div>
      )}

      {/* Worked example — appears once a Tenant Rent Cycle is selected */}
      {value.rentBillingMode && (
        <BusinessModelRentBilling idPrefix={`${idPrefix}-billing`} value={value.rentBillingMode} />
      )}
    </div>
  );
}

const HostelAdminPage = () => {
  const [hostels, setHostels] = useState<HostelAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [showFilters, setShowFilters] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CombinedForm>(EMPTY_FORM);
  const [editHostel, setEditHostel] = useState<EnrichedHostel | null>(null);
  const [editForm, setEditForm] = useState<EditCombinedForm>(EMPTY_EDIT_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal: the business model is fetched separately when the modal opens.
  // `bmLoaded` guards against overwriting a saved model with defaults if the fetch fails.
  const [bmLoading, setBmLoading] = useState(false);
  const [bmLoaded, setBmLoaded] = useState(false);
  const bmRequestRef = useRef(0);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewHostel, setViewHostel] = useState<EnrichedHostel | null>(null);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const err = (e: any, fallback: string) =>
    toast.error(e?.response?.data?.message || e?.message || fallback);

  // `silent` = background refresh: no full-table loading state and no error toast,
  // so counts can be re-fetched without flicker.
  // NOTE: always call as loadData() or loadData(true). If you ever pass it directly
  // as an event handler, wrap it: onClick={() => loadData()}.
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const hList = await fetchAllPages<HostelAdmin>(
        (pg, size) => getAllHostelsWithAdmins(pg, size), 10
      );
      setHostels(hList);
    } catch {
      if (!silent) toast.error("Failed to load hostels");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Re-fetch branch / room / bed / tenant counts when the user returns to this
  // tab or window (e.g. after an admin has added branches or tenants elsewhere).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadData(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadData]);

  const enrichedHostels: EnrichedHostel[] = hostels.map((h) => {
    const capacityBeds = toCount(h.capacityBeds);
    const bedPrice = Number(h.bedPrice) || 0;
    const durationMonths = Number(h.durationMonths) || 1;

    return {
      ...h,
      activeTenantCount: toCount((h as any).activeTenantCount),
      branchCount: toCount(h.branchCount),
      totalRooms: toCount(h.totalRooms),
      totalBeds: toCount(h.totalBeds),
      occupiedBeds: toCount(h.occupiedBeds),
      capacityBeds,
      bedPrice,
      durationMonths,
      totalPrice: capacityBeds * bedPrice * durationMonths,
      status: normalizeHostelStatus(h.status) || "Active",
      rawStatus: toRawHostelStatus(h.status),
      city: h.city || "—",
    };
  });

  const filteredHostels = enrichedHostels.filter(h => {
    if (searchTerm &&
        !h.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(h.adminName || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(h.adminEmail || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== "All Status" && h.status !== statusFilter) return false;
    if (cityFilter !== "All Cities" && h.city !== cityFilter) return false;
    return true;
  });

  const totalItems = filteredHostels.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedHostels = filteredHostels.slice((page - 1) * pageSize, page * pageSize);

  const cities = Array.from(new Set(enrichedHostels.map(h => h.city).filter(c => c && c !== "—")));

  const handleExport = useCallback(() => {
    if (filteredHostels.length === 0) {
      toast.error("No hostels to export — adjust your filters and try again");
      return;
    }
    const headers = [
      "Hostel Name", "Address", "City", "Price/Bed", "Duration (Months)", "Bed Capacity", "Total Beds", "Total Price",
      "Admin Name", "Admin Email", "Admin Phone", "Admin Active",
      "Status", "Branches", "Tenants", "Rooms", "Occupied Beds",
    ];
    const rows = filteredHostels.map(h => [
      h.name,
      h.address || "",
      h.city === "—" ? "" : h.city,
      h.bedPrice,
      h.durationMonths,
      h.capacityBeds,
      h.totalBeds,
      h.totalPrice,
      h.adminName || "",
      h.adminEmail || "",
      h.adminPhone || "",
      h.adminId ? (h.adminActive ? "Yes" : "No") : "",
      h.status,
      h.branchCount,
      h.activeTenantCount,
      h.totalRooms,
      h.occupiedBeds,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`hostels-admins-${stamp}.csv`, headers, rows);
    toast.success(`Exported ${filteredHostels.length} hostel${filteredHostels.length === 1 ? "" : "s"}`);
  }, [filteredHostels]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, bm: { ...EMPTY_BM } });
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.name.trim())         { toast.error("Hostel name required"); return; }
    if (!form.address.trim())      { toast.error("Address required"); return; }
    if (!form.city.trim())         { toast.error("City required"); return; }
    if (!form.totalBeds || Number(form.totalBeds) <= 0) { toast.error("Total beds required"); return; }
    if (!form.duration)            { toast.error("Duration required"); return; }
    if (!form.bedPrice || Number(form.bedPrice) <= 0) { toast.error("Price per bed is required"); return; }
    if (!form.adminName.trim())    { toast.error("Admin name required"); return; }
    if (!/^\d{10}$/.test(form.adminPhone)) { toast.error("Admin phone must be 10 digits"); return; }
    if (!form.adminEmail.trim())   { toast.error("Admin email required"); return; }
    // Require at least MIN_HOSTEL_PHOTOS hostel gallery photos before creating.
    if (form.photos.length < MIN_HOSTEL_PHOTOS) {
      toast.error(`Please add at least ${MIN_HOSTEL_PHOTOS} hostel photos`);
      return;
    }
    const bmError = validateBm(form.bm);
    if (bmError) { toast.error(bmError); return; }

    setSubmitting(true);
    try {
      const payload = buildHostelAdminPayload({
        name: form.name, address: form.address, city: form.city,
        totalBeds: Number(form.totalBeds), durationMonths: Number(form.duration),
        bedPrice: Number(form.bedPrice),
        adminName: form.adminName, adminPhone: form.adminPhone,
        adminEmail: form.adminEmail,
      }, form.document);
      const created = await createHostelWithAdmin(payload);
      const createdId = (created as any).id as number;

      try {
        await uploadHostelImages(createdId, form.photos);
      } catch {
        toast.error("Hostel created, but photo upload failed — you can add photos later from Edit");
      }

      // Save the business model for the new hostel.
      try {
        await saveBusinessModel(buildBmPayload(createdId, form.bm));
      } catch {
        toast.error("Hostel created, but the business model could not be saved — set it again from Edit");
      }

      toast.success("Hostel created — login details emailed to the admin");
      setForm({ ...EMPTY_FORM, bm: { ...EMPTY_BM } });
      setAddOpen(false);
      loadData();
    } catch (e: any) { err(e, "Create failed"); }
    finally { setSubmitting(false); }
  };

  const openEdit = (h: EnrichedHostel) => {
    setEditHostel(h);
    setEditForm({
      name: h.name, address: h.address, city: h.city || "",
      totalBeds: h.capacityBeds ? String(h.capacityBeds) : "",
      duration: h.durationMonths ? String(h.durationMonths) : "",
      document: null,
      bedPrice: h.bedPrice ? String(h.bedPrice) : "",
      adminName: h.adminName || "", adminPhone: h.adminPhone || "", adminEmail: h.adminEmail || "",
      adminPassword: "",
      photos: [],
      bm: { ...EMPTY_BM },
    });
    setEditOpen(true);

    // Load this hostel's saved business model (ignore stale responses).
    const reqId = ++bmRequestRef.current;
    setBmLoading(true);
    setBmLoaded(false);
    getBusinessModel(h.id)
      .then((m) => {
        if (bmRequestRef.current !== reqId) return;
        setEditForm((p) => ({ ...p, bm: toBmForm(m) }));
        setBmLoaded(true);
      })
      .catch(() => {
        if (bmRequestRef.current !== reqId) return;
        toast.error("Failed to load business model — it will not be changed on save");
      })
      .finally(() => {
        if (bmRequestRef.current === reqId) setBmLoading(false);
      });
  };

  const handleEdit = async () => {
    if (!editHostel) return;
    if (!editForm.name.trim())    { toast.error("Hostel name required"); return; }
    if (!editForm.address.trim()) { toast.error("Address required"); return; }
    if (!editForm.city.trim())    { toast.error("City required"); return; }
    if (!editForm.totalBeds || Number(editForm.totalBeds) <= 0) { toast.error("Total beds required"); return; }
    if (!editForm.duration)       { toast.error("Duration required"); return; }
    if (!editForm.bedPrice || Number(editForm.bedPrice) <= 0) { toast.error("Price per bed is required"); return; }
    if (!editForm.adminName.trim()) { toast.error("Admin name required"); return; }
    if (!/^\d{10}$/.test(editForm.adminPhone)) { toast.error("Admin phone must be 10 digits"); return; }
    if (!editForm.adminEmail.trim()) { toast.error("Admin email required"); return; }

    const existingBedFloor = Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0);
    if (existingBedFloor > 0 && Number(editForm.totalBeds) < existingBedFloor) {
      toast.error(
        `Cannot reduce the bed limit to ${editForm.totalBeds} because ${existingBedFloor} beds have already been created. The bed limit must be at least ${existingBedFloor}.`
      );
      return;
    }

    // Only validate/save the business model if it was loaded successfully.
    if (bmLoaded) {
      const bmError = validateBm(editForm.bm);
      if (bmError) { toast.error(bmError); return; }
    }

    setSubmitting(true);
    try {
      const payload = buildHostelAdminPayload({
        name: editForm.name, address: editForm.address, city: editForm.city,
        totalBeds: Number(editForm.totalBeds), durationMonths: Number(editForm.duration),
        bedPrice: Number(editForm.bedPrice),
        adminName: editForm.adminName, adminPhone: editForm.adminPhone,
        adminEmail: editForm.adminEmail,
        adminPassword: editForm.adminPassword || undefined,
      }, editForm.document);
      await updateHostelWithAdmin(editHostel.id, payload);

      // Additive photo upload (appends to the existing gallery).
      if (editForm.photos.length > 0) {
        try {
          await uploadHostelImages(editHostel.id, editForm.photos);
        } catch {
          toast.error("Hostel updated, but photo upload failed");
        }
      }

      if (bmLoaded) {
        try {
          await saveBusinessModel(buildBmPayload(editHostel.id, editForm.bm));
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? "Hostel updated, but the business model could not be saved");
        }
      }

      toast.success("Hostel updated");
      setEditOpen(false);
      setEditHostel(null);
      loadData();
    } catch (e: any) { err(e, "Update failed"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHostelWithAdmin(id);
      toast.success("Hostel deleted");
      loadData();
    } catch (e: any) { err(e, "Delete failed — a hostel with branches assigned to it cannot be deleted"); }
  };

  const handleStatusChange = async (h: EnrichedHostel, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") => {
    if (h.rawStatus === status) return;
    setStatusUpdatingId(h.id);
    try {
      await updateHostelStatus(h.id, status);
      toast.success(`${h.name} marked ${normalizeHostelStatus(status)}`);
      loadData();
    } catch (e: any) {
      err(e, "Failed to update hostel status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openView = (h: EnrichedHostel) => { setViewHostel(h); setViewOpen(true); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .h-wrap { font-family: 'Inter', sans-serif; min-height: 100%; color: #0f172a; }
        .h-panel { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); overflow: hidden; }
        .h-panel-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .h-panel-title { font-size: 18px; font-weight: 700; }
        .h-panel-actions { display: flex; align-items: center; gap: 10px; }
        .h-btn-outline { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: ${C.subtle}; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .h-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
        .h-btn-outline.active { background: #eff6ff; border-color: #bfdbfe; color: ${C.primaryHover}; }
        .h-btn-primary { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 999px; background: ${C.primary}; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; }
        .h-btn-primary:hover { background: ${C.primaryHover}; }
        .h-btn-outline:focus-visible, .h-btn-primary:focus-visible, .h-action-btn:focus-visible,
        .h-page-btn:focus-visible, .h-clear-filters:focus-visible, .h-filter-select:focus-visible { outline: 2px solid ${C.primary}; outline-offset: 2px; }
        .h-filters { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; background: #fff; }
        .h-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .h-search-box { flex: 1; min-width: 260px; height: 38px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; display: flex; align-items: center; padding: 0 16px; gap: 8px; }
        .h-search-box input { border: none; outline: none; width: 100%; font-size: 13px; font-family: inherit; color: #0f172a; }
        .h-search-box input::placeholder { color: ${C.muted}; }
        .h-filter-select { height: 38px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; padding: 0 16px; font-size: 13px; font-weight: 500; color: ${C.subtle}; display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; min-width: 130px; }
        .h-filter-label { font-size: 10px; color: ${C.muted}; text-transform: uppercase; font-weight: 700; margin-left: 2px; }
        .h-clear-filters { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 13px; font-weight: 600; color: ${C.subtle}; background: transparent; border: none; cursor: pointer; font-family: inherit; }
        .h-clear-filters:hover { color: #0f172a; }
        .h-table-wrap { width: 100%; overflow-x: auto; }
        .h-table { width: 100%; border-collapse: collapse; min-width: 950px; }
        .h-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${C.subtle}; border-bottom: 1px solid #e2e8f0; background: #fff; }
        .h-table td { padding: 16px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .h-table tr:last-child td { border-bottom: none; }
        .h-table tr:hover td { background: #f8fafc; }
        .h-cell-hostel { display: flex; align-items: center; gap: 14px; }
        .h-cell-icon { width: 40px; height: 40px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .h-cell-name { font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 2px; }
        .h-cell-sub { font-size: 12px; color: ${C.muted}; }
        .h-cell-tenants { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 13px; }
        .h-actions { display: flex; align-items: center; gap: 6px; }
        .h-action-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${C.subtle}; transition: all 0.2s; padding: 0; }
        .h-action-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
        .h-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .h-pagination { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 0 0 16px 16px; }
        .h-page-info { font-size: 13px; color: ${C.subtle}; }
        .h-page-info strong { color: #0f172a; }
        .h-page-controls { display: flex; align-items: center; gap: 8px; }
        .h-page-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; font-weight: 500; color: ${C.subtle}; transition: all 0.2s; padding: 0; }
        .h-page-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .h-page-btn:disabled { cursor: not-allowed; }
        .h-page-btn.active { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 600; }
        .h-page-btn[style*="auto"] { border-radius: 999px; }
        .h-view-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .h-view-label { font-size: 12px; color: ${C.muted}; font-weight: 600; }
        .h-view-value { font-size: 13px; color: #0f172a; font-weight: 500; }
        .h-view-value.price { color: ${C.success}; font-weight: 700; }
        .h-view-doc-link { font-size: 13px; font-weight: 600; color: ${C.primary}; display: flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: none; }
        .h-view-doc-link:hover { text-decoration: underline; }

        /* Modal Rounded & Landscape Layout Styles. */
        .h-modal-rounded {
          border-radius: 20px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          max-height: 92vh;
          /* Hide the scrollbar so it no longer cuts into the rounded right corners.
             The modal still scrolls with the mouse wheel / trackpad / touch. */
          scrollbar-width: none;          /* Firefox */
          -ms-overflow-style: none;       /* old Edge / IE */
        }
        .h-modal-rounded::-webkit-scrollbar {
          display: none;                  /* Chrome, Brave, Edge, Safari */
          width: 0;
          height: 0;
        }

        .h-landscape-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 6px;
        }

        .h-form-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .h-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #334155;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
        }

        .h-card-inputs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .h-card-inputs .h-full {
          grid-column: span 2;
        }

        .h-card-inputs input,
        .h-card-inputs button[role="combobox"] {
          border-radius: 999px !important;
          background: #ffffff !important;
          height: 34px !important;
          font-size: 12.5px !important;
        }

        @media (max-width: 768px) {
          .h-landscape-grid {
            grid-template-columns: 1fr;
          }
        }

        .h-landscape-grid-compact {
          gap: 12px;
        }

        .h-form-card-compact {
          padding: 10px;
          gap: 6px;
        }

        .h-form-card-compact .h-card-inputs {
          gap: 6px;
        }

        .h-form-card-compact .h-card-header {
          padding-bottom: 5px;
        }

        @media (max-width: 768px) {
          .h-landscape-grid-compact {
            grid-template-columns: 1fr;
          }
        }

        /* Business Model card (Property Type → Tenant Rent Cycle / Room or Flat EB / Rent Due) */
        .h-bm-card { margin-top: 12px; }

        .h-bm-property { margin-bottom: 10px; }

        /* All four dropdowns in a 2 x 2 grid at the top of the card */
        .h-bm-selects {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .h-bm-select-cell { gap: 4px; min-width: 0; }
        .h-bm-select-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: #475569; padding-left: 2px;
        }
        .h-bm-req { color: #dc2626; }
        .h-bm-extra {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          padding: 10px;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
        }

        .h-bm-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .h-bm-block-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .h-bm-icon {
          width: 24px; height: 24px; border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Extra inputs shown only when the dropdown needs them */
        .h-bm-inputs {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px dashed #e2e8f0;
        }

        .h-bm-field { display: flex; flex-direction: column; gap: 3px; }
        .h-bm-field-label { font-size: 11px; font-weight: 600; color: ${C.subtle}; padding-left: 4px; }
        .h-bm-field-hint  { font-size: 10.5px; color: ${C.muted}; padding-left: 4px; }

        /* Dropdown trigger styling (matches the other rounded inputs) */
        .h-bm-select button[role="combobox"] {
          border-radius: 999px !important;
          background: #ffffff !important;
          height: 34px !important;
          font-size: 12.5px !important;
          font-weight: 500;
        }

        .h-bm-input-wrap { position: relative; }
        .h-bm-prefix {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          font-size: 12.5px; font-weight: 600; color: ${C.muted}; pointer-events: none;
        }
        .h-bm-input-wrap input {
          border-radius: 999px !important;
          background: #ffffff !important;
          height: 34px !important;
          font-size: 12.5px !important;
        }
        .h-bm-input-wrap input.has-prefix { padding-left: 26px !important; }

        .h-bm-banner {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 500; color: ${C.subtle};
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
          padding: 6px 10px;
        }
        .h-bm-banner.error { background: #fef2f2; border-color: #fecaca; color: ${C.danger}; }

        .h-bm-note {
          display: flex; align-items: flex-start; gap: 6px;
          font-size: 11px; color: ${C.subtle};
        }

        @media (max-width: 768px) {
          .h-bm-selects { grid-template-columns: 1fr; }
        }

        /* Keep the radios inside BusinessModelRentBilling (still radio cards) perfectly round */
        .h-bm-option [role="radio"] {
          flex: 0 0 16px !important;
          width: 16px !important;
          height: 16px !important;
          min-width: 16px !important;
          min-height: 16px !important;
          max-width: 16px !important;
          max-height: 16px !important;
          aspect-ratio: 1 / 1;
          padding: 0 !important;
          margin-top: 2px;
          border-radius: 50% !important;
        }
        .h-bm-option [role="radio"] > span {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="h-wrap">
        <div className="h-panel">
          <div className="h-panel-header">
            <div className="h-panel-title">All Hostels</div>
            <div className="h-panel-actions">
              <button
                type="button"
                className={`h-btn-outline ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(v => !v)}
                aria-pressed={showFilters}
                title={showFilters ? "Hide filters" : "Show filters"}
              >
                <Filter size={16} aria-hidden="true" /> Filter
              </button>
              <button type="button" className="h-btn-outline" onClick={handleExport}>
                <Download size={16} aria-hidden="true" /> Export
              </button>
              <button type="button" className="h-btn-primary" onClick={openAdd}>
                <Plus size={16} aria-hidden="true" /> Add Hostel
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="h-filters">
              <div className="h-search-box">
                <Search size={16} color={C.muted} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search hostels or admins..."
                  aria-label="Search hostels or admins"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>

              <div className="h-filter-group">
                <div className="h-filter-label">Status</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="h-filter-select" aria-label={`Filter by status: ${statusFilter}`}>
                      {statusFilter} <ChevronDown size={14} color={C.muted} aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["All Status", "Active", "Inactive", "Suspended"].map(s => (
                      <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="h-filter-group">
                <div className="h-filter-label">City</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="h-filter-select" aria-label={`Filter by city: ${cityFilter}`}>
                      {cityFilter} <ChevronDown size={14} color={C.muted} aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["All Cities", ...cities].map(c => (
                      <DropdownMenuItem key={c} onClick={() => { setCityFilter(c!); setPage(1); }}>{c}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button type="button" className="h-clear-filters" onClick={() => {
                setSearchTerm(""); setStatusFilter("All Status"); setCityFilter("All Cities"); setPage(1);
              }}>
                <RefreshCw size={14} aria-hidden="true" /> Clear Filters
              </button>
            </div>
          )}

          {/* Table View */}
          <div className="h-table-wrap">
            <table className="h-table">
              <thead>
                <tr>
                  <th>Hostel & Location</th>
                  <th>Pricing & Duration</th>
                  <th>Assigned Admin</th>
                  <th>Beds / Capacity</th>
                  <th>Branches & Tenants</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: C.muted }}>
                      Loading hostels...
                    </td>
                  </tr>
                ) : paginatedHostels.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: C.muted }}>
                      No hostels found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedHostels.map((h, idx) => {
                    const iconBg = ["#eff6ff", "#f0fdf4", "#fef3c7"][idx % 3];
                    const iconColor = ["#2563eb", "#16a34a", "#d97706"][idx % 3];
                    return (
                      <tr key={h.id}>
                        <td>
                          <div className="h-cell-hostel">
                            <div className="h-cell-icon" style={{ background: iconBg }}>
                              <Building2 size={20} color={iconColor} aria-hidden="true" />
                            </div>
                            <div>
                              <div className="h-cell-name">{h.name}</div>
                              <div className="h-cell-sub">{h.city} • {h.address}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <PriceBadge bedPrice={h.bedPrice} />
                            <div className="h-cell-sub" style={{ marginTop: 4 }}>
                              {h.durationMonths} month{h.durationMonths === 1 ? "" : "s"} plan
                            </div>
                          </div>
                        </td>
                        <td>
                          <AdminBadge hostel={h} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {h.occupiedBeds} / {h.capacityBeds || h.totalBeds} occupied
                          </div>
                          <div className="h-cell-sub">
                            {h.totalRooms} room{h.totalRooms === 1 ? "" : "s"} total
                          </div>
                        </td>
                        <td>
                          <div className="h-cell-tenants">
                            <Users size={14} color={C.subtle} aria-hidden="true" />
                            <span>{h.activeTenantCount} Tenant{h.activeTenantCount === 1 ? "" : "s"}</span>
                          </div>
                          <div className="h-cell-sub">{h.branchCount} branch{h.branchCount === 1 ? "" : "es"}</div>
                        </td>
                        <td>
                          <StatusBadge status={h.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="h-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="h-action-btn"
                              title="View Details"
                              aria-label={`View details for ${h.name}`}
                              onClick={() => openView(h)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="h-action-btn"
                              title="Edit Hostel"
                              aria-label={`Edit ${h.name}`}
                              onClick={() => openEdit(h)}
                            >
                              <Pencil size={15} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="h-action-btn"
                                  title="More actions"
                                  aria-label={`More actions for ${h.name}`}
                                  disabled={statusUpdatingId === h.id}
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {STATUS_ACTIONS.map(action => (
                                  <DropdownMenuItem
                                    key={action.status}
                                    onClick={() => handleStatusChange(h, action.status)}
                                    disabled={h.rawStatus === action.status}
                                  >
                                    <action.icon size={14} style={{ color: action.color, marginRight: 8 }} aria-hidden="true" />
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(h.id)}
                                  style={{ color: C.danger }}
                                >
                                  <Trash2 size={14} style={{ marginRight: 8 }} aria-hidden="true" />
                                  Delete Hostel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <nav className="h-pagination" aria-label="Hostel list pagination">
            <div className="h-page-info">
              Showing <strong>{totalItems === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{" "}
              <strong>{Math.min(page * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> hostels
            </div>
            <div className="h-page-controls">
              <button
                type="button"
                className="h-page-btn"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`h-page-btn ${page === pageNum ? "active" : ""}`}
                    aria-label={`Page ${pageNum}`}
                    aria-current={page === pageNum ? "page" : undefined}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                className="h-page-btn"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md h-modal-rounded rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{viewHostel?.name}</DialogTitle>
            <DialogDescription>{viewHostel?.address}, {viewHostel?.city}</DialogDescription>
          </DialogHeader>

          {viewHostel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "12px 0" }}>
              <div className="h-view-row">
                <span className="h-view-label">Status</span>
                <StatusBadge status={viewHostel.status} />
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Price Per Bed</span>
                <span className="h-view-value price">{formatINR(viewHostel.bedPrice)}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Plan Duration</span>
                <span className="h-view-value">{viewHostel.durationMonths} Months</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Bed Capacity / Occupied</span>
                <span className="h-view-value">{viewHostel.occupiedBeds} / {viewHostel.capacityBeds}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Branches</span>
                <span className="h-view-value">{viewHostel.branchCount}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Active Tenants</span>
                <span className="h-view-value">{viewHostel.activeTenantCount}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Total Projection</span>
                <span className="h-view-value">{formatINR(viewHostel.totalPrice)}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Assigned Admin</span>
                <span className="h-view-value">{viewHostel.adminName || "None"} ({viewHostel.adminEmail || "N/A"})</span>
              </div>
              {viewHostel.documentUrl && (
                <div className="h-view-row">
                  <span className="h-view-label">Registration Document</span>
                  <a
                    href={resolveDocumentUrl(viewHostel.documentUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="h-view-doc-link"
                  >
                    <FileText size={14} aria-hidden="true" /> View File
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl h-modal-rounded rounded-[24px] mobile-form-dialog">
          <DialogHeader>
            <DialogTitle>Add Hostel</DialogTitle>
            <DialogDescription>Create a new hostel, its admin and its business model in one step</DialogDescription>
          </DialogHeader>

          <div className="h-landscape-grid h-landscape-grid-compact">
            {/* Left Column: Hostel Details + Hostel Images */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <BedDouble size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Hostel Details</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Hostel Name *"
                      aria-label="Hostel name"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City *"
                      aria-label="City"
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Total Beds *"
                      aria-label="Total beds"
                      inputMode="numeric"
                      value={form.totalBeds}
                      onChange={e => setForm(p => ({ ...p, totalBeds: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Address *"
                      aria-label="Address"
                      value={form.address}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select value={form.duration} onValueChange={v => setForm(p => ({ ...p, duration: v }))}>
                      <SelectTrigger className="w-full" aria-label="Plan duration">
                        <SelectValue placeholder="Duration *" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.months} value={String(opt.months)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="Price per Bed (₹) *"
                      aria-label="Price per bed in rupees"
                      inputMode="numeric"
                      value={form.bedPrice}
                      onChange={e => setForm(p => ({ ...p, bedPrice: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                </div>
                <TotalPricePreview
                  totalBeds={form.totalBeds}
                  bedPrice={form.bedPrice}
                  durationMonths={form.duration}
                />
              </div>

              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <ImageIcon size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Hostel Images *</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <HostelPhotosPicker
                      photos={form.photos}
                      onChange={(photos) => setForm(p => ({ ...p, photos }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Admin & Document Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <User size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Admin Information</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Admin Name *"
                      aria-label="Admin name"
                      value={form.adminName}
                      onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Admin Phone (10 digits) *"
                      aria-label="Admin phone, 10 digits"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.adminPhone}
                      onChange={e => setForm(p => ({ ...p, adminPhone: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="email"
                      placeholder="Admin Email *"
                      aria-label="Admin email"
                      value={form.adminEmail}
                      onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <FileUp size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Document Attachment</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      aria-label="Attach registration document"
                      className="rounded-full"
                      onChange={e => setForm(p => ({ ...p, document: e.target.files?.[0] ?? null }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Model (full width) */}
          <BusinessModelFields
            idPrefix="add-bm"
            value={form.bm}
            onChange={(bm) => setForm(p => ({ ...p, bm }))}
            disabled={submitting}
          />

          <DialogFooter className="mt-3">
            <Button variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl h-modal-rounded rounded-[24px] mobile-form-dialog">
          <DialogHeader>
            <DialogTitle>Edit Hostel</DialogTitle>
            <DialogDescription>Update property details, business model or assigned administrator.</DialogDescription>
          </DialogHeader>

          <div className="h-landscape-grid h-landscape-grid-compact">
            {/* Left Column: Hostel Details + Hostel Images */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <BedDouble size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Hostel Details</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Hostel Name *"
                      aria-label="Hostel name"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City *"
                      aria-label="City"
                      value={editForm.city}
                      onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Total Beds *"
                      aria-label="Total beds"
                      inputMode="numeric"
                      value={editForm.totalBeds}
                      onChange={e => setEditForm(p => ({ ...p, totalBeds: e.target.value.replace(/\D/g, "") }))}
                    />
                    {editHostel && Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0) > 0 && (() => {
                      const floor = Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0);
                      const belowFloor = editForm.totalBeds !== "" && Number(editForm.totalBeds) < floor;
                      return (
                        <div style={{ fontSize: 11, color: belowFloor ? C.danger : C.muted, marginTop: 4, paddingLeft: 4, fontWeight: belowFloor ? 600 : 400 }}>
                          {belowFloor
                            ? `Can't go below ${floor} — ${floor} beds already created`
                            : `Min ${floor} — already created`}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Address *"
                      aria-label="Address"
                      value={editForm.address}
                      onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select value={editForm.duration} onValueChange={v => setEditForm(p => ({ ...p, duration: v }))}>
                      <SelectTrigger className="w-full" aria-label="Plan duration">
                        <SelectValue placeholder="Duration *" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.months} value={String(opt.months)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="Price per Bed (₹) *"
                      aria-label="Price per bed in rupees"
                      inputMode="numeric"
                      value={editForm.bedPrice}
                      onChange={e => setEditForm(p => ({ ...p, bedPrice: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                </div>
                <TotalPricePreview
                  totalBeds={editForm.totalBeds}
                  bedPrice={editForm.bedPrice}
                  durationMonths={editForm.duration}
                />
              </div>

              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <ImageIcon size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Add More Images</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      multiple
                      aria-label="Upload more hostel photos"
                      className="rounded-full"
                      onChange={e => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length === 0) return;
                        setEditForm(p => ({ ...p, photos: [...p.photos, ...files] }));
                        e.target.value = "";
                      }}
                    />
                    {editForm.photos.length > 0 && (
                      <div style={{ fontSize: 11, color: C.success, marginTop: 6, fontWeight: 600 }}>
                        {editForm.photos.length} new photo{editForm.photos.length === 1 ? "" : "s"} ready to upload
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Admin & Document Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <User size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Admin Information</span>
                </div>
                <div className="h-card-inputs">
                  <div>
                    <Input
                      placeholder="Admin Name *"
                      aria-label="Admin name"
                      value={editForm.adminName}
                      onChange={e => setEditForm(p => ({ ...p, adminName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Admin Phone *"
                      aria-label="Admin phone, 10 digits"
                      inputMode="numeric"
                      maxLength={10}
                      value={editForm.adminPhone}
                      onChange={e => setEditForm(p => ({ ...p, adminPhone: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="email"
                      placeholder="Admin Email *"
                      aria-label="Admin email"
                      value={editForm.adminEmail}
                      onChange={e => setEditForm(p => ({ ...p, adminEmail: e.target.value }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="password"
                      placeholder="Reset Password (Optional)"
                      aria-label="Reset admin password (optional)"
                      value={editForm.adminPassword}
                      onChange={e => setEditForm(p => ({ ...p, adminPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <FileUp size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Document Attachment</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      aria-label="Attach registration document"
                      className="rounded-full"
                      onChange={e => setEditForm(p => ({ ...p, document: e.target.files?.[0] ?? null }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Model (full width) — disabled until loaded */}
          <BusinessModelFields
            idPrefix="edit-bm"
            value={editForm.bm}
            onChange={(bm) => setEditForm(p => ({ ...p, bm }))}
            disabled={submitting || bmLoading || !bmLoaded}
            status={bmLoading ? "loading" : !bmLoaded ? "error" : undefined}
          />

          <DialogFooter className="mt-3">
            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              className="rounded-full bg-blue-600 hover:bg-blue-700"
              onClick={handleEdit}
              disabled={submitting || bmLoading}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostelAdminPage;