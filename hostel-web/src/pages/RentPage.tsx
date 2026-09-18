// import { useEffect, useState, useRef, useMemo } from "react";

// import {
//   getRooms,
//   getRents,
//   getTenants,
//   getTenantWiseEBBill,
//   generateRent,
//   recordPayment,
//   getUserRole,
//   getBranchId,
//   fetchAllPages,
//   getPendingDamageSummary,
// } from "@/lib/store";

// import {
//   Room,
//   Rent,
//   Tenant,
//   TenantEBBill,
//   MONTHS,
//   PAYMENT_MODES,
//   PaymentMode,
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
//   total: number;
//   paid: number;
//   pending: number;
//   previousPending: number;
//   currentPending: number;
//   rentRecord: Rent | undefined;
//   unitId: number | undefined;
//   amount: number;
//   paymentStatus?: string;
//   // NEW: daily-stay ("Rent + EB advance paid at check-in") settlement info.
//   // Only populated for tenantStay === "DAILY" rows that don't have a Rent
//   // record yet — once a Rent record exists for the period, that record is
//   // the source of truth and the row goes back through the normal fields
//   // above, so these stay undefined at that point.
//   isDaily?: boolean;
//   advanceEB?: number;
//   ebBalance?: number; // > 0 => refund owed to tenant, < 0 => tenant owes the difference
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

//   // NEW: a daily-stay tenant who has nothing outstanding (ebBalance >= 0,
//   // i.e. exactly settled or owed a refund) and no Rent record yet has
//   // nothing to generate or collect here — refunds are handled outside
//   // this flow, so no action controls should render for that row.
//   const isSettledDailyNoAction =
//     !rentRecord && bill.isDaily && (bill.ebBalance ?? 0) >= 0;

//   if (isSettledDailyNoAction) {
//     return <span className="text-[11px] text-slate-400">No action needed</span>;
//   }

//   return (
//     <div className="flex items-center gap-2">
//       {!rentRecord && (
//         <Button size="sm" variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0" onClick={() => onGenerate(bill)}>
//           Generate
//         </Button>
//       )}

//       {isUnpaid && (
//         <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-md">
//           <Select
//             value={localMode}
//             onValueChange={(v: PaymentMode) => setLocalMode(v)}
//           >
//             <SelectTrigger className="w-[80px] h-6 text-[10px] border-slate-200 focus:ring-0 shadow-none px-2">
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
//             value={localAmount}
//             onChange={(e) => setLocalAmount(e.target.value)}
//             onKeyDown={(e) => e.stopPropagation()}
//             className="border border-slate-200 rounded px-2 h-6 w-16 text-[10px] outline-none focus:border-indigo-400"
//           />

//           {showTxnId && (
//             <input
//               type="text"
//               placeholder="Txn ID"
//               value={localTxnId}
//               onChange={(e) => setLocalTxnId(e.target.value)}
//               onKeyDown={(e) => e.stopPropagation()}
//               className="border border-slate-200 rounded px-2 h-6 w-20 text-[10px] outline-none focus:border-indigo-400"
//             />
//           )}

//           <Button size="sm" className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700" onClick={handlePay}>
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

//   const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

//   // Damage shares that exist but haven't been billed into a Rent record yet
//   // (i.e. DamageTenant.rent is still null on the backend). Keyed by tenantId.
//   // Without this, the Rent page only ever read damageAmount off an already
//   // generated Rent row, so a freshly reported damage showed as ₹0 here even
//   // though it appeared correctly on the Damage/Penalty page.
//   const [pendingDamageMap, setPendingDamageMap] = useState<Map<number, number>>(new Map());

//   const [search, setSearch] = useState("");
//   const [month,  setMonth]  = useState(new Date().getMonth() + 1);
//   const [year,   setYear]   = useState(new Date().getFullYear());

//   const fetchedEBKeys = useRef<Set<string>>(new Set());
//   const loadingRef    = useRef(false);

//   /* ── helpers ── */
//   const normalizeStatus = (status?: string) => (status || "").toUpperCase();

//   const currentYear = new Date().getFullYear();

//   const yearOptions = Array.from(
//     { length: 11 },
//     (_, index) => currentYear - 5 + index
//   );

//   const ebBills: EBBillRow[] = useMemo(() => {
//     const key = `${month}-${year}`;
//     return ebBillsMap.get(key) ?? [];
//   }, [ebBillsMap, month, year]);

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

//   // Tenant-specific monthly rent (what the Tenants page shows) keyed by
//   // tenantId. Different tenants in the *same* room can be on different
//   // negotiated rents (e.g. ₹7,000 vs ₹7,500), so this must never be
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

//   // CHANGED: this used to be `room?.rentPerBed ?? 0` everywhere, which
//   // meant every tenant sharing a room showed the room's flat default rate
//   // instead of their own agreed rent. Now it prefers the tenant's own
//   // `monthlyRent` (same field the Tenants page displays) and only falls
//   // back to the room's rentPerBed when the tenant has no rent set.
//   const resolveTenantRent = (tenantId: number, room?: Room): number => {
//     const tenantRent = tenantRentMap.get(Number(tenantId));
//     if (tenantRent != null) return tenantRent;
//     return room?.rentPerBed ?? 0;
//   };

//   // NEW: a "DAILY" stay tenant pays their full stay's Rent *and* an EB
//   // advance up front at check-in (Tenant.totalAmount / Tenant.ebAmount,
//   // captured by the check-in form). That advance rent must never be
//   // re-billed on the Rent page — it's already collected. The only thing
//   // that still needs settling is the gap between the EB they advanced
//   // and what they actually used:
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

//   const reload = async () => {
//     if (loadingRef.current) return;
//     loadingRef.current = true;
//     try {
//       const [roomList, rentList, tenantList, pendingDamages] = await Promise.all([
//         fetchAllPages<Room>(getRooms),
//         fetchAllPages<Rent>(getRents),
//         fetchAllPages<Tenant>(getTenants),
//         getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
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

//       // Month/year selection didn't change here, but the underlying
//       // room/tenant data did — so any cached EB results keyed off the
//       // old room/tenant snapshot must be dropped and re-fetched.
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

//   useEffect(() => {
//     if (rooms.length === 0) return;

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
//               // Without this the API previously returned whatever EB
//               // reading it had (in this DB, only the Aug-2026 row),
//               // which is why every month/year selection looked identical.
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
//   }, [rooms, tenants, month, year]);

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
//     const ebRows: RentRow[] = filteredBills.map((bill) => {
//       const b = bill as any;

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

//       const liveEB = b.amount ?? 0;

//       // NEW: daily-stay tenants who haven't had a Rent record generated
//       // for this period yet are handled on a completely separate branch —
//       // their "rent" is the advance already collected at check-in, not
//       // the room/tenant's monthlyRent, and what's actually outstanding is
//       // only the EB shortfall (if any) plus any pending damage.
//       if (tenant && isDailyTenant(tenant) && !rentRecord) {
//         const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
//         const ebBalance = advanceEB - liveEB;
//         const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
//         const displayDamage = pendingDamageMap.get(Number(b.tenantId)) ?? 0;
//         // The RENT column shows the full amount the tenant actually paid
//         // at check-in (rent + EB advance together — same figure the
//         // Tenants page shows under RENT/TOTAL), not just the rent-only
//         // portion. The EB column and EB BALANCE column already break the
//         // EB advance vs. actual-usage reconciliation out separately, so
//         // this doesn't double count — `advanceRent` (rent-only) is still
//         // what drives the Total/Pending math below.
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

//       // CHANGED: was `room?.rentPerBed ?? 0` — now uses the tenant's own
//       // monthlyRent (falls back to the room's default only if unset), so
//       // two tenants in the same room can show different rent amounts.
//       const rentPerBed = resolveTenantRent(Number(b.tenantId), room);

//       const recordTotal  = rentRecord ? Number(rentRecord.totalAmount  || 0) : 0;
//       const recordRent   = rentRecord ? Number(rentRecord.rentAmount   || 0) : rentPerBed;
//       const recordEB     = rentRecord ? Number(rentRecord.ebAmount     || 0) : b.amount ?? 0;
//       const recordDamage = rentRecord ? Number((rentRecord as any).damageAmount || 0) : 0;

//       const isPaid = normalizeStatus(rentRecord?.paymentStatus) === "PAID";

//       // CHANGED: once a Rent row is generated, rentRecord.ebAmount is
//       // frozen at whatever the EB reading was at that moment. If the EB
//       // reading is later corrected/edited (e.g. units or amount fixed on
//       // the EB Readings page), an already-generated but still-unpaid Rent
//       // row kept showing the old, stale ebAmount instead of the corrected
//       // one — that's why ASKING showed ₹195 here while EB Readings showed
//       // ₹325. For any rent that hasn't been fully paid yet, prefer the
//       // *current* EB reading (bill.amount) over the frozen recordEB, and
//       // recompute total/pending off that live number. A PAID rent still
//       // shows exactly what was actually billed and collected.

//       const displayEB     = rentRecord ? (isPaid ? recordEB : liveEB) : liveEB;
//       const displayRent   = rentRecord ? recordRent   : rentPerBed;
//       // Once a Rent row exists, its damageAmount is the source of truth.
//       // Until then, fall back to unbilled DamageTenant shares for this
//       // tenant so a reported damage is visible before "Generate" is clicked.
//       const displayDamage = rentRecord
//         ? recordDamage
//         : (pendingDamageMap.get(Number(b.tenantId)) ?? 0);
//       const displayTotal  = rentRecord
//         ? (isPaid ? recordTotal : displayRent + displayEB + displayDamage)
//         : rentPerBed + liveEB + displayDamage;

//       const currentPaid   = Number(rentRecord?.paidAmount || 0);
//       const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

//       const currentPending = rentRecord
//         ? currentStatus === "PAID"
//           ? 0
//           : currentStatus === "PARTIAL"
//           ? displayTotal - currentPaid
//           : displayTotal
//         : rentPerBed + liveEB + displayDamage;

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

//       return {
//         tenantId:      b.tenantId,
//         tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
//         tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
//         roomNumber:    room?.roomNumber ?? bill.roomNumber,
//         flatNumber,
//         rentPerBed:    displayRent,
//         displayEB,
//         damageAmount:  displayDamage,
//         total:         displayTotal,
//         paid:          currentPaid,
//         previousPending,
//         currentPending,
//         pending:       rentRecord
//           ? previousPending + currentPending
//           : currentPending,
//         rentRecord,
//         unitId:        room?.unitId,
//         amount:        b.amount ?? 0,
//         paymentStatus: rentRecord?.paymentStatus,
//       };
//     });

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

//     // Tenants with an unbilled damage share but no EB bill row and no Rent
//     // row yet for this month (e.g. damage reported before any EB reading
//     // exists) would otherwise never show up on this page at all. Surface
//     // them as their own rows so the pending damage is still visible.
//     const coveredTenantIds = new Set<number>([
//       ...ebRows.map((r) => r.tenantId),
//       ...orphanRows.map((r) => r.tenantId),
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
//         // CHANGED: was `room?.rentPerBed ?? 0` — now uses the tenant's own
//         // monthlyRent so a damage-only row shows their actual rent too.
//         // A daily-stay tenant's "rent" here is their already-paid advance.
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

//     let allRows = [...ebRows, ...orphanRows, ...damageOnlyRows];

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
//   }, [filteredBills, rooms, tenants, tenantMap, selectedBranch, selectedRoom, month, year, rents, search, tenantNameMap, tenantRentMap, pendingDamageMap]);

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
//     let room = getRoomObj(bill.roomNumber);
//     if (!room) {
//       const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
//       if (tenant) room = getRoomById(tenant.roomId);
//     }

//     if (!room) return toast.error("Room not found for this tenant");

//     // NEW: for a daily-stay tenant, Rent was already collected at
//     // check-in — only the EB shortfall (if any) should be billed here.
//     // rentAmount is left at 0 so the generated record never double-charges
//     // the advance the tenant already paid.
//     const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
//     const isDaily = tenant && isDailyTenant(tenant);
//     const rentAmount = isDaily ? 0 : resolveTenantRent(bill.tenantId, room);
//     const ebAmount = isDaily ? Math.max(0, -(bill.ebBalance ?? 0)) : bill.amount;

//     try {
//       await generateRent({
//         tenantId:   String(bill.tenantId),
//         roomId:     String(room.id),
//         rentMonth:  month,
//         rentYear:   year,
//         // CHANGED: was `room.rentPerBed` — now the tenant's own monthlyRent
//         // (with room.rentPerBed only as a fallback) so the generated Rent
//         // record is billed at the tenant's actual agreed rent, or 0 for a
//         // daily-stay tenant whose rent is already covered by their advance.
//         rentAmount,
//         ebAmount,
//       });
//       toast.success(`Rent generated for ${bill.tenantName}`);
//       reload();
//     } catch {
//       toast.error("Failed to generate rent");
//     }
//   };

//   const handleGenerateAll = async () => {
//     if (!confirm("Generate rent for all tenants?")) return;
//     const billsToGenerate = ebBills.filter((bill) => {
//       const bAny = bill as any;
//       let room = getRoomObj(bill.roomNumber);
//       if (!room && bAny.tenantId) {
//         const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
//         if (tenant) room = getRoomById(tenant.roomId);
//       }
//       return !getRentStatus(bAny.tenantId, bill.roomNumber, room?.id);
//     });

//     try {
//       await Promise.all(
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
//             // NEW: skip daily-stay tenants who don't owe an EB shortfall —
//             // nothing to generate for them this run. Anyone who does owe
//             // is billed for the shortfall only, with rentAmount 0 (see
//             // handleGenerate for the reasoning).
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

//           await generateRent({
//             tenantId:   String(b.tenantId),
//             roomId:     String(room.id),
//             rentMonth:  month,
//             rentYear:   year,
//             // CHANGED: was `room.rentPerBed` — see handleGenerate above.
//             rentAmount: resolveTenantRent(Number(b.tenantId), room),
//             ebAmount:   b.amount ?? 0,
//           });
//         })
//       );
//       toast.success("All rents generated");
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
//     bill: RentRow
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

//   // CHANGED: total page count, used both to bound the "Next" button and
//   // to build the numbered page list below.
//   const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

//   // CHANGED: builds a windowed list of 1-indexed page numbers with "..."
//   // collapsing for longer runs — e.g. [1, 2, 3, 4, '...', 53] near the
//   // start, or [1, '...', 5, 6, 7, '...', 53] in the middle. Replaces the
//   // old control, which only ever rendered the current page number and
//   // had no way to jump ahead past page+1.
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

//   const overdueCount = rowData.filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0).length;

//   const topOverdueTenants = [...rowData]
//     .filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0)
//     .sort((a, b) => b.pending - a.pending)
//     .slice(0, 3);

//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .rt-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

//         .rt-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
//         .rt-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
//         .rt-subtitle { font-size: 13px; color: #64748b; font-weight: 500; }

//         .rt-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
//         @media (min-width: 1536px) { .rt-layout { flex-direction: row; } .rt-content { flex: 1; min-width: 0; } .rt-sidebar { width: 340px; flex-shrink: 0; } }

//         .rt-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
//         .rt-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
//         .rt-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

//         .rt-table { width: 100%; border-collapse: collapse; min-width: 1300px; }
//         .rt-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .rt-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .rt-table tr:hover { background: #fdfcff; }

//         .rt-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
//         .rt-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-tenant-phone { font-size: 11px; color: #64748b; margin-top: 2px; }

//         .rt-room { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
//         .rt-branch { font-size: 13px; font-weight: 500; color: #0f172a; }
//         .rt-branch-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
//         .rt-value { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rt-value.muted { color: #94a3b8; font-weight: 500; }
//         .rt-date { font-size: 13px; font-weight: 500; color: #475569; }

//         .rt-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; }
//         .rt-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
//         .rt-status.paid { color: #16a34a; }
//         .rt-status.paid::before { background: #16a34a; }
//         .rt-status.pending { color: #f97316; }
//         .rt-status.pending::before { background: #f97316; }
//         .rt-status.overdue { color: #e11d48; }
//         .rt-status.overdue::before { background: #e11d48; }
//         .rt-status.not-due { color: #3b82f6; }
//         .rt-status.not-due::before { background: #3b82f6; }
//         .rt-status.ungenerated { color: #64748b; }
//         .rt-status.ungenerated::before { background: #64748b; }

//         /* NEW: EB-balance badges for daily-stay tenants */
//         .rt-eb-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
//         .rt-eb-badge.refund { color: #16a34a; background: #f0fdf4; }
//         .rt-eb-badge.due    { color: #e11d48; background: #fef2f2; }
//         .rt-eb-badge.even   { color: #64748b; background: #f8fafc; }

//         .rt-chart-container { padding: 20px; display: flex; flex-direction: column; align-items: center; position: relative; }

//         .rt-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
//         .rt-sum-item:last-child { border-bottom: none; }

//         /* CHANGED: pagination bar can now hold many numbered buttons
//            (1 2 3 4 … 53), so let the row wrap on narrow screens instead
//            of overflowing, and give every page button a consistent
//            min-width so single- and double-digit pages line up. The
//            "..." marker gets its own non-interactive look. */
//         .rt-page-row { flex-wrap: wrap; }
//         .rt-page-btn {
//           width: 32px; height: 32px; min-width: 32px; border-radius: 6px;
//           border: 1px solid #e2e8f0; display: flex; align-items: center;
//           justify-content: center; color: #64748b; background: #fff;
//           font-weight: 500; font-size: 14px; cursor: pointer;
//         }
//         .rt-page-btn:hover:not(:disabled) { background: #f8fafc; }
//         .rt-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
//         .rt-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }
//         .rt-page-ellipsis { cursor: default; color: #94a3b8; }
//       `}</style>

//       <div className="rt-wrap">
//         <div className="rt-header">
//           <div>
//             <h1 className="rt-title">Rent Management</h1>
//             <p className="rt-subtitle">Home <ChevronRight size={12} className="inline opacity-50" /> Rent</p>
//           </div>
//         </div>

//         <div className="rt-layout">
//           <div>
//             <div className="rt-panel">
//               <div className="rt-panel-header">
//                 <div className="rt-panel-title">Rent Collection</div>
//                 <div className="flex gap-2">
//                   {hasAccess && (
//                     <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
//                        ALL Generation
//                     </Button>
//                   )}
//                 </div>
//               </div>

//               <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
//                   <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedRoom("all"); }} disabled={!hasAccess || (role !== "ADMIN" && role !== "SUPER_ADMIN")}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {MONTHS.map((m, i) => (
//                         <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[110px]">
//                   <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
//                   <Search size={14} className="text-slate-400 mr-2" />
//                   <input
//                     type="text"
//                     placeholder="Search tenant or room..."
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal"
//                   />
//                 </div>

//                 <button
//                   className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a] ml-auto"
//                   onClick={() => {
//                     setSelectedBranch(role !== "ADMIN" && branchId ? String(branchId) : "all");
//                     setSelectedRoom("all");
//                     setSearch("");
//                     setMonth(new Date().getMonth() + 1);
//                     setYear(new Date().getFullYear());
//                   }}
//                 >
//                   <RefreshCw size={14} /> Clear Filters
//                 </button>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="rt-table">
//                   <thead>
//                     <tr>
//                       <th>TENANT</th>
//                       <th>ROOM</th>
//                       <th>BRANCH</th>
//                       <th>RENT (₹)</th>
//                       <th>EB (₹)</th>
//                       <th>DAMAGE (₹)</th>
//                       <th>EB BALANCE</th>
//                       <th>TOTAL (₹)</th>
//                       <th>STATUS</th>
//                       <th>PENDING (₹)</th>
//                       <th>ACTIONS</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginatedRows.length === 0 ? (
//                       <tr><td colSpan={11} className="text-center py-12 text-slate-400">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
//                     ) : (
//                       paginatedRows.map((row, i) => {
//                         // NEW: daily-stay tenants who haven't had a Rent
//                         // record generated yet get their own status —
//                         // "EB Due" when they owe the shortfall, otherwise
//                         // "Settled" (fully covered or owed a refund).
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
//                         const colors = ['bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600', 'bg-amber-100 text-amber-600'];
//                         const avatarClass = colors[i % colors.length];

//                         const roomObj = getRoomObj(row.roomNumber) || getRoomById(row.rentRecord?.roomId ?? 0);
//                         const isAc = roomObj?.hostelType === "AC";

//                         return (
//                           <tr key={row.tenantId + "-" + row.roomNumber}>
//                             <td>
//                               <div className="flex items-center">
//                                 <div className={`rt-avatar ${avatarClass}`}>{initials}</div>
//                                 <div>
//                                   <div className="rt-tenant-name">{row.tenantName}</div>
//                                   <div className="rt-tenant-phone">{row.tenantPhone}</div>
//                                 </div>
//                               </div>
//                             </td>
//                             <td>
//                               <div className="rt-room">{row.roomNumber}</div>
//                               <div className={`rt-room-type ${isAc ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
//                                 {isAc ? 'AC' : 'Non-AC'}
//                               </div>
//                             </td>
//                             <td>
//                               <div className="rt-branch">{branchOptions.find(b => String(b.id) === String(row.unitId))?.name || "Main Branch"}</div>
//                             </td>

//                             <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.rentPerBed))}</span></td>
//                             <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.displayEB))}</span></td>
//                             <td>
//                               <span className={`rt-value ${row.damageAmount <= 0 ? 'muted' : ''}`}>
//                                 {row.damageAmount > 0
//                                   ? new Intl.NumberFormat('en-IN').format(Math.round(row.damageAmount))
//                                   : '—'}
//                               </span>
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

//               <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
//                 <div className="text-[13px] text-[#64748b]">
//                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} records
//                 </div>
//                 {/* CHANGED: numbered pagination row (1 2 3 … n) replacing
//                     the old control, which only ever showed the current
//                     page number and could only ever jump to page+2 via
//                     the "next" arrow. Prev/Next stay on either end and
//                     disable correctly at the first/last page. */}
//                 <div className="flex gap-2 rt-page-row">
//                   <button
//                     className="rt-page-btn"
//                     disabled={currentPage === 0}
//                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
//                   >
//                     &#8249;
//                   </button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="rt-page-btn rt-page-ellipsis">
//                         <MoreHorizontal size={14} />
//                       </span>
//                     ) : (
//                       <button
//                         key={p}
//                         className={`rt-page-btn ${p === currentPage + 1 ? "active" : ""}`}
//                         onClick={() => setCurrentPage(p - 1)}
//                       >
//                         {p}
//                       </button>
//                     )
//                   )}

//                   <button
//                     className="rt-page-btn"
//                     disabled={currentPage + 1 >= totalPages}
//                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
//                   >
//                     &#8250;
//                   </button>
//                 </div>
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
  total: number;
  paid: number;
  pending: number;
  previousPending: number;
  currentPending: number;
  rentRecord: Rent | undefined;
  unitId: number | undefined;
  amount: number;
  paymentStatus?: string;
  // NEW: daily-stay ("Rent + EB advance paid at check-in") settlement info.
  // Only populated for tenantStay === "DAILY" rows that don't have a Rent
  // record yet — once a Rent record exists for the period, that record is
  // the source of truth and the row goes back through the normal fields
  // above, so these stay undefined at that point.
  isDaily?: boolean;
  advanceEB?: number;
  ebBalance?: number; // > 0 => refund owed to tenant, < 0 => tenant owes the difference
  // NEW: true only for a row built from a raw, informational EB-reading
  // checkout row (see "informationalRows" below) rather than from
  // getTenantWiseEBBill or a real Rent record. Not currently rendered
  // differently, but kept so future UI can distinguish the source if
  // needed (e.g. a "from checkout record" hint).
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

// NEW: mirrors EBReadingsPage.tsx's isInformationalReading exactly. A row
// is an "informational" DAILY-settlement row IFF it carries a tenantId AND
// isCheckout === true. No other write path ever attaches a tenantId to a
// plain room-level EBReading row (see EBReadingsPage.tsx for the full
// rationale). This is what lets a checked-out DAILY tenant's settlement
// surface here even though getTenantWiseEBBill never returns it — that
// endpoint only reflects a room/flat's *current* MONTHLY occupants.
const isInformationalReading = (reading: any) =>
  reading?.tenantId != null && reading?.isCheckout === true;

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

  // NEW: a daily-stay tenant who has nothing outstanding (ebBalance >= 0,
  // i.e. exactly settled or owed a refund) and no Rent record yet has
  // nothing to generate or collect here — refunds are handled outside
  // this flow, so no action controls should render for that row.
  const isSettledDailyNoAction =
    !rentRecord && bill.isDaily && (bill.ebBalance ?? 0) >= 0;

  if (isSettledDailyNoAction) {
    return <span className="text-[11px] text-slate-400">No action needed</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {!rentRecord && (
        <Button size="sm" variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0" onClick={() => onGenerate(bill)}>
          Generate
        </Button>
      )}

      {isUnpaid && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-md">
          <Select
            value={localMode}
            onValueChange={(v: PaymentMode) => setLocalMode(v)}
          >
            <SelectTrigger className="w-[80px] h-6 text-[10px] border-slate-200 focus:ring-0 shadow-none px-2">
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
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="border border-slate-200 rounded px-2 h-6 w-16 text-[10px] outline-none focus:border-indigo-400"
          />

          {showTxnId && (
            <input
              type="text"
              placeholder="Txn ID"
              value={localTxnId}
              onChange={(e) => setLocalTxnId(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="border border-slate-200 rounded px-2 h-6 w-20 text-[10px] outline-none focus:border-indigo-400"
            />
          )}

          <Button size="sm" className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700" onClick={handlePay}>
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

  const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

  // NEW: the full, unfiltered raw EB-readings list (same source
  // EBReadingsPage.tsx reads from). Needed because getTenantWiseEBBill
  // only reflects a room/flat's *current* MONTHLY occupants and never
  // echoes back a checked-out DAILY tenant's informational settlement
  // row — so that row has to be read directly from here instead.
  const [allEBReadings, setAllEBReadings] = useState<EBReading[]>([]);

  // Damage shares that exist but haven't been billed into a Rent record yet
  // (i.e. DamageTenant.rent is still null on the backend). Keyed by tenantId.
  // Without this, the Rent page only ever read damageAmount off an already
  // generated Rent row, so a freshly reported damage showed as ₹0 here even
  // though it appeared correctly on the Damage/Penalty page.
  const [pendingDamageMap, setPendingDamageMap] = useState<Map<number, number>>(new Map());

  const [search, setSearch] = useState("");
  const [month,  setMonth]  = useState(new Date().getMonth() + 1);
  const [year,   setYear]   = useState(new Date().getFullYear());

  const fetchedEBKeys = useRef<Set<string>>(new Set());
  const loadingRef    = useRef(false);

  /* ── helpers ── */
  const normalizeStatus = (status?: string) => (status || "").toUpperCase();

  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => currentYear - 5 + index
  );

  const ebBills: EBBillRow[] = useMemo(() => {
    const key = `${month}-${year}`;
    return ebBillsMap.get(key) ?? [];
  }, [ebBillsMap, month, year]);

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

  // Tenant-specific monthly rent (what the Tenants page shows) keyed by
  // tenantId. Different tenants in the *same* room can be on different
  // negotiated rents (e.g. ₹7,000 vs ₹7,500), so this must never be
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

  // CHANGED: this used to be `room?.rentPerBed ?? 0` everywhere, which
  // meant every tenant sharing a room showed the room's flat default rate
  // instead of their own agreed rent. Now it prefers the tenant's own
  // `monthlyRent` (same field the Tenants page displays) and only falls
  // back to the room's rentPerBed when the tenant has no rent set.
  const resolveTenantRent = (tenantId: number, room?: Room): number => {
    const tenantRent = tenantRentMap.get(Number(tenantId));
    if (tenantRent != null) return tenantRent;
    return room?.rentPerBed ?? 0;
  };

  // NEW: a "DAILY" stay tenant pays their full stay's Rent *and* an EB
  // advance up front at check-in (Tenant.totalAmount / Tenant.ebAmount,
  // captured by the check-in form). That advance rent must never be
  // re-billed on the Rent page — it's already collected. The only thing
  // that still needs settling is the gap between the EB they advanced
  // and what they actually used:
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

  // NEW: mirrors EBReadingsPage.tsx's tenantLastBilledReadingAll — the
  // highest currentReading ever saved for each tenant specifically, built
  // off the full unfiltered raw-readings list. Needed so
  // calculateInformationalShare below can tell that a roommate was
  // already "closed out" of a segment, exactly like the EB Readings page
  // and CheckoutPage do.
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

  // NEW: recomputes a checked-out DAILY tenant's true proportional share
  // of a shared meter window (previousReading -> currentReading) — the
  // SAME segment math EBReadingsPage.tsx / CheckoutPage.tsx use. This is
  // only a fallback for when the backend hasn't (yet) persisted the
  // derived unitsConsumed/ebAmount on the informational reading row
  // itself; whenever those are already present on the row we use them
  // directly instead (see informationalRows below).
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

  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [roomList, rentList, tenantList, pendingDamages, rawReadings] = await Promise.all([
        fetchAllPages<Room>(getRooms),
        fetchAllPages<Rent>(getRents),
        fetchAllPages<Tenant>(getTenants),
        getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
        // NEW: raw EB readings, unfiltered — this is the only place a
        // checked-out DAILY tenant's informational settlement row lives.
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

      // Month/year selection didn't change here, but the underlying
      // room/tenant data did — so any cached EB results keyed off the
      // old room/tenant snapshot must be dropped and re-fetched.
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

  useEffect(() => {
    if (rooms.length === 0) return;

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
              // Without this the API previously returned whatever EB
              // reading it had (in this DB, only the Aug-2026 row),
              // which is why every month/year selection looked identical.
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
  }, [rooms, tenants, month, year]);

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
    const ebRows: RentRow[] = filteredBills.map((bill) => {
      const b = bill as any;

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

      const liveEB = b.amount ?? 0;

      // NEW: daily-stay tenants who haven't had a Rent record generated
      // for this period yet are handled on a completely separate branch —
      // their "rent" is the advance already collected at check-in, not
      // the room/tenant's monthlyRent, and what's actually outstanding is
      // only the EB shortfall (if any) plus any pending damage.
      if (tenant && isDailyTenant(tenant) && !rentRecord) {
        const { advanceRent, advanceEB } = computeDailyAdvance(tenant);
        const ebBalance = advanceEB - liveEB;
        const additionalEBDue = ebBalance < 0 ? -ebBalance : 0;
        const displayDamage = pendingDamageMap.get(Number(b.tenantId)) ?? 0;
        // The RENT column shows the full amount the tenant actually paid
        // at check-in (rent + EB advance together — same figure the
        // Tenants page shows under RENT/TOTAL), not just the rent-only
        // portion. The EB column and EB BALANCE column already break the
        // EB advance vs. actual-usage reconciliation out separately, so
        // this doesn't double count — `advanceRent` (rent-only) is still
        // what drives the Total/Pending math below.
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

      // CHANGED: was `room?.rentPerBed ?? 0` — now uses the tenant's own
      // monthlyRent (falls back to the room's default only if unset), so
      // two tenants in the same room can show different rent amounts.
      const rentPerBed = resolveTenantRent(Number(b.tenantId), room);

      const recordTotal  = rentRecord ? Number(rentRecord.totalAmount  || 0) : 0;
      const recordRent   = rentRecord ? Number(rentRecord.rentAmount   || 0) : rentPerBed;
      const recordEB     = rentRecord ? Number(rentRecord.ebAmount     || 0) : b.amount ?? 0;
      const recordDamage = rentRecord ? Number((rentRecord as any).damageAmount || 0) : 0;

      const isPaid = normalizeStatus(rentRecord?.paymentStatus) === "PAID";

      // CHANGED: once a Rent row is generated, rentRecord.ebAmount is
      // frozen at whatever the EB reading was at that moment. If the EB
      // reading is later corrected/edited (e.g. units or amount fixed on
      // the EB Readings page), an already-generated but still-unpaid Rent
      // row kept showing the old, stale ebAmount instead of the corrected
      // one — that's why ASKING showed ₹195 here while EB Readings showed
      // ₹325. For any rent that hasn't been fully paid yet, prefer the
      // *current* EB reading (bill.amount) over the frozen recordEB, and
      // recompute total/pending off that live number. A PAID rent still
      // shows exactly what was actually billed and collected.

      const displayEB     = rentRecord ? (isPaid ? recordEB : liveEB) : liveEB;
      const displayRent   = rentRecord ? recordRent   : rentPerBed;
      // Once a Rent row exists, its damageAmount is the source of truth.
      // Until then, fall back to unbilled DamageTenant shares for this
      // tenant so a reported damage is visible before "Generate" is clicked.
      const displayDamage = rentRecord
        ? recordDamage
        : (pendingDamageMap.get(Number(b.tenantId)) ?? 0);
      const displayTotal  = rentRecord
        ? (isPaid ? recordTotal : displayRent + displayEB + displayDamage)
        : rentPerBed + liveEB + displayDamage;

      const currentPaid   = Number(rentRecord?.paidAmount || 0);
      const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

      const currentPending = rentRecord
        ? currentStatus === "PAID"
          ? 0
          : currentStatus === "PARTIAL"
          ? displayTotal - currentPaid
          : displayTotal
        : rentPerBed + liveEB + displayDamage;

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

      return {
        tenantId:      b.tenantId,
        tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
        tenantPhone:   tenantPhoneMap.get(Number(b.tenantId)) ?? "",
        roomNumber:    room?.roomNumber ?? bill.roomNumber,
        flatNumber,
        rentPerBed:    displayRent,
        displayEB,
        damageAmount:  displayDamage,
        total:         displayTotal,
        paid:          currentPaid,
        previousPending,
        currentPending,
        pending:       rentRecord
          ? previousPending + currentPending
          : currentPending,
        rentRecord,
        unitId:        room?.unitId,
        amount:        b.amount ?? 0,
        paymentStatus: rentRecord?.paymentStatus,
      };
    });

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

    // NEW: DAILY-stay tenants who have a checkout/settlement EB reading
    // for this exact month/year but aren't covered by either ebRows
    // (getTenantWiseEBBill never returns them — that endpoint only
    // reflects a room/flat's *current* MONTHLY occupants) or orphanRows
    // (no Rent record generated for them yet). Pulled straight from the
    // raw EB readings list (allEBReadings), same source EBReadingsPage.tsx
    // reads from, and classified with the same isInformationalReading
    // rule: tenantId != null && isCheckout === true.
    //
    // Multiple informational rows could in theory exist for the same
    // tenant/period; keep only the latest (highest id) one, same
    // "latest wins" rule used everywhere else on this page.
    const coveredTenantIdsForInformational = new Set<number>([
      ...ebRows.map((r) => r.tenantId),
      ...orphanRows.map((r) => r.tenantId),
    ]);

    const informationalByTenant = new Map<number, any>();
    allEBReadings.forEach((r: any) => {
      if (Number(r.month) !== month || Number(r.year) !== year) return;
      if (!isInformationalReading(r)) return;
      const tid = Number(r.tenantId);
      const existing = informationalByTenant.get(tid);
      if (!existing || Number(r.id ?? 0) > Number(existing.id ?? 0)) {
        informationalByTenant.set(tid, r);
      }
    });

    const informationalRows: RentRow[] = Array.from(informationalByTenant.entries())
      .filter(([tenantId]) => !coveredTenantIdsForInformational.has(Number(tenantId)))
      .map(([tenantIdRaw, r]) => {
        const tenantId = Number(tenantIdRaw);
        const tenant   = tenantMap.get(tenantId);

        // Only DAILY-stay tenants settle through the check-in
        // advance/checkout-reading flow this row represents. A MONTHLY
        // tenant's own checkout writes a room-wide row with no tenantId
        // (see EBReadingsPage.tsx), so it would never reach here anyway —
        // this guard is just defense in case of legacy/odd data.
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
        // only recompute client-side (same proportional-segment math the
        // EB Readings page uses) when both are missing/zero.
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
    // row yet for this month (e.g. damage reported before any EB reading
    // exists) would otherwise never show up on this page at all. Surface
    // them as their own rows so the pending damage is still visible.
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
        // CHANGED: was `room?.rentPerBed ?? 0` — now uses the tenant's own
        // monthlyRent so a damage-only row shows their actual rent too.
        // A daily-stay tenant's "rent" here is their already-paid advance.
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
    rents,
    search,
    tenantNameMap,
    tenantRentMap,
    pendingDamageMap,
    allEBReadings,
    calculateInformationalShare,
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
    let room = getRoomObj(bill.roomNumber);
    if (!room) {
      const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
      if (tenant) room = getRoomById(tenant.roomId);
    }

    if (!room) return toast.error("Room not found for this tenant");

    // NEW: for a daily-stay tenant, Rent was already collected at
    // check-in — only the EB shortfall (if any) should be billed here.
    // rentAmount is left at 0 so the generated record never double-charges
    // the advance the tenant already paid.
    const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
    const isDaily = tenant && isDailyTenant(tenant);
    const rentAmount = isDaily ? 0 : resolveTenantRent(bill.tenantId, room);
    // CHANGED: bill.amount holds the EB figure from getTenantWiseEBBill
    // for ordinary bill-derived daily rows. For a row that instead came
    // from an informational reading (bill.fromInformationalReading), the
    // computed EB share already lives in bill.displayEB / bill.amount —
    // both were set to the same grossAmount when the row was built — so
    // this still resolves correctly without a separate branch.
    const ebAmount = isDaily ? Math.max(0, -(bill.ebBalance ?? 0)) : bill.amount;

    try {
      await generateRent({
        tenantId:   String(bill.tenantId),
        roomId:     String(room.id),
        rentMonth:  month,
        rentYear:   year,
        // CHANGED: was `room.rentPerBed` — now the tenant's own monthlyRent
        // (with room.rentPerBed only as a fallback) so the generated Rent
        // record is billed at the tenant's actual agreed rent, or 0 for a
        // daily-stay tenant whose rent is already covered by their advance.
        rentAmount,
        ebAmount,
      });
      toast.success(`Rent generated for ${bill.tenantName}`);
      reload();
    } catch {
      toast.error("Failed to generate rent");
    }
  };

  const handleGenerateAll = async () => {
    if (!confirm("Generate rent for all tenants?")) return;
    const billsToGenerate = ebBills.filter((bill) => {
      const bAny = bill as any;
      let room = getRoomObj(bill.roomNumber);
      if (!room && bAny.tenantId) {
        const tenant = tenants.find((t) => Number(t.id) === Number(bAny.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }
      return !getRentStatus(bAny.tenantId, bill.roomNumber, room?.id);
    });

    try {
      await Promise.all(
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
            // NEW: skip daily-stay tenants who don't owe an EB shortfall —
            // nothing to generate for them this run. Anyone who does owe
            // is billed for the shortfall only, with rentAmount 0 (see
            // handleGenerate for the reasoning).
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

          await generateRent({
            tenantId:   String(b.tenantId),
            roomId:     String(room.id),
            rentMonth:  month,
            rentYear:   year,
            // CHANGED: was `room.rentPerBed` — see handleGenerate above.
            rentAmount: resolveTenantRent(Number(b.tenantId), room),
            ebAmount:   b.amount ?? 0,
          });
        })
      );

      // NEW: "Generate All" is driven off ebBills (getTenantWiseEBBill),
      // which never includes the informational-reading rows added above.
      // Sweep those in as a second pass so "Generate All" doesn't silently
      // skip a checked-out DAILY tenant who still owes an EB shortfall.
      const coveredTenantIds = new Set(
        billsToGenerate.map((b) => Number((b as any).tenantId))
      );
      const informationalByTenant = new Map<number, any>();
      allEBReadings.forEach((r: any) => {
        if (Number(r.month) !== month || Number(r.year) !== year) return;
        if (!isInformationalReading(r)) return;
        const tid = Number(r.tenantId);
        if (coveredTenantIds.has(tid)) return;
        const existing = informationalByTenant.get(tid);
        if (!existing || Number(r.id ?? 0) > Number(existing.id ?? 0)) {
          informationalByTenant.set(tid, r);
        }
      });

      await Promise.all(
        Array.from(informationalByTenant.entries()).map(async ([tenantIdRaw, r]) => {
          const tenantId = Number(tenantIdRaw);
          const tenant = tenants.find((t) => Number(t.id) === tenantId);
          if (!tenant || !isDailyTenant(tenant)) return;
          // Skip if a Rent record already exists for this tenant/period
          // (covers the case where this run itself, or an earlier one,
          // already generated it).
          const alreadyHasRent = rents.some(
            (rr) =>
              Number(rr.tenantId) === tenantId &&
              Number(rr.rentMonth) === month &&
              Number(rr.rentYear) === year
          );
          if (alreadyHasRent) return;

          const room =
            (r.roomId != null ? getRoomById(r.roomId) : undefined) ??
            getRoomById(tenant.roomId);
          if (!room) return;

          const prevReading = Number(r.previousReading ?? 0);
          const currReading = Number(r.currentReading ?? 0);
          const rate = Number(r.ebRate ?? 0) || 13;
          const flatId = room.flatId ?? null;
          const occupants = flatId != null
            ? tenants.filter((t) => {
                const tRoom = rooms.find((rm) => rm.id === t.roomId);
                return tRoom?.flatId != null && String(tRoom.flatId) === String(flatId);
              })
            : tenants.filter((t) => String(t.roomId) === String(room!.id));

          const storedUnits  = Number(r.unitsConsumed ?? 0);
          const storedAmount = Number(r.ebAmount ?? 0);
          let grossAmount = storedAmount;
          if (!storedUnits && !storedAmount) {
            const computed = calculateInformationalShare(
              tenantId, prevReading, currReading, rate, occupants
            );
            grossAmount = computed.amount;
          }

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

      toast.success("All rents generated");
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
    bill: RentRow
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

  // CHANGED: total page count, used both to bound the "Next" button and
  // to build the numbered page list below.
  const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

  // CHANGED: builds a windowed list of 1-indexed page numbers with "..."
  // collapsing for longer runs — e.g. [1, 2, 3, 4, '...', 53] near the
  // start, or [1, '...', 5, 6, 7, '...', 53] in the middle. Replaces the
  // old control, which only ever rendered the current page number and
  // had no way to jump ahead past page+1.
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

  const overdueCount = rowData.filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0).length;

  const topOverdueTenants = [...rowData]
    .filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 3);

  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rt-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

        .rt-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .rt-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .rt-subtitle { font-size: 13px; color: #64748b; font-weight: 500; }

        .rt-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .rt-layout { flex-direction: row; } .rt-content { flex: 1; min-width: 0; } .rt-sidebar { width: 340px; flex-shrink: 0; } }

        .rt-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .rt-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .rt-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

        .rt-table { width: 100%; border-collapse: collapse; min-width: 1300px; }
        .rt-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .rt-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .rt-table tr:hover { background: #fdfcff; }

        .rt-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
        .rt-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-tenant-phone { font-size: 11px; color: #64748b; margin-top: 2px; }

        .rt-room { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        .rt-branch { font-size: 13px; font-weight: 500; color: #0f172a; }
        .rt-branch-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .rt-value { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rt-value.muted { color: #94a3b8; font-weight: 500; }
        .rt-date { font-size: 13px; font-weight: 500; color: #475569; }

        .rt-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; }
        .rt-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
        .rt-status.paid { color: #16a34a; }
        .rt-status.paid::before { background: #16a34a; }
        .rt-status.pending { color: #f97316; }
        .rt-status.pending::before { background: #f97316; }
        .rt-status.overdue { color: #e11d48; }
        .rt-status.overdue::before { background: #e11d48; }
        .rt-status.not-due { color: #3b82f6; }
        .rt-status.not-due::before { background: #3b82f6; }
        .rt-status.ungenerated { color: #64748b; }
        .rt-status.ungenerated::before { background: #64748b; }

        /* NEW: EB-balance badges for daily-stay tenants */
        .rt-eb-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; display: inline-block; }
        .rt-eb-badge.refund { color: #16a34a; background: #f0fdf4; }
        .rt-eb-badge.due    { color: #e11d48; background: #fef2f2; }
        .rt-eb-badge.even   { color: #64748b; background: #f8fafc; }

        .rt-chart-container { padding: 20px; display: flex; flex-direction: column; align-items: center; position: relative; }

        .rt-sum-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
        .rt-sum-item:last-child { border-bottom: none; }

        /* CHANGED: pagination bar can now hold many numbered buttons
           (1 2 3 4 … 53), so let the row wrap on narrow screens instead
           of overflowing, and give every page button a consistent
           min-width so single- and double-digit pages line up. The
           "..." marker gets its own non-interactive look. */
        .rt-page-row { flex-wrap: wrap; }
        .rt-page-btn {
          width: 32px; height: 32px; min-width: 32px; border-radius: 6px;
          border: 1px solid #e2e8f0; display: flex; align-items: center;
          justify-content: center; color: #64748b; background: #fff;
          font-weight: 500; font-size: 14px; cursor: pointer;
        }
        .rt-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .rt-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rt-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }
        .rt-page-ellipsis { cursor: default; color: #94a3b8; }
      `}</style>

      <div className="rt-wrap">
        <div className="rt-header">
          <div>
            <h1 className="rt-title">Rent Management</h1>
            <p className="rt-subtitle">Home <ChevronRight size={12} className="inline opacity-50" /> Rent</p>
          </div>
        </div>

        <div className="rt-layout">
          <div>
            <div className="rt-panel">
              <div className="rt-panel-header">
                <div className="rt-panel-title">Rent Collection</div>
                <div className="flex gap-2">
                  {hasAccess && (
                    <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
                       ALL Generation
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
                  <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedRoom("all"); }} disabled={!hasAccess || (role !== "ADMIN" && role !== "SUPER_ADMIN")}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[110px]">
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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
                  <Search size={14} className="text-slate-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search tenant or room..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal"
                  />
                </div>

                <button
                  className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a] ml-auto"
                  onClick={() => {
                    setSelectedBranch(role !== "ADMIN" && branchId ? String(branchId) : "all");
                    setSelectedRoom("all");
                    setSearch("");
                    setMonth(new Date().getMonth() + 1);
                    setYear(new Date().getFullYear());
                  }}
                >
                  <RefreshCw size={14} /> Clear Filters
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="rt-table">
                  <thead>
                    <tr>
                      <th>TENANT</th>
                      <th>ROOM</th>
                      <th>BRANCH</th>
                      <th>RENT (₹)</th>
                      <th>EB (₹)</th>
                      <th>DAMAGE (₹)</th>
                      <th>EB BALANCE</th>
                      <th>TOTAL (₹)</th>
                      <th>STATUS</th>
                      <th>PENDING (₹)</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={11} className="text-center py-12 text-slate-400">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
                    ) : (
                      paginatedRows.map((row, i) => {
                        // NEW: daily-stay tenants who haven't had a Rent
                        // record generated yet get their own status —
                        // "EB Due" when they owe the shortfall, otherwise
                        // "Settled" (fully covered or owed a refund).
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
                        const colors = ['bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600', 'bg-amber-100 text-amber-600'];
                        const avatarClass = colors[i % colors.length];

                        const roomObj = getRoomObj(row.roomNumber) || getRoomById(row.rentRecord?.roomId ?? 0);
                        const isAc = roomObj?.hostelType === "AC";

                        return (
                          <tr key={row.tenantId + "-" + row.roomNumber}>
                            <td>
                              <div className="flex items-center">
                                <div className={`rt-avatar ${avatarClass}`}>{initials}</div>
                                <div>
                                  <div className="rt-tenant-name">{row.tenantName}</div>
                                  <div className="rt-tenant-phone">{row.tenantPhone}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="rt-room">{row.roomNumber}</div>
                              <div className={`rt-room-type ${isAc ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {isAc ? 'AC' : 'Non-AC'}
                              </div>
                            </td>
                            <td>
                              <div className="rt-branch">{branchOptions.find(b => String(b.id) === String(row.unitId))?.name || "Main Branch"}</div>
                            </td>

                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.rentPerBed))}</span></td>
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.displayEB))}</span></td>
                            <td>
                              <span className={`rt-value ${row.damageAmount <= 0 ? 'muted' : ''}`}>
                                {row.damageAmount > 0
                                  ? new Intl.NumberFormat('en-IN').format(Math.round(row.damageAmount))
                                  : '—'}
                              </span>
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

              <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
                <div className="text-[13px] text-[#64748b]">
                  Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} records
                </div>
                {/* CHANGED: numbered pagination row (1 2 3 … n) replacing
                    the old control, which only ever showed the current
                    page number and could only ever jump to page+2 via
                    the "next" arrow. Prev/Next stay on either end and
                    disable correctly at the first/last page. */}
                <div className="flex gap-2 rt-page-row">
                  <button
                    className="rt-page-btn"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  >
                    &#8249;
                  </button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="rt-page-btn rt-page-ellipsis">
                        <MoreHorizontal size={14} />
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`rt-page-btn ${p === currentPage + 1 ? "active" : ""}`}
                        onClick={() => setCurrentPage(p - 1)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    className="rt-page-btn"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    &#8250;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentPage;