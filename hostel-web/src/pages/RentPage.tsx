// import { useEffect, useState, useRef, useMemo } from "react";

// import { AgGridReact } from "ag-grid-react";
// import type { ColDef } from "ag-grid-community";

// import {
//   getRooms,
//   getRents,
//   getTenants,
//   getTenantWiseEBBill,
//   generateRent,
//   recordPayment,
//   deleteRent,
//   getUserRole,
//   getBranchId,
//   fetchAllPages,
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

// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { CreditCard, Trash2 } from "lucide-react";

// type EBBillRow = TenantEBBill & {
//   roomNumber: string;
//   flatNumber: string;
// };

// type RentRow = {
//   tenantId: number;
//   tenantName: string;
//   roomNumber: string;
//   flatNumber: string;
//   displayEB: number;
//   rentPerBed: number;
//   total: number;
//   paid: number;
//   pending: number;
//   previousPending: number;
//   currentPending: number;
//   rentRecord: Rent | undefined;
//   unitId: number | undefined;
//   amount: number;
//   paymentStatus?: string;
// };

// const ActionCell = ({ bill, rentRecord, onGenerate, onPayment, onDelete }) => {
//   const [localMode, setLocalMode] = useState<PaymentMode | "">("");
//   const [localAmount, setLocalAmount] = useState("");
//   const [localTxnId, setLocalTxnId] = useState("");

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
//   const isUnpaid =
//     rentRecord && (rentRecord.paymentStatus || "").toUpperCase() !== "PAID";

//   return (
//     <div className="flex flex-wrap gap-2 items-center w-full py-1">
//       {!rentRecord && (
//         <Button size="sm" onClick={() => onGenerate(bill)}>
//           Generate
//         </Button>
//       )}

//       {isUnpaid && (
//         <>
//           <Select
//             value={localMode}
//             onValueChange={(v: PaymentMode) => setLocalMode(v)}
//           >
//             <SelectTrigger className="w-24 h-8 text-xs">
//               <SelectValue placeholder="Mode" />
//             </SelectTrigger>
//             <SelectContent>
//               {PAYMENT_MODES.map((mode) => (
//                 <SelectItem key={mode} value={mode}>
//                   {mode}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <input
//             type="number"
//             placeholder="Amount"
//             value={localAmount}
//             onChange={(e) => setLocalAmount(e.target.value)}
//             onKeyDown={(e) => e.stopPropagation()}
//             className="border rounded px-2 h-8 w-24 text-xs"
//           />

//           {showTxnId && (
//             <input
//               type="text"
//               placeholder="Txn ID"
//               value={localTxnId}
//               onChange={(e) => setLocalTxnId(e.target.value)}
//               onKeyDown={(e) => e.stopPropagation()}
//               className="border rounded px-2 h-8 w-28 text-xs"
//             />
//           )}

//           <Button size="sm" variant="outline" onClick={handlePay}>
//             <CreditCard className="h-3 w-3 mr-1" />
//             Pay
//           </Button>
//         </>
//       )}

//       {rentRecord && (
//         <Button
//           size="sm"
//           variant="destructive"
//           onClick={() => onDelete(rentRecord)}
//         >
//           <Trash2 className="h-3 w-3 mr-1" />
//           Delete
//         </Button>
//       )}
//     </div>
//   );
// };

// const RentPage = () => {
//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId();
//   const hasAccess = true;

//   const [rooms,          setRooms]          = useState<Room[]>([]);
//   const [rents,          setRents]          = useState<Rent[]>([]);
//   const [tenants,        setTenants]        = useState<Tenant[]>([]);
//   // ── FIX: Warden starts pre-filtered to their own branch ──
//   const [selectedBranch, setSelectedBranch] = useState(
//     role !== "ADMIN" && branchId ? String(branchId) : "all"
//   );
//   const [ebBills,        setEbBills]        = useState<EBBillRow[]>([]);
//   const [search,         setSearch]         = useState("");
//   const [month,          setMonth]          = useState(new Date().getMonth() + 1);
//   const [year,           setYear]           = useState(new Date().getFullYear());

//   const loadingRef = useRef(false);

//   /* ── Helpers ── */
//   const normalizeStatus = (status?: string) => (status || "").toUpperCase();

//   const payStatusColor = (status?: string) => {
//     const s = normalizeStatus(status);
//     return s === "PAID"
//       ? "border-green-500 text-green-600"
//       : s === "PARTIAL"
//       ? "border-yellow-500 text-yellow-600"
//       : "border-red-500 text-red-600";
//   };

//   /* ── Tenant name lookup map ── */
//   const tenantNameMap = useMemo(() => {
//     const map = new Map<number, string>();
//     tenants.forEach((t) => map.set(Number(t.id), t.name));
//     return map;
//   }, [tenants]);

//   const resolveTenantName = (tenantId: number): string =>
//     tenantNameMap.get(tenantId) ?? `Tenant ${tenantId}`;

//   /* ── Scoped rents for summary totals ── */
//   const scopedRents = useMemo(() => {
//     const seen = new Map<string, Rent>();
//     rents.forEach((r) => {
//       const matchMonthYear =
//         Number(r.rentMonth) === month && Number(r.rentYear) === year;
//       if (!matchMonthYear) return;
//       if (role !== "ADMIN") {
//         const room = rooms.find((rm) => String(rm.id) === String(r.roomId));
//         if (!room || String(room.unitId) !== String(branchId)) return;
//       }
//       const key = `${r.tenantId}-${r.roomId}-${r.rentMonth}-${r.rentYear}`;
//       const existing = seen.get(key);
//       if (!existing) {
//         seen.set(key, r);
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
//           seen.set(key, r);
//         }
//       }
//     });
//     return Array.from(seen.values());
//   }, [rents, rooms, month, year, role, branchId]);

//   /* ── Load ── */
//   const reload = async () => {
//     if (loadingRef.current) return;
//     loadingRef.current = true;
//     try {
//       const [roomList, rentList, tenantList] = await Promise.all([
//         fetchAllPages<Room>(getRooms),
//         fetchAllPages<Rent>(getRents),
//         fetchAllPages<Tenant>(getTenants),
//       ]);

//       // ── FIX: Warden only sees their branch rooms ──
//       const filteredRooms =
//         role === "ADMIN"
//           ? roomList
//           : roomList.filter(
//               (room) => String(room.unitId) === String(branchId)
//             );

//       setRooms(filteredRooms);
//       setRents(rentList);
//       setTenants(tenantList);
//       await loadAllRoomsEB(filteredRooms);
//     } catch {
//       toast.error("Failed to load data");
//     } finally {
//       loadingRef.current = false;
//     }
//   };

//   useEffect(() => {
//     reload();
//   }, []);

//   /* ── EB ── */
//   const loadAllRoomsEB = async (roomData: Room[]) => {
//     try {
//       if (!Array.isArray(roomData) || roomData.length === 0) {
//         setEbBills([]);
//         return;
//       }

//       const flatIds = [
//         ...new Set(
//           roomData.map((r) => r.flatId).filter((id): id is number => !!id)
//         ),
//       ];
//       const standaloneRooms = roomData.filter((r) => !r.flatId);

//       const flatBillResults = await Promise.all(
//         flatIds.map(async (flatId) => {
//           try {
//             const bills = await getTenantWiseEBBill({ flatId, roomId: null });
//             return (bills || []).map(
//               (b): EBBillRow => ({
//                 ...b,
//                 roomNumber: b.roomNumber ?? "",
//                 flatNumber: b.flatNumber ?? "",
//               })
//             );
//           } catch {
//             return [] as EBBillRow[];
//           }
//         })
//       );

//       const roomBillResults = await Promise.all(
//         standaloneRooms.map(async (room) => {
//           try {
//             const bills = await getTenantWiseEBBill({
//               roomId: room.id,
//               flatId: null,
//             });
//             return (bills || []).map(
//               (b): EBBillRow => ({
//                 ...b,
//                 roomNumber: room.roomNumber,
//                 flatNumber: b.flatNumber ?? (room as any).flatNumber ?? "",
//               })
//             );
//           } catch {
//             return [] as EBBillRow[];
//           }
//         })
//       );

//       setEbBills([...flatBillResults.flat(), ...roomBillResults.flat()]);
//     } catch {
//       toast.error("Failed to load EB data");
//       setEbBills([]);
//     }
//   };

//   /* ── Lookups ── */
//   const getRoomObj = (roomNumber: string) =>
//     rooms.find((r) => r.roomNumber === roomNumber);

//   const getRoomById = (roomId: string | number) =>
//     rooms.find((r) => String(r.id) === String(roomId));

//   const getRentStatus = (
//     tenantId: number,
//     roomNumber: string
//   ): Rent | undefined => {
//     const room = getRoomObj(roomNumber);
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

//   /* ── Previous pending helper ── */
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
//       const key = `${r.roomId}-${r.rentYear}-${r.rentMonth}`;
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

//   /* ── Filtered bills ──
//      FIX: For wardens, exclude EB bills whose room does not belong to their branch.
//      This prevents cross-branch EB entries leaking into the table even when
//      loadAllRoomsEB is called with already-filtered rooms (flat-level API calls
//      can still return rooms from other branches inside the same flat group).
//   ── */
//   const filteredBills = ebBills.filter((bill) => {
//     // Branch guard for non-admin roles
//     if (role !== "ADMIN" && branchId) {
//       const room = getRoomObj(bill.roomNumber);
//       if (!room || String(room.unitId) !== String(branchId)) return false;
//     }
//     return `${bill.tenantName} ${bill.roomNumber} ${bill.flatNumber}`
//       .toLowerCase()
//       .includes(search.toLowerCase());
//   });

//   /* ── Row data ── */
//   const rowData = useMemo((): RentRow[] => {
//     // Part 1: rows from EB bills
//     const ebRows: RentRow[] = filteredBills.map((bill) => {
//       const room        = getRoomObj(bill.roomNumber);
//       const rentPerBed  = room?.rentPerBed ?? 0;
//       const rentRecord  = getRentStatus(bill.tenantId, bill.roomNumber);

//       const recordTotal = rentRecord ? Number(rentRecord.totalAmount || 0) : 0;
//       const recordRent  = rentRecord ? Number(rentRecord.rentAmount  || 0) : rentPerBed;
//       const recordEB    = rentRecord ? Number(rentRecord.ebAmount    || 0) : bill.amount;

//       const displayEB    = rentRecord ? recordEB    : bill.amount;
//       const displayRent  = rentRecord ? recordRent  : rentPerBed;
//       const displayTotal = rentRecord ? recordTotal : rentPerBed + bill.amount;

//       const currentPaid   = Number(rentRecord?.paidAmount || 0);
//       const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

//       const currentPending = rentRecord
//         ? currentStatus === "PAID"
//           ? 0
//           : currentStatus === "PARTIAL"
//           ? recordTotal - currentPaid
//           : recordTotal
//         : rentPerBed + bill.amount;

//       const { previousPending } = computePreviousPending(
//         bill.tenantId,
//         month,
//         year,
//         rents
//       );

//       return {
//         ...bill,
//         flatNumber:      bill.flatNumber,
//         rentPerBed:      displayRent,
//         displayEB,
//         total:           displayTotal,
//         paid:            currentPaid,
//         previousPending,
//         currentPending,
//         pending:         previousPending + currentPending,
//         rentRecord,
//         unitId:          room?.unitId,
//         amount:          bill.amount,
//       };
//     });

//     // Part 2: orphan rent rows (have a rent record but no EB bill)
//     const ebTenantRoomKeys = new Set(
//       filteredBills.map((b) => {
//         const room = getRoomObj(b.roomNumber);
//         return `${b.tenantId}-${room?.id ?? b.roomNumber}`;
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
//         // Already covered by an EB bill row
//         const key = `${r.tenantId}-${r.roomId}`;
//         if (ebTenantRoomKeys.has(key)) return false;

//         // ── FIX: Warden branch guard for orphan rows ──
//         // rents[] contains ALL rents from the API (not pre-filtered by branch),
//         // so we must check the room's unitId before including the orphan row.
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
//         const recordTotal = Number(r.totalAmount || 0);
//         const recordRent  = Number(r.rentAmount  || 0);
//         const recordEB    = Number(r.ebAmount    || 0);
//         const currentPaid = Number(r.paidAmount  || 0);
//         const status      = normalizeStatus(r.paymentStatus);

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
//           roomNumber:      room?.roomNumber ?? String(r.roomId),
//           flatNumber:      (room as any)?.flatNumber ?? "-",
//           displayEB:       recordEB,
//           rentPerBed:      recordRent,
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

//     // Merge
//     let allRows = [...ebRows, ...orphanRows];

//     // Admin can additionally filter by branch dropdown; for warden this is
//     // already enforced above but we keep the dropdown filter so admin UX works.
//     if (selectedBranch !== "all") {
//       allRows = allRows.filter((r) => String(r.unitId) === selectedBranch);
//     }

//     return allRows;
//   }, [filteredBills, rooms, selectedBranch, month, year, rents, search, tenantNameMap]);

//   /* ── Branch options ── */
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

//   /* ── Handlers ── */
//   const handleGenerate = async (bill: RentRow) => {
//     const room = getRoomObj(bill.roomNumber);
//     if (!room) return;
//     try {
//       await generateRent({
//         tenantId:   String(bill.tenantId),
//         roomId:     String(room.id),
//         rentMonth:  month,
//         rentYear:   year,
//         rentAmount: room.rentPerBed,
//         ebAmount:   bill.amount,
//       });
//       toast.success(`Rent generated for ${bill.tenantName}`);
//       reload();
//     } catch {
//       toast.error("Failed to generate rent");
//     }
//   };

//   const handleGenerateAll = async () => {
//     if (!confirm("Generate rent for all tenants?")) return;
//     const billsToGenerate = ebBills.filter(
//       (bill) => !getRentStatus(bill.tenantId, bill.roomNumber)
//     );
//     try {
//       await Promise.all(
//         billsToGenerate.map(async (bill) => {
//           const room = getRoomObj(bill.roomNumber);
//           if (!room) return;
//           await generateRent({
//             tenantId:   String(bill.tenantId),
//             roomId:     String(room.id),
//             rentMonth:  month,
//             rentYear:   year,
//             rentAmount: room.rentPerBed,
//             ebAmount:   bill.amount,
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

//   const handleDelete = async (rent: Rent) => {
//     if (!confirm("Delete this rent record?")) return;
//     try {
//       await deleteRent(String(rent.id));
//       toast.success("Rent deleted");
//       reload();
//     } catch {
//       toast.error("Delete failed");
//     }
//   };

//   /* ── Column defs ── */
//   const columnDefs = useMemo<ColDef[]>(
//     () => [
//       {
//         headerName: "Flat",
//         field: "flatNumber",
//         filter: true,
//         flex: 1,
//         minWidth: 100,
//         valueFormatter: (p) => p.value || "-",
//       },
//       {
//         headerName: "Room No",
//         field: "roomNumber",
//         filter: true,
//         flex: 1,
//         minWidth: 100,
//       },
//       {
//         headerName: "Tenant",
//         field: "tenantName",
//         filter: true,
//         flex: 2,
//         minWidth: 140,
//       },
//       {
//         headerName: "EB",
//         field: "displayEB",
//         filter: true,
//         flex: 1,
//         minWidth: 90,
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Rent",
//         field: "rentPerBed",
//         filter: true,
//         flex: 1,
//         minWidth: 90,
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Total",
//         field: "total",
//         flex: 1,
//         minWidth: 100,
//         cellStyle: { fontWeight: "600" },
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Pending",
//         field: "pending",
//         flex: 1,
//         minWidth: 100,
//         cellStyle: { fontWeight: "600", color: "red" },
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Status",
//         field: "paymentStatus",
//         filter: true,
//         width: 140,
//         minWidth: 140,
//         maxWidth: 140,
//         suppressSizeToFit: true,
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           overflow: "visible",
//         },
//         cellRenderer: (params: any) => {
//           const status =
//             params.data.rentRecord?.paymentStatus || "UNGENERATED";
//           return (
//             <Badge
//               variant="outline"
//               className={`text-xs whitespace-nowrap ${payStatusColor(status)}`}
//             >
//               {status}
//             </Badge>
//           );
//         },
//       },
//       ...(hasAccess
//         ? [
//             {
//               headerName: "Actions",
//               sortable: false,
//               filter: false,
//               resizable: false,
//               flex: 4,
//               minWidth: 540,
//               cellStyle: { overflow: "visible", padding: "4px 8px" },
//               cellRenderer: (params: any) => (
//                 <ActionCell
//                   bill={params.data}
//                   rentRecord={params.data.rentRecord}
//                   onGenerate={handleGenerate}
//                   onPayment={handlePayment}
//                   onDelete={handleDelete}
//                 />
//               ),
//             },
//           ]
//         : []),
//     ],
//     [rents, rooms]
//   );

//   /* ── Summary totals ── */
//   let totalCollected = 0;
//   let totalPending   = 0;

//   scopedRents.forEach((r) => {
//     const total  = Number(r.totalAmount) || 0;
//     const paid   = Number(r.paidAmount)  || 0;
//     const status = normalizeStatus(r.paymentStatus);

//     if (status === "PAID") {
//       totalCollected += total;
//     } else if (status === "PARTIAL") {
//       totalCollected += paid;
//       totalPending   += total - paid;
//     } else {
//       totalPending += total;
//     }
//   });

//   const totalAmount        = totalCollected + totalPending;
//   const collectionPercent  =
//     totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;

//   /* ── UI ── */
//   return (
//     <div className="space-y-6">
//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold">Rent & EB Management</h1>
//           <p className="text-sm text-muted-foreground">
//             {MONTHS[month - 1]} {year}
//           </p>
//         </div>

//         <div className="flex gap-6 text-sm">
//           <div className="text-green-600 font-semibold">
//             <p>Collected</p>
//             <p className="text-lg">
//               ₹{Math.round(totalCollected).toLocaleString()}
//             </p>
//           </div>
//           <div className="text-red-600 font-semibold">
//             <p>Pending</p>
//             <p className="text-lg">
//               ₹{Math.round(totalPending).toLocaleString()}
//             </p>
//           </div>
//           <div className="text-blue-600 font-semibold">
//             <p>Collection</p>
//             <p className="text-lg">{collectionPercent}%</p>
//           </div>
//         </div>
//       </div>

//       {/* FILTERS */}
//       <div className="flex gap-4 flex-wrap">
//         <Select
//           value={String(month)}
//           onValueChange={(v) => setMonth(Number(v))}
//         >
//           <SelectTrigger className="w-36">
//             <SelectValue />
//           </SelectTrigger>
//           <SelectContent>
//             {MONTHS.map((m, i) => (
//               <SelectItem key={i} value={String(i + 1)}>
//                 {m}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select
//           value={String(year)}
//           onValueChange={(v) => setYear(Number(v))}
//         >
//           <SelectTrigger className="w-28">
//             <SelectValue />
//           </SelectTrigger>
//           <SelectContent>
//             {[2024, 2025, 2026, 2027].map((y) => (
//               <SelectItem key={y} value={String(y)}>
//                 {y}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         {/* Branch dropdown: Admin sees all branches + "All Branches".
//             Warden sees only their branch (pre-selected, not changeable). */}
//         {role === "ADMIN" ? (
//           <Select value={selectedBranch} onValueChange={setSelectedBranch}>
//             <SelectTrigger className="w-44">
//               <SelectValue placeholder="All Branches" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Branches</SelectItem>
//               {branchOptions.map((b) => (
//                 <SelectItem key={b.id} value={String(b.id)}>
//                   {b.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         ) : (
//           // Warden: show their branch name as a read-only badge (no dropdown)
//           <div className="flex items-center px-3 h-10 rounded-md border bg-muted text-sm font-medium text-muted-foreground w-44">
//             {branchOptions.find((b) => String(b.id) === String(branchId))?.name
//               ?? `Branch ${branchId}`}
//           </div>
//         )}

//         {hasAccess && (
//           <Button size="sm" onClick={handleGenerateAll}>
//             Generate All
//           </Button>
//         )}
//       </div>

//       {/* SEARCH */}
//       <input
//         type="text"
//         placeholder="Search tenant..."
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         className="border rounded-md px-3 py-2 text-sm w-64"
//       />

//       {/* ROW COUNT */}
//       <p className="text-xs text-muted-foreground">
//         Showing {rowData.length} tenant(s) for {MONTHS[month - 1]} {year}
//       </p>

//       {/* TABLE */}
//       <div className="ag-theme-alpine" style={{ height: 560 }}>
//         <AgGridReact
//           rowData={rowData}
//           columnDefs={columnDefs}
//           rowHeight={52}
//           pagination={true}
//           paginationPageSize={10}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//           domLayout="normal"
//           animateRows={true}
//           suppressHorizontalScroll={false}
//         />
//       </div>
//     </div>
//   );
// };

// export default RentPage;




































// import { useEffect, useState, useRef, useMemo } from "react";

// import { AgGridReact } from "ag-grid-react";
// import type { ColDef } from "ag-grid-community";

// import {
//   getRooms,
//   getRents,
//   getTenants,
//   getTenantWiseEBBill,
//   generateRent,
//   recordPayment,
//   deleteRent,
//   getUserRole,
//   getBranchId,
//   fetchAllPages,
// } from "@/lib/store";

// import {
//   Room,
//   Bed,
//   Rent,
//   Tenant,
//   TenantEBBill,
//   MONTHS,
//   PAYMENT_MODES,
//   PaymentMode,
// } from "@/lib/types";

// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { CreditCard, Trash2 } from "lucide-react";

// // ─────────────────────────────────────────────────────────────────────────────
// //  Types
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * EBBillRow explicitly adds `month` and `year` as numbers so the filter
//  * comparisons are type-safe regardless of how the backend names them on
//  * TenantEBBill (which may use rentMonth/rentYear, billMonth/billYear, etc.).
//  */
// type EBBillRow = TenantEBBill & {
//   roomNumber: string;
//   flatNumber: string;
//   /** Calendar month (1-12) extracted from the underlying bill record */
//   month: number;
//   /** Calendar year (e.g. 2025) extracted from the underlying bill record */
//   year: number;
// };

// type RentRow = {
//   tenantId: number;
//   tenantName: string;
//   roomNumber: string;
//   flatNumber: string;
//   displayEB: number;
//   rentPerBed: number;
//   total: number;
//   paid: number;
//   pending: number;
//   previousPending: number;
//   currentPending: number;
//   rentRecord: Rent | undefined;
//   unitId: number | undefined;
//   amount: number;
//   paymentStatus?: string;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// //  Helper: extract month & year from a raw TenantEBBill regardless of field name
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * TenantEBBill from the API can use several field names depending on backend version:
//  *   month / year
//  *   billMonth / billYear
//  *   rentMonth / rentYear
//  *
//  * This function reads whichever pair is present and returns safe numbers.
//  * Returns { month: 0, year: 0 } if nothing is found (will be filtered out).
//  */
// function extractMonthYear(bill: TenantEBBill): { month: number; year: number } {
//   // Cast to any so TS doesn't complain about unknown property access
//   const b = bill as any;

//   const month =
//     Number(b.month ?? b.billMonth ?? b.rentMonth ?? 0);
//   const year =
//     Number(b.year ?? b.billYear ?? b.rentYear ?? 0);

//   return { month, year };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// //  ActionCell
// // ─────────────────────────────────────────────────────────────────────────────
// const ActionCell = ({ bill, rentRecord, onGenerate, onPayment, onDelete }: {
//   bill: RentRow;
//   rentRecord: Rent | undefined;
//   onGenerate: (bill: RentRow) => void;
//   onPayment: (rent: Rent, mode: PaymentMode, amount: number, txnId: string, bill: RentRow) => void;
//   onDelete: (rent: Rent) => void;
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

//   return (
//     <div className="flex flex-wrap gap-2 items-center w-full py-1">
//       {!rentRecord && (
//         <Button size="sm" onClick={() => onGenerate(bill)}>
//           Generate
//         </Button>
//       )}

//       {isUnpaid && (
//         <>
//           <Select
//             value={localMode}
//             onValueChange={(v: PaymentMode) => setLocalMode(v)}
//           >
//             <SelectTrigger className="w-24 h-8 text-xs">
//               <SelectValue placeholder="Mode" />
//             </SelectTrigger>
//             <SelectContent>
//               {PAYMENT_MODES.map((mode) => (
//                 <SelectItem key={mode} value={mode}>
//                   {mode}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <input
//             type="number"
//             placeholder="Amount"
//             value={localAmount}
//             onChange={(e) => setLocalAmount(e.target.value)}
//             onKeyDown={(e) => e.stopPropagation()}
//             className="border rounded px-2 h-8 w-24 text-xs"
//           />

//           {showTxnId && (
//             <input
//               type="text"
//               placeholder="Txn ID"
//               value={localTxnId}
//               onChange={(e) => setLocalTxnId(e.target.value)}
//               onKeyDown={(e) => e.stopPropagation()}
//               className="border rounded px-2 h-8 w-28 text-xs"
//             />
//           )}

//           <Button size="sm" variant="outline" onClick={handlePay}>
//             <CreditCard className="h-3 w-3 mr-1" />
//             Pay
//           </Button>
//         </>
//       )}

//       {rentRecord && (
//         <Button
//           size="sm"
//           variant="destructive"
//           onClick={() => onDelete(rentRecord)}
//         >
//           <Trash2 className="h-3 w-3 mr-1" />
//           Delete
//         </Button>
//       )}
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// //  RentPage
// // ─────────────────────────────────────────────────────────────────────────────
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

//   // ebBills keyed by "month-year" so switching months loads fresh data
//   const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

//   const [search, setSearch] = useState("");
//   const [month,  setMonth]  = useState(new Date().getMonth() + 1);
//   const [year,   setYear]   = useState(new Date().getFullYear());

//   // Track which month-year keys have already been fetched
//   const fetchedEBKeys = useRef<Set<string>>(new Set());
//   const loadingRef    = useRef(false);

//   /* ── helpers ── */
//   const normalizeStatus = (status?: string) => (status || "").toUpperCase();

//   const currentYear = new Date().getFullYear();

//   const yearOptions = Array.from(
//     { length: 11 },
//     (_, index) => currentYear - 5 + index
//   );

//   const payStatusColor = (status?: string) => {
//     const s = normalizeStatus(status);
//     return s === "PAID"
//       ? "border-green-500 text-green-600"
//       : s === "PARTIAL"
//       ? "border-yellow-500 text-yellow-600"
//       : "border-red-500 text-red-600";
//   };

//   /* ── EB bills for current month ── */
//   const ebBills: EBBillRow[] = useMemo(() => {
//     const key = `${month}-${year}`;
//     return ebBillsMap.get(key) ?? [];
//   }, [ebBillsMap, month, year]);

//   /* ── tenant name map ── */
//   const tenantNameMap = useMemo(() => {
//     const map = new Map<number, string>();
//     tenants.forEach((t) => map.set(Number(t.id), t.name));
//     return map;
//   }, [tenants]);

//   const resolveTenantName = (tenantId: number): string =>
//     tenantNameMap.get(tenantId) ?? `Tenant ${tenantId}`;

//   /* ── scoped rents for summary ── */
//   const scopedRents = useMemo(() => {
//     const seen = new Map<string, Rent>();
//     rents.forEach((r) => {
//       const matchMonthYear =
//         Number(r.rentMonth) === month && Number(r.rentYear) === year;
//       if (!matchMonthYear) return;
//       if (role !== "ADMIN") {
//         const room = rooms.find((rm) => String(rm.id) === String(r.roomId));
//         if (!room || String(room.unitId) !== String(branchId)) return;
//       }
//       const key      = `${r.tenantId}-${r.roomId}-${r.rentMonth}-${r.rentYear}`;
//       const existing = seen.get(key);
//       if (!existing) {
//         seen.set(key, r);
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
//           seen.set(key, r);
//         }
//       }
//     });
//     return Array.from(seen.values());
//   }, [rents, rooms, month, year, role, branchId]);

//   /* ── initial load: rooms + rents + tenants ── */
//   const reload = async () => {
//     if (loadingRef.current) return;
//     loadingRef.current = true;
//     try {
//       const [roomList, rentList, tenantList] = await Promise.all([
//         fetchAllPages<Room>(getRooms),
//         fetchAllPages<Rent>(getRents),
//         fetchAllPages<Tenant>(getTenants),
//       ]);

//       const filteredRooms =
//         role === "ADMIN"
//           ? roomList
//           : roomList.filter((room) => String(room.unitId) === String(branchId));

//       setRooms(filteredRooms);
//       setRents(rentList);
//       setTenants(tenantList);

//       // Clear EB cache so fresh data is fetched for the current month
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

//   /* ── load EB bills only for the selected month/year, cached per key ── */
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

//         /**
//          * Shared filter: use extractMonthYear() so we never directly access
//          * b.month / b.year on the raw TenantEBBill type (which may not have
//          * those fields typed), avoiding the TS error.
//          */
//         const matchesMonthYear = (b: TenantEBBill) => {
//           const { month: bMonth, year: bYear } = extractMonthYear(b);
//           return bMonth === month && bYear === year;
//         };

//         const flatBillResults = await Promise.all(
//           flatIds.map(async (flatId) => {
//             try {
//               const bills = await getTenantWiseEBBill({ flatId, roomId: null });
//               return (bills || [])
//                 .filter(matchesMonthYear)
//                 .map((b): EBBillRow => {
//                   const { month: bMonth, year: bYear } = extractMonthYear(b);
//                   return {
//                     ...b,
//                     roomNumber: (b as any).roomNumber ?? "",
//                     flatNumber: (b as any).flatNumber ?? "",
//                     month: bMonth,
//                     year:  bYear,
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
//               const bills = await getTenantWiseEBBill({
//                 roomId: room.id,
//                 flatId: null,
//               });
//               return (bills || [])
//                 .filter(matchesMonthYear)
//                 .map((b): EBBillRow => {
//                   const { month: bMonth, year: bYear } = extractMonthYear(b);
//                   return {
//                     ...b,
//                     roomNumber: room.roomNumber,
//                     flatNumber: (b as any).flatNumber ?? (room as any).flatNumber ?? "",
//                     month: bMonth,
//                     year:  bYear,
//                   };
//                 });
//             } catch {
//               return [] as EBBillRow[];
//             }
//           })
//         );

//         const bills = [...flatBillResults.flat(), ...roomBillResults.flat()];

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
//   }, [rooms, month, year]);

//   /* ── lookups ── */
//   const getRoomObj = (roomNumber: string) =>
//     rooms.find((r) => r.roomNumber === roomNumber);

//   const getRoomById = (roomId: string | number) =>
//     rooms.find((r) => String(r.id) === String(roomId));

//   const getRentStatus = (
//     tenantId: number,
//     roomNumber: string
//   ): Rent | undefined => {
//     const room = getRoomObj(roomNumber);
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

//   /* ── previous pending helper ── */
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

//   /* ── filtered bills (branch guard) ── */
//   const filteredBills = ebBills.filter((bill) => {
//     if (role !== "ADMIN" && branchId) {
//       const room = getRoomObj(bill.roomNumber);
//       if (!room || String(room.unitId) !== String(branchId)) return false;
//     }
//     return `${(bill as any).tenantName ?? ""} ${bill.roomNumber} ${bill.flatNumber}`
//       .toLowerCase()
//       .includes(search.toLowerCase());
//   });

//   /* ── row data ── */
//   const rowData = useMemo((): RentRow[] => {
//     // Part 1: rows from EB bills for the selected month
//     const ebRows: RentRow[] = filteredBills.map((bill) => {
//       const b          = bill as any;
//       const room       = getRoomObj(bill.roomNumber);
//       const rentPerBed = room?.rentPerBed ?? 0;
//       const rentRecord = getRentStatus(b.tenantId, bill.roomNumber);

//       const recordTotal = rentRecord ? Number(rentRecord.totalAmount || 0) : 0;
//       const recordRent  = rentRecord ? Number(rentRecord.rentAmount  || 0) : rentPerBed;
//       const recordEB    = rentRecord ? Number(rentRecord.ebAmount    || 0) : b.amount ?? 0;

//       const displayEB    = rentRecord ? recordEB   : (b.amount ?? 0);
//       const displayRent  = rentRecord ? recordRent : rentPerBed;
//       const displayTotal = rentRecord ? recordTotal : rentPerBed + (b.amount ?? 0);

//       const currentPaid   = Number(rentRecord?.paidAmount || 0);
//       const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

//       const currentPending = rentRecord
//         ? currentStatus === "PAID"
//           ? 0
//           : currentStatus === "PARTIAL"
//           ? recordTotal - currentPaid
//           : recordTotal
//         : rentPerBed + (b.amount ?? 0);

//       const { previousPending } = rentRecord
//         ? computePreviousPending(b.tenantId, month, year, rents)
//         : { previousPending: 0 };

//       return {
//         tenantId:        b.tenantId,
//         tenantName:      b.tenantName ?? resolveTenantName(Number(b.tenantId)),
//         roomNumber:      bill.roomNumber,
//         flatNumber:      bill.flatNumber,
//         rentPerBed:      displayRent,
//         displayEB,
//         total:           displayTotal,
//         paid:            currentPaid,
//         previousPending,
//         currentPending,
//         pending:         rentRecord
//           ? previousPending + currentPending
//           : currentPending,
//         rentRecord,
//         unitId:          room?.unitId,
//         amount:          b.amount ?? 0,
//         paymentStatus:   rentRecord?.paymentStatus,
//       };
//     });

//     // Part 2: orphan rent rows (have a rent record but no EB bill this month)
//     const ebTenantRoomKeys = new Set(
//       filteredBills.map((b) => {
//         const room = getRoomObj(b.roomNumber);
//         return `${(b as any).tenantId}-${room?.id ?? b.roomNumber}`;
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
//         const recordTotal = Number(r.totalAmount || 0);
//         const recordRent  = Number(r.rentAmount  || 0);
//         const recordEB    = Number(r.ebAmount    || 0);
//         const currentPaid = Number(r.paidAmount  || 0);
//         const status      = normalizeStatus(r.paymentStatus);

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
//           roomNumber:      room?.roomNumber ?? String(r.roomId),
//           flatNumber:      (room as any)?.flatNumber ?? "-",
//           displayEB:       recordEB,
//           rentPerBed:      recordRent,
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

//     let allRows = [...ebRows, ...orphanRows];

//     if (selectedBranch !== "all") {
//       allRows = allRows.filter((r) => String(r.unitId) === selectedBranch);
//     }

//     return allRows;
//   }, [filteredBills, rooms, selectedBranch, month, year, rents, search, tenantNameMap]);

//   /* ── branch options ── */
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

//   /* ── handlers ── */
//   const handleGenerate = async (bill: RentRow) => {
//     const room = getRoomObj(bill.roomNumber);
//     if (!room) return;
//     try {
//       await generateRent({
//         tenantId:   String(bill.tenantId),
//         roomId:     String(room.id),
//         rentMonth:  month,
//         rentYear:   year,
//         rentAmount: room.rentPerBed,
//         ebAmount:   bill.amount,
//       });
//       toast.success(`Rent generated for ${bill.tenantName}`);
//       reload();
//     } catch {
//       toast.error("Failed to generate rent");
//     }
//   };

//   const handleGenerateAll = async () => {
//     if (!confirm("Generate rent for all tenants?")) return;
//     const billsToGenerate = ebBills.filter(
//       (bill) => !getRentStatus((bill as any).tenantId, bill.roomNumber)
//     );
//     try {
//       await Promise.all(
//         billsToGenerate.map(async (bill) => {
//           const b    = bill as any;
//           const room = getRoomObj(bill.roomNumber);
//           if (!room) return;
//           await generateRent({
//             tenantId:   String(b.tenantId),
//             roomId:     String(room.id),
//             rentMonth:  month,
//             rentYear:   year,
//             rentAmount: room.rentPerBed,
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

//   const handleDelete = async (rent: Rent) => {
//     if (!confirm("Delete this rent record?")) return;
//     try {
//       await deleteRent(String(rent.id));
//       toast.success("Rent deleted");
//       reload();
//     } catch {
//       toast.error("Delete failed");
//     }
//   };

//   /* ── column defs ── */
//   const columnDefs = useMemo<ColDef[]>(
//     () => [
//       {
//         headerName: "Flat",
//         field: "flatNumber",
//         filter: true,
//         flex: 1,
//         minWidth: 100,
//         valueFormatter: (p) => p.value || "-",
//       },
//       {
//         headerName: "Room No",
//         field: "roomNumber",
//         filter: true,
//         flex: 1,
//         minWidth: 100,
//       },
//       {
//         headerName: "Tenant",
//         field: "tenantName",
//         filter: true,
//         flex: 2,
//         minWidth: 140,
//       },
//       {
//         headerName: "EB",
//         field: "displayEB",
//         filter: true,
//         flex: 1,
//         minWidth: 90,
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Rent",
//         field: "rentPerBed",
//         filter: true,
//         flex: 1,
//         minWidth: 90,
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Total",
//         field: "total",
//         flex: 1,
//         minWidth: 100,
//         cellStyle: { fontWeight: "600" },
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Pending",
//         field: "pending",
//         flex: 1,
//         minWidth: 100,
//         cellStyle: { fontWeight: "600", color: "red" },
//         valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
//       },
//       {
//         headerName: "Status",
//         field: "paymentStatus",
//         filter: true,
//         width: 140,
//         minWidth: 140,
//         maxWidth: 140,
//         suppressSizeToFit: true,
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           overflow: "visible",
//         },
//         cellRenderer: (params: any) => {
//           const status =
//             params.data.rentRecord?.paymentStatus || "UNGENERATED";
//           return (
//             <Badge
//               variant="outline"
//               className={`text-xs whitespace-nowrap ${payStatusColor(status)}`}
//             >
//               {status}
//             </Badge>
//           );
//         },
//       },
//       ...(hasAccess
//         ? [
//             {
//               headerName: "Actions",
//               sortable: false,
//               filter: false,
//               resizable: false,
//               flex: 4,
//               minWidth: 540,
//               cellStyle: { overflow: "visible", padding: "4px 8px" },
//               cellRenderer: (params: any) => (
//                 <ActionCell
//                   bill={params.data}
//                   rentRecord={params.data.rentRecord}
//                   onGenerate={handleGenerate}
//                   onPayment={handlePayment}
//                   onDelete={handleDelete}
//                 />
//               ),
//             },
//           ]
//         : []),
//     ],
//     [rents, rooms]
//   );

//   /* ── summary totals ── */
//   let totalCollected = 0;
//   let totalPending   = 0;

//   scopedRents.forEach((r) => {
//     const total  = Number(r.totalAmount) || 0;
//     const paid   = Number(r.paidAmount)  || 0;
//     const status = normalizeStatus(r.paymentStatus);

//     if (status === "PAID") {
//       totalCollected += total;
//     } else if (status === "PARTIAL") {
//       totalCollected += paid;
//       totalPending   += total - paid;
//     } else {
//       totalPending += total;
//     }
//   });

//   const totalAmount       = totalCollected + totalPending;
//   const collectionPercent =
//     totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;

//   /* ── UI ── */
//   return (
//     <div className="space-y-6">
//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold">Rent & EB Management</h1>
//           <p className="text-sm text-muted-foreground">
//             {MONTHS[month - 1]} {year}
//           </p>
//         </div>

//         <div className="flex gap-6 text-sm">
//           <div className="text-green-600 font-semibold">
//             <p>Collected</p>
//             <p className="text-lg">₹{Math.round(totalCollected).toLocaleString()}</p>
//           </div>
//           <div className="text-red-600 font-semibold">
//             <p>Pending</p>
//             <p className="text-lg">₹{Math.round(totalPending).toLocaleString()}</p>
//           </div>
//           <div className="text-blue-600 font-semibold">
//             <p>Collection</p>
//             <p className="text-lg">{collectionPercent}%</p>
//           </div>
//         </div>
//       </div>

//       {/* FILTERS */}
//       <div className="flex gap-4 flex-wrap">
//         <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
//           <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
//           <SelectContent>
//             {MONTHS.map((m, i) => (
//               <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
//           <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
//           <SelectContent>
//             {yearOptions.map((y) => (
//               <SelectItem key={y} value={String(y)}>
//                 {y}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         {role === "ADMIN" ? (
//           <Select value={selectedBranch} onValueChange={setSelectedBranch}>
//             <SelectTrigger className="w-44">
//               <SelectValue placeholder="All Branches" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Branches</SelectItem>
//               {branchOptions.map((b) => (
//                 <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         ) : (
//           <div className="flex items-center px-3 h-10 rounded-md border bg-muted text-sm font-medium text-muted-foreground w-44">
//             {branchOptions.find((b) => String(b.id) === String(branchId))?.name
//               ?? `Branch ${branchId}`}
//           </div>
//         )}

//         {hasAccess && (
//           <Button size="sm" onClick={handleGenerateAll}>
//             Generate All
//           </Button>
//         )}
//       </div>

//       {/* SEARCH */}
//       <input
//         type="text"
//         placeholder="Search tenant..."
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         className="border rounded-md px-3 py-2 text-sm w-64"
//       />

//       {/* ROW COUNT */}
//       <p className="text-xs text-muted-foreground">
//         Showing {rowData.length} tenant(s) for {MONTHS[month - 1]} {year}
//         {rowData.length === 0 && (
//           <span className="ml-2 text-amber-500">
//             — No EB readings recorded for this month
//           </span>
//         )}
//       </p>

//       {/* TABLE */}
//       <div className="ag-theme-alpine" style={{ height: 560 }}>
//         <AgGridReact
//           rowData={rowData}
//           columnDefs={columnDefs}
//           rowHeight={52}
//           pagination={true}
//           paginationPageSize={10}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//           domLayout="normal"
//           animateRows={true}
//           suppressHorizontalScroll={false}
//         />
//       </div>
//     </div>
//   );
// };

// export default RentPage;































import { useEffect, useState, useRef, useMemo } from "react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

import {
  getRooms,
  getRents,
  getTenants,
  getTenantWiseEBBill,
  generateRent,
  recordPayment,
  deleteRent,
  getUserRole,
  getBranchId,
  fetchAllPages,
} from "@/lib/store";

import {
  Room,
  Bed,
  Rent,
  Tenant,
  TenantEBBill,
  MONTHS,
  PAYMENT_MODES,
  PaymentMode,
} from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { CreditCard, Trash2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

type EBBillRow = TenantEBBill & {
  roomNumber: string;
  flatNumber: string;
  month: number;
  year: number;
};

type RentRow = {
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  flatNumber: string;
  displayEB: number;
  rentPerBed: number;
  total: number;
  paid: number;
  pending: number;
  previousPending: number;
  currentPending: number;
  rentRecord: Rent | undefined;
  unitId: number | undefined;
  amount: number;
  paymentStatus?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: extract month & year from a raw TenantEBBill regardless of field name
// ─────────────────────────────────────────────────────────────────────────────
function extractMonthYear(bill: TenantEBBill): { month: number; year: number } {
  const b = bill as any;
  const month = Number(b.month ?? b.billMonth ?? b.rentMonth ?? 0);
  const year  = Number(b.year  ?? b.billYear  ?? b.rentYear  ?? 0);
  return { month, year };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: resolve roomNumber from a bill — handles all backend field name variants
// ─────────────────────────────────────────────────────────────────────────────
function extractRoomNumber(bill: any): string {
  return (
    bill.roomNumber    ??   // TenantEBBillDTO standard field
    bill.room_number   ??   // snake_case variant
    bill.roomNo        ??   // short variant
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

// ─────────────────────────────────────────────────────────────────────────────
//  ActionCell
// ─────────────────────────────────────────────────────────────────────────────
const ActionCell = ({
  bill,
  rentRecord,
  onGenerate,
  onPayment,
  onDelete,
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
  onDelete: (rent: Rent) => void;
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

  return (
    <div className="flex flex-wrap gap-2 items-center w-full py-1">
      {!rentRecord && (
        <Button size="sm" onClick={() => onGenerate(bill)}>
          Generate
        </Button>
      )}

      {isUnpaid && (
        <>
          <Select
            value={localMode}
            onValueChange={(v: PaymentMode) => setLocalMode(v)}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="number"
            placeholder="Amount"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="border rounded px-2 h-8 w-24 text-xs"
          />

          {showTxnId && (
            <input
              type="text"
              placeholder="Txn ID"
              value={localTxnId}
              onChange={(e) => setLocalTxnId(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="border rounded px-2 h-8 w-28 text-xs"
            />
          )}

          <Button size="sm" variant="outline" onClick={handlePay}>
            <CreditCard className="h-3 w-3 mr-1" />
            Pay
          </Button>
        </>
      )}

      {rentRecord && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(rentRecord)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  RentPage
// ─────────────────────────────────────────────────────────────────────────────
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

  const [ebBillsMap, setEbBillsMap] = useState<Map<string, EBBillRow[]>>(new Map());

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

  const payStatusColor = (status?: string) => {
    const s = normalizeStatus(status);
    return s === "PAID"
      ? "border-green-500 text-green-600"
      : s === "PARTIAL"
      ? "border-yellow-500 text-yellow-600"
      : "border-red-500 text-red-600";
  };

  /* ── EB bills for current month ── */
  const ebBills: EBBillRow[] = useMemo(() => {
    const key = `${month}-${year}`;
    return ebBillsMap.get(key) ?? [];
  }, [ebBillsMap, month, year]);

  /* ── tenant name map ── */
  const tenantNameMap = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((t) => map.set(Number(t.id), t.name));
    return map;
  }, [tenants]);

  const resolveTenantName = (tenantId: number): string =>
    tenantNameMap.get(tenantId) ?? `Tenant ${tenantId}`;

  /* ── scoped rents for summary ── */
  const scopedRents = useMemo(() => {
    const seen = new Map<string, Rent>();
    rents.forEach((r) => {
      const matchMonthYear =
        Number(r.rentMonth) === month && Number(r.rentYear) === year;
      if (!matchMonthYear) return;
      if (role !== "ADMIN") {
        const room = rooms.find((rm) => String(rm.id) === String(r.roomId));
        if (!room || String(room.unitId) !== String(branchId)) return;
      }
      const key      = `${r.tenantId}-${r.roomId}-${r.rentMonth}-${r.rentYear}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, r);
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
          seen.set(key, r);
        }
      }
    });
    return Array.from(seen.values());
  }, [rents, rooms, month, year, role, branchId]);

  /* ── initial load ── */
  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [roomList, rentList, tenantList] = await Promise.all([
        fetchAllPages<Room>(getRooms),
        fetchAllPages<Rent>(getRents),
        fetchAllPages<Tenant>(getTenants),
      ]);

      const filteredRooms =
        role === "ADMIN"
          ? roomList
          : roomList.filter((room) => String(room.unitId) === String(branchId));

      setRooms(filteredRooms);
      setRents(rentList);
      setTenants(tenantList);

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

  /* ─────────────────────────────────────────────────────────────────────────
     CORE FIX: loadEBForMonth
     ─────────────────────────────────────────────────────────────────────────
     Problem: The backend calculateTenantWiseBillByFlat / ByRoom returns
     TenantEBBillDTO objects. These have roomNumber & flatNumber fields set
     by the backend Java code. However:

     1. FLAT bills (POOL/OOO): backend sets roomNumber="OOO", flatNumber="POOL"
        correctly. But the matchesMonthYear filter DROPS them because the
        backend calculateInternal() uses LocalDate.now() — it always returns
        current-month data with NO month/year fields in the response DTO!
        So extractMonthYear(b) returns {month:0, year:0} → filtered out.

     2. ROOM 102 (Dhie): same issue — backend returns bills with no month/year
        in TenantEBBillDTO, so they all get dropped by matchesMonthYear.

     ROOT CAUSE: Backend TenantEBBillDTO has no month/year fields.
     extractMonthYear returns 0/0 for all bills → matchesMonthYear drops ALL.

     But wait — EB Readings page shows all 14 correctly. Why? Because
     EBReadingsPage calls getTenantWiseEBBill and does NOT filter by month/year
     on the bill object — it pre-filters by which EBReading records exist
     for the current month (filteredReadings), then only calls the API for
     those. The API always returns current-month bills.

     FIX STRATEGY:
     - The API always returns current-month data (backend uses LocalDate.now())
     - So we should NOT filter by month/year on the returned bill objects
     - Instead, we rely on the fact that we're fetching for the selected month
       and only store bills if the selected month matches the current month,
       OR we store all bills for the selected month without month/year filtering
     - For months other than current: bills won't exist (backend always uses now())
     - So: skip matchesMonthYear entirely, just store whatever the API returns
       tagged with the requested month/year
  ───────────────────────────────────────────────────────────────────────── */
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

        // ── FLAT-BASED BILLS ──────────────────────────────────────────────────
        // Backend always returns current-month data. We map each bill to a room
        // using the roomNumber field from the API response, falling back to a
        // rooms-array lookup by tenantId → tenant → room if needed.
        const flatBillResults = await Promise.all(
          flatIds.map(async (flatId) => {
            try {
              const bills = await getTenantWiseEBBill({ flatId, roomId: null });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              // ── DEBUG: log first bill to see actual field names ──
              if (bills.length > 0) {
                console.log("[RentPage] flatId", flatId, "sample bill keys:", Object.keys(bills[0] as any));
                console.log("[RentPage] sample bill:", JSON.stringify(bills[0]));
              }

              // Build a lookup: tenantId → room (via tenants array)
              const tenantRoomLookup = new Map<number, Room>();
              tenants.forEach((t) => {
                const room = rooms.find((r) => String(r.id) === String(t.roomId));
                if (room) tenantRoomLookup.set(Number(t.id), room);
              });

              return bills.map((b): EBBillRow => {
                const bAny = b as any;

                // 1. Try roomNumber directly from API response
                let roomNumber = extractRoomNumber(bAny);
                let flatNumber = extractFlatNumber(bAny);

                // 2. If roomNumber is blank, resolve via tenantId → tenant → room
                if (!roomNumber && bAny.tenantId) {
                  const room = tenantRoomLookup.get(Number(bAny.tenantId));
                  if (room) roomNumber = room.roomNumber;
                }

                // 3. If flatNumber is blank, resolve via room → flat
                if (!flatNumber && roomNumber) {
                  const room = rooms.find((r) => r.roomNumber === roomNumber);
                  const flatRoom = room ?? rooms.find((r) => String(r.flatId) === String(flatId));
                  // flatNumber comes from the flat entity — use flatId to find it in rooms
                  // rooms have flatId but not flatNumber directly; get it from any room in flat
                  if (!flatNumber) {
                    // Try to get flatNumber from the bill's tenantName context or leave as flatId
                    flatNumber = String(flatId); // fallback: use flatId as identifier
                  }
                }

                // Tag with the requested month/year (backend always returns current month)
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

        // ── STANDALONE ROOM BILLS ─────────────────────────────────────────────
        const roomBillResults = await Promise.all(
          standaloneRooms.map(async (room) => {
            try {
              const bills = await getTenantWiseEBBill({
                roomId: room.id,
                flatId: null,
              });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              return bills.map((b): EBBillRow => {
                const bAny = b as any;

                // Always use the room object's roomNumber as the authoritative source
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

        const bills = [...flatBillResults.flat(), ...roomBillResults.flat()];

        console.log("[RentPage] Total EB bills loaded:", bills.length,
          "for month:", month, "year:", year);
        console.log("[RentPage] Bills roomNumbers:", bills.map(b => b.roomNumber));

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

  /* ── lookups ── */
  const getRoomObj = (roomNumber: string) =>
    rooms.find((r) => r.roomNumber === roomNumber);

  const getRoomById = (roomId: string | number) =>
    rooms.find((r) => String(r.id) === String(roomId));

  // Resolve room: try roomNumber first, then roomId fallback
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

  /* ── previous pending helper ── */
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

  /* ── filtered bills (branch guard) ── */
  const filteredBills = useMemo(() => {
    return ebBills.filter((bill) => {
      if (role !== "ADMIN" && branchId) {
        // Resolve room by roomNumber OR by tenantId → tenant → room
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

  /* ── row data ── */
  const rowData = useMemo((): RentRow[] => {
    // Part 1: rows from EB bills for the selected month
    const ebRows: RentRow[] = filteredBills.map((bill) => {
      const b = bill as any;

      // Resolve room: roomNumber first, then tenantId → tenant → room as fallback
      let room = resolveRoom(bill.roomNumber);
      if (!room && b.tenantId) {
        const tenant = tenants.find((t) => Number(t.id) === Number(b.tenantId));
        if (tenant) room = getRoomById(tenant.roomId);
      }

      const rentPerBed = room?.rentPerBed ?? 0;
      const rentRecord = getRentStatus(
        b.tenantId,
        bill.roomNumber,
        room?.id
      );

      const recordTotal = rentRecord ? Number(rentRecord.totalAmount || 0) : 0;
      const recordRent  = rentRecord ? Number(rentRecord.rentAmount  || 0) : rentPerBed;
      const recordEB    = rentRecord ? Number(rentRecord.ebAmount    || 0) : b.amount ?? 0;

      const displayEB    = rentRecord ? recordEB   : (b.amount ?? 0);
      const displayRent  = rentRecord ? recordRent : rentPerBed;
      const displayTotal = rentRecord ? recordTotal : rentPerBed + (b.amount ?? 0);

      const currentPaid   = Number(rentRecord?.paidAmount || 0);
      const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

      const currentPending = rentRecord
        ? currentStatus === "PAID"
          ? 0
          : currentStatus === "PARTIAL"
          ? recordTotal - currentPaid
          : recordTotal
        : rentPerBed + (b.amount ?? 0);

      const { previousPending } = rentRecord
        ? computePreviousPending(b.tenantId, month, year, rents)
        : { previousPending: 0 };

      // Resolve flatNumber: use from bill, or look up flat name via room.flatId
      const flatNumber =
        bill.flatNumber ||
        (() => {
          if (!room?.flatId) return "";
          // Try to get flat name from any other bill that has it
          const flatBill = ebBills.find(
            (eb) => eb.flatNumber && resolveRoom(eb.roomNumber)?.flatId === room!.flatId
          );
          return flatBill?.flatNumber ?? String(room.flatId);
        })();

      return {
        tenantId:      b.tenantId,
        tenantName:    b.tenantName ?? resolveTenantName(Number(b.tenantId)),
        roomNumber:    room?.roomNumber ?? bill.roomNumber,
        flatNumber,
        rentPerBed:    displayRent,
        displayEB,
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

    // Part 2: orphan rent rows (rent record exists but no EB bill this month)
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
        const recordTotal = Number(r.totalAmount || 0);
        const recordRent  = Number(r.rentAmount  || 0);
        const recordEB    = Number(r.ebAmount    || 0);
        const currentPaid = Number(r.paidAmount  || 0);
        const status      = normalizeStatus(r.paymentStatus);

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
          roomNumber:      room?.roomNumber ?? String(r.roomId),
          flatNumber:      (room as any)?.flatNumber ?? "-",
          displayEB:       recordEB,
          rentPerBed:      recordRent,
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

    let allRows = [...ebRows, ...orphanRows];

    if (selectedBranch !== "all") {
      allRows = allRows.filter((r) => String(r.unitId) === selectedBranch);
    }

    return allRows;
  }, [filteredBills, rooms, tenants, selectedBranch, month, year, rents, search, tenantNameMap]);

  /* ── branch options ── */
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

  /* ── handlers ── */
  const handleGenerate = async (bill: RentRow) => {
    // Resolve room via roomNumber, then fallback via tenantId → tenant → room
    let room = getRoomObj(bill.roomNumber);
    if (!room) {
      const tenant = tenants.find((t) => Number(t.id) === bill.tenantId);
      if (tenant) room = getRoomById(tenant.roomId);
    }

    if (!room) return toast.error("Room not found for this tenant");
    try {
      await generateRent({
        tenantId:   String(bill.tenantId),
        roomId:     String(room.id),
        rentMonth:  month,
        rentYear:   year,
        rentAmount: room.rentPerBed,
        ebAmount:   bill.amount,
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
          await generateRent({
            tenantId:   String(b.tenantId),
            roomId:     String(room.id),
            rentMonth:  month,
            rentYear:   year,
            rentAmount: room.rentPerBed,
            ebAmount:   b.amount ?? 0,
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

  const handleDelete = async (rent: Rent) => {
    if (!confirm("Delete this rent record?")) return;
    try {
      await deleteRent(String(rent.id));
      toast.success("Rent deleted");
      reload();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── column defs ── */
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Flat",
        field: "flatNumber",
        filter: true,
        flex: 1,
        minWidth: 100,
        valueFormatter: (p) => p.value || "-",
      },
      {
        headerName: "Room No",
        field: "roomNumber",
        filter: true,
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: "Tenant",
        field: "tenantName",
        filter: true,
        flex: 2,
        minWidth: 140,
      },
      {
        headerName: "EB",
        field: "displayEB",
        filter: true,
        flex: 1,
        minWidth: 90,
        valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
      },
      {
        headerName: "Rent",
        field: "rentPerBed",
        filter: true,
        flex: 1,
        minWidth: 90,
        valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
      },
      {
        headerName: "Total",
        field: "total",
        flex: 1,
        minWidth: 100,
        cellStyle: { fontWeight: "600" },
        valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
      },
      {
        headerName: "Pending",
        field: "pending",
        flex: 1,
        minWidth: 100,
        cellStyle: { fontWeight: "600", color: "red" },
        valueFormatter: (p) => `₹${Math.round(Number(p.value ?? 0))}`,
      },
      {
        headerName: "Status",
        field: "paymentStatus",
        filter: true,
        width: 140,
        minWidth: 140,
        maxWidth: 140,
        suppressSizeToFit: true,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          overflow: "visible",
        },
        cellRenderer: (params: any) => {
          const status =
            params.data.rentRecord?.paymentStatus || "UNGENERATED";
          return (
            <Badge
              variant="outline"
              className={`text-xs whitespace-nowrap ${payStatusColor(status)}`}
            >
              {status}
            </Badge>
          );
        },
      },
      ...(hasAccess
        ? [
            {
              headerName: "Actions",
              sortable: false,
              filter: false,
              resizable: false,
              flex: 4,
              minWidth: 540,
              cellStyle: { overflow: "visible", padding: "4px 8px" },
              cellRenderer: (params: any) => (
                <ActionCell
                  bill={params.data}
                  rentRecord={params.data.rentRecord}
                  onGenerate={handleGenerate}
                  onPayment={handlePayment}
                  onDelete={handleDelete}
                />
              ),
            },
          ]
        : []),
    ],
    [rents, rooms]
  );

  /* ── summary totals ── */
  let totalCollected = 0;
  let totalPending   = 0;

  scopedRents.forEach((r) => {
    const total  = Number(r.totalAmount) || 0;
    const paid   = Number(r.paidAmount)  || 0;
    const status = normalizeStatus(r.paymentStatus);

    if (status === "PAID") {
      totalCollected += total;
    } else if (status === "PARTIAL") {
      totalCollected += paid;
      totalPending   += total - paid;
    } else {
      totalPending += total;
    }
  });

  const totalAmount       = totalCollected + totalPending;
  const collectionPercent =
    totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;

  /* ── UI ── */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Rent & EB Management</h1>
          <p className="text-sm text-muted-foreground">
            {MONTHS[month - 1]} {year}
          </p>
        </div>

        <div className="flex gap-6 text-sm">
          <div className="text-green-600 font-semibold">
            <p>Collected</p>
            <p className="text-lg">₹{Math.round(totalCollected).toLocaleString()}</p>
          </div>
          <div className="text-red-600 font-semibold">
            <p>Pending</p>
            <p className="text-lg">₹{Math.round(totalPending).toLocaleString()}</p>
          </div>
          <div className="text-blue-600 font-semibold">
            <p>Collection</p>
            <p className="text-lg">{collectionPercent}%</p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 flex-wrap">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {role === "ADMIN" ? (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center px-3 h-10 rounded-md border bg-muted text-sm font-medium text-muted-foreground w-44">
            {branchOptions.find((b) => String(b.id) === String(branchId))?.name
              ?? `Branch ${branchId}`}
          </div>
        )}

        {hasAccess && (
          <Button size="sm" onClick={handleGenerateAll}>
            Generate All
          </Button>
        )}
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search tenant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-md px-3 py-2 text-sm w-64"
      />

      {/* ROW COUNT */}
      <p className="text-xs text-muted-foreground">
        Showing {rowData.length} tenant(s) for {MONTHS[month - 1]} {year}
        {rowData.length === 0 && (
          <span className="ml-2 text-amber-500">
            — No EB readings recorded for this month
          </span>
        )}
      </p>

      {/* TABLE */}
      <div className="ag-theme-alpine" style={{ height: 560 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          rowHeight={52}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          domLayout="normal"
          animateRows={true}
          suppressHorizontalScroll={false}
        />
      </div>
    </div>
  );
};

export default RentPage;