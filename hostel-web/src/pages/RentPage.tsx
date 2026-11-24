import { useEffect, useState, useRef, useMemo, useCallback, useDeferredValue } from "react";
import api from "@/lib/api";

import {
  getRooms,
  getRents,
  getTenants,
  getEBReadings,
  getTenantWiseEBBill,
  generateRent,
  recordPayment,
  getUserRole,
  getBranchId,
  fetchAllPages,
  getPendingDamageSummary,
  getRentDueConfig,
} from "@/lib/store";

import {
  Room,
  Rent,
  Tenant,
  TenantEBBill,
  EBReading,
  MONTHS,
  PAYMENT_MODES,
  PaymentMode,
  RentDueConfig,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { Search, RefreshCw, ChevronRight, ChevronDown, Check, X, MoreHorizontal, Download } from "lucide-react";
import { computeRentBreakdown, type RentBreakdown } from "@/lib/RentCalculation";
import { computeRentDue, NO_DUE_CONFIG, NO_DUE_RESULT, type RentDueResult } from "@/lib/rentDue";
import { parseLocalDate, fmtDate } from "@/lib/rentCycle";
import { previewCycleRent, toISODate, type BranchRentConfig } from "@/lib/rentPreview";

/* ══════════════════════════════════════════════════════════════════
   PERFORMANCE NOTES (why this page is now fast)
   1. fetchAllPages used page size 10 → hundreds of HTTP calls. Now 500
      per request (1–2 calls per list instead of 50+).
   2. Stale-while-revalidate cache: coming back to the page shows the
      last data INSTANTLY, then refreshes in the background.
   3. EB bills are only requested for rooms/flats that really have
      tenants, with limited concurrency, and rows appear as results
      arrive (no waiting for the slowest request).
   4. Payment / Generate only refresh rents + tenants + damages
      ("light" reload) instead of reloading everything.
   5. Lookups use Maps (O(1)) instead of Array.find / filter per row.
   6. Search typing is deferred so it never blocks the UI.

   GENERATE (updated)
   Every row without a rent record now has an ACTIVE "Generate" button,
   and "ALL Generation" includes every row — even when the tenant's
   rent cycle starts after today (e.g. 16 Nov / 17 Nov viewed on 13 Nov).
   The page no longer blocks or skips these. If the backend refuses a
   request, its message is shown in the error toast.

   EXCEL REPORT
   "Download Report" exports EVERY row that matches the current filters
   (branch / room / month / year / search) — not just the visible page —
   exactly as the table shows them, plus a totals row. It needs the
   `xlsx` (SheetJS) package:  npm install xlsx
   The library is loaded lazily on click, so it does not slow down the page.

   PENDING AMT FIX
   A tenant's check-in pending (Tenant.pendingAmount) used to be loaded
   ONLY when the selected month was the current month, so for a tenant's
   check-in month viewed later (e.g. October while it is November) the
   PENDING AMT column showed "—" and nothing was added to TOTAL.
   Now:
     • the pending is loaded for the current month AND for each tenant's
       own check-in month (when no rent record has been generated yet);
     • in that check-in month it is shown in PENDING AMT and ADDED to TOTAL
       (and therefore to PENDING).

   EB CARRY-OVER (matches the EB Readings page)
   An ACTIVE tenant whose month was never billed (no rent generated) moves
   into the NEXT month's row once that month has an EB reading:
     October  -> Mani only    (121u, ₹1,567)
     November -> Balaji only  (EB ₹2,607 = Oct ₹1,567 + Nov ₹1,040)
   The previous month's bills are fetched too so the carried amount can be
   added to the current month's EB.

   DUE COLUMN (Business Model)
   The DUE column follows the branch's Business Model "Rent Due" mode:
     • FIXED_DUE → DUE column shown; due (days × per-day) is added to TOTAL.
     • NO_DUE    → DUE column hidden; no due is added to TOTAL; the Excel
                   report leaves the Due columns out as well.
   If a NO_DUE branch still has an OLD generated record that carries a due
   amount, the column stays visible so TOTAL always adds up.

   WHOLE RUPEES (payment fix)
   Every amount on this page (rent, EB, damage, due, total, paid, pending)
   is rounded to whole rupees, and a payment must be a whole number of
   rupees that does not exceed the (rounded) outstanding. This matches the
   backend, which rejects paise ("Previous pending dues must be paid in
   whole rupees"). Previously a decimal EB (e.g. ₹409.6) made the table show
   ₹12,410 while the real outstanding was ₹12,409.6, so paying the shown
   amount was blocked.
   ══════════════════════════════════════════════════════════════════ */

const BIG_PAGE = 10;      // rows per request when loading whole lists
const EB_CONCURRENCY = 6;  // parallel EB-bill requests (browser limit is ~6/host)
const CACHE_FRESH_MS = 15_000;

type EBBillRow = TenantEBBill & {
  roomNumber: string;
  flatNumber: string;
  month: number;
  year: number;
};

type PageSnapshot = {
  key: string;
  ts: number;
  rooms: Room[];
  rents: Rent[];
  tenants: Tenant[];
  pendingDamages: Record<number, number>;
  readings: EBReading[];
  ebBills: Map<string, EBBillRow[]>;
};

// Module-level (survives navigating away and back) caches.
let pageCache: PageSnapshot | null = null;
const dueConfigCache = new Map<string, RentDueConfig>();

const currentCacheKey = () =>
  `${sessionStorage.getItem("token")}|${getUserRole()}|${getBranchId()}`;

const getValidCache = (): PageSnapshot | null =>
  pageCache && pageCache.key === currentCacheKey() ? pageCache : null;

type RentRow = {
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  roomNumber: string;
  flatNumber: string;
  displayEB: number;
  ebCarryNote?: string;
  rentPerBed: number;
  damageAmount: number;
  dueAmount?: number;
  dueDays?: number;
  duePerDay?: number;
  total: number;
  paid: number;
  pending: number;
  previousPending: number;
  previousLabel?: string;
  currentPending: number;
  tenantPending?: number;
  checkInRentPending?: number;
  rentRecord: Rent | undefined;
  unitId: number | undefined;
  amount: number;
  paymentStatus?: string;
  isDaily?: boolean;
  advanceEB?: number;
  ebBalance?: number;
  fromInformationalReading?: boolean;
};

function extractRoomNumber(bill: any): string {
  return bill.roomNumber ?? bill.room_number ?? bill.roomNo ?? "";
}

function extractFlatNumber(bill: any): string {
  return bill.flatNumber ?? bill.flat_number ?? bill.flatNo ?? "";
}

const isInformationalReading = (reading: any) =>
  reading?.tenantId != null && reading?.isCheckout === true;

const checkedInAfterMonth = (
  checkInDate: string | null | undefined,
  month: number,
  year: number
): boolean => {
  if (!checkInDate) return false;
  const [cy, cm, cd] = String(checkInDate).slice(0, 10).split("-").map(Number);
  if (!cy || !cm || !cd) return false;
  const monthEnd = new Date(year, month, 0);
  return new Date(cy, cm - 1, cd) > monthEnd;
};

const isCheckInMonth = (
  checkInDate: string | null | undefined,
  month: number,
  year: number
): boolean => {
  if (!checkInDate) return false;
  const [cy, cm] = String(checkInDate).slice(0, 10).split("-").map(Number);
  return cy === year && cm === month;
};

// True only when the Business Model's Rent Due mode is FIXED_DUE.
const isFixedDue = (cfg?: RentDueConfig | null): boolean =>
  String((cfg as any)?.rentDueMode ?? "").toUpperCase() === "FIXED_DUE";

/* ══════════════════════════════════════════════════════════════════
   SEARCHABLE ROOM FILTER (toolbar "All Rooms" dropdown)
   ══════════════════════════════════════════════════════════════════ */
const RoomFilterDropdown = ({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: number | string; label: string }[];
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
    () => [...options].sort((a, b) =>
      String(a.label ?? "").localeCompare(String(b.label ?? ""), undefined, { numeric: true })
    ),
    [options]
  );

  const filtered = useMemo(
    () => (trimmed
      ? sortedOptions.filter((r) => String(r.label ?? "").toLowerCase().includes(trimmed))
      : sortedOptions),
    [sortedOptions, trimmed]
  );

  const items = useMemo(
    () => [
      ...(trimmed ? [] : [{ id: "all", label: "All Rooms" }]),
      ...filtered.map((r) => ({ id: String(r.id), label: String(r.label) })),
    ],
    [filtered, trimmed]
  );

  const selectedLabel =
    value === "all"
      ? "All Rooms"
      : (options.find((r) => String(r.id) === value)?.label ?? "Room");

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

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, closeMenu]);

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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
    <div className="rt-room-dd w-[130px]" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="rt-room-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by room"
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <span className="rt-room-trigger-label">{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className={`rt-room-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="rt-room-menu" style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}>
          <div className="rt-room-search">
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
                className="rt-room-search-clear"
                aria-label="Clear room search"
                onClick={() => { setTerm(""); setActiveIdx(0); inputRef.current?.focus(); }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="rt-room-list" role="listbox" aria-label="Rooms" ref={listRef}>
            {items.map((item, idx) => {
              const isSelected = item.id === value;
              return (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  className={`rt-room-item ${isSelected ? "selected" : ""} ${idx === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => pick(item.id)}
                >
                  <span className="rt-room-check">{isSelected && <Check size={14} aria-hidden="true" />}</span>
                  {item.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="rt-room-empty">No rooms found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ActionCell = ({
  bill,
  rentRecord,
  onGenerate,
  onPayment,
}: {
  bill: RentRow;
  rentRecord: Rent | undefined;
  onGenerate: (bill: RentRow) => void;
  onPayment: (
    rent: Rent,
    mode: PaymentMode,
    amount: number,
    txnId: string,
    bill: RentRow
  ) => void;
}) => {
  const [localMode,   setLocalMode]   = useState<PaymentMode | "">("");
  const [localAmount, setLocalAmount] = useState("");
  const [localTxnId,  setLocalTxnId]  = useState("");

  const handlePay = () => {
    const rawAmount = Number(localAmount);
    if (!localMode) return toast.error("Select payment mode");
    if (!localAmount || isNaN(rawAmount) || rawAmount <= 0)
      return toast.error("Enter valid amount");

    // Payments are collected in whole rupees only (the backend rejects paise).
    if (!Number.isInteger(rawAmount)) {
      return toast.error("Enter the amount in whole rupees (no paise)");
    }
    const inputAmount = rawAmount;

    // Compare against the same whole-rupee outstanding the table shows.
    const outstanding = Math.round(bill.pending);
    if (inputAmount > outstanding) {
      toast.error(`Amount exceeds outstanding ₹${outstanding}.`);
      return;
    }

    onPayment(rentRecord!, localMode as PaymentMode, inputAmount, localTxnId, bill);
    setLocalMode("");
    setLocalAmount("");
    setLocalTxnId("");
  };

  const showTxnId = localMode && localMode !== "CASH";
  const isUnpaid = Boolean(rentRecord) && (
    (rentRecord.paymentStatus || "").toUpperCase() !== "PAID" ||
    (bill.tenantPending ?? 0) > 0 ||
    bill.previousPending > 0
  );

  const isSettledDailyNoAction =
    !rentRecord && bill.isDaily && (bill.ebBalance ?? 0) >= 0 && (bill.tenantPending ?? 0) <= 0;

  if (isSettledDailyNoAction) {
    return <span className="text-[11px] text-slate-600">No action needed</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!rentRecord && (
        <Button
          size="sm"
          variant="outline"
          aria-label={`Generate rent for ${bill.tenantName}`}
          className="h-7 px-2 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0"
          onClick={() => onGenerate(bill)}
        >
          Generate
        </Button>
      )}

      {isUnpaid && (
        <div className="grid grid-cols-2 items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-md w-full">
          <Select
            value={localMode}
            onValueChange={(v: PaymentMode) => setLocalMode(v)}
          >
            <SelectTrigger
              aria-label={`Payment mode for ${bill.tenantName}`}
              className="w-full min-w-0 h-9 text-sm border-slate-200 focus:ring-0 shadow-none px-2 bg-white"
            >
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode} className="text-sm">{mode}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            placeholder="Amt"
            aria-label={`Payment amount for ${bill.tenantName}`}
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="border border-slate-200 rounded-md px-2 h-9 w-full min-w-0 text-sm bg-white outline-none focus:border-indigo-400"
          />

          {showTxnId && (
            <input
              type="text"
              placeholder="Txn ID"
              aria-label={`Transaction ID for ${bill.tenantName}`}
              value={localTxnId}
              onChange={(e) => setLocalTxnId(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="col-span-2 border border-slate-200 rounded-md px-2 h-9 w-full min-w-0 text-sm bg-white outline-none focus:border-indigo-400"
            />
          )}

          <Button
            size="sm"
            aria-label={`Record payment for ${bill.tenantName}`}
            className="col-span-2 w-full h-9 px-3 text-sm font-semibold bg-green-700 hover:bg-green-800"
            onClick={handlePay}
          >
            Pay
          </Button>
        </div>
      )}

    </div>
  );
};

const RentPage = () => {
  const role      = getUserRole()?.toUpperCase();
  const branchId  = getBranchId();
  const hasAccess = true;

  // Instant first paint: hydrate from the module cache when it is valid.
  const initialCache = useMemo(() => getValidCache(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [rooms,          setRooms]          = useState<Room[]>(initialCache?.rooms ?? []);
  const [rents,          setRents]          = useState<Rent[]>(initialCache?.rents ?? []);
  const [tenants,        setTenants]        = useState<Tenant[]>(initialCache?.tenants ?? []);
  const [loaded,         setLoaded]         = useState<boolean>(!!initialCache);
  const [selectedBranch, setSelectedBranch] = useState(
    role !== "ADMIN" && branchId ? String(branchId) : "all"
  );
  const [selectedRoom, setSelectedRoom] = useState("all");

  const [dueConfigByBranch, setDueConfigByBranch] =
    useState<Map<string, RentDueConfig>>(() => new Map(dueConfigCache));

  const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(
    () => new Map(initialCache?.ebBills ?? [])
  );
  const ebBillsMapRef = useRef(ebBillsMap);
  ebBillsMapRef.current = ebBillsMap;

  const [allEBReadings, setAllEBReadings] = useState<EBReading[]>(initialCache?.readings ?? []);

  const [pendingDamageMap, setPendingDamageMap] = useState<Map<number, number>>(
    () =>
      new Map(
        Object.entries(initialCache?.pendingDamages ?? {}).map(([k, v]) => [Number(k), Number(v)])
      )
  );

  const [search, setSearch] = useState("");
  // Typing in the search box never blocks the UI: heavy row building uses the deferred value.
  const deferredSearch = useDeferredValue(search);
  const [month,  setMonth]  = useState(new Date().getMonth() + 1);
  const [year,   setYear]   = useState(new Date().getFullYear());

  // True while the Excel report is being built (disables the button).
  const [exporting, setExporting] = useState(false);

  // Cached keys are treated as already fetched until a full reload clears them.
  const fetchedEBKeys = useRef<Set<string>>(new Set(initialCache ? initialCache.ebBills.keys() : []));
  const ebRunIds      = useRef<Map<string, number>>(new Map());
  const loadingRef    = useRef(false);
  const queuedRef     = useRef<"none" | "light" | "full">("none");

  /* ── helpers ── */
  const normalizeStatus = (status?: string) => (status || "").toUpperCase();

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const yearOptions = Array.from(
    { length: 6 },
    (_, index) => currentYear - 5 + index
  );

  const isFuturePeriod =
    year > currentYear || (year === currentYear && month > currentMonth);

  const isCurrentPeriod = year === currentYear && month === currentMonth;

  useEffect(() => {
    if (year > currentYear) {
      setYear(currentYear);
      setMonth(currentMonth);
    } else if (year === currentYear && month > currentMonth) {
      setMonth(currentMonth);
    }
  }, [month, year, currentMonth, currentYear]);

  const ebKey = `${month}-${year}`;

  // Previous / next month of the selected period (EB carry-over).
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const prevKey   = `${prevMonth}-${prevYear}`;
  const prevLabel = new Date(prevYear, prevMonth - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  // Raw EB bills of the selected month exactly as the backend returned them.
  const rawEbBills: EBBillRow[] = useMemo(() => {
    if (isFuturePeriod) return [];
    return ebBillsMap.get(ebKey) ?? [];
  }, [ebBillsMap, ebKey, isFuturePeriod]);

  // EB for the selected period (and the previous month, used for the
  // carry-over) is still being fetched.
  const ebLoading =
    !isFuturePeriod &&
    rooms.length > 0 &&
    (!ebBillsMap.has(ebKey) || !ebBillsMap.has(prevKey));

  /* ── O(1) lookup indexes (replace Array.find / filter inside row loops) ── */
  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  const roomByNumber = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => { if (!m.has(r.roomNumber)) m.set(r.roomNumber, r); });
    return m;
  }, [rooms]);

  const getRoomObj  = (roomNumber: string) => roomByNumber.get(roomNumber);
  const getRoomById = (roomId: string | number) => roomById.get(String(roomId));

  const resolveRoom = (roomNumber: string, roomId?: string | number): Room | undefined =>
    getRoomObj(roomNumber) ?? (roomId ? getRoomById(roomId) : undefined);

  const rentsByTenant = useMemo(() => {
    const m = new Map<number, Rent[]>();
    rents.forEach((r) => {
      const k = Number(r.tenantId);
      const arr = m.get(k);
      if (arr) arr.push(r); else m.set(k, [r]);
    });
    return m;
  }, [rents]);

  const tenantNameMap = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((t) => map.set(Number(t.id), t.name));
    return map;
  }, [tenants]);

  const tenantPhoneMap = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((t) => map.set(Number(t.id), t.phone ?? ""));
    return map;
  }, [tenants]);

  const tenantMap = useMemo(() => {
    const map = new Map<number, Tenant>();
    tenants.forEach((t) => map.set(Number(t.id), t));
    return map;
  }, [tenants]);

  // Tenants grouped by room / by flat, so occupant lookups are not O(n²).
  const tenantsByRoomId = useMemo(() => {
    const m = new Map<string, Tenant[]>();
    tenants.forEach((t) => {
      const k = String(t.roomId);
      const arr = m.get(k);
      if (arr) arr.push(t); else m.set(k, [t]);
    });
    return m;
  }, [tenants]);

  const tenantsByFlatId = useMemo(() => {
    const m = new Map<string, Tenant[]>();
    tenants.forEach((t) => {
      const room = roomById.get(String(t.roomId));
      if (room?.flatId == null) return;
      const k = String(room.flatId);
      const arr = m.get(k);
      if (arr) arr.push(t); else m.set(k, [t]);
    });
    return m;
  }, [tenants, roomById]);

  const getOccupants = (room: Room | undefined, rawRoomId: any): Tenant[] => {
    const flatId = room?.flatId ?? null;
    return flatId != null
      ? tenantsByFlatId.get(String(flatId)) ?? []
      : tenantsByRoomId.get(String(rawRoomId)) ?? [];
  };

  /* ── EB BILLS USED BY THE PAGE (after carry-over) ──
     • DEFER: an ACTIVE monthly tenant whose selected-month rent is not
       generated AND whose next month already has an EB reading is hidden
       here; his share moves into the next month (e.g. Balaji in October).
     • CARRY: an ACTIVE monthly tenant whose previous-month rent was never
       generated gets last month's EB added on top of this month's EB
       (e.g. Balaji in November: ₹1,567 + ₹1,040 = ₹2,607).
     Checked-out tenants are never moved (Mani stays in October). */
  const ebBills: EBBillRow[] = useMemo(() => {
    if (isFuturePeriod) return rawEbBills;

    const prevBills = ebBillsMap.get(prevKey) ?? [];

    const billedThis = new Set(
      rents
        .filter((x) => Number(x.rentMonth) === month && Number(x.rentYear) === year)
        .map((x) => Number(x.tenantId))
    );
    const billedPrev = new Set(
      rents
        .filter((x) => Number(x.rentMonth) === prevMonth && Number(x.rentYear) === prevYear)
        .map((x) => Number(x.tenantId))
    );

    // Does this tenant's flat / room have a reading saved for the NEXT month?
    const nextMonthHasReading = (tenant: Tenant): boolean => {
      const room = roomById.get(String(tenant.roomId));
      return allEBReadings.some(
        (x: any) =>
          Number(x.month) === nextMonth &&
          Number(x.year) === nextYear &&
          x.isCheckout !== true &&
          (room?.flatId != null
            ? Number(x.flatId) === Number(room.flatId)
            : Number(x.roomId) === Number(tenant.roomId))
      );
    };

    const out: EBBillRow[] = [];
    for (const b of rawEbBills) {
      const bAny = b as any;
      if (bAny.tenantId == null) {
        out.push(b);
        continue;
      }

      const tid = Number(bAny.tenantId);
      const tenant = tenantMap.get(tid);
      const movable =
        !!tenant && tenant.status !== "Checked_Out" && tenant.tenantStay !== "DAILY";

      if (movable && !billedThis.has(tid) && nextMonthHasReading(tenant!)) {
        continue; // this month's share is billed in the next month
      }

      if (movable && !billedPrev.has(tid)) {
        const pb = prevBills.find((p: any) => Number(p.tenantId) === tid) as any;
        const amt = Number(pb?.amount ?? 0);
        if (pb && amt > 0) {
          out.push({
            ...b,
            amount: Number(bAny.amount ?? 0) + amt,
            carriedAmount: amt,
            carriedLabel: prevLabel,
          } as any);
          continue;
        }
      }

      out.push(b);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rawEbBills,
    ebBillsMap,
    prevKey,
    rents,
    month,
    year,
    prevMonth,
    prevYear,
    nextMonth,
    nextYear,
    prevLabel,
    tenantMap,
    roomById,
    allEBReadings,
    isFuturePeriod,
  ]);

  /* Tenant.pendingAmount (check-in pending / carried-over pending).
     It stays on the tenant until the first rent is generated (the backend then
     converts it into rent credit). So it must be shown:
       • in the CURRENT period, and
       • in any past period from the tenant's check-in month onward, as long as
         the tenant has NO rent record yet for that period or any earlier one
         (e.g. joined 16-Sep, nothing generated -> still visible in Oct).
     Once a rent exists up to the viewed month, old months are left alone. */
  const tenantPendingMap = useMemo(() => {
    const map = new Map<number, number>();
    const viewIdx = year * 12 + month;
    tenants.forEach((t) => {
      const raw = Number(t.pendingAmount ?? 0);
      if (isCurrentPeriod) {
        map.set(Number(t.id), raw);
        return;
      }
      if (t.tenantStay === "DAILY" || !t.checkInDate) return;
      const [cy, cm] = String(t.checkInDate).slice(0, 10).split("-").map(Number);
      if (!cy || !cm) return;
      if (cy * 12 + cm > viewIdx) return; // joined after the viewed month
      const hasRentUpToView = (rentsByTenant.get(Number(t.id)) ?? []).some(
        (r) => Number(r.rentYear) * 12 + Number(r.rentMonth) <= viewIdx
      );
      if (!hasRentUpToView) map.set(Number(t.id), raw);
    });
    return map;
  }, [tenants, isCurrentPeriod, month, year, rentsByTenant]);

  const tenantRentMap = useMemo(() => {
    const map = new Map<number, number>();
    tenants.forEach((t) => {
      if (t.monthlyRent != null && t.monthlyRent > 0) {
        map.set(Number(t.id), Number(t.monthlyRent));
      }
    });
    return map;
  }, [tenants]);

  const resolveTenantName = (tenantId: number): string =>
    tenantNameMap.get(tenantId) ?? `Tenant ${tenantId}`;

  const getCyclePreview = (
    tenantId: number,
    room?: Room,
    forMonth = month,
    forYear = year
  ) => {
    const tenant = tenantMap.get(Number(tenantId));
    if (!tenant || isDailyTenant(tenant) || !tenant.checkInDate) return null;
    const cfg = dueConfigByBranch.get(String(room?.unitId)) as unknown as BranchRentConfig | undefined;
    const tenantRent = tenantRentMap.get(Number(tenantId));
    const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
    return previewCycleRent({
      monthlyRent: flatRent,
      checkIn: parseLocalDate(tenant.checkInDate),
      month: forMonth,
      year: forYear,
      config: cfg,
    });
  };

  // Whole rupees: the rent shown / billed never carries paise.
  const resolveTenantRent = (tenantId: number, room?: Room, forMonth = month, forYear = year): number => {
    const cyc = getCyclePreview(tenantId, room, forMonth, forYear);
    if (cyc) return Math.round(cyc.rentAmount);

    const tenantRent = tenantRentMap.get(Number(tenantId));
    const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
    const tenant = tenantMap.get(Number(tenantId));
    if (!tenant?.checkInDate) return Math.round(flatRent);
    return Math.round(computeRentBreakdown(flatRent, tenant.checkInDate, forMonth, forYear).rentAmount);
  };

  const resolveTenantRentBreakdown = (
    tenantId: number,
    room?: Room,
    forMonth = month,
    forYear = year
  ): RentBreakdown => {
    const tenantRent = tenantRentMap.get(Number(tenantId));
    const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
    const tenant = tenantMap.get(Number(tenantId));
    return computeRentBreakdown(flatRent, tenant?.checkInDate, forMonth, forYear);
  };

  const resolveTenantDue = (
    tenantId: number,
    room: Room | undefined,
    rentRecord: Rent | undefined
  ): RentDueResult => {
    // A generated record keeps what was billed.
    if (rentRecord) {
      return {
        dueDate: rentRecord.dueDate ?? null,
        dueDays: Number(rentRecord.dueDays ?? 0),
        dueAmount: Math.round(Number(rentRecord.dueAmount ?? 0)),
        perDay: Number(rentRecord.duePerDay ?? 0),
      };
    }
    const tenant = tenantMap.get(Number(tenantId));
    if (!tenant || isDailyTenant(tenant)) return NO_DUE_RESULT;

    // NO_DUE (or config not loaded yet) => no due at all.
    const cfg = dueConfigByBranch.get(String(room?.unitId)) ?? NO_DUE_CONFIG;
    if (!isFixedDue(cfg)) return NO_DUE_RESULT;

    const cyc = getCyclePreview(tenantId, room);
    if (cyc) {
      return {
        dueDate: cyc.dueDate ? toISODate(cyc.dueDate) : null,
        dueDays: cyc.dueDays,
        dueAmount: Math.round(cyc.dueAmount),
        perDay: cyc.duePerDay,
      } as RentDueResult;
    }

    const computed = computeRentDue(cfg, tenant.checkInDate, month, year);
    return { ...computed, dueAmount: Math.round(computed.dueAmount) } as RentDueResult;
  };

  const isDailyTenant = (tenant?: Tenant): boolean => tenant?.tenantStay === "DAILY";

  const computeDailyAdvance = (tenant: Tenant) => {
    const advanceEB = tenant.ebAmount ?? 0;
    const advanceRent =
      tenant.totalAmount != null
        ? tenant.totalAmount - advanceEB
        : (tenant.amountPerDay ?? 0) * (tenant.noOfDays ?? 0);
    return { advanceRent, advanceEB };
  };

  const splitCheckInPending = (tenantId: number, rent: number) => {
    const tenant = tenantMap.get(tenantId);
    const shown  = tenantPendingMap.get(tenantId) ?? 0;
    if (!tenant || isDailyTenant(tenant) || !isCheckInMonth(tenant.checkInDate, month, year)) {
      return { extraPending: shown, rentCredit: 0 };
    }
    const raw = Number(tenant.pendingAmount ?? 0);
    return {
      rentCredit:   Math.max(0, rent - raw),
      extraPending: isCurrentPeriod ? Math.max(0, raw - rent) : 0,
    };
  };

  const tenantLastBilledReadingAll = useMemo(() => {
    const map = new Map<number, number>();
    allEBReadings.forEach((r: any) => {
      if (r.tenantId == null) return;
      const val = Number(r.currentReading ?? 0);
      const key = Number(r.tenantId);
      const prevMax = map.get(key);
      if (prevMax == null || val > prevMax) map.set(key, val);
    });
    return map;
  }, [allEBReadings]);

  const calculateInformationalShare = useCallback(
    (
      targetTenantId: number,
      prevReading: number,
      currReading: number,
      rate: number,
      occupants: Tenant[]
    ): { units: number; amount: number } => {
      if (!(currReading > prevReading) || occupants.length === 0) {
        return { units: 0, amount: 0 };
      }

      const isPresentInSegment = (t: Tenant, segStart: number, segEnd: number): boolean => {
        const join = Number(t.joinReading);
        if (!Number.isFinite(join) || join > segStart) return false;

        if (Number(t.id) === targetTenantId) {
          return currReading >= segEnd;
        }

        const lastBilled = tenantLastBilledReadingAll.get(Number(t.id));
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
    [tenantLastBilledReadingAll]
  );

  const informationalByTenant = useMemo(() => {
    const map = new Map<number, any>();
    allEBReadings.forEach((r: any) => {
      if (Number(r.month) !== month || Number(r.year) !== year) return;
      if (!isInformationalReading(r)) return;
      const tid = Number(r.tenantId);
      const existing = map.get(tid);
      if (!existing || Number(r.id ?? 0) > Number(existing.id ?? 0)) {
        map.set(tid, r);
      }
    });
    return map;
  }, [allEBReadings, month, year]);

  const resolveInformationalAmount = useCallback(
    (tenantId: number, r: any): number => {
      const storedUnits  = Number(r.unitsConsumed ?? 0);
      const storedAmount = Number(r.ebAmount ?? 0);
      if (storedUnits || storedAmount) return storedAmount;

      const prevReading = Number(r.previousReading ?? 0);
      const currReading = Number(r.currentReading ?? 0);
      const rate = Number(r.ebRate ?? 0) || 13;
      const room = r.roomId != null ? roomById.get(String(r.roomId)) : undefined;
      const occupants = getOccupants(room, r.roomId);

      return calculateInformationalShare(tenantId, prevReading, currReading, rate, occupants).amount;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomById, tenantsByRoomId, tenantsByFlatId, calculateInformationalShare]
  );

  const resolveTenantEB = (
    tenant: Tenant | undefined,
    room: Room | undefined,
    liveEB: number,
    infoReading: any | undefined,
    tenantId: number
  ): { eb: number; usedInfo: boolean } => {
    if (!infoReading) return { eb: liveEB, usedInfo: false };

    const isCheckedOut = tenant?.status === "Checked_Out";
    const sameRoom =
      infoReading.roomId != null &&
      room != null &&
      String(infoReading.roomId) === String(room.id);

    if (isCheckedOut || sameRoom) {
      return { eb: liveEB, usedInfo: false };
    }

    return {
      eb: liveEB + resolveInformationalAmount(tenantId, infoReading),
      usedInfo: true,
    };
  };

  /* ── DATA LOADING ──
     full  : rooms + rents + tenants + damages + EB readings (first load / manual refresh)
     light : rents + tenants + damages only (after Generate / Payment) */
  const reload = async (mode: "full" | "light" = "full") => {
    if (loadingRef.current) {
      // Never drop a refresh requested while another one is running.
      if (queuedRef.current !== "full") queuedRef.current = mode;
      return;
    }
    loadingRef.current = true;
    try {
      if (mode === "light") {
        const [rentList, tenantList, pendingDamages] = await Promise.all([
          fetchAllPages<Rent>(getRents, BIG_PAGE),
          fetchAllPages<Tenant>(getTenants, BIG_PAGE),
          getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
        ]);
        setRents(rentList);
        setTenants(tenantList);
        setPendingDamageMap(
          new Map(Object.entries(pendingDamages).map(([k, v]) => [Number(k), Number(v)]))
        );
        const cache = getValidCache();
        if (cache) {
          cache.rents = rentList;
          cache.tenants = tenantList;
          cache.pendingDamages = pendingDamages;
          cache.ts = Date.now();
        }
        return;
      }

      const [roomList, rentList, tenantList, pendingDamages, rawReadings] = await Promise.all([
        fetchAllPages<Room>(getRooms, BIG_PAGE),
        fetchAllPages<Rent>(getRents, BIG_PAGE),
        fetchAllPages<Tenant>(getTenants, BIG_PAGE),
        getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
        fetchAllPages<EBReading>(getEBReadings, BIG_PAGE).catch(() => [] as EBReading[]),
      ]);

      const filteredRooms =
        role === "ADMIN"
          ? roomList
          : roomList.filter((room) => String(room.unitId) === String(branchId));

      setRooms(filteredRooms);
      setRents(rentList);
      setTenants(tenantList);
      setPendingDamageMap(
        new Map(Object.entries(pendingDamages).map(([k, v]) => [Number(k), Number(v)]))
      );
      setAllEBReadings(rawReadings);

      // Stale-while-revalidate: keep the EB rows already on screen and only
      // mark the keys as "needs refetch". They are swapped in when fresh.
      fetchedEBKeys.current = new Set();

      const key = currentCacheKey();
      pageCache = {
        key,
        ts: Date.now(),
        rooms: filteredRooms,
        rents: rentList,
        tenants: tenantList,
        pendingDamages,
        readings: rawReadings,
        ebBills: pageCache?.key === key ? pageCache.ebBills : new Map(),
      };
    } catch {
      toast.error("Failed to load data");
    } finally {
      loadingRef.current = false;
      setLoaded(true);
      const queued = queuedRef.current;
      if (queued !== "none") {
        queuedRef.current = "none";
        reload(queued);
      }
    }
  };

  useEffect(() => {
    // Fresh cache (just navigated away and back) → nothing to refetch.
    const cache = getValidCache();
    if (cache && Date.now() - cache.ts < CACHE_FRESH_MS) return;
    reload("full");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Business Model (Rent Due + Billing Mode) per branch. Cached values are used
  // immediately, then refreshed in the background.
  useEffect(() => {
    if (rooms.length === 0) return;
    let cancelled = false;
    const branchIds = [...new Set(rooms.map((r) => String(r.unitId)))];
    Promise.all(
      branchIds.map(async (id): Promise<[string, RentDueConfig]> => {
        try {
          return [id, (await getRentDueConfig(id)) ?? NO_DUE_CONFIG];
        } catch {
          return [id, dueConfigCache.get(id) ?? NO_DUE_CONFIG];
        }
      })
    ).then((entries) => {
      entries.forEach(([id, cfg]) => dueConfigCache.set(id, cfg));
      if (!cancelled) setDueConfigByBranch(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  // EB bills for the selected month AND the previous month (the previous
  // month is needed to carry an unbilled share into the selected month).
  useEffect(() => {
    if (rooms.length === 0) return;
    if (isFuturePeriod) return;

    const ensureEB = (month: number, year: number) => {
      const key = `${month}-${year}`;
      if (fetchedEBKeys.current.has(key)) return;
      fetchedEBKeys.current.add(key);

      const myRun = (ebRunIds.current.get(key) ?? 0) + 1;
      ebRunIds.current.set(key, myRun);
      const stillCurrent = () => ebRunIds.current.get(key) === myRun;

      // Only rooms that have (or had) a tenant who was already checked in by
      // the end of this month need an EB request. Empty rooms are skipped.
      const activeRoomIds = new Set<string>();
      tenants.forEach((t) => {
        if (t.roomId == null) return;
        if (checkedInAfterMonth(t.checkInDate, month, year)) return;
        activeRoomIds.add(String(t.roomId));
      });

      const flatIds = [
        ...new Set(
          rooms
            .filter((r) => r.flatId && activeRoomIds.has(String(r.id)))
            .map((r) => r.flatId as number)
        ),
      ];
      const standaloneRooms = rooms.filter(
        (r) => !r.flatId && activeRoomIds.has(String(r.id))
      );

      const tenantRoomLookup = new Map<number, Room>();
      tenants.forEach((t) => {
        const room = roomById.get(String(t.roomId));
        if (room) tenantRoomLookup.set(Number(t.id), room);
      });

      const roomByNumberLocal = roomByNumber;

      const flatJob = (flatId: number) => async (): Promise<EBBillRow[]> => {
        try {
          const bills = await getTenantWiseEBBill({ flatId, roomId: null, month, year });
          if (!bills || bills.length === 0) return [];

          return bills
            .filter((b: any) => {
              if (b.tenantId != null) {
                const room = tenantRoomLookup.get(Number(b.tenantId));
                if (room) return String(room.flatId) === String(flatId);
              }
              const echoedRoomNumber = extractRoomNumber(b);
              if (echoedRoomNumber) {
                const room = roomByNumberLocal.get(echoedRoomNumber);
                if (room) return String(room.flatId) === String(flatId);
              }
              return false;
            })
            .map((b): EBBillRow => {
              const bAny = b as any;
              let roomNumber = extractRoomNumber(bAny);
              let flatNumber = extractFlatNumber(bAny);

              if (!roomNumber && bAny.tenantId) {
                const room = tenantRoomLookup.get(Number(bAny.tenantId));
                if (room) roomNumber = room.roomNumber;
              }
              if (!flatNumber) flatNumber = String(flatId);

              return { ...b, roomNumber, flatNumber, month, year };
            });
        } catch {
          return [];
        }
      };

      const roomJob = (room: Room) => async (): Promise<EBBillRow[]> => {
        try {
          const bills = await getTenantWiseEBBill({ roomId: room.id, flatId: null, month, year });
          if (!bills || bills.length === 0) return [];

          const roomTenantIds = new Set(
            (tenantsByRoomId.get(String(room.id)) ?? []).map((t) => Number(t.id))
          );

          return bills
            .filter((b: any) => {
              if (b.tenantId != null) return roomTenantIds.has(Number(b.tenantId));
              const echoedRoomNumber = extractRoomNumber(b);
              if (echoedRoomNumber) return echoedRoomNumber === room.roomNumber;
              return false;
            })
            .map((b): EBBillRow => {
              const bAny = b as any;
              const flatNumber =
                extractFlatNumber(bAny) ||
                (room as any).flatNumber ||
                (room as any).flatName ||
                "";
              return { ...b, roomNumber: room.roomNumber, flatNumber, month, year };
            });
        } catch {
          return [];
        }
      };

      const jobs: (() => Promise<EBBillRow[]>)[] = [
        ...flatIds.map(flatJob),
        ...standaloneRooms.map(roomJob),
      ];

      // Merge job results in job order and drop duplicate tenants.
      const merge = (results: (EBBillRow[] | undefined)[]): EBBillRow[] => {
        const seen = new Set<number>();
        const out: EBBillRow[] = [];
        for (const list of results) {
          if (!list) continue;
          for (const b of list as any[]) {
            if (b.tenantId != null) {
              const tid = Number(b.tenantId);
              if (seen.has(tid)) continue;
              seen.add(tid);
            }
            out.push(b);
          }
        }
        return out;
      };

      const publish = (bills: EBBillRow[]) => {
        setEbBillsMap((prev) => {
          const next = new Map(prev);
          next.set(key, bills);
          return next;
        });
      };

      // If this month is already on screen (cached), only swap at the very end
      // to avoid flicker. First-time loads show rows progressively.
      const hadExisting = ebBillsMapRef.current.has(key);

      const run = async () => {
        if (jobs.length === 0) {
          if (stillCurrent()) publish([]);
          return;
        }

        const results: (EBBillRow[] | undefined)[] = new Array(jobs.length);
        let next = 0;
        let sinceFlush = 0;

        const worker = async () => {
          while (true) {
            const i = next++;
            if (i >= jobs.length) return;
            results[i] = await jobs[i]();
            sinceFlush++;
            if (!hadExisting && sinceFlush >= EB_CONCURRENCY && stillCurrent()) {
              sinceFlush = 0;
              publish(merge(results));
            }
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(EB_CONCURRENCY, jobs.length) }, worker)
        );

        if (!stillCurrent()) return;
        const finalBills = merge(results);
        publish(finalBills);

        const cache = getValidCache();
        if (cache) cache.ebBills = new Map(cache.ebBills).set(key, finalBills);
      };

      run().catch(() => {
        toast.error("Failed to load EB data");
        if (stillCurrent()) publish([]);
      });
    };

    ensureEB(month, year);
    ensureEB(prevMonth, prevYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, tenants, month, year, isFuturePeriod]);

  const getRentStatus = (
    tenantId: number,
    roomNumber: string,
    roomId?: string | number
  ): Rent | undefined => {
    const room = resolveRoom(roomNumber, roomId);
    if (!room) return undefined;
    const roomKey = String(room.id);
    const matches = (rentsByTenant.get(tenantId) ?? []).filter(
      (r) =>
        Number(r.rentMonth) === month &&
        Number(r.rentYear) === year &&
        String(r.roomId) === roomKey
    );
    if (matches.length === 0) return undefined;
    const paid = matches.find(
      (r) => normalizeStatus(r.paymentStatus) === "PAID"
    );
    if (paid) return paid;
    const partials = matches.filter(
      (r) => normalizeStatus(r.paymentStatus) === "PARTIAL"
    );
    if (partials.length > 0) {
      return partials.reduce((best, r) =>
        Number(r.paidAmount || 0) > Number(best.paidAmount || 0) ? r : best
      );
    }
    return matches[0];
  };

  const computePreviousPending = (
    tenantId: number,
    beforeMonth: number,
    beforeYear: number
  ): { previousPending: number; prevUnpaidRents: Rent[] } => {
    const prevRents = (rentsByTenant.get(tenantId) ?? []).filter(
      (r) =>
        Number(r.rentYear) < beforeYear ||
        (Number(r.rentYear) === beforeYear &&
          Number(r.rentMonth) < beforeMonth)
    );

    const byKey = new Map<string, Rent>();
    prevRents.forEach((r) => {
      const key      = `${r.roomId}-${r.rentYear}-${r.rentMonth}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, r);
      } else {
        const es = normalizeStatus(existing.paymentStatus);
        const ns = normalizeStatus(r.paymentStatus);
        if (
          ns === "PAID" ||
          (ns === "PARTIAL" && es === "PENDING") ||
          (ns === "PARTIAL" &&
            es === "PARTIAL" &&
            Number(r.paidAmount || 0) > Number(existing.paidAmount || 0))
        ) {
          byKey.set(key, r);
        }
      }
    });

    const prevUnpaidRents = Array.from(byKey.values()).filter(
      (r) => normalizeStatus(r.paymentStatus) !== "PAID"
    );

    // Whole rupees, same as the backend: round total and paid before subtracting.
    const previousPending = prevUnpaidRents.reduce((sum, r) => {
      const rTotal = Math.round(Number(r.totalAmount || 0));
      const rPaid  = Math.round(Number(r.paidAmount  || 0));
      return sum + Math.max(0, rTotal - rPaid);
    }, 0);

    return { previousPending, prevUnpaidRents };
  };

  const previousMonthsLabel = (rs: Rent[]): string =>
    [...rs]
      .sort(
        (a, b) =>
          Number(a.rentYear) - Number(b.rentYear) ||
          Number(a.rentMonth) - Number(b.rentMonth)
      )
      .map((r) => `${MONTHS[Number(r.rentMonth) - 1]?.slice(0, 3)} ${r.rentYear}`)
      .join(", ");

  const filteredBills = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return ebBills.filter((bill) => {
      if (role !== "ADMIN" && branchId) {
        const room =
          getRoomObj(bill.roomNumber) ??
          (() => {
            const bAny = bill as any;
            if (!bAny.tenantId) return undefined;
            const tenant = tenantMap.get(Number(bAny.tenantId));
            return tenant ? getRoomById(tenant.roomId) : undefined;
          })();
        if (!room || String(room.unitId) !== String(branchId)) return false;
      }
      const bAny = bill as any;
      return `${bAny.tenantName ?? ""} ${bill.roomNumber} ${bill.flatNumber}`
        .toLowerCase()
        .includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebBills, role, branchId, roomByNumber, roomById, tenantMap, deferredSearch]);

  const rowData = useMemo((): RentRow[] => {
    if (isFuturePeriod) return [];

    const q = deferredSearch.toLowerCase();
    const mergedInformationalTenantIds = new Set<number>();

    const ebRows: RentRow[] = filteredBills
      .map((bill): RentRow | null => {
      const b = bill as any;

      if (b.tenantId == null) return null;

      let room = resolveRoom(bill.roomNumber);
      if (!room && b.tenantId) {
        const tenant = tenantMap.get(Number(b.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }

      const tenant = tenantMap.get(Number(b.tenantId));
      const rentRecord = getRentStatus(
        b.tenantId,
        bill.roomNumber,
        room?.id
      );

      if (!rentRecord && checkedInAfterMonth(tenant?.checkInDate, month, year)) {
        return null;
      }

      // Whole rupees: EB (units × rate) can carry paise, the page never does.
      const liveEB = Math.round(b.amount ?? 0);

      if (tenant && isDailyTenant(tenant) && !rentRecord) {
        const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
        const ebBalance = Math.round(advanceEB - liveEB);
        const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
        const displayDamage = Math.round(pendingDamageMap.get(Number(b.tenantId)) ?? 0);
        const totalPaidAtCheckIn = Math.round(tenant.totalAmount ?? advanceRent + advanceEB);

        const flatNumber =
          bill.flatNumber ||
          (() => {
            if (!room?.flatId) return "";
            const flatBill = ebBills.find(
              (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
            );
            return flatBill?.flatNumber ?? String(room.flatId);
          })();

        return {
          tenantId:      b.tenantId,
          tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
          tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
          roomNumber:    room?.roomNumber ?? bill.roomNumber,
          flatNumber,
          rentPerBed:    totalPaidAtCheckIn,
          displayEB:     liveEB,
          damageAmount:  displayDamage,
          total:         Math.round(advanceRent) + liveEB + displayDamage + (tenantPendingMap.get(Number(b.tenantId)) ?? 0),
          paid:          totalPaidAtCheckIn,
          previousPending: 0,
          currentPending:  additionalEBDue + displayDamage + (tenantPendingMap.get(Number(b.tenantId)) ?? 0),
          pending:         additionalEBDue + displayDamage + (tenantPendingMap.get(Number(b.tenantId)) ?? 0),
          tenantPending:   tenantPendingMap.get(Number(b.tenantId)) ?? 0,
          rentRecord:      undefined,
          unitId:          room?.unitId,
          amount:          liveEB,
          paymentStatus:   undefined,
          isDaily:         true,
          advanceEB,
          ebBalance,
        };
      }

      const rentPerBed = resolveTenantRent(Number(b.tenantId), room);

      const recordTotal  = rentRecord ? Math.round(Number(rentRecord.totalAmount  || 0)) : 0;
      const recordRent   = rentRecord ? Math.round(Number(rentRecord.rentAmount   || 0)) : rentPerBed;
      const recordEB     = rentRecord ? Math.round(Number(rentRecord.ebAmount     || 0)) : liveEB;
      const recordDamage = rentRecord ? Math.round(Number((rentRecord as any).damageAmount || 0)) : 0;

      const isPaid = normalizeStatus(rentRecord?.paymentStatus) === "PAID";

      let displayEB = rentRecord ? (isPaid ? recordEB : liveEB) : liveEB;

      const infoReading = informationalByTenant.get(Number(b.tenantId));
      if (infoReading && !isPaid) {
        const resolved = resolveTenantEB(tenant, room, displayEB, infoReading, Number(b.tenantId));
        displayEB = resolved.eb;
        if (resolved.usedInfo) mergedInformationalTenantIds.add(Number(b.tenantId));
      }
      displayEB = Math.round(displayEB);

      const displayRent   = rentRecord ? recordRent   : rentPerBed;
      const due = resolveTenantDue(Number(b.tenantId), room, rentRecord);
      const dueAmt = Math.round(due.dueAmount);
      const displayDamage = rentRecord
        ? recordDamage
        : Math.round(pendingDamageMap.get(Number(b.tenantId)) ?? 0);

      const rawTenantPending = tenantPendingMap.get(Number(b.tenantId)) ?? 0;

      // Not generated yet + this is the tenant's own check-in month (current OR
      // past period): the tenant's check-in pending must be SHOWN in PENDING AMT
      // and ADDED to TOTAL.
      const showFullCheckInPending =
        !rentRecord &&
        !!tenant &&
        !isDailyTenant(tenant) &&
        isCheckInMonth(tenant.checkInDate, month, year);

      const { extraPending, rentCredit } = rentRecord
        ? { extraPending: rawTenantPending, rentCredit: 0 }
        : showFullCheckInPending
        ? { extraPending: rawTenantPending, rentCredit: 0 }
        : splitCheckInPending(Number(b.tenantId), displayRent);
      const tenantPendingAmt = Math.round(extraPending);
      const checkInRentPending =
        rentRecord || showFullCheckInPending ? 0 : Math.max(0, Math.round(rawTenantPending - extraPending));

      // Tenant pending is now always added on top of this period's charges.
      const displayTotal  = (rentRecord
        ? (isPaid ? recordTotal : displayRent + displayEB + displayDamage + dueAmt)
        : rentPerBed + displayEB + displayDamage + dueAmt) +
        tenantPendingAmt;

      const currentPaid   = rentRecord ? Math.round(Number(rentRecord.paidAmount || 0)) : Math.round(rentCredit);
      const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

      const currentPending = rentRecord
        ? currentStatus === "PAID"
          ? tenantPendingAmt
          : currentStatus === "PARTIAL"
          ? displayTotal - currentPaid
          : displayTotal
        : Math.max(0, displayTotal - Math.round(rentCredit));

      const { previousPending, prevUnpaidRents } =
        computePreviousPending(Number(b.tenantId), month, year);

      const flatNumber =
        bill.flatNumber ||
        (() => {
          if (!room?.flatId) return "";
          const flatBill = ebBills.find(
            (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
          );
          return flatBill?.flatNumber ?? String(room.flatId);
        })();

      const ebCarryNote =
        !rentRecord && Number(b.carriedAmount ?? 0) > 0
          ? `incl. ${b.carriedLabel}: ₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(b.carriedAmount)))}`
          : undefined;

      return {
        tenantId:      b.tenantId,
        tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
        tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
        roomNumber:    room?.roomNumber ?? bill.roomNumber,
        flatNumber,
        rentPerBed:    displayRent,
        displayEB,
        ebCarryNote,
        damageAmount:  displayDamage,
        dueAmount:     dueAmt,
        dueDays:       due.dueDays,
        duePerDay:     due.perDay,
        total:         displayTotal,
        paid:          currentPaid,
        previousPending,
        previousLabel: previousMonthsLabel(prevUnpaidRents),
        currentPending,
        pending:       previousPending + currentPending,
        tenantPending: tenantPendingAmt,
        checkInRentPending,
        rentRecord,
        unitId:        room?.unitId,
        amount:        displayEB,
        paymentStatus: rentRecord?.paymentStatus,
      };
      })
      .filter((r): r is RentRow => r !== null);

    const ebTenantRoomKeys = new Set(
      filteredBills.map((b) => {
        const bAny = b as any;
        let room = resolveRoom(b.roomNumber);
        if (!room && bAny.tenantId) {
          const tenant = tenantMap.get(Number(bAny.tenantId));
          if (tenant) room = getRoomById(tenant.roomId);
        }
        return `${bAny.tenantId}-${room?.id ?? b.roomNumber}`;
      })
    );

    const currentMonthRentMap = new Map<string, Rent>();
    rents.forEach((r) => {
      if (Number(r.rentMonth) !== month || Number(r.rentYear) !== year) return;
      const key      = `${r.tenantId}-${r.roomId}`;
      const existing = currentMonthRentMap.get(key);
      if (!existing) {
        currentMonthRentMap.set(key, r);
      } else {
        const es = normalizeStatus(existing.paymentStatus);
        const ns = normalizeStatus(r.paymentStatus);
        if (
          ns === "PAID" ||
          (ns === "PARTIAL" && es === "PENDING") ||
          (ns === "PARTIAL" &&
            es === "PARTIAL" &&
            Number(r.paidAmount || 0) > Number(existing.paidAmount || 0))
        ) {
          currentMonthRentMap.set(key, r);
        }
      }
    });

    const orphanRows: RentRow[] = Array.from(currentMonthRentMap.values())
      .filter((r) => {
        const key = `${r.tenantId}-${r.roomId}`;
        if (ebTenantRoomKeys.has(key)) return false;

        if (!tenantMap.has(Number(r.tenantId))) return false;

        if (role !== "ADMIN" && branchId) {
          const room = getRoomById(r.roomId);
          if (!room || String(room.unitId) !== String(branchId)) return false;
        }
        return true;
      })
      .filter((r) => {
        const room         = getRoomById(r.roomId);
        const resolvedName = resolveTenantName(Number(r.tenantId));
        const searchStr    = `${resolvedName} ${room?.roomNumber ?? ""} ${
          (room as any)?.flatNumber ?? ""
        }`.toLowerCase();
        return searchStr.includes(q);
      })
      .map((r) => {
        const room        = getRoomById(r.roomId);
        const recordTotal  = Math.round(Number(r.totalAmount || 0));
        const recordRent   = Math.round(Number(r.rentAmount  || 0));
        const recordEB     = Math.round(Number(r.ebAmount    || 0));
        const recordDamage = Math.round(Number((r as any).damageAmount || 0));
        const currentPaid  = Math.round(Number(r.paidAmount  || 0));
        const status       = normalizeStatus(r.paymentStatus);

        const orphanTenantPending = tenantPendingMap.get(Number(r.tenantId)) ?? 0;
        const currentPending =
          (status === "PAID"
            ? 0
            : status === "PARTIAL"
            ? recordTotal - currentPaid
            : recordTotal) + orphanTenantPending;

        const { previousPending, prevUnpaidRents } = computePreviousPending(
          Number(r.tenantId),
          month,
          year
        );

        return {
          tenantId:        Number(r.tenantId),
          tenantName:      resolveTenantName(Number(r.tenantId)),
          tenantPhone:     tenantPhoneMap.get(Number(r.tenantId)) ?? "",
          roomNumber:      room?.roomNumber ?? String(r.roomId),
          flatNumber:      (room as any)?.flatNumber ?? "-",
          displayEB:       recordEB,
          rentPerBed:      recordRent,
          damageAmount:    recordDamage,
          dueAmount:       Math.round(Number(r.dueAmount ?? 0)),
          dueDays:         Number(r.dueDays ?? 0),
          duePerDay:       Number(r.duePerDay ?? 0),
          total:           recordTotal + orphanTenantPending,
          paid:            currentPaid,
          previousPending,
          previousLabel:   previousMonthsLabel(prevUnpaidRents),
          currentPending,
          pending:         previousPending + currentPending,
          tenantPending:   tenantPendingMap.get(Number(r.tenantId)) ?? 0,
          rentRecord:      r,
          unitId:          room?.unitId,
          amount:          recordEB,
          paymentStatus:   r.paymentStatus,
        };
      });

    const informationalRows: RentRow[] = Array.from(informationalByTenant.entries())
      .map(([tenantIdRaw, r]) => {
        const tenantId = Number(tenantIdRaw);
        if (mergedInformationalTenantIds.has(tenantId)) return null;

        const tenant   = tenantMap.get(tenantId);

        if (!tenant || !isDailyTenant(tenant)) return null;

        const room =
          (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
          (tenant.roomId != null ? getRoomById(tenant.roomId) : undefined);

        if (role !== "ADMIN" && branchId && (!room || String(room.unitId) !== String(branchId))) {
          return null;
        }

        const resolvedName = resolveTenantName(tenantId);
        const searchStr = `${resolvedName} ${room?.roomNumber ?? ""} ${
          (room as any)?.flatNumber ?? ""
        }`.toLowerCase();
        if (!searchStr.includes(q)) return null;

        const prevReading = Number(r.previousReading ?? 0);
        const currReading = Number(r.currentReading ?? 0);
        const rate = Number(r.ebRate ?? 0) || 13;

        const occupants = getOccupants(room, r.roomId);

        const storedUnits  = Number(r.unitsConsumed ?? 0);
        const storedAmount = Number(r.ebAmount ?? 0);

        let grossAmount = storedAmount;
        if (!storedUnits && !storedAmount) {
          const computed = calculateInformationalShare(
            tenantId, prevReading, currReading, rate, occupants
          );
          grossAmount = computed.amount;
        }
        grossAmount = Math.round(grossAmount);

        const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
        const ebBalance = Math.round(advanceEB - grossAmount);
        const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
        const displayDamage = Math.round(pendingDamageMap.get(tenantId) ?? 0);
        const totalPaidAtCheckIn = Math.round(tenant.totalAmount ?? advanceRent + advanceEB);

        const flatNumber =
          (room as any)?.flatNumber ??
          (room?.flatId ? String(room.flatId) : "");

        return {
          tenantId,
          tenantName:    resolvedName,
          tenantPhone:   tenantPhoneMap.get(tenantId) ?? "",
          roomNumber:    room?.roomNumber ?? "—",
          flatNumber,
          rentPerBed:    totalPaidAtCheckIn,
          displayEB:     grossAmount,
          damageAmount:  displayDamage,
          total:         Math.round(advanceRent) + grossAmount + displayDamage + (tenantPendingMap.get(tenantId) ?? 0),
          paid:          totalPaidAtCheckIn,
          previousPending: 0,
          currentPending:  additionalEBDue + displayDamage + (tenantPendingMap.get(tenantId) ?? 0),
          pending:         additionalEBDue + displayDamage + (tenantPendingMap.get(tenantId) ?? 0),
          tenantPending:   tenantPendingMap.get(tenantId) ?? 0,
          rentRecord:      undefined,
          unitId:          room?.unitId,
          amount:          grossAmount,
          paymentStatus:   undefined,
          isDaily:         true,
          advanceEB,
          ebBalance,
          fromInformationalReading: true,
        } as RentRow;
      })
      .filter((r): r is RentRow => r !== null);

    const coveredTenantIds = new Set<number>([
      ...ebRows.map((r) => r.tenantId),
      ...orphanRows.map((r) => r.tenantId),
      ...informationalRows.map((r) => r.tenantId),
    ]);

    const damageOnlyRows: RentRow[] = Array.from(pendingDamageMap.entries())
      .filter(
        ([tenantId, amount]) =>
          amount > 0 &&
          !coveredTenantIds.has(Number(tenantId)) &&
          tenantMap.has(Number(tenantId))
      )
      .map(([tenantId]) => {
        const tenant = tenantMap.get(Number(tenantId));
        if (!tenant) return null;

        const room   = getRoomById(tenant.roomId);

        if (role !== "ADMIN" && branchId && (!room || String(room.unitId) !== String(branchId))) {
          return null;
        }

        const resolvedName = resolveTenantName(Number(tenantId));
        const searchStr = `${resolvedName} ${room?.roomNumber ?? ""} ${
          (room as any)?.flatNumber ?? ""
        }`.toLowerCase();
        if (!searchStr.includes(q)) return null;

        const damageAmount = Math.round(pendingDamageMap.get(Number(tenantId)) ?? 0);
        const rentPerBed = tenant && isDailyTenant(tenant)
          ? Math.round(tenant.totalAmount ?? (() => {
              const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
              return advanceRent + advanceEB;
            })())
          : resolveTenantRent(Number(tenantId), room);

        const { extraPending, rentCredit } = splitCheckInPending(Number(tenantId), rentPerBed);
        const damageOnlyTotal   = rentPerBed + damageAmount + Math.round(extraPending);
        const damageOnlyPending = Math.max(0, damageOnlyTotal - Math.round(rentCredit));

        return {
          tenantId:      Number(tenantId),
          tenantName:    resolvedName,
          tenantPhone:   tenantPhoneMap.get(Number(tenantId)) ?? "",
          roomNumber:    room?.roomNumber ?? "—",
          flatNumber:    (room as any)?.flatNumber ?? "-",
          displayEB:     0,
          rentPerBed,
          damageAmount,
          total:         damageOnlyTotal,
          paid:          Math.round(rentCredit),
          previousPending: 0,
          currentPending:  damageOnlyPending,
          pending:         damageOnlyPending,
          tenantPending:   Math.round(extraPending),
          rentRecord:      undefined,
          unitId:          room?.unitId,
          amount:          0,
          paymentStatus:   undefined,
        } as RentRow;
      })
      .filter((r): r is RentRow => r !== null);

    let allRows = [...ebRows, ...orphanRows, ...informationalRows, ...damageOnlyRows];

    if (selectedBranch !== "all") {
      allRows = allRows.filter((r) => String(r.unitId) === selectedBranch);
    }

    if (selectedRoom !== "all") {
      allRows = allRows.filter((r) => {
        const room = getRoomObj(r.roomNumber) ?? getRoomById(r.rentRecord?.roomId ?? "");
        return room ? String(room.id) === selectedRoom : false;
      });
    }

    allRows = [...allRows].sort((a, b) => {
      const ra = a.roomNumber && a.roomNumber !== "—" ? a.roomNumber : null;
      const rb = b.roomNumber && b.roomNumber !== "—" ? b.roomNumber : null;
      if (ra === null && rb === null) return a.tenantName.localeCompare(b.tenantName);
      if (ra === null) return 1;
      if (rb === null) return -1;

      const byRoom = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: "base" });
      if (byRoom !== 0) return byRoom;

      return a.tenantName.localeCompare(b.tenantName, undefined, { sensitivity: "base" });
    });

    return allRows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredBills,
    ebBills,
    rooms,
    roomById,
    roomByNumber,
    tenants,
    tenantMap,
    tenantsByRoomId,
    tenantsByFlatId,
    rentsByTenant,
    selectedBranch,
    selectedRoom,
    month,
    year,
    isFuturePeriod,
    isCurrentPeriod,
    rents,
    deferredSearch,
    tenantNameMap,
    tenantRentMap,
    tenantPendingMap,
    pendingDamageMap,
    dueConfigByBranch,
    allEBReadings,
    calculateInformationalShare,
    informationalByTenant,
    resolveInformationalAmount,
  ]);

  const roomOptions = useMemo(() => {
    const scoped =
      selectedBranch === "all"
        ? rooms
        : rooms.filter((r) => String(r.unitId) === selectedBranch);
    return scoped
      .map((r) => ({ id: r.id, label: r.roomNumber }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [rooms, selectedBranch]);

  const branchOptions = useMemo(() => {
    const unique = new Map();
    rooms.forEach((r) => {
      if (!unique.has(r.unitId)) {
        unique.set(r.unitId, {
          id:   r.unitId,
          name: r.unitName || `Branch ${r.unitId}`,
        });
      }
    });
    return Array.from(unique.values());
  }, [rooms]);

  /* DUE column is shown only when a branch in view uses FIXED_DUE.
     (If an old generated record still carries a due amount, the column is kept
     so TOTAL always adds up.) */
  const showDueColumn = useMemo(() => {
    if (rowData.length === 0) {
      const ids =
        selectedBranch !== "all"
          ? [selectedBranch]
          : Array.from(dueConfigByBranch.keys());
      return ids.some((id) => isFixedDue(dueConfigByBranch.get(id)));
    }
    return rowData.some(
      (r) =>
        isFixedDue(dueConfigByBranch.get(String(r.unitId))) ||
        (r.dueAmount ?? 0) > 0
    );
  }, [rowData, dueConfigByBranch, selectedBranch]);

  /* ── Row status (single source of truth for the table AND the Excel report) ── */
  const getRowStatus = (row: RentRow): { sStatus: string; statusClass: string; displayStatus: string } => {
    if (row.isDaily && !row.rentRecord) {
      const owesEB = (row.ebBalance ?? 0) < 0;
      return {
        sStatus: owesEB ? "EB_DUE" : "SETTLED",
        statusClass: owesEB ? "overdue" : "paid",
        displayStatus: owesEB ? "EB Due" : "Settled",
      };
    }

    const sStatus = row.rentRecord?.paymentStatus
      ? normalizeStatus(row.rentRecord.paymentStatus)
      : "UNGENERATED";
    let statusClass = "ungenerated";
    let displayStatus = sStatus;

    const isOverdueMock = (sStatus === "PENDING" || sStatus === "PARTIAL") && (row.pending > 0);
    if (sStatus === "PAID" && ((row.tenantPending ?? 0) > 0 || row.previousPending > 0)) { statusClass = "overdue"; displayStatus = "Previous Due"; }
    else if (sStatus === "PAID") { statusClass = "paid"; displayStatus = "Paid"; }
    else if (isOverdueMock) { statusClass = "overdue"; displayStatus = "Overdue"; }
    else if (sStatus === "PENDING" || sStatus === "PARTIAL") { statusClass = "pending"; displayStatus = sStatus === "PARTIAL" ? "Partial" : "Pending"; }
    else if (row.pending > 0) { statusClass = "ungenerated"; displayStatus = "Not Generated"; }
    else { statusClass = "not-due"; displayStatus = "Not Due"; }

    return { sStatus, statusClass, displayStatus };
  };

  /* ── EXCEL REPORT ──
     Exports every row matching the current filters (not only the visible page),
     using the same numbers the table shows, plus a totals row.
     The Due columns are left out when the DUE column is hidden (NO_DUE). */
  const handleDownloadReport = async () => {
    if (exporting) return;
    if (isFuturePeriod) {
      return toast.error(`No report for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
    }
    if (rowData.length === 0) {
      return toast.error("No rent records to export for the selected filters");
    }

    setExporting(true);
    try {
      const XLSX = await import("xlsx");

      const branchNameById = new Map<string, string>();
      branchOptions.forEach((b: any) => branchNameById.set(String(b.id), b.name));

      const num = (v: number | undefined | null) => Math.round(Number(v ?? 0));

      const header = [
        "S.No", "Tenant", "Phone", "Branch", "Flat", "Room", "Room Type", "Stay Type",
        "Rent (₹)", "EB (₹)", "Damage (₹)", "Due Days", "Due (₹)",
        "Pending Amt (₹)", "Previous Due (₹)", "Previous Due Months",
        "Total (₹)", "Paid (₹)", "Pending (₹)", "Status",
      ];

      const body = rowData.map((row, i) => {
        const roomObj = getRoomObj(row.roomNumber) || getRoomById(row.rentRecord?.roomId ?? 0);
        const { displayStatus } = getRowStatus(row);
        const pendingAmt = (row.tenantPending ?? 0) > 0
          ? row.tenantPending ?? 0
          : (row.checkInRentPending ?? 0);

        return [
          i + 1,
          row.tenantName,
          row.tenantPhone,
          branchNameById.get(String(row.unitId)) ?? "",
          row.flatNumber,
          row.roomNumber,
          roomObj?.hostelType === "AC" ? "AC" : "Non-AC",
          row.isDaily ? "Daily" : "Monthly",
          num(row.rentPerBed),
          num(row.displayEB),
          num(row.damageAmount),
          row.dueDays ?? 0,
          num(row.dueAmount),
          num(pendingAmt),
          num(row.previousPending),
          row.previousLabel ?? "",
          num(row.total),
          num(row.paid),
          num(Math.max(0, row.pending)),
          displayStatus,
        ];
      });

      const sum = (col: number) => body.reduce((s, r) => s + Number(r[col] || 0), 0);
      const totalsRow = [
        "", "TOTAL", "", "", "", "", "", "",
        sum(8), sum(9), sum(10), "", sum(12),
        sum(13), sum(14), "",
        sum(16), sum(17), sum(18), "",
      ];

      const title = `Rent Report - ${MONTHS[month - 1]} ${year}`;

      // Columns 11 (Due Days) and 12 (Due ₹) are removed when the DUE column is hidden.
      const dropCols = showDueColumn ? [] : [11, 12];
      const strip = <T,>(r: T[]): T[] => r.filter((_, i) => !dropCols.includes(i));

      const finalHeader = strip(header);
      const aoa: (string | number)[][] = [
        [title],
        [`Generated on ${new Date().toLocaleString("en-IN")}  |  ${rowData.length} record(s)`],
        [],
        finalHeader,
        ...body.map((r) => strip(r)),
        strip(totalsRow),
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = strip([
        { wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
        { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 10 }, { wch: 11 }, { wch: 9 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 11 }, { wch: 11 },
        { wch: 12 }, { wch: 14 },
      ]);
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: finalHeader.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: finalHeader.length - 1 } },
      ];
      // Freeze the title + header rows so the header stays visible while scrolling.
      (ws as any)["!freeze"] = { xSplit: 0, ySplit: 4 };
      (ws as any)["!views"] = [{ state: "frozen", ySplit: 4 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1].slice(0, 3)} ${year}`);
      XLSX.writeFile(wb, `Rent_Report_${MONTHS[month - 1]}_${year}.xlsx`);

      toast.success(`Report downloaded (${rowData.length} records)`);
    } catch (e: any) {
      const missingLib = /xlsx|Failed to fetch dynamically imported module|Cannot find module/i.test(String(e?.message ?? e));
      toast.error(
        missingLib
          ? "Excel library missing — run: npm install xlsx"
          : "Failed to generate report"
      );
    } finally {
      setExporting(false);
    }
  };

  const handleGenerate = async (bill: RentRow) => {
    if (isFuturePeriod) {
      return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
    }
    let room = getRoomObj(bill.roomNumber);
    if (!room) {
      const tenant = tenantMap.get(bill.tenantId);
      if (tenant) room = getRoomById(tenant.roomId);
    }

    if (!room) return toast.error("Room not found for this tenant");

    const tenant = tenantMap.get(bill.tenantId);
    const isDaily = tenant && isDailyTenant(tenant);
    const rentAmount = isDaily ? 0 : resolveTenantRent(bill.tenantId, room);
    const ebAmount = Math.round(isDaily ? Math.max(0, -(bill.ebBalance ?? 0)) : bill.amount);

    try {
      await generateRent({
        tenantId:   String(bill.tenantId),
        roomId:     String(room.id),
        rentMonth:  month,
        rentYear:   year,
        rentAmount,
        ebAmount,
      });
      toast.success(`Rent generated for ${bill.tenantName}`);
      reload("light");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to generate rent");
    }
  };

  const handleGenerateAll = async () => {
    if (isFuturePeriod) {
      return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
    }
    if (!confirm("Generate rent for all tenants?")) return;

    const billsToGenerate = ebBills.filter((bill) => {
      const bAny = bill as any;
      let room = getRoomObj(bill.roomNumber);
      if (!room && bAny.tenantId) {
        const tenant = tenantMap.get(Number(bAny.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }
      const billTenant = bAny.tenantId != null ? tenantMap.get(Number(bAny.tenantId)) : undefined;
      if (checkedInAfterMonth(billTenant?.checkInDate, month, year)) return false;
      if (getRentStatus(bAny.tenantId, bill.roomNumber, room?.id)) return false;
      return true;
    });

    const mergedInformationalTenantIds = new Set<number>();

    try {
      const results = await Promise.allSettled(
        billsToGenerate.map(async (bill) => {
          const b = bill as any;
          let room = getRoomObj(bill.roomNumber);
          if (!room && b.tenantId) {
            const tenant = tenantMap.get(Number(b.tenantId));
            if (tenant) room = getRoomById(tenant.roomId);
          }
          if (!room) return;

          const tenant = tenantMap.get(Number(b.tenantId));
          if (tenant && isDailyTenant(tenant)) {
            const { advanceEB } = computeDailyAdvance(tenant);
            const ebBalance = Math.round(advanceEB - (b.amount ?? 0));
            if (ebBalance >= 0) return;
            await generateRent({
              tenantId:   String(b.tenantId),
              roomId:     String(room.id),
              rentMonth:  month,
              rentYear:   year,
              rentAmount: 0,
              ebAmount:   -ebBalance,
            });
            return;
          }

          const infoReading = informationalByTenant.get(Number(b.tenantId));
          const resolved = resolveTenantEB(tenant, room, b.amount ?? 0, infoReading, Number(b.tenantId));
          const ebAmount = Math.round(resolved.eb);
          if (resolved.usedInfo) mergedInformationalTenantIds.add(Number(b.tenantId));

          await generateRent({
            tenantId:   String(b.tenantId),
            roomId:     String(room.id),
            rentMonth:  month,
            rentYear:   year,
            rentAmount: resolveTenantRent(Number(b.tenantId), room),
            ebAmount,
          });
        })
      );
      const failed = results.filter((r) => r.status === "rejected").length;

      await Promise.all(
        Array.from(informationalByTenant.entries()).map(async ([tenantIdRaw, r]) => {
          const tenantId = Number(tenantIdRaw);
          if (mergedInformationalTenantIds.has(tenantId)) return;

          const tenant = tenantMap.get(tenantId);
          if (!tenant || !isDailyTenant(tenant)) return;
          const room =
            (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
            getRoomById(tenant.roomId);
          if (!room) return;

          const alreadyHasRent = (rentsByTenant.get(tenantId) ?? []).some(
            (rr) =>
              Number(rr.rentMonth) === month &&
              Number(rr.rentYear) === year &&
              String(rr.roomId) === String(room.id)
          );
          if (alreadyHasRent) return;

          const grossAmount = Math.round(resolveInformationalAmount(tenantId, r));

          const { advanceEB } = computeDailyAdvance(tenant);
          const ebBalance = Math.round(advanceEB - grossAmount);
          if (ebBalance >= 0) return;

          await generateRent({
            tenantId:   String(tenantId),
            roomId:     String(room.id),
            rentMonth:  month,
            rentYear:   year,
            rentAmount: 0,
            ebAmount:   -ebBalance,
          });
        })
      );

      const notes: string[] = [];
      if (failed > 0) notes.push(`${failed} failed`);
      if (notes.length > 0) {
        toast.warning(`Rents generated — ${notes.join(", ")}`);
      } else {
        toast.success("All rents generated");
      }
      reload("light");
    } catch {
      toast.error("Failed generating rents");
    }
  };

  const handlePayment = async (
    rent: Rent,
    mode: PaymentMode,
    amount: number,
    txnId: string,
    _bill: RentRow
  ) => {
    try {
      await api.put(`/rents/${rent.id}/combined-payment`, {
        paymentMode: mode,
        amount: Math.round(amount),   // whole rupees only
        transactionId: txnId,
      });
      toast.success("Payment recorded");
      await reload("light");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Payment failed");
    }
  };

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const paginatedRows = rowData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch, selectedRoom, month, year, deferredSearch]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

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

  // True while nothing can be shown yet (first load, or EB bills still arriving).
  const isLoadingData = !loaded || (ebLoading && rowData.length === 0);

  // Number of visible table columns (DUE is optional).
  const colCount = showDueColumn ? 12 : 11;

  return (
    <div className="min-h-full w-full min-w-0 bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rt-wrap { font-family: 'Inter', sans-serif; padding: 20px 10px; max-width: none; margin: 0 auto; }

        .rt-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .rt-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .rt-subtitle { font-size: 13px; color: #475569; font-weight: 500; }

        .rt-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .rt-layout { flex-direction: row; } .rt-content { flex: 1; min-width: 0; } .rt-sidebar { width: 340px; flex-shrink: 0; } }

        .rt-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .rt-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .rt-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

        .rt-table { width: 100%; table-layout: fixed; border-collapse: collapse; min-width: 0; }
        .rt-table th { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 12px 8px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.3px; line-height: 1.35; vertical-align: middle; overflow-wrap: normal; word-break: normal; hyphens: none; }
        .rt-table td { padding: 10px 8px; border-bottom: 1px solid #f8fafc; vertical-align: middle; font-size: 12px; overflow-wrap: normal; word-break: normal; hyphens: none; }
        .rt-table tr:hover { background: #fdfcff; }
        .rt-empty { color: #475569; }
        .rt-table .rt-value { font-size: 12px; }
        .rt-table .rt-tenant-name { font-size: 12px; line-height: 1.25; }
        .rt-table .rt-tenant-phone { font-size: 10px; }
        .rt-table .rt-room { font-size: 12px; }
        .rt-table .rt-room-type { white-space: nowrap; font-size: 10px; padding: 2px 5px; }
        .rt-table .rt-tenant-name { overflow-wrap: normal; word-break: normal; }
        .rt-table .rt-avatar { display: none; }
        @media (min-width: 1500px) { .rt-table .rt-avatar { display: flex; width: 26px; height: 26px; font-size: 10px; margin-right: 8px; } }
        .rt-table .rt-status { padding: 2px 0; font-size: 10.5px; gap: 4px; white-space: nowrap; overflow-wrap: normal; word-break: normal; }
        .rt-table .rt-status::before { flex-shrink: 0; }
        .rt-table td.rt-actions-cell { overflow-wrap: normal; }
        @media (max-width: 1199px) { .rt-table { min-width: 1000px; } }

        .rt-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
        .rt-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-tenant-phone { font-size: 11px; color: #475569; margin-top: 2px; }

        .rt-room { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        .rt-value { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-value.muted { color: #64748b; font-weight: 500; }
        .rt-date { font-size: 13px; font-weight: 500; color: #475569; }

        .rt-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; }
        .rt-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
        .rt-status.paid { color: #15803d; }
        .rt-status.paid::before { background: #15803d; }
        .rt-status.pending { color: #c2410c; }
        .rt-status.pending::before { background: #c2410c; }
        .rt-status.overdue { color: #be123c; }
        .rt-status.overdue::before { background: #be123c; }
        .rt-status.not-due { color: #1d4ed8; }
        .rt-status.not-due::before { background: #1d4ed8; }
        .rt-status.ungenerated { color: #475569; }
        .rt-status.ungenerated::before { background: #475569; }

        .rt-eb-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
        .rt-eb-badge.refund { color: #15803d; background: #f0fdf4; }
        .rt-eb-badge.due    { color: #be123c; background: #fef2f2; }
        .rt-eb-badge.even   { color: #475569; background: #f8fafc; }

        .rt-chart-container { padding: 20px; display: flex; flex-direction: column; align-items: center; position: relative; }

        .rt-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
        .rt-sum-item:last-child { border-bottom: none; }

        /* Loading indicator */
        .rt-loading-cell { padding: 40px 0; text-align: center; color: #475569; font-size: 13px; }
        .rt-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #5200FF; border-radius: 50%; animation: rt-spin 0.7s linear infinite; vertical-align: -3px; margin-right: 8px; }
        @keyframes rt-spin { to { transform: rotate(360deg); } }
        .rt-refresh-bar { height: 2px; background: linear-gradient(90deg, transparent, #5200FF, transparent); background-size: 200% 100%; animation: rt-bar 1s linear infinite; }
        @keyframes rt-bar { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) { .rt-spinner, .rt-refresh-bar { animation: none; } }

        .rt-room-dd { position: relative; }
        .rt-room-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; height: 36px; padding: 0 12px;
          border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
          font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; text-align: left;
        }
        .rt-room-trigger:focus-visible { outline: none; border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); }
        .rt-room-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rt-room-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.15s; }
        .rt-room-chevron.open { transform: rotate(180deg); }
        .rt-room-menu {
          position: fixed; z-index: 60;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
        }
        .rt-room-search {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px; height: 34px;
          margin-bottom: 6px; background: #fafafa;
        }
        .rt-room-search:focus-within { border-color: #5200FF; box-shadow: 0 0 0 3px rgba(82,0,255,0.12); background: #fff; }
        .rt-room-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; min-width: 0; }
        .rt-room-search input::placeholder { color: #64748b; }
        .rt-room-search-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: transparent; border-radius: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; }
        .rt-room-search-clear:hover { background: #e2e8f0; }
        .rt-room-list { max-height: 260px; overflow-y: auto; }
        .rt-room-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 10px; border: none; background: transparent; border-radius: 8px;
          font-size: 13.5px; font-weight: 500; color: #334155; cursor: pointer; text-align: left;
        }
        .rt-room-item.active { background: #f8fafc; }
        .rt-room-item.selected { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .rt-room-check { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rt-room-empty { padding: 12px 10px; font-size: 12.5px; color: #64748b; text-align: center; }

        .rt-page-row { flex-wrap: wrap; }
        .rt-page-btn {
          width: 32px; height: 32px; min-width: 32px; border-radius: 6px;
          border: 1px solid #e2e8f0; display: flex; align-items: center;
          justify-content: center; color: #475569; background: #fff;
          font-weight: 500; font-size: 14px; cursor: pointer;
        }
        .rt-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .rt-page-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
        .rt-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rt-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }
        .rt-page-ellipsis { cursor: default; color: #64748b; }

        .rt-wrap, .rt-layout, .rt-content, .rt-panel { min-width: 0; }
        .rt-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .rt-table-scroll:focus, .rt-table-scroll:focus-visible { outline: none; }
        @media (max-width: 767px) {
          .rt-wrap { width: 100%; max-width: 100%; padding: 14px 10px 24px; }
          .rt-layout { width: 100%; gap: 12px; }
          .rt-layout > div { width: 100%; max-width: 100%; min-width: 0; }
          .rt-header { margin-bottom: 14px; }
          .rt-title { font-size: 20px; }
          .rt-panel { width: 100%; max-width: 100%; margin-bottom: 12px; border-radius: 12px; }
          .rt-panel-header { padding: 14px 12px; gap: 10px; flex-wrap: wrap; }
          .rt-panel-title { font-size: 15px; }
          .rt-panel-header button { min-height: 36px; font-size: 12px; white-space: nowrap; }
          .rent-mobile-filters {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px !important;
            padding: 12px !important;
            align-items: stretch;
          }
          .rent-mobile-filters > div { width: 100% !important; min-width: 0 !important; max-width: 100%; }
          .rent-mobile-filters [role="combobox"] { width: 100%; min-width: 0; font-size: 12px; padding-left: 8px; padding-right: 8px; }
          .rent-mobile-filters input { width: 100%; min-width: 0; font-size: 12px; }
          .rt-room-trigger { font-size: 12px; padding: 0 8px; }
          .rent-mobile-filters > div:has(input) { grid-column: 1 / -1; }
          .rent-mobile-filters > button { grid-column: 1 / -1; justify-self: start; margin-left: 0 !important; min-height: 36px; }
          .rt-table { min-width: 1000px; }
          .rt-table th, .rt-table td { padding: 10px 8px; }
          .rent-mobile-pagination { padding: 12px !important; gap: 10px; flex-wrap: wrap; }
          .rent-mobile-pagination > div { font-size: 12px; }
          .rent-mobile-pagination nav { margin-left: auto; max-width: 100%; }
          .rt-page-btn { width: 30px; height: 30px; min-width: 30px; }
        }
        @media (max-width: 359px) {
          .rt-wrap { padding: 10px 6px 18px; }
          .rent-mobile-filters { gap: 7px !important; padding: 9px !important; }
          .rt-panel-header { padding: 12px 9px; }
        }

      `}</style>

      <div className="rt-wrap">
        <div className="rt-header">
          <div>
            <h1 className="rt-title">Rent Management</h1>
            <p className="rt-subtitle">Home <ChevronRight size={12} className="inline opacity-50" aria-hidden="true" /> Rent</p>
          </div>
        </div>

        <div className="rt-layout">
          <div>
            <div className="rt-panel">
              <div className="rt-panel-header">
                <h2 className="rt-panel-title">Rent Collection</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleDownloadReport}
                    disabled={exporting || isLoadingData || rowData.length === 0}
                    aria-label={`Download rent report for ${MONTHS[month - 1]} ${year} as Excel`}
                    title={
                      rowData.length === 0
                        ? "No records to export"
                        : `Download all ${rowData.length} record(s) as Excel`
                    }
                  >
                    <Download size={14} aria-hidden="true" />
                    {exporting ? "Preparing…" : "Download Report"}
                  </Button>
                  {hasAccess && (
                    <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
                       ALL Generation
                    </Button>
                  )}
                </div>
              </div>

              {/* Thin bar while fresh data is being fetched behind already-visible rows */}
              {(loadingRef.current || ebLoading) && rowData.length > 0 && (
                <div className="rt-refresh-bar" role="progressbar" aria-label="Refreshing rent data" />
              )}

              <div className="rent-mobile-filters flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
                  <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedRoom("all"); }} disabled={!hasAccess || (role !== "ADMIN" && role !== "SUPER_ADMIN")}>
                    <SelectTrigger aria-label="Filter by branch" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branchOptions.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <RoomFilterDropdown
                  value={selectedRoom}
                  onChange={setSelectedRoom}
                  options={roomOptions}
                />

                <div className="flex items-center bg-white border border-[#e2e8f0] rounded-md h-9 w-[130px] px-0">
                   <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger aria-label="Filter by month" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => ({ m, num: i + 1 }))
                        .filter(({ num }) => !(year === currentYear && num > currentMonth))
                        .map(({ m, num }) => (
                          <SelectItem key={num} value={String(num)}>
                            {m}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[110px]">
                  <Select
                    value={String(year)}
                    onValueChange={(v) => {
                      const y = Number(v);
                      setYear(y);
                      if (y === currentYear && month > currentMonth) setMonth(currentMonth);
                    }}
                  >
                    <SelectTrigger aria-label="Filter by year" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex bg-white border border-[#e2e8f0] rounded-md h-9 px-3 w-[200px] items-center">
                  <Search size={14} className="text-slate-500 mr-2" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search tenant or room..."
                    aria-label="Search tenant or room"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-[#475569] font-medium hover:text-[#0f172a] ml-auto"
                  onClick={() => {
                    setSelectedBranch(role !== "ADMIN" && branchId ? String(branchId) : "all");
                    setSelectedRoom("all");
                    setSearch("");
                    setMonth(new Date().getMonth() + 1);
                    setYear(new Date().getFullYear());
                  }}
                >
                  <RefreshCw size={14} aria-hidden="true" /> Clear Filters
                </button>
              </div>

              <div className="rt-table-scroll overflow-x-auto" role="region" aria-label="Scrollable rent collection table" aria-busy={isLoadingData} tabIndex={0}>
                <table className="rt-table">
                  <caption className="sr-only">Rent collection for {MONTHS[month - 1]} {year}</caption>
                  <colgroup>
                    <col style={{ width: showDueColumn ? "12%" : "14%" }} />  {/* TENANT */}
                    <col style={{ width: showDueColumn ? "6%" : "7%" }} />    {/* ROOM */}
                    <col style={{ width: showDueColumn ? "8%" : "9%" }} />    {/* RENT */}
                    <col style={{ width: showDueColumn ? "6%" : "7%" }} />    {/* EB */}
                    <col style={{ width: showDueColumn ? "6%" : "7%" }} />    {/* DAMAGE */}
                    {showDueColumn && <col style={{ width: "6%" }} />}        {/* DUE */}
                    <col style={{ width: showDueColumn ? "7%" : "8%" }} />    {/* PENDING AMT */}
                    <col style={{ width: showDueColumn ? "7%" : "8%" }} />    {/* PREVIOUS DUE */}
                    <col style={{ width: showDueColumn ? "6%" : "7%" }} />    {/* TOTAL */}
                    <col style={{ width: showDueColumn ? "9%" : "9%" }} />    {/* STATUS */}
                    <col style={{ width: showDueColumn ? "7%" : "8%" }} />    {/* PENDING */}
                    <col style={{ width: showDueColumn ? "20%" : "16%" }} />  {/* ACTIONS */}
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">TENANT</th>
                      <th scope="col">ROOM</th>
                      <th scope="col">RENT (₹)</th>
                      <th scope="col">EB (₹)</th>
                      <th scope="col">DAMAGE (₹)</th>
                      {showDueColumn && <th scope="col">DUE (₹)</th>}
                      <th scope="col">PENDING AMT (₹)</th>
                      <th scope="col">PREVIOUS DUE (₹)</th>
                      <th scope="col">TOTAL (₹)</th>
                      <th scope="col">STATUS</th>
                      <th scope="col">PENDING (₹)</th>
                      <th scope="col">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      isLoadingData ? (
                        <tr>
                          <td colSpan={colCount} className="rt-loading-cell" role="status">
                            <span className="rt-spinner" aria-hidden="true" />
                            Loading rent data for {MONTHS[month - 1]} {year}…
                          </td>
                        </tr>
                      ) : (
                        <tr><td colSpan={colCount} className="text-center py-12 rt-empty">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
                      )
                    ) : (
                      paginatedRows.map((row, i) => {
                        const { statusClass, displayStatus } = getRowStatus(row);

                        const initials = row.tenantName.substring(0, 2).toUpperCase();
                        const colors = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-800'];
                        const avatarClass = colors[i % colors.length];

                        const roomObj = getRoomObj(row.roomNumber) || getRoomById(row.rentRecord?.roomId ?? 0);
                        const isAc = roomObj?.hostelType === "AC";

                        return (
                          <tr key={row.tenantId + "-" + row.roomNumber}>
                            <td>
                              <div className="flex items-center">
                                <div className={`rt-avatar ${avatarClass}`} aria-hidden="true">{initials}</div>
                                <div>
                                  <div className="rt-tenant-name">{row.tenantName}</div>
                                  <div className="rt-tenant-phone">{row.tenantPhone}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="rt-room">{row.roomNumber}</div>
                              <div className={`rt-room-type ${isAc ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-700'}`}>
                                {isAc ? 'AC' : 'Non-AC'}
                              </div>
                            </td>

                            <td>
                              <span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.rentPerBed))}</span>
                              {!row.isDaily && (() => {
                                const cyc = getCyclePreview(row.tenantId, roomObj);
                                if (cyc) {
                                  if (!cyc.start || !cyc.end) return null;
                                  return (
                                    <div
                                      className="text-[10px] text-indigo-700 mt-0.5"
                                      title={`Joining-date cycle · ${cyc.days} days · full monthly rent`}
                                    >
                                      {fmtDate(cyc.start)} → {fmtDate(cyc.end)}
                                    </div>
                                  );
                                }
                                const breakdown = resolveTenantRentBreakdown(row.tenantId, roomObj);
                                if (!breakdown.proRated) return null;
                                return (
                                  <div className="text-[10px] text-indigo-700 mt-0.5" title={`Check-in ${breakdown.checkInDate ?? ""} · Daily rent ₹${breakdown.dailyRent.toFixed(2)}`}>
                                    Pro-rated: {breakdown.occupiedDays}/{breakdown.daysInMonth} days
                                  </div>
                                );
                              })()}
                            </td>
                            <td>
                              <span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.displayEB))}</span>
                              {row.ebCarryNote && (
                                <div className="text-[10px] text-indigo-700 mt-0.5">{row.ebCarryNote}</div>
                              )}
                              {row.isDaily && row.ebBalance !== undefined && row.ebBalance !== 0 && (
                                <div className="mt-1">
                                  {row.ebBalance > 0 ? (
                                    <span className="rt-eb-badge refund">Refund ₹{new Intl.NumberFormat('en-IN').format(Math.round(row.ebBalance))}</span>
                                  ) : (
                                    <span className="rt-eb-badge due">Due ₹{new Intl.NumberFormat('en-IN').format(Math.round(-row.ebBalance))}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`rt-value ${row.damageAmount <= 0 ? 'muted' : ''}`}>
                                {row.damageAmount > 0
                                  ? new Intl.NumberFormat('en-IN').format(Math.round(row.damageAmount))
                                  : '—'}
                              </span>
                            </td>
                            {showDueColumn && (
                              <td>
                                {(row.dueAmount ?? 0) > 0 ? (
                                  <>
                                    <span className="rt-value text-rose-700">
                                      {new Intl.NumberFormat('en-IN').format(Math.round(row.dueAmount ?? 0))}
                                    </span>
                                    <div className="text-[10px] text-rose-700 mt-0.5 whitespace-nowrap">
                                      {row.dueDays} day{row.dueDays === 1 ? "" : "s"} × ₹{new Intl.NumberFormat('en-IN').format(row.duePerDay ?? 0)}
                                    </div>
                                  </>
                                ) : (
                                  <span className="rt-value muted">—</span>
                                )}
                              </td>
                            )}
                            <td>
                              {(row.tenantPending ?? 0) > 0 ? (
                                <span
                                  className="rt-value text-rose-700"
                                  title="Tenant's pending amount (from check-in). Included in TOTAL."
                                >
                                  {new Intl.NumberFormat('en-IN').format(Math.round(row.tenantPending ?? 0))}
                                </span>
                              ) : (row.checkInRentPending ?? 0) > 0 ? (
                                <>
                                  <span
                                    className="rt-value text-rose-700"
                                    title="Tenant's pending from check-in. Already counted in this month's rent, so it is not added to TOTAL again."
                                  >
                                    {new Intl.NumberFormat('en-IN').format(Math.round(row.checkInRentPending ?? 0))}
                                  </span>
                                  <div className="text-[10px] text-rose-700 mt-0.5">in rent</div>
                                </>
                              ) : (
                                <span className="rt-value muted">—</span>
                              )}
                            </td>
                            <td>
                              {row.previousPending > 0 ? (
                                <>
                                  <span className="rt-value text-rose-700">
                                    {new Intl.NumberFormat('en-IN').format(Math.round(row.previousPending))}
                                  </span>
                                  {row.previousLabel && (
                                    <div className="text-[10px] text-rose-700 mt-0.5">{row.previousLabel}</div>
                                  )}
                                </>
                              ) : (
                                <span className="rt-value muted">—</span>
                              )}
                            </td>
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.total))}</span></td>
                            <td><div className={`rt-status ${statusClass}`}>{displayStatus}</div></td>
                            <td>
                              <div className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(Math.max(0, row.pending)))}</div>
                            </td>
                            <td className="rt-actions-cell">
                              <ActionCell bill={row} rentRecord={row.rentRecord} onGenerate={handleGenerate} onPayment={handlePayment} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rent-mobile-pagination flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
                <div className="text-[13px] text-[#475569]" aria-live="polite">
                  Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} records
                </div>
                <nav aria-label="Pagination" className="flex gap-2 rt-page-row">
                  <button
                    type="button"
                    className="rt-page-btn"
                    aria-label="Previous page"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  >
                    <span aria-hidden="true">&#8249;</span>
                  </button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="rt-page-btn rt-page-ellipsis" aria-hidden="true">
                        <MoreHorizontal size={14} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={p}
                        className={`rt-page-btn ${p === currentPage + 1 ? "active" : ""}`}
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
                    className="rt-page-btn"
                    aria-label="Next page"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    <span aria-hidden="true">&#8250;</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentPage;