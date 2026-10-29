import { useEffect, useMemo, useState, useRef, useCallback, useReducer } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addTenant, updateTenant, deleteTenant,
  importTenantsExcel, getUserRole, getBranchId,
  checkFraud, markAbsconded,
  getPendingTenants, approveAndAllocateTenant,
  cancelCheckoutNotice, fetchTenantsInNoticePeriod,
  transferTenantRoomBed, getTenantTransferHistory, extractTenantDocument,
} from "@/lib/store";
import { Room, Bed, Tenant, IdProofType, Branch, FraudCheckResponse, TenantStay, TenantTransferRequest, TenantTransferResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription, DialogClose, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus, Eye, Search, Pencil, Trash2, FileText,
  AlertTriangle, ShieldX, Phone, Camera, User as UserIcon,
  Users, ShieldCheck, UserX, FileCheck2,
  Download, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Check, X, ClipboardCheck,
  CalendarClock, Ban, ArrowRightCircle, MoreHorizontal, CalendarDays,
  ArrowLeftRight, History, Loader2,
} from "lucide-react";
import api from "@/lib/api";
import CheckoutReportButton from "@/components/CheckoutReportButton";

/* ── Constants ──────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE     = 10;

const REF_DATA_PAGE_SIZE = 10;

const REF_DATA_BULK_PAGE_SIZE = 10;

const REF_DATA_CACHE_MS = 20_000;

const PHONE_LENGTH = 10;
const sanitizePhoneInput = (raw: string) => raw.replace(/\D/g, "").slice(0, PHONE_LENGTH);
const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

const getTodayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getApiOrigin = (): string => {
  const base = api.defaults.baseURL ?? "";
  try { return new URL(base).origin; } catch { return ""; }
};

/* Converts a "data:image/jpeg;base64,..." URL (the face photo returned by the
   OCR endpoint) into a File so it can go through the normal tenantPhoto upload. */
const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
  try {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
};

const isBedOccupied = (b: any): boolean => {
  const raw = b?.isOccupied ?? b?.occupied ?? b?.is_occupied;
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
};

const computeDailyTotal = (noOfDays: string, amountPerDay: string, advanceEbAmount: string) => {
  const days  = Number(noOfDays)        || 0;
  const rate  = Number(amountPerDay)    || 0;
  const ebAdv = Number(advanceEbAmount) || 0;
  return (days * rate) + ebAdv;
};

async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = REF_DATA_PAGE_SIZE
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);
  const content: T[] = first?.content ?? (Array.isArray(first) ? first : []);
  const total: number = first?.totalElements ?? content.length;
  if (total <= pageSize) return content;
  const rest = await Promise.all(
    Array.from({ length: Math.ceil(total / pageSize) - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? (Array.isArray(r) ? r : []))
    )
  );
  return [...content, ...rest.flat()];
}

const fetchTenantsPage = async (
  page: number, size: number, unitId?: string, search?: string, status?: string, roomId?: string
): Promise<{ content: Tenant[]; totalElements: number }> => {
  const params: Record<string, any> = { page, size };
  if (unitId && unitId !== "all") params.unitId = unitId;
  if (search && search.trim()) params.search = search.trim();
  if (status && status !== "all") params.status = status;
  if (roomId && roomId !== "all") params.roomId = roomId;
  const res = await api.get("/tenants", { params });
  return {
    content:       res.data?.data?.content ?? [],
    totalElements: res.data?.data?.totalElements ?? 0,
  };
};

const fetchRoomsFresh = async (pg = 0, size = REF_DATA_BULK_PAGE_SIZE, forceFresh = false, unitId?: number) => {
  const params: Record<string, any> = { page: pg, size };
  if (forceFresh) params._ = Date.now();
  if (unitId != null) params.unitId = unitId;
  const res = await api.get("/rooms", { params });
  return { content: res.data?.data?.content ?? [], totalElements: res.data?.data?.totalElements ?? 0 };
};

const fetchBedsFresh = async (pg = 0, size = REF_DATA_BULK_PAGE_SIZE, forceFresh = false, unitId?: number) => {
  const params: Record<string, any> = { page: pg, size };
  if (forceFresh) params._ = Date.now();
  if (unitId != null) params.unitId = unitId;
  const res = await api.get("/beds", { params });
  return { content: res.data?.data?.content ?? [], totalElements: res.data?.data?.totalElements ?? 0 };
};

const fetchUnitsPage = async (
  page: number,
  size: number
): Promise<{ content: any[]; totalElements: number }> => {
  const res = await api.get("/units", { params: { page, size } });
  const raw = res.data?.data;

  let content: any[] = [];
  let totalElements: number | undefined;

  if (Array.isArray(raw)) {
    content = raw;
  } else if (Array.isArray(raw?.content)) {
    content = raw.content;
    totalElements = raw.totalElements;
  } else if (Array.isArray(res.data?.content)) {
    content = res.data.content;
    totalElements = res.data.totalElements;
  } else if (Array.isArray(res.data)) {
    content = res.data;
  }

  return { content, totalElements: totalElements ?? content.length };
};

const fetchAndNormalizeBranches = async (): Promise<Branch[]> => {
  try {
    const rawList = await fetchAllPages<any>(fetchUnitsPage, REF_DATA_PAGE_SIZE);

    return rawList.map((b: any) => {
      const resolvedName =
        b?.unitName   ??
        b?.unit_name  ??
        b?.name       ??
        b?.branchName ??
        "";
      return { ...b, unitName: resolvedName, unit_name: resolvedName } as Branch;
    });
  } catch {
    return [];
  }
};

const getBranchRawId = (b: any): number =>
  Number(b?.id ?? b?.branchId ?? b?.unitId ?? NaN);

const getBranchDisplayName = (b: any): string =>
  b?.unitName ?? b?.unit_name ?? b?.name ?? b?.branchName ?? "";

const getRoomUnitId = (r: any): number => {
  const direct = r?.unitId ?? r?.unit_id ?? r?.branchId ?? r?.branch_id;
  if (direct != null && !isNaN(Number(direct))) return Number(direct);
  const nested = r?.unit?.id ?? r?.branch?.id;
  if (nested != null && !isNaN(Number(nested))) return Number(nested);
  return NaN;
};

const getRoomUnitName = (r: any): string =>
  r?.unit?.unitName  ??
  r?.unit?.unit_name ??
  r?.unit?.name      ??
  r?.branch?.unitName ??
  r?.branch?.name    ??
  "";

const getPageNumbers = (current: number, total: number): (number | "...")[] => {
  const SIBLINGS = 1; // pages shown on each side of current
  const totalNumbers = SIBLINGS * 2 + 5; // first, last, current, 2 ellipses buffer

  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftIndex = Math.max(current - SIBLINGS, 1);
  const rightIndex = Math.min(current + SIBLINGS, total);

  const showLeftEllipsis = leftIndex > 2;
  const showRightEllipsis = rightIndex < total - 1;

  const pages: (number | "...")[] = [];

  pages.push(1);

  if (showLeftEllipsis) pages.push("...");

  for (let p = Math.max(leftIndex, 2); p <= Math.min(rightIndex, total - 1); p++) {
    pages.push(p);
  }

  if (showRightEllipsis) pages.push("...");

  if (total > 1) pages.push(total);

  return pages;
};

/* ── Form state ─────────────────────────────────────────────────── */
type FormState = {
  name: string; phone: string; email: string;
  idProofType: IdProofType | ""; idProofNumber: string;
  branchId: number | ""; roomId: number | ""; bedId: number | "";
  tenantStay: TenantStay | "";
  advance: string; monthlyRent: string; registrationFees: string; pendingAmount: string;
  noOfDays: string; amountPerDay: string; ebAmount: string;
  currentReading: string; acJoinReading: string;
  checkInDate: string; idProofDoc: File | null;
  tenantPhoto: File | null;
};

const EMPTY_FORM: FormState = {
  name: "", phone: "", email: "", idProofType: "", idProofNumber: "",
  branchId: "", roomId: "", bedId: "",
  tenantStay: "",
  advance: "", monthlyRent: "", registrationFees: "", pendingAmount: "",
  noOfDays: "", amountPerDay: "", ebAmount: "",
  currentReading: "", acJoinReading: "", checkInDate: "", idProofDoc: null,
  tenantPhoto: null,
};

type FormAction =
  | { type: "set"; field: keyof FormState; value: any }
  | { type: "reset" }
  | { type: "load"; payload: Partial<FormState> };

/* Reset always re-stamps checkInDate with *today's* date (not whatever
   date happened to be baked into EMPTY_FORM at module-load time), so the
   Check-In dialog opens with the date already filled in, every time. */
const formReducer = (state: FormState, action: FormAction): FormState => {
  if (action.type === "reset") return { ...EMPTY_FORM, checkInDate: getTodayISO() };
  if (action.type === "load")  return { ...EMPTY_FORM, ...action.payload };
  return { ...state, [action.field]: action.value };
};

type ApproveFormState = {
  branchId: number | "";
  roomId: number | "";
  bedId: number | "";
  advance: string;
  monthlyRent: string;
  registrationFees: string;
  joinReading: string;
  acJoinReading: string;
};

const EMPTY_APPROVE_FORM: ApproveFormState = {
  branchId: "", roomId: "", bedId: "",
  advance: "", monthlyRent: "", registrationFees: "", joinReading: "", acJoinReading: "",
};

type TransferFormState = {
  roomId: number | "";
  bedId: number | "";
  newRent: string;
  effectiveDate: string;
  reason: string;
  oldRoomFinalReading: string;
  oldRoomAcFinalReading: string;
  newRoomJoinReading: string;
  newRoomAcJoinReading: string;
};

const EMPTY_TRANSFER_FORM: TransferFormState = {
  roomId: "", bedId: "", newRent: "", effectiveDate: "", reason: "",
  oldRoomFinalReading: "", oldRoomAcFinalReading: "", newRoomJoinReading: "", newRoomAcJoinReading: "",
};

/* ── IdProofUploadField ─────────────────────────────────────────── */
const IdProofUploadField = ({
  idProofDoc, existing, onChange,
}: { idProofDoc: File | null; existing?: string | null; onChange: (f: File | null) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        ID Proof Document (PDF or Image, max 10 MB)
      </label>
      <input
        ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
        aria-label="ID proof document"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (!file) { onChange(null); return; }
          if (!["image/jpeg","image/jpg","image/png","application/pdf"].includes(file.type)) {
            toast.error("Only JPG, JPEG, PNG images and PDF files are allowed");
            e.target.value = ""; onChange(null); return;
          }
          if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large. Maximum allowed size is 10 MB.");
            e.target.value = ""; onChange(null); return;
          }
          onChange(file);
        }}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {idProofDoc && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <FileText className="h-3 w-3 shrink-0" />
          {idProofDoc.name}
          <span className="text-muted-foreground">({(idProofDoc.size / 1024).toFixed(1)} KB)</span>
        </p>
      )}
      {!idProofDoc && existing && (
        <a href={`${getApiOrigin()}${existing}`} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-700 underline flex items-center gap-1">
          <FileText className="h-3 w-3 shrink-0" /> View current document
        </a>
      )}
    </div>
  );
};

/* ── TenantPhotoUploadField ── */
const TenantPhotoUploadField = ({
  tenantPhoto, existing, onChange,
}: { tenantPhoto: File | null; existing?: string | null; onChange: (f: File | null) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantPhoto) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(tenantPhoto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [tenantPhoto]);

  const displaySrc = previewUrl ?? (existing ? `${getApiOrigin()}${existing}` : null);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Tenant Photo (JPG or PNG, max 10 MB)
      </label>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
          {displaySrc ? (
            <img src={displaySrc} alt="Tenant" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6 text-muted-foreground shrink-0" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <input
            ref={ref} type="file" accept=".jpg,.jpeg,.png"
            aria-label="Tenant photo"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) { onChange(null); return; }
              if (!["image/jpeg","image/jpg","image/png"].includes(file.type)) {
                toast.error("Tenant photo must be a JPG, JPEG or PNG image");
                e.target.value = ""; onChange(null); return;
              }
              if (file.size > MAX_FILE_SIZE) {
                toast.error("File too large. Maximum allowed size is 10 MB.");
                e.target.value = ""; onChange(null); return;
              }
              onChange(file);
            }}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {tenantPhoto && (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <Camera className="h-3 w-3 shrink-0" />
              {tenantPhoto.name}
              <span className="text-muted-foreground">({(tenantPhoto.size / 1024).toFixed(1)} KB)</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── WhatsApp fraud-alert message builder ───────────────────────── */
const buildFraudWhatsAppMsg = (
  r: FraudCheckResponse["records"][number],
  tenantName: string,
  tenantPhone: string
) =>
  encodeURIComponent(
    `🚨 *Fraud / Defaulter Alert — Hostel HMS*\n\n` +
    `We are checking in a tenant who has a defaulter history at *${r.branchName}*.\n\n` +
    `*Tenant Details:*\n• Name  : ${tenantName || "—"}\n• Phone : ${tenantPhone || "—"}\n\n` +
    `*Previous Stay at ${r.branchName}:*\n` +
    `• Status         : ${r.status}\n• Matched on     : ${r.matchedOn}\n` +
    `• Pending amount : ₹${r.pendingAmount.toFixed(2)}\n` +
    `• Stay period    : ${r.checkInDate} → ${r.checkOutDate ?? "not checked out"}\n` +
    (r.reason ? `• Reason         : ${r.reason}\n` : "") +
    `\nPlease confirm the details and advise. Thank you.`
  );

/* ── FraudCard ──────────────────────────────────────────────────── */
const FraudCard = ({
  fraud, tenantName = "", tenantPhone = "",
}: { fraud: FraudCheckResponse; tenantName?: string; tenantPhone?: string }) => {
  if (!fraud.fraud || fraud.records.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" /> Fraud Alert — Defaulter history found
      </div>
      {fraud.records.map((r, i) => (
        <div key={i} className="text-xs text-red-800 border-t border-red-200 pt-2 space-y-0.5">
          <p><span className="font-medium">Hostel:</span> {r.branchName}</p>
          {r.branchContact && (
            <p className="flex items-center gap-1 flex-wrap">
              <span className="font-medium">Branch Contact:</span>
              <span className="flex items-center gap-2">
                <a href={`tel:${r.branchContact}`}
                  className="inline-flex items-center gap-0.5 text-blue-700 underline hover:text-blue-900">
                  <Phone className="h-3 w-3 shrink-0" />{r.branchContact}
                </a>
                <a href={`https://wa.me/91${r.branchContact.replace(/\D/g,"")}?text=${buildFraudWhatsAppMsg(r, tenantName, tenantPhone)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-green-800 hover:bg-green-200 font-medium">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              </span>
            </p>
          )}
          <p><span className="font-medium">Status:</span> {r.status}</p>
          <p><span className="font-medium">Matched on:</span> {r.matchedOn}</p>
          <p><span className="font-medium">Pending amount:</span> ₹{r.pendingAmount.toFixed(2)}</p>
          <p><span className="font-medium">Stay:</span> {r.checkInDate} → {r.checkOutDate ?? "not checked out"}</p>
          {r.reason && <p><span className="font-medium">Reason:</span> {r.reason}</p>}
        </div>
      ))}
    </div>
  );
};

/* ── TenantForm ─────────────────────────────────────────────────── */
const ID_PROOF_TYPE_LIST: IdProofType[] = ["AADHAR","PAN","VOTER_ID","DRIVING_LICENSE","PASSPORT"];

const TenantForm = ({
  form, dispatch, rooms, beds, branches, editTenant, existingDoc, existingPhoto, fraudResult, branchLocked,
  errors, clearError,
}: {
  form: FormState; dispatch: React.Dispatch<FormAction>;
  rooms: Room[]; beds: Bed[]; branches: Branch[]; editTenant?: Tenant | null;
  existingDoc?: string | null; existingPhoto?: string | null; fraudResult?: FraudCheckResponse | null;
  branchLocked?: boolean;
  /* Field-level required/format errors, keyed by FormState field name
     (e.g. "name", "phone", "idProofType", "roomId", "noOfDays"), shown
     inline under each field — same idea as "Name is required", "Phone
     is required" etc. rather than one generic toast. */
  errors?: Partial<Record<keyof FormState, string>>;
  clearError?: (field: keyof FormState) => void;
}) => {
  const [roomSearch, setRoomSearch] = useState("");
  const set = (field: keyof FormState) => (value: any) => {
    dispatch({ type: "set", field, value });
    clearError?.(field);
  };

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNotes, setOcrNotes] = useState<string[]>([]);
  const formRef = useRef(form);
  formRef.current = form;
  const ocrRunId = useRef(0);

  /* Add-tenant only: scan the uploaded ID and pre-fill. Everything stays editable.
     ID type/number come from the document; name/phone/email/photo only fill EMPTY fields,
     so nothing the user already typed or uploaded is overwritten. Missing data stays blank. */
  const handleIdDocChange = async (file: File | null) => {
    set("idProofDoc")(file);
    setOcrNotes([]);
    const runId = ++ocrRunId.current;
    if (!file || editTenant) return;

    setOcrLoading(true);
    try {
      const r = await extractTenantDocument(file, formRef.current.idProofType);
      if (runId !== ocrRunId.current) return;           // file changed/removed meanwhile

      const cur = formRef.current;
      const filled: string[] = [];
      if (r.idProofType)   { set("idProofType")(r.idProofType); filled.push("ID type"); }
      if (r.idProofNumber) { set("idProofNumber")(r.idProofNumber); filled.push("ID number"); }
      if (r.fullName && !cur.name.trim()) { set("name")(r.fullName); filled.push("name"); }
      if (r.phone && !cur.phone)          { set("phone")(sanitizePhoneInput(r.phone)); filled.push("phone"); }
      if (r.email && !cur.email.trim())   { set("email")(r.email); filled.push("email"); }
      if (r.photoDataUrl && !cur.tenantPhoto) {
        const photo = dataUrlToFile(r.photoDataUrl, "tenant-photo.jpg");
        if (photo) { set("tenantPhoto")(photo); filled.push("photo"); }
      }

      const notes: string[] = [];
      if (filled.length) notes.push(`Filled from document: ${filled.join(", ")}. Please review before saving.`);
      notes.push(...(r.warnings ?? []));
      setOcrNotes(notes);
    } catch (e: any) {
      if (runId !== ocrRunId.current) return;
      const msg = e?.response?.data?.message || "Could not scan the document. Please enter the details manually.";
      setOcrNotes([msg]);
      toast.error(msg);
    } finally {
      if (runId === ocrRunId.current) setOcrLoading(false);
    }
  };

  const err = (field: keyof FormState) => errors?.[field];
  const errCls = (field: keyof FormState) => (err(field) ? "border-red-500 focus-visible:ring-red-400" : "");
  const FieldError = ({ field }: { field: keyof FormState }) =>
    err(field) ? <p className="text-[11px] text-red-600 mt-0.5">{err(field)}</p> : null;
  const isAC = rooms.find((r) => r.id === Number(form.roomId))?.hostelType === "AC";

  const alreadyHasLogin = !!(editTenant && ((editTenant as any).userId || (editTenant as any).user));

  const selectedBranchObj = branches.find((b) => Number(getBranchRawId(b)) === Number(form.branchId));
  const selectedBranchName = getBranchDisplayName(selectedBranchObj).trim().toLowerCase();

  const roomsById = form.branchId
    ? rooms.filter((r) => Number(getRoomUnitId(r)) === Number(form.branchId))
    : [];

  const branchScopedRooms = (roomsById.length > 0 || !selectedBranchName)
    ? roomsById
    : rooms.filter((r) => getRoomUnitName(r).trim().toLowerCase() === selectedBranchName);


  const roomHasAvailableBed = (room: Room) => {
    if (editTenant && Number(room.id) === Number(editTenant.roomId)) return true;
    const roomBeds = beds.filter((b) => Number(b.roomId) === Number(room.id));
    if (roomBeds.length === 0) return true;
    return roomBeds.some((b) => !isBedOccupied(b));
  };

  const availableRooms = branchScopedRooms.filter(roomHasAvailableBed);

  const bedsInRoomMap = new Map<number, Bed>();
  for (const b of beds) {
    if (Number(b.roomId) !== Number(form.roomId)) continue;
    bedsInRoomMap.set(Number(b.id), b);
  }
  const availableBeds = [...bedsInRoomMap.values()].filter((b) =>
    !isBedOccupied(b) || Number(b.id) === Number(editTenant?.bedId)
  );

  const phoneHasError = form.phone.length > 0 && form.phone.length !== PHONE_LENGTH;

  const isDaily   = form.tenantStay === "DAILY";
  const isMonthly = form.tenantStay === "MONTHLY";
  const dailyTotal = computeDailyTotal(form.noOfDays, form.amountPerDay, form.ebAmount);

  /* Billing / reading / date inputs are always rendered with black text
     (Add and Edit dialogs share this form). */
  const blackInput = "rounded-lg text-black";

  const pendingField = (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Pending Amount (₹)</label>
      <Input aria-label="Pending amount" className={`${blackInput} ${errCls("pendingAmount")}`} type="number" inputMode="numeric" min="0" step="1" placeholder="Pending Amount"
        value={form.pendingAmount} onChange={(e) => set("pendingAmount")(e.target.value)} />
      <FieldError field="pendingAmount" />
    </div>
  );

  const checkInField = (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Check-in Date</label>
      <Input aria-label="Check-in date" className={blackInput} type="date" value={form.checkInDate} onChange={(e) => set("checkInDate")(e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4">
      {fraudResult && <FraudCard fraud={fraudResult} tenantName={form.name} tenantPhone={form.phone} />}

      {/* ── Order: ID Proof Document first (it auto-fills the fields below),
          then Tenant Photo, then Name / Phone / Email / ID type & number. ── */}
      <IdProofUploadField idProofDoc={form.idProofDoc} existing={existingDoc} onChange={handleIdDocChange} />
      {ocrLoading && (
        <p className="text-xs text-blue-700 flex items-center gap-1.5" role="status">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden="true" /> Reading document…
        </p>
      )}
      {!ocrLoading && ocrNotes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-0.5">
          {ocrNotes.map((n, i) => <p key={i}>{n}</p>)}
        </div>
      )}

      <TenantPhotoUploadField
        tenantPhoto={form.tenantPhoto}
        existing={existingPhoto}
        onChange={set("tenantPhoto")}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name <span className="text-red-600">*</span></label>
          <Input aria-label="Name" className={`rounded-lg ${errCls("name")}`} placeholder="Name"  value={form.name}  onChange={(e) => set("name")(e.target.value)} />
          <FieldError field="name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phone <span className="text-red-600">*</span></label>
          <Input
            aria-label="Phone"
            className={`rounded-lg ${errCls("phone")}`}
            placeholder="Phone (10 digits)"
            value={form.phone}
            inputMode="numeric"
            type="tel"
            maxLength={PHONE_LENGTH}
            onChange={(e) => set("phone")(sanitizePhoneInput(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text");
              set("phone")(sanitizePhoneInput(form.phone + pasted));
            }}
          />
          <FieldError field="phone" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input aria-label="Email" className="rounded-lg" placeholder="Email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div />
      </div>
      {!alreadyHasLogin && form.email && (
        <p className="text-xs text-muted-foreground -mt-2">
          A login will be created for <span className="font-medium">{form.email}</span> and the password will be emailed to them automatically.
        </p>
      )}
      {alreadyHasLogin && (
        <p className="text-xs text-muted-foreground -mt-2">
          This tenant already has a login account. Password resets are handled from the tenant's own profile, not here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ID Proof Type</label>
          <Select value={form.idProofType} onValueChange={set("idProofType")}>
            <SelectTrigger aria-label="ID proof type" className={`rounded-lg ${errCls("idProofType")}`}><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
            <SelectContent>
              {ID_PROOF_TYPE_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError field="idProofType" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ID Proof Number</label>
          <Input aria-label="ID proof number" className={`rounded-lg ${errCls("idProofNumber")}`} placeholder="ID Proof Number" value={form.idProofNumber}
            onChange={(e) => set("idProofNumber")(e.target.value)} />
          <FieldError field="idProofNumber" />
        </div>
      </div>

      {/* ── Row order per the requested layout: Branch, Tenant Stay Type,
          then Room, Bed, then Check-in Date. ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Branch <span className="text-red-600">*</span></label>
          <Select
            value={form.branchId ? String(form.branchId) : ""}
            disabled={branchLocked}
            onValueChange={(v) => {
              set("branchId")(Number(v));
              set("roomId")("");
              set("bedId")("");
              setRoomSearch("");
            }}
          >
            <SelectTrigger aria-label="Branch" className={`rounded-lg ${errCls("branchId")}`}><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>
                  {getBranchDisplayName(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="branchId" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tenant Stay Type <span className="text-red-600">*</span></label>
          <Select
            value={form.tenantStay}
            onValueChange={(v) => set("tenantStay")(v as TenantStay)}
          >
            <SelectTrigger aria-label="Tenant stay type" className={`rounded-lg ${errCls("tenantStay")}`}><SelectValue placeholder="Select Stay Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
            </SelectContent>
          </Select>
          <FieldError field="tenantStay" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Room <span className="text-red-600">*</span></label>
          <Select value={form.roomId ? String(form.roomId) : ""}
            disabled={!form.branchId}
            onValueChange={(v) => {
              const roomIdNum = Number(v);
              set("roomId")(roomIdNum);
              setRoomSearch("");
              const roomBeds = beds.filter((b) => Number(b.roomId) === roomIdNum);
              const firstFreeBed = roomBeds.find((b) =>
                !isBedOccupied(b) || Number(b.id) === Number(editTenant?.bedId)
              );
              set("bedId")(firstFreeBed ? firstFreeBed.id : "");
            }}>
            <SelectTrigger aria-label="Room" className={`rounded-lg ${errCls("roomId")}`}><SelectValue placeholder={form.branchId ? "Room" : "Select a branch first"} /></SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                <Input aria-label="Search room" placeholder="Search room..." value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()} className="h-8 text-sm rounded-lg" autoFocus />
              </div>
              {availableRooms
                .filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
                .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
              {availableRooms.filter((r) =>
                r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No rooms with available beds</div>
              )}
            </SelectContent>
          </Select>
          <FieldError field="roomId" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Bed <span className="text-red-600">*</span></label>
          <Select value={form.bedId ? String(form.bedId) : ""}
            disabled={!form.roomId}
            onValueChange={(v) => set("bedId")(Number(v))}>
            <SelectTrigger aria-label="Bed" className={`rounded-lg ${errCls("bedId")}`}><SelectValue placeholder={form.roomId ? "Bed" : "Select a room first"} /></SelectTrigger>
            <SelectContent>
              {availableBeds.map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
              {form.roomId && availableBeds.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
              )}
            </SelectContent>
          </Select>
          <FieldError field="bedId" />
        </div>
      </div>

      {!form.tenantStay && (
        <p className="text-xs text-muted-foreground italic px-1 py-2">
          Select Monthly or Daily above to enter billing details.
        </p>
      )}

      {/* No stay type chosen yet: Pending Amount stays hidden until Monthly or
          Daily is selected; only the Check-in Date is shown. */}
      {!form.tenantStay && (
        <div className="grid grid-cols-2 gap-4">
          {checkInField}
          <div />
        </div>
      )}

      {/* ── MONTHLY order: Registration Fees, Advance, Rent, Pending Amount,
          Current EB Reading, Current AC EB Reading, Check-in Date ── */}
      {isMonthly && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Registration Fees</label>
              <Input aria-label="Registration fees" className={blackInput} type="number" placeholder="Registration Fees" value={form.registrationFees} onChange={(e) => set("registrationFees")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Advance</label>
              <Input aria-label="Advance" className={blackInput} type="number" placeholder="Advance" value={form.advance} onChange={(e) => set("advance")(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rent</label>
              <Input aria-label="Rent" className={blackInput} type="number" placeholder="Rent" value={form.monthlyRent} onChange={(e) => set("monthlyRent")(e.target.value)} />
            </div>
            {pendingField}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current EB Reading</label>
              <Input aria-label="Current EB reading" className={blackInput} type="number" placeholder="Current EB Reading" value={form.currentReading} onChange={(e) => set("currentReading")(e.target.value)} />
            </div>
            {isAC ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Current AC EB Reading</label>
                <Input aria-label="Current AC EB reading" className={blackInput} type="number" placeholder="Current AC EB Reading"
                  value={form.acJoinReading} onChange={(e) => set("acJoinReading")(e.target.value)} />
              </div>
            ) : <div />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {checkInField}
            <div />
          </div>
        </>
      )}

      {/* ── DAILY billing block ──────────────────────────────────────
          Two distinct EB inputs here:
            • "Current EB Reading"  → meter reading, saved as joinReading.
                                      Does NOT affect the total.
            • "Advance EB Amount"   → money (₹), saved as ebAmount.
                                      This is the term added to the total.
          Total = (No. of Days × Amount/Day) + Advance EB Amount.
          Order: No. of Days, Amount/Day, Pending Amount, Advance EB Amount,
          Current EB Reading, Current AC EB Reading, Total, Check-in Date. ── */}
      {isDaily && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">No. of Days <span className="text-red-600">*</span></label>
              <Input aria-label="Number of days" className={`${blackInput} ${errCls("noOfDays")}`} type="number" placeholder="No. of Days"
                value={form.noOfDays} onChange={(e) => set("noOfDays")(e.target.value)} />
              <FieldError field="noOfDays" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount / Day <span className="text-red-600">*</span></label>
              <Input aria-label="Amount per day" className={`${blackInput} ${errCls("amountPerDay")}`} type="number" placeholder="Amount per Day"
                value={form.amountPerDay} onChange={(e) => set("amountPerDay")(e.target.value)} />
              <FieldError field="amountPerDay" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {pendingField}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Advance EB Amount (₹)</label>
              <Input aria-label="Advance EB amount" className={blackInput} type="number" placeholder="Advance EB Amount"
                value={form.ebAmount} onChange={(e) => set("ebAmount")(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Collected upfront and added to the total.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current EB Reading</label>
              <Input aria-label="Current EB reading" className={blackInput} type="number" placeholder="Current EB Reading"
                value={form.currentReading} onChange={(e) => set("currentReading")(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Meter reading at check-in.</p>
            </div>
            {isAC ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Current AC EB Reading</label>
                <Input aria-label="Current AC EB reading" className={blackInput} type="number" placeholder="Current AC EB Reading"
                  value={form.acJoinReading} onChange={(e) => set("acJoinReading")(e.target.value)} />
              </div>
            ) : <div />}
          </div>

          <div className="rounded-lg border border-input bg-muted/40 px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" /> Total Amount (Days × Rate + Advance EB)
            </span>
            <span className="text-sm font-semibold">₹{dailyTotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {checkInField}
            <div />
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SEARCHABLE ROOM FILTER (toolbar "All Rooms" dropdown)
   - Search box at the top filters the room list as you type
   - "All Rooms" stays the first option while the search box is empty
   - Keyboard: ↑ / ↓ to move, Enter to pick, Esc to close
   - Closes on outside click; search text is cleared on close / pick
   ══════════════════════════════════════════════════════════════════ */
const RoomFilterDropdown = ({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Room[];
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = term.trim().toLowerCase();

  const filtered = useMemo(
    () => (trimmed
      ? options.filter((r) => String(r.roomNumber ?? "").toLowerCase().includes(trimmed))
      : options),
    [options, trimmed]
  );

  // "All Rooms" is only offered while nothing is typed in the search box.
  const items = useMemo(
    () => [
      ...(trimmed ? [] : [{ id: "all", label: "All Rooms" }]),
      ...filtered.map((r) => ({ id: String(r.id), label: String(r.roomNumber) })),
    ],
    [filtered, trimmed]
  );

  const selectedLabel =
    value === "all"
      ? "All Rooms"
      : (options.find((r) => String(r.id) === value)?.roomNumber ?? "Room");

  const closeMenu = useCallback(() => {
    setOpen(false);
    setTerm("");
    setActiveIdx(0);
  }, []);

  const pick = (id: string) => {
    onChange(id);
    closeMenu();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, closeMenu]);

  // Focus the search box when the menu opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row inside the visible scroll area
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIdx];
      if (item) pick(item.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    }
  };

  return (
    <div className="tn-room-dd" ref={wrapRef}>
      <button
        type="button"
        className="tn-room-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by room"
        onClick={() => (open ? closeMenu() : setOpen(true))}
      >
        <span className="tn-room-trigger-label">{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className={`tn-room-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="tn-room-menu">
          <div className="tn-room-search">
            <Search size={14} color="#64748b" className="shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              aria-label="Search rooms"
              placeholder="Search room..."
              value={term}
              onChange={(e) => { setTerm(e.target.value); setActiveIdx(0); }}
              onKeyDown={handleKeyDown}
            />
            {term && (
              <button
                type="button"
                className="tn-room-search-clear"
                aria-label="Clear room search"
                onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="tn-room-list" role="listbox" aria-label="Rooms" ref={listRef}>
            {items.map((item, idx) => {
              const isSelected = item.id === value;
              return (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  className={`tn-room-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => pick(item.id)}
                >
                  <span className="tn-room-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
                  {item.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="tn-room-empty">No rooms found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const TenantsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isWarden = role === "WARDEN";

  const [rooms,    setRooms]    = useState<Room[]>([]);
  const allRoomsRef = useRef<Room[]>([]);

  const [beds,     setBeds]     = useState<Bed[]>([]);
  const allBedsRef = useRef<Bed[]>([]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [wardenBranchName, setWardenBranchName] = useState("");

  const refDataFetchedAt = useRef<number>(0);

  const formBranches = useMemo(() => {
    if (!isWarden) return branches;
    const own = branches.find((b) => Number(getBranchRawId(b)) === Number(branchId));
    return own ? [own] : [];
  }, [branches, isWarden, branchId]);

  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(0);

  const [search,         setSearch]         = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isWarden ? String(branchId ?? "all") : "all"
  );
  const selectedBranchRef = useRef(selectedBranch);
  useEffect(() => { selectedBranchRef.current = selectedBranch; }, [selectedBranch]);

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const selectedStatusRef = useRef(selectedStatus);
  useEffect(() => { selectedStatusRef.current = selectedStatus; }, [selectedStatus]);

  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const selectedRoomRef = useRef(selectedRoom);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [viewOpen,   setViewOpen]   = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  const [liveFraud,      setLiveFraud]      = useState<FraudCheckResponse | null>(null);
  const [addResultFraud, setAddResultFraud] = useState<FraudCheckResponse | null>(null);

  const [abscondOpen,   setAbscondOpen]   = useState(false);
  const [abscondTarget, setAbscondTarget] = useState<Tenant | null>(null);
  const [abscondReason, setAbscondReason] = useState("");

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const autoImportOnSelectRef = useRef(false);

  const [form, dispatch] = useReducer(
    formReducer,
    EMPTY_FORM,
    (init) => ({ ...init, checkInDate: getTodayISO() })
  );

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const clearFormError = useCallback((field: keyof FormState) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
  const [approveOpen,    setApproveOpen]    = useState(false);
  const [approveTarget,  setApproveTarget]  = useState<Tenant | null>(null);
  const [approveForm,    setApproveForm]    = useState<ApproveFormState>(EMPTY_APPROVE_FORM);

  const [transferOpen,       setTransferOpen]       = useState(false);
  const [transferTarget,     setTransferTarget]     = useState<Tenant | null>(null);
  const [transferForm,       setTransferForm]       = useState<TransferFormState>(EMPTY_TRANSFER_FORM);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferErrors,     setTransferErrors]     = useState<Record<string, string>>({});

  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Tenant | null>(null);
  const [historyList,   setHistoryList]   = useState<TenantTransferResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPendingTenants = useCallback(async () => {
    try {
      const list = await getPendingTenants();
      setPendingTenants(Array.isArray(list) ? list : []);
    } catch {
      // non-critical — the pending list simply won't refresh this cycle
    }
  }, []);

  const [noticeTenants,       setNoticeTenants]       = useState<Tenant[]>([]);
  const [noticeTotalElements, setNoticeTotalElements] = useState(0);
  const [noticeLoading,       setNoticeLoading]       = useState(false);

  const loadNoticeTenants = useCallback(async () => {
    setNoticeLoading(true);
    try {
      const unitParam = isWarden ? String(branchId ?? "") : selectedBranchRef.current;
      const { content, totalElements } = await fetchTenantsInNoticePeriod(0, 10, unitParam);
      setNoticeTenants(Array.isArray(content) ? content : []);
      setNoticeTotalElements(totalElements ?? 0);
    } catch {
      // non-critical — the notice-period list simply won't refresh this cycle
    } finally {
      setNoticeLoading(false);
    }
  }, [isWarden, branchId]);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const askConfirm = (
    title: string,
    onConfirm: () => void,
    options?: { description?: string; confirmLabel?: string; danger?: boolean }
  ) => {
    setConfirmState({ title, onConfirm, ...options });
  };

  /* ── Live fraud check ── */
  const fraudDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!addOpen) return;
    if (!form.phone && !form.idProofNumber) { setLiveFraud(null); return; }
    if (fraudDebounce.current) clearTimeout(fraudDebounce.current);
    fraudDebounce.current = setTimeout(async () => {
      try {
        const result = await checkFraud(form.phone || undefined, form.idProofNumber || undefined);
        setLiveFraud(result.fraud ? result : null);
      } catch { /* non-critical */ }
    }, 600);
    return () => { if (fraudDebounce.current) clearTimeout(fraudDebounce.current); };
  }, [form.phone, form.idProofNumber, addOpen]);

  useEffect(() => {
    if (!addOpen) return;
    if (form.branchId) return; // already set — don't clobber a manual pick on reopen

    let targetBranchId: number | null = null;
    if (isWarden && branchId != null) {
      targetBranchId = Number(branchId);
    } else if (!isWarden && selectedBranch && selectedBranch !== "all") {
      targetBranchId = Number(selectedBranch);
    }
    if (targetBranchId == null) return;

    dispatch({ type: "set", field: "branchId", value: targetBranchId });

    if (selectedRoom && selectedRoom !== "all") {
      const filteredRoom = allRoomsRef.current.find((r) => Number(r.id) === Number(selectedRoom));
      if (filteredRoom && Number(getRoomUnitId(filteredRoom)) === targetBranchId) {
        dispatch({ type: "set", field: "roomId", value: Number(selectedRoom) });

        const roomBeds = allBedsRef.current.filter((b) => Number(b.roomId) === Number(selectedRoom));
        const firstFreeBed = roomBeds.find((b) => !isBedOccupied(b));
        if (firstFreeBed) {
          dispatch({ type: "set", field: "bedId", value: firstFreeBed.id });
        }
      }
    }
  }, [addOpen, isWarden, branchId, selectedBranch, selectedRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Refresh reference data (rooms + beds + branches) ── */
  const refreshReferenceData = useCallback(async (force = false) => {
  if (!force && Date.now() - refDataFetchedAt.current < REF_DATA_CACHE_MS) return;
  try {
    const scopeUnitId = isWarden
      ? Number(branchId)
      : (selectedBranchRef.current !== "all" ? Number(selectedBranchRef.current) : undefined);

    const [allRooms, allBeds, allBranches] = await Promise.all([
      fetchAllPages<Room>((pg, size) => fetchRoomsFresh(pg, size, force, scopeUnitId)),
      fetchAllPages<Bed>((pg, size) => fetchBedsFresh(pg, size, force, scopeUnitId)),
      fetchAndNormalizeBranches(),
    ]);

    allRoomsRef.current = allRooms;
    allBedsRef.current  = allBeds;
    setRooms(allRooms);
    setBeds(allBeds);
    setBranches(allBranches);

      const filteredRooms = isWarden
        ? allRooms.filter((r) => Number(getRoomUnitId(r)) === Number(branchId))
        : allRooms;

      const roomIds = new Set(filteredRooms.map((r) => r.id));
      setRooms(filteredRooms);
      setBeds(isWarden ? allBeds.filter((b) => roomIds.has(b.roomId)) : allBeds);
      setBranches(allBranches);

      if (isWarden) {
        const matchedBranch = allBranches.find(
          (b) => Number(getBranchRawId(b)) === Number(branchId)
        );
        let resolvedName = getBranchDisplayName(matchedBranch);
        if (!resolvedName && filteredRooms.length > 0) {
          resolvedName = getRoomUnitName(filteredRooms[0]);
        }
        setWardenBranchName(resolvedName || `Branch ${branchId}`);
      }

      refDataFetchedAt.current = Date.now();
    } catch { /* non-critical */ }
  }, [isWarden, branchId]);

  const reloadBeds = useCallback(() => refreshReferenceData(true), [refreshReferenceData]);

  const loadTenants = useCallback(async (
    branch?: string,
    pg?: number,
    searchTerm?: string,
    status?: string,
    room?: string
  ) => {
    setLoading(true);
    try {
      const activeBranch = branch ?? selectedBranchRef.current;
      const activePage   = pg ?? page;
      const activeSearch = searchTerm ?? search;
      const activeStatus = status ?? selectedStatusRef.current;
      const activeRoom   = room ?? selectedRoomRef.current;
      const { content, totalElements: total } =
        await fetchTenantsPage(activePage, PAGE_SIZE, activeBranch, activeSearch, activeStatus, activeRoom);
      setTenants(content);
      setTotalElements(total);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const loadTenantsRef = useRef(loadTenants);
  useEffect(() => { loadTenantsRef.current = loadTenants; }, [loadTenants]);

  const loadNoticeTenantsRef = useRef(loadNoticeTenants);
  useEffect(() => { loadNoticeTenantsRef.current = loadNoticeTenants; }, [loadNoticeTenants]);

  /* ── Initial load ── */
  const refLoaded = useRef(false);
  useEffect(() => {
    if (refLoaded.current) return;
    refLoaded.current = true;
    (async () => {
      try {
        await refreshReferenceData(true);
        await loadTenants(isWarden ? String(branchId) : "all", 0);
        await loadPendingTenants();
        await loadNoticeTenants();
      } catch (err) {
        console.error("[TenantsPage] initial load error:", err);
        toast.error("Failed to load reference data");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (addOpen || editOpen || approveOpen) refreshReferenceData();
  }, [addOpen, editOpen, approveOpen, refreshReferenceData]);

  const prevSelectedBranch = useRef(selectedBranch);
  useEffect(() => {
    if (prevSelectedBranch.current === selectedBranch) return;
    prevSelectedBranch.current = selectedBranch;
    setSelectedRoom("all");
    prevSelectedRoom.current = "all";
    setPage(0);
    loadTenants(selectedBranch, 0, undefined, undefined, "all");
    loadNoticeTenants();
  }, [selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevSelectedStatus = useRef(selectedStatus);
  useEffect(() => {
    if (prevSelectedStatus.current === selectedStatus) return;
    prevSelectedStatus.current = selectedStatus;
    setPage(0);
    loadTenants(selectedBranch, 0, undefined, selectedStatus);
  }, [selectedStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevSelectedRoom = useRef(selectedRoom);
  useEffect(() => {
    if (prevSelectedRoom.current === selectedRoom) return;
    prevSelectedRoom.current = selectedRoom;
    setPage(0);
    loadTenants(selectedBranch, 0, undefined, selectedStatus, selectedRoom);
  }, [selectedRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSearch = useRef(search);
  useEffect(() => {
    if (prevSearch.current === search) return;
    prevSearch.current = search;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(0);
      loadTenants(selectedBranchRef.current, 0, search);
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ── INCOMING NAVIGATION STATE ── */
  useEffect(() => {
    const navState = location.state as
      { unitId?: number | string; roomId?: number | string; openAddTenant?: boolean } | null;
    if (!navState?.openAddTenant) return;

    if (!isWarden) {
      if (navState.unitId != null) {
        dispatch({ type: "set", field: "branchId", value: Number(navState.unitId) });
      }
      if (navState.roomId != null) {
        dispatch({ type: "set", field: "roomId", value: Number(navState.roomId) });
      }
    }
    setAddOpen(true);

    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, isWarden]);

  const roomNo = useCallback((id?: number | null) =>
    allRoomsRef.current.find((r) => Number(r.id) === Number(id))?.roomNumber ?? "-",
  []);

  const bedNo = useCallback((id?: number | null) =>
    allBedsRef.current.find((b) => Number(b.id) === Number(id))?.bedNumber ?? "-",
  []);

  const branchName = useCallback((rId?: number | null): string => {
    if (rId == null) return "-";
    const room = allRoomsRef.current.find((r) => Number(r.id) === Number(rId));
    if (!room) return "-";

    const fromNested = getRoomUnitName(room);
    if (fromNested) return fromNested;

    const unitId = getRoomUnitId(room);
    if (!isNaN(unitId)) {
      const branch = branches.find((b) => Number(getBranchRawId(b)) === unitId);
      const fromBranch = getBranchDisplayName(branch);
      if (fromBranch) return fromBranch;
    }

    return "-";
  }, [branches]);

  const roomFilterOptions = useMemo(() => {
    const scoped = selectedBranch === "all"
      ? rooms
      : rooms.filter((r) => Number(getRoomUnitId(r)) === Number(selectedBranch));
    return [...scoped].sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
    );
  }, [rooms, selectedBranch]);

  const extractError = (e: any, fallback: string) => {
    const data = e?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const combined = data.errors
        .map((err: any) => (typeof err === "string" ? err : err?.message || err?.defaultMessage))
        .filter(Boolean)
        .join("; ");
      if (combined) return combined;
    }
    return data?.message || data?.error || e?.message || fallback;
  };

  const buildFormData = () => {
    const fd = new FormData();
    if (form.name)          fd.append("name", form.name);
    if (form.phone)         fd.append("phone", form.phone);
    if (form.email)         fd.append("email", form.email);
    if (form.idProofType)   fd.append("idProofType", form.idProofType);
    if (form.idProofNumber) fd.append("idProofNumber", form.idProofNumber);

    // roomId/bedId are @NotNull on the backend — appended unconditionally
    // (rather than "if truthy") so a caller can never silently omit them.
    // The pre-submit checks in handleAdd/handleEdit are what actually stop
    // the user before we get here; this is the last line of defense.
    fd.append("roomId", String(form.roomId));
    fd.append("bedId",  String(form.bedId));

    // form.tenantStay is guaranteed non-blank here: handleAdd/handleEdit
    // both refuse to call buildFormData() until a stay type is chosen.
    fd.append("tenantStay", form.tenantStay || "MONTHLY");

    if (form.tenantStay === "DAILY") {
      // Daily stay has no Advance deposit field in the UI — always send 0 so a
      // value left over from a prior Monthly entry never leaks through.
      fd.append("advance", "0");
      fd.append("noOfDays",     form.noOfDays     || "0");
      fd.append("amountPerDay", form.amountPerDay || "0");
      // Advance EB Amount (₹) — the only EB figure that feeds totalAmount.
      fd.append("ebAmount",     form.ebAmount     || "0");
      // Current EB Reading (meter) — stored on the tenant as joinReading.
      fd.append("joinReading",  form.currentReading || "0");
      if (form.acJoinReading) fd.append("acJoinReading", form.acJoinReading);
    } else {
      fd.append("advance", form.advance || "0");
      fd.append("monthlyRent",      form.monthlyRent      || "0");
      fd.append("registrationFees", form.registrationFees || "0");
      fd.append("joinReading",      form.currentReading   || "0");
      if (form.acJoinReading) fd.append("acJoinReading", form.acJoinReading);
    }

    // Pending Amount (₹) applies to both stay types; blank is stored as 0.
    fd.append("pendingAmount", form.pendingAmount.trim() || "0");

    if (form.checkInDate)   fd.append("checkInDate", form.checkInDate);
    if (form.idProofDoc)    fd.append("idProofDocument", form.idProofDoc);
    if (form.tenantPhoto)   fd.append("tenantPhoto", form.tenantPhoto);
    return fd;
  };

  const validateForm = (): Partial<Record<keyof FormState, string>> => {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) errors.name = "Name is required";

    if (!form.phone) {
      errors.phone = "Phone is required";
    } else if (!isValidPhone(form.phone)) {
      errors.phone = `Phone number must be exactly ${PHONE_LENGTH} digits`;
    }

    if (!form.branchId) errors.branchId = "Branch is required";
    if (!form.roomId)   errors.roomId   = "Room is required";
    if (!form.bedId)    errors.bedId    = "Bed is required";

    if (!form.tenantStay) {
      errors.tenantStay = "Tenant stay type is required";
    } else if (form.tenantStay === "DAILY") {
      // Mirrors the backend: noOfDays @Min(1), amountPerDay @Min(0) — "0" is a valid rate but not a valid day count.
      if (form.noOfDays === "" || isNaN(Number(form.noOfDays)) || Number(form.noOfDays) < 1) {
        errors.noOfDays = "Number of days is required (minimum 1)";
      }
      if (form.amountPerDay === "" || isNaN(Number(form.amountPerDay)) || Number(form.amountPerDay) < 0) {
        errors.amountPerDay = "Amount per day is required";
      }
    }

    // Mirrors the backend: pendingAmount is a whole number @Min(0). Blank is allowed (-> 0).
    const pending = form.pendingAmount.trim();
    if (pending !== "") {
      if (isNaN(Number(pending)) || Number(pending) < 0) {
        errors.pendingAmount = "Pending amount cannot be negative";
      } else if (!/^\d{1,9}$/.test(pending)) {
        errors.pendingAmount = "Enter a whole number (no decimals)";
      }
    }

    return errors;
  };

const handleAdd = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in the highlighted required fields");
      return;
    }
    setFormErrors({});
    try {
      const newTenant: Tenant = await addTenant(buildFormData());
      const fraudCheck = (newTenant as any)?.fraudCheck ?? null;
      if (fraudCheck?.fraud) {
        setAddResultFraud(fraudCheck);
        toast.warning("Tenant added — but fraud history was detected. Review the alert.");
      } else {
        const hadInlineLogin = !!form.email;

        setAddOpen(false);
        dispatch({ type: "reset" });
        setLiveFraud(null);
        toast.success(
          hadInlineLogin
            ? "Tenant added and login created — credentials emailed"
            : "Tenant added"
        );
      }
      setPage(0);
      await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds()]);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to add tenant"));
    }
  };

  const handleEdit = async () => {
    if (!editTenant) return;
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in the highlighted required fields");
      return;
    }
    setFormErrors({});
    try {
      await updateTenant(editTenant.id, buildFormData());
      toast.success(
        form.email
          ? "Tenant updated and login created — credentials emailed"
          : "Tenant updated"
      );
      setEditOpen(false);
      dispatch({ type: "reset" });
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
    } catch (e: any) {
      toast.error(extractError(e, "Update failed"));
    }
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    askConfirm(
      `Delete tenant "${tenant.name}"?`,
      async () => {
        try {
          await deleteTenant(tenant.id);
          toast.success("Tenant deleted");
          await Promise.all([loadTenantsRef.current(), reloadBeds(), loadPendingTenants()]);
        } catch (e: any) {
          toast.error(extractError(e, "Delete failed"));
        }
      },
      { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
    );
  };

  const handleMarkAbsconded = async () => {
    if (!abscondTarget) return;
    try {
      await markAbsconded(abscondTarget.id, abscondReason);
      toast.success(`${abscondTarget.name} marked as absconded`);
      setAbscondOpen(false); setAbscondTarget(null); setAbscondReason("");
      await Promise.all([loadTenantsRef.current(), reloadBeds(), loadNoticeTenantsRef.current()]);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to mark absconded"));
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    if (!approveForm.roomId || !approveForm.bedId) {
      toast.error("Select a room and bed"); return;
    }
    try {
      await approveAndAllocateTenant(approveTarget.id, {
        roomId: Number(approveForm.roomId),
        bedId: Number(approveForm.bedId),
        advance: approveForm.advance ? Number(approveForm.advance) : 0,
        registrationFees: approveForm.registrationFees ? Number(approveForm.registrationFees) : 0,
        monthlyRent: approveForm.monthlyRent ? Number(approveForm.monthlyRent) : 0,
        joinReading: approveForm.joinReading ? Number(approveForm.joinReading) : 0,
        acJoinReading: approveForm.acJoinReading ? Number(approveForm.acJoinReading) : undefined,
      });
      toast.success(`${approveTarget.name} approved and checked in`);
      setApproveOpen(false);
      setApproveTarget(null);
      setApproveForm(EMPTY_APPROVE_FORM);
      setPage(0);
      await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds(), loadPendingTenants()]);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to approve tenant"));
    }
  };

  const openApproveDialog = (t: Tenant) => {
    setApproveTarget(t);
    setApproveForm({
      ...EMPTY_APPROVE_FORM,
      branchId: isWarden && branchId != null ? Number(branchId) : "",
    });
    setApproveOpen(true);
  };

  const approveRoomHostelType = rooms.find((r) => r.id === Number(approveForm.roomId))?.hostelType;

  /* ── Room / Bed Transfer ─────────────────────────────────────── */
  const openTransferDialog = (t: Tenant) => {
    setTransferTarget(t);
    setTransferForm({ ...EMPTY_TRANSFER_FORM, effectiveDate: getTodayISO() });
    setTransferErrors({});
    setTransferOpen(true);
  };

  const transferRoomHostelType = rooms.find((r) => r.id === Number(transferForm.roomId))?.hostelType;

  const validateTransferForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!transferForm.roomId) errs.roomId = "Select a new room";
    if (!transferForm.bedId) errs.bedId = "Select a new bed";
    if (transferForm.newRent === "" || Number(transferForm.newRent) < 0) {
      errs.newRent = "Enter a valid rent amount";
    }
    if (!transferForm.effectiveDate) {
      errs.effectiveDate = "Effective date is required";
    } else if (transferTarget?.checkInDate && transferForm.effectiveDate < transferTarget.checkInDate) {
      errs.effectiveDate = "Effective date cannot be before the tenant's check-in date";
    }
    if (
      transferTarget &&
      transferForm.roomId !== "" &&
      transferForm.bedId !== "" &&
      Number(transferForm.roomId) === Number(transferTarget.roomId) &&
      Number(transferForm.bedId) === Number(transferTarget.bedId)
    ) {
      errs.bedId = "Tenant is already in this room/bed";
    }
    if (
      transferForm.roomId !== "" && transferForm.bedId !== "" &&
      isBedOccupied(beds.find((b) => Number(b.id) === Number(transferForm.bedId)))
    ) {
      errs.bedId = "Selected bed is already occupied";
    }
    if (
      transferRoomHostelType === "AC" &&
      transferForm.newRoomJoinReading !== "" &&
      transferForm.newRoomAcJoinReading === ""
    ) {
      errs.newRoomAcJoinReading = "AC join reading is required for an AC room";
    }
    setTransferErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleTransfer = async () => {
    if (!transferTarget) return;
    if (!validateTransferForm()) return;

    const payload: TenantTransferRequest = {
      newRoomId: Number(transferForm.roomId),
      newBedId: Number(transferForm.bedId),
      newRent: Number(transferForm.newRent),
      effectiveDate: transferForm.effectiveDate,
      reason: transferForm.reason || undefined,
      oldRoomFinalReading: transferForm.oldRoomFinalReading ? Number(transferForm.oldRoomFinalReading) : undefined,
      oldRoomAcFinalReading: transferForm.oldRoomAcFinalReading ? Number(transferForm.oldRoomAcFinalReading) : undefined,
      newRoomJoinReading: transferForm.newRoomJoinReading ? Number(transferForm.newRoomJoinReading) : undefined,
      newRoomAcJoinReading: transferForm.newRoomAcJoinReading ? Number(transferForm.newRoomAcJoinReading) : undefined,
    };

    setTransferSubmitting(true);
    try {
      await transferTenantRoomBed(transferTarget.id, payload);
      const isFuture = transferForm.effectiveDate > getTodayISO();
      toast.success(
        isFuture
          ? `Transfer scheduled for ${transferForm.effectiveDate}`
          : `${transferTarget.name} transferred successfully`
      );
      setTransferOpen(false);
      setTransferTarget(null);
      setTransferForm(EMPTY_TRANSFER_FORM);
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to transfer tenant"));
    } finally {
      setTransferSubmitting(false);
    }
  };

  const openHistoryDialog = async (t: Tenant) => {
    setHistoryTarget(t);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const list = await getTenantTransferHistory(t.id);
      setHistoryList(list);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to load transfer history"));
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const performExcelImport = async (file: File) => {
    try {
      await importTenantsExcel(file);
      toast.success("Excel imported successfully");
      setExcelFile(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
      setPage(0);
      await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds()]);
      window.dispatchEvent(new Event("beds-updated"));
    } catch (e: any) {
      toast.error(extractError(e, "Excel import failed"), { duration: 8000 });
    }
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
      autoImportOnSelectRef.current = true;
      excelInputRef.current?.click();
      return;
    }
    await performExcelImport(excelFile);
  };

  const handleCancelNotice = (t: Tenant) => {
    askConfirm(
      `Cancel checkout notice for "${t.name}"?`,
      async () => {
        try {
          await cancelCheckoutNotice(t.id);
          toast.success("Checkout notice cancelled");
          await Promise.all([loadTenantsRef.current(), loadNoticeTenantsRef.current()]);
        } catch (e: any) {
          toast.error(extractError(e, "Failed to cancel checkout notice"));
        }
      },
      {
        description: "The tenant will need to submit a new notice before they can check out.",
        confirmLabel: "Cancel Notice",
        danger: true,
      }
    );
  };

  const goToCheckout = (t: Tenant) => {
    navigate("/checkout", { state: { tenantId: t.id } });
  };

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const goToPage = (newPage: number) => {
    setPage(newPage);
    loadTenants(selectedBranch, newPage);
  };

  const currentPage1Based = page + 1;
  const pageNumbers = getPageNumbers(currentPage1Based, totalPages);

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const statusLabel = (s?: string) => {
    if (!s) return "-";
    if (s === "Checked_Out") return "Checked Out";
    if (s === "PENDING") return "Pending";
    return s;
  };

  const stayLabel = (s?: TenantStay | string | null) => (s === "DAILY" ? "Daily" : "Monthly");

  /* Text colors are the *-700/800 shades so they clear WCAG AA (4.5:1)
     against their pale backgrounds (Lighthouse "color-contrast"). */
  const COLORS = [
    { color: '#6d28d9', bg: '#f3e8ff' },
    { color: '#1d4ed8', bg: '#eff6ff' },
    { color: '#15803d', bg: '#dcfce7' },
    { color: '#9a3412', bg: '#ffedd5' },
    { color: '#be185d', bg: '#fce7f3' },
    { color: '#475569', bg: '#f1f5f9' },
    { color: '#0f766e', bg: '#ccfbf1' },
  ];

  /* ── Render ── */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .tn-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        /* Mobile-only layout refinements; desktop styling stays unchanged. */
        @media (max-width: 640px) {
          .tn-wrap { padding: 16px 12px; width: 100%; min-width: 0; }
          .tn-main-header { display: flex; flex-direction: column; align-items: stretch; gap: 10px; }
          .tn-main-title { font-size: 17px; }
          .tn-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: 100%; }
          .tn-controls > button { min-width: 0; width: 100%; justify-content: center; padding: 0 7px; font-size: 12px; white-space: nowrap; }
          .tn-filters-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; align-items: stretch; }
          .tn-search-main { width: 100%; min-width: 0; padding: 0 8px; }
          .tn-search-main input { min-width: 0; font-size: 12px; }
          .tn-filters-row > button.tn-clear-btn { grid-column: 1 / -1; justify-self: end; justify-content: flex-end; }
          .tn-filters-row > button[data-state], .tn-filters-row > [role=combobox] { width: 100% !important; min-width: 0; }
          .tn-room-dd { width: 100%; min-width: 0; }
          .tn-room-menu { width: 100%; min-width: 0; }
          .tn-table-container { width: 100%; min-width: 0; }
          .tn-table-container > .overflow-x-auto { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .tn-table { min-width: 1000px; }
          .tn-pagination { flex-direction: column; align-items: center; padding: 12px 8px; gap: 10px; }
          .tn-page-info { text-align: center; font-size: 12px; }
          .tn-page-controls { max-width: 100%; overflow-x: auto; justify-content: flex-start; }
          .tn-page-btn, .tn-page-ellipsis { flex-shrink: 0; }
          .mobile-form-dialog { width: calc(100vw - 20px) !important; max-width: calc(100vw - 20px) !important; max-height: 90dvh; }
          .mobile-form-dialog > div { max-height: 90dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px; }
          .mobile-form-dialog .grid { min-width: 0; gap: 10px; }
          .mobile-form-dialog .grid > div { min-width: 0; }
          .mobile-form-dialog input, .mobile-form-dialog button[role=combobox] { min-width: 0; max-width: 100%; }
          .mobile-form-dialog input[type=file] { font-size: 11px; }
        }
        .tn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .tn-stat-card { background: #fff; border-radius: 16px; padding: 20px 24px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: all 0.2s; }
        .tn-stat-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.06); transform: translateY(-1px); }
        .tn-stat-icon-wrapper { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .tn-stat-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tn-stat-value { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tn-stat-subtext { font-size: 12px; font-weight: 500; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }

        .tn-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .tn-main-title { font-size: 18px; font-weight: 700; color: #0f172a; }

        .tn-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tn-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .tn-btn-outline:hover { background: #f8fafc; }
        .tn-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
        .tn-btn-primary:hover { background: #4200cc; }

        .tn-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .tn-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
        .tn-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
        .tn-search-main input::placeholder { color: #64748b; }
        .tn-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer; background: transparent; border: none; padding: 6px 12px; }

        /* ── Searchable room filter dropdown ── */
        .tn-room-dd { position: relative; width: 160px; }
        .tn-room-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; height: 38px; padding: 0 12px;
          border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
          font-size: 14px; color: #0f172a; cursor: pointer; text-align: left;
        }
        .tn-room-trigger:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); border-color: #5200FF; }
        .tn-room-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tn-room-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
        .tn-room-chevron.open { transform: rotate(180deg); }
        .tn-room-menu {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
          width: 220px; min-width: 100%;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
        }
        .tn-room-search {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
          margin-bottom: 6px; background: #fafafa;
        }
        .tn-room-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
        .tn-room-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; }
        .tn-room-search input::placeholder { color: #64748b; }
        .tn-room-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
        .tn-room-search-clear:hover { background: #e2e8f0; }
        .tn-room-list { max-height: 260px; overflow-y: auto; }
        .tn-room-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
          font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
        }
        .tn-room-item.active { background: #f8fafc; }
        .tn-room-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .tn-room-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tn-room-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

        .tn-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .tn-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .tn-table th { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; white-space: nowrap; }
        .tn-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; white-space: nowrap; }
        .tn-table tr:last-child td { border-bottom: none; }
        .tn-table tr:hover { background: #fdfcff; }

        .tn-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; overflow: hidden; }
        .tn-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tn-name { font-size: 14px; font-weight: 600; color: #0f172a; }
        .tn-email { font-size: 12px; color: #475569; margin-top: 2px; }

        .tn-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .tn-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-top: 6px; }

        .tn-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

        .tn-contact { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #475569; }

        .tn-date { font-size: 13px; font-weight: 500; color: #0f172a; }
        .tn-rent { font-size: 13px; font-weight: 600; color: #0f172a; }

        .tn-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .tn-status-badge.active { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .tn-status-badge.absconded { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }
        .tn-status-badge.checkedout { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; }
        .tn-status-badge.pending { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }
        .tn-status-badge.other { color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; }
        .tn-status-badge.notice { color: #4338ca; background: #eef2ff; border: 1px solid #c7d2fe; }

        .tn-stay-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 6px; }
        .tn-stay-badge.daily { color: #854d0e; background: #fef9c3; border: 1px solid #fde68a; }
        .tn-stay-badge.monthly { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; }

        .tn-notice-tag { font-size: 11px; font-weight: 600; margin-top: 6px; display: flex; align-items: center; gap: 4px; }

        .tn-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
        .tn-action-btn:hover { background: #f8fafc; color: #0f172a; }

        .tn-action-btn svg { width: 16px !important; height: 16px !important; flex-shrink: 0; display: inline-block; }
        .tn-contact svg { width: 14px !important; height: 14px !important; flex-shrink: 0; display: inline-block; }

        .tn-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; flex-wrap: wrap; gap: 12px; }
        .tn-page-info { font-size: 13px; color: #475569; }
        .tn-page-controls { display: flex; align-items: center; gap: 6px; }
        .tn-page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .tn-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .tn-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .tn-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tn-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #64748b; }

        .tn-delete-confirm-btn {
          background: #ef4444;
          color: #ffffff;
          border: 1px solid #ef4444;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
        }
          
        .tn-delete-confirm-btn:hover {
          background: linear-gradient(to right, #ef4444, #dc2626);
          color: #ffffff;
          border-color: #dc2626;
        }

        .tn-pending-header { display: flex; align-items: center; gap: 8px; padding: 16px 20px 4px; }
        .tn-pending-title { font-size: 15px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .tn-pending-count { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 20px; padding: 1px 10px; font-size: 12px; font-weight: 700; }
        .tn-notice-count { color: #4338ca; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 20px; padding: 1px 10px; font-size: 12px; font-weight: 700; }
      `}</style>

      <div className="tn-wrap">

        {/* Main Content Header */}
        <div className="tn-main-header">
          <div className="tn-main-title">All Tenants</div>

          <div className="tn-controls">
            <Input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden"
              aria-label="Import tenants Excel file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                const wantsAutoImport = autoImportOnSelectRef.current;
                autoImportOnSelectRef.current = false;
                if (!file) return;
                if (file.size > MAX_FILE_SIZE) { toast.error("File size must be below 10 MB"); e.target.value = ""; return; }
                setExcelFile(file);
                if (wantsAutoImport) performExcelImport(file);
              }} />
            <button className="tn-btn-outline" onClick={handleExcelImport}>
              <Download size={16} className="shrink-0" aria-hidden="true" /> Import Excel
            </button>

            <Dialog open={addOpen} onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) { dispatch({ type: "reset" }); setLiveFraud(null); setAddResultFraud(null); setFormErrors({}); }
            }}>
              <DialogTrigger asChild>
                <button className="tn-btn-primary">
                  <UserPlus size={16} className="shrink-0" aria-hidden="true" /> Check-In
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden mobile-form-dialog">
                <div className="relative max-h-[90vh] overflow-y-auto p-6">
                  <DialogClose asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => { setAddResultFraud(null); setLiveFraud(null); }}
                    >
                      <X className="h-4 w-4 shrink-0" />
                    </button>
                  </DialogClose>
                  <DialogHeader>
                    <DialogTitle>Add Tenant</DialogTitle>
                    <DialogDescription>
                      Enter tenant details and assign an available room and bed. Choose a Monthly or Daily stay type, and fill in Email to also create a login — the password will be generated automatically and emailed to the tenant.
                    </DialogDescription>
                  </DialogHeader>
                  {addResultFraud && (
                    <FraudCard fraud={addResultFraud} tenantName={form.name} tenantPhone={form.phone} />
                  )}
                  {!addResultFraud && (
                    <TenantForm
                      form={form} dispatch={dispatch} rooms={rooms} beds={beds}
                      branches={formBranches} branchLocked={isWarden} fraudResult={liveFraud}
                      errors={formErrors} clearError={clearFormError}
                    />
                  )}
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button variant="outline" className="rounded-lg" onClick={() => { setAddResultFraud(null); setLiveFraud(null); }}>
                        {addResultFraud ? "Close" : "Cancel"}
                      </Button>
                    </DialogClose>
                    {!addResultFraud && <Button className="rounded-lg" onClick={handleAdd}>Check-In</Button>}
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {pendingTenants.length > 0 && (
          <div className="tn-table-container" style={{ marginBottom: 24 }}>
            <div className="tn-pending-header">
              <div className="tn-pending-title">
                <ClipboardCheck size={18} className="shrink-0" style={{ color: "#b45309" }} aria-hidden="true" />
                Pending Approvals
                <span className="tn-pending-count">{pendingTenants.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tn-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>CONTACT</th>
                    <th>ID PROOF</th>
                    <th>REQUESTED ON</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="tn-avatar" style={{ background: '#fffbeb', color: '#b45309' }}>
                            {t.tenantPhoto ? (
                              <img src={`${getApiOrigin()}${t.tenantPhoto}`} alt={t.name} />
                            ) : getInitials(t.name)}
                          </div>
                          <div>
                            <div className="tn-name">{t.name || "Unknown"}</div>
                            <div className="tn-email">{t.email || "No email provided"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="tn-contact">
                          <Phone size={14} className="shrink-0" aria-hidden="true" /> {t.phone}
                        </div>
                      </td>
                      <td>
                        <div className="tn-email">{t.idProofType || "-"} · {t.idProofNumber || "-"}</div>
                      </td>
                      <td><div className="tn-date">{t.checkInDate || "-"}</div></td>
                      <td>
                        <div className="flex justify-center">
                          <Button size="sm" className="rounded-lg" onClick={() => openApproveDialog(t)}>
                            Approve & Allocate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {noticeTenants.length > 0 && (
          <div className="tn-table-container" style={{ marginBottom: 24 }}>
            <div className="tn-pending-header">
              <div className="tn-pending-title">
                <CalendarClock size={18} className="shrink-0" style={{ color: "#4338ca" }} aria-hidden="true" />
                Tenants in Notice Period
                <span className="tn-notice-count">{noticeTotalElements}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tn-table">
                <thead>
                  <tr>
                    <th>TENANT</th>
                    <th>ROOM & BED</th>
                    <th>BRANCH</th>
                    <th>REQUESTED ON</th>
                    <th>EXPECTED CHECKOUT</th>
                    <th>DAYS REMAINING</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {noticeLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-500">Loading…</td></tr>
                  ) : (
                    noticeTenants.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="tn-avatar" style={{ background: '#eef2ff', color: '#4338ca' }}>
                              {t.tenantPhoto ? (
                                <img src={`${getApiOrigin()}${t.tenantPhoto}`} alt={t.name} />
                              ) : getInitials(t.name)}
                            </div>
                            <div>
                              <div className="tn-name">{t.name || "Unknown"}</div>
                              <div className="tn-email">{t.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="tn-room-name">
                            {t.roomNumber ?? roomNo(t.roomId)} - Bed {t.bedNumber ?? bedNo(t.bedId)}
                          </div>
                        </td>
                        <td><div className="tn-branch-name">{t.branchName ?? branchName(t.roomId)}</div></td>
                        <td><div className="tn-date">{t.checkoutRequestDate ?? "-"}</div></td>
                        <td><div className="tn-date">{t.noticePeriodEndDate ?? "-"}</div></td>
                        <td>
                          <div className="tn-rent">
                            {t.checkoutStatus === "NOTICE_COMPLETED"
                              ? "Due now"
                              : `${t.remainingNoticeDays ?? "-"} day(s)`}
                          </div>
                        </td>
                        <td>
                          <div className={`tn-status-badge ${t.checkoutStatus === "NOTICE_COMPLETED" ? "checkedout" : "notice"}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${t.checkoutStatus === "NOTICE_COMPLETED" ? "bg-blue-500" : "bg-indigo-500"}`}></div>
                            {t.checkoutStatusLabel ?? "-"}
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-center gap-2">
                            {t.checkoutStatus === "NOTICE_COMPLETED" && (
                              <button className="tn-action-btn" onClick={() => goToCheckout(t)} title="Proceed to Checkout" aria-label="Proceed to checkout">
                                <ArrowRightCircle size={16} color="#2563eb" strokeWidth={2} className="shrink-0" />
                              </button>
                            )}
                            <button className="tn-action-btn" onClick={() => handleCancelNotice(t)} title="Cancel Notice" aria-label="Cancel notice">
                              <Ban size={16} color="#ef4444" strokeWidth={2} className="shrink-0" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="tn-filters-row">
          <div className="tn-search-main">
            <Search size={16} color="#64748b" className="shrink-0" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search tenants or phone number"
              placeholder="Search tenants or Phone number..."
              value={search}

              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isWarden}>
            <SelectTrigger aria-label="Filter by branch" className="w-full min-w-0 sm:w-[160px] h-[38px] bg-white border border-slate-200 rounded-lg"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>{getBranchDisplayName(b)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ── Room filter (with search), alongside Branch and Status. ── */}
          <RoomFilterDropdown
            value={selectedRoom}
            onChange={setSelectedRoom}
            options={roomFilterOptions}
          />

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger aria-label="Filter by status" className="w-full min-w-0 sm:w-[160px] h-[38px] bg-white border border-slate-200 rounded-lg"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Checked_Out">Checked Out</SelectItem>
              <SelectItem value="Absconded">Absconded</SelectItem>
            </SelectContent>
          </Select>


          <button className="tn-clear-btn" onClick={() => {
            setSearch("");
            setSelectedBranch(isWarden ? String(branchId ?? "all") : "all");
            setSelectedStatus("all");
            setSelectedRoom("all");
            setPage(0);
            loadTenants(isWarden ? String(branchId ?? "all") : "all", 0, "", "all", "all");
          }}>
            <RefreshCw size={14} className="shrink-0" aria-hidden="true" /> Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="tn-table-container">
          <div className="overflow-x-auto">
            <table className="tn-table">
              <thead>
                <tr>
                  <th>TENANT</th>
                  <th>ROOM & BED</th>
                  <th>BRANCH</th>
                  <th>CONTACT</th>
                  <th>CHECK-IN DATE</th>
                  <th style={{ textAlign: 'center' }}>RENT / TOTAL (₹)</th>
                  <th>PENDING (₹)</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-500">Loading tenants...</td></tr>
                ) : tenants.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-500">No tenants found.</td></tr>
                ) : (
                  tenants.map((t) => {
                    const avatarColor = COLORS[t.id % COLORS.length];
                    const rNo = t.roomNumber ?? roomNo(t.roomId);
                    const bNo = t.bedNumber ?? bedNo(t.bedId);
                    const isDailyStay = t.tenantStay === "DAILY";

                    const room = allRoomsRef.current.find((r) => r.id === t.roomId);
                    let typeName = "Standard";
                    let typeColor = { color: '#475569', bg: '#f1f5f9' };
                    if (room) {
                      const rBeds = room.totalBeds || 1;
                      const prefix = rBeds === 1 ? 'Single' : rBeds === 2 ? 'Double' : rBeds === 3 ? 'Triple' : rBeds === 4 ? 'Quad' : `${rBeds} Bed`;
                      const suffix = room.hostelType === 'AC' ? 'AC' : room.hostelType === 'NON_AC' ? 'Non-AC' : room.hostelType;
                      typeName = `${prefix} ${suffix}`;
                      // AA-contrast text colors (>= 4.5:1 on their backgrounds)
                      if (typeName.includes('Single')) typeColor = { color: '#1d4ed8', bg: '#eff6ff' };
                      if (typeName.includes('Double')) typeColor = { color: '#15803d', bg: '#dcfce7' };
                      if (typeName.includes('Triple')) typeColor = { color: '#6d28d9', bg: '#f3e8ff' };
                      if (typeName.includes('Quad'))   typeColor = { color: '#9a3412', bg: '#ffedd5' };
                    }

                    const rentDisplay = isDailyStay
                      ? new Intl.NumberFormat('en-IN').format(t.totalAmount ?? 0)
                      : new Intl.NumberFormat('en-IN').format(t.monthlyRent || 0);

                    const pendingAmountNum = Number(t.pendingAmount ?? 0);
                    const pendingDisplay = new Intl.NumberFormat('en-IN').format(pendingAmountNum);

                    const statusClass =
                      t.status === "Active" ? "active" :
                      t.status === "Absconded" ? "absconded" :
                      t.status === "Checked_Out" ? "checkedout" :
                      t.status === "PENDING" ? "pending" : "other";

                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="tn-avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
                              {t.tenantPhoto ? (
                                <img src={`${getApiOrigin()}${t.tenantPhoto}`} alt={t.name} />
                              ) : getInitials(t.name)}
                            </div>
                            <div>
                              <div className="tn-name">{t.name || "Unknown"}</div>
                              <div className="tn-email">{t.email || "No email provided"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="tn-room-name">{rNo} - Bed {bNo}</div>
                          <div className="tn-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
                            {typeName}
                          </div>
                        </td>
                        <td>
                          <div className="tn-branch-name">{t.branchName ?? branchName(t.roomId)}</div>
                        </td>
                        <td>
                          <div className="tn-contact">
                            <Phone size={14} className="shrink-0" aria-hidden="true" /> {t.phone}
                          </div>
                        </td>
                        <td><div className="tn-date">{t.checkInDate}</div></td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="tn-rent">₹{rentDisplay}</div>
                          <div className={`tn-stay-badge ${isDailyStay ? "daily" : "monthly"}`}>
                            {isDailyStay ? <CalendarDays size={10} className="shrink-0" aria-hidden="true" /> : <CalendarClock size={10} className="shrink-0" aria-hidden="true" />}
                            {stayLabel(t.tenantStay)}{isDailyStay && t.noOfDays ? ` · ${t.noOfDays}d` : ""}
                          </div>
                        </td>
                        <td>
                          {/* Pending amount is always shown in black */}
                          <div className="tn-rent" style={{ color: "#000000" }}>
                            ₹{pendingDisplay}
                          </div>
                        </td>
                        <td>
                          <div className={`tn-status-badge ${statusClass}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'Active' ? 'bg-green-500' :
                              t.status === 'Absconded' ? 'bg-red-500' :
                              t.status === 'Checked_Out' ? 'bg-blue-500' :
                              t.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-400'
                            }`}></div>
                            {statusLabel(t.status)}
                          </div>

                          {t.checkoutStatus && (
                            <div
                              className="tn-notice-tag"
                              style={{ color: t.checkoutStatus === "NOTICE_COMPLETED" ? "#1d4ed8" : "#4338ca" }}
                            >
                              <CalendarClock size={12} className="shrink-0" aria-hidden="true" />
                              {t.checkoutStatus === "NOTICE_COMPLETED"
                                ? "Checkout due"
                                : `${t.remainingNoticeDays ?? "-"}d left in notice`}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-center gap-2">
                            <button className="tn-action-btn" onClick={() => { setViewTenant(t); setViewOpen(true); }} title="View" aria-label="View tenant">
                              <Eye size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                            </button>
                            <button className="tn-action-btn" aria-label="Edit tenant" onClick={() => {
                              const derivedBranchId = room ? getRoomUnitId(room) : NaN;
                              setEditTenant(t);
                              dispatch({ type: "load", payload: {
                                name: t.name, phone: t.phone, email: t.email || "",
                                idProofType: t.idProofType, idProofNumber: t.idProofNumber || "",
                                branchId: isNaN(derivedBranchId) ? "" : derivedBranchId,
                                roomId: t.roomId, bedId: t.bedId,
                                tenantStay: (t.tenantStay as TenantStay) ?? "MONTHLY",
                                advance: String(t.advance), monthlyRent: String(t.monthlyRent),
                                registrationFees: String(t.registrationFees ?? ""),
                                pendingAmount: String(t.pendingAmount ?? 0),
                                noOfDays: String(t.noOfDays ?? ""),
                                amountPerDay: String(t.amountPerDay ?? ""),
                                // Advance EB Amount (₹)
                                ebAmount: String(t.ebAmount ?? ""),
                                // Current EB Reading (meter)
                                currentReading: String(t.joinReading ?? ""),
                                acJoinReading: String(t.acJoinReading ?? ""),
                                checkInDate: t.checkInDate, idProofDoc: null, tenantPhoto: null,
                              }});
                              setEditOpen(true);
                            }} title="Edit">
                              <Pencil size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                            </button>
                            <button className="tn-action-btn" onClick={() => handleDeleteTenant(t)} title="Delete" aria-label="Delete tenant">
                              <Trash2 size={16} color="#ef4444" strokeWidth={2} className="shrink-0" />
                            </button>
                            {t.status === "Active" && (
                              <button className="tn-action-btn" onClick={() => { setAbscondTarget(t); setAbscondOpen(true); }} title="Mark as Absconded" aria-label="Mark as absconded">
                                <ShieldX size={16} color="#f97316" strokeWidth={2} className="shrink-0" />
                              </button>
                            )}

                            {/* Submit Checkout Notice removed: admin/warden are not
                                permitted to create a notice on a tenant's behalf.
                                See TenantController — only POST /tenants/me/checkout-notice
                                (tenant self-service) exists on the backend. */}

                            {t.status === "Active" && !t.checkoutStatus && (
                              <button className="tn-action-btn" onClick={() => openTransferDialog(t)} title="Transfer Room/Bed" aria-label="Transfer room or bed">
                                <ArrowLeftRight size={16} color="#0891b2" strokeWidth={2} className="shrink-0" />
                              </button>
                            )}

                            {t.status !== "PENDING" && (
                              <button className="tn-action-btn" onClick={() => openHistoryDialog(t)} title="Transfer History" aria-label="Transfer history">
                                <History size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                              </button>
                            )}

                            {t.status === "Checked_Out" && (
                              <CheckoutReportButton
                                variant="icon"
                                className="tn-action-btn"
                                tenantId={t.id}
                                tenantName={t.name}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="tn-pagination">
            <div className="tn-page-info">
              Showing {totalElements === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} tenants
            </div>
            <div className="tn-page-controls">
              <Button size="icon" variant="outline" aria-label="Previous page" className="w-8 h-8 rounded-lg" disabled={page === 0} onClick={() => goToPage(Math.max(page - 1, 0))}>
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Button>

              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="tn-page-ellipsis">
                    <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                ) : (
                  <button
                    key={p}
                    aria-label={`Page ${p}`}
                    aria-current={p === currentPage1Based ? "page" : undefined}
                    className={`tn-page-btn ${p === currentPage1Based ? "active" : ""}`}
                    onClick={() => goToPage(p - 1)}
                  >
                    {p}
                  </button>
                )
              )}

              <Button size="icon" variant="outline" aria-label="Next page" className="w-8 h-8 rounded-lg" disabled={currentPage1Based >= totalPages} onClick={() => goToPage(Math.min(page + 1, totalPages - 1))}>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { dispatch({ type: "reset" }); setFormErrors({}); } }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden mobile-form-dialog">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
              <DialogDescription>Update tenant information and save your changes.</DialogDescription>
            </DialogHeader>
            <TenantForm
              form={form} dispatch={dispatch} rooms={rooms} beds={beds}
              branches={formBranches} branchLocked={isWarden}
              editTenant={editTenant}
              existingDoc={editTenant?.idProofDocument}
              existingPhoto={editTenant?.tenantPhoto}
              errors={formErrors} clearError={clearFormError}
            />
            <DialogFooter className="mt-6">
              <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="rounded-lg" onClick={handleEdit}>Update Tenant</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>Tenant Details</DialogTitle>
              <DialogDescription>View complete information about this tenant.</DialogDescription>
            </DialogHeader>
            {viewTenant && (
              <div className="grid gap-2 text-sm">
                <div className="flex justify-center mb-1">
                  <div className="h-20 w-20 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                    {viewTenant.tenantPhoto ? (
                      <img src={`${getApiOrigin()}${viewTenant.tenantPhoto}`} alt={viewTenant.name}
                        className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>

                {([
                  ["Name",              viewTenant.name],
                  ["Phone",             viewTenant.phone],
                  ["Email",             viewTenant.email || "-"],
                  ["Identity Proof",    viewTenant.idProofType],
                  ["ID Number",         viewTenant.idProofNumber],
                  ["Branch",            viewTenant.branchName ?? branchName(viewTenant.roomId)],
                  ["Room",              viewTenant.roomNumber ?? roomNo(viewTenant.roomId)],
                  ["Bed",               String(viewTenant.bedNumber ?? bedNo(viewTenant.bedId))],
                  ["Stay Type",         stayLabel(viewTenant.tenantStay)],
                  ...(viewTenant.tenantStay === "DAILY"
                    ? ([
                        ["No. of Days",        String(viewTenant.noOfDays ?? 0)],
                        ["Amount / Day",       `₹${viewTenant.amountPerDay ?? 0}`],
                        ["Current EB Reading", String(viewTenant.joinReading ?? 0)],
                        ...(allRoomsRef.current.find((r) => r.id === viewTenant.roomId)?.hostelType === "AC"
                          ? ([["Current AC EB Reading", String(viewTenant.acJoinReading ?? 0)]] as [string, string][])
                          : ([] as [string, string][])),
                        ["Advance EB Amount",  `₹${viewTenant.ebAmount ?? 0}`],
                        ["Total Amount",       `₹${viewTenant.totalAmount ?? 0}`],
                      ] as [string, string][])
                    : ([
                        ["Advance",           `₹${viewTenant.advance ?? 0}`],
                        ["Registration Fees", `₹${(viewTenant as any).registrationFees ?? 0}`],
                        ["Monthly Rent",      `₹${viewTenant.monthlyRent ?? 0}`],
                      ] as [string, string][])),
                  ["Pending Amount",    `₹${viewTenant.pendingAmount ?? 0}`],
                  ["Status",            statusLabel(viewTenant.status)],
                  ["Check-in",          viewTenant.checkInDate],
                  ["Check-out",         viewTenant.checkOutDate ?? "-"],
                ] as [string, string][]).map(([label, val]) => (
                  <p key={label}><span className="font-medium">{label}:</span> {val}</p>
                ))}
                {viewTenant.idProofDocument ? (
                  <p className="flex items-center gap-1">
                    <span className="font-medium">ID Document:</span>{" "}
                    <a href={`${getApiOrigin()}${viewTenant.idProofDocument}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-700 underline flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" /> View / Download
                    </a>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">No ID document uploaded</p>
                )}

                {viewTenant.checkoutStatus && viewTenant.checkoutRequestDate && (
                  <div className="mt-1 rounded-lg border border-indigo-300 bg-indigo-50 p-3 text-xs text-indigo-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 shrink-0" /> {viewTenant.checkoutStatusLabel}
                    </p>
                    <p>Notice submitted: {viewTenant.checkoutRequestDate}</p>
                    <p>Expected checkout date: {viewTenant.noticePeriodEndDate ?? "-"}</p>
                    {viewTenant.checkoutStatus !== "CHECKED_OUT" && (
                      <p>Days remaining: {viewTenant.remainingNoticeDays ?? "-"}</p>
                    )}
                    {viewTenant.noticeNote && <p>Note: {viewTenant.noticeNote}</p>}
                  </div>
                )}
                {viewTenant.status === "Absconded" && (
                  <div className="mt-1 rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <ShieldX className="h-3 w-3 shrink-0" /> This tenant is marked Absconded
                    </p>
                  </div>
                )}
                {/* {viewTenant.status === "Checked_Out" && (
                  <div className="mt-1 rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <FileCheck2 className="h-3 w-3 shrink-0" /> This tenant has checked out
                    </p>
                    <div className="pt-1">
                      <CheckoutReportButton variant="button" tenantId={viewTenant.id} tenantName={viewTenant.name} />
                    </div>
                  </div>
                )} */}
                {viewTenant.status === "PENDING" && (
                  <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <ClipboardCheck className="h-3 w-3 shrink-0" /> Awaiting room/bed allocation and approval
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" className="rounded-lg" onClick={() => setViewOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Absconded Dialog */}
      <Dialog open={abscondOpen} onOpenChange={(open) => {
        setAbscondOpen(open);
        if (!open) { setAbscondTarget(null); setAbscondReason(""); }
      }}>
        <DialogContent className="rounded-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <ShieldX className="h-5 w-5 shrink-0" /> Mark as Absconded
            </DialogTitle>
            <DialogDescription>
              Use this when a tenant has vacated the bed without giving notice.
              The bed will be freed and a fraud flag will be set on this tenant
              so other branches are warned on re-check-in.
            </DialogDescription>
          </DialogHeader>
          {abscondTarget && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Tenant: <span className="text-foreground">{abscondTarget.name}</span>
                {" "}· Room {abscondTarget.roomNumber ?? roomNo(abscondTarget.roomId)}
                {" "}· Bed {abscondTarget.bedNumber ?? bedNo(abscondTarget.bedId)}
              </p>
              {abscondTarget.checkoutStatus && (
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  This tenant has an open checkout notice ({abscondTarget.checkoutStatusLabel}). Marking them
                  absconded will cancel that notice.
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Reason (optional — defaults to "left without notice")
                </label>
                <Input
                  aria-label="Absconded reason"
                  className="rounded-lg"
                  placeholder="e.g. Bed found empty on 15 Jun, tenant unreachable"
                  value={abscondReason}
                  onChange={(e) => setAbscondReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setAbscondOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-lg" onClick={handleMarkAbsconded}>
              Confirm — Mark Absconded
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE & ALLOCATE DIALOG */}
      <Dialog open={approveOpen} onOpenChange={(open) => {
        setApproveOpen(open);
        if (!open) { setApproveTarget(null); setApproveForm(EMPTY_APPROVE_FORM); }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>Approve Tenant</DialogTitle>
              <DialogDescription>
                Assign a room and bed for <span className="font-medium">{approveTarget?.name}</span> to complete check-in.
                {approveTarget?.tenantStay === "DAILY" && (
                  <span className="block mt-1 text-amber-700">
                    This tenant is a Daily-stay check-in — their days/rate/advance EB amount were captured at
                    submission and are not edited here; only room, bed and advance are set on approval.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <Select
                    value={approveForm.branchId ? String(approveForm.branchId) : ""}
                    disabled={isWarden}
                    onValueChange={(v) => setApproveForm(f => ({ ...f, branchId: Number(v), roomId: "", bedId: "" }))}
                  >
                    <SelectTrigger aria-label="Branch" className="rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>
                      {formBranches.map((b) => (
                        <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>
                          {getBranchDisplayName(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Room</label>
                  <Select
                    value={approveForm.roomId ? String(approveForm.roomId) : ""}
                    disabled={!approveForm.branchId}
                    onValueChange={(v) => setApproveForm(f => ({ ...f, roomId: Number(v), bedId: "" }))}
                  >
                    <SelectTrigger aria-label="Room" className="rounded-lg"><SelectValue placeholder={approveForm.branchId ? "Room" : "Select branch first"} /></SelectTrigger>
                    <SelectContent>
                      {rooms
                        .filter((r) => Number(getRoomUnitId(r)) === Number(approveForm.branchId))
                        .filter((r) => beds.filter((b) => Number(b.roomId) === Number(r.id) && !isBedOccupied(b)).length > 0)
                        .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Bed</label>
                  <Select
                    value={approveForm.bedId ? String(approveForm.bedId) : ""}
                    disabled={!approveForm.roomId}
                    onValueChange={(v) => setApproveForm(f => ({ ...f, bedId: Number(v) }))}
                  >
                    <SelectTrigger aria-label="Bed" className="rounded-lg"><SelectValue placeholder={approveForm.roomId ? "Bed" : "Select room first"} /></SelectTrigger>
                    <SelectContent>
                      {beds
                        .filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !isBedOccupied(b))
                        .map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
                      {approveForm.roomId &&
                        beds.filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !isBedOccupied(b)).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Advance</label>
                  <Input aria-label="Advance" className="rounded-lg" type="number" value={approveForm.advance}
                    onChange={(e) => setApproveForm(f => ({ ...f, advance: e.target.value }))} />
                </div>
              </div>

              {/* MONTHLY-only fields — hidden for Daily-stay pending tenants,
                  whose rent/EB model doesn't apply (see the note in the dialog description above). */}
              {approveTarget?.tenantStay !== "DAILY" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Registration Fees</label>
                      <Input aria-label="Registration fees" className="rounded-lg" type="number" placeholder="Registration Fees"
                        value={approveForm.registrationFees}
                        onChange={(e) => setApproveForm(f => ({ ...f, registrationFees: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Monthly Rent</label>
                      <Input aria-label="Monthly rent" className="rounded-lg" type="number" value={approveForm.monthlyRent}
                        onChange={(e) => setApproveForm(f => ({ ...f, monthlyRent: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Join EB Reading</label>
                      <Input aria-label="Join EB reading" className="rounded-lg" type="number" value={approveForm.joinReading}
                        onChange={(e) => setApproveForm(f => ({ ...f, joinReading: e.target.value }))} />
                    </div>
                    {approveRoomHostelType === "AC" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">AC Join Reading</label>
                        <Input aria-label="AC join reading" className="rounded-lg" type="number" value={approveForm.acJoinReading}
                          onChange={(e) => setApproveForm(f => ({ ...f, acJoinReading: e.target.value }))} />
                      </div>
                    ) : <div />}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setApproveOpen(false)}>Cancel</Button>
              <Button className="rounded-lg" onClick={handleApprove}>Approve & Check-In</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Room/Bed Dialog */}
      <Dialog open={transferOpen} onOpenChange={(open) => {
        setTransferOpen(open);
        if (!open) { setTransferTarget(null); setTransferForm(EMPTY_TRANSFER_FORM); setTransferErrors({}); }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 shrink-0" /> Transfer Room / Bed
              </DialogTitle>
              <DialogDescription>
                Move <span className="font-medium">{transferTarget?.name}</span> to a new room and bed.
                Their previous room, bed, rent and EB history are preserved.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Current room/bed — read-only */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Current Room</div>
                  <div className="font-medium">
                    {allRoomsRef.current.find((r) => r.id === transferTarget?.roomId)?.roomNumber ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Current Bed</div>
                  <div className="font-medium">
                    {(() => {
                      const b = beds.find((bd) => bd.id === transferTarget?.bedId);
                      return b ? `Bed ${b.bedNumber}` : "-";
                    })()}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-medium text-muted-foreground">Current Rent</div>
                  <div className="font-medium">₹{transferTarget?.monthlyRent ?? "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New Room *</label>
                  <Select
                    value={transferForm.roomId ? String(transferForm.roomId) : ""}
                    onValueChange={(v) => setTransferForm(f => ({ ...f, roomId: Number(v), bedId: "" }))}
                  >
                    <SelectTrigger aria-label="New room" className="rounded-lg"><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms
                        .filter((r) => beds.filter((b) => Number(b.roomId) === Number(r.id) &&
                          (!isBedOccupied(b) || Number(b.id) === Number(transferTarget?.bedId))).length > 0)
                        .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {transferErrors.roomId && <p className="text-xs text-red-600">{transferErrors.roomId}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New Bed *</label>
                  <Select
                    value={transferForm.bedId ? String(transferForm.bedId) : ""}
                    disabled={!transferForm.roomId}
                    onValueChange={(v) => setTransferForm(f => ({ ...f, bedId: Number(v) }))}
                  >
                    <SelectTrigger aria-label="New bed" className="rounded-lg"><SelectValue placeholder={transferForm.roomId ? "Select bed" : "Select room first"} /></SelectTrigger>
                    <SelectContent>
                      {beds
                        .filter((b) => Number(b.roomId) === Number(transferForm.roomId) &&
                          (!isBedOccupied(b) || Number(b.id) === Number(transferTarget?.bedId)))
                        .map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {transferErrors.bedId && <p className="text-xs text-red-600">{transferErrors.bedId}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New Rent *</label>
                  <Input aria-label="New rent" className="rounded-lg" type="number" value={transferForm.newRent}
                    onChange={(e) => setTransferForm(f => ({ ...f, newRent: e.target.value }))} />
                  {transferErrors.newRent && <p className="text-xs text-red-600">{transferErrors.newRent}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Effective Date *</label>
                  <Input aria-label="Effective date" className="rounded-lg" type="date" value={transferForm.effectiveDate}
                    onChange={(e) => setTransferForm(f => ({ ...f, effectiveDate: e.target.value }))} />
                  {transferErrors.effectiveDate && <p className="text-xs text-red-600">{transferErrors.effectiveDate}</p>}
                  <p className="text-xs text-muted-foreground">
                    Today or earlier applies immediately. A future date is scheduled and applied automatically.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason / Notes</label>
                <Textarea aria-label="Reason or notes" className="rounded-lg" rows={2} value={transferForm.reason}
                  onChange={(e) => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Optional — e.g. requested a quieter room" />
              </div>

              <details className="rounded-lg border border-slate-200 p-3">
                <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  Meter readings (optional — improves EB billing accuracy)
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Old Room Final Reading</label>
                    <Input aria-label="Old room final reading" className="rounded-lg" type="number" value={transferForm.oldRoomFinalReading}
                      onChange={(e) => setTransferForm(f => ({ ...f, oldRoomFinalReading: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">New Room Join Reading</label>
                    <Input aria-label="New room join reading" className="rounded-lg" type="number" value={transferForm.newRoomJoinReading}
                      onChange={(e) => setTransferForm(f => ({ ...f, newRoomJoinReading: e.target.value }))} />
                  </div>
                  {transferRoomHostelType === "AC" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Old Room AC Final Reading</label>
                        <Input aria-label="Old room AC final reading" className="rounded-lg" type="number" value={transferForm.oldRoomAcFinalReading}
                          onChange={(e) => setTransferForm(f => ({ ...f, oldRoomAcFinalReading: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">New Room AC Join Reading</label>
                        <Input aria-label="New room AC join reading" className="rounded-lg" type="number" value={transferForm.newRoomAcJoinReading}
                          onChange={(e) => setTransferForm(f => ({ ...f, newRoomAcJoinReading: e.target.value }))} />
                        {transferErrors.newRoomAcJoinReading && (
                          <p className="text-xs text-red-600">{transferErrors.newRoomAcJoinReading}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </details>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setTransferOpen(false)} disabled={transferSubmitting}>
                Cancel
              </Button>
              <Button className="rounded-lg" onClick={handleTransfer} disabled={transferSubmitting}>
                {transferSubmitting ? "Transferring..." : "Transfer Tenant"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer History Dialog */}
      <Dialog open={historyOpen} onOpenChange={(open) => {
        setHistoryOpen(open);
        if (!open) { setHistoryTarget(null); setHistoryList([]); }
      }}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[80vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 shrink-0" /> Transfer History
              </DialogTitle>
              <DialogDescription>
                Room/bed transfer history for <span className="font-medium">{historyTarget?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-3">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : historyList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No room/bed transfers on record.</p>
              ) : (
                historyList.map((h) => (
                  <div key={h.id} className="rounded-lg border border-slate-200 p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        Room {h.previousRoomNumber ?? "-"} (Bed {h.previousBedNumber ?? "-"})
                        {" "}<ArrowLeftRight className="inline h-3.5 w-3.5 mx-1 shrink-0" aria-hidden="true" />{" "}
                        Room {h.newRoomNumber ?? "-"} (Bed {h.newBedNumber ?? "-"})
                      </div>
                      <span className={`tn-status-badge ${h.status === "COMPLETED" ? "active" : h.status === "PENDING" ? "notice" : "checkedout"}`}>
                        {h.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Previous Rent: ₹{h.previousRent ?? "-"}</div>
                      <div>New Rent: ₹{h.newRent ?? "-"}</div>
                      <div>Effective Date: {h.effectiveDate}</div>
                      <div>Requested On: {h.transferDate}</div>
                    </div>
                    {h.reason && <div className="text-xs text-slate-600">Reason: {h.reason}</div>}
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setHistoryOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <Dialog open={!!confirmState} onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
        <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            {confirmState?.description && (
              <DialogDescription>{confirmState.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setConfirmState(null)}>Cancel</Button>
            <Button
              variant={confirmState?.danger ? undefined : "default"}
              className={confirmState?.danger ? "tn-delete-confirm-btn rounded-lg" : "rounded-lg"}
              onClick={() => {
                const action = confirmState?.onConfirm;
                setConfirmState(null);
                action?.();
              }}
            >
              {confirmState?.confirmLabel ?? "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TenantsPage;