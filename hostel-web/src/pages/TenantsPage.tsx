// import { useEffect, useMemo, useState, useRef, useCallback, useReducer } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import {
//   addTenant, updateTenant, deleteTenant,
//   importTenantsExcel, getUserRole, getBranchId,
//   checkFraud, markAbsconded,
//   getPendingTenants, approveAndAllocateTenant,
// } from "@/lib/store";
// import { Room, Bed, Tenant, IdProofType, Branch, FraudCheckResponse } from "@/lib/types";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle,
//   DialogFooter, DialogDescription, DialogClose, DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import {
//   UserPlus, Eye, Search, Pencil, Trash2, FileText,
//   AlertTriangle, ShieldX, Phone, Camera, User as UserIcon,
//   Users, ShieldCheck, UserX, FileCheck2,
//   Download, RefreshCw, ChevronLeft, ChevronRight, X, ClipboardCheck,
// } from "lucide-react";
// import api from "@/lib/api";

// /* ── Constants ──────────────────────────────────────────────────── */
// const MAX_FILE_SIZE = 10 * 1024 * 1024;
// const PAGE_SIZE     = 10;

// /* Reference-data (rooms/beds) fan-out page size. */
// const REF_DATA_PAGE_SIZE = 10;

// /* How long refreshed rooms/beds/branches data is considered "fresh"
//    before a dialog-open will trigger another full refetch. */
// const REF_DATA_CACHE_MS = 20_000;

// /* Phone numbers everywhere in this file are stored/validated as
//    exactly 10 digits, digits-only (no spaces, +91, dashes, etc). */
// const PHONE_LENGTH = 10;
// const sanitizePhoneInput = (raw: string) => raw.replace(/\D/g, "").slice(0, PHONE_LENGTH);
// const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

// const getApiOrigin = (): string => {
//   const base = api.defaults.baseURL ?? "";
//   try { return new URL(base).origin; } catch { return ""; }
// };

// /* ── Generic paginated fetcher (still used for rooms/beds, which are
//    genuinely small reference sets we want fully in memory for lookups
//    like roomNo()/bedNo()/branchName() below) ──────────────────────── */
// async function fetchAllPages<T>(
//   fetchFn: (page: number, size: number) => Promise<any>,
//   pageSize = REF_DATA_PAGE_SIZE
// ): Promise<T[]> {
//   const first = await fetchFn(0, pageSize);
//   const content: T[] = first?.content ?? (Array.isArray(first) ? first : []);
//   const total: number = first?.totalElements ?? content.length;
//   if (total <= pageSize) return content;
//   const rest = await Promise.all(
//     Array.from({ length: Math.ceil(total / pageSize) - 1 }, (_, i) =>
//       fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? (Array.isArray(r) ? r : []))
//     )
//   );
//   return [...content, ...rest.flat()];
// }

// /* ── CHANGED: fetchTenantsPage now also accepts an optional `search`
//    term, forwarded as a query param so the backend can filter server-
//    side. If your /tenants endpoint doesn't yet support `search`, this
//    param is simply ignored server-side and has no effect — safe to
//    ship either way. Ask me for the matching Spring controller/repo
//    change if you want real server-side search. ── */
// const fetchTenantsPage = async (
//   page: number, size: number, unitId?: string, search?: string
// ): Promise<{ content: Tenant[]; totalElements: number }> => {
//   const params: Record<string, any> = { page, size };
//   if (unitId && unitId !== "all") params.unitId = unitId;
//   if (search && search.trim()) params.search = search.trim();
//   const res = await api.get("/tenants", { params });
//   return {
//     content:       res.data?.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? 0,
//   };
// };

// /* ── Rooms/beds fetchers ── */
// const fetchRoomsFresh = async (pg = 0, size = REF_DATA_PAGE_SIZE, forceFresh = false) => {
//   const params: Record<string, any> = { page: pg, size };
//   if (forceFresh) params._ = Date.now();
//   const res = await api.get("/rooms", { params });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };

// const fetchBedsFresh = async (pg = 0, size = REF_DATA_PAGE_SIZE, forceFresh = false) => {
//   const params: Record<string, any> = { page: pg, size };
//   if (forceFresh) params._ = Date.now();
//   const res = await api.get("/beds", { params });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };

// /* ══════════════════════════════════════════════════════════════════
//    BRANCH RESOLUTION HELPERS
//    ══════════════════════════════════════════════════════════════════ */
// const fetchAndNormalizeBranches = async (): Promise<Branch[]> => {
//   try {
//     const res = await api.get("/units", { params: { page: 0, size: 10 } });
//     const raw = res.data?.data;

//     let rawList: any[] = [];
//     if (Array.isArray(raw))              rawList = raw;
//     else if (Array.isArray(raw?.content)) rawList = raw.content;
//     else if (Array.isArray(res.data?.content)) rawList = res.data.content;
//     else if (Array.isArray(res.data))    rawList = res.data;

//     return rawList.map((b: any) => {
//       const resolvedName =
//         b?.unitName   ??
//         b?.unit_name  ??
//         b?.name       ??
//         b?.branchName ??
//         "";
//       return { ...b, unitName: resolvedName, unit_name: resolvedName } as Branch;
//     });
//   } catch {
//     return [];
//   }
// };

// const getBranchRawId = (b: any): number =>
//   Number(b?.id ?? b?.branchId ?? b?.unitId ?? NaN);

// const getBranchDisplayName = (b: any): string =>
//   b?.unitName ?? b?.unit_name ?? b?.name ?? b?.branchName ?? "";

// const getRoomUnitId = (r: any): number => {
//   const direct = r?.unitId ?? r?.unit_id ?? r?.branchId ?? r?.branch_id;
//   if (direct != null && !isNaN(Number(direct))) return Number(direct);
//   const nested = r?.unit?.id ?? r?.branch?.id;
//   if (nested != null && !isNaN(Number(nested))) return Number(nested);
//   return NaN;
// };

// const getRoomUnitName = (r: any): string =>
//   r?.unit?.unitName  ??
//   r?.unit?.unit_name ??
//   r?.unit?.name      ??
//   r?.branch?.unitName ??
//   r?.branch?.name    ??
//   "";

// /* ── Form state ─────────────────────────────────────────────────── */
// type FormState = {
//   name: string; phone: string; email: string;
//   idProofType: IdProofType | ""; idProofNumber: string;
//   branchId: number | ""; roomId: number | ""; bedId: number | "";
//   advance: string; monthlyRent: string;
//   currentReading: string; acJoinReading: string;
//   checkInDate: string; idProofDoc: File | null;
//   tenantPhoto: File | null;
// };

// const EMPTY_FORM: FormState = {
//   name: "", phone: "", email: "", idProofType: "", idProofNumber: "",
//   branchId: "", roomId: "", bedId: "", advance: "", monthlyRent: "",
//   currentReading: "", acJoinReading: "", checkInDate: "", idProofDoc: null,
//   tenantPhoto: null,
// };

// type FormAction =
//   | { type: "set"; field: keyof FormState; value: any }
//   | { type: "reset" }
//   | { type: "load"; payload: Partial<FormState> };

// const formReducer = (state: FormState, action: FormAction): FormState => {
//   if (action.type === "reset") return { ...EMPTY_FORM };
//   if (action.type === "load")  return { ...EMPTY_FORM, ...action.payload };
//   return { ...state, [action.field]: action.value };
// };

// type ApproveFormState = {
//   branchId: number | "";
//   roomId: number | "";
//   bedId: number | "";
//   advance: string;
//   monthlyRent: string;
//   joinReading: string;
//   acJoinReading: string;
// };

// const EMPTY_APPROVE_FORM: ApproveFormState = {
//   branchId: "", roomId: "", bedId: "",
//   advance: "", monthlyRent: "", joinReading: "", acJoinReading: "",
// };

// /* ── IdProofUploadField ─────────────────────────────────────────── */
// const IdProofUploadField = ({
//   idProofDoc, existing, onChange,
// }: { idProofDoc: File | null; existing?: string | null; onChange: (f: File | null) => void }) => {
//   const ref = useRef<HTMLInputElement>(null);
//   return (
//     <div className="space-y-1.5">
//       <label className="text-xs font-medium text-muted-foreground">
//         ID Proof Document (PDF or Image, max 10 MB)
//       </label>
//       <input
//         ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
//         onChange={(e) => {
//           const file = e.target.files?.[0] ?? null;
//           if (!file) { onChange(null); return; }
//           if (!["image/jpeg","image/jpg","image/png","application/pdf"].includes(file.type)) {
//             toast.error("Only JPG, JPEG, PNG images and PDF files are allowed");
//             e.target.value = ""; onChange(null); return;
//           }
//           if (file.size > MAX_FILE_SIZE) {
//             toast.error("File too large. Maximum allowed size is 10 MB.");
//             e.target.value = ""; onChange(null); return;
//           }
//           onChange(file);
//         }}
//         className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//       />
//       {idProofDoc && (
//         <p className="text-xs text-green-600 flex items-center gap-1">
//           <FileText className="h-3 w-3 shrink-0" />
//           {idProofDoc.name}
//           <span className="text-muted-foreground">({(idProofDoc.size / 1024).toFixed(1)} KB)</span>
//         </p>
//       )}
//       {!idProofDoc && existing && (
//         <a href={`${getApiOrigin()}${existing}`} target="_blank" rel="noopener noreferrer"
//           className="text-xs text-blue-600 underline flex items-center gap-1">
//           <FileText className="h-3 w-3 shrink-0" /> View current document
//         </a>
//       )}
//     </div>
//   );
// };

// /* ── TenantPhotoUploadField ── */
// const TenantPhotoUploadField = ({
//   tenantPhoto, existing, onChange,
// }: { tenantPhoto: File | null; existing?: string | null; onChange: (f: File | null) => void }) => {
//   const ref = useRef<HTMLInputElement>(null);
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (!tenantPhoto) { setPreviewUrl(null); return; }
//     const url = URL.createObjectURL(tenantPhoto);
//     setPreviewUrl(url);
//     return () => URL.revokeObjectURL(url);
//   }, [tenantPhoto]);

//   const displaySrc = previewUrl ?? (existing ? `${getApiOrigin()}${existing}` : null);

//   return (
//     <div className="space-y-1.5">
//       <label className="text-xs font-medium text-muted-foreground">
//         Tenant Photo (JPG or PNG, max 10 MB)
//       </label>
//       <div className="flex items-center gap-3">
//         <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
//           {displaySrc ? (
//             <img src={displaySrc} alt="Tenant" className="h-full w-full object-cover" />
//           ) : (
//             <UserIcon className="h-6 w-6 text-muted-foreground shrink-0" />
//           )}
//         </div>
//         <div className="flex-1 space-y-1">
//           <input
//             ref={ref} type="file" accept=".jpg,.jpeg,.png"
//             onChange={(e) => {
//               const file = e.target.files?.[0] ?? null;
//               if (!file) { onChange(null); return; }
//               if (!["image/jpeg","image/jpg","image/png"].includes(file.type)) {
//                 toast.error("Tenant photo must be a JPG, JPEG or PNG image");
//                 e.target.value = ""; onChange(null); return;
//               }
//               if (file.size > MAX_FILE_SIZE) {
//                 toast.error("File too large. Maximum allowed size is 10 MB.");
//                 e.target.value = ""; onChange(null); return;
//               }
//               onChange(file);
//             }}
//             className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//           />
//           {tenantPhoto && (
//             <p className="text-xs text-green-600 flex items-center gap-1">
//               <Camera className="h-3 w-3 shrink-0" />
//               {tenantPhoto.name}
//               <span className="text-muted-foreground">({(tenantPhoto.size / 1024).toFixed(1)} KB)</span>
//             </p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ── WhatsApp fraud-alert message builder ───────────────────────── */
// const buildFraudWhatsAppMsg = (
//   r: FraudCheckResponse["records"][number],
//   tenantName: string,
//   tenantPhone: string
// ) =>
//   encodeURIComponent(
//     `🚨 *Fraud / Defaulter Alert — Hostel HMS*\n\n` +
//     `We are checking in a tenant who has a defaulter history at *${r.branchName}*.\n\n` +
//     `*Tenant Details:*\n• Name  : ${tenantName || "—"}\n• Phone : ${tenantPhone || "—"}\n\n` +
//     `*Previous Stay at ${r.branchName}:*\n` +
//     `• Status         : ${r.status}\n• Matched on     : ${r.matchedOn}\n` +
//     `• Pending amount : ₹${r.pendingAmount.toFixed(2)}\n` +
//     `• Stay period    : ${r.checkInDate} → ${r.checkOutDate ?? "not checked out"}\n` +
//     (r.reason ? `• Reason         : ${r.reason}\n` : "") +
//     `\nPlease confirm the details and advise. Thank you.`
//   );

// /* ── FraudCard ──────────────────────────────────────────────────── */
// const FraudCard = ({
//   fraud, tenantName = "", tenantPhone = "",
// }: { fraud: FraudCheckResponse; tenantName?: string; tenantPhone?: string }) => {
//   if (!fraud.fraud || fraud.records.length === 0) return null;
//   return (
//     <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-2">
//       <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
//         <AlertTriangle className="h-4 w-4 shrink-0" /> Fraud Alert — Defaulter history found
//       </div>
//       {fraud.records.map((r, i) => (
//         <div key={i} className="text-xs text-red-800 border-t border-red-200 pt-2 space-y-0.5">
//           <p><span className="font-medium">Hostel:</span> {r.branchName}</p>
//           {r.branchContact && (
//             <p className="flex items-center gap-1 flex-wrap">
//               <span className="font-medium">Branch Contact:</span>
//               <span className="flex items-center gap-2">
//                 <a href={`tel:${r.branchContact}`}
//                   className="inline-flex items-center gap-0.5 text-blue-700 underline hover:text-blue-900">
//                   <Phone className="h-3 w-3 shrink-0" />{r.branchContact}
//                 </a>
//                 <a href={`https://wa.me/91${r.branchContact.replace(/\D/g,"")}?text=${buildFraudWhatsAppMsg(r, tenantName, tenantPhone)}`}
//                   target="_blank" rel="noopener noreferrer"
//                   className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-green-700 hover:bg-green-200 font-medium">
//                   <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
//                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
//                   </svg>
//                   WhatsApp
//                 </a>
//               </span>
//             </p>
//           )}
//           <p><span className="font-medium">Status:</span> {r.status}</p>
//           <p><span className="font-medium">Matched on:</span> {r.matchedOn}</p>
//           <p><span className="font-medium">Pending amount:</span> ₹{r.pendingAmount.toFixed(2)}</p>
//           <p><span className="font-medium">Stay:</span> {r.checkInDate} → {r.checkOutDate ?? "not checked out"}</p>
//           {r.reason && <p><span className="font-medium">Reason:</span> {r.reason}</p>}
//         </div>
//       ))}
//     </div>
//   );
// };

// /* ── TenantForm ─────────────────────────────────────────────────── */
// const ID_PROOF_TYPE_LIST: IdProofType[] = ["AADHAR","PAN","VOTER_ID","DRIVING_LICENSE","PASSPORT"];

// const TenantForm = ({
//   form, dispatch, rooms, beds, branches, editTenant, existingDoc, existingPhoto, fraudResult, branchLocked,
// }: {
//   form: FormState; dispatch: React.Dispatch<FormAction>;
//   rooms: Room[]; beds: Bed[]; branches: Branch[]; editTenant?: Tenant | null;
//   existingDoc?: string | null; existingPhoto?: string | null; fraudResult?: FraudCheckResponse | null;
//   branchLocked?: boolean;
// }) => {
//   const [roomSearch, setRoomSearch] = useState("");
//   const set = (field: keyof FormState) => (value: any) => dispatch({ type: "set", field, value });
//   const isAC = rooms.find((r) => r.id === Number(form.roomId))?.hostelType === "AC";

//   const alreadyHasLogin = !!(editTenant && ((editTenant as any).userId || (editTenant as any).user));

//   const isBedOccupied = (b: Bed) =>
//     b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";

//   const selectedBranchObj = branches.find((b) => Number(getBranchRawId(b)) === Number(form.branchId));
//   const selectedBranchName = getBranchDisplayName(selectedBranchObj).trim().toLowerCase();

//   const roomsById = form.branchId
//     ? rooms.filter((r) => Number(getRoomUnitId(r)) === Number(form.branchId))
//     : [];

//   const branchScopedRooms = (roomsById.length > 0 || !selectedBranchName)
//     ? roomsById
//     : rooms.filter((r) => getRoomUnitName(r).trim().toLowerCase() === selectedBranchName);

//   /* ── NEW: a room only belongs in the picklist if it still has at
//      least one free bed. Without this, a fully-occupied room (like
//      "101" — 2/2 beds taken) stayed selectable in the Room dropdown
//      and only failed afterwards with "No available beds in this
//      room" once you tried to pick a bed. This filters those rooms out
//      up front.

//      Exception: if we're editing a tenant who is already assigned to
//      that room, we keep it visible — otherwise you'd be unable to see/
//      edit a tenant's own room just because their own bed makes the
//      room look "full". (Their own bed is separately excluded from the
//      "occupied" check in availableBeds below.) If no bed data has
//      loaded yet for a room (roomBeds.length === 0), we don't hide it —
//      that's a "we don't know yet" state, not "full". ── */
//   const roomHasAvailableBed = (room: Room) => {
//     if (editTenant && Number(room.id) === Number(editTenant.roomId)) return true;
//     const roomBeds = beds.filter((b) => Number(b.roomId) === Number(room.id));
//     if (roomBeds.length === 0) return true;
//     return roomBeds.some((b) => !isBedOccupied(b));
//   };

//   const availableRooms = branchScopedRooms.filter(roomHasAvailableBed);

//   const bedsInRoomMap = new Map<number, Bed>();
//   for (const b of beds) {
//     if (Number(b.roomId) !== Number(form.roomId)) continue;
//     bedsInRoomMap.set(Number(b.id), b);
//   }
//   const availableBeds = [...bedsInRoomMap.values()].filter((b) =>
//     !isBedOccupied(b) || Number(b.id) === Number(editTenant?.bedId)
//   );

//   const phoneHasError = form.phone.length > 0 && form.phone.length !== PHONE_LENGTH;

//   return (
//     <div className="space-y-4">
//       {fraudResult && <FraudCard fraud={fraudResult} tenantName={form.name} tenantPhone={form.phone} />}

//       <TenantPhotoUploadField
//         tenantPhoto={form.tenantPhoto}
//         existing={existingPhoto}
//         onChange={set("tenantPhoto")}
//       />

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Name</label>
//           <Input className="rounded-lg" placeholder="Name"  value={form.name}  onChange={(e) => set("name")(e.target.value)} />
//         </div>
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Phone</label>
//           <Input
//             className="rounded-lg"
//             placeholder="Phone (10 digits)"
//             value={form.phone}
//             inputMode="numeric"
//             type="tel"
//             maxLength={PHONE_LENGTH}
//             onChange={(e) => set("phone")(sanitizePhoneInput(e.target.value))}
//             onPaste={(e) => {
//               e.preventDefault();
//               const pasted = e.clipboardData.getData("text");
//               set("phone")(sanitizePhoneInput(form.phone + pasted));
//             }}
//           />
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Email</label>
//           <Input className="rounded-lg" placeholder="Email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
//         </div>
//         <div />
//       </div>
//       {!alreadyHasLogin && form.email && (
//         <p className="text-xs text-muted-foreground -mt-2">
//           A login will be created for <span className="font-medium">{form.email}</span> and the password will be emailed to them automatically.
//         </p>
//       )}
//       {alreadyHasLogin && (
//         <p className="text-xs text-muted-foreground -mt-2">
//           This tenant already has a login account. Password resets are handled from the tenant's own profile, not here.
//         </p>
//       )}

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">ID Proof Type</label>
//           <Select value={form.idProofType} onValueChange={set("idProofType")}>
//             <SelectTrigger className="rounded-lg"><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
//             <SelectContent>
//               {ID_PROOF_TYPE_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
//             </SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">ID Proof Number</label>
//           <Input className="rounded-lg" placeholder="ID Proof Number" value={form.idProofNumber}
//             onChange={(e) => set("idProofNumber")(e.target.value)} />
//         </div>
//       </div>

//       <IdProofUploadField idProofDoc={form.idProofDoc} existing={existingDoc} onChange={set("idProofDoc")} />

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Branch</label>
//           <Select
//             value={form.branchId ? String(form.branchId) : ""}
//             disabled={branchLocked}
//             onValueChange={(v) => {
//               set("branchId")(Number(v));
//               set("roomId")("");
//               set("bedId")("");
//               setRoomSearch("");
//             }}
//           >
//             <SelectTrigger className="rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
//             <SelectContent>
//               {branches.map((b) => (
//                 <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>
//                   {getBranchDisplayName(b)}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Room</label>
//           <Select value={form.roomId ? String(form.roomId) : ""}
//             disabled={!form.branchId}
//             onValueChange={(v) => {
//               set("roomId")(Number(v));
//               set("bedId")("");
//               setRoomSearch("");
//             }}>
//             <SelectTrigger className="rounded-lg"><SelectValue placeholder={form.branchId ? "Room" : "Select a branch first"} /></SelectTrigger>
//             <SelectContent>
//               <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                 <Input placeholder="Search room..." value={roomSearch}
//                   onChange={(e) => setRoomSearch(e.target.value)}
//                   onKeyDown={(e) => e.stopPropagation()} className="h-8 text-sm rounded-lg" autoFocus />
//               </div>
//               {availableRooms
//                 .filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
//                 .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
//               {availableRooms.filter((r) =>
//                 r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && (
//                 <div className="px-3 py-2 text-sm text-muted-foreground">No rooms with available beds</div>
//               )}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Bed</label>
//           <Select value={form.bedId ? String(form.bedId) : ""}
//             disabled={!form.roomId}
//             onValueChange={(v) => set("bedId")(Number(v))}>
//             <SelectTrigger className="rounded-lg"><SelectValue placeholder={form.roomId ? "Bed" : "Select a room first"} /></SelectTrigger>
//             <SelectContent>
//               {availableBeds.map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
//               {form.roomId && availableBeds.length === 0 && (
//                 <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
//               )}
//             </SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Advance</label>
//           <Input className="rounded-lg" type="number" placeholder="Advance" value={form.advance} onChange={(e) => set("advance")(e.target.value)} />
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Rent</label>
//           <Input className="rounded-lg" type="number" placeholder="Rent" value={form.monthlyRent} onChange={(e) => set("monthlyRent")(e.target.value)} />
//         </div>
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Current EB Reading</label>
//           <Input className="rounded-lg" type="number" placeholder="Current EB Reading" value={form.currentReading} onChange={(e) => set("currentReading")(e.target.value)} />
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         {isAC ? (
//           <div className="space-y-1.5">
//             <label className="text-xs font-medium text-muted-foreground">AC Current Reading (optional)</label>
//             <Input className="rounded-lg" type="number" placeholder="AC Current Reading"
//               value={form.acJoinReading} onChange={(e) => set("acJoinReading")(e.target.value)} />
//           </div>
//         ) : <div />}
//         <div className="space-y-1.5">
//           <label className="text-xs font-medium text-muted-foreground">Check-in Date</label>
//           <Input className="rounded-lg" type="date" value={form.checkInDate} onChange={(e) => set("checkInDate")(e.target.value)} />
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ══════════════════════════════════════════════════════════════════
//    PAGE COMPONENT
//    ══════════════════════════════════════════════════════════════════ */
// const TenantsPage = () => {
//   const location = useLocation();
//   const navigate = useNavigate();

//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId();
//   const isWarden = role === "WARDEN";

//   const [rooms,    setRooms]    = useState<Room[]>([]);
//   const allRoomsRef = useRef<Room[]>([]);

//   const [beds,     setBeds]     = useState<Bed[]>([]);
//   const allBedsRef = useRef<Bed[]>([]);

//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [wardenBranchName, setWardenBranchName] = useState("");

//   const refDataFetchedAt = useRef<number>(0);

//   const formBranches = useMemo(() => {
//     if (!isWarden) return branches;
//     const own = branches.find((b) => Number(getBranchRawId(b)) === Number(branchId));
//     return own ? [own] : [];
//   }, [branches, isWarden, branchId]);

//   /* ── CHANGED: `tenants` now holds ONE PAGE only, not the full
//      matching set. `totalElements` tracks the server-reported total
//      so the pagination footer and page-count math no longer depend
//      on having fetched every row. ── */
//   const [tenants,       setTenants]       = useState<Tenant[]>([]);
//   const [totalElements, setTotalElements] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [page,    setPage]    = useState(0);

//   const [search,         setSearch]         = useState("");
//   const [selectedBranch, setSelectedBranch] = useState<string>(
//     isWarden ? String(branchId ?? "all") : "all"
//   );
//   const selectedBranchRef = useRef(selectedBranch);
//   useEffect(() => { selectedBranchRef.current = selectedBranch; }, [selectedBranch]);

//   const [addOpen,    setAddOpen]    = useState(false);
//   const [editOpen,   setEditOpen]   = useState(false);
//   const [viewOpen,   setViewOpen]   = useState(false);
//   const [editTenant, setEditTenant] = useState<Tenant | null>(null);
//   const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

//   const [liveFraud,      setLiveFraud]      = useState<FraudCheckResponse | null>(null);
//   const [addResultFraud, setAddResultFraud] = useState<FraudCheckResponse | null>(null);

//   const [abscondOpen,   setAbscondOpen]   = useState(false);
//   const [abscondTarget, setAbscondTarget] = useState<Tenant | null>(null);
//   const [abscondReason, setAbscondReason] = useState("");

//   const [excelFile, setExcelFile] = useState<File | null>(null);
//   const excelInputRef = useRef<HTMLInputElement>(null);

//   const [form, dispatch] = useReducer(formReducer, EMPTY_FORM);

//   const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
//   const [approveOpen,    setApproveOpen]    = useState(false);
//   const [approveTarget,  setApproveTarget]  = useState<Tenant | null>(null);
//   const [approveForm,    setApproveForm]    = useState<ApproveFormState>(EMPTY_APPROVE_FORM);

//   const loadPendingTenants = useCallback(async () => {
//     try {
//       const list = await getPendingTenants();
//       setPendingTenants(Array.isArray(list) ? list : []);
//     } catch {
//       // non-critical — the pending list simply won't refresh this cycle
//     }
//   }, []);

//   const [confirmState, setConfirmState] = useState<{
//     title: string;
//     description?: string;
//     confirmLabel?: string;
//     danger?: boolean;
//     onConfirm: () => void;
//   } | null>(null);

//   const askConfirm = (
//     title: string,
//     onConfirm: () => void,
//     options?: { description?: string; confirmLabel?: string; danger?: boolean }
//   ) => {
//     setConfirmState({ title, onConfirm, ...options });
//   };

//   /* ── Live fraud check ── */
//   const fraudDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
//   useEffect(() => {
//     if (!addOpen) return;
//     if (!form.phone && !form.idProofNumber) { setLiveFraud(null); return; }
//     if (fraudDebounce.current) clearTimeout(fraudDebounce.current);
//     fraudDebounce.current = setTimeout(async () => {
//       try {
//         const result = await checkFraud(form.phone || undefined, form.idProofNumber || undefined);
//         setLiveFraud(result.fraud ? result : null);
//       } catch { /* non-critical */ }
//     }, 600);
//     return () => { if (fraudDebounce.current) clearTimeout(fraudDebounce.current); };
//   }, [form.phone, form.idProofNumber, addOpen]);

//   /* ── When the Add dialog opens, pre-lock a warden's branch ── */
//   useEffect(() => {
//     if (!addOpen) return;
//     if (isWarden && branchId != null && !form.branchId) {
//       dispatch({ type: "set", field: "branchId", value: Number(branchId) });
//     }
//   }, [addOpen, isWarden, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

//   /* ── Refresh reference data (rooms + beds + branches) ── */
//   const refreshReferenceData = useCallback(async (force = false) => {
//     if (!force && Date.now() - refDataFetchedAt.current < REF_DATA_CACHE_MS) {
//       return;
//     }
//     try {
//       const [allRooms, allBeds, allBranches] = await Promise.all([
//         fetchAllPages<Room>((pg, size) => fetchRoomsFresh(pg, size, force)),
//         fetchAllPages<Bed>((pg, size) => fetchBedsFresh(pg, size, force)),
//         fetchAndNormalizeBranches(),
//       ]);

//       allRoomsRef.current = allRooms;
//       allBedsRef.current  = allBeds;

//       const filteredRooms = isWarden
//         ? allRooms.filter((r) => Number(getRoomUnitId(r)) === Number(branchId))
//         : allRooms;

//       const roomIds = new Set(filteredRooms.map((r) => r.id));
//       setRooms(filteredRooms);
//       setBeds(isWarden ? allBeds.filter((b) => roomIds.has(b.roomId)) : allBeds);
//       setBranches(allBranches);

//       if (isWarden) {
//         const matchedBranch = allBranches.find(
//           (b) => Number(getBranchRawId(b)) === Number(branchId)
//         );
//         let resolvedName = getBranchDisplayName(matchedBranch);
//         if (!resolvedName && filteredRooms.length > 0) {
//           resolvedName = getRoomUnitName(filteredRooms[0]);
//         }
//         setWardenBranchName(resolvedName || `Branch ${branchId}`);
//       }

//       refDataFetchedAt.current = Date.now();
//     } catch { /* non-critical */ }
//   }, [isWarden, branchId]);

//   const reloadBeds = useCallback(() => refreshReferenceData(true), [refreshReferenceData]);

//   /* ── CHANGED: loadTenants now fetches exactly ONE page from the
//      server per call instead of looping until every page is fetched.
//      This is the fix for the "tenants?page=0" immediately followed by
//      "tenants?page=1" (etc) sequential waterfall seen in DevTools —
//      that pattern is gone entirely now; each call is a single request.

//      Accepts an explicit `pg` so callers (pagination buttons, branch
//      filter changes, search) can request a specific page without
//      relying on stale closure state. Defaults to the current `page`
//      state when not provided. ── */
//   const loadTenants = useCallback(async (
//     branch?: string,
//     pg?: number,
//     searchTerm?: string
//   ) => {
//     setLoading(true);
//     try {
//       const activeBranch = branch ?? selectedBranchRef.current;
//       const activePage   = pg ?? page;
//       const activeSearch = searchTerm ?? search;
//       const { content, totalElements: total } =
//         await fetchTenantsPage(activePage, PAGE_SIZE, activeBranch, activeSearch);
//       setTenants(content);
//       setTotalElements(total);
//     } catch {
//       toast.error("Failed to load tenants");
//     } finally {
//       setLoading(false);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, search]);

//   const loadTenantsRef = useRef(loadTenants);
//   useEffect(() => { loadTenantsRef.current = loadTenants; }, [loadTenants]);

//   /* ── Initial load ── */
//   const refLoaded = useRef(false);
//   useEffect(() => {
//     if (refLoaded.current) return;
//     refLoaded.current = true;
//     (async () => {
//       try {
//         await refreshReferenceData(true);
//         await loadTenants(isWarden ? String(branchId) : "all", 0);
//         await loadPendingTenants();
//       } catch (err) {
//         console.error("[TenantsPage] initial load error:", err);
//         toast.error("Failed to load reference data");
//       }
//     })();
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   useEffect(() => {
//     if (addOpen || editOpen || approveOpen) refreshReferenceData();
//   }, [addOpen, editOpen, approveOpen, refreshReferenceData]);

//   /* ── CHANGED: branch-filter change resets to page 0 and fetches
//      that single page directly (was previously delegating to the
//      old fetch-everything loadTenants). ── */
//   const branchFilterMounted = useRef(false);
//   useEffect(() => {
//     if (!branchFilterMounted.current) { branchFilterMounted.current = true; return; }
//     setPage(0);
//     loadTenants(selectedBranch, 0);
//   }, [selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

//   /* ── NEW: debounced server-side search. Typing in the search box
//      resets to page 0 and re-fetches from the server after a short
//      pause, instead of filtering an in-memory full list (which no
//      longer exists now that tenants only holds one page). ── */
//   const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const searchMounted = useRef(false);
//   useEffect(() => {
//     if (!searchMounted.current) { searchMounted.current = true; return; }
//     if (searchDebounce.current) clearTimeout(searchDebounce.current);
//     searchDebounce.current = setTimeout(() => {
//       setPage(0);
//       loadTenants(selectedBranchRef.current, 0, search);
//     }, 400);
//     return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [search]);

//   /* ── INCOMING NAVIGATION STATE ── */
//   useEffect(() => {
//     const navState = location.state as
//       { unitId?: number | string; roomId?: number | string; openAddTenant?: boolean } | null;
//     if (!navState?.openAddTenant) return;

//     if (!isWarden) {
//       if (navState.unitId != null) {
//         dispatch({ type: "set", field: "branchId", value: Number(navState.unitId) });
//       }
//       if (navState.roomId != null) {
//         dispatch({ type: "set", field: "roomId", value: Number(navState.roomId) });
//       }
//     }
//     setAddOpen(true);

//     window.history.replaceState({}, document.title);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [location.state, isWarden]);

//   const roomNo = useCallback((id?: number | null) =>
//     allRoomsRef.current.find((r) => Number(r.id) === Number(id))?.roomNumber ?? "-",
//   []);

//   const bedNo = useCallback((id?: number | null) =>
//     allBedsRef.current.find((b) => Number(b.id) === Number(id))?.bedNumber ?? "-",
//   []);

//   const branchName = useCallback((rId?: number | null): string => {
//     if (rId == null) return "-";
//     const room = allRoomsRef.current.find((r) => Number(r.id) === Number(rId));
//     if (!room) return "-";

//     const fromNested = getRoomUnitName(room);
//     if (fromNested) return fromNested;

//     const unitId = getRoomUnitId(room);
//     if (!isNaN(unitId)) {
//       const branch = branches.find((b) => Number(getBranchRawId(b)) === unitId);
//       const fromBranch = getBranchDisplayName(branch);
//       if (fromBranch) return fromBranch;
//     }

//     return "-";
//   }, [branches]);

//   const extractError = (e: any, fallback: string) =>
//     e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

//   const buildFormData = () => {
//     const fd = new FormData();
//     if (form.name)          fd.append("name", form.name);
//     if (form.phone)         fd.append("phone", form.phone);
//     if (form.email)         fd.append("email", form.email);
//     if (form.idProofType)   fd.append("idProofType", form.idProofType);
//     if (form.idProofNumber) fd.append("idProofNumber", form.idProofNumber);
//     if (form.roomId !== "") fd.append("roomId", String(form.roomId));
//     if (form.bedId  !== "") fd.append("bedId",  String(form.bedId));
//     fd.append("advance",     form.advance     || "0");
//     fd.append("monthlyRent", form.monthlyRent || "0");
//     fd.append("joinReading", form.currentReading || "0");
//     if (form.acJoinReading) fd.append("acJoinReading", form.acJoinReading);
//     if (form.checkInDate)   fd.append("checkInDate", form.checkInDate);
//     if (form.idProofDoc)    fd.append("idProofDocument", form.idProofDoc);
//     if (form.tenantPhoto)   fd.append("tenantPhoto", form.tenantPhoto);
//     return fd;
//   };

//   const handleAdd = async () => {
//     if (!form.name || !form.phone || !form.branchId || !form.roomId || !form.bedId) {
//       toast.error("Fill required fields"); return;
//     }
//     if (!isValidPhone(form.phone)) {
//       toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`); return;
//     }
//     try {
//       const newTenant: Tenant = await addTenant(buildFormData());
//       const fraudCheck = (newTenant as any)?.fraudCheck ?? null;
//       if (fraudCheck?.fraud) {
//         setAddResultFraud(fraudCheck);
//         toast.warning("Tenant added — but fraud history was detected. Review the alert.");
//       } else {
//         const hadInlineLogin = !!form.email;
//         const pendingLoginPrefill = {
//           name: form.name,
//           phone: form.phone,
//           email: form.email,
//           branchId: form.branchId,
//         };

//         setAddOpen(false);
//         dispatch({ type: "reset" });
//         setLiveFraud(null);
//         toast.success(
//           hadInlineLogin
//             ? "Tenant added and login created — credentials emailed"
//             : "Tenant added"
//         );

//         if (!hadInlineLogin) {
//           setPage(0);
//           loadTenantsRef.current(undefined, 0);
//           reloadBeds();
//           navigate("/users", {
//             state: {
//               openAddUser: true,
//               prefill: pendingLoginPrefill,
//               role: "TENANT",
//             },
//           });
//           return;
//         }
//       }
//       setPage(0);
//       await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds()]);
//     } catch (e: any) {
//       toast.error(extractError(e, "Failed to add tenant"));
//     }
//   };

//   const handleEdit = async () => {
//     if (!editTenant) return;
//     if (form.phone && !isValidPhone(form.phone)) {
//       toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`); return;
//     }
//     try {
//       await updateTenant(editTenant.id, buildFormData());
//       toast.success(
//         form.email
//           ? "Tenant updated and login created — credentials emailed"
//           : "Tenant updated"
//       );
//       setEditOpen(false);
//       dispatch({ type: "reset" });
//       await Promise.all([loadTenantsRef.current(), reloadBeds()]);
//     } catch (e: any) {
//       toast.error(extractError(e, "Update failed"));
//     }
//   };

//   const handleDeleteTenant = (tenant: Tenant) => {
//     askConfirm(
//       `Delete tenant "${tenant.name}"?`,
//       async () => {
//         try {
//           await deleteTenant(tenant.id);
//           toast.success("Tenant deleted");
//           await Promise.all([loadTenantsRef.current(), reloadBeds(), loadPendingTenants()]);
//         } catch (e: any) {
//           toast.error(extractError(e, "Delete failed"));
//         }
//       },
//       { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
//     );
//   };

//   const handleMarkAbsconded = async () => {
//     if (!abscondTarget) return;
//     try {
//       await markAbsconded(abscondTarget.id, abscondReason);
//       toast.success(`${abscondTarget.name} marked as absconded`);
//       setAbscondOpen(false); setAbscondTarget(null); setAbscondReason("");
//       await Promise.all([loadTenantsRef.current(), reloadBeds()]);
//     } catch (e: any) {
//       toast.error(extractError(e, "Failed to mark absconded"));
//     }
//   };

//   const handleApprove = async () => {
//     if (!approveTarget) return;
//     if (!approveForm.roomId || !approveForm.bedId) {
//       toast.error("Select a room and bed"); return;
//     }
//     try {
//       await approveAndAllocateTenant(approveTarget.id, {
//         roomId: Number(approveForm.roomId),
//         bedId: Number(approveForm.bedId),
//         advance: approveForm.advance ? Number(approveForm.advance) : 0,
//         monthlyRent: approveForm.monthlyRent ? Number(approveForm.monthlyRent) : 0,
//         joinReading: approveForm.joinReading ? Number(approveForm.joinReading) : 0,
//         acJoinReading: approveForm.acJoinReading ? Number(approveForm.acJoinReading) : undefined,
//       });
//       toast.success(`${approveTarget.name} approved and checked in`);
//       setApproveOpen(false);
//       setApproveTarget(null);
//       setApproveForm(EMPTY_APPROVE_FORM);
//       setPage(0);
//       await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds(), loadPendingTenants()]);
//     } catch (e: any) {
//       toast.error(extractError(e, "Failed to approve tenant"));
//     }
//   };

//   const openApproveDialog = (t: Tenant) => {
//     setApproveTarget(t);
//     setApproveForm({
//       ...EMPTY_APPROVE_FORM,
//       branchId: isWarden && branchId != null ? Number(branchId) : "",
//     });
//     setApproveOpen(true);
//   };

//   const approveRoomHostelType = rooms.find((r) => r.id === Number(approveForm.roomId))?.hostelType;

//   const handleExcelImport = async () => {
//     if (!excelFile) { toast.error("Please select an Excel file first"); return; }
//     try {
//       await importTenantsExcel(excelFile);
//       toast.success("Excel imported successfully");
//       setExcelFile(null);
//       if (excelInputRef.current) excelInputRef.current.value = "";
//       setPage(0);
//       await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds()]);
//       window.dispatchEvent(new Event("beds-updated"));
//     } catch (e: any) {
//       toast.error(extractError(e, "Excel import failed"), { duration: 8000 });
//     }
//   };

//   /* ── CHANGED: `tenants` is now already exactly the current page
//      from the server — no further client-side slicing needed. Search
//      is handled server-side via the debounced effect above, so there's
//      no more filteredTenants/paginatedTenants derivation here. ── */
//   const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

//   const goToPage = (newPage: number) => {
//     setPage(newPage);
//     loadTenants(selectedBranch, newPage);
//   };

//   /* ── NOTE ON STATS: these previously summarized the FULL tenant
//      list (every page). Now that `tenants` only holds the current
//      page, these numbers would only reflect ~10 rows, which is
//      misleading. Rather than show wrong numbers, this card set is
//      removed from render below. If you want accurate global stats
//      back, the clean fix is a small dedicated endpoint —
//      GET /tenants/stats returning { active, absconded, withDoc } as
//      COUNT() queries — which is a single fast indexed query instead
//      of pulling every tenant row to count them in the browser. Happy
//      to write that endpoint + wire it back in if you want the stat
//      cards restored. ── */

//   const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

//   const COLORS = [
//     { color: '#8b5cf6', bg: '#f3e8ff' },
//     { color: '#3b82f6', bg: '#eff6ff' },
//     { color: '#22c55e', bg: '#dcfce7' },
//     { color: '#f97316', bg: '#ffedd5' },
//     { color: '#ec4899', bg: '#fce7f3' },
//     { color: '#64748b', bg: '#f1f5f9' },
//     { color: '#14b8a6', bg: '#ccfbf1' },
//   ];

//   /* ── Render ── */
//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .tn-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

//         .tn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
//         .tn-stat-card { background: #fff; border-radius: 16px; padding: 20px 24px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: all 0.2s; }
//         .tn-stat-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.06); transform: translateY(-1px); }
//         .tn-stat-icon-wrapper { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
//         .tn-stat-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//         .tn-stat-value { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//         .tn-stat-subtext { font-size: 12px; font-weight: 500; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }

//         .tn-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
//         .tn-main-title { font-size: 18px; font-weight: 700; color: #0f172a; }

//         .tn-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
//         .tn-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
//         .tn-btn-outline:hover { background: #f8fafc; }
//         .tn-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
//         .tn-btn-primary:hover { background: #4200cc; }

//         .tn-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
//         .tn-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
//         .tn-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
//         .tn-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; }

//         .tn-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
//         .tn-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
//         .tn-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; white-space: nowrap; }
//         .tn-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; white-space: nowrap; }
//         .tn-table tr:last-child td { border-bottom: none; }
//         .tn-table tr:hover { background: #fdfcff; }

//         .tn-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; overflow: hidden; }
//         .tn-avatar img { width: 100%; height: 100%; object-fit: cover; }
//         .tn-name { font-size: 14px; font-weight: 600; color: #0f172a; }
//         .tn-email { font-size: 12px; color: #64748b; margin-top: 2px; }

//         .tn-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .tn-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-top: 6px; }

//         .tn-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

//         .tn-contact { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #475569; }

//         .tn-date { font-size: 13px; font-weight: 500; color: #0f172a; }
//         .tn-rent { font-size: 13px; font-weight: 600; color: #0f172a; }

//         .tn-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
//         .tn-status-badge.active { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .tn-status-badge.absconded { color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; }
//         .tn-status-badge.pending { color: #d97706; background: #fffbeb; border: 1px solid #fde68a; }
//         .tn-status-badge.other { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

//         .tn-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
//         .tn-action-btn:hover { background: #f8fafc; color: #0f172a; }

//         .tn-action-btn svg { width: 16px !important; height: 16px !important; flex-shrink: 0; display: inline-block; }
//         .tn-contact svg { width: 14px !important; height: 14px !important; flex-shrink: 0; display: inline-block; }

//         .tn-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; }
//         .tn-page-info { font-size: 13px; color: #64748b; }
//         .tn-page-controls { display: flex; align-items: center; gap: 8px; }
//         .tn-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
//         .tn-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }

//         .tn-delete-confirm-btn {
//           background: linear-gradient(to right, #ffffff, #ef4444);
//           color: #b91c1c;
//           border: 1px solid #fca5a5;
//           box-shadow: 0 1px 2px rgba(0,0,0,0.04);
//           transition: all 0.25s ease;
//         }
//         .tn-delete-confirm-btn:hover {
//           background: linear-gradient(to right, #ef4444, #dc2626);
//           color: #ffffff;
//           border-color: #dc2626;
//         }

//         .tn-pending-header { display: flex; align-items: center; gap: 8px; padding: 16px 20px 4px; }
//         .tn-pending-title { font-size: 15px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
//         .tn-pending-count { color: #d97706; background: #fffbeb; border: 1px solid #fde68a; border-radius: 20px; padding: 1px 10px; font-size: 12px; font-weight: 700; }
//       `}</style>

//       <div className="tn-wrap">

//         {/* Main Content Header */}
//         <div className="tn-main-header">
//           <div className="tn-main-title">All Tenants</div>

//           <div className="tn-controls">
//             <Input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="w-44 rounded-lg"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (!file) return;
//                 if (file.size > MAX_FILE_SIZE) { toast.error("File size must be below 10 MB"); e.target.value = ""; return; }
//                 setExcelFile(file);
//               }} />
//             <button className="tn-btn-outline" onClick={handleExcelImport} disabled={!excelFile}>
//               <Download size={16} className="shrink-0" /> Import Excel
//             </button>

//             <Dialog open={addOpen} onOpenChange={(open) => {
//               setAddOpen(open);
//               if (!open) { dispatch({ type: "reset" }); setLiveFraud(null); setAddResultFraud(null); }
//             }}>
//               <DialogTrigger asChild>
//                 <button className="tn-btn-primary">
//                   <UserPlus size={16} className="shrink-0" /> Check-In
//                 </button>
//               </DialogTrigger>
//               <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//                 <div className="relative max-h-[90vh] overflow-y-auto p-6">
//                   <DialogClose asChild>
//                     <button
//                       type="button"
//                       aria-label="Close"
//                       className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//                       onClick={() => { setAddResultFraud(null); setLiveFraud(null); }}
//                     >
//                       <X className="h-4 w-4 shrink-0" />
//                     </button>
//                   </DialogClose>
//                   <DialogHeader>
//                     <DialogTitle>Add Tenant</DialogTitle>
//                     <DialogDescription>
//                       Enter tenant details and assign an available room and bed. Fill in Email to also create a login — the password will be generated automatically and emailed to the tenant.
//                     </DialogDescription>
//                   </DialogHeader>
//                   {addResultFraud && (
//                     <FraudCard fraud={addResultFraud} tenantName={form.name} tenantPhone={form.phone} />
//                   )}
//                   {!addResultFraud && (
//                     <TenantForm
//                       form={form} dispatch={dispatch} rooms={rooms} beds={beds}
//                       branches={formBranches} branchLocked={isWarden} fraudResult={liveFraud}
//                     />
//                   )}
//                   <DialogFooter>
//                     <DialogClose asChild>
//                       <Button variant="outline" className="rounded-lg" onClick={() => { setAddResultFraud(null); setLiveFraud(null); }}>
//                         {addResultFraud ? "Close" : "Cancel"}
//                       </Button>
//                     </DialogClose>
//                     {!addResultFraud && <Button className="rounded-lg" onClick={handleAdd}>Check-In</Button>}
//                   </DialogFooter>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </div>
//         </div>

//         {pendingTenants.length > 0 && (
//           <div className="tn-table-container" style={{ marginBottom: 24 }}>
//             <div className="tn-pending-header">
//               <div className="tn-pending-title">
//                 <ClipboardCheck size={18} className="shrink-0" style={{ color: "#d97706" }} />
//                 Pending Approvals
//                 <span className="tn-pending-count">{pendingTenants.length}</span>
//               </div>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="tn-table">
//                 <thead>
//                   <tr>
//                     <th>NAME</th>
//                     <th>CONTACT</th>
//                     <th>ID PROOF</th>
//                     <th>REQUESTED ON</th>
//                     <th style={{ textAlign: 'center' }}>ACTION</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {pendingTenants.map((t) => (
//                     <tr key={t.id}>
//                       <td>
//                         <div className="flex items-center gap-3">
//                           <div className="tn-avatar" style={{ background: '#fffbeb', color: '#d97706' }}>
//                             {t.tenantPhoto ? (
//                               <img src={`${getApiOrigin()}${t.tenantPhoto}`} alt={t.name} />
//                             ) : getInitials(t.name)}
//                           </div>
//                           <div>
//                             <div className="tn-name">{t.name || "Unknown"}</div>
//                             <div className="tn-email">{t.email || "No email provided"}</div>
//                           </div>
//                         </div>
//                       </td>
//                       <td>
//                         <div className="tn-contact">
//                           <Phone size={14} className="shrink-0" /> {t.phone}
//                         </div>
//                       </td>
//                       <td>
//                         <div className="tn-email">{t.idProofType || "-"} · {t.idProofNumber || "-"}</div>
//                       </td>
//                       <td><div className="tn-date">{t.checkInDate || "-"}</div></td>
//                       <td>
//                         <div className="flex justify-center">
//                           <Button size="sm" className="rounded-lg" onClick={() => openApproveDialog(t)}>
//                             Approve & Allocate
//                           </Button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* Filters */}
//         <div className="tn-filters-row">
//           <div className="tn-search-main">
//             <Search size={16} color="#94a3b8" className="shrink-0" />
//             <input
//               type="text"
//               placeholder="Search tenants..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>

//           <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isWarden}>
//             <SelectTrigger className="w-[160px] h-[38px] bg-white border border-slate-200 rounded-lg"><SelectValue placeholder="All Branches" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Branches</SelectItem>
//               {branches.map(b => (
//                 <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>{getBranchDisplayName(b)}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <button className="tn-clear-btn" onClick={() => {
//             setSearch("");
//             setSelectedBranch(isWarden ? String(branchId ?? "all") : "all");
//             setPage(0);
//             loadTenants(isWarden ? String(branchId ?? "all") : "all", 0, "");
//           }}>
//             <RefreshCw size={14} className="shrink-0" /> Clear Filters
//           </button>
//         </div>

//         {/* Table */}
//         <div className="tn-table-container">
//           <div className="overflow-x-auto">
//             <table className="tn-table">
//               <thead>
//                 <tr>
//                   <th>TENANT</th>
//                   <th>ROOM & BED</th>
//                   <th>BRANCH</th>
//                   <th>CONTACT</th>
//                   <th>CHECK-IN DATE</th>
//                   <th>RENT (₹)</th>
//                   <th>STATUS</th>
//                   <th style={{ textAlign: 'center' }}>ACTIONS</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading tenants...</td></tr>
//                 ) : tenants.length === 0 ? (
//                   <tr><td colSpan={8} className="text-center py-12 text-slate-400">No tenants found.</td></tr>
//                 ) : (
//                   tenants.map((t) => {
//                     const avatarColor = COLORS[t.id % COLORS.length];
//                     const rNo = roomNo(t.roomId);
//                     const bNo = bedNo(t.bedId);

//                     const room = allRoomsRef.current.find((r) => r.id === t.roomId);
//                     let typeName = "Standard";
//                     let typeColor = { color: '#64748b', bg: '#f1f5f9' };
//                     if (room) {
//                       const rBeds = room.totalBeds || 1;
//                       const prefix = rBeds === 1 ? 'Single' : rBeds === 2 ? 'Double' : rBeds === 3 ? 'Triple' : rBeds === 4 ? 'Quad' : `${rBeds} Bed`;
//                       const suffix = room.hostelType === 'AC' ? 'AC' : room.hostelType === 'NON_AC' ? 'Non-AC' : room.hostelType;
//                       typeName = `${prefix} ${suffix}`;
//                       if (typeName.includes('Single')) typeColor = { color: '#3b82f6', bg: '#eff6ff' };
//                       if (typeName.includes('Double')) typeColor = { color: '#22c55e', bg: '#dcfce7' };
//                       if (typeName.includes('Triple')) typeColor = { color: '#8b5cf6', bg: '#f3e8ff' };
//                       if (typeName.includes('Quad')) typeColor = { color: '#f97316', bg: '#ffedd5' };
//                     }

//                     const rent = new Intl.NumberFormat('en-IN').format(t.monthlyRent || 0);
//                     const statusClass =
//                       t.status === "Active" ? "active" :
//                       t.status === "Absconded" ? "absconded" :
//                       t.status === "PENDING" ? "pending" : "other";

//                     return (
//                       <tr key={t.id}>
//                         <td>
//                           <div className="flex items-center gap-3">
//                             <div className="tn-avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
//                               {t.tenantPhoto ? (
//                                 <img src={`${getApiOrigin()}${t.tenantPhoto}`} alt={t.name} />
//                               ) : getInitials(t.name)}
//                             </div>
//                             <div>
//                               <div className="tn-name">{t.name || "Unknown"}</div>
//                               <div className="tn-email">{t.email || "No email provided"}</div>
//                             </div>
//                           </div>
//                         </td>
//                         <td>
//                           <div className="tn-room-name">{rNo} - Bed {bNo}</div>
//                           <div className="tn-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
//                             {typeName}
//                           </div>
//                         </td>
//                         <td>
//                           <div className="tn-branch-name">{branchName(t.roomId)}</div>
//                         </td>
//                         <td>
//                           <div className="tn-contact">
//                             <Phone size={14} className="shrink-0" /> {t.phone}
//                           </div>
//                         </td>
//                         <td><div className="tn-date">{t.checkInDate}</div></td>
//                         <td><div className="tn-rent">₹{rent}</div></td>
//                         <td>
//                           <div className={`tn-status-badge ${statusClass}`}>
//                             <div className={`w-1.5 h-1.5 rounded-full ${
//                               t.status === 'Active' ? 'bg-green-500' :
//                               t.status === 'Absconded' ? 'bg-red-500' :
//                               t.status === 'PENDING' ? 'bg-amber-500' : 'bg-slate-400'
//                             }`}></div>
//                             {t.status}
//                           </div>
//                         </td>
//                         <td>
//                           <div className="flex justify-center gap-2">
//                             <button className="tn-action-btn" onClick={() => { setViewTenant(t); setViewOpen(true); }} title="View">
//                               <Eye size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
//                             </button>
//                             <button className="tn-action-btn" onClick={() => {
//                               const derivedBranchId = room ? getRoomUnitId(room) : NaN;
//                               setEditTenant(t);
//                               dispatch({ type: "load", payload: {
//                                 name: t.name, phone: t.phone, email: t.email || "",
//                                 idProofType: t.idProofType, idProofNumber: t.idProofNumber || "",
//                                 branchId: isNaN(derivedBranchId) ? "" : derivedBranchId,
//                                 roomId: t.roomId, bedId: t.bedId,
//                                 advance: String(t.advance), monthlyRent: String(t.monthlyRent),
//                                 currentReading: String(t.joinReading), acJoinReading: String(t.acJoinReading ?? ""),
//                                 checkInDate: t.checkInDate, idProofDoc: null, tenantPhoto: null,
//                               }});
//                               setEditOpen(true);
//                             }} title="Edit">
//                               <Pencil size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
//                             </button>
//                             <button className="tn-action-btn" onClick={() => handleDeleteTenant(t)} title="Delete">
//                               <Trash2 size={16} color="#ef4444" strokeWidth={2} className="shrink-0" />
//                             </button>
//                             {t.status === "Active" && (
//                               <button className="tn-action-btn" onClick={() => { setAbscondTarget(t); setAbscondOpen(true); }} title="Mark as Absconded">
//                                 <ShieldX size={16} color="#f97316" strokeWidth={2} className="shrink-0" />
//                               </button>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* ── CHANGED: pagination footer now driven entirely by
//              server-reported totalElements/totalPages, not by the
//              length of an in-memory full list. goToPage() fetches the
//              requested page directly rather than slicing locally. ── */}
//           <div className="tn-pagination">
//             <div className="tn-page-info">
//               Showing {totalElements === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} tenants
//             </div>
//             <div className="tn-page-controls">
//               <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" disabled={page === 0} onClick={() => goToPage(page - 1)}>
//                 <ChevronLeft className="h-4 w-4 shrink-0" />
//               </Button>
//               <button className="tn-page-btn active">{page + 1}</button>
//               {page + 1 < totalPages && (
//                 <button className="tn-page-btn" onClick={() => goToPage(page + 1)}>{page + 2}</button>
//               )}
//               <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" disabled={page + 1 >= totalPages} onClick={() => goToPage(page + 1)}>
//                 <ChevronRight className="h-4 w-4 shrink-0" />
//               </Button>
//             </div>
//           </div>
//         </div>

//       </div>

//       {/* Edit Dialog */}
//       <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) dispatch({ type: "reset" }); }}>
//         <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>Edit Tenant</DialogTitle>
//               <DialogDescription>Update tenant information and save your changes.</DialogDescription>
//             </DialogHeader>
//             <TenantForm
//               form={form} dispatch={dispatch} rooms={rooms} beds={beds}
//               branches={formBranches} branchLocked={isWarden}
//               editTenant={editTenant}
//               existingDoc={editTenant?.idProofDocument}
//               existingPhoto={editTenant?.tenantPhoto}
//             />
//             <DialogFooter>
//               <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
//               <Button className="rounded-lg" onClick={handleEdit}>Update Tenant</Button>
//             </DialogFooter>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* View Dialog */}
//       <Dialog open={viewOpen} onOpenChange={setViewOpen}>
//         <DialogContent className="max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>Tenant Details</DialogTitle>
//               <DialogDescription>View complete information about this tenant.</DialogDescription>
//             </DialogHeader>
//             {viewTenant && (
//               <div className="grid gap-2 text-sm">
//                 <div className="flex justify-center mb-1">
//                   <div className="h-20 w-20 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
//                     {viewTenant.tenantPhoto ? (
//                       <img src={`${getApiOrigin()}${viewTenant.tenantPhoto}`} alt={viewTenant.name}
//                         className="h-full w-full object-cover" />
//                     ) : (
//                       <UserIcon className="h-8 w-8 text-muted-foreground shrink-0" />
//                     )}
//                   </div>
//                 </div>

//                 {([
//                   ["Name",           viewTenant.name],
//                   ["Phone",          viewTenant.phone],
//                   ["Email",          viewTenant.email || "-"],
//                   ["Identity Proof", viewTenant.idProofType],
//                   ["ID Number",      viewTenant.idProofNumber],
//                   ["Branch",         branchName(viewTenant.roomId)],
//                   ["Room",           roomNo(viewTenant.roomId)],
//                   ["Bed",            bedNo(viewTenant.bedId)],
//                   ["Status",         viewTenant.status],
//                   ["Check-in",       viewTenant.checkInDate],
//                   ["Check-out",      viewTenant.checkOutDate ?? "-"],
//                 ] as [string, string][]).map(([label, val]) => (
//                   <p key={label}><span className="font-medium">{label}:</span> {val}</p>
//                 ))}
//                 {viewTenant.idProofDocument ? (
//                   <p className="flex items-center gap-1">
//                     <span className="font-medium">ID Document:</span>{" "}
//                     <a href={`${getApiOrigin()}${viewTenant.idProofDocument}`}
//                       target="_blank" rel="noopener noreferrer"
//                       className="text-blue-600 underline flex items-center gap-1">
//                       <FileText className="h-3 w-3 shrink-0" /> View / Download
//                     </a>
//                   </p>
//                 ) : (
//                   <p className="text-muted-foreground text-xs">No ID document uploaded</p>
//                 )}
//                 {viewTenant.status === "Absconded" && (
//                   <div className="mt-1 rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800 space-y-1">
//                     <p className="font-semibold flex items-center gap-1">
//                       <ShieldX className="h-3 w-3 shrink-0" /> This tenant is marked Absconded
//                     </p>
//                   </div>
//                 )}
//                 {viewTenant.status === "PENDING" && (
//                   <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
//                     <p className="font-semibold flex items-center gap-1">
//                       <ClipboardCheck className="h-3 w-3 shrink-0" /> Awaiting room/bed allocation and approval
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}
//             <DialogFooter>
//               <Button variant="outline" className="rounded-lg" onClick={() => setViewOpen(false)}>Close</Button>
//             </DialogFooter>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Mark Absconded Dialog */}
//       <Dialog open={abscondOpen} onOpenChange={(open) => {
//         setAbscondOpen(open);
//         if (!open) { setAbscondTarget(null); setAbscondReason(""); }
//       }}>
//         <DialogContent className="rounded-2xl [&>button]:hidden">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-orange-600">
//               <ShieldX className="h-5 w-5 shrink-0" /> Mark as Absconded
//             </DialogTitle>
//             <DialogDescription>
//               Use this when a tenant has vacated the bed without giving notice.
//               The bed will be freed and a fraud flag will be set on this tenant
//               so other branches are warned on re-check-in.
//             </DialogDescription>
//           </DialogHeader>
//           {abscondTarget && (
//             <div className="space-y-3">
//               <p className="text-sm font-medium">
//                 Tenant: <span className="text-foreground">{abscondTarget.name}</span>
//                 {" "}· Room {roomNo(abscondTarget.roomId)}
//                 {" "}· Bed {bedNo(abscondTarget.bedId)}
//               </p>
//               <div className="space-y-1.5">
//                 <label className="text-xs font-medium text-muted-foreground">
//                   Reason (optional — defaults to "left without notice")
//                 </label>
//                 <Input
//                   className="rounded-lg"
//                   placeholder="e.g. Bed found empty on 15 Jun, tenant unreachable"
//                   value={abscondReason}
//                   onChange={(e) => setAbscondReason(e.target.value)}
//                 />
//               </div>
//             </div>
//           )}
//           <DialogFooter>
//             <Button variant="outline" className="rounded-lg" onClick={() => setAbscondOpen(false)}>Cancel</Button>
//             <Button variant="destructive" className="rounded-lg" onClick={handleMarkAbsconded}>
//               Confirm — Mark Absconded
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* APPROVE & ALLOCATE DIALOG */}
//       <Dialog open={approveOpen} onOpenChange={(open) => {
//         setApproveOpen(open);
//         if (!open) { setApproveTarget(null); setApproveForm(EMPTY_APPROVE_FORM); }
//       }}>
//         <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>Approve Tenant</DialogTitle>
//               <DialogDescription>
//                 Assign a room and bed for <span className="font-medium">{approveTarget?.name}</span> to complete check-in.
//               </DialogDescription>
//             </DialogHeader>

//             <div className="space-y-4 mt-2">
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Branch</label>
//                   <Select
//                     value={approveForm.branchId ? String(approveForm.branchId) : ""}
//                     disabled={isWarden}
//                     onValueChange={(v) => setApproveForm(f => ({ ...f, branchId: Number(v), roomId: "", bedId: "" }))}
//                   >
//                     <SelectTrigger className="rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
//                     <SelectContent>
//                       {formBranches.map((b) => (
//                         <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>
//                           {getBranchDisplayName(b)}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Room</label>
//                   <Select
//                     value={approveForm.roomId ? String(approveForm.roomId) : ""}
//                     disabled={!approveForm.branchId}
//                     onValueChange={(v) => setApproveForm(f => ({ ...f, roomId: Number(v), bedId: "" }))}
//                   >
//                     <SelectTrigger className="rounded-lg"><SelectValue placeholder={approveForm.branchId ? "Room" : "Select branch first"} /></SelectTrigger>
//                     <SelectContent>
//                       {rooms
//                         .filter((r) => Number(getRoomUnitId(r)) === Number(approveForm.branchId))
//                         .filter((r) => beds.filter((b) => Number(b.roomId) === Number(r.id) && !b.isOccupied).length > 0)
//                         .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Bed</label>
//                   <Select
//                     value={approveForm.bedId ? String(approveForm.bedId) : ""}
//                     disabled={!approveForm.roomId}
//                     onValueChange={(v) => setApproveForm(f => ({ ...f, bedId: Number(v) }))}
//                   >
//                     <SelectTrigger className="rounded-lg"><SelectValue placeholder={approveForm.roomId ? "Bed" : "Select room first"} /></SelectTrigger>
//                     <SelectContent>
//                       {beds
//                         .filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !b.isOccupied)
//                         .map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
//                       {approveForm.roomId &&
//                         beds.filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !b.isOccupied).length === 0 && (
//                           <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
//                         )}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Advance</label>
//                   <Input className="rounded-lg" type="number" value={approveForm.advance}
//                     onChange={(e) => setApproveForm(f => ({ ...f, advance: e.target.value }))} />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Monthly Rent</label>
//                   <Input className="rounded-lg" type="number" value={approveForm.monthlyRent}
//                     onChange={(e) => setApproveForm(f => ({ ...f, monthlyRent: e.target.value }))} />
//                 </div>
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">Join EB Reading</label>
//                   <Input className="rounded-lg" type="number" value={approveForm.joinReading}
//                     onChange={(e) => setApproveForm(f => ({ ...f, joinReading: e.target.value }))} />
//                 </div>
//               </div>

//               {approveRoomHostelType === "AC" && (
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">AC Join Reading</label>
//                   <Input className="rounded-lg" type="number" value={approveForm.acJoinReading}
//                     onChange={(e) => setApproveForm(f => ({ ...f, acJoinReading: e.target.value }))} />
//                 </div>
//               )}
//             </div>

//             <DialogFooter className="mt-4">
//               <Button variant="outline" className="rounded-lg" onClick={() => setApproveOpen(false)}>Cancel</Button>
//               <Button className="rounded-lg" onClick={handleApprove}>Approve & Check-In</Button>
//             </DialogFooter>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* CONFIRM DIALOG */}
//       <Dialog open={!!confirmState} onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
//         <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
//           <DialogHeader>
//             <DialogTitle>{confirmState?.title}</DialogTitle>
//             {confirmState?.description && (
//               <DialogDescription>{confirmState.description}</DialogDescription>
//             )}
//           </DialogHeader>
//           <DialogFooter>
//             <Button variant="outline" className="rounded-lg" onClick={() => setConfirmState(null)}>Cancel</Button>
//             <Button
//               variant={confirmState?.danger ? undefined : "default"}
//               className={confirmState?.danger ? "tn-delete-confirm-btn rounded-lg" : "rounded-lg"}
//               onClick={() => {
//                 const action = confirmState?.onConfirm;
//                 setConfirmState(null);
//                 action?.();
//               }}
//             >
//               {confirmState?.confirmLabel ?? "OK"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//     </div>
//   );
// };

// export default TenantsPage;







































































































































































































import { useEffect, useMemo, useState, useRef, useCallback, useReducer } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addTenant, updateTenant, deleteTenant,
  importTenantsExcel, getUserRole, getBranchId,
  checkFraud, markAbsconded,
  getPendingTenants, approveAndAllocateTenant,
} from "@/lib/store";
import { Room, Bed, Tenant, IdProofType, Branch, FraudCheckResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Download, RefreshCw, ChevronLeft, ChevronRight, X, ClipboardCheck,
} from "lucide-react";
import api from "@/lib/api";

/* ── Constants ──────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE     = 10;

/* Reference-data (rooms/beds) fan-out page size. */
const REF_DATA_PAGE_SIZE = 10;

/* How long refreshed rooms/beds/branches data is considered "fresh"
   before a dialog-open will trigger another full refetch. */
const REF_DATA_CACHE_MS = 20_000;

/* Phone numbers everywhere in this file are stored/validated as
   exactly 10 digits, digits-only (no spaces, +91, dashes, etc). */
const PHONE_LENGTH = 10;
const sanitizePhoneInput = (raw: string) => raw.replace(/\D/g, "").slice(0, PHONE_LENGTH);
const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

const getApiOrigin = (): string => {
  const base = api.defaults.baseURL ?? "";
  try { return new URL(base).origin; } catch { return ""; }
};

/* ── Generic paginated fetcher (still used for rooms/beds, which are
   genuinely small reference sets we want fully in memory for lookups
   like roomNo()/bedNo()/branchName() below) ──────────────────────── */
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

/* ── CHANGED: fetchTenantsPage now also accepts an optional `search`
   term AND an optional `status` term, both forwarded as query params
   so the backend can filter server-side. If your /tenants endpoint
   doesn't yet support these params, they're simply ignored server-side
   and have no effect — safe to ship either way. See the accompanying
   backend notes for the matching Spring controller/service/repository
   changes needed to make `status` actually filter. ── */
const fetchTenantsPage = async (
  page: number, size: number, unitId?: string, search?: string, status?: string
): Promise<{ content: Tenant[]; totalElements: number }> => {
  const params: Record<string, any> = { page, size };
  if (unitId && unitId !== "all") params.unitId = unitId;
  if (search && search.trim()) params.search = search.trim();
  if (status && status !== "all") params.status = status;
  const res = await api.get("/tenants", { params });
  return {
    content:       res.data?.data?.content ?? [],
    totalElements: res.data?.data?.totalElements ?? 0,
  };
};

/* ── Rooms/beds fetchers ── */
const fetchRoomsFresh = async (pg = 0, size = REF_DATA_PAGE_SIZE, forceFresh = false) => {
  const params: Record<string, any> = { page: pg, size };
  if (forceFresh) params._ = Date.now();
  const res = await api.get("/rooms", { params });
  return {
    content:       res.data?.data?.content ?? res.data?.content ?? [],
    totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
  };
};

const fetchBedsFresh = async (pg = 0, size = REF_DATA_PAGE_SIZE, forceFresh = false) => {
  const params: Record<string, any> = { page: pg, size };
  if (forceFresh) params._ = Date.now();
  const res = await api.get("/beds", { params });
  return {
    content:       res.data?.data?.content ?? res.data?.content ?? [],
    totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
  };
};

/* ══════════════════════════════════════════════════════════════════
   BRANCH RESOLUTION HELPERS
   ══════════════════════════════════════════════════════════════════ */
const fetchAndNormalizeBranches = async (): Promise<Branch[]> => {
  try {
    const res = await api.get("/units", { params: { page: 0, size: 10 } });
    const raw = res.data?.data;

    let rawList: any[] = [];
    if (Array.isArray(raw))              rawList = raw;
    else if (Array.isArray(raw?.content)) rawList = raw.content;
    else if (Array.isArray(res.data?.content)) rawList = res.data.content;
    else if (Array.isArray(res.data))    rawList = res.data;

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

/* ── Form state ─────────────────────────────────────────────────── */
type FormState = {
  name: string; phone: string; email: string;
  idProofType: IdProofType | ""; idProofNumber: string;
  branchId: number | ""; roomId: number | ""; bedId: number | "";
  advance: string; monthlyRent: string;
  currentReading: string; acJoinReading: string;
  checkInDate: string; idProofDoc: File | null;
  tenantPhoto: File | null;
};

const EMPTY_FORM: FormState = {
  name: "", phone: "", email: "", idProofType: "", idProofNumber: "",
  branchId: "", roomId: "", bedId: "", advance: "", monthlyRent: "",
  currentReading: "", acJoinReading: "", checkInDate: "", idProofDoc: null,
  tenantPhoto: null,
};

type FormAction =
  | { type: "set"; field: keyof FormState; value: any }
  | { type: "reset" }
  | { type: "load"; payload: Partial<FormState> };

const formReducer = (state: FormState, action: FormAction): FormState => {
  if (action.type === "reset") return { ...EMPTY_FORM };
  if (action.type === "load")  return { ...EMPTY_FORM, ...action.payload };
  return { ...state, [action.field]: action.value };
};

type ApproveFormState = {
  branchId: number | "";
  roomId: number | "";
  bedId: number | "";
  advance: string;
  monthlyRent: string;
  joinReading: string;
  acJoinReading: string;
};

const EMPTY_APPROVE_FORM: ApproveFormState = {
  branchId: "", roomId: "", bedId: "",
  advance: "", monthlyRent: "", joinReading: "", acJoinReading: "",
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
        <p className="text-xs text-green-600 flex items-center gap-1">
          <FileText className="h-3 w-3 shrink-0" />
          {idProofDoc.name}
          <span className="text-muted-foreground">({(idProofDoc.size / 1024).toFixed(1)} KB)</span>
        </p>
      )}
      {!idProofDoc && existing && (
        <a href={`${getApiOrigin()}${existing}`} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 underline flex items-center gap-1">
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
            <p className="text-xs text-green-600 flex items-center gap-1">
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
                  className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-green-700 hover:bg-green-200 font-medium">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
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
}: {
  form: FormState; dispatch: React.Dispatch<FormAction>;
  rooms: Room[]; beds: Bed[]; branches: Branch[]; editTenant?: Tenant | null;
  existingDoc?: string | null; existingPhoto?: string | null; fraudResult?: FraudCheckResponse | null;
  branchLocked?: boolean;
}) => {
  const [roomSearch, setRoomSearch] = useState("");
  const set = (field: keyof FormState) => (value: any) => dispatch({ type: "set", field, value });
  const isAC = rooms.find((r) => r.id === Number(form.roomId))?.hostelType === "AC";

  const alreadyHasLogin = !!(editTenant && ((editTenant as any).userId || (editTenant as any).user));

  const isBedOccupied = (b: Bed) =>
    b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";

  const selectedBranchObj = branches.find((b) => Number(getBranchRawId(b)) === Number(form.branchId));
  const selectedBranchName = getBranchDisplayName(selectedBranchObj).trim().toLowerCase();

  const roomsById = form.branchId
    ? rooms.filter((r) => Number(getRoomUnitId(r)) === Number(form.branchId))
    : [];

  const branchScopedRooms = (roomsById.length > 0 || !selectedBranchName)
    ? roomsById
    : rooms.filter((r) => getRoomUnitName(r).trim().toLowerCase() === selectedBranchName);

  /* ── NEW: a room only belongs in the picklist if it still has at
     least one free bed. Without this, a fully-occupied room (like
     "101" — 2/2 beds taken) stayed selectable in the Room dropdown
     and only failed afterwards with "No available beds in this
     room" once you tried to pick a bed. This filters those rooms out
     up front.

     Exception: if we're editing a tenant who is already assigned to
     that room, we keep it visible — otherwise you'd be unable to see/
     edit a tenant's own room just because their own bed makes the
     room look "full". (Their own bed is separately excluded from the
     "occupied" check in availableBeds below.) If no bed data has
     loaded yet for a room (roomBeds.length === 0), we don't hide it —
     that's a "we don't know yet" state, not "full". ── */
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

  return (
    <div className="space-y-4">
      {fraudResult && <FraudCard fraud={fraudResult} tenantName={form.name} tenantPhone={form.phone} />}

      <TenantPhotoUploadField
        tenantPhoto={form.tenantPhoto}
        existing={existingPhoto}
        onChange={set("tenantPhoto")}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input className="rounded-lg" placeholder="Name"  value={form.name}  onChange={(e) => set("name")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input
            className="rounded-lg"
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input className="rounded-lg" placeholder="Email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
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
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
            <SelectContent>
              {ID_PROOF_TYPE_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ID Proof Number</label>
          <Input className="rounded-lg" placeholder="ID Proof Number" value={form.idProofNumber}
            onChange={(e) => set("idProofNumber")(e.target.value)} />
        </div>
      </div>

      <IdProofUploadField idProofDoc={form.idProofDoc} existing={existingDoc} onChange={set("idProofDoc")} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Branch</label>
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
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>
                  {getBranchDisplayName(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Room</label>
          <Select value={form.roomId ? String(form.roomId) : ""}
            disabled={!form.branchId}
            onValueChange={(v) => {
              set("roomId")(Number(v));
              set("bedId")("");
              setRoomSearch("");
            }}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder={form.branchId ? "Room" : "Select a branch first"} /></SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                <Input placeholder="Search room..." value={roomSearch}
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Bed</label>
          <Select value={form.bedId ? String(form.bedId) : ""}
            disabled={!form.roomId}
            onValueChange={(v) => set("bedId")(Number(v))}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder={form.roomId ? "Bed" : "Select a room first"} /></SelectTrigger>
            <SelectContent>
              {availableBeds.map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
              {form.roomId && availableBeds.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Advance</label>
          <Input className="rounded-lg" type="number" placeholder="Advance" value={form.advance} onChange={(e) => set("advance")(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Rent</label>
          <Input className="rounded-lg" type="number" placeholder="Rent" value={form.monthlyRent} onChange={(e) => set("monthlyRent")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Current EB Reading</label>
          <Input className="rounded-lg" type="number" placeholder="Current EB Reading" value={form.currentReading} onChange={(e) => set("currentReading")(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isAC ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">AC Current Reading (optional)</label>
            <Input className="rounded-lg" type="number" placeholder="AC Current Reading"
              value={form.acJoinReading} onChange={(e) => set("acJoinReading")(e.target.value)} />
          </div>
        ) : <div />}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Check-in Date</label>
          <Input className="rounded-lg" type="date" value={form.checkInDate} onChange={(e) => set("checkInDate")(e.target.value)} />
        </div>
      </div>
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

  /* ── CHANGED: `tenants` now holds ONE PAGE only, not the full
     matching set. `totalElements` tracks the server-reported total
     so the pagination footer and page-count math no longer depend
     on having fetched every row. ── */
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

  /* ── NEW: status filter (All / Active / Checked Out / Absconded).
     Pending tenants are intentionally NOT one of the options here —
     they already get their own dedicated "Pending Approvals" table
     above (via getPendingTenants) and continue to show there
     regardless of what this filter is set to. This is what lets you
     actually isolate Checked-Out or Absconded tenants instead of
     them being mixed in with everyone else across pages. ── */
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const selectedStatusRef = useRef(selectedStatus);
  useEffect(() => { selectedStatusRef.current = selectedStatus; }, [selectedStatus]);

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

  const [form, dispatch] = useReducer(formReducer, EMPTY_FORM);

  const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
  const [approveOpen,    setApproveOpen]    = useState(false);
  const [approveTarget,  setApproveTarget]  = useState<Tenant | null>(null);
  const [approveForm,    setApproveForm]    = useState<ApproveFormState>(EMPTY_APPROVE_FORM);

  const loadPendingTenants = useCallback(async () => {
    try {
      const list = await getPendingTenants();
      setPendingTenants(Array.isArray(list) ? list : []);
    } catch {
      // non-critical — the pending list simply won't refresh this cycle
    }
  }, []);

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

  /* ── When the Add dialog opens, pre-lock a warden's branch ── */
  useEffect(() => {
    if (!addOpen) return;
    if (isWarden && branchId != null && !form.branchId) {
      dispatch({ type: "set", field: "branchId", value: Number(branchId) });
    }
  }, [addOpen, isWarden, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Refresh reference data (rooms + beds + branches) ── */
  const refreshReferenceData = useCallback(async (force = false) => {
    if (!force && Date.now() - refDataFetchedAt.current < REF_DATA_CACHE_MS) {
      return;
    }
    try {
      const [allRooms, allBeds, allBranches] = await Promise.all([
        fetchAllPages<Room>((pg, size) => fetchRoomsFresh(pg, size, force)),
        fetchAllPages<Bed>((pg, size) => fetchBedsFresh(pg, size, force)),
        fetchAndNormalizeBranches(),
      ]);

      allRoomsRef.current = allRooms;
      allBedsRef.current  = allBeds;

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

  /* ── CHANGED: loadTenants now fetches exactly ONE page from the
     server per call instead of looping until every page is fetched.
     This is the fix for the "tenants?page=0" immediately followed by
     "tenants?page=1" (etc) sequential waterfall seen in DevTools —
     that pattern is gone entirely now; each call is a single request.

     Accepts an explicit `pg` so callers (pagination buttons, branch
     filter changes, search) can request a specific page without
     relying on stale closure state. Defaults to the current `page`
     state when not provided.

     ── NEW: also accepts an explicit `status`. Defaults to whatever
     the Status filter dropdown is currently set to
     (selectedStatusRef.current), so any caller that doesn't care
     about status (edit/delete/absconded flows, pagination buttons,
     etc) automatically keeps respecting the active filter. ── */
  const loadTenants = useCallback(async (
    branch?: string,
    pg?: number,
    searchTerm?: string,
    status?: string
  ) => {
    setLoading(true);
    try {
      const activeBranch = branch ?? selectedBranchRef.current;
      const activePage   = pg ?? page;
      const activeSearch = searchTerm ?? search;
      const activeStatus = status ?? selectedStatusRef.current;
      const { content, totalElements: total } =
        await fetchTenantsPage(activePage, PAGE_SIZE, activeBranch, activeSearch, activeStatus);
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
      } catch (err) {
        console.error("[TenantsPage] initial load error:", err);
        toast.error("Failed to load reference data");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (addOpen || editOpen || approveOpen) refreshReferenceData();
  }, [addOpen, editOpen, approveOpen, refreshReferenceData]);

  /* ── CHANGED: branch-filter change resets to page 0 and fetches
     that single page directly (was previously delegating to the
     old fetch-everything loadTenants). ── */
  const branchFilterMounted = useRef(false);
  useEffect(() => {
    if (!branchFilterMounted.current) { branchFilterMounted.current = true; return; }
    setPage(0);
    loadTenants(selectedBranch, 0);
  }, [selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── NEW: status-filter change resets to page 0 and re-fetches that
     single page with the chosen status applied server-side. This is
     the actual mechanism that lets "Checked Out" and "Absconded" be
     viewed as their own filtered lists instead of being scattered
     across the "All Tenants" pagination. ── */
  const statusFilterMounted = useRef(false);
  useEffect(() => {
    if (!statusFilterMounted.current) { statusFilterMounted.current = true; return; }
    setPage(0);
    loadTenants(selectedBranch, 0, undefined, selectedStatus);
  }, [selectedStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── NEW: debounced server-side search. Typing in the search box
     resets to page 0 and re-fetches from the server after a short
     pause, instead of filtering an in-memory full list (which no
     longer exists now that tenants only holds one page). ── */
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchMounted = useRef(false);
  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return; }
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

  const extractError = (e: any, fallback: string) =>
    e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

  const buildFormData = () => {
    const fd = new FormData();
    if (form.name)          fd.append("name", form.name);
    if (form.phone)         fd.append("phone", form.phone);
    if (form.email)         fd.append("email", form.email);
    if (form.idProofType)   fd.append("idProofType", form.idProofType);
    if (form.idProofNumber) fd.append("idProofNumber", form.idProofNumber);
    if (form.roomId !== "") fd.append("roomId", String(form.roomId));
    if (form.bedId  !== "") fd.append("bedId",  String(form.bedId));
    fd.append("advance",     form.advance     || "0");
    fd.append("monthlyRent", form.monthlyRent || "0");
    fd.append("joinReading", form.currentReading || "0");
    if (form.acJoinReading) fd.append("acJoinReading", form.acJoinReading);
    if (form.checkInDate)   fd.append("checkInDate", form.checkInDate);
    if (form.idProofDoc)    fd.append("idProofDocument", form.idProofDoc);
    if (form.tenantPhoto)   fd.append("tenantPhoto", form.tenantPhoto);
    return fd;
  };

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.branchId || !form.roomId || !form.bedId) {
      toast.error("Fill required fields"); return;
    }
    if (!isValidPhone(form.phone)) {
      toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`); return;
    }
    try {
      const newTenant: Tenant = await addTenant(buildFormData());
      const fraudCheck = (newTenant as any)?.fraudCheck ?? null;
      if (fraudCheck?.fraud) {
        setAddResultFraud(fraudCheck);
        toast.warning("Tenant added — but fraud history was detected. Review the alert.");
      } else {
        const hadInlineLogin = !!form.email;
        const pendingLoginPrefill = {
          name: form.name,
          phone: form.phone,
          email: form.email,
          branchId: form.branchId,
        };

        setAddOpen(false);
        dispatch({ type: "reset" });
        setLiveFraud(null);
        toast.success(
          hadInlineLogin
            ? "Tenant added and login created — credentials emailed"
            : "Tenant added"
        );

        if (!hadInlineLogin) {
          setPage(0);
          loadTenantsRef.current(undefined, 0);
          reloadBeds();
          navigate("/users", {
            state: {
              openAddUser: true,
              prefill: pendingLoginPrefill,
              role: "TENANT",
            },
          });
          return;
        }
      }
      setPage(0);
      await Promise.all([loadTenantsRef.current(undefined, 0), reloadBeds()]);
    } catch (e: any) {
      toast.error(extractError(e, "Failed to add tenant"));
    }
  };

  const handleEdit = async () => {
    if (!editTenant) return;
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`); return;
    }
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
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
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

  const handleExcelImport = async () => {
    if (!excelFile) { toast.error("Please select an Excel file first"); return; }
    try {
      await importTenantsExcel(excelFile);
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

  /* ── CHANGED: `tenants` is now already exactly the current page
     from the server — no further client-side slicing needed. Search
     and status are handled server-side via the debounced/status
     effects above, so there's no more filteredTenants/paginatedTenants
     derivation here. ── */
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const goToPage = (newPage: number) => {
    setPage(newPage);
    loadTenants(selectedBranch, newPage);
  };

  /* ── NOTE ON STATS: these previously summarized the FULL tenant
     list (every page). Now that `tenants` only holds the current
     page, these numbers would only reflect ~10 rows, which is
     misleading. Rather than show wrong numbers, this card set is
     removed from render below. If you want accurate global stats
     back, the clean fix is a small dedicated endpoint —
     GET /tenants/stats returning { active, absconded, checkedOut,
     withDoc } as COUNT() queries — which is a single fast indexed
     query instead of pulling every tenant row to count them in the
     browser. Happy to write that endpoint + wire it back in if you
     want the stat cards restored. ── */

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  /* ── NEW: human-friendly label for raw backend status values.
     Backend enum values are things like "Active", "Checked_Out",
     "Absconded", "PENDING" — this just prettifies the underscore
     ones for display without changing what's sent to/from the API. ── */
  const statusLabel = (s?: string) => {
    if (!s) return "-";
    if (s === "Checked_Out") return "Checked Out";
    if (s === "PENDING") return "Pending";
    return s;
  };

  const COLORS = [
    { color: '#8b5cf6', bg: '#f3e8ff' },
    { color: '#3b82f6', bg: '#eff6ff' },
    { color: '#22c55e', bg: '#dcfce7' },
    { color: '#f97316', bg: '#ffedd5' },
    { color: '#ec4899', bg: '#fce7f3' },
    { color: '#64748b', bg: '#f1f5f9' },
    { color: '#14b8a6', bg: '#ccfbf1' },
  ];

  /* ── Render ── */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .tn-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .tn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .tn-stat-card { background: #fff; border-radius: 16px; padding: 20px 24px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: all 0.2s; }
        .tn-stat-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.06); transform: translateY(-1px); }
        .tn-stat-icon-wrapper { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .tn-stat-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tn-stat-value { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tn-stat-subtext { font-size: 12px; font-weight: 500; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }

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
        .tn-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; }

        .tn-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .tn-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .tn-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; white-space: nowrap; }
        .tn-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; white-space: nowrap; }
        .tn-table tr:last-child td { border-bottom: none; }
        .tn-table tr:hover { background: #fdfcff; }

        .tn-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; overflow: hidden; }
        .tn-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tn-name { font-size: 14px; font-weight: 600; color: #0f172a; }
        .tn-email { font-size: 12px; color: #64748b; margin-top: 2px; }

        .tn-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .tn-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-top: 6px; }

        .tn-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

        .tn-contact { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #475569; }

        .tn-date { font-size: 13px; font-weight: 500; color: #0f172a; }
        .tn-rent { font-size: 13px; font-weight: 600; color: #0f172a; }

        .tn-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .tn-status-badge.active { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .tn-status-badge.absconded { color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; }
        .tn-status-badge.checkedout { color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; }
        .tn-status-badge.pending { color: #d97706; background: #fffbeb; border: 1px solid #fde68a; }
        .tn-status-badge.other { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

        .tn-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
        .tn-action-btn:hover { background: #f8fafc; color: #0f172a; }

        .tn-action-btn svg { width: 16px !important; height: 16px !important; flex-shrink: 0; display: inline-block; }
        .tn-contact svg { width: 14px !important; height: 14px !important; flex-shrink: 0; display: inline-block; }

        .tn-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; }
        .tn-page-info { font-size: 13px; color: #64748b; }
        .tn-page-controls { display: flex; align-items: center; gap: 8px; }
        .tn-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .tn-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }

        .tn-delete-confirm-btn {
          background: linear-gradient(to right, #ffffff, #ef4444);
          color: #b91c1c;
          border: 1px solid #fca5a5;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.25s ease;
        }
        .tn-delete-confirm-btn:hover {
          background: linear-gradient(to right, #ef4444, #dc2626);
          color: #ffffff;
          border-color: #dc2626;
        }

        .tn-pending-header { display: flex; align-items: center; gap: 8px; padding: 16px 20px 4px; }
        .tn-pending-title { font-size: 15px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .tn-pending-count { color: #d97706; background: #fffbeb; border: 1px solid #fde68a; border-radius: 20px; padding: 1px 10px; font-size: 12px; font-weight: 700; }
      `}</style>

      <div className="tn-wrap">

        {/* Main Content Header */}
        <div className="tn-main-header">
          <div className="tn-main-title">All Tenants</div>

          <div className="tn-controls">
            <Input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="w-44 rounded-lg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_FILE_SIZE) { toast.error("File size must be below 10 MB"); e.target.value = ""; return; }
                setExcelFile(file);
              }} />
            <button className="tn-btn-outline" onClick={handleExcelImport} disabled={!excelFile}>
              <Download size={16} className="shrink-0" /> Import Excel
            </button>

            <Dialog open={addOpen} onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) { dispatch({ type: "reset" }); setLiveFraud(null); setAddResultFraud(null); }
            }}>
              <DialogTrigger asChild>
                <button className="tn-btn-primary">
                  <UserPlus size={16} className="shrink-0" /> Check-In
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
                <div className="relative max-h-[90vh] overflow-y-auto p-6">
                  <DialogClose asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => { setAddResultFraud(null); setLiveFraud(null); }}
                    >
                      <X className="h-4 w-4 shrink-0" />
                    </button>
                  </DialogClose>
                  <DialogHeader>
                    <DialogTitle>Add Tenant</DialogTitle>
                    <DialogDescription>
                      Enter tenant details and assign an available room and bed. Fill in Email to also create a login — the password will be generated automatically and emailed to the tenant.
                    </DialogDescription>
                  </DialogHeader>
                  {addResultFraud && (
                    <FraudCard fraud={addResultFraud} tenantName={form.name} tenantPhone={form.phone} />
                  )}
                  {!addResultFraud && (
                    <TenantForm
                      form={form} dispatch={dispatch} rooms={rooms} beds={beds}
                      branches={formBranches} branchLocked={isWarden} fraudResult={liveFraud}
                    />
                  )}
                  <DialogFooter>
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
                <ClipboardCheck size={18} className="shrink-0" style={{ color: "#d97706" }} />
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
                          <div className="tn-avatar" style={{ background: '#fffbeb', color: '#d97706' }}>
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
                          <Phone size={14} className="shrink-0" /> {t.phone}
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

        {/* Filters */}
        <div className="tn-filters-row">
          <div className="tn-search-main">
            <Search size={16} color="#94a3b8" className="shrink-0" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isWarden}>
            <SelectTrigger className="w-[160px] h-[38px] bg-white border border-slate-200 rounded-lg"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={getBranchRawId(b)} value={String(getBranchRawId(b))}>{getBranchDisplayName(b)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ── NEW: Status filter. This is what actually lets you pull
             up "just Checked Out" or "just Absconded" tenants instead
             of hunting for them across the mixed, paginated list. ── */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px] h-[38px] bg-white border border-slate-200 rounded-lg"><SelectValue placeholder="All Status" /></SelectTrigger>
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
            setPage(0);
            loadTenants(isWarden ? String(branchId ?? "all") : "all", 0, "", "all");
          }}>
            <RefreshCw size={14} className="shrink-0" /> Clear Filters
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
                  <th>RENT (₹)</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading tenants...</td></tr>
                ) : tenants.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No tenants found.</td></tr>
                ) : (
                  tenants.map((t) => {
                    const avatarColor = COLORS[t.id % COLORS.length];
                    const rNo = roomNo(t.roomId);
                    const bNo = bedNo(t.bedId);

                    const room = allRoomsRef.current.find((r) => r.id === t.roomId);
                    let typeName = "Standard";
                    let typeColor = { color: '#64748b', bg: '#f1f5f9' };
                    if (room) {
                      const rBeds = room.totalBeds || 1;
                      const prefix = rBeds === 1 ? 'Single' : rBeds === 2 ? 'Double' : rBeds === 3 ? 'Triple' : rBeds === 4 ? 'Quad' : `${rBeds} Bed`;
                      const suffix = room.hostelType === 'AC' ? 'AC' : room.hostelType === 'NON_AC' ? 'Non-AC' : room.hostelType;
                      typeName = `${prefix} ${suffix}`;
                      if (typeName.includes('Single')) typeColor = { color: '#3b82f6', bg: '#eff6ff' };
                      if (typeName.includes('Double')) typeColor = { color: '#22c55e', bg: '#dcfce7' };
                      if (typeName.includes('Triple')) typeColor = { color: '#8b5cf6', bg: '#f3e8ff' };
                      if (typeName.includes('Quad')) typeColor = { color: '#f97316', bg: '#ffedd5' };
                    }

                    const rent = new Intl.NumberFormat('en-IN').format(t.monthlyRent || 0);
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
                          <div className="tn-branch-name">{branchName(t.roomId)}</div>
                        </td>
                        <td>
                          <div className="tn-contact">
                            <Phone size={14} className="shrink-0" /> {t.phone}
                          </div>
                        </td>
                        <td><div className="tn-date">{t.checkInDate}</div></td>
                        <td><div className="tn-rent">₹{rent}</div></td>
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
                        </td>
                        <td>
                          <div className="flex justify-center gap-2">
                            <button className="tn-action-btn" onClick={() => { setViewTenant(t); setViewOpen(true); }} title="View">
                              <Eye size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                            </button>
                            <button className="tn-action-btn" onClick={() => {
                              const derivedBranchId = room ? getRoomUnitId(room) : NaN;
                              setEditTenant(t);
                              dispatch({ type: "load", payload: {
                                name: t.name, phone: t.phone, email: t.email || "",
                                idProofType: t.idProofType, idProofNumber: t.idProofNumber || "",
                                branchId: isNaN(derivedBranchId) ? "" : derivedBranchId,
                                roomId: t.roomId, bedId: t.bedId,
                                advance: String(t.advance), monthlyRent: String(t.monthlyRent),
                                currentReading: String(t.joinReading), acJoinReading: String(t.acJoinReading ?? ""),
                                checkInDate: t.checkInDate, idProofDoc: null, tenantPhoto: null,
                              }});
                              setEditOpen(true);
                            }} title="Edit">
                              <Pencil size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                            </button>
                            <button className="tn-action-btn" onClick={() => handleDeleteTenant(t)} title="Delete">
                              <Trash2 size={16} color="#ef4444" strokeWidth={2} className="shrink-0" />
                            </button>
                            {t.status === "Active" && (
                              <button className="tn-action-btn" onClick={() => { setAbscondTarget(t); setAbscondOpen(true); }} title="Mark as Absconded">
                                <ShieldX size={16} color="#f97316" strokeWidth={2} className="shrink-0" />
                              </button>
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

          {/* ── CHANGED: pagination footer now driven entirely by
             server-reported totalElements/totalPages, not by the
             length of an in-memory full list. goToPage() fetches the
             requested page directly rather than slicing locally. ── */}
          <div className="tn-pagination">
            <div className="tn-page-info">
              Showing {totalElements === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} tenants
            </div>
            <div className="tn-page-controls">
              <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" disabled={page === 0} onClick={() => goToPage(page - 1)}>
                <ChevronLeft className="h-4 w-4 shrink-0" />
              </Button>
              <button className="tn-page-btn active">{page + 1}</button>
              {page + 1 < totalPages && (
                <button className="tn-page-btn" onClick={() => goToPage(page + 1)}>{page + 2}</button>
              )}
              <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" disabled={page + 1 >= totalPages} onClick={() => goToPage(page + 1)}>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) dispatch({ type: "reset" }); }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
            />
            <DialogFooter>
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
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
                  ["Name",           viewTenant.name],
                  ["Phone",          viewTenant.phone],
                  ["Email",          viewTenant.email || "-"],
                  ["Identity Proof", viewTenant.idProofType],
                  ["ID Number",      viewTenant.idProofNumber],
                  ["Branch",         branchName(viewTenant.roomId)],
                  ["Room",           roomNo(viewTenant.roomId)],
                  ["Bed",            bedNo(viewTenant.bedId)],
                  ["Status",         statusLabel(viewTenant.status)],
                  ["Check-in",       viewTenant.checkInDate],
                  ["Check-out",      viewTenant.checkOutDate ?? "-"],
                ] as [string, string][]).map(([label, val]) => (
                  <p key={label}><span className="font-medium">{label}:</span> {val}</p>
                ))}
                {viewTenant.idProofDocument ? (
                  <p className="flex items-center gap-1">
                    <span className="font-medium">ID Document:</span>{" "}
                    <a href={`${getApiOrigin()}${viewTenant.idProofDocument}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" /> View / Download
                    </a>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">No ID document uploaded</p>
                )}
                {viewTenant.status === "Absconded" && (
                  <div className="mt-1 rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <ShieldX className="h-3 w-3 shrink-0" /> This tenant is marked Absconded
                    </p>
                  </div>
                )}
                {viewTenant.status === "Checked_Out" && (
                  <div className="mt-1 rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <FileCheck2 className="h-3 w-3 shrink-0" /> This tenant has checked out
                    </p>
                  </div>
                )}
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
            <DialogTitle className="flex items-center gap-2 text-orange-600">
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
                {" "}· Room {roomNo(abscondTarget.roomId)}
                {" "}· Bed {bedNo(abscondTarget.bedId)}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Reason (optional — defaults to "left without notice")
                </label>
                <Input
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
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>Approve Tenant</DialogTitle>
              <DialogDescription>
                Assign a room and bed for <span className="font-medium">{approveTarget?.name}</span> to complete check-in.
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
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
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
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder={approveForm.branchId ? "Room" : "Select branch first"} /></SelectTrigger>
                    <SelectContent>
                      {rooms
                        .filter((r) => Number(getRoomUnitId(r)) === Number(approveForm.branchId))
                        .filter((r) => beds.filter((b) => Number(b.roomId) === Number(r.id) && !b.isOccupied).length > 0)
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
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder={approveForm.roomId ? "Bed" : "Select room first"} /></SelectTrigger>
                    <SelectContent>
                      {beds
                        .filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !b.isOccupied)
                        .map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
                      {approveForm.roomId &&
                        beds.filter((b) => Number(b.roomId) === Number(approveForm.roomId) && !b.isOccupied).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No available beds in this room</div>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Advance</label>
                  <Input className="rounded-lg" type="number" value={approveForm.advance}
                    onChange={(e) => setApproveForm(f => ({ ...f, advance: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monthly Rent</label>
                  <Input className="rounded-lg" type="number" value={approveForm.monthlyRent}
                    onChange={(e) => setApproveForm(f => ({ ...f, monthlyRent: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Join EB Reading</label>
                  <Input className="rounded-lg" type="number" value={approveForm.joinReading}
                    onChange={(e) => setApproveForm(f => ({ ...f, joinReading: e.target.value }))} />
                </div>
              </div>

              {approveRoomHostelType === "AC" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">AC Join Reading</label>
                  <Input className="rounded-lg" type="number" value={approveForm.acJoinReading}
                    onChange={(e) => setApproveForm(f => ({ ...f, acJoinReading: e.target.value }))} />
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setApproveOpen(false)}>Cancel</Button>
              <Button className="rounded-lg" onClick={handleApprove}>Approve & Check-In</Button>
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