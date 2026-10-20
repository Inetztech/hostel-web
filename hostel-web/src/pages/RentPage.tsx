// import { useEffect, useState, useRef, useMemo, useCallback } from "react";

// import {
//   getRooms,
//   getRents,
//   getTenants,
//   getEBReadings,
//   getTenantWiseEBBill,
//   generateRent,
//   recordPayment,
//   getUserRole,
//   getBranchId,
//   fetchAllPages,
//   getPendingDamageSummary,
//   getRentDueConfig,
// } from "@/lib/store";

// import {
//   Room,
//   Rent,
//   Tenant,
//   TenantEBBill,
//   EBReading,
//   MONTHS,
//   PAYMENT_MODES,
//   PaymentMode,
//   RentDueConfig,
// } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { Search, RefreshCw, ChevronRight, MoreHorizontal } from "lucide-react";
// import { computeRentBreakdown, type RentBreakdown } from "@/lib/RentCalculation";
// import { computeRentDue, NO_DUE_CONFIG, NO_DUE_RESULT, type RentDueResult } from "@/lib/rentDue";
// // NEW: per-hostel Rent Billing Mode (CALENDAR_MONTH | JOINING_DATE_CYCLE).
// import { parseLocalDate, fmtDate } from "@/lib/rentCycle";
// import { previewCycleRent, toISODate, type BranchRentConfig } from "@/lib/rentPreview";


// type EBBillRow = TenantEBBill & {
//   roomNumber: string;
//   flatNumber: string;
//   month: number;
//   year: number;
// };

// type RentRow = {
//   tenantId: number;
//   tenantName: string;
//   tenantPhone: string;
//   roomNumber: string;
//   flatNumber: string;
//   displayEB: number;
//   rentPerBed: number;
//   damageAmount: number;
//   // Rent Due Model: ₹ due for overdue days (0 unless FIXED_DUE) and the number
//   // of days / ₹-per-day it was built from. Already included in total & pending.
//   dueAmount?: number;
//   dueDays?: number;
//   duePerDay?: number;
//   total: number;
//   paid: number;
//   pending: number;
//   previousPending: number;
//   currentPending: number;
//   rentRecord: Rent | undefined;
//   unitId: number | undefined;
//   amount: number;
//   paymentStatus?: string;
//   // NEW: set (JOINING_DATE_CYCLE hostels only) when this row's rent cycle
//   // hasn't started yet, so "Generate" is blocked instead of failing on the server.
//   generateBlockedReason?: string;
//   // Daily-stay ("Rent + EB advance paid at check-in") settlement info.
//   // Only populated for tenantStay === "DAILY" rows that don't have a Rent
//   // record yet — once a Rent record exists for the period, that record is
//   // the source of truth and the row goes back through the normal fields
//   // above, so these stay undefined at that point.
//   isDaily?: boolean;
//   advanceEB?: number;
//   ebBalance?: number; // > 0 => refund owed to tenant, < 0 => tenant owes the difference
//   // true only for a row built from a raw, informational EB-reading
//   // checkout row (see "informationalRows" below).
//   fromInformationalReading?: boolean;
// };

// function extractRoomNumber(bill: any): string {
//   return (
//     bill.roomNumber    ??
//     bill.room_number   ??
//     bill.roomNo        ??
//     ""
//   );
// }

// function extractFlatNumber(bill: any): string {
//   return (
//     bill.flatNumber    ??
//     bill.flat_number   ??
//     bill.flatNo        ??
//     ""
//   );
// }

// // Mirrors EBReadingsPage.tsx's isInformationalReading exactly. A row
// // is an "informational" DAILY-settlement row IFF it carries a tenantId AND
// // isCheckout === true.
// const isInformationalReading = (reading: any) =>
//   reading?.tenantId != null && reading?.isCheckout === true;

// // True when the tenant's check-in date is AFTER the last day of the
// // selected month/year, i.e. they were not living here yet. Such a tenant
// // must not be billed (rent or EB) for that month. Parses "YYYY-MM-DD"
// // manually to avoid timezone shifts from `new Date("YYYY-MM-DD")`.
// // (Also correct for JOINING_DATE_CYCLE: a cycle is identified by the
// // calendar month it STARTS in, so a later check-in month has no cycle yet.)
// const checkedInAfterMonth = (
//   checkInDate: string | null | undefined,
//   month: number,
//   year: number
// ): boolean => {
//   if (!checkInDate) return false;
//   const [cy, cm, cd] = String(checkInDate).slice(0, 10).split("-").map(Number);
//   if (!cy || !cm || !cd) return false;
//   const monthEnd = new Date(year, month, 0); // last day of selected month
//   return new Date(cy, cm - 1, cd) > monthEnd;
// };

// const ActionCell = ({
//   bill,
//   rentRecord,
//   onGenerate,
//   onPayment,
// }: {
//   bill: RentRow;
//   rentRecord: Rent | undefined;
//   onGenerate: (bill: RentRow) => void;
//   onPayment: (
//     rent: Rent,
//     mode: PaymentMode,
//     amount: number,
//     txnId: string,
//     bill: RentRow
//   ) => void;
// }) => {
//   const [localMode,   setLocalMode]   = useState<PaymentMode | "">("");
//   const [localAmount, setLocalAmount] = useState("");
//   const [localTxnId,  setLocalTxnId]  = useState("");

//   const handlePay = () => {
//     const inputAmount = Number(localAmount);
//     if (!localMode) return toast.error("Select payment mode");
//     if (!localAmount || isNaN(inputAmount) || inputAmount <= 0)
//       return toast.error("Enter valid amount");

//     const totalPending = bill.pending;
//     if (inputAmount > totalPending && totalPending > 0) {
//       toast.error(
//         `Amount ₹${inputAmount} exceeds pending ₹${Math.round(totalPending)}. Please enter ₹${Math.round(totalPending)} or less.`,
//         { duration: 4000 }
//       );
//       setLocalAmount(String(Math.round(totalPending)));
//       return;
//     }

//     onPayment(rentRecord!, localMode as PaymentMode, inputAmount, localTxnId, bill);
//     setLocalMode("");
//     setLocalAmount("");
//     setLocalTxnId("");
//   };

//   const showTxnId = localMode && localMode !== "CASH";
//   const isUnpaid  =
//     rentRecord && (rentRecord.paymentStatus || "").toUpperCase() !== "PAID";

//   // A daily-stay tenant who has nothing outstanding (ebBalance >= 0,
//   // i.e. exactly settled or owed a refund) and no Rent record yet has
//   // nothing to generate or collect here.
//   const isSettledDailyNoAction =
//     !rentRecord && bill.isDaily && (bill.ebBalance ?? 0) >= 0;

//   if (isSettledDailyNoAction) {
//     // A11Y: was text-slate-400 (low contrast) — now text-slate-600.
//     return <span className="text-[11px] text-slate-600">No action needed</span>;
//   }

//   return (
//     <div className="flex items-center gap-2">
//       {!rentRecord && (
//         <Button
//           size="sm"
//           variant="outline"
//           aria-label={`Generate rent for ${bill.tenantName}`}
//           className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
//           // NEW: JOINING_DATE_CYCLE hostels can't bill a cycle that hasn't started.
//           disabled={!!bill.generateBlockedReason}
//           title={bill.generateBlockedReason}
//           onClick={() => onGenerate(bill)}
//         >
//           Generate
//         </Button>
//       )}

//       {isUnpaid && (
//         <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-md">
//           <Select
//             value={localMode}
//             onValueChange={(v: PaymentMode) => setLocalMode(v)}
//           >
//             <SelectTrigger
//               aria-label={`Payment mode for ${bill.tenantName}`}
//               className="w-[80px] h-6 text-[10px] border-slate-200 focus:ring-0 shadow-none px-2"
//             >
//               <SelectValue placeholder="Mode" />
//             </SelectTrigger>
//             <SelectContent>
//               {PAYMENT_MODES.map((mode) => (
//                 <SelectItem key={mode} value={mode} className="text-[10px]">{mode}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <input
//             type="number"
//             placeholder="Amount"
//             aria-label={`Payment amount for ${bill.tenantName}`}
//             value={localAmount}
//             onChange={(e) => setLocalAmount(e.target.value)}
//             onKeyDown={(e) => e.stopPropagation()}
//             className="border border-slate-200 rounded px-2 h-6 w-16 text-[10px] outline-none focus:border-indigo-400"
//           />

//           {showTxnId && (
//             <input
//               type="text"
//               placeholder="Txn ID"
//               aria-label={`Transaction ID for ${bill.tenantName}`}
//               value={localTxnId}
//               onChange={(e) => setLocalTxnId(e.target.value)}
//               onKeyDown={(e) => e.stopPropagation()}
//               className="border border-slate-200 rounded px-2 h-6 w-20 text-[10px] outline-none focus:border-indigo-400"
//             />
//           )}

//           {/* A11Y: green-600 with white text is below 4.5:1; green-700 passes. */}
//           <Button
//             size="sm"
//             aria-label={`Record payment for ${bill.tenantName}`}
//             className="h-6 px-2 text-[10px] bg-green-700 hover:bg-green-800"
//             onClick={handlePay}
//           >
//             Pay
//           </Button>
//         </div>
//       )}

//     </div>
//   );
// };

// const RentPage = () => {
//   const role      = getUserRole()?.toUpperCase();
//   const branchId  = getBranchId();
//   const hasAccess = true;

//   const [rooms,          setRooms]          = useState<Room[]>([]);
//   const [rents,          setRents]          = useState<Rent[]>([]);
//   const [tenants,        setTenants]        = useState<Tenant[]>([]);
//   const [selectedBranch, setSelectedBranch] = useState(
//     role !== "ADMIN" && branchId ? String(branchId) : "all"
//   );
//   const [selectedRoom, setSelectedRoom] = useState("all");

//   // Active Business Model (Rent Due Model NO_DUE / FIXED_DUE + ₹ per day AND
//   // Rent Billing Mode CALENDAR_MONTH / JOINING_DATE_CYCLE), keyed by branch
//   // (unitId). Each branch belongs to ONE hostel, so a page listing branches
//   // of several hostels can mix both billing modes — the config is always
//   // resolved per row's branch. Always read from the backend, never hard-coded.
//   const [dueConfigByBranch, setDueConfigByBranch] = useState<Map<string, RentDueConfig>>(new Map());

//   const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

//   // The full, unfiltered raw EB-readings list (same source
//   // EBReadingsPage.tsx reads from). Needed because getTenantWiseEBBill
//   // only reflects a room/flat's *current* MONTHLY occupants and never
//   // echoes back a checked-out DAILY tenant's informational settlement row.
//   const [allEBReadings, setAllEBReadings] = useState<EBReading[]>([]);

//   // Damage shares that exist but haven't been billed into a Rent record yet.
//   // Keyed by tenantId.
//   const [pendingDamageMap, setPendingDamageMap] = useState<Map<number, number>>(new Map());

//   const [search, setSearch] = useState("");
//   const [month,  setMonth]  = useState(new Date().getMonth() + 1);
//   const [year,   setYear]   = useState(new Date().getFullYear());

//   const fetchedEBKeys = useRef<Set<string>>(new Set());
//   const loadingRef    = useRef(false);

//   /* ── helpers ── */
//   const normalizeStatus = (status?: string) => (status || "").toUpperCase();

//   const currentYear  = new Date().getFullYear();
//   const currentMonth = new Date().getMonth() + 1;

//   // Rent can only be viewed / generated up to the CURRENT month. Later months
//   // haven't started, yet the Approximate EB mode would still hand back a bill
//   // row for every tenant — which made e.g. November show up in October.
//   const yearOptions = Array.from(
//     { length: 6 },
//     (_, index) => currentYear - 5 + index
//   );

//   const isFuturePeriod =
//     year > currentYear || (year === currentYear && month > currentMonth);

//   // Hard stop: if the selected period is ever in the future (stale state,
//   // a saved filter, anything), snap straight back to the current month so
//   // Nov / Dec etc. can never be displayed before they start.
//   useEffect(() => {
//     if (year > currentYear) {
//       setYear(currentYear);
//       setMonth(currentMonth);
//     } else if (year === currentYear && month > currentMonth) {
//       setMonth(currentMonth);
//     }
//   }, [month, year, currentMonth, currentYear]);

//   const ebBills: EBBillRow[] = useMemo(() => {
//     if (isFuturePeriod) return [];
//     const key = `${month}-${year}`;
//     return ebBillsMap.get(key) ?? [];
//   }, [ebBillsMap, month, year, isFuturePeriod]);

//   const tenantNameMap = useMemo(() => {
//     const map = new Map<number, string>();
//     tenants.forEach((t) => map.set(Number(t.id), t.name));
//     return map;
//   }, [tenants]);

//   const tenantPhoneMap = useMemo(() => {
//     const map = new Map<number, string>();
//     tenants.forEach((t) => map.set(Number(t.id), t.phone ?? ""));
//     return map;
//   }, [tenants]);

//   const tenantMap = useMemo(() => {
//     const map = new Map<number, Tenant>();
//     tenants.forEach((t) => map.set(Number(t.id), t));
//     return map;
//   }, [tenants]);

//   // Tenant-specific monthly rent keyed by tenantId. Different tenants in the
//   // *same* room can be on different negotiated rents, so this must never be
//   // replaced by the room's default rentPerBed unless the tenant simply
//   // doesn't have their own rent value set.
//   const tenantRentMap = useMemo(() => {
//     const map = new Map<number, number>();
//     tenants.forEach((t) => {
//       if (t.monthlyRent != null && t.monthlyRent > 0) {
//         map.set(Number(t.id), Number(t.monthlyRent));
//       }
//     });
//     return map;
//   }, [tenants]);

//   const resolveTenantName = (tenantId: number): string =>
//     tenantNameMap.get(tenantId) ?? `Tenant ${tenantId}`;

//   // NEW: Joining-date-cycle preview for one tenant / period, or null when the
//   // tenant's hostel bills by CALENDAR_MONTH (or the tenant is DAILY / has no
//   // check-in date) — null means "use the existing calendar logic".
//   // The config is looked up by the ROOM'S BRANCH, so two hostels can use
//   // different modes on the same page.
//   const getCyclePreview = (
//     tenantId: number,
//     room?: Room,
//     forMonth = month,
//     forYear = year
//   ) => {
//     const tenant = tenantMap.get(Number(tenantId));
//     if (!tenant || isDailyTenant(tenant) || !tenant.checkInDate) return null;
//     const cfg = dueConfigByBranch.get(String(room?.unitId)) as unknown as BranchRentConfig | undefined;
//     const tenantRent = tenantRentMap.get(Number(tenantId));
//     const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
//     return previewCycleRent({
//       monthlyRent: flatRent,
//       checkIn: parseLocalDate(tenant.checkInDate),
//       month: forMonth,
//       year: forYear,
//       config: cfg,
//     });
//   };

//   // Prefers the tenant's own `monthlyRent` and only falls back to the
//   // room's rentPerBed when the tenant has no rent set.
//   //  • CALENDAR_MONTH hostel: the check-in month's flat monthlyRent is
//   //    pro-rated by days (see lib/rentCalculation.ts); later months are full.
//   //  • JOINING_DATE_CYCLE hostel: every cycle is the full monthlyRent.
//   // The backend independently recomputes the same figure when a Rent record
//   // is generated.
//   const resolveTenantRent = (tenantId: number, room?: Room, forMonth = month, forYear = year): number => {
//     const cyc = getCyclePreview(tenantId, room, forMonth, forYear);
//     if (cyc) return cyc.rentAmount;

//     const tenantRent = tenantRentMap.get(Number(tenantId));
//     const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
//     const tenant = tenantMap.get(Number(tenantId));
//     if (!tenant?.checkInDate) return flatRent;
//     return computeRentBreakdown(flatRent, tenant.checkInDate, forMonth, forYear).rentAmount;
//   };

//   // Full breakdown (days in month, occupied days, daily rent, etc.)
//   // for the "Rent" cell tooltip/expansion on the Rent page (calendar mode).
//   const resolveTenantRentBreakdown = (
//     tenantId: number,
//     room?: Room,
//     forMonth = month,
//     forYear = year
//   ): RentBreakdown => {
//     const tenantRent = tenantRentMap.get(Number(tenantId));
//     const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
//     const tenant = tenantMap.get(Number(tenantId));
//     return computeRentBreakdown(flatRent, tenant?.checkInDate, forMonth, forYear);
//   };

//   // Rent Due for one tenant's row.
//   //  • A generated Rent record is the source of truth: its stored dueAmount /
//   //    dueDays (kept current by the backend until the rent is paid).
//   //  • Otherwise it's a live preview from the active Business Model — the same
//   //    figure the backend stores when the record is generated.
//   //      - JOINING_DATE_CYCLE: due date = the cycle's start date.
//   //      - CALENDAR_MONTH:     due date from the configured due day.
//   // NO_DUE always gives ₹0, and so does a DAILY-stay tenant (rent is settled
//   // at check-in).
//   const resolveTenantDue = (
//     tenantId: number,
//     room: Room | undefined,
//     rentRecord: Rent | undefined
//   ): RentDueResult => {
//     if (rentRecord) {
//       return {
//         dueDate: rentRecord.dueDate ?? null,
//         dueDays: Number(rentRecord.dueDays ?? 0),
//         dueAmount: Number(rentRecord.dueAmount ?? 0),
//         perDay: Number(rentRecord.duePerDay ?? 0),
//       };
//     }
//     const tenant = tenantMap.get(Number(tenantId));
//     if (!tenant || isDailyTenant(tenant)) return NO_DUE_RESULT;

//     const cyc = getCyclePreview(tenantId, room);
//     if (cyc) {
//       return {
//         dueDate: cyc.dueDate ? toISODate(cyc.dueDate) : null,
//         dueDays: cyc.dueDays,
//         dueAmount: cyc.dueAmount,
//         perDay: cyc.duePerDay,
//       } as RentDueResult;
//     }

//     const cfg = dueConfigByBranch.get(String(room?.unitId)) ?? NO_DUE_CONFIG;
//     return computeRentDue(cfg, tenant.checkInDate, month, year);
//   };

//   // A "DAILY" stay tenant pays their full stay's Rent *and* an EB
//   // advance up front at check-in (Tenant.totalAmount / Tenant.ebAmount).
//   // That advance rent must never be re-billed on the Rent page. The only
//   // thing that still needs settling is the gap between the EB they
//   // advanced and what they actually used:
//   //   advanceRent = totalAmount - ebAmount   (falls back to amountPerDay*noOfDays)
//   //   ebBalance   = advanceEB - actualEB     ( >0 refund owed, <0 tenant owes more)
//   const isDailyTenant = (tenant?: Tenant): boolean => tenant?.tenantStay === "DAILY";

//   const computeDailyAdvance = (tenant: Tenant) => {
//     const advanceEB = tenant.ebAmount ?? 0;
//     const advanceRent =
//       tenant.totalAmount != null
//         ? tenant.totalAmount - advanceEB
//         : (tenant.amountPerDay ?? 0) * (tenant.noOfDays ?? 0);
//     return { advanceRent, advanceEB };
//   };

//   // Mirrors EBReadingsPage.tsx's tenantLastBilledReadingAll — the
//   // highest currentReading ever saved for each tenant specifically.
//   const tenantLastBilledReadingAll = useMemo(() => {
//     const map = new Map<number, number>();
//     allEBReadings.forEach((r: any) => {
//       if (r.tenantId == null) return;
//       const val = Number(r.currentReading ?? 0);
//       const key = Number(r.tenantId);
//       const prevMax = map.get(key);
//       if (prevMax == null || val > prevMax) map.set(key, val);
//     });
//     return map;
//   }, [allEBReadings]);

//   // Recomputes a checked-out DAILY tenant's true proportional share
//   // of a shared meter window (previousReading -> currentReading) — the
//   // SAME segment math EBReadingsPage.tsx / CheckoutPage.tsx use. Only a
//   // fallback for when the backend hasn't persisted the derived
//   // unitsConsumed/ebAmount on the informational reading row itself.
//   const calculateInformationalShare = useCallback(
//     (
//       targetTenantId: number,
//       prevReading: number,
//       currReading: number,
//       rate: number,
//       occupants: Tenant[]
//     ): { units: number; amount: number } => {
//       if (!(currReading > prevReading) || occupants.length === 0) {
//         return { units: 0, amount: 0 };
//       }

//       const isPresentInSegment = (t: Tenant, segStart: number, segEnd: number): boolean => {
//         const join = Number(t.joinReading);
//         if (!Number.isFinite(join) || join > segStart) return false;

//         if (Number(t.id) === targetTenantId) {
//           return currReading >= segEnd;
//         }

//         const lastBilled = tenantLastBilledReadingAll.get(Number(t.id));
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
//     [tenantLastBilledReadingAll]
//   );

//   // Same-period informational (checkout) EB readings, keyed by
//   // tenantId, one per tenant — the latest if there's more than one. A
//   // tenant who transferred rooms mid-period leaves this behind in their
//   // *old* room; the fix folds it straight into the tenant's normal row for
//   // their *current* room (see rowData below) — hoisted to component scope
//   // so handleGenerateAll can bill the same combined figure it displays.
//   const informationalByTenant = useMemo(() => {
//     const map = new Map<number, any>();
//     allEBReadings.forEach((r: any) => {
//       if (Number(r.month) !== month || Number(r.year) !== year) return;
//       if (!isInformationalReading(r)) return;
//       const tid = Number(r.tenantId);
//       const existing = map.get(tid);
//       if (!existing || Number(r.id ?? 0) > Number(existing.id ?? 0)) {
//         map.set(tid, r);
//       }
//     });
//     return map;
//   }, [allEBReadings, month, year]);

//   // Resolves the ₹ amount for one informational reading — prefers
//   // whatever the backend already persisted on the row, falling back to
//   // the same proportional-segment math only when neither is present.
//   // NOTE: the fallback uses a default rate (13) when the row has no ebRate,
//   // so it can disagree with the real bill. Never use it for a tenant whose
//   // backend EB bill already exists (see resolveTenantEB).
//   const resolveInformationalAmount = useCallback(
//     (tenantId: number, r: any): number => {
//       const storedUnits  = Number(r.unitsConsumed ?? 0);
//       const storedAmount = Number(r.ebAmount ?? 0);
//       if (storedUnits || storedAmount) return storedAmount;

//       const prevReading = Number(r.previousReading ?? 0);
//       const currReading = Number(r.currentReading ?? 0);
//       const rate = Number(r.ebRate ?? 0) || 13;
//       const room = r.roomId != null ? getRoomById(r.roomId) : undefined;
//       const flatId = room?.flatId ?? null;
//       const occupants = flatId != null
//         ? tenants.filter((t) => {
//             const tRoom = rooms.find((rm) => rm.id === t.roomId);
//             return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
//           })
//         : tenants.filter((t) => String(t.roomId) === String(r.roomId));

//       return calculateInformationalShare(tenantId, prevReading, currReading, rate, occupants).amount;
//     },
//     [tenants, rooms, calculateInformationalShare]
//   );

//   // FIX: single place that decides a MONTHLY tenant's EB for the period.
//   //
//   // ROOT CAUSE of "EB Readings page = 520, Rent page = 884 / 1,404":
//   //   • The backend EB bill (getTenantWiseEBBill) for a checked-out tenant is
//   //     already correct (520) and matches the EB Readings page.
//   //   • The checkout reading row has no stored ebAmount / ebRate, so the page
//   //     recomputed it client-side with the default rate 13 -> 884, and then
//   //     either ADDED it (520 + 884 = 1,404) or REPLACED the bill with it (884).
//   //
//   // Rules now:
//   //   • Checked-out tenant, or a reading from the SAME room as the current
//   //     row -> the backend bill already covers that meter window. Use it
//   //     as-is; ignore the checkout reading.
//   //   • Tenant who transferred to a DIFFERENT room mid-period -> the old
//   //     room's checkout share is genuinely extra, so add it.
//   const resolveTenantEB = (
//     tenant: Tenant | undefined,
//     room: Room | undefined,
//     liveEB: number,
//     infoReading: any | undefined,
//     tenantId: number
//   ): { eb: number; usedInfo: boolean } => {
//     if (!infoReading) return { eb: liveEB, usedInfo: false };

//     const isCheckedOut = tenant?.status === "Checked_Out";
//     const sameRoom =
//       infoReading.roomId != null &&
//       room != null &&
//       String(infoReading.roomId) === String(room.id);

//     if (isCheckedOut || sameRoom) {
//       return { eb: liveEB, usedInfo: false };
//     }

//     // Genuine room transfer: add the old room's settlement.
//     return {
//       eb: liveEB + resolveInformationalAmount(tenantId, infoReading),
//       usedInfo: true,
//     };
//   };

//   const reload = async () => {
//     if (loadingRef.current) return;
//     loadingRef.current = true;
//     try {
//       const [roomList, rentList, tenantList, pendingDamages, rawReadings] = await Promise.all([
//         fetchAllPages<Room>(getRooms),
//         fetchAllPages<Rent>(getRents),
//         fetchAllPages<Tenant>(getTenants),
//         getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
//         // Raw EB readings, unfiltered — the only place a checked-out DAILY
//         // tenant's informational settlement row lives.
//         fetchAllPages<EBReading>(getEBReadings).catch(() => [] as EBReading[]),
//       ]);

//       const filteredRooms =
//         role === "ADMIN"
//           ? roomList
//           : roomList.filter((room) => String(room.unitId) === String(branchId));

//       setRooms(filteredRooms);
//       setRents(rentList);
//       setTenants(tenantList);
//       setPendingDamageMap(
//         new Map(Object.entries(pendingDamages).map(([k, v]) => [Number(k), Number(v)]))
//       );
//       setAllEBReadings(rawReadings);

//       // Any cached EB results keyed off the old room/tenant snapshot must be
//       // dropped and re-fetched.
//       fetchedEBKeys.current = new Set();
//       setEbBillsMap(new Map());
//     } catch {
//       toast.error("Failed to load data");
//     } finally {
//       loadingRef.current = false;
//     }
//   };

//   useEffect(() => {
//     reload();
//   }, []);

//   // Load the Business Model (Rent Due + Rent Billing Mode) for every branch
//   // these rooms belong to. A failed lookup falls back to NO_DUE + calendar
//   // billing, i.e. nothing extra is ever charged and billing is unchanged.
//   // NOTE: getRentDueConfig must return the raw backend object so that
//   // `rentBillingMode` is preserved (see RentDueConfigDTO).
//   useEffect(() => {
//     if (rooms.length === 0) return;
//     let cancelled = false;
//     const branchIds = [...new Set(rooms.map((r) => String(r.unitId)))];
//     Promise.all(
//       branchIds.map(async (id): Promise<[string, RentDueConfig]> => {
//         try {
//           return [id, (await getRentDueConfig(id)) ?? NO_DUE_CONFIG];
//         } catch {
//           return [id, NO_DUE_CONFIG];
//         }
//       })
//     ).then((entries) => {
//       if (!cancelled) setDueConfigByBranch(new Map(entries));
//     });
//     return () => {
//       cancelled = true;
//     };
//   }, [rooms]);

//   useEffect(() => {
//     if (rooms.length === 0) return;

//     if (isFuturePeriod) return;

//     const key = `${month}-${year}`;
//     if (fetchedEBKeys.current.has(key)) return;
//     fetchedEBKeys.current.add(key);

//     const loadEBForMonth = async () => {
//       try {
//         const flatIds = [
//           ...new Set(
//             rooms.map((r) => r.flatId).filter((id): id is number => !!id)
//           ),
//         ];
//         const standaloneRooms = rooms.filter((r) => !r.flatId);

//         const tenantRoomLookup = new Map<number, Room>();
//         tenants.forEach((t) => {
//           const room = rooms.find((r) => String(r.id) === String(t.roomId));
//           if (room) tenantRoomLookup.set(Number(t.id), room);
//         });

//         const getTenantWiseEBBillWithMonthYear = (params: any) =>
//           getTenantWiseEBBill(params);

//         const flatBillResults = await Promise.all(
//           flatIds.map(async (flatId) => {
//             try {
//               // IMPORTANT: month & year must be passed through so the
//               // backend can filter EB readings for the selected period.
//               const bills = await getTenantWiseEBBillWithMonthYear({
//                 flatId,
//                 roomId: null,
//                 month,
//                 year,
//               });
//               if (!bills || bills.length === 0) return [] as EBBillRow[];

//               return bills
//                 .filter((b: any) => {
//                   if (b.tenantId != null) {
//                     const room = tenantRoomLookup.get(Number(b.tenantId));
//                     if (room) return String(room.flatId) === String(flatId);
//                   }
//                   const echoedRoomNumber = extractRoomNumber(b);
//                   if (echoedRoomNumber) {
//                     const room = rooms.find((r) => r.roomNumber === echoedRoomNumber);
//                     if (room) return String(room.flatId) === String(flatId);
//                   }
//                   return false;
//                 })
//                 .map((b): EBBillRow => {
//                   const bAny = b as any;

//                   let roomNumber = extractRoomNumber(bAny);
//                   let flatNumber = extractFlatNumber(bAny);

//                   if (!roomNumber && bAny.tenantId) {
//                     const room = tenantRoomLookup.get(Number(bAny.tenantId));
//                     if (room) roomNumber = room.roomNumber;
//                   }

//                   if (!flatNumber) {
//                     flatNumber = String(flatId);
//                   }

//                   return {
//                     ...b,
//                     roomNumber,
//                     flatNumber,
//                     month,
//                     year,
//                   };
//                 });
//             } catch {
//               return [] as EBBillRow[];
//             }
//           })
//         );

//         const roomBillResults = await Promise.all(
//           standaloneRooms.map(async (room) => {
//             try {
//               const bills = await getTenantWiseEBBillWithMonthYear({
//                 roomId: room.id,
//                 flatId: null,
//                 month,
//                 year,
//               });
//               if (!bills || bills.length === 0) return [] as EBBillRow[];

//               const roomTenantIds = new Set(
//                 tenants
//                   .filter((t) => String(t.roomId) === String(room.id))
//                   .map((t) => Number(t.id))
//               );

//               return bills
//                 .filter((b: any) => {
//                   if (b.tenantId != null) return roomTenantIds.has(Number(b.tenantId));
//                   const echoedRoomNumber = extractRoomNumber(b);
//                   if (echoedRoomNumber) return echoedRoomNumber === room.roomNumber;
//                   return false;
//                 })
//                 .map((b): EBBillRow => {
//                   const bAny = b as any;

//                   const roomNumber = room.roomNumber;
//                   const flatNumber =
//                     extractFlatNumber(bAny) ||
//                     (room as any).flatNumber ||
//                     (room as any).flatName ||
//                     "";

//                   return {
//                     ...b,
//                     roomNumber,
//                     flatNumber,
//                     month,
//                     year,
//                   };
//                 });
//             } catch {
//               return [] as EBBillRow[];
//             }
//           })
//         );

//         const rawBills = [...flatBillResults.flat(), ...roomBillResults.flat()];
//         const seenTenants = new Set<number>();
//         const bills = rawBills.filter((b: any) => {
//           if (b.tenantId == null) return true;
//           const tid = Number(b.tenantId);
//           if (seenTenants.has(tid)) return false;
//           seenTenants.add(tid);
//           return true;
//         });

//         setEbBillsMap((prev) => {
//           const next = new Map(prev);
//           next.set(key, bills);
//           return next;
//         });
//       } catch {
//         toast.error("Failed to load EB data");
//         setEbBillsMap((prev) => {
//           const next = new Map(prev);
//           next.set(key, []);
//           return next;
//         });
//       }
//     };

//     loadEBForMonth();
//   }, [rooms, tenants, month, year, isFuturePeriod]);

//   const getRoomObj = (roomNumber: string) =>
//     rooms.find((r) => r.roomNumber === roomNumber);

//   const getRoomById = (roomId: string | number) =>
//     rooms.find((r) => String(r.id) === String(roomId));

//   const resolveRoom = (roomNumber: string, roomId?: string | number): Room | undefined =>
//     getRoomObj(roomNumber) ?? (roomId ? getRoomById(roomId) : undefined);

//   const getRentStatus = (
//     tenantId: number,
//     roomNumber: string,
//     roomId?: string | number
//   ): Rent | undefined => {
//     const room = resolveRoom(roomNumber, roomId);
//     if (!room) return undefined;
//     const matches = rents.filter(
//       (r) =>
//         Number(r.tenantId) === tenantId &&
//         Number(r.rentMonth) === month &&
//         Number(r.rentYear) === year &&
//         String(r.roomId) === String(room.id)
//     );
//     if (matches.length === 0) return undefined;
//     const paid = matches.find(
//       (r) => normalizeStatus(r.paymentStatus) === "PAID"
//     );
//     if (paid) return paid;
//     const partials = matches.filter(
//       (r) => normalizeStatus(r.paymentStatus) === "PARTIAL"
//     );
//     if (partials.length > 0) {
//       return partials.reduce((best, r) =>
//         Number(r.paidAmount || 0) > Number(best.paidAmount || 0) ? r : best
//       );
//     }
//     return matches[0];
//   };

//   const computePreviousPending = (
//     tenantId: number,
//     beforeMonth: number,
//     beforeYear: number,
//     allRents: Rent[]
//   ): { previousPending: number; prevUnpaidRents: Rent[] } => {
//     const prevRents = allRents.filter(
//       (r) =>
//         Number(r.tenantId) === tenantId &&
//         (Number(r.rentYear) < beforeYear ||
//           (Number(r.rentYear) === beforeYear &&
//             Number(r.rentMonth) < beforeMonth))
//     );

//     const byKey = new Map<string, Rent>();
//     prevRents.forEach((r) => {
//       const key      = `${r.roomId}-${r.rentYear}-${r.rentMonth}`;
//       const existing = byKey.get(key);
//       if (!existing) {
//         byKey.set(key, r);
//       } else {
//         const es = normalizeStatus(existing.paymentStatus);
//         const ns = normalizeStatus(r.paymentStatus);
//         if (
//           ns === "PAID" ||
//           (ns === "PARTIAL" && es === "PENDING") ||
//           (ns === "PARTIAL" &&
//             es === "PARTIAL" &&
//             Number(r.paidAmount || 0) > Number(existing.paidAmount || 0))
//         ) {
//           byKey.set(key, r);
//         }
//       }
//     });

//     const prevUnpaidRents = Array.from(byKey.values()).filter(
//       (r) => normalizeStatus(r.paymentStatus) !== "PAID"
//     );

//     const previousPending = prevUnpaidRents.reduce((sum, r) => {
//       const rTotal = Number(r.totalAmount || 0);
//       const rPaid  = Number(r.paidAmount  || 0);
//       return sum + Math.max(0, rTotal - rPaid);
//     }, 0);

//     return { previousPending, prevUnpaidRents };
//   };

//   const filteredBills = useMemo(() => {
//     return ebBills.filter((bill) => {
//       if (role !== "ADMIN" && branchId) {
//         const room =
//           getRoomObj(bill.roomNumber) ??
//           (() => {
//             const bAny = bill as any;
//             if (!bAny.tenantId) return undefined;
//             const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
//             return tenant ? getRoomById(tenant.roomId) : undefined;
//           })();
//         if (!room || String(room.unitId) !== String(branchId)) return false;
//       }
//       const bAny = bill as any;
//       return `${bAny.tenantName ?? ""} ${bill.roomNumber} ${bill.flatNumber}`
//         .toLowerCase()
//         .includes(search.toLowerCase());
//     });
//   }, [ebBills, role, branchId, rooms, tenants, search]);

//   const rowData = useMemo((): RentRow[] => {
//     // A month that hasn't started has nothing to bill or collect — no rows of
//     // any kind (EB rows, rent records, checkout rows or damage-only rows).
//     if (isFuturePeriod) return [];

//     // Tenant IDs whose checkout settlement (informationalByTenant, above)
//     // got folded straight into their current-room row while building
//     // ebRows below. Tracked so the informationalRows branch further down
//     // doesn't also render them a second time as their own row.
//     const mergedInformationalTenantIds = new Set<number>();

//     const ebRows: RentRow[] = filteredBills
//       .map((bill): RentRow | null => {
//       const b = bill as any;

//       // A bill with no tenantId means the backend found no *current*
//       // occupant for this room/flat. It stamps a placeholder name
//       // ("Unassigned"), which used to render as a ghost row. The real
//       // identity lives in the informationalRows branch below.
//       if (b.tenantId == null) return null;

//       let room = resolveRoom(bill.roomNumber);
//       if (!room && b.tenantId) {
//         const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
//         if (tenant) room = getRoomById(tenant.roomId);
//       }

//       const tenant = tenantMap.get(Number(b.tenantId));
//       const rentRecord = getRentStatus(
//         b.tenantId,
//         bill.roomNumber,
//         room?.id
//       );

//       // A tenant who checks in AFTER the selected month wasn't living
//       // here yet, so no rent/EB row is shown for that month — unless a Rent
//       // record was already generated for it (that record stays the source
//       // of truth).
//       if (!rentRecord && checkedInAfterMonth(tenant?.checkInDate, month, year)) {
//         return null;
//       }

//       const liveEB = b.amount ?? 0;

//       // Daily-stay tenants who haven't had a Rent record generated for this
//       // period yet are handled on a separate branch — their "rent" is the
//       // advance already collected at check-in, and only the EB shortfall
//       // (if any) plus any pending damage is outstanding.
//       if (tenant && isDailyTenant(tenant) && !rentRecord) {
//         const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
//         const ebBalance = advanceEB - liveEB;
//         const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
//         const displayDamage = pendingDamageMap.get(Number(b.tenantId)) ?? 0;
//         // The RENT column shows the full amount the tenant actually paid
//         // at check-in (rent + EB advance together).
//         const totalPaidAtCheckIn = tenant.totalAmount ?? advanceRent + advanceEB;

//         const flatNumber =
//           bill.flatNumber ||
//           (() => {
//             if (!room?.flatId) return "";
//             const flatBill = ebBills.find(
//               (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
//             );
//             return flatBill?.flatNumber ?? String(room.flatId);
//           })();

//         return {
//           tenantId:      b.tenantId,
//           tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
//           tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
//           roomNumber:    room?.roomNumber ?? bill.roomNumber,
//           flatNumber,
//           rentPerBed:    totalPaidAtCheckIn,
//           displayEB:     liveEB,
//           damageAmount:  displayDamage,
//           total:         advanceRent + liveEB + displayDamage,
//           paid:          totalPaidAtCheckIn,
//           previousPending: 0,
//           currentPending:  additionalEBDue + displayDamage,
//           pending:         additionalEBDue + displayDamage,
//           rentRecord:      undefined,
//           unitId:          room?.unitId,
//           amount:          liveEB,
//           paymentStatus:   undefined,
//           isDaily:         true,
//           advanceEB,
//           ebBalance,
//         };
//       }

//       // Uses the tenant's own monthlyRent (falls back to the room's default
//       // only if unset). Calendar hostels pro-rate the check-in month;
//       // joining-date-cycle hostels bill the full cycle rent.
//       const rentPerBed = resolveTenantRent(Number(b.tenantId), room);

//       const recordTotal  = rentRecord ? Number(rentRecord.totalAmount  || 0) : 0;
//       const recordRent   = rentRecord ? Number(rentRecord.rentAmount   || 0) : rentPerBed;
//       const recordEB     = rentRecord ? Number(rentRecord.ebAmount     || 0) : b.amount ?? 0;
//       const recordDamage = rentRecord ? Number((rentRecord as any).damageAmount || 0) : 0;

//       const isPaid = normalizeStatus(rentRecord?.paymentStatus) === "PAID";

//       // Once a Rent row is generated, rentRecord.ebAmount is frozen at the
//       // EB reading of that moment. For any rent that hasn't been fully paid
//       // yet, prefer the *current* EB reading (bill.amount) over the frozen
//       // recordEB and recompute total/pending off that live number. A PAID
//       // rent still shows exactly what was actually billed and collected.

//       let displayEB = rentRecord ? (isPaid ? recordEB : liveEB) : liveEB;

//       // FIX: a same-period checkout settlement is only added for a genuine
//       // room transfer. For a checked-out / same-room tenant the backend bill
//       // is already correct and is used as-is (see resolveTenantEB).
//       // Skip once PAID: that figure is already final and collected.
//       const infoReading = informationalByTenant.get(Number(b.tenantId));
//       if (infoReading && !isPaid) {
//         const resolved = resolveTenantEB(tenant, room, displayEB, infoReading, Number(b.tenantId));
//         displayEB = resolved.eb;
//         if (resolved.usedInfo) mergedInformationalTenantIds.add(Number(b.tenantId));
//       }

//       const displayRent   = rentRecord ? recordRent   : rentPerBed;
//       // Rent Due Model: due amount for overdue days (₹0 under NO_DUE).
//       const due = resolveTenantDue(Number(b.tenantId), room, rentRecord);
//       // Once a Rent row exists, its damageAmount is the source of truth.
//       // Until then, fall back to unbilled DamageTenant shares for this tenant.
//       const displayDamage = rentRecord
//         ? recordDamage
//         : (pendingDamageMap.get(Number(b.tenantId)) ?? 0);
//       const displayTotal  = rentRecord
//         ? (isPaid ? recordTotal : displayRent + displayEB + displayDamage + due.dueAmount)
//         : rentPerBed + displayEB + displayDamage + due.dueAmount;

//       const currentPaid   = Number(rentRecord?.paidAmount || 0);
//       const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

//       const currentPending = rentRecord
//         ? currentStatus === "PAID"
//           ? 0
//           : currentStatus === "PARTIAL"
//           ? displayTotal - currentPaid
//           : displayTotal
//         : rentPerBed + displayEB + displayDamage + due.dueAmount;

//       const { previousPending } = rentRecord
//         ? computePreviousPending(b.tenantId, month, year, rents)
//         : { previousPending: 0 };

//       const flatNumber =
//         bill.flatNumber ||
//         (() => {
//           if (!room?.flatId) return "";
//           const flatBill = ebBills.find(
//             (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
//           );
//           return flatBill?.flatNumber ?? String(room.flatId);
//         })();

//       // NEW: joining-date-cycle hostels can't bill a cycle that hasn't started.
//       const cyclePreview = !rentRecord ? getCyclePreview(Number(b.tenantId), room) : null;
//       const generateBlockedReason =
//         cyclePreview && !cyclePreview.billable ? cyclePreview.reason : undefined;

//       return {
//         tenantId:      b.tenantId,
//         tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
//         tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
//         roomNumber:    room?.roomNumber ?? bill.roomNumber,
//         flatNumber,
//         rentPerBed:    displayRent,
//         displayEB,
//         damageAmount:  displayDamage,
//         dueAmount:     due.dueAmount,
//         dueDays:       due.dueDays,
//         duePerDay:     due.perDay,
//         total:         displayTotal,
//         paid:          currentPaid,
//         previousPending,
//         currentPending,
//         pending:       rentRecord
//           ? previousPending + currentPending
//           : currentPending,
//         rentRecord,
//         unitId:        room?.unitId,
//         // The resolved displayEB so "Generate" bills the same figure shown.
//         amount:        displayEB,
//         paymentStatus: rentRecord?.paymentStatus,
//         generateBlockedReason,
//       };
//       })
//       .filter((r): r is RentRow => r !== null);

//     const ebTenantRoomKeys = new Set(
//       filteredBills.map((b) => {
//         const bAny = b as any;
//         let room = resolveRoom(b.roomNumber);
//         if (!room && bAny.tenantId) {
//           const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
//           if (tenant) room = getRoomById(tenant.roomId);
//         }
//         return `${bAny.tenantId}-${room?.id ?? b.roomNumber}`;
//       })
//     );

//     const currentMonthRentMap = new Map<string, Rent>();
//     rents
//       .filter(
//         (r) => Number(r.rentMonth) === month && Number(r.rentYear) === year
//       )
//       .forEach((r) => {
//         const key      = `${r.tenantId}-${r.roomId}`;
//         const existing = currentMonthRentMap.get(key);
//         if (!existing) {
//           currentMonthRentMap.set(key, r);
//         } else {
//           const es = normalizeStatus(existing.paymentStatus);
//           const ns = normalizeStatus(r.paymentStatus);
//           if (
//             ns === "PAID" ||
//             (ns === "PARTIAL" && es === "PENDING") ||
//             (ns === "PARTIAL" &&
//               es === "PARTIAL" &&
//               Number(r.paidAmount || 0) > Number(existing.paidAmount || 0))
//           ) {
//             currentMonthRentMap.set(key, r);
//           }
//         }
//       });

//     const orphanRows: RentRow[] = Array.from(currentMonthRentMap.values())
//       .filter((r) => {
//         const key = `${r.tenantId}-${r.roomId}`;
//         if (ebTenantRoomKeys.has(key)) return false;

//         if (role !== "ADMIN" && branchId) {
//           const room = getRoomById(r.roomId);
//           if (!room || String(room.unitId) !== String(branchId)) return false;
//         }
//         return true;
//       })
//       .filter((r) => {
//         const room         = getRoomById(r.roomId);
//         const resolvedName = resolveTenantName(Number(r.tenantId));
//         const searchStr    = `${resolvedName} ${room?.roomNumber ?? ""} ${
//           (room as any)?.flatNumber ?? ""
//         }`.toLowerCase();
//         return searchStr.includes(search.toLowerCase());
//       })
//       .map((r) => {
//         const room        = getRoomById(r.roomId);
//         const recordTotal  = Number(r.totalAmount || 0);
//         const recordRent   = Number(r.rentAmount  || 0);
//         const recordEB     = Number(r.ebAmount    || 0);
//         const recordDamage = Number((r as any).damageAmount || 0);
//         const currentPaid  = Number(r.paidAmount  || 0);
//         const status       = normalizeStatus(r.paymentStatus);

//         const currentPending =
//           status === "PAID"
//             ? 0
//             : status === "PARTIAL"
//             ? recordTotal - currentPaid
//             : recordTotal;

//         const { previousPending } = computePreviousPending(
//           Number(r.tenantId),
//           month,
//           year,
//           rents
//         );

//         return {
//           tenantId:        Number(r.tenantId),
//           tenantName:      resolveTenantName(Number(r.tenantId)),
//           tenantPhone:     tenantPhoneMap.get(Number(r.tenantId)) ?? "",
//           roomNumber:      room?.roomNumber ?? String(r.roomId),
//           flatNumber:      (room as any)?.flatNumber ?? "-",
//           displayEB:       recordEB,
//           rentPerBed:      recordRent,
//           damageAmount:    recordDamage,
//           dueAmount:       Number(r.dueAmount ?? 0),
//           dueDays:         Number(r.dueDays ?? 0),
//           duePerDay:       Number(r.duePerDay ?? 0),
//           total:           recordTotal,
//           paid:            currentPaid,
//           previousPending,
//           currentPending,
//           pending:         previousPending + currentPending,
//           rentRecord:      r,
//           unitId:          room?.unitId,
//           amount:          recordEB,
//           paymentStatus:   r.paymentStatus,
//         };
//       });

//     // DAILY-stay tenants who have a checkout/settlement EB reading for this
//     // exact month/year, and have no current room to fold it into (fully
//     // checked out of the property). Pulled straight from the raw EB readings
//     // list, classified with isInformationalReading.
//     const informationalRows: RentRow[] = Array.from(informationalByTenant.entries())
//       .map(([tenantIdRaw, r]) => {
//         const tenantId = Number(tenantIdRaw);
//         if (mergedInformationalTenantIds.has(tenantId)) return null;

//         const tenant   = tenantMap.get(tenantId);

//         // Only DAILY-stay tenants settle through this flow.
//         if (!tenant || !isDailyTenant(tenant)) return null;

//         const room =
//           (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
//           (tenant.roomId != null ? getRoomById(tenant.roomId) : undefined);

//         if (role !== "ADMIN" && branchId && (!room || String(room.unitId) !== String(branchId))) {
//           return null;
//         }

//         const resolvedName = resolveTenantName(tenantId);
//         const searchStr = `${resolvedName} ${room?.roomNumber ?? ""} ${
//           (room as any)?.flatNumber ?? ""
//         }`.toLowerCase();
//         if (!searchStr.includes(search.toLowerCase())) return null;

//         const prevReading = Number(r.previousReading ?? 0);
//         const currReading = Number(r.currentReading ?? 0);
//         const rate = Number(r.ebRate ?? 0) || 13;

//         const flatId = room?.flatId ?? null;
//         const occupants = flatId != null
//           ? tenants.filter((t) => {
//               const tRoom = rooms.find((rm) => rm.id === t.roomId);
//               return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
//             })
//           : tenants.filter((t) => String(t.roomId) === String(r.roomId));

//         // Prefer a real value the backend already persisted on this row;
//         // only recompute client-side when both are missing/zero.
//         const storedUnits  = Number(r.unitsConsumed ?? 0);
//         const storedAmount = Number(r.ebAmount ?? 0);

//         let grossAmount = storedAmount;
//         if (!storedUnits && !storedAmount) {
//           const computed = calculateInformationalShare(
//             tenantId, prevReading, currReading, rate, occupants
//           );
//           grossAmount = computed.amount;
//         }

//         const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
//         const ebBalance = advanceEB - grossAmount;
//         const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
//         const displayDamage = pendingDamageMap.get(tenantId) ?? 0;
//         const totalPaidAtCheckIn = tenant.totalAmount ?? advanceRent + advanceEB;

//         const flatNumber =
//           (room as any)?.flatNumber ??
//           (room?.flatId ? String(room.flatId) : "");

//         return {
//           tenantId,
//           tenantName:    resolvedName,
//           tenantPhone:   tenantPhoneMap.get(tenantId) ?? "",
//           roomNumber:    room?.roomNumber ?? "—",
//           flatNumber,
//           rentPerBed:    totalPaidAtCheckIn,
//           displayEB:     grossAmount,
//           damageAmount:  displayDamage,
//           total:         advanceRent + grossAmount + displayDamage,
//           paid:          totalPaidAtCheckIn,
//           previousPending: 0,
//           currentPending:  additionalEBDue + displayDamage,
//           pending:         additionalEBDue + displayDamage,
//           rentRecord:      undefined,
//           unitId:          room?.unitId,
//           amount:          grossAmount,
//           paymentStatus:   undefined,
//           isDaily:         true,
//           advanceEB,
//           ebBalance,
//           fromInformationalReading: true,
//         } as RentRow;
//       })
//       .filter((r): r is RentRow => r !== null);

//     // Tenants with an unbilled damage share but no EB bill row and no Rent
//     // row yet for this month would otherwise never show up on this page.
//     const coveredTenantIds = new Set<number>([
//       ...ebRows.map((r) => r.tenantId),
//       ...orphanRows.map((r) => r.tenantId),
//       ...informationalRows.map((r) => r.tenantId),
//     ]);

//     const damageOnlyRows: RentRow[] = Array.from(pendingDamageMap.entries())
//       .filter(([tenantId, amount]) => amount > 0 && !coveredTenantIds.has(Number(tenantId)))
//       .map(([tenantId]) => {
//         const tenant = tenants.find((t) => Number(t.id) === Number(tenantId));
//         const room   = tenant ? getRoomById(tenant.roomId) : undefined;

//         if (role !== "ADMIN" && branchId && (!room || String(room.unitId) !== String(branchId))) {
//           return null;
//         }

//         const resolvedName = resolveTenantName(Number(tenantId));
//         const searchStr = `${resolvedName} ${room?.roomNumber ?? ""} ${
//           (room as any)?.flatNumber ?? ""
//         }`.toLowerCase();
//         if (!searchStr.includes(search.toLowerCase())) return null;

//         const damageAmount = pendingDamageMap.get(Number(tenantId)) ?? 0;
//         // Uses the tenant's own monthlyRent so a damage-only row shows their
//         // actual rent too. A daily-stay tenant's "rent" is their already-paid advance.
//         const rentPerBed = tenant && isDailyTenant(tenant)
//           ? (tenant.totalAmount ?? (() => {
//               const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
//               return advanceRent + advanceEB;
//             })())
//           : resolveTenantRent(Number(tenantId), room);

//         return {
//           tenantId:      Number(tenantId),
//           tenantName:    resolvedName,
//           roomNumber:    room?.roomNumber ?? "—",
//           flatNumber:    (room as any)?.flatNumber ?? "-",
//           displayEB:     0,
//           rentPerBed,
//           damageAmount,
//           total:         rentPerBed + damageAmount,
//           paid:          0,
//           previousPending: 0,
//           currentPending:  damageAmount,
//           pending:         damageAmount,
//           rentRecord:      undefined,
//           unitId:          room?.unitId,
//           amount:          0,
//           paymentStatus:   undefined,
//         } as RentRow;
//       })
//       .filter((r): r is RentRow => r !== null);

//     let allRows = [...ebRows, ...orphanRows, ...informationalRows, ...damageOnlyRows];

//     if (selectedBranch !== "all") {
//       allRows = allRows.filter((r) => String(r.unitId) === selectedBranch);
//     }

//     if (selectedRoom !== "all") {
//       allRows = allRows.filter((r) => {
//         const room = getRoomObj(r.roomNumber) ?? getRoomById(r.rentRecord?.roomId ?? "");
//         return room ? String(room.id) === selectedRoom : false;
//       });
//     }

//     return allRows;
//   }, [
//     filteredBills,
//     rooms,
//     tenants,
//     tenantMap,
//     selectedBranch,
//     selectedRoom,
//     month,
//     year,
//     isFuturePeriod,
//     rents,
//     search,
//     tenantNameMap,
//     tenantRentMap,
//     pendingDamageMap,
//     dueConfigByBranch,
//     allEBReadings,
//     calculateInformationalShare,
//     informationalByTenant,
//     resolveInformationalAmount,
//   ]);

//   const roomOptions = useMemo(() => {
//     const scoped =
//       selectedBranch === "all"
//         ? rooms
//         : rooms.filter((r) => String(r.unitId) === selectedBranch);
//     return scoped
//       .map((r) => ({ id: r.id, label: r.roomNumber }))
//       .sort((a, b) => a.label.localeCompare(b.label));
//   }, [rooms, selectedBranch]);

//   const branchOptions = useMemo(() => {
//     const unique = new Map();
//     rooms.forEach((r) => {
//       if (!unique.has(r.unitId)) {
//         unique.set(r.unitId, {
//           id:   r.unitId,
//           name: r.unitName || `Branch ${r.unitId}`,
//         });
//       }
//     });
//     return Array.from(unique.values());
//   }, [rooms]);

//   const handleGenerate = async (bill: RentRow) => {
//     if (isFuturePeriod) {
//       return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
//     }
//     // NEW: joining-date-cycle hostel whose cycle hasn't started yet.
//     if (bill.generateBlockedReason) {
//       return toast.error(bill.generateBlockedReason);
//     }
//     let room = getRoomObj(bill.roomNumber);
//     if (!room) {
//       const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
//       if (tenant) room = getRoomById(tenant.roomId);
//     }

//     if (!room) return toast.error("Room not found for this tenant");

//     // For a daily-stay tenant, Rent was already collected at check-in —
//     // only the EB shortfall (if any) should be billed here.
//     const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
//     const isDaily = tenant && isDailyTenant(tenant);
//     const rentAmount = isDaily ? 0 : resolveTenantRent(bill.tenantId, room);
//     // bill.amount holds the EB figure. For a row built from an informational
//     // reading, the computed EB share is already in bill.displayEB / bill.amount.
//     const ebAmount = isDaily ? Math.max(0, -(bill.ebBalance ?? 0)) : bill.amount;

//     try {
//       await generateRent({
//         tenantId:   String(bill.tenantId),
//         roomId:     String(room.id),
//         rentMonth:  month,
//         rentYear:   year,
//         rentAmount,
//         ebAmount,
//       });
//       toast.success(`Rent generated for ${bill.tenantName}`);
//       reload();
//     } catch (e: any) {
//       // The server rejects cycles that are before joining / not started yet.
//       toast.error(e?.response?.data?.message || "Failed to generate rent");
//     }
//   };

//   const handleGenerateAll = async () => {
//     if (isFuturePeriod) {
//       return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
//     }
//     if (!confirm("Generate rent for all tenants?")) return;

//     // NEW: tenants skipped because their joining-date cycle hasn't started.
//     let skippedCycle = 0;

//     const billsToGenerate = ebBills.filter((bill) => {
//       const bAny = bill as any;
//       let room = getRoomObj(bill.roomNumber);
//       if (!room && bAny.tenantId) {
//         const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
//         if (tenant) room = getRoomById(tenant.roomId);
//       }
//       // Never generate for a tenant who checks in after the selected month.
//       const billTenant = bAny.tenantId != null ? tenantMap.get(Number(bAny.tenantId)) : undefined;
//       if (checkedInAfterMonth(billTenant?.checkInDate, month, year)) return false;
//       if (getRentStatus(bAny.tenantId, bill.roomNumber, room?.id)) return false;

//       // NEW: skip (don't fail the batch for) cycles that haven't started.
//       if (bAny.tenantId != null) {
//         const cyc = getCyclePreview(Number(bAny.tenantId), room);
//         if (cyc && !cyc.billable) {
//           skippedCycle++;
//           return false;
//         }
//       }
//       return true;
//     });

//     // Tenant IDs whose checkout settlement gets folded into their
//     // current-room bill in the main pass below — tracked so the second
//     // pass doesn't also generate a duplicate record for the same reading.
//     const mergedInformationalTenantIds = new Set<number>();

//     try {
//       // allSettled: one tenant failing must not abort the rest of the batch.
//       const results = await Promise.allSettled(
//         billsToGenerate.map(async (bill) => {
//           const b = bill as any;
//           let room = getRoomObj(bill.roomNumber);
//           if (!room && b.tenantId) {
//             const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
//             if (tenant) room = getRoomById(tenant.roomId);
//           }
//           if (!room) return;

//           const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
//           if (tenant && isDailyTenant(tenant)) {
//             // Skip daily-stay tenants who don't owe an EB shortfall.
//             // Anyone who does owe is billed for the shortfall only, rentAmount 0.
//             const { advanceEB } = computeDailyAdvance(tenant);
//             const ebBalance = advanceEB - (b.amount ?? 0);
//             if (ebBalance >= 0) return;
//             await generateRent({
//               tenantId:   String(b.tenantId),
//               roomId:     String(room.id),
//               rentMonth:  month,
//               rentYear:   year,
//               rentAmount: 0,
//               ebAmount:   -ebBalance,
//             });
//             return;
//           }

//           // FIX: same EB resolution as the Rent table — the backend bill is
//           // used as-is for a checked-out / same-room tenant, and the old
//           // room's settlement is only added for a genuine room transfer.
//           const infoReading = informationalByTenant.get(Number(b.tenantId));
//           const resolved = resolveTenantEB(tenant, room, b.amount ?? 0, infoReading, Number(b.tenantId));
//           const ebAmount = resolved.eb;
//           if (resolved.usedInfo) mergedInformationalTenantIds.add(Number(b.tenantId));

//           await generateRent({
//             tenantId:   String(b.tenantId),
//             roomId:     String(room.id),
//             rentMonth:  month,
//             rentYear:   year,
//             rentAmount: resolveTenantRent(Number(b.tenantId), room),
//             ebAmount,
//           });
//         })
//       );
//       const failed = results.filter((r) => r.status === "rejected").length;

//       // "Generate All" is driven off ebBills, which never includes a
//       // checked-out tenant's informational reading. Sweep those in as a
//       // second pass — only for tenants not already folded in above.
//       await Promise.all(
//         Array.from(informationalByTenant.entries()).map(async ([tenantIdRaw, r]) => {
//           const tenantId = Number(tenantIdRaw);
//           if (mergedInformationalTenantIds.has(tenantId)) return;

//           const tenant = tenants.find((t) => Number(t.id) === tenantId);
//           if (!tenant || !isDailyTenant(tenant)) return;
//           const room =
//             (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
//             getRoomById(tenant.roomId);
//           if (!room) return;

//           const alreadyHasRent = rents.some(
//             (rr) =>
//               Number(rr.tenantId) === tenantId &&
//               Number(rr.rentMonth) === month &&
//               Number(rr.rentYear) === year &&
//               String(rr.roomId) === String(room.id)
//           );
//           if (alreadyHasRent) return;

//           const grossAmount = resolveInformationalAmount(tenantId, r);

//           const { advanceEB } = computeDailyAdvance(tenant);
//           const ebBalance = advanceEB - grossAmount;
//           if (ebBalance >= 0) return;

//           await generateRent({
//             tenantId:   String(tenantId),
//             roomId:     String(room.id),
//             rentMonth:  month,
//             rentYear:   year,
//             rentAmount: 0,
//             ebAmount:   -ebBalance,
//           });
//         })
//       );

//       const notes: string[] = [];
//       if (skippedCycle > 0) notes.push(`${skippedCycle} skipped (cycle not started)`);
//       if (failed > 0) notes.push(`${failed} failed`);
//       if (notes.length > 0) {
//         toast.warning(`Rents generated — ${notes.join(", ")}`);
//       } else {
//         toast.success("All rents generated");
//       }
//       reload();
//     } catch {
//       toast.error("Failed generating rents");
//     }
//   };

//   const handlePayment = async (
//     rent: Rent,
//     mode: PaymentMode,
//     amount: number,
//     txnId: string,
//     _bill: RentRow
//   ) => {
//     try {
//       const rentMonth = Number(rent.rentMonth);
//       const rentYear  = Number(rent.rentYear);

//       const { prevUnpaidRents } = computePreviousPending(
//         Number(rent.tenantId),
//         rentMonth,
//         rentYear,
//         rents
//       );

//       const sortedPrev = [...prevUnpaidRents].sort((a, b) =>
//         Number(a.rentYear) !== Number(b.rentYear)
//           ? Number(a.rentYear) - Number(b.rentYear)
//           : Number(a.rentMonth) - Number(b.rentMonth)
//       );

//       const queue: Rent[] = [...sortedPrev, rent];
//       let remaining = amount;

//       for (const record of queue) {
//         if (remaining <= 0) break;
//         const alreadyPaid  = Number(record.paidAmount  || 0);
//         const recordTotal  = Number(record.totalAmount || 0);
//         const recordStatus = normalizeStatus(record.paymentStatus);
//         if (recordStatus === "PAID") continue;
//         const recordPending = recordTotal - alreadyPaid;
//         if (recordPending <= 0) continue;
//         const apply = Math.min(remaining, recordPending);
//         remaining -= apply;
//         await recordPayment(record.id, mode, apply, txnId);
//       }

//       toast.success("Payment recorded");
//       reload();
//     } catch {
//       toast.error("Payment failed");
//     }
//   };

//   const [currentPage, setCurrentPage] = useState(0);
//   const pageSize = 10;
//   const paginatedRows = rowData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

//   // Total page count, used both to bound the "Next" button and to build
//   // the numbered page list below.
//   const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

//   // Go back to page 1 whenever a filter changes, and never sit on a page
//   // that no longer exists (e.g. after the row count shrinks).
//   useEffect(() => {
//     setCurrentPage(0);
//   }, [selectedBranch, selectedRoom, month, year, search]);

//   useEffect(() => {
//     if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
//   }, [currentPage, totalPages]);

//   // Windowed list of 1-indexed page numbers with "..." collapsing for
//   // longer runs — e.g. [1, 2, 3, 4, '...', 53].
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

//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .rt-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

//         .rt-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
//         .rt-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
//         /* A11Y: all #64748b / #94a3b8 greys below were bumped to #475569 or
//            #64748b-on-white so they clear the 4.5:1 contrast ratio. */
//         .rt-subtitle { font-size: 13px; color: #475569; font-weight: 500; }

//         .rt-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
//         @media (min-width: 1536px) { .rt-layout { flex-direction: row; } .rt-content { flex: 1; min-width: 0; } .rt-sidebar { width: 340px; flex-shrink: 0; } }

//         .rt-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
//         .rt-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
//         .rt-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

//         .rt-table { width: 100%; border-collapse: collapse; min-width: 1300px; }
//         .rt-table th { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .rt-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .rt-table tr:hover { background: #fdfcff; }
//         .rt-empty { color: #475569; }

//         .rt-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
//         .rt-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-tenant-phone { font-size: 11px; color: #475569; margin-top: 2px; }

//         .rt-room { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
//         .rt-branch { font-size: 13px; font-weight: 500; color: #0f172a; }
//         .rt-branch-sub { font-size: 11px; color: #475569; margin-top: 2px; }
//         .rt-value { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-value.muted { color: #64748b; font-weight: 500; }
//         .rt-date { font-size: 13px; font-weight: 500; color: #475569; }

//         .rt-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; }
//         .rt-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
//         .rt-status.paid { color: #15803d; }
//         .rt-status.paid::before { background: #15803d; }
//         .rt-status.pending { color: #c2410c; }
//         .rt-status.pending::before { background: #c2410c; }
//         .rt-status.overdue { color: #be123c; }
//         .rt-status.overdue::before { background: #be123c; }
//         .rt-status.not-due { color: #1d4ed8; }
//         .rt-status.not-due::before { background: #1d4ed8; }
//         .rt-status.ungenerated { color: #475569; }
//         .rt-status.ungenerated::before { background: #475569; }

//         /* EB-balance badges for daily-stay tenants */
//         .rt-eb-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
//         .rt-eb-badge.refund { color: #15803d; background: #f0fdf4; }
//         .rt-eb-badge.due    { color: #be123c; background: #fef2f2; }
//         .rt-eb-badge.even   { color: #475569; background: #f8fafc; }

//         .rt-chart-container { padding: 20px; display: flex; flex-direction: column; align-items: center; position: relative; }

//         .rt-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
//         .rt-sum-item:last-child { border-bottom: none; }

//         /* Pagination bar can hold many numbered buttons (1 2 3 4 … 53). */
//         .rt-page-row { flex-wrap: wrap; }
//         .rt-page-btn {
//           width: 32px; height: 32px; min-width: 32px; border-radius: 6px;
//           border: 1px solid #e2e8f0; display: flex; align-items: center;
//           justify-content: center; color: #475569; background: #fff;
//           font-weight: 500; font-size: 14px; cursor: pointer;
//         }
//         .rt-page-btn:hover:not(:disabled) { background: #f8fafc; }
//         .rt-page-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
//         .rt-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
//         .rt-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }
//         .rt-page-ellipsis { cursor: default; color: #64748b; }
//       `}</style>

//       <div className="rt-wrap">
//         <div className="rt-header">
//           <div>
//             <h1 className="rt-title">Rent Management</h1>
//             <p className="rt-subtitle">Home <ChevronRight size={12} className="inline opacity-50" aria-hidden="true" /> Rent</p>
//           </div>
//         </div>

//         <div className="rt-layout">
//           <div>
//             <div className="rt-panel">
//               <div className="rt-panel-header">
//                 <h2 className="rt-panel-title">Rent Collection</h2>
//                 <div className="flex gap-2">
//                   {hasAccess && (
//                     <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
//                        ALL Generation
//                     </Button>
//                   )}
//                 </div>
//               </div>

//               <div className="rent-mobile-filters flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
//                   <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedRoom("all"); }} disabled={!hasAccess || (role !== "ADMIN" && role !== "SUPER_ADMIN")}>
//                     {/* A11Y: Radix renders each trigger as a <button role="combobox">
//                         with no text label of its own, which Lighthouse flags as
//                         "Buttons do not have an accessible name". */}
//                     <SelectTrigger aria-label="Filter by branch" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
//                       <SelectValue placeholder="All Branches" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Branches</SelectItem>
//                       {branchOptions.map(b => (
//                         <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[130px]">
//                   <Select
//                     value={selectedRoom}
//                     onValueChange={setSelectedRoom}
//                   >
//                     <SelectTrigger aria-label="Filter by room" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
//                       <SelectValue placeholder="All Rooms" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Rooms</SelectItem>
//                       {roomOptions.map((r) => (
//                         <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex items-center bg-white border border-[#e2e8f0] rounded-md h-9 w-[130px] px-0">
//                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
//                     <SelectTrigger aria-label="Filter by month" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {MONTHS.map((m, i) => (
//                         <SelectItem
//                           key={i}
//                           value={String(i + 1)}
//                           disabled={year === currentYear && i + 1 > currentMonth}
//                         >
//                           {m}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[110px]">
//                   <Select
//                     value={String(year)}
//                     onValueChange={(v) => {
//                       const y = Number(v);
//                       setYear(y);
//                       // Switching to the current year must never leave a later month selected.
//                       if (y === currentYear && month > currentMonth) setMonth(currentMonth);
//                     }}
//                   >
//                     <SelectTrigger aria-label="Filter by year" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {yearOptions.map((y) => (
//                         <SelectItem key={y} value={String(y)}>{y}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md h-9 px-3 w-[200px] items-center">
//                   <Search size={14} className="text-slate-500 mr-2" aria-hidden="true" />
//                   <input
//                     type="text"
//                     placeholder="Search tenant or room..."
//                     aria-label="Search tenant or room"
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal placeholder:text-slate-500"
//                   />
//                 </div>

//                 <button
//                   type="button"
//                   className="flex items-center gap-1.5 text-sm text-[#475569] font-medium hover:text-[#0f172a] ml-auto"
//                   onClick={() => {
//                     setSelectedBranch(role !== "ADMIN" && branchId ? String(branchId) : "all");
//                     setSelectedRoom("all");
//                     setSearch("");
//                     setMonth(new Date().getMonth() + 1);
//                     setYear(new Date().getFullYear());
//                   }}
//                 >
//                   <RefreshCw size={14} aria-hidden="true" /> Clear Filters
//                 </button>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="rt-table">
//                   <caption className="sr-only">Rent collection for {MONTHS[month - 1]} {year}</caption>
//                   <thead>
//                     <tr>
//                       <th scope="col">TENANT</th>
//                       <th scope="col">ROOM</th>
//                       <th scope="col">BRANCH</th>
//                       <th scope="col">RENT (₹)</th>
//                       <th scope="col">EB (₹)</th>
//                       <th scope="col">DAMAGE (₹)</th>
//                       <th scope="col">DUE (₹)</th>
//                       <th scope="col">EB BALANCE</th>
//                       <th scope="col">TOTAL (₹)</th>
//                       <th scope="col">STATUS</th>
//                       <th scope="col">PENDING (₹)</th>
//                       <th scope="col">ACTIONS</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginatedRows.length === 0 ? (
//                       <tr><td colSpan={12} className="text-center py-12 rt-empty">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
//                     ) : (
//                       paginatedRows.map((row, i) => {
//                         // Daily-stay tenants who haven't had a Rent record
//                         // generated yet get their own status — "EB Due" when
//                         // they owe the shortfall, otherwise "Settled".
//                         let sStatus: string;
//                         let statusClass: string;
//                         let displayStatus: string;

//                         if (row.isDaily && !row.rentRecord) {
//                           const owesEB = (row.ebBalance ?? 0) < 0;
//                           sStatus = owesEB ? "EB_DUE" : "SETTLED";
//                           statusClass = owesEB ? "overdue" : "paid";
//                           displayStatus = owesEB ? "EB Due" : "Settled";
//                         } else {
//                           sStatus = row.rentRecord?.paymentStatus ? normalizeStatus(row.rentRecord.paymentStatus) : "UNGENERATED";
//                           statusClass = "ungenerated";
//                           displayStatus = sStatus;

//                           const isOverdueMock = (sStatus === "PENDING" || sStatus === "PARTIAL") && (row.pending > 0);
//                           if (sStatus === "PAID") { statusClass = "paid"; displayStatus = "Paid"; }
//                           else if (isOverdueMock) { statusClass = "overdue"; displayStatus = "Overdue"; }
//                           else if (sStatus === "PENDING" || sStatus === "PARTIAL") { statusClass = "pending"; displayStatus = sStatus === "PARTIAL" ? "Partial" : "Pending"; }
//                           else { statusClass = "not-due"; displayStatus = "Not Due"; }
//                         }

//                         const initials = row.tenantName.substring(0, 2).toUpperCase();
//                         // A11Y: the -600 text shades on -100 backgrounds were under
//                         // 4.5:1 (emerald/rose/amber especially); darker shades used.
//                         const colors = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-800'];
//                         const avatarClass = colors[i % colors.length];

//                         const roomObj = getRoomObj(row.roomNumber) || getRoomById(row.rentRecord?.roomId ?? 0);
//                         const isAc = roomObj?.hostelType === "AC";

//                         return (
//                           <tr key={row.tenantId + "-" + row.roomNumber}>
//                             <td>
//                               <div className="flex items-center">
//                                 <div className={`rt-avatar ${avatarClass}`} aria-hidden="true">{initials}</div>
//                                 <div>
//                                   <div className="rt-tenant-name">{row.tenantName}</div>
//                                   <div className="rt-tenant-phone">{row.tenantPhone}</div>
//                                 </div>
//                               </div>
//                             </td>
//                             <td>
//                               <div className="rt-room">{row.roomNumber}</div>
//                               <div className={`rt-room-type ${isAc ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-700'}`}>
//                                 {isAc ? 'AC' : 'Non-AC'}
//                               </div>
//                             </td>
//                             <td>
//                               <div className="rt-branch">{branchOptions.find(b => String(b.id) === String(row.unitId))?.name || "Main Branch"}</div>
//                             </td>

//                             <td>
//                               <span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.rentPerBed))}</span>
//                               {/* Sub-label behind the rent figure:
//                                   • JOINING_DATE_CYCLE hostel → the billing cycle's dates
//                                   • CALENDAR_MONTH hostel     → pro-ration for the check-in month */}
//                               {!row.isDaily && (() => {
//                                 const cyc = getCyclePreview(row.tenantId, roomObj);
//                                 if (cyc) {
//                                   if (!cyc.start || !cyc.end) return null;
//                                   return (
//                                     <div
//                                       className="text-[10px] text-indigo-700 mt-0.5"
//                                       title={`Joining-date cycle · ${cyc.days} days · full monthly rent`}
//                                     >
//                                       {fmtDate(cyc.start)} → {fmtDate(cyc.end)}
//                                     </div>
//                                   );
//                                 }
//                                 const breakdown = resolveTenantRentBreakdown(row.tenantId, roomObj);
//                                 if (!breakdown.proRated) return null;
//                                 return (
//                                   <div className="text-[10px] text-indigo-700 mt-0.5" title={`Check-in ${breakdown.checkInDate ?? ""} · Daily rent ₹${breakdown.dailyRent.toFixed(2)}`}>
//                                     Pro-rated: {breakdown.occupiedDays}/{breakdown.daysInMonth} days
//                                   </div>
//                                 );
//                               })()}
//                             </td>
//                             <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.displayEB))}</span></td>
//                             <td>
//                               <span className={`rt-value ${row.damageAmount <= 0 ? 'muted' : ''}`}>
//                                 {row.damageAmount > 0
//                                   ? new Intl.NumberFormat('en-IN').format(Math.round(row.damageAmount))
//                                   : '—'}
//                               </span>
//                             </td>
//                             <td>
//                               {/* Due Amount, shown separately from rent/EB/damage; it is
//                                   part of TOTAL and PENDING only when it is above ₹0
//                                   (i.e. FIXED_DUE with overdue days). */}
//                               {(row.dueAmount ?? 0) > 0 ? (
//                                 <>
//                                   <span className="rt-value text-rose-700">
//                                     {new Intl.NumberFormat('en-IN').format(Math.round(row.dueAmount ?? 0))}
//                                   </span>
//                                   <div className="text-[10px] text-rose-700 mt-0.5">
//                                     {row.dueDays} day{row.dueDays === 1 ? "" : "s"} × ₹{new Intl.NumberFormat('en-IN').format(row.duePerDay ?? 0)}
//                                   </div>
//                                 </>
//                               ) : (
//                                 <span className="rt-value muted">—</span>
//                               )}
//                             </td>
//                             <td>
//                               {row.isDaily && row.ebBalance !== undefined ? (
//                                 row.ebBalance > 0 ? (
//                                   <span className="rt-eb-badge refund">
//                                     Refund ₹{new Intl.NumberFormat('en-IN').format(Math.round(row.ebBalance))}
//                                   </span>
//                                 ) : row.ebBalance < 0 ? (
//                                   <span className="rt-eb-badge due">
//                                     Due ₹{new Intl.NumberFormat('en-IN').format(Math.round(-row.ebBalance))}
//                                   </span>
//                                 ) : (
//                                   <span className="rt-eb-badge even">Even</span>
//                                 )
//                               ) : (
//                                 <span className="rt-value muted">—</span>
//                               )}
//                             </td>
//                             <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.total))}</span></td>
//                             <td><div className={`rt-status ${statusClass}`}>{displayStatus}</div></td>
//                             <td>
//                               <div className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.pending > 0 ? row.pending : (row.isDaily ? 0 : row.total)))}</div>
//                             </td>
//                             <td>
//                               <ActionCell bill={row} rentRecord={row.rentRecord} onGenerate={handleGenerate} onPayment={handlePayment} />
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="rent-mobile-pagination flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
//                 <div className="text-[13px] text-[#475569]" aria-live="polite">
//                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} records
//                 </div>
//                 {/* Numbered pagination row (1 2 3 … n). Prev/Next stay on
//                     either end and disable correctly at the first/last page. */}
//                 <nav aria-label="Pagination" className="flex gap-2 rt-page-row">
//                   <button
//                     type="button"
//                     className="rt-page-btn"
//                     aria-label="Previous page"
//                     disabled={currentPage === 0}
//                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
//                   >
//                     <span aria-hidden="true">&#8249;</span>
//                   </button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="rt-page-btn rt-page-ellipsis" aria-hidden="true">
//                         <MoreHorizontal size={14} />
//                       </span>
//                     ) : (
//                       <button
//                         type="button"
//                         key={p}
//                         className={`rt-page-btn ${p === currentPage + 1 ? "active" : ""}`}
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
//                     className="rt-page-btn"
//                     aria-label="Next page"
//                     disabled={currentPage + 1 >= totalPages}
//                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
//                   >
//                     <span aria-hidden="true">&#8250;</span>
//                   </button>
//                 </nav>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RentPage;








































































































import { useEffect, useState, useRef, useMemo, useCallback } from "react";

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
import { Search, RefreshCw, ChevronRight, MoreHorizontal } from "lucide-react";
import { computeRentBreakdown, type RentBreakdown } from "@/lib/RentCalculation";
import { computeRentDue, NO_DUE_CONFIG, NO_DUE_RESULT, type RentDueResult } from "@/lib/rentDue";
// NEW: per-hostel Rent Billing Mode (CALENDAR_MONTH | JOINING_DATE_CYCLE).
import { parseLocalDate, fmtDate } from "@/lib/rentCycle";
import { previewCycleRent, toISODate, type BranchRentConfig } from "@/lib/rentPreview";


type EBBillRow = TenantEBBill & {
  roomNumber: string;
  flatNumber: string;
  month: number;
  year: number;
};

type RentRow = {
  tenantId: number;
  tenantName: string;
  tenantPhone: string;
  roomNumber: string;
  flatNumber: string;
  displayEB: number;
  rentPerBed: number;
  damageAmount: number;
  // Rent Due Model: ₹ due for overdue days (0 unless FIXED_DUE) and the number
  // of days / ₹-per-day it was built from. Already included in total & pending.
  dueAmount?: number;
  dueDays?: number;
  duePerDay?: number;
  total: number;
  paid: number;
  pending: number;
  previousPending: number;
  currentPending: number;
  rentRecord: Rent | undefined;
  unitId: number | undefined;
  amount: number;
  paymentStatus?: string;
  // NEW: set (JOINING_DATE_CYCLE hostels only) when this row's rent cycle
  // hasn't started yet, so "Generate" is blocked instead of failing on the server.
  generateBlockedReason?: string;
  // Daily-stay ("Rent + EB advance paid at check-in") settlement info.
  // Only populated for tenantStay === "DAILY" rows that don't have a Rent
  // record yet — once a Rent record exists for the period, that record is
  // the source of truth and the row goes back through the normal fields
  // above, so these stay undefined at that point.
  isDaily?: boolean;
  advanceEB?: number;
  ebBalance?: number; // > 0 => refund owed to tenant, < 0 => tenant owes the difference
  // true only for a row built from a raw, informational EB-reading
  // checkout row (see "informationalRows" below).
  fromInformationalReading?: boolean;
};

function extractRoomNumber(bill: any): string {
  return (
    bill.roomNumber    ??
    bill.room_number   ??
    bill.roomNo        ??
    ""
  );
}

function extractFlatNumber(bill: any): string {
  return (
    bill.flatNumber    ??
    bill.flat_number   ??
    bill.flatNo        ??
    ""
  );
}

// Mirrors EBReadingsPage.tsx's isInformationalReading exactly. A row
// is an "informational" DAILY-settlement row IFF it carries a tenantId AND
// isCheckout === true.
const isInformationalReading = (reading: any) =>
  reading?.tenantId != null && reading?.isCheckout === true;

// True when the tenant's check-in date is AFTER the last day of the
// selected month/year, i.e. they were not living here yet. Such a tenant
// must not be billed (rent or EB) for that month. Parses "YYYY-MM-DD"
// manually to avoid timezone shifts from `new Date("YYYY-MM-DD")`.
// (Also correct for JOINING_DATE_CYCLE: a cycle is identified by the
// calendar month it STARTS in, so a later check-in month has no cycle yet.)
const checkedInAfterMonth = (
  checkInDate: string | null | undefined,
  month: number,
  year: number
): boolean => {
  if (!checkInDate) return false;
  const [cy, cm, cd] = String(checkInDate).slice(0, 10).split("-").map(Number);
  if (!cy || !cm || !cd) return false;
  const monthEnd = new Date(year, month, 0); // last day of selected month
  return new Date(cy, cm - 1, cd) > monthEnd;
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
    const inputAmount = Number(localAmount);
    if (!localMode) return toast.error("Select payment mode");
    if (!localAmount || isNaN(inputAmount) || inputAmount <= 0)
      return toast.error("Enter valid amount");

    const totalPending = bill.pending;
    if (inputAmount > totalPending && totalPending > 0) {
      toast.error(
        `Amount ₹${inputAmount} exceeds pending ₹${Math.round(totalPending)}. Please enter ₹${Math.round(totalPending)} or less.`,
        { duration: 4000 }
      );
      setLocalAmount(String(Math.round(totalPending)));
      return;
    }

    onPayment(rentRecord!, localMode as PaymentMode, inputAmount, localTxnId, bill);
    setLocalMode("");
    setLocalAmount("");
    setLocalTxnId("");
  };

  const showTxnId = localMode && localMode !== "CASH";
  const isUnpaid  =
    rentRecord && (rentRecord.paymentStatus || "").toUpperCase() !== "PAID";

  // A daily-stay tenant who has nothing outstanding (ebBalance >= 0,
  // i.e. exactly settled or owed a refund) and no Rent record yet has
  // nothing to generate or collect here.
  const isSettledDailyNoAction =
    !rentRecord && bill.isDaily && (bill.ebBalance ?? 0) >= 0;

  if (isSettledDailyNoAction) {
    // A11Y: was text-slate-400 (low contrast) — now text-slate-600.
    return <span className="text-[11px] text-slate-600">No action needed</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {!rentRecord && (
        <Button
          size="sm"
          variant="outline"
          aria-label={`Generate rent for ${bill.tenantName}`}
          className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          // NEW: JOINING_DATE_CYCLE hostels can't bill a cycle that hasn't started.
          disabled={!!bill.generateBlockedReason}
          title={bill.generateBlockedReason}
          onClick={() => onGenerate(bill)}
        >
          Generate
        </Button>
      )}

      {isUnpaid && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-md">
          <Select
            value={localMode}
            onValueChange={(v: PaymentMode) => setLocalMode(v)}
          >
            <SelectTrigger
              aria-label={`Payment mode for ${bill.tenantName}`}
              className="w-[80px] h-6 text-[10px] border-slate-200 focus:ring-0 shadow-none px-2"
            >
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode} className="text-[10px]">{mode}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="number"
            placeholder="Amount"
            aria-label={`Payment amount for ${bill.tenantName}`}
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="border border-slate-200 rounded px-2 h-6 w-16 text-[10px] outline-none focus:border-indigo-400"
          />

          {showTxnId && (
            <input
              type="text"
              placeholder="Txn ID"
              aria-label={`Transaction ID for ${bill.tenantName}`}
              value={localTxnId}
              onChange={(e) => setLocalTxnId(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="border border-slate-200 rounded px-2 h-6 w-20 text-[10px] outline-none focus:border-indigo-400"
            />
          )}

          {/* A11Y: green-600 with white text is below 4.5:1; green-700 passes. */}
          <Button
            size="sm"
            aria-label={`Record payment for ${bill.tenantName}`}
            className="h-6 px-2 text-[10px] bg-green-700 hover:bg-green-800"
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

  const [rooms,          setRooms]          = useState<Room[]>([]);
  const [rents,          setRents]          = useState<Rent[]>([]);
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(
    role !== "ADMIN" && branchId ? String(branchId) : "all"
  );
  const [selectedRoom, setSelectedRoom] = useState("all");

  // Active Business Model (Rent Due Model NO_DUE / FIXED_DUE + ₹ per day AND
  // Rent Billing Mode CALENDAR_MONTH / JOINING_DATE_CYCLE), keyed by branch
  // (unitId). Each branch belongs to ONE hostel, so a page listing branches
  // of several hostels can mix both billing modes — the config is always
  // resolved per row's branch. Always read from the backend, never hard-coded.
  const [dueConfigByBranch, setDueConfigByBranch] = useState<Map<string, RentDueConfig>>(new Map());

  const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

  // The full, unfiltered raw EB-readings list (same source
  // EBReadingsPage.tsx reads from). Needed because getTenantWiseEBBill
  // only reflects a room/flat's *current* MONTHLY occupants and never
  // echoes back a checked-out DAILY tenant's informational settlement row.
  const [allEBReadings, setAllEBReadings] = useState<EBReading[]>([]);

  // Damage shares that exist but haven't been billed into a Rent record yet.
  // Keyed by tenantId.
  const [pendingDamageMap, setPendingDamageMap] = useState<Map<number, number>>(new Map());

  const [search, setSearch] = useState("");
  const [month,  setMonth]  = useState(new Date().getMonth() + 1);
  const [year,   setYear]   = useState(new Date().getFullYear());

  const fetchedEBKeys = useRef<Set<string>>(new Set());
  const loadingRef    = useRef(false);

  /* ── helpers ── */
  const normalizeStatus = (status?: string) => (status || "").toUpperCase();

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Rent can only be viewed / generated up to the CURRENT month. Later months
  // haven't started, yet the Approximate EB mode would still hand back a bill
  // row for every tenant — which made e.g. November show up in October.
  const yearOptions = Array.from(
    { length: 6 },
    (_, index) => currentYear - 5 + index
  );

  const isFuturePeriod =
    year > currentYear || (year === currentYear && month > currentMonth);

  // Hard stop: if the selected period is ever in the future (stale state,
  // a saved filter, anything), snap straight back to the current month so
  // Nov / Dec etc. can never be displayed before they start.
  useEffect(() => {
    if (year > currentYear) {
      setYear(currentYear);
      setMonth(currentMonth);
    } else if (year === currentYear && month > currentMonth) {
      setMonth(currentMonth);
    }
  }, [month, year, currentMonth, currentYear]);

  const ebBills: EBBillRow[] = useMemo(() => {
    if (isFuturePeriod) return [];
    const key = `${month}-${year}`;
    return ebBillsMap.get(key) ?? [];
  }, [ebBillsMap, month, year, isFuturePeriod]);

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

  // Tenant-specific monthly rent keyed by tenantId. Different tenants in the
  // *same* room can be on different negotiated rents, so this must never be
  // replaced by the room's default rentPerBed unless the tenant simply
  // doesn't have their own rent value set.
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

  // NEW: Joining-date-cycle preview for one tenant / period, or null when the
  // tenant's hostel bills by CALENDAR_MONTH (or the tenant is DAILY / has no
  // check-in date) — null means "use the existing calendar logic".
  // The config is looked up by the ROOM'S BRANCH, so two hostels can use
  // different modes on the same page.
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

  // Prefers the tenant's own `monthlyRent` and only falls back to the
  // room's rentPerBed when the tenant has no rent set.
  //  • CALENDAR_MONTH hostel: the check-in month's flat monthlyRent is
  //    pro-rated by days (see lib/rentCalculation.ts); later months are full.
  //  • JOINING_DATE_CYCLE hostel: every cycle is the full monthlyRent.
  // The backend independently recomputes the same figure when a Rent record
  // is generated.
  const resolveTenantRent = (tenantId: number, room?: Room, forMonth = month, forYear = year): number => {
    const cyc = getCyclePreview(tenantId, room, forMonth, forYear);
    if (cyc) return cyc.rentAmount;

    const tenantRent = tenantRentMap.get(Number(tenantId));
    const flatRent = tenantRent != null ? tenantRent : (room?.rentPerBed ?? 0);
    const tenant = tenantMap.get(Number(tenantId));
    if (!tenant?.checkInDate) return flatRent;
    return computeRentBreakdown(flatRent, tenant.checkInDate, forMonth, forYear).rentAmount;
  };

  // Full breakdown (days in month, occupied days, daily rent, etc.)
  // for the "Rent" cell tooltip/expansion on the Rent page (calendar mode).
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

  // Rent Due for one tenant's row.
  //  • A generated Rent record is the source of truth: its stored dueAmount /
  //    dueDays (kept current by the backend until the rent is paid).
  //  • Otherwise it's a live preview from the active Business Model — the same
  //    figure the backend stores when the record is generated.
  //      - JOINING_DATE_CYCLE: due date = the cycle's start date.
  //      - CALENDAR_MONTH:     due date from the configured due day.
  // NO_DUE always gives ₹0, and so does a DAILY-stay tenant (rent is settled
  // at check-in).
  const resolveTenantDue = (
    tenantId: number,
    room: Room | undefined,
    rentRecord: Rent | undefined
  ): RentDueResult => {
    if (rentRecord) {
      return {
        dueDate: rentRecord.dueDate ?? null,
        dueDays: Number(rentRecord.dueDays ?? 0),
        dueAmount: Number(rentRecord.dueAmount ?? 0),
        perDay: Number(rentRecord.duePerDay ?? 0),
      };
    }
    const tenant = tenantMap.get(Number(tenantId));
    if (!tenant || isDailyTenant(tenant)) return NO_DUE_RESULT;

    const cyc = getCyclePreview(tenantId, room);
    if (cyc) {
      return {
        dueDate: cyc.dueDate ? toISODate(cyc.dueDate) : null,
        dueDays: cyc.dueDays,
        dueAmount: cyc.dueAmount,
        perDay: cyc.duePerDay,
      } as RentDueResult;
    }

    const cfg = dueConfigByBranch.get(String(room?.unitId)) ?? NO_DUE_CONFIG;
    return computeRentDue(cfg, tenant.checkInDate, month, year);
  };

  // A "DAILY" stay tenant pays their full stay's Rent *and* an EB
  // advance up front at check-in (Tenant.totalAmount / Tenant.ebAmount).
  // That advance rent must never be re-billed on the Rent page. The only
  // thing that still needs settling is the gap between the EB they
  // advanced and what they actually used:
  //   advanceRent = totalAmount - ebAmount   (falls back to amountPerDay*noOfDays)
  //   ebBalance   = advanceEB - actualEB     ( >0 refund owed, <0 tenant owes more)
  const isDailyTenant = (tenant?: Tenant): boolean => tenant?.tenantStay === "DAILY";

  const computeDailyAdvance = (tenant: Tenant) => {
    const advanceEB = tenant.ebAmount ?? 0;
    const advanceRent =
      tenant.totalAmount != null
        ? tenant.totalAmount - advanceEB
        : (tenant.amountPerDay ?? 0) * (tenant.noOfDays ?? 0);
    return { advanceRent, advanceEB };
  };

  // Mirrors EBReadingsPage.tsx's tenantLastBilledReadingAll — the
  // highest currentReading ever saved for each tenant specifically.
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

  // Recomputes a checked-out DAILY tenant's true proportional share
  // of a shared meter window (previousReading -> currentReading) — the
  // SAME segment math EBReadingsPage.tsx / CheckoutPage.tsx use. Only a
  // fallback for when the backend hasn't persisted the derived
  // unitsConsumed/ebAmount on the informational reading row itself.
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

  // Same-period informational (checkout) EB readings, keyed by
  // tenantId, one per tenant — the latest if there's more than one. A
  // tenant who transferred rooms mid-period leaves this behind in their
  // *old* room; the fix folds it straight into the tenant's normal row for
  // their *current* room (see rowData below) — hoisted to component scope
  // so handleGenerateAll can bill the same combined figure it displays.
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

  // Resolves the ₹ amount for one informational reading — prefers
  // whatever the backend already persisted on the row, falling back to
  // the same proportional-segment math only when neither is present.
  // NOTE: the fallback uses a default rate (13) when the row has no ebRate,
  // so it can disagree with the real bill. Never use it for a tenant whose
  // backend EB bill already exists (see resolveTenantEB).
  const resolveInformationalAmount = useCallback(
    (tenantId: number, r: any): number => {
      const storedUnits  = Number(r.unitsConsumed ?? 0);
      const storedAmount = Number(r.ebAmount ?? 0);
      if (storedUnits || storedAmount) return storedAmount;

      const prevReading = Number(r.previousReading ?? 0);
      const currReading = Number(r.currentReading ?? 0);
      const rate = Number(r.ebRate ?? 0) || 13;
      const room = r.roomId != null ? getRoomById(r.roomId) : undefined;
      const flatId = room?.flatId ?? null;
      const occupants = flatId != null
        ? tenants.filter((t) => {
            const tRoom = rooms.find((rm) => rm.id === t.roomId);
            return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
          })
        : tenants.filter((t) => String(t.roomId) === String(r.roomId));

      return calculateInformationalShare(tenantId, prevReading, currReading, rate, occupants).amount;
    },
    [tenants, rooms, calculateInformationalShare]
  );

  // FIX: single place that decides a MONTHLY tenant's EB for the period.
  //
  // ROOT CAUSE of "EB Readings page = 520, Rent page = 884 / 1,404":
  //   • The backend EB bill (getTenantWiseEBBill) for a checked-out tenant is
  //     already correct (520) and matches the EB Readings page.
  //   • The checkout reading row has no stored ebAmount / ebRate, so the page
  //     recomputed it client-side with the default rate 13 -> 884, and then
  //     either ADDED it (520 + 884 = 1,404) or REPLACED the bill with it (884).
  //
  // Rules now:
  //   • Checked-out tenant, or a reading from the SAME room as the current
  //     row -> the backend bill already covers that meter window. Use it
  //     as-is; ignore the checkout reading.
  //   • Tenant who transferred to a DIFFERENT room mid-period -> the old
  //     room's checkout share is genuinely extra, so add it.
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

    // Genuine room transfer: add the old room's settlement.
    return {
      eb: liveEB + resolveInformationalAmount(tenantId, infoReading),
      usedInfo: true,
    };
  };

  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [roomList, rentList, tenantList, pendingDamages, rawReadings] = await Promise.all([
        fetchAllPages<Room>(getRooms),
        fetchAllPages<Rent>(getRents),
        fetchAllPages<Tenant>(getTenants),
        getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
        // Raw EB readings, unfiltered — the only place a checked-out DAILY
        // tenant's informational settlement row lives.
        fetchAllPages<EBReading>(getEBReadings).catch(() => [] as EBReading[]),
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

      // Any cached EB results keyed off the old room/tenant snapshot must be
      // dropped and re-fetched.
      fetchedEBKeys.current = new Set();
      setEbBillsMap(new Map());
    } catch {
      toast.error("Failed to load data");
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // Load the Business Model (Rent Due + Rent Billing Mode) for every branch
  // these rooms belong to. A failed lookup falls back to NO_DUE + calendar
  // billing, i.e. nothing extra is ever charged and billing is unchanged.
  // NOTE: getRentDueConfig must return the raw backend object so that
  // `rentBillingMode` is preserved (see RentDueConfigDTO).
  useEffect(() => {
    if (rooms.length === 0) return;
    let cancelled = false;
    const branchIds = [...new Set(rooms.map((r) => String(r.unitId)))];
    Promise.all(
      branchIds.map(async (id): Promise<[string, RentDueConfig]> => {
        try {
          return [id, (await getRentDueConfig(id)) ?? NO_DUE_CONFIG];
        } catch {
          return [id, NO_DUE_CONFIG];
        }
      })
    ).then((entries) => {
      if (!cancelled) setDueConfigByBranch(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  useEffect(() => {
    if (rooms.length === 0) return;

    if (isFuturePeriod) return;

    const key = `${month}-${year}`;
    if (fetchedEBKeys.current.has(key)) return;
    fetchedEBKeys.current.add(key);

    const loadEBForMonth = async () => {
      try {
        const flatIds = [
          ...new Set(
            rooms.map((r) => r.flatId).filter((id): id is number => !!id)
          ),
        ];
        const standaloneRooms = rooms.filter((r) => !r.flatId);

        const tenantRoomLookup = new Map<number, Room>();
        tenants.forEach((t) => {
          const room = rooms.find((r) => String(r.id) === String(t.roomId));
          if (room) tenantRoomLookup.set(Number(t.id), room);
        });

        const getTenantWiseEBBillWithMonthYear = (params: any) =>
          getTenantWiseEBBill(params);

        const flatBillResults = await Promise.all(
          flatIds.map(async (flatId) => {
            try {
              // IMPORTANT: month & year must be passed through so the
              // backend can filter EB readings for the selected period.
              const bills = await getTenantWiseEBBillWithMonthYear({
                flatId,
                roomId: null,
                month,
                year,
              });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              return bills
                .filter((b: any) => {
                  if (b.tenantId != null) {
                    const room = tenantRoomLookup.get(Number(b.tenantId));
                    if (room) return String(room.flatId) === String(flatId);
                  }
                  const echoedRoomNumber = extractRoomNumber(b);
                  if (echoedRoomNumber) {
                    const room = rooms.find((r) => r.roomNumber === echoedRoomNumber);
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

                  if (!flatNumber) {
                    flatNumber = String(flatId);
                  }

                  return {
                    ...b,
                    roomNumber,
                    flatNumber,
                    month,
                    year,
                  };
                });
            } catch {
              return [] as EBBillRow[];
            }
          })
        );

        const roomBillResults = await Promise.all(
          standaloneRooms.map(async (room) => {
            try {
              const bills = await getTenantWiseEBBillWithMonthYear({
                roomId: room.id,
                flatId: null,
                month,
                year,
              });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              const roomTenantIds = new Set(
                tenants
                  .filter((t) => String(t.roomId) === String(room.id))
                  .map((t) => Number(t.id))
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

                  const roomNumber = room.roomNumber;
                  const flatNumber =
                    extractFlatNumber(bAny) ||
                    (room as any).flatNumber ||
                    (room as any).flatName ||
                    "";

                  return {
                    ...b,
                    roomNumber,
                    flatNumber,
                    month,
                    year,
                  };
                });
            } catch {
              return [] as EBBillRow[];
            }
          })
        );

        const rawBills = [...flatBillResults.flat(), ...roomBillResults.flat()];
        const seenTenants = new Set<number>();
        const bills = rawBills.filter((b: any) => {
          if (b.tenantId == null) return true;
          const tid = Number(b.tenantId);
          if (seenTenants.has(tid)) return false;
          seenTenants.add(tid);
          return true;
        });

        setEbBillsMap((prev) => {
          const next = new Map(prev);
          next.set(key, bills);
          return next;
        });
      } catch {
        toast.error("Failed to load EB data");
        setEbBillsMap((prev) => {
          const next = new Map(prev);
          next.set(key, []);
          return next;
        });
      }
    };

    loadEBForMonth();
  }, [rooms, tenants, month, year, isFuturePeriod]);

  const getRoomObj = (roomNumber: string) =>
    rooms.find((r) => r.roomNumber === roomNumber);

  const getRoomById = (roomId: string | number) =>
    rooms.find((r) => String(r.id) === String(roomId));

  const resolveRoom = (roomNumber: string, roomId?: string | number): Room | undefined =>
    getRoomObj(roomNumber) ?? (roomId ? getRoomById(roomId) : undefined);

  const getRentStatus = (
    tenantId: number,
    roomNumber: string,
    roomId?: string | number
  ): Rent | undefined => {
    const room = resolveRoom(roomNumber, roomId);
    if (!room) return undefined;
    const matches = rents.filter(
      (r) =>
        Number(r.tenantId) === tenantId &&
        Number(r.rentMonth) === month &&
        Number(r.rentYear) === year &&
        String(r.roomId) === String(room.id)
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
    beforeYear: number,
    allRents: Rent[]
  ): { previousPending: number; prevUnpaidRents: Rent[] } => {
    const prevRents = allRents.filter(
      (r) =>
        Number(r.tenantId) === tenantId &&
        (Number(r.rentYear) < beforeYear ||
          (Number(r.rentYear) === beforeYear &&
            Number(r.rentMonth) < beforeMonth))
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

    const previousPending = prevUnpaidRents.reduce((sum, r) => {
      const rTotal = Number(r.totalAmount || 0);
      const rPaid  = Number(r.paidAmount  || 0);
      return sum + Math.max(0, rTotal - rPaid);
    }, 0);

    return { previousPending, prevUnpaidRents };
  };

  const filteredBills = useMemo(() => {
    return ebBills.filter((bill) => {
      if (role !== "ADMIN" && branchId) {
        const room =
          getRoomObj(bill.roomNumber) ??
          (() => {
            const bAny = bill as any;
            if (!bAny.tenantId) return undefined;
            const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
            return tenant ? getRoomById(tenant.roomId) : undefined;
          })();
        if (!room || String(room.unitId) !== String(branchId)) return false;
      }
      const bAny = bill as any;
      return `${bAny.tenantName ?? ""} ${bill.roomNumber} ${bill.flatNumber}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [ebBills, role, branchId, rooms, tenants, search]);

  const rowData = useMemo((): RentRow[] => {
    // A month that hasn't started has nothing to bill or collect — no rows of
    // any kind (EB rows, rent records, checkout rows or damage-only rows).
    if (isFuturePeriod) return [];

    // Tenant IDs whose checkout settlement (informationalByTenant, above)
    // got folded straight into their current-room row while building
    // ebRows below. Tracked so the informationalRows branch further down
    // doesn't also render them a second time as their own row.
    const mergedInformationalTenantIds = new Set<number>();

    const ebRows: RentRow[] = filteredBills
      .map((bill): RentRow | null => {
      const b = bill as any;

      // A bill with no tenantId means the backend found no *current*
      // occupant for this room/flat. It stamps a placeholder name
      // ("Unassigned"), which used to render as a ghost row. The real
      // identity lives in the informationalRows branch below.
      if (b.tenantId == null) return null;

      let room = resolveRoom(bill.roomNumber);
      if (!room && b.tenantId) {
        const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }

      const tenant = tenantMap.get(Number(b.tenantId));
      const rentRecord = getRentStatus(
        b.tenantId,
        bill.roomNumber,
        room?.id
      );

      // A tenant who checks in AFTER the selected month wasn't living
      // here yet, so no rent/EB row is shown for that month — unless a Rent
      // record was already generated for it (that record stays the source
      // of truth).
      if (!rentRecord && checkedInAfterMonth(tenant?.checkInDate, month, year)) {
        return null;
      }

      const liveEB = b.amount ?? 0;

      // Daily-stay tenants who haven't had a Rent record generated for this
      // period yet are handled on a separate branch — their "rent" is the
      // advance already collected at check-in, and only the EB shortfall
      // (if any) plus any pending damage is outstanding.
      if (tenant && isDailyTenant(tenant) && !rentRecord) {
        const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
        const ebBalance = advanceEB - liveEB;
        const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
        const displayDamage = pendingDamageMap.get(Number(b.tenantId)) ?? 0;
        // The RENT column shows the full amount the tenant actually paid
        // at check-in (rent + EB advance together).
        const totalPaidAtCheckIn = tenant.totalAmount ?? advanceRent + advanceEB;

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
          total:         advanceRent + liveEB + displayDamage,
          paid:          totalPaidAtCheckIn,
          previousPending: 0,
          currentPending:  additionalEBDue + displayDamage,
          pending:         additionalEBDue + displayDamage,
          rentRecord:      undefined,
          unitId:          room?.unitId,
          amount:          liveEB,
          paymentStatus:   undefined,
          isDaily:         true,
          advanceEB,
          ebBalance,
        };
      }

      // Uses the tenant's own monthlyRent (falls back to the room's default
      // only if unset). Calendar hostels pro-rate the check-in month;
      // joining-date-cycle hostels bill the full cycle rent.
      const rentPerBed = resolveTenantRent(Number(b.tenantId), room);

      const recordTotal  = rentRecord ? Number(rentRecord.totalAmount  || 0) : 0;
      const recordRent   = rentRecord ? Number(rentRecord.rentAmount   || 0) : rentPerBed;
      const recordEB     = rentRecord ? Number(rentRecord.ebAmount     || 0) : b.amount ?? 0;
      const recordDamage = rentRecord ? Number((rentRecord as any).damageAmount || 0) : 0;

      const isPaid = normalizeStatus(rentRecord?.paymentStatus) === "PAID";

      // Once a Rent row is generated, rentRecord.ebAmount is frozen at the
      // EB reading of that moment. For any rent that hasn't been fully paid
      // yet, prefer the *current* EB reading (bill.amount) over the frozen
      // recordEB and recompute total/pending off that live number. A PAID
      // rent still shows exactly what was actually billed and collected.

      let displayEB = rentRecord ? (isPaid ? recordEB : liveEB) : liveEB;

      // FIX: a same-period checkout settlement is only added for a genuine
      // room transfer. For a checked-out / same-room tenant the backend bill
      // is already correct and is used as-is (see resolveTenantEB).
      // Skip once PAID: that figure is already final and collected.
      const infoReading = informationalByTenant.get(Number(b.tenantId));
      if (infoReading && !isPaid) {
        const resolved = resolveTenantEB(tenant, room, displayEB, infoReading, Number(b.tenantId));
        displayEB = resolved.eb;
        if (resolved.usedInfo) mergedInformationalTenantIds.add(Number(b.tenantId));
      }

      const displayRent   = rentRecord ? recordRent   : rentPerBed;
      // Rent Due Model: due amount for overdue days (₹0 under NO_DUE).
      const due = resolveTenantDue(Number(b.tenantId), room, rentRecord);
      // Once a Rent row exists, its damageAmount is the source of truth.
      // Until then, fall back to unbilled DamageTenant shares for this tenant.
      const displayDamage = rentRecord
        ? recordDamage
        : (pendingDamageMap.get(Number(b.tenantId)) ?? 0);
      const displayTotal  = rentRecord
        ? (isPaid ? recordTotal : displayRent + displayEB + displayDamage + due.dueAmount)
        : rentPerBed + displayEB + displayDamage + due.dueAmount;

      const currentPaid   = Number(rentRecord?.paidAmount || 0);
      const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

      const currentPending = rentRecord
        ? currentStatus === "PAID"
          ? 0
          : currentStatus === "PARTIAL"
          ? displayTotal - currentPaid
          : displayTotal
        : rentPerBed + displayEB + displayDamage + due.dueAmount;

      const { previousPending } = rentRecord
        ? computePreviousPending(b.tenantId, month, year, rents)
        : { previousPending: 0 };

      const flatNumber =
        bill.flatNumber ||
        (() => {
          if (!room?.flatId) return "";
          const flatBill = ebBills.find(
            (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
          );
          return flatBill?.flatNumber ?? String(room.flatId);
        })();

      // NEW: joining-date-cycle hostels can't bill a cycle that hasn't started.
      const cyclePreview = !rentRecord ? getCyclePreview(Number(b.tenantId), room) : null;
      const generateBlockedReason =
        cyclePreview && !cyclePreview.billable ? cyclePreview.reason : undefined;

      return {
        tenantId:      b.tenantId,
        tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
        tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
        roomNumber:    room?.roomNumber ?? bill.roomNumber,
        flatNumber,
        rentPerBed:    displayRent,
        displayEB,
        damageAmount:  displayDamage,
        dueAmount:     due.dueAmount,
        dueDays:       due.dueDays,
        duePerDay:     due.perDay,
        total:         displayTotal,
        paid:          currentPaid,
        previousPending,
        currentPending,
        pending:       rentRecord
          ? previousPending + currentPending
          : currentPending,
        rentRecord,
        unitId:        room?.unitId,
        // The resolved displayEB so "Generate" bills the same figure shown.
        amount:        displayEB,
        paymentStatus: rentRecord?.paymentStatus,
        generateBlockedReason,
      };
      })
      .filter((r): r is RentRow => r !== null);

    const ebTenantRoomKeys = new Set(
      filteredBills.map((b) => {
        const bAny = b as any;
        let room = resolveRoom(b.roomNumber);
        if (!room && bAny.tenantId) {
          const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
          if (tenant) room = getRoomById(tenant.roomId);
        }
        return `${bAny.tenantId}-${room?.id ?? b.roomNumber}`;
      })
    );

    const currentMonthRentMap = new Map<string, Rent>();
    rents
      .filter(
        (r) => Number(r.rentMonth) === month && Number(r.rentYear) === year
      )
      .forEach((r) => {
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
        return searchStr.includes(search.toLowerCase());
      })
      .map((r) => {
        const room        = getRoomById(r.roomId);
        const recordTotal  = Number(r.totalAmount || 0);
        const recordRent   = Number(r.rentAmount  || 0);
        const recordEB     = Number(r.ebAmount    || 0);
        const recordDamage = Number((r as any).damageAmount || 0);
        const currentPaid  = Number(r.paidAmount  || 0);
        const status       = normalizeStatus(r.paymentStatus);

        const currentPending =
          status === "PAID"
            ? 0
            : status === "PARTIAL"
            ? recordTotal - currentPaid
            : recordTotal;

        const { previousPending } = computePreviousPending(
          Number(r.tenantId),
          month,
          year,
          rents
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
          dueAmount:       Number(r.dueAmount ?? 0),
          dueDays:         Number(r.dueDays ?? 0),
          duePerDay:       Number(r.duePerDay ?? 0),
          total:           recordTotal,
          paid:            currentPaid,
          previousPending,
          currentPending,
          pending:         previousPending + currentPending,
          rentRecord:      r,
          unitId:          room?.unitId,
          amount:          recordEB,
          paymentStatus:   r.paymentStatus,
        };
      });

    // DAILY-stay tenants who have a checkout/settlement EB reading for this
    // exact month/year, and have no current room to fold it into (fully
    // checked out of the property). Pulled straight from the raw EB readings
    // list, classified with isInformationalReading.
    const informationalRows: RentRow[] = Array.from(informationalByTenant.entries())
      .map(([tenantIdRaw, r]) => {
        const tenantId = Number(tenantIdRaw);
        if (mergedInformationalTenantIds.has(tenantId)) return null;

        const tenant   = tenantMap.get(tenantId);

        // Only DAILY-stay tenants settle through this flow.
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
        if (!searchStr.includes(search.toLowerCase())) return null;

        const prevReading = Number(r.previousReading ?? 0);
        const currReading = Number(r.currentReading ?? 0);
        const rate = Number(r.ebRate ?? 0) || 13;

        const flatId = room?.flatId ?? null;
        const occupants = flatId != null
          ? tenants.filter((t) => {
              const tRoom = rooms.find((rm) => rm.id === t.roomId);
              return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
            })
          : tenants.filter((t) => String(t.roomId) === String(r.roomId));

        // Prefer a real value the backend already persisted on this row;
        // only recompute client-side when both are missing/zero.
        const storedUnits  = Number(r.unitsConsumed ?? 0);
        const storedAmount = Number(r.ebAmount ?? 0);

        let grossAmount = storedAmount;
        if (!storedUnits && !storedAmount) {
          const computed = calculateInformationalShare(
            tenantId, prevReading, currReading, rate, occupants
          );
          grossAmount = computed.amount;
        }

        const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
        const ebBalance = advanceEB - grossAmount;
        const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
        const displayDamage = pendingDamageMap.get(tenantId) ?? 0;
        const totalPaidAtCheckIn = tenant.totalAmount ?? advanceRent + advanceEB;

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
          total:         advanceRent + grossAmount + displayDamage,
          paid:          totalPaidAtCheckIn,
          previousPending: 0,
          currentPending:  additionalEBDue + displayDamage,
          pending:         additionalEBDue + displayDamage,
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

    // Tenants with an unbilled damage share but no EB bill row and no Rent
    // row yet for this month would otherwise never show up on this page.
    const coveredTenantIds = new Set<number>([
      ...ebRows.map((r) => r.tenantId),
      ...orphanRows.map((r) => r.tenantId),
      ...informationalRows.map((r) => r.tenantId),
    ]);

    const damageOnlyRows: RentRow[] = Array.from(pendingDamageMap.entries())
      .filter(([tenantId, amount]) => amount > 0 && !coveredTenantIds.has(Number(tenantId)))
      .map(([tenantId]) => {
        const tenant = tenants.find((t) => Number(t.id) === Number(tenantId));
        const room   = tenant ? getRoomById(tenant.roomId) : undefined;

        if (role !== "ADMIN" && branchId && (!room || String(room.unitId) !== String(branchId))) {
          return null;
        }

        const resolvedName = resolveTenantName(Number(tenantId));
        const searchStr = `${resolvedName} ${room?.roomNumber ?? ""} ${
          (room as any)?.flatNumber ?? ""
        }`.toLowerCase();
        if (!searchStr.includes(search.toLowerCase())) return null;

        const damageAmount = pendingDamageMap.get(Number(tenantId)) ?? 0;
        // Uses the tenant's own monthlyRent so a damage-only row shows their
        // actual rent too. A daily-stay tenant's "rent" is their already-paid advance.
        const rentPerBed = tenant && isDailyTenant(tenant)
          ? (tenant.totalAmount ?? (() => {
              const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
              return advanceRent + advanceEB;
            })())
          : resolveTenantRent(Number(tenantId), room);

        return {
          tenantId:      Number(tenantId),
          tenantName:    resolvedName,
          roomNumber:    room?.roomNumber ?? "—",
          flatNumber:    (room as any)?.flatNumber ?? "-",
          displayEB:     0,
          rentPerBed,
          damageAmount,
          total:         rentPerBed + damageAmount,
          paid:          0,
          previousPending: 0,
          currentPending:  damageAmount,
          pending:         damageAmount,
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

    return allRows;
  }, [
    filteredBills,
    rooms,
    tenants,
    tenantMap,
    selectedBranch,
    selectedRoom,
    month,
    year,
    isFuturePeriod,
    rents,
    search,
    tenantNameMap,
    tenantRentMap,
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
      .sort((a, b) => a.label.localeCompare(b.label));
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

  const handleGenerate = async (bill: RentRow) => {
    if (isFuturePeriod) {
      return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
    }
    // NEW: joining-date-cycle hostel whose cycle hasn't started yet.
    if (bill.generateBlockedReason) {
      return toast.error(bill.generateBlockedReason);
    }
    let room = getRoomObj(bill.roomNumber);
    if (!room) {
      const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
      if (tenant) room = getRoomById(tenant.roomId);
    }

    if (!room) return toast.error("Room not found for this tenant");

    // For a daily-stay tenant, Rent was already collected at check-in —
    // only the EB shortfall (if any) should be billed here.
    const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
    const isDaily = tenant && isDailyTenant(tenant);
    const rentAmount = isDaily ? 0 : resolveTenantRent(bill.tenantId, room);
    // bill.amount holds the EB figure. For a row built from an informational
    // reading, the computed EB share is already in bill.displayEB / bill.amount.
    const ebAmount = isDaily ? Math.max(0, -(bill.ebBalance ?? 0)) : bill.amount;

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
      reload();
    } catch (e: any) {
      // The server rejects cycles that are before joining / not started yet.
      toast.error(e?.response?.data?.message || "Failed to generate rent");
    }
  };

  const handleGenerateAll = async () => {
    if (isFuturePeriod) {
      return toast.error(`Rent can't be generated for ${MONTHS[month - 1]} ${year} — that month hasn't started yet`);
    }
    if (!confirm("Generate rent for all tenants?")) return;

    // NEW: tenants skipped because their joining-date cycle hasn't started.
    let skippedCycle = 0;

    const billsToGenerate = ebBills.filter((bill) => {
      const bAny = bill as any;
      let room = getRoomObj(bill.roomNumber);
      if (!room && bAny.tenantId) {
        const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }
      // Never generate for a tenant who checks in after the selected month.
      const billTenant = bAny.tenantId != null ? tenantMap.get(Number(bAny.tenantId)) : undefined;
      if (checkedInAfterMonth(billTenant?.checkInDate, month, year)) return false;
      if (getRentStatus(bAny.tenantId, bill.roomNumber, room?.id)) return false;

      // NEW: skip (don't fail the batch for) cycles that haven't started.
      if (bAny.tenantId != null) {
        const cyc = getCyclePreview(Number(bAny.tenantId), room);
        if (cyc && !cyc.billable) {
          skippedCycle++;
          return false;
        }
      }
      return true;
    });

    // Tenant IDs whose checkout settlement gets folded into their
    // current-room bill in the main pass below — tracked so the second
    // pass doesn't also generate a duplicate record for the same reading.
    const mergedInformationalTenantIds = new Set<number>();

    try {
      // allSettled: one tenant failing must not abort the rest of the batch.
      const results = await Promise.allSettled(
        billsToGenerate.map(async (bill) => {
          const b = bill as any;
          let room = getRoomObj(bill.roomNumber);
          if (!room && b.tenantId) {
            const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
            if (tenant) room = getRoomById(tenant.roomId);
          }
          if (!room) return;

          const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
          if (tenant && isDailyTenant(tenant)) {
            // Skip daily-stay tenants who don't owe an EB shortfall.
            // Anyone who does owe is billed for the shortfall only, rentAmount 0.
            const { advanceEB } = computeDailyAdvance(tenant);
            const ebBalance = advanceEB - (b.amount ?? 0);
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

          // FIX: same EB resolution as the Rent table — the backend bill is
          // used as-is for a checked-out / same-room tenant, and the old
          // room's settlement is only added for a genuine room transfer.
          const infoReading = informationalByTenant.get(Number(b.tenantId));
          const resolved = resolveTenantEB(tenant, room, b.amount ?? 0, infoReading, Number(b.tenantId));
          const ebAmount = resolved.eb;
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

      // "Generate All" is driven off ebBills, which never includes a
      // checked-out tenant's informational reading. Sweep those in as a
      // second pass — only for tenants not already folded in above.
      await Promise.all(
        Array.from(informationalByTenant.entries()).map(async ([tenantIdRaw, r]) => {
          const tenantId = Number(tenantIdRaw);
          if (mergedInformationalTenantIds.has(tenantId)) return;

          const tenant = tenants.find((t) => Number(t.id) === tenantId);
          if (!tenant || !isDailyTenant(tenant)) return;
          const room =
            (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
            getRoomById(tenant.roomId);
          if (!room) return;

          const alreadyHasRent = rents.some(
            (rr) =>
              Number(rr.tenantId) === tenantId &&
              Number(rr.rentMonth) === month &&
              Number(rr.rentYear) === year &&
              String(rr.roomId) === String(room.id)
          );
          if (alreadyHasRent) return;

          const grossAmount = resolveInformationalAmount(tenantId, r);

          const { advanceEB } = computeDailyAdvance(tenant);
          const ebBalance = advanceEB - grossAmount;
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
      if (skippedCycle > 0) notes.push(`${skippedCycle} skipped (cycle not started)`);
      if (failed > 0) notes.push(`${failed} failed`);
      if (notes.length > 0) {
        toast.warning(`Rents generated — ${notes.join(", ")}`);
      } else {
        toast.success("All rents generated");
      }
      reload();
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
      const rentMonth = Number(rent.rentMonth);
      const rentYear  = Number(rent.rentYear);

      const { prevUnpaidRents } = computePreviousPending(
        Number(rent.tenantId),
        rentMonth,
        rentYear,
        rents
      );

      const sortedPrev = [...prevUnpaidRents].sort((a, b) =>
        Number(a.rentYear) !== Number(b.rentYear)
          ? Number(a.rentYear) - Number(b.rentYear)
          : Number(a.rentMonth) - Number(b.rentMonth)
      );

      const queue: Rent[] = [...sortedPrev, rent];
      let remaining = amount;

      for (const record of queue) {
        if (remaining <= 0) break;
        const alreadyPaid  = Number(record.paidAmount  || 0);
        const recordTotal  = Number(record.totalAmount || 0);
        const recordStatus = normalizeStatus(record.paymentStatus);
        if (recordStatus === "PAID") continue;
        const recordPending = recordTotal - alreadyPaid;
        if (recordPending <= 0) continue;
        const apply = Math.min(remaining, recordPending);
        remaining -= apply;
        await recordPayment(record.id, mode, apply, txnId);
      }

      toast.success("Payment recorded");
      reload();
    } catch {
      toast.error("Payment failed");
    }
  };

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const paginatedRows = rowData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Total page count, used both to bound the "Next" button and to build
  // the numbered page list below.
  const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

  // Go back to page 1 whenever a filter changes, and never sit on a page
  // that no longer exists (e.g. after the row count shrinks).
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch, selectedRoom, month, year, search]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  // Windowed list of 1-indexed page numbers with "..." collapsing for
  // longer runs — e.g. [1, 2, 3, 4, '...', 53].
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

  return (
    <div className="min-h-full w-full min-w-0 bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rt-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

        .rt-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .rt-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        /* A11Y: all #64748b / #94a3b8 greys below were bumped to #475569 or
           #64748b-on-white so they clear the 4.5:1 contrast ratio. */
        .rt-subtitle { font-size: 13px; color: #475569; font-weight: 500; }

        .rt-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .rt-layout { flex-direction: row; } .rt-content { flex: 1; min-width: 0; } .rt-sidebar { width: 340px; flex-shrink: 0; } }

        .rt-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .rt-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .rt-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

        .rt-table { width: 100%; border-collapse: collapse; min-width: 1300px; }
        .rt-table th { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .rt-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .rt-table tr:hover { background: #fdfcff; }
        .rt-empty { color: #475569; }

        .rt-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
        .rt-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-tenant-phone { font-size: 11px; color: #475569; margin-top: 2px; }

        .rt-room { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        .rt-branch { font-size: 13px; font-weight: 500; color: #0f172a; }
        .rt-branch-sub { font-size: 11px; color: #475569; margin-top: 2px; }
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

        /* EB-balance badges for daily-stay tenants */
        .rt-eb-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
        .rt-eb-badge.refund { color: #15803d; background: #f0fdf4; }
        .rt-eb-badge.due    { color: #be123c; background: #fef2f2; }
        .rt-eb-badge.even   { color: #475569; background: #f8fafc; }

        .rt-chart-container { padding: 20px; display: flex; flex-direction: column; align-items: center; position: relative; }

        .rt-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
        .rt-sum-item:last-child { border-bottom: none; }

        /* Pagination bar can hold many numbered buttons (1 2 3 4 … 53). */
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

        /* Rent mobile responsive layout: desktop unchanged. */
        .rt-wrap, .rt-layout, .rt-content, .rt-panel { min-width: 0; }
        .rt-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .rt-table-scroll:focus-visible { outline: 2px solid #5200FF; outline-offset: -2px; }
        @media (max-width: 767px) {
          .rt-wrap { width: 100%; max-width: 100%; padding: 14px 10px 24px; }
          .rt-layout { width: 100%; gap: 12px; }
          .rt-layout > div { width: 100%; max-width: 100%; min-width: 0; }
          .rt-header { margin-bottom: 14px; }
          .rt-title { font-size: 20px; }
          .rt-panel { width: 100%; max-width: 100%; margin-bottom: 12px; border-radius: 12px; }
          .rt-panel-header { padding: 14px 12px; gap: 10px; }
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
          .rent-mobile-filters > div:has(input) { grid-column: 1 / -1; }
          .rent-mobile-filters > button { grid-column: 1 / -1; justify-self: start; margin-left: 0 !important; min-height: 36px; }
          .rt-table { min-width: 1300px; }
          .rt-table th, .rt-table td { padding: 12px 14px; }
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
                  {hasAccess && (
                    <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
                       ALL Generation
                    </Button>
                  )}
                </div>
              </div>

              <div className="rent-mobile-filters flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
                  <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedRoom("all"); }} disabled={!hasAccess || (role !== "ADMIN" && role !== "SUPER_ADMIN")}>
                    {/* A11Y: Radix renders each trigger as a <button role="combobox">
                        with no text label of its own, which Lighthouse flags as
                        "Buttons do not have an accessible name". */}
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

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[130px]">
                  <Select
                    value={selectedRoom}
                    onValueChange={setSelectedRoom}
                  >
                    <SelectTrigger aria-label="Filter by room" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue placeholder="All Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {roomOptions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center bg-white border border-[#e2e8f0] rounded-md h-9 w-[130px] px-0">
                   <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger aria-label="Filter by month" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem
                          key={i}
                          value={String(i + 1)}
                          disabled={year === currentYear && i + 1 > currentMonth}
                        >
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
                      // Switching to the current year must never leave a later month selected.
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

              <div className="rt-table-scroll overflow-x-auto" role="region" aria-label="Scrollable rent collection table" tabIndex={0}>
                <table className="rt-table">
                  <caption className="sr-only">Rent collection for {MONTHS[month - 1]} {year}</caption>
                  <thead>
                    <tr>
                      <th scope="col">TENANT</th>
                      <th scope="col">ROOM</th>
                      <th scope="col">BRANCH</th>
                      <th scope="col">RENT (₹)</th>
                      <th scope="col">EB (₹)</th>
                      <th scope="col">DAMAGE (₹)</th>
                      <th scope="col">DUE (₹)</th>
                      <th scope="col">EB BALANCE</th>
                      <th scope="col">TOTAL (₹)</th>
                      <th scope="col">STATUS</th>
                      <th scope="col">PENDING (₹)</th>
                      <th scope="col">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={12} className="text-center py-12 rt-empty">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
                    ) : (
                      paginatedRows.map((row, i) => {
                        // Daily-stay tenants who haven't had a Rent record
                        // generated yet get their own status — "EB Due" when
                        // they owe the shortfall, otherwise "Settled".
                        let sStatus: string;
                        let statusClass: string;
                        let displayStatus: string;

                        if (row.isDaily && !row.rentRecord) {
                          const owesEB = (row.ebBalance ?? 0) < 0;
                          sStatus = owesEB ? "EB_DUE" : "SETTLED";
                          statusClass = owesEB ? "overdue" : "paid";
                          displayStatus = owesEB ? "EB Due" : "Settled";
                        } else {
                          sStatus = row.rentRecord?.paymentStatus ? normalizeStatus(row.rentRecord.paymentStatus) : "UNGENERATED";
                          statusClass = "ungenerated";
                          displayStatus = sStatus;

                          const isOverdueMock = (sStatus === "PENDING" || sStatus === "PARTIAL") && (row.pending > 0);
                          if (sStatus === "PAID") { statusClass = "paid"; displayStatus = "Paid"; }
                          else if (isOverdueMock) { statusClass = "overdue"; displayStatus = "Overdue"; }
                          else if (sStatus === "PENDING" || sStatus === "PARTIAL") { statusClass = "pending"; displayStatus = sStatus === "PARTIAL" ? "Partial" : "Pending"; }
                          else { statusClass = "not-due"; displayStatus = "Not Due"; }
                        }

                        const initials = row.tenantName.substring(0, 2).toUpperCase();
                        // A11Y: the -600 text shades on -100 backgrounds were under
                        // 4.5:1 (emerald/rose/amber especially); darker shades used.
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
                              <div className="rt-branch">{branchOptions.find(b => String(b.id) === String(row.unitId))?.name || "Main Branch"}</div>
                            </td>

                            <td>
                              <span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.rentPerBed))}</span>
                              {/* Sub-label behind the rent figure:
                                  • JOINING_DATE_CYCLE hostel → the billing cycle's dates
                                  • CALENDAR_MONTH hostel     → pro-ration for the check-in month */}
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
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.displayEB))}</span></td>
                            <td>
                              <span className={`rt-value ${row.damageAmount <= 0 ? 'muted' : ''}`}>
                                {row.damageAmount > 0
                                  ? new Intl.NumberFormat('en-IN').format(Math.round(row.damageAmount))
                                  : '—'}
                              </span>
                            </td>
                            <td>
                              {/* Due Amount, shown separately from rent/EB/damage; it is
                                  part of TOTAL and PENDING only when it is above ₹0
                                  (i.e. FIXED_DUE with overdue days). */}
                              {(row.dueAmount ?? 0) > 0 ? (
                                <>
                                  <span className="rt-value text-rose-700">
                                    {new Intl.NumberFormat('en-IN').format(Math.round(row.dueAmount ?? 0))}
                                  </span>
                                  <div className="text-[10px] text-rose-700 mt-0.5">
                                    {row.dueDays} day{row.dueDays === 1 ? "" : "s"} × ₹{new Intl.NumberFormat('en-IN').format(row.duePerDay ?? 0)}
                                  </div>
                                </>
                              ) : (
                                <span className="rt-value muted">—</span>
                              )}
                            </td>
                            <td>
                              {row.isDaily && row.ebBalance !== undefined ? (
                                row.ebBalance > 0 ? (
                                  <span className="rt-eb-badge refund">
                                    Refund ₹{new Intl.NumberFormat('en-IN').format(Math.round(row.ebBalance))}
                                  </span>
                                ) : row.ebBalance < 0 ? (
                                  <span className="rt-eb-badge due">
                                    Due ₹{new Intl.NumberFormat('en-IN').format(Math.round(-row.ebBalance))}
                                  </span>
                                ) : (
                                  <span className="rt-eb-badge even">Even</span>
                                )
                              ) : (
                                <span className="rt-value muted">—</span>
                              )}
                            </td>
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.total))}</span></td>
                            <td><div className={`rt-status ${statusClass}`}>{displayStatus}</div></td>
                            <td>
                              <div className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.pending > 0 ? row.pending : (row.isDaily ? 0 : row.total)))}</div>
                            </td>
                            <td>
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
                {/* Numbered pagination row (1 2 3 … n). Prev/Next stay on
                    either end and disable correctly at the first/last page. */}
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