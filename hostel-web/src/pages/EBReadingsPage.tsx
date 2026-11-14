// import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// import {
//   getRooms,
//   getEBReadings,
//   addEBReading,
//   deleteEBReading,
//   getTenantWiseEBBill,
//   sendEBBillWhatsApp,
//   getUserRole,
//   getTenants,
//   getBranchId,
//   getBranches,
//   getFlats,
//   getRents,
//   deleteEBReadingsByFlat,
//   deleteEBReadingsByRoom,
//   fetchAllPages,
// } from "@/lib/store";

// import { Room, EBReading, Tenant, Branch, Flat, Rent } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// import * as XLSX from "xlsx";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogClose,
//   DialogDescription,
// } from "@/components/ui/dialog";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// import { toast } from "sonner";
// import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, ChevronDown, Check, Search, X, MoreHorizontal, Zap } from "lucide-react";
// import { usePropertyType } from "@/lib/propertyType";

// const isMonthlyTenant = (t: any) => (t?.tenantStay ?? "MONTHLY") !== "DAILY";

// // ── PERFORMANCE ───────────────────────────────────────────────────────
// // Larger pages = far fewer round-trips. Make sure /rooms, /tenants, /flats,
// // /units and /eb-readings accept size=200 (if any caps lower, lower this).
// const PAGE_ALL = 10;
// // How many tenant-wise bill requests may be in flight at once.
// const BILL_CONCURRENCY = 8;

// // Runs `worker` over `items` with at most `limit` running at the same time.
// const runPool = async <T,>(
//   items: T[],
//   limit: number,
//   worker: (item: T) => Promise<void>
// ) => {
//   let next = 0;
//   const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
//     while (next < items.length) {
//       const item = items[next++];
//       await worker(item);
//     }
//   });
//   await Promise.all(runners);
// };

// // Natural (numeric-aware) compare so room names sort G1, G2, G3 ... G10
// // instead of G1, G10, G2.
// const naturalCompare = (a: any, b: any) =>
//   String(a ?? "").localeCompare(String(b ?? ""), undefined, {
//     numeric: true,
//     sensitivity: "base",
//   });

// // An "informational" row is a DAILY-stay tenant's checkout record: it is
// // shown as-is (settled units/amount vs advance) and never goes through the
// // bill endpoint.
// //
// // A MONTHLY tenant's checkout row is a normal billing row; his bill comes
// // from the flat/room bill like everybody else's. The tenant record is the
// // authority for the stay type, the reading's own tenantStay is the fallback.
// const isInformationalReading = (reading: any, tenant?: any) => {
//   if (reading?.tenantId == null || reading?.isCheckout !== true) return false;
//   const stay = tenant?.tenantStay ?? reading?.tenantStay ?? "MONTHLY";
//   return stay === "DAILY";
// };

// // VACANCY FIX: if nobody was living on this meter at the last saved
// // reading (the room was vacant), the next billing "Previous" is the
// // earliest join reading above it.
// // Example: last reading 200, room empty, tenant joins at 210 -> Previous = 210.
// // The 200 -> 210 units were used while vacant and belong to the owner.
// const bumpPastVacancy = (base: number, meterTenants: any[]): number => {
//   const activeAtBase = meterTenants.some(t => {
//     const join = Number(t.joinReading ?? 0);
//     if (!Number.isFinite(join) || join > base) return false;
//     if (t.status === "Checked_Out") {
//       const co = Number(t.checkoutReading);
//       return Number.isFinite(co) && co > base;
//     }
//     return true;
//   });
//   if (activeAtBase) return base;

//   const laterJoins = meterTenants
//     .map(t => Number(t.joinReading))
//     .filter(v => Number.isFinite(v) && v > base);

//   return laterJoins.length > 0 ? Math.min(...laterJoins) : base;
// };

// /* ══════════════════════════════════════════════════════════════════
//    SEARCHABLE SELECT (used for Room / Flat inside the Add EB Reading dialog)
//    - compact panel, exactly as wide as its trigger
//    - search box pinned at the top, list scrolls (max 224px)
//    - keyboard: ↑ / ↓ move, Enter picks, Esc closes ONLY the menu
//    - menu is position:absolute (NOT fixed) because Radix Dialog content
//      uses a CSS transform
//    ══════════════════════════════════════════════════════════════════ */
// type SearchableOption = { value: string; label: string; hint?: string };

// const SearchableSelect = ({
//   value,
//   onChange,
//   options,
//   placeholder = "Select",
//   searchPlaceholder = "Search...",
//   ariaLabel,
//   disabled = false,
//   emptyText = "No results found",
//   noun = "result",
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   options: SearchableOption[];
//   placeholder?: string;
//   searchPlaceholder?: string;
//   ariaLabel: string;
//   disabled?: boolean;
//   emptyText?: string;
//   noun?: string;
// }) => {
//   const [open, setOpen] = useState(false);
//   const [term, setTerm] = useState("");
//   const [activeIdx, setActiveIdx] = useState(0);
//   const [dropUp, setDropUp] = useState(false);
//   const wrapRef = useRef<HTMLDivElement | null>(null);
//   const triggerRef = useRef<HTMLButtonElement | null>(null);
//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const listRef = useRef<HTMLDivElement | null>(null);

//   const trimmed = term.trim().toLowerCase();

//   const filtered = useMemo(
//     () => (trimmed
//       ? options.filter(o => o.label.toLowerCase().includes(trimmed))
//       : options),
//     [options, trimmed]
//   );

//   const selected = options.find(o => o.value === value);

//   const closeMenu = useCallback(() => {
//     setOpen(false);
//     setTerm("");
//     setActiveIdx(0);
//   }, []);

//   const openMenu = () => {
//     if (disabled) return;
//     const rect = triggerRef.current?.getBoundingClientRect();
//     if (rect) {
//       const spaceBelow = window.innerHeight - rect.bottom;
//       setDropUp(spaceBelow < 320 && rect.top > spaceBelow);
//     }
//     const idx = options.findIndex(o => o.value === value);
//     setActiveIdx(idx >= 0 ? idx : 0);
//     setOpen(true);
//   };

//   const pick = (v: string) => {
//     onChange(v);
//     closeMenu();
//     triggerRef.current?.focus();
//   };

//   // Close on outside click / tap
//   useEffect(() => {
//     if (!open) return;
//     const handle = (e: PointerEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
//     };
//     document.addEventListener("pointerdown", handle);
//     return () => document.removeEventListener("pointerdown", handle);
//   }, [open, closeMenu]);

//   // Esc should close only this menu, not the surrounding Dialog.
//   useEffect(() => {
//     if (!open) return;
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         e.stopPropagation();
//         e.preventDefault();
//         closeMenu();
//         triggerRef.current?.focus();
//       }
//     };
//     window.addEventListener("keydown", onKey, true);
//     return () => window.removeEventListener("keydown", onKey, true);
//   }, [open, closeMenu]);

//   // Focus the search box when the menu opens
//   useEffect(() => {
//     if (open) inputRef.current?.focus();
//   }, [open]);

//   // Keep the highlighted row inside the visible scroll area
//   useEffect(() => {
//     if (!open || !listRef.current) return;
//     const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
//     el?.scrollIntoView({ block: "nearest" });
//   }, [activeIdx, open]);

//   // Keep the highlight valid when the filtered list shrinks
//   useEffect(() => {
//     setActiveIdx(i => Math.min(i, Math.max(filtered.length - 1, 0)));
//   }, [filtered.length]);

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "ArrowDown") {
//       e.preventDefault();
//       setActiveIdx(i => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
//     } else if (e.key === "ArrowUp") {
//       e.preventDefault();
//       setActiveIdx(i => Math.max(i - 1, 0));
//     } else if (e.key === "Enter") {
//       e.preventDefault();
//       const item = filtered[activeIdx];
//       if (item) pick(item.value);
//     }
//   };

//   return (
//     <div className="eb-ss" ref={wrapRef}>
//       <button
//         type="button"
//         ref={triggerRef}
//         className="eb-ss-trigger"
//         aria-haspopup="listbox"
//         aria-expanded={open}
//         aria-label={ariaLabel}
//         disabled={disabled}
//         onClick={() => (open ? closeMenu() : openMenu())}
//       >
//         <span className={`eb-ss-trigger-label ${selected ? "" : "placeholder"}`}>
//           {selected ? selected.label : placeholder}
//         </span>
//         {selected?.hint && <span className="eb-ss-badge">{selected.hint}</span>}
//         <ChevronDown size={16} aria-hidden="true" className={`eb-ss-chevron ${open ? "open" : ""}`} />
//       </button>

//       {open && (
//         <div className={`eb-ss-menu ${dropUp ? "up" : ""}`}>
//           <div className="eb-ss-search">
//             <Search size={14} color="#64748b" className="shrink-0" aria-hidden="true" />
//             <input
//               ref={inputRef}
//               type="text"
//               aria-label={searchPlaceholder}
//               placeholder={searchPlaceholder}
//               value={term}
//               onChange={e => { setTerm(e.target.value); setActiveIdx(0); }}
//               onKeyDown={handleKeyDown}
//             />
//             {term && (
//               <button
//                 type="button"
//                 className="eb-ss-search-clear"
//                 aria-label="Clear search"
//                 onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
//               >
//                 <X size={13} aria-hidden="true" />
//               </button>
//             )}
//           </div>

//           <div className="eb-ss-list" role="listbox" aria-label={ariaLabel} ref={listRef}>
//             {filtered.map((item, idx) => {
//               const isSelected = item.value === value;
//               return (
//                 <button
//                   type="button"
//                   key={item.value}
//                   role="option"
//                   aria-selected={isSelected}
//                   data-idx={idx}
//                   className={`eb-ss-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
//                   onMouseEnter={() => setActiveIdx(idx)}
//                   onClick={() => pick(item.value)}
//                 >
//                   <span className="eb-ss-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
//                   <span className="eb-ss-item-label">{item.label}</span>
//                   {item.hint && <span className="eb-ss-badge">{item.hint}</span>}
//                 </button>
//               );
//             })}
//             {filtered.length === 0 && <div className="eb-ss-empty">{emptyText}</div>}
//           </div>

//           {filtered.length > 0 && (
//             <div className="eb-ss-footer">
//               {filtered.length} {noun}{filtered.length > 1 ? "s" : ""}
//               {trimmed && options.length !== filtered.length ? ` of ${options.length}` : ""}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// /* ══════════════════════════════════════════════════════════════════
//    SEARCHABLE ROOM FILTER (toolbar "All Rooms" dropdown)
//    ══════════════════════════════════════════════════════════════════ */
// const RoomFilterDropdown = ({
//   value, onChange, options,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   options: Room[];
// }) => {
//   const [open, setOpen] = useState(false);
//   const [term, setTerm] = useState("");
//   const [activeIdx, setActiveIdx] = useState(0);
//   const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
//   const wrapRef = useRef<HTMLDivElement | null>(null);
//   const triggerRef = useRef<HTMLButtonElement | null>(null);
//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const listRef = useRef<HTMLDivElement | null>(null);

//   const trimmed = term.trim().toLowerCase();

//   const sortedOptions = useMemo(
//     () => [...options].sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber)),
//     [options]
//   );

//   const filtered = useMemo(
//     () => (trimmed
//       ? sortedOptions.filter((r) => String(r.roomNumber ?? "").toLowerCase().includes(trimmed))
//       : sortedOptions),
//     [sortedOptions, trimmed]
//   );

//   // "All Rooms" is only offered while nothing is typed in the search box.
//   const items = useMemo(
//     () => [
//       ...(trimmed ? [] : [{ id: "all", label: "All Rooms" }]),
//       ...filtered.map((r) => ({ id: String(r.id), label: String(r.roomNumber) })),
//     ],
//     [filtered, trimmed]
//   );

//   const selectedLabel =
//     value === "all"
//       ? "All Rooms"
//       : (options.find((r) => String(r.id) === value)?.roomNumber ?? "Room");

//   const closeMenu = useCallback(() => {
//     setOpen(false);
//     setTerm("");
//     setActiveIdx(0);
//   }, []);

//   const openMenu = () => {
//     const rect = triggerRef.current?.getBoundingClientRect();
//     if (rect) {
//       const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
//       const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
//       setMenuPos({ top: rect.bottom + 4, left, width });
//     }
//     setOpen(true);
//   };

//   const pick = (id: string) => {
//     onChange(id);
//     closeMenu();
//   };

//   // Close on outside click
//   useEffect(() => {
//     if (!open) return;
//     const handle = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
//     };
//     document.addEventListener("mousedown", handle);
//     return () => document.removeEventListener("mousedown", handle);
//   }, [open, closeMenu]);

//   // The menu is fixed-position, so close it if the page scrolls or resizes
//   // (scrolling inside the room list itself is fine).
//   useEffect(() => {
//     if (!open) return;
//     const onScroll = (e: Event) => {
//       if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
//       closeMenu();
//     };
//     window.addEventListener("scroll", onScroll, true);
//     window.addEventListener("resize", closeMenu);
//     return () => {
//       window.removeEventListener("scroll", onScroll, true);
//       window.removeEventListener("resize", closeMenu);
//     };
//   }, [open, closeMenu]);

//   // Focus the search box when the menu opens
//   useEffect(() => {
//     if (open) inputRef.current?.focus();
//   }, [open]);

//   // Keep the highlighted row inside the visible scroll area
//   useEffect(() => {
//     if (!open || !listRef.current) return;
//     const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
//     el?.scrollIntoView({ block: "nearest" });
//   }, [activeIdx, open]);

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "ArrowDown") {
//       e.preventDefault();
//       setActiveIdx((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
//     } else if (e.key === "ArrowUp") {
//       e.preventDefault();
//       setActiveIdx((i) => Math.max(i - 1, 0));
//     } else if (e.key === "Enter") {
//       e.preventDefault();
//       const item = items[activeIdx];
//       if (item) pick(item.id);
//     } else if (e.key === "Escape") {
//       e.preventDefault();
//       closeMenu();
//     }
//   };

//   return (
//     <div className="eb-room-dd w-[150px]" ref={wrapRef}>
//       <button
//         type="button"
//         ref={triggerRef}
//         className="eb-room-trigger"
//         aria-haspopup="listbox"
//         aria-expanded={open}
//         aria-label="Filter by room"
//         onClick={() => (open ? closeMenu() : openMenu())}
//       >
//         <span className="eb-room-trigger-label">{selectedLabel}</span>
//         <ChevronDown size={16} aria-hidden="true" className={`eb-room-chevron ${open ? "open" : ""}`} />
//       </button>

//       {open && (
//         <div className="eb-room-menu" style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}>
//           <div className="eb-room-search">
//             <Search size={14} color="#64748b" className="shrink-0" aria-hidden="true" />
//             <input
//               ref={inputRef}
//               type="text"
//               aria-label="Search rooms"
//               placeholder="Search room..."
//               value={term}
//               onChange={(e) => { setTerm(e.target.value); setActiveIdx(0); }}
//               onKeyDown={handleKeyDown}
//             />
//             {term && (
//               <button
//                 type="button"
//                 className="eb-room-search-clear"
//                 aria-label="Clear room search"
//                 onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
//               >
//                 <X size={13} aria-hidden="true" />
//               </button>
//             )}
//           </div>

//           <div className="eb-room-list" role="listbox" aria-label="Rooms" ref={listRef}>
//             {items.map((item, idx) => {
//               const isSelected = item.id === value;
//               return (
//                 <button
//                   type="button"
//                   key={item.id}
//                   role="option"
//                   aria-selected={isSelected}
//                   data-idx={idx}
//                   className={`eb-room-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
//                   onMouseEnter={() => setActiveIdx(idx)}
//                   onClick={() => pick(item.id)}
//                 >
//                   <span className="eb-room-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
//                   {item.label}
//                 </button>
//               );
//             })}
//             {filtered.length === 0 && (
//               <div className="eb-room-empty">No rooms found</div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const EBReadingsPage = () => {
//   // ── role is uppercased for all comparisons ────────────────────────────
//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId(); // number | null

//   // Business Model property type (ROOM / FLAT / null = not configured).
//   const { propertyType, loading: propertyTypeLoading } = usePropertyType();
//   const isFlatMode = propertyType === "FLAT";
//   const isRoomMode = propertyType === "ROOM";

//   const isAdmin   = role === "ADMIN" || role === "WARDEN";
//   const hasAccess = isAdmin;
//   const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

//   // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
//   const defaultBranch =
//     role === "ADMIN" || role === "SUPER_ADMIN"
//       ? "all"
//       : branchId != null ? String(branchId) : "all";

//   // ── PAGE-LEVEL CASCADING FILTERS: Branch → Flat → Room ────────────────
//   const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);
//   const [selectedFlatId, setSelectedFlatId] = useState<string>("all");
//   const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

//   const [rooms,        setRooms]        = useState<Room[]>([]);
//   const [readings,     setReadings]     = useState<EBReading[]>([]);
//   const [tenants,      setTenants]      = useState<Tenant[]>([]);
//   const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
//   const [branches,     setBranches]     = useState<Branch[]>([]);
//   const [flats,        setFlats]        = useState<Flat[]>([]);
//   // Every rent record: used to know whether a month's EB was already billed.
//   const [allRents,     setAllRents]     = useState<Rent[]>([]);
//   const [tenantRows,   setTenantRows]   = useState<any[]>([]);
//   const [tenantBills,  setTenantBills]  = useState<any[]>([]);

//   // PERF: true while tenant-wise bills are still arriving (rows stream in).
//   const [billsLoading, setBillsLoading] = useState(false);
//   // PERF: per-page-visit cache of bill responses. Cleared on every reload()
//   // and gone on unmount, so it can never show data older than this visit.
//   const billCacheRef = useRef<Map<string, any[]>>(new Map());

//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [addOpen,    setAddOpen]    = useState(false);
//   const [billOpen,   setBillOpen]   = useState(false);
//   const [isSaving,   setIsSaving]   = useState(false);

//   const [manualRate,      setManualRate]      = useState<number | "">(13);
//   const [manualMode,      setManualMode]      = useState(false);
//   const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

//   // Flat selected INSIDE the Add EB Reading dialog (separate from the
//   // page-level `selectedFlatId` filter above).
//   const [formFlatId,      setFormFlatId]      = useState("all");
//   const [formRoomId,      setFormRoomId]      = useState("");
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");

//   const [flatSharedPrev, setFlatSharedPrev] = useState("");
//   const [flatSharedCurr, setFlatSharedCurr] = useState("");

//   const [flatAcRows, setFlatAcRows] = useState<
//     { roomId: number; roomNumber: string; acPreviousReading: string; acCurrentReading: string }[]
//   >([]);

//   const now = new Date();
//   const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
//   const [selYear,  setSelYear]  = useState(now.getFullYear());
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

//   // Last 24 months, newest first, for the Month/Year picker.
//   const monthYearOptions = useMemo(() => {
//     const opts: { month: number; year: number; label: string; value: string }[] = [];
//     const base = new Date();
//     for (let i = 0; i < 24; i++) {
//       const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
//       const month = d.getMonth() + 1;
//       const year = d.getFullYear();
//       opts.push({
//         month,
//         year,
//         label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
//         value: `${year}-${month}`,
//       });
//     }
//     return opts;
//   }, []);

//   /* ─── MONTHLY-ONLY TENANTS ───────────────────────────────────────────
//      Single source of truth for "tenants whose meter readings count". */
//   const monthlyTenants = useMemo(
//     () => tenants.filter(isMonthlyTenant),
//     [tenants]
//   );

//   const tenantById = useMemo(() => {
//     const map = new Map<number, any>();
//     tenants.forEach(t => map.set(Number(t.id), t));
//     return map;
//   }, [tenants]);


//   const calculateInformationalShare = useCallback(
//     (
//       targetTenantId: number,
//       prevReading: number,
//       currReading: number,
//       rate: number,
//       occupants: Tenant[],
//       meterFlatId: number | null,
//       meterRoomId: number | null
//     ): { units: number; amount: number } => {
//       if (!(currReading > prevReading) || occupants.length === 0) {
//         return { units: 0, amount: 0 };
//       }

//       const localLastBilled = new Map<number, number>();
//       allReadings.forEach((r: any) => {
//         if (r.tenantId == null) return;
//         const sameMeter = meterFlatId != null
//           ? Number(r.flatId) === Number(meterFlatId)
//           : Number(r.roomId) === Number(meterRoomId);
//         if (!sameMeter) return;

//         const val = Number(r.currentReading ?? 0);
//         const key = Number(r.tenantId);
//         const prevMax = localLastBilled.get(key);
//         if (prevMax == null || val > prevMax) localLastBilled.set(key, val);
//       });

//       const isPresentInSegment = (t: Tenant, segStart: number, segEnd: number): boolean => {
//         const join = Number(t.joinReading);
//         if (!Number.isFinite(join) || join > segStart) return false;

//         if (Number(t.id) === targetTenantId) {
//           return currReading >= segEnd;
//         }

//         const lastBilled = localLastBilled.get(Number(t.id));
//         if (lastBilled != null && lastBilled >= segStart) return false;

//         if (t.status === "Checked_Out") {
//           const co = Number(t.checkoutReading);
//           if (!Number.isFinite(co)) return false;
//           return co >= segEnd;
//         }

//         return true;
//       };

//       const boundarySet = new Set<number>();
//       occupants.forEach(t => {
//         const join = Number(t.joinReading);
//         if (Number.isFinite(join) && join > prevReading && join < currReading) {
//           boundarySet.add(join);
//         }
//         if (Number(t.id) !== targetTenantId && t.status === "Checked_Out") {
//           const co = Number(t.checkoutReading);
//           if (Number.isFinite(co) && co > prevReading && co < currReading) {
//             boundarySet.add(co);
//           }
//         }
//       });

//       const points = [
//         prevReading,
//         ...Array.from(boundarySet).sort((a, b) => a - b),
//         currReading,
//       ];

//       let units = 0;
//       let amount = 0;

//       for (let i = 0; i < points.length - 1; i++) {
//         const segStart = points[i];
//         const segEnd = points[i + 1];
//         const segUnits = segEnd - segStart;
//         if (segUnits <= 0) continue;

//         const presentInSegment = occupants.filter(t => isPresentInSegment(t, segStart, segEnd));
//         const presentCount = presentInSegment.length || 1;
//         const tenantPresent = presentInSegment.some(t => Number(t.id) === targetTenantId);

//         if (tenantPresent) {
//           units  += segUnits / presentCount;
//           amount += (segUnits * rate) / presentCount;
//         }
//       }

//       return { units, amount };
//     },
//     [allReadings]
//   );

//   /* ─── RATE ─────────────────────────────────────────────── */
//   const getRateForRoom = (roomId: string | number) => {
//     const roomRate = roomManualRates[String(roomId)];
//     if (manualMode && roomRate !== undefined) return roomRate;
//     if (typeof manualRate === "number") return manualRate;
//     return 13;
//   };

//   /* ─── IS AC ───────────────────────────────────────────────
//      ROOM property: an AC room behaves exactly like a non-AC room (only the
//      normal Previous / Current meter reading, no AC Previous / AC Current).
//      FLAT property: unchanged — AC rooms still carry AC readings. */
//   const isRoomAc = useCallback(
//     (roomId: string | number) => {
//       if (isRoomMode) return false;
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       return room?.hostelType === "AC";
//     },
//     [rooms, isRoomMode]
//   );

//   /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
//   const handleFlatAcRowChange = (roomId: number, value: string) => {
//     setFlatAcRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   // Rules:
//   //   1. Previous comes from the latest GENUINE EB Reading Page entry
//   //      (isCheckout === false), "latest" = highest id.
//   //   2. Checkout/check-in rows never move the Previous/Current sequence
//   //      directly, but a real meter value can never go backward, so every
//   //      reading's currentReading is used as a floor.
//   //   3. With no genuine entry, fall back to the earliest joinReading of
//   //      MONTHLY tenants (active or checked out).
//   //   4. DAILY-stay tenants are excluded from that fallback.
//   //   5. VACANCY: see bumpPastVacancy.

//   // AC "Previous" for ONE room. A CHECKOUT row only moves this room's AC
//   // floor when a tenant of THIS room owns it (flat checkouts write a copy
//   // onto every room of the flat).
//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const rid = String(roomId);

//       const roomRows = allReadings.filter(
//         r => r.roomId != null && String(r.roomId) === rid
//       );

//       const roomTenants = monthlyTenants.filter(t => String(t.roomId) === rid);
//       const roomTenantIds = new Set(roomTenants.map(t => Number(t.id)));

//       const rowCountsForAc = (r: any) => {
//         if (r.isCheckout !== true) return true;
//         if (r.tenantId == null) return false;
//         return roomTenantIds.has(Number(r.tenantId));
//       };

//       const rowAcFloor = roomRows
//         .filter(rowCountsForAc)
//         .reduce((m, r) => Math.max(m, Number(r.acCurrentReading ?? 0)), 0);

//       const tenantAcFloor = roomTenants.reduce((m, t) => {
//         const co = Number((t as any).acCheckoutReading);
//         const join = Number((t as any).acJoinReading);
//         if (!Number.isFinite(co) || co <= 0) return m;
//         if (Number.isFinite(join) && join > 0 && co <= join) return m;
//         return Math.max(m, co);
//       }, 0);

//       const acFloor = Math.max(rowAcFloor, tenantAcFloor);

//       const genuineRoomReadings = roomRows.filter(r => r.isCheckout !== true);
//       if (genuineRoomReadings.length > 0) {
//         const latest = genuineRoomReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         return Math.max(Number(latest.acCurrentReading ?? 0), acFloor);
//       }

//       const joins = roomTenants
//         .map(t => Number((t as any).acJoinReading))
//         .filter(v => Number.isFinite(v) && v > 0);
//       const joinFloor = joins.length > 0 ? Math.min(...joins) : 0;

//       return Math.max(joinFloor, acFloor);
//     },
//     [allReadings, monthlyTenants]
//   );

//   // A room's main EB meter "Previous" (checkout floor + vacancy bump).
//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));

//       const genuineReadings = allReadings.filter(r => {
//         if (r.isCheckout === true) return false;
//         const matchesRoom = String(r.roomId) === String(roomId);
//         const matchesFlat =
//           room?.flatId != null && r.flatId != null && String(r.flatId) === String(room.flatId);
//         return matchesRoom || matchesFlat;
//       });

//       const anyReadingsForMeter = allReadings.filter(r => {
//         const matchesRoom = String(r.roomId) === String(roomId);
//         const matchesFlat =
//           room?.flatId != null && r.flatId != null && String(r.flatId) === String(room.flatId);
//         return matchesRoom || matchesFlat;
//       });
//       const checkoutFloor = anyReadingsForMeter.length > 0
//         ? Math.max(...anyReadingsForMeter.map(r => Number(r.currentReading ?? 0)))
//         : 0;

//       const roomTenants = monthlyTenants.filter(t => String(t.roomId) === String(roomId));
//       const flatTenants = room?.flatId != null
//         ? monthlyTenants.filter(t => {
//             const tRoom = rooms.find(r => Number(r.id) === Number(t.roomId));
//             return tRoom?.flatId != null && String(tRoom.flatId) === String(room.flatId);
//           })
//         : [];
//       const baselineTenants = flatTenants.length > 0 ? flatTenants : roomTenants;

//       if (genuineReadings.length > 0) {
//         const latest = genuineReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         const base = Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
//         return bumpPastVacancy(base, baselineTenants);
//       }

//       const joinFloor = baselineTenants.length > 0
//         ? Math.min(...baselineTenants.map(t => Number(t.joinReading ?? 0)))
//         : 0;

//       return Math.max(joinFloor, checkoutFloor);
//     },
//     [allReadings, monthlyTenants, rooms]
//   );

//   // The flat's own shared-meter "Previous" value.
//   const getFlatStartingReading = useCallback(
//     (flatId: string | number) => {
//       const genuineFlatReadings = allReadings.filter(
//         r => r.isCheckout !== true && r.flatId != null && String(r.flatId) === String(flatId)
//       );

//       const anyFlatReadings = allReadings.filter(
//         r => r.flatId != null && String(r.flatId) === String(flatId)
//       );
//       const checkoutFloor = anyFlatReadings.length > 0
//         ? Math.max(...anyFlatReadings.map(r => Number(r.currentReading ?? 0)))
//         : 0;

//       const roomIdsInFlat = new Set(
//         rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
//       );
//       const flatAllTenants = monthlyTenants.filter(t => roomIdsInFlat.has(t.roomId));

//       if (genuineFlatReadings.length > 0) {
//         const latest = genuineFlatReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         const base = Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
//         return bumpPastVacancy(base, flatAllTenants);
//       }

//       const joinFloor = flatAllTenants.length > 0
//         ? Math.min(...flatAllTenants.map(t => Number(t.joinReading ?? 0)))
//         : 0;

//       return Math.max(joinFloor, checkoutFloor);
//     },
//     [allReadings, rooms, monthlyTenants]
//   );

//   /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
//   const filteredRooms = useMemo(() => {
//     if (selectedBranch === "all") return rooms;
//     return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
//   }, [rooms, selectedBranch]);

//   /* ─── PAGE-LEVEL FLAT FILTER OPTIONS (scoped by branch) ───────────── */
//   const filterFlats = useMemo(() => {
//     if (selectedBranch === "all") return flats;
//     const flatIdsInBranch = new Set(
//       filteredRooms
//         .map(r => r.flatId)
//         .filter((id): id is number => id != null)
//         .map(Number)
//     );
//     return flats.filter(f => flatIdsInBranch.has(Number(f.id)));
//   }, [flats, filteredRooms, selectedBranch]);

//   /* ─── PAGE-LEVEL ROOM FILTER OPTIONS (scoped by branch + flat) ───── */
//   const filterRooms = useMemo(() => {
//     if (selectedFlatId === "all") return filteredRooms;
//     return filteredRooms.filter(r => String(r.flatId) === String(selectedFlatId));
//   }, [filteredRooms, selectedFlatId]);

//   const dialogRooms = useMemo(() => {
//     if (!formBranchId) return rooms;
//     return rooms.filter(r => Number(r.unitId) === Number(formBranchId));
//   }, [rooms, formBranchId]);

//   const dialogStandaloneRooms = useMemo(
//     () => dialogRooms.filter(r => !r.flatId),
//     [dialogRooms]
//   );

//   const dialogFlatFilteredRooms = useMemo(() => {
//     if (!formFlatId || formFlatId === "all") return dialogStandaloneRooms;
//     return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
//   }, [dialogRooms, dialogStandaloneRooms, formFlatId]);

//   const dialogFlats = useMemo(() => {
//     if (!formBranchId) return flats;
//     const flatIdsInBranch = new Set(
//       dialogRooms.map(r => r.flatId).filter((id): id is number => id != null)
//     );
//     return flats.filter(f => flatIdsInBranch.has(Number(f.id)));
//   }, [flats, formBranchId, dialogRooms]);

//   // Options for the searchable pickers in the Add EB Reading dialog.
//   // Sorted naturally (G1, G2, G10 — not G1, G10, G2).
//   const dialogFlatOptions = useMemo<SearchableOption[]>(
//     () =>
//       [...dialogFlats]
//         .sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber))
//         .map(f => ({ value: String(f.id), label: String(f.flatNumber) })),
//     [dialogFlats]
//   );

//   // ROOM property: no "AC" badge — an AC room is picked exactly like a non-AC room.
//   const dialogRoomOptions = useMemo<SearchableOption[]>(
//     () =>
//       [...dialogFlatFilteredRooms]
//         .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber))
//         .map(r => ({
//           value: String(r.id),
//           label: String(r.roomNumber),
//           hint: !isRoomMode && r.hostelType === "AC" ? "AC" : undefined,
//         })),
//     [dialogFlatFilteredRooms, isRoomMode]
//   );

//   const roomMap = useMemo(() => {
//     const map: Record<string, string> = {};
//     rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
//     return map;
//   }, [rooms]);

//   // Rooms belonging to the flat currently selected in the Add dialog.
//   const roomsInFormFlat = useMemo(() => {
//     if (!formFlatId || formFlatId === "all") return [];
//     return dialogRooms
//       .filter(r => String(r.flatId) === String(formFlatId))
//       .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber));
//   }, [dialogRooms, formFlatId]);

//   /* ─── FILTERED READINGS ─────────────────────────────────── */
//   const filteredReadings = useMemo(() => {
//     let data = readings.filter(r => r.month === selMonth && r.year === selYear);
//     if (selectedBranch !== "all") {
//       const branchRooms   = rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
//       const branchRoomIds = new Set(branchRooms.map(r => r.id));
//       const branchFlatIds = new Set(branchRooms.map(r => r.flatId).filter(Boolean));
//       data = data.filter(r =>
//         (r.roomId != null && branchRoomIds.has(r.roomId)) ||
//         (r.flatId != null && branchFlatIds.has(r.flatId))
//       );
//     }
//     // Flat filter: only load bills for the chosen flat (saves bill API calls).
//     if (selectedFlatId !== "all") {
//       const flatRoomIds = new Set(
//         rooms.filter(r => String(r.flatId) === String(selectedFlatId)).map(r => r.id)
//       );
//       data = data.filter(r =>
//         (r.flatId != null && String(r.flatId) === String(selectedFlatId)) ||
//         (r.roomId != null && flatRoomIds.has(r.roomId))
//       );
//     }
//     return data;
//   }, [readings, rooms, selectedBranch, selectedFlatId, selMonth, selYear]);

//   /* ─── RELOAD ─────────────────────────────────────────────── */
//   const reload = async () => {
//     // Data may have changed: drop every cached bill response.
//     billCacheRef.current.clear();

//     // PERF: PAGE_ALL rows per request -> a handful of calls instead of dozens.
//     const [
//       roomsResult,
//       readingsResult,
//       tenantsResult,
//       branchesResult,
//       flatsResult,
//       rentsResult,
//     ] = await Promise.allSettled([
//       fetchAllPages<Room>(getRooms, PAGE_ALL),
//       fetchAllPages<EBReading>(getEBReadings, PAGE_ALL),
//       fetchAllPages<Tenant>(getTenants, PAGE_ALL),
//       fetchAllPages<Branch>(getBranches, PAGE_ALL),
//       fetchAllPages<Flat>(getFlats, PAGE_ALL),
//       fetchAllPages<Rent>(getRents, PAGE_ALL),
//     ]);

//     const roomList: Room[] =
//       roomsResult.status === "fulfilled" ? roomsResult.value : [];
//     const readingList: EBReading[] =
//       readingsResult.status === "fulfilled" ? readingsResult.value : [];
//     const tenantList: Tenant[] =
//       tenantsResult.status === "fulfilled" ? tenantsResult.value : [];
//     const branchList: Branch[] =
//       branchesResult.status === "fulfilled" ? branchesResult.value : [];
//     const flatList: Flat[] =
//       flatsResult.status === "fulfilled" ? flatsResult.value : [];
//     const rentList: Rent[] =
//       rentsResult.status === "fulfilled" ? rentsResult.value : [];

//     if (roomsResult.status === "rejected") {
//       console.error("Failed to load rooms:", roomsResult.reason);
//       toast.error("Failed to load rooms");
//     }
//     if (readingsResult.status === "rejected") {
//       console.error("Failed to load EB readings:", readingsResult.reason);
//       toast.error("Failed to load EB readings");
//     }
//     if (tenantsResult.status === "rejected") {
//       console.error("Failed to load tenants:", tenantsResult.reason);
//       toast.error("Failed to load tenants");
//     }
//     if (branchesResult.status === "rejected") {
//       console.error("Failed to load branches:", branchesResult.reason);
//     }
//     if (flatsResult.status === "rejected") {
//       console.error("Failed to load flats:", flatsResult.reason);
//       toast.error(
//         "Couldn't load flats (permission or server error) — flat-based readings may be hidden until this is fixed."
//       );
//     }

//     let filteredRoomsData = roomList;
//     let filteredTenants   = tenantList;
//     let filteredReadingData = readingList;

//     if (role === "WARDEN" && branchId != null) {
//       filteredRoomsData = roomList.filter(r => Number(r.unitId) === Number(branchId));
//       const roomIds = new Set(filteredRoomsData.map(r => r.id));
//       const flatIds = new Set(
//         filteredRoomsData.map(r => r.flatId).filter((id): id is number => id != null)
//       );
//       filteredTenants = tenantList.filter(t => roomIds.has(Number(t.roomId)));
//       filteredReadingData = readingList.filter(r =>
//         (r.roomId != null && roomIds.has(r.roomId)) ||
//         (r.flatId != null && flatIds.has(r.flatId))
//       );
//     }

//     setRooms(filteredRoomsData);
//     setReadings(filteredReadingData);
//     setTenants(filteredTenants);
//     setAllReadings(readingList);
//     setBranches(branchList);
//     setFlats(flatList);
//     setAllRents(rentList);
//   };

//   const didLoad = useRef(false);
//   useEffect(() => {
//     if (didLoad.current) return;
//     didLoad.current = true;
//     reload();
//   }, []);

//   /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ────────────────── */
//   useEffect(() => {
//     if (!formFlatId || formFlatId === "all") {
//       setFlatSharedPrev("");
//       setFlatSharedCurr("");
//       setFlatAcRows([]);
//       return;
//     }

//     setFlatSharedPrev(String(getFlatStartingReading(formFlatId)));
//     setFlatSharedCurr("");

//     const acRoomsInFlat = roomsInFormFlat.filter(r => r.hostelType === "AC");
//     setFlatAcRows(prev =>
//       acRoomsInFlat.map(room => {
//         const existing = prev.find(p => p.roomId === room.id);
//         return {
//           roomId: room.id,
//           roomNumber: room.roomNumber,
//           acPreviousReading: String(getRoomStartingACReading(room.id)),
//           acCurrentReading: existing ? existing.acCurrentReading : "",
//         };
//       })
//     );
//   }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ───── */
//   useEffect(() => {
//     if (!formRoomId) return;
//     setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//     setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//   }, [formRoomId, allReadings, getRoomStartingReading, getRoomStartingACReading]);

//   /* ─── BUILD TENANT BILL ROWS ───────────────────────────────
//      PERF: bills are fetched in PARALLEL (BILL_CONCURRENCY at a time) instead
//      of one-by-one, each flat/room+month response is cached for this visit, and
//      rows stream into the table as each bill arrives.

//      CARRY-OVER: an ACTIVE tenant whose month was never billed (no rent
//      generated) moves into the NEXT month's row once that month has a reading.
//        October  -> Mani only    (8382 -> 8623, 121u, ₹1,567)
//        November -> Balaji only  (8382 -> 8703, 201u, ₹2,607 = Oct 121u + Nov 80u)

//      The backend already excludes DAILY-stay tenants from every bill it
//      returns. The id sets below are built from monthlyTenants as a second
//      guard. A room whose only occupant is a daily tenant comes back as an
//      "Unassigned" row carrying the room's units.

//      A bill line's room is resolved inside the bill's own flat first, then
//      from the tenant's own room (room numbers are not unique system-wide).

//      Tenants transferred OUT of a room during the month still appear on that
//      room's bill, so the id sets hold every MONTHLY tenant. */
//   useEffect(() => {
//     let cancelled = false;

//     const resolveBillRoomId = (
//       b: any,
//       flatId: number | null | undefined
//     ): number | undefined => {
//       const sameNumber = rooms.filter(rm => rm.roomNumber === b.roomNumber);
//       if (flatId != null) {
//         const inFlat = sameNumber.find(rm => String(rm.flatId) === String(flatId));
//         if (inFlat) return inFlat.id;
//       }
//       if (b.tenantId != null) {
//         const t = tenantById.get(Number(b.tenantId));
//         if (t?.roomId != null) return Number(t.roomId);
//       }
//       return sameNumber[0]?.id;
//     };

//     // Informational rows are DAILY tenants' checkout records only. They
//     // never go through getTenantWiseEBBill.
//     const isInfo = (r: any) =>
//       isInformationalReading(
//         r,
//         r.tenantId != null ? tenantById.get(Number(r.tenantId)) : undefined
//       );

//     // A tenant whose CURRENT room differs from the room this line was billed
//     // in was transferred out of it: tag the line "moved to <room>".
//     const tagMoved = (rows: any[]) =>
//       rows.map(row => {
//         const t = row.tenantId != null ? tenantById.get(Number(row.tenantId)) : undefined;
//         return t?.roomId != null && row.roomId != null && String(t.roomId) !== String(row.roomId)
//           ? { ...row, movedTo: roomMap[String(t.roomId)] }
//           : row;
//       });

//     // Cached fetch: the same flat/room + month is never requested twice per visit.
//     const fetchBills = async (params: {
//       flatId?: number;
//       roomId?: number;
//       month: number;
//       year: number;
//     }): Promise<any[]> => {
//       const key = `${params.flatId != null ? "f" + params.flatId : "r" + params.roomId}:${params.month}:${params.year}`;
//       const hit = billCacheRef.current.get(key);
//       if (hit) return hit;
//       const bills = await getTenantWiseEBBill(params);
//       billCacheRef.current.set(key, bills);
//       return bills;
//     };

//     // ── previous-month carry-over helpers ──
//     const pm = selMonth === 1 ? 12 : selMonth - 1;
//     const py = selMonth === 1 ? selYear - 1 : selYear;
//     const nm = selMonth === 12 ? 1 : selMonth + 1;
//     const ny = selMonth === 12 ? selYear + 1 : selYear;
//     const prevLabel = new Date(py, pm - 1, 1).toLocaleString("en-US", {
//       month: "short",
//       year: "numeric",
//     });
//     // Tenants whose previous-month / selected-month rent was already generated.
//     const billedPrev = new Set(
//       allRents
//         .filter(x => Number(x.rentMonth) === pm && Number(x.rentYear) === py)
//         .map(x => Number(x.tenantId))
//     );
//     const billedCurrent = new Set(
//       allRents
//         .filter(x => Number(x.rentMonth) === selMonth && Number(x.rentYear) === selYear)
//         .map(x => Number(x.tenantId))
//     );

//     // Does this flat/room have a reading saved for the NEXT month?
//     const nextMonthHasReading = (flatId: number | null | undefined, roomId: number | null | undefined) =>
//       allReadings.some(
//         x =>
//           Number(x.month) === nm &&
//           Number(x.year) === ny &&
//           x.isCheckout !== true &&
//           (flatId != null ? Number(x.flatId) === Number(flatId) : Number(x.roomId) === Number(roomId))
//       );

//     // An ACTIVE tenant whose selected-month EB is not billed yet AND whose
//     // next month already has a reading: this month's share moves into the
//     // next month's row, so it is hidden here (e.g. Balaji in October).
//     const deferredToNextMonth = (
//       tenantId: any,
//       flatId: number | null | undefined,
//       roomId: number | null | undefined
//     ) => {
//       if (tenantId == null) return false;
//       const t = tenantById.get(Number(tenantId));
//       if (!t || t.status === "Checked_Out") return false;
//       if (billedCurrent.has(Number(tenantId))) return false;
//       return nextMonthHasReading(flatId, roomId);
//     };

//     // Adds last month's still-unbilled EB share to an ACTIVE tenant's row.
//     const carryPrevious = async (
//       rows: any[],
//       params: { flatId?: number; roomId?: number }
//     ) => {
//       const candidates = rows.filter(
//         row =>
//           row.tenantId != null &&
//           !row.checkedOut &&
//           !billedPrev.has(Number(row.tenantId))
//       );
//       if (candidates.length === 0) return;

//       let prevBills: any[] = [];
//       try {
//         prevBills = await fetchBills({ ...params, month: pm, year: py });
//       } catch {
//         return;
//       }

//       for (const row of candidates) {
//         const pb = prevBills.find(b => Number(b.tenantId) === Number(row.tenantId));
//         const amt = Number(pb?.amount ?? 0);
//         if (!pb || !(amt > 0)) continue;

//         row.carriedUnits  = Number(pb.totalUnits ?? 0);
//         row.carriedAmount = amt;
//         row.carriedLabel  = prevLabel;
//         row.previousReading = pb.previousReading ?? row.previousReading;
//         row.unitsConsumed = Number(row.unitsConsumed ?? 0) + row.carriedUnits;
//         row.tenantAmount  = Number(row.tenantAmount ?? 0) + amt;
//       }
//     };

//     const loadTenantBills = async () => {
//       setBillsLoading(true);

//       const informationalReadings = filteredReadings.filter(r => isInfo(r));
//       const billingReadings = filteredReadings.filter(r => !isInfo(r));

//       // ── 1. Informational (DAILY checkout) rows: pure client math, instant ──
//       const infoRows: any[] = [];
//       for (const r of informationalReadings) {
//         const room = rooms.find(rm => rm.id === r.roomId);
//         const tenantIdRaw = (r as any).tenantId;
//         const tenantId = tenantIdRaw != null ? Number(tenantIdRaw) : null;
//         const tenant = tenantId != null ? tenantById.get(tenantId) : undefined;

//         const prevReading = Number(r.previousReading ?? 0);
//         const currReading = Number(r.currentReading ?? 0);
//         const rate = Number((r as any).ebRate ?? 0) || 13;

//         const flatId = room?.flatId ?? null;
//         const occupants = flatId != null
//           ? tenants.filter(t => {
//               const tRoom = rooms.find(rm => rm.id === t.roomId);
//               return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
//             })
//           : tenants.filter(t => String(t.roomId) === String(r.roomId));

//         // Prefer a real value the backend already persisted on this row;
//         // only recompute client-side when both are missing/zero.
//         const storedUnits  = Number((r as any).unitsConsumed ?? 0);
//         const storedAmount = Number((r as any).ebAmount ?? 0);

//         let grossUnits  = storedUnits;
//         let grossAmount = storedAmount;

//         if (!grossUnits && !grossAmount && tenantId != null) {
//           const computed = calculateInformationalShare(
//             tenantId, prevReading, currReading, rate, occupants,
//             flatId, r.roomId ?? null
//           );
//           grossUnits  = computed.units;
//           grossAmount = computed.amount;
//         }

//         const advancePaid = Number(tenant?.ebAmount ?? 0);
//         const netAmount   = grossAmount - advancePaid; // > 0 due, <= 0 paid/refund

//         infoRows.push({
//           id: r.id,
//           roomId: r.roomId,
//           flatId: room?.flatId ?? null,
//           roomNumber: room?.roomNumber ?? "-",
//           flatNumber: "-",
//           branchId: (r as any).branchId ?? null,
//           branchName: (r as any).branchName ?? null,
//           tenantName: (r as any).tenantName ?? tenant?.name ?? "Daily tenant",
//           previousReading: r.previousReading,
//           currentReading: r.currentReading,
//           acPreviousReading: r.acPreviousReading,
//           acCurrentReading: r.acCurrentReading,
//           unitsConsumed: grossUnits,
//           tenantAmount: grossAmount,
//           advancePaid,
//           netAmount,
//           informational: true,
//         });
//       }

//       // ── 2. Work out ONE bill request per flat and per standalone room ──
//       const flatReadingMap = new Map<number, EBReading>();
//       for (const r of billingReadings.filter(r => r.flatId != null)) {
//         const existing = flatReadingMap.get(r.flatId!);
//         if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
//           flatReadingMap.set(r.flatId!, r);
//         }
//       }

//       const roomReadingMap = new Map<number, EBReading>();
//       for (const r of billingReadings) {
//         if (r.roomId == null) continue;
//         const room = rooms.find(rm => rm.id === r.roomId);
//         if (!room || room.flatId) continue;          // flat rooms are covered by the flat bill
//         if (!roomReadingMap.has(r.roomId)) roomReadingMap.set(r.roomId, r);
//       }

//       type Task = { kind: "flat"; r: EBReading } | { kind: "room"; r: EBReading };
//       const tasks: Task[] = [
//         ...Array.from(flatReadingMap.values()).map(r => ({ kind: "flat" as const, r })),
//         ...Array.from(roomReadingMap.values()).map(r => ({ kind: "room" as const, r })),
//       ];

//       const monthlyIds = new Set(monthlyTenants.map(t => Number(t.id)));
//       const collected: any[] = [];
//       const publish = () => {
//         if (!cancelled) setTenantRows(tagMoved([...infoRows, ...collected]));
//       };

//       publish(); // informational rows show immediately

//       // ── 3. Fetch bills in parallel; rows appear as each one finishes ──
//       await runPool(tasks, BILL_CONCURRENCY, async ({ kind, r }) => {
//         if (cancelled) return;
//         try {
//           if (kind === "flat") {
//             const bills = await fetchBills({
//               flatId: r.flatId!,
//               month: r.month,
//               year: r.year,
//             });

//             const startIdx = collected.length;

//             bills
//               .filter((b: any) => b.tenantId == null || monthlyIds.has(Number(b.tenantId)))
//               .filter((b: any) => !deferredToNextMonth(b.tenantId, r.flatId, null))
//               .forEach((b: any) => {
//                 const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
//                 collected.push({
//                   id: r.id,
//                   roomId: resolveBillRoomId(b, r.flatId),
//                   flatId: r.flatId,
//                   roomNumber: b.roomNumber,
//                   flatNumber: b.flatNumber,
//                   branchId: (r as any).branchId ?? null,
//                   branchName: (r as any).branchName ?? null,
//                   tenantId: b.tenantId ?? null,
//                   tenantName: b.tenantName,
//                   checkedOut: billTenant?.status === "Checked_Out",
//                   previousReading: b.previousReading,
//                   currentReading: b.currentReading,
//                   acPreviousReading: b.acPreviousReading,
//                   acCurrentReading: b.acCurrentReading,
//                   unitsConsumed: b.totalUnits,
//                   tenantAmount: b.amount,
//                 });
//               });

//             await carryPrevious(collected.slice(startIdx), { flatId: r.flatId! });
//           } else {
//             const room = rooms.find(rm => rm.id === r.roomId);
//             if (!room) return;

//             const bills = await fetchBills({
//               roomId: r.roomId!,
//               month: r.month,
//               year: r.year,
//             });

//             const allMatched = bills.filter(
//               (b: any) => b.tenantId == null || monthlyIds.has(Number(b.tenantId))
//             );
//             const matchedBills = allMatched.filter(
//               (b: any) => !deferredToNextMonth(b.tenantId, null, r.roomId)
//             );

//             const startIdx = collected.length;

//             if (matchedBills.length > 0) {
//               matchedBills.forEach((b: any) => {
//                 const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
//                 collected.push({
//                   id: r.id,
//                   roomId: room.id,
//                   flatId: room.flatId,
//                   roomNumber: room.roomNumber,
//                   flatNumber: b.flatNumber,
//                   branchId: (r as any).branchId ?? null,
//                   branchName: (r as any).branchName ?? null,
//                   tenantId: b.tenantId ?? null,
//                   tenantName: b.tenantName,
//                   checkedOut: billTenant?.status === "Checked_Out",
//                   previousReading: b.previousReading ?? r.previousReading,
//                   currentReading: b.currentReading ?? r.currentReading,
//                   acPreviousReading: b.acPreviousReading,
//                   acCurrentReading: b.acCurrentReading,
//                   unitsConsumed: Number(b.totalUnits ?? 0),
//                   tenantAmount: b.amount,
//                 });
//               });
//             } else if (allMatched.length === 0) {
//               collected.push({
//                 id: r.id,
//                 roomId: room.id,
//                 flatId: room.flatId,
//                 roomNumber: room.roomNumber,
//                 flatNumber: "-",
//                 branchId: (r as any).branchId ?? null,
//                 branchName: (r as any).branchName ?? null,
//                 tenantName: "-",
//                 previousReading: r.previousReading,
//                 currentReading: r.currentReading,
//                 acPreviousReading: r.acPreviousReading,
//                 acCurrentReading: r.acCurrentReading,
//                 unitsConsumed:
//                   r.currentReading != null && r.previousReading != null
//                     ? Number(r.currentReading) - Number(r.previousReading)
//                     : 0,
//                 tenantAmount: 0,
//               });
//             }

//             await carryPrevious(collected.slice(startIdx), { roomId: r.roomId! });
//           }
//         } catch { /* skip failed flat/room, same as before */ }

//         publish(); // show this bill's rows right away
//       });

//       if (!cancelled) setBillsLoading(false);
//     };

//     if (filteredReadings.length > 0) {
//       loadTenantBills();
//     } else {
//       setTenantRows([]);
//       setBillsLoading(false);
//     }

//     // A newer run (filters changed while bills were loading) wins.
//     return () => { cancelled = true; };
//   }, [filteredReadings, roomMap, rooms, monthlyTenants, tenantById, tenants, calculateInformationalShare, allRents, allReadings, selMonth, selYear]);

//   /* ─── ADD READING ───────────────────────────────────────── */
//   const handleAdd = async () => {
//     if (isSaving) return;

//     if (canPickBranch && !formBranchId) {
//       toast.error("Select a branch first");
//       return;
//     }

//     setIsSaving(true);
//     try {
//       const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

//       // Flat-based hostel: a reading is always entered against a flat.
//       if (isFlatMode && (!formFlatId || formFlatId === "all")) {
//         toast.error("Select a flat first");
//         return;
//       }

//       if (formFlatId && formFlatId !== "all") {
//         // ── SHARED FLAT METER ──
//         if (roomsInFormFlat.length === 0) {
//           toast.error("No rooms found in this flat");
//           return;
//         }
//         if (flatSharedCurr === "") {
//           toast.error("Enter the current reading for the flat's shared meter");
//           return;
//         }

//         const prev = Number(flatSharedPrev);
//         const curr = Number(flatSharedCurr);
//         if (curr < prev) {
//           toast.error("Current reading cannot be less than previous");
//           return;
//         }

//         const rate = typeof manualRate === "number" ? manualRate : 13;

//         let anyAcError = false;
//         for (const room of roomsInFormFlat) {
//           const isAc = room.hostelType === "AC";
//           const acRow = flatAcRows.find(r => r.roomId === room.id);
//           const acPrev = isAc ? Number(acRow?.acPreviousReading ?? 0) : 0;
//           const acCurr = isAc && acRow?.acCurrentReading ? Number(acRow.acCurrentReading) : acPrev;

//           if (isAc && acCurr < acPrev) {
//             toast.error(`Invalid AC reading for Room ${room.roomNumber}`);
//             anyAcError = true;
//             continue;
//           }

//           await addEBReading({
//             flatId: Number(formFlatId),
//             roomId: Number(room.id),
//             branchId: branchIdNum,
//             month: selMonth, year: selYear,
//             previousReading: prev, currentReading: curr,
//             acPreviousReading: acPrev, acCurrentReading: acCurr,
//             ebRate: rate, isCheckout: false,
//           } as any);
//         }
//         if (!anyAcError) toast.success("Flat readings saved");
//       } else {
//         // ── STANDALONE ROOM, SHARED METER ──
//         // ROOM property: isRoomAc() is false for every room, so an AC room is
//         // saved exactly like a non-AC room (AC previous/current = 0).
//         if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
//         if (!formPrevReading) { toast.error("Previous reading is missing"); return; }
//         const prev   = Number(formPrevReading);
//         const curr   = Number(formCurrReading);
//         const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
//         const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;
//         if (curr < prev) { toast.error("Current reading cannot be less than previous"); return; }
//         await addEBReading({
//           roomId: Number(formRoomId),
//           branchId: branchIdNum,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: acPrev, acCurrentReading: acCurr,
//           ebRate: getRateForRoom(formRoomId), isCheckout: false,
//         } as any);
//         toast.success("Room reading saved");
//       }
//       setAddOpen(false);
//       resetAddDialog();
//       reload();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save readings");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   /* ─── EXCEL UPLOAD ──────────────────────────────────────── */
//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     try {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       const data     = await file.arrayBuffer();
//       const workbook = XLSX.read(data);
//       const sheet    = workbook.Sheets[workbook.SheetNames[0]];
//       const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);
//       let savedCount = 0, skippedCount = 0;
//       const savedRoomNumbers = new Set<string>();
//       for (const row of jsonData) {
//         const room = filteredRooms.find(r => r.roomNumber === String(row.RoomNumber));
//         if (!room) { skippedCount++; continue; }
//         const prev   = Number(row.Previous   ?? 0);
//         const curr   = Number(row.Current    ?? 0);
//         const acPrev = Number(row.AcPrevious ?? 0);
//         const acCurr = Number(row.AcCurrent  ?? 0);
//         const rowRate = Number(row.EbRate);
//         const ebRate  = !isNaN(rowRate) && rowRate > 0 ? rowRate : getRateForRoom(room.id);
//         if (curr < prev) { toast.error(`Invalid reading for Room ${row.RoomNumber}`); skippedCount++; continue; }
//         if (!row.Current && row.Current !== 0) { skippedCount++; continue; }
//         // ROOM property: AC room == non-AC room, so AC readings are never saved.
//         const rowIsAc = !isRoomMode && room.hostelType === "AC";
//         // NOTE: for a flat with a shared meter, every row of that flat's
//         // rooms must carry the SAME Previous/Current.
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: rowIsAc ? acPrev : 0,
//           acCurrentReading:  rowIsAc ? acCurr : 0,
//           ebRate, isCheckout: false,
//         });
//         savedCount++;
//         savedRoomNumbers.add(room.roomNumber);
//       }
//       if (savedCount > 0) {
//         toast.success(
//           `${savedCount} reading${savedCount > 1 ? "s" : ""} saved` +
//           (skippedCount > 0 ? ` (${skippedCount} skipped)` : "") +
//           ` — sending WhatsApp bills...`
//         );
//         let sentCount = 0, failedRooms: string[] = [];
//         for (const roomNumber of savedRoomNumbers) {
//           try {
//             await sendEBBillWhatsApp(roomNumber);
//             sentCount++;
//           } catch (err: any) {
//             const msg = err?.response?.data?.error || err?.message || "";
//             failedRooms.push(msg.includes("Channel not found")
//               ? `${roomNumber} (not joined sandbox)` : roomNumber);
//           }
//         }
//         if (sentCount > 0) toast.success(`WhatsApp sent to ${sentCount} room${sentCount > 1 ? "s" : ""}`);
//         if (failedRooms.length > 0) toast.warning(`WhatsApp failed for: ${failedRooms.join(", ")}`);
//       } else {
//         toast.warning("No valid readings found in the file");
//       }
//       setUploadOpen(false);
//       e.target.value = "";
//       reload();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to process Excel");
//     }
//   };

//   /* ─── DELETE ────────────────────────────────────────────── */
//   const handleDelete = async (id: string, flatId?: number, roomId?: number) => {
//     try {
//       if (flatId) {
//         await deleteEBReadingsByFlat(flatId, selMonth, selYear);
//         toast.success("Flat readings deleted for selected month");
//       } else if (roomId) {
//         await deleteEBReadingsByRoom(roomId, selMonth, selYear);
//         toast.success("Room readings deleted for selected month");
//       } else {
//         await deleteEBReading(id);
//         toast.success("Reading deleted");
//       }
//       reload();
//     } catch {
//       toast.error("Failed to delete readings");
//     }
//   };

//   const handleDeleteReadingClick = (row: any) => {
//     // An informational row is deleted BY ID ONLY.
//     if (row.informational) {
//       askConfirm(
//         "Remove this checkout record?",
//         () => handleDelete(String(row.id)),
//         {
//           description:
//             "This only removes the record of the daily tenant's checkout. No bill is affected.",
//           confirmLabel: "Remove",
//           danger: true,
//         }
//       );
//       return;
//     }

//     const monthLabel = new Date(selYear, selMonth - 1, 1).toLocaleString("en-US", {
//       month: "long",
//       year: "numeric",
//     });

//     askConfirm(
//       "Delete this EB reading?",
//       () => {
//         handleDelete(
//           String(row.id),
//           row.flatId ? Number(row.flatId) : undefined,
//           row.roomId ? Number(row.roomId) : undefined
//         );
//       },
//       {
//         description: `This deletes the ${row.flatId ? "flat" : "room"}'s readings for ${monthLabel} only. This action cannot be undone.`,
//         confirmLabel: "Delete",
//         danger: true,
//       }
//     );
//   };

//   /* ─── WHATSAPP ──────────────────────────────────────────── */
//   const handleSendWhatsApp = async (roomId: string) => {
//     try {
//       const roomNumber = roomMap[roomId];
//       if (!roomNumber) { toast.error("Room not found"); return; }
//       try {
//         await sendEBBillWhatsApp(roomNumber);
//         toast.success("WhatsApp sent successfully");
//       } catch (backendError: any) {
//         const msg = backendError?.response?.data?.error || backendError.message || "";
//         toast.error(msg.includes("Channel not found")
//           ? "Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox."
//           : "Failed to send WhatsApp: " + msg);
//       }
//     } catch {
//       toast.error("Unexpected error while sending WhatsApp");
//     }
//   };

//   /* ─── DOWNLOAD EXCEL ────────────────────────────────────── */
//   const handleDownloadExcel = async () => {
//     try {
//       const latestReadings = await fetchAllPages<EBReading>(getEBReadings, PAGE_ALL);
//       // Export follows the page filters (Branch → Flat → Room), in
//       // natural ascending room-name order (G1, G2, G3 ...).
//       const exportRooms = filterRooms
//         .filter(r => selectedRoomId === "all" ? true : String(r.id) === String(selectedRoomId))
//         .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber));
//       const data = exportRooms.map(room => {
//         let lastReading: EBReading | undefined;
//         const roomReadings = latestReadings
//           .filter(r => r.roomId === room.id)
//           .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
//         if (roomReadings.length > 0) {
//           lastReading = roomReadings.reduce((max, r) =>
//             Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
//         } else if (room.flatId) {
//           const flatReadings = latestReadings
//             .filter(r => r.flatId === room.flatId)
//             .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
//           if (flatReadings.length > 0) {
//             lastReading = flatReadings.reduce((max, r) =>
//               Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
//           }
//         }
//         const lastRate = lastReading?.ebRate ?? (typeof manualRate === "number" ? manualRate : 13);

//         const base = {
//           RoomNumber: room.roomNumber,
//           Previous:   lastReading?.currentReading ?? 0,
//           Current:    "",
//         };

//         // ROOM property: AC room == non-AC room → no AcPrevious / AcCurrent columns.
//         if (isRoomMode) {
//           return { ...base, EbRate: lastRate };
//         }

//         // FLAT property: unchanged.
//         return {
//           ...base,
//           AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
//           AcCurrent:  room.hostelType === "AC" ? "" : "-",
//           EbRate:     lastRate,
//         };
//       });
//       const worksheet = XLSX.utils.json_to_sheet(data);
//       worksheet["!cols"] = isRoomMode
//         ? [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
//         : [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
//       XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
//       toast.success("Excel downloaded");
//     } catch {
//       toast.error("Failed to download Excel");
//     }
//   };

//   /* ─── FILTERED TENANT ROWS (sorted room-wise, ascending) ───────────── */
//   const filteredTenantRows = useMemo(() => {
//     let data = tenantRows;
//     if (selectedBranch !== "all") {
//       data = data.filter(row => {
//         const room = rooms.find(r => Number(r.id) === Number(row.roomId));
//         // Fall back to the row's own branch when its room could not be
//         // resolved, rather than silently dropping the tenant.
//         const unit = room?.unitId ?? row.branchId;
//         return unit != null ? Number(unit) === Number(selectedBranch) : true;
//       });
//     }
//     if (selectedFlatId !== "all") {
//       data = data.filter(row => {
//         const rowFlatId =
//           row.flatId ?? rooms.find(r => Number(r.id) === Number(row.roomId))?.flatId;
//         return rowFlatId != null && String(rowFlatId) === String(selectedFlatId);
//       });
//     }
//     if (selectedRoomId !== "all") {
//       data = data.filter(row => String(row.roomId) === String(selectedRoomId));
//     }

//     // ROOM-WISE ORDER: sort by room name ascending with natural numeric
//     // comparison (G1, G2, G3, G4 ... G10), then by tenant name so rows of
//     // the same room stay grouped and in a stable order.
//     const roomLabelOf = (row: any) =>
//       String(roomMap[String(row.roomId)] || row.roomNumber || "");

//     return [...data].sort((a, b) => {
//       const byRoom = naturalCompare(roomLabelOf(a), roomLabelOf(b));
//       if (byRoom !== 0) return byRoom;
//       return naturalCompare(a.tenantName ?? "", b.tenantName ?? "");
//     });
//   }, [tenantRows, selectedBranch, selectedFlatId, rooms, selectedRoomId, roomMap]);

//   /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
//   const selectedRoomObj = useMemo(
//     () => rooms.find(r => String(r.id) === String(formRoomId)),
//     [rooms, formRoomId]
//   );

//   /* ─── RESET DIALOG ──────────────────────────────────────── */
//   const resetAddDialog = () => {
//     setFormFlatId("all"); setFormRoomId("");
//     setFormBranchId("");
//     setFormPrevReading(""); setFormCurrReading("");
//     setFormAcPrev(""); setFormAcCurr("");
//     setFlatSharedPrev(""); setFlatSharedCurr(""); setFlatAcRows([]);
//     setManualMode(false);
//     setManualRate(13); setRoomManualRates({});
//   };

//   const openAddDialog = () => {
//     setFormBranchId(
//       role === "WARDEN" && branchId != null
//         ? String(branchId)
//         : selectedBranch !== "all" ? selectedBranch : ""
//     );
//     // Pre-fill the dialog's flat from the page-level Flat filter.
//     if (selectedFlatId !== "all") setFormFlatId(selectedFlatId);
//     setAddOpen(true);
//   };

//   /* ─── PAGE-LEVEL FILTER HANDLERS (cascading) ──────────────────────── */
//   const handleBranchFilterChange = (val: string) => {
//     setSelectedBranch(val);
//     setSelectedFlatId("all");
//     setSelectedRoomId("all");
//   };

//   const handleFlatFilterChange = (val: string) => {
//     setSelectedFlatId(val);
//     setSelectedRoomId("all");
//   };

//   /* ─── Pagination ─── */
//   const [currentPage, setCurrentPage] = useState(0);
//   const pageSize = 10;
//   const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

//   const totalPages = Math.max(1, Math.ceil(filteredTenantRows.length / pageSize));

//   // Go back to page 1 whenever the filters change, and never sit on a
//   // page that no longer exists.
//   useEffect(() => {
//     setCurrentPage(0);
//   }, [selectedBranch, selectedFlatId, selectedRoomId, selMonth, selYear]);

//   useEffect(() => {
//     if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
//   }, [currentPage, totalPages]);

//   const getPageNumbers = (current: number, total: number): (number | "...")[] => {
//     if (total <= 7) {
//       return Array.from({ length: total }, (_, i) => i + 1);
//     }
//     const pages: (number | "...")[] = [1];
//     if (current > 3) pages.push("...");
//     const start = Math.max(2, current - 1);
//     const end = Math.min(total - 1, current + 1);
//     for (let i = start; i <= end; i++) pages.push(i);
//     if (current < total - 2) pages.push("...");
//     pages.push(total);
//     return pages;
//   };

//   const pageNumbers = useMemo(
//     () => getPageNumbers(currentPage + 1, totalPages),
//     [currentPage, totalPages]
//   );

//   /* ══════════════════════════════════════════════════════════
//      RENDER
//   ══════════════════════════════════════════════════════════ */
//   if (propertyTypeLoading) {
//     return (
//       <div role="status" className="flex items-center justify-center py-24 text-sm text-slate-500">
//         Loading…
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-full w-full min-w-0 bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

//         .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
//         @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

//         .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
//         .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #f1f5f9; }
//         .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

//         .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
//         .eb-table th { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .eb-table tr:hover { background: #fdfcff; }

//         .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-tenant-name { font-size: 12px; color: #475569; margin-top: 2px; }
//         .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-empty { color: #475569; }

//         /* ── Searchable room filter dropdown (position:fixed menu) ── */
//         .eb-room-dd { position: relative; }
//         .eb-room-trigger {
//           display: flex; align-items: center; justify-content: space-between; gap: 8px;
//           width: 100%; height: 36px; padding: 0 12px;
//           border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
//           font-size: 14px; color: #0f172a; cursor: pointer; text-align: left;
//         }
//         .eb-room-trigger:focus-visible { outline: none; border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); }
//         .eb-room-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
//         .eb-room-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
//         .eb-room-chevron.open { transform: rotate(180deg); }
//         .eb-room-menu {
//           position: fixed; z-index: 60;
//           background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
//           box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
//         }
//         .eb-room-search {
//           display: flex; align-items: center; gap: 8px;
//           border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
//           margin-bottom: 6px; background: #fafafa;
//         }
//         .eb-room-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
//         .eb-room-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; }
//         .eb-room-search input::placeholder { color: #64748b; }
//         .eb-room-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
//         .eb-room-search-clear:hover { background: #e2e8f0; }
//         .eb-room-list { max-height: 260px; overflow-y: auto; }
//         .eb-room-item {
//           display: flex; align-items: center; gap: 8px; width: 100%;
//           padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
//           font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
//         }
//         .eb-room-item.active { background: #f8fafc; }
//         .eb-room-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
//         .eb-room-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
//         .eb-room-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

//         /* ── Searchable select (Room / Flat inside the Add EB Reading dialog) ── */
//         .eb-ss { position: relative; width: 100%; }
//         .eb-ss-trigger {
//           display: flex; align-items: center; gap: 8px;
//           width: 100%; height: 36px; padding: 0 12px;
//           border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
//           font-size: 14px; color: #0f172a; cursor: pointer; text-align: left;
//           transition: border-color 0.15s, box-shadow 0.15s;
//         }
//         .eb-ss-trigger:hover:not(:disabled) { border-color: #cbd5e1; }
//         .eb-ss-trigger:focus-visible,
//         .eb-ss-trigger[aria-expanded="true"] { outline: none; border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); }
//         .eb-ss-trigger:disabled { cursor: not-allowed; opacity: 0.55; background: #f8fafc; }
//         .eb-ss-trigger-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
//         .eb-ss-trigger-label.placeholder { color: #64748b; font-weight: 400; }
//         .eb-ss-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
//         .eb-ss-chevron.open { transform: rotate(180deg); }
//         .eb-ss-badge {
//           flex-shrink: 0; padding: 1px 7px; border-radius: 999px;
//           font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
//           color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd;
//         }
//         .eb-ss-menu {
//           position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 50;
//           background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
//           box-shadow: 0 12px 28px rgba(15,23,42,0.14); padding: 8px;
//         }
//         .eb-ss-menu.up { top: auto; bottom: calc(100% + 4px); }
//         .eb-ss-search {
//           display: flex; align-items: center; gap: 8px;
//           border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
//           margin-bottom: 6px; background: #fafafa;
//         }
//         .eb-ss-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
//         .eb-ss-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; color: #0f172a; }
//         .eb-ss-search input::placeholder { color: #64748b; }
//         .eb-ss-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
//         .eb-ss-search-clear:hover { background: #e2e8f0; }
//         .eb-ss-list { max-height: 224px; overflow-y: auto; overscroll-behavior: contain; padding-right: 2px; }
//         .eb-ss-item {
//           display: flex; align-items: center; gap: 8px; width: 100%;
//           padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
//           font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
//         }
//         .eb-ss-item.active { background: #f8fafc; }
//         .eb-ss-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
//         .eb-ss-item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
//         .eb-ss-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
//         .eb-ss-empty { padding: 14px 10px; font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.4; }
//         .eb-ss-footer { margin-top: 6px; padding: 6px 10px 0; border-top: 1px solid #f1f5f9; font-size: 11px; color: #64748b; }

//         .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
//         .eb-status.collected { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .eb-status.pending { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
//         .eb-status.not-read { color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; }
//         .eb-status.prepaid { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
//         .eb-status.due { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
//         .eb-status.refund { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .eb-status.settled { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
//         .eb-status.pay { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }

//         .eb-row-informational td { background: #fcfdff; }
//         .eb-daily-tag { display: inline-flex; align-items: center; margin-left: 6px; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; letter-spacing: 0.3px; }

//         .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
//         .eb-action-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
//         .eb-action-btn svg {
//           display: inline-block !important;
//           visibility: visible !important;
//           opacity: 1 !important;
//           width: 14px !important;
//           height: 14px !important;
//           min-width: 14px !important;
//           min-height: 14px !important;
//           stroke: #475569 !important;
//           color: #475569 !important;
//           flex-shrink: 0 !important;
//           pointer-events: none;
//         }
//         .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #64748b !important; color: #64748b !important; }

//         .eb-chart-container { padding: 20px; }

//         .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
//         .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
//         .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }

//         .eb-dlg-head { display: flex; align-items: center; gap: 12px; padding-right: 36px; margin-bottom: 18px; }
//         .eb-dlg-icon { width: 40px; height: 40px; border-radius: 12px; background: #f1ebff; color: #5200FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
//         .eb-dlg-title { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2; }
//         .eb-dlg-sub { font-size: 12.5px; color: #64748b; margin-top: 2px; }
//         .eb-dlg-section { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #fff; }
//         .eb-dlg-section + .eb-dlg-section { margin-top: 14px; }
//         .eb-dlg-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
//         .eb-dlg-step { width: 20px; height: 20px; border-radius: 999px; background: #5200FF; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
//         .eb-dlg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
//         .eb-dlg-meter { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fafafa; }
//         .eb-dlg-meter + .eb-dlg-meter { margin-top: 12px; }
//         .eb-dlg-empty { border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; font-size: 13px; color: #64748b; background: #f8fafc; }
//         .eb-dlg-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f1f5f9; gap: 2px; }
//         .eb-dlg-seg button { border: 0; background: transparent; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; }
//         .eb-dlg-seg button[aria-pressed="true"] { background: #fff; color: #5200FF; box-shadow: 0 1px 2px rgba(15,23,42,.12); }
//         @media (max-width: 520px) { .eb-dlg-grid-2 { grid-template-columns: 1fr; } }

//         /* MOBILE SCROLL FIX (Add EB Reading dialog): the dialog body is the
//            ONLY scroll container; dvh tracks the real visible height. */
//         .eb-add-mobile-dialog {
//           max-height: 90vh;
//           max-height: 90dvh;
//           overflow: hidden;
//         }
//         .eb-add-mobile-scroll {
//           max-height: 90vh;
//           max-height: 90dvh;
//           overflow-y: auto;
//           overflow-x: hidden;
//           -webkit-overflow-scrolling: touch;
//           overscroll-behavior: contain;
//           touch-action: pan-y;
//           padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
//         }
//         .eb-dlg-meter-stack { display: block; }

//         .eb-wrap, .eb-layout, .eb-content, .eb-panel { min-width: 0; }
//         .eb-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
//         .eb-table-scroll:focus-visible { outline: 2px solid #5200FF; outline-offset: -2px; }
//         @media (max-width: 767px) {
//           .eb-wrap { width: 100%; max-width: 100%; padding: 12px 10px 24px; }
//           .eb-layout { gap: 12px; }
//           .eb-layout > div, .eb-content, .eb-sidebar { width: 100%; min-width: 0; max-width: 100%; }
//           .eb-panel { width: 100%; max-width: 100%; border-radius: 12px; margin-bottom: 12px; }
//           .eb-panel-header { padding: 14px 12px; align-items: stretch; gap: 12px; }
//           .eb-panel-title { font-size: 16px; }
//           .eb-panel-header > div { display: flex; flex-wrap: wrap; width: 100%; gap: 8px; }
//           .eb-panel-header > div > button,
//           .eb-panel-header > div > [data-state] { min-width: 0; }
//           .eb-panel-header button { font-size: 12px; }
//           .eb-filters { display: grid !important; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px !important; padding: 12px !important; align-items: stretch; }
//           .eb-filters > div { width: 100% !important; min-width: 0 !important; max-width: 100%; }
//           .eb-filters > div.hidden { display: none !important; }
//           .eb-filters [role="combobox"] { width: 100%; min-width: 0; font-size: 12px; padding-left: 8px; padding-right: 8px; }
//           .eb-room-trigger { font-size: 12px; padding: 0 8px; }
//           .eb-filters > button { justify-self: start; min-height: 36px; }
//           .eb-table { min-width: 900px; }
//           .eb-table th, .eb-table td { padding: 12px 14px; }
//           .eb-mobile-pagination { padding: 12px !important; gap: 10px; flex-wrap: wrap; }
//           .eb-mobile-pagination > div { min-width: 0; }
//           .eb-mobile-pagination nav { margin-left: auto; }
//           .eb-add-mobile-dialog { width: calc(100vw - 20px) !important; max-width: 560px !important; }
//           .eb-dlg-section { padding: 12px; }
//           .eb-dlg-meter { padding: 12px; }
//           .eb-dlg-grid-2 { grid-template-columns: 1fr; gap: 12px; }
//         }
//         @media (max-width: 359px) {
//           .eb-wrap { padding: 8px 6px 18px; }
//           .eb-filters { gap: 7px !important; padding: 8px !important; }
//           .eb-panel-header { padding: 12px 9px; }
//         }

//       `}</style>

//       <div className="eb-wrap">
//         <div className="eb-layout">
//           <div>
//             <div className="eb-panel">
//               <div className="eb-panel-header">
//                 <h1 className="eb-panel-title">EB Readings List</h1>
//                 <div className="flex gap-2">
//                   <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
//                     <Download size={14} className="mr-2" aria-hidden="true" /> Export
//                   </Button>
//                   {hasAccess && (
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
//                           <Plus size={14} className="mr-2" aria-hidden="true" /> Add EB Reading
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="end">
//                         <DropdownMenuItem onClick={openAddDialog}>{isFlatMode ? "Single Flat Reading" : "Single Room Reading"}</DropdownMenuItem>
//                         <DropdownMenuItem onClick={() => setUploadOpen(true)}>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   )}
//                 </div>
//               </div>

//               {/* Filters: Branch → Flat → Room → Month */}
//               <div className="eb-filters flex flex-wrap items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
//                   <Select value={selectedBranch} onValueChange={handleBranchFilterChange} disabled={!hasAccess || !canPickBranch}>
//                     <SelectTrigger aria-label="Filter by branch" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="All Branches" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Branches</SelectItem>
//                       {branches.map(b => (
//                         <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Flat filter — hidden only for Room-based hostels. */}
//                 <div className={`${isRoomMode ? "hidden" : "flex"} bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]`}>
//                   <Select value={selectedFlatId} onValueChange={handleFlatFilterChange}>
//                     <SelectTrigger aria-label="Filter by flat" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="All Flats" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Flats</SelectItem>
//                       {[...filterFlats]
//                         .sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber))
//                         .map(f => (
//                           <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                         ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Room filter (with search) */}
//                 <RoomFilterDropdown
//                   value={selectedRoomId}
//                   onChange={setSelectedRoomId}
//                   options={filterRooms}
//                 />

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
//                   <Select
//                     value={`${selYear}-${selMonth}`}
//                     onValueChange={val => {
//                       const [y, m] = val.split("-").map(Number);
//                       setSelYear(y);
//                       setSelMonth(m);
//                     }}
//                   >
//                     <SelectTrigger aria-label="Filter by month and year" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="Select month" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {monthYearOptions.map(opt => (
//                         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <button
//                   type="button"
//                   className="flex items-center gap-1.5 text-sm text-[#475569] font-medium hover:text-[#0f172a]"
//                   onClick={() => {
//                     setSelectedBranch(defaultBranch);
//                     setSelectedFlatId("all");
//                     setSelectedRoomId("all");
//                     setSelMonth(now.getMonth() + 1);
//                     setSelYear(now.getFullYear());
//                   }}
//                 >
//                   <RefreshCw size={14} aria-hidden="true" /> Clear
//                 </button>
//               </div>

//               <div className="eb-table-scroll overflow-x-auto" role="region" aria-label="Scrollable EB readings table" tabIndex={0}>
//                 <table className="eb-table">
//                   <caption className="sr-only">EB readings for the selected month</caption>
//                   <thead>
//                     <tr>
//                       <th scope="col">ROOM / BED</th>
//                       <th scope="col">PREV READING</th>
//                       <th scope="col">CURR READING</th>
//                       <th scope="col">UNITS</th>
//                       <th scope="col">AMOUNT (₹)</th>
//                       <th scope="col">STATUS</th>
//                       <th scope="col">ACTIONS</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginatedRows.length === 0 ? (
//                       <tr>
//                         <td colSpan={7} className="text-center py-12 eb-empty">
//                           {billsLoading ? "Loading EB bills…" : "No EB readings found."}
//                         </td>
//                       </tr>
//                     ) : (
//                       paginatedRows.map((row, i) => {
//                         // Prefer the room the row resolved to; fall back to
//                         // the bill's own room number instead of "Unknown".
//                         const rName = roomMap[row.roomId] || row.roomNumber || "Unknown";
//                         const tenantName = row.tenantName || "Unassigned";
//                         const prev = Number(row.previousReading ?? 0);
//                         const curr = Number(row.currentReading ?? 0);
//                         const informational = row.informational === true;

//                         const units = informational
//                           ? Math.round(Number(row.unitsConsumed ?? 0))
//                           : row.unitsConsumed != null
//                             ? Math.round(Number(row.unitsConsumed))
//                             : Math.round(curr - prev);

//                         const amount = Math.round(Number(row.tenantAmount ?? 0));

//                         // netAmount = grossAmount (units * rate) - advancePaid
//                         //   > 0  → "Pay"   < 0 → "Refund"   = 0 → "Settled"
//                         const netAmount = Number(row.netAmount ?? 0);
//                         const status = informational
//                           ? (netAmount > 0 ? "Pay" : netAmount < 0 ? "Refund" : "Settled")
//                           : (row.tenantAmount ? "Pending" : "Not Read");

//                         return (
//                           <tr
//                             key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${row.tenantId ?? "no-tenant"}-${i}`}
//                             className={informational ? "eb-row-informational" : undefined}
//                           >
//                             <td>
//                               <div className="eb-room-name">
//                                 {rName}
//                                 {informational && <span className="eb-daily-tag">DAILY</span>}
//                               </div>
//                               <div className="eb-tenant-name">
//                                 {tenantName}
//                                 {(informational || row.checkedOut) && " — checked out"}
//                                 {row.movedTo && ` — moved to ${row.movedTo}`}
//                               </div>
//                             </td>
//                             <td><span className="eb-reading-val">{prev}</span></td>
//                             <td><span className="eb-reading-val">{curr || "—"}</span></td>
//                             <td>
//                               <span className="eb-reading-val">{units || "—"}</span>
//                               {row.carriedAmount > 0 && (
//                                 <div className="eb-tenant-name" style={{ marginTop: 2 }}>
//                                   incl. {row.carriedLabel}: {Math.round(row.carriedUnits)}u · ₹{new Intl.NumberFormat("en-IN").format(Math.round(row.carriedAmount))}
//                                 </div>
//                               )}
//                             </td>
//                             <td>
//                               <span className="eb-amount">
//                                 {informational
//                                   ? (netAmount !== 0
//                                       ? `₹${new Intl.NumberFormat('en-IN').format(Math.abs(Math.round(netAmount)))}`
//                                       : "₹0")
//                                   : amount
//                                     ? `₹${new Intl.NumberFormat('en-IN').format(amount)}`
//                                     : "—"}
//                               </span>
//                               {informational && (
//                                 <div className="eb-tenant-name" style={{ marginTop: 2 }}>
//                                   {units}u @ ₹{Math.round(Number(row.tenantAmount ?? 0) / (units || 1))} · Advance ₹{row.advancePaid}
//                                 </div>
//                               )}
//                             </td>
//                             <td>
//                               <div className={`eb-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>
//                                 {informational
//                                   ? (status === "Pay" ? "Pay" : status === "Refund" ? "Refund" : "Settled")
//                                   : status}
//                               </div>
//                             </td>
//                             <td>
//                               <div className="flex gap-2">
//                                 {/* No bill to send for a settled daily stay. */}
//                                 {!informational && (
//                                   <button
//                                     type="button"
//                                     className="eb-action-btn"
//                                     onClick={() => handleSendWhatsApp(row.roomId)}
//                                     title="Send Bill"
//                                     aria-label={`Send bill for room ${rName} on WhatsApp`}
//                                   >
//                                     <Send size={14} aria-hidden="true" />
//                                   </button>
//                                 )}
//                                 {hasAccess && (
//                                   <button
//                                     type="button"
//                                     className="eb-action-btn"
//                                     onClick={() => handleDeleteReadingClick(row)}
//                                     title={informational ? "Remove record" : "Delete"}
//                                     aria-label={
//                                       informational
//                                         ? `Remove checkout record for room ${rName}`
//                                         : `Delete EB reading for room ${rName}`
//                                     }
//                                   >
//                                     <Trash2 size={14} aria-hidden="true" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="eb-mobile-pagination flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
//                 <div className="text-[13px] text-[#475569]" aria-live="polite">
//                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
//                   {billsLoading && " · loading…"}
//                 </div>
//                 <nav aria-label="Pagination" className="flex gap-2 eb-pagination-row">
//                   <button
//                     type="button"
//                     className="eb-action-btn w-8"
//                     aria-label="Previous page"
//                     disabled={currentPage === 0}
//                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
//                   >
//                     <ChevronLeft size={14} aria-hidden="true" />
//                   </button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis" aria-hidden="true">
//                         <MoreHorizontal size={14} />
//                       </span>
//                     ) : (
//                       <button
//                         type="button"
//                         key={p}
//                         className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
//                         aria-label={`Page ${p}`}
//                         aria-current={p === currentPage + 1 ? "page" : undefined}
//                         onClick={() => setCurrentPage(p - 1)}
//                       >
//                         {p}
//                       </button>
//                     )
//                   )}

//                   <button
//                     type="button"
//                     className="eb-action-btn w-8"
//                     aria-label="Next page"
//                     disabled={currentPage + 1 >= totalPages}
//                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
//                   >
//                     <ChevronRight size={14} aria-hidden="true" />
//                   </button>
//                 </nav>
//               </div>
//             </div>
//           </div>
//         </div>

//         {hasAccess && (
//           <>

//             <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
//               <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="eb-add-mobile-dialog sm:max-w-[760px] rounded-2xl p-0 [&>button]:hidden">
//                 <div className="eb-add-mobile-scroll relative p-6">
//                   <DialogClose asChild>
//                     <button
//                       type="button"
//                       aria-label="Close"
//                       className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//                     >
//                       <X className="h-4 w-4 shrink-0" aria-hidden="true" />
//                     </button>
//                   </DialogClose>

//                   <DialogHeader className="space-y-0">
//                     <div className="eb-dlg-head">
//                       <div className="eb-dlg-icon"><Zap className="h-5 w-5" aria-hidden="true" /></div>
//                       <div>
//                         <DialogTitle className="eb-dlg-title">Add EB Reading</DialogTitle>
//                         <DialogDescription className="eb-dlg-sub">
//                           {isFlatMode
//                             ? "Enter the shared meter reading for a flat."
//                             : isRoomMode
//                               ? "Enter the meter reading for a room."
//                               : "Enter the electricity meter readings for this month."}
//                         </DialogDescription>
//                       </div>
//                     </div>
//                   </DialogHeader>

//                   <div>
//                     {/* Section 1 — Branch + Flat side by side (Room-based hostel: Branch only) */}
//                     <div className="eb-dlg-section">
//                       <div className="eb-dlg-section-title"><span className="eb-dlg-step">1</span>{isRoomMode ? "Branch" : "Branch & Flat"}</div>
//                     <div className={isRoomMode ? "grid grid-cols-1 gap-4" : "eb-dlg-grid-2"}>
//                       <div className="space-y-1.5">
//                         <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
//                         {canPickBranch ? (
//                           <Select
//                             value={formBranchId}
//                             onValueChange={val => {
//                               setFormBranchId(val);
//                               setFormFlatId("all");
//                               setFormRoomId("");
//                             }}
//                           >
//                             <SelectTrigger aria-label="Branch" className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
//                             <SelectContent>
//                               {branches.map(b => (
//                                 <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         ) : (
//                           <div className="flex items-center px-3 py-2 rounded-lg border bg-muted text-sm font-medium text-muted-foreground h-9">
//                             <span className="text-foreground font-semibold">
//                               {branches.find(b => Number(b.id) === Number(formBranchId))?.unitName ?? "Unit"}
//                             </span>
//                           </div>
//                         )}
//                       </div>

//                       <div className={isRoomMode ? "hidden" : "space-y-1.5"}>
//                         <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
//                         <SearchableSelect
//                           ariaLabel="Flat"
//                           noun="flat"
//                           value={formFlatId === "all" ? "" : formFlatId}
//                           onChange={val => setFormFlatId(val || "all")}
//                           options={dialogFlatOptions}
//                           disabled={canPickBranch && !formBranchId}
//                           placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"}
//                           searchPlaceholder="Search flat..."
//                           emptyText={dialogFlats.length === 0 ? "No flat available" : "No flat found"}
//                         />
//                       </div>
//                     </div>
//                     </div>

//                     <div className="eb-dlg-section">
//                       <div className="eb-dlg-section-title"><span className="eb-dlg-step">2</span>Meter reading</div>
//                     {(formFlatId && formFlatId !== "all") ? (
//                       <div className="eb-dlg-meter-stack">
//                         {/* ── SHARED FLAT METER ── */}
//                         <div className="eb-dlg-meter">
//                           <div className="eb-flat-room-title">
//                             Shared Flat Meter
//                             {roomsInFormFlat.length > 0 && (
//                               <span className="font-normal text-muted-foreground">
//                                 {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
//                               </span>
//                             )}
//                           </div>
//                           <div className="eb-dlg-grid-2">
//                             <div className="space-y-1.5">
//                               <Label htmlFor="eb-flat-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
//                               <Input id="eb-flat-prev" className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label htmlFor="eb-flat-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
//                               <Input
//                                 id="eb-flat-curr"
//                                 className="rounded-lg bg-white"
//                                 inputMode="decimal"
//                                 placeholder="Enter current reading"
//                                 value={flatSharedCurr}
//                                 onChange={e => setFlatSharedCurr(e.target.value)}
//                               />
//                             </div>
//                           </div>
//                           <p className="text-[11px] text-muted-foreground mt-2">
//                             This flat has one shared EB meter, so this reading is saved for every room in the flat.
//                           </p>
//                         </div>

//                         {/* AC units stay per-room even inside a shared-meter flat. */}
//                         {[...flatAcRows]
//                           .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber))
//                           .map(row => (
//                           <div key={row.roomId} className="eb-dlg-meter">
//                             <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
//                             <div className="eb-dlg-grid-2">
//                               <div className="space-y-1.5">
//                                 <Label htmlFor={`eb-ac-prev-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                 <Input id={`eb-ac-prev-${row.roomId}`} className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label htmlFor={`eb-ac-curr-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                 <Input
//                                   id={`eb-ac-curr-${row.roomId}`}
//                                   className="rounded-lg bg-white"
//                                   inputMode="decimal"
//                                   placeholder="Enter AC current reading"
//                                   value={row.acCurrentReading}
//                                   onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
//                                 />
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : isFlatMode ? (
//                       <div className="eb-dlg-empty">Select a flat above to enter its shared meter reading.</div>
//                     ) : (
//                       <>
//                         <div className="space-y-1.5">
//                           <Label className="text-xs font-medium text-muted-foreground">Room</Label>
//                           <SearchableSelect
//                             ariaLabel="Room"
//                             noun="room"
//                             value={formRoomId}
//                             onChange={setFormRoomId}
//                             options={dialogRoomOptions}
//                             disabled={canPickBranch && !formBranchId}
//                             placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"}
//                             searchPlaceholder="Search room..."
//                             emptyText={
//                               dialogStandaloneRooms.length === 0
//                                 ? "No standalone rooms in this branch — select a flat above instead"
//                                 : "No room found"
//                             }
//                           />
//                         </div>

//                         <div className="eb-dlg-grid-2" style={{ marginTop: 14 }}>
//                           <div className="space-y-1.5">
//                             <Label htmlFor="eb-room-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
//                             <Input
//                               id="eb-room-prev"
//                               className="rounded-lg"
//                               placeholder="Previous"
//                               value={formPrevReading}
//                               readOnly
//                             />
//                           </div>
//                           <div className="space-y-1.5">
//                             <Label htmlFor="eb-room-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
//                             <Input id="eb-room-curr" className="rounded-lg" inputMode="decimal" placeholder="Current" value={formCurrReading}
//                               onChange={e => setFormCurrReading(e.target.value)} />
//                           </div>
//                         </div>

//                         {/* ROOM property: AC room == non-AC room → AC Previous / AC Current are hidden. */}
//                         {!isRoomMode && selectedRoomObj?.hostelType === "AC" && (
//                           <div className="eb-dlg-grid-2" style={{ marginTop: 14 }}>
//                             <div className="space-y-1.5">
//                               <Label htmlFor="eb-room-ac-prev" className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                               <Input id="eb-room-ac-prev" className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label htmlFor="eb-room-ac-curr" className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                               <Input id="eb-room-ac-curr" className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
//                                 onChange={e => setFormAcCurr(e.target.value)} />
//                             </div>
//                           </div>
//                         )}
//                       </>
//                     )}

//                     </div>

//                     <div className="eb-dlg-section">
//                       <div className="eb-dlg-section-title"><span className="eb-dlg-step">3</span>Unit rate</div>
//                       <div className="eb-dlg-seg" role="group" aria-label="Rate mode">
//                         <button type="button" aria-pressed={!manualMode} onClick={() => setManualMode(false)}>Automatic</button>
//                         <button type="button" aria-pressed={manualMode} onClick={() => setManualMode(true)}>Manual</button>
//                       </div>
//                     {manualMode && (
//                       <div className="space-y-2 mt-3">
//                         <Label htmlFor="eb-unit-rate" className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
//                         {(!formFlatId || formFlatId === "all") ? (
//                           <Input id="eb-unit-rate" className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         ) : (
//                           // One meter, one rate — applies to the whole flat.
//                           <Input id="eb-unit-rate" className="rounded-lg" type="number" value={manualRate}
//                             onChange={e => setManualRate(Number(e.target.value))}
//                             placeholder="Enter unit rate for this flat's shared meter" />
//                         )}
//                       </div>
//                     )}
//                     </div>
//                   </div>

//                   <DialogFooter className="mt-4">
//                     <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
//                     <Button className="rounded-lg bg-[#5200FF] text-white hover:bg-[#4200cc]" onClick={handleAdd} disabled={isSaving}>
//                       {isSaving ? "Saving..." : "Save Reading"}
//                     </Button>
//                   </DialogFooter>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </>
//         )}
//       </div>

//       {/* ── Bill Dialog */}
//       <Dialog open={billOpen} onOpenChange={setBillOpen}>
//         <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <X className="h-4 w-4 shrink-0" aria-hidden="true" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>EB Bill - Room {billRoom}</DialogTitle>
//               <DialogDescription>Tenant wise electricity bill</DialogDescription>
//             </DialogHeader>
//             <div className="space-y-3 max-h-[400px] overflow-y-auto">
//               {tenantBills.length === 0 && (
//                 <p className="text-sm text-muted-foreground">No tenant bill found</p>
//               )}
//               {tenantBills.map((bill, i) => (
//                 <div key={i} className="flex justify-between border p-3 rounded-lg">
//                   <div>
//                     <p className="font-medium">{bill.tenantName || bill.name}</p>
//                     <p className="text-sm text-muted-foreground">{bill.acUser ? "AC User" : "Non-AC User"}</p>
//                   </div>
//                   <div className="font-semibold">₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}</div>
//                 </div>
//               ))}
//             </div>
//             <DialogFooter>
//               <DialogClose asChild><Button variant="outline" className="rounded-lg">Close</Button></DialogClose>
//             </DialogFooter>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* ── Upload Dialog */}
//       <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
//         <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <X className="h-4 w-4 shrink-0" aria-hidden="true" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DialogTitle>
//               <DialogDescription>
//                 {isFlatMode
//                   ? "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns. Every room of the same flat must carry the same Previous/Current (shared flat meter)."
//                   : isRoomMode
//                     ? "Upload an Excel file with RoomNumber, Previous, Current, EbRate columns."
//                     : "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns."}
//               </DialogDescription>
//             </DialogHeader>
//             <Input className="rounded-lg" type="file" accept=".xlsx, .xls" aria-label="Upload EB readings Excel file" onChange={handleFileUpload} />
//             <DialogFooter>
//               <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
//             </DialogFooter>
//           </div>
//         </DialogContent>
//       </Dialog>

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
//               variant={confirmState?.danger ? "destructive" : "default"}
//               className={confirmState?.danger ? "rounded-lg bg-red-600 hover:bg-red-700 text-white" : "rounded-lg"}
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

// export default EBReadingsPage;






















































































































































import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  getRooms,
  getEBReadings,
  addEBReading,
  deleteEBReading,
  getTenantWiseEBBill,
  sendEBBillWhatsApp,
  getUserRole,
  getTenants,
  getBranchId,
  getBranches,
  getFlats,
  getRents,
  deleteEBReadingsByFlat,
  deleteEBReadingsByRoom,
  fetchAllPages,
} from "@/lib/store";

import { Room, EBReading, Tenant, Branch, Flat, Rent } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import * as XLSX from "xlsx";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, ChevronDown, Check, Search, X, MoreHorizontal, Zap } from "lucide-react";
import { usePropertyType } from "@/lib/propertyType";

const isMonthlyTenant = (t: any) => (t?.tenantStay ?? "MONTHLY") !== "DAILY";

// ── PERFORMANCE ───────────────────────────────────────────────────────
// Larger pages = far fewer round-trips. Make sure /rooms, /tenants,   /flats,
// /units and /eb-readings accept size=200 (if any caps lower, lower this).
const PAGE_ALL = 10;
// How many tenant-wise bill requests may be in flight at once.
const BILL_CONCURRENCY = 6;
// Rooms (or flats) shown per page. Bill requests are made ONLY for the
// units on the current page (G1..G10, then G11..G20, ...).
const UNITS_PER_PAGE = 10;

// Runs `worker` over `items` with at most `limit` running at the same time.
const runPool = async <T,>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) => {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(runners);
};

// Natural (numeric-aware) compare so room names sort G1, G2, G3 ... G10
// instead of G1, G10, G2.
const naturalCompare = (a: any, b: any) =>
  String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

// An "informational" row is a DAILY-stay tenant's checkout record: it is
// shown as-is (settled units/amount vs advance) and never goes through the
// bill endpoint.
//
// A MONTHLY tenant's checkout row is a normal billing row; his bill comes
// from the flat/room bill like everybody else's. The tenant record is the
// authority for the stay type, the reading's own tenantStay is the fallback.
const isInformationalReading = (reading: any, tenant?: any) => {
  if (reading?.tenantId == null || reading?.isCheckout !== true) return false;
  const stay = tenant?.tenantStay ?? reading?.tenantStay ?? "MONTHLY";
  return stay === "DAILY";
};

// VACANCY FIX: if nobody was living on this meter at the last saved
// reading (the room was vacant), the next billing "Previous" is the
// earliest join reading above it.
// Example: last reading 200, room empty, tenant joins at 210 -> Previous = 210.
// The 200 -> 210 units were used while vacant and belong to the owner.
const bumpPastVacancy = (base: number, meterTenants: any[]): number => {
  const activeAtBase = meterTenants.some(t => {
    const join = Number(t.joinReading ?? 0);
    if (!Number.isFinite(join) || join > base) return false;
    if (t.status === "Checked_Out") {
      const co = Number(t.checkoutReading);
      return Number.isFinite(co) && co > base;
    }
    return true;
  });
  if (activeAtBase) return base;

  const laterJoins = meterTenants
    .map(t => Number(t.joinReading))
    .filter(v => Number.isFinite(v) && v > base);

  return laterJoins.length > 0 ? Math.min(...laterJoins) : base;
};

// One page-unit: a standalone room, a flat (shared meter), or a DAILY
// tenant's checkout record. Pagination works on these, sorted naturally.
type BillUnit = {
  key: string;
  kind: "info" | "flat" | "room";
  sortKey: string;
  r: EBReading;
};

/* ══════════════════════════════════════════════════════════════════
   SEARCHABLE SELECT (used for Room / Flat inside the Add EB Reading dialog)
   - compact panel, exactly as wide as its trigger
   - search box pinned at the top, list scrolls (max 224px)
   - keyboard: ↑ / ↓ move, Enter picks, Esc closes ONLY the menu
   - menu is position:absolute (NOT fixed) because Radix Dialog content
     uses a CSS transform
   ══════════════════════════════════════════════════════════════════ */
type SearchableOption = { value: string; label: string; hint?: string };

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  ariaLabel,
  disabled = false,
  emptyText = "No results found",
  noun = "result",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  emptyText?: string;
  noun?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = term.trim().toLowerCase();

  const filtered = useMemo(
    () => (trimmed
      ? options.filter(o => o.label.toLowerCase().includes(trimmed))
      : options),
    [options, trimmed]
  );

  const selected = options.find(o => o.value === value);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setTerm("");
    setActiveIdx(0);
  }, []);

  const openMenu = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 320 && rect.top > spaceBelow);
    }
    const idx = options.findIndex(o => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const pick = (v: string) => {
    onChange(v);
    closeMenu();
    triggerRef.current?.focus();
  };

  // Close on outside click / tap
  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [open, closeMenu]);

  // Esc should close only this menu, not the surrounding Dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
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

  // Keep the highlight valid when the filtered list shrinks
  useEffect(() => {
    setActiveIdx(i => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) pick(item.value);
    }
  };

  return (
    <div className="eb-ss" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="eb-ss-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <span className={`eb-ss-trigger-label ${selected ? "" : "placeholder"}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && <span className="eb-ss-badge">{selected.hint}</span>}
        <ChevronDown size={16} aria-hidden="true" className={`eb-ss-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className={`eb-ss-menu ${dropUp ? "up" : ""}`}>
          <div className="eb-ss-search">
            <Search size={14} color="#64748b" className="shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={term}
              onChange={e => { setTerm(e.target.value); setActiveIdx(0); }}
              onKeyDown={handleKeyDown}
            />
            {term && (
              <button
                type="button"
                className="eb-ss-search-clear"
                aria-label="Clear search"
                onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="eb-ss-list" role="listbox" aria-label={ariaLabel} ref={listRef}>
            {filtered.map((item, idx) => {
              const isSelected = item.value === value;
              return (
                <button
                  type="button"
                  key={item.value}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  className={`eb-ss-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => pick(item.value)}
                >
                  <span className="eb-ss-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
                  <span className="eb-ss-item-label">{item.label}</span>
                  {item.hint && <span className="eb-ss-badge">{item.hint}</span>}
                </button>
              );
            })}
            {filtered.length === 0 && <div className="eb-ss-empty">{emptyText}</div>}
          </div>

          {filtered.length > 0 && (
            <div className="eb-ss-footer">
              {filtered.length} {noun}{filtered.length > 1 ? "s" : ""}
              {trimmed && options.length !== filtered.length ? ` of ${options.length}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SEARCHABLE ROOM FILTER (toolbar "All Rooms" dropdown)
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const trimmed = term.trim().toLowerCase();

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber)),
    [options]
  );

  const filtered = useMemo(
    () => (trimmed
      ? sortedOptions.filter((r) => String(r.roomNumber ?? "").toLowerCase().includes(trimmed))
      : sortedOptions),
    [sortedOptions, trimmed]
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

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setMenuPos({ top: rect.bottom + 4, left, width });
    }
    setOpen(true);
  };

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

  // The menu is fixed-position, so close it if the page scrolls or resizes
  // (scrolling inside the room list itself is fine).
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
      closeMenu();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
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
    <div className="eb-room-dd w-[150px]" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="eb-room-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by room"
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <span className="eb-room-trigger-label">{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className={`eb-room-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="eb-room-menu" style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}>
          <div className="eb-room-search">
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
                className="eb-room-search-clear"
                aria-label="Clear room search"
                onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="eb-room-list" role="listbox" aria-label="Rooms" ref={listRef}>
            {items.map((item, idx) => {
              const isSelected = item.id === value;
              return (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  className={`eb-room-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => pick(item.id)}
                >
                  <span className="eb-room-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
                  {item.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="eb-room-empty">No rooms found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EBReadingsPage = () => {
  // ── role is uppercased for all comparisons ────────────────────────────
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId(); // number | null

  // Business Model property type (ROOM / FLAT / null = not configured).
  const { propertyType, loading: propertyTypeLoading } = usePropertyType();
  const isFlatMode = propertyType === "FLAT";
  const isRoomMode = propertyType === "ROOM";

  const isAdmin   = role === "ADMIN" || role === "WARDEN";
  const hasAccess = isAdmin;
  const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

  // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
  const defaultBranch =
    role === "ADMIN" || role === "SUPER_ADMIN"
      ? "all"
      : branchId != null ? String(branchId) : "all";

  // ── PAGE-LEVEL CASCADING FILTERS: Branch → Flat → Room ────────────────
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);
  const [selectedFlatId, setSelectedFlatId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [readings,     setReadings]     = useState<EBReading[]>([]);
  const [tenants,      setTenants]      = useState<Tenant[]>([]);
  const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [flats,        setFlats]        = useState<Flat[]>([]);
  // Every rent record: used to know whether a month's EB was already billed.
  const [allRents,     setAllRents]     = useState<Rent[]>([]);
  const [tenantRows,   setTenantRows]   = useState<any[]>([]);
  const [tenantBills,  setTenantBills]  = useState<any[]>([]);

  // PERF: true while tenant-wise bills are still arriving (rows stream in).
  const [billsLoading, setBillsLoading] = useState(false);
  // PERF: per-page-visit cache of bill responses. Cleared on every reload()
  // and gone on unmount, so it can never show data older than this visit.
  const billCacheRef = useRef<Map<string, any[]>>(new Map());

  // Current page (rooms/flats are paginated, G1..G10 = page 1, ...).
  const [currentPage, setCurrentPage] = useState(0);

  // PERF: built rows per room/flat unit, per month. Revisiting a page (or a
  // page that was prefetched) is instant. Cleared on reload().
  const rowsCacheRef = useRef<Map<string, any[]>>(new Map());
  // Bumped on reload() so slow in-flight requests can't write stale data back.
  const cacheGenRef = useRef(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [billOpen,   setBillOpen]   = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);

  const [manualRate,      setManualRate]      = useState<number | "">(13);
  const [manualMode,      setManualMode]      = useState(false);
  const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

  // Flat selected INSIDE the Add EB Reading dialog (separate from the
  // page-level `selectedFlatId` filter above).
  const [formFlatId,      setFormFlatId]      = useState("all");
  const [formRoomId,      setFormRoomId]      = useState("");
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcPrev,      setFormAcPrev]      = useState("");
  const [formAcCurr,      setFormAcCurr]      = useState("");
  const [billRoom,        setBillRoom]        = useState("");
  const [formBranchId, setFormBranchId] = useState("");

  const [flatSharedPrev, setFlatSharedPrev] = useState("");
  const [flatSharedCurr, setFlatSharedCurr] = useState("");

  const [flatAcRows, setFlatAcRows] = useState<
    { roomId: number; roomNumber: string; acPreviousReading: string; acCurrentReading: string }[]
  >([]);

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());
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

  // Last 24 months, newest first, for the Month/Year picker.
  const monthYearOptions = useMemo(() => {
    const opts: { month: number; year: number; label: string; value: string }[] = [];
    const base = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      opts.push({
        month,
        year,
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
        value: `${year}-${month}`,
      });
    }
    return opts;
  }, []);

  /* ─── MONTHLY-ONLY TENANTS ───────────────────────────────────────────
     Single source of truth for "tenants whose meter readings count". */
  const monthlyTenants = useMemo(
    () => tenants.filter(isMonthlyTenant),
    [tenants]
  );

  const tenantById = useMemo(() => {
    const map = new Map<number, any>();
    tenants.forEach(t => map.set(Number(t.id), t));
    return map;
  }, [tenants]);


  const calculateInformationalShare = useCallback(
    (
      targetTenantId: number,
      prevReading: number,
      currReading: number,
      rate: number,
      occupants: Tenant[],
      meterFlatId: number | null,
      meterRoomId: number | null
    ): { units: number; amount: number } => {
      if (!(currReading > prevReading) || occupants.length === 0) {
        return { units: 0, amount: 0 };
      }

      const localLastBilled = new Map<number, number>();
      allReadings.forEach((r: any) => {
        if (r.tenantId == null) return;
        const sameMeter = meterFlatId != null
          ? Number(r.flatId) === Number(meterFlatId)
          : Number(r.roomId) === Number(meterRoomId);
        if (!sameMeter) return;

        const val = Number(r.currentReading ?? 0);
        const key = Number(r.tenantId);
        const prevMax = localLastBilled.get(key);
        if (prevMax == null || val > prevMax) localLastBilled.set(key, val);
      });

      const isPresentInSegment = (t: Tenant, segStart: number, segEnd: number): boolean => {
        const join = Number(t.joinReading);
        if (!Number.isFinite(join) || join > segStart) return false;

        if (Number(t.id) === targetTenantId) {
          return currReading >= segEnd;
        }

        const lastBilled = localLastBilled.get(Number(t.id));
        if (lastBilled != null && lastBilled >= segStart) return false;

        if (t.status === "Checked_Out") {
          const co = Number(t.checkoutReading);
          if (!Number.isFinite(co)) return false;
          return co >= segEnd;
        }

        return true;
      };

      const boundarySet = new Set<number>();
      occupants.forEach(t => {
        const join = Number(t.joinReading);
        if (Number.isFinite(join) && join > prevReading && join < currReading) {
          boundarySet.add(join);
        }
        if (Number(t.id) !== targetTenantId && t.status === "Checked_Out") {
          const co = Number(t.checkoutReading);
          if (Number.isFinite(co) && co > prevReading && co < currReading) {
            boundarySet.add(co);
          }
        }
      });

      const points = [
        prevReading,
        ...Array.from(boundarySet).sort((a, b) => a - b),
        currReading,
      ];

      let units = 0;
      let amount = 0;

      for (let i = 0; i < points.length - 1; i++) {
        const segStart = points[i];
        const segEnd = points[i + 1];
        const segUnits = segEnd - segStart;
        if (segUnits <= 0) continue;

        const presentInSegment = occupants.filter(t => isPresentInSegment(t, segStart, segEnd));
        const presentCount = presentInSegment.length || 1;
        const tenantPresent = presentInSegment.some(t => Number(t.id) === targetTenantId);

        if (tenantPresent) {
          units  += segUnits / presentCount;
          amount += (segUnits * rate) / presentCount;
        }
      }

      return { units, amount };
    },
    [allReadings]
  );

  /* ─── RATE ─────────────────────────────────────────────── */
  const getRateForRoom = (roomId: string | number) => {
    const roomRate = roomManualRates[String(roomId)];
    if (manualMode && roomRate !== undefined) return roomRate;
    if (typeof manualRate === "number") return manualRate;
    return 13;
  };

  /* ─── IS AC ───────────────────────────────────────────────
     ROOM property: an AC room behaves exactly like a non-AC room (only the
     normal Previous / Current meter reading, no AC Previous / AC Current).
     FLAT property: unchanged — AC rooms still carry AC readings. */
  const isRoomAc = useCallback(
    (roomId: string | number) => {
      if (isRoomMode) return false;
      const room = rooms.find(r => String(r.id) === String(roomId));
      return room?.hostelType === "AC";
    },
    [rooms, isRoomMode]
  );

  /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
  const handleFlatAcRowChange = (roomId: number, value: string) => {
    setFlatAcRows(prev =>
      prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
    );
  };

  /* ─── STARTING READINGS ─────────────────────────────────── */
  // Rules:
  //   1. Previous comes from the latest GENUINE EB Reading Page entry
  //      (isCheckout === false), "latest" = highest id.
  //   2. Checkout/check-in rows never move the Previous/Current sequence
  //      directly, but a real meter value can never go backward, so every
  //      reading's currentReading is used as a floor.
  //   3. With no genuine entry, fall back to the earliest joinReading of
  //      MONTHLY tenants (active or checked out).
  //   4. DAILY-stay tenants are excluded from that fallback.
  //   5. VACANCY: see bumpPastVacancy.

  // AC "Previous" for ONE room. A CHECKOUT row only moves this room's AC
  // floor when a tenant of THIS room owns it (flat checkouts write a copy
  // onto every room of the flat).
  const getRoomStartingACReading = useCallback(
    (roomId: string | number) => {
      const rid = String(roomId);

      const roomRows = allReadings.filter(
        r => r.roomId != null && String(r.roomId) === rid
      );

      const roomTenants = monthlyTenants.filter(t => String(t.roomId) === rid);
      const roomTenantIds = new Set(roomTenants.map(t => Number(t.id)));

      const rowCountsForAc = (r: any) => {
        if (r.isCheckout !== true) return true;
        if (r.tenantId == null) return false;
        return roomTenantIds.has(Number(r.tenantId));
      };

      const rowAcFloor = roomRows
        .filter(rowCountsForAc)
        .reduce((m, r) => Math.max(m, Number(r.acCurrentReading ?? 0)), 0);

      const tenantAcFloor = roomTenants.reduce((m, t) => {
        const co = Number((t as any).acCheckoutReading);
        const join = Number((t as any).acJoinReading);
        if (!Number.isFinite(co) || co <= 0) return m;
        if (Number.isFinite(join) && join > 0 && co <= join) return m;
        return Math.max(m, co);
      }, 0);

      const acFloor = Math.max(rowAcFloor, tenantAcFloor);

      const genuineRoomReadings = roomRows.filter(r => r.isCheckout !== true);
      if (genuineRoomReadings.length > 0) {
        const latest = genuineRoomReadings.reduce((a, b) =>
          Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
        );
        return Math.max(Number(latest.acCurrentReading ?? 0), acFloor);
      }

      const joins = roomTenants
        .map(t => Number((t as any).acJoinReading))
        .filter(v => Number.isFinite(v) && v > 0);
      const joinFloor = joins.length > 0 ? Math.min(...joins) : 0;

      return Math.max(joinFloor, acFloor);
    },
    [allReadings, monthlyTenants]
  );

  // A room's main EB meter "Previous" (checkout floor + vacancy bump).
  const getRoomStartingReading = useCallback(
    (roomId: string | number) => {
      const room = rooms.find(r => String(r.id) === String(roomId));

      const genuineReadings = allReadings.filter(r => {
        if (r.isCheckout === true) return false;
        const matchesRoom = String(r.roomId) === String(roomId);
        const matchesFlat =
          room?.flatId != null && r.flatId != null && String(r.flatId) === String(room.flatId);
        return matchesRoom || matchesFlat;
      });

      const anyReadingsForMeter = allReadings.filter(r => {
        const matchesRoom = String(r.roomId) === String(roomId);
        const matchesFlat =
          room?.flatId != null && r.flatId != null && String(r.flatId) === String(room.flatId);
        return matchesRoom || matchesFlat;
      });
      const checkoutFloor = anyReadingsForMeter.length > 0
        ? Math.max(...anyReadingsForMeter.map(r => Number(r.currentReading ?? 0)))
        : 0;

      const roomTenants = monthlyTenants.filter(t => String(t.roomId) === String(roomId));
      const flatTenants = room?.flatId != null
        ? monthlyTenants.filter(t => {
            const tRoom = rooms.find(r => Number(r.id) === Number(t.roomId));
            return tRoom?.flatId != null && String(tRoom.flatId) === String(room.flatId);
          })
        : [];
      const baselineTenants = flatTenants.length > 0 ? flatTenants : roomTenants;

      if (genuineReadings.length > 0) {
        const latest = genuineReadings.reduce((a, b) =>
          Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
        );
        const base = Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
        return bumpPastVacancy(base, baselineTenants);
      }

      const joinFloor = baselineTenants.length > 0
        ? Math.min(...baselineTenants.map(t => Number(t.joinReading ?? 0)))
        : 0;

      return Math.max(joinFloor, checkoutFloor);
    },
    [allReadings, monthlyTenants, rooms]
  );

  // The flat's own shared-meter "Previous" value.
  const getFlatStartingReading = useCallback(
    (flatId: string | number) => {
      const genuineFlatReadings = allReadings.filter(
        r => r.isCheckout !== true && r.flatId != null && String(r.flatId) === String(flatId)
      );

      const anyFlatReadings = allReadings.filter(
        r => r.flatId != null && String(r.flatId) === String(flatId)
      );
      const checkoutFloor = anyFlatReadings.length > 0
        ? Math.max(...anyFlatReadings.map(r => Number(r.currentReading ?? 0)))
        : 0;

      const roomIdsInFlat = new Set(
        rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
      );
      const flatAllTenants = monthlyTenants.filter(t => roomIdsInFlat.has(t.roomId));

      if (genuineFlatReadings.length > 0) {
        const latest = genuineFlatReadings.reduce((a, b) =>
          Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
        );
        const base = Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
        return bumpPastVacancy(base, flatAllTenants);
      }

      const joinFloor = flatAllTenants.length > 0
        ? Math.min(...flatAllTenants.map(t => Number(t.joinReading ?? 0)))
        : 0;

      return Math.max(joinFloor, checkoutFloor);
    },
    [allReadings, rooms, monthlyTenants]
  );

  /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
  const filteredRooms = useMemo(() => {
    if (selectedBranch === "all") return rooms;
    return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
  }, [rooms, selectedBranch]);

  /* ─── PAGE-LEVEL FLAT FILTER OPTIONS (scoped by branch) ───────────── */
  const filterFlats = useMemo(() => {
    if (selectedBranch === "all") return flats;
    const flatIdsInBranch = new Set(
      filteredRooms
        .map(r => r.flatId)
        .filter((id): id is number => id != null)
        .map(Number)
    );
    return flats.filter(f => flatIdsInBranch.has(Number(f.id)));
  }, [flats, filteredRooms, selectedBranch]);

  /* ─── PAGE-LEVEL ROOM FILTER OPTIONS (scoped by branch + flat) ───── */
  const filterRooms = useMemo(() => {
    if (selectedFlatId === "all") return filteredRooms;
    return filteredRooms.filter(r => String(r.flatId) === String(selectedFlatId));
  }, [filteredRooms, selectedFlatId]);

  const dialogRooms = useMemo(() => {
    if (!formBranchId) return rooms;
    return rooms.filter(r => Number(r.unitId) === Number(formBranchId));
  }, [rooms, formBranchId]);

  const dialogStandaloneRooms = useMemo(
    () => dialogRooms.filter(r => !r.flatId),
    [dialogRooms]
  );

  const dialogFlatFilteredRooms = useMemo(() => {
    if (!formFlatId || formFlatId === "all") return dialogStandaloneRooms;
    return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
  }, [dialogRooms, dialogStandaloneRooms, formFlatId]);

  const dialogFlats = useMemo(() => {
    if (!formBranchId) return flats;
    const flatIdsInBranch = new Set(
      dialogRooms.map(r => r.flatId).filter((id): id is number => id != null)
    );
    return flats.filter(f => flatIdsInBranch.has(Number(f.id)));
  }, [flats, formBranchId, dialogRooms]);

  // Options for the searchable pickers in the Add EB Reading dialog.
  // Sorted naturally (G1, G2, G10 — not G1, G10, G2).
  const dialogFlatOptions = useMemo<SearchableOption[]>(
    () =>
      [...dialogFlats]
        .sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber))
        .map(f => ({ value: String(f.id), label: String(f.flatNumber) })),
    [dialogFlats]
  );

  // ROOM property: no "AC" badge — an AC room is picked exactly like a non-AC room.
  const dialogRoomOptions = useMemo<SearchableOption[]>(
    () =>
      [...dialogFlatFilteredRooms]
        .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber))
        .map(r => ({
          value: String(r.id),
          label: String(r.roomNumber),
          hint: !isRoomMode && r.hostelType === "AC" ? "AC" : undefined,
        })),
    [dialogFlatFilteredRooms, isRoomMode]
  );

  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
    return map;
  }, [rooms]);

  // Rooms belonging to the flat currently selected in the Add dialog.
  const roomsInFormFlat = useMemo(() => {
    if (!formFlatId || formFlatId === "all") return [];
    return dialogRooms
      .filter(r => String(r.flatId) === String(formFlatId))
      .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber));
  }, [dialogRooms, formFlatId]);

  /* ─── FILTERED READINGS ─────────────────────────────────── */
  const filteredReadings = useMemo(() => {
    let data = readings.filter(r => r.month === selMonth && r.year === selYear);
    if (selectedBranch !== "all") {
      const branchRooms   = rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
      const branchRoomIds = new Set(branchRooms.map(r => r.id));
      const branchFlatIds = new Set(branchRooms.map(r => r.flatId).filter(Boolean));
      data = data.filter(r =>
        (r.roomId != null && branchRoomIds.has(r.roomId)) ||
        (r.flatId != null && branchFlatIds.has(r.flatId))
      );
    }
    // Flat filter: only load bills for the chosen flat (saves bill API calls).
    if (selectedFlatId !== "all") {
      const flatRoomIds = new Set(
        rooms.filter(r => String(r.flatId) === String(selectedFlatId)).map(r => r.id)
      );
      data = data.filter(r =>
        (r.flatId != null && String(r.flatId) === String(selectedFlatId)) ||
        (r.roomId != null && flatRoomIds.has(r.roomId))
      );
    }
    return data;
  }, [readings, rooms, selectedBranch, selectedFlatId, selMonth, selYear]);

  /* ─── BILL UNITS (one per standalone room / flat / DAILY checkout record)
     Sorted naturally: G1, G2, G3 ... G10. Pagination works on THESE, so
     bill requests are only made for the ~10 rooms on the visible page
     instead of every room at once. ─────────────────────────────────── */
  const billUnits = useMemo<BillUnit[]>(() => {
    const roomById = new Map<number, Room>();
    rooms.forEach(rm => roomById.set(Number(rm.id), rm));
    const flatById = new Map<number, Flat>();
    flats.forEach(f => flatById.set(Number(f.id), f));

    const isInfo = (r: any) =>
      isInformationalReading(
        r,
        r.tenantId != null ? tenantById.get(Number(r.tenantId)) : undefined
      );

    const selectedRoom =
      selectedRoomId !== "all" ? roomById.get(Number(selectedRoomId)) : undefined;

    const units: BillUnit[] = [];
    const billing = filteredReadings.filter(r => !isInfo(r));

    // DAILY-stay checkout records (pure client math, no bill request).
    for (const r of filteredReadings.filter(isInfo)) {
      if (selectedRoomId !== "all" && String(r.roomId) !== String(selectedRoomId)) continue;
      const room = r.roomId != null ? roomById.get(Number(r.roomId)) : undefined;
      units.push({ key: `i:${r.id}`, kind: "info", sortKey: room?.roomNumber ?? "", r });
    }

    // One bill request per flat (shared meter).
    const flatBest = new Map<number, EBReading>();
    for (const r of billing) {
      if (r.flatId == null) continue;
      const ex = flatBest.get(r.flatId);
      if (!ex || Number(r.currentReading ?? 0) > Number(ex.currentReading ?? 0)) {
        flatBest.set(r.flatId, r);
      }
    }
    flatBest.forEach((r, flatId) => {
      if (selectedRoom && String(selectedRoom.flatId) !== String(flatId)) return;
      units.push({
        key: `f:${flatId}`,
        kind: "flat",
        sortKey: String(flatById.get(flatId)?.flatNumber ?? ""),
        r,
      });
    });

    // One bill request per standalone room.
    const roomFirst = new Map<number, EBReading>();
    for (const r of billing) {
      if (r.roomId == null) continue;
      const room = roomById.get(Number(r.roomId));
      if (!room || room.flatId) continue; // flat rooms are covered by the flat bill
      if (!roomFirst.has(r.roomId)) roomFirst.set(r.roomId, r);
    }
    roomFirst.forEach((r, roomId) => {
      if (selectedRoom && Number(selectedRoom.id) !== Number(roomId)) return;
      units.push({
        key: `r:${roomId}`,
        kind: "room",
        sortKey: String(roomById.get(roomId)?.roomNumber ?? ""),
        r,
      });
    });

    return units.sort(
      (a, b) => naturalCompare(a.sortKey, b.sortKey) || naturalCompare(a.key, b.key)
    );
  }, [filteredReadings, rooms, flats, tenantById, selectedRoomId]);

  const totalPages = Math.max(1, Math.ceil(billUnits.length / UNITS_PER_PAGE));

  const pageUnits = useMemo(
    () => billUnits.slice(currentPage * UNITS_PER_PAGE, (currentPage + 1) * UNITS_PER_PAGE),
    [billUnits, currentPage]
  );

  /* ─── RELOAD ─────────────────────────────────────────────── */
  const reload = async () => {
    // Data may have changed: drop every cached bill response and built row,
    // and invalidate any request that is still in flight.
    billCacheRef.current.clear();
    rowsCacheRef.current.clear();
    cacheGenRef.current += 1;

    // PERF: PAGE_ALL rows per request -> a handful of calls instead of dozens.
    const [
      roomsResult,
      readingsResult,
      tenantsResult,
      branchesResult,
      flatsResult,
      rentsResult,
    ] = await Promise.allSettled([
      fetchAllPages<Room>(getRooms, PAGE_ALL),
      fetchAllPages<EBReading>(getEBReadings, PAGE_ALL),
      fetchAllPages<Tenant>(getTenants, PAGE_ALL),
      fetchAllPages<Branch>(getBranches, PAGE_ALL),
      fetchAllPages<Flat>(getFlats, PAGE_ALL),
      fetchAllPages<Rent>(getRents, PAGE_ALL),
    ]);

    const roomList: Room[] =
      roomsResult.status === "fulfilled" ? roomsResult.value : [];
    const readingList: EBReading[] =
      readingsResult.status === "fulfilled" ? readingsResult.value : [];
    const tenantList: Tenant[] =
      tenantsResult.status === "fulfilled" ? tenantsResult.value : [];
    const branchList: Branch[] =
      branchesResult.status === "fulfilled" ? branchesResult.value : [];
    const flatList: Flat[] =
      flatsResult.status === "fulfilled" ? flatsResult.value : [];
    const rentList: Rent[] =
      rentsResult.status === "fulfilled" ? rentsResult.value : [];

    if (roomsResult.status === "rejected") {
      console.error("Failed to load rooms:", roomsResult.reason);
      toast.error("Failed to load rooms");
    }
    if (readingsResult.status === "rejected") {
      console.error("Failed to load EB readings:", readingsResult.reason);
      toast.error("Failed to load EB readings");
    }
    if (tenantsResult.status === "rejected") {
      console.error("Failed to load tenants:", tenantsResult.reason);
      toast.error("Failed to load tenants");
    }
    if (branchesResult.status === "rejected") {
      console.error("Failed to load branches:", branchesResult.reason);
    }
    if (flatsResult.status === "rejected") {
      console.error("Failed to load flats:", flatsResult.reason);
      toast.error(
        "Couldn't load flats (permission or server error) — flat-based readings may be hidden until this is fixed."
      );
    }

    let filteredRoomsData = roomList;
    let filteredTenants   = tenantList;
    let filteredReadingData = readingList;

    if (role === "WARDEN" && branchId != null) {
      filteredRoomsData = roomList.filter(r => Number(r.unitId) === Number(branchId));
      const roomIds = new Set(filteredRoomsData.map(r => r.id));
      const flatIds = new Set(
        filteredRoomsData.map(r => r.flatId).filter((id): id is number => id != null)
      );
      filteredTenants = tenantList.filter(t => roomIds.has(Number(t.roomId)));
      filteredReadingData = readingList.filter(r =>
        (r.roomId != null && roomIds.has(r.roomId)) ||
        (r.flatId != null && flatIds.has(r.flatId))
      );
    }

    setRooms(filteredRoomsData);
    setReadings(filteredReadingData);
    setTenants(filteredTenants);
    setAllReadings(readingList);
    setBranches(branchList);
    setFlats(flatList);
    setAllRents(rentList);
  };

  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, []);

  /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ────────────────── */
  useEffect(() => {
    if (!formFlatId || formFlatId === "all") {
      setFlatSharedPrev("");
      setFlatSharedCurr("");
      setFlatAcRows([]);
      return;
    }

    setFlatSharedPrev(String(getFlatStartingReading(formFlatId)));
    setFlatSharedCurr("");

    const acRoomsInFlat = roomsInFormFlat.filter(r => r.hostelType === "AC");
    setFlatAcRows(prev =>
      acRoomsInFlat.map(room => {
        const existing = prev.find(p => p.roomId === room.id);
        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          acPreviousReading: String(getRoomStartingACReading(room.id)),
          acCurrentReading: existing ? existing.acCurrentReading : "",
        };
      })
    );
  }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

  /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ───── */
  useEffect(() => {
    if (!formRoomId) return;
    setFormPrevReading(String(getRoomStartingReading(formRoomId)));
    setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
  }, [formRoomId, allReadings, getRoomStartingReading, getRoomStartingACReading]);

  /* ─── BUILD TENANT BILL ROWS (CURRENT PAGE ONLY) ───────────
     PERF: pagination happens BEFORE any bill request. Only the rooms/flats
     on the current page (G1..G10, G11..G20, ...) are fetched, in PARALLEL
     (BILL_CONCURRENCY at a time). Each unit's rows are cached per month, so
     revisiting a page is instant, and the NEXT page is prefetched quietly in
     the background.

     CARRY-OVER: an ACTIVE tenant whose month was never billed (no rent
     generated) moves into the NEXT month's row once that month has a reading.
       October  -> Mani only    (8382 -> 8623, 121u, ₹1,567)
       November -> Balaji only  (8382 -> 8703, 201u, ₹2,607 = Oct 121u + Nov 80u)

     The backend already excludes DAILY-stay tenants from every bill it
     returns. The id sets below are built from monthlyTenants as a second
     guard. A room whose only occupant is a daily tenant comes back as an
     "Unassigned" row carrying the room's units.

     A bill line's room is resolved inside the bill's own flat first, then
     from the tenant's own room (room numbers are not unique system-wide).

     Tenants transferred OUT of a room during the month still appear on that
     room's bill, so the id sets hold every MONTHLY tenant. */
  useEffect(() => {
    let cancelled = false;
    const gen = cacheGenRef.current;

    const resolveBillRoomId = (
      b: any,
      flatId: number | null | undefined
    ): number | undefined => {
      const sameNumber = rooms.filter(rm => rm.roomNumber === b.roomNumber);
      if (flatId != null) {
        const inFlat = sameNumber.find(rm => String(rm.flatId) === String(flatId));
        if (inFlat) return inFlat.id;
      }
      if (b.tenantId != null) {
        const t = tenantById.get(Number(b.tenantId));
        if (t?.roomId != null) return Number(t.roomId);
      }
      return sameNumber[0]?.id;
    };

    // A tenant whose CURRENT room differs from the room this line was billed
    // in was transferred out of it: tag the line "moved to <room>".
    const tagMoved = (rows: any[]) =>
      rows.map(row => {
        const t = row.tenantId != null ? tenantById.get(Number(row.tenantId)) : undefined;
        return t?.roomId != null && row.roomId != null && String(t.roomId) !== String(row.roomId)
          ? { ...row, movedTo: roomMap[String(t.roomId)] }
          : row;
      });

    // Cached fetch: the same flat/room + month is never requested twice per visit.
    const fetchBills = async (params: {
      flatId?: number;
      roomId?: number;
      month: number;
      year: number;
    }): Promise<any[]> => {
      const key = `${params.flatId != null ? "f" + params.flatId : "r" + params.roomId}:${params.month}:${params.year}`;
      const hit = billCacheRef.current.get(key);
      if (hit) return hit;
      const bills = await getTenantWiseEBBill(params);
      // Don't write back if reload() ran while this request was in flight.
      if (gen === cacheGenRef.current) billCacheRef.current.set(key, bills);
      return bills;
    };

    // ── previous-month carry-over helpers ──
    const pm = selMonth === 1 ? 12 : selMonth - 1;
    const py = selMonth === 1 ? selYear - 1 : selYear;
    const nm = selMonth === 12 ? 1 : selMonth + 1;
    const ny = selMonth === 12 ? selYear + 1 : selYear;
    const prevLabel = new Date(py, pm - 1, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    // Tenants whose previous-month / selected-month rent was already generated.
    const billedPrev = new Set(
      allRents
        .filter(x => Number(x.rentMonth) === pm && Number(x.rentYear) === py)
        .map(x => Number(x.tenantId))
    );
    const billedCurrent = new Set(
      allRents
        .filter(x => Number(x.rentMonth) === selMonth && Number(x.rentYear) === selYear)
        .map(x => Number(x.tenantId))
    );

    // Does this flat/room have a reading saved for the NEXT month?
    const nextMonthHasReading = (flatId: number | null | undefined, roomId: number | null | undefined) =>
      allReadings.some(
        x =>
          Number(x.month) === nm &&
          Number(x.year) === ny &&
          x.isCheckout !== true &&
          (flatId != null ? Number(x.flatId) === Number(flatId) : Number(x.roomId) === Number(roomId))
      );

    // PERF: a previous-month bill can only be non-zero if this meter has a
    // reading saved for that month, so skip the request otherwise.
    const prevMonthHasReading = (flatId: number | null | undefined, roomId: number | null | undefined) => {
      const flatRoomIds = flatId != null
        ? new Set(rooms.filter(rm => Number(rm.flatId) === Number(flatId)).map(rm => Number(rm.id)))
        : null;
      return allReadings.some(
        x =>
          Number(x.month) === pm &&
          Number(x.year) === py &&
          (flatId != null
            ? Number(x.flatId) === Number(flatId) ||
              (x.roomId != null && flatRoomIds!.has(Number(x.roomId)))
            : Number(x.roomId) === Number(roomId))
      );
    };

    // An ACTIVE tenant whose selected-month EB is not billed yet AND whose
    // next month already has a reading: this month's share moves into the
    // next month's row, so it is hidden here (e.g. Balaji in October).
    const deferredToNextMonth = (
      tenantId: any,
      flatId: number | null | undefined,
      roomId: number | null | undefined
    ) => {
      if (tenantId == null) return false;
      const t = tenantById.get(Number(tenantId));
      if (!t || t.status === "Checked_Out") return false;
      if (billedCurrent.has(Number(tenantId))) return false;
      return nextMonthHasReading(flatId, roomId);
    };

    // Adds last month's still-unbilled EB share to an ACTIVE tenant's row.
    const carryPrevious = async (
      rows: any[],
      params: { flatId?: number; roomId?: number }
    ) => {
      const candidates = rows.filter(
        row =>
          row.tenantId != null &&
          !row.checkedOut &&
          !billedPrev.has(Number(row.tenantId))
      );
      if (candidates.length === 0) return;
      if (!prevMonthHasReading(params.flatId ?? null, params.roomId ?? null)) return;

      let prevBills: any[] = [];
      try {
        prevBills = await fetchBills({ ...params, month: pm, year: py });
      } catch {
        return;
      }

      for (const row of candidates) {
        const pb = prevBills.find(b => Number(b.tenantId) === Number(row.tenantId));
        const amt = Number(pb?.amount ?? 0);
        if (!pb || !(amt > 0)) continue;

        row.carriedUnits  = Number(pb.totalUnits ?? 0);
        row.carriedAmount = amt;
        row.carriedLabel  = prevLabel;
        row.previousReading = pb.previousReading ?? row.previousReading;
        row.unitsConsumed = Number(row.unitsConsumed ?? 0) + row.carriedUnits;
        row.tenantAmount  = Number(row.tenantAmount ?? 0) + amt;
      }
    };

    const monthlyIds = new Set(monthlyTenants.map(t => Number(t.id)));

    /* ── DAILY checkout record: pure client math, instant ── */
    const buildInfoRows = (r: EBReading): any[] => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const tenantIdRaw = (r as any).tenantId;
      const tenantId = tenantIdRaw != null ? Number(tenantIdRaw) : null;
      const tenant = tenantId != null ? tenantById.get(tenantId) : undefined;

      const prevReading = Number(r.previousReading ?? 0);
      const currReading = Number(r.currentReading ?? 0);
      const rate = Number((r as any).ebRate ?? 0) || 13;

      const flatId = room?.flatId ?? null;
      const occupants = flatId != null
        ? tenants.filter(t => {
            const tRoom = rooms.find(rm => rm.id === t.roomId);
            return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
          })
        : tenants.filter(t => String(t.roomId) === String(r.roomId));

      // Prefer a real value the backend already persisted on this row;
      // only recompute client-side when both are missing/zero.
      const storedUnits  = Number((r as any).unitsConsumed ?? 0);
      const storedAmount = Number((r as any).ebAmount ?? 0);

      let grossUnits  = storedUnits;
      let grossAmount = storedAmount;

      if (!grossUnits && !grossAmount && tenantId != null) {
        const computed = calculateInformationalShare(
          tenantId, prevReading, currReading, rate, occupants,
          flatId, r.roomId ?? null
        );
        grossUnits  = computed.units;
        grossAmount = computed.amount;
      }

      const advancePaid = Number(tenant?.ebAmount ?? 0);
      const netAmount   = grossAmount - advancePaid; // > 0 due, <= 0 paid/refund

      return [{
        id: r.id,
        roomId: r.roomId,
        flatId: room?.flatId ?? null,
        roomNumber: room?.roomNumber ?? "-",
        flatNumber: "-",
        branchId: (r as any).branchId ?? null,
        branchName: (r as any).branchName ?? null,
        tenantName: (r as any).tenantName ?? tenant?.name ?? "Daily tenant",
        previousReading: r.previousReading,
        currentReading: r.currentReading,
        acPreviousReading: r.acPreviousReading,
        acCurrentReading: r.acCurrentReading,
        unitsConsumed: grossUnits,
        tenantAmount: grossAmount,
        advancePaid,
        netAmount,
        informational: true,
      }];
    };

    /* ── FLAT unit: one bill request, rows for every tenant of the flat ── */
    const buildFlatRows = async (r: EBReading): Promise<any[]> => {
      const bills = await fetchBills({
        flatId: r.flatId!,
        month: r.month,
        year: r.year,
      });
      const rows: any[] = [];

      bills
        .filter((b: any) => b.tenantId == null || monthlyIds.has(Number(b.tenantId)))
        .filter((b: any) => !deferredToNextMonth(b.tenantId, r.flatId, null))
        .forEach((b: any) => {
          const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
          rows.push({
            id: r.id,
            roomId: resolveBillRoomId(b, r.flatId),
            flatId: r.flatId,
            roomNumber: b.roomNumber,
            flatNumber: b.flatNumber,
            branchId: (r as any).branchId ?? null,
            branchName: (r as any).branchName ?? null,
            tenantId: b.tenantId ?? null,
            tenantName: b.tenantName,
            checkedOut: billTenant?.status === "Checked_Out",
            previousReading: b.previousReading,
            currentReading: b.currentReading,
            acPreviousReading: b.acPreviousReading,
            acCurrentReading: b.acCurrentReading,
            unitsConsumed: b.totalUnits,
            tenantAmount: b.amount,
          });
        });

      await carryPrevious(rows, { flatId: r.flatId! });
      return rows;
    };

    /* ── STANDALONE ROOM unit: one bill request, rows per tenant ── */
    const buildRoomRows = async (r: EBReading): Promise<any[]> => {
      const room = rooms.find(rm => rm.id === r.roomId);
      if (!room) return [];

      const bills = await fetchBills({
        roomId: r.roomId!,
        month: r.month,
        year: r.year,
      });

      const allMatched = bills.filter(
        (b: any) => b.tenantId == null || monthlyIds.has(Number(b.tenantId))
      );
      const matchedBills = allMatched.filter(
        (b: any) => !deferredToNextMonth(b.tenantId, null, r.roomId)
      );

      const rows: any[] = [];

      if (matchedBills.length > 0) {
        matchedBills.forEach((b: any) => {
          const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
          rows.push({
            id: r.id,
            roomId: room.id,
            flatId: room.flatId,
            roomNumber: room.roomNumber,
            flatNumber: b.flatNumber,
            branchId: (r as any).branchId ?? null,
            branchName: (r as any).branchName ?? null,
            tenantId: b.tenantId ?? null,
            tenantName: b.tenantName,
            checkedOut: billTenant?.status === "Checked_Out",
            previousReading: b.previousReading ?? r.previousReading,
            currentReading: b.currentReading ?? r.currentReading,
            acPreviousReading: b.acPreviousReading,
            acCurrentReading: b.acCurrentReading,
            unitsConsumed: Number(b.totalUnits ?? 0),
            tenantAmount: b.amount,
          });
        });
      } else if (allMatched.length === 0) {
        rows.push({
          id: r.id,
          roomId: room.id,
          flatId: room.flatId,
          roomNumber: room.roomNumber,
          flatNumber: "-",
          branchId: (r as any).branchId ?? null,
          branchName: (r as any).branchName ?? null,
          tenantName: "-",
          previousReading: r.previousReading,
          currentReading: r.currentReading,
          acPreviousReading: r.acPreviousReading,
          acCurrentReading: r.acCurrentReading,
          unitsConsumed:
            r.currentReading != null && r.previousReading != null
              ? Number(r.currentReading) - Number(r.previousReading)
              : 0,
          tenantAmount: 0,
        });
      }

      await carryPrevious(rows, { roomId: r.roomId! });
      return rows;
    };

    /* One unit -> its rows. Cached per month, so revisiting a page is instant. */
    const buildUnitRows = async (u: BillUnit): Promise<any[]> => {
      const ck = `${selMonth}-${selYear}:${u.key}`;
      const hit = rowsCacheRef.current.get(ck);
      if (hit) return hit;

      let rows: any[];
      try {
        rows =
          u.kind === "info" ? buildInfoRows(u.r)
          : u.kind === "flat" ? await buildFlatRows(u.r)
          : await buildRoomRows(u.r);
      } catch {
        return []; // skip a failed room/flat (same as before); don't cache the failure
      }
      if (gen === cacheGenRef.current) rowsCacheRef.current.set(ck, rows);
      return rows;
    };

    const run = async () => {
      if (pageUnits.length === 0) {
        setTenantRows([]);
        setBillsLoading(false);
        return;
      }

      setBillsLoading(true);

      const byKey = new Map<string, any[]>();
      const publish = () => {
        if (cancelled) return;
        // Keep the page's natural room order while rows stream in.
        setTenantRows(tagMoved(pageUnits.flatMap(u => byKey.get(u.key) ?? [])));
      };

      // Only THIS page's rooms are fetched; rows appear as each bill arrives.
      await runPool(pageUnits, BILL_CONCURRENCY, async u => {
        if (cancelled) return;
        byKey.set(u.key, await buildUnitRows(u));
        publish();
      });

      if (cancelled) return;
      setBillsLoading(false);

      // Quietly warm the NEXT page so clicking "next" feels instant.
      const nextUnits = billUnits.slice(
        (currentPage + 1) * UNITS_PER_PAGE,
        (currentPage + 2) * UNITS_PER_PAGE
      );
      await runPool(nextUnits, 1, async u => {
        if (cancelled) return;
        await buildUnitRows(u);
      });
    };

    run();

    // A newer run (filters/page changed while bills were loading) wins.
    return () => { cancelled = true; };
  }, [pageUnits, billUnits, currentPage, roomMap, rooms, monthlyTenants, tenantById, tenants, calculateInformationalShare, allRents, allReadings, selMonth, selYear]);

  /* ─── ADD READING ───────────────────────────────────────── */
  const handleAdd = async () => {
    if (isSaving) return;

    if (canPickBranch && !formBranchId) {
      toast.error("Select a branch first");
      return;
    }

    setIsSaving(true);
    try {
      const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

      // Flat-based hostel: a reading is always entered against a flat.
      if (isFlatMode && (!formFlatId || formFlatId === "all")) {
        toast.error("Select a flat first");
        return;
      }

      if (formFlatId && formFlatId !== "all") {
        // ── SHARED FLAT METER ──
        if (roomsInFormFlat.length === 0) {
          toast.error("No rooms found in this flat");
          return;
        }
        if (flatSharedCurr === "") {
          toast.error("Enter the current reading for the flat's shared meter");
          return;
        }

        const prev = Number(flatSharedPrev);
        const curr = Number(flatSharedCurr);
        if (curr < prev) {
          toast.error("Current reading cannot be less than previous");
          return;
        }

        const rate = typeof manualRate === "number" ? manualRate : 13;

        let anyAcError = false;
        for (const room of roomsInFormFlat) {
          const isAc = room.hostelType === "AC";
          const acRow = flatAcRows.find(r => r.roomId === room.id);
          const acPrev = isAc ? Number(acRow?.acPreviousReading ?? 0) : 0;
          const acCurr = isAc && acRow?.acCurrentReading ? Number(acRow.acCurrentReading) : acPrev;

          if (isAc && acCurr < acPrev) {
            toast.error(`Invalid AC reading for Room ${room.roomNumber}`);
            anyAcError = true;
            continue;
          }

          await addEBReading({
            flatId: Number(formFlatId),
            roomId: Number(room.id),
            branchId: branchIdNum,
            month: selMonth, year: selYear,
            previousReading: prev, currentReading: curr,
            acPreviousReading: acPrev, acCurrentReading: acCurr,
            ebRate: rate, isCheckout: false,
          } as any);
        }
        if (!anyAcError) toast.success("Flat readings saved");
      } else {
        // ── STANDALONE ROOM, SHARED METER ──
        // ROOM property: isRoomAc() is false for every room, so an AC room is
        // saved exactly like a non-AC room (AC previous/current = 0).
        if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
        if (!formPrevReading) { toast.error("Previous reading is missing"); return; }
        const prev   = Number(formPrevReading);
        const curr   = Number(formCurrReading);
        const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
        const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;
        if (curr < prev) { toast.error("Current reading cannot be less than previous"); return; }
        await addEBReading({
          roomId: Number(formRoomId),
          branchId: branchIdNum,
          month: selMonth, year: selYear,
          previousReading: prev, currentReading: curr,
          acPreviousReading: acPrev, acCurrentReading: acCurr,
          ebRate: getRateForRoom(formRoomId), isCheckout: false,
        } as any);
        toast.success("Room reading saved");
      }
      setAddOpen(false);
      resetAddDialog();
      reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save readings");
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── EXCEL UPLOAD ──────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const data     = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);
      let savedCount = 0, skippedCount = 0;
      const savedRoomNumbers = new Set<string>();
      for (const row of jsonData) {
        const room = filteredRooms.find(r => r.roomNumber === String(row.RoomNumber));
        if (!room) { skippedCount++; continue; }
        const prev   = Number(row.Previous   ?? 0);
        const curr   = Number(row.Current    ?? 0);
        const acPrev = Number(row.AcPrevious ?? 0);
        const acCurr = Number(row.AcCurrent  ?? 0);
        const rowRate = Number(row.EbRate);
        const ebRate  = !isNaN(rowRate) && rowRate > 0 ? rowRate : getRateForRoom(room.id);
        if (curr < prev) { toast.error(`Invalid reading for Room ${row.RoomNumber}`); skippedCount++; continue; }
        if (!row.Current && row.Current !== 0) { skippedCount++; continue; }
        // ROOM property: AC room == non-AC room, so AC readings are never saved.
        const rowIsAc = !isRoomMode && room.hostelType === "AC";
        // NOTE: for a flat with a shared meter, every row of that flat's
        // rooms must carry the SAME Previous/Current.
        await addEBReading({
          roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
          branchId: room.unitId != null ? Number(room.unitId) : undefined,
          month: selMonth, year: selYear,
          previousReading: prev, currentReading: curr,
          acPreviousReading: rowIsAc ? acPrev : 0,
          acCurrentReading:  rowIsAc ? acCurr : 0,
          ebRate, isCheckout: false,
        });
        savedCount++;
        savedRoomNumbers.add(room.roomNumber);
      }
      if (savedCount > 0) {
        toast.success(
          `${savedCount} reading${savedCount > 1 ? "s" : ""} saved` +
          (skippedCount > 0 ? ` (${skippedCount} skipped)` : "") +
          ` — sending WhatsApp bills...`
        );
        let sentCount = 0, failedRooms: string[] = [];
        for (const roomNumber of savedRoomNumbers) {
          try {
            await sendEBBillWhatsApp(roomNumber);
            sentCount++;
          } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || "";
            failedRooms.push(msg.includes("Channel not found")
              ? `${roomNumber} (not joined sandbox)` : roomNumber);
          }
        }
        if (sentCount > 0) toast.success(`WhatsApp sent to ${sentCount} room${sentCount > 1 ? "s" : ""}`);
        if (failedRooms.length > 0) toast.warning(`WhatsApp failed for: ${failedRooms.join(", ")}`);
      } else {
        toast.warning("No valid readings found in the file");
      }
      setUploadOpen(false);
      e.target.value = "";
      reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to process Excel");
    }
  };

  /* ─── DELETE ────────────────────────────────────────────── */
  const handleDelete = async (id: string, flatId?: number, roomId?: number) => {
    try {
      if (flatId) {
        await deleteEBReadingsByFlat(flatId, selMonth, selYear);
        toast.success("Flat readings deleted for selected month");
      } else if (roomId) {
        await deleteEBReadingsByRoom(roomId, selMonth, selYear);
        toast.success("Room readings deleted for selected month");
      } else {
        await deleteEBReading(id);
        toast.success("Reading deleted");
      }
      reload();
    } catch {
      toast.error("Failed to delete readings");
    }
  };

  const handleDeleteReadingClick = (row: any) => {
    // An informational row is deleted BY ID ONLY.
    if (row.informational) {
      askConfirm(
        "Remove this checkout record?",
        () => handleDelete(String(row.id)),
        {
          description:
            "This only removes the record of the daily tenant's checkout. No bill is affected.",
          confirmLabel: "Remove",
          danger: true,
        }
      );
      return;
    }

    const monthLabel = new Date(selYear, selMonth - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    askConfirm(
      "Delete this EB reading?",
      () => {
        handleDelete(
          String(row.id),
          row.flatId ? Number(row.flatId) : undefined,
          row.roomId ? Number(row.roomId) : undefined
        );
      },
      {
        description: `This deletes the ${row.flatId ? "flat" : "room"}'s readings for ${monthLabel} only. This action cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
      }
    );
  };

  /* ─── WHATSAPP ──────────────────────────────────────────── */
  const handleSendWhatsApp = async (roomId: string) => {
    try {
      const roomNumber = roomMap[roomId];
      if (!roomNumber) { toast.error("Room not found"); return; }
      try {
        await sendEBBillWhatsApp(roomNumber);
        toast.success("WhatsApp sent successfully");
      } catch (backendError: any) {
        const msg = backendError?.response?.data?.error || backendError.message || "";
        toast.error(msg.includes("Channel not found")
          ? "Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox."
          : "Failed to send WhatsApp: " + msg);
      }
    } catch {
      toast.error("Unexpected error while sending WhatsApp");
    }
  };

  /* ─── DOWNLOAD EXCEL ────────────────────────────────────── */
  const handleDownloadExcel = async () => {
    try {
      const latestReadings = await fetchAllPages<EBReading>(getEBReadings, PAGE_ALL);
      // Export follows the page filters (Branch → Flat → Room), in
      // natural ascending room-name order (G1, G2, G3 ...).
      const exportRooms = filterRooms
        .filter(r => selectedRoomId === "all" ? true : String(r.id) === String(selectedRoomId))
        .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber));
      const data = exportRooms.map(room => {
        let lastReading: EBReading | undefined;
        const roomReadings = latestReadings
          .filter(r => r.roomId === room.id)
          .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
        if (roomReadings.length > 0) {
          lastReading = roomReadings.reduce((max, r) =>
            Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
        } else if (room.flatId) {
          const flatReadings = latestReadings
            .filter(r => r.flatId === room.flatId)
            .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
          if (flatReadings.length > 0) {
            lastReading = flatReadings.reduce((max, r) =>
              Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
          }
        }
        const lastRate = lastReading?.ebRate ?? (typeof manualRate === "number" ? manualRate : 13);

        const base = {
          RoomNumber: room.roomNumber,
          Previous:   lastReading?.currentReading ?? 0,
          Current:    "",
        };

        // ROOM property: AC room == non-AC room → no AcPrevious / AcCurrent columns.
        if (isRoomMode) {
          return { ...base, EbRate: lastRate };
        }

        // FLAT property: unchanged.
        return {
          ...base,
          AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
          AcCurrent:  room.hostelType === "AC" ? "" : "-",
          EbRate:     lastRate,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = isRoomMode
        ? [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
        : [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
      XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to download Excel");
    }
  };

  /* ─── FILTERED TENANT ROWS (rows of the CURRENT PAGE, room-wise ascending) ──
     tenantRows already holds only the rooms/flats on the current page; this
     applies the same page filters as a safety net and sorts naturally
     (G1, G2, G3 ... G10), then by tenant name. */
  const filteredTenantRows = useMemo(() => {
    let data = tenantRows;
    if (selectedBranch !== "all") {
      data = data.filter(row => {
        const room = rooms.find(r => Number(r.id) === Number(row.roomId));
        // Fall back to the row's own branch when its room could not be
        // resolved, rather than silently dropping the tenant.
        const unit = room?.unitId ?? row.branchId;
        return unit != null ? Number(unit) === Number(selectedBranch) : true;
      });
    }
    if (selectedFlatId !== "all") {
      data = data.filter(row => {
        const rowFlatId =
          row.flatId ?? rooms.find(r => Number(r.id) === Number(row.roomId))?.flatId;
        return rowFlatId != null && String(rowFlatId) === String(selectedFlatId);
      });
    }
    if (selectedRoomId !== "all") {
      data = data.filter(row => String(row.roomId) === String(selectedRoomId));
    }

    // ROOM-WISE ORDER: sort by room name ascending with natural numeric
    // comparison (G1, G2, G3, G4 ... G10), then by tenant name so rows of
    // the same room stay grouped and in a stable order.
    const roomLabelOf = (row: any) =>
      String(roomMap[String(row.roomId)] || row.roomNumber || "");

    return [...data].sort((a, b) => {
      const byRoom = naturalCompare(roomLabelOf(a), roomLabelOf(b));
      if (byRoom !== 0) return byRoom;
      return naturalCompare(a.tenantName ?? "", b.tenantName ?? "");
    });
  }, [tenantRows, selectedBranch, selectedFlatId, rooms, selectedRoomId, roomMap]);

  /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
  const selectedRoomObj = useMemo(
    () => rooms.find(r => String(r.id) === String(formRoomId)),
    [rooms, formRoomId]
  );

  /* ─── RESET DIALOG ──────────────────────────────────────── */
  const resetAddDialog = () => {
    setFormFlatId("all"); setFormRoomId("");
    setFormBranchId("");
    setFormPrevReading(""); setFormCurrReading("");
    setFormAcPrev(""); setFormAcCurr("");
    setFlatSharedPrev(""); setFlatSharedCurr(""); setFlatAcRows([]);
    setManualMode(false);
    setManualRate(13); setRoomManualRates({});
  };

  const openAddDialog = () => {
    setFormBranchId(
      role === "WARDEN" && branchId != null
        ? String(branchId)
        : selectedBranch !== "all" ? selectedBranch : ""
    );
    // Pre-fill the dialog's flat from the page-level Flat filter.
    if (selectedFlatId !== "all") setFormFlatId(selectedFlatId);
    setAddOpen(true);
  };

  /* ─── PAGE-LEVEL FILTER HANDLERS (cascading) ──────────────────────── */
  const handleBranchFilterChange = (val: string) => {
    setSelectedBranch(val);
    setSelectedFlatId("all");
    setSelectedRoomId("all");
  };

  const handleFlatFilterChange = (val: string) => {
    setSelectedFlatId(val);
    setSelectedRoomId("all");
  };

  /* ─── Pagination (rooms / flats per page, not rows) ─── */

  // Go back to page 1 whenever the filters change, and never sit on a
  // page that no longer exists.
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch, selectedFlatId, selectedRoomId, selMonth, selYear]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  const pageStart = billUnits.length === 0 ? 0 : currentPage * UNITS_PER_PAGE + 1;
  const pageEnd   = Math.min((currentPage + 1) * UNITS_PER_PAGE, billUnits.length);
  const unitLabel = isFlatMode ? "flats" : "rooms";
  const rangeFrom = pageUnits[0]?.sortKey;
  const rangeTo   = pageUnits[pageUnits.length - 1]?.sortKey;

  const getPageNumbers = (current: number, total: number): (number | "...")[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage + 1, totalPages),
    [currentPage, totalPages]
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  if (propertyTypeLoading) {
    return (
      <div role="status" className="flex items-center justify-center py-24 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-full w-full min-w-0 bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

        .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

        .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #f1f5f9; }
        .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .eb-table th { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .eb-table tr:hover { background: #fdfcff; }

        .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-tenant-name { font-size: 12px; color: #475569; margin-top: 2px; }
        .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-empty { color: #475569; }

        /* ── Searchable room filter dropdown (position:fixed menu) ── */
        .eb-room-dd { position: relative; }
        .eb-room-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; height: 36px; padding: 0 12px;
          border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
          font-size: 14px; color: #0f172a; cursor: pointer; text-align: left;
        }
        .eb-room-trigger:focus-visible { outline: none; border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); }
        .eb-room-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eb-room-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
        .eb-room-chevron.open { transform: rotate(180deg); }
        .eb-room-menu {
          position: fixed; z-index: 60;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
        }
        .eb-room-search {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
          margin-bottom: 6px; background: #fafafa;
        }
        .eb-room-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
        .eb-room-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; }
        .eb-room-search input::placeholder { color: #64748b; }
        .eb-room-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
        .eb-room-search-clear:hover { background: #e2e8f0; }
        .eb-room-list { max-height: 260px; overflow-y: auto; }
        .eb-room-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
          font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
        }
        .eb-room-item.active { background: #f8fafc; }
        .eb-room-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .eb-room-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .eb-room-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

        /* ── Searchable select (Room / Flat inside the Add EB Reading dialog) ── */
        .eb-ss { position: relative; width: 100%; }
        .eb-ss-trigger {
          display: flex; align-items: center; gap: 8px;
          width: 100%; height: 36px; padding: 0 12px;
          border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
          font-size: 14px; color: #0f172a; cursor: pointer; text-align: left;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .eb-ss-trigger:hover:not(:disabled) { border-color: #cbd5e1; }
        .eb-ss-trigger:focus-visible,
        .eb-ss-trigger[aria-expanded="true"] { outline: none; border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); }
        .eb-ss-trigger:disabled { cursor: not-allowed; opacity: 0.55; background: #f8fafc; }
        .eb-ss-trigger-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .eb-ss-trigger-label.placeholder { color: #64748b; font-weight: 400; }
        .eb-ss-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
        .eb-ss-chevron.open { transform: rotate(180deg); }
        .eb-ss-badge {
          flex-shrink: 0; padding: 1px 7px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
          color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd;
        }
        .eb-ss-menu {
          position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 50;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 12px 28px rgba(15,23,42,0.14); padding: 8px;
        }
        .eb-ss-menu.up { top: auto; bottom: calc(100% + 4px); }
        .eb-ss-search {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
          margin-bottom: 6px; background: #fafafa;
        }
        .eb-ss-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
        .eb-ss-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; color: #0f172a; }
        .eb-ss-search input::placeholder { color: #64748b; }
        .eb-ss-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
        .eb-ss-search-clear:hover { background: #e2e8f0; }
        .eb-ss-list { max-height: 224px; overflow-y: auto; overscroll-behavior: contain; padding-right: 2px; }
        .eb-ss-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
          font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
        }
        .eb-ss-item.active { background: #f8fafc; }
        .eb-ss-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .eb-ss-item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eb-ss-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .eb-ss-empty { padding: 14px 10px; font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.4; }
        .eb-ss-footer { margin-top: 6px; padding: 6px 10px 0; border-top: 1px solid #f1f5f9; font-size: 11px; color: #64748b; }

        .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .eb-status.collected { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.pending { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.not-read { color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; }
        .eb-status.prepaid { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.due { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.refund { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.settled { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.pay { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }

        .eb-row-informational td { background: #fcfdff; }
        .eb-daily-tag { display: inline-flex; align-items: center; margin-left: 6px; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; letter-spacing: 0.3px; }

        .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
        .eb-action-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
        .eb-action-btn svg {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 14px !important;
          height: 14px !important;
          min-width: 14px !important;
          min-height: 14px !important;
          stroke: #475569 !important;
          color: #475569 !important;
          flex-shrink: 0 !important;
          pointer-events: none;
        }
        .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
        .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
        .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
        .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

        .eb-pagination-row { flex-wrap: wrap; }
        .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
        .eb-page-ellipsis svg { stroke: #64748b !important; color: #64748b !important; }

        .eb-chart-container { padding: 20px; }

        .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
        .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
        .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }

        .eb-dlg-head { display: flex; align-items: center; gap: 12px; padding-right: 36px; margin-bottom: 18px; }
        .eb-dlg-icon { width: 40px; height: 40px; border-radius: 12px; background: #f1ebff; color: #5200FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .eb-dlg-title { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .eb-dlg-sub { font-size: 12.5px; color: #64748b; margin-top: 2px; }
        .eb-dlg-section { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #fff; }
        .eb-dlg-section + .eb-dlg-section { margin-top: 14px; }
        .eb-dlg-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
        .eb-dlg-step { width: 20px; height: 20px; border-radius: 999px; background: #5200FF; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .eb-dlg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .eb-dlg-meter { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fafafa; }
        .eb-dlg-meter + .eb-dlg-meter { margin-top: 12px; }
        .eb-dlg-empty { border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; font-size: 13px; color: #64748b; background: #f8fafc; }
        .eb-dlg-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f1f5f9; gap: 2px; }
        .eb-dlg-seg button { border: 0; background: transparent; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; }
        .eb-dlg-seg button[aria-pressed="true"] { background: #fff; color: #5200FF; box-shadow: 0 1px 2px rgba(15,23,42,.12); }
        @media (max-width: 520px) { .eb-dlg-grid-2 { grid-template-columns: 1fr; } }

        /* MOBILE SCROLL FIX (Add EB Reading dialog): the dialog body is the
           ONLY scroll container; dvh tracks the real visible height. */
        .eb-add-mobile-dialog {
          max-height: 90vh;
          max-height: 90dvh;
          overflow: hidden;
        }
        .eb-add-mobile-scroll {
          max-height: 90vh;
          max-height: 90dvh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
          padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
        }
        .eb-dlg-meter-stack { display: block; }

        .eb-wrap, .eb-layout, .eb-content, .eb-panel { min-width: 0; }
        .eb-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .eb-table-scroll:focus-visible { outline: 2px solid #5200FF; outline-offset: -2px; }
        @media (max-width: 767px) {
          .eb-wrap { width: 100%; max-width: 100%; padding: 12px 10px 24px; }
          .eb-layout { gap: 12px; }
          .eb-layout > div, .eb-content, .eb-sidebar { width: 100%; min-width: 0; max-width: 100%; }
          .eb-panel { width: 100%; max-width: 100%; border-radius: 12px; margin-bottom: 12px; }
          .eb-panel-header { padding: 14px 12px; align-items: stretch; gap: 12px; }
          .eb-panel-title { font-size: 16px; }
          .eb-panel-header > div { display: flex; flex-wrap: wrap; width: 100%; gap: 8px; }
          .eb-panel-header > div > button,
          .eb-panel-header > div > [data-state] { min-width: 0; }
          .eb-panel-header button { font-size: 12px; }
          .eb-filters { display: grid !important; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px !important; padding: 12px !important; align-items: stretch; }
          .eb-filters > div { width: 100% !important; min-width: 0 !important; max-width: 100%; }
          .eb-filters > div.hidden { display: none !important; }
          .eb-filters [role="combobox"] { width: 100%; min-width: 0; font-size: 12px; padding-left: 8px; padding-right: 8px; }
          .eb-room-trigger { font-size: 12px; padding: 0 8px; }
          .eb-filters > button { justify-self: start; min-height: 36px; }
          .eb-table { min-width: 900px; }
          .eb-table th, .eb-table td { padding: 12px 14px; }
          .eb-mobile-pagination { padding: 12px !important; gap: 10px; flex-wrap: wrap; }
          .eb-mobile-pagination > div { min-width: 0; }
          .eb-mobile-pagination nav { margin-left: auto; }
          .eb-add-mobile-dialog { width: calc(100vw - 20px) !important; max-width: 560px !important; }
          .eb-dlg-section { padding: 12px; }
          .eb-dlg-meter { padding: 12px; }
          .eb-dlg-grid-2 { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (max-width: 359px) {
          .eb-wrap { padding: 8px 6px 18px; }
          .eb-filters { gap: 7px !important; padding: 8px !important; }
          .eb-panel-header { padding: 12px 9px; }
        }

      `}</style>

      <div className="eb-wrap">
        <div className="eb-layout">
          <div>
            <div className="eb-panel">
              <div className="eb-panel-header">
                <h1 className="eb-panel-title">EB Readings List</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
                    <Download size={14} className="mr-2" aria-hidden="true" /> Export
                  </Button>
                  {hasAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
                          <Plus size={14} className="mr-2" aria-hidden="true" /> Add EB Reading
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={openAddDialog}>{isFlatMode ? "Single Flat Reading" : "Single Room Reading"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUploadOpen(true)}>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Filters: Branch → Flat → Room → Month */}
              <div className="eb-filters flex flex-wrap items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
                  <Select value={selectedBranch} onValueChange={handleBranchFilterChange} disabled={!hasAccess || !canPickBranch}>
                    <SelectTrigger aria-label="Filter by branch" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Flat filter — hidden only for Room-based hostels. */}
                <div className={`${isRoomMode ? "hidden" : "flex"} bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]`}>
                  <Select value={selectedFlatId} onValueChange={handleFlatFilterChange}>
                    <SelectTrigger aria-label="Filter by flat" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="All Flats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Flats</SelectItem>
                      {[...filterFlats]
                        .sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber))
                        .map(f => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room filter (with search) */}
                <RoomFilterDropdown
                  value={selectedRoomId}
                  onChange={setSelectedRoomId}
                  options={filterRooms}
                />

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
                  <Select
                    value={`${selYear}-${selMonth}`}
                    onValueChange={val => {
                      const [y, m] = val.split("-").map(Number);
                      setSelYear(y);
                      setSelMonth(m);
                    }}
                  >
                    <SelectTrigger aria-label="Filter by month and year" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthYearOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-[#475569] font-medium hover:text-[#0f172a]"
                  onClick={() => {
                    setSelectedBranch(defaultBranch);
                    setSelectedFlatId("all");
                    setSelectedRoomId("all");
                    setSelMonth(now.getMonth() + 1);
                    setSelYear(now.getFullYear());
                  }}
                >
                  <RefreshCw size={14} aria-hidden="true" /> Clear
                </button>
              </div>

              <div className="eb-table-scroll overflow-x-auto" role="region" aria-label="Scrollable EB readings table" tabIndex={0}>
                <table className="eb-table">
                  <caption className="sr-only">EB readings for the selected month</caption>
                  <thead>
                    <tr>
                      <th scope="col">ROOM / BED</th>
                      <th scope="col">PREV READING</th>
                      <th scope="col">CURR READING</th>
                      <th scope="col">UNITS</th>
                      <th scope="col">AMOUNT (₹)</th>
                      <th scope="col">STATUS</th>
                      <th scope="col">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenantRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 eb-empty">
                          {billsLoading ? "Loading EB bills…" : "No EB readings found."}
                        </td>
                      </tr>
                    ) : (
                      filteredTenantRows.map((row, i) => {
                        // Prefer the room the row resolved to; fall back to
                        // the bill's own room number instead of "Unknown".
                        const rName = roomMap[row.roomId] || row.roomNumber || "Unknown";
                        const tenantName = row.tenantName || "Unassigned";
                        const prev = Number(row.previousReading ?? 0);
                        const curr = Number(row.currentReading ?? 0);
                        const informational = row.informational === true;

                        const units = informational
                          ? Math.round(Number(row.unitsConsumed ?? 0))
                          : row.unitsConsumed != null
                            ? Math.round(Number(row.unitsConsumed))
                            : Math.round(curr - prev);

                        const amount = Math.round(Number(row.tenantAmount ?? 0));

                        // netAmount = grossAmount (units * rate) - advancePaid
                        //   > 0  → "Pay"   < 0 → "Refund"   = 0 → "Settled"
                        const netAmount = Number(row.netAmount ?? 0);
                        const status = informational
                          ? (netAmount > 0 ? "Pay" : netAmount < 0 ? "Refund" : "Settled")
                          : (row.tenantAmount ? "Pending" : "Not Read");

                        return (
                          <tr
                            key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${row.tenantId ?? "no-tenant"}-${i}`}
                            className={informational ? "eb-row-informational" : undefined}
                          >
                            <td>
                              <div className="eb-room-name">
                                {rName}
                                {informational && <span className="eb-daily-tag">DAILY</span>}
                              </div>
                              <div className="eb-tenant-name">
                                {tenantName}
                                {(informational || row.checkedOut) && " — checked out"}
                                {row.movedTo && ` — moved to ${row.movedTo}`}
                              </div>
                            </td>
                            <td><span className="eb-reading-val">{prev}</span></td>
                            <td><span className="eb-reading-val">{curr || "—"}</span></td>
                            <td>
                              <span className="eb-reading-val">{units || "—"}</span>
                              {row.carriedAmount > 0 && (
                                <div className="eb-tenant-name" style={{ marginTop: 2 }}>
                                  incl. {row.carriedLabel}: {Math.round(row.carriedUnits)}u · ₹{new Intl.NumberFormat("en-IN").format(Math.round(row.carriedAmount))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="eb-amount">
                                {informational
                                  // DAILY tenant: show only the actual EB charge
                                  // (units x rate, e.g. 8u @ ₹13 = ₹104), not the
                                  // advance-adjusted refund/due figure.
                                  ? `₹${new Intl.NumberFormat('en-IN').format(Math.round(Number(row.tenantAmount ?? 0)))}`
                                  : amount
                                    ? `₹${new Intl.NumberFormat('en-IN').format(amount)}`
                                    : "—"}
                              </span>
                              {/* {informational && (
                                <div className="eb-tenant-name" style={{ marginTop: 2 }}>
                                  {units}u @ ₹{Math.round(Number(row.tenantAmount ?? 0) / (units || 1))}
                                </div>
                              )} */}
                            </td>
                            <td>
                              <div className={`eb-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>
                                {informational
                                  ? (status === "Pay" ? "Pay" : status === "Refund" ? "Refund" : "Settled")
                                  : status}
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                {/* No bill to send for a settled daily stay. */}
                                {!informational && (
                                  <button
                                    type="button"
                                    className="eb-action-btn"
                                    onClick={() => handleSendWhatsApp(row.roomId)}
                                    title="Send Bill"
                                    aria-label={`Send bill for room ${rName} on WhatsApp`}
                                  >
                                    <Send size={14} aria-hidden="true" />
                                  </button>
                                )}
                                {hasAccess && (
                                  <button
                                    type="button"
                                    className="eb-action-btn"
                                    onClick={() => handleDeleteReadingClick(row)}
                                    title={informational ? "Remove record" : "Delete"}
                                    aria-label={
                                      informational
                                        ? `Remove checkout record for room ${rName}`
                                        : `Delete EB reading for room ${rName}`
                                    }
                                  >
                                    <Trash2 size={14} aria-hidden="true" />
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

              <div className="eb-mobile-pagination flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
                <div className="text-[13px] text-[#475569]" aria-live="polite">
                  Showing {unitLabel} {pageStart}–{pageEnd} of {billUnits.length}
                  {rangeFrom && rangeTo && ` (${rangeFrom} – ${rangeTo})`}
                  {billsLoading && " · loading…"}
                </div>
                <nav aria-label="Pagination" className="flex gap-2 eb-pagination-row">
                  <button
                    type="button"
                    className="eb-action-btn w-8"
                    aria-label="Previous page"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis" aria-hidden="true">
                        <MoreHorizontal size={14} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={p}
                        className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
                        aria-label={`Page ${p}`}
                        aria-current={p === currentPage + 1 ? "page" : undefined}
                        onClick={() => setCurrentPage(p - 1)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="eb-action-btn w-8"
                    aria-label="Next page"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {hasAccess && (
          <>

            <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
              <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="eb-add-mobile-dialog sm:max-w-[760px] rounded-2xl p-0 [&>button]:hidden">
                <div className="eb-add-mobile-scroll relative p-6">
                  <DialogClose asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  </DialogClose>

                  <DialogHeader className="space-y-0">
                    <div className="eb-dlg-head">
                      <div className="eb-dlg-icon"><Zap className="h-5 w-5" aria-hidden="true" /></div>
                      <div>
                        <DialogTitle className="eb-dlg-title">Add EB Reading</DialogTitle>
                        <DialogDescription className="eb-dlg-sub">
                          {isFlatMode
                            ? "Enter the shared meter reading for a flat."
                            : isRoomMode
                              ? "Enter the meter reading for a room."
                              : "Enter the electricity meter readings for this month."}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div>
                    {/* Section 1 — Branch + Flat side by side (Room-based hostel: Branch only) */}
                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">1</span>{isRoomMode ? "Branch" : "Branch & Flat"}</div>
                    <div className={isRoomMode ? "grid grid-cols-1 gap-4" : "eb-dlg-grid-2"}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
                        {canPickBranch ? (
                          <Select
                            value={formBranchId}
                            onValueChange={val => {
                              setFormBranchId(val);
                              setFormFlatId("all");
                              setFormRoomId("");
                            }}
                          >
                            <SelectTrigger aria-label="Branch" className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                            <SelectContent>
                              {branches.map(b => (
                                <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center px-3 py-2 rounded-lg border bg-muted text-sm font-medium text-muted-foreground h-9">
                            <span className="text-foreground font-semibold">
                              {branches.find(b => Number(b.id) === Number(formBranchId))?.unitName ?? "Unit"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={isRoomMode ? "hidden" : "space-y-1.5"}>
                        <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
                        <SearchableSelect
                          ariaLabel="Flat"
                          noun="flat"
                          value={formFlatId === "all" ? "" : formFlatId}
                          onChange={val => setFormFlatId(val || "all")}
                          options={dialogFlatOptions}
                          disabled={canPickBranch && !formBranchId}
                          placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"}
                          searchPlaceholder="Search flat..."
                          emptyText={dialogFlats.length === 0 ? "No flat available" : "No flat found"}
                        />
                      </div>
                    </div>
                    </div>

                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">2</span>Meter reading</div>
                    {(formFlatId && formFlatId !== "all") ? (
                      <div className="eb-dlg-meter-stack">
                        {/* ── SHARED FLAT METER ── */}
                        <div className="eb-dlg-meter">
                          <div className="eb-flat-room-title">
                            Shared Flat Meter
                            {roomsInFormFlat.length > 0 && (
                              <span className="font-normal text-muted-foreground">
                                {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="eb-dlg-grid-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-flat-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
                              <Input id="eb-flat-prev" className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-flat-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
                              <Input
                                id="eb-flat-curr"
                                className="rounded-lg bg-white"
                                inputMode="decimal"
                                placeholder="Enter current reading"
                                value={flatSharedCurr}
                                onChange={e => setFlatSharedCurr(e.target.value)}
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            This flat has one shared EB meter, so this reading is saved for every room in the flat.
                          </p>
                        </div>

                        {/* AC units stay per-room even inside a shared-meter flat. */}
                        {[...flatAcRows]
                          .sort((a, b) => naturalCompare(a.roomNumber, b.roomNumber))
                          .map(row => (
                          <div key={row.roomId} className="eb-dlg-meter">
                            <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
                            <div className="eb-dlg-grid-2">
                              <div className="space-y-1.5">
                                <Label htmlFor={`eb-ac-prev-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                                <Input id={`eb-ac-prev-${row.roomId}`} className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor={`eb-ac-curr-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Current</Label>
                                <Input
                                  id={`eb-ac-curr-${row.roomId}`}
                                  className="rounded-lg bg-white"
                                  inputMode="decimal"
                                  placeholder="Enter AC current reading"
                                  value={row.acCurrentReading}
                                  onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : isFlatMode ? (
                      <div className="eb-dlg-empty">Select a flat above to enter its shared meter reading.</div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Room</Label>
                          <SearchableSelect
                            ariaLabel="Room"
                            noun="room"
                            value={formRoomId}
                            onChange={setFormRoomId}
                            options={dialogRoomOptions}
                            disabled={canPickBranch && !formBranchId}
                            placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"}
                            searchPlaceholder="Search room..."
                            emptyText={
                              dialogStandaloneRooms.length === 0
                                ? "No standalone rooms in this branch — select a flat above instead"
                                : "No room found"
                            }
                          />
                        </div>

                        <div className="eb-dlg-grid-2" style={{ marginTop: 14 }}>
                          <div className="space-y-1.5">
                            <Label htmlFor="eb-room-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
                            <Input
                              id="eb-room-prev"
                              className="rounded-lg"
                              placeholder="Previous"
                              value={formPrevReading}
                              readOnly
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="eb-room-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
                            <Input id="eb-room-curr" className="rounded-lg" inputMode="decimal" placeholder="Current" value={formCurrReading}
                              onChange={e => setFormCurrReading(e.target.value)} />
                          </div>
                        </div>

                        {/* ROOM property: AC room == non-AC room → AC Previous / AC Current are hidden. */}
                        {!isRoomMode && selectedRoomObj?.hostelType === "AC" && (
                          <div className="eb-dlg-grid-2" style={{ marginTop: 14 }}>
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-room-ac-prev" className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                              <Input id="eb-room-ac-prev" className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-room-ac-curr" className="text-xs font-medium text-muted-foreground">AC Current</Label>
                              <Input id="eb-room-ac-curr" className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
                                onChange={e => setFormAcCurr(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    </div>

                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">3</span>Unit rate</div>
                      <div className="eb-dlg-seg" role="group" aria-label="Rate mode">
                        <button type="button" aria-pressed={!manualMode} onClick={() => setManualMode(false)}>Automatic</button>
                        <button type="button" aria-pressed={manualMode} onClick={() => setManualMode(true)}>Manual</button>
                      </div>
                    {manualMode && (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="eb-unit-rate" className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
                        {(!formFlatId || formFlatId === "all") ? (
                          <Input id="eb-unit-rate" className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
                            onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                            placeholder="Enter rate for this room" />
                        ) : (
                          // One meter, one rate — applies to the whole flat.
                          <Input id="eb-unit-rate" className="rounded-lg" type="number" value={manualRate}
                            onChange={e => setManualRate(Number(e.target.value))}
                            placeholder="Enter unit rate for this flat's shared meter" />
                        )}
                      </div>
                    )}
                    </div>
                  </div>

                  <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                    <Button className="rounded-lg bg-[#5200FF] text-white hover:bg-[#4200cc]" onClick={handleAdd} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Reading"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* ── Bill Dialog */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>EB Bill - Room {billRoom}</DialogTitle>
              <DialogDescription>Tenant wise electricity bill</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {tenantBills.length === 0 && (
                <p className="text-sm text-muted-foreground">No tenant bill found</p>
              )}
              {tenantBills.map((bill, i) => (
                <div key={i} className="flex justify-between border p-3 rounded-lg">
                  <div>
                    <p className="font-medium">{bill.tenantName || bill.name}</p>
                    <p className="text-sm text-muted-foreground">{bill.acUser ? "AC User" : "Non-AC User"}</p>
                  </div>
                  <div className="font-semibold">₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" className="rounded-lg">Close</Button></DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
          <div className="relative p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DialogTitle>
              <DialogDescription>
                {isFlatMode
                  ? "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns. Every room of the same flat must carry the same Previous/Current (shared flat meter)."
                  : isRoomMode
                    ? "Upload an Excel file with RoomNumber, Previous, Current, EbRate columns."
                    : "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns."}
              </DialogDescription>
            </DialogHeader>
            <Input className="rounded-lg" type="file" accept=".xlsx, .xls" aria-label="Upload EB readings Excel file" onChange={handleFileUpload} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
              variant={confirmState?.danger ? "destructive" : "default"}
              className={confirmState?.danger ? "rounded-lg bg-red-600 hover:bg-red-700 text-white" : "rounded-lg"}
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

export default EBReadingsPage;