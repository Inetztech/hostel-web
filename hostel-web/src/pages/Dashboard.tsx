// import { useEffect, useState, useRef } from "react";
// import { Link } from "react-router-dom";
// import { getDashboard, getUserRole, getBranchId } from "@/lib/store";
// import api from "@/lib/api";
// import {
//   Building2, Users, Zap, BedDouble, AlertTriangle, GitBranch,
//   CheckCircle2, Home, Bed, TrendingUp, TrendingDown, X, Search,
//   ChevronDown, ChevronUp, RefreshCw, CreditCard, Banknote, Calendar,
//   MessageSquare, CalendarCheck, Wallet
// } from "lucide-react";

// interface BranchStat {
//   branchId: number; branchName: string; rooms: number; beds: number;
//   activeTenants: number; ebUnits: number; collected: number; pending: number;
//   overallCollected?: number; overallPending?: number;
//   overallRentCollected?: number; overallEBCollected?: number;
//   overallRentPending?: number; overallEBPending?: number;
//   rentOnlyCollected?: number; ebOnlyCollected?: number;
//   rentOnlyPending?: number; ebOnlyPending?: number;
// }

// interface GlobalDashboard {
//   totalBranches: number; totalRooms: number; totalBeds: number;
//   occupiedBeds: number; availableBeds: number; activeTenants: number;
//   totalUnits: number; rentCollected: number; pendingDues: number;
//   unpaidCount: number; rentOnlyCollected: number; ebOnlyCollected: number;
//   rentOnlyPending: number; ebOnlyPending: number;
//   overallCollected: number; overallPending: number;
//   overallRentCollected: number; overallEBCollected: number;
//   overallRentPending: number; overallEBPending: number;
//   branches: BranchStat[]; userName?: string; unitName?: string;
// }

// interface TenantDashboard {
//   tenantId?: number;
//   tenantName: string; tenantPhone: string; tenantEmail: string;
//   myBranchName: string; myRoomNumber: string; myBedNumber: string;
//   myRoomType: string; currentMonthPaid: number; currentMonthPending: number;
//   overallPaid: number; overallPending: number;
//   totalRooms: number; totalBeds: number;
//   availableBeds: number; notAvailableBeds: number;
// }

// export interface TenantDetail {
//   tenantId: number; tenantName: string; roomNumber: string;
//   bedNumber: string; branchName?: string;
//   collectedAmount: number; pendingAmount: number;
// }

// interface RentRecord {
//   id: number;
//   rentMonth: number;
//   rentYear: number;
//   rentAmount: number;
//   ebAmount: number;
//   totalAmount: number;
//   paidAmount: number;
//   pendingAmount: number;
//   paymentStatus: "PAID" | "PARTIAL" | "PENDING";
//   paymentMode: string | null;
//   transactionId: string | null;
// }

// type DetailMode = "currentCollected" | "currentPending" | "overallCollected" | "overallPending" | null;
// type TenantDetailMode = "thisMonthPaid" | "thisMonthPending" | "overallPaid" | "overallPending";

// const MONTH_NAMES = [
//   "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
// ];

// const PAGE_SIZE = 10;

// const tenantModeLabels: Record<TenantDetailMode, string> = {
//   thisMonthPaid: "This Month — Paid Records",
//   thisMonthPending: "This Month — Pending Dues",
//   overallPaid: "All-Time Paid Records",
//   overallPending: "All-Time Pending Dues",
// };

// const adminModeLabels: Record<NonNullable<DetailMode>, string> = {
//   currentCollected: "Collected This Month",
//   currentPending: "Pending Dues This Month",
//   overallCollected: "Overall Collected",
//   overallPending: "Overall Pending",
// };

// const fetchAll = async (url: string, extraParams?: Record<string, any>): Promise<any[]> => {
//   const first = await api.get(url, {
//     params: { page: 0, size: PAGE_SIZE, ...extraParams },
//   });

//   const firstContent: any[] =
//     first.data?.data?.content ?? first.data?.content ?? first.data?.data ?? [];
//   const total: number =
//     first.data?.data?.totalElements ?? first.data?.totalElements ?? 0;

//   if (total <= PAGE_SIZE || firstContent.length === 0) return firstContent;

//   const totalPages = Math.ceil(total / PAGE_SIZE);

//   const remaining = await Promise.all(
//     Array.from({ length: totalPages - 1 }, (_, i) =>
//       api.get(url, { params: { page: i + 1, size: PAGE_SIZE, ...extraParams } })
//     )
//   );

//   return remaining.reduce(
//     (all, res) => {
//       const content: any[] =
//         res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [];
//       return [...all, ...content];
//     },
//     firstContent
//   );
// };

// const PaymentBadge = ({ mode }: { mode: string | null }) => {
//   if (!mode) return <span className="text-xs text-muted-foreground">—</span>;
//   const upper = mode.toUpperCase();
//   if (upper === "CASH") {
//     return (
//       <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
//         <Banknote className="h-3 w-3" /> Cash
//       </span>
//     );
//   }
//   if (upper === "UPI") {
//     return (
//       <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
//         <CreditCard className="h-3 w-3" /> UPI
//       </span>
//     );
//   }
//   return (
//     <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
//       <CreditCard className="h-3 w-3" /> {mode}
//     </span>
//   );
// };

// const StatusBadge = ({ status }: { status: string }) => {
//   const s = status?.toUpperCase();
//   if (s === "PAID")
//     return (
//       <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
//         <CheckCircle2 className="h-3 w-3" /> Paid
//       </span>
//     );
//   if (s === "PARTIAL")
//     return (
//       <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
//         <AlertTriangle className="h-3 w-3" /> Partial
//       </span>
//     );
//   return (
//     <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
//       <AlertTriangle className="h-3 w-3" /> Pending
//     </span>
//   );
// };

// interface StatCardProps {
//   label: string; value: string | number; sub?: string;
//   icon: React.ElementType; color: string; iconBg: string;
// }

// const StatCard = ({ label, value, sub, icon: Icon, color, iconBg }: StatCardProps) => (
//   <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)] hover:-translate-y-[1px] transition-all duration-200">
//     <div className="min-w-0">
//       <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">{label}</p>
//       <p className="text-[26px] font-bold leading-tight mt-1 text-gray-900 tabular-nums">{value}</p>
//       {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
//     </div>
//     <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
//       <Icon className={`h-5 w-5 ${color}`} />
//     </div>
//   </div>
// );

// interface FinCardProps {
//   label: string; value: number; icon: React.ElementType;
//   color: string; iconBg: string; accent: string;
//   onClick?: () => void;
// }

// const FinCard = ({ label, value, icon: Icon, color, iconBg, accent, onClick }: FinCardProps) => (
//   <div
//     onClick={onClick}
//     className={`relative bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${onClick ? "cursor-pointer hover:shadow-[0_8px_20px_rgba(16,24,40,0.08)] hover:-translate-y-[2px] active:translate-y-0 transition-all duration-200" : ""}`}
//   >
//     <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
//     <div className="min-w-0 pl-1.5">
//       <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">{label}</p>
//       <p className={`text-[22px] font-bold leading-tight mt-1 tabular-nums ${color}`}>
//         ₹{Math.round(value).toLocaleString()}
//       </p>
//       {onClick && <p className="text-[10.5px] text-gray-400 mt-1 font-medium">View details →</p>}
//     </div>
//     <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
//       <Icon className={`h-5 w-5 ${color}`} />
//     </div>
//   </div>
// );

// interface FinanceCardsProps {
//   currentCollected: number; currentPending: number;
//   overallCollected: number; overallPending: number;
//   onCardClick?: (mode: DetailMode) => void;
// }

// const FinanceCardsSection = ({
//   currentCollected, currentPending,
//   overallCollected, overallPending,
//   onCardClick,
// }: FinanceCardsProps) => (
//   <div className="grid grid-cols-2 gap-4">
//     <FinCard label="Collected This Month" value={currentCollected}
//       icon={CheckCircle2} color="text-emerald-600"
//       iconBg="bg-emerald-50"
//       accent="bg-emerald-400"
//       onClick={onCardClick ? () => onCardClick("currentCollected") : undefined} />
//     <FinCard label="Pending This Month" value={currentPending}
//       icon={AlertTriangle} color="text-rose-600"
//       iconBg="bg-rose-50"
//       accent="bg-rose-400"
//       onClick={onCardClick ? () => onCardClick("currentPending") : undefined} />
//     <FinCard label="Overall Collected" value={overallCollected}
//       icon={TrendingUp} color="text-[#6A35FF]"
//       iconBg="bg-[#6A35FF]/10"
//       accent="bg-[#6A35FF]"
//       onClick={onCardClick ? () => onCardClick("overallCollected") : undefined} />
//     <FinCard label="Overall Pending" value={overallPending}
//       icon={TrendingDown} color="text-orange-600"
//       iconBg="bg-orange-50"
//       accent="bg-orange-400"
//       onClick={onCardClick ? () => onCardClick("overallPending") : undefined} />
//   </div>
// );

// const SectionHeading = ({ children }: { children: React.ReactNode }) => (
//   <h2 className="text-[11px] font-semibold mb-4 text-gray-400 uppercase tracking-wider flex items-center gap-2">
//     <span className="h-3 w-[3px] rounded-full bg-blue-500/70" />
//     {children}
//   </h2>
// );

// const fetchTenantDetailsFromRents = async (
//   mode: NonNullable<DetailMode>,
//   branchId?: number | null
// ): Promise<TenantDetail[]> => {
//   const now = new Date();
//   const currentMonth = now.getMonth() + 1;
//   const currentYear = now.getFullYear();

//   const [rents, tenants, rooms] = await Promise.all([
//     fetchAll("/rents", { _ts: Date.now() }),
//     fetchAll("/tenants"),
//     fetchAll("/rooms"),
//   ]);

//   const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));
//   const roomMap = new Map(rooms.map((r: any) => [r.id, r]));
//   const bedMap = new Map<number, string>();
//   for (const room of rooms)
//     for (const bed of room.beds ?? []) bedMap.set(Number(bed.id), String(bed.bedNumber));

//   const isCurrent = mode === "currentCollected" || mode === "currentPending";
//   const isCollected = mode === "currentCollected" || mode === "overallCollected";

//   const filtered = rents.filter((r: any) => {
//     let rentM: number | null = r.rentMonth != null ? Number(r.rentMonth) : null;
//     let rentY: number | null = r.rentYear != null ? Number(r.rentYear) : null;
//     if ((rentM == null || rentY == null) && r.paymentDate) {
//       const d = new Date(r.paymentDate);
//       if (!isNaN(d.getTime())) {
//         rentM = rentM ?? d.getMonth() + 1;
//         rentY = rentY ?? d.getFullYear();
//       }
//     }
//     if (isCurrent) {
//       if (rentM == null || rentY == null) return false;
//       if (rentM !== currentMonth || rentY !== currentYear) return false;
//     }
//     if (branchId) {
//       const room = roomMap.get(Number(r.roomId));
//       const roomBranch = room ? (room.unitId ?? room.branchId ?? null) : null;
//       if (roomBranch != null) {
//         if (Number(roomBranch) !== Number(branchId)) return false;
//       } else {
//         const tenant = tenantMap.get(Number(r.tenantId));
//         const tenantBranch = tenant ? (tenant.unitId ?? tenant.branchId ?? null) : null;
//         if (tenantBranch == null || Number(tenantBranch) !== Number(branchId)) return false;
//       }
//     }
//     if (isCollected) return r.paymentStatus === "PAID" || r.paymentStatus === "PARTIAL";
//     return r.paymentStatus === "PENDING" || r.paymentStatus === "PARTIAL";
//   });

//   const map = new Map<number, TenantDetail>();
//   for (const r of filtered) {
//     const tid = Number(r.tenantId);
//     const tenant = tenantMap.get(tid);
//     const room = roomMap.get(Number(r.roomId));
//     const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
//     const rawPaid = r.paidAmount ?? 0;

//     let collected: number, pending: number;
//     switch (r.paymentStatus) {
//       case "PAID": collected = rawTotal; pending = 0; break;
//       case "PARTIAL": collected = rawPaid; pending = rawTotal - rawPaid; break;
//       default: collected = 0; pending = rawTotal; break;
//     }

//     if (map.has(tid)) {
//       const e = map.get(tid)!;
//       e.collectedAmount += collected;
//       e.pendingAmount += pending;
//     } else {
//       map.set(tid, {
//         tenantId: tid,
//         tenantName: tenant?.name ?? `Tenant #${tid}`,
//         roomNumber: room?.roomNumber ?? "—",
//         bedNumber: tenant?.bedId != null
//           ? (bedMap.get(Number(tenant.bedId)) ?? String(tenant.bedId))
//           : "—",
//         collectedAmount: collected,
//         pendingAmount: pending,
//       });
//     }
//   }
//   return Array.from(map.values());
// };

// const computeWardenFinancials = async (branchId: number) => {
//   const now = new Date();
//   const currentMonth = now.getMonth() + 1;
//   const currentYear = now.getFullYear();

//   const [rents, rooms, tenants] = await Promise.all([
//     fetchAll("/rents", { _ts: Date.now() }),
//     fetchAll("/rooms"),
//     fetchAll("/tenants"),
//   ]);

//   const roomMap = new Map(rooms.map((r: any) => [r.id, r]));
//   const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

//   const branchRents = rents.filter((r: any) => {
//     const room = roomMap.get(Number(r.roomId));
//     const roomBranch = room ? (room.unitId ?? room.branchId ?? null) : null;
//     if (roomBranch != null) return Number(roomBranch) === branchId;
//     const tenant = tenantMap.get(Number(r.tenantId));
//     const tenantBranch = tenant ? (tenant.unitId ?? tenant.branchId ?? null) : null;
//     return tenantBranch != null && Number(tenantBranch) === branchId;
//   });

//   let currentCollected = 0, currentPending = 0;
//   let overallCollected = 0, overallPending = 0;

//   for (const r of branchRents) {
//     let rentM: number | null = r.rentMonth != null ? Number(r.rentMonth) : null;
//     let rentY: number | null = r.rentYear != null ? Number(r.rentYear) : null;
//     if ((rentM == null || rentY == null) && r.paymentDate) {
//       const d = new Date(r.paymentDate);
//       if (!isNaN(d.getTime())) {
//         rentM = rentM ?? d.getMonth() + 1;
//         rentY = rentY ?? d.getFullYear();
//       }
//     }
//     const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
//     const rawPaid = r.paidAmount ?? 0;
//     let paid = 0, unpaid = 0;
//     switch (r.paymentStatus) {
//       case "PAID": paid = rawTotal; unpaid = 0; break;
//       case "PARTIAL": paid = rawPaid; unpaid = rawTotal - rawPaid; break;
//       default: paid = 0; unpaid = rawTotal; break;
//     }
//     overallCollected += paid;
//     overallPending += unpaid;
//     if (rentM === currentMonth && rentY === currentYear) {
//       currentCollected += paid;
//       currentPending += unpaid;
//     }
//   }
//   return { currentCollected, currentPending, overallCollected, overallPending };
// };

// const computeTenantFinancials = async (tenantId: number) => {
//   const now = new Date();
//   const currentMonth = now.getMonth() + 1;
//   const currentYear = now.getFullYear();

//   const res = await api.get(`/rents/tenant/${tenantId}`);
//   const rents: any[] = res.data?.data ?? res.data?.content ?? res.data ?? [];

//   let currentMonthPaid = 0;
//   let currentMonthPending = 0;
//   let overallPaid = 0;
//   let overallPending = 0;

//   for (const r of rents) {
//     const rawTotal = r.totalAmount ?? (r.rentAmount ?? 0) + (r.ebAmount ?? 0);
//     const rawPaid = r.paidAmount ?? 0;
//     let paid = 0, unpaid = 0;
//     switch (r.paymentStatus) {
//       case "PAID": paid = rawTotal; unpaid = 0; break;
//       case "PARTIAL": paid = rawPaid; unpaid = rawTotal - rawPaid; break;
//       default: paid = 0; unpaid = rawTotal; break;
//     }
//     overallPaid += paid;
//     overallPending += unpaid;
//     const rentM = r.rentMonth != null ? Number(r.rentMonth) : null;
//     const rentY = r.rentYear != null ? Number(r.rentYear) : null;
//     if (rentM === currentMonth && rentY === currentYear) {
//       currentMonthPaid += paid;
//       currentMonthPending += unpaid;
//     }
//   }
//   return { currentMonthPaid, currentMonthPending, overallPaid, overallPending };
// };

// interface AdminDetailModalProps {
//   mode: DetailMode;
//   branchId?: number | null;
//   onClose: () => void;
// }

// const AdminDetailModal = ({ mode, branchId, onClose }: AdminDetailModalProps) => {
//   const [rows, setRows] = useState<TenantDetail[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [search, setSearch] = useState("");
//   const [sortAsc, setSortAsc] = useState(false);

//   useEffect(() => {
//     if (!mode) return;
//     setLoading(true); setError(null);
//     (async () => {
//       try {
//         let data: TenantDetail[] = [];
//         try {
//           const params: Record<string, string> = { mode };
//           if (branchId) params.branchId = String(branchId);
//           const res = await api.get("/dashboard/tenant", { params });
//           data = res.data?.data ?? res.data?.content ?? res.data ?? [];
//         } catch { /* fall through */ }
//         if (!data || data.length === 0) {
//           data = await fetchTenantDetailsFromRents(mode!, branchId);
//         }
//         setRows(data);
//       } catch {
//         setError("Failed to load data. Please try again.");
//         setRows([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [mode, branchId]);

//   const isCollected = mode === "currentCollected" || mode === "overallCollected";
//   const filtered = rows
//     .filter((r) =>
//       r.tenantName.toLowerCase().includes(search.toLowerCase()) ||
//       r.roomNumber.toLowerCase().includes(search.toLowerCase())
//     )
//     .sort((a, b) => {
//       const av = isCollected ? a.collectedAmount : a.pendingAmount;
//       const bv = isCollected ? b.collectedAmount : b.pendingAmount;
//       return sortAsc ? av - bv : bv - av;
//     });

//   const total = filtered.reduce(
//     (s, r) => s + (isCollected ? r.collectedAmount : r.pendingAmount), 0
//   );

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
//       onClick={(e) => e.target === e.currentTarget && onClose()}
//     >
//       <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border">
//         <div className="flex items-center justify-between px-6 py-4 border-b">
//           <div>
//             <h2 className="text-base font-semibold">{mode ? adminModeLabels[mode] : ""}</h2>
//             <p className="text-xs text-muted-foreground mt-0.5">Tenant-wise breakdown</p>
//           </div>
//           <button
//             onClick={onClose}
//             type="button"
//             style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
//             className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
//           >
//             <X className="h-4 w-4 text-gray-500" />
//           </button>
//         </div>
//         <div className="px-6 py-3 border-b">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
//             <input type="text" placeholder="Search by name or room…" value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
//           </div>
//         </div>
//         <div className="overflow-y-auto flex-1">
//           {loading ? (
//             <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
//           ) : error ? (
//             <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
//           ) : filtered.length === 0 ? (
//             <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No records found</div>
//           ) : (
//             <table className="w-full text-sm">
//               <thead className="sticky top-0 bg-muted/60 border-b">
//                 <tr>
//                   <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tenant</th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room</th>
//                   {isCollected ? (
//                     <>
//                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</th>
//                       <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
//                         onClick={() => setSortAsc(p => !p)}>
//                         <span className="inline-flex items-center gap-1">
//                           Collected {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
//                         </span>
//                       </th>
//                     </>
//                   ) : (
//                     <>
//                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collected</th>
//                       <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
//                         onClick={() => setSortAsc(p => !p)}>
//                         <span className="inline-flex items-center gap-1">
//                           Pending {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
//                         </span>
//                       </th>
//                     </>
//                   )}
//                 </tr>
//               </thead>
//               <tbody className="divide-y">
//                 {filtered.map((row, i) => (
//                   <tr key={row.tenantId} className="hover:bg-muted/30 transition-colors">
//                     <td className="px-6 py-3 text-muted-foreground text-xs">{i + 1}</td>
//                     <td className="px-4 py-3">
//                       <div className="font-medium">{row.tenantName}</div>
//                       {row.branchName && <div className="text-xs text-muted-foreground">{row.branchName}</div>}
//                     </td>
//                     <td className="px-4 py-3 text-muted-foreground">{row.roomNumber}</td>
//                     {isCollected ? (
//                       <>
//                         <td className="px-4 py-3 text-rose-600 font-medium">₹{Math.round(row.pendingAmount).toLocaleString()}</td>
//                         <td className="px-6 py-3 text-right text-emerald-600 font-semibold">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
//                       </>
//                     ) : (
//                       <>
//                         <td className="px-4 py-3 text-emerald-600 font-medium">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
//                         <td className="px-6 py-3 text-right text-rose-600 font-semibold">₹{Math.round(row.pendingAmount).toLocaleString()}</td>
//                       </>
//                     )}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}
//         </div>
//         {!loading && filtered.length > 0 && (
//           <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
//             <span className="text-xs text-muted-foreground">
//               {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
//             </span>
//             <span className={`text-sm font-bold ${isCollected ? "text-emerald-600" : "text-rose-600"}`}>
//               Total: ₹{Math.round(total).toLocaleString()}
//             </span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// interface TenantDetailModalProps {
//   mode: TenantDetailMode;
//   tenantId: number;
//   onClose: () => void;
// }

// const TenantDetailModal = ({ mode, tenantId, onClose }: TenantDetailModalProps) => {
//   const [rows, setRows] = useState<RentRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [search, setSearch] = useState("");
//   const [sortAsc, setSortAsc] = useState(false);

//   useEffect(() => {
//     setLoading(true);
//     setError(null);
//     (async () => {
//       try {
//         const res = await api.get(`/rents/tenant/${tenantId}`);
//         const data: RentRecord[] = res.data?.data ?? res.data?.content ?? res.data ?? [];

//         const now = new Date();
//         const currentMonth = now.getMonth() + 1;
//         const currentYear = now.getFullYear();

//         const filtered = data.filter((r) => {
//           const isCurrent = mode === "thisMonthPaid" || mode === "thisMonthPending";
//           const isPaid = mode === "thisMonthPaid" || mode === "overallPaid";
//           if (isCurrent) {
//             if (r.rentMonth !== currentMonth || r.rentYear !== currentYear) return false;
//           }
//           if (isPaid) {
//             return r.paymentStatus === "PAID" || r.paymentStatus === "PARTIAL";
//           } else {
//             return r.paymentStatus === "PENDING" || r.paymentStatus === "PARTIAL";
//           }
//         });

//         setRows(filtered);
//       } catch {
//         setError("Failed to load payment records. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [mode, tenantId]);

//   const isPaidMode = mode === "thisMonthPaid" || mode === "overallPaid";

//   const filtered = rows
//     .filter((r) =>
//       `${MONTH_NAMES[r.rentMonth]} ${r.rentYear}`.toLowerCase().includes(search.toLowerCase()) ||
//       (r.transactionId ?? "").toLowerCase().includes(search.toLowerCase()) ||
//       (r.paymentMode ?? "").toLowerCase().includes(search.toLowerCase())
//     )
//     .sort((a, b) => {
//       const av = isPaidMode ? (a.paidAmount ?? 0) : (a.pendingAmount ?? 0);
//       const bv = isPaidMode ? (b.paidAmount ?? 0) : (b.pendingAmount ?? 0);
//       return sortAsc ? av - bv : bv - av;
//     });

//   const total = filtered.reduce(
//     (s, r) => s + (isPaidMode ? (r.paidAmount ?? 0) : (r.pendingAmount ?? 0)), 0
//   );

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
//       onClick={(e) => e.target === e.currentTarget && onClose()}
//     >
//       <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border">
//         <div className="flex items-center justify-between px-6 py-4 border-b">
//           <div>
//             <h2 className="text-base font-semibold">{tenantModeLabels[mode]}</h2>
//             <p className="text-xs text-muted-foreground mt-0.5">Month-wise payment breakdown</p>
//           </div>
//           <button
//             onClick={onClose}
//             type="button"
//             style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
//             className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
//           >
//             <X className="h-4 w-4 text-gray-500" />
//           </button>
//         </div>
//         <div className="px-6 py-3 border-b">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
//             <input type="text" placeholder="Search by month, mode, or transaction ID…" value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
//           </div>
//         </div>
//         <div className="overflow-y-auto flex-1">
//           {loading ? (
//             <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading records…</div>
//           ) : error ? (
//             <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
//           ) : filtered.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
//               <CheckCircle2 className="h-8 w-8 opacity-30" />
//               <p className="text-sm">No records found</p>
//             </div>
//           ) : (
//             <table className="w-full text-sm">
//               <thead className="sticky top-0 bg-muted/60 border-b">
//                 <tr>
//                   <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
//                     <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Period</span>
//                   </th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
//                     <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> Mode</span>
//                   </th>
//                   <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction ID</th>
//                   <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
//                     onClick={() => setSortAsc((p) => !p)}>
//                     <span className="inline-flex items-center gap-1 justify-end">
//                       {isPaidMode ? "Paid" : "Pending"}
//                       {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
//                     </span>
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y">
//                 {filtered.map((row, i) => (
//                   <tr key={row.id} className="hover:bg-muted/30 transition-colors">
//                     <td className="px-5 py-3 text-muted-foreground text-xs">{i + 1}</td>
//                     <td className="px-4 py-3">
//                       <div className="font-medium">{MONTH_NAMES[row.rentMonth]} {row.rentYear}</div>
//                       <div className="text-xs text-muted-foreground mt-0.5">
//                         Rent ₹{Math.round(row.rentAmount ?? 0).toLocaleString()} · EB ₹{Math.round(row.ebAmount ?? 0).toLocaleString()}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3"><StatusBadge status={row.paymentStatus} /></td>
//                     <td className="px-4 py-3"><PaymentBadge mode={row.paymentMode} /></td>
//                     <td className="px-4 py-3">
//                       {row.transactionId ? (
//                         <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground border">{row.transactionId}</span>
//                       ) : (
//                         <span className="text-xs text-muted-foreground">—</span>
//                       )}
//                     </td>
//                     <td className="px-5 py-3 text-right">
//                       {isPaidMode ? (
//                         <div>
//                           <span className="font-semibold text-emerald-600">₹{Math.round(row.paidAmount ?? 0).toLocaleString()}</span>
//                           {(row.pendingAmount ?? 0) > 0 && (
//                             <div className="text-xs text-rose-500 mt-0.5">+₹{Math.round(row.pendingAmount).toLocaleString()} due</div>
//                           )}
//                         </div>
//                       ) : (
//                         <div>
//                           <span className="font-semibold text-rose-600">₹{Math.round(row.pendingAmount ?? 0).toLocaleString()}</span>
//                           {(row.paidAmount ?? 0) > 0 && (
//                             <div className="text-xs text-emerald-600 mt-0.5">₹{Math.round(row.paidAmount).toLocaleString()} paid</div>
//                           )}
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}
//         </div>
//         {!loading && filtered.length > 0 && (
//           <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
//             <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
//             <span className={`text-sm font-bold ${isPaidMode ? "text-emerald-600" : "text-rose-600"}`}>
//               Total: ₹{Math.round(total).toLocaleString()}
//             </span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// const AdminDashboard = ({ data }: { data: GlobalDashboard; userName?: string }) => {
//   const [detailMode, setDetailMode] = useState<DetailMode>(null);

//   const stats: StatCardProps[] = [
//     { label: "Total Branches", value: data.totalBranches ?? 0, sub: "Active hostel units", icon: GitBranch, color: "text-[#6A35FF]", iconBg: "bg-[#6A35FF]/10" },
//     { label: "Total Rooms", value: data.totalRooms ?? 0, sub: "All branches combined", icon: Building2, color: "text-sky-600", iconBg: "bg-sky-50" },
//     { label: "Total Beds", value: data.totalBeds ?? 0, sub: `${data.occupiedBeds ?? 0} Occupied · ${data.availableBeds ?? 0} Available`, icon: BedDouble, color: "text-blue-600", iconBg: "bg-blue-50" },
//     { label: "Active Tenants", value: data.activeTenants ?? 0, sub: "Currently staying", icon: Users, color: "text-emerald-600", iconBg: "bg-emerald-50" },
//     { label: "EB Units", value: (data.totalUnits ?? 0).toLocaleString(), sub: "Current Month", icon: Zap, color: "text-orange-500", iconBg: "bg-orange-50" },
//   ];

//   return (
//     <div>
//       {detailMode && <AdminDetailModal mode={detailMode} branchId={null} onClose={() => setDetailMode(null)} />}

//       <div className="grid grid-cols-5 gap-4 mb-6">
//         {stats.map((s) => <StatCard key={s.label} {...s} />)}
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 mb-6">
//         <div>
//           <h2 className="text-[14px] font-bold text-gray-900 mb-4">Financial Summary (Rent + EB)</h2>
//           <FinanceCardsSection
//             currentCollected={data.rentCollected ?? 0}
//             currentPending={data.pendingDues ?? 0}
//             overallCollected={data.overallCollected ?? 0}
//             overallPending={data.overallPending ?? 0}
//             onCardClick={setDetailMode}
//           />
//         </div>
//       </div>

//       <div className="grid grid-cols-3 gap-4 mb-6">
//         <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
//           <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Complaints</h3>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-10 w-10 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3">
//               <MessageSquare className="h-5 w-5 text-[#6A35FF]" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
//             <p className="text-[12px] text-gray-500 mt-1">All clear! No complaints at the moment.</p>
//           </div>
//           <Link to="/complaints" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
//             View All Complaints
//           </Link>
//         </div>

//         <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
//           <h3 className="text-[14px] font-bold text-gray-900 mb-4">Upcoming Check-Out</h3>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
//               <CalendarCheck className="h-5 w-5 text-blue-500" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
//             <p className="text-[12px] text-gray-500 mt-1">No tenants scheduled for check-out.</p>
//           </div>
//           <Link to="/checkout" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
//             View All Check-Outs
//           </Link>
//         </div>

//         <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
//           <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Payments</h3>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
//               <Wallet className="h-5 w-5 text-emerald-500" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
//             <p className="text-[12px] text-gray-500 mt-1">Payment history will appear here.</p>
//           </div>
//           <Link to="/payments" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
//             View All Payments
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// interface WardenDashboardProps {
//   data: GlobalDashboard; userName?: string; unitName?: string;
//   branchId?: number | null;
//   financials: { currentCollected: number; currentPending: number; overallCollected: number; overallPending: number };
// }

// const WardenDashboard = ({ data, branchId, financials }: WardenDashboardProps) => {
//   const [detailMode, setDetailMode] = useState<DetailMode>(null);

//   const stats: StatCardProps[] = [
//     { label: "Total Rooms", value: data.totalRooms ?? 0, sub: "In your branch", icon: Building2, color: "text-sky-600", iconBg: "bg-sky-50" },
//     { label: "Total Beds", value: data.totalBeds ?? 0, sub: "In your branch", icon: BedDouble, color: "text-cyan-600", iconBg: "bg-cyan-50" },
//     { label: "Occupied Beds", value: data.occupiedBeds ?? 0, sub: "Currently occupied", icon: BedDouble, color: "text-orange-500", iconBg: "bg-orange-50" },
//     { label: "Available Beds", value: data.availableBeds ?? 0, sub: "Ready to occupy", icon: CheckCircle2, color: "text-emerald-600", iconBg: "bg-emerald-50" },
//     { label: "Active Tenants", value: data.activeTenants ?? 0, sub: "Currently staying", icon: Users, color: "text-blue-600", iconBg: "bg-blue-50" },
//     { label: "EB Units", value: (data.totalUnits ?? 0).toLocaleString(), sub: "Current Month", icon: Zap, color: "text-amber-600", iconBg: "bg-amber-50" },
//   ];

//   return (
//     <div>
//       {detailMode && <AdminDetailModal mode={detailMode} branchId={branchId} onClose={() => setDetailMode(null)} />}

//       <SectionHeading>Branch Overview</SectionHeading>
//       <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
//         {stats.map((s) => <StatCard key={s.label} {...s} />)}
//       </div>

//       <SectionHeading>Financial Summary · Rent + EB</SectionHeading>
//       <div className="mb-8">
//         <FinanceCardsSection
//           currentCollected={financials.currentCollected}
//           currentPending={financials.currentPending}
//           overallCollected={financials.overallCollected}
//           overallPending={financials.overallPending}
//           onCardClick={setDetailMode}
//         />
//       </div>

//       <SectionHeading>Quick Actions & Updates</SectionHeading>
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
//         <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(106,53,255,0.08)] hover:border-[#6A35FF]/20 flex flex-col min-h-[220px] transition-all duration-300">
//           <div className="flex justify-between items-start mb-4">
//             <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-[#6A35FF] transition-colors">Recent Complaints</h3>
//             <div className="h-2 w-2 rounded-full bg-[#6A35FF]/30 group-hover:bg-[#6A35FF] transition-colors" />
//           </div>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-12 w-12 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#6A35FF]/15 transition-all duration-300">
//               <MessageSquare className="h-5 w-5 text-[#6A35FF]" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
//             <p className="text-[12px] text-gray-500 mt-1">All clear! No complaints at the moment.</p>
//           </div>
//           <Link to="/complaints" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-[#6A35FF] hover:text-white hover:border-[#6A35FF] transition-all duration-300">
//             View All Complaints
//           </Link>
//         </div>

//         <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.08)] hover:border-blue-500/20 flex flex-col min-h-[220px] transition-all duration-300">
//           <div className="flex justify-between items-start mb-4">
//             <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-blue-500 transition-colors">Upcoming Check-Out</h3>
//             <div className="h-2 w-2 rounded-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
//           </div>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
//               <CalendarCheck className="h-5 w-5 text-blue-500" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
//             <p className="text-[12px] text-gray-500 mt-1">No tenants scheduled for check-out.</p>
//           </div>
//           <Link to="/checkout" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-blue-500 bg-white hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-300">
//             View All Check-Outs
//           </Link>
//         </div>

//         <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 flex flex-col min-h-[220px] transition-all duration-300">
//           <div className="flex justify-between items-start mb-4">
//             <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-emerald-500 transition-colors">Recent Payments</h3>
//             <div className="h-2 w-2 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" />
//           </div>
//           <div className="flex-1 flex flex-col items-center justify-center text-center">
//             <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300">
//               <Wallet className="h-5 w-5 text-emerald-500" />
//             </div>
//             <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
//             <p className="text-[12px] text-gray-500 mt-1">Payment history will appear here.</p>
//           </div>
//           <Link to="/payments" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-emerald-600 bg-white hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300">
//             View All Payments
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// interface TenantFinancials {
//   currentMonthPaid: number; currentMonthPending: number;
//   overallPaid: number; overallPending: number;
// }

// const TenantDashboardView = ({ data, financials }: { data: TenantDashboard; financials: TenantFinancials }) => {
//   const [detailMode, setDetailMode] = useState<TenantDetailMode | null>(null);

//   const tenantId =
//     data.tenantId ??
//     Number(sessionStorage.getItem("tenantId") ?? sessionStorage.getItem("userId") ?? 0);

//   return (
//     <div>
//       {detailMode && tenantId ? (
//         <TenantDetailModal mode={detailMode} tenantId={tenantId} onClose={() => setDetailMode(null)} />
//       ) : null}
//       <SectionHeading>My Room &amp; Bed Details</SectionHeading>
//       <div className="grid grid-cols-3 gap-4 mb-4">
//         <StatCard label="My Room" value={data.myRoomNumber ?? "—"} sub={data.myRoomType ?? "Room type"} icon={Home} color="text-primary" iconBg="bg-primary/10" />
//         <StatCard label="My Bed" value={data.myBedNumber ?? "—"} sub="Assigned bed number" icon={Bed} color="text-cyan-600" iconBg="bg-cyan-50" />
//         <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 col-span-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
//           <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</p>
//           <div className="space-y-1.5 text-sm">
//             <div><span className="text-gray-400 text-xs">Phone: </span><span className="font-medium text-gray-800">{data.tenantPhone ?? "—"}</span></div>
//             <div><span className="text-gray-400 text-xs">Email: </span><span className="font-medium text-xs text-gray-800">{data.tenantEmail ?? "—"}</span></div>
//             <div><span className="text-gray-400 text-xs">Branch: </span><span className="font-medium text-xs text-gray-800">{data.myBranchName ?? "—"}</span></div>
//           </div>
//         </div>
//       </div>
//       <div className="mt-9">
//         <div className="flex items-center justify-between mb-1">
//           <SectionHeading>My Financials · Rent + EB</SectionHeading>
//           {financials.currentMonthPending > 0 || financials.overallPending > 0 ? (
//             <Link
//               to="/payments"
//               className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:opacity-90 transition-opacity px-3.5 py-2 rounded-lg mb-3"
//             >
//               <CreditCard className="h-3.5 w-3.5" /> Pay Now
//             </Link>
//           ) : null}
//         </div>
//         <div className="grid grid-cols-2 gap-4">
//           <FinCard label="This Month Paid" value={financials.currentMonthPaid} icon={CheckCircle2} color="text-emerald-600" iconBg="bg-emerald-50" accent="bg-emerald-400" onClick={() => setDetailMode("thisMonthPaid")} />
//           <FinCard label="This Month Pending" value={financials.currentMonthPending} icon={AlertTriangle} color="text-rose-600" iconBg="bg-rose-50" accent="bg-rose-400" onClick={() => setDetailMode("thisMonthPending")} />
//           <FinCard label="Overall Paid" value={financials.overallPaid} icon={TrendingUp} color="text-indigo-600" iconBg="bg-indigo-50" accent="bg-indigo-400" onClick={() => setDetailMode("overallPaid")} />
//           <FinCard label="Overall Pending" value={financials.overallPending} icon={TrendingDown} color="text-orange-600" iconBg="bg-orange-50" accent="bg-orange-400" onClick={() => setDetailMode("overallPending")} />
//         </div>
//         <div className="mt-3">
//           <Link to="/payments" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
//             View full payment history →
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ZERO_FINANCIALS = { currentCollected: 0, currentPending: 0, overallCollected: 0, overallPending: 0 };
// const ZERO_TENANT_FINANCIALS: TenantFinancials = { currentMonthPaid: 0, currentMonthPending: 0, overallPaid: 0, overallPending: 0 };

// const Dashboard = () => {
//   const [globalData, setGlobalData] = useState<GlobalDashboard | null>(null);
//   const [tenantData, setTenantData] = useState<TenantDashboard | null>(null);
//   const [wardenFin, setWardenFin] = useState(ZERO_FINANCIALS);
//   const [tenantFin, setTenantFin] = useState<TenantFinancials>(ZERO_TENANT_FINANCIALS);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const hasFetched = useRef(false);

//   const role = getUserRole();
//   const branchId = getBranchId();
//   const userName =
//     sessionStorage.getItem("userName") ??
//     sessionStorage.getItem("name") ??
//     sessionStorage.getItem("user_name") ?? "";

//   const loadDashboard = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       if (role === "TENANT") {
//         try {
//           const res = await api.get("/dashboard/tenant");
//           const data = res.data?.data ?? res.data ?? null;
//           if (!data) throw new Error("Empty response");
//           setTenantData(data);

//           const tenantId =
//             data.tenantId ??
//             Number(sessionStorage.getItem("tenantId") ?? sessionStorage.getItem("userId") ?? 0);

//           if (tenantId) {
//             try {
//               const fin = await computeTenantFinancials(tenantId);
//               setTenantFin(fin);
//             } catch {
//               setTenantFin({
//                 currentMonthPaid: data.currentMonthPaid ?? 0,
//                 currentMonthPending: data.currentMonthPending ?? 0,
//                 overallPaid: data.overallPaid ?? 0,
//                 overallPending: data.overallPending ?? 0,
//               });
//             }
//           } else {
//             setTenantFin({
//               currentMonthPaid: data.currentMonthPaid ?? 0,
//               currentMonthPending: data.currentMonthPending ?? 0,
//               overallPaid: data.overallPaid ?? 0,
//               overallPending: data.overallPending ?? 0,
//             });
//           }
//         } catch (err: any) {
//           const status = err?.response?.status;
//           setError(
//             status === 403 ? "Access denied. Please log out and log in again."
//               : status === 404 ? "Tenant profile not found. Contact your admin."
//                 : "Failed to load dashboard. Please refresh."
//           );
//         }
//         return;
//       }

//       try {
//         const res: GlobalDashboard = await getDashboard();

//         if (role === "WARDEN" && branchId) {
//           const bd = res.branches?.find((b) => Number(b.branchId) === Number(branchId));
//           const occupied = bd ? (bd.activeTenants ?? 0) : 0;

//           setGlobalData({
//             ...res,
//             totalRooms: bd?.rooms ?? 0,
//             totalBeds: bd?.beds ?? 0,
//             occupiedBeds: occupied,
//             availableBeds: (bd?.beds ?? 0) - occupied,
//             activeTenants: bd?.activeTenants ?? 0,
//             totalUnits: bd?.ebUnits ?? 0,
//             rentCollected: 0, pendingDues: 0,
//             overallCollected: 0, overallPending: 0,
//             rentOnlyCollected: 0, ebOnlyCollected: 0,
//             rentOnlyPending: 0, ebOnlyPending: 0,
//             overallRentCollected: 0, overallEBCollected: 0,
//             overallRentPending: 0, overallEBPending: 0,
//             unpaidCount: res.unpaidCount ?? 0,
//             branches: bd ? [bd] : [],
//             unitName: bd?.branchName ?? "",
//           });

//           try {
//             const fin = await computeWardenFinancials(Number(branchId));
//             setWardenFin(fin);
//           } catch {
//             if (bd) {
//               setWardenFin({
//                 currentCollected: bd.collected ?? 0,
//                 currentPending: bd.pending ?? 0,
//                 overallCollected: bd.overallCollected ?? bd.collected ?? 0,
//                 overallPending: bd.overallPending ?? bd.pending ?? 0,
//               });
//             }
//           }
//           return;
//         }

//         setGlobalData(res);
//       } catch (err: any) {
//         const status = err?.response?.status;
//         setError(
//           status === 403
//             ? "Access denied. Please log out and log in again."
//             : "Failed to load dashboard. Please refresh."
//         );
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (hasFetched.current) return;
//     hasFetched.current = true;
//     loadDashboard();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-24 text-sm text-gray-400 gap-2">
//         <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading dashboard…
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex flex-col items-center justify-center py-24 gap-3">
//         <p className="text-sm text-destructive font-medium">{error}</p>
//         <button
//           onClick={() => { hasFetched.current = false; loadDashboard(); }}
//           className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
//         >
//           <RefreshCw className="h-3 w-3" /> Try again
//         </button>
//       </div>
//     );
//   }

//   if (role === "TENANT") {
//     if (!tenantData) {
//       return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">No tenant data found. Contact your admin.</div>;
//     }
//     return <TenantDashboardView data={tenantData} financials={tenantFin} />;
//   }

//   if (!globalData) {
//     return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">No dashboard data found.</div>;
//   }

//   if (role === "WARDEN") {
//     return <WardenDashboard data={globalData} userName={userName} branchId={branchId ? Number(branchId) : null} financials={wardenFin} />;
//   }

//   return <AdminDashboard data={globalData} userName={userName} />;
// };

// export default Dashboard;






































































































































import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getDashboard, getUserRole, getBranchId } from "@/lib/store";
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

const PaymentBadge = ({ mode }: { mode: string | null }) => {
  if (!mode) return <span className="text-xs text-muted-foreground">—</span>;
  const upper = mode.toUpperCase();
  if (upper === "CASH") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <Banknote className="h-3 w-3" /> Cash
      </span>
    );
  }
  if (upper === "UPI") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
        <CreditCard className="h-3 w-3" /> UPI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
      <CreditCard className="h-3 w-3" /> {mode}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === "PAID")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  if (s === "PARTIAL")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-3 w-3" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
      <AlertTriangle className="h-3 w-3" /> Pending
    </span>
  );
};

interface StatCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; iconBg: string;
}

const StatCard = ({ label, value, sub, icon: Icon, color, iconBg }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)] hover:-translate-y-[1px] transition-all duration-200">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">{label}</p>
      <p className="text-[26px] font-bold leading-tight mt-1 text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
    </div>
    <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  </div>
);

interface FinCardProps {
  label: string; value: number; icon: React.ElementType;
  color: string; iconBg: string; accent: string;
  onClick?: () => void;
}

const FinCard = ({ label, value, icon: Icon, color, iconBg, accent, onClick }: FinCardProps) => (
  <div
    onClick={onClick}
    className={`relative bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${onClick ? "cursor-pointer hover:shadow-[0_8px_20px_rgba(16,24,40,0.08)] hover:-translate-y-[2px] active:translate-y-0 transition-all duration-200" : ""}`}
  >
    <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
    <div className="min-w-0 pl-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">{label}</p>
      <p className={`text-[22px] font-bold leading-tight mt-1 tabular-nums ${color}`}>
        ₹{Math.round(value).toLocaleString()}
      </p>
      {onClick && <p className="text-[10.5px] text-gray-400 mt-1 font-medium">View details →</p>}
    </div>
    <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  </div>
);

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
  <div className="grid grid-cols-2 gap-4">
    <FinCard label="Collected This Month" value={currentCollected}
      icon={CheckCircle2} color="text-emerald-600"
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
      icon={TrendingDown} color="text-orange-600"
      iconBg="bg-orange-50"
      accent="bg-orange-400"
      onClick={onCardClick ? () => onCardClick("overallPending") : undefined} />
  </div>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[11px] font-semibold mb-4 text-gray-400 uppercase tracking-wider flex items-center gap-2">
    <span className="h-3 w-[3px] rounded-full bg-blue-500/70" />
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
  return { currentCollected, currentPending, overallCollected, overallPending };
};

const computeTenantFinancials = async (tenantId: number) => {
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

  useEffect(() => {
    if (!mode) return;
    setLoading(true); setError(null);
    (async () => {
      try {
        // CHANGED: this used to try GET /dashboard/tenant first and only
        // fall back to fetchTenantDetailsFromRents on failure. But that
        // endpoint is restricted to role TENANT on the backend
        // (@PreAuthorize("hasRole('TENANT')...") in DashboardController),
        // so for an ADMIN/WARDEN viewing this modal it was *guaranteed*
        // to fail every time — spamming the console with 401/403 errors
        // on every card click, before silently falling through anyway.
        // There is no admin-facing equivalent of that endpoint, so go
        // straight to the working client-side computation instead.
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
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">{mode ? adminModeLabels[mode] : ""}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tenant-wise breakdown</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search by name or room…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No records found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room</th>
                  {isCollected ? (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                        onClick={() => setSortAsc(p => !p)}>
                        <span className="inline-flex items-center gap-1">
                          Collected {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collected</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                        onClick={() => setSortAsc(p => !p)}>
                        <span className="inline-flex items-center gap-1">
                          Pending {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </th>
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
                        <td className="px-6 py-3 text-right text-emerald-600 font-semibold">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-emerald-600 font-medium">₹{Math.round(row.collectedAmount).toLocaleString()}</td>
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
            <span className={`text-sm font-bold ${isCollected ? "text-emerald-600" : "text-rose-600"}`}>
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
  onClose: () => void;
}

const TenantDetailModal = ({ mode, tenantId, onClose }: TenantDetailModalProps) => {
  const [rows, setRows] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

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

  const total = filtered.reduce(
    (s, r) => s + (isPaidMode ? (r.paidAmount ?? 0) : (r.pendingAmount ?? 0)), 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">{tenantModeLabels[mode]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Month-wise payment breakdown</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search by month, mode, or transaction ID…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading records…</div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">No records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 border-b">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Period</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> Mode</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction ID</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                    onClick={() => setSortAsc((p) => !p)}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      {isPaidMode ? "Paid" : "Pending"}
                      {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  </th>
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
                          <span className="font-semibold text-emerald-600">₹{Math.round(row.paidAmount ?? 0).toLocaleString()}</span>
                          {(row.pendingAmount ?? 0) > 0 && (
                            <div className="text-xs text-rose-500 mt-0.5">+₹{Math.round(row.pendingAmount).toLocaleString()} due</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-rose-600">₹{Math.round(row.pendingAmount ?? 0).toLocaleString()}</span>
                          {(row.paidAmount ?? 0) > 0 && (
                            <div className="text-xs text-emerald-600 mt-0.5">₹{Math.round(row.paidAmount).toLocaleString()} paid</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
            <span className={`text-sm font-bold ${isPaidMode ? "text-emerald-600" : "text-rose-600"}`}>
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

      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 mb-6">
        <div>
          <h2 className="text-[14px] font-bold text-gray-900 mb-4">Financial Summary (Rent + EB)</h2>
          <FinanceCardsSection
            currentCollected={data.rentCollected ?? 0}
            currentPending={data.pendingDues ?? 0}
            overallCollected={data.overallCollected ?? 0}
            overallPending={data.overallPending ?? 0}
            onCardClick={setDetailMode}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Complaints</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-[#6A35FF]" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
            <p className="text-[12px] text-gray-500 mt-1">All clear! No complaints at the moment.</p>
          </div>
          <Link to="/complaints" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
            View All Complaints
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Upcoming Check-Out</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <CalendarCheck className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
            <p className="text-[12px] text-gray-500 mt-1">No tenants scheduled for check-out.</p>
          </div>
          <Link to="/checkout" className="mt-4 w-full py-2 border border-gray-100 rounded-lg text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-gray-50 transition-colors">
            View All Check-Outs
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col min-h-[220px]">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Payments</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
            <p className="text-[12px] text-gray-500 mt-1">Payment history will appear here.</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
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
            <div className="h-2 w-2 rounded-full bg-[#6A35FF]/30 group-hover:bg-[#6A35FF] transition-colors" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-[#6A35FF]/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#6A35FF]/15 transition-all duration-300">
              <MessageSquare className="h-5 w-5 text-[#6A35FF]" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No complaints found.</p>
            <p className="text-[12px] text-gray-500 mt-1">All clear! No complaints at the moment.</p>
          </div>
          <Link to="/complaints" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-[#6A35FF] bg-white hover:bg-[#6A35FF] hover:text-white hover:border-[#6A35FF] transition-all duration-300">
            View All Complaints
          </Link>
        </div>

        <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.08)] hover:border-blue-500/20 flex flex-col min-h-[220px] transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-blue-500 transition-colors">Upcoming Check-Out</h3>
            <div className="h-2 w-2 rounded-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
              <CalendarCheck className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No upcoming check-outs.</p>
            <p className="text-[12px] text-gray-500 mt-1">No tenants scheduled for check-out.</p>
          </div>
          <Link to="/checkout" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-blue-500 bg-white hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-300">
            View All Check-Outs
          </Link>
        </div>

        <div className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 flex flex-col min-h-[220px] transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-emerald-500 transition-colors">Recent Payments</h3>
            <div className="h-2 w-2 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-[13px] font-semibold text-gray-800">No recent payments.</p>
            <p className="text-[12px] text-gray-500 mt-1">Payment history will appear here.</p>
          </div>
          <Link to="/payments" className="mt-4 w-full py-2.5 border border-gray-100 rounded-xl text-center text-[12px] font-semibold text-emerald-600 bg-white hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300">
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
        <TenantDetailModal mode={detailMode} tenantId={tenantId} onClose={() => setDetailMode(null)} />
      ) : null}
      <SectionHeading>My Room &amp; Bed Details</SectionHeading>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="My Room" value={data.myRoomNumber ?? "—"} sub={data.myRoomType ?? "Room type"} icon={Home} color="text-primary" iconBg="bg-primary/10" />
        <StatCard label="My Bed" value={data.myBedNumber ?? "—"} sub="Assigned bed number" icon={Bed} color="text-cyan-600" iconBg="bg-cyan-50" />
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 col-span-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</p>
          <div className="space-y-1.5 text-sm">
            <div><span className="text-gray-400 text-xs">Phone: </span><span className="font-medium text-gray-800">{data.tenantPhone ?? "—"}</span></div>
            <div><span className="text-gray-400 text-xs">Email: </span><span className="font-medium text-xs text-gray-800">{data.tenantEmail ?? "—"}</span></div>
            <div><span className="text-gray-400 text-xs">Branch: </span><span className="font-medium text-xs text-gray-800">{data.myBranchName ?? "—"}</span></div>
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
              <CreditCard className="h-3.5 w-3.5" /> Pay Now
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FinCard label="This Month Paid" value={financials.currentMonthPaid} icon={CheckCircle2} color="text-emerald-600" iconBg="bg-emerald-50" accent="bg-emerald-400" onClick={() => setDetailMode("thisMonthPaid")} />
          <FinCard label="This Month Pending" value={financials.currentMonthPending} icon={AlertTriangle} color="text-rose-600" iconBg="bg-rose-50" accent="bg-rose-400" onClick={() => setDetailMode("thisMonthPending")} />
          <FinCard label="Overall Paid" value={financials.overallPaid} icon={TrendingUp} color="text-indigo-600" iconBg="bg-indigo-50" accent="bg-indigo-400" onClick={() => setDetailMode("overallPaid")} />
          <FinCard label="Overall Pending" value={financials.overallPending} icon={TrendingDown} color="text-orange-600" iconBg="bg-orange-50" accent="bg-orange-400" onClick={() => setDetailMode("overallPending")} />
        </div>
        <div className="mt-3">
          <Link to="/payments" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
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

          const tenantId =
            data.tenantId ??
            Number(sessionStorage.getItem("tenantId") ?? sessionStorage.getItem("userId") ?? 0);

          if (tenantId) {
            try {
              const fin = await computeTenantFinancials(tenantId);
              setTenantFin(fin);
            } catch {
              setTenantFin({
                currentMonthPaid: data.currentMonthPaid ?? 0,
                currentMonthPending: data.currentMonthPending ?? 0,
                overallPaid: data.overallPaid ?? 0,
                overallPending: data.overallPending ?? 0,
              });
            }
          } else {
            setTenantFin({
              currentMonthPaid: data.currentMonthPaid ?? 0,
              currentMonthPending: data.currentMonthPending ?? 0,
              overallPaid: data.overallPaid ?? 0,
              overallPending: data.overallPending ?? 0,
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

        setGlobalData(res);
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
      <div className="flex items-center justify-center py-24 text-sm text-gray-400 gap-2">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-destructive font-medium">{error}</p>
        <button
          onClick={() => { hasFetched.current = false; loadDashboard(); }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Try again
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