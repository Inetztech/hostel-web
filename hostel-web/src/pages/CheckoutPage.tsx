// import { useEffect, useState, useRef, useMemo } from "react";
// import {
//   getRooms,
//   getTenants,
//   getCheckoutSummary,
//   checkoutTenant,
//   getUserRole,
//   getEBReadings,
//   updateBedStatus,
//   getBranchId,
//   getBranches,
//   fetchAllPages,
// } from "@/lib/store";


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
// } from "@/components/ui/dialog";

// import { Room, Tenant, Rent, EBReading, Branch, DEFAULT_EB_RATE, MONTHS } from "@/lib/types";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { Badge } from "@/components/ui/badge";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { toast } from "sonner";
// import { LogOut, Search, ChevronRight, Building2 } from "lucide-react";

// // Today's date as YYYY-MM-DD in the user's LOCAL timezone (not UTC), so the
// // date input defaults to the correct day.
// const getTodayISO = (): string => {
//   const d = new Date();
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// };

// function splitPending(r: Rent): { rentPending: number; ebPending: number } {
//   const rentAmt = r.rentAmount ?? 0;
//   const ebAmt   = r.ebAmount   ?? 0;
//   const paid    = r.paidAmount ?? 0;

//   if (r.paymentStatus === "PAID") {
//     return { rentPending: 0, ebPending: 0 };
//   }

//   if (r.paymentStatus === "PENDING") {
//     return { rentPending: rentAmt, ebPending: ebAmt };
//   }

//   const rentPending = Math.max(rentAmt - paid, 0);
//   const rentCovered = Math.min(paid, rentAmt);
//   const ebPending   = Math.max(ebAmt - Math.max(paid - rentCovered, 0), 0);

//   return { rentPending, ebPending };
// }

// interface PendingRentDialogProps {
//   open: boolean;
//   onClose: () => void;
//   tenant: Tenant | null;
//   room: Room | null;
//   pendingRents: Rent[];
//   advancePaid: number;
//   maintenanceCharge: number;
// }

// const statusMeta: Record<
//   string,
//   { label: string; variant: "default" | "destructive" | "secondary" | "outline" }
// > = {
//   PAID:    { label: "Paid",    variant: "default" },
//   PARTIAL: { label: "Partial", variant: "secondary" },
//   PENDING: { label: "Unpaid",  variant: "destructive" },
// };

// const PendingRentDialog = ({
//   open,
//   onClose,
//   tenant,
//   room,
//   pendingRents,
//   advancePaid,
//   maintenanceCharge,
// }: PendingRentDialogProps) => {
//   if (!tenant) return null;

//   const totalRentDue = pendingRents.reduce(
//     (sum, r) => sum + splitPending(r).rentPending,
//     0
//   );

//   const totalEBDue = pendingRents.reduce(
//     (sum, r) => sum + splitPending(r).ebPending,
//     0
//   );

//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>Pending Rent Records</DialogTitle>
//         </DialogHeader>

//         <div className="bg-muted rounded-md px-4 py-3 text-sm space-y-1 mb-2">
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Name</span>
//             <span className="font-medium">{tenant.name}</span>
//           </div>
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Phone</span>
//             <span className="font-medium">{tenant.phone}</span>
//           </div>
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Room</span>
//             <span className="font-medium">{room?.roomNumber ?? "—"}</span>
//           </div>
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Check-in</span>
//             <span className="font-medium">{tenant.checkInDate}</span>
//           </div>
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Total Records</span>
//             <span className="font-medium">{pendingRents.length}</span>
//           </div>
//         </div>

//         <div className="space-y-3">
//           {pendingRents.length === 0 ? (
//             <p className="text-sm text-center text-muted-foreground py-6">
//               No pending rent records
//             </p>
//           ) : (
//             pendingRents.map((rent) => {
//               const meta = statusMeta[rent.paymentStatus] ?? statusMeta["PENDING"];
//               const monthLabel =
//                 MONTHS[(rent.rentMonth ?? 1) - 1] ?? `Month ${rent.rentMonth}`;
//               const { rentPending, ebPending } = splitPending(rent);

//               return (
//                 <div
//                   key={rent.id}
//                   className="border rounded-lg px-4 py-3 text-sm space-y-2"
//                 >
//                   <div className="flex justify-between items-center">
//                     <span className="font-medium">
//                       {monthLabel} {rent.rentYear}
//                     </span>
//                     <Badge variant={meta.variant}>{meta.label}</Badge>
//                   </div>

//                   <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
//                     <span>Monthly Rent</span>
//                     <span className="text-right font-medium text-foreground">
//                       ₹{(rent.rentAmount ?? 0).toLocaleString()}
//                     </span>

//                     <span>EB Amount</span>
//                     <span className="text-right font-medium text-foreground">
//                       ₹{Math.round(rent.ebAmount ?? 0).toLocaleString()}
//                     </span>

//                     {rent.paymentStatus === "PARTIAL" && (
//                       <>
//                         <span>Amount Paid</span>
//                         <span className="text-right font-medium text-green-600">
//                           ₹{(rent.paidAmount ?? 0).toLocaleString()}
//                         </span>
//                         <span>Rent Pending</span>
//                         <span className="text-right font-medium text-destructive">
//                           ₹{Math.round(rentPending).toLocaleString()}
//                         </span>
//                         <span>EB Pending</span>
//                         <span className="text-right font-medium text-destructive">
//                           ₹{Math.round(ebPending).toLocaleString()}
//                         </span>
//                       </>
//                     )}

//                     {rent.paymentStatus === "PENDING" && (
//                       <>
//                         <span>Total Pending</span>
//                         <span className="text-right font-medium text-destructive">
//                           ₹{(
//                             (rent.rentAmount ?? 0) + (rent.ebAmount ?? 0)
//                           ).toLocaleString()}
//                         </span>
//                       </>
//                     )}

//                     {rent.paymentDate && (
//                       <>
//                         <span>Due Date</span>
//                         <span className="text-right font-medium text-foreground">
//                           {rent.paymentDate}
//                         </span>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               );
//             })
//           )}
//         </div>

//         {pendingRents.length > 0 && (
//           <>
//             <Separator className="my-3" />
//             <div className="space-y-1.5 text-sm">
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Total Rent Due</span>
//                 <span className="font-medium">
//                   ₹{Math.round(totalRentDue).toLocaleString()}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Total EB Due</span>
//                 <span className="font-medium">
//                   ₹{Math.round(totalEBDue).toLocaleString()}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Maintenance</span>
//                 <span className="font-medium">
//                   ₹{maintenanceCharge.toLocaleString()}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Advance Paid</span>
//                 <span className="font-medium text-green-600">
//                   ₹{advancePaid.toLocaleString()}
//                 </span>
//               </div>
//               <Separator />
//               <div className="flex justify-between font-semibold text-base">
//                 <span>
//                   {totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
//                     ? "Total Due"
//                     : "Refund Due"}
//                 </span>
//                 <span
//                   className={
//                     totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
//                       ? "text-destructive"
//                       : "text-green-600"
//                   }
//                 >
//                   ₹{Math.round(
//                     Math.abs(totalRentDue + totalEBDue + maintenanceCharge - advancePaid)
//                   ).toLocaleString()}
//                 </span>
//               </div>
//             </div>
//           </>
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// };



// const CheckoutPage = () => {
//   const [rooms, setRooms]                         = useState<Room[]>([]);
//   const [tenants, setTenants]                     = useState<Tenant[]>([]);
//   const [allTenants, setAllTenants]                = useState<Tenant[]>([]);
//   const [branches, setBranches]                   = useState<Branch[]>([]);
//   const [selectedTenantId, setSelectedTenantId]   = useState<string>("");
//   // Defaults to today; the user can edit it from the "Check-Out Date" card.
//   const [checkOutDate, setCheckOutDate]           = useState<string>(getTodayISO());
//   const [search, setSearch]                       = useState<string>("");
//   const [confirmOpen, setConfirmOpen]             = useState<boolean>(false);
//   const [pendingRentDialogOpen, setPendingRentDialogOpen] = useState(false);
//   const [finalPrev, setFinalPrev]                 = useState<string>("");
//   const [finalCurr, setFinalCurr]                 = useState<string>("");
//   const [tenantEBDue, setTenantEBDue]             = useState<number>(0);
//   const [extraDays, setExtraDays]                 = useState<string>("");
//   const [selectedBranch, setSelectedBranch]       = useState(
//     getUserRole() === "ADMIN" ? "all" : String(getBranchId() ?? "all")
//   );
//   const [acPrev, setAcPrev]                       = useState<string>("");
//   const [acCurr, setAcCurr]                       = useState<string>("");
//   const [useManualRent, setUseManualRent]         = useState(false);
//   const [rentPerDay, setRentPerDay]               = useState<string>("");
//   const [ebRate, setEbRate]                       = useState<string>(String(DEFAULT_EB_RATE || 13));
//   const [maintenanceCharge, setMaintenanceCharge] = useState<number>(1000);
//   const [overrideNoticePeriod, setOverrideNoticePeriod] = useState<boolean>(false);
//   const [meterScope, setMeterScope]               = useState<"room" | "flat">("flat");

//   // Every EB reading fetched for the currently-selected tenant's checkout
//   // flow. Kept around (not just used transiently inside
//   // handleSelectTenant) so calculateProportionalEBShare can look up each
//   // roommate's own last billed reading — see tenantLastBilledReading
//   // below for why this is needed.
//   const [ebReadingsAll, setEbReadingsAll]         = useState<EBReading[]>([]);
//   const [summary, setSummary] = useState<{
//     pendingRents: Rent[];
//     totalRentDue: number;
//     advancePaid: number;
//   } | null>(null);

//   const role     = getUserRole();
//   const branchId = getBranchId();
//   const isAdmin  = role === "ADMIN";

//   const reload = async () => {
//     try {
//       const [roomList, allTenantList, allBranches] = await Promise.all([
//         fetchAllPages<Room>(getRooms, 10),
//         fetchAllPages<Tenant>(getTenants, 10),
//         fetchAllPages<Branch>(getBranches, 10),
//       ]);

//       const activeTenants = allTenantList.filter((t) => t.status === "Active");

//       setAllTenants(allTenantList);

//       const filteredRooms =
//         role === "ADMIN"
//           ? roomList
//           : roomList.filter(
//               (room) => String(room.unitId) === String(branchId)
//             );

//       const filteredTenants =
//         role === "ADMIN"
//           ? activeTenants
//           : activeTenants.filter((tenant) =>
//               filteredRooms.some(
//                 (room) => String(room.id) === String(tenant.roomId)
//               )
//             );

//       const filteredBranches =
//         role === "ADMIN"
//           ? allBranches
//           : allBranches.filter((b) => String(b.id) === String(branchId));

//       setRooms(filteredRooms);
//       setTenants(filteredTenants);
//       setBranches(filteredBranches);
//     } catch (err) {
//       console.error("Reload error:", err);
//       toast.error("Failed to load rooms or tenants");
//     }
//   };

//   const didLoad = useRef(false);

//   useEffect(() => {
//     if (didLoad.current) return;
//     didLoad.current = true;
//     reload();
//   }, []);

//   const branchOptions = useMemo(
//     () =>
//       branches.map((b) => ({
//         id: b.id,
//         name: b.unitName || `Branch ${b.id}`,
//       })),
//     [branches]
//   );

//   const ownBranchName = useMemo(() => {
//     if (isAdmin) return null;
//     return (
//       branchOptions.find((b) => String(b.id) === String(branchId))?.name ??
//       (branchId ? `Branch ${branchId}` : "—")
//     );
//   }, [isAdmin, branchOptions, branchId]);



//   const handleSelectTenant = async (tenantId: string) => {
//     try {
//       setSelectedTenantId(tenantId);
//       setSummary({ pendingRents: [], totalRentDue: 0, advancePaid: 0 });
//       setTenantEBDue(0);
//       setAcPrev("");
//       setAcCurr("");
//       setFinalPrev("");
//       setFinalCurr("");
//       setExtraDays("");
//       setOverrideNoticePeriod(false);
//       setMeterScope("flat");
//       setCheckOutDate(getTodayISO());

//       const numericTenantId = Number(tenantId);
//       const selected = tenants.find((t) => Number(t.id) === numericTenantId);
//       if (!selected) return;

//       setMaintenanceCharge(selected.tenantStay === "DAILY" ? 0 : 1000);

//       const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
//       const isAcRoom = room?.hostelType === "AC";

//       const allReadings = await fetchAllPages<EBReading>(getEBReadings, 10);
//       setEbReadingsAll(allReadings);

//       if (isAcRoom) {
//         // AC units stay per-room even inside a shared-meter flat, so this
//         // is unaffected by the flat-vs-room split below.
//         const roomAcReadings = allReadings
//           .filter((r) => Number(r.roomId) === Number(selected.roomId))
//           .sort((a, b) => {
//             if (a.year !== b.year) return b.year - a.year;
//             return b.month - a.month;
//           });

//         setAcPrev(
//           roomAcReadings.length > 0
//             ? String(roomAcReadings[0].acCurrentReading ?? 0)
//             : String(selected.acJoinReading ?? 0)
//         );
//       }

//       const joinReading = Number(selected.joinReading ?? 0);

//       // A flat's EB meter is ONE physical meter shared by every room in
//       // that flat, not one meter per room. "Previous" for a room that
//       // belongs to a flat is the flat's own latest known meter value —
//       // no per-tenant matching involved. This tenant's fair share of the
//       // units used since then is worked out afterwards by
//       // calculateProportionalEBShare (see flatTenants / roomTenants
//       // below) — that's the right place for per-tenant attribution, not
//       // here.
//       if (room?.flatId != null) {
//         const flatReadings = allReadings.filter(
//           (r) => Number(r.flatId) === Number(room.flatId)
//         );
//         const roomIdsInFlat = new Set(
//           rooms.filter((r) => Number(r.flatId) === Number(room.flatId)).map((r) => r.id)
//         );
//         const flatAllTenants = allTenants.filter(
//           (t) => roomIdsInFlat.has(Number(t.roomId))
//         );

//         // Bulk entries (Add EB Reading page) settle every active
//         // tenant's share in one shot — the latest one is a genuine
//         // "everyone is paid up to here" floor. Legacy rows saved before
//         // this flag existed have isCheckout === undefined, which is
//         // intentionally NOT treated as bulk — they fall through to the
//         // safer MIN reach-back below.
//         const bulkReadings = flatReadings.filter(
//           (r: any) => r.isCheckout === false
//         );

//         let flatPrevious: number;
//         if (bulkReadings.length > 0) {
//           // FIX: mirrors getFlatStartingReading() in EBReadingsPage.tsx.
//           // The highest saved bulk reading alone isn't a safe floor once
//           // a NEW tenant has checked into a room in this flat with their
//           // own "Current EB Reading" snapshot AFTER the last bulk save —
//           // that snapshot is a real physical meter read and can only be
//           // at or above whatever was last recorded. Ignoring it left
//           // "Previous" understated for anyone checking out from a flat
//           // where a newer roommate joined more recently than the last
//           // bulk save.
//           const highestBulk = Math.max(
//             ...bulkReadings.map((r) => Number(r.currentReading ?? 0))
//           );
//           const activeFlatTenants = flatAllTenants.filter(
//             (t) => String(t.status).toLowerCase() === "active"
//           );
//           const highestActiveJoin = activeFlatTenants.length > 0
//             ? Math.max(...activeFlatTenants.map((t) => Number(t.joinReading ?? 0)))
//             : 0;
//           flatPrevious = Math.max(highestBulk, highestActiveJoin);
//         } else if (flatReadings.length > 0) {
//           // No bulk save has ever settled this flat as a group yet —
//           // true start of the billing window is the earliest
//           // previousReading ever recorded for it, never the latest.
//           // Also include this tenant's own joinReading as a floor, in
//           // case they joined even earlier than any reading on file.
//           flatPrevious = Math.min(
//             ...flatReadings.map((r) => Number(r.previousReading ?? 0)),
//             joinReading
//           );
//         } else if (flatAllTenants.length > 0) {
//           // No flat-level reading row exists yet at all — anchor to the
//           // earliest join reading among EVERYONE who has ever lived in
//           // this flat (active or already checked out), so nobody's
//           // early consumption is silently dropped.
//           //
//           // FIX: a DAILY-stay tenant's joinReading is NOT a real meter
//           // snapshot — it's optional and the backend silently defaults it
//           // to 0 whenever it isn't supplied (DAILY tenants don't
//           // participate in the monthly EB cycle at all). `0 ?? joinReading`
//           // does NOT fall back, because `??` only catches null/undefined,
//           // not 0 — so a single DAILY roommate with an unset joinReading
//           // was silently collapsing this whole Math.min(...) to 0,
//           // wildly inflating finalEBUnits for anyone checking out of that
//           // flat. Only MONTHLY tenants with a genuinely recorded (> 0)
//           // joinReading can act as a floor here.
//           const validFlatJoinReadings = flatAllTenants
//             .filter((t) => t.tenantStay !== "DAILY")
//             .map((t) => Number(t.joinReading))
//             .filter((v) => Number.isFinite(v) && v > 0);

//           flatPrevious = validFlatJoinReadings.length > 0
//             ? Math.min(...validFlatJoinReadings, joinReading)
//             : joinReading;
//         } else {
//           flatPrevious = joinReading;
//         }

//         setFinalPrev(String(flatPrevious));
//       } else {
//         const roomTenantsAll = allTenants.filter(
//           (t) => Number(t.roomId) === Number(selected.roomId)
//         );

//         const roomReadingsForThisRoom = allReadings.filter(
//           (r) => Number(r.roomId) === Number(selected.roomId)
//         );

//         const bulkRoomReadings = roomReadingsForThisRoom.filter(
//           (r: any) => r.isCheckout === false
//         );

//         let roomPrevious: number;

//         if (bulkRoomReadings.length > 0) {
//           // FIX: same reasoning as the flat branch above — the highest
//           // bulk reading alone can go stale the moment a new tenant
//           // checks into this room with their own join snapshot AFTER
//           // the last bulk save. Advance the floor to whichever is
//           // higher.
//           const highestBulk = Math.max(
//             ...bulkRoomReadings.map((r) => Number(r.currentReading ?? 0))
//           );
//           const activeRoomTenants = roomTenantsAll.filter(
//             (t) => String(t.status).toLowerCase() === "active"
//           );
//           const highestActiveJoin = activeRoomTenants.length > 0
//             ? Math.max(...activeRoomTenants.map((t) => Number(t.joinReading ?? 0)))
//             : 0;
//           roomPrevious = Math.max(highestBulk, highestActiveJoin);
//         } else if (roomReadingsForThisRoom.length > 0) {
//           const validRoomJoinReadingsA = roomTenantsAll
//             .filter((t) => t.tenantStay !== "DAILY")
//             .map((t) => Number(t.joinReading))
//             .filter((v) => Number.isFinite(v) && v > 0);

//           roomPrevious = Math.min(
//             ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
//             ...(validRoomJoinReadingsA.length > 0 ? validRoomJoinReadingsA : [joinReading]),
//             joinReading
//           );
//         } else if (roomTenantsAll.length > 0) {
//           const validRoomJoinReadingsB = roomTenantsAll
//             .filter((t) => t.tenantStay !== "DAILY")
//             .map((t) => Number(t.joinReading))
//             .filter((v) => Number.isFinite(v) && v > 0);

//           roomPrevious = validRoomJoinReadingsB.length > 0
//             ? Math.min(...validRoomJoinReadingsB, joinReading)
//             : joinReading;
//         } else {
//           roomPrevious = joinReading;
//         }

//         setFinalPrev(String(roomPrevious));
//       }

//       const roomOwnReadings = allReadings.filter(
//         (r) => Number(r.roomId) === Number(selected.roomId)
//       );
//       const flatReadings = room?.flatId
//         ? allReadings.filter((r) => Number(r.flatId) === Number(room.flatId))
//         : [];

//       const usingFlatLevelReadings = !!room?.flatId;
//       const relevantReadings = usingFlatLevelReadings
//         ? (flatReadings.length > 0 ? flatReadings : roomOwnReadings)
//         : roomOwnReadings;

//       if (relevantReadings.length > 0) {
//         setMeterScope(usingFlatLevelReadings ? "flat" : "room");
//       }

//       const checkout = await getCheckoutSummary(numericTenantId);

//       const rents       = checkout?.pendingRents ?? [];
//       const unpaidRents = rents.filter((r) => r.paymentStatus !== "PAID");

//       const totalRentDue = unpaidRents.reduce(
//         (sum, r) => sum + splitPending(r).rentPending,
//         0
//       );
//       const totalEBDue = unpaidRents.reduce(
//         (sum, r) => sum + splitPending(r).ebPending,
//         0
//       );

//       setSummary({
//         pendingRents: unpaidRents,
//         totalRentDue,
//         advancePaid: checkout?.advancePaid ?? selected.advance ?? 0,
//       });

//       setTenantEBDue(totalEBDue);
//     } catch (error) {
//       console.error("Checkout fetch error:", error);
//       toast.error("Failed to fetch checkout data");
//       const selected = tenants.find((t) => Number(t.id) === Number(tenantId));
//       setSummary({
//         pendingRents: [],
//         totalRentDue: 0,
//         advancePaid: selected?.advance ?? 0,
//       });
//     }
//   };



//   const selectedTenant = tenants.find(
//     (t) => Number(t.id) === Number(selectedTenantId)
//   );


//   const selectedRoom = selectedTenant
//     ? rooms.find((r) => Number(r.id) === Number(selectedTenant.roomId))
//     : null;

//   const registrationFees = Number(selectedTenant?.registrationFees ?? 0);

//   const isDailyStay = selectedTenant?.tenantStay === "DAILY";

//   const advanceEbCollected = isDailyStay
//     ? Number(selectedTenant?.ebAmount ?? 0)
//     : 0;

//   const dailyStayTotal = isDailyStay
//     ? Number(selectedTenant?.totalAmount ?? 0)
//     : 0;


//   const flatTenants = selectedRoom?.flatId
//     ? allTenants.filter((t) => {
//         const tenantRoom = rooms.find(
//           (r) => Number(r.id) === Number(t.roomId)
//         );
//         return (
//           tenantRoom &&
//           Number(tenantRoom.flatId) === Number(selectedRoom.flatId)
//         );
//       })
//     : [];

//   const roomOnlyTenants = allTenants.filter(
//     (t) => Number(t.roomId) === Number(selectedTenant?.roomId)
//   );

//   const roomTenants =
//     meterScope === "room"
//       ? roomOnlyTenants
//       : flatTenants.length > 0
//         ? flatTenants
//         : roomOnlyTenants;

//   const isAcRoom = selectedRoom?.hostelType === "AC";

//   const tenantLastBilledReading = useMemo(() => {
//     const map = new Map<number, number>();
//     const meterFlatId = selectedRoom?.flatId ?? null;
//     const meterRoomId = selectedRoom?.id ?? null;
//     if (meterFlatId == null && meterRoomId == null) return map;

//     ebReadingsAll.forEach((r: any) => {
//       if (r.tenantId == null) return;
//       const sameMeter = meterFlatId != null
//         ? Number(r.flatId) === Number(meterFlatId)
//         : Number(r.roomId) === Number(meterRoomId);
//       if (!sameMeter) return;

//       const val = Number(r.currentReading ?? 0);
//       const key = Number(r.tenantId);
//       const prevMax = map.get(key);
//       if (prevMax == null || val > prevMax) map.set(key, val);
//     });
//     return map;
//   }, [ebReadingsAll, selectedRoom]);

//   // Parse as LOCAL midnight (a bare "YYYY-MM-DD" string would be parsed as
//   // UTC and could land on the previous day in some timezones).
//   const dateForCalc  = checkOutDate
//     ? new Date(`${checkOutDate}T00:00:00`)
//     : new Date();
//   const daysInMonth  = new Date(
//     dateForCalc.getFullYear(),
//     dateForCalc.getMonth() + 1,
//     0
//   ).getDate();

//   const effectiveMonthlyRent = useMemo(() => {
//     const tenantRent = Number(selectedTenant?.monthlyRent ?? 0);
//     if (tenantRent > 0) return tenantRent;

//     const roomRent = Number((selectedRoom as any)?.monthlyRent ?? 0);
//     if (roomRent > 0) return roomRent;

//     const roommatePool = roomTenants.length > 0 ? roomTenants : flatTenants;
//     const roommateRent = roommatePool
//       .map((t) => Number(t.monthlyRent ?? 0))
//       .find((r) => r > 0);

//     return roommateRent ?? 0;
//   }, [selectedTenant, selectedRoom, roomTenants, flatTenants]);

//   // A DAILY tenant already has an explicit per-day rate on their record,
//   // so "Auto Calculate" for extra days uses that directly instead of
//   // dividing a monthly rent they don't have.
//   const autoRentPerDay = isDailyStay
//     ? Number(selectedTenant?.amountPerDay ?? 0)
//     : effectiveMonthlyRent / daysInMonth;

//   const extraRent =
//     selectedTenant && extraDays
//       ? useManualRent
//         ? Number(extraDays) * Number(rentPerDay || 0)
//         : Math.round(autoRentPerDay * Number(extraDays))
//       : 0;

//   const hasFinalReading =
//     !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

//   const finalEBUnits = hasFinalReading
//     ? Number(finalCurr) - Number(finalPrev)
//     : 0;

//   const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
//   const totalEBAmount  = finalEBUnits * appliedEBRate;
//   const calculateProportionalEBShare = (
//     tenantId: number | null | undefined,
//     prevReading: number,
//     currReading: number,
//     rate: number,
//     occupants: Tenant[]
//   ): { share: number; segments: { units: number; count: number }[] } => {
//     if (!tenantId || !(currReading > prevReading) || occupants.length === 0) {
//       return { share: 0, segments: [] };
//     }

//     const numericTenantId = Number(tenantId);

//     const isPresentInSegment = (
//       t: Tenant,
//       segStart: number,
//       segEnd: number
//     ): boolean => {
//       const join = Number(t.joinReading);
//       if (!Number.isFinite(join) || join > segStart) return false;

//       const lastBilled = tenantLastBilledReading.get(Number(t.id));

//       if (Number(t.id) === numericTenantId) {
//         if (lastBilled != null && segEnd > lastBilled) return false;
//         return currReading >= segEnd;
//       }

//       if (t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         if (Number.isFinite(co)) {
//           return co >= segEnd;
//         }
//         if (lastBilled != null) return segEnd <= lastBilled;
//         return false;
//       }
//       if (lastBilled != null && segEnd > lastBilled) return false;
//       return true;
//     };

//     const boundarySet = new Set<number>();
//     occupants.forEach((t) => {
//       const join = Number(t.joinReading);
//       if (Number.isFinite(join) && join > prevReading && join < currReading) {
//         boundarySet.add(join);
//       }
//       if (Number(t.id) !== numericTenantId) {
//         const co = Number(t.checkoutReading);
//         if (t.status === "Checked_Out" && Number.isFinite(co) && co > prevReading && co < currReading) {
//           boundarySet.add(co);
//         }
//       }
//       const lastBilled = tenantLastBilledReading.get(Number(t.id));
//       if (lastBilled != null && lastBilled > prevReading && lastBilled < currReading) {
//         boundarySet.add(lastBilled);
//       }
//     });

//     const points = [
//       prevReading,
//       ...Array.from(boundarySet).sort((a, b) => a - b),
//       currReading,
//     ];

//     let share = 0;
//     const segments: { units: number; count: number }[] = [];

//     for (let i = 0; i < points.length - 1; i++) {
//       const segStart = points[i];
//       const segEnd = points[i + 1];
//       const segUnits = segEnd - segStart;
//       if (segUnits <= 0) continue;

//       const presentInSegment = occupants.filter((t) =>
//         isPresentInSegment(t, segStart, segEnd)
//       );

//       const presentCount = presentInSegment.length || 1;

//       segments.push({ units: segUnits, count: presentCount });

//       const tenantPresent = presentInSegment.some(
//         (t) => Number(t.id) === numericTenantId
//       );

//       if (tenantPresent) {
//         share += (segUnits * rate) / presentCount;
//       }
//     }

//     return { share, segments };
//   };

//   const { share: finalEBAmount, segments: ebSegments } = calculateProportionalEBShare(
//     selectedTenant ? Number(selectedTenant.id) : null,
//     Number(finalPrev) || 0,
//     Number(finalCurr) || 0,
//     appliedEBRate,
//     roomTenants
//   );

//   const ebPayableAfterAdvance = isDailyStay
//     ? (hasFinalReading ? finalEBAmount - advanceEbCollected : 0)
//     : finalEBAmount;

//  const calculatedNetPayable = summary
//   ? summary.totalRentDue +
//     tenantEBDue +
//     ebPayableAfterAdvance +
//     maintenanceCharge +
//     extraRent -
//     summary.advancePaid
//     // registrationFees
//   : maintenanceCharge;

// const handleConfirmCheckout = async () => {
//   if (!selectedTenant) {
//     toast.error("Select tenant");
//     return;
//   }
//   if (!checkOutDate) {
//     toast.error("Check-Out Date is required");
//     return;
//   }
//   if (
//     selectedTenant.checkInDate &&
//     checkOutDate < String(selectedTenant.checkInDate).slice(0, 10)
//   ) {
//     toast.error("Check-Out Date cannot be before the Check-in Date");
//     return;
//   }
//   if (isAcRoom && acPrev && !acCurr) {
//     toast.error("AC Current Reading is required for AC room");
//     return;
//   }
//   if (!finalCurr) {
//     toast.error("Final EB Current Reading is required");
//     return;
//   }

//   try {
//     if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");
    
//     const ebAmountCharged = finalEBAmount;

//     await checkoutTenant(
//       selectedTenant.id,
//       finalCurr ? Number(finalCurr) : null,
//       isAcRoom && acCurr ? Number(acCurr) : null,
//       overrideNoticePeriod,
//       appliedEBRate,
//       ebAmountCharged,
//       checkOutDate
//     );

//     if (selectedTenant.bedId) {
//       await updateBedStatus(Number(selectedTenant.bedId), false);
//     }

//     toast.success(`${selectedTenant.name} checked out successfully`);

//     setSelectedTenantId("");
//     setCheckOutDate(getTodayISO());
//     setFinalPrev("");
//     setFinalCurr("");
//     setAcPrev("");
//     setAcCurr("");
//     setSummary(null);
//     setConfirmOpen(false);
//     setExtraDays("");
//     setRentPerDay("");
//     setUseManualRent(false);
//     setOverrideNoticePeriod(false);

//     await reload();
//   } catch (err: any) {
//     console.error("Checkout error:", err);
//     toast.error(err.message ?? "Checkout failed");
//   }
// };

//   const filteredTenants = tenants
//     .filter(
//       (t) =>
//         (t.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
//         (t.phone ?? "").includes(search)
//     )
//     .filter((t) => {
//       if (selectedBranch === "all") return true;
//       const room = rooms.find((r) => String(r.id) === String(t.roomId));
//       return room && String(room.unitId) === selectedBranch;
//     });

//   return (
//     <div>
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold tracking-tight">Tenant Check-Out</h1>
//         <p className="text-sm text-muted-foreground mt-1">
//           Controlled checkout with settlement summary
//         </p>
//       </div>

//       <PendingRentDialog
//         open={pendingRentDialogOpen}
//         onClose={() => setPendingRentDialogOpen(false)}
//         tenant={selectedTenant ?? null}
//         room={selectedRoom ?? null}
//         pendingRents={summary?.pendingRents ?? []}
//         advancePaid={summary?.advancePaid ?? 0}
//         maintenanceCharge={maintenanceCharge}
//       />

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-1">
//           <Card>
//             <CardHeader className="pb-3">
//               <CardTitle className="text-sm font-semibold">
//                 Select Tenant
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {isAdmin ? (
//                 <Select
//                   value={selectedBranch}
//                   onValueChange={(v) => setSelectedBranch(v)}
//                 >
//                   <SelectTrigger className="mb-3">
//                     <SelectValue placeholder="Select Branch" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All Branches</SelectItem>
//                     {branchOptions.map((b) => (
//                       <SelectItem key={b.id} value={String(b.id)}>
//                         {b.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               ) : (
//                 <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-foreground">
//                   <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
//                   {ownBranchName}
//                 </div>
//               )}

//               <div className="relative mb-3">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   className="pl-9"
//                   placeholder="Search Tenant..."
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                 />
//               </div>

//               <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
//                 {filteredTenants.map((t) => {
//                   const room = rooms.find(
//                     (r) => Number(r.id) === Number(t.roomId)
//                   );
//                   return (
//                     <button
//                       key={t.id.toString()}
//                       onClick={() => handleSelectTenant(t.id.toString())}
//                       className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all border ${
//                         Number(selectedTenantId) === Number(t.id)
//                           ? "bg-blue-100 text-blue-700 border-blue-300"
//                           : "bg-white text-gray-800 border-transparent hover:bg-gray-100"
//                       }`}
//                     >
//                       <div className="font-medium">
//                         {t.name}
//                         {t.tenantStay === "DAILY" && (
//                           <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
//                             Daily
//                           </span>
//                         )}
//                       </div>
//                       <div className="text-xs text-muted-foreground">
//                         {room?.roomNumber} · {t.phone}
//                       </div>
//                     </button>
//                   );
//                 })}
//                 {filteredTenants.length === 0 && (
//                   <p className="text-xs text-muted-foreground text-center py-4">
//                     No active tenants
//                   </p>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <div className="lg:col-span-2">
//           {!selectedTenant ? (
//             <Card>
//               <CardContent className="py-16 text-center text-muted-foreground">
//                 Select a tenant to proceed with checkout
//               </CardContent>
//             </Card>
//           ) : (
//             <div className="space-y-4">
//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-semibold">
//                     Tenant Info
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
//                   {[
//                     ["Name",        selectedTenant.name],
//                     [
//                       "Flat Number",
//                       selectedRoom?.flatName
//                         ? selectedRoom.flatName
//                         : selectedRoom?.flatId
//                           ? `Flat-${selectedRoom.flatId}`
//                           : "No Flat",
//                     ],
//                     ["Room",         selectedRoom?.roomNumber ?? "—"],
//                     ["Phone",        selectedTenant.phone],
//                     ["Check-in",     selectedTenant.checkInDate],
//                     ["Stay Type",    isDailyStay ? "Daily" : "Monthly"],
//                     ...(isDailyStay
//                       ? ([
//                           [
//                             "Days × Rate",
//                             `${selectedTenant.noOfDays ?? 0} × ₹${selectedTenant.amountPerDay ?? 0}`,
//                           ],
//                           ["Advance EB Amount", `₹${advanceEbCollected.toLocaleString()}`],
//                           ["Daily Stay Total",  `₹${dailyStayTotal.toLocaleString()}`],
//                         ] as [string, string][])
//                       : ([
//                           ["Monthly Rent", `₹${selectedTenant.monthlyRent}`],
//                         ] as [string, string][])),
//                     ["Advance Paid", `₹${selectedTenant.advance}`],
//                     ["Room Type",    isAcRoom ? "AC" : "Non-AC"],
//                   ].map(([label, value]) => (
//                     <div key={label}>
//                       <span className="text-muted-foreground">{label}: </span>
//                       <span className="font-medium">{value}</span>
//                     </div>
//                   ))}
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-semibold">
//                     Final EB Reading
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="grid grid-cols-2 gap-4">
//                     <div className="grid gap-1.5">
//                       <Label className="text-xs">Previous Reading</Label>
//                       <Input
//                         type="number"
//                         value={finalPrev}
//                         readOnly
//                         className="bg-muted"
//                       />
//                     </div>
//                     <div className="grid gap-1.5">
//                       <Label className="text-xs">Current Reading</Label>
//                       <Input
//                         type="number"
//                         value={finalCurr}
//                         required
//                         onChange={(e) => setFinalCurr(e.target.value)}
//                         placeholder="0"
//                       />
//                     </div>

//                     <div className="grid gap-1.5 mt-4">
//                       <Label className="text-xs">EB Rate Per Unit</Label>
//                       <Input
//                         type="number"
//                         step="0.01"
//                         value={ebRate}
//                         onChange={(e) => setEbRate(e.target.value)}
//                         placeholder="Enter EB Rate"
//                       />
//                       <p className="text-[11px] text-muted-foreground">
//                         Default Rate: ₹13 per unit
//                       </p>
//                     </div>
//                   </div>
//                   {hasFinalReading && (
//                     <p className="text-xs text-muted-foreground mt-2">
//                       Total Units: {finalEBUnits} · Total
//                       Amount: ₹{totalEBAmount.toLocaleString()}
//                       {ebSegments.length > 0 && (
//                         <>
//                           {" "}
//                           · {selectedTenant?.name ?? "This tenant"}'s share: ₹
//                           {Math.round(finalEBAmount).toLocaleString()}{" "}
//                           (
//                           {ebSegments
//                             .map((s) => `${s.units}u÷${s.count}`)
//                             .join(" + ")}
//                           )
//                         </>
//                       )}
//                     </p>
//                   )}

//                   {isDailyStay && (
//                     <p className="text-xs mt-1">
//                       <span className="text-muted-foreground">
//                         Advance EB collected at check-in: ₹
//                         {advanceEbCollected.toLocaleString()} ·{" "}
//                       </span>
//                       {hasFinalReading ? (
//                         <span
//                           className={
//                             ebPayableAfterAdvance > 0
//                               ? "font-medium text-destructive"
//                               : "font-medium text-success"
//                           }
//                         >
//                           {ebPayableAfterAdvance > 0
//                             ? `EB still to pay: ₹${Math.round(ebPayableAfterAdvance).toLocaleString()}`
//                             : `EB refundable: ₹${Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}`}
//                         </span>
//                       ) : (
//                         <span className="text-muted-foreground italic">
//                           Enter current reading to calculate
//                         </span>
//                       )}
//                     </p>
//                   )}
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-semibold">
//                     Settlement Summary
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-2.5 text-sm">
//                   <div className="flex justify-between items-center">
//                     <span className="text-muted-foreground">
//                       Pending Rent Records
//                     </span>
//                     <Badge
//                       onClick={() => setPendingRentDialogOpen(true)}
//                       className="cursor-pointer bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors rounded-md px-2 py-1 flex items-center gap-1"
//                     >
//                       {summary?.pendingRents?.length ?? 0}
//                       <ChevronRight className="h-3 w-3" />
//                     </Badge>
//                   </div>

//                   <div className="flex justify-between">
//                     <span className="text-muted-foreground">
//                       Total Pending Rent Due
//                     </span>
//                     <span className="font-medium">
//                       ₹{Math.round(summary?.totalRentDue ?? 0).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="flex justify-between">
//                     <span className="text-muted-foreground">
//                       Total Pending EB Due
//                     </span>
//                     <span className="font-medium">
//                       ₹{Math.round(tenantEBDue).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="flex justify-between items-center">
//                     <span className="text-muted-foreground">Maintenance</span>
//                     <div className="w-32">
//                       <Input
//                         type="number"
//                         value={maintenanceCharge}
//                         onChange={(e) => setMaintenanceCharge(Number(e.target.value) || 0)}
//                         className="h-8 text-right"
//                       />
//                     </div>
//                   </div>

//                   <div className="grid gap-2">
//                     <Label className="text-xs">Daily Basic Tenant Rent Days</Label>
//                     <Input
//                       type="number"
//                       placeholder="Daily Basic Tenant Rent Days"
//                       value={extraDays}
//                       onChange={(e) => setExtraDays(e.target.value)}
//                     />

//                     <div className="flex items-center gap-2">
//                       <input
//                         type="radio"
//                         checked={!useManualRent}
//                         onChange={() => setUseManualRent(false)}
//                       />
//                       <span className="text-xs">
//                         Auto Calculate
//                         {isDailyStay && Number(selectedTenant.amountPerDay ?? 0) > 0 && (
//                           <span className="text-muted-foreground">
//                             {" "}(₹{selectedTenant.amountPerDay}/day from check-in)
//                           </span>
//                         )}
//                       </span>
//                     </div>

//                     <div className="flex items-center gap-2">
//                       <input
//                         type="radio"
//                         checked={useManualRent}
//                         onChange={() => setUseManualRent(true)}
//                       />
//                       <span className="text-xs">Daily Basic Tenant Manual Rent Per Day</span>
//                     </div>

//                     {useManualRent && (
//                       <div className="grid gap-1">
//                         <Label className="text-xs">Daily Basic Tenant Rent Per Day</Label>
//                         <Input
//                           type="number"
//                           placeholder="Enter Daily Basic Tenant rent per day"
//                           value={rentPerDay}
//                           onChange={(e) => setRentPerDay(e.target.value)}
//                         />
//                       </div>
//                     )}

//                     {!useManualRent && extraDays && autoRentPerDay === 0 && (
//                       <p className="text-[11px] text-amber-600">
//                         No rent per day found for this tenant, room, or roommates —
//                         switch to "Daily Basic Tenant Manual Rent Per Day" or set a rent amount to
//                         auto-calculate extra rent.
//                       </p>
//                     )}

//                     {extraDays && (
//                       <div className="flex justify-between">
//                         <span className="text-muted-foreground">After Checkout Extra Rent</span>
//                         <span className="font-medium text-success">
//                           ₹{Math.round(extraRent).toLocaleString()}
//                         </span>
//                       </div>
//                     )}
//                   </div>

//                   <div className="flex justify-between">
//                     <span className="text-muted-foreground">After Checkout EB Value</span>
//                     <span className="font-medium">
//                       ₹{Math.round(finalEBAmount).toLocaleString()}
//                     </span>
//                   </div>

//                   {isDailyStay && (
//                     <>
//                       <div className="flex justify-between">
//                         <span className="text-muted-foreground">
//                           Advance EB Amount (paid at check-in)
//                         </span>
//                         <span className="font-medium text-success">
//                           ₹{advanceEbCollected.toLocaleString()}
//                         </span>
//                       </div>

//                       {hasFinalReading ? (
//                         <div className="flex justify-between">
//                           <span className="text-muted-foreground">
//                             {ebPayableAfterAdvance > 0
//                               ? "EB Balance to Pay"
//                               : "EB Refund"}
//                           </span>
//                           <span
//                             className={
//                               ebPayableAfterAdvance > 0
//                                 ? "font-medium text-destructive"
//                                 : "font-medium text-success"
//                             }
//                           >
//                             ₹{Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}
//                           </span>
//                         </div>
//                       ) : (
//                         <div className="flex justify-between">
//                           <span className="text-muted-foreground">
//                             EB Balance / Refund
//                           </span>
//                           <span className="text-xs italic text-muted-foreground">
//                             Pending reading entry
//                           </span>
//                         </div>
//                       )}
//                     </>
//                   )}

//                   <Separator />

//                   <div className="flex justify-between">
//                     <span className="text-muted-foreground">Advance Paid</span>
//                     <span className="font-medium text-success">
//                       ₹{(summary?.advancePaid ?? selectedTenant.advance ?? 0).toLocaleString()}
//                     </span>
//                   </div>


//                   <div className="flex justify-between">
//                     <span className="text-muted-foreground">Registration Fees</span>
//                     <span className="font-medium text-success">
//                       ₹{registrationFees.toLocaleString()}
//                     </span>
//                   </div>

//                   <Separator />

//                   <div className="flex justify-between text-base">
//                     <span className="font-semibold">
//                       {calculatedNetPayable > 0 ? "Balance to Pay" : "Refund Due"}
//                     </span>
//                     <span
//                       className={`font-bold ${
//                         calculatedNetPayable > 0
//                           ? "text-destructive"
//                           : "text-success"
//                       }`}
//                     >
//                       ₹{Math.round(Math.abs(calculatedNetPayable)).toLocaleString()}
//                     </span>
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* ── NEW: Check-Out Date card (sits above "Proceed to Check-Out") ── */}
//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-semibold">
//                     Check-Out Date
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="grid gap-1.5">
//                     <Label htmlFor="checkout-date" className="text-xs">
//                       Check-out Date
//                     </Label>
//                     <Input
//                       id="checkout-date"
//                       type="date"
//                       value={checkOutDate}
//                       min={
//                         selectedTenant.checkInDate
//                           ? String(selectedTenant.checkInDate).slice(0, 10)
//                           : undefined
//                       }
//                       onChange={(e) => setCheckOutDate(e.target.value)}
//                     />
//                     <p className="text-[11px] text-muted-foreground">
//                       Defaults to today. Change it if the tenant vacated on a different date.
//                     </p>
//                   </div>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardContent className="pt-5">
//                   <div className="grid gap-4">
//                     <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
//                       <Button
//                         variant="destructive"
//                         onClick={() => setConfirmOpen(true)}
//                       >
//                         <LogOut className="h-4 w-4 mr-2" /> Proceed to Check-Out
//                       </Button>
//                       <AlertDialogContent>
//                         <AlertDialogHeader>
//                           <AlertDialogTitle>Confirm Check-Out</AlertDialogTitle>
//                           <AlertDialogDescription>
//                             Are you sure you want to check out{" "}
//                             {selectedTenant.name} from room{" "}
//                             {selectedRoom?.roomNumber} on {checkOutDate}? This
//                             will mark the tenant as Checked-Out and free up the
//                             bed.
//                           </AlertDialogDescription>
//                         </AlertDialogHeader>

//                         {selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" && (
//                           <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
//                             <p>
//                               {selectedTenant.checkoutStatus === "NOTICE_ACTIVE"
//                                 ? `This tenant is still within their one-month notice period${
//                                     selectedTenant.remainingNoticeDays != null
//                                       ? ` (${selectedTenant.remainingNoticeDays} day(s) remaining)`
//                                       : ""
//                                   }.`
//                                 : "This tenant has not submitted a checkout notice yet."}{" "}
//                               Final checkout will be blocked unless you override it below.
//                             </p>
//                             <label className="flex items-center gap-2 cursor-pointer">
//                               <input
//                                 type="checkbox"
//                                 checked={overrideNoticePeriod}
//                                 onChange={(e) =>
//                                   setOverrideNoticePeriod(e.target.checked)
//                                 }
//                               />
//                               <span>
//                                 Override notice period and check out immediately
//                               </span>
//                             </label>
//                           </div>
//                         )}

//                         <AlertDialogFooter>
//                           <AlertDialogCancel>Cancel</AlertDialogCancel>
//                           <AlertDialogAction
//                             onClick={handleConfirmCheckout}
//                             disabled={
//                               selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" &&
//                               !overrideNoticePeriod
//                             }
//                           >
//                             Confirm Check-Out
//                           </AlertDialogAction>
//                         </AlertDialogFooter>
//                       </AlertDialogContent>
//                     </AlertDialog>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CheckoutPage;

























































































































































import { useEffect, useState, useRef, useMemo } from "react";
import {
  getRooms,
  getTenants,
  getCheckoutSummary,
  checkoutTenant,
  getUserRole,
  getEBReadings,
  updateBedStatus,
  getBranchId,
  getBranches,
  fetchAllPages,
  getBusinessModel,
} from "@/lib/store";


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
} from "@/components/ui/dialog";

import { Room, Tenant, Rent, EBReading, Branch, DEFAULT_EB_RATE, MONTHS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, Search, ChevronRight, Building2 } from "lucide-react";

// Today's date as YYYY-MM-DD in the user's LOCAL timezone (not UTC), so the
// date input defaults to the correct day.
const getTodayISO = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ─────────────────────────────────────────────────────────────────────
// Business-model (EB mode) helpers
// ─────────────────────────────────────────────────────────────────────
//   EXTRACT      -> meter-segment split (existing behaviour)
//   APPROX_ROOM  -> (room units x Approximate Room EB Rate) split by occupancy days
//   APPROX_FLAT  -> (Approximate Flat EB Amount) split by occupancy days
type EbMode = "EXTRACT" | "APPROX_ROOM" | "APPROX_FLAT";

interface BusinessModelLite {
  roomEbMode?: string | null;
  flatEbMode?: string | null;
  roomApproximateEbRate?: number | null;
  flatApproximateEbAmount?: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Parse "YYYY-MM-DD" (or an ISO string) as LOCAL midnight.
const parseLocalDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Days a tenant occupied within [monthStart, monthEnd]. Same convention as
 * the backend's occupancyDays():
 *  - already there on the 1st (check-in on/before the 1st, or unknown)
 *      -> counted from the 1st, inclusive                 (Aug 1  -> 31)
 *  - checked in mid-month -> check-in day itself NOT counted
 *                                                         (Aug 10 -> 21)
 *  - a check-out inside the month IS counted (inclusive end).
 */
const occupancyDaysInMonth = (
  checkIn: Date | null,
  checkOut: Date | null,
  monthStart: Date,
  monthEnd: Date
): number => {
  const alreadyThereOnFirst = !checkIn || checkIn.getTime() <= monthStart.getTime();
  const start = alreadyThereOnFirst ? monthStart : (checkIn as Date);
  const end =
    checkOut && checkOut.getTime() < monthEnd.getTime() ? checkOut : monthEnd;

  if (end.getTime() < start.getTime()) return 0;

  const days =
    Math.round((end.getTime() - start.getTime()) / DAY_MS) +
    (alreadyThereOnFirst ? 1 : 0);
  return Math.max(days, 0);
};

function splitPending(r: Rent): { rentPending: number; ebPending: number } {
  // Rent Due Model: the due amount for overdue days (₹0 under NO_DUE) is part
  // of what the tenant owes for the rent, so it is settled with the rent side
  // — payments cover rent + due first, then EB (same order as before).
  const rentAmt = (r.rentAmount ?? 0) + (r.dueAmount ?? 0);
  const ebAmt   = r.ebAmount   ?? 0;
  const paid    = r.paidAmount ?? 0;

  if (r.paymentStatus === "PAID") {
    return { rentPending: 0, ebPending: 0 };
  }

  if (r.paymentStatus === "PENDING") {
    return { rentPending: rentAmt, ebPending: ebAmt };
  }

  const rentPending = Math.max(rentAmt - paid, 0);
  const rentCovered = Math.min(paid, rentAmt);
  const ebPending   = Math.max(ebAmt - Math.max(paid - rentCovered, 0), 0);

  return { rentPending, ebPending };
}

interface PendingRentDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  room: Room | null;
  pendingRents: Rent[];
  advancePaid: number;
  maintenanceCharge: number;
}

const statusMeta: Record<
  string,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline" }
> = {
  PAID:    { label: "Paid",    variant: "default" },
  PARTIAL: { label: "Partial", variant: "secondary" },
  PENDING: { label: "Unpaid",  variant: "destructive" },
};

const PendingRentDialog = ({
  open,
  onClose,
  tenant,
  room,
  pendingRents,
  advancePaid,
  maintenanceCharge,
}: PendingRentDialogProps) => {
  if (!tenant) return null;

  const totalRentDue = pendingRents.reduce(
    (sum, r) => sum + splitPending(r).rentPending,
    0
  );

  const totalEBDue = pendingRents.reduce(
    (sum, r) => sum + splitPending(r).ebPending,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending Rent Records</DialogTitle>
        </DialogHeader>

        <div className="bg-muted rounded-md px-4 py-3 text-sm space-y-1 mb-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{tenant.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{tenant.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium">{room?.roomNumber ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in</span>
            <span className="font-medium">{tenant.checkInDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Records</span>
            <span className="font-medium">{pendingRents.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {pendingRents.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">
              No pending rent records
            </p>
          ) : (
            pendingRents.map((rent) => {
              const meta = statusMeta[rent.paymentStatus] ?? statusMeta["PENDING"];
              const monthLabel =
                MONTHS[(rent.rentMonth ?? 1) - 1] ?? `Month ${rent.rentMonth}`;
              const { rentPending, ebPending } = splitPending(rent);

              return (
                <div
                  key={rent.id}
                  className="border rounded-lg px-4 py-3 text-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {monthLabel} {rent.rentYear}
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Monthly Rent</span>
                    <span className="text-right font-medium text-foreground">
                      ₹{(rent.rentAmount ?? 0).toLocaleString()}
                    </span>

                    <span>EB Amount</span>
                    <span className="text-right font-medium text-foreground">
                      ₹{Math.round(rent.ebAmount ?? 0).toLocaleString()}
                    </span>

                    {(rent.dueAmount ?? 0) > 0 && (
                      <>
                        <span>
                          Due Amount ({rent.dueDays ?? 0} day{(rent.dueDays ?? 0) === 1 ? "" : "s"})
                        </span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(rent.dueAmount ?? 0).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentStatus === "PARTIAL" && (
                      <>
                        <span>Amount Paid</span>
                        <span className="text-right font-medium text-green-600">
                          ₹{(rent.paidAmount ?? 0).toLocaleString()}
                        </span>
                        <span>Rent Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(rentPending).toLocaleString()}
                        </span>
                        <span>EB Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(ebPending).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentStatus === "PENDING" && (
                      <>
                        <span>Total Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{(
                            (rent.rentAmount ?? 0) + (rent.ebAmount ?? 0) + (rent.dueAmount ?? 0)
                          ).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentDate && (
                      <>
                        <span>Due Date</span>
                        <span className="text-right font-medium text-foreground">
                          {rent.paymentDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {pendingRents.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rent Due</span>
                <span className="font-medium">
                  ₹{Math.round(totalRentDue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total EB Due</span>
                <span className="font-medium">
                  ₹{Math.round(totalEBDue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maintenance</span>
                <span className="font-medium">
                  ₹{maintenanceCharge.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advance Paid</span>
                <span className="font-medium text-green-600">
                  ₹{advancePaid.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>
                  {totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
                    ? "Total Due"
                    : "Refund Due"}
                </span>
                <span
                  className={
                    totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
                      ? "text-destructive"
                      : "text-green-600"
                  }
                >
                  ₹{Math.round(
                    Math.abs(totalRentDue + totalEBDue + maintenanceCharge - advancePaid)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};



const CheckoutPage = () => {
  const [rooms, setRooms]                         = useState<Room[]>([]);
  const [tenants, setTenants]                     = useState<Tenant[]>([]);
  const [allTenants, setAllTenants]                = useState<Tenant[]>([]);
  const [branches, setBranches]                   = useState<Branch[]>([]);
  const [selectedTenantId, setSelectedTenantId]   = useState<string>("");
  // Defaults to today; the user can edit it from the "Check-Out Date" card.
  const [checkOutDate, setCheckOutDate]           = useState<string>(getTodayISO());
  const [search, setSearch]                       = useState<string>("");
  const [confirmOpen, setConfirmOpen]             = useState<boolean>(false);
  const [pendingRentDialogOpen, setPendingRentDialogOpen] = useState(false);
  const [finalPrev, setFinalPrev]                 = useState<string>("");
  const [finalCurr, setFinalCurr]                 = useState<string>("");
  const [tenantEBDue, setTenantEBDue]             = useState<number>(0);
  const [extraDays, setExtraDays]                 = useState<string>("");
  const [selectedBranch, setSelectedBranch]       = useState(
    getUserRole() === "ADMIN" ? "all" : String(getBranchId() ?? "all")
  );
  // AC sub-meter readings (only used when the tenant's room is an AC room).
  const [acPrev, setAcPrev]                       = useState<string>("");
  const [acCurr, setAcCurr]                       = useState<string>("");
  const [useManualRent, setUseManualRent]         = useState(false);
  const [rentPerDay, setRentPerDay]               = useState<string>("");
  const [ebRate, setEbRate]                       = useState<string>(String(DEFAULT_EB_RATE || 13));
  // Per-checkout override of the hostel's Approximate Room EB Rate.
  // null = use the rate from the business model.
  const [approxRateOverride, setApproxRateOverride] = useState<string | null>(null);
  // Per-checkout override of the hostel's Approximate Flat EB Amount.
  // null = use the amount from the business model.
  const [approxFlatOverride, setApproxFlatOverride] = useState<string | null>(null);
  const [maintenanceCharge, setMaintenanceCharge] = useState<number>(1000);
  const [overrideNoticePeriod, setOverrideNoticePeriod] = useState<boolean>(false);
  const [meterScope, setMeterScope]               = useState<"room" | "flat">("flat");

  // The hostel's Business Model (EB mode selector). null = not configured or
  // not loadable -> Extract mode.
  const [businessModel, setBusinessModel]         = useState<BusinessModelLite | null>(null);
  // Why the business model could not be applied (shown to the user instead of
  // silently falling back to Extract).
  const [businessModelNote, setBusinessModelNote] = useState<string | null>(null);

  // Every EB reading fetched for the currently-selected tenant's checkout
  // flow. Kept around so calculateProportionalEBShare can look up each
  // roommate's own last billed reading.
  const [ebReadingsAll, setEbReadingsAll]         = useState<EBReading[]>([]);
  const [summary, setSummary] = useState<{
    pendingRents: Rent[];
    totalRentDue: number;
    advancePaid: number;
  } | null>(null);

  const role     = getUserRole();
  const branchId = getBranchId();
  const isAdmin  = role === "ADMIN";

  const reload = async () => {
    try {
      const [roomList, allTenantList, allBranches] = await Promise.all([
        fetchAllPages<Room>(getRooms, 10),
        fetchAllPages<Tenant>(getTenants, 10),
        fetchAllPages<Branch>(getBranches, 10),
      ]);

      const activeTenants = allTenantList.filter((t) => t.status === "Active");

      setAllTenants(allTenantList);

      const filteredRooms =
        role === "ADMIN"
          ? roomList
          : roomList.filter(
              (room) => String(room.unitId) === String(branchId)
            );

      const filteredTenants =
        role === "ADMIN"
          ? activeTenants
          : activeTenants.filter((tenant) =>
              filteredRooms.some(
                (room) => String(room.id) === String(tenant.roomId)
              )
            );

      const filteredBranches =
        role === "ADMIN"
          ? allBranches
          : allBranches.filter((b) => String(b.id) === String(branchId));

      setRooms(filteredRooms);
      setTenants(filteredTenants);
      setBranches(filteredBranches);
    } catch (err) {
      console.error("Reload error:", err);
      toast.error("Failed to load rooms or tenants");
    }
  };

  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, []);

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        name: b.unitName || `Branch ${b.id}`,
      })),
    [branches]
  );

  const ownBranchName = useMemo(() => {
    if (isAdmin) return null;
    return (
      branchOptions.find((b) => String(b.id) === String(branchId))?.name ??
      (branchId ? `Branch ${branchId}` : "—")
    );
  }, [isAdmin, branchOptions, branchId]);

  // The Business Model is configured per HOSTEL, not per branch/unit, so the
  // lookup key must be the hostel id. Resolution order:
  //   1. the room's branch (unit) -> its hostelId
  //   2. the tenant's own hostelId
  //   3. the logged-in user's hostelId (saved in session at login)
  const resolveHostelId = (room: Room | undefined, tenant: Tenant): number | null => {
    const fromBranch = branches.find(
      (b) => Number(b.id) === Number(room?.unitId)
    )?.hostelId;

    const raw =
      fromBranch ?? tenant.hostelId ?? sessionStorage.getItem("hostelId");
    if (raw == null || raw === "") return null;

    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // ───────────────────────────────────────────────────────────────────
  // AC PREVIOUS READING for a room.
  //
  // Same rule the EB Readings page uses for its AC "Previous" box
  // (getRoomStartingACReading):
  //   1. the AC current reading of the room's latest GENUINE EB entry
  //      (isCheckout !== true, highest id), then
  //   2. never lower than the highest AC reading any row (including
  //      checkout rows) has already recorded for the room — a meter
  //      can't go backwards, and a checkout's AC snapshot is real, then
  //   3. with no readings at all, fall back to the earliest AC join
  //      reading among the room's MONTHLY tenants, then the tenant's own.
  // AC readings are per ROOM even inside a shared-meter flat.
  // ───────────────────────────────────────────────────────────────────
  const computeAcPrevious = (
    roomId: number,
    selected: Tenant,
    readings: EBReading[],
    everyTenant: Tenant[]
  ): number => {
    const roomRows = readings.filter(
      (r) => r.roomId != null && Number(r.roomId) === Number(roomId)
    );

    const acFloor =
      roomRows.length > 0
        ? Math.max(...roomRows.map((r) => Number(r.acCurrentReading ?? 0)))
        : 0;

    const genuine = roomRows.filter((r: any) => r.isCheckout !== true);
    if (genuine.length > 0) {
      const latest = genuine.reduce((a, b) =>
        Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
      );
      return Math.max(Number(latest.acCurrentReading ?? 0), acFloor);
    }

    const roomMonthly = everyTenant.filter(
      (t) => Number(t.roomId) === Number(roomId) && t.tenantStay !== "DAILY"
    );
    const joins = roomMonthly
      .map((t) => Number((t as any).acJoinReading))
      .filter((v) => Number.isFinite(v) && v > 0);

    const joinFloor =
      joins.length > 0
        ? Math.min(...joins)
        : Number((selected as any).acJoinReading ?? 0) || 0;

    return Math.max(joinFloor, acFloor);
  };



  const handleSelectTenant = async (tenantId: string) => {
    try {
      setSelectedTenantId(tenantId);
      setSummary({ pendingRents: [], totalRentDue: 0, advancePaid: 0 });
      setTenantEBDue(0);
      setAcPrev("");
      setAcCurr("");
      setFinalPrev("");
      setFinalCurr("");
      setExtraDays("");
      setOverrideNoticePeriod(false);
      setMeterScope("flat");
      setCheckOutDate(getTodayISO());
      setBusinessModel(null);
      setBusinessModelNote(null);
      setApproxRateOverride(null);
      setApproxFlatOverride(null);

      const numericTenantId = Number(tenantId);
      const selected = tenants.find((t) => Number(t.id) === numericTenantId);
      if (!selected) return;

      setMaintenanceCharge(selected.tenantStay === "DAILY" ? 0 : 1000);

      const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
      const isAcRoom = room?.hostelType === "AC";

      // Load the hostel's Business Model so this page follows the same
      // Extract / Approximate mode the backend bills with.
      const hostelIdForModel = resolveHostelId(room, selected);
      if (hostelIdForModel == null) {
        setBusinessModel(null);
        setBusinessModelNote("Hostel could not be determined — using Extract mode.");
      } else {
        try {
          const bm = await getBusinessModel(hostelIdForModel);
          setBusinessModel((bm as BusinessModelLite) ?? null);
        } catch (bmErr: any) {
          const status = bmErr?.response?.status;
          console.warn("Business model not available, using Extract mode:", bmErr);
          setBusinessModel(null);
          if (status === 404) {
            // No model configured for this hostel yet -> plain Extract, no warning.
            setBusinessModelNote(null);
          } else if (status === 403) {
            setBusinessModelNote(
              "No access to this hostel's business model — using Extract mode."
            );
          } else {
            setBusinessModelNote(
              `Business model could not be loaded (${status ?? "network error"}) — using Extract mode.`
            );
          }
        }
      }

      const allReadings = await fetchAllPages<EBReading>(getEBReadings, 10);
      setEbReadingsAll(allReadings);

      if (isAcRoom) {
        // AC units stay per-room even inside a shared-meter flat, so this
        // is unaffected by the flat-vs-room split below.
        setAcPrev(
          String(
            computeAcPrevious(Number(selected.roomId), selected, allReadings, allTenants)
          )
        );
      }

      const joinReading = Number(selected.joinReading ?? 0);

      // A flat's EB meter is ONE physical meter shared by every room in
      // that flat, not one meter per room. "Previous" for a room that
      // belongs to a flat is the flat's own latest known meter value.
      if (room?.flatId != null) {
        const flatReadings = allReadings.filter(
          (r) => Number(r.flatId) === Number(room.flatId)
        );
        const roomIdsInFlat = new Set(
          rooms.filter((r) => Number(r.flatId) === Number(room.flatId)).map((r) => r.id)
        );
        const flatAllTenants = allTenants.filter(
          (t) => roomIdsInFlat.has(Number(t.roomId))
        );

        // Bulk entries (Add EB Reading page) settle every active tenant's
        // share in one shot — the latest one is a genuine "everyone is paid
        // up to here" floor.
        const bulkReadings = flatReadings.filter(
          (r: any) => r.isCheckout === false
        );

        let flatPrevious: number;
        if (bulkReadings.length > 0) {
          const highestBulk = Math.max(
            ...bulkReadings.map((r) => Number(r.currentReading ?? 0))
          );
          const activeFlatTenants = flatAllTenants.filter(
            (t) => String(t.status).toLowerCase() === "active"
          );
          const highestActiveJoin = activeFlatTenants.length > 0
            ? Math.max(...activeFlatTenants.map((t) => Number(t.joinReading ?? 0)))
            : 0;
          flatPrevious = Math.max(highestBulk, highestActiveJoin);
        } else if (flatReadings.length > 0) {
          flatPrevious = Math.min(
            ...flatReadings.map((r) => Number(r.previousReading ?? 0)),
            joinReading
          );
        } else if (flatAllTenants.length > 0) {
          const validFlatJoinReadings = flatAllTenants
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          flatPrevious = validFlatJoinReadings.length > 0
            ? Math.min(...validFlatJoinReadings, joinReading)
            : joinReading;
        } else {
          flatPrevious = joinReading;
        }

        setFinalPrev(String(flatPrevious));
      } else {
        const roomTenantsAll = allTenants.filter(
          (t) => Number(t.roomId) === Number(selected.roomId)
        );

        const roomReadingsForThisRoom = allReadings.filter(
          (r) => Number(r.roomId) === Number(selected.roomId)
        );

        const bulkRoomReadings = roomReadingsForThisRoom.filter(
          (r: any) => r.isCheckout === false
        );

        let roomPrevious: number;

        if (bulkRoomReadings.length > 0) {
          const highestBulk = Math.max(
            ...bulkRoomReadings.map((r) => Number(r.currentReading ?? 0))
          );
          const activeRoomTenants = roomTenantsAll.filter(
            (t) => String(t.status).toLowerCase() === "active"
          );
          const highestActiveJoin = activeRoomTenants.length > 0
            ? Math.max(...activeRoomTenants.map((t) => Number(t.joinReading ?? 0)))
            : 0;
          roomPrevious = Math.max(highestBulk, highestActiveJoin);
        } else if (roomReadingsForThisRoom.length > 0) {
          const validRoomJoinReadingsA = roomTenantsAll
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          roomPrevious = Math.min(
            ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
            ...(validRoomJoinReadingsA.length > 0 ? validRoomJoinReadingsA : [joinReading]),
            joinReading
          );
        } else if (roomTenantsAll.length > 0) {
          const validRoomJoinReadingsB = roomTenantsAll
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          roomPrevious = validRoomJoinReadingsB.length > 0
            ? Math.min(...validRoomJoinReadingsB, joinReading)
            : joinReading;
        } else {
          roomPrevious = joinReading;
        }

        setFinalPrev(String(roomPrevious));
      }

      const roomOwnReadings = allReadings.filter(
        (r) => Number(r.roomId) === Number(selected.roomId)
      );
      const flatReadings = room?.flatId
        ? allReadings.filter((r) => Number(r.flatId) === Number(room.flatId))
        : [];

      const usingFlatLevelReadings = !!room?.flatId;
      const relevantReadings = usingFlatLevelReadings
        ? (flatReadings.length > 0 ? flatReadings : roomOwnReadings)
        : roomOwnReadings;

      if (relevantReadings.length > 0) {
        setMeterScope(usingFlatLevelReadings ? "flat" : "room");
      }

      const checkout = await getCheckoutSummary(numericTenantId);

      const rents       = checkout?.pendingRents ?? [];
      const unpaidRents = rents.filter((r) => r.paymentStatus !== "PAID");

      const totalRentDue = unpaidRents.reduce(
        (sum, r) => sum + splitPending(r).rentPending,
        0
      );
      const totalEBDue = unpaidRents.reduce(
        (sum, r) => sum + splitPending(r).ebPending,
        0
      );

      setSummary({
        pendingRents: unpaidRents,
        totalRentDue,
        advancePaid: checkout?.advancePaid ?? selected.advance ?? 0,
      });

      setTenantEBDue(totalEBDue);
    } catch (error) {
      console.error("Checkout fetch error:", error);
      toast.error("Failed to fetch checkout data");
      const selected = tenants.find((t) => Number(t.id) === Number(tenantId));
      setSummary({
        pendingRents: [],
        totalRentDue: 0,
        advancePaid: selected?.advance ?? 0,
      });
    }
  };



  const selectedTenant = tenants.find(
    (t) => Number(t.id) === Number(selectedTenantId)
  );


  const selectedRoom = selectedTenant
    ? rooms.find((r) => Number(r.id) === Number(selectedTenant.roomId))
    : null;

  const registrationFees = Number(selectedTenant?.registrationFees ?? 0);

  const isDailyStay = selectedTenant?.tenantStay === "DAILY";

  const advanceEbCollected = isDailyStay
    ? Number(selectedTenant?.ebAmount ?? 0)
    : 0;

  const dailyStayTotal = isDailyStay
    ? Number(selectedTenant?.totalAmount ?? 0)
    : 0;


  const flatTenants = selectedRoom?.flatId
    ? allTenants.filter((t) => {
        const tenantRoom = rooms.find(
          (r) => Number(r.id) === Number(t.roomId)
        );
        return (
          tenantRoom &&
          Number(tenantRoom.flatId) === Number(selectedRoom.flatId)
        );
      })
    : [];

  const roomOnlyTenants = allTenants.filter(
    (t) => Number(t.roomId) === Number(selectedTenant?.roomId)
  );

  const roomTenants =
    meterScope === "room"
      ? roomOnlyTenants
      : flatTenants.length > 0
        ? flatTenants
        : roomOnlyTenants;

  const isAcRoom = selectedRoom?.hostelType === "AC";

  // AC sub-meter figures shown under the main reading for AC rooms.
  const hasAcReading =
    isAcRoom && acCurr !== "" && Number(acCurr) >= Number(acPrev || 0);
  const acUnits = hasAcReading ? Number(acCurr) - Number(acPrev || 0) : 0;
  const acInvalid =
    isAcRoom && acCurr !== "" && Number(acCurr) < Number(acPrev || 0);

  // ───────────────────────────────────────────────────────────────────
  // Which EB calculation applies to this tenant?
  //   • a room that belongs to a flat  -> flat mode  (flat amount)
  //   • a standalone room              -> room mode  (units x approx rate)
  // DAILY-stay tenants never take part in the monthly EB cycle, so they
  // always keep the existing Extract settlement (advance EB netting).
  // ───────────────────────────────────────────────────────────────────
  const approxRoomRate = Number(businessModel?.roomApproximateEbRate ?? 0);
  const approxFlatAmount = Number(businessModel?.flatApproximateEbAmount ?? 0);

  const ebMode: EbMode = (() => {
    if (!selectedTenant || !selectedRoom || isDailyStay || !businessModel) {
      return "EXTRACT";
    }
    if (selectedRoom.flatId != null) {
      return String(businessModel.flatEbMode).toUpperCase() === "APPROXIMATE" &&
        approxFlatAmount > 0
        ? "APPROX_FLAT"
        : "EXTRACT";
    }
    return String(businessModel.roomEbMode).toUpperCase() === "APPROXIMATE" &&
      approxRoomRate > 0
      ? "APPROX_ROOM"
      : "EXTRACT";
  })();

  const isApproximate = ebMode !== "EXTRACT";

  // The Flat EB amount actually used: the edited value for this check-out if
  // the user typed one, otherwise the hostel's Approximate Flat EB Amount.
  const approxFlatApplied =
    approxFlatOverride != null
      ? Math.max(Number(approxFlatOverride) || 0, 0)
      : approxFlatAmount;

  const tenantLastBilledReading = useMemo(() => {
    const map = new Map<number, number>();
    const meterFlatId = selectedRoom?.flatId ?? null;
    const meterRoomId = selectedRoom?.id ?? null;
    if (meterFlatId == null && meterRoomId == null) return map;

    ebReadingsAll.forEach((r: any) => {
      if (r.tenantId == null) return;
      const sameMeter = meterFlatId != null
        ? Number(r.flatId) === Number(meterFlatId)
        : Number(r.roomId) === Number(meterRoomId);
      if (!sameMeter) return;

      const val = Number(r.currentReading ?? 0);
      const key = Number(r.tenantId);
      const prevMax = map.get(key);
      if (prevMax == null || val > prevMax) map.set(key, val);
    });
    return map;
  }, [ebReadingsAll, selectedRoom]);

  // Parse as LOCAL midnight (a bare "YYYY-MM-DD" string would be parsed as
  // UTC and could land on the previous day in some timezones).
  const dateForCalc  = checkOutDate
    ? new Date(`${checkOutDate}T00:00:00`)
    : new Date();
  const daysInMonth  = new Date(
    dateForCalc.getFullYear(),
    dateForCalc.getMonth() + 1,
    0
  ).getDate();

  const effectiveMonthlyRent = useMemo(() => {
    const tenantRent = Number(selectedTenant?.monthlyRent ?? 0);
    if (tenantRent > 0) return tenantRent;

    const roomRent = Number((selectedRoom as any)?.monthlyRent ?? 0);
    if (roomRent > 0) return roomRent;

    const roommatePool = roomTenants.length > 0 ? roomTenants : flatTenants;
    const roommateRent = roommatePool
      .map((t) => Number(t.monthlyRent ?? 0))
      .find((r) => r > 0);

    return roommateRent ?? 0;
  }, [selectedTenant, selectedRoom, roomTenants, flatTenants]);

  // A DAILY tenant already has an explicit per-day rate on their record,
  // so "Auto Calculate" for extra days uses that directly.
  const autoRentPerDay = isDailyStay
    ? Number(selectedTenant?.amountPerDay ?? 0)
    : effectiveMonthlyRent / daysInMonth;

  const extraRent =
    selectedTenant && extraDays
      ? useManualRent
        ? Number(extraDays) * Number(rentPerDay || 0)
        : Math.round(autoRentPerDay * Number(extraDays))
      : 0;

  const hasFinalReading =
    !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

  const finalEBUnits = hasFinalReading
    ? Number(finalCurr) - Number(finalPrev)
    : 0;

  // In Approximate-Room mode the hostel's Approximate Room EB Rate replaces
  // the manually typed rate (this is also the rate sent to the backend).
  const overrideRateNum = approxRateOverride != null ? Number(approxRateOverride) : NaN;
  const approxRoomRateApplied =
    Number.isFinite(overrideRateNum) && overrideRateNum > 0
      ? overrideRateNum
      : approxRoomRate;
  const appliedEBRate  = ebMode === "APPROX_ROOM"
    ? approxRoomRateApplied
    : Number(ebRate || DEFAULT_EB_RATE || 13);
  const totalEBAmount  = finalEBUnits * appliedEBRate;

  // ───────────────────────────────────────────────────────────────────
  // NORMAL (main-meter) share — Extract mode.
  //
  // The split runs over the FULL main-meter units (e.g. 100 -> 190 = 90
  // units). AC units are NOT deducted from the main meter first: the AC
  // share is a separate charge that is ADDED on top (see calculateAcShare).
  // ───────────────────────────────────────────────────────────────────
  const calculateProportionalEBShare = (
    tenantId: number | null | undefined,
    prevReading: number,
    currReading: number,
    rate: number,
    occupants: Tenant[]
  ): { share: number; units: number; segments: { units: number; count: number }[] } => {
    if (!tenantId || !(currReading > prevReading) || occupants.length === 0) {
      return { share: 0, units: 0, segments: [] };
    }

    const numericTenantId = Number(tenantId);

    const isPresentInSegment = (
      t: Tenant,
      segStart: number,
      segEnd: number
    ): boolean => {
      const join = Number(t.joinReading);
      if (!Number.isFinite(join) || join > segStart) return false;

      const lastBilled = tenantLastBilledReading.get(Number(t.id));

      if (Number(t.id) === numericTenantId) {
        if (lastBilled != null && segEnd > lastBilled) return false;
        return currReading >= segEnd;
      }

      if (t.status === "Checked_Out") {
        const co = Number(t.checkoutReading);
        if (Number.isFinite(co)) {
          return co >= segEnd;
        }
        if (lastBilled != null) return segEnd <= lastBilled;
        return false;
      }
      if (lastBilled != null && segEnd > lastBilled) return false;
      return true;
    };

    const boundarySet = new Set<number>();
    occupants.forEach((t) => {
      const join = Number(t.joinReading);
      if (Number.isFinite(join) && join > prevReading && join < currReading) {
        boundarySet.add(join);
      }
      if (Number(t.id) !== numericTenantId) {
        const co = Number(t.checkoutReading);
        if (t.status === "Checked_Out" && Number.isFinite(co) && co > prevReading && co < currReading) {
          boundarySet.add(co);
        }
      }
      const lastBilled = tenantLastBilledReading.get(Number(t.id));
      if (lastBilled != null && lastBilled > prevReading && lastBilled < currReading) {
        boundarySet.add(lastBilled);
      }
    });

    const points = [
      prevReading,
      ...Array.from(boundarySet).sort((a, b) => a - b),
      currReading,
    ];

    let share = 0;
    let myUnits = 0;
    const segments: { units: number; count: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      const segUnits = segEnd - segStart;
      if (segUnits <= 0) continue;

      const presentInSegment = occupants.filter((t) =>
        isPresentInSegment(t, segStart, segEnd)
      );

      const presentCount = presentInSegment.length || 1;

      segments.push({ units: segUnits, count: presentCount });

      const tenantPresent = presentInSegment.some(
        (t) => Number(t.id) === numericTenantId
      );

      if (tenantPresent) {
        myUnits += segUnits / presentCount;
        share += (segUnits * rate) / presentCount;
      }
    }

    return { share, units: myUnits, segments };
  };

  // ───────────────────────────────────────────────────────────────────
  // AC share (Extract mode). The room's AC units are shared ONLY by the
  // tenants of that AC room, split by AC-meter segments (acJoinReading /
  // acCheckoutReading). Returns the selected tenant's AC UNITS. This is
  // charged IN ADDITION to the normal main-meter share.
  // ───────────────────────────────────────────────────────────────────
  const calculateAcShare = (): {
    units: number;
    segments: { units: number; count: number }[];
  } => {
    if (!isAcRoom || !selectedTenant || !hasAcReading || acUnits <= 0) {
      return { units: 0, segments: [] };
    }

    const acStart = Number(acPrev || 0);
    const acEnd = Number(acCurr);
    const selectedId = Number(selectedTenant.id);

    // Everyone who has lived in this AC room (monthly + daily headcount).
    const occupants = roomOnlyTenants;

    const acCheckoutOf = (t: Tenant): number | null => {
      const v = Number((t as any).acCheckoutReading);
      return Number.isFinite(v) && v > 0 ? v : null;
    };

    const isPresent = (t: Tenant, segStart: number, segEnd: number): boolean => {
      const join = Number((t as any).acJoinReading ?? 0);
      if (Number.isFinite(join) && join > segStart) return false;

      if (Number(t.id) === selectedId) return acEnd >= segEnd;

      if (t.status === "Checked_Out") {
        const co = acCheckoutOf(t);
        return co != null && co >= segEnd;
      }
      return true;
    };

    const pts = new Set<number>([acStart, acEnd]);
    occupants.forEach((t) => {
      const join = Number((t as any).acJoinReading ?? 0);
      if (Number.isFinite(join) && join > acStart && join < acEnd) pts.add(join);
      if (Number(t.id) !== selectedId && t.status === "Checked_Out") {
        const co = acCheckoutOf(t);
        if (co != null && co > acStart && co < acEnd) pts.add(co);
      }
    });
    const sorted = Array.from(pts).sort((a, b) => a - b);

    let units = 0;
    const segments: { units: number; count: number }[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const segStart = sorted[i];
      const segEnd = sorted[i + 1];
      const segUnits = segEnd - segStart;
      if (segUnits <= 0) continue;

      const present = occupants.filter((t) => isPresent(t, segStart, segEnd));
      const count = present.length || 1;
      segments.push({ units: segUnits, count });

      if (present.some((t) => Number(t.id) === selectedId)) {
        units += segUnits / count;
      }
    }

    return { units, segments };
  };

  // ───────────────────────────────────────────────────────────────────
  // Approximate (occupancy-days) share.
  //   perDay = total / sum(days);  share = myDays x perDay
  //   APPROX_ROOM total = room units x Approximate Room EB Rate (editable)
  //   APPROX_FLAT total = Approximate Flat EB Amount (editable)
  // Month = the month of the chosen Check-Out Date.
  // ───────────────────────────────────────────────────────────────────
  const calculateApproximateShare = (): {
    share: number;
    total: number;
    myDays: number;
    totalDays: number;
    monthLabel: string;
  } | null => {
    if (!isApproximate || !selectedTenant) return null;

    const checkOut = parseLocalDate(checkOutDate) ?? new Date();
    const monthStart = new Date(checkOut.getFullYear(), checkOut.getMonth(), 1);
    const monthEnd = new Date(checkOut.getFullYear(), checkOut.getMonth() + 1, 0);
    const monthLabel = `${MONTHS[checkOut.getMonth()] ?? checkOut.getMonth() + 1} ${checkOut.getFullYear()}`;

    const pool = (ebMode === "APPROX_FLAT" ? flatTenants : roomOnlyTenants)
      // DAILY-stay tenants are not part of the monthly EB split.
      .filter((t) => t.tenantStay !== "DAILY");

    // Make sure the tenant being checked out is always in the pool.
    const pooled = pool.some((t) => Number(t.id) === Number(selectedTenant.id))
      ? pool
      : [...pool, selectedTenant];

    let totalDays = 0;
    let myDays = 0;

    pooled.forEach((t) => {
      const isSelected = Number(t.id) === Number(selectedTenant.id);
      const checkIn = parseLocalDate(t.checkInDate as any);
      const tenantCheckOut = isSelected
        ? checkOut
        : parseLocalDate((t as any).checkOutDate);

      const days = occupancyDaysInMonth(checkIn, tenantCheckOut, monthStart, monthEnd);
      totalDays += days;
      if (isSelected) myDays = days;
    });

    const total =
      ebMode === "APPROX_FLAT"
        ? approxFlatApplied
        : hasFinalReading
          ? finalEBUnits * approxRoomRateApplied
          : 0;

    const share = totalDays > 0 ? (total * myDays) / totalDays : 0;

    return { share, total, myDays, totalDays, monthLabel };
  };

  const approx = calculateApproximateShare();

  const {
    share: extractShare,
    units: extractUnits,
    segments: extractSegments,
  } = calculateProportionalEBShare(
    selectedTenant ? Number(selectedTenant.id) : null,
    Number(finalPrev) || 0,
    Number(finalCurr) || 0,
    appliedEBRate,
    roomTenants
  );

  // AC part (AC rooms only): the tenant's AC units x rate — ADDED on top of
  // the normal share, never deducted from the main-meter units.
  const acShare = approx ? { units: 0, segments: [] } : calculateAcShare();
  const acShareAmount = acShare.units * appliedEBRate;

  // The tenant's EB share for this checkout, whichever mode applies.
  // Extract = normal share (full main-meter segments) + AC share (AC segments).
  const finalEBAmount = approx ? approx.share : extractShare + acShareAmount;
  // Total billed units for this tenant (normal + AC), Extract mode only.
  const finalEBBilledUnits = approx ? 0 : extractUnits + acShare.units;
  // Meter-segment breakdown only makes sense in Extract mode.
  const ebSegments = approx ? [] : extractSegments;
  const acSegments = approx ? [] : acShare.segments;

  const ebPayableAfterAdvance = isDailyStay
    ? (hasFinalReading ? finalEBAmount - advanceEbCollected : 0)
    : finalEBAmount;

  const calculatedNetPayable = summary
    ? summary.totalRentDue +
      tenantEBDue +
      ebPayableAfterAdvance +
      maintenanceCharge +
      extraRent -
      summary.advancePaid
    : maintenanceCharge;

  const handleConfirmCheckout = async () => {
    if (!selectedTenant) {
      toast.error("Select tenant");
      return;
    }
    if (!checkOutDate) {
      toast.error("Check-Out Date is required");
      return;
    }
    if (
      selectedTenant.checkInDate &&
      checkOutDate < String(selectedTenant.checkInDate).slice(0, 10)
    ) {
      toast.error("Check-Out Date cannot be before the Check-in Date");
      return;
    }
    if (isAcRoom && acCurr === "") {
      toast.error("AC Current Reading is required for AC room");
      return;
    }
    if (isAcRoom && Number(acCurr) < Number(acPrev || 0)) {
      toast.error("AC Current Reading cannot be less than AC Previous Reading");
      return;
    }
    if (!finalCurr) {
      toast.error("Final EB Current Reading is required");
      return;
    }

    try {
      if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

      const ebAmountCharged = finalEBAmount;

      await checkoutTenant(
        selectedTenant.id,
        finalCurr ? Number(finalCurr) : null,
        isAcRoom && acCurr !== "" ? Number(acCurr) : null,
        overrideNoticePeriod,
        appliedEBRate,
        ebAmountCharged,
        checkOutDate
      );

      if (selectedTenant.bedId) {
        await updateBedStatus(Number(selectedTenant.bedId), false);
      }

      toast.success(`${selectedTenant.name} checked out successfully`);

      setSelectedTenantId("");
      setCheckOutDate(getTodayISO());
      setFinalPrev("");
      setFinalCurr("");
      setAcPrev("");
      setAcCurr("");
      setSummary(null);
      setConfirmOpen(false);
      setExtraDays("");
      setRentPerDay("");
      setUseManualRent(false);
      setOverrideNoticePeriod(false);
      setBusinessModel(null);
      setBusinessModelNote(null);
      setApproxRateOverride(null);
      setApproxFlatOverride(null);

      await reload();
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message ?? "Checkout failed");
    }
  };

  const filteredTenants = tenants
    .filter(
      (t) =>
        (t.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.phone ?? "").includes(search)
    )
    .filter((t) => {
      if (selectedBranch === "all") return true;
      const room = rooms.find((r) => String(r.id) === String(t.roomId));
      return room && String(room.unitId) === selectedBranch;
    });

  const ebModeLabel =
    ebMode === "APPROX_ROOM"
      ? `Approximate Room · ₹${approxRoomRateApplied}/unit, split by occupancy days`
      : ebMode === "APPROX_FLAT"
        ? `Approximate Flat · ₹${approxFlatApplied.toLocaleString()}, split by occupancy days`
        : "Extract · exact meter units, split by meter segments";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tenant Check-Out</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controlled checkout with settlement summary
        </p>
      </div>

      <PendingRentDialog
        open={pendingRentDialogOpen}
        onClose={() => setPendingRentDialogOpen(false)}
        tenant={selectedTenant ?? null}
        room={selectedRoom ?? null}
        pendingRents={summary?.pendingRents ?? []}
        advancePaid={summary?.advancePaid ?? 0}
        maintenanceCharge={maintenanceCharge}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Select Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <Select
                  value={selectedBranch}
                  onValueChange={(v) => setSelectedBranch(v)}
                >
                  <SelectTrigger className="mb-3">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branchOptions.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  {ownBranchName}
                </div>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search Tenant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {filteredTenants.map((t) => {
                  const room = rooms.find(
                    (r) => Number(r.id) === Number(t.roomId)
                  );
                  return (
                    <button
                      key={t.id.toString()}
                      onClick={() => handleSelectTenant(t.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all border ${
                        Number(selectedTenantId) === Number(t.id)
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-gray-800 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium">
                        {t.name}
                        {t.tenantStay === "DAILY" && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                            Daily
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {room?.roomNumber} · {t.phone}
                      </div>
                    </button>
                  );
                })}
                {filteredTenants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No active tenants
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedTenant ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a tenant to proceed with checkout
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Tenant Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                  {[
                    ["Name",        selectedTenant.name],
                    [
                      "Flat Number",
                      selectedRoom?.flatName
                        ? selectedRoom.flatName
                        : selectedRoom?.flatId
                          ? `Flat-${selectedRoom.flatId}`
                          : "No Flat",
                    ],
                    ["Room",         selectedRoom?.roomNumber ?? "—"],
                    ["Phone",        selectedTenant.phone],
                    ["Check-in",     selectedTenant.checkInDate],
                    ["Stay Type",    isDailyStay ? "Daily" : "Monthly"],
                    ...(isDailyStay
                      ? ([
                          [
                            "Days × Rate",
                            `${selectedTenant.noOfDays ?? 0} × ₹${selectedTenant.amountPerDay ?? 0}`,
                          ],
                          ["Advance EB Amount", `₹${advanceEbCollected.toLocaleString()}`],
                          ["Daily Stay Total",  `₹${dailyStayTotal.toLocaleString()}`],
                        ] as [string, string][])
                      : ([
                          ["Monthly Rent", `₹${selectedTenant.monthlyRent}`],
                        ] as [string, string][])),
                    ["Advance Paid", `₹${selectedTenant.advance}`],
                    ["Room Type",    isAcRoom ? "AC" : "Non-AC"],
                    ["EB Mode",      businessModelNote ? `${ebModeLabel} (${businessModelNote})` : ebModeLabel],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Final EB Reading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Previous Reading</Label>
                      <Input
                        type="number"
                        value={finalPrev}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Current Reading</Label>
                      <Input
                        type="number"
                        value={finalCurr}
                        required
                        onChange={(e) => setFinalCurr(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    {/* ── AC SUB-METER (AC rooms only) ──
                        AC units are metered per ROOM, even inside a flat
                        whose main meter is shared. */}
                    {isAcRoom && (
                      <>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">AC Previous Reading</Label>
                          <Input
                            type="number"
                            value={acPrev}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">AC Current Reading</Label>
                          <Input
                            type="number"
                            value={acCurr}
                            required
                            onChange={(e) => setAcCurr(e.target.value)}
                            placeholder="0"
                            className={acInvalid ? "border-destructive" : undefined}
                          />
                          {acInvalid && (
                            <p className="text-[11px] text-destructive">
                              AC current reading cannot be less than AC previous reading.
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── EB RATE (Extract / Approx-Room)  or  FLAT EB AMOUNT (Approx-Flat) ──
                        Both are editable for this check-out. */}
                    <div className="grid gap-1.5 mt-4">
                      <Label className="text-xs">
                        {ebMode === "APPROX_FLAT" ? "Flat EB Amount (₹)" : "EB Rate Per Unit"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step={ebMode === "APPROX_FLAT" ? "1" : "0.01"}
                        value={
                          ebMode === "APPROX_FLAT"
                            ? (approxFlatOverride ?? String(approxFlatAmount))
                            : ebMode === "APPROX_ROOM"
                              ? (approxRateOverride ?? String(approxRoomRate))
                              : ebRate
                        }
                        onChange={(e) => {
                          if (ebMode === "APPROX_FLAT") setApproxFlatOverride(e.target.value);
                          else if (ebMode === "APPROX_ROOM") setApproxRateOverride(e.target.value);
                          else setEbRate(e.target.value);
                        }}
                        placeholder={ebMode === "APPROX_FLAT" ? "Enter Flat EB Amount" : "Enter EB Rate"}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {ebMode === "APPROX_ROOM"
                          ? `Defaults to the hostel's Approximate Room EB Rate (₹${approxRoomRate}/unit). You can change it for this check-out.`
                          : ebMode === "APPROX_FLAT"
                            ? `Defaults to the hostel's Approximate Flat EB Amount (₹${approxFlatAmount.toLocaleString()}). You can change it for this check-out.`
                            : "Default Rate: ₹13 per unit"}
                        {ebMode === "APPROX_ROOM" && approxRoomRateApplied !== approxRoomRate && (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() => setApproxRateOverride(null)}
                          >
                            Reset to ₹{approxRoomRate}
                          </button>
                        )}
                        {ebMode === "APPROX_FLAT" && approxFlatApplied !== approxFlatAmount && (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() => setApproxFlatOverride(null)}
                          >
                            Reset to ₹{approxFlatAmount.toLocaleString()}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] mt-3">
                    <span className="text-muted-foreground">EB Mode: </span>
                    <span className="font-medium">{ebModeLabel}</span>
                  </p>

                  {businessModelNote && (
                    <p className="text-[11px] mt-1 text-amber-600">
                      {businessModelNote}
                    </p>
                  )}

                  {/* Extract & Approximate-Room: need a final reading for units */}
                  {hasFinalReading && ebMode !== "APPROX_FLAT" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Total Units: {finalEBUnits} · Total
                      Amount: ₹{totalEBAmount.toLocaleString()}
                      {ebSegments.length > 0 && (
                        <>
                          {" "}
                          · {selectedTenant?.name ?? "This tenant"}'s share: ₹
                          {Math.round(finalEBAmount).toLocaleString()}{" "}
                          (
                          {ebSegments
                            .map((s) => `${s.units}u÷${s.count}`)
                            .join(" + ")}
                          {acSegments.length > 0 && (
                            <>
                              {" "}+ AC{" "}
                              {acSegments
                                .map((s) => `${s.units}u÷${s.count}`)
                                .join(" + ")}
                            </>
                          )}
                          {" "}= {Math.round(finalEBBilledUnits * 100) / 100} units × ₹{appliedEBRate}
                          )
                        </>
                      )}
                      {approx && (
                        <>
                          {" "}
                          · {selectedTenant?.name ?? "This tenant"}'s share: ₹
                          {Math.round(finalEBAmount).toLocaleString()}{" "}
                          ({approx.myDays}/{approx.totalDays} days, {approx.monthLabel})
                        </>
                      )}
                    </p>
                  )}

                  {/* AC sub-meter units for this room */}
                  {isAcRoom && hasAcReading && !approx && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AC Units: {acUnits} ({acPrev} → {acCurr}) · added on top of the
                      main-meter units · {selectedTenant?.name ?? "This tenant"}'s AC share:{" "}
                      {Math.round(acShare.units * 100) / 100} units = ₹
                      {Math.round(acShareAmount).toLocaleString()}
                    </p>
                  )}

                  {/* Approximate-Flat: flat amount, doesn't depend on the reading */}
                  {ebMode === "APPROX_FLAT" && approx && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Flat EB: ₹{approxFlatApplied.toLocaleString()} ·{" "}
                      {selectedTenant?.name ?? "This tenant"}'s share: ₹
                      {Math.round(finalEBAmount).toLocaleString()}{" "}
                      ({approx.myDays}/{approx.totalDays} days, {approx.monthLabel})
                    </p>
                  )}

                  {ebMode === "APPROX_ROOM" && !hasFinalReading && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Enter the current reading to calculate the room's EB units.
                    </p>
                  )}

                  {isDailyStay && (
                    <p className="text-xs mt-1">
                      <span className="text-muted-foreground">
                        Advance EB collected at check-in: ₹
                        {advanceEbCollected.toLocaleString()} ·{" "}
                      </span>
                      {hasFinalReading ? (
                        <span
                          className={
                            ebPayableAfterAdvance > 0
                              ? "font-medium text-destructive"
                              : "font-medium text-success"
                          }
                        >
                          {ebPayableAfterAdvance > 0
                            ? `EB still to pay: ₹${Math.round(ebPayableAfterAdvance).toLocaleString()}`
                            : `EB refundable: ₹${Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Enter current reading to calculate
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Settlement Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Pending Rent Records
                    </span>
                    <Badge
                      onClick={() => setPendingRentDialogOpen(true)}
                      className="cursor-pointer bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors rounded-md px-2 py-1 flex items-center gap-1"
                    >
                      {summary?.pendingRents?.length ?? 0}
                      <ChevronRight className="h-3 w-3" />
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Pending Rent Due
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(summary?.totalRentDue ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Pending EB Due
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(tenantEBDue).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Maintenance</span>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={maintenanceCharge}
                        onChange={(e) => setMaintenanceCharge(Number(e.target.value) || 0)}
                        className="h-8 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs">Daily Basic Tenant Rent Days</Label>
                    <Input
                      type="number"
                      placeholder="Daily Basic Tenant Rent Days"
                      value={extraDays}
                      onChange={(e) => setExtraDays(e.target.value)}
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!useManualRent}
                        onChange={() => setUseManualRent(false)}
                      />
                      <span className="text-xs">
                        Auto Calculate
                        {isDailyStay && Number(selectedTenant.amountPerDay ?? 0) > 0 && (
                          <span className="text-muted-foreground">
                            {" "}(₹{selectedTenant.amountPerDay}/day from check-in)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={useManualRent}
                        onChange={() => setUseManualRent(true)}
                      />
                      <span className="text-xs">Daily Basic Tenant Manual Rent Per Day</span>
                    </div>

                    {useManualRent && (
                      <div className="grid gap-1">
                        <Label className="text-xs">Daily Basic Tenant Rent Per Day</Label>
                        <Input
                          type="number"
                          placeholder="Enter Daily Basic Tenant rent per day"
                          value={rentPerDay}
                          onChange={(e) => setRentPerDay(e.target.value)}
                        />
                      </div>
                    )}

                    {!useManualRent && extraDays && autoRentPerDay === 0 && (
                      <p className="text-[11px] text-amber-600">
                        No rent per day found for this tenant, room, or roommates —
                        switch to "Daily Basic Tenant Manual Rent Per Day" or set a rent amount to
                        auto-calculate extra rent.
                      </p>
                    )}

                    {extraDays && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">After Checkout Extra Rent</span>
                        <span className="font-medium text-success">
                          ₹{Math.round(extraRent).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      After Checkout EB Value
                      {isApproximate && (
                        <span className="text-[11px]">
                          {" "}({ebMode === "APPROX_ROOM" ? "Approx. Room" : "Approx. Flat"})
                        </span>
                      )}
                      {!isApproximate && isAcRoom && hasAcReading && (
                        <span className="text-[11px]"> (main meter + AC)</span>
                      )}
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(finalEBAmount).toLocaleString()}
                    </span>
                  </div>

                  {isDailyStay && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Advance EB Amount (paid at check-in)
                        </span>
                        <span className="font-medium text-success">
                          ₹{advanceEbCollected.toLocaleString()}
                        </span>
                      </div>

                      {hasFinalReading ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {ebPayableAfterAdvance > 0
                              ? "EB Balance to Pay"
                              : "EB Refund"}
                          </span>
                          <span
                            className={
                              ebPayableAfterAdvance > 0
                                ? "font-medium text-destructive"
                                : "font-medium text-success"
                            }
                          >
                            ₹{Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            EB Balance / Refund
                          </span>
                          <span className="text-xs italic text-muted-foreground">
                            Pending reading entry
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advance Paid</span>
                    <span className="font-medium text-success">
                      ₹{(summary?.advancePaid ?? selectedTenant.advance ?? 0).toLocaleString()}
                    </span>
                  </div>


                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration Fees</span>
                    <span className="font-medium text-success">
                      ₹{registrationFees.toLocaleString()}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-base">
                    <span className="font-semibold">
                      {calculatedNetPayable > 0 ? "Balance to Pay" : "Refund Due"}
                    </span>
                    <span
                      className={`font-bold ${
                        calculatedNetPayable > 0
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      ₹{Math.round(Math.abs(calculatedNetPayable)).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ── Check-Out Date card (sits above "Proceed to Check-Out") ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Check-Out Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-1.5">
                    <Label htmlFor="checkout-date" className="text-xs">
                      Check-out Date
                    </Label>
                    <Input
                      id="checkout-date"
                      type="date"
                      value={checkOutDate}
                      min={
                        selectedTenant.checkInDate
                          ? String(selectedTenant.checkInDate).slice(0, 10)
                          : undefined
                      }
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Defaults to today. Change it if the tenant vacated on a different date.
                      {isApproximate && " In Approximate mode this date also sets the tenant's occupancy days."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="grid gap-4">
                    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmOpen(true)}
                      >
                        <LogOut className="h-4 w-4 mr-2" /> Proceed to Check-Out
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Check-Out</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to check out{" "}
                            {selectedTenant.name} from room{" "}
                            {selectedRoom?.roomNumber} on {checkOutDate}? This
                            will mark the tenant as Checked-Out and free up the
                            bed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        {selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                            <p>
                              {selectedTenant.checkoutStatus === "NOTICE_ACTIVE"
                                ? `This tenant is still within their one-month notice period${
                                    selectedTenant.remainingNoticeDays != null
                                      ? ` (${selectedTenant.remainingNoticeDays} day(s) remaining)`
                                      : ""
                                  }.`
                                : "This tenant has not submitted a checkout notice yet."}{" "}
                              Final checkout will be blocked unless you override it below.
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={overrideNoticePeriod}
                                onChange={(e) =>
                                  setOverrideNoticePeriod(e.target.checked)
                                }
                              />
                              <span>
                                Override notice period and check out immediately
                              </span>
                            </label>
                          </div>
                        )}

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleConfirmCheckout}
                            disabled={
                              selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" &&
                              !overrideNoticePeriod
                            }
                          >
                            Confirm Check-Out
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;