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
//   const [checkOutDate, setCheckOutDate]           = useState<string>("");
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

//       const numericTenantId = Number(tenantId);
//       const selected = tenants.find((t) => Number(t.id) === numericTenantId);
//       if (!selected) return;

//       const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
//       const isAcRoom = room?.hostelType === "AC";

//       const allReadings = await fetchAllPages<EBReading>(getEBReadings, 500);
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
//           flatPrevious = Math.min(
//             ...flatAllTenants.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else {
//           flatPrevious = joinReading;
//         }

//         setFinalPrev(String(flatPrevious));
//       } else {
//         // Standalone room, treated as a "flat of one" — same shared-meter
//         // anchoring as the flatId branch above, keyed on roomId instead
//         // of flatId.
//         //
//         // FIX (previous): this branch used to anchor "Previous" to
//         // whichever was HIGHEST among: the last recorded currentReading
//         // for the room, any active tenant's own join snapshot, or
//         // ANOTHER tenant's own individual checkout reading — the last
//         // input wrongly let a per-tenant checkout row advance the floor
//         // for the room's shared meter as a whole. That was corrected by
//         // switching to the bulk/isCheckout split below, mirroring the
//         // flat branch.
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
//           // No bulk save has ever settled this room as a group yet —
//           // true start of the billing window is the earliest
//           // previousReading ever recorded for it, never the latest and
//           // never another tenant's own individual checkout snapshot.
//           //
//           // FIX: this used to guard the floor with ONLY the currently
//           // selected tenant's own joinReading, on the assumption that
//           // whatever previousReading a saved row carried was already a
//           // safe-enough floor. It isn't — a saved row's previousReading
//           // just reflects whatever value happened to be typed in (or
//           // auto-filled) at save time, and that can itself sit ABOVE an
//           // earlier roommate's true join point. Concretely: Final 01
//           // joined this room at reading 100, Final 03 joined later at
//           // 180, and a reading row on file has previousReading=150 —
//           // MIN(150, Final 03's own join 180) = 150, silently dropping
//           // Final 01's 100→150 span from ever being billed to anyone.
//           // Now reaches back through EVERY tenant who has ever lived in
//           // this room (active or already checked out), not just the one
//           // currently being checked out — mirroring the "no readings at
//           // all" branch below, which already did this correctly.
//           roomPrevious = Math.min(
//             ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else if (roomTenantsAll.length > 0) {
//           // No room-level reading row exists yet at all — anchor to the
//           // earliest join reading among EVERYONE who has ever lived in
//           // this room (active or already checked out), so nobody's
//           // early consumption is silently dropped.
//           roomPrevious = Math.min(
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
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

//   // For each tenant, the highest currentReading ever saved for them
//   // specifically (any EBReading row tagged with their tenantId, in any
//   // room/flat). This exists because tenant.status/checkoutReading are
//   // NOT reliable signals of who has actually left a room's meter: the
//   // EB Readings page can record and "close out" a tenant's own reading
//   // for a room without ever touching their status or checkoutReading —
//   // that only happens via this Checkout page's own confirm step. A
//   // roommate who was closed out that way stays status:"Active" forever,
//   // and without this map they'd wrongly keep counting as "present" (and
//   // diluting the split) for every later checkout in the same room.
//   const tenantLastBilledReading = useMemo(() => {
//     const map = new Map<number, number>();
//     ebReadingsAll.forEach((r: any) => {
//       if (r.tenantId == null) return;
//       const val = Number(r.currentReading ?? 0);
//       const key = Number(r.tenantId);
//       const prevMax = map.get(key);
//       if (prevMax == null || val > prevMax) map.set(key, val);
//     });
//     return map;
//   }, [ebReadingsAll]);

//   const dateForCalc  = checkOutDate ? new Date(checkOutDate) : new Date();
//   const daysInMonth  = new Date(
//     dateForCalc.getFullYear(),
//     dateForCalc.getMonth() + 1,
//     0
//   ).getDate();

//   // FIX: for tenants who belong to a shared flat, tenant.monthlyRent can
//   // come through as 0/undefined depending on how the tenant record was
//   // created (rent may have been entered against the room/flat rather
//   // than the individual tenant). Falling back straight to that 0 broke
//   // "Auto Calculate" for After Checkout Extra Rent even though the
//   // "Manual Rent Per Day" path — which never reads monthlyRent — worked
//   // fine. Resolve a rent figure with a fallback chain instead of trusting
//   // selectedTenant.monthlyRent alone:
//   //   1) the tenant's own monthlyRent, if it's a real positive number
//   //   2) the room's monthlyRent, if the room carries one
//   //   3) any other roommate in the same flat/room who does have a
//   //      positive monthlyRent set (shared-rent flats often only store it
//   //      on one of the tenant records, or on whichever tenant checked in
//   //      first)
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

//   const extraRent =
//     selectedTenant && extraDays
//       ? useManualRent
//         ? Number(extraDays) * Number(rentPerDay || 0)
//         : Math.round(
//             (effectiveMonthlyRent / daysInMonth) * Number(extraDays)
//           )
//       : 0;

//   const finalEBUnits =
//     finalPrev && finalCurr && Number(finalCurr) >= Number(finalPrev)
//       ? Number(finalCurr) - Number(finalPrev)
//       : 0;

//   const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
//   const totalEBAmount  = finalEBUnits * appliedEBRate;

//   // Returns both the tenant's rupee share AND the per-segment breakdown
//   // (units and headcount used in each slice) so the UI can show exactly
//   // what math was applied, instead of a roster count that may not match
//   // what was actually used in the calculation.
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

//       if (Number(t.id) === numericTenantId) {
//         // The tenant being checked out right now is, by construction,
//         // present for every segment up to their own final reading.
//         return currReading >= segEnd;
//       }

//       // A roommate with their own saved billing checkpoint at or past
//       // this segment's start already had their consumption up to that
//       // point accounted for — either through a real checkout, or
//       // through a reading saved on the EB Readings page that never
//       // flipped their status/checkoutReading (a known gap: only this
//       // page's own confirm step does that). Either way, once a
//       // tenant-specific reading exists at/after this segment, they must
//       // not be re-counted as present here — this check runs BEFORE the
//       // status check below precisely because status can't be trusted
//       // alone.
//       const lastBilled = tenantLastBilledReading.get(Number(t.id));
//       if (lastBilled != null && lastBilled >= segStart) return false;

//       if (t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         // If we don't have a valid recorded exit point for this
//         // roommate, we cannot confirm they were present in this
//         // segment — but that must NOT fall back to assuming everyone
//         // who ever lived in the flat was present (see below).
//         if (!Number.isFinite(co)) return false;
//         return co >= segEnd;
//       }

//       // Still active (or has no checkout record because they haven't
//       // left), AND no billing checkpoint places them out of this
//       // segment -> present for the whole window.
//       return true;
//     };

//     const boundarySet = new Set<number>();
//     occupants.forEach((t) => {
//       const join = Number(t.joinReading);
//       if (Number.isFinite(join) && join > prevReading && join < currReading) {
//         boundarySet.add(join);
//       }
//       if (Number(t.id) !== numericTenantId && t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         if (Number.isFinite(co) && co > prevReading && co < currReading) {
//           boundarySet.add(co);
//         }
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

//       // Previously this fell back to `occupants.length` (the FULL
//       // historical roster of everyone who ever lived in the flat,
//       // including long-departed tenants) whenever presentInSegment came
//       // back empty. That silently corrupted the split from the 2nd/3rd
//       // checkout onward, once there was checked-out history for a
//       // missing/invalid checkoutReading to trip over. The tenant being
//       // checked out is always present in every segment up to their own
//       // reading, so an empty presentInSegment can only mean a data gap
//       // for THEM — the correct minimum is 1 (themselves), never the
//       // full roster.
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

//  const calculatedNetPayable = summary
//   ? summary.totalRentDue +
//     tenantEBDue +
//     finalEBAmount +
//     maintenanceCharge +
//     extraRent -
//     summary.advancePaid
//     // registrationFees
//   : maintenanceCharge;

//   const handleConfirmCheckout = async () => {
//     if (!selectedTenant) {
//       toast.error("Select tenant");
//       return;
//     }
//     if (isAcRoom && acPrev && !acCurr) {
//       toast.error("AC Current Reading is required for AC room");
//       return;
//     }
//     if (!finalCurr) {
//       toast.error("Final EB Current Reading is required");
//       return;
//     }

//     try {
//       if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

//       // NOTE: checkoutTenant() on the backend is responsible for writing
//       // the shared flat-level EB reading (one row per room in the flat,
//       // no tenantId attached) via resolveFlatSharedPreviousReading().
//       // Do NOT also write it here — doing so previously caused duplicate
//       // EB reading rows per checkout (one from the frontend, one from
//       // the backend), which corrupted getFlatStartingReading()'s view of
//       // the flat's meter history for subsequent checkouts and monthly
//       // Add EB Reading entries.
//       await checkoutTenant(
//         selectedTenant.id,
//         finalCurr ? Number(finalCurr) : null,
//         isAcRoom && acCurr ? Number(acCurr) : null,
//         overrideNoticePeriod,
//         appliedEBRate
//       );

//       if (selectedTenant.bedId) {
//         await updateBedStatus(Number(selectedTenant.bedId), false);
//       }

//       toast.success(`${selectedTenant.name} checked out successfully`);

//       setSelectedTenantId("");
//       setCheckOutDate("");
//       setFinalPrev("");
//       setFinalCurr("");
//       setAcPrev("");
//       setAcCurr("");
//       setSummary(null);
//       setConfirmOpen(false);
//       setExtraDays("");
//       setRentPerDay("");
//       setUseManualRent(false);
//       setOverrideNoticePeriod(false);

//       await reload();
//     } catch (err: any) {
//       console.error("Checkout error:", err);
//       toast.error(err.message ?? "Checkout failed");
//     }
//   };

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
//                       <div className="font-medium">{t.name}</div>
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
//                     ["Monthly Rent", `₹${selectedTenant.monthlyRent}`],
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
//                   {finalPrev &&
//                     finalCurr &&
//                     Number(finalCurr) >= Number(finalPrev) && (
//                       <p className="text-xs text-muted-foreground mt-2">
//                         Total Units: {Number(finalCurr) - Number(finalPrev)} · Total
//                         Amount: ₹{totalEBAmount.toLocaleString()}
//                         {ebSegments.length > 0 && (
//                           <>
//                             {" "}
//                             · {selectedTenant?.name ?? "This tenant"}'s share: ₹
//                             {Math.round(finalEBAmount).toLocaleString()}{" "}
//                             (
//                             {ebSegments
//                               .map((s) => `${s.units}u÷${s.count}`)
//                               .join(" + ")}
//                             )
//                           </>
//                         )}
//                       </p>
//                     )}
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
//                       <span className="text-xs">Auto Calculate</span>
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

//                     {!useManualRent && extraDays && effectiveMonthlyRent === 0 && (
//                       <p className="text-[11px] text-amber-600">
//                         No monthly rent found for this tenant, room, or roommates —
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
//                             {selectedRoom?.roomNumber}? This will mark the
//                             tenant as Checked-Out and free up the bed.
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
//   const [checkOutDate, setCheckOutDate]           = useState<string>("");
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
//           flatPrevious = Math.min(
//             ...flatAllTenants.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else {
//           flatPrevious = joinReading;
//         }

//         setFinalPrev(String(flatPrevious));
//       } else {
//         // Standalone room, treated as a "flat of one" — same shared-meter
//         // anchoring as the flatId branch above, keyed on roomId instead
//         // of flatId.
//         //
//         // FIX (previous): this branch used to anchor "Previous" to
//         // whichever was HIGHEST among: the last recorded currentReading
//         // for the room, any active tenant's own join snapshot, or
//         // ANOTHER tenant's own individual checkout reading — the last
//         // input wrongly let a per-tenant checkout row advance the floor
//         // for the room's shared meter as a whole. That was corrected by
//         // switching to the bulk/isCheckout split below, mirroring the
//         // flat branch.
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
//           // No bulk save has ever settled this room as a group yet —
//           // true start of the billing window is the earliest
//           // previousReading ever recorded for it, never the latest and
//           // never another tenant's own individual checkout snapshot.
//           //
//           // FIX: this used to guard the floor with ONLY the currently
//           // selected tenant's own joinReading, on the assumption that
//           // whatever previousReading a saved row carried was already a
//           // safe-enough floor. It isn't — a saved row's previousReading
//           // just reflects whatever value happened to be typed in (or
//           // auto-filled) at save time, and that can itself sit ABOVE an
//           // earlier roommate's true join point. Concretely: Final 01
//           // joined this room at reading 100, Final 03 joined later at
//           // 180, and a reading row on file has previousReading=150 —
//           // MIN(150, Final 03's own join 180) = 150, silently dropping
//           // Final 01's 100→150 span from ever being billed to anyone.
//           // Now reaches back through EVERY tenant who has ever lived in
//           // this room (active or already checked out), not just the one
//           // currently being checked out — mirroring the "no readings at
//           // all" branch below, which already did this correctly.
//           roomPrevious = Math.min(
//             ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else if (roomTenantsAll.length > 0) {
//           // No room-level reading row exists yet at all — anchor to the
//           // earliest join reading among EVERYONE who has ever lived in
//           // this room (active or already checked out), so nobody's
//           // early consumption is silently dropped.
//           roomPrevious = Math.min(
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
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

//   /* ── DAILY-stay settlement ────────────────────────────────────────
//      A DAILY tenant paid a flat total at check-in:
//         totalAmount = (noOfDays × amountPerDay) + Advance EB Amount
//      The Advance EB Amount is a PREPAYMENT against electricity, not a
//      charge — at checkout it is offset against whatever EB this tenant
//      actually consumed (their proportional share of the meter):

//         used EB 325, advance EB 150  →  175 still to pay
//         used EB 130, advance EB 235  →  105 refundable

//      So for a DAILY tenant the EB line that enters the final balance is
//      (share − advance EB), which may legitimately be negative. For a
//      MONTHLY tenant nothing changes: their share is charged in full and
//      advanceEbCollected stays 0. ── */
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

//   // For each tenant, the highest currentReading ever saved for them
//   // specifically (any EBReading row tagged with their tenantId, in any
//   // room/flat). This exists because tenant.status/checkoutReading are
//   // NOT reliable signals of who has actually left a room's meter: the
//   // EB Readings page can record and "close out" a tenant's own reading
//   // for a room without ever touching their status or checkoutReading —
//   // that only happens via this Checkout page's own confirm step. A
//   // roommate who was closed out that way stays status:"Active" forever,
//   // and without this map they'd wrongly keep counting as "present" (and
//   // diluting the split) for every later checkout in the same room.
//   const tenantLastBilledReading = useMemo(() => {
//     const map = new Map<number, number>();
//     ebReadingsAll.forEach((r: any) => {
//       if (r.tenantId == null) return;
//       const val = Number(r.currentReading ?? 0);
//       const key = Number(r.tenantId);
//       const prevMax = map.get(key);
//       if (prevMax == null || val > prevMax) map.set(key, val);
//     });
//     return map;
//   }, [ebReadingsAll]);

//   const dateForCalc  = checkOutDate ? new Date(checkOutDate) : new Date();
//   const daysInMonth  = new Date(
//     dateForCalc.getFullYear(),
//     dateForCalc.getMonth() + 1,
//     0
//   ).getDate();

//   // FIX: for tenants who belong to a shared flat, tenant.monthlyRent can
//   // come through as 0/undefined depending on how the tenant record was
//   // created (rent may have been entered against the room/flat rather
//   // than the individual tenant). Falling back straight to that 0 broke
//   // "Auto Calculate" for After Checkout Extra Rent even though the
//   // "Manual Rent Per Day" path — which never reads monthlyRent — worked
//   // fine. Resolve a rent figure with a fallback chain instead of trusting
//   // selectedTenant.monthlyRent alone:
//   //   1) the tenant's own monthlyRent, if it's a real positive number
//   //   2) a DAILY tenant's amountPerDay × days-in-month equivalent is NOT
//   //      used here — for a DAILY tenant the per-day rate itself is the
//   //      right figure, so it's handled directly in extraRent below
//   //   3) the room's monthlyRent, if the room carries one
//   //   4) any other roommate in the same flat/room who does have a
//   //      positive monthlyRent set (shared-rent flats often only store it
//   //      on one of the tenant records, or on whichever tenant checked in
//   //      first)
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

//   // FIX: "has a real final reading" must be its own explicit signal,
//   // never inferred from finalCurr coercing to 0. An EMPTY finalCurr
//   // ("no reading entered yet") and a genuine reading of 0 units used
//   // are not the same thing, and downstream advance-offset math must not
//   // treat them as if they were — see ebPayableAfterAdvance below.
//   const hasFinalReading =
//     !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

//   const finalEBUnits = hasFinalReading
//     ? Number(finalCurr) - Number(finalPrev)
//     : 0;

//   const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
//   const totalEBAmount  = finalEBUnits * appliedEBRate;

//   // Returns both the tenant's rupee share AND the per-segment breakdown
//   // (units and headcount used in each slice) so the UI can show exactly
//   // what math was applied, instead of a roster count that may not match
//   // what was actually used in the calculation.
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

//       if (Number(t.id) === numericTenantId) {
//         // The tenant being checked out right now is, by construction,
//         // present for every segment up to their own final reading.
//         return currReading >= segEnd;
//       }

//       // A roommate with their own saved billing checkpoint at or past
//       // this segment's start already had their consumption up to that
//       // point accounted for — either through a real checkout, or
//       // through a reading saved on the EB Readings page that never
//       // flipped their status/checkoutReading (a known gap: only this
//       // page's own confirm step does that). Either way, once a
//       // tenant-specific reading exists at/after this segment, they must
//       // not be re-counted as present here — this check runs BEFORE the
//       // status check below precisely because status can't be trusted
//       // alone.
//       const lastBilled = tenantLastBilledReading.get(Number(t.id));
//       if (lastBilled != null && lastBilled >= segStart) return false;

//       if (t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         // If we don't have a valid recorded exit point for this
//         // roommate, we cannot confirm they were present in this
//         // segment — but that must NOT fall back to assuming everyone
//         // who ever lived in the flat was present (see below).
//         if (!Number.isFinite(co)) return false;
//         return co >= segEnd;
//       }

//       // Still active (or has no checkout record because they haven't
//       // left), AND no billing checkpoint places them out of this
//       // segment -> present for the whole window.
//       return true;
//     };

//     const boundarySet = new Set<number>();
//     occupants.forEach((t) => {
//       const join = Number(t.joinReading);
//       if (Number.isFinite(join) && join > prevReading && join < currReading) {
//         boundarySet.add(join);
//       }
//       if (Number(t.id) !== numericTenantId && t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         if (Number.isFinite(co) && co > prevReading && co < currReading) {
//           boundarySet.add(co);
//         }
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

//       // Previously this fell back to `occupants.length` (the FULL
//       // historical roster of everyone who ever lived in the flat,
//       // including long-departed tenants) whenever presentInSegment came
//       // back empty. That silently corrupted the split from the 2nd/3rd
//       // checkout onward, once there was checked-out history for a
//       // missing/invalid checkoutReading to trip over. The tenant being
//       // checked out is always present in every segment up to their own
//       // reading, so an empty presentInSegment can only mean a data gap
//       // for THEM — the correct minimum is 1 (themselves), never the
//       // full roster.
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

//   // What actually lands in the balance for the EB consumed during this
//   // stay. DAILY: share minus the advance EB already collected (negative
//   // = refundable). MONTHLY: the share in full, unchanged.
//   //
//   // FIX: this must be gated on hasFinalReading. Previously, with
//   // finalCurr empty, finalEBAmount correctly came back as 0 ("no usage
//   // yet"), but this line still subtracted the full advanceEbCollected
//   // from that 0 — producing a large negative number that the UI then
//   // displayed as a bogus "EB Refund" before any current reading had
//   // even been entered. When there's no final reading yet, there is
//   // nothing to offset against the advance, so this must be 0, not
//   // "0 - advance".
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

//   const handleConfirmCheckout = async () => {
//     if (!selectedTenant) {
//       toast.error("Select tenant");
//       return;
//     }
//     if (isAcRoom && acPrev && !acCurr) {
//       toast.error("AC Current Reading is required for AC room");
//       return;
//     }
//     if (!finalCurr) {
//       toast.error("Final EB Current Reading is required");
//       return;
//     }

//     try {
//       if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

//       // NOTE: checkoutTenant() on the backend is responsible for writing
//       // the shared flat-level EB reading (one row per room in the flat,
//       // no tenantId attached) via resolveFlatSharedPreviousReading().
//       // Do NOT also write it here — doing so previously caused duplicate
//       // EB reading rows per checkout (one from the frontend, one from
//       // the backend), which corrupted getFlatStartingReading()'s view of
//       // the flat's meter history for subsequent checkouts and monthly
//       // Add EB Reading entries.
//       await checkoutTenant(
//         selectedTenant.id,
//         finalCurr ? Number(finalCurr) : null,
//         isAcRoom && acCurr ? Number(acCurr) : null,
//         overrideNoticePeriod,
//         appliedEBRate
//       );

//       if (selectedTenant.bedId) {
//         await updateBedStatus(Number(selectedTenant.bedId), false);
//       }

//       toast.success(`${selectedTenant.name} checked out successfully`);

//       setSelectedTenantId("");
//       setCheckOutDate("");
//       setFinalPrev("");
//       setFinalCurr("");
//       setAcPrev("");
//       setAcCurr("");
//       setSummary(null);
//       setConfirmOpen(false);
//       setExtraDays("");
//       setRentPerDay("");
//       setUseManualRent(false);
//       setOverrideNoticePeriod(false);

//       await reload();
//     } catch (err: any) {
//       console.error("Checkout error:", err);
//       toast.error(err.message ?? "Checkout failed");
//     }
//   };

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
//                             {selectedRoom?.roomNumber}? This will mark the
//                             tenant as Checked-Out and free up the bed.
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
//   const [checkOutDate, setCheckOutDate]           = useState<string>("");
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
//   // Initial value before any tenant is selected; handleSelectTenant
//   // resets this per-tenant based on stay type (0 for DAILY, 1000 for
//   // MONTHLY) once a tenant is picked.
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

//       const numericTenantId = Number(tenantId);
//       const selected = tenants.find((t) => Number(t.id) === numericTenantId);
//       if (!selected) return;

//       // Maintenance defaults differ by stay type: DAILY tenants don't
//       // carry a monthly maintenance charge (it's baked into their daily
//       // rate / not applicable), while MONTHLY tenants default to ₹1000.
//       // Front-desk staff can still override this manually per checkout.
//       setMaintenanceCharge(selected.tenantStay === "DAILY" ? 0 : 1000);

//       const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
//       const isAcRoom = room?.hostelType === "AC";

//       const allReadings = await fetchAllPages<EBReading>(getEBReadings, 500);
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
//           flatPrevious = Math.min(
//             ...flatAllTenants.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else {
//           flatPrevious = joinReading;
//         }

//         setFinalPrev(String(flatPrevious));
//       } else {
//         // Standalone room, treated as a "flat of one" — same shared-meter
//         // anchoring as the flatId branch above, keyed on roomId instead
//         // of flatId.
//         //
//         // FIX (previous): this branch used to anchor "Previous" to
//         // whichever was HIGHEST among: the last recorded currentReading
//         // for the room, any active tenant's own join snapshot, or
//         // ANOTHER tenant's own individual checkout reading — the last
//         // input wrongly let a per-tenant checkout row advance the floor
//         // for the room's shared meter as a whole. That was corrected by
//         // switching to the bulk/isCheckout split below, mirroring the
//         // flat branch.
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
//           // No bulk save has ever settled this room as a group yet —
//           // true start of the billing window is the earliest
//           // previousReading ever recorded for it, never the latest and
//           // never another tenant's own individual checkout snapshot.
//           //
//           // FIX: this used to guard the floor with ONLY the currently
//           // selected tenant's own joinReading, on the assumption that
//           // whatever previousReading a saved row carried was already a
//           // safe-enough floor. It isn't — a saved row's previousReading
//           // just reflects whatever value happened to be typed in (or
//           // auto-filled) at save time, and that can itself sit ABOVE an
//           // earlier roommate's true join point. Concretely: Final 01
//           // joined this room at reading 100, Final 03 joined later at
//           // 180, and a reading row on file has previousReading=150 —
//           // MIN(150, Final 03's own join 180) = 150, silently dropping
//           // Final 01's 100→150 span from ever being billed to anyone.
//           // Now reaches back through EVERY tenant who has ever lived in
//           // this room (active or already checked out), not just the one
//           // currently being checked out — mirroring the "no readings at
//           // all" branch below, which already did this correctly.
//           roomPrevious = Math.min(
//             ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
//         } else if (roomTenantsAll.length > 0) {
//           // No room-level reading row exists yet at all — anchor to the
//           // earliest join reading among EVERYONE who has ever lived in
//           // this room (active or already checked out), so nobody's
//           // early consumption is silently dropped.
//           roomPrevious = Math.min(
//             ...roomTenantsAll.map((t) => Number(t.joinReading ?? joinReading)),
//             joinReading
//           );
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

//   /* ── DAILY-stay settlement ────────────────────────────────────────
//      A DAILY tenant paid a flat total at check-in:
//         totalAmount = (noOfDays × amountPerDay) + Advance EB Amount
//      The Advance EB Amount is a PREPAYMENT against electricity, not a
//      charge — at checkout it is offset against whatever EB this tenant
//      actually consumed (their proportional share of the meter):

//         used EB 325, advance EB 150  →  175 still to pay
//         used EB 130, advance EB 235  →  105 refundable

//      So for a DAILY tenant the EB line that enters the final balance is
//      (share − advance EB), which may legitimately be negative. For a
//      MONTHLY tenant nothing changes: their share is charged in full and
//      advanceEbCollected stays 0. ── */
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

//   // For each tenant, the highest currentReading ever saved for them
//   // specifically (any EBReading row tagged with their tenantId, in any
//   // room/flat). This exists because tenant.status/checkoutReading are
//   // NOT reliable signals of who has actually left a room's meter: the
//   // EB Readings page can record and "close out" a tenant's own reading
//   // for a room without ever touching their status or checkoutReading —
//   // that only happens via this Checkout page's own confirm step. A
//   // roommate who was closed out that way stays status:"Active" forever,
//   // and without this map they'd wrongly keep counting as "present" (and
//   // diluting the split) for every later checkout in the same room.
//   const tenantLastBilledReading = useMemo(() => {
//     const map = new Map<number, number>();
//     ebReadingsAll.forEach((r: any) => {
//       if (r.tenantId == null) return;
//       const val = Number(r.currentReading ?? 0);
//       const key = Number(r.tenantId);
//       const prevMax = map.get(key);
//       if (prevMax == null || val > prevMax) map.set(key, val);
//     });
//     return map;
//   }, [ebReadingsAll]);

//   const dateForCalc  = checkOutDate ? new Date(checkOutDate) : new Date();
//   const daysInMonth  = new Date(
//     dateForCalc.getFullYear(),
//     dateForCalc.getMonth() + 1,
//     0
//   ).getDate();

//   // FIX: for tenants who belong to a shared flat, tenant.monthlyRent can
//   // come through as 0/undefined depending on how the tenant record was
//   // created (rent may have been entered against the room/flat rather
//   // than the individual tenant). Falling back straight to that 0 broke
//   // "Auto Calculate" for After Checkout Extra Rent even though the
//   // "Manual Rent Per Day" path — which never reads monthlyRent — worked
//   // fine. Resolve a rent figure with a fallback chain instead of trusting
//   // selectedTenant.monthlyRent alone:
//   //   1) the tenant's own monthlyRent, if it's a real positive number
//   //   2) a DAILY tenant's amountPerDay × days-in-month equivalent is NOT
//   //      used here — for a DAILY tenant the per-day rate itself is the
//   //      right figure, so it's handled directly in extraRent below
//   //   3) the room's monthlyRent, if the room carries one
//   //   4) any other roommate in the same flat/room who does have a
//   //      positive monthlyRent set (shared-rent flats often only store it
//   //      on one of the tenant records, or on whichever tenant checked in
//   //      first)
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

//   // FIX: "has a real final reading" must be its own explicit signal,
//   // never inferred from finalCurr coercing to 0. An EMPTY finalCurr
//   // ("no reading entered yet") and a genuine reading of 0 units used
//   // are not the same thing, and downstream advance-offset math must not
//   // treat them as if they were — see ebPayableAfterAdvance below.
//   const hasFinalReading =
//     !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

//   const finalEBUnits = hasFinalReading
//     ? Number(finalCurr) - Number(finalPrev)
//     : 0;

//   const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
//   const totalEBAmount  = finalEBUnits * appliedEBRate;

//   // Returns both the tenant's rupee share AND the per-segment breakdown
//   // (units and headcount used in each slice) so the UI can show exactly
//   // what math was applied, instead of a roster count that may not match
//   // what was actually used in the calculation.
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

//       if (Number(t.id) === numericTenantId) {
//         // The tenant being checked out right now is, by construction,
//         // present for every segment up to their own final reading.
//         return currReading >= segEnd;
//       }

//       // A roommate with their own saved billing checkpoint at or past
//       // this segment's start already had their consumption up to that
//       // point accounted for — either through a real checkout, or
//       // through a reading saved on the EB Readings page that never
//       // flipped their status/checkoutReading (a known gap: only this
//       // page's own confirm step does that). Either way, once a
//       // tenant-specific reading exists at/after this segment, they must
//       // not be re-counted as present here — this check runs BEFORE the
//       // status check below precisely because status can't be trusted
//       // alone.
//       const lastBilled = tenantLastBilledReading.get(Number(t.id));
//       if (lastBilled != null && lastBilled >= segStart) return false;

//       if (t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         // If we don't have a valid recorded exit point for this
//         // roommate, we cannot confirm they were present in this
//         // segment — but that must NOT fall back to assuming everyone
//         // who ever lived in the flat was present (see below).
//         if (!Number.isFinite(co)) return false;
//         return co >= segEnd;
//       }

//       // Still active (or has no checkout record because they haven't
//       // left), AND no billing checkpoint places them out of this
//       // segment -> present for the whole window.
//       return true;
//     };

//     const boundarySet = new Set<number>();
//     occupants.forEach((t) => {
//       const join = Number(t.joinReading);
//       if (Number.isFinite(join) && join > prevReading && join < currReading) {
//         boundarySet.add(join);
//       }
//       if (Number(t.id) !== numericTenantId && t.status === "Checked_Out") {
//         const co = Number(t.checkoutReading);
//         if (Number.isFinite(co) && co > prevReading && co < currReading) {
//           boundarySet.add(co);
//         }
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

//       // Previously this fell back to `occupants.length` (the FULL
//       // historical roster of everyone who ever lived in the flat,
//       // including long-departed tenants) whenever presentInSegment came
//       // back empty. That silently corrupted the split from the 2nd/3rd
//       // checkout onward, once there was checked-out history for a
//       // missing/invalid checkoutReading to trip over. The tenant being
//       // checked out is always present in every segment up to their own
//       // reading, so an empty presentInSegment can only mean a data gap
//       // for THEM — the correct minimum is 1 (themselves), never the
//       // full roster.
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

//   // What actually lands in the balance for the EB consumed during this
//   // stay. DAILY: share minus the advance EB already collected (negative
//   // = refundable). MONTHLY: the share in full, unchanged.
//   //
//   // FIX: this must be gated on hasFinalReading. Previously, with
//   // finalCurr empty, finalEBAmount correctly came back as 0 ("no usage
//   // yet"), but this line still subtracted the full advanceEbCollected
//   // from that 0 — producing a large negative number that the UI then
//   // displayed as a bogus "EB Refund" before any current reading had
//   // even been entered. When there's no final reading yet, there is
//   // nothing to offset against the advance, so this must be 0, not
//   // "0 - advance".
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

//   const handleConfirmCheckout = async () => {
//     if (!selectedTenant) {
//       toast.error("Select tenant");
//       return;
//     }
//     if (isAcRoom && acPrev && !acCurr) {
//       toast.error("AC Current Reading is required for AC room");
//       return;
//     }
//     if (!finalCurr) {
//       toast.error("Final EB Current Reading is required");
//       return;
//     }

//     try {
//       if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

//       // NOTE: checkoutTenant() on the backend is responsible for writing
//       // the shared flat-level EB reading (one row per room in the flat,
//       // no tenantId attached) via resolveFlatSharedPreviousReading().
//       // Do NOT also write it here — doing so previously caused duplicate
//       // EB reading rows per checkout (one from the frontend, one from
//       // the backend), which corrupted getFlatStartingReading()'s view of
//       // the flat's meter history for subsequent checkouts and monthly
//       // Add EB Reading entries.
//       await checkoutTenant(
//         selectedTenant.id,
//         finalCurr ? Number(finalCurr) : null,
//         isAcRoom && acCurr ? Number(acCurr) : null,
//         overrideNoticePeriod,
//         appliedEBRate
//       );

//       if (selectedTenant.bedId) {
//         await updateBedStatus(Number(selectedTenant.bedId), false);
//       }

//       toast.success(`${selectedTenant.name} checked out successfully`);

//       setSelectedTenantId("");
//       setCheckOutDate("");
//       setFinalPrev("");
//       setFinalCurr("");
//       setAcPrev("");
//       setAcCurr("");
//       setSummary(null);
//       setConfirmOpen(false);
//       setExtraDays("");
//       setRentPerDay("");
//       setUseManualRent(false);
//       setOverrideNoticePeriod(false);

//       await reload();
//     } catch (err: any) {
//       console.error("Checkout error:", err);
//       toast.error(err.message ?? "Checkout failed");
//     }
//   };

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
//                         className="bg-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                         className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                         className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                         value={maintenanceCharge === 0 ? "" : maintenanceCharge}
//                         onFocus={(e) => e.target.select()}
//                         onChange={(e) =>
//                           setMaintenanceCharge(
//                             e.target.value === "" ? 0 : Number(e.target.value) || 0
//                           )
//                         }
//                         placeholder="0"
//                         className="h-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                       className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                           className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
//                             {selectedRoom?.roomNumber}? This will mark the
//                             tenant as Checked-Out and free up the bed.
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

function splitPending(r: Rent): { rentPending: number; ebPending: number } {
  const rentAmt = r.rentAmount ?? 0;
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
                            (rent.rentAmount ?? 0) + (rent.ebAmount ?? 0)
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
  const [checkOutDate, setCheckOutDate]           = useState<string>("");
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
  const [acPrev, setAcPrev]                       = useState<string>("");
  const [acCurr, setAcCurr]                       = useState<string>("");
  const [useManualRent, setUseManualRent]         = useState(false);
  const [rentPerDay, setRentPerDay]               = useState<string>("");
  const [ebRate, setEbRate]                       = useState<string>(String(DEFAULT_EB_RATE || 13));
  const [maintenanceCharge, setMaintenanceCharge] = useState<number>(1000);
  const [overrideNoticePeriod, setOverrideNoticePeriod] = useState<boolean>(false);
  const [meterScope, setMeterScope]               = useState<"room" | "flat">("flat");

  // Every EB reading fetched for the currently-selected tenant's checkout
  // flow. Kept around (not just used transiently inside
  // handleSelectTenant) so calculateProportionalEBShare can look up each
  // roommate's own last billed reading — see tenantLastBilledReading
  // below for why this is needed.
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

      const numericTenantId = Number(tenantId);
      const selected = tenants.find((t) => Number(t.id) === numericTenantId);
      if (!selected) return;

      setMaintenanceCharge(selected.tenantStay === "DAILY" ? 0 : 1000);

      const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
      const isAcRoom = room?.hostelType === "AC";

      const allReadings = await fetchAllPages<EBReading>(getEBReadings, 10);
      setEbReadingsAll(allReadings);

      if (isAcRoom) {
        // AC units stay per-room even inside a shared-meter flat, so this
        // is unaffected by the flat-vs-room split below.
        const roomAcReadings = allReadings
          .filter((r) => Number(r.roomId) === Number(selected.roomId))
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });

        setAcPrev(
          roomAcReadings.length > 0
            ? String(roomAcReadings[0].acCurrentReading ?? 0)
            : String(selected.acJoinReading ?? 0)
        );
      }

      const joinReading = Number(selected.joinReading ?? 0);

      // A flat's EB meter is ONE physical meter shared by every room in
      // that flat, not one meter per room. "Previous" for a room that
      // belongs to a flat is the flat's own latest known meter value —
      // no per-tenant matching involved. This tenant's fair share of the
      // units used since then is worked out afterwards by
      // calculateProportionalEBShare (see flatTenants / roomTenants
      // below) — that's the right place for per-tenant attribution, not
      // here.
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

        // Bulk entries (Add EB Reading page) settle every active
        // tenant's share in one shot — the latest one is a genuine
        // "everyone is paid up to here" floor. Legacy rows saved before
        // this flag existed have isCheckout === undefined, which is
        // intentionally NOT treated as bulk — they fall through to the
        // safer MIN reach-back below.
        const bulkReadings = flatReadings.filter(
          (r: any) => r.isCheckout === false
        );

        let flatPrevious: number;
        if (bulkReadings.length > 0) {
          // FIX: mirrors getFlatStartingReading() in EBReadingsPage.tsx.
          // The highest saved bulk reading alone isn't a safe floor once
          // a NEW tenant has checked into a room in this flat with their
          // own "Current EB Reading" snapshot AFTER the last bulk save —
          // that snapshot is a real physical meter read and can only be
          // at or above whatever was last recorded. Ignoring it left
          // "Previous" understated for anyone checking out from a flat
          // where a newer roommate joined more recently than the last
          // bulk save.
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
          // No bulk save has ever settled this flat as a group yet —
          // true start of the billing window is the earliest
          // previousReading ever recorded for it, never the latest.
          // Also include this tenant's own joinReading as a floor, in
          // case they joined even earlier than any reading on file.
          flatPrevious = Math.min(
            ...flatReadings.map((r) => Number(r.previousReading ?? 0)),
            joinReading
          );
        } else if (flatAllTenants.length > 0) {
          // No flat-level reading row exists yet at all — anchor to the
          // earliest join reading among EVERYONE who has ever lived in
          // this flat (active or already checked out), so nobody's
          // early consumption is silently dropped.
          //
          // FIX: a DAILY-stay tenant's joinReading is NOT a real meter
          // snapshot — it's optional and the backend silently defaults it
          // to 0 whenever it isn't supplied (DAILY tenants don't
          // participate in the monthly EB cycle at all). `0 ?? joinReading`
          // does NOT fall back, because `??` only catches null/undefined,
          // not 0 — so a single DAILY roommate with an unset joinReading
          // was silently collapsing this whole Math.min(...) to 0,
          // wildly inflating finalEBUnits for anyone checking out of that
          // flat. Only MONTHLY tenants with a genuinely recorded (> 0)
          // joinReading can act as a floor here.
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
        // Standalone room, treated as a "flat of one" — same shared-meter
        // anchoring as the flatId branch above, keyed on roomId instead
        // of flatId.
        //
        // FIX (previous): this branch used to anchor "Previous" to
        // whichever was HIGHEST among: the last recorded currentReading
        // for the room, any active tenant's own join snapshot, or
        // ANOTHER tenant's own individual checkout reading — the last
        // input wrongly let a per-tenant checkout row advance the floor
        // for the room's shared meter as a whole. That was corrected by
        // switching to the bulk/isCheckout split below, mirroring the
        // flat branch.
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
          // FIX: same reasoning as the flat branch above — the highest
          // bulk reading alone can go stale the moment a new tenant
          // checks into this room with their own join snapshot AFTER
          // the last bulk save. Advance the floor to whichever is
          // higher.
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
          // No bulk save has ever settled this room as a group yet —
          // true start of the billing window is the earliest
          // previousReading ever recorded for it, never the latest and
          // never another tenant's own individual checkout snapshot.
          //
          // FIX: this used to guard the floor with ONLY the currently
          // selected tenant's own joinReading, on the assumption that
          // whatever previousReading a saved row carried was already a
          // safe-enough floor. It isn't — a saved row's previousReading
          // just reflects whatever value happened to be typed in (or
          // auto-filled) at save time, and that can itself sit ABOVE an
          // earlier roommate's true join point. Concretely: Final 01
          // joined this room at reading 100, Final 03 joined later at
          // 180, and a reading row on file has previousReading=150 —
          // MIN(150, Final 03's own join 180) = 150, silently dropping
          // Final 01's 100→150 span from ever being billed to anyone.
          // Now reaches back through EVERY tenant who has ever lived in
          // this room (active or already checked out), not just the one
          // currently being checked out — mirroring the "no readings at
          // all" branch below, which already did this correctly.
          //
          // FIX: same landmine as the flat branch above — a DAILY-stay
          // roommate's joinReading defaults to 0 on the backend whenever
          // it isn't supplied, and `0 ?? joinReading` never falls back
          // (`??` only catches null/undefined). A single such roommate
          // was silently zeroing out this whole floor. Only MONTHLY
          // tenants with a genuinely recorded (> 0) joinReading can act
          // as a floor here.
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
          // No room-level reading row exists yet at all — anchor to the
          // earliest join reading among EVERYONE who has ever lived in
          // this room (active or already checked out), so nobody's
          // early consumption is silently dropped.
          //
          // FIX: same DAILY-tenant/joinReading=0 landmine as above.
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

  /* ── DAILY-stay settlement ────────────────────────────────────────
     A DAILY tenant paid a flat total at check-in:
        totalAmount = (noOfDays × amountPerDay) + Advance EB Amount
     The Advance EB Amount is a PREPAYMENT against electricity, not a
     charge — at checkout it is offset against whatever EB this tenant
     actually consumed (their proportional share of the meter):

        used EB 325, advance EB 150  →  175 still to pay
        used EB 130, advance EB 235  →  105 refundable

     So for a DAILY tenant the EB line that enters the final balance is
     (share − advance EB), which may legitimately be negative. For a
     MONTHLY tenant nothing changes: their share is charged in full and
     advanceEbCollected stays 0. ── */
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

  // For each tenant, the highest currentReading ever saved for them
  // specifically (any EBReading row tagged with their tenantId, in any
  // room/flat). This exists because tenant.status/checkoutReading are
  // NOT reliable signals of who has actually left a room's meter: the
  // EB Readings page can record and "close out" a tenant's own reading
  // for a room without ever touching their status or checkoutReading —
  // that only happens via this Checkout page's own confirm step. A
  // roommate who was closed out that way stays status:"Active" forever,
  // and without this map they'd wrongly keep counting as "present" (and
  // diluting the split) for every later checkout in the same room.
  const tenantLastBilledReading = useMemo(() => {
    const map = new Map<number, number>();
    ebReadingsAll.forEach((r: any) => {
      if (r.tenantId == null) return;
      const val = Number(r.currentReading ?? 0);
      const key = Number(r.tenantId);
      const prevMax = map.get(key);
      if (prevMax == null || val > prevMax) map.set(key, val);
    });
    return map;
  }, [ebReadingsAll]);

  const dateForCalc  = checkOutDate ? new Date(checkOutDate) : new Date();
  const daysInMonth  = new Date(
    dateForCalc.getFullYear(),
    dateForCalc.getMonth() + 1,
    0
  ).getDate();

  // FIX: for tenants who belong to a shared flat, tenant.monthlyRent can
  // come through as 0/undefined depending on how the tenant record was
  // created (rent may have been entered against the room/flat rather
  // than the individual tenant). Falling back straight to that 0 broke
  // "Auto Calculate" for After Checkout Extra Rent even though the
  // "Manual Rent Per Day" path — which never reads monthlyRent — worked
  // fine. Resolve a rent figure with a fallback chain instead of trusting
  // selectedTenant.monthlyRent alone:
  //   1) the tenant's own monthlyRent, if it's a real positive number
  //   2) a DAILY tenant's amountPerDay × days-in-month equivalent is NOT
  //      used here — for a DAILY tenant the per-day rate itself is the
  //      right figure, so it's handled directly in extraRent below
  //   3) the room's monthlyRent, if the room carries one
  //   4) any other roommate in the same flat/room who does have a
  //      positive monthlyRent set (shared-rent flats often only store it
  //      on one of the tenant records, or on whichever tenant checked in
  //      first)
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
  // so "Auto Calculate" for extra days uses that directly instead of
  // dividing a monthly rent they don't have.
  const autoRentPerDay = isDailyStay
    ? Number(selectedTenant?.amountPerDay ?? 0)
    : effectiveMonthlyRent / daysInMonth;

  const extraRent =
    selectedTenant && extraDays
      ? useManualRent
        ? Number(extraDays) * Number(rentPerDay || 0)
        : Math.round(autoRentPerDay * Number(extraDays))
      : 0;

  // FIX: "has a real final reading" must be its own explicit signal,
  // never inferred from finalCurr coercing to 0. An EMPTY finalCurr
  // ("no reading entered yet") and a genuine reading of 0 units used
  // are not the same thing, and downstream advance-offset math must not
  // treat them as if they were — see ebPayableAfterAdvance below.
  const hasFinalReading =
    !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

  const finalEBUnits = hasFinalReading
    ? Number(finalCurr) - Number(finalPrev)
    : 0;

  const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
  const totalEBAmount  = finalEBUnits * appliedEBRate;

  // Returns both the tenant's rupee share AND the per-segment breakdown
  // (units and headcount used in each slice) so the UI can show exactly
  // what math was applied, instead of a roster count that may not match
  // what was actually used in the calculation.
  const calculateProportionalEBShare = (
    tenantId: number | null | undefined,
    prevReading: number,
    currReading: number,
    rate: number,
    occupants: Tenant[]
  ): { share: number; segments: { units: number; count: number }[] } => {
    if (!tenantId || !(currReading > prevReading) || occupants.length === 0) {
      return { share: 0, segments: [] };
    }

    const numericTenantId = Number(tenantId);

    const isPresentInSegment = (
      t: Tenant,
      segStart: number,
      segEnd: number
    ): boolean => {
      const join = Number(t.joinReading);
      if (!Number.isFinite(join) || join > segStart) return false;

      if (Number(t.id) === numericTenantId) {
        // The tenant being checked out right now is, by construction,
        // present for every segment up to their own final reading.
        return currReading >= segEnd;
      }

      // A roommate with their own saved billing checkpoint at or past
      // this segment's start already had their consumption up to that
      // point accounted for — either through a real checkout, or
      // through a reading saved on the EB Readings page that never
      // flipped their status/checkoutReading (a known gap: only this
      // page's own confirm step does that). Either way, once a
      // tenant-specific reading exists at/after this segment, they must
      // not be re-counted as present here — this check runs BEFORE the
      // status check below precisely because status can't be trusted
      // alone.
      const lastBilled = tenantLastBilledReading.get(Number(t.id));
      if (lastBilled != null && lastBilled >= segStart) return false;

      if (t.status === "Checked_Out") {
        const co = Number(t.checkoutReading);
        // If we don't have a valid recorded exit point for this
        // roommate, we cannot confirm they were present in this
        // segment — but that must NOT fall back to assuming everyone
        // who ever lived in the flat was present (see below).
        if (!Number.isFinite(co)) return false;
        return co >= segEnd;
      }

      // Still active (or has no checkout record because they haven't
      // left), AND no billing checkpoint places them out of this
      // segment -> present for the whole window.
      return true;
    };

    const boundarySet = new Set<number>();
    occupants.forEach((t) => {
      const join = Number(t.joinReading);
      if (Number.isFinite(join) && join > prevReading && join < currReading) {
        boundarySet.add(join);
      }
      if (Number(t.id) !== numericTenantId && t.status === "Checked_Out") {
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

    let share = 0;
    const segments: { units: number; count: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      const segUnits = segEnd - segStart;
      if (segUnits <= 0) continue;

      const presentInSegment = occupants.filter((t) =>
        isPresentInSegment(t, segStart, segEnd)
      );

      // Previously this fell back to `occupants.length` (the FULL
      // historical roster of everyone who ever lived in the flat,
      // including long-departed tenants) whenever presentInSegment came
      // back empty. That silently corrupted the split from the 2nd/3rd
      // checkout onward, once there was checked-out history for a
      // missing/invalid checkoutReading to trip over. The tenant being
      // checked out is always present in every segment up to their own
      // reading, so an empty presentInSegment can only mean a data gap
      // for THEM — the correct minimum is 1 (themselves), never the
      // full roster.
      const presentCount = presentInSegment.length || 1;

      segments.push({ units: segUnits, count: presentCount });

      const tenantPresent = presentInSegment.some(
        (t) => Number(t.id) === numericTenantId
      );

      if (tenantPresent) {
        share += (segUnits * rate) / presentCount;
      }
    }

    return { share, segments };
  };

  const { share: finalEBAmount, segments: ebSegments } = calculateProportionalEBShare(
    selectedTenant ? Number(selectedTenant.id) : null,
    Number(finalPrev) || 0,
    Number(finalCurr) || 0,
    appliedEBRate,
    roomTenants
  );

  // What actually lands in the balance for the EB consumed during this
  // stay. DAILY: share minus the advance EB already collected (negative
  // = refundable). MONTHLY: the share in full, unchanged.
  //
  // FIX: this must be gated on hasFinalReading. Previously, with
  // finalCurr empty, finalEBAmount correctly came back as 0 ("no usage
  // yet"), but this line still subtracted the full advanceEbCollected
  // from that 0 — producing a large negative number that the UI then
  // displayed as a bogus "EB Refund" before any current reading had
  // even been entered. When there's no final reading yet, there is
  // nothing to offset against the advance, so this must be 0, not
  // "0 - advance".
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
    // registrationFees
  : maintenanceCharge;

const handleConfirmCheckout = async () => {
  if (!selectedTenant) {
    toast.error("Select tenant");
    return;
  }
  if (isAcRoom && acPrev && !acCurr) {
    toast.error("AC Current Reading is required for AC room");
    return;
  }
  if (!finalCurr) {
    toast.error("Final EB Current Reading is required");
    return;
  }

  try {
    if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

    // FIX: the net EB settlement this page already computed
    // (ebPayableAfterAdvance for DAILY, finalEBAmount for MONTHLY) was
    // never sent to the backend. checkoutTenant() wrote a flat
    // previousReading/currentReading range with no tenant attribution and
    // no amount, so the EB Readings screen showed ₹0/"—" for what the
    // tenant actually owed or was refunded. Sending it explicitly lets
    // the backend persist the real number on the tenant's informational
    // row without having to (and being unable to) re-derive the
    // proportional split itself.
    const ebAmountCharged = finalEBAmount;

    await checkoutTenant(
      selectedTenant.id,
      finalCurr ? Number(finalCurr) : null,
      isAcRoom && acCurr ? Number(acCurr) : null,
      overrideNoticePeriod,
      appliedEBRate,
      ebAmountCharged
    );

    if (selectedTenant.bedId) {
      await updateBedStatus(Number(selectedTenant.bedId), false);
    }

    toast.success(`${selectedTenant.name} checked out successfully`);

    setSelectedTenantId("");
    setCheckOutDate("");
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

                    <div className="grid gap-1.5 mt-4">
                      <Label className="text-xs">EB Rate Per Unit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ebRate}
                        onChange={(e) => setEbRate(e.target.value)}
                        placeholder="Enter EB Rate"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Default Rate: ₹13 per unit
                      </p>
                    </div>
                  </div>
                  {hasFinalReading && (
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
                          )
                        </>
                      )}
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
                    <span className="text-muted-foreground">After Checkout EB Value</span>
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
                            {selectedRoom?.roomNumber}? This will mark the
                            tenant as Checked-Out and free up the bed.
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