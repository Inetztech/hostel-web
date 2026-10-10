// import { useEffect, useMemo, useState, useCallback, useRef } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import api from "@/lib/api";
// import {
//   createRoom,
//   editRoom,
//   removeRoom,
//   getBranches,
//   getUserRole,
//   getBranchId,
//   getFlats,
//   createFlat,
// } from "@/lib/store";
// import { showBedLimitToast, isBedLimitError } from "@/lib/limitError";
// import { usePropertyType } from "@/lib/propertyType";

// import { Room, HostelType, Branch, Flat } from "@/lib/types";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle,
//   DialogTrigger, DialogDescription, DialogFooter, DialogClose,
// } from "@/components/ui/dialog";
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
//   AlertDialogDescription, AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import {
//   Plus, Pencil, Trash2,
//   Search, Download, RefreshCw,
//   ChevronLeft, ChevronRight, ChevronDown, Check, Building2, MoreHorizontal,
// } from "lucide-react";

// /* ================= GENERIC HELPER — fetch every page of any paginated store fn ================= */
// async function fetchAllPages<T>(
//   fetchFn: (page: number, size: number) => Promise<any>,
//   pageSize = 10
// ): Promise<T[]> {
//   const first = await fetchFn(0, pageSize);
//   const firstContent: T[] = first?.content ?? first ?? [];
//   const total: number     = first?.totalElements ?? firstContent.length;
//   if (total <= pageSize) return firstContent;
//   const totalPages = Math.ceil(total / pageSize);
//   const rest = await Promise.all(
//     Array.from({ length: totalPages - 1 }, (_, i) =>
//       fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
//     )
//   );
//   return [...firstContent, ...rest.flat()];
// }

// const idsMatch = (a: unknown, b: unknown): boolean =>
//   a != null && b != null && String(a) === String(b);

// const unwrapEntity = <T extends { id?: any }>(res: any): T | undefined => {
//   if (res && res.id != null) return res as T;
//   if (res?.data && res.data.id != null) return res.data as T;
//   if (res?.data?.data && res.data.data.id != null) return res.data.data as T;
//   return undefined;
// };

// // Spring's MethodArgumentNotValidException can come back in a few shapes depending on how
// // the global exception handler formats it. Try the common ones before giving up to `fallback`.
// const extractApiError = (e: any, fallback: string): string => {
//   const data = e?.response?.data;
//   if (!data) return fallback;
//   if (typeof data.message === "string" && data.message.trim()) return data.message;
//   if (Array.isArray(data.errors) && data.errors.length) {
//     return data.errors
//       .map((x: any) => (typeof x === "string" ? x : x.defaultMessage || x.message))
//       .filter(Boolean)
//       .join(", ");
//   }
//   if (typeof data.error === "string" && data.error.trim()) return data.error;
//   return fallback;
// };

// const getPageNumbers = (current: number, total: number): (number | "...")[] => {
//   const SIBLINGS = 1; // pages shown on each side of current
//   const totalNumbers = SIBLINGS * 2 + 5; // first, last, current, 2 ellipses buffer

//   if (total <= totalNumbers) {
//     return Array.from({ length: total }, (_, i) => i + 1);
//   }

//   const leftIndex = Math.max(current - SIBLINGS, 1);
//   const rightIndex = Math.min(current + SIBLINGS, total);

//   const showLeftEllipsis = leftIndex > 2;
//   const showRightEllipsis = rightIndex < total - 1;

//   const pages: (number | "...")[] = [];

//   pages.push(1);

//   if (showLeftEllipsis) pages.push("...");

//   for (let p = Math.max(leftIndex, 2); p <= Math.min(rightIndex, total - 1); p++) {
//     pages.push(p);
//   }

//   if (showRightEllipsis) pages.push("...");

//   if (total > 1) pages.push(total);

//   return pages;
// };

// function Field({
//   label, required, children, className,
// }: {
//   label: string;
//   required?: boolean;
//   children: React.ReactNode;
//   className?: string;
// }) {
//   return (
//     <div className={className} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//       <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", letterSpacing: 0.2, textTransform: "uppercase" }}>
//         {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// function BedCountPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
//   return (
//     <Input
//       type="number"
//       min={1}
//       aria-label="Total beds"
//       placeholder="e.g. 2"
//       value={value}
//       className="rounded-lg"
//       onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
//     />
//   );
// }

// export interface FlatAssignmentValue {
//   mode: "direct" | "flat";
//   flatId: string;      
//   newFlatNumber: string; 
// }

// const EMPTY_FLAT_ASSIGNMENT: FlatAssignmentValue = { mode: "direct", flatId: "", newFlatNumber: "" };

// function FlatAssignmentField({
//   unitId, flatsForBranch, value, onChange, allowDirect = true,
// }: {
//   unitId: string;
//   flatsForBranch: Flat[];
//   value: FlatAssignmentValue;
//   onChange: (v: FlatAssignmentValue) => void;
//   /** false in a Flat-based hostel: the "Direct Room (No Flat)" choice is not offered. */
//   allowDirect?: boolean;
// }) {
//   return (
//     <Field label={allowDirect ? "Room Assignment" : "Flat"} required={!allowDirect}>
//       <div style={{ display: allowDirect ? "flex" : "none", gap: 6, marginBottom: 8 }}>
//         <button
//           type="button"
//           disabled={!unitId}
//           aria-pressed={value.mode === "direct"}
//           onClick={() => onChange({ ...EMPTY_FLAT_ASSIGNMENT, mode: "direct" })}
//           style={{
//             flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
//             border: value.mode === "direct" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
//             background: value.mode === "direct" ? "#f5f3ff" : "#fff",
//             color: value.mode === "direct" ? "#5200FF" : "#475569",
//             cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
//           }}
//         >
//           Direct Room (No Flat)
//         </button>
//         <button
//           type="button"
//           disabled={!unitId}
//           aria-pressed={value.mode === "flat"}
//           onClick={() => onChange({ ...value, mode: "flat" })}
//           style={{
//             flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
//             border: value.mode === "flat" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
//             background: value.mode === "flat" ? "#f5f3ff" : "#fff",
//             color: value.mode === "flat" ? "#5200FF" : "#475569",
//             cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
//           }}
//         >
//           Assign to Flat
//         </button>
//       </div>

//       {value.mode === "flat" && (
//         <div style={{ display: "flex", flexDirection: allowDirect ? "row" : "column", gap: 6 }}>
//           {flatsForBranch.length > 0 && (
//             <Select
//               value={value.flatId}
//               onValueChange={(v) => onChange({ ...value, flatId: v, newFlatNumber: "" })}
//             >
//               <SelectTrigger className="rounded-lg" aria-label="Existing flat"><SelectValue placeholder="Select an existing Flat" /></SelectTrigger>
//               <SelectContent>
//                 {flatsForBranch.map(f => (
//                   <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           )}
//           <Input
//             aria-label="New flat number"
//             placeholder={flatsForBranch.length > 0 ? "...or type a new Flat Number" : "Flat Number (will be created)"}
//             value={value.newFlatNumber}
//             className="rounded-lg"
//             onChange={(e) => onChange({ ...value, newFlatNumber: e.target.value, flatId: "" })}
//           />
//         </div>
//       )}
//     </Field>
//   );
// }

// /* ================= Shared Room Entry Row (Flat bulk-create mode) ================= */
// export interface RoomEntryValue {
//   key: string;
//   suffix: string;
//   hostelType: HostelType | "";
//   totalBeds: string;
//   rentPerBed: string;
// }

// let roomEntryCounter = 0;
// const blankRoomEntry = (): RoomEntryValue => ({
//   key: `entry-${Date.now()}-${roomEntryCounter++}`,
//   suffix: "", hostelType: "", totalBeds: "", rentPerBed: "",
// });

// const buildRoomNumber = (flatLabel: string, rawSuffix: string): string => {
//   const suffix = rawSuffix.trim();
//   const label = flatLabel.trim();
//   if (!label) return suffix;
//   const prefix = `${label}-`;
//   if (suffix.toLowerCase().startsWith(prefix.toLowerCase())) return suffix;
//   return `${prefix}${suffix}`;
// };

// const pillButtonStyle = (active: boolean) => ({
//   flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
//   border: active ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
//   background: active ? "#f5f3ff" : "#fff",
//   color: active ? "#5200FF" : "#475569",
//   cursor: "pointer", transition: "all 0.15s",
// }) as const;

// function RoomEntryRow({
//   entry, flatLabel, onChange, onRemove, canRemove,
// }: {
//   entry: RoomEntryValue;
//   flatLabel: string;
//   onChange: (patch: Partial<RoomEntryValue>) => void;
//   onRemove: () => void;
//   canRemove: boolean;
// }) {
//   return (
//     <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "#fafafa" }}>
//       <div className={`rm-entry-fields ${canRemove ? "has-remove" : ""}`}>
//         <Field label="Room Name" required>
//           <Input
//             aria-label="Room name"
//             placeholder="e.g. HALL, Room-1"
//             value={entry.suffix}
//             onChange={(e) => onChange({ suffix: e.target.value })}
//             className="rounded-lg"
//           />
//         </Field>

//         <Field label="Room Type" required>
//           <div style={{ display: "flex", gap: 6 }}>
//             <button type="button" aria-pressed={entry.hostelType === "AC"} onClick={() => onChange({ hostelType: "AC" })} style={pillButtonStyle(entry.hostelType === "AC")}>AC</button>
//             <button type="button" aria-pressed={entry.hostelType === "NON_AC"} onClick={() => onChange({ hostelType: "NON_AC" })} style={pillButtonStyle(entry.hostelType === "NON_AC")}>Non-AC</button>
//           </div>
//         </Field>

//         <Field label="Total Beds" required>
//           <BedCountPicker value={entry.totalBeds} onChange={(v) => onChange({ totalBeds: v })} />
//         </Field>

//         <Field label="Rent / Bed (Monthly)">
//           <Input
//             type="number"
//             aria-label="Rent per bed, monthly"
//             placeholder="e.g. 4500"
//             value={entry.rentPerBed}
//             className="rounded-lg"
//             onChange={(e) => onChange({ rentPerBed: e.target.value })}
//           />
//         </Field>

//         {canRemove && (
//           <button
//             type="button"
//             onClick={onRemove}
//             title="Remove this room"
//             aria-label="Remove this room"
//             className="rm-entry-remove"
//           >
//             <Trash2 size={16} color="#ef4444" aria-hidden="true" />
//           </button>
//         )}
//       </div>

//       {flatLabel && entry.suffix.trim() && (
//         <div style={{ fontSize: 11, color: "#64748b" }}>
//           Will be created as <strong style={{ color: "#5200FF" }}>{buildRoomNumber(flatLabel, entry.suffix)}</strong>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ================= COMPONENT ================= */
// const RoomsPage = () => {

//   const location = useLocation();
//   const navigate = useNavigate();

//   // Business Model property type for this hostel (ROOM / FLAT / null = not configured).
//   const { propertyType, loading: propertyTypeLoading } = usePropertyType();
//   const isFlatMode = propertyType === "FLAT";
//   const isRoomMode = propertyType === "ROOM";
//   const lockedAssignMode: "direct" | "flat" | null = isFlatMode ? "flat" : isRoomMode ? "direct" : null;

//   /* ================= STATE ================= */
//   const [branches,   setBranches]   = useState<Branch[]>([]);
//   const [flats,      setFlats]      = useState<Flat[]>([]);
//   const [rooms,      setRooms]      = useState<Room[]>([]);
//   const [totalCount, setTotalCount] = useState(0);

//   const [page,       setPage]       = useState(0);
//   const [pageSize]   = useState(10);
//   const [loading,    setLoading]    = useState(false);

//   // Raw input the user types into the search box (updates instantly for a
//   // responsive field) vs. the debounced value that's actually sent to the
//   // API. Search now runs server-side across ALL rooms/pages, not just the
//   // 10 rows already loaded on the current page.
//   const [searchInput, setSearchInput] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");

//   const [addOpen,        setAddOpen]        = useState(false);
//   const [editOpen,       setEditOpen]       = useState(false);
//   const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
//   const [selectedBranch, setSelectedBranch] = useState<string>("all");

//   // "idle" | "loading" | "done" | "error" — surfaced in the UI so a
//   // failed branch fetch doesn't just silently show an empty dropdown.
//   const [supporting, setSupporting] = useState<"idle" | "loading" | "done" | "error">("idle");
//   const [branchesLoading, setBranchesLoading] = useState(false);

//   const [roomNumber,  setRoomNumber]  = useState("");
//   const [hostelType,  setHostelType]  = useState<HostelType | "">("");
//   const [totalBeds,   setTotalBeds]   = useState("");
//   const [rentPerBed,  setRentPerBed]  = useState("");
//   const [unitId,      setUnitId]      = useState("");

//   const [flatAssignState, setFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);
//   const [editFlatAssignState, setEditFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);

//   // The configured property type decides the mode: Room-based => always a direct
//   // room, Flat-based => always inside a flat. Not configured => user's own choice.
//   const flatAssign = useMemo<FlatAssignmentValue>(
//     () => (lockedAssignMode ? { ...flatAssignState, mode: lockedAssignMode } : flatAssignState),
//     [flatAssignState, lockedAssignMode]
//   );
//   const editFlatAssign = useMemo<FlatAssignmentValue>(
//     () => (lockedAssignMode ? { ...editFlatAssignState, mode: lockedAssignMode } : editFlatAssignState),
//     [editFlatAssignState, lockedAssignMode]
//   );

//   const [flatRoomEntries, setFlatRoomEntries] = useState<RoomEntryValue[]>([blankRoomEntry()]);

//   const addRoomEntry = () => setFlatRoomEntries(prev => [...prev, blankRoomEntry()]);
//   const removeRoomEntry = (key: string) =>
//     setFlatRoomEntries(prev => (prev.length > 1 ? prev.filter(e => e.key !== key) : prev));
//   const updateRoomEntry = (key: string, patch: Partial<RoomEntryValue>) =>
//     setFlatRoomEntries(prev => prev.map(e => (e.key === key ? { ...e, ...patch } : e)));

//   const [branchSearchTerm, setBranchSearchTerm] = useState("");

//   const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
//   const branchDropdownRef = useRef<HTMLDivElement | null>(null);

//   const [wardenBranchName, setWardenBranchName] = useState("");

//   const role     = getUserRole()?.toUpperCase();
//   const isWarden = role === "WARDEN";
//   const isAdmin  = !isWarden;

//   const effectiveUnitId = isWarden ? String(getBranchId() ?? "") : unitId;

//   /* ================= RESET FORM ================= */
//   const resetAddForm = () => {
//     setRoomNumber(""); setHostelType(""); setTotalBeds("");
//     setRentPerBed(""); setUnitId(""); setFlatAssign(EMPTY_FLAT_ASSIGNMENT);
//     setFlatRoomEntries([blankRoomEntry()]);
//   };

//   const loadBranches = useCallback(async () => {
//     setBranchesLoading(true);
//     try {
//       const branchesData = (await fetchAllPages<Branch>(getBranches)).filter(
//         (b): b is Branch => !!b && b.id != null
//       );
//       setBranches(branchesData);

//       if (isWarden) {
//         const bid = getBranchId();
//         if (!bid) {
//           toast.error("Warden not mapped to a branch");
//         } else {
//           const branch = branchesData.find((b) => idsMatch(b.id, bid));
//           setWardenBranchName(branch?.unitName || `Branch ${bid}`);
//           setSelectedBranch(String(bid));
//         }
//       }
//       return branchesData;
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed loading branches");
//       return [];
//     } finally {
//       setBranchesLoading(false);
//     }
//   }, [isWarden]);

//   /* ================= LOAD SUPPORTING DATA (branches + flats, once) ================= */
//   const loadSupportingData = useCallback(async () => {
//     if (supporting !== "idle") return;
//     setSupporting("loading");
//     try {
//       const [, flatsResult] = await Promise.allSettled([
//         loadBranches(),
//         fetchAllPages<Flat>(getFlats),
//       ]);

//       const flatsData: Flat[] = flatsResult.status === "fulfilled" ? flatsResult.value : [];
//       setFlats(flatsData.filter(Boolean));

//       if (flatsResult.status === "rejected") {
//         console.error(flatsResult.reason);
//         toast.error("Failed loading flats");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed loading supporting data");
//     } finally {
//       setSupporting("done");
//     }
//   }, [loadBranches, supporting]);

//   useEffect(() => { loadSupportingData(); }, [loadSupportingData]);

//   useEffect(() => {
//     if (addOpen && isAdmin) {
//       loadBranches();
//     }
//   }, [addOpen, isAdmin, loadBranches]);

//   useEffect(() => {
//     if (addOpen && isAdmin && selectedBranch !== "all" && !unitId) {
//       setUnitId(selectedBranch);
//     }
//   }, [addOpen, isAdmin, selectedBranch, unitId]);

//   /* ── Close the branch dropdown on outside click ── */
//   useEffect(() => {
//     if (!branchDropdownOpen) return;
//     const handleClick = (e: MouseEvent) => {
//       if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
//         setBranchDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, [branchDropdownOpen]);

//   /* ================= INCOMING NAVIGATION STATE ================= */
//   useEffect(() => {
//     if (supporting !== "done") return;
//     const navState = location.state as { unitId?: number | string; openAddRoom?: boolean } | null;
//     if (!navState) return;

//     if (navState.unitId != null && !isWarden) {
//       setSelectedBranch(String(navState.unitId));
//       setUnitId(String(navState.unitId));
//       setPage(0);
//     }
//     if (navState.openAddRoom && isAdmin) {
//       setAddOpen(true);
//     }

//     window.history.replaceState({}, document.title);
//   }, [supporting, location.state, isWarden, isAdmin]);

//   /* ================= DEBOUNCE SEARCH INPUT ================= */
//   // Wait 400ms after the user stops typing before hitting the API, and
//   // jump back to page 0 since the result set (and its page count) changes.
//   useEffect(() => {
//     const handle = setTimeout(() => {
//       setDebouncedSearch(searchInput.trim());
//       setPage(0);
//     }, 400);
//     return () => clearTimeout(handle);
//   }, [searchInput]);

//   /* ================= LOAD ROOMS (real API, page-based, server-side search) ================= */
//   const loadRooms = useCallback(async () => {
//     if (supporting !== "done") return;
//     setLoading(true);
//     try {
//       const queryParams: Record<string, any> = { page, size: pageSize };
//       if (selectedBranch !== "all") {
//         queryParams.unitId = selectedBranch;
//       }
//       if (debouncedSearch) {
//         queryParams.search = debouncedSearch;
//       }

//       const res = await api.get(`/rooms`, { params: queryParams });
//       const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
//       const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

//       const enriched = content.filter(Boolean).map((room: Room) => {
//         const occ   = room.occupiedBeds ?? 0;
//         const avail = (room.totalBeds   || 0) - occ;

//         const resolvedUnitName =
//           room.unitName ||
//           branches.find((b) => idsMatch(b.id, room.unitId))?.unitName ||
//           "-";

//         return {
//           ...room,
//           unitName:  resolvedUnitName,
//           flatName:  room.flatName ?? "N/A",
//           occupied:  occ,
//           available: avail,
//           status:    avail > 0 ? (occ > 0 ? "Partially Occupied" : "Available") : "Occupied",
//         };
//       });

//       setRooms(enriched);
//       setTotalCount(totalElements);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load rooms");
//     } finally {
//       setLoading(false);
//     }
//   }, [page, pageSize, selectedBranch, debouncedSearch, supporting, branches]);

//   useEffect(() => { loadRooms(); }, [loadRooms]);

//   /* ================= HELPERS ================= */
//   const flatsByBranch = useMemo(() => {
//     if (!effectiveUnitId) return [];
//     return flats.filter(f => f && String(f.branchId) === effectiveUnitId);
//   }, [flats, effectiveUnitId]);

//   const addFlatLabel = flatAssign.flatId
//     ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
//     : flatAssign.newFlatNumber.trim();

//   const flatsByEditBranch = useMemo(() => {
//     if (!editRoomData?.unitId) return [];
//     return flats.filter(f => f && String(f.branchId) === String(editRoomData.unitId));
//   }, [flats, editRoomData?.unitId]);

//   const getRoomTypeName = (beds: number, type: string) => {
//     const prefix = beds === 1 ? 'Single' : beds === 2 ? 'Double' : beds === 3 ? 'Triple' : beds === 4 ? 'Quad' : `${beds} Bed`;
//     const suffix = type === 'AC' ? 'AC' : type === 'NON_AC' ? 'Non-AC' : type;
//     return `${prefix} ${suffix}`;
//   };

//   // Darker text colours (Tailwind 700/800 shades) so every badge meets the
//   // 4.5:1 WCAG AA contrast ratio against its pale background.
//   const getRoomTypeColor = (typeStr: string) => {
//     if (typeStr.includes('Single')) return { color: '#1d4ed8', bg: '#eff6ff' };
//     if (typeStr.includes('Double')) return { color: '#15803d', bg: '#dcfce7' };
//     if (typeStr.includes('Triple')) return { color: '#6d28d9', bg: '#f3e8ff' };
//     if (typeStr.includes('Quad'))   return { color: '#9a3412', bg: '#ffedd5' };
//     return { color: '#475569', bg: '#f1f5f9' };
//   };

//   const resolveFlatId = async (
//     assign: FlatAssignmentValue,
//     branchId: number
//   ): Promise<number | null> => {
//     if (assign.mode === "direct") return null;
//     if (assign.flatId) return Number(assign.flatId);

//     const flatNumber = assign.newFlatNumber.trim();
//     const rawResponse = await createFlat({ flatNumber, branchId });

//     let newFlat = unwrapEntity<Flat>(rawResponse);

//     if (!newFlat) {
//       console.warn("createFlat did not return a usable Flat object, re-fetching flats list:", rawResponse);
//       const allFlats = (await fetchAllPages<Flat>(getFlats)).filter(Boolean);
//       setFlats(allFlats);
//       newFlat = allFlats.find(
//         f => f && String(f.branchId) === String(branchId) && f.flatNumber === flatNumber
//       );
//       if (!newFlat) {
//         throw new Error(
//           "Flat may not have been created — check the Network tab for the /flats request."
//         );
//       }
//     } else {
//       setFlats(prev => [...prev, newFlat!]);
//     }

//     return newFlat.id;
//   };

//   const handleAdd = async () => {
//     if (!effectiveUnitId) {
//       toast.error("Branch is required");
//       return;
//     }

//     if (flatAssign.mode === "direct") {
//       if (!roomNumber || !hostelType) {
//         toast.error("Room number and room type are required");
//         return;
//       }
//       const desiredBeds = Number(totalBeds) || 0;
//       if (desiredBeds < 1) {
//         toast.error("Total beds must be at least 1");
//         return;
//       }
//       try {
//         const res = await createRoom({
//           roomNumber,
//           hostelType: hostelType as HostelType,
//           totalBeds:  desiredBeds,
//           rentPerBed: Number(rentPerBed) || 0,
//           unitId:     Number(effectiveUnitId),
//           flatId:     null,
//         });

//         const newRoom = unwrapEntity<Room>(res);

//         toast.success(`Room created with ${desiredBeds} bed${desiredBeds === 1 ? "" : "s"}`);
//         setAddOpen(false);
//         resetAddForm();

//         navigate("/tenants", {
//           state: {
//             unitId: Number(effectiveUnitId),
//             roomId: newRoom?.id,
//             openAddTenant: true,
//           },
//         });
//       } catch (e: any) {
//         showBedLimitToast(e, navigate, extractApiError(e, "Create failed"));
//       }
//       return;
//     }

//     if (!flatAssign.flatId && !flatAssign.newFlatNumber.trim()) {
//       toast.error("Select an existing flat or enter a new flat number");
//       return;
//     }

//     // A row counts as "blank" only if the user hasn't touched it at all — that's fine
//     // to ignore (e.g. an unused extra row from "Add Another Room"). But a row with
//     // SOME fields filled and others missing must not be silently dropped, or the
//     // user ends up with fewer rooms than they thought they were saving.
//     const isEntryBlank = (e: RoomEntryValue) =>
//       !e.suffix.trim() && !e.hostelType && e.totalBeds.trim() === "";
//     const isEntryComplete = (e: RoomEntryValue) =>
//       !!e.suffix.trim() && !!e.hostelType && Number(e.totalBeds) > 0;

//     const touchedEntries = flatRoomEntries.filter(e => !isEntryBlank(e));
//     if (touchedEntries.length === 0) {
//       toast.error("Add at least one room with a name, room type, and bed count");
//       return;
//     }

//     const incomplete = touchedEntries.filter(e => !isEntryComplete(e));
//     if (incomplete.length > 0) {
//       const details = incomplete.map(e => {
//         const label = e.suffix.trim() || `Room ${flatRoomEntries.indexOf(e) + 1}`;
//         const missing: string[] = [];
//         if (!e.suffix.trim()) missing.push("name");
//         if (!e.hostelType) missing.push("room type");
//         if (!(Number(e.totalBeds) > 0)) missing.push("bed count");
//         return `${label} (missing ${missing.join(", ")})`;
//       });
//       toast.error(`Complete these rooms before saving: ${details.join("; ")}`);
//       return;
//     }

//     const validEntries = touchedEntries;

//     try {
//       const resolvedFlatId = await resolveFlatId(flatAssign, Number(effectiveUnitId));
//       const flatLabel = flatAssign.flatId
//         ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
//         : flatAssign.newFlatNumber.trim();

//       let created = 0;
//       const failedNames: string[] = [];

//       for (const entry of validEntries) {
//         const desiredBeds = Number(entry.totalBeds) || 0;
//         const roomNumberToCreate = buildRoomNumber(flatLabel, entry.suffix);

//         try {
//           await createRoom({
//             roomNumber: roomNumberToCreate,
//             hostelType: entry.hostelType as HostelType,
//             totalBeds:  desiredBeds,
//             rentPerBed: Number(entry.rentPerBed) || 0,
//             unitId:     Number(effectiveUnitId),
//             flatId:     resolvedFlatId,
//           });
//           created++;
//         } catch (innerErr: any) {
//           console.error(`Failed creating room "${roomNumberToCreate}":`, innerErr);
//           if (isBedLimitError(innerErr)) {
//             // Limit hit mid-batch — show the "Add Beds" toast once and stop;
//             // every remaining entry in this batch would fail the same way.
//             showBedLimitToast(innerErr, navigate, extractApiError(innerErr, "Create failed"));
//             break;
//           }
//           failedNames.push(
//             `${roomNumberToCreate} (${extractApiError(innerErr, "unknown error")})`
//           );
//         }
//       }

//       if (created > 0) {
//         toast.success(`${created} room${created === 1 ? "" : "s"} created under ${flatLabel}`);
//       }
//       if (failedNames.length > 0) {
//         toast.error(`Failed to create: ${failedNames.join(", ")}`);
//       }
//       if (created > 0) {
//         setAddOpen(false);
//         resetAddForm();
//         loadRooms();
//       }
//     } catch (e: any) {
//       showBedLimitToast(e, navigate, extractApiError(e, "Create failed"));
//     }
//   };

//   const handleEdit = async () => {
//     if (!editRoomData) return;
//     if (!editRoomData.roomNumber?.trim() || !editRoomData.hostelType) {
//       toast.error("Room number and room type are required");
//       return;
//     }
//     const desiredBeds = Number(editRoomData.totalBeds) || 0;
//     if (desiredBeds < 1) {
//       toast.error("Total beds must be at least 1");
//       return;
//     }
//     if (editFlatAssign.mode === "flat" && !editFlatAssign.flatId && !editFlatAssign.newFlatNumber.trim()) {
//       toast.error("Select an existing flat or enter a new flat number");
//       return;
//     }
//     try {
//       const resolvedFlatId = await resolveFlatId(editFlatAssign, Number(editRoomData.unitId));
//       await editRoom(editRoomData.id, {
//         ...editRoomData,
//         totalBeds:  desiredBeds,
//         rentPerBed: Number(editRoomData.rentPerBed) || 0,
//         // Room-based hostel: never touch the room's existing flat link while editing.
//         flatId:     isRoomMode ? (editRoomData.flatId ?? null) : resolvedFlatId,
//       });
//       toast.success("Room updated");
//       setEditOpen(false);
//       setEditRoomData(null);
//       loadRooms();
//     } catch (e: any) {
//       // Bumping totalBeds on an existing room can also push past the cap.
//       showBedLimitToast(e, navigate, extractApiError(e, "Update failed"));
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await removeRoom(id);
//       toast.success("Room deleted");
//       loadRooms();
//     } catch (e: any) {
//       toast.error(extractApiError(e, "Delete failed"));
//     }
//   };

//   const openEditRoom = (room: Room) => {
//     setEditRoomData({ ...room });
//     setEditFlatAssign({
//       mode: room.flatId ? "flat" : "direct",
//       flatId: room.flatId ? String(room.flatId) : "",
//       newFlatNumber: "",
//     });
//     setEditOpen(true);
//   };

//   // NOTE: `rooms` is now already the search-matched, server-paginated set —
//   // no client-side re-filtering here. Filtering only the current page's 10
//   // rows was the original bug (a room on page 7 wouldn't show up while
//   // viewing page 1).

//   const visibleBranches = branchSearchTerm.trim()
//     ? branches.filter(b => (b.unitName || "").toLowerCase().includes(branchSearchTerm.toLowerCase()))
//     : branches;

//   // Label shown on the dropdown trigger button.
//   const selectedBranchLabel = isWarden
//     ? wardenBranchName
//     : selectedBranch === "all"
//       ? "All Branches"
//       : (branches.find(b => String(b.id) === selectedBranch)?.unitName ?? "Select Branch");

//   const selectBranchOption = (value: string) => {
//     setSelectedBranch(value);
//     setPage(0);
//     setBranchDropdownOpen(false);
//     setBranchSearchTerm("");
//   };

//   const clearFilters = () => {
//     setSearchInput("");
//     setDebouncedSearch("");
//     setSelectedBranch(isWarden ? String(getBranchId()) : "all");
//     setPage(0);
//   };

//   const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
//   const currentPage1Based = page + 1;
//   const pageNumbers = getPageNumbers(currentPage1Based, totalPages);

//   if (propertyTypeLoading) {
//     return (
//       <div role="status" className="flex items-center justify-center py-24 text-sm text-slate-500">
//         Loading…
//       </div>
//     );
//   }

//   /* ================= UI ================= */
//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .rm-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

//         .rm-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; margin-top: 12px; }
//         .rm-main { flex: 1; min-width: 0; }

//         /* ── Branch dropdown (replaces the old horizontal branch strip) ── */
//         .rm-branch-dropdown-wrap { position: relative; display: inline-block; }
//         .rm-branch-dropdown-trigger {
//           display: flex; align-items: center; justify-content: space-between; gap: 24px;
//           min-width: 220px; padding: 0 14px; height: 40px; border-radius: 10px;
//           border: 1px solid #e2e8f0; background: #fff; cursor: pointer;
//           font-size: 13px; font-weight: 600; color: #0f172a; transition: border-color 0.15s;
//         }
//         .rm-branch-dropdown-trigger:hover { border-color: #cbd5e1; }
//         .rm-branch-dropdown-trigger.disabled { cursor: not-allowed; opacity: 0.6; }
//         .rm-branch-dropdown-trigger-left { display: flex; align-items: center; gap: 10px; }
//         .rm-branch-dropdown-chevron { transition: transform 0.15s; color: #64748b; }
//         .rm-branch-dropdown-chevron.open { transform: rotate(180deg); }

//         .rm-branch-dropdown-menu {
//           position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
//           width: 300px; max-height: 340px; overflow-y: auto;
//           background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
//           box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
//         }
//         .rm-branch-dropdown-search {
//           display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0;
//           border-radius: 8px; padding: 0 10px; height: 34px; margin-bottom: 6px; background: #fafafa;
//         }
//         .rm-branch-dropdown-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

//         /* Items are real <button>s now (keyboard accessible); reset button chrome. */
//         .rm-branch-dropdown-item {
//           display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px;
//           font-size: 13px; font-weight: 500; color: #334155; cursor: pointer;
//           width: 100%; border: none; background: transparent; text-align: left;
//         }
//         .rm-branch-dropdown-item:hover { background: #f8fafc; }
//         .rm-branch-dropdown-item.active { background: #f3e8ff; color: #5200FF; font-weight: 600; }
//         .rm-branch-dropdown-item.disabled { cursor: not-allowed; opacity: 0.5; }
//         .rm-branch-dropdown-item .check-slot { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
//         .rm-branch-dropdown-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

//         .rm-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
//         .rm-main-header-right { display: flex; align-items: center; gap: 12px; }
//         .rm-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
//         .rm-btn-outline:hover { background: #f8fafc; }
//         .rm-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
//         .rm-btn-primary:hover { background: #4200cc; }

//         .rm-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
//         .rm-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
//         .rm-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
//         .rm-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; margin-left: auto; }

//         .rm-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
//         .rm-table { width: 100%; border-collapse: collapse; min-width: 860px; }
//         .rm-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .rm-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .rm-table tr:last-child td { border-bottom: none; }
//         .rm-table tr:hover { background: #fdfcff; }

//         .rm-col-number { font-size: 14px; font-weight: 600; color: #0f172a; }
//         .rm-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }

//         .rm-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

//         .rm-count { font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }

//         /* Status badge text colours darkened for WCAG AA contrast (was 16a34a / f97316 / 3b82f6). */
//         .rm-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
//         .rm-status-badge.occupied { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .rm-status-badge.partially { color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; }
//         .rm-status-badge.available { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; }

//         .rm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; flex-wrap: wrap; gap: 12px; }
//         .rm-page-info { font-size: 13px; color: #64748b; }
//         .rm-page-controls { display: flex; align-items: center; gap: 6px; }
//         .rm-page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
//         .rm-page-btn:hover:not(:disabled) { background: #f8fafc; }
//         .rm-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
//         .rm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
//         .rm-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #64748b; }

//         /* Landscape dialog layout for Add/Edit Room — widened so a
//            3-column grid reads comfortably and fields never feel
//            squeezed against the card edges. */
//         .rm-dialog-landscape { max-width: 900px !important; width: 96vw; }
//         .rm-dialog-landscape.rm-dialog-compact { max-width: 680px !important; }
//         /* 2 x 2 grid: Room Number | Room Type, then Total Beds | Monthly Rent */
//         .rm-dialog-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 20px; }
//         .rm-dialog-grid .rm-span-3 { grid-column: 1 / -1; }
//         /* Flat dialog: each room is one horizontal row */
//         .rm-entry-grid { display: flex; flex-direction: column; gap: 12px; }
//         .rm-entry-fields { display: grid; grid-template-columns: 1.3fr 1.2fr 0.8fr 1fr; gap: 12px; align-items: end; }
//         .rm-entry-fields.has-remove { grid-template-columns: 1.3fr 1.2fr 0.8fr 1fr auto; }
//         .rm-entry-remove { height: 40px; width: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid #fecaca; border-radius: 8px; background: #fff; cursor: pointer; }
//         .rm-entry-remove:hover { background: #fef2f2; }
//         @media (max-width: 760px) {
//           .rm-entry-fields, .rm-entry-fields.has-remove { grid-template-columns: 1fr 1fr; }
//           .rm-entry-remove { grid-column: 1 / -1; justify-self: end; width: auto; padding: 0 14px; }
//         }
//         @media (max-width: 520px) {
//           .rm-dialog-grid { grid-template-columns: 1fr; }
//           .rm-entry-fields, .rm-entry-fields.has-remove { grid-template-columns: 1fr; }
//         }

//         /* Soften the selected/focus ring on selects & inputs inside the
//            dialog so a chosen value (e.g. a picked Branch) reads as a
//            normal filled field instead of a bright, full-width blue
//            highlight competing with the label above it. */
//         .rm-dialog-landscape button[role="combobox"],
//         .rm-dialog-landscape input {
//           border-color: #e2e8f0 !important;
//           box-shadow: none !important;
//         }
//         .rm-dialog-landscape button[role="combobox"]:focus,
//         .rm-dialog-landscape button[role="combobox"]:focus-visible,
//         .rm-dialog-landscape input:focus,
//         .rm-dialog-landscape input:focus-visible {
//           border-color: #5200FF !important;
//           box-shadow: 0 0 0 3px rgba(82,0,255,0.12) !important;
//           outline: none !important;
//         }
//       `}</style>

//       <div className="rm-wrap">

//         <div className="rm-layout">

//           {/* Main Content Area */}
//           <div className="rm-main">
//             <div className="rm-main-header">
//               <div className="rm-branch-dropdown-wrap" ref={branchDropdownRef}>
//                 <button
//                   type="button"
//                   aria-haspopup="listbox"
//                   aria-expanded={branchDropdownOpen}
//                   aria-label={`Branch filter: ${selectedBranchLabel}`}
//                   className={`rm-branch-dropdown-trigger ${isWarden ? "disabled" : ""}`}
//                   onClick={() => { if (!isWarden) setBranchDropdownOpen(o => !o); }}
//                 >
//                   <span className="rm-branch-dropdown-trigger-left">
//                     <Building2 size={16} color="#8b5cf6" aria-hidden="true" />
//                     {selectedBranchLabel}
//                   </span>
//                   {!isWarden && (
//                     <ChevronDown size={16} aria-hidden="true" className={`rm-branch-dropdown-chevron ${branchDropdownOpen ? "open" : ""}`} />
//                   )}
//                 </button>

//                 {branchDropdownOpen && !isWarden && (
//                   <div className="rm-branch-dropdown-menu">
//                     <div className="rm-branch-dropdown-search">
//                       <Search size={13} color="#94a3b8" aria-hidden="true" />
//                       <input
//                         type="text"
//                         aria-label="Search branches"
//                         placeholder="Search branches..."
//                         value={branchSearchTerm}
//                         onChange={(e) => setBranchSearchTerm(e.target.value)}
//                         autoFocus
//                       />
//                     </div>

//                     <button
//                       type="button"
//                       className={`rm-branch-dropdown-item ${selectedBranch === "all" ? "active" : ""}`}
//                       aria-current={selectedBranch === "all" ? "true" : undefined}
//                       onClick={() => selectBranchOption("all")}
//                     >
//                       <span className="check-slot">{selectedBranch === "all" && <Check size={14} aria-hidden="true" />}</span>
//                       All Branches
//                     </button>

//                     {visibleBranches.length === 0 ? (
//                       <div className="rm-branch-dropdown-empty">No branches found.</div>
//                     ) : (
//                       visibleBranches.map(branch => (
//                         <button
//                           type="button"
//                           key={branch.id}
//                           className={`rm-branch-dropdown-item ${selectedBranch === String(branch.id) ? "active" : ""}`}
//                           aria-current={selectedBranch === String(branch.id) ? "true" : undefined}
//                           onClick={() => selectBranchOption(String(branch.id))}
//                         >
//                           <span className="check-slot">{selectedBranch === String(branch.id) && <Check size={14} aria-hidden="true" />}</span>
//                           {branch.unitName}
//                         </button>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               <div className="rm-main-header-right">
//                 <button type="button" className="rm-btn-outline"><Download size={16} aria-hidden="true" /> Export</button>

//                 {isAdmin && (
//                   <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
//                     <DialogTrigger asChild>
//                       <button type="button" className="rm-btn-primary"><Plus size={16} aria-hidden="true" /> {isFlatMode ? "Add Flat" : "Add Room"}</button>
//                     </DialogTrigger>
//                     <DialogContent className={`rounded-2xl overflow-hidden rm-dialog-landscape mobile-form-dialog ${flatAssign.mode === "flat" ? "" : "rm-dialog-compact"}`}>
//                       <DialogHeader>
//                         <DialogTitle>{isFlatMode ? "Add Flat" : flatAssign.mode === "flat" ? "Add Rooms under a Flat" : "Add Room"}</DialogTitle>
//                         <DialogDescription>
//                           {isFlatMode
//                             ? "Create a flat (or pick an existing one) and add the rooms and beds inside it."
//                             : flatAssign.mode === "flat"
//                               ? "Create one or more rooms together under the same flat/floor."
//                               : "Create a new room and map it to a branch."}
//                         </DialogDescription>
//                       </DialogHeader>
//                       <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
//                         <div className={isFlatMode ? undefined : "rm-span-3"}>
//                           {isWarden ? (
//                             <Field label="Branch">
//                               <Input aria-label="Branch" value={wardenBranchName} disabled className="bg-slate-50 rounded-lg" />
//                             </Field>
//                           ) : (
//                             <Field label="Branch" required>
//                               <div className="space-y-1">
//                                 <Select
//                                   key={branches.length}
//                                   value={unitId}
//                                   onValueChange={(v) => { setUnitId(v); setFlatAssign(EMPTY_FLAT_ASSIGNMENT); }}
//                                 >
//                                   <SelectTrigger className="rounded-lg" aria-label="Branch">
//                                     <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
//                                   </SelectTrigger>
//                                   <SelectContent>
//                                     {branchesLoading ? (
//                                       <div className="p-2 text-xs text-muted-foreground text-center">Loading branches…</div>
//                                     ) : branches.length > 0 ? (
//                                       branches
//                                         .filter(b => b && b.id != null)
//                                         .map(b => (
//                                           <SelectItem key={String(b.id)} value={String(b.id)}>
//                                             {b.unitName || `Branch ${b.id}`}
//                                           </SelectItem>
//                                         ))
//                                     ) : (
//                                       <div className="p-2 text-xs text-muted-foreground text-center">
//                                         No branches found
//                                       </div>
//                                     )}
//                                   </SelectContent>
//                                 </Select>
//                                 {!branchesLoading && branches.length === 0 && (
//                                   <button
//                                     type="button"
//                                     onClick={() => loadBranches()}
//                                     className="text-[11px] font-medium text-[#5200FF] hover:underline flex items-center gap-1"
//                                   >
//                                     <RefreshCw size={11} aria-hidden="true" /> Retry loading branches
//                                   </button>
//                                 )}
//                               </div>
//                             </Field>
//                           )}
//                         </div>
//                         {!isRoomMode && (
//                           <div className={isFlatMode ? undefined : "rm-span-3"}>
//                             <FlatAssignmentField
//                               unitId={effectiveUnitId}
//                               flatsForBranch={flatsByBranch}
//                               value={flatAssign}
//                               onChange={setFlatAssign}
//                               allowDirect={!isFlatMode}
//                             />
//                           </div>
//                         )}

//                         {flatAssign.mode === "direct" ? (
//                           <>
//                             <Field label="Room Number" required>
//                               <Input aria-label="Room number" placeholder="e.g. 101" value={roomNumber} className="rounded-lg" onChange={e => setRoomNumber(e.target.value)} />
//                             </Field>

//                             <Field label="Room Type" required>
//                               <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
//                                 <SelectTrigger className="rounded-lg" aria-label="Room type"><SelectValue placeholder="Select Type" /></SelectTrigger>
//                                 <SelectContent>
//                                   <SelectItem value="AC">AC</SelectItem>
//                                   <SelectItem value="NON_AC">Non-AC</SelectItem>
//                                 </SelectContent>
//                               </Select>
//                             </Field>

//                             {/* Bed count — plain number input, shared with Edit. */}
//                             <Field label="Total Beds" required>
//                               <BedCountPicker value={totalBeds} onChange={setTotalBeds} />
//                             </Field>

//                             <Field label="Rent per Bed (Monthly)">
//                               <Input type="number" aria-label="Rent per bed, monthly" placeholder="e.g. 4500" value={rentPerBed} className="rounded-lg" onChange={e => setRentPerBed(e.target.value)} />
//                             </Field>
//                           </>
//                         ) : (
//                           <div className="rm-span-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//                             <div className="rm-entry-grid">
//                               {flatRoomEntries.map(entry => (
//                                 <RoomEntryRow
//                                   key={entry.key}
//                                   entry={entry}
//                                   flatLabel={addFlatLabel}
//                                   onChange={(patch) => updateRoomEntry(entry.key, patch)}
//                                   onRemove={() => removeRoomEntry(entry.key)}
//                                   canRemove={flatRoomEntries.length > 1}
//                                 />
//                               ))}
//                             </div>
//                             <button
//                               type="button"
//                               onClick={addRoomEntry}
//                               style={{
//                                 display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
//                                 width: "100%", padding: "8px 0", borderRadius: 8,
//                                 border: "1.5px dashed #cbd5e1", background: "#fff",
//                                 fontSize: 12.5, fontWeight: 600, color: "#5200FF", cursor: "pointer",
//                               }}
//                             >
//                               <Plus size={14} aria-hidden="true" /> Add Another Room
//                             </button>
//                           </div>
//                         )}
//                       </div>
//                       <DialogFooter>
//                         <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
//                         <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">
//                           {isFlatMode ? "Save Flat" : flatAssign.mode === "flat"
//                             ? (() => {
//                                 const n = flatRoomEntries.filter(e => e.suffix.trim()).length;
//                                 return n > 0 ? `Save ${n} Room${n === 1 ? "" : "s"}` : "Save Rooms";
//                               })()
//                             : "Save Room"}
//                         </Button>
//                       </DialogFooter>
//                     </DialogContent>
//                   </Dialog>
//                 )}
//               </div>
//             </div>

//             <div className="rm-filters-row">
//               <div className="rm-search-main">
//                 <Search size={16} color="#94a3b8" aria-hidden="true" />
//                 <input
//                   type="text"
//                   aria-label="Search rooms or branches"
//                   placeholder="Search rooms or branches..."
//                   value={searchInput}
//                   onChange={(e) => setSearchInput(e.target.value)}
//                 />
//               </div>
//               <button type="button" className="rm-clear-btn" onClick={clearFilters}>
//                 <RefreshCw size={14} aria-hidden="true" /> Clear Filters
//               </button>
//             </div>

//             <div className="rm-table-container">
//               <div className="overflow-x-auto">
//                 <table className="rm-table">
//                   <thead>
//                     <tr>
//                       {/* Flat-based property: FLAT column comes first, then the room number. */}
//                       {isFlatMode && <th>FLAT</th>}
//                       <th>ROOM NO.</th>
//                       <th>ROOM TYPE</th>
//                       <th>BRANCH</th>
//                       <th className="text-center">BEDS</th>
//                       <th className="text-center">OCCUPIED</th>
//                       <th className="text-center">AVAILABLE</th>
//                       <th>STATUS</th>
//                       {isAdmin && <th>ACTIONS</th>}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {loading ? (
//                       <tr><td colSpan={(isAdmin ? 8 : 7) + (isFlatMode ? 1 : 0)} className="text-center py-12 text-slate-600">Loading rooms...</td></tr>
//                     ) : rooms.length === 0 ? (
//                       <tr><td colSpan={(isAdmin ? 8 : 7) + (isFlatMode ? 1 : 0)} className="text-center py-12 text-slate-600">No rooms found.</td></tr>
//                     ) : (
//                       rooms.map((room: any) => {
//                         const typeName  = getRoomTypeName(room.totalBeds, room.hostelType);
//                         const typeColor = getRoomTypeColor(typeName);

//                         return (
//                           <tr key={room.id}>
//                             {isFlatMode && (
//                               <td>
//                                 <div className="rm-branch-name">{room.flatName && room.flatName !== "N/A" ? room.flatName : "-"}</div>
//                               </td>
//                             )}
//                             <td><span className="rm-col-number">{room.roomNumber}</span></td>
//                             <td>
//                               <span className="rm-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
//                                 {typeName}
//                               </span>
//                             </td>
//                             <td>
//                               <div className="rm-branch-name">{room.unitName || "-"}</div>
//                             </td>
//                             <td className="text-center"><span className="rm-count">{room.totalBeds}</span></td>
//                             <td className="text-center"><span className="rm-count">{room.occupied}</span></td>
//                             <td className="text-center"><span className="rm-count">{room.available}</span></td>
//                             <td>
//                               <div className={`rm-status-badge ${room.status === 'Occupied' ? 'occupied' : room.status === 'Partially Occupied' ? 'partially' : 'available'}`}>
//                                 <div aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${room.status === 'Occupied' ? 'bg-green-500' : room.status === 'Partially Occupied' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
//                                 {room.status}
//                               </div>
//                             </td>
//                             {isAdmin && (
//                               <td>
//                                 <div className="flex gap-2">
//                                   {/* Lighthouse: "Buttons do not have an accessible name" — icon-only edit/delete */}
//                                   <Button
//                                     type="button"
//                                     size="icon"
//                                     variant="outline"
//                                     aria-label={`Edit room ${room.roomNumber}`}
//                                     title="Edit"
//                                     className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
//                                     onClick={() => openEditRoom(room)}
//                                   >
//                                     <Pencil className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
//                                   </Button>
//                                   <AlertDialog>
//                                     <AlertDialogTrigger asChild>
//                                       <Button
//                                         type="button"
//                                         size="icon"
//                                         variant="outline"
//                                         aria-label={`Delete room ${room.roomNumber}`}
//                                         title="Delete"
//                                         className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
//                                       >
//                                         <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
//                                       </Button>
//                                     </AlertDialogTrigger>
//                                     <AlertDialogContent className="rounded-2xl">
//                                       <AlertDialogHeader>
//                                         <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
//                                         <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
//                                       </AlertDialogHeader>
//                                       <AlertDialogFooter>
//                                         <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
//                                         <AlertDialogAction onClick={() => handleDelete(room.id)} className="bg-red-600 hover:bg-red-700 rounded-lg">Delete</AlertDialogAction>
//                                       </AlertDialogFooter>
//                                     </AlertDialogContent>
//                                   </AlertDialog>
//                                 </div>
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="rm-pagination">
//                 <div className="rm-page-info">
//                   Showing {rooms.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} rooms
//                 </div>

//                 <nav aria-label="Pagination" className="rm-page-controls">
//                   <Button
//                     type="button"
//                     size="icon" variant="outline" className="w-8 h-8 rounded-lg"
//                     aria-label="Previous page"
//                     disabled={page === 0} onClick={() => setPage(p => Math.max(p - 1, 0))}
//                   >
//                     <ChevronLeft className="h-4 w-4" aria-hidden="true" />
//                   </Button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="rm-page-ellipsis" aria-hidden="true">
//                         <MoreHorizontal className="h-4 w-4" />
//                       </span>
//                     ) : (
//                       <button
//                         type="button"
//                         key={p}
//                         aria-label={`Page ${p}`}
//                         aria-current={p === currentPage1Based ? "page" : undefined}
//                         className={`rm-page-btn ${p === currentPage1Based ? "active" : ""}`}
//                         onClick={() => setPage(p - 1)}
//                       >
//                         {p}
//                       </button>
//                     )
//                   )}

//                   <Button
//                     type="button"
//                     size="icon" variant="outline" className="w-8 h-8 rounded-lg"
//                     aria-label="Next page"
//                     disabled={currentPage1Based >= totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
//                   >
//                     <ChevronRight className="h-4 w-4" aria-hidden="true" />
//                   </Button>
//                 </nav>
//               </div>
//             </div>
//           </div>
//         </div>

//         {isAdmin && (
//           <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditRoomData(null); setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); } }}>

//             <DialogContent className="rounded-2xl overflow-hidden rm-dialog-landscape rm-dialog-compact mobile-form-dialog">
//               <DialogHeader>
//                 <DialogTitle>{isFlatMode ? "Edit Flat" : "Edit Room"}</DialogTitle>
//                 <DialogDescription>Update room details.</DialogDescription>
//               </DialogHeader>
//               {editRoomData && (
//                 <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
//                   {/* Step 1 — Branch first */}
//                   <div className={isFlatMode ? undefined : "rm-span-3"}>
//                     <Field label="Branch" required>
//                       <Select
//                         value={String(editRoomData.unitId)}
//                         onValueChange={v => {
//                           setEditRoomData({ ...editRoomData, unitId: Number(v) });
//                           setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); // branch changed — flat choice no longer valid
//                         }}
//                       >
//                         <SelectTrigger className="rounded-lg" aria-label="Branch"><SelectValue placeholder="Select Branch" /></SelectTrigger>
//                         <SelectContent>
//                           {branches.map(b => (
//                             <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </Field>
//                   </div>

//                   {/* Step 2 — Direct Room vs Assign to Flat */}
//                   {!isRoomMode && (
//                     <div className={isFlatMode ? undefined : "rm-span-3"}>
//                       <FlatAssignmentField
//                         unitId={editRoomData.unitId ? String(editRoomData.unitId) : ""}
//                         flatsForBranch={flatsByEditBranch}
//                         value={editFlatAssign}
//                         onChange={setEditFlatAssign}
//                         allowDirect={!isFlatMode}
//                       />
//                     </div>
//                   )}

//                   {/* Step 3 — Room Number, Room Type, Beds and Rent laid
//                       out across the 3-column landscape grid. */}
//                   <Field label="Room Number" required>
//                     <Input aria-label="Room number" placeholder="e.g. 101" value={editRoomData.roomNumber} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })} />
//                   </Field>

//                   <Field label="Room Type" required>
//                     <Select value={editRoomData.hostelType || ""} onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}>
//                       <SelectTrigger className="rounded-lg" aria-label="Room type"><SelectValue placeholder="Select Type" /></SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="AC">AC</SelectItem>
//                         <SelectItem value="NON_AC">Non-AC</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </Field>

//                   <Field label="Total Beds" required>
//                     <BedCountPicker
//                       value={String(editRoomData.totalBeds ?? "")}
//                       onChange={(v) => setEditRoomData({ ...editRoomData, totalBeds: Number(v) || 0 })}
//                     />
//                   </Field>

//                   <Field label="Rent per Bed (Monthly)">
//                     <Input type="number" aria-label="Rent per bed, monthly" placeholder="e.g. 4500" value={String(editRoomData.rentPerBed ?? 0)} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })} />
//                   </Field>
//                 </div>
//               )}
//               <DialogFooter>
//                 <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
//                 <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">Save Changes</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         )}
//       </div>
//     </div>
//   );
// };

// export default RoomsPage;


























































































import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  createRoom,
  editRoom,
  removeRoom,
  getBranches,
  getUserRole,
  getBranchId,
  getFlats,
  createFlat,
} from "@/lib/store";
import { showBedLimitToast, isBedLimitError } from "@/lib/limitError";
import { usePropertyType } from "@/lib/propertyType";

import { Room, HostelType, Branch, Flat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2,
  Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, Check, Building2, MoreHorizontal, X,
} from "lucide-react";

/* ================= GENERIC HELPER — fetch every page of any paginated store fn ================= */
async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 10
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);
  const firstContent: T[] = first?.content ?? first ?? [];
  const total: number     = first?.totalElements ?? firstContent.length;
  if (total <= pageSize) return firstContent;
  const totalPages = Math.ceil(total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
    )
  );
  return [...firstContent, ...rest.flat()];
}

const idsMatch = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) === String(b);

const unwrapEntity = <T extends { id?: any }>(res: any): T | undefined => {
  if (res && res.id != null) return res as T;
  if (res?.data && res.data.id != null) return res.data as T;
  if (res?.data?.data && res.data.data.id != null) return res.data.data as T;
  return undefined;
};

// Spring's MethodArgumentNotValidException can come back in a few shapes depending on how
// the global exception handler formats it. Try the common ones before giving up to `fallback`.
const extractApiError = (e: any, fallback: string): string => {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors
      .map((x: any) => (typeof x === "string" ? x : x.defaultMessage || x.message))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  return fallback;
};

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

function Field({
  label, required, children, className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", letterSpacing: 0.2, textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function BedCountPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      min={1}
      aria-label="Total beds"
      placeholder="e.g. 2"
      value={value}
      className="rounded-lg"
      onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
    />
  );
}

export interface FlatAssignmentValue {
  mode: "direct" | "flat";
  flatId: string;      
  newFlatNumber: string; 
}

const EMPTY_FLAT_ASSIGNMENT: FlatAssignmentValue = { mode: "direct", flatId: "", newFlatNumber: "" };

/* ================= Existing-flat dropdown with per-flat Rename / Delete ================= */
function ExistingFlatPicker({
  flats, selectedId, onSelect, onStartRename, onDelete,
}: {
  flats: Flat[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Pencil clicked: the parent turns the "New Flat Number" box into a rename box. */
  onStartRename?: (flat: Flat) => void;
  onDelete?: (flat: Flat) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Flat | null>(null);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const selectedLabel = flats.find(f => String(f.id) === selectedId)?.flatNumber;

  const confirmDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    setBusy(true);
    const ok = await onDelete(deleteTarget);
    setBusy(false);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="rm-flat-dd" ref={wrapRef}>
      <button
        type="button"
        className="rm-flat-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Existing flat"
        onClick={() => setOpen(o => !o)}
      >
        <span className={selectedLabel ? "" : "placeholder"}>{selectedLabel ?? "Select an existing Flat"}</span>
        <ChevronDown size={16} aria-hidden="true" color="#64748b" />
      </button>

      {open && (
        <div className="rm-flat-menu" role="listbox" aria-label="Existing flats">
          {flats.map(f => {
            const id = String(f.id);
            const isActive = id === selectedId;
            return (
              <div key={id} className={`rm-flat-row ${isActive ? "active" : ""}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className="rm-flat-opt"
                  onClick={() => { onSelect(id); setOpen(false); }}
                >
                  <span className="rm-flat-check">{isActive && <Check size={14} aria-hidden="true" />}</span>
                  {f.flatNumber}
                </button>
                {onStartRename && (
                  <button
                    type="button"
                    className="rm-flat-act"
                    aria-label={`Rename flat ${f.flatNumber}`}
                    title="Edit flat number"
                    onClick={() => { setOpen(false); onStartRename(f); }}
                  >
                    <Pencil size={14} color="#64748b" aria-hidden="true" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="rm-flat-act danger"
                    aria-label={`Delete flat ${f.flatNumber}`}
                    title="Delete flat"
                    onClick={() => { setOpen(false); setDeleteTarget(f); }}
                  >
                    <Trash2 size={14} color="#ef4444" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !busy) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flat {deleteTarget?.flatNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. A flat that still has rooms in it may not be deletable —
              remove or move its rooms first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-red-600 hover:bg-red-700 rounded-lg"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FlatAssignmentField({
  unitId, flatsForBranch, value, onChange, allowDirect = true, onRenameFlat, onDeleteFlat,
}: {
  unitId: string;
  flatsForBranch: Flat[];
  value: FlatAssignmentValue;
  onChange: (v: FlatAssignmentValue) => void;
  /** false in a Flat-based hostel: the "Direct Room (No Flat)" choice is not offered. */
  allowDirect?: boolean;
  /** Rename / delete an existing flat from the dropdown. Return true on success. */
  onRenameFlat?: (flat: Flat, newNumber: string) => Promise<boolean>;
  onDeleteFlat?: (flat: Flat) => Promise<boolean>;
}) {
  // Rename mode: the pencil in the dropdown turns the "New Flat Number" box into
  // a rename box for that flat (prefilled with its current number).
  const [renamingFlat, setRenamingFlat] = useState<Flat | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // Leave rename mode if the flat disappears (deleted / branch changed).
  useEffect(() => {
    if (renamingFlat && !flatsForBranch.some(f => idsMatch(f.id, renamingFlat.id))) {
      setRenamingFlat(null);
    }
  }, [flatsForBranch, renamingFlat]);

  const startRename = (flat: Flat) => {
    setRenamingFlat(flat);
    setRenameValue(String(flat.flatNumber ?? ""));
  };

  const saveRename = async () => {
    if (!renamingFlat || !onRenameFlat) return;
    setRenameBusy(true);
    const ok = await onRenameFlat(renamingFlat, renameValue);
    setRenameBusy(false);
    if (ok) setRenamingFlat(null);
  };

  // Two clearly labelled fields: pick an existing flat OR type a new flat number.
  const flatPicker = value.mode === "flat" && (
    <div className="rm-flat-pick">
      {flatsForBranch.length > 0 && (
        <Field label="Existing Flat">
          <ExistingFlatPicker
            flats={flatsForBranch}
            selectedId={value.flatId}
            onSelect={(id) => { setRenamingFlat(null); onChange({ ...value, flatId: id, newFlatNumber: "" }); }}
            onStartRename={onRenameFlat ? startRename : undefined}
            onDelete={onDeleteFlat}
          />
        </Field>
      )}

      <Field label="New Flat Number">
        {renamingFlat ? (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              <Input
                autoFocus
                aria-label={`New flat number for ${renamingFlat.flatNumber}`}
                value={renameValue}
                className="rounded-lg"
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveRename(); } }}
              />
              <button type="button" className="rm-flat-act boxed" disabled={renameBusy} aria-label="Save new flat number" title="Save" onClick={saveRename}>
                <Check size={16} color="#16a34a" aria-hidden="true" />
              </button>
              <button type="button" className="rm-flat-act boxed" disabled={renameBusy} aria-label="Cancel rename" title="Cancel" onClick={() => setRenamingFlat(null)}>
                <X size={16} color="#64748b" aria-hidden="true" />
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Renaming flat <strong style={{ color: "#5200FF" }}>{renamingFlat.flatNumber}</strong> — press ✓ to save.
            </div>
          </>
        ) : (
          <Input
            aria-label="New flat number"
            placeholder={flatsForBranch.length > 0 ? "...or type a new Flat Number" : "Flat Number (will be created)"}
            value={value.newFlatNumber}
            className="rounded-lg"
            onChange={(e) => onChange({ ...value, newFlatNumber: e.target.value, flatId: "" })}
          />
        )}
      </Field>
    </div>
  );

  // Flat-based hostel: no "Direct Room" choice, so just the two labelled fields.
  if (!allowDirect) return <>{flatPicker}</>;

  return (
    <Field label="Room Assignment">
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          disabled={!unitId}
          aria-pressed={value.mode === "direct"}
          onClick={() => onChange({ ...EMPTY_FLAT_ASSIGNMENT, mode: "direct" })}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            border: value.mode === "direct" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
            background: value.mode === "direct" ? "#f5f3ff" : "#fff",
            color: value.mode === "direct" ? "#5200FF" : "#475569",
            cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
          }}
        >
          Direct Room (No Flat)
        </button>
        <button
          type="button"
          disabled={!unitId}
          aria-pressed={value.mode === "flat"}
          onClick={() => onChange({ ...value, mode: "flat" })}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            border: value.mode === "flat" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
            background: value.mode === "flat" ? "#f5f3ff" : "#fff",
            color: value.mode === "flat" ? "#5200FF" : "#475569",
            cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
          }}
        >
          Assign to Flat
        </button>
      </div>
      {flatPicker}
    </Field>
  );
}

/* ================= Shared Room Entry Row (Flat bulk-create mode) ================= */
export interface RoomEntryValue {
  key: string;
  suffix: string;
  hostelType: HostelType | "";
  totalBeds: string;
  rentPerBed: string;
}

let roomEntryCounter = 0;
const blankRoomEntry = (): RoomEntryValue => ({
  key: `entry-${Date.now()}-${roomEntryCounter++}`,
  suffix: "", hostelType: "", totalBeds: "", rentPerBed: "",
});

const buildRoomNumber = (flatLabel: string, rawSuffix: string): string => {
  const suffix = rawSuffix.trim();
  const label = flatLabel.trim();
  if (!label) return suffix;
  const prefix = `${label}-`;
  if (suffix.toLowerCase().startsWith(prefix.toLowerCase())) return suffix;
  return `${prefix}${suffix}`;
};

const pillButtonStyle = (active: boolean) => ({
  flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  border: active ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
  background: active ? "#f5f3ff" : "#fff",
  color: active ? "#5200FF" : "#475569",
  cursor: "pointer", transition: "all 0.15s",
}) as const;

function RoomEntryRow({
  entry, index, flatLabel, onChange, onRemove, canRemove,
}: {
  entry: RoomEntryValue;
  index: number;
  flatLabel: string;
  onChange: (patch: Partial<RoomEntryValue>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "#fafafa" }}>
      {canRemove && (
        <div className="rm-entry-head">
          <span>Room {index + 1}</span>
          <button
            type="button"
            onClick={onRemove}
            title="Remove this room"
            aria-label={`Remove room ${index + 1}`}
            className="rm-entry-remove"
          >
            <Trash2 size={14} color="#ef4444" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 2 x 2: Room Name | Room Type, then Total Beds | Monthly Rent */}
      <div className="rm-entry-fields">
        <Field label="Room Name" required>
          <Input
            aria-label="Room name"
            placeholder="e.g. HALL, Room-1"
            value={entry.suffix}
            onChange={(e) => onChange({ suffix: e.target.value })}
            className="rounded-lg"
          />
        </Field>

        <Field label="Room Type" required>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" aria-pressed={entry.hostelType === "AC"} onClick={() => onChange({ hostelType: "AC" })} style={pillButtonStyle(entry.hostelType === "AC")}>AC</button>
            <button type="button" aria-pressed={entry.hostelType === "NON_AC"} onClick={() => onChange({ hostelType: "NON_AC" })} style={pillButtonStyle(entry.hostelType === "NON_AC")}>Non-AC</button>
          </div>
        </Field>

        <Field label="Total Beds" required>
          <BedCountPicker value={entry.totalBeds} onChange={(v) => onChange({ totalBeds: v })} />
        </Field>

        <Field label="Rent / Bed (Monthly)">
          <Input
            type="number"
            aria-label="Rent per bed, monthly"
            placeholder="e.g. 4500"
            value={entry.rentPerBed}
            className="rounded-lg"
            onChange={(e) => onChange({ rentPerBed: e.target.value })}
          />
        </Field>
      </div>

      {flatLabel && entry.suffix.trim() && (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Will be created as <strong style={{ color: "#5200FF" }}>{buildRoomNumber(flatLabel, entry.suffix)}</strong>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENT ================= */
const RoomsPage = () => {

  const location = useLocation();
  const navigate = useNavigate();

  // Business Model property type for this hostel (ROOM / FLAT / null = not configured).
  const { propertyType, loading: propertyTypeLoading } = usePropertyType();
  const isFlatMode = propertyType === "FLAT";
  const isRoomMode = propertyType === "ROOM";
  const lockedAssignMode: "direct" | "flat" | null = isFlatMode ? "flat" : isRoomMode ? "direct" : null;

  /* ================= STATE ================= */
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [flats,      setFlats]      = useState<Flat[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page,       setPage]       = useState(0);
  const [pageSize]   = useState(10);
  const [loading,    setLoading]    = useState(false);

  // Raw input the user types into the search box (updates instantly for a
  // responsive field) vs. the debounced value that's actually sent to the
  // API. Search now runs server-side across ALL rooms/pages, not just the
  // 10 rows already loaded on the current page.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [addOpen,        setAddOpen]        = useState(false);
  const [editOpen,       setEditOpen]       = useState(false);
  const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // "idle" | "loading" | "done" | "error" — surfaced in the UI so a
  // failed branch fetch doesn't just silently show an empty dropdown.
  const [supporting, setSupporting] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [branchesLoading, setBranchesLoading] = useState(false);

  const [roomNumber,  setRoomNumber]  = useState("");
  const [hostelType,  setHostelType]  = useState<HostelType | "">("");
  const [totalBeds,   setTotalBeds]   = useState("");
  const [rentPerBed,  setRentPerBed]  = useState("");
  const [unitId,      setUnitId]      = useState("");

  const [flatAssignState, setFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);
  const [editFlatAssignState, setEditFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);

  // The configured property type decides the mode: Room-based => always a direct
  // room, Flat-based => always inside a flat. Not configured => user's own choice.
  const flatAssign = useMemo<FlatAssignmentValue>(
    () => (lockedAssignMode ? { ...flatAssignState, mode: lockedAssignMode } : flatAssignState),
    [flatAssignState, lockedAssignMode]
  );
  const editFlatAssign = useMemo<FlatAssignmentValue>(
    () => (lockedAssignMode ? { ...editFlatAssignState, mode: lockedAssignMode } : editFlatAssignState),
    [editFlatAssignState, lockedAssignMode]
  );

  const [flatRoomEntries, setFlatRoomEntries] = useState<RoomEntryValue[]>([blankRoomEntry()]);

  const addRoomEntry = () => setFlatRoomEntries(prev => [...prev, blankRoomEntry()]);
  const removeRoomEntry = (key: string) =>
    setFlatRoomEntries(prev => (prev.length > 1 ? prev.filter(e => e.key !== key) : prev));
  const updateRoomEntry = (key: string, patch: Partial<RoomEntryValue>) =>
    setFlatRoomEntries(prev => prev.map(e => (e.key === key ? { ...e, ...patch } : e)));

  const [branchSearchTerm, setBranchSearchTerm] = useState("");

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);

  const [wardenBranchName, setWardenBranchName] = useState("");

  const role     = getUserRole()?.toUpperCase();
  const isWarden = role === "WARDEN";
  const isAdmin  = !isWarden;

  const effectiveUnitId = isWarden ? String(getBranchId() ?? "") : unitId;

  /* ================= RESET FORM ================= */
  const resetAddForm = () => {
    setRoomNumber(""); setHostelType(""); setTotalBeds("");
    setRentPerBed(""); setUnitId(""); setFlatAssign(EMPTY_FLAT_ASSIGNMENT);
    setFlatRoomEntries([blankRoomEntry()]);
  };

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const branchesData = (await fetchAllPages<Branch>(getBranches)).filter(
        (b): b is Branch => !!b && b.id != null
      );
      setBranches(branchesData);

      if (isWarden) {
        const bid = getBranchId();
        if (!bid) {
          toast.error("Warden not mapped to a branch");
        } else {
          const branch = branchesData.find((b) => idsMatch(b.id, bid));
          setWardenBranchName(branch?.unitName || `Branch ${bid}`);
          setSelectedBranch(String(bid));
        }
      }
      return branchesData;
    } catch (err) {
      console.error(err);
      toast.error("Failed loading branches");
      return [];
    } finally {
      setBranchesLoading(false);
    }
  }, [isWarden]);

  /* ================= LOAD SUPPORTING DATA (branches + flats, once) ================= */
  const loadSupportingData = useCallback(async () => {
    if (supporting !== "idle") return;
    setSupporting("loading");
    try {
      const [, flatsResult] = await Promise.allSettled([
        loadBranches(),
        fetchAllPages<Flat>(getFlats),
      ]);

      const flatsData: Flat[] = flatsResult.status === "fulfilled" ? flatsResult.value : [];
      setFlats(flatsData.filter(Boolean));

      if (flatsResult.status === "rejected") {
        console.error(flatsResult.reason);
        toast.error("Failed loading flats");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed loading supporting data");
    } finally {
      setSupporting("done");
    }
  }, [loadBranches, supporting]);

  useEffect(() => { loadSupportingData(); }, [loadSupportingData]);

  useEffect(() => {
    if (addOpen && isAdmin) {
      loadBranches();
    }
  }, [addOpen, isAdmin, loadBranches]);

  useEffect(() => {
    if (addOpen && isAdmin && selectedBranch !== "all" && !unitId) {
      setUnitId(selectedBranch);
    }
  }, [addOpen, isAdmin, selectedBranch, unitId]);

  /* ── Close the branch dropdown on outside click ── */
  useEffect(() => {
    if (!branchDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [branchDropdownOpen]);

  /* ================= INCOMING NAVIGATION STATE ================= */
  useEffect(() => {
    if (supporting !== "done") return;
    const navState = location.state as { unitId?: number | string; openAddRoom?: boolean } | null;
    if (!navState) return;

    if (navState.unitId != null && !isWarden) {
      setSelectedBranch(String(navState.unitId));
      setUnitId(String(navState.unitId));
      setPage(0);
    }
    if (navState.openAddRoom && isAdmin) {
      setAddOpen(true);
    }

    window.history.replaceState({}, document.title);
  }, [supporting, location.state, isWarden, isAdmin]);

  /* ================= DEBOUNCE SEARCH INPUT ================= */
  // Wait 400ms after the user stops typing before hitting the API, and
  // jump back to page 0 since the result set (and its page count) changes.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  /* ================= LOAD ROOMS (real API, page-based, server-side search) ================= */
  const loadRooms = useCallback(async () => {
    if (supporting !== "done") return;
    setLoading(true);
    try {
      const queryParams: Record<string, any> = { page, size: pageSize };
      if (selectedBranch !== "all") {
        queryParams.unitId = selectedBranch;
      }
      if (debouncedSearch) {
        queryParams.search = debouncedSearch;
      }

      const res = await api.get(`/rooms`, { params: queryParams });
      const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
      const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

      const enriched = content.filter(Boolean).map((room: Room) => {
        const occ   = room.occupiedBeds ?? 0;
        const avail = (room.totalBeds   || 0) - occ;

        const resolvedUnitName =
          room.unitName ||
          branches.find((b) => idsMatch(b.id, room.unitId))?.unitName ||
          "-";

        return {
          ...room,
          unitName:  resolvedUnitName,
          flatName:  room.flatName ?? "N/A",
          occupied:  occ,
          available: avail,
          status:    avail > 0 ? (occ > 0 ? "Partially Occupied" : "Available") : "Occupied",
        };
      });

      setRooms(enriched);
      setTotalCount(totalElements);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedBranch, debouncedSearch, supporting, branches]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* ================= HELPERS ================= */
  const flatsByBranch = useMemo(() => {
    if (!effectiveUnitId) return [];
    return flats.filter(f => f && String(f.branchId) === effectiveUnitId);
  }, [flats, effectiveUnitId]);

  const addFlatLabel = flatAssign.flatId
    ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
    : flatAssign.newFlatNumber.trim();

  const flatsByEditBranch = useMemo(() => {
    if (!editRoomData?.unitId) return [];
    return flats.filter(f => f && String(f.branchId) === String(editRoomData.unitId));
  }, [flats, editRoomData?.unitId]);

  const getRoomTypeName = (beds: number, type: string) => {
    const prefix = beds === 1 ? 'Single' : beds === 2 ? 'Double' : beds === 3 ? 'Triple' : beds === 4 ? 'Quad' : `${beds} Bed`;
    const suffix = type === 'AC' ? 'AC' : type === 'NON_AC' ? 'Non-AC' : type;
    return `${prefix} ${suffix}`;
  };

  // Darker text colours (Tailwind 700/800 shades) so every badge meets the
  // 4.5:1 WCAG AA contrast ratio against its pale background.
  const getRoomTypeColor = (typeStr: string) => {
    if (typeStr.includes('Single')) return { color: '#1d4ed8', bg: '#eff6ff' };
    if (typeStr.includes('Double')) return { color: '#15803d', bg: '#dcfce7' };
    if (typeStr.includes('Triple')) return { color: '#6d28d9', bg: '#f3e8ff' };
    if (typeStr.includes('Quad'))   return { color: '#9a3412', bg: '#ffedd5' };
    return { color: '#475569', bg: '#f1f5f9' };
  };

  const resolveFlatId = async (
    assign: FlatAssignmentValue,
    branchId: number
  ): Promise<number | null> => {
    if (assign.mode === "direct") return null;
    if (assign.flatId) return Number(assign.flatId);

    const flatNumber = assign.newFlatNumber.trim();
    const rawResponse = await createFlat({ flatNumber, branchId });

    let newFlat = unwrapEntity<Flat>(rawResponse);

    if (!newFlat) {
      console.warn("createFlat did not return a usable Flat object, re-fetching flats list:", rawResponse);
      const allFlats = (await fetchAllPages<Flat>(getFlats)).filter(Boolean);
      setFlats(allFlats);
      newFlat = allFlats.find(
        f => f && String(f.branchId) === String(branchId) && f.flatNumber === flatNumber
      );
      if (!newFlat) {
        throw new Error(
          "Flat may not have been created — check the Network tab for the /flats request."
        );
      }
    } else {
      setFlats(prev => [...prev, newFlat!]);
    }

    return newFlat.id;
  };

  /* ---- Rename / delete an existing flat (used by the Existing Flat dropdown) ---- */
  const handleRenameFlat = async (flat: Flat, newNumber: string): Promise<boolean> => {
    const flatNumber = newNumber.trim();
    if (!flatNumber) {
      toast.error("Flat number cannot be empty");
      return false;
    }
    if (flatNumber === flat.flatNumber) return true;
    try {
      const res = await api.put(`/flats/${flat.id}`, { flatNumber, branchId: flat.branchId });
      const updated = unwrapEntity<Flat>(res);
      setFlats(prev => prev.map(f => (idsMatch(f.id, flat.id) ? { ...f, ...(updated ?? {}), flatNumber } : f)));
      toast.success(`Flat renamed to ${flatNumber}`);
      loadRooms(); // room rows show the flat name
      return true;
    } catch (e: any) {
      toast.error(extractApiError(e, "Rename failed"));
      return false;
    }
  };

  const handleDeleteFlat = async (flat: Flat): Promise<boolean> => {
    try {
      await api.delete(`/flats/${flat.id}`);
      setFlats(prev => prev.filter(f => !idsMatch(f.id, flat.id)));
      // If the deleted flat was the one picked in either dialog, clear that choice.
      setFlatAssign(prev => (idsMatch(prev.flatId, flat.id) ? { ...prev, flatId: "" } : prev));
      setEditFlatAssign(prev => (idsMatch(prev.flatId, flat.id) ? { ...prev, flatId: "" } : prev));
      toast.success(`Flat ${flat.flatNumber} deleted`);
      loadRooms();
      return true;
    } catch (e: any) {
      toast.error(extractApiError(e, "Delete failed — this flat may still have rooms"));
      return false;
    }
  };

  const handleAdd = async () => {
    if (!effectiveUnitId) {
      toast.error("Branch is required");
      return;
    }

    if (flatAssign.mode === "direct") {
      if (!roomNumber || !hostelType) {
        toast.error("Room number and room type are required");
        return;
      }
      const desiredBeds = Number(totalBeds) || 0;
      if (desiredBeds < 1) {
        toast.error("Total beds must be at least 1");
        return;
      }
      try {
        const res = await createRoom({
          roomNumber,
          hostelType: hostelType as HostelType,
          totalBeds:  desiredBeds,
          rentPerBed: Number(rentPerBed) || 0,
          unitId:     Number(effectiveUnitId),
          flatId:     null,
        });

        const newRoom = unwrapEntity<Room>(res);

        toast.success(`Room created with ${desiredBeds} bed${desiredBeds === 1 ? "" : "s"}`);
        setAddOpen(false);
        resetAddForm();

        navigate("/tenants", {
          state: {
            unitId: Number(effectiveUnitId),
            roomId: newRoom?.id,
            openAddTenant: true,
          },
        });
      } catch (e: any) {
        showBedLimitToast(e, navigate, extractApiError(e, "Create failed"));
      }
      return;
    }

    if (!flatAssign.flatId && !flatAssign.newFlatNumber.trim()) {
      toast.error("Select an existing flat or enter a new flat number");
      return;
    }

    // A row counts as "blank" only if the user hasn't touched it at all — that's fine
    // to ignore (e.g. an unused extra row from "Add Another Room"). But a row with
    // SOME fields filled and others missing must not be silently dropped, or the
    // user ends up with fewer rooms than they thought they were saving.
    const isEntryBlank = (e: RoomEntryValue) =>
      !e.suffix.trim() && !e.hostelType && e.totalBeds.trim() === "";
    const isEntryComplete = (e: RoomEntryValue) =>
      !!e.suffix.trim() && !!e.hostelType && Number(e.totalBeds) > 0;

    const touchedEntries = flatRoomEntries.filter(e => !isEntryBlank(e));
    if (touchedEntries.length === 0) {
      toast.error("Add at least one room with a name, room type, and bed count");
      return;
    }

    const incomplete = touchedEntries.filter(e => !isEntryComplete(e));
    if (incomplete.length > 0) {
      const details = incomplete.map(e => {
        const label = e.suffix.trim() || `Room ${flatRoomEntries.indexOf(e) + 1}`;
        const missing: string[] = [];
        if (!e.suffix.trim()) missing.push("name");
        if (!e.hostelType) missing.push("room type");
        if (!(Number(e.totalBeds) > 0)) missing.push("bed count");
        return `${label} (missing ${missing.join(", ")})`;
      });
      toast.error(`Complete these rooms before saving: ${details.join("; ")}`);
      return;
    }

    const validEntries = touchedEntries;

    try {
      const resolvedFlatId = await resolveFlatId(flatAssign, Number(effectiveUnitId));
      const flatLabel = flatAssign.flatId
        ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
        : flatAssign.newFlatNumber.trim();

      let created = 0;
      const failedNames: string[] = [];

      for (const entry of validEntries) {
        const desiredBeds = Number(entry.totalBeds) || 0;
        const roomNumberToCreate = buildRoomNumber(flatLabel, entry.suffix);

        try {
          await createRoom({
            roomNumber: roomNumberToCreate,
            hostelType: entry.hostelType as HostelType,
            totalBeds:  desiredBeds,
            rentPerBed: Number(entry.rentPerBed) || 0,
            unitId:     Number(effectiveUnitId),
            flatId:     resolvedFlatId,
          });
          created++;
        } catch (innerErr: any) {
          console.error(`Failed creating room "${roomNumberToCreate}":`, innerErr);
          if (isBedLimitError(innerErr)) {
            // Limit hit mid-batch — show the "Add Beds" toast once and stop;
            // every remaining entry in this batch would fail the same way.
            showBedLimitToast(innerErr, navigate, extractApiError(innerErr, "Create failed"));
            break;
          }
          failedNames.push(
            `${roomNumberToCreate} (${extractApiError(innerErr, "unknown error")})`
          );
        }
      }

      if (created > 0) {
        toast.success(`${created} room${created === 1 ? "" : "s"} created under ${flatLabel}`);
      }
      if (failedNames.length > 0) {
        toast.error(`Failed to create: ${failedNames.join(", ")}`);
      }
      if (created > 0) {
        setAddOpen(false);
        resetAddForm();
        loadRooms();
      }
    } catch (e: any) {
      showBedLimitToast(e, navigate, extractApiError(e, "Create failed"));
    }
  };

  const handleEdit = async () => {
    if (!editRoomData) return;
    if (!editRoomData.roomNumber?.trim() || !editRoomData.hostelType) {
      toast.error("Room number and room type are required");
      return;
    }
    const desiredBeds = Number(editRoomData.totalBeds) || 0;
    if (desiredBeds < 1) {
      toast.error("Total beds must be at least 1");
      return;
    }
    if (editFlatAssign.mode === "flat" && !editFlatAssign.flatId && !editFlatAssign.newFlatNumber.trim()) {
      toast.error("Select an existing flat or enter a new flat number");
      return;
    }
    try {
      const resolvedFlatId = await resolveFlatId(editFlatAssign, Number(editRoomData.unitId));
      await editRoom(editRoomData.id, {
        ...editRoomData,
        totalBeds:  desiredBeds,
        rentPerBed: Number(editRoomData.rentPerBed) || 0,
        // Room-based hostel: never touch the room's existing flat link while editing.
        flatId:     isRoomMode ? (editRoomData.flatId ?? null) : resolvedFlatId,
      });
      toast.success("Room updated");
      setEditOpen(false);
      setEditRoomData(null);
      loadRooms();
    } catch (e: any) {
      // Bumping totalBeds on an existing room can also push past the cap.
      showBedLimitToast(e, navigate, extractApiError(e, "Update failed"));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await removeRoom(id);
      toast.success("Room deleted");
      loadRooms();
    } catch (e: any) {
      toast.error(extractApiError(e, "Delete failed"));
    }
  };

  const openEditRoom = (room: Room) => {
    setEditRoomData({ ...room });
    setEditFlatAssign({
      mode: room.flatId ? "flat" : "direct",
      flatId: room.flatId ? String(room.flatId) : "",
      newFlatNumber: "",
    });
    setEditOpen(true);
  };

  // NOTE: `rooms` is now already the search-matched, server-paginated set —
  // no client-side re-filtering here. Filtering only the current page's 10
  // rows was the original bug (a room on page 7 wouldn't show up while
  // viewing page 1).

  const visibleBranches = branchSearchTerm.trim()
    ? branches.filter(b => (b.unitName || "").toLowerCase().includes(branchSearchTerm.toLowerCase()))
    : branches;

  // Label shown on the dropdown trigger button.
  const selectedBranchLabel = isWarden
    ? wardenBranchName
    : selectedBranch === "all"
      ? "All Branches"
      : (branches.find(b => String(b.id) === selectedBranch)?.unitName ?? "Select Branch");

  const selectBranchOption = (value: string) => {
    setSelectedBranch(value);
    setPage(0);
    setBranchDropdownOpen(false);
    setBranchSearchTerm("");
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedBranch(isWarden ? String(getBranchId()) : "all");
    setPage(0);
  };

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage1Based = page + 1;
  const pageNumbers = getPageNumbers(currentPage1Based, totalPages);

  if (propertyTypeLoading) {
    return (
      <div role="status" className="flex items-center justify-center py-24 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rm-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .rm-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; margin-top: 12px; }
        .rm-main { flex: 1; min-width: 0; }

        /* ── Branch dropdown (replaces the old horizontal branch strip) ── */
        .rm-branch-dropdown-wrap { position: relative; display: inline-block; }
        .rm-branch-dropdown-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
          min-width: 220px; padding: 0 14px; height: 40px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #fff; cursor: pointer;
          font-size: 13px; font-weight: 600; color: #0f172a; transition: border-color 0.15s;
        }
        .rm-branch-dropdown-trigger:hover { border-color: #cbd5e1; }
        .rm-branch-dropdown-trigger.disabled { cursor: not-allowed; opacity: 0.6; }
        .rm-branch-dropdown-trigger-left { display: flex; align-items: center; gap: 10px; }
        .rm-branch-dropdown-chevron { transition: transform 0.15s; color: #64748b; }
        .rm-branch-dropdown-chevron.open { transform: rotate(180deg); }

        .rm-branch-dropdown-menu {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
          width: 300px; max-height: 340px; overflow-y: auto;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
        }
        .rm-branch-dropdown-search {
          display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0;
          border-radius: 8px; padding: 0 10px; height: 34px; margin-bottom: 6px; background: #fafafa;
        }
        .rm-branch-dropdown-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

        /* Items are real <button>s now (keyboard accessible); reset button chrome. */
        .rm-branch-dropdown-item {
          display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px;
          font-size: 13px; font-weight: 500; color: #334155; cursor: pointer;
          width: 100%; border: none; background: transparent; text-align: left;
        }
        .rm-branch-dropdown-item:hover { background: #f8fafc; }
        .rm-branch-dropdown-item.active { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .rm-branch-dropdown-item.disabled { cursor: not-allowed; opacity: 0.5; }
        .rm-branch-dropdown-item .check-slot { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rm-branch-dropdown-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

        .rm-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .rm-main-header-right { display: flex; align-items: center; gap: 12px; }
        .rm-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .rm-btn-outline:hover { background: #f8fafc; }
        .rm-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
        .rm-btn-primary:hover { background: #4200cc; }

        .rm-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .rm-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
        .rm-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
        .rm-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; margin-left: auto; }

        .rm-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .rm-table { width: 100%; border-collapse: collapse; min-width: 860px; }
        .rm-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .rm-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .rm-table tr:last-child td { border-bottom: none; }
        .rm-table tr:hover { background: #fdfcff; }

        .rm-col-number { font-size: 14px; font-weight: 600; color: #0f172a; }
        .rm-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }

        .rm-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

        .rm-count { font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }

        /* Status badge text colours darkened for WCAG AA contrast (was 16a34a / f97316 / 3b82f6). */
        .rm-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .rm-status-badge.occupied { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .rm-status-badge.partially { color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; }
        .rm-status-badge.available { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; }

        .rm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; flex-wrap: wrap; gap: 12px; }
        .rm-page-info { font-size: 13px; color: #64748b; }
        .rm-page-controls { display: flex; align-items: center; gap: 6px; }
        .rm-page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .rm-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .rm-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .rm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rm-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #64748b; }

        /* Landscape dialog layout for Add/Edit Room — widened so a
           3-column grid reads comfortably and fields never feel
           squeezed against the card edges. */
        .rm-dialog-landscape { max-width: 900px !important; width: 96vw; }
        .rm-dialog-landscape.rm-dialog-compact { max-width: 680px !important; }
        /* 2 x 2 grid: Room Number | Room Type, then Total Beds | Monthly Rent */
        .rm-dialog-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 20px; }
        .rm-dialog-grid .rm-span-3 { grid-column: 1 / -1; }
        /* Flat dialog: each room is a card with the same 2 x 2 grid */
        .rm-entry-grid { display: flex; flex-direction: column; gap: 12px; }
        .rm-entry-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
        .rm-entry-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; }
        .rm-entry-remove { height: 30px; width: 30px; display: flex; align-items: center; justify-content: center; border: 1px solid #fecaca; border-radius: 8px; background: #fff; cursor: pointer; }
        .rm-entry-remove:hover { background: #fef2f2; }
        @media (max-width: 520px) {
          .rm-dialog-grid { grid-template-columns: 1fr; }
          .rm-entry-fields { grid-template-columns: 1fr; }
        }

        /* Existing Flat | New Flat Number — two labelled fields side by side */
        .rm-flat-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
        .rm-flat-pick > :only-child { grid-column: 1 / -1; }
        @media (max-width: 520px) { .rm-flat-pick { grid-template-columns: 1fr; } }

        /* Existing-flat dropdown: each flat has its own edit / delete buttons */
        .rm-flat-dd { position: relative; }
        .rm-flat-trigger { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 14px; color: #0f172a; cursor: pointer; text-align: left; }
        .rm-flat-trigger .placeholder { color: #64748b; }
        .rm-flat-menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 40; max-height: 210px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 4px; }
        .rm-flat-row { display: flex; align-items: center; gap: 2px; border-radius: 8px; }
        .rm-flat-row:hover { background: #f8fafc; }
        .rm-flat-row.active { background: #f3e8ff; }
        .rm-flat-opt { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: none; background: transparent; font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left; }
        .rm-flat-row.active .rm-flat-opt { color: #5200FF; font-weight: 600; }
        .rm-flat-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rm-flat-act { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 6px; cursor: pointer; flex-shrink: 0; }
        .rm-flat-act:hover:not(:disabled) { background: #e2e8f0; }
        .rm-flat-act.danger:hover:not(:disabled) { background: #fee2e2; }
        .rm-flat-act:disabled { opacity: 0.5; cursor: not-allowed; }
        .rm-flat-act.boxed { width: 40px; height: 40px; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; }

        /* Soften the selected/focus ring on selects & inputs inside the
           dialog so a chosen value (e.g. a picked Branch) reads as a
           normal filled field instead of a bright, full-width blue
           highlight competing with the label above it. */
        .rm-dialog-landscape button[role="combobox"],
        .rm-dialog-landscape input {
          border-color: #e2e8f0 !important;
          box-shadow: none !important;
        }
        .rm-dialog-landscape button[role="combobox"]:focus,
        .rm-dialog-landscape button[role="combobox"]:focus-visible,
        .rm-dialog-landscape input:focus,
        .rm-dialog-landscape input:focus-visible {
          border-color: #5200FF !important;
          box-shadow: 0 0 0 3px rgba(82,0,255,0.12) !important;
          outline: none !important;
        }
      `}</style>

      <div className="rm-wrap">

        <div className="rm-layout">

          {/* Main Content Area */}
          <div className="rm-main">
            <div className="rm-main-header">
              <div className="rm-branch-dropdown-wrap" ref={branchDropdownRef}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={branchDropdownOpen}
                  aria-label={`Branch filter: ${selectedBranchLabel}`}
                  className={`rm-branch-dropdown-trigger ${isWarden ? "disabled" : ""}`}
                  onClick={() => { if (!isWarden) setBranchDropdownOpen(o => !o); }}
                >
                  <span className="rm-branch-dropdown-trigger-left">
                    <Building2 size={16} color="#8b5cf6" aria-hidden="true" />
                    {selectedBranchLabel}
                  </span>
                  {!isWarden && (
                    <ChevronDown size={16} aria-hidden="true" className={`rm-branch-dropdown-chevron ${branchDropdownOpen ? "open" : ""}`} />
                  )}
                </button>

                {branchDropdownOpen && !isWarden && (
                  <div className="rm-branch-dropdown-menu">
                    <div className="rm-branch-dropdown-search">
                      <Search size={13} color="#94a3b8" aria-hidden="true" />
                      <input
                        type="text"
                        aria-label="Search branches"
                        placeholder="Search branches..."
                        value={branchSearchTerm}
                        onChange={(e) => setBranchSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <button
                      type="button"
                      className={`rm-branch-dropdown-item ${selectedBranch === "all" ? "active" : ""}`}
                      aria-current={selectedBranch === "all" ? "true" : undefined}
                      onClick={() => selectBranchOption("all")}
                    >
                      <span className="check-slot">{selectedBranch === "all" && <Check size={14} aria-hidden="true" />}</span>
                      All Branches
                    </button>

                    {visibleBranches.length === 0 ? (
                      <div className="rm-branch-dropdown-empty">No branches found.</div>
                    ) : (
                      visibleBranches.map(branch => (
                        <button
                          type="button"
                          key={branch.id}
                          className={`rm-branch-dropdown-item ${selectedBranch === String(branch.id) ? "active" : ""}`}
                          aria-current={selectedBranch === String(branch.id) ? "true" : undefined}
                          onClick={() => selectBranchOption(String(branch.id))}
                        >
                          <span className="check-slot">{selectedBranch === String(branch.id) && <Check size={14} aria-hidden="true" />}</span>
                          {branch.unitName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="rm-main-header-right">
                <button type="button" className="rm-btn-outline"><Download size={16} aria-hidden="true" /> Export</button>

                {isAdmin && (
                  <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
                    <DialogTrigger asChild>
                      <button type="button" className="rm-btn-primary"><Plus size={16} aria-hidden="true" /> {isFlatMode ? "Add Flat" : "Add Room"}</button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl overflow-hidden rm-dialog-landscape rm-dialog-compact mobile-form-dialog">
                      <DialogHeader>
                        <DialogTitle>{isFlatMode ? "Add Flat" : flatAssign.mode === "flat" ? "Add Rooms under a Flat" : "Add Room"}</DialogTitle>
                        <DialogDescription>
                          {isFlatMode
                            ? "Create a flat (or pick an existing one) and add the rooms and beds inside it."
                            : flatAssign.mode === "flat"
                              ? "Create one or more rooms together under the same flat/floor."
                              : "Create a new room and map it to a branch."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
                        <div className="rm-span-3">
                          {isWarden ? (
                            <Field label="Branch">
                              <Input aria-label="Branch" value={wardenBranchName} disabled className="bg-slate-50 rounded-lg" />
                            </Field>
                          ) : (
                            <Field label="Branch" required>
                              <div className="space-y-1">
                                <Select
                                  key={branches.length}
                                  value={unitId}
                                  onValueChange={(v) => { setUnitId(v); setFlatAssign(EMPTY_FLAT_ASSIGNMENT); }}
                                >
                                  <SelectTrigger className="rounded-lg" aria-label="Branch">
                                    <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branchesLoading ? (
                                      <div className="p-2 text-xs text-muted-foreground text-center">Loading branches…</div>
                                    ) : branches.length > 0 ? (
                                      branches
                                        .filter(b => b && b.id != null)
                                        .map(b => (
                                          <SelectItem key={String(b.id)} value={String(b.id)}>
                                            {b.unitName || `Branch ${b.id}`}
                                          </SelectItem>
                                        ))
                                    ) : (
                                      <div className="p-2 text-xs text-muted-foreground text-center">
                                        No branches found
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                {!branchesLoading && branches.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => loadBranches()}
                                    className="text-[11px] font-medium text-[#5200FF] hover:underline flex items-center gap-1"
                                  >
                                    <RefreshCw size={11} aria-hidden="true" /> Retry loading branches
                                  </button>
                                )}
                              </div>
                            </Field>
                          )}
                        </div>
                        {!isRoomMode && (
                          <div className="rm-span-3">
                            <FlatAssignmentField
                              unitId={effectiveUnitId}
                              flatsForBranch={flatsByBranch}
                              value={flatAssign}
                              onChange={setFlatAssign}
                              allowDirect={!isFlatMode}
                              onRenameFlat={handleRenameFlat}
                              onDeleteFlat={handleDeleteFlat}
                            />
                          </div>
                        )}

                        {flatAssign.mode === "direct" ? (
                          <>
                            <Field label="Room Number" required>
                              <Input aria-label="Room number" placeholder="e.g. 101" value={roomNumber} className="rounded-lg" onChange={e => setRoomNumber(e.target.value)} />
                            </Field>

                            <Field label="Room Type" required>
                              <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
                                <SelectTrigger className="rounded-lg" aria-label="Room type"><SelectValue placeholder="Select Type" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AC">AC</SelectItem>
                                  <SelectItem value="NON_AC">Non-AC</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>

                            {/* Bed count — plain number input, shared with Edit. */}
                            <Field label="Total Beds" required>
                              <BedCountPicker value={totalBeds} onChange={setTotalBeds} />
                            </Field>

                            <Field label="Rent per Bed (Monthly)">
                              <Input type="number" aria-label="Rent per bed, monthly" placeholder="e.g. 4500" value={rentPerBed} className="rounded-lg" onChange={e => setRentPerBed(e.target.value)} />
                            </Field>
                          </>
                        ) : (
                          <div className="rm-span-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div className="rm-entry-grid">
                              {flatRoomEntries.map((entry, idx) => (
                                <RoomEntryRow
                                  key={entry.key}
                                  index={idx}
                                  entry={entry}
                                  flatLabel={addFlatLabel}
                                  onChange={(patch) => updateRoomEntry(entry.key, patch)}
                                  onRemove={() => removeRoomEntry(entry.key)}
                                  canRemove={flatRoomEntries.length > 1}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={addRoomEntry}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                width: "100%", padding: "8px 0", borderRadius: 8,
                                border: "1.5px dashed #cbd5e1", background: "#fff",
                                fontSize: 12.5, fontWeight: 600, color: "#5200FF", cursor: "pointer",
                              }}
                            >
                              <Plus size={14} aria-hidden="true" /> Add Another Room
                            </button>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                        <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">
                          {isFlatMode ? "Save Flat" : flatAssign.mode === "flat"
                            ? (() => {
                                const n = flatRoomEntries.filter(e => e.suffix.trim()).length;
                                return n > 0 ? `Save ${n} Room${n === 1 ? "" : "s"}` : "Save Rooms";
                              })()
                            : "Save Room"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="rm-filters-row">
              <div className="rm-search-main">
                <Search size={16} color="#94a3b8" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Search rooms or branches"
                  placeholder="Search rooms or branches..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button type="button" className="rm-clear-btn" onClick={clearFilters}>
                <RefreshCw size={14} aria-hidden="true" /> Clear Filters
              </button>
            </div>

            <div className="rm-table-container">
              <div className="overflow-x-auto">
                <table className="rm-table">
                  <thead>
                    <tr>
                      {/* Flat-based property: FLAT column comes first, then the room number. */}
                      {isFlatMode && <th>FLAT</th>}
                      <th>ROOM NO.</th>
                      <th>ROOM TYPE</th>
                      <th>BRANCH</th>
                      <th className="text-center">BEDS</th>
                      <th className="text-center">OCCUPIED</th>
                      <th className="text-center">AVAILABLE</th>
                      <th>STATUS</th>
                      {isAdmin && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={(isAdmin ? 8 : 7) + (isFlatMode ? 1 : 0)} className="text-center py-12 text-slate-600">Loading rooms...</td></tr>
                    ) : rooms.length === 0 ? (
                      <tr><td colSpan={(isAdmin ? 8 : 7) + (isFlatMode ? 1 : 0)} className="text-center py-12 text-slate-600">No rooms found.</td></tr>
                    ) : (
                      rooms.map((room: any) => {
                        const typeName  = getRoomTypeName(room.totalBeds, room.hostelType);
                        const typeColor = getRoomTypeColor(typeName);

                        return (
                          <tr key={room.id}>
                            {isFlatMode && (
                              <td>
                                <div className="rm-branch-name">{room.flatName && room.flatName !== "N/A" ? room.flatName : "-"}</div>
                              </td>
                            )}
                            <td><span className="rm-col-number">{room.roomNumber}</span></td>
                            <td>
                              <span className="rm-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
                                {typeName}
                              </span>
                            </td>
                            <td>
                              <div className="rm-branch-name">{room.unitName || "-"}</div>
                            </td>
                            <td className="text-center"><span className="rm-count">{room.totalBeds}</span></td>
                            <td className="text-center"><span className="rm-count">{room.occupied}</span></td>
                            <td className="text-center"><span className="rm-count">{room.available}</span></td>
                            <td>
                              <div className={`rm-status-badge ${room.status === 'Occupied' ? 'occupied' : room.status === 'Partially Occupied' ? 'partially' : 'available'}`}>
                                <div aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${room.status === 'Occupied' ? 'bg-green-500' : room.status === 'Partially Occupied' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                {room.status}
                              </div>
                            </td>
                            {isAdmin && (
                              <td>
                                <div className="flex gap-2">
                                  {/* Lighthouse: "Buttons do not have an accessible name" — icon-only edit/delete */}
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    aria-label={`Edit room ${room.roomNumber}`}
                                    title="Edit"
                                    className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                                    onClick={() => openEditRoom(room)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        aria-label={`Delete room ${room.roomNumber}`}
                                        title="Delete"
                                        className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(room.id)} className="bg-red-600 hover:bg-red-700 rounded-lg">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rm-pagination">
                <div className="rm-page-info">
                  Showing {rooms.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} rooms
                </div>

                <nav aria-label="Pagination" className="rm-page-controls">
                  <Button
                    type="button"
                    size="icon" variant="outline" className="w-8 h-8 rounded-lg"
                    aria-label="Previous page"
                    disabled={page === 0} onClick={() => setPage(p => Math.max(p - 1, 0))}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="rm-page-ellipsis" aria-hidden="true">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={p}
                        aria-label={`Page ${p}`}
                        aria-current={p === currentPage1Based ? "page" : undefined}
                        className={`rm-page-btn ${p === currentPage1Based ? "active" : ""}`}
                        onClick={() => setPage(p - 1)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <Button
                    type="button"
                    size="icon" variant="outline" className="w-8 h-8 rounded-lg"
                    aria-label="Next page"
                    disabled={currentPage1Based >= totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditRoomData(null); setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); } }}>

            <DialogContent className="rounded-2xl overflow-hidden rm-dialog-landscape rm-dialog-compact mobile-form-dialog">
              <DialogHeader>
                <DialogTitle>{isFlatMode ? "Edit Flat" : "Edit Room"}</DialogTitle>
                <DialogDescription>Update room details.</DialogDescription>
              </DialogHeader>
              {editRoomData && (
                <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
                  {/* Step 1 — Branch first */}
                  <div className="rm-span-3">
                    <Field label="Branch" required>
                      <Select
                        value={String(editRoomData.unitId)}
                        onValueChange={v => {
                          setEditRoomData({ ...editRoomData, unitId: Number(v) });
                          setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); // branch changed — flat choice no longer valid
                        }}
                      >
                        <SelectTrigger className="rounded-lg" aria-label="Branch"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                        <SelectContent>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Step 2 — Direct Room vs Assign to Flat */}
                  {!isRoomMode && (
                    <div className="rm-span-3">
                      <FlatAssignmentField
                        unitId={editRoomData.unitId ? String(editRoomData.unitId) : ""}
                        flatsForBranch={flatsByEditBranch}
                        value={editFlatAssign}
                        onChange={setEditFlatAssign}
                        allowDirect={!isFlatMode}
                        onRenameFlat={handleRenameFlat}
                        onDeleteFlat={handleDeleteFlat}
                      />
                    </div>
                  )}

                  {/* Step 3 — Room Number, Room Type, Beds and Rent laid
                      out across the 3-column landscape grid. */}
                  <Field label="Room Number" required>
                    <Input aria-label="Room number" placeholder="e.g. 101" value={editRoomData.roomNumber} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })} />
                  </Field>

                  <Field label="Room Type" required>
                    <Select value={editRoomData.hostelType || ""} onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}>
                      <SelectTrigger className="rounded-lg" aria-label="Room type"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="NON_AC">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Total Beds" required>
                    <BedCountPicker
                      value={String(editRoomData.totalBeds ?? "")}
                      onChange={(v) => setEditRoomData({ ...editRoomData, totalBeds: Number(v) || 0 })}
                    />
                  </Field>

                  <Field label="Rent per Bed (Monthly)">
                    <Input type="number" aria-label="Rent per bed, monthly" placeholder="e.g. 4500" value={String(editRoomData.rentPerBed ?? 0)} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })} />
                  </Field>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default RoomsPage;