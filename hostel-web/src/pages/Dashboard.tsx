import { useEffect, useId, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getDashboard, getUserRole, getBranchId, getTenantPaymentHistory, fetchAllPayments } from "@/lib/store";
import api from "@/lib/api";
import {
  Building2, Users, Zap, BedDouble, AlertTriangle, GitBranch,
  CheckCircle2, Home, Bed, TrendingUp, TrendingDown, X, Search,
  ChevronDown, ChevronUp, RefreshCw, CreditCard, Banknote, Calendar,
  MessageSquare, CalendarCheck, Wallet
} from "lucide-react";

interface BranchStat {
  branchId: number; branchName: string; rooms: number; beds: number;
  activeTenants: number; ebUnits: number; collected: number; pending: number;
  overallCollected?: number; overallPending?: number;
  overallRentCollected?: number; overallEBCollected?: number;
  overallRentPending?: number; overallEBPending?: number;
  rentOnlyCollected?: number; ebOnlyCollected?: number;
  rentOnlyPending?: number; ebOnlyPending?: number;
}

interface GlobalDashboard {
  totalBranches: number; totalRooms: number; totalBeds: number;
  occupiedBeds: number; availableBeds: number; activeTenants: number;
  totalUnits: number; rentCollected: number; pendingDues: number;
  unpaidCount: number; rentOnlyCollected: number; ebOnlyCollected: number;
  rentOnlyPending: number; ebOnlyPending: number;
  overallCollected: number; overallPending: number;
  overallRentCollected: number; overallEBCollected: number;
  overallRentPending: number; overallEBPending: number;
  branches: BranchStat[]; userName?: string; unitName?: string;
}

interface TenantDashboard {
  tenantId?: number;
  tenantName: string; tenantPhone: string; tenantEmail: string;
  myBranchName: string; myRoomNumber: string; myBedNumber: string;
  myRoomType: string; currentMonthPaid: number; currentMonthPending: number;
  overallPaid: number; overallPending: number;
  // NEW: the tenant's own "Pending (₹)" figure (Tenant.pendingAmount), sent by
  // GET /dashboard/tenant. Included in the pending cards below.
  tenantPendingAmount?: number;
  totalRooms: number; totalBeds: number;
  availableBeds: number; notAvailableBeds: number;
}

export interface TenantDetail {
  tenantId: number; tenantName: string; roomNumber: string;
  bedNumber: string; branchName?: string;
  collectedAmount: number; pendingAmount: number;
}

interface RentRecord {
  id: number;
  rentMonth: number;
  rentYear: number;
  rentAmount: number;
  ebAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  paymentMode: string | null;
  transactionId: string | null;
}

type DetailMode = "currentCollected" | "currentPending" | "overallCollected" | "overallPending" | null;
type TenantDetailMode = "thisMonthPaid" | "thisMonthPending" | "overallPaid" | "overallPending";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PAGE_SIZE = 10;

const tenantModeLabels: Record<TenantDetailMode, string> = {
  thisMonthPaid: "This Month — Paid Records",
  thisMonthPending: "This Month — Pending Dues",
  overallPaid: "All-Time Paid Records",
  overallPending: "All-Time Pending Dues",
};

const adminModeLabels: Record<NonNullable<DetailMode>, string> = {
  currentCollected: "Collected This Month",
  currentPending: "Pending Dues This Month",
  overallCollected: "Overall Collected",
  overallPending: "Overall Pending",
};

const TH_CLASS = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

const fetchAll = async (url: string, extraParams?: Record<string, any>): Promise<any[]> => {
  const first = await api.get(url, {
    params: { page: 0, size: PAGE_SIZE, ...extraParams },
  });

  const firstContent: any[] =
    first.data?.data?.content ?? first.data?.content ?? first.data?.data ?? [];
  const total: number =
    first.data?.data?.totalElements ?? first.data?.totalElements ?? 0;

  if (total <= PAGE_SIZE || firstContent.length === 0) return firstContent;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      api.get(url, { params: { page: i + 1, size: PAGE_SIZE, ...extraParams } })
    )
  );

  return remaining.reduce(
    (all, res) => {
      const content: any[] =
        res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [];
      return [...all, ...content];
    },
    firstContent
  );
};

/* ───────────── Tenant "Pending Amount" helpers ─────────────
   Tenant.pendingAmount is the "Pending (₹)" figure on the Tenants page. It is
   not stored on any Rent record, so it is added on top of the rent-based
   pending totals everywhere on the dashboard. */

/** Branch id of a tenant: via their room first, then the tenant's own branch. */
const tenantBranchOf = (t: any, roomMap: Map<any, any>): number | null => {
  const room = roomMap.get(Number(t.roomId));
  const roomBranch = room ? (room.unitId ?? room.branchId ?? null) : null;
  const b = roomBranch ?? t.branchId ?? t.unitId ?? null;
  return b != null ? Number(b) : null;
};

const sumTenantPending = (tenants: any[]): number =>
  tenants.reduce((s, t) => s + Math.max(0, Number(t.pendingAmount ?? 0)), 0);

/* ───────────── Payments made against the previous Pending Amount ─────────────
   These are APPROVED payment transactions with no rent attached (rentId == null).
   They reduce Tenant.pendingAmount but are not on any Rent record, so they must
   be added to every "Collected / Paid" figure. */

const isPrevPendingTxn = (p: any) =>
  p?.rentId == null && String(p?.status ?? "").toUpperCase() === "APPROVED";

const isInCurrentMonth = (p: any): boolean => {
  const d = new Date(p?.verifiedAt ?? p?.submittedAt);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/** Approver-scoped (ADMIN = own branches, WARDEN = own branch). */
const fetchPrevPendingPayments = async (): Promise<any[]> => {
  const out: any[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && page < 200) {
    const r = await fetchAllPayments(page, PAGE_SIZE);
    out.push(...(r.content ?? []));
    totalPages = Math.max(1, Math.ceil((r.totalElements ?? 0) / PAGE_SIZE));
    page++;
  }
  return out.filter(isPrevPendingTxn);
};

/* ───────────── Accessibility helpers ───────────── */

/** Close a modal when Escape is pressed. */
const useEscapeKey = (onClose: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
};

/** Sortable <th>: keyboard-operable, announces sort direction. */
const SortHeader = ({
  label, asc, onToggle, className = "",
}: { label: string; asc: boolean; onToggle: () => void; className?: string }) => (
  <th scope="col" aria-sort={asc ? "ascending" : "descending"} className={`${TH_CLASS} ${className}`}>
    <span
      role="button"
      tabIndex={0}
      aria-label={`Sort by ${label}, currently ${asc ? "ascending" : "descending"}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="inline-flex items-center gap-1 cursor-pointer select-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {label}
      {asc ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
    </span>
  </th>
);

const PaymentBadge = ({ mode }: { mode: string | null }) => {
  if (!mode) return <span className="text-xs text-muted-foreground">—</span>;
  const upper = mode.toUpperCase();
  if (upper === "CASH") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <Banknote className="h-3 w-3" aria-hidden="true" /> Cash
      </span>
    );
  }
  if (upper === "UPI") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
        <CreditCard className="h-3 w-3" aria-hidden="true" /> UPI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
      <CreditCard className="h-3 w-3" aria-hidden="true" /> {mode}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === "PAID")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Paid
      </span>
    );
  if (s === "PARTIAL")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Pending
    </span>
  );
};

interface StatCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; iconBg: string;
}

// CONTRAST FIX: label/sub were text-gray-400 (#9ca3af ≈ 2.5:1 on white).
// Now gray-600 / gray-500 (≥ 4.5:1) — passes WCAG AA.
const StatCard = ({ label, value, sub, icon: Icon, color, iconBg }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)] hover:-translate-y-[1px] transition-all duration-200">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 truncate">{label}</p>
      <p className="text-[26px] font-bold leading-tight mt-1 text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>}
    </div>
    <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
    </div>
  </div>
);

interface FinCardProps {
  label: string; value: number; icon: React.ElementType;
  color: string; iconBg: string; accent: string;
  onClick?: () => void;
}

// CONTRAST FIX: label + "View details" now gray-600 (was gray-400).
// A11Y FIX: clickable card is keyboard-focusable (Tab, Enter, Space) with a
// descriptive accessible name. Label no longer truncates so it's fully readable.
const FinCard = ({ label, value, icon: Icon, color, iconBg, accent, onClick }: FinCardProps) => {
  const amount = `₹${Math.round(value).toLocaleString()}`;
  const interactive = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": `${label}: ${amount}. View details`,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      {...interactive}
      className={`relative bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
        onClick
          ? "cursor-pointer hover:shadow-[0_8px_20px_rgba(16,24,40,0.08)] hover:-translate-y-[2px] active:translate-y-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6A35FF]/60"
          : ""
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} aria-hidden="true" />
      <div className="min-w-0 pl-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 leading-snug">{label}</p>
        <p className={`text-[22px] font-bold leading-tight mt-1 tabular-nums ${color}`}>{amount}</p>
        {onClick && <p className="text-xs text-gray-600 mt-1 font-medium">View details →</p>}
      </div>
      <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
      </div>
    </div>
  );
};

interface FinanceCardsProps {
  currentCollected: number; currentPending: number;
  overallCollected: number; overallPending: number;
  onCardClick?: (mode: DetailMode) => void;
}

const FinanceCardsSection = ({
  currentCollected, currentPending,
  overallCollected, overallPending,
  onCardClick,
}: FinanceCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <FinCard label="Collected This Month" value={currentCollected}
      icon={CheckCircle2} color="text-emerald-700"
      iconBg="bg-emerald-50"
      accent="bg-emerald-400"
      onClick={onCardClick ? () => onCardClick("currentCollected") : undefined} />
    <FinCard label="Pending This Month" value={currentPending}
      icon={AlertTriangle} color="text-rose-600"
      iconBg="bg-rose-50"
      accent="bg-rose-400"
      onClick={onCardClick ? () => onCardClick("currentPending") : undefined} />
    <FinCard label="Overall Collected" value={overallCollected}
      icon={TrendingUp} color="text-[#6A35FF]"
      iconBg="bg-[#6A35FF]/10"
      accent="bg-[#6A35FF]"
      onClick={onCardClick ? () => onCardClick("overallCollected") : undefined} />
    <FinCard label="Overall Pending" value={overallPending}
      icon={TrendingDown} color="text-orange-700"
      iconBg="bg-orange-50"
      accent="bg-orange-400"
      onClick={onCardClick ? () => onCardClick("overallPending") : undefined} />
  </div>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[11px] font-semibold mb-4 text-gray-600 uppercase tracking-wider flex items-center gap-2">
    <span className="h-3 w-[3px] rounded-full bg-blue-500/70" aria-hidden="true" />
    {children}
  </h2>
);

const fetchTenantDetailsFromRents = async (
  mode: NonNullable<DetailMode>,
  branchId?: number | null
): Promise<TenantDetail[]> => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [rents, tenants, rooms] = await Promise.all([
    fetchAll("/rents", { _ts: Date.now() }),
    fetchAll("/tenants"),
    fetchAll("/rooms"),
  ]);

  const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));
  const roomMap = new Map(rooms.map((r: any) => [r.id, r]));
  const bedMap = new Map<number, string>();
  for (const room of rooms)
    for (const bed of room.beds ?? []) bedMap.set(Number(bed.id), String(bed.bedNumber));

  const isCurrent = mode === "currentCollected" || mode === "currentPending";
  const isCollected = mode === "currentCollected" || mode === "overallCollected";

  const filtered = rents.filter((r: any) => {
    let rentM: number | null = r.rentMonth != null ? Number(r.rentMonth) : null;
    let rentY: number | null = r.rentYear != null ? Number(r.rentYear) : null;
    if ((rentM == null || rentY == null) && r.paymentDate) {
      const d = new Date(r.paymentDate);
      if (!isNaN(d.getTime())) {
        rentM = rentM ?? d.getMonth() + 1;
        rentY = rentY ?? d.getFullYear();
      }
    }
    if (isCurrent) {
      if (rentM == null || rentY == null) return false;
      if (rentM !== currentMonth || rentY !== currentYear) return false;
    }
    if (branchId) {
      const room = roomMap.get(Number(r.roomId));
      const roomBranch = room ? (room.unitId ?? room.branchId ?? null) : null;
      if (roomBranch != null) {
        if (Number(roomBranch) !== Number(branchId)) return false;
      } else {
        const tenant = tenantMap.get(Number(r.tenantId));
        const tenantBranch = tenant ? (tenant.unitId ?? tenant.branchId ?? null) : null;
        if (tenantBranch == null || Number(tenantBranch) !== Number(branchId)) return false;
      }
    }
    if (isCollected) return r.paymentStatus === "PAID" || r.paymentStatus === "PARTIAL";
    return r.paymentStatus === "PENDING" || r.paymentStatus === "PARTIAL";
  });

  const map = new Map<number, TenantDetail>();
  for (const r of filtered) {
    const tid = Number(r.tenantId);
    const tenant = tenantMap.get(tid);
    const room = roomMap.get(Number(r.roomId));
    const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
    const rawPaid = r.paidAmount ?? 0;

    let collected: number, pending: number;
    switch (r.paymentStatus) {
      case "PAID": collected = rawTotal; pending = 0; break;
      case "PARTIAL": collected = rawPaid; pending = rawTotal - rawPaid; break;
      default: collected = 0; pending = rawTotal; break;
    }

    if (map.has(tid)) {
      const e = map.get(tid)!;
      e.collectedAmount += collected;
      e.pendingAmount += pending;
    } else {
      map.set(tid, {
        tenantId: tid,
        tenantName: tenant?.name ?? `Tenant #${tid}`,
        roomNumber: room?.roomNumber ?? "—",
        bedNumber: tenant?.bedId != null
          ? (bedMap.get(Number(tenant.bedId)) ?? String(tenant.bedId))
          : "—",
        collectedAmount: collected,
        pendingAmount: pending,
      });
    }
  }

  // NEW: pending views also include each tenant's own Pending Amount
  // (Tenant.pendingAmount), so the list adds up to the card above it. Tenants
  // with a Pending Amount but no unpaid Rent record are listed too.
  if (!isCollected) {
    for (const t of tenants) {
      const tp = Math.max(0, Number((t as any).pendingAmount ?? 0));
      if (!(tp > 0)) continue;

      if (branchId) {
        const tb = tenantBranchOf(t, roomMap);
        if (tb == null || tb !== Number(branchId)) continue;
      }

      const tid = Number((t as any).id);
      const existing = map.get(tid);
      if (existing) {
        existing.pendingAmount += tp;
      } else {
        const room = roomMap.get(Number((t as any).roomId));
        map.set(tid, {
          tenantId: tid,
          tenantName: (t as any).name ?? `Tenant #${tid}`,
          roomNumber: room?.roomNumber ?? "—",
          bedNumber: (t as any).bedId != null
            ? (bedMap.get(Number((t as any).bedId)) ?? String((t as any).bedId))
            : "—",
          collectedAmount: 0,
          pendingAmount: tp,
        });
      }
    }
  }

  // Collected views also list payments made against the previous Pending Amount.
  if (isCollected) {
    try {
      const prev = await fetchPrevPendingPayments();
      for (const p of prev) {
        if (isCurrent && !isInCurrentMonth(p)) continue;
        const tid = Number(p.tenantId);
        const amt = Number(p.amount ?? 0);
        const existing = map.get(tid);
        if (existing) {
          existing.collectedAmount += amt;
        } else {
          map.set(tid, {
            tenantId: tid,
            tenantName: p.tenantName ?? `Tenant #${tid}`,
            roomNumber: p.roomNumber ?? "—",
            bedNumber: "—",
            collectedAmount: amt,
            pendingAmount: 0,
          });
        }
      }
    } catch {
      /* list still works with rent-only data */
    }
  }

  return Array.from(map.values());
};

const computeWardenFinancials = async (branchId: number) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [rents, rooms, tenants] = await Promise.all([
    fetchAll("/rents", { _ts: Date.now() }),
    fetchAll("/rooms"),
    fetchAll("/tenants"),
  ]);

  const roomMap = new Map(rooms.map((r: any) => [r.id, r]));
  const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

  const branchRents = rents.filter((r: any) => {
    const room = roomMap.get(Number(r.roomId));
    const roomBranch = room ? (room.unitId ?? room.branchId ?? null) : null;
    if (roomBranch != null) return Number(roomBranch) === branchId;
    const tenant = tenantMap.get(Number(r.tenantId));
    const tenantBranch = tenant ? (tenant.unitId ?? tenant.branchId ?? null) : null;
    return tenantBranch != null && Number(tenantBranch) === branchId;
  });

  let currentCollected = 0, currentPending = 0;
  let overallCollected = 0, overallPending = 0;

  for (const r of branchRents) {
    let rentM: number | null = r.rentMonth != null ? Number(r.rentMonth) : null;
    let rentY: number | null = r.rentYear != null ? Number(r.rentYear) : null;
    if ((rentM == null || rentY == null) && r.paymentDate) {
      const d = new Date(r.paymentDate);
      if (!isNaN(d.getTime())) {
        rentM = rentM ?? d.getMonth() + 1;
        rentY = rentY ?? d.getFullYear();
      }
    }
    const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
    const rawPaid = r.paidAmount ?? 0;
    let paid = 0, unpaid = 0;
    switch (r.paymentStatus) {
      case "PAID": paid = rawTotal; unpaid = 0; break;
      case "PARTIAL": paid = rawPaid; unpaid = rawTotal - rawPaid; break;
      default: paid = 0; unpaid = rawTotal; break;
    }
    overallCollected += paid;
    overallPending += unpaid;
    if (rentM === currentMonth && rentY === currentYear) {
      currentCollected += paid;
      currentPending += unpaid;
    }
  }

  // Payments made against previous Pending Amounts (already scoped to this warden's branch).
  try {
    const prev = await fetchPrevPendingPayments();
    for (const p of prev) {
      const amt = Number(p.amount ?? 0);
      overallCollected += amt;
      if (isInCurrentMonth(p)) currentCollected += amt;
    }
  } catch {
    /* keep rent-only figures */
  }

  // NEW: add the branch's tenant Pending Amounts to both pending figures.
  const branchTenantPending = sumTenantPending(
    tenants.filter((t: any) => tenantBranchOf(t, roomMap) === branchId)
  );
  currentPending += branchTenantPending;
  overallPending += branchTenantPending;

  return { currentCollected, currentPending, overallCollected, overallPending };
};

// `extraPending` = the tenant's own Pending Amount (Tenant.pendingAmount),
// added to both pending figures.
const computeTenantFinancials = async (tenantId: number, extraPending = 0) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const res = await api.get(`/rents/tenant/${tenantId}`);
  const rents: any[] = res.data?.data ?? res.data?.content ?? res.data ?? [];

  let currentMonthPaid = 0;
  let currentMonthPending = 0;
  let overallPaid = 0;
  let overallPending = 0;

  for (const r of rents) {
    const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
    const rawPaid = r.paidAmount ?? 0;
    let paid = 0, unpaid = 0;
    switch (r.paymentStatus) {
      case "PAID": paid = rawTotal; unpaid = 0; break;
      case "PARTIAL": paid = rawPaid; unpaid = rawTotal - rawPaid; break;
      default: paid = 0; unpaid = rawTotal; break;
    }
    overallPaid += paid;
    overallPending += unpaid;
    const rentM = r.rentMonth != null ? Number(r.rentMonth) : null;
    const rentY = r.rentYear != null ? Number(r.rentYear) : null;
    if (rentM === currentMonth && rentY === currentYear) {
      currentMonthPaid += paid;
      currentMonthPending += unpaid;
    }
  }

  // Payments made against the previous Pending Amount (by the tenant or recorded by staff).
  try {
    const history: any[] = await getTenantPaymentHistory(tenantId);
    for (const p of history.filter(isPrevPendingTxn)) {
      const amt = Number(p.amount ?? 0);
      overallPaid += amt;
      if (isInCurrentMonth(p)) currentMonthPaid += amt;
    }
  } catch {
    /* keep rent-only figures */
  }

  const extra = Math.max(0, Number(extraPending) || 0);
  currentMonthPending += extra;
  overallPending += extra;

  return { currentMonthPaid, currentMonthPending, overallPaid, overallPending };
};

interface AdminDetailModalProps {
  mode: DetailMode;
  branchId?: number | null;
  onClose: () => void;
}

const AdminDetailModal = ({ mode, branchId, onClose }: AdminDetailModalProps) => {
  const [rows, setRows] = useState<TenantDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const titleId = useId();

  useEscapeKey(onClose);

  useEffect(() => {
    if (!mode) return;
    setLoading(true); setError(null);
    (async () => {
      try {
        // /dashboard/tenant is TENANT-only on the backend, so ADMIN/WARDEN
        // go straight to the client-side computation.
        const data = await fetchTenantDetailsFromRents(mode!, branchId);
        setRows(data);
      } catch {
        setError("Failed to load data. Please try again.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, branchId]);

  const isCollected = mode === "currentCollected" || mode === "overallCollected";
  const filtered = rows
    .filter((r) =>
      r.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = isCollected ? a.collectedAmount : a.pendingAmount;
      const bv = isCollected ? b.collectedAmount : b.pendingAmount;
      return sortAsc ? av - bv : bv - av;
    });

  const total = filtered.reduce(
    (s, r) => s + (isCollected ? r.collectedAmount : r.pendingAmount), 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 id={titleId} className="text-base font-semibold">{mode ? adminModeLabels[mode] : ""}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tenant-wise breakdown</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-4 w-4 text-gray-600" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <input type="text" placeholder="Search by name or room…" value={search}
              aria-label="Search by tenant name or room"
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div role="status" className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No records found</div>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">{mode ? adminModeLabels[mode] : ""} by tenant</caption>
              <thead className="sticky top-0 bg-muted/60 border-b">
                <tr>
                  <th scope="col" className={`text-left px-6 py-3 ${TH_CLASS}`}>ID</th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Tenant</th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Room</th>
                  {isCollected ? (
                    <>
                      <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Pending</th>
                      <SortHeader label="Collected" asc={sortAsc} onToggle={() => setSortAsc((p) => !p)} className="text-right px-6 py-3" />
                    </>
                  ) : (
                    <>
                      <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Collected</th>
                      <SortHeader label="Pending" asc={sortAsc} onToggle={() => setSortAsc((p) => !p)} className="text-right px-6 py-3" />
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row, i) => (
                  <tr key={row.tenantId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.tenantName}</div>
                      {row.branchName && <div className="text-xs text-muted-foreground">{row.branchName}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.roomNumber}</td>
                    {isCollected ? (
                      <>
                        <td className="px-4 py-3 text-rose-600 font-medium">₹{Math.round(row.pendingAmount).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-emerald-700 font-semibold">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-emerald-700 font-medium">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-rose-600 font-semibold">₹{Math.round(row.pendingAmount).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
            </span>
            <span className={`text-sm font-bold ${isCollected ? "text-emerald-700" : "text-rose-600"}`}>
              Total: ₹{Math.round(total).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface TenantDetailModalProps {
  mode: TenantDetailMode;
  tenantId: number;
  // NEW: the tenant's own Pending Amount, listed as an extra row in the
  // two pending views (this month / all-time) and included in their total.
  extraPending?: number;
  onClose: () => void;
}

const TenantDetailModal = ({ mode, tenantId, extraPending = 0, onClose }: TenantDetailModalProps) => {
  const [rows, setRows] = useState<RentRecord[]>([]);
  const [prevPaid, setPrevPaid] = useState<{ id: number; amount: number; when: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const titleId = useId();

  useEscapeKey(onClose);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await api.get(`/rents/tenant/${tenantId}`);
        const data: RentRecord[] = res.data?.data ?? res.data?.content ?? res.data ?? [];

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const filtered = data.filter((r) => {
          const isCurrent = mode === "thisMonthPaid" || mode === "thisMonthPending";
          const isPaid = mode === "thisMonthPaid" || mode === "overallPaid";
          if (isCurrent) {
            if (r.rentMonth !== currentMonth || r.rentYear !== currentYear) return false;
          }
          if (isPaid) {
            return r.paymentStatus === "PAID" || r.paymentStatus === "PARTIAL";
          } else {
            return r.paymentStatus === "PENDING" || r.paymentStatus === "PARTIAL";
          }
        });

        setRows(filtered);

        // Paid views also list payments made against the previous Pending Amount.
        if (mode === "thisMonthPaid" || mode === "overallPaid") {
          try {
            const hist: any[] = await getTenantPaymentHistory(tenantId);
            setPrevPaid(
              hist
                .filter(isPrevPendingTxn)
                .filter((p) => mode === "overallPaid" || isInCurrentMonth(p))
                .map((p) => ({
                  id: Number(p.id),
                  amount: Number(p.amount ?? 0),
                  when: new Date(p.verifiedAt ?? p.submittedAt).toLocaleDateString(),
                }))
            );
          } catch {
            setPrevPaid([]);
          }
        } else {
          setPrevPaid([]);
        }
      } catch {
        setError("Failed to load payment records. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, tenantId]);

  const isPaidMode = mode === "thisMonthPaid" || mode === "overallPaid";

  const filtered = rows
    .filter((r) =>
      `${MONTH_NAMES[r.rentMonth]} ${r.rentYear}`.toLowerCase().includes(search.toLowerCase()) ||
      (r.transactionId ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.paymentMode ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = isPaidMode ? (a.paidAmount ?? 0) : (a.pendingAmount ?? 0);
      const bv = isPaidMode ? (b.paidAmount ?? 0) : (b.pendingAmount ?? 0);
      return sortAsc ? av - bv : bv - av;
    });

  // The tenant's own Pending Amount row (pending views only; hidden while a
  // search term is active, since it doesn't belong to any month).
  const showExtra = !isPaidMode && extraPending > 0 && search.trim() === "";
  // Payments made against the previous Pending Amount (paid views only).
  const showPrevPaid = isPaidMode && prevPaid.length > 0 && search.trim() === "";
  const prevPaidTotal = showPrevPaid ? prevPaid.reduce((s, x) => s + x.amount, 0) : 0;

  const total =
    filtered.reduce(
      (s, r) => s + (isPaidMode ? (r.paidAmount ?? 0) : (r.pendingAmount ?? 0)), 0
    ) + (showExtra ? extraPending : 0) + prevPaidTotal;

  const extraCount = (showExtra ? 1 : 0) + (showPrevPaid ? prevPaid.length : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 id={titleId} className="text-base font-semibold">{tenantModeLabels[mode]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Month-wise payment breakdown</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-4 w-4 text-gray-600" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <input type="text" placeholder="Search by month, mode, or transaction ID…" value={search}
              aria-label="Search by month, payment mode, or transaction ID"
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div role="status" className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading records…</div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 && !showExtra && !showPrevPaid ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 opacity-30" aria-hidden="true" />
              <p className="text-sm">No records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">{tenantModeLabels[mode]}</caption>
              <thead className="sticky top-0 bg-muted/60 border-b">
                <tr>
                  <th scope="col" className={`text-left px-5 py-3 ${TH_CLASS}`}>ID</th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" /> Period</span>
                  </th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Status</th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>
                    <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" aria-hidden="true" /> Mode</span>
                  </th>
                  <th scope="col" className={`text-left px-4 py-3 ${TH_CLASS}`}>Transaction ID</th>
                  <SortHeader
                    label={isPaidMode ? "Paid" : "Pending"}
                    asc={sortAsc}
                    onToggle={() => setSortAsc((p) => !p)}
                    className="text-right px-5 py-3"
                  />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row, i) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{MONTH_NAMES[row.rentMonth]} {row.rentYear}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Rent ₹{Math.round(row.rentAmount ?? 0).toLocaleString()} · EB ₹{Math.round(row.ebAmount ?? 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.paymentStatus} /></td>
                    <td className="px-4 py-3"><PaymentBadge mode={row.paymentMode} /></td>
                    <td className="px-4 py-3">
                      {row.transactionId ? (
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground border">{row.transactionId}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isPaidMode ? (
                        <div>
                          <span className="font-semibold text-emerald-700">₹{Math.round(row.paidAmount ?? 0).toLocaleString()}</span>
                          {(row.pendingAmount ?? 0) > 0 && (
                            <div className="text-xs text-rose-600 mt-0.5">+₹{Math.round(row.pendingAmount).toLocaleString()} due</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-rose-600">₹{Math.round(row.pendingAmount ?? 0).toLocaleString()}</span>
                          {(row.paidAmount ?? 0) > 0 && (
                            <div className="text-xs text-emerald-700 mt-0.5">₹{Math.round(row.paidAmount).toLocaleString()} paid</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {showExtra && (
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground text-xs">{filtered.length + 1}</td>
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="font-medium">Pending Amount</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Previous dues on your account</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-rose-600">₹{Math.round(extraPending).toLocaleString()}</span>
                    </td>
                  </tr>
                )}
                {showPrevPaid && prevPaid.map((p, idx) => (
                  <tr key={`prev-${p.id}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground text-xs">{filtered.length + idx + 1}</td>
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="font-medium">Previous Pending Amount</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Paid on {p.when}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-emerald-700">₹{Math.round(p.amount).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && (filtered.length > 0 || showExtra || showPrevPaid) && (
          <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {filtered.length + extraCount} record{filtered.length + extraCount !== 1 ? "s" : ""}
            </span>
            <span className={`text-sm font-bold ${isPaidMode ? "text-emerald-700" : "text-rose-600"}`}>
              Total: ₹{Math.round(total).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ data }: { data: GlobalDashboard; userName?: string }) => {
  const [detailMode, setDetailMode] = useState<DetailMode>(null);

  const stats: StatCardProps[] = [
    { label: "Total Branches", value: data.totalBranches ?? 0, sub: "Active hostel units", icon: GitBranch, color: "text-[#6A35FF]", iconBg: "bg-[#6A35FF]/10" },
    { label: "Total Rooms", value: data.totalRooms ?? 0, sub: "All branches combined", icon: Building2, color: "text-sky-600", iconBg: "bg-sky-50" },
    { label: "Total Beds", value: data.totalBeds ?? 0, sub: `${data.occupiedBeds ?? 0} Occupied · ${data.availableBeds ?? 0} Available`, icon: BedDouble, color: "text-blue-600", iconBg: "bg-blue-50" },
    { label: "Active Tenants", value: data.activeTenants ?? 0, sub: "Currently staying", icon: Users, color: "text-emerald-600", iconBg: "bg-emerald-50" },
    { label: "EB Units", value: (data.totalUnits ?? 0).toLocaleString(), sub: "Current Month", icon: Zap, color: "text-orange-500", iconBg: "bg-orange-50" },
  ];

  return (
    <div>
      {detailMode && <AdminDetailModal mode={detailMode} branchId={null} onClose={() => setDetailMode(null)} />}

      {/* RESPONSIVE FIX: was a fixed grid-cols-5, which clipped cards on narrow screens */}
      <div className="dashboard-stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <section aria-labelledby="admin-fin-heading">
          <h2 id="admin-fin-heading" className="text-[14px] font-bold text-gray-900 mb-4">Financial Summary (Rent + EB)</h2>
          <FinanceCardsSection
            currentCollected={data.rentCollected ?? 0}
            currentPending={data.pendingDues ?? 0}
            overallCollected={data.overallCollected ?? 0}
            overallPending={data.overallPending ?? 0}
            onCardClick={setDetailMode}
          />
        </section>
      </div>

      {/* RESPONSIVE FIX: was a fixed grid-cols-3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Complaints</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-[#6A35FF]" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
            <p className="text-[12px] text-gray-600 mt-1">All clear! No complaints at the moment.</p>
          </div>
          <Link to="/complaints" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
            View All Complaints
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Upcoming Check-Out</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <CalendarCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
            <p className="text-[12px] text-gray-600 mt-1">No tenants scheduled for check-out.</p>
          </div>
          <Link to="/checkout" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
            View All Check-Outs
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Payments</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
            <p className="text-[12px] text-gray-600 mt-1">Payment history will appear here.</p>
          </div>
          <Link to="/payments" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
            View All Payments
          </Link>
        </div>
      </div>
    </div>
  );
};

interface WardenDashboardProps {
  data: GlobalDashboard; userName?: string; unitName?: string;
  branchId?: number | null;
  financials: { currentCollected: number; currentPending: number; overallCollected: number; overallPending: number };
}

const WardenDashboard = ({ data, branchId, financials }: WardenDashboardProps) => {
  const [detailMode, setDetailMode] = useState<DetailMode>(null);

  const stats: StatCardProps[] = [
    { label: "Total Rooms", value: data.totalRooms ?? 0, sub: "In your branch", icon: Building2, color: "text-sky-600", iconBg: "bg-sky-50" },
    { label: "Total Beds", value: data.totalBeds ?? 0, sub: "In your branch", icon: BedDouble, color: "text-cyan-600", iconBg: "bg-cyan-50" },
    { label: "Occupied Beds", value: data.occupiedBeds ?? 0, sub: "Currently occupied", icon: BedDouble, color: "text-orange-500", iconBg: "bg-orange-50" },
    { label: "Available Beds", value: data.availableBeds ?? 0, sub: "Ready to occupy", icon: CheckCircle2, color: "text-emerald-600", iconBg: "bg-emerald-50" },
    { label: "Active Tenants", value: data.activeTenants ?? 0, sub: "Currently staying", icon: Users, color: "text-blue-600", iconBg: "bg-blue-50" },
    { label: "EB Units", value: (data.totalUnits ?? 0).toLocaleString(), sub: "Current Month", icon: Zap, color: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  return (
    <div>
      {detailMode && <AdminDetailModal mode={detailMode} branchId={branchId} onClose={() => setDetailMode(null)} />}

      <SectionHeading>Branch Overview</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <SectionHeading>Financial Summary · Rent + EB</SectionHeading>
      <div className="mb-8">
        <FinanceCardsSection
          currentCollected={financials.currentCollected}
          currentPending={financials.currentPending}
          overallCollected={financials.overallCollected}
          overallPending={financials.overallPending}
          onCardClick={setDetailMode}
        />
      </div>

      <SectionHeading>Quick Actions & Updates</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(106,53,255,0.08)] hover:border-[#6A35FF]/20 flex flex-col min-h-[220px] transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-[#6A35FF] transition-colors">Recent Complaints</h3>
            <div className="h-2 w-2 rounded-full bg-[#6A35FF]/30 group-hover:bg-[#6A35FF] transition-colors" aria-hidden="true" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#6A35FF]/15 transition-all duration-300">
              <MessageSquare className="h-5 w-5 text-[#6A35FF]" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
            <p className="text-[12px] text-gray-600 mt-1">All clear! No complaints at the moment.</p>
          </div>
          <Link to="/complaints" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-[#6A35FF] hover:text-white hover:border-[#6A35FF] transition-all duration-300">
            View All Complaints
          </Link>
        </div>

        <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.08)] hover:border-blue-500/20 flex flex-col min-h-[220px] transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Upcoming Check-Out</h3>
            <div className="h-2 w-2 rounded-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" aria-hidden="true" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
              <CalendarCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
            <p className="text-[12px] text-gray-600 mt-1">No tenants scheduled for check-out.</p>
          </div>
          <Link to="/checkout" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-blue-700 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300">
            View All Check-Outs
          </Link>
        </div>

        <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 flex flex-col min-h-[220px] transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">Recent Payments</h3>
            <div className="h-2 w-2 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" aria-hidden="true" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300">
              <Wallet className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
            <p className="text-[12px] text-gray-600 mt-1">Payment history will appear here.</p>
          </div>
          <Link to="/payments" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-emerald-700 bg-white hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-300">
            View All Payments
          </Link>
        </div>
      </div>
    </div>
  );
};

interface TenantFinancials {
  currentMonthPaid: number; currentMonthPending: number;
  overallPaid: number; overallPending: number;
}

const TenantDashboardView = ({ data, financials }: { data: TenantDashboard; financials: TenantFinancials }) => {
  const [detailMode, setDetailMode] = useState<TenantDetailMode | null>(null);

  const tenantId =
    data.tenantId ??
    Number(sessionStorage.getItem("tenantId") ?? sessionStorage.getItem("userId") ?? 0);

  return (
    <div>
      {detailMode && tenantId ? (
        <TenantDetailModal
          mode={detailMode}
          tenantId={tenantId}
          extraPending={Number(data.tenantPendingAmount ?? 0)}
          onClose={() => setDetailMode(null)}
        />
      ) : null}
      <SectionHeading>My Room &amp; Bed Details</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="My Room" value={data.myRoomNumber ?? "—"} sub={data.myRoomType ?? "Room type"} icon={Home} color="text-primary" iconBg="bg-primary/10" />
        <StatCard label="My Bed" value={data.myBedNumber ?? "—"} sub="Assigned bed number" icon={Bed} color="text-cyan-600" iconBg="bg-cyan-50" />
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 col-span-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-3">Contact</p>
          <div className="space-y-1.5 text-sm">
            <div><span className="text-gray-600 text-xs">Phone: </span><span className="font-medium text-gray-800">{data.tenantPhone ?? "—"}</span></div>
            <div><span className="text-gray-600 text-xs">Email: </span><span className="font-medium text-xs text-gray-800">{data.tenantEmail ?? "—"}</span></div>
            <div><span className="text-gray-600 text-xs">Branch: </span><span className="font-medium text-xs text-gray-800">{data.myBranchName ?? "—"}</span></div>
          </div>
        </div>
      </div>
      <div className="mt-9">
        <div className="flex items-center justify-between mb-1">
          <SectionHeading>My Financials · Rent + EB</SectionHeading>
          {financials.currentMonthPending > 0 || financials.overallPending > 0 ? (
            <Link
              to="/payments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:opacity-90 transition-opacity px-3.5 py-2 rounded-lg mb-3"
            >
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" /> Pay Now
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FinCard label="This Month Paid" value={financials.currentMonthPaid} icon={CheckCircle2} color="text-emerald-700" iconBg="bg-emerald-50" accent="bg-emerald-400" onClick={() => setDetailMode("thisMonthPaid")} />
          <FinCard label="This Month Pending" value={financials.currentMonthPending} icon={AlertTriangle} color="text-rose-600" iconBg="bg-rose-50" accent="bg-rose-400" onClick={() => setDetailMode("thisMonthPending")} />
          <FinCard label="Overall Paid" value={financials.overallPaid} icon={TrendingUp} color="text-indigo-600" iconBg="bg-indigo-50" accent="bg-indigo-400" onClick={() => setDetailMode("overallPaid")} />
          <FinCard label="Overall Pending" value={financials.overallPending} icon={TrendingDown} color="text-orange-700" iconBg="bg-orange-50" accent="bg-orange-400" onClick={() => setDetailMode("overallPending")} />
        </div>
        <div className="mt-3">
          <Link to="/payments" className="text-xs text-gray-600 underline underline-offset-2 hover:text-foreground transition-colors">
            View full payment history →
          </Link>
        </div>
      </div>
    </div>
  );
};

const ZERO_FINANCIALS = { currentCollected: 0, currentPending: 0, overallCollected: 0, overallPending: 0 };
const ZERO_TENANT_FINANCIALS: TenantFinancials = { currentMonthPaid: 0, currentMonthPending: 0, overallPaid: 0, overallPending: 0 };

const Dashboard = () => {
  const [globalData, setGlobalData] = useState<GlobalDashboard | null>(null);
  const [tenantData, setTenantData] = useState<TenantDashboard | null>(null);
  const [wardenFin, setWardenFin] = useState(ZERO_FINANCIALS);
  const [tenantFin, setTenantFin] = useState<TenantFinancials>(ZERO_TENANT_FINANCIALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const role = getUserRole();
  const branchId = getBranchId();
  const userName =
    sessionStorage.getItem("userName") ??
    sessionStorage.getItem("name") ??
    sessionStorage.getItem("user_name") ?? "";

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      if (role === "TENANT") {
        try {
          const res = await api.get("/dashboard/tenant");
          const data = res.data?.data ?? res.data ?? null;
          if (!data) throw new Error("Empty response");
          setTenantData(data);

          // The tenant's own Pending Amount (Tenant.pendingAmount).
          const tenantExtra = Math.max(0, Number(data.tenantPendingAmount ?? 0));

          const tenantId =
            data.tenantId ??
            Number(sessionStorage.getItem("tenantId") ?? sessionStorage.getItem("userId") ?? 0);

          if (tenantId) {
            try {
              const fin = await computeTenantFinancials(tenantId, tenantExtra);
              setTenantFin(fin);
            } catch {
              setTenantFin({
                currentMonthPaid: data.currentMonthPaid ?? 0,
                currentMonthPending: (data.currentMonthPending ?? 0) + tenantExtra,
                overallPaid: data.overallPaid ?? 0,
                overallPending: (data.overallPending ?? 0) + tenantExtra,
              });
            }
          } else {
            setTenantFin({
              currentMonthPaid: data.currentMonthPaid ?? 0,
              currentMonthPending: (data.currentMonthPending ?? 0) + tenantExtra,
              overallPaid: data.overallPaid ?? 0,
              overallPending: (data.overallPending ?? 0) + tenantExtra,
            });
          }
        } catch (err: any) {
          const status = err?.response?.status;
          setError(
            status === 403 ? "Access denied. Please log out and log in again."
              : status === 404 ? "Tenant profile not found. Contact your admin."
                : "Failed to load dashboard. Please refresh."
          );
        }
        return;
      }

      try {
        const res: GlobalDashboard = await getDashboard();

        if (role === "WARDEN" && branchId) {
          const bd = res.branches?.find((b) => Number(b.branchId) === Number(branchId));
          const occupied = bd ? (bd.activeTenants ?? 0) : 0;

          setGlobalData({
            ...res,
            totalRooms: bd?.rooms ?? 0,
            totalBeds: bd?.beds ?? 0,
            occupiedBeds: occupied,
            availableBeds: (bd?.beds ?? 0) - occupied,
            activeTenants: bd?.activeTenants ?? 0,
            totalUnits: bd?.ebUnits ?? 0,
            rentCollected: 0, pendingDues: 0,
            overallCollected: 0, overallPending: 0,
            rentOnlyCollected: 0, ebOnlyCollected: 0,
            rentOnlyPending: 0, ebOnlyPending: 0,
            overallRentCollected: 0, overallEBCollected: 0,
            overallRentPending: 0, overallEBPending: 0,
            unpaidCount: res.unpaidCount ?? 0,
            branches: bd ? [bd] : [],
            unitName: bd?.branchName ?? "",
          });

          try {
            const fin = await computeWardenFinancials(Number(branchId));
            setWardenFin(fin);
          } catch {
            if (bd) {
              setWardenFin({
                currentCollected: bd.collected ?? 0,
                currentPending: bd.pending ?? 0,
                overallCollected: bd.overallCollected ?? bd.collected ?? 0,
                overallPending: bd.overallPending ?? bd.pending ?? 0,
              });
            }
          }
          return;
        }

        // ADMIN: the backend totals only cover Rent records, so add every
        // tenant's own Pending Amount on top of both pending cards.
        let tenantPendingTotal = 0;
        try {
          const allTenants = await fetchAll("/tenants");
          tenantPendingTotal = sumTenantPending(allTenants);
        } catch {
          tenantPendingTotal = 0;
        }

        setGlobalData({
          ...res,
          pendingDues: (res.pendingDues ?? 0) + tenantPendingTotal,
          overallPending: (res.overallPending ?? 0) + tenantPendingTotal,
        });
      } catch (err: any) {
        const status = err?.response?.status;
        setError(
          status === 403
            ? "Access denied. Please log out and log in again."
            : "Failed to load dashboard. Please refresh."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center py-24 text-sm text-gray-600 gap-2">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-destructive font-medium">{error}</p>
        <button
          onClick={() => { hasFetched.current = false; loadDashboard(); }}
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 underline underline-offset-2 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  if (role === "TENANT") {
    if (!tenantData) {
      return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">No tenant data found. Contact your admin.</div>;
    }
    return <TenantDashboardView data={tenantData} financials={tenantFin} />;
  }

  if (!globalData) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">No dashboard data found.</div>;
  }

  if (role === "WARDEN") {
    return <WardenDashboard data={globalData} userName={userName} branchId={branchId ? Number(branchId) : null} financials={wardenFin} />;
  }

  return <AdminDashboard data={globalData} userName={userName} />;
};

export default Dashboard;