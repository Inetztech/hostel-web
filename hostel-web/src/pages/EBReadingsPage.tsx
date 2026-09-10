// // import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// // import {
// //   getRooms,
// //   getEBReadings,
// //   addEBReading,
// //   deleteEBReading,
// //   getTenantWiseEBBill,
// //   sendEBBillWhatsApp,
// //   getUserRole,
// //   getTenants,
// //   getBranchId,
// //   getBranches,
// //   getFlats,
// //   deleteEBReadingsByFlat,
// //   deleteEBReadingsByRoom,
// //   fetchAllPages,
// // } from "@/lib/store";

// // import { Room, EBReading, Tenant, Branch, Flat } from "@/lib/types";

// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";

// // import * as XLSX from "xlsx";

// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";

// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogHeader,
// //   DialogTitle,
// //   DialogFooter,
// //   DialogClose,
// //   DialogDescription,
// // } from "@/components/ui/dialog";

// // import {
// //   DropdownMenu,
// //   DropdownMenuContent,
// //   DropdownMenuItem,
// //   DropdownMenuTrigger,
// // } from "@/components/ui/dropdown-menu";

// // import { toast } from "sonner";
// // import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";

// // const EBReadingsPage = () => {
// //   // ── role is uppercased for all comparisons ────────────────────────────
// //   const role     = getUserRole()?.toUpperCase();
// //   const branchId = getBranchId(); // number | null

// //   const isAdmin   = role === "ADMIN" || role === "WARDEN";
// //   const hasAccess = isAdmin;
// //   const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

// //   // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
// //   const defaultBranch =
// //     role === "ADMIN" || role === "SUPER_ADMIN"
// //       ? "all"
// //       : branchId != null ? String(branchId) : "all";

// //   const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

// //   const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

// //   const [rooms,        setRooms]        = useState<Room[]>([]);
// //   const [readings,     setReadings]     = useState<EBReading[]>([]);
// //   const [tenants,      setTenants]      = useState<Tenant[]>([]);
// //   const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
// //   const [branches,     setBranches]     = useState<Branch[]>([]);
// //   const [flats,        setFlats]        = useState<Flat[]>([]);
// //   const [tenantRows,   setTenantRows]   = useState<any[]>([]);
// //   const [flatRoomRows, setFlatRoomRows] = useState<any[]>([]);
// //   const [tenantBills,  setTenantBills]  = useState<any[]>([]);

// //   const [uploadOpen, setUploadOpen] = useState(false);
// //   const [addOpen,    setAddOpen]    = useState(false);
// //   const [billOpen,   setBillOpen]   = useState(false);
// //   const [isSaving,   setIsSaving]   = useState(false);

// //   const [manualRate,      setManualRate]      = useState<number | "">(13);
// //   const [manualMode,      setManualMode]      = useState(false);
// //   const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

// //   // Page-level "flat" filter shown in the table's filter row.
// //   const [formFlatId,      setFormFlatId]      = useState("all");
// //   const [formRoomId,      setFormRoomId]      = useState("");
// //   // Which tenant this room-level reading is a checkout FOR. Only
// //   // relevant/shown when the selected room currently has more than one
// //   // active tenant sharing the same meter AND no reading has been saved
// //   // yet for the selected room this month — see roomActiveTenants and
// //   // roomReadingsThisMonth below.
// //   const [formTenantId,    setFormTenantId]    = useState("");
// //   const [formPrevReading, setFormPrevReading] = useState("");
// //   const [formCurrReading, setFormCurrReading] = useState("");
// //   const [formAcPrev,      setFormAcPrev]      = useState("");
// //   const [formAcCurr,      setFormAcCurr]      = useState("");
// //   const [roomSearch,      setRoomSearch]      = useState("");
// //   const [flatSearch,      setFlatSearch]      = useState("");
// //   const [billRoom,        setBillRoom]        = useState("");
// //   const [formBranchId, setFormBranchId] = useState("");
// //   const now = new Date();
// //   const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
// //   const [selYear,  setSelYear]  = useState(now.getFullYear());
// //   const [confirmState, setConfirmState] = useState<{
// //     title: string;
// //     description?: string;
// //     confirmLabel?: string;
// //     danger?: boolean;
// //     onConfirm: () => void;
// //   } | null>(null);

// //   const askConfirm = (
// //     title: string,
// //     onConfirm: () => void,
// //     options?: { description?: string; confirmLabel?: string; danger?: boolean }
// //   ) => {
// //     setConfirmState({ title, onConfirm, ...options });
// //   };

// //   // Last 24 months, newest first, for the Month/Year picker.
// //   const monthYearOptions = useMemo(() => {
// //     const opts: { month: number; year: number; label: string; value: string }[] = [];
// //     const base = new Date();
// //     for (let i = 0; i < 24; i++) {
// //       const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
// //       const month = d.getMonth() + 1;
// //       const year = d.getFullYear();
// //       opts.push({
// //         month,
// //         year,
// //         label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
// //         value: `${year}-${month}`,
// //       });
// //     }
// //     return opts;
// //   }, []);

// //   /* ─── RATE ─────────────────────────────────────────────── */
// //   const getRateForRoom = (roomId: string | number) => {
// //     const roomRate = roomManualRates[String(roomId)];
// //     if (manualMode && roomRate !== undefined) return roomRate;
// //     if (typeof manualRate === "number") return manualRate;
// //     return 13;
// //   };

// //   /* ─── IS AC ─────────────────────────────────────────────── */
// //   const isRoomAc = useCallback(
// //     (roomId: string | number) => {
// //       const room = rooms.find(r => String(r.id) === String(roomId));
// //       return room?.hostelType === "AC";
// //     },
// //     [rooms]
// //   );

// //   /* ─── FLAT ROW CHANGE ───────────────────────────────────── */
// //   const handleFlatRowChange = (
// //     roomId: string | number,
// //     field: "currentReading" | "acCurrentReading",
// //     value: string
// //   ) => {
// //     setFlatRoomRows(prev =>
// //       prev.map(row => (row.roomId === roomId ? { ...row, [field]: value } : row))
// //     );
// //   };

// //   /* ─── STARTING READINGS ─────────────────────────────────── */
// //   const getRoomStartingACReading = useCallback(
// //     (roomId: string | number) => {
// //       const roomSpecific = allReadings
// //         .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
// //         .sort((a, b) => {
// //           if (b.year !== a.year) return b.year - a.year;
// //           if (b.month !== a.month) return b.month - a.month;
// //           return (b.id ?? 0) - (a.id ?? 0);
// //         });
// //       if (roomSpecific.length > 0) return Number(roomSpecific[0].acCurrentReading ?? 0);
// //       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
// //       if (roomTenants.length > 0)
// //         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
// //       return 0;
// //     },
// //     [allReadings, tenants]
// //   );

// //   const getRoomStartingReading = useCallback(
// //     (roomId: string | number) => {
// //       const room = rooms.find(r => String(r.id) === String(roomId));
// //       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
// //       if (roomReadings.length > 0) {
// //         const sorted = [...roomReadings].sort((a, b) => {
// //           if (b.year !== a.year) return b.year - a.year;
// //           return b.month - a.month;
// //         });
// //         return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
// //       }
// //       if (room?.flatId) {
// //         const flatReadings = allReadings.filter(
// //           r => String(r.flatId) === String(room.flatId)
// //         );
// //         if (flatReadings.length > 0) {
// //           const sorted = [...flatReadings].sort((a, b) => {
// //             if (b.year !== a.year) return b.year - a.year;
// //             return b.month - a.month;
// //           });
// //           return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
// //         }
// //       }
// //       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
// //       if (roomTenants.length > 0)
// //         return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
// //       return 0;
// //     },
// //     [allReadings, tenants, rooms]
// //   );

// //   const getRoomIdByRoomNumber = (roomNumber: string) =>
// //     rooms.find(r => r.roomNumber === roomNumber)?.id;

// //   /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
// //   const filteredRooms = useMemo(() => {
// //     if (selectedBranch === "all") return rooms;
// //     return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
// //   }, [rooms, selectedBranch]);

// //   const dialogRooms = useMemo(() => {
// //     if (!formBranchId) return rooms;
// //     return rooms.filter(r => Number(r.unitId) === Number(formBranchId));
// //   }, [rooms, formBranchId]);

// //   const dialogStandaloneRooms = useMemo(
// //     () => dialogRooms.filter(r => !r.flatId),
// //     [dialogRooms]
// //   );

// //   const dialogFlatFilteredRooms = useMemo(() => {
// //     if (!formFlatId || formFlatId === "all") return dialogStandaloneRooms;
// //     return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
// //   }, [dialogRooms, dialogStandaloneRooms, formFlatId]);

// //   const dialogFlats = useMemo(() => {
// //     if (!formBranchId) return flats;
// //     const flatIdsInBranch = new Set(
// //       dialogRooms.map(r => r.flatId).filter((id): id is number => id != null)
// //     );
// //     return flats.filter(f => flatIdsInBranch.has(Number(f.id)));
// //   }, [flats, formBranchId, dialogRooms]);

// //   const dialogFilteredFlats = useMemo(
// //     () => dialogFlats.filter(f => f.flatNumber.toLowerCase().includes(flatSearch.toLowerCase())),
// //     [dialogFlats, flatSearch]
// //   );

// //   const roomMap = useMemo(() => {
// //     const map: Record<string, string> = {};
// //     rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
// //     return map;
// //   }, [rooms]);

// //   // Tenants currently active in the room selected in the Add dialog
// //   // (single-room mode only). When a room's meter is shared by more than
// //   // one active tenant, "Previous" can no longer be filled from a single
// //   // room-level "last reading" value — each tenant has their own join
// //   // reading, and the checkout being recorded here belongs to exactly one
// //   // of them. Sorted by joinReading so earliest joiner (usually who the
// //   // admin is checking out first) appears first.
// //   const roomActiveTenants = useMemo(() => {
// //     if (!formRoomId) return [];
// //     return tenants
// //       .filter(
// //         t =>
// //           String(t.roomId) === String(formRoomId) &&
// //           String(t.status).toLowerCase() === "active"
// //       )
// //       .sort((a, b) => Number(a.joinReading ?? 0) - Number(b.joinReading ?? 0));
// //   }, [tenants, formRoomId]);

// //   // NEW: readings already saved for the currently-selected room, for the
// //   // EXACT month/year being entered in this dialog. Checking out a tenant
// //   // through this dialog doesn't flip that tenant to "inactive" — that only
// //   // happens on the separate Tenant Check-Out page — so a tenant can still
// //   // show up in roomActiveTenants above even after their own checkout
// //   // reading was already saved this month. When that's happened, the
// //   // highest currentReading among this room's readings this month is where
// //   // the meter actually is right now, and MUST win over any tenant's
// //   // original (now-stale) joinReading. See the effect below.
// //   const roomReadingsThisMonth = useMemo(() => {
// //     if (!formRoomId) return [];
// //     return allReadings.filter(
// //       r =>
// //         r.roomId != null &&
// //         String(r.roomId) === String(formRoomId) &&
// //         r.month === selMonth &&
// //         r.year === selYear
// //     );
// //   }, [allReadings, formRoomId, selMonth, selYear]);

// //   /* ─── FILTERED READINGS ─────────────────────────────────── */
// //   const filteredReadings = useMemo(() => {
// //     let data = readings.filter(r => r.month === selMonth && r.year === selYear);
// //     if (selectedBranch !== "all") {
// //       const branchRooms   = rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
// //       const branchRoomIds = new Set(branchRooms.map(r => r.id));
// //       const branchFlatIds = new Set(branchRooms.map(r => r.flatId).filter(Boolean));
// //       data = data.filter(r =>
// //         (r.roomId != null && branchRoomIds.has(r.roomId)) ||
// //         (r.flatId != null && branchFlatIds.has(r.flatId))
// //       );
// //     }
// //     return data;
// //   }, [readings, rooms, selectedBranch, selMonth, selYear]);

// //   /* ─── RELOAD ─────────────────────────────────────────────── */
// //   const reload = async () => {
// //     const [
// //       roomsResult,
// //       readingsResult,
// //       tenantsResult,
// //       branchesResult,
// //       flatsResult,
// //     ] = await Promise.allSettled([
// //       fetchAllPages<Room>(getRooms),
// //       fetchAllPages<EBReading>(getEBReadings),
// //       fetchAllPages<Tenant>(getTenants),
// //       fetchAllPages<Branch>(getBranches),
// //       fetchAllPages<Flat>(getFlats),
// //     ]);

// //     const roomList: Room[] =
// //       roomsResult.status === "fulfilled" ? roomsResult.value : [];
// //     const readingList: EBReading[] =
// //       readingsResult.status === "fulfilled" ? readingsResult.value : [];
// //     const tenantList: Tenant[] =
// //       tenantsResult.status === "fulfilled" ? tenantsResult.value : [];
// //     const branchList: Branch[] =
// //       branchesResult.status === "fulfilled" ? branchesResult.value : [];
// //     const flatList: Flat[] =
// //       flatsResult.status === "fulfilled" ? flatsResult.value : [];

// //     if (roomsResult.status === "rejected") {
// //       console.error("Failed to load rooms:", roomsResult.reason);
// //       toast.error("Failed to load rooms");
// //     }
// //     if (readingsResult.status === "rejected") {
// //       console.error("Failed to load EB readings:", readingsResult.reason);
// //       toast.error("Failed to load EB readings");
// //     }
// //     if (tenantsResult.status === "rejected") {
// //       console.error("Failed to load tenants:", tenantsResult.reason);
// //       toast.error("Failed to load tenants");
// //     }
// //     if (branchesResult.status === "rejected") {
// //       console.error("Failed to load branches:", branchesResult.reason);
// //     }
// //     if (flatsResult.status === "rejected") {
// //       console.error("Failed to load flats:", flatsResult.reason);
// //       toast.error(
// //         "Couldn't load flats (permission or server error) — flat-based readings may be hidden until this is fixed."
// //       );
// //     }

// //     let filteredRoomsData = roomList;
// //     let filteredTenants   = tenantList;
// //     let filteredReadingData = readingList;

// //     if (role === "WARDEN" && branchId != null) {
// //       filteredRoomsData = roomList.filter(r => Number(r.unitId) === Number(branchId));
// //       const roomIds = new Set(filteredRoomsData.map(r => r.id));
// //       const flatIds = new Set(
// //         filteredRoomsData.map(r => r.flatId).filter((id): id is number => id != null)
// //       );
// //       filteredTenants = tenantList.filter(t => roomIds.has(Number(t.roomId)));
// //       filteredReadingData = readingList.filter(r =>
// //         (r.roomId != null && roomIds.has(r.roomId)) ||
// //         (r.flatId != null && flatIds.has(r.flatId))
// //       );
// //     }

// //     setRooms(filteredRoomsData);
// //     setReadings(filteredReadingData);
// //     setTenants(filteredTenants);
// //     setAllReadings(readingList);
// //     setBranches(branchList);
// //     setFlats(flatList);
// //   };

// //   const didLoad = useRef(false);
// //   useEffect(() => {
// //     if (didLoad.current) return;
// //     didLoad.current = true;
// //     reload();
// //   }, []);

// //   /* ─── FLAT ROOM ROWS (uses dialog-scoped rooms) ─────────── */
// //   useEffect(() => {
// //     if (!formFlatId || formFlatId === "all") { setFlatRoomRows([]); return; }
// //     const roomsInFlat = dialogRooms.filter(
// //       r => String(r.flatId) === String(formFlatId)
// //     );
// //     const rows = roomsInFlat.map(room => {
// //       const allForRoom = readings
// //         .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
// //         .sort((a, b) => {
// //           if (b.year !== a.year) return b.year - a.year;
// //           if (b.month !== a.month) return b.month - a.month;
// //           return (b.id ?? 0) - (a.id ?? 0);
// //         });
// //       const latest = allForRoom[0] ?? null;
// //       return {
// //         roomId:            room.id,
// //         roomNumber:        room.roomNumber,
// //         isAc:              room.hostelType === "AC",
// //         previousReading:   latest != null
// //           ? Number(latest.currentReading ?? 0)
// //           : getRoomStartingReading(room.id),
// //         currentReading:    "",
// //         acPreviousReading: latest != null
// //           ? Number(latest.acCurrentReading ?? 0)
// //           : getRoomStartingACReading(room.id),
// //         acCurrentReading:  "",
// //       };
// //     });
// //     setFlatRoomRows(rows);
// //   }, [formFlatId, dialogRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

// //   /* ─── SYNC FORM READINGS ON ROOM CHANGE ─────────────────── */
// //   // FIX: previously this only ever consulted tenant data
// //   // (roomActiveTenants) to decide "Previous" — never whether the room
// //   // already had a reading saved for the exact month/year being entered.
// //   // Checking out a tenant through THIS dialog never flips that tenant's
// //   // status to inactive (that only happens on the separate Tenant
// //   // Check-Out page), so a room can still have exactly one "active" tenant
// //   // left even after that tenant's own checkout reading was already saved
// //   // this month. In that case the old code kept re-filling "Previous" from
// //   // that tenant's original joinReading — e.g. a room with three readings
// //   // already saved this month (100→190, 150→170, 180→210) still prefilled
// //   // Previous=180 (the remaining tenant's stale joinReading) instead of 210
// //   // (the highest currentReading actually on record for this room this
// //   // month), silently re-covering units that the 180→210 entry already
// //   // billed.
// //   //
// //   // Now: if this room already has ANY reading saved for the selected
// //   // month/year (roomReadingsThisMonth), "Previous" always comes from the
// //   // highest currentReading among those — the true "where the meter is
// //   // right now" value — regardless of tenant count. Only when nothing has
// //   // been saved yet this month do we fall back to the original
// //   // tenant-based logic (unchanged: 0/1 active tenant is unambiguous; 2+
// //   // active tenants requires an explicit pick).
// //   useEffect(() => {
// //     if (!formRoomId) return;
// //     setFormTenantId("");

// //     if (roomReadingsThisMonth.length > 0) {
// //       const latest = roomReadingsThisMonth.reduce((max, r) =>
// //         Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max
// //       );
// //       setFormPrevReading(String(Number(latest.currentReading ?? 0)));
// //       setFormAcPrev(String(Number(latest.acCurrentReading ?? 0)));
// //       return;
// //     }

// //     if (roomActiveTenants.length === 1) {
// //       const only = roomActiveTenants[0];
// //       setFormPrevReading(
// //         String(only.joinReading ?? getRoomStartingReading(formRoomId))
// //       );
// //       setFormAcPrev(
// //         String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
// //       );
// //     } else if (roomActiveTenants.length === 0) {
// //       setFormPrevReading(String(getRoomStartingReading(formRoomId)));
// //       setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
// //     } else {
// //       // multiple active tenants, and nothing saved yet this month — wait
// //       // for an explicit tenant pick (see roomReadingsThisMonth.length > 0
// //       // branch above for the case where a reading already exists).
// //       setFormPrevReading("");
// //       setFormAcPrev("");
// //     }
// //   }, [
// //     formRoomId,
// //     roomActiveTenants,
// //     roomReadingsThisMonth,
// //     getRoomStartingReading,
// //     getRoomStartingACReading,
// //   ]);

// //   // Once the admin picks which tenant this checkout reading belongs to
// //   // (only shown/needed when roomActiveTenants.length > 1 AND nothing has
// //   // been saved for this room this month), pull "Previous" / "AC Previous"
// //   // from THAT tenant's own join reading.
// //   useEffect(() => {
// //     if (!formTenantId) return;
// //     // Guard: once a reading exists for this room this month, "Previous"
// //     // must come from that reading (handled in the effect above), not a
// //     // tenant's join reading. The tenant selector isn't even rendered in
// //     // that case, but this skips defensively if formTenantId is somehow
// //     // still set (e.g. left over from a prior room selection).
// //     if (roomReadingsThisMonth.length > 0) return;
// //     const t = roomActiveTenants.find(rt => String(rt.id) === String(formTenantId));
// //     if (!t) return;
// //     setFormPrevReading(
// //       String(t.joinReading ?? getRoomStartingReading(formRoomId))
// //     );
// //     setFormAcPrev(
// //       String(t.acJoinReading ?? getRoomStartingACReading(formRoomId))
// //     );
// //   }, [
// //     formTenantId,
// //     roomActiveTenants,
// //     roomReadingsThisMonth,
// //     formRoomId,
// //     getRoomStartingReading,
// //     getRoomStartingACReading,
// //   ]);

// //   /* ─── BUILD TENANT BILL ROWS ─────────────────────────────── */
// //   useEffect(() => {
// //     const loadTenantBills = async () => {
// //       const rows: any[] = [];
// //       const flatHandled = new Set<number>();
// //       const roomHandled = new Set<number>();

// //       const flatReadingMap = new Map<number, EBReading>();
// //       for (const r of filteredReadings.filter(r => r.flatId != null)) {
// //         const existing = flatReadingMap.get(r.flatId!);
// //         if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
// //           flatReadingMap.set(r.flatId!, r);
// //         }
// //       }

// //       for (const r of Array.from(flatReadingMap.values())) {
// //         if (flatHandled.has(r.flatId!)) continue;
// //         flatHandled.add(r.flatId!);
// //         try {
// //           const bills = await getTenantWiseEBBill({
// //             flatId: r.flatId,
// //             month: r.month,
// //             year: r.year,
// //           });

// //           const flatTenantIds = new Set(
// //             tenants
// //               .filter(t => {
// //                 const room = rooms.find(rm => rm.id === t.roomId);
// //                 return room && String(room.flatId) === String(r.flatId);
// //               })
// //               .map(t => Number(t.id))
// //           );

// //           bills
// //             .filter((b: any) => b.tenantId == null || flatTenantIds.has(Number(b.tenantId)))
// //             .forEach((b: any) => {
// //               rows.push({
// //                 id: r.id,
// //                 roomId: getRoomIdByRoomNumber(b.roomNumber),
// //                 flatId: r.flatId,
// //                 roomNumber: b.roomNumber,
// //                 flatNumber: b.flatNumber,
// //                 branchId: (r as any).branchId ?? null,
// //                 branchName: (r as any).branchName ?? null,
// //                 tenantName: b.tenantName,
// //                 previousReading: b.previousReading,
// //                 currentReading: b.currentReading,
// //                 acPreviousReading: b.acPreviousReading,
// //                 acCurrentReading: b.acCurrentReading,
// //                 unitsConsumed: b.totalUnits,
// //                 tenantAmount: b.amount,
// //               });
// //             });
// //         } catch { /* skip failed flat */ }
// //       }

// //       const roomReadings = filteredReadings.filter(r => {
// //         const room = rooms.find(rm => rm.id === r.roomId);
// //         return !room?.flatId && r.roomId != null;
// //       });
// //       for (const r of roomReadings) {
// //         const room = rooms.find(rm => rm.id === r.roomId);
// //         if (!room) continue;
// //         if (room.flatId && flatHandled.has(room.flatId)) continue;
// //         if (roomHandled.has(r.roomId!)) continue;
// //         roomHandled.add(r.roomId!);
// //         try {
// //           // FIX: same as above — pass this reading's own month/year
// //           // through instead of omitting them.
// //           const bills = await getTenantWiseEBBill({
// //             roomId: r.roomId,
// //             month: r.month,
// //             year: r.year,
// //           });

// //           const roomTenantIds = new Set(
// //             tenants
// //               .filter(t => String(t.roomId) === String(room.id))
// //               .map(t => Number(t.id))
// //           );

// //           const matchedBills = bills.filter(
// //             (b: any) => b.tenantId == null || roomTenantIds.has(Number(b.tenantId))
// //           );

// //           if (matchedBills.length > 0) {
// //             matchedBills.forEach((b: any) => {
// //               rows.push({
// //                 id: r.id,
// //                 roomId: room.id,
// //                 flatId: room.flatId,
// //                 roomNumber: room.roomNumber,
// //                 flatNumber: b.flatNumber,
// //                 branchId: (r as any).branchId ?? null,
// //                 branchName: (r as any).branchName ?? null,
// //                 tenantName: b.tenantName,
// //                 previousReading: b.previousReading ?? r.previousReading,
// //                 currentReading: b.currentReading ?? r.currentReading,
// //                 acPreviousReading: b.acPreviousReading,
// //                 acCurrentReading: b.acCurrentReading,
// //                 unitsConsumed: Number(b.totalUnits ?? 0),
// //                 tenantAmount: b.amount,
// //               });
// //             });
// //           } else {
// //             rows.push({
// //               id: r.id,
// //               roomId: room.id,
// //               flatId: room.flatId,
// //               roomNumber: room.roomNumber,
// //               flatNumber: "-",
// //               branchId: (r as any).branchId ?? null,
// //               branchName: (r as any).branchName ?? null,
// //               tenantName: "-",
// //               previousReading: r.previousReading,
// //               currentReading: r.currentReading,
// //               acPreviousReading: r.acPreviousReading,
// //               acCurrentReading: r.acCurrentReading,
// //               unitsConsumed:
// //                 r.currentReading != null && r.previousReading != null
// //                   ? Number(r.currentReading) - Number(r.previousReading)
// //                   : 0,
// //               tenantAmount: 0,
// //             });
// //           }
// //         } catch { /* skip failed room */ }
// //       }
// //       setTenantRows(rows);
// //     };

// //     if (filteredReadings.length > 0) loadTenantBills();
// //     else setTenantRows([]);
// //   }, [filteredReadings, roomMap, rooms, tenants]);

// //   /* ─── ADD READING ───────────────────────────────────────── */
// //   const handleAdd = async () => {
// //     if (isSaving) return;

// //     // Require an explicit branch for roles that can see multiple branches.
// //     // WARDEN never hits this because formBranchId is pre-filled to their
// //     // own branch when the dialog opens.
// //     if (canPickBranch && !formBranchId) {
// //       toast.error("Select a branch first");
// //       return;
// //     }

// //     setIsSaving(true);
// //     try {
// //       const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

// //       if (formFlatId && formFlatId !== "all") {
// //         const validRows = flatRoomRows.filter(row => row.currentReading !== "");
// //         if (validRows.length === 0) { toast.error("Enter at least one room reading"); return; }
// //         for (const row of validRows) {
// //           const prev   = Number(row.previousReading);
// //           const curr   = Number(row.currentReading);
// //           const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
// //           const acCurr = row.isAc ? Number(row.acCurrentReading)  : 0;
// //           if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }
// //           await addEBReading({
// //             flatId: Number(formFlatId), roomId: Number(row.roomId),
// //             branchId: branchIdNum,
// //             month: selMonth, year: selYear,
// //             previousReading: prev, currentReading: curr,
// //             acPreviousReading: acPrev, acCurrentReading: acCurr,
// //             ebRate: getRateForRoom(row.roomId), isCheckout: true,
// //           });
// //         }
// //         toast.success("Flat readings saved");
// //       } else {
// //         if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
// //         // Once a reading already exists for this room this month, the
// //         // "Previous" field is derived from that reading (not a tenant),
// //         // so the tenant pick is only required when nothing's been saved
// //         // yet AND the room has more than one active tenant sharing the
// //         // meter — see roomReadingsThisMonth / roomActiveTenants above.
// //         if (roomActiveTenants.length > 1 && roomReadingsThisMonth.length === 0 && !formTenantId) {
// //           toast.error("Select which tenant this checkout reading is for");
// //           return;
// //         }
// //         if (!formPrevReading) { toast.error("Previous reading is missing"); return; }
// //         const prev   = Number(formPrevReading);
// //         const curr   = Number(formCurrReading);
// //         const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
// //         const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;
// //         if (curr < prev) { toast.error("Current reading cannot be less than previous"); return; }
// //         await addEBReading({
// //           roomId: Number(formRoomId),
// //           branchId: branchIdNum,
// //           month: selMonth, year: selYear,
// //           previousReading: prev, currentReading: curr,
// //           acPreviousReading: acPrev, acCurrentReading: acCurr,
// //           ebRate: getRateForRoom(formRoomId), isCheckout: true,
// //         });
// //         toast.success("Room reading saved");
// //       }
// //       setAddOpen(false);
// //       resetAddDialog();
// //       reload();
// //     } catch (err) {
// //       console.error(err);
// //       toast.error("Failed to save readings");
// //     } finally {
// //       setIsSaving(false);
// //     }
// //   };

// //   /* ─── EXCEL UPLOAD ──────────────────────────────────────── */
// //   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
// //     try {
// //       const file = e.target.files?.[0];
// //       if (!file) return;
// //       const data     = await file.arrayBuffer();
// //       const workbook = XLSX.read(data);
// //       const sheet    = workbook.Sheets[workbook.SheetNames[0]];
// //       const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);
// //       let savedCount = 0, skippedCount = 0;
// //       const savedRoomNumbers = new Set<string>();
// //       for (const row of jsonData) {
// //         const room = filteredRooms.find(r => r.roomNumber === String(row.RoomNumber));
// //         if (!room) { skippedCount++; continue; }
// //         const prev   = Number(row.Previous   ?? 0);
// //         const curr   = Number(row.Current    ?? 0);
// //         const acPrev = Number(row.AcPrevious ?? 0);
// //         const acCurr = Number(row.AcCurrent  ?? 0);
// //         const rowRate = Number(row.EbRate);
// //         const ebRate  = !isNaN(rowRate) && rowRate > 0 ? rowRate : getRateForRoom(room.id);
// //         if (curr < prev) { toast.error(`Invalid reading for Room ${row.RoomNumber}`); skippedCount++; continue; }
// //         if (!row.Current && row.Current !== 0) { skippedCount++; continue; }
// //         await addEBReading({
// //           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
// //           // Use the room's own branch (unitId) when uploading via Excel,
// //           // since there's no per-row branch selector for bulk upload.
// //           branchId: room.unitId != null ? Number(room.unitId) : undefined,
// //           month: selMonth, year: selYear,
// //           previousReading: prev, currentReading: curr,
// //           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
// //           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
// //           ebRate, isCheckout: true,
// //         });
// //         savedCount++;
// //         savedRoomNumbers.add(room.roomNumber);
// //       }
// //       if (savedCount > 0) {
// //         toast.success(
// //           `${savedCount} reading${savedCount > 1 ? "s" : ""} saved` +
// //           (skippedCount > 0 ? ` (${skippedCount} skipped)` : "") +
// //           ` — sending WhatsApp bills...`
// //         );
// //         let sentCount = 0, failedRooms: string[] = [];
// //         for (const roomNumber of savedRoomNumbers) {
// //           try {
// //             await sendEBBillWhatsApp(roomNumber);
// //             sentCount++;
// //           } catch (err: any) {
// //             const msg = err?.response?.data?.error || err?.message || "";
// //             failedRooms.push(msg.includes("Channel not found")
// //               ? `${roomNumber} (not joined sandbox)` : roomNumber);
// //           }
// //         }
// //         if (sentCount > 0) toast.success(`WhatsApp sent to ${sentCount} room${sentCount > 1 ? "s" : ""}`);
// //         if (failedRooms.length > 0) toast.warning(`WhatsApp failed for: ${failedRooms.join(", ")}`);
// //       } else {
// //         toast.warning("No valid readings found in the file");
// //       }
// //       setUploadOpen(false);
// //       e.target.value = "";
// //       reload();
// //     } catch (err) {
// //       console.error(err);
// //       toast.error("Failed to process Excel");
// //     }
// //   };

// //   /* ─── DELETE ────────────────────────────────────────────── */
// //   const handleDelete = async (id: string, flatId?: number, roomId?: number) => {
// //     try {
// //       if (flatId) {
// //         await deleteEBReadingsByFlat(flatId);
// //         toast.success("Flat readings deleted");
// //       } else if (roomId) {
// //         await deleteEBReadingsByRoom(roomId);
// //         toast.success("Room readings deleted");
// //       } else {
// //         await deleteEBReading(id);
// //         toast.success("Reading deleted");
// //       }
// //       reload();
// //     } catch {
// //       toast.error("Failed to delete readings");
// //     }
// //   };

// //   const handleDeleteReadingClick = (row: any) => {
// //     askConfirm(
// //       "Delete this EB reading?",
// //       () => {
// //         handleDelete(
// //           String(row.id),
// //           row.flatId ? Number(row.flatId) : undefined,
// //           row.roomId ? Number(row.roomId) : undefined
// //         );
// //       },
// //       { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
// //     );
// //   };

// //   /* ─── WHATSAPP ──────────────────────────────────────────── */
// //   const handleSendWhatsApp = async (roomId: string) => {
// //     try {
// //       const roomNumber = roomMap[roomId];
// //       if (!roomNumber) { toast.error("Room not found"); return; }
// //       try {
// //         await sendEBBillWhatsApp(roomNumber);
// //         toast.success("WhatsApp sent successfully");
// //       } catch (backendError: any) {
// //         const msg = backendError?.response?.data?.error || backendError.message || "";
// //         toast.error(msg.includes("Channel not found")
// //           ? "Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox."
// //           : "Failed to send WhatsApp: " + msg);
// //       }
// //     } catch {
// //       toast.error("Unexpected error while sending WhatsApp");
// //     }
// //   };

// //   /* ─── DOWNLOAD EXCEL ────────────────────────────────────── */
// //   const handleDownloadExcel = async () => {
// //     try {
// //       const latestReadings = await fetchAllPages<EBReading>(getEBReadings);
// //       const data = filteredRooms.map(room => {
// //         let lastReading: EBReading | undefined;
// //         const roomReadings = latestReadings
// //           .filter(r => r.roomId === room.id)
// //           .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
// //         if (roomReadings.length > 0) {
// //           lastReading = roomReadings.reduce((max, r) =>
// //             Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
// //         } else if (room.flatId) {
// //           const flatReadings = latestReadings
// //             .filter(r => r.flatId === room.flatId)
// //             .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
// //           if (flatReadings.length > 0) {
// //             lastReading = flatReadings.reduce((max, r) =>
// //               Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max);
// //           }
// //         }
// //         const lastRate = lastReading?.ebRate ?? (typeof manualRate === "number" ? manualRate : 13);
// //         return {
// //           RoomNumber: room.roomNumber,
// //           Previous:   lastReading?.currentReading ?? 0,
// //           Current:    "",
// //           AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
// //           AcCurrent:  room.hostelType === "AC" ? "" : "-",
// //           EbRate:     lastRate,
// //         };
// //       });
// //       const worksheet = XLSX.utils.json_to_sheet(data);
// //       worksheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
// //       const workbook = XLSX.utils.book_new();
// //       XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
// //       XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
// //       toast.success("Excel downloaded");
// //     } catch {
// //       toast.error("Failed to download Excel");
// //     }
// //   };

// //   /* ─── FILTERED TENANT ROWS ──────────────────────────────── */
// //   const filteredTenantRows = useMemo(() => {
// //     let data = tenantRows;
// //     if (selectedBranch !== "all") {
// //       data = data.filter(row => {
// //         const room = rooms.find(r => r.id === row.roomId);
// //         return Number(room?.unitId) === Number(selectedBranch);
// //       });
// //     }
// //     if (selectedRoomId !== "all") {
// //       data = data.filter(row => String(row.roomId) === String(selectedRoomId));
// //     }
// //     return data;
// //   }, [tenantRows, selectedBranch, rooms, selectedRoomId]);

// //   /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
// //   const selectedRoomObj = useMemo(
// //     () => rooms.find(r => String(r.id) === String(formRoomId)),
// //     [rooms, formRoomId]
// //   );

// //   /* ─── RESET DIALOG ──────────────────────────────────────── */
// //   const resetAddDialog = () => {
// //     setRoomSearch(""); setFlatSearch(""); setFormFlatId("all"); setFormRoomId("");
// //     setFormTenantId(""); setFormBranchId("");
// //     setFormPrevReading(""); setFormCurrReading("");
// //     setFormAcPrev(""); setFormAcCurr("");
// //     setFlatRoomRows([]); setManualMode(false);
// //     setManualRate(13); setRoomManualRates({});
// //   };

// //   const openAddDialog = () => {
// //     setFormBranchId(
// //       role === "WARDEN" && branchId != null
// //         ? String(branchId)
// //         : selectedBranch !== "all" ? selectedBranch : ""
// //     );
// //     setAddOpen(true);
// //   };

// //   /* ─── Pagination ─── */
// //   const [currentPage, setCurrentPage] = useState(0);
// //   const pageSize = 10;
// //   const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

// //   // Total page count, used both to bound the "Next" button and to build
// //   // the numbered page list below.
// //   const totalPages = Math.max(1, Math.ceil(filteredTenantRows.length / pageSize));

// //   const getPageNumbers = (current: number, total: number): (number | "...")[] => {
// //     if (total <= 7) {
// //       return Array.from({ length: total }, (_, i) => i + 1);
// //     }
// //     const pages: (number | "...")[] = [1];
// //     if (current > 3) pages.push("...");
// //     const start = Math.max(2, current - 1);
// //     const end = Math.min(total - 1, current + 1);
// //     for (let i = start; i <= end; i++) pages.push(i);
// //     if (current < total - 2) pages.push("...");
// //     pages.push(total);
// //     return pages;
// //   };

// //   const pageNumbers = useMemo(
// //     () => getPageNumbers(currentPage + 1, totalPages),
// //     [currentPage, totalPages]
// //   );

// //   /* ══════════════════════════════════════════════════════════
// //      RENDER
// //   ══════════════════════════════════════════════════════════ */
// //   return (
// //     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
// //       <style>{`
// //         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
// //         .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

// //         .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
// //         @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

// //         .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
// //         .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
// //         .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

// //         .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
// //         .eb-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
// //         .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
// //         .eb-table tr:hover { background: #fdfcff; }

// //         .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
// //         .eb-tenant-name { font-size: 12px; color: #64748b; margin-top: 2px; }
// //         .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
// //         .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }

// //         .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
// //         .eb-status.collected { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
// //         .eb-status.pending { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
// //         .eb-status.not-read { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

// //         .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
// //         /* !important here is deliberate: something elsewhere in the app's
// //            global CSS is hiding/zeroing SVGs inside these buttons specifically
// //            (lucide icons that render fine elsewhere on this same page were
// //            still blank here). Rather than hunt for that rule, these overrides
// //            just guarantee the icon paints regardless of what else applies. */
// //         .eb-action-btn svg {
// //           display: inline-block !important;
// //           visibility: visible !important;
// //           opacity: 1 !important;
// //           width: 14px !important;
// //           height: 14px !important;
// //           min-width: 14px !important;
// //           min-height: 14px !important;
// //           stroke: #64748b !important;
// //           color: #64748b !important;
// //           flex-shrink: 0 !important;
// //           pointer-events: none;
// //         }
// //         .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
// //         /* Disabled buttons (e.g. pagination arrows when there's only one
// //            page) were stacking two dimming effects — button opacity AND a
// //            very light icon stroke — which combined to make them basically
// //            invisible rather than just "grayed out". Dim via icon color only
// //            so the button/icon stay visibly present. */
// //         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
// //         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
// //         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

// //         /* The pagination row can now hold many number buttons
// //            (1 2 3 4 ... 53), so let it wrap on narrow screens instead of
// //            overflowing, and give the "..." marker its own non-interactive
// //            look (no hover state, no pointer). */
// //         .eb-pagination-row { flex-wrap: wrap; }
// //         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
// //         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

// //         .eb-chart-container { padding: 20px; }

// //         /* Flat-mode "per-room" cards inside the Add EB Reading dialog.
// //            Previously each room's Room/Prev/Current header was re-rendered
// //            right above that room's own inputs, so an empty Current field's
// //            placeholder text ("Current") sat directly under the "Current"
// //            column label with almost no gap (mb-1) — visually it read as one
// //            overlapping blob rather than a label + an empty field. Each field
// //            now carries its own persistent <Label>, so there's nothing that
// //            can look "covered" regardless of whether the input has a value,
// //            and the room is broken into its own bordered, padded card so the
// //            whole section reads clearly even when rooms mix AC/non-AC. */
// //         .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
// //         .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
// //         .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
// //       `}</style>

// //       <div className="eb-wrap">
// //         <div className="eb-layout">
// //           <div>
// //             <div className="eb-panel">
// //               <div className="eb-panel-header">
// //                 <div className="eb-panel-title">EB Readings List</div>
// //                 <div className="flex gap-2">
// //                   <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
// //                     <Download size={14} className="mr-2" /> Export
// //                   </Button>
// //                   {hasAccess && (
// //                     <DropdownMenu>
// //                       <DropdownMenuTrigger asChild>
// //                         <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
// //                           <Plus size={14} className="mr-2" /> Add EB Reading
// //                         </Button>
// //                       </DropdownMenuTrigger>
// //                       <DropdownMenuContent align="end">
// //                         <DropdownMenuItem onClick={openAddDialog}>Single Room Reading</DropdownMenuItem>
// //                         <DropdownMenuItem onClick={() => setUploadOpen(true)}>Upload Excel Reading</DropdownMenuItem>
// //                       </DropdownMenuContent>
// //                     </DropdownMenu>
// //                   )}
// //                 </div>
// //               </div>

// //               {/* Filters */}
// //               <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
// //                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
// //                   <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!hasAccess || !canPickBranch}>
// //                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
// //                       <SelectValue placeholder="All Branches" />
// //                     </SelectTrigger>
// //                     <SelectContent>
// //                       <SelectItem value="all">All Branches</SelectItem>
// //                       {branches.map(b => (
// //                         <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
// //                       ))}
// //                     </SelectContent>
// //                   </Select>
// //                 </div>

// //                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
// //                   <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
// //                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
// //                       <SelectValue placeholder="All Rooms" />
// //                     </SelectTrigger>
// //                     <SelectContent>
// //                       <SelectItem value="all">All Rooms</SelectItem>
// //                       {filteredRooms.map(r => (
// //                         <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
// //                       ))}
// //                     </SelectContent>
// //                   </Select>
// //                 </div>

// //                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
// //                   <Select
// //                     value={`${selYear}-${selMonth}`}
// //                     onValueChange={val => {
// //                       const [y, m] = val.split("-").map(Number);
// //                       setSelYear(y);
// //                       setSelMonth(m);
// //                     }}
// //                   >
// //                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
// //                       <SelectValue placeholder="Select month" />
// //                     </SelectTrigger>
// //                     <SelectContent>
// //                       {monthYearOptions.map(opt => (
// //                         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
// //                       ))}
// //                     </SelectContent>
// //                   </Select>
// //                 </div>

// //                 <button className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a]" onClick={() => {
// //                   setSelectedBranch(defaultBranch);
// //                   setSelectedRoomId("all");
// //                   setSelMonth(now.getMonth() + 1);
// //                   setSelYear(now.getFullYear());
// //                 }}>
// //                   <RefreshCw size={14} /> Clear
// //                 </button>
// //               </div>

// //               <div className="overflow-x-auto">
// //                 <table className="eb-table">
// //                   <thead>
// //                     <tr>
// //                       <th>ROOM / BED</th>
// //                       <th>PREV READING</th>
// //                       <th>CURR READING</th>
// //                       <th>UNITS</th>
// //                       <th>AMOUNT (₹)</th>
// //                       <th>STATUS</th>
// //                       <th>ACTIONS</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {paginatedRows.length === 0 ? (
// //                       <tr>
// //                         <td colSpan={7} className="text-center py-12 text-slate-400">No EB readings found.</td>
// //                       </tr>
// //                     ) : (
// //                       paginatedRows.map((row, i) => {
// //                         const rName = roomMap[row.roomId] || "Unknown";
// //                         const tenantName = row.tenantName || "Unassigned";
// //                         const prev = Number(row.previousReading ?? 0);
// //                         const curr = Number(row.currentReading ?? 0);
// //                         const units = row.unitsConsumed != null
// //                           ? Math.round(Number(row.unitsConsumed))
// //                           : Math.round(curr - prev);

// //                         const amount = Math.round(Number(row.tenantAmount ?? 0));
// //                         const status = row.tenantAmount ? "Pending" : "Not Read";

// //                         return (
// //                           <tr key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${i}`}>
// //                             <td>
// //                               <div className="eb-room-name">{rName}</div>
// //                               <div className="eb-tenant-name">{tenantName}</div>
// //                             </td>
// //                             <td><span className="eb-reading-val">{prev}</span></td>
// //                             <td><span className="eb-reading-val">{curr || "—"}</span></td>
// //                             <td><span className="eb-reading-val">{units || "—"}</span></td>
// //                             <td><span className="eb-amount">{amount ? `₹${new Intl.NumberFormat('en-IN').format(amount)}` : "—"}</span></td>
// //                             <td><div className={`eb-status ${status.toLowerCase().replace(' ', '-')}`}>{status}</div></td>
// //                             <td>
// //                               <div className="flex gap-2">
// //                                 <button className="eb-action-btn" onClick={() => handleSendWhatsApp(row.roomId)} title="Send Bill">
// //                                   <Send size={14} />
// //                                 </button>
// //                                 {hasAccess && (
// //                                   <button
// //                                     className="eb-action-btn"
// //                                     onClick={() => handleDeleteReadingClick(row)}
// //                                     title="Delete"
// //                                   >
// //                                     <Trash2 size={14} />
// //                                   </button>
// //                                 )}
// //                               </div>
// //                             </td>
// //                           </tr>
// //                         );
// //                       })
// //                     )}
// //                   </tbody>
// //                 </table>
// //               </div>

// //               <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
// //                 <div className="text-[13px] text-[#64748b]">
// //                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
// //                 </div>
// //                 {/* Numbered pagination row (1 2 3 … n). Prev/Next chevrons
// //                     stay on either end and disable correctly at the
// //                     first/last page. */}
// //                 <div className="flex gap-2 eb-pagination-row">
// //                   <button
// //                     className="eb-action-btn w-8"
// //                     disabled={currentPage === 0}
// //                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
// //                   >
// //                     <ChevronLeft size={14} />
// //                   </button>

// //                   {pageNumbers.map((p, idx) =>
// //                     p === "..." ? (
// //                       <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis">
// //                         <MoreHorizontal size={14} />
// //                       </span>
// //                     ) : (
// //                       <button
// //                         key={p}
// //                         className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
// //                         onClick={() => setCurrentPage(p - 1)}
// //                       >
// //                         {p}
// //                       </button>
// //                     )
// //                   )}

// //                   <button
// //                     className="eb-action-btn w-8"
// //                     disabled={currentPage + 1 >= totalPages}
// //                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
// //                   >
// //                     <ChevronRight size={14} />
// //                   </button>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {hasAccess && (
// //           <>
            
// //             <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
// //               <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
// //                 <div className="relative max-h-[90vh] overflow-y-auto p-6">
// //                   <DialogClose asChild>
// //                     <button
// //                       type="button"
// //                       aria-label="Close"
// //                       className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
// //                     >
// //                       <X className="h-4 w-4 shrink-0" />
// //                     </button>
// //                   </DialogClose>

// //                   <DialogHeader>
// //                     <DialogTitle>Add EB Reading</DialogTitle>
// //                     <DialogDescription>Enter the electricity meter readings for this month.</DialogDescription>
// //                   </DialogHeader>

// //                   <div className="grid gap-4 mt-2">
// //                     {/* Branch + Flat side by side */}
// //                     <div className="grid grid-cols-2 gap-4">
// //                       <div className="space-y-1.5">
// //                         <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
// //                         {canPickBranch ? (
// //                           <Select
// //                             value={formBranchId}
// //                             onValueChange={val => {
// //                               setFormBranchId(val);
// //                               setFormFlatId("all");
// //                               setFormRoomId("");
// //                               setRoomSearch("");
// //                               // Branch changed → the flat list this search
// //                               // was filtering no longer applies.
// //                               setFlatSearch("");
// //                             }}
// //                           >
// //                             <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
// //                             <SelectContent>
// //                               {branches.map(b => (
// //                                 <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
// //                               ))}
// //                             </SelectContent>
// //                           </Select>
// //                         ) : (
// //                           <div className="flex items-center px-3 py-2 rounded-lg border bg-muted text-sm font-medium text-muted-foreground h-9">
// //                             <span className="text-foreground font-semibold">
// //                               {branches.find(b => Number(b.id) === Number(formBranchId))?.unitName ?? "Unit"}
// //                             </span>
// //                           </div>
// //                         )}
// //                       </div>

// //                       <div className="space-y-1.5">
// //                         <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
// //                         <Select
// //                           value={formFlatId}
// //                           onValueChange={val => { setFormFlatId(val); setFlatSearch(""); }}
// //                           disabled={canPickBranch && !formBranchId}
// //                         >
// //                           <SelectTrigger className="rounded-lg">
// //                             <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
// //                           </SelectTrigger>
// //                           <SelectContent>
// //                             <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
// //                               <Input placeholder="Search flat..." value={flatSearch}
// //                                 onChange={e => setFlatSearch(e.target.value)}
// //                                 onKeyDown={e => e.stopPropagation()}
// //                                 className="h-8 text-sm rounded-lg" autoFocus />
// //                             </div>
// //                             <SelectItem value="all">Select Flat</SelectItem>
// //                             {dialogFlats.length === 0 ? (
// //                               <div className="px-3 py-2 text-sm text-muted-foreground">No flat available</div>
// //                             ) : (
// //                               <>
// //                                 {dialogFilteredFlats.map(f => (
// //                                   <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
// //                                 ))}
// //                                 {dialogFilteredFlats.length === 0 && (
// //                                   <div className="px-3 py-2 text-sm text-muted-foreground">No flat found</div>
// //                                 )}
// //                               </>
// //                             )}
// //                           </SelectContent>
// //                         </Select>
// //                       </div>
// //                     </div>

// //                     {(formFlatId && formFlatId !== "all") ? (
// //                       <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1">
// //                         {flatRoomRows.map(row => (
// //                           <div key={row.roomId} className="eb-flat-room-card">
// //                             <div className="eb-flat-room-title">Room {row.roomNumber}</div>
// //                             <div className={`grid ${row.isAc ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} gap-4`}>
// //                               <div className="space-y-1.5">
// //                                 <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
// //                                 <Input className="rounded-lg bg-white" value={row.previousReading} readOnly />
// //                               </div>
// //                               <div className="space-y-1.5">
// //                                 <Label className="text-xs font-medium text-muted-foreground">Current</Label>
// //                                 <Input
// //                                   className="rounded-lg bg-white"
// //                                   placeholder="Enter current reading"
// //                                   value={row.currentReading}
// //                                   onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)}
// //                                 />
// //                               </div>
// //                               {row.isAc && (
// //                                 <>
// //                                   <div className="space-y-1.5">
// //                                     <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
// //                                     <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
// //                                   </div>
// //                                   <div className="space-y-1.5">
// //                                     <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
// //                                     <Input
// //                                       className="rounded-lg bg-white"
// //                                       placeholder="Enter AC current reading"
// //                                       value={row.acCurrentReading}
// //                                       onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)}
// //                                     />
// //                                   </div>
// //                                 </>
// //                               )}
// //                             </div>
// //                           </div>
// //                         ))}
// //                       </div>
// //                     ) : (
// //                       <>
// //                         <div className="space-y-1.5">
// //                           <Label className="text-xs font-medium text-muted-foreground">Room</Label>
// //                           <Select
// //                             value={formRoomId}
// //                             onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
// //                             disabled={canPickBranch && !formBranchId}
// //                           >
// //                             <SelectTrigger className="rounded-lg">
// //                               <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
// //                             </SelectTrigger>
// //                             <SelectContent>
// //                               <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
// //                                 <Input placeholder="Search room..." value={roomSearch}
// //                                   onChange={e => setRoomSearch(e.target.value)}
// //                                   onKeyDown={e => e.stopPropagation()}
// //                                   className="h-8 text-sm rounded-lg" autoFocus />
// //                               </div>
// //                               {dialogFlatFilteredRooms
// //                                 .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
// //                                 .map(r => (
// //                                   <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
// //                                 ))}
// //                               {/* When this branch's rooms are all attached to
// //                                   flats (no standalone rooms exist at all), telling the
// //                                   user "No room found" reads like a bug/dead-end. Point
// //                                   them at the Flat dropdown above instead, which is the
// //                                   actual way to enter readings for those rooms. Plain
// //                                   search misses (standalone rooms exist, just none match
// //                                   the typed text) still show the old generic message. */}
// //                               {dialogFlatFilteredRooms.filter(r =>
// //                                 r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
// //                               ).length === 0 && (
// //                                 <div className="px-3 py-2 text-sm text-muted-foreground">
// //                                   {dialogStandaloneRooms.length === 0
// //                                     ? "No standalone rooms in this branch — select a flat above instead"
// //                                     : "No room found"}
// //                                 </div>
// //                               )}
// //                             </SelectContent>
// //                           </Select>
// //                         </div>

// //                         {/* Only appears when this room currently has more
// //                             than one active tenant sharing the same meter
// //                             AND no reading has been saved for this room this
// //                             month yet (once one exists, "Previous" is derived
// //                             from it directly — see roomReadingsThisMonth
// //                             above — so no tenant pick is needed). */}
// //                         {roomActiveTenants.length > 1 && roomReadingsThisMonth.length === 0 && (
// //                           <div className="space-y-1.5">
// //                             <Label className="text-xs font-medium text-muted-foreground">
// //                               Tenant (this reading is a checkout for)
// //                             </Label>
// //                             <Select value={formTenantId} onValueChange={setFormTenantId}>
// //                               <SelectTrigger className="rounded-lg">
// //                                 <SelectValue placeholder="Select tenant" />
// //                               </SelectTrigger>
// //                               <SelectContent>
// //                                 {roomActiveTenants.map(t => (
// //                                   <SelectItem key={t.id} value={String(t.id)}>
// //                                     {t.name} — joined at {t.joinReading ?? "—"}
// //                                   </SelectItem>
// //                                 ))}
// //                               </SelectContent>
// //                             </Select>
// //                           </div>
// //                         )}

// //                         {/* Previous + Current side by side */}
// //                         <div className="grid grid-cols-2 gap-4">
// //                           <div className="space-y-1.5">
// //                             <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
// //                             <Input
// //                               className="rounded-lg"
// //                               placeholder={
// //                                 roomActiveTenants.length > 1 &&
// //                                 roomReadingsThisMonth.length === 0 &&
// //                                 !formTenantId
// //                                   ? "Select a tenant first"
// //                                   : "Previous"
// //                               }
// //                               value={formPrevReading}
// //                               readOnly
// //                             />
// //                           </div>
// //                           <div className="space-y-1.5">
// //                             <Label className="text-xs font-medium text-muted-foreground">Current</Label>
// //                             <Input className="rounded-lg" placeholder="Current" value={formCurrReading}
// //                               onChange={e => setFormCurrReading(e.target.value)} />
// //                           </div>
// //                         </div>

// //                         {selectedRoomObj?.hostelType === "AC" && (
// //                           <div className="grid grid-cols-2 gap-4">
// //                             <div className="space-y-1.5">
// //                               <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
// //                               <Input className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
// //                             </div>
// //                             <div className="space-y-1.5">
// //                               <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
// //                               <Input className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
// //                                 onChange={e => setFormAcCurr(e.target.value)} />
// //                             </div>
// //                           </div>
// //                         )}
// //                       </>
// //                     )}

// //                     <div className="flex items-center gap-2">
// //                       <Label className="text-xs font-medium text-muted-foreground">Mode:</Label>
// //                       <Button size="sm" className="rounded-lg" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
// //                       <Button size="sm" className="rounded-lg" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
// //                     </div>

// //                     {manualMode && (
// //                       <div className="space-y-2">
// //                         <Label className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
// //                         {(!formFlatId || formFlatId === "all") && (
// //                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
// //                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
// //                             placeholder="Enter rate for this room" />
// //                         )}
// //                         {(formFlatId && formFlatId !== "all") && (
// //                           <div className="space-y-2">
// //                             {flatRoomRows.map(row => (
// //                               <div key={row.roomId} className="flex gap-2 items-center">
// //                                 <span className="w-24 text-sm">{row.roomNumber}</span>
// //                                 <Input className="rounded-lg" type="number" value={manualRate}
// //                                   onChange={e => {
// //                                     const val = Number(e.target.value);
// //                                     setManualRate(val);
// //                                     const updated: Record<string, number> = {};
// //                                     flatRoomRows.forEach(r => { updated[String(r.roomId)] = val; });
// //                                     setRoomManualRates(prev => ({ ...prev, ...updated }));
// //                                   }}
// //                                   placeholder="Enter unit rate for all rooms" />
// //                               </div>
// //                             ))}
// //                           </div>
// //                         )}
// //                       </div>
// //                     )}
// //                   </div>

// //                   <DialogFooter className="mt-4">
// //                     <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
// //                     <Button className="rounded-lg" onClick={handleAdd} disabled={isSaving}>
// //                       {isSaving ? "Saving..." : "Save"}
// //                     </Button>
// //                   </DialogFooter>
// //                 </div>
// //               </DialogContent>
// //             </Dialog>
// //           </>
// //         )}
// //       </div>

// //       {/* ── Bill Dialog — rounded-2xl + contained scroll, matching the
// //           Add dialog's pattern. */}
// //       <Dialog open={billOpen} onOpenChange={setBillOpen}>
// //         <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
// //           <div className="relative max-h-[90vh] overflow-y-auto p-6">
// //             <DialogClose asChild>
// //               <button
// //                 type="button"
// //                 aria-label="Close"
// //                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
// //               >
// //                 <X className="h-4 w-4 shrink-0" />
// //               </button>
// //             </DialogClose>
// //             <DialogHeader>
// //               <DialogTitle>EB Bill - Room {billRoom}</DialogTitle>
// //               <DialogDescription>Tenant wise electricity bill</DialogDescription>
// //             </DialogHeader>
// //             <div className="space-y-3 max-h-[400px] overflow-y-auto">
// //               {tenantBills.length === 0 && (
// //                 <p className="text-sm text-muted-foreground">No tenant bill found</p>
// //               )}
// //               {tenantBills.map((bill, i) => (
// //                 <div key={i} className="flex justify-between border p-3 rounded-lg">
// //                   <div>
// //                     <p className="font-medium">{bill.tenantName || bill.name}</p>
// //                     <p className="text-sm text-muted-foreground">{bill.acUser ? "AC User" : "Non-AC User"}</p>
// //                   </div>
// //                   <div className="font-semibold">₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}</div>
// //                 </div>
// //               ))}
// //             </div>
// //             <DialogFooter>
// //               <DialogClose asChild><Button variant="outline" className="rounded-lg">Close</Button></DialogClose>
// //             </DialogFooter>
// //           </div>
// //         </DialogContent>
// //       </Dialog>

// //       {/* ── Upload Dialog — rounded-2xl, matching the Add dialog's pattern. */}
// //       <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
// //         <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
// //           <div className="relative p-6">
// //             <DialogClose asChild>
// //               <button
// //                 type="button"
// //                 aria-label="Close"
// //                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
// //               >
// //                 <X className="h-4 w-4 shrink-0" />
// //               </button>
// //             </DialogClose>
// //             <DialogHeader>
// //               <DialogTitle>Upload EB Excel</DialogTitle>
// //               <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
// //             </DialogHeader>
// //             <Input className="rounded-lg" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
// //             <DialogFooter>
// //               <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
// //             </DialogFooter>
// //           </div>
// //         </DialogContent>
// //       </Dialog>

// //       <Dialog open={!!confirmState} onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
// //         <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
// //           <DialogHeader>
// //             <DialogTitle>{confirmState?.title}</DialogTitle>
// //             {confirmState?.description && (
// //               <DialogDescription>{confirmState.description}</DialogDescription>
// //             )}
// //           </DialogHeader>
// //           <DialogFooter>
// //             <Button variant="outline" className="rounded-lg" onClick={() => setConfirmState(null)}>Cancel</Button>
// //             <Button
// //               variant={confirmState?.danger ? "destructive" : "default"}
// //               className={confirmState?.danger ? "rounded-lg bg-red-600 hover:bg-red-700 text-white" : "rounded-lg"}
// //               onClick={() => {
// //                 const action = confirmState?.onConfirm;
// //                 setConfirmState(null);
// //                 action?.();
// //               }}
// //             >
// //               {confirmState?.confirmLabel ?? "OK"}
// //             </Button>
// //           </DialogFooter>
// //         </DialogContent>
// //       </Dialog>

// //     </div>
// //   );
// // };

// // export default EBReadingsPage;



























































































































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
//   deleteEBReadingsByFlat,
//   deleteEBReadingsByRoom,
//   fetchAllPages,
// } from "@/lib/store";

// import { Room, EBReading, Tenant, Branch, Flat } from "@/lib/types";

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
// import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";

// const EBReadingsPage = () => {
//   // ── role is uppercased for all comparisons ────────────────────────────
//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId(); // number | null

//   const isAdmin   = role === "ADMIN" || role === "WARDEN";
//   const hasAccess = isAdmin;
//   const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

//   // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
//   const defaultBranch =
//     role === "ADMIN" || role === "SUPER_ADMIN"
//       ? "all"
//       : branchId != null ? String(branchId) : "all";

//   const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

//   const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

//   const [rooms,        setRooms]        = useState<Room[]>([]);
//   const [readings,     setReadings]     = useState<EBReading[]>([]);
//   const [tenants,      setTenants]      = useState<Tenant[]>([]);
//   const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
//   const [branches,     setBranches]     = useState<Branch[]>([]);
//   const [flats,        setFlats]        = useState<Flat[]>([]);
//   const [tenantRows,   setTenantRows]   = useState<any[]>([]);
//   const [flatRoomRows, setFlatRoomRows] = useState<any[]>([]);
//   const [tenantBills,  setTenantBills]  = useState<any[]>([]);

//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [addOpen,    setAddOpen]    = useState(false);
//   const [billOpen,   setBillOpen]   = useState(false);
//   const [isSaving,   setIsSaving]   = useState(false);

//   const [manualRate,      setManualRate]      = useState<number | "">(13);
//   const [manualMode,      setManualMode]      = useState(false);
//   const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

//   // Page-level "flat" filter shown in the table's filter row.
//   const [formFlatId,      setFormFlatId]      = useState("all");
//   const [formRoomId,      setFormRoomId]      = useState("");
//   // Which tenant this room-level reading is a checkout FOR. Only
//   // relevant/shown when the selected room currently has more than one
//   // active tenant sharing the same meter AND more than one of them still
//   // needs a reading recorded this month — see roomActiveTenants and
//   // unreadActiveTenants below.
//   const [formTenantId,    setFormTenantId]    = useState("");
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [roomSearch,      setRoomSearch]      = useState("");
//   const [flatSearch,      setFlatSearch]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");
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

//   /* ─── RATE ─────────────────────────────────────────────── */
//   const getRateForRoom = (roomId: string | number) => {
//     const roomRate = roomManualRates[String(roomId)];
//     if (manualMode && roomRate !== undefined) return roomRate;
//     if (typeof manualRate === "number") return manualRate;
//     return 13;
//   };

//   /* ─── IS AC ─────────────────────────────────────────────── */
//   const isRoomAc = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       return room?.hostelType === "AC";
//     },
//     [rooms]
//   );

//   /* ─── FLAT ROW CHANGE ───────────────────────────────────── */
//   const handleFlatRowChange = (
//     roomId: string | number,
//     field: "currentReading" | "acCurrentReading",
//     value: string
//   ) => {
//     setFlatRoomRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, [field]: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const roomSpecific = allReadings
//         .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });
//       if (roomSpecific.length > 0) return Number(roomSpecific[0].acCurrentReading ?? 0);
//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0)
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       return 0;
//     },
//     [allReadings, tenants]
//   );

//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
//       if (roomReadings.length > 0) {
//         const sorted = [...roomReadings].sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           return b.month - a.month;
//         });
//         return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//       }
//       if (room?.flatId) {
//         const flatReadings = allReadings.filter(
//           r => String(r.flatId) === String(room.flatId)
//         );
//         if (flatReadings.length > 0) {
//           const sorted = [...flatReadings].sort((a, b) => {
//             if (b.year !== a.year) return b.year - a.year;
//             return b.month - a.month;
//           });
//           return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//         }
//       }
//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0)
//         return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
//       return 0;
//     },
//     [allReadings, tenants, rooms]
//   );

//   const getRoomIdByRoomNumber = (roomNumber: string) =>
//     rooms.find(r => r.roomNumber === roomNumber)?.id;

//   /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
//   const filteredRooms = useMemo(() => {
//     if (selectedBranch === "all") return rooms;
//     return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
//   }, [rooms, selectedBranch]);

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

//   const dialogFilteredFlats = useMemo(
//     () => dialogFlats.filter(f => f.flatNumber.toLowerCase().includes(flatSearch.toLowerCase())),
//     [dialogFlats, flatSearch]
//   );

//   const roomMap = useMemo(() => {
//     const map: Record<string, string> = {};
//     rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
//     return map;
//   }, [rooms]);

//   // Tenants currently active in the room selected in the Add dialog
//   // (single-room mode only). When a room's meter is shared by more than
//   // one active tenant, "Previous" can no longer be filled from a single
//   // room-level "last reading" value — each tenant has their own join
//   // reading, and the checkout being recorded here belongs to exactly one
//   // of them. Sorted by joinReading so earliest joiner (usually who the
//   // admin is checking out first) appears first.
//   const roomActiveTenants = useMemo(() => {
//     if (!formRoomId) return [];
//     return tenants
//       .filter(
//         t =>
//           String(t.roomId) === String(formRoomId) &&
//           String(t.status).toLowerCase() === "active"
//       )
//       .sort((a, b) => Number(a.joinReading ?? 0) - Number(b.joinReading ?? 0));
//   }, [tenants, formRoomId]);

//   // Readings already saved for the currently-selected room, for the EXACT
//   // month/year being entered in this dialog. Checking out a tenant through
//   // this dialog doesn't flip that tenant to "inactive" — that only happens
//   // on the separate Tenant Check-Out page — so a tenant can still show up
//   // in roomActiveTenants above even after their own checkout reading was
//   // already saved this month.
//   //
//   // Each saved reading this month is its own tenant's checkout segment
//   // (previousReading = that tenant's own join reading), not one
//   // continuously-advancing meter value. So we can NEVER just take the
//   // min/max across all of them to decide the next tenant's "Previous" —
//   // that silently attributes one tenant's segment to another. Instead we
//   // match each reading back to the SPECIFIC tenant it belongs to (see
//   // findOwnReadingThisMonth below) and only ever use a tenant's own
//   // matched reading to prefill their own "Previous".
//   const roomReadingsThisMonth = useMemo(() => {
//     if (!formRoomId) return [];
//     return allReadings.filter(
//       r =>
//         r.roomId != null &&
//         String(r.roomId) === String(formRoomId) &&
//         r.month === selMonth &&
//         r.year === selYear
//     );
//   }, [allReadings, formRoomId, selMonth, selYear]);

//   // A reading saved this month "belongs" to a given tenant only if its
//   // previousReading matches THAT tenant's own joinReading — i.e. it's the
//   // entry recorded for their segment of a shared meter, not some other
//   // tenant's segment. This is what lets us tell "Askingin already has a
//   // reading this month" apart from "Anbarasan already has a reading this
//   // month" even though both share the same room/meter.
//   const findOwnReadingThisMonth = useCallback(
//     (tenant: Tenant) => {
//       const join = Number(tenant.joinReading ?? NaN);
//       if (!Number.isFinite(join)) return undefined;
//       return roomReadingsThisMonth.find(
//         r => Number(r.previousReading) === join
//       );
//     },
//     [roomReadingsThisMonth]
//   );

//   // Active tenants in this room who do NOT yet have their own reading
//   // recorded for the selected month — i.e. still need a fresh entry. A
//   // tenant who has already been checked out via this dialog this month
//   // (and so has a reading matching their own joinReading) is excluded,
//   // even though they may still show as "Active" until the separate
//   // Tenant Check-Out page is used.
//   const unreadActiveTenants = useMemo(
//     () => roomActiveTenants.filter(t => !findOwnReadingThisMonth(t)),
//     [roomActiveTenants, findOwnReadingThisMonth]
//   );

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
//     return data;
//   }, [readings, rooms, selectedBranch, selMonth, selYear]);

//   /* ─── RELOAD ─────────────────────────────────────────────── */
//   const reload = async () => {
//     const [
//       roomsResult,
//       readingsResult,
//       tenantsResult,
//       branchesResult,
//       flatsResult,
//     ] = await Promise.allSettled([
//       fetchAllPages<Room>(getRooms),
//       fetchAllPages<EBReading>(getEBReadings),
//       fetchAllPages<Tenant>(getTenants),
//       fetchAllPages<Branch>(getBranches),
//       fetchAllPages<Flat>(getFlats),
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
//   };

//   const didLoad = useRef(false);
//   useEffect(() => {
//     if (didLoad.current) return;
//     didLoad.current = true;
//     reload();
//   }, []);

//   /* ─── FLAT ROOM ROWS (uses dialog-scoped rooms) ─────────── */
//   useEffect(() => {
//     if (!formFlatId || formFlatId === "all") { setFlatRoomRows([]); return; }
//     const roomsInFlat = dialogRooms.filter(
//       r => String(r.flatId) === String(formFlatId)
//     );
//     const rows = roomsInFlat.map(room => {
//       const allForRoom = readings
//         .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });
//       const latest = allForRoom[0] ?? null;
//       return {
//         roomId:            room.id,
//         roomNumber:        room.roomNumber,
//         isAc:              room.hostelType === "AC",
//         previousReading:   latest != null
//           ? Number(latest.currentReading ?? 0)
//           : getRoomStartingReading(room.id),
//         currentReading:    "",
//         acPreviousReading: latest != null
//           ? Number(latest.acCurrentReading ?? 0)
//           : getRoomStartingACReading(room.id),
//         acCurrentReading:  "",
//       };
//     });
//     setFlatRoomRows(rows);
//   }, [formFlatId, dialogRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE ─────────────────── */
//   // FIX: previously, once ANY reading existed for the room this month,
//   // "Previous" was taken from the min/max of ALL of that room's readings
//   // this month — regardless of which tenant it actually belonged to. That
//   // meant checking out one tenant (e.g. Askingin, 150→170) silently
//   // became the "Previous" for the NEXT tenant's checkout (e.g. Anbarasan,
//   // who should start from their own joinReading of 100, not 170).
//   //
//   // Now: each tenant's own reading this month is matched specifically via
//   // findOwnReadingThisMonth (previousReading === that tenant's own
//   // joinReading). Logic:
//   //   - No active tenants left            → room's own starting reading.
//   //   - Exactly 1 active tenant           → that tenant's own reading if
//   //                                          already saved this month
//   //                                          (continue from their own
//   //                                          currentReading), else their
//   //                                          own joinReading.
//   //   - 2+ active tenants, exactly 1 of
//   //     them still unread this month      → auto-fill from that ONE
//   //                                          tenant's own joinReading
//   //                                          (unambiguous — the others
//   //                                          already have entries).
//   //   - 2+ active tenants, 0 or 2+ of
//   //     them still unread this month      → ambiguous, wait for an
//   //                                          explicit tenant pick.
//   useEffect(() => {
//     if (!formRoomId) return;
//     setFormTenantId("");

//     if (roomActiveTenants.length === 0) {
//       setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//       setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//       return;
//     }

//     if (roomActiveTenants.length === 1) {
//       const only = roomActiveTenants[0];
//       const own = findOwnReadingThisMonth(only);
//       if (own) {
//         // Already has an entry this month — continue from where THEIR
//         // segment left off, not their original join reading.
//         setFormPrevReading(String(Number(own.currentReading ?? 0)));
//         setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
//       } else {
//         setFormPrevReading(
//           String(only.joinReading ?? getRoomStartingReading(formRoomId))
//         );
//         setFormAcPrev(
//           String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
//         );
//       }
//       return;
//     }

//     // Multiple active tenants sharing this meter.
//     if (unreadActiveTenants.length === 1) {
//       // Only one of them still needs an entry this month — unambiguous,
//       // no need to force an explicit pick.
//       const only = unreadActiveTenants[0];
//       setFormPrevReading(
//         String(only.joinReading ?? getRoomStartingReading(formRoomId))
//       );
//       setFormAcPrev(
//         String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
//       );
//     } else {
//       // Either nobody has been read yet (0) or more than one still needs
//       // an entry (2+) — in both cases we can't guess which tenant this
//       // new entry is for. Wait for an explicit pick.
//       setFormPrevReading("");
//       setFormAcPrev("");
//     }
//   }, [
//     formRoomId,
//     roomActiveTenants,
//     unreadActiveTenants,
//     findOwnReadingThisMonth,
//     getRoomStartingReading,
//     getRoomStartingACReading,
//   ]);

//   // Once the admin picks which tenant this checkout reading belongs to
//   // (only shown/needed when roomActiveTenants.length > 1 AND more than
//   // one of them still needs an entry this month), pull "Previous" /
//   // "AC Previous" from THAT tenant's own data — their own saved reading
//   // this month if one exists, else their own join reading.
//   useEffect(() => {
//     if (!formTenantId) return;
//     const t = roomActiveTenants.find(rt => String(rt.id) === String(formTenantId));
//     if (!t) return;
//     const own = findOwnReadingThisMonth(t);
//     if (own) {
//       setFormPrevReading(String(Number(own.currentReading ?? 0)));
//       setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
//     } else {
//       setFormPrevReading(
//         String(t.joinReading ?? getRoomStartingReading(formRoomId))
//       );
//       setFormAcPrev(
//         String(t.acJoinReading ?? getRoomStartingACReading(formRoomId))
//       );
//     }
//   }, [
//     formTenantId,
//     roomActiveTenants,
//     findOwnReadingThisMonth,
//     formRoomId,
//     getRoomStartingReading,
//     getRoomStartingACReading,
//   ]);

//   /* ─── BUILD TENANT BILL ROWS ─────────────────────────────── */
//   useEffect(() => {
//     const loadTenantBills = async () => {
//       const rows: any[] = [];
//       const flatHandled = new Set<number>();
//       const roomHandled = new Set<number>();

//       const flatReadingMap = new Map<number, EBReading>();
//       for (const r of filteredReadings.filter(r => r.flatId != null)) {
//         const existing = flatReadingMap.get(r.flatId!);
//         if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
//           flatReadingMap.set(r.flatId!, r);
//         }
//       }

//       for (const r of Array.from(flatReadingMap.values())) {
//         if (flatHandled.has(r.flatId!)) continue;
//         flatHandled.add(r.flatId!);
//         try {
//           const bills = await getTenantWiseEBBill({
//             flatId: r.flatId,
//             month: r.month,
//             year: r.year,
//           });

//           const flatTenantIds = new Set(
//             tenants
//               .filter(t => {
//                 const room = rooms.find(rm => rm.id === t.roomId);
//                 return room && String(room.flatId) === String(r.flatId);
//               })
//               .map(t => Number(t.id))
//           );

//           bills
//             .filter((b: any) => b.tenantId == null || flatTenantIds.has(Number(b.tenantId)))
//             .forEach((b: any) => {
//               rows.push({
//                 id: r.id,
//                 roomId: getRoomIdByRoomNumber(b.roomNumber),
//                 flatId: r.flatId,
//                 roomNumber: b.roomNumber,
//                 flatNumber: b.flatNumber,
//                 branchId: (r as any).branchId ?? null,
//                 branchName: (r as any).branchName ?? null,
//                 tenantName: b.tenantName,
//                 previousReading: b.previousReading,
//                 currentReading: b.currentReading,
//                 acPreviousReading: b.acPreviousReading,
//                 acCurrentReading: b.acCurrentReading,
//                 unitsConsumed: b.totalUnits,
//                 tenantAmount: b.amount,
//               });
//             });
//         } catch { /* skip failed flat */ }
//       }

//       const roomReadings = filteredReadings.filter(r => {
//         const room = rooms.find(rm => rm.id === r.roomId);
//         return !room?.flatId && r.roomId != null;
//       });
//       for (const r of roomReadings) {
//         const room = rooms.find(rm => rm.id === r.roomId);
//         if (!room) continue;
//         if (room.flatId && flatHandled.has(room.flatId)) continue;
//         if (roomHandled.has(r.roomId!)) continue;
//         roomHandled.add(r.roomId!);
//         try {
//           // FIX: same as above — pass this reading's own month/year
//           // through instead of omitting them.
//           const bills = await getTenantWiseEBBill({
//             roomId: r.roomId,
//             month: r.month,
//             year: r.year,
//           });

//           const roomTenantIds = new Set(
//             tenants
//               .filter(t => String(t.roomId) === String(room.id))
//               .map(t => Number(t.id))
//           );

//           const matchedBills = bills.filter(
//             (b: any) => b.tenantId == null || roomTenantIds.has(Number(b.tenantId))
//           );

//           if (matchedBills.length > 0) {
//             matchedBills.forEach((b: any) => {
//               rows.push({
//                 id: r.id,
//                 roomId: room.id,
//                 flatId: room.flatId,
//                 roomNumber: room.roomNumber,
//                 flatNumber: b.flatNumber,
//                 branchId: (r as any).branchId ?? null,
//                 branchName: (r as any).branchName ?? null,
//                 tenantName: b.tenantName,
//                 previousReading: b.previousReading ?? r.previousReading,
//                 currentReading: b.currentReading ?? r.currentReading,
//                 acPreviousReading: b.acPreviousReading,
//                 acCurrentReading: b.acCurrentReading,
//                 unitsConsumed: Number(b.totalUnits ?? 0),
//                 tenantAmount: b.amount,
//               });
//             });
//           } else {
//             rows.push({
//               id: r.id,
//               roomId: room.id,
//               flatId: room.flatId,
//               roomNumber: room.roomNumber,
//               flatNumber: "-",
//               branchId: (r as any).branchId ?? null,
//               branchName: (r as any).branchName ?? null,
//               tenantName: "-",
//               previousReading: r.previousReading,
//               currentReading: r.currentReading,
//               acPreviousReading: r.acPreviousReading,
//               acCurrentReading: r.acCurrentReading,
//               unitsConsumed:
//                 r.currentReading != null && r.previousReading != null
//                   ? Number(r.currentReading) - Number(r.previousReading)
//                   : 0,
//               tenantAmount: 0,
//             });
//           }
//         } catch { /* skip failed room */ }
//       }
//       setTenantRows(rows);
//     };

//     if (filteredReadings.length > 0) loadTenantBills();
//     else setTenantRows([]);
//   }, [filteredReadings, roomMap, rooms, tenants]);

//   /* ─── ADD READING ───────────────────────────────────────── */
//   const handleAdd = async () => {
//     if (isSaving) return;

//     // Require an explicit branch for roles that can see multiple branches.
//     // WARDEN never hits this because formBranchId is pre-filled to their
//     // own branch when the dialog opens.
//     if (canPickBranch && !formBranchId) {
//       toast.error("Select a branch first");
//       return;
//     }

//     setIsSaving(true);
//     try {
//       const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

//       if (formFlatId && formFlatId !== "all") {
//         const validRows = flatRoomRows.filter(row => row.currentReading !== "");
//         if (validRows.length === 0) { toast.error("Enter at least one room reading"); return; }
//         for (const row of validRows) {
//           const prev   = Number(row.previousReading);
//           const curr   = Number(row.currentReading);
//           const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
//           const acCurr = row.isAc ? Number(row.acCurrentReading)  : 0;
//           if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }
//           await addEBReading({
//             flatId: Number(formFlatId), roomId: Number(row.roomId),
//             branchId: branchIdNum,
//             month: selMonth, year: selYear,
//             previousReading: prev, currentReading: curr,
//             acPreviousReading: acPrev, acCurrentReading: acCurr,
//             ebRate: getRateForRoom(row.roomId), isCheckout: true,
//           });
//         }
//         toast.success("Flat readings saved");
//       } else {
//         if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
//         // A tenant pick is only required when this room has more than one
//         // active tenant AND more than one of them still needs an entry
//         // this month — see unreadActiveTenants above. If exactly one
//         // still needs an entry, it's unambiguous and was auto-filled.
//         if (
//           roomActiveTenants.length > 1 &&
//           unreadActiveTenants.length !== 1 &&
//           !formTenantId
//         ) {
//           toast.error("Select which tenant this checkout reading is for");
//           return;
//         }
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
//           ebRate: getRateForRoom(formRoomId), isCheckout: true,
//         });
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
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           // Use the room's own branch (unitId) when uploading via Excel,
//           // since there's no per-row branch selector for bulk upload.
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
//           ebRate, isCheckout: true,
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
//         await deleteEBReadingsByFlat(flatId);
//         toast.success("Flat readings deleted");
//       } else if (roomId) {
//         await deleteEBReadingsByRoom(roomId);
//         toast.success("Room readings deleted");
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
//     askConfirm(
//       "Delete this EB reading?",
//       () => {
//         handleDelete(
//           String(row.id),
//           row.flatId ? Number(row.flatId) : undefined,
//           row.roomId ? Number(row.roomId) : undefined
//         );
//       },
//       { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
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
//       const latestReadings = await fetchAllPages<EBReading>(getEBReadings);
//       const data = filteredRooms.map(room => {
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
//         return {
//           RoomNumber: room.roomNumber,
//           Previous:   lastReading?.currentReading ?? 0,
//           Current:    "",
//           AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
//           AcCurrent:  room.hostelType === "AC" ? "" : "-",
//           EbRate:     lastRate,
//         };
//       });
//       const worksheet = XLSX.utils.json_to_sheet(data);
//       worksheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
//       XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
//       toast.success("Excel downloaded");
//     } catch {
//       toast.error("Failed to download Excel");
//     }
//   };

//   /* ─── FILTERED TENANT ROWS ──────────────────────────────── */
//   const filteredTenantRows = useMemo(() => {
//     let data = tenantRows;
//     if (selectedBranch !== "all") {
//       data = data.filter(row => {
//         const room = rooms.find(r => r.id === row.roomId);
//         return Number(room?.unitId) === Number(selectedBranch);
//       });
//     }
//     if (selectedRoomId !== "all") {
//       data = data.filter(row => String(row.roomId) === String(selectedRoomId));
//     }
//     return data;
//   }, [tenantRows, selectedBranch, rooms, selectedRoomId]);

//   /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
//   const selectedRoomObj = useMemo(
//     () => rooms.find(r => String(r.id) === String(formRoomId)),
//     [rooms, formRoomId]
//   );

//   /* ─── RESET DIALOG ──────────────────────────────────────── */
//   const resetAddDialog = () => {
//     setRoomSearch(""); setFlatSearch(""); setFormFlatId("all"); setFormRoomId("");
//     setFormTenantId(""); setFormBranchId("");
//     setFormPrevReading(""); setFormCurrReading("");
//     setFormAcPrev(""); setFormAcCurr("");
//     setFlatRoomRows([]); setManualMode(false);
//     setManualRate(13); setRoomManualRates({});
//   };

//   const openAddDialog = () => {
//     setFormBranchId(
//       role === "WARDEN" && branchId != null
//         ? String(branchId)
//         : selectedBranch !== "all" ? selectedBranch : ""
//     );
//     setAddOpen(true);
//   };

//   /* ─── Pagination ─── */
//   const [currentPage, setCurrentPage] = useState(0);
//   const pageSize = 10;
//   const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

//   // Total page count, used both to bound the "Next" button and to build
//   // the numbered page list below.
//   const totalPages = Math.max(1, Math.ceil(filteredTenantRows.length / pageSize));

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
//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

//         .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
//         @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

//         .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
//         .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
//         .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

//         .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
//         .eb-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .eb-table tr:hover { background: #fdfcff; }

//         .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-tenant-name { font-size: 12px; color: #64748b; margin-top: 2px; }
//         .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }

//         .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
//         .eb-status.collected { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .eb-status.pending { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
//         .eb-status.not-read { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

//         .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
//         /* !important here is deliberate: something elsewhere in the app's
//            global CSS is hiding/zeroing SVGs inside these buttons specifically
//            (lucide icons that render fine elsewhere on this same page were
//            still blank here). Rather than hunt for that rule, these overrides
//            just guarantee the icon paints regardless of what else applies. */
//         .eb-action-btn svg {
//           display: inline-block !important;
//           visibility: visible !important;
//           opacity: 1 !important;
//           width: 14px !important;
//           height: 14px !important;
//           min-width: 14px !important;
//           min-height: 14px !important;
//           stroke: #64748b !important;
//           color: #64748b !important;
//           flex-shrink: 0 !important;
//           pointer-events: none;
//         }
//         .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
//         /* Disabled buttons (e.g. pagination arrows when there's only one
//            page) were stacking two dimming effects — button opacity AND a
//            very light icon stroke — which combined to make them basically
//            invisible rather than just "grayed out". Dim via icon color only
//            so the button/icon stay visibly present. */
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         /* The pagination row can now hold many number buttons
//            (1 2 3 4 ... 53), so let it wrap on narrow screens instead of
//            overflowing, and give the "..." marker its own non-interactive
//            look (no hover state, no pointer). */
//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

//         .eb-chart-container { padding: 20px; }

//         /* Flat-mode "per-room" cards inside the Add EB Reading dialog.
//            Previously each room's Room/Prev/Current header was re-rendered
//            right above that room's own inputs, so an empty Current field's
//            placeholder text ("Current") sat directly under the "Current"
//            column label with almost no gap (mb-1) — visually it read as one
//            overlapping blob rather than a label + an empty field. Each field
//            now carries its own persistent <Label>, so there's nothing that
//            can look "covered" regardless of whether the input has a value,
//            and the room is broken into its own bordered, padded card so the
//            whole section reads clearly even when rooms mix AC/non-AC. */
//         .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
//         .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
//         .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
//       `}</style>

//       <div className="eb-wrap">
//         <div className="eb-layout">
//           <div>
//             <div className="eb-panel">
//               <div className="eb-panel-header">
//                 <div className="eb-panel-title">EB Readings List</div>
//                 <div className="flex gap-2">
//                   <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
//                     <Download size={14} className="mr-2" /> Export
//                   </Button>
//                   {hasAccess && (
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
//                           <Plus size={14} className="mr-2" /> Add EB Reading
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="end">
//                         <DropdownMenuItem onClick={openAddDialog}>Single Room Reading</DropdownMenuItem>
//                         <DropdownMenuItem onClick={() => setUploadOpen(true)}>Upload Excel Reading</DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   )}
//                 </div>
//               </div>

//               {/* Filters */}
//               <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
//                   <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!hasAccess || !canPickBranch}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
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

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
//                   <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="All Rooms" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Rooms</SelectItem>
//                       {filteredRooms.map(r => (
//                         <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
//                   <Select
//                     value={`${selYear}-${selMonth}`}
//                     onValueChange={val => {
//                       const [y, m] = val.split("-").map(Number);
//                       setSelYear(y);
//                       setSelMonth(m);
//                     }}
//                   >
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="Select month" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {monthYearOptions.map(opt => (
//                         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <button className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a]" onClick={() => {
//                   setSelectedBranch(defaultBranch);
//                   setSelectedRoomId("all");
//                   setSelMonth(now.getMonth() + 1);
//                   setSelYear(now.getFullYear());
//                 }}>
//                   <RefreshCw size={14} /> Clear
//                 </button>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="eb-table">
//                   <thead>
//                     <tr>
//                       <th>ROOM / BED</th>
//                       <th>PREV READING</th>
//                       <th>CURR READING</th>
//                       <th>UNITS</th>
//                       <th>AMOUNT (₹)</th>
//                       <th>STATUS</th>
//                       <th>ACTIONS</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginatedRows.length === 0 ? (
//                       <tr>
//                         <td colSpan={7} className="text-center py-12 text-slate-400">No EB readings found.</td>
//                       </tr>
//                     ) : (
//                       paginatedRows.map((row, i) => {
//                         const rName = roomMap[row.roomId] || "Unknown";
//                         const tenantName = row.tenantName || "Unassigned";
//                         const prev = Number(row.previousReading ?? 0);
//                         const curr = Number(row.currentReading ?? 0);
//                         const units = row.unitsConsumed != null
//                           ? Math.round(Number(row.unitsConsumed))
//                           : Math.round(curr - prev);

//                         const amount = Math.round(Number(row.tenantAmount ?? 0));
//                         const status = row.tenantAmount ? "Pending" : "Not Read";

//                         return (
//                           <tr key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${i}`}>
//                             <td>
//                               <div className="eb-room-name">{rName}</div>
//                               <div className="eb-tenant-name">{tenantName}</div>
//                             </td>
//                             <td><span className="eb-reading-val">{prev}</span></td>
//                             <td><span className="eb-reading-val">{curr || "—"}</span></td>
//                             <td><span className="eb-reading-val">{units || "—"}</span></td>
//                             <td><span className="eb-amount">{amount ? `₹${new Intl.NumberFormat('en-IN').format(amount)}` : "—"}</span></td>
//                             <td><div className={`eb-status ${status.toLowerCase().replace(' ', '-')}`}>{status}</div></td>
//                             <td>
//                               <div className="flex gap-2">
//                                 <button className="eb-action-btn" onClick={() => handleSendWhatsApp(row.roomId)} title="Send Bill">
//                                   <Send size={14} />
//                                 </button>
//                                 {hasAccess && (
//                                   <button
//                                     className="eb-action-btn"
//                                     onClick={() => handleDeleteReadingClick(row)}
//                                     title="Delete"
//                                   >
//                                     <Trash2 size={14} />
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

//               <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
//                 <div className="text-[13px] text-[#64748b]">
//                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
//                 </div>
//                 {/* Numbered pagination row (1 2 3 … n). Prev/Next chevrons
//                     stay on either end and disable correctly at the
//                     first/last page. */}
//                 <div className="flex gap-2 eb-pagination-row">
//                   <button
//                     className="eb-action-btn w-8"
//                     disabled={currentPage === 0}
//                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
//                   >
//                     <ChevronLeft size={14} />
//                   </button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis">
//                         <MoreHorizontal size={14} />
//                       </span>
//                     ) : (
//                       <button
//                         key={p}
//                         className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
//                         onClick={() => setCurrentPage(p - 1)}
//                       >
//                         {p}
//                       </button>
//                     )
//                   )}

//                   <button
//                     className="eb-action-btn w-8"
//                     disabled={currentPage + 1 >= totalPages}
//                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
//                   >
//                     <ChevronRight size={14} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {hasAccess && (
//           <>
            
//             <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
//               <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//                 <div className="relative max-h-[90vh] overflow-y-auto p-6">
//                   <DialogClose asChild>
//                     <button
//                       type="button"
//                       aria-label="Close"
//                       className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//                     >
//                       <X className="h-4 w-4 shrink-0" />
//                     </button>
//                   </DialogClose>

//                   <DialogHeader>
//                     <DialogTitle>Add EB Reading</DialogTitle>
//                     <DialogDescription>Enter the electricity meter readings for this month.</DialogDescription>
//                   </DialogHeader>

//                   <div className="grid gap-4 mt-2">
//                     {/* Branch + Flat side by side */}
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-1.5">
//                         <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
//                         {canPickBranch ? (
//                           <Select
//                             value={formBranchId}
//                             onValueChange={val => {
//                               setFormBranchId(val);
//                               setFormFlatId("all");
//                               setFormRoomId("");
//                               setRoomSearch("");
//                               // Branch changed → the flat list this search
//                               // was filtering no longer applies.
//                               setFlatSearch("");
//                             }}
//                           >
//                             <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
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

//                       <div className="space-y-1.5">
//                         <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
//                         <Select
//                           value={formFlatId}
//                           onValueChange={val => { setFormFlatId(val); setFlatSearch(""); }}
//                           disabled={canPickBranch && !formBranchId}
//                         >
//                           <SelectTrigger className="rounded-lg">
//                             <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                               <Input placeholder="Search flat..." value={flatSearch}
//                                 onChange={e => setFlatSearch(e.target.value)}
//                                 onKeyDown={e => e.stopPropagation()}
//                                 className="h-8 text-sm rounded-lg" autoFocus />
//                             </div>
//                             <SelectItem value="all">Select Flat</SelectItem>
//                             {dialogFlats.length === 0 ? (
//                               <div className="px-3 py-2 text-sm text-muted-foreground">No flat available</div>
//                             ) : (
//                               <>
//                                 {dialogFilteredFlats.map(f => (
//                                   <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                                 ))}
//                                 {dialogFilteredFlats.length === 0 && (
//                                   <div className="px-3 py-2 text-sm text-muted-foreground">No flat found</div>
//                                 )}
//                               </>
//                             )}
//                           </SelectContent>
//                         </Select>
//                       </div>
//                     </div>

//                     {(formFlatId && formFlatId !== "all") ? (
//                       <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1">
//                         {flatRoomRows.map(row => (
//                           <div key={row.roomId} className="eb-flat-room-card">
//                             <div className="eb-flat-room-title">Room {row.roomNumber}</div>
//                             <div className={`grid ${row.isAc ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} gap-4`}>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                                 <Input className="rounded-lg bg-white" value={row.previousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                                 <Input
//                                   className="rounded-lg bg-white"
//                                   placeholder="Enter current reading"
//                                   value={row.currentReading}
//                                   onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)}
//                                 />
//                               </div>
//                               {row.isAc && (
//                                 <>
//                                   <div className="space-y-1.5">
//                                     <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                     <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                                   </div>
//                                   <div className="space-y-1.5">
//                                     <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                     <Input
//                                       className="rounded-lg bg-white"
//                                       placeholder="Enter AC current reading"
//                                       value={row.acCurrentReading}
//                                       onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)}
//                                     />
//                                   </div>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <>
//                         <div className="space-y-1.5">
//                           <Label className="text-xs font-medium text-muted-foreground">Room</Label>
//                           <Select
//                             value={formRoomId}
//                             onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
//                             disabled={canPickBranch && !formBranchId}
//                           >
//                             <SelectTrigger className="rounded-lg">
//                               <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                                 <Input placeholder="Search room..." value={roomSearch}
//                                   onChange={e => setRoomSearch(e.target.value)}
//                                   onKeyDown={e => e.stopPropagation()}
//                                   className="h-8 text-sm rounded-lg" autoFocus />
//                               </div>
//                               {dialogFlatFilteredRooms
//                                 .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
//                                 .map(r => (
//                                   <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                                 ))}
//                               {/* When this branch's rooms are all attached to
//                                   flats (no standalone rooms exist at all), telling the
//                                   user "No room found" reads like a bug/dead-end. Point
//                                   them at the Flat dropdown above instead, which is the
//                                   actual way to enter readings for those rooms. Plain
//                                   search misses (standalone rooms exist, just none match
//                                   the typed text) still show the old generic message. */}
//                               {dialogFlatFilteredRooms.filter(r =>
//                                 r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                               ).length === 0 && (
//                                 <div className="px-3 py-2 text-sm text-muted-foreground">
//                                   {dialogStandaloneRooms.length === 0
//                                     ? "No standalone rooms in this branch — select a flat above instead"
//                                     : "No room found"}
//                                 </div>
//                               )}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         {/* Only appears when this room currently has more
//                             than one active tenant sharing the same meter
//                             AND more than one of them still needs an entry
//                             this month (once exactly one is left unread,
//                             it's auto-filled — see unreadActiveTenants
//                             above — so no tenant pick is needed). */}
//                         {roomActiveTenants.length > 1 && unreadActiveTenants.length !== 1 && (
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">
//                               Tenant (this reading is a checkout for)
//                             </Label>
//                             <Select value={formTenantId} onValueChange={setFormTenantId}>
//                               <SelectTrigger className="rounded-lg">
//                                 <SelectValue placeholder="Select tenant" />
//                               </SelectTrigger>
//                               <SelectContent>
//                                 {roomActiveTenants.map(t => (
//                                   <SelectItem key={t.id} value={String(t.id)}>
//                                     {t.name} — joined at {t.joinReading ?? "—"}
//                                   </SelectItem>
//                                 ))}
//                               </SelectContent>
//                             </Select>
//                           </div>
//                         )}

//                         {/* Previous + Current side by side */}
//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                             <Input
//                               className="rounded-lg"
//                               placeholder={
//                                 roomActiveTenants.length > 1 &&
//                                 unreadActiveTenants.length !== 1 &&
//                                 !formTenantId
//                                   ? "Select a tenant first"
//                                   : "Previous"
//                               }
//                               value={formPrevReading}
//                               readOnly
//                             />
//                           </div>
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                             <Input className="rounded-lg" placeholder="Current" value={formCurrReading}
//                               onChange={e => setFormCurrReading(e.target.value)} />
//                           </div>
//                         </div>

//                         {selectedRoomObj?.hostelType === "AC" && (
//                           <div className="grid grid-cols-2 gap-4">
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                               <Input className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                               <Input className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
//                                 onChange={e => setFormAcCurr(e.target.value)} />
//                             </div>
//                           </div>
//                         )}
//                       </>
//                     )}

//                     <div className="flex items-center gap-2">
//                       <Label className="text-xs font-medium text-muted-foreground">Mode:</Label>
//                       <Button size="sm" className="rounded-lg" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
//                       <Button size="sm" className="rounded-lg" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
//                     </div>

//                     {manualMode && (
//                       <div className="space-y-2">
//                         <Label className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
//                         {(!formFlatId || formFlatId === "all") && (
//                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         )}
//                         {(formFlatId && formFlatId !== "all") && (
//                           <div className="space-y-2">
//                             {flatRoomRows.map(row => (
//                               <div key={row.roomId} className="flex gap-2 items-center">
//                                 <span className="w-24 text-sm">{row.roomNumber}</span>
//                                 <Input className="rounded-lg" type="number" value={manualRate}
//                                   onChange={e => {
//                                     const val = Number(e.target.value);
//                                     setManualRate(val);
//                                     const updated: Record<string, number> = {};
//                                     flatRoomRows.forEach(r => { updated[String(r.roomId)] = val; });
//                                     setRoomManualRates(prev => ({ ...prev, ...updated }));
//                                   }}
//                                   placeholder="Enter unit rate for all rooms" />
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>

//                   <DialogFooter className="mt-4">
//                     <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
//                     <Button className="rounded-lg" onClick={handleAdd} disabled={isSaving}>
//                       {isSaving ? "Saving..." : "Save"}
//                     </Button>
//                   </DialogFooter>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </>
//         )}
//       </div>

//       {/* ── Bill Dialog — rounded-2xl + contained scroll, matching the
//           Add dialog's pattern. */}
//       <Dialog open={billOpen} onOpenChange={setBillOpen}>
//         <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
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

//       {/* ── Upload Dialog — rounded-2xl, matching the Add dialog's pattern. */}
//       <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
//         <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>Upload EB Excel</DialogTitle>
//               <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
//             </DialogHeader>
//             <Input className="rounded-lg" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
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
//   deleteEBReadingsByFlat,
//   deleteEBReadingsByRoom,
//   fetchAllPages,
// } from "@/lib/store";

// import { Room, EBReading, Tenant, Branch, Flat } from "@/lib/types";

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
// import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";

// const EBReadingsPage = () => {
//   // ── role is uppercased for all comparisons ────────────────────────────
//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId(); // number | null

//   const isAdmin   = role === "ADMIN" || role === "WARDEN";
//   const hasAccess = isAdmin;
//   const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

//   // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
//   const defaultBranch =
//     role === "ADMIN" || role === "SUPER_ADMIN"
//       ? "all"
//       : branchId != null ? String(branchId) : "all";

//   const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

//   const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

//   const [rooms,        setRooms]        = useState<Room[]>([]);
//   const [readings,     setReadings]     = useState<EBReading[]>([]);
//   const [tenants,      setTenants]      = useState<Tenant[]>([]);
//   const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
//   const [branches,     setBranches]     = useState<Branch[]>([]);
//   const [flats,        setFlats]        = useState<Flat[]>([]);
//   const [tenantRows,   setTenantRows]   = useState<any[]>([]);
//   const [flatRoomRows, setFlatRoomRows] = useState<any[]>([]);
//   const [tenantBills,  setTenantBills]  = useState<any[]>([]);

//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [addOpen,    setAddOpen]    = useState(false);
//   const [billOpen,   setBillOpen]   = useState(false);
//   const [isSaving,   setIsSaving]   = useState(false);

//   const [manualRate,      setManualRate]      = useState<number | "">(13);
//   const [manualMode,      setManualMode]      = useState(false);
//   const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

//   // Page-level "flat" filter shown in the table's filter row.
//   const [formFlatId,      setFormFlatId]      = useState("all");
//   const [formRoomId,      setFormRoomId]      = useState("");
//   // Which tenant this room-level reading is a checkout FOR. Only
//   // relevant/shown when the selected room currently has more than one
//   // active tenant sharing the same meter AND more than one of them still
//   // needs a reading recorded this month — see roomActiveTenants and
//   // unreadActiveTenants below.
//   const [formTenantId,    setFormTenantId]    = useState("");
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [roomSearch,      setRoomSearch]      = useState("");
//   const [flatSearch,      setFlatSearch]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");
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

//   /* ─── RATE ─────────────────────────────────────────────── */
//   const getRateForRoom = (roomId: string | number) => {
//     const roomRate = roomManualRates[String(roomId)];
//     if (manualMode && roomRate !== undefined) return roomRate;
//     if (typeof manualRate === "number") return manualRate;
//     return 13;
//   };

//   /* ─── IS AC ─────────────────────────────────────────────── */
//   const isRoomAc = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       return room?.hostelType === "AC";
//     },
//     [rooms]
//   );

//   /* ─── FLAT ROW CHANGE ───────────────────────────────────── */
//   const handleFlatRowChange = (
//     roomId: string | number,
//     field: "currentReading" | "acCurrentReading",
//     value: string
//   ) => {
//     setFlatRoomRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, [field]: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const roomSpecific = allReadings
//         .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });
//       if (roomSpecific.length > 0) return Number(roomSpecific[0].acCurrentReading ?? 0);
//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0)
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       return 0;
//     },
//     [allReadings, tenants]
//   );

//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
//       if (roomReadings.length > 0) {
//         const sorted = [...roomReadings].sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           return b.month - a.month;
//         });
//         return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//       }
//       if (room?.flatId) {
//         const flatReadings = allReadings.filter(
//           r => String(r.flatId) === String(room.flatId)
//         );
//         if (flatReadings.length > 0) {
//           const sorted = [...flatReadings].sort((a, b) => {
//             if (b.year !== a.year) return b.year - a.year;
//             return b.month - a.month;
//           });
//           return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//         }
//       }
//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0)
//         return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
//       return 0;
//     },
//     [allReadings, tenants, rooms]
//   );

//   const getRoomIdByRoomNumber = (roomNumber: string) =>
//     rooms.find(r => r.roomNumber === roomNumber)?.id;

//   /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
//   const filteredRooms = useMemo(() => {
//     if (selectedBranch === "all") return rooms;
//     return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
//   }, [rooms, selectedBranch]);

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

//   const dialogFilteredFlats = useMemo(
//     () => dialogFlats.filter(f => f.flatNumber.toLowerCase().includes(flatSearch.toLowerCase())),
//     [dialogFlats, flatSearch]
//   );

//   const roomMap = useMemo(() => {
//     const map: Record<string, string> = {};
//     rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
//     return map;
//   }, [rooms]);

//   // Tenants currently active in the room selected in the Add dialog
//   // (single-room mode only). When a room's meter is shared by more than
//   // one active tenant, "Previous" can no longer be filled from a single
//   // room-level "last reading" value — each tenant has their own join
//   // reading, and the checkout being recorded here belongs to exactly one
//   // of them. Sorted by joinReading so earliest joiner (usually who the
//   // admin is checking out first) appears first.
//   const roomActiveTenants = useMemo(() => {
//     if (!formRoomId) return [];
//     return tenants
//       .filter(
//         t =>
//           String(t.roomId) === String(formRoomId) &&
//           String(t.status).toLowerCase() === "active"
//       )
//       .sort((a, b) => Number(a.joinReading ?? 0) - Number(b.joinReading ?? 0));
//   }, [tenants, formRoomId]);

//   // Readings already saved for the currently-selected room, for the EXACT
//   // month/year being entered in this dialog. Checking out a tenant through
//   // this dialog doesn't flip that tenant to "inactive" — that only happens
//   // on the separate Tenant Check-Out page — so a tenant can still show up
//   // in roomActiveTenants above even after their own checkout reading was
//   // already saved this month.
//   //
//   // Each saved reading this month is its own tenant's checkout segment
//   // (previousReading = that tenant's own join reading), not one
//   // continuously-advancing meter value. So we can NEVER just take the
//   // min/max across all of them to decide the next tenant's "Previous" —
//   // that silently attributes one tenant's segment to another. Instead we
//   // match each reading back to the SPECIFIC tenant it belongs to (see
//   // findOwnReadingThisMonth below) and only ever use a tenant's own
//   // matched reading to prefill their own "Previous".
//   const roomReadingsThisMonth = useMemo(() => {
//     if (!formRoomId) return [];
//     return allReadings.filter(
//       r =>
//         r.roomId != null &&
//         String(r.roomId) === String(formRoomId) &&
//         r.month === selMonth &&
//         r.year === selYear
//     );
//   }, [allReadings, formRoomId, selMonth, selYear]);

//   // A reading saved this month "belongs" to a given tenant when we know
//   // for certain which tenant it was recorded for. Two signals, in order
//   // of trust:
//   //
//   //  1. tenantId on the reading itself (set at save time — see
//   //     handleAdd below). This is unambiguous even when several active
//   //     tenants in the room joined at the exact same meter reading.
//   //
//   //  2. Legacy fallback for readings saved before tenantId was tracked:
//   //     previousReading === this tenant's own joinReading. This ONLY
//   //     works when no other active tenant in the room shares that same
//   //     joinReading — if two tenants both joined at reading 180, we
//   //     can't tell which of their readings this is, so we deliberately
//   //     return nothing rather than guess wrong.
//   const findOwnReadingThisMonth = useCallback(
//     (tenant: Tenant) => {
//       const byTenantId = roomReadingsThisMonth.find(
//         r => (r as any).tenantId != null && Number((r as any).tenantId) === Number(tenant.id)
//       );
//       if (byTenantId) return byTenantId;

//       const join = Number(tenant.joinReading ?? NaN);
//       if (!Number.isFinite(join)) return undefined;

//       const sameJoinSiblingCount = roomActiveTenants.filter(
//         t => Number(t.joinReading ?? NaN) === join
//       ).length;
//       if (sameJoinSiblingCount > 1) return undefined; // ambiguous — can't safely infer

//       return roomReadingsThisMonth.find(
//         r => (r as any).tenantId == null && Number(r.previousReading) === join
//       );
//     },
//     [roomReadingsThisMonth, roomActiveTenants]
//   );

//   // Active tenants in this room who do NOT yet have their own reading
//   // recorded for the selected month — i.e. still need a fresh entry. A
//   // tenant who has already been checked out via this dialog this month
//   // (and so has a reading matching their own joinReading) is excluded,
//   // even though they may still show as "Active" until the separate
//   // Tenant Check-Out page is used.
//   const unreadActiveTenants = useMemo(
//     () => roomActiveTenants.filter(t => !findOwnReadingThisMonth(t)),
//     [roomActiveTenants, findOwnReadingThisMonth]
//   );

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
//     return data;
//   }, [readings, rooms, selectedBranch, selMonth, selYear]);

//   /* ─── RELOAD ─────────────────────────────────────────────── */
//   const reload = async () => {
//     const [
//       roomsResult,
//       readingsResult,
//       tenantsResult,
//       branchesResult,
//       flatsResult,
//     ] = await Promise.allSettled([
//       fetchAllPages<Room>(getRooms),
//       fetchAllPages<EBReading>(getEBReadings),
//       fetchAllPages<Tenant>(getTenants),
//       fetchAllPages<Branch>(getBranches),
//       fetchAllPages<Flat>(getFlats),
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
//   };

//   const didLoad = useRef(false);
//   useEffect(() => {
//     if (didLoad.current) return;
//     didLoad.current = true;
//     reload();
//   }, []);

//   /* ─── FLAT ROOM ROWS (uses dialog-scoped rooms) ─────────── */
//   useEffect(() => {
//     if (!formFlatId || formFlatId === "all") { setFlatRoomRows([]); return; }
//     const roomsInFlat = dialogRooms.filter(
//       r => String(r.flatId) === String(formFlatId)
//     );
//     const rows = roomsInFlat.map(room => {
//       const allForRoom = readings
//         .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });
//       const latest = allForRoom[0] ?? null;
//       return {
//         roomId:            room.id,
//         roomNumber:        room.roomNumber,
//         isAc:              room.hostelType === "AC",
//         previousReading:   latest != null
//           ? Number(latest.currentReading ?? 0)
//           : getRoomStartingReading(room.id),
//         currentReading:    "",
//         acPreviousReading: latest != null
//           ? Number(latest.acCurrentReading ?? 0)
//           : getRoomStartingACReading(room.id),
//         acCurrentReading:  "",
//       };
//     });
//     setFlatRoomRows(rows);
//   }, [formFlatId, dialogRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE ─────────────────── */
//   // FIX: previously, once ANY reading existed for the room this month,
//   // "Previous" was taken from the min/max of ALL of that room's readings
//   // this month — regardless of which tenant it actually belonged to. That
//   // meant checking out one tenant (e.g. Askingin, 150→170) silently
//   // became the "Previous" for the NEXT tenant's checkout (e.g. Anbarasan,
//   // who should start from their own joinReading of 100, not 170).
//   //
//   // Now: each tenant's own reading this month is matched specifically via
//   // findOwnReadingThisMonth (previousReading === that tenant's own
//   // joinReading). Logic:
//   //   - No active tenants left            → room's own starting reading.
//   //   - Exactly 1 active tenant           → that tenant's own reading if
//   //                                          already saved this month
//   //                                          (continue from their own
//   //                                          currentReading), else their
//   //                                          own joinReading.
//   //   - 2+ active tenants, exactly 1 of
//   //     them still unread this month      → auto-fill from that ONE
//   //                                          tenant's own joinReading
//   //                                          (unambiguous — the others
//   //                                          already have entries).
//   //   - 2+ active tenants, 0 or 2+ of
//   //     them still unread this month      → ambiguous, wait for an
//   //                                          explicit tenant pick.
//   useEffect(() => {
//     if (!formRoomId) return;
//     setFormTenantId("");

//     if (roomActiveTenants.length === 0) {
//       setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//       setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//       return;
//     }

//     if (roomActiveTenants.length === 1) {
//       const only = roomActiveTenants[0];
//       const own = findOwnReadingThisMonth(only);
//       if (own) {
//         // Already has an entry this month — continue from where THEIR
//         // segment left off, not their original join reading.
//         setFormPrevReading(String(Number(own.currentReading ?? 0)));
//         setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
//       } else {
//         setFormPrevReading(
//           String(only.joinReading ?? getRoomStartingReading(formRoomId))
//         );
//         setFormAcPrev(
//           String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
//         );
//       }
//       return;
//     }

//     // Multiple active tenants sharing this meter.
//     if (unreadActiveTenants.length === 1) {
//       // Only one of them still needs an entry this month — unambiguous,
//       // no need to force an explicit pick.
//       const only = unreadActiveTenants[0];
//       setFormPrevReading(
//         String(only.joinReading ?? getRoomStartingReading(formRoomId))
//       );
//       setFormAcPrev(
//         String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
//       );
//     } else {
//       // Either nobody has been read yet (0) or more than one still needs
//       // an entry (2+) — in both cases we can't guess which tenant this
//       // new entry is for. Wait for an explicit pick.
//       setFormPrevReading("");
//       setFormAcPrev("");
//     }
//   }, [
//     formRoomId,
//     roomActiveTenants,
//     unreadActiveTenants,
//     findOwnReadingThisMonth,
//     getRoomStartingReading,
//     getRoomStartingACReading,
//   ]);

//   // Once the admin picks which tenant this checkout reading belongs to
//   // (only shown/needed when roomActiveTenants.length > 1 AND more than
//   // one of them still needs an entry this month), pull "Previous" /
//   // "AC Previous" from THAT tenant's own data — their own saved reading
//   // this month if one exists, else their own join reading.
//   useEffect(() => {
//     if (!formTenantId) return;
//     const t = roomActiveTenants.find(rt => String(rt.id) === String(formTenantId));
//     if (!t) return;
//     const own = findOwnReadingThisMonth(t);
//     if (own) {
//       setFormPrevReading(String(Number(own.currentReading ?? 0)));
//       setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
//     } else {
//       setFormPrevReading(
//         String(t.joinReading ?? getRoomStartingReading(formRoomId))
//       );
//       setFormAcPrev(
//         String(t.acJoinReading ?? getRoomStartingACReading(formRoomId))
//       );
//     }
//   }, [
//     formTenantId,
//     roomActiveTenants,
//     findOwnReadingThisMonth,
//     formRoomId,
//     getRoomStartingReading,
//     getRoomStartingACReading,
//   ]);

//   /* ─── BUILD TENANT BILL ROWS ─────────────────────────────── */
//   useEffect(() => {
//     const loadTenantBills = async () => {
//       const rows: any[] = [];
//       const flatHandled = new Set<number>();
//       const roomHandled = new Set<number>();

//       const flatReadingMap = new Map<number, EBReading>();
//       for (const r of filteredReadings.filter(r => r.flatId != null)) {
//         const existing = flatReadingMap.get(r.flatId!);
//         if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
//           flatReadingMap.set(r.flatId!, r);
//         }
//       }

//       for (const r of Array.from(flatReadingMap.values())) {
//         if (flatHandled.has(r.flatId!)) continue;
//         flatHandled.add(r.flatId!);
//         try {
//           const bills = await getTenantWiseEBBill({
//             flatId: r.flatId,
//             month: r.month,
//             year: r.year,
//           });

//           const flatTenantIds = new Set(
//             tenants
//               .filter(t => {
//                 const room = rooms.find(rm => rm.id === t.roomId);
//                 return room && String(room.flatId) === String(r.flatId);
//               })
//               .map(t => Number(t.id))
//           );

//           bills
//             .filter((b: any) => b.tenantId == null || flatTenantIds.has(Number(b.tenantId)))
//             .forEach((b: any) => {
//               rows.push({
//                 id: r.id,
//                 roomId: getRoomIdByRoomNumber(b.roomNumber),
//                 flatId: r.flatId,
//                 roomNumber: b.roomNumber,
//                 flatNumber: b.flatNumber,
//                 branchId: (r as any).branchId ?? null,
//                 branchName: (r as any).branchName ?? null,
//                 tenantName: b.tenantName,
//                 previousReading: b.previousReading,
//                 currentReading: b.currentReading,
//                 acPreviousReading: b.acPreviousReading,
//                 acCurrentReading: b.acCurrentReading,
//                 unitsConsumed: b.totalUnits,
//                 tenantAmount: b.amount,
//               });
//             });
//         } catch { /* skip failed flat */ }
//       }

//       const roomReadings = filteredReadings.filter(r => {
//         const room = rooms.find(rm => rm.id === r.roomId);
//         return !room?.flatId && r.roomId != null;
//       });
//       for (const r of roomReadings) {
//         const room = rooms.find(rm => rm.id === r.roomId);
//         if (!room) continue;
//         if (room.flatId && flatHandled.has(room.flatId)) continue;
//         if (roomHandled.has(r.roomId!)) continue;
//         roomHandled.add(r.roomId!);
//         try {
//           // FIX: same as above — pass this reading's own month/year
//           // through instead of omitting them.
//           const bills = await getTenantWiseEBBill({
//             roomId: r.roomId,
//             month: r.month,
//             year: r.year,
//           });

//           const roomTenantIds = new Set(
//             tenants
//               .filter(t => String(t.roomId) === String(room.id))
//               .map(t => Number(t.id))
//           );

//           const matchedBills = bills.filter(
//             (b: any) => b.tenantId == null || roomTenantIds.has(Number(b.tenantId))
//           );

//           if (matchedBills.length > 0) {
//             matchedBills.forEach((b: any) => {
//               rows.push({
//                 id: r.id,
//                 roomId: room.id,
//                 flatId: room.flatId,
//                 roomNumber: room.roomNumber,
//                 flatNumber: b.flatNumber,
//                 branchId: (r as any).branchId ?? null,
//                 branchName: (r as any).branchName ?? null,
//                 tenantName: b.tenantName,
//                 previousReading: b.previousReading ?? r.previousReading,
//                 currentReading: b.currentReading ?? r.currentReading,
//                 acPreviousReading: b.acPreviousReading,
//                 acCurrentReading: b.acCurrentReading,
//                 unitsConsumed: Number(b.totalUnits ?? 0),
//                 tenantAmount: b.amount,
//               });
//             });
//           } else {
//             rows.push({
//               id: r.id,
//               roomId: room.id,
//               flatId: room.flatId,
//               roomNumber: room.roomNumber,
//               flatNumber: "-",
//               branchId: (r as any).branchId ?? null,
//               branchName: (r as any).branchName ?? null,
//               tenantName: "-",
//               previousReading: r.previousReading,
//               currentReading: r.currentReading,
//               acPreviousReading: r.acPreviousReading,
//               acCurrentReading: r.acCurrentReading,
//               unitsConsumed:
//                 r.currentReading != null && r.previousReading != null
//                   ? Number(r.currentReading) - Number(r.previousReading)
//                   : 0,
//               tenantAmount: 0,
//             });
//           }
//         } catch { /* skip failed room */ }
//       }
//       setTenantRows(rows);
//     };

//     if (filteredReadings.length > 0) loadTenantBills();
//     else setTenantRows([]);
//   }, [filteredReadings, roomMap, rooms, tenants]);

//   /* ─── ADD READING ───────────────────────────────────────── */
//   const handleAdd = async () => {
//     if (isSaving) return;

//     // Require an explicit branch for roles that can see multiple branches.
//     // WARDEN never hits this because formBranchId is pre-filled to their
//     // own branch when the dialog opens.
//     if (canPickBranch && !formBranchId) {
//       toast.error("Select a branch first");
//       return;
//     }

//     setIsSaving(true);
//     try {
//       const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

//       if (formFlatId && formFlatId !== "all") {
//         const validRows = flatRoomRows.filter(row => row.currentReading !== "");
//         if (validRows.length === 0) { toast.error("Enter at least one room reading"); return; }
//         for (const row of validRows) {
//           const prev   = Number(row.previousReading);
//           const curr   = Number(row.currentReading);
//           const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
//           const acCurr = row.isAc ? Number(row.acCurrentReading)  : 0;
//           if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }
//           // Tag this reading with the tenant it belongs to whenever it's
//           // unambiguous (exactly one active tenant in that room). With
//           // 2+ active tenants sharing a meter there's no per-room tenant
//           // picker in flat mode, so we leave tenantId unset rather than
//           // guess — the fallback join-reading match will apply later,
//           // and only when it's itself unambiguous.
//           const roomTenants = tenants.filter(
//             t =>
//               String(t.roomId) === String(row.roomId) &&
//               String(t.status).toLowerCase() === "active"
//           );
//           const rowTenantId = roomTenants.length === 1 ? Number(roomTenants[0].id) : undefined;
//           await addEBReading({
//             flatId: Number(formFlatId), roomId: Number(row.roomId),
//             branchId: branchIdNum,
//             month: selMonth, year: selYear,
//             previousReading: prev, currentReading: curr,
//             acPreviousReading: acPrev, acCurrentReading: acCurr,
//             ebRate: getRateForRoom(row.roomId), isCheckout: true,
//             tenantId: rowTenantId,
//           } as any);
//         }
//         toast.success("Flat readings saved");
//       } else {
//         if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
//         // A tenant pick is only required when this room has more than one
//         // active tenant AND more than one of them still needs an entry
//         // this month — see unreadActiveTenants above. If exactly one
//         // still needs an entry, it's unambiguous and was auto-filled.
//         if (
//           roomActiveTenants.length > 1 &&
//           unreadActiveTenants.length !== 1 &&
//           !formTenantId
//         ) {
//           toast.error("Select which tenant this checkout reading is for");
//           return;
//         }
//         if (!formPrevReading) { toast.error("Previous reading is missing"); return; }
//         const prev   = Number(formPrevReading);
//         const curr   = Number(formCurrReading);
//         const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
//         const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;
//         if (curr < prev) { toast.error("Current reading cannot be less than previous"); return; }
//         // Resolve exactly which tenant this reading is for, so later
//         // lookups (this dialog next time, and the Checkout page) can
//         // match on tenantId instead of guessing from joinReading —
//         // which breaks when tenants share the same join reading.
//         const resolvedTenantId =
//           roomActiveTenants.length === 1
//             ? Number(roomActiveTenants[0].id)
//             : formTenantId
//               ? Number(formTenantId)
//               : unreadActiveTenants.length === 1
//                 ? Number(unreadActiveTenants[0].id)
//                 : undefined;
//         await addEBReading({
//           roomId: Number(formRoomId),
//           branchId: branchIdNum,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: acPrev, acCurrentReading: acCurr,
//           ebRate: getRateForRoom(formRoomId), isCheckout: true,
//           tenantId: resolvedTenantId,
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
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           // Use the room's own branch (unitId) when uploading via Excel,
//           // since there's no per-row branch selector for bulk upload.
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
//           ebRate, isCheckout: true,
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
//         await deleteEBReadingsByFlat(flatId);
//         toast.success("Flat readings deleted");
//       } else if (roomId) {
//         await deleteEBReadingsByRoom(roomId);
//         toast.success("Room readings deleted");
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
//     askConfirm(
//       "Delete this EB reading?",
//       () => {
//         handleDelete(
//           String(row.id),
//           row.flatId ? Number(row.flatId) : undefined,
//           row.roomId ? Number(row.roomId) : undefined
//         );
//       },
//       { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
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
//       const latestReadings = await fetchAllPages<EBReading>(getEBReadings);
//       const data = filteredRooms.map(room => {
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
//         return {
//           RoomNumber: room.roomNumber,
//           Previous:   lastReading?.currentReading ?? 0,
//           Current:    "",
//           AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
//           AcCurrent:  room.hostelType === "AC" ? "" : "-",
//           EbRate:     lastRate,
//         };
//       });
//       const worksheet = XLSX.utils.json_to_sheet(data);
//       worksheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
//       XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
//       toast.success("Excel downloaded");
//     } catch {
//       toast.error("Failed to download Excel");
//     }
//   };

//   /* ─── FILTERED TENANT ROWS ──────────────────────────────── */
//   const filteredTenantRows = useMemo(() => {
//     let data = tenantRows;
//     if (selectedBranch !== "all") {
//       data = data.filter(row => {
//         const room = rooms.find(r => r.id === row.roomId);
//         return Number(room?.unitId) === Number(selectedBranch);
//       });
//     }
//     if (selectedRoomId !== "all") {
//       data = data.filter(row => String(row.roomId) === String(selectedRoomId));
//     }
//     return data;
//   }, [tenantRows, selectedBranch, rooms, selectedRoomId]);

//   /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
//   const selectedRoomObj = useMemo(
//     () => rooms.find(r => String(r.id) === String(formRoomId)),
//     [rooms, formRoomId]
//   );

//   /* ─── RESET DIALOG ──────────────────────────────────────── */
//   const resetAddDialog = () => {
//     setRoomSearch(""); setFlatSearch(""); setFormFlatId("all"); setFormRoomId("");
//     setFormTenantId(""); setFormBranchId("");
//     setFormPrevReading(""); setFormCurrReading("");
//     setFormAcPrev(""); setFormAcCurr("");
//     setFlatRoomRows([]); setManualMode(false);
//     setManualRate(13); setRoomManualRates({});
//   };

//   const openAddDialog = () => {
//     setFormBranchId(
//       role === "WARDEN" && branchId != null
//         ? String(branchId)
//         : selectedBranch !== "all" ? selectedBranch : ""
//     );
//     setAddOpen(true);
//   };

//   /* ─── Pagination ─── */
//   const [currentPage, setCurrentPage] = useState(0);
//   const pageSize = 10;
//   const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

//   // Total page count, used both to bound the "Next" button and to build
//   // the numbered page list below.
//   const totalPages = Math.max(1, Math.ceil(filteredTenantRows.length / pageSize));

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
//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

//         .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
//         @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

//         .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
//         .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
//         .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

//         .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
//         .eb-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .eb-table tr:hover { background: #fdfcff; }

//         .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-tenant-name { font-size: 12px; color: #64748b; margin-top: 2px; }
//         .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }

//         .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
//         .eb-status.collected { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .eb-status.pending { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
//         .eb-status.not-read { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

//         .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
//         /* !important here is deliberate: something elsewhere in the app's
//            global CSS is hiding/zeroing SVGs inside these buttons specifically
//            (lucide icons that render fine elsewhere on this same page were
//            still blank here). Rather than hunt for that rule, these overrides
//            just guarantee the icon paints regardless of what else applies. */
//         .eb-action-btn svg {
//           display: inline-block !important;
//           visibility: visible !important;
//           opacity: 1 !important;
//           width: 14px !important;
//           height: 14px !important;
//           min-width: 14px !important;
//           min-height: 14px !important;
//           stroke: #64748b !important;
//           color: #64748b !important;
//           flex-shrink: 0 !important;
//           pointer-events: none;
//         }
//         .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
//         /* Disabled buttons (e.g. pagination arrows when there's only one
//            page) were stacking two dimming effects — button opacity AND a
//            very light icon stroke — which combined to make them basically
//            invisible rather than just "grayed out". Dim via icon color only
//            so the button/icon stay visibly present. */
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         /* The pagination row can now hold many number buttons
//            (1 2 3 4 ... 53), so let it wrap on narrow screens instead of
//            overflowing, and give the "..." marker its own non-interactive
//            look (no hover state, no pointer). */
//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

//         .eb-chart-container { padding: 20px; }

//         /* Flat-mode "per-room" cards inside the Add EB Reading dialog.
//            Previously each room's Room/Prev/Current header was re-rendered
//            right above that room's own inputs, so an empty Current field's
//            placeholder text ("Current") sat directly under the "Current"
//            column label with almost no gap (mb-1) — visually it read as one
//            overlapping blob rather than a label + an empty field. Each field
//            now carries its own persistent <Label>, so there's nothing that
//            can look "covered" regardless of whether the input has a value,
//            and the room is broken into its own bordered, padded card so the
//            whole section reads clearly even when rooms mix AC/non-AC. */
//         .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
//         .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
//         .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
//       `}</style>

//       <div className="eb-wrap">
//         <div className="eb-layout">
//           <div>
//             <div className="eb-panel">
//               <div className="eb-panel-header">
//                 <div className="eb-panel-title">EB Readings List</div>
//                 <div className="flex gap-2">
//                   <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
//                     <Download size={14} className="mr-2" /> Export
//                   </Button>
//                   {hasAccess && (
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
//                           <Plus size={14} className="mr-2" /> Add EB Reading
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="end">
//                         <DropdownMenuItem onClick={openAddDialog}>Single Room Reading</DropdownMenuItem>
//                         <DropdownMenuItem onClick={() => setUploadOpen(true)}>Upload Excel Reading</DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   )}
//                 </div>
//               </div>

//               {/* Filters */}
//               <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
//                   <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!hasAccess || !canPickBranch}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
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

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
//                   <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="All Rooms" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Rooms</SelectItem>
//                       {filteredRooms.map(r => (
//                         <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
//                   <Select
//                     value={`${selYear}-${selMonth}`}
//                     onValueChange={val => {
//                       const [y, m] = val.split("-").map(Number);
//                       setSelYear(y);
//                       setSelMonth(m);
//                     }}
//                   >
//                     <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
//                       <SelectValue placeholder="Select month" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {monthYearOptions.map(opt => (
//                         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <button className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a]" onClick={() => {
//                   setSelectedBranch(defaultBranch);
//                   setSelectedRoomId("all");
//                   setSelMonth(now.getMonth() + 1);
//                   setSelYear(now.getFullYear());
//                 }}>
//                   <RefreshCw size={14} /> Clear
//                 </button>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="eb-table">
//                   <thead>
//                     <tr>
//                       <th>ROOM / BED</th>
//                       <th>PREV READING</th>
//                       <th>CURR READING</th>
//                       <th>UNITS</th>
//                       <th>AMOUNT (₹)</th>
//                       <th>STATUS</th>
//                       <th>ACTIONS</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginatedRows.length === 0 ? (
//                       <tr>
//                         <td colSpan={7} className="text-center py-12 text-slate-400">No EB readings found.</td>
//                       </tr>
//                     ) : (
//                       paginatedRows.map((row, i) => {
//                         const rName = roomMap[row.roomId] || "Unknown";
//                         const tenantName = row.tenantName || "Unassigned";
//                         const prev = Number(row.previousReading ?? 0);
//                         const curr = Number(row.currentReading ?? 0);
//                         const units = row.unitsConsumed != null
//                           ? Math.round(Number(row.unitsConsumed))
//                           : Math.round(curr - prev);

//                         const amount = Math.round(Number(row.tenantAmount ?? 0));
//                         const status = row.tenantAmount ? "Pending" : "Not Read";

//                         return (
//                           <tr key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${i}`}>
//                             <td>
//                               <div className="eb-room-name">{rName}</div>
//                               <div className="eb-tenant-name">{tenantName}</div>
//                             </td>
//                             <td><span className="eb-reading-val">{prev}</span></td>
//                             <td><span className="eb-reading-val">{curr || "—"}</span></td>
//                             <td><span className="eb-reading-val">{units || "—"}</span></td>
//                             <td><span className="eb-amount">{amount ? `₹${new Intl.NumberFormat('en-IN').format(amount)}` : "—"}</span></td>
//                             <td><div className={`eb-status ${status.toLowerCase().replace(' ', '-')}`}>{status}</div></td>
//                             <td>
//                               <div className="flex gap-2">
//                                 <button className="eb-action-btn" onClick={() => handleSendWhatsApp(row.roomId)} title="Send Bill">
//                                   <Send size={14} />
//                                 </button>
//                                 {hasAccess && (
//                                   <button
//                                     className="eb-action-btn"
//                                     onClick={() => handleDeleteReadingClick(row)}
//                                     title="Delete"
//                                   >
//                                     <Trash2 size={14} />
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

//               <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
//                 <div className="text-[13px] text-[#64748b]">
//                   Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
//                 </div>
//                 {/* Numbered pagination row (1 2 3 … n). Prev/Next chevrons
//                     stay on either end and disable correctly at the
//                     first/last page. */}
//                 <div className="flex gap-2 eb-pagination-row">
//                   <button
//                     className="eb-action-btn w-8"
//                     disabled={currentPage === 0}
//                     onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
//                   >
//                     <ChevronLeft size={14} />
//                   </button>

//                   {pageNumbers.map((p, idx) =>
//                     p === "..." ? (
//                       <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis">
//                         <MoreHorizontal size={14} />
//                       </span>
//                     ) : (
//                       <button
//                         key={p}
//                         className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
//                         onClick={() => setCurrentPage(p - 1)}
//                       >
//                         {p}
//                       </button>
//                     )
//                   )}

//                   <button
//                     className="eb-action-btn w-8"
//                     disabled={currentPage + 1 >= totalPages}
//                     onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
//                   >
//                     <ChevronRight size={14} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {hasAccess && (
//           <>
            
//             <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
//               <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//                 <div className="relative max-h-[90vh] overflow-y-auto p-6">
//                   <DialogClose asChild>
//                     <button
//                       type="button"
//                       aria-label="Close"
//                       className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//                     >
//                       <X className="h-4 w-4 shrink-0" />
//                     </button>
//                   </DialogClose>

//                   <DialogHeader>
//                     <DialogTitle>Add EB Reading</DialogTitle>
//                     <DialogDescription>Enter the electricity meter readings for this month.</DialogDescription>
//                   </DialogHeader>

//                   <div className="grid gap-4 mt-2">
//                     {/* Branch + Flat side by side */}
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-1.5">
//                         <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
//                         {canPickBranch ? (
//                           <Select
//                             value={formBranchId}
//                             onValueChange={val => {
//                               setFormBranchId(val);
//                               setFormFlatId("all");
//                               setFormRoomId("");
//                               setRoomSearch("");
//                               // Branch changed → the flat list this search
//                               // was filtering no longer applies.
//                               setFlatSearch("");
//                             }}
//                           >
//                             <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
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

//                       <div className="space-y-1.5">
//                         <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
//                         <Select
//                           value={formFlatId}
//                           onValueChange={val => { setFormFlatId(val); setFlatSearch(""); }}
//                           disabled={canPickBranch && !formBranchId}
//                         >
//                           <SelectTrigger className="rounded-lg">
//                             <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                               <Input placeholder="Search flat..." value={flatSearch}
//                                 onChange={e => setFlatSearch(e.target.value)}
//                                 onKeyDown={e => e.stopPropagation()}
//                                 className="h-8 text-sm rounded-lg" autoFocus />
//                             </div>
//                             <SelectItem value="all">Select Flat</SelectItem>
//                             {dialogFlats.length === 0 ? (
//                               <div className="px-3 py-2 text-sm text-muted-foreground">No flat available</div>
//                             ) : (
//                               <>
//                                 {dialogFilteredFlats.map(f => (
//                                   <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                                 ))}
//                                 {dialogFilteredFlats.length === 0 && (
//                                   <div className="px-3 py-2 text-sm text-muted-foreground">No flat found</div>
//                                 )}
//                               </>
//                             )}
//                           </SelectContent>
//                         </Select>
//                       </div>
//                     </div>

//                     {(formFlatId && formFlatId !== "all") ? (
//                       <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1">
//                         {flatRoomRows.map(row => (
//                           <div key={row.roomId} className="eb-flat-room-card">
//                             <div className="eb-flat-room-title">Room {row.roomNumber}</div>
//                             <div className={`grid ${row.isAc ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} gap-4`}>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                                 <Input className="rounded-lg bg-white" value={row.previousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                                 <Input
//                                   className="rounded-lg bg-white"
//                                   placeholder="Enter current reading"
//                                   value={row.currentReading}
//                                   onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)}
//                                 />
//                               </div>
//                               {row.isAc && (
//                                 <>
//                                   <div className="space-y-1.5">
//                                     <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                     <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                                   </div>
//                                   <div className="space-y-1.5">
//                                     <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                     <Input
//                                       className="rounded-lg bg-white"
//                                       placeholder="Enter AC current reading"
//                                       value={row.acCurrentReading}
//                                       onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)}
//                                     />
//                                   </div>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <>
//                         <div className="space-y-1.5">
//                           <Label className="text-xs font-medium text-muted-foreground">Room</Label>
//                           <Select
//                             value={formRoomId}
//                             onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
//                             disabled={canPickBranch && !formBranchId}
//                           >
//                             <SelectTrigger className="rounded-lg">
//                               <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
//                             </SelectTrigger>
//                             <SelectContent>
//                               <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                                 <Input placeholder="Search room..." value={roomSearch}
//                                   onChange={e => setRoomSearch(e.target.value)}
//                                   onKeyDown={e => e.stopPropagation()}
//                                   className="h-8 text-sm rounded-lg" autoFocus />
//                               </div>
//                               {dialogFlatFilteredRooms
//                                 .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
//                                 .map(r => (
//                                   <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                                 ))}
//                               {/* When this branch's rooms are all attached to
//                                   flats (no standalone rooms exist at all), telling the
//                                   user "No room found" reads like a bug/dead-end. Point
//                                   them at the Flat dropdown above instead, which is the
//                                   actual way to enter readings for those rooms. Plain
//                                   search misses (standalone rooms exist, just none match
//                                   the typed text) still show the old generic message. */}
//                               {dialogFlatFilteredRooms.filter(r =>
//                                 r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                               ).length === 0 && (
//                                 <div className="px-3 py-2 text-sm text-muted-foreground">
//                                   {dialogStandaloneRooms.length === 0
//                                     ? "No standalone rooms in this branch — select a flat above instead"
//                                     : "No room found"}
//                                 </div>
//                               )}
//                             </SelectContent>
//                           </Select>
//                         </div>

//                         {/* Only appears when this room currently has more
//                             than one active tenant sharing the same meter
//                             AND more than one of them still needs an entry
//                             this month (once exactly one is left unread,
//                             it's auto-filled — see unreadActiveTenants
//                             above — so no tenant pick is needed). */}
//                         {roomActiveTenants.length > 1 && unreadActiveTenants.length !== 1 && (
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">
//                               Tenant (this reading is a checkout for)
//                             </Label>
//                             <Select value={formTenantId} onValueChange={setFormTenantId}>
//                               <SelectTrigger className="rounded-lg">
//                                 <SelectValue placeholder="Select tenant" />
//                               </SelectTrigger>
//                               <SelectContent>
//                                 {roomActiveTenants.map(t => (
//                                   <SelectItem key={t.id} value={String(t.id)}>
//                                     {t.name} — joined at {t.joinReading ?? "—"}
//                                   </SelectItem>
//                                 ))}
//                               </SelectContent>
//                             </Select>
//                           </div>
//                         )}

//                         {/* Previous + Current side by side */}
//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                             <Input
//                               className="rounded-lg"
//                               placeholder={
//                                 roomActiveTenants.length > 1 &&
//                                 unreadActiveTenants.length !== 1 &&
//                                 !formTenantId
//                                   ? "Select a tenant first"
//                                   : "Previous"
//                               }
//                               value={formPrevReading}
//                               readOnly
//                             />
//                           </div>
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                             <Input className="rounded-lg" placeholder="Current" value={formCurrReading}
//                               onChange={e => setFormCurrReading(e.target.value)} />
//                           </div>
//                         </div>

//                         {selectedRoomObj?.hostelType === "AC" && (
//                           <div className="grid grid-cols-2 gap-4">
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                               <Input className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                               <Input className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
//                                 onChange={e => setFormAcCurr(e.target.value)} />
//                             </div>
//                           </div>
//                         )}
//                       </>
//                     )}

//                     <div className="flex items-center gap-2">
//                       <Label className="text-xs font-medium text-muted-foreground">Mode:</Label>
//                       <Button size="sm" className="rounded-lg" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
//                       <Button size="sm" className="rounded-lg" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
//                     </div>

//                     {manualMode && (
//                       <div className="space-y-2">
//                         <Label className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
//                         {(!formFlatId || formFlatId === "all") && (
//                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         )}
//                         {(formFlatId && formFlatId !== "all") && (
//                           <div className="space-y-2">
//                             {flatRoomRows.map(row => (
//                               <div key={row.roomId} className="flex gap-2 items-center">
//                                 <span className="w-24 text-sm">{row.roomNumber}</span>
//                                 <Input className="rounded-lg" type="number" value={manualRate}
//                                   onChange={e => {
//                                     const val = Number(e.target.value);
//                                     setManualRate(val);
//                                     const updated: Record<string, number> = {};
//                                     flatRoomRows.forEach(r => { updated[String(r.roomId)] = val; });
//                                     setRoomManualRates(prev => ({ ...prev, ...updated }));
//                                   }}
//                                   placeholder="Enter unit rate for all rooms" />
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>

//                   <DialogFooter className="mt-4">
//                     <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
//                     <Button className="rounded-lg" onClick={handleAdd} disabled={isSaving}>
//                       {isSaving ? "Saving..." : "Save"}
//                     </Button>
//                   </DialogFooter>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </>
//         )}
//       </div>

//       {/* ── Bill Dialog — rounded-2xl + contained scroll, matching the
//           Add dialog's pattern. */}
//       <Dialog open={billOpen} onOpenChange={setBillOpen}>
//         <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative max-h-[90vh] overflow-y-auto p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
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

//       {/* ── Upload Dialog — rounded-2xl, matching the Add dialog's pattern. */}
//       <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
//         <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
//           <div className="relative p-6">
//             <DialogClose asChild>
//               <button
//                 type="button"
//                 aria-label="Close"
//                 className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4 shrink-0" />
//               </button>
//             </DialogClose>
//             <DialogHeader>
//               <DialogTitle>Upload EB Excel</DialogTitle>
//               <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
//             </DialogHeader>
//             <Input className="rounded-lg" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
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
  deleteEBReadingsByFlat,
  deleteEBReadingsByRoom,
  fetchAllPages,
} from "@/lib/store";

import { Room, EBReading, Tenant, Branch, Flat } from "@/lib/types";

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
import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";

const EBReadingsPage = () => {
  // ── role is uppercased for all comparisons ────────────────────────────
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId(); // number | null

  const isAdmin   = role === "ADMIN" || role === "WARDEN";
  const hasAccess = isAdmin;
  const canPickBranch = role === "ADMIN" || role === "SUPER_ADMIN";

  // ── WARDEN always scoped to their branch; ADMIN/SUPER_ADMIN see "all" ─
  const defaultBranch =
    role === "ADMIN" || role === "SUPER_ADMIN"
      ? "all"
      : branchId != null ? String(branchId) : "all";

  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [readings,     setReadings]     = useState<EBReading[]>([]);
  const [tenants,      setTenants]      = useState<Tenant[]>([]);
  const [allReadings,  setAllReadings]  = useState<EBReading[]>([]);
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [flats,        setFlats]        = useState<Flat[]>([]);
  const [tenantRows,   setTenantRows]   = useState<any[]>([]);
  const [flatRoomRows, setFlatRoomRows] = useState<any[]>([]);
  const [tenantBills,  setTenantBills]  = useState<any[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [billOpen,   setBillOpen]   = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);

  const [manualRate,      setManualRate]      = useState<number | "">(13);
  const [manualMode,      setManualMode]      = useState(false);
  const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

  // Page-level "flat" filter shown in the table's filter row.
  const [formFlatId,      setFormFlatId]      = useState("all");
  const [formRoomId,      setFormRoomId]      = useState("");
  // Which tenant this room-level reading is a checkout FOR. Only
  // relevant/shown when the selected room currently has more than one
  // active tenant sharing the same meter AND more than one of them still
  // needs a reading recorded this month — see roomActiveTenants and
  // unreadActiveTenants below.
  const [formTenantId,    setFormTenantId]    = useState("");
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcPrev,      setFormAcPrev]      = useState("");
  const [formAcCurr,      setFormAcCurr]      = useState("");
  const [roomSearch,      setRoomSearch]      = useState("");
  const [flatSearch,      setFlatSearch]      = useState("");
  const [billRoom,        setBillRoom]        = useState("");
  const [formBranchId, setFormBranchId] = useState("");
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

  /* ─── RATE ─────────────────────────────────────────────── */
  const getRateForRoom = (roomId: string | number) => {
    const roomRate = roomManualRates[String(roomId)];
    if (manualMode && roomRate !== undefined) return roomRate;
    if (typeof manualRate === "number") return manualRate;
    return 13;
  };

  /* ─── IS AC ─────────────────────────────────────────────── */
  const isRoomAc = useCallback(
    (roomId: string | number) => {
      const room = rooms.find(r => String(r.id) === String(roomId));
      return room?.hostelType === "AC";
    },
    [rooms]
  );

  /* ─── FLAT ROW CHANGE ───────────────────────────────────── */
  const handleFlatRowChange = (
    roomId: string | number,
    field: "currentReading" | "acCurrentReading",
    value: string
  ) => {
    setFlatRoomRows(prev =>
      prev.map(row => (row.roomId === roomId ? { ...row, [field]: value } : row))
    );
  };

  /* ─── STARTING READINGS ─────────────────────────────────── */
  const getRoomStartingACReading = useCallback(
    (roomId: string | number) => {
      const roomSpecific = allReadings
        .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          if (b.month !== a.month) return b.month - a.month;
          return (b.id ?? 0) - (a.id ?? 0);
        });
      if (roomSpecific.length > 0) return Number(roomSpecific[0].acCurrentReading ?? 0);
      const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
      if (roomTenants.length > 0)
        return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
      return 0;
    },
    [allReadings, tenants]
  );

  const getRoomStartingReading = useCallback(
    (roomId: string | number) => {
      const room = rooms.find(r => String(r.id) === String(roomId));
      const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
      if (roomReadings.length > 0) {
        const sorted = [...roomReadings].sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });
        return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
      }
      if (room?.flatId) {
        const flatReadings = allReadings.filter(
          r => String(r.flatId) === String(room.flatId)
        );
        if (flatReadings.length > 0) {
          const sorted = [...flatReadings].sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
          });
          return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
        }
      }
      const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
      if (roomTenants.length > 0)
        return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
      return 0;
    },
    [allReadings, tenants, rooms]
  );

  const getRoomIdByRoomNumber = (roomNumber: string) =>
    rooms.find(r => r.roomNumber === roomNumber)?.id;

  /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
  const filteredRooms = useMemo(() => {
    if (selectedBranch === "all") return rooms;
    return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
  }, [rooms, selectedBranch]);

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

  const dialogFilteredFlats = useMemo(
    () => dialogFlats.filter(f => f.flatNumber.toLowerCase().includes(flatSearch.toLowerCase())),
    [dialogFlats, flatSearch]
  );

  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
    return map;
  }, [rooms]);

  // Tenants currently active in the room selected in the Add dialog
  // (single-room mode only). When a room's meter is shared by more than
  // one active tenant, "Previous" can no longer be filled from a single
  // room-level "last reading" value — each tenant has their own join
  // reading, and the checkout being recorded here belongs to exactly one
  // of them. Sorted by joinReading so earliest joiner (usually who the
  // admin is checking out first) appears first.
  const roomActiveTenants = useMemo(() => {
    if (!formRoomId) return [];
    return tenants
      .filter(
        t =>
          String(t.roomId) === String(formRoomId) &&
          String(t.status).toLowerCase() === "active"
      )
      .sort((a, b) => Number(a.joinReading ?? 0) - Number(b.joinReading ?? 0));
  }, [tenants, formRoomId]);

  // Readings already saved for the currently-selected room, for the EXACT
  // month/year being entered in this dialog. Checking out a tenant through
  // this dialog doesn't flip that tenant to "inactive" — that only happens
  // on the separate Tenant Check-Out page — so a tenant can still show up
  // in roomActiveTenants above even after their own checkout reading was
  // already saved this month.
  //
  // Each saved reading this month is its own tenant's checkout segment
  // (previousReading = that tenant's own join reading), not one
  // continuously-advancing meter value. So we can NEVER just take the
  // min/max across all of them to decide the next tenant's "Previous" —
  // that silently attributes one tenant's segment to another. Instead we
  // match each reading back to the SPECIFIC tenant it belongs to (see
  // findOwnReadingThisMonth below) and only ever use a tenant's own
  // matched reading to prefill their own "Previous".
  const roomReadingsThisMonth = useMemo(() => {
    if (!formRoomId) return [];
    return allReadings.filter(
      r =>
        r.roomId != null &&
        String(r.roomId) === String(formRoomId) &&
        r.month === selMonth &&
        r.year === selYear
    );
  }, [allReadings, formRoomId, selMonth, selYear]);

  // A reading saved this month "belongs" to a given tenant when we know
  // for certain which tenant it was recorded for. Two signals, in order
  // of trust:
  //
  //  1. tenantId on the reading itself (set at save time — see
  //     handleAdd below). This is unambiguous even when several active
  //     tenants in the room joined at the exact same meter reading.
  //
  //  2. Legacy fallback for readings saved before tenantId was tracked:
  //     previousReading === this tenant's own joinReading. This ONLY
  //     works when no other active tenant in the room shares that same
  //     joinReading — if two tenants both joined at reading 180, we
  //     can't tell which of their readings this is, so we deliberately
  //     return nothing rather than guess wrong.
  const findOwnReadingThisMonth = useCallback(
    (tenant: Tenant) => {
      const byTenantId = roomReadingsThisMonth.find(
        r => (r as any).tenantId != null && Number((r as any).tenantId) === Number(tenant.id)
      );
      if (byTenantId) return byTenantId;

      const join = Number(tenant.joinReading ?? NaN);
      if (!Number.isFinite(join)) return undefined;

      const sameJoinSiblingCount = roomActiveTenants.filter(
        t => Number(t.joinReading ?? NaN) === join
      ).length;
      if (sameJoinSiblingCount > 1) return undefined; // ambiguous — can't safely infer

      return roomReadingsThisMonth.find(
        r => (r as any).tenantId == null && Number(r.previousReading) === join
      );
    },
    [roomReadingsThisMonth, roomActiveTenants]
  );

  // Active tenants in this room who do NOT yet have their own reading
  // recorded for the selected month — i.e. still need a fresh entry. A
  // tenant who has already been checked out via this dialog this month
  // (and so has a reading matching their own joinReading) is excluded,
  // even though they may still show as "Active" until the separate
  // Tenant Check-Out page is used.
  const unreadActiveTenants = useMemo(
    () => roomActiveTenants.filter(t => !findOwnReadingThisMonth(t)),
    [roomActiveTenants, findOwnReadingThisMonth]
  );

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
    return data;
  }, [readings, rooms, selectedBranch, selMonth, selYear]);

  /* ─── RELOAD ─────────────────────────────────────────────── */
  const reload = async () => {
    const [
      roomsResult,
      readingsResult,
      tenantsResult,
      branchesResult,
      flatsResult,
    ] = await Promise.allSettled([
      fetchAllPages<Room>(getRooms),
      fetchAllPages<EBReading>(getEBReadings),
      fetchAllPages<Tenant>(getTenants),
      fetchAllPages<Branch>(getBranches),
      fetchAllPages<Flat>(getFlats),
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
  };

  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, []);

  /* ─── FLAT ROOM ROWS (uses dialog-scoped rooms) ─────────── */
  useEffect(() => {
    if (!formFlatId || formFlatId === "all") { setFlatRoomRows([]); return; }
    const roomsInFlat = dialogRooms.filter(
      r => String(r.flatId) === String(formFlatId)
    );
    const rows = roomsInFlat.map(room => {
      const allForRoom = readings
        .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          if (b.month !== a.month) return b.month - a.month;
          return (b.id ?? 0) - (a.id ?? 0);
        });
      const latest = allForRoom[0] ?? null;
      return {
        roomId:            room.id,
        roomNumber:        room.roomNumber,
        isAc:              room.hostelType === "AC",
        previousReading:   latest != null
          ? Number(latest.currentReading ?? 0)
          : getRoomStartingReading(room.id),
        currentReading:    "",
        acPreviousReading: latest != null
          ? Number(latest.acCurrentReading ?? 0)
          : getRoomStartingACReading(room.id),
        acCurrentReading:  "",
      };
    });
    setFlatRoomRows(rows);
  }, [formFlatId, dialogRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

  /* ─── SYNC FORM READINGS ON ROOM CHANGE ─────────────────── */
  // FIX: previously, once ANY reading existed for the room this month,
  // "Previous" was taken from the min/max of ALL of that room's readings
  // this month — regardless of which tenant it actually belonged to. That
  // meant checking out one tenant (e.g. Askingin, 150→170) silently
  // became the "Previous" for the NEXT tenant's checkout (e.g. Anbarasan,
  // who should start from their own joinReading of 100, not 170).
  //
  // Now: each tenant's own reading this month is matched specifically via
  // findOwnReadingThisMonth (previousReading === that tenant's own
  // joinReading). Logic:
  //   - No active tenants left            → room's own starting reading.
  //   - Exactly 1 active tenant           → that tenant's own reading if
  //                                          already saved this month
  //                                          (continue from their own
  //                                          currentReading), else their
  //                                          own joinReading.
  //   - 2+ active tenants, exactly 1 of
  //     them still unread this month      → auto-fill from that ONE
  //                                          tenant's own joinReading
  //                                          (unambiguous — the others
  //                                          already have entries).
  //   - 2+ active tenants, 0 or 2+ of
  //     them still unread this month      → ambiguous, wait for an
  //                                          explicit tenant pick.
  useEffect(() => {
    if (!formRoomId) return;
    setFormTenantId("");

    if (roomActiveTenants.length === 0) {
      setFormPrevReading(String(getRoomStartingReading(formRoomId)));
      setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
      return;
    }

    if (roomActiveTenants.length === 1) {
      const only = roomActiveTenants[0];
      const own = findOwnReadingThisMonth(only);
      if (own) {
        // Already has an entry this month — continue from where THEIR
        // segment left off, not their original join reading.
        setFormPrevReading(String(Number(own.currentReading ?? 0)));
        setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
      } else {
        setFormPrevReading(
          String(only.joinReading ?? getRoomStartingReading(formRoomId))
        );
        setFormAcPrev(
          String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
        );
      }
      return;
    }

    // Multiple active tenants sharing this meter.
    if (unreadActiveTenants.length === 1) {
      // Only one of them still needs an entry this month — unambiguous,
      // no need to force an explicit pick.
      const only = unreadActiveTenants[0];
      setFormPrevReading(
        String(only.joinReading ?? getRoomStartingReading(formRoomId))
      );
      setFormAcPrev(
        String(only.acJoinReading ?? getRoomStartingACReading(formRoomId))
      );
    } else {
      // Either nobody has been read yet (0) or more than one still needs
      // an entry (2+) — in both cases we can't guess which tenant this
      // new entry is for. Wait for an explicit pick.
      setFormPrevReading("");
      setFormAcPrev("");
    }
  }, [
    formRoomId,
    roomActiveTenants,
    unreadActiveTenants,
    findOwnReadingThisMonth,
    getRoomStartingReading,
    getRoomStartingACReading,
  ]);

  // Once the admin picks which tenant this checkout reading belongs to
  // (only shown/needed when roomActiveTenants.length > 1 AND more than
  // one of them still needs an entry this month), pull "Previous" /
  // "AC Previous" from THAT tenant's own data — their own saved reading
  // this month if one exists, else their own join reading.
  useEffect(() => {
    if (!formTenantId) return;
    const t = roomActiveTenants.find(rt => String(rt.id) === String(formTenantId));
    if (!t) return;
    const own = findOwnReadingThisMonth(t);
    if (own) {
      setFormPrevReading(String(Number(own.currentReading ?? 0)));
      setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
    } else {
      setFormPrevReading(
        String(t.joinReading ?? getRoomStartingReading(formRoomId))
      );
      setFormAcPrev(
        String(t.acJoinReading ?? getRoomStartingACReading(formRoomId))
      );
    }
  }, [
    formTenantId,
    roomActiveTenants,
    findOwnReadingThisMonth,
    formRoomId,
    getRoomStartingReading,
    getRoomStartingACReading,
  ]);

  /* ─── BUILD TENANT BILL ROWS ─────────────────────────────── */
  useEffect(() => {
    const loadTenantBills = async () => {
      const rows: any[] = [];
      const flatHandled = new Set<number>();
      const roomHandled = new Set<number>();

      const flatReadingMap = new Map<number, EBReading>();
      for (const r of filteredReadings.filter(r => r.flatId != null)) {
        const existing = flatReadingMap.get(r.flatId!);
        if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
          flatReadingMap.set(r.flatId!, r);
        }
      }

      for (const r of Array.from(flatReadingMap.values())) {
        if (flatHandled.has(r.flatId!)) continue;
        flatHandled.add(r.flatId!);
        try {
          const bills = await getTenantWiseEBBill({
            flatId: r.flatId,
            month: r.month,
            year: r.year,
          });

          const flatTenantIds = new Set(
            tenants
              .filter(t => {
                const room = rooms.find(rm => rm.id === t.roomId);
                return room && String(room.flatId) === String(r.flatId);
              })
              .map(t => Number(t.id))
          );

          bills
            .filter((b: any) => b.tenantId == null || flatTenantIds.has(Number(b.tenantId)))
            .forEach((b: any) => {
              rows.push({
                id: r.id,
                roomId: getRoomIdByRoomNumber(b.roomNumber),
                flatId: r.flatId,
                roomNumber: b.roomNumber,
                flatNumber: b.flatNumber,
                branchId: (r as any).branchId ?? null,
                branchName: (r as any).branchName ?? null,
                tenantName: b.tenantName,
                previousReading: b.previousReading,
                currentReading: b.currentReading,
                acPreviousReading: b.acPreviousReading,
                acCurrentReading: b.acCurrentReading,
                unitsConsumed: b.totalUnits,
                tenantAmount: b.amount,
              });
            });
        } catch { /* skip failed flat */ }
      }

      const roomReadings = filteredReadings.filter(r => {
        const room = rooms.find(rm => rm.id === r.roomId);
        return !room?.flatId && r.roomId != null;
      });
      for (const r of roomReadings) {
        const room = rooms.find(rm => rm.id === r.roomId);
        if (!room) continue;
        if (room.flatId && flatHandled.has(room.flatId)) continue;
        if (roomHandled.has(r.roomId!)) continue;
        roomHandled.add(r.roomId!);
        try {
          // FIX: same as above — pass this reading's own month/year
          // through instead of omitting them.
          const bills = await getTenantWiseEBBill({
            roomId: r.roomId,
            month: r.month,
            year: r.year,
          });

          const roomTenantIds = new Set(
            tenants
              .filter(t => String(t.roomId) === String(room.id))
              .map(t => Number(t.id))
          );

          const matchedBills = bills.filter(
            (b: any) => b.tenantId == null || roomTenantIds.has(Number(b.tenantId))
          );

          if (matchedBills.length > 0) {
            matchedBills.forEach((b: any) => {
              rows.push({
                id: r.id,
                roomId: room.id,
                flatId: room.flatId,
                roomNumber: room.roomNumber,
                flatNumber: b.flatNumber,
                branchId: (r as any).branchId ?? null,
                branchName: (r as any).branchName ?? null,
                tenantName: b.tenantName,
                previousReading: b.previousReading ?? r.previousReading,
                currentReading: b.currentReading ?? r.currentReading,
                acPreviousReading: b.acPreviousReading,
                acCurrentReading: b.acCurrentReading,
                unitsConsumed: Number(b.totalUnits ?? 0),
                tenantAmount: b.amount,
              });
            });
          } else {
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
        } catch { /* skip failed room */ }
      }
      setTenantRows(rows);
    };

    if (filteredReadings.length > 0) loadTenantBills();
    else setTenantRows([]);
  }, [filteredReadings, roomMap, rooms, tenants]);

  /* ─── ADD READING ───────────────────────────────────────── */
  const handleAdd = async () => {
    if (isSaving) return;

    // Require an explicit branch for roles that can see multiple branches.
    // WARDEN never hits this because formBranchId is pre-filled to their
    // own branch when the dialog opens.
    if (canPickBranch && !formBranchId) {
      toast.error("Select a branch first");
      return;
    }

    setIsSaving(true);
    try {
      const branchIdNum = formBranchId ? Number(formBranchId) : undefined;

      if (formFlatId && formFlatId !== "all") {
        const validRows = flatRoomRows.filter(row => row.currentReading !== "");
        if (validRows.length === 0) { toast.error("Enter at least one room reading"); return; }
        for (const row of validRows) {
          const prev   = Number(row.previousReading);
          const curr   = Number(row.currentReading);
          const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
          const acCurr = row.isAc ? Number(row.acCurrentReading)  : 0;
          if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }
          // Tag this reading with the tenant it belongs to whenever it's
          // unambiguous (exactly one active tenant in that room). With
          // 2+ active tenants sharing a meter there's no per-room tenant
          // picker in flat mode, so we leave tenantId unset rather than
          // guess — the fallback join-reading match will apply later,
          // and only when it's itself unambiguous.
          const roomTenants = tenants.filter(
            t =>
              String(t.roomId) === String(row.roomId) &&
              String(t.status).toLowerCase() === "active"
          );
          const rowTenantId = roomTenants.length === 1 ? Number(roomTenants[0].id) : undefined;
          await addEBReading({
            flatId: Number(formFlatId), roomId: Number(row.roomId),
            branchId: branchIdNum,
            month: selMonth, year: selYear,
            previousReading: prev, currentReading: curr,
            acPreviousReading: acPrev, acCurrentReading: acCurr,
            ebRate: getRateForRoom(row.roomId), isCheckout: true,
            tenantId: rowTenantId,
          } as any);
        }
        toast.success("Flat readings saved");
      } else {
        if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
        // A tenant pick is only required when this room has more than one
        // active tenant AND more than one of them still needs an entry
        // this month — see unreadActiveTenants above. If exactly one
        // still needs an entry, it's unambiguous and was auto-filled.
        if (
          roomActiveTenants.length > 1 &&
          unreadActiveTenants.length !== 1 &&
          !formTenantId
        ) {
          toast.error("Select which tenant this checkout reading is for");
          return;
        }
        if (!formPrevReading) { toast.error("Previous reading is missing"); return; }
        const prev   = Number(formPrevReading);
        const curr   = Number(formCurrReading);
        const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
        const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;
        if (curr < prev) { toast.error("Current reading cannot be less than previous"); return; }
        // Resolve exactly which tenant this reading is for, so later
        // lookups (this dialog next time, and the Checkout page) can
        // match on tenantId instead of guessing from joinReading —
        // which breaks when tenants share the same join reading.
        const resolvedTenantId =
          roomActiveTenants.length === 1
            ? Number(roomActiveTenants[0].id)
            : formTenantId
              ? Number(formTenantId)
              : unreadActiveTenants.length === 1
                ? Number(unreadActiveTenants[0].id)
                : undefined;
        await addEBReading({
          roomId: Number(formRoomId),
          branchId: branchIdNum,
          month: selMonth, year: selYear,
          previousReading: prev, currentReading: curr,
          acPreviousReading: acPrev, acCurrentReading: acCurr,
          ebRate: getRateForRoom(formRoomId), isCheckout: true,
          tenantId: resolvedTenantId,
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
        await addEBReading({
          roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
          // Use the room's own branch (unitId) when uploading via Excel,
          // since there's no per-row branch selector for bulk upload.
          branchId: room.unitId != null ? Number(room.unitId) : undefined,
          month: selMonth, year: selYear,
          previousReading: prev, currentReading: curr,
          acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
          acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
          ebRate, isCheckout: true,
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
        await deleteEBReadingsByFlat(flatId);
        toast.success("Flat readings deleted");
      } else if (roomId) {
        await deleteEBReadingsByRoom(roomId);
        toast.success("Room readings deleted");
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
    askConfirm(
      "Delete this EB reading?",
      () => {
        handleDelete(
          String(row.id),
          row.flatId ? Number(row.flatId) : undefined,
          row.roomId ? Number(row.roomId) : undefined
        );
      },
      { description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }
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
      const latestReadings = await fetchAllPages<EBReading>(getEBReadings);
      const data = filteredRooms.map(room => {
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
        return {
          RoomNumber: room.roomNumber,
          Previous:   lastReading?.currentReading ?? 0,
          Current:    "",
          AcPrevious: room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
          AcCurrent:  room.hostelType === "AC" ? "" : "-",
          EbRate:     lastRate,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
      XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to download Excel");
    }
  };

  /* ─── FILTERED TENANT ROWS ──────────────────────────────── */
  const filteredTenantRows = useMemo(() => {
    let data = tenantRows;
    if (selectedBranch !== "all") {
      data = data.filter(row => {
        const room = rooms.find(r => r.id === row.roomId);
        return Number(room?.unitId) === Number(selectedBranch);
      });
    }
    if (selectedRoomId !== "all") {
      data = data.filter(row => String(row.roomId) === String(selectedRoomId));
    }
    return data;
  }, [tenantRows, selectedBranch, rooms, selectedRoomId]);

  /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
  const selectedRoomObj = useMemo(
    () => rooms.find(r => String(r.id) === String(formRoomId)),
    [rooms, formRoomId]
  );

  /* ─── RESET DIALOG ──────────────────────────────────────── */
  const resetAddDialog = () => {
    setRoomSearch(""); setFlatSearch(""); setFormFlatId("all"); setFormRoomId("");
    setFormTenantId(""); setFormBranchId("");
    setFormPrevReading(""); setFormCurrReading("");
    setFormAcPrev(""); setFormAcCurr("");
    setFlatRoomRows([]); setManualMode(false);
    setManualRate(13); setRoomManualRates({});
  };

  const openAddDialog = () => {
    setFormBranchId(
      role === "WARDEN" && branchId != null
        ? String(branchId)
        : selectedBranch !== "all" ? selectedBranch : ""
    );
    setAddOpen(true);
  };

  /* ─── Pagination ─── */
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Total page count, used both to bound the "Next" button and to build
  // the numbered page list below.
  const totalPages = Math.max(1, Math.ceil(filteredTenantRows.length / pageSize));

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
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

        .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

        .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .eb-table th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .eb-table tr:hover { background: #fdfcff; }

        .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-tenant-name { font-size: 12px; color: #64748b; margin-top: 2px; }
        .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }

        .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .eb-status.collected { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.pending { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.not-read { color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }

        .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
        /* !important here is deliberate: something elsewhere in the app's
           global CSS is hiding/zeroing SVGs inside these buttons specifically
           (lucide icons that render fine elsewhere on this same page were
           still blank here). Rather than hunt for that rule, these overrides
           just guarantee the icon paints regardless of what else applies. */
        .eb-action-btn svg {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 14px !important;
          height: 14px !important;
          min-width: 14px !important;
          min-height: 14px !important;
          stroke: #64748b !important;
          color: #64748b !important;
          flex-shrink: 0 !important;
          pointer-events: none;
        }
        .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
        /* Disabled buttons (e.g. pagination arrows when there's only one
           page) were stacking two dimming effects — button opacity AND a
           very light icon stroke — which combined to make them basically
           invisible rather than just "grayed out". Dim via icon color only
           so the button/icon stay visibly present. */
        .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
        .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
        .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

        /* The pagination row can now hold many number buttons
           (1 2 3 4 ... 53), so let it wrap on narrow screens instead of
           overflowing, and give the "..." marker its own non-interactive
           look (no hover state, no pointer). */
        .eb-pagination-row { flex-wrap: wrap; }
        .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
        .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

        .eb-chart-container { padding: 20px; }

        /* Flat-mode "per-room" cards inside the Add EB Reading dialog.
           Previously each room's Room/Prev/Current header was re-rendered
           right above that room's own inputs, so an empty Current field's
           placeholder text ("Current") sat directly under the "Current"
           column label with almost no gap (mb-1) — visually it read as one
           overlapping blob rather than a label + an empty field. Each field
           now carries its own persistent <Label>, so there's nothing that
           can look "covered" regardless of whether the input has a value,
           and the room is broken into its own bordered, padded card so the
           whole section reads clearly even when rooms mix AC/non-AC. */
        .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
        .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
        .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
      `}</style>

      <div className="eb-wrap">
        <div className="eb-layout">
          <div>
            <div className="eb-panel">
              <div className="eb-panel-header">
                <div className="eb-panel-title">EB Readings List</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
                    <Download size={14} className="mr-2" /> Export
                  </Button>
                  {hasAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
                          <Plus size={14} className="mr-2" /> Add EB Reading
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={openAddDialog}>Single Room Reading</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUploadOpen(true)}>Upload Excel Reading</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!hasAccess || !canPickBranch}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
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

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]">
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="All Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {filteredRooms.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[160px]">
                  <Select
                    value={`${selYear}-${selMonth}`}
                    onValueChange={val => {
                      const [y, m] = val.split("-").map(Number);
                      setSelYear(y);
                      setSelMonth(m);
                    }}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthYearOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a]" onClick={() => {
                  setSelectedBranch(defaultBranch);
                  setSelectedRoomId("all");
                  setSelMonth(now.getMonth() + 1);
                  setSelYear(now.getFullYear());
                }}>
                  <RefreshCw size={14} /> Clear
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="eb-table">
                  <thead>
                    <tr>
                      <th>ROOM / BED</th>
                      <th>PREV READING</th>
                      <th>CURR READING</th>
                      <th>UNITS</th>
                      <th>AMOUNT (₹)</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">No EB readings found.</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, i) => {
                        const rName = roomMap[row.roomId] || "Unknown";
                        const tenantName = row.tenantName || "Unassigned";
                        const prev = Number(row.previousReading ?? 0);
                        const curr = Number(row.currentReading ?? 0);
                        const units = row.unitsConsumed != null
                          ? Math.round(Number(row.unitsConsumed))
                          : Math.round(curr - prev);

                        const amount = Math.round(Number(row.tenantAmount ?? 0));
                        const status = row.tenantAmount ? "Pending" : "Not Read";

                        return (
                          <tr key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${i}`}>
                            <td>
                              <div className="eb-room-name">{rName}</div>
                              <div className="eb-tenant-name">{tenantName}</div>
                            </td>
                            <td><span className="eb-reading-val">{prev}</span></td>
                            <td><span className="eb-reading-val">{curr || "—"}</span></td>
                            <td><span className="eb-reading-val">{units || "—"}</span></td>
                            <td><span className="eb-amount">{amount ? `₹${new Intl.NumberFormat('en-IN').format(amount)}` : "—"}</span></td>
                            <td><div className={`eb-status ${status.toLowerCase().replace(' ', '-')}`}>{status}</div></td>
                            <td>
                              <div className="flex gap-2">
                                <button className="eb-action-btn" onClick={() => handleSendWhatsApp(row.roomId)} title="Send Bill">
                                  <Send size={14} />
                                </button>
                                {hasAccess && (
                                  <button
                                    className="eb-action-btn"
                                    onClick={() => handleDeleteReadingClick(row)}
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
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

              <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
                <div className="text-[13px] text-[#64748b]">
                  Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
                </div>
                {/* Numbered pagination row (1 2 3 … n). Prev/Next chevrons
                    stay on either end and disable correctly at the
                    first/last page. */}
                <div className="flex gap-2 eb-pagination-row">
                  <button
                    className="eb-action-btn w-8"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis">
                        <MoreHorizontal size={14} />
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
                        onClick={() => setCurrentPage(p - 1)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    className="eb-action-btn w-8"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasAccess && (
          <>
            
            <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
              <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
                <div className="relative max-h-[90vh] overflow-y-auto p-6">
                  <DialogClose asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-4 w-4 shrink-0" />
                    </button>
                  </DialogClose>

                  <DialogHeader>
                    <DialogTitle>Add EB Reading</DialogTitle>
                    <DialogDescription>Enter the electricity meter readings for this month.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 mt-2">
                    {/* Branch + Flat side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
                        {canPickBranch ? (
                          <Select
                            value={formBranchId}
                            onValueChange={val => {
                              setFormBranchId(val);
                              setFormFlatId("all");
                              setFormRoomId("");
                              setRoomSearch("");
                              // Branch changed → the flat list this search
                              // was filtering no longer applies.
                              setFlatSearch("");
                            }}
                          >
                            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
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

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
                        <Select
                          value={formFlatId}
                          onValueChange={val => { setFormFlatId(val); setFlatSearch(""); }}
                          disabled={canPickBranch && !formBranchId}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                              <Input placeholder="Search flat..." value={flatSearch}
                                onChange={e => setFlatSearch(e.target.value)}
                                onKeyDown={e => e.stopPropagation()}
                                className="h-8 text-sm rounded-lg" autoFocus />
                            </div>
                            <SelectItem value="all">Select Flat</SelectItem>
                            {dialogFlats.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No flat available</div>
                            ) : (
                              <>
                                {dialogFilteredFlats.map(f => (
                                  <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                                ))}
                                {dialogFilteredFlats.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No flat found</div>
                                )}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(formFlatId && formFlatId !== "all") ? (
                      <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1">
                        {flatRoomRows.map(row => (
                          <div key={row.roomId} className="eb-flat-room-card">
                            <div className="eb-flat-room-title">Room {row.roomNumber}</div>
                            <div className={`grid ${row.isAc ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} gap-4`}>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
                                <Input className="rounded-lg bg-white" value={row.previousReading} readOnly />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Current</Label>
                                <Input
                                  className="rounded-lg bg-white"
                                  placeholder="Enter current reading"
                                  value={row.currentReading}
                                  onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)}
                                />
                              </div>
                              {row.isAc && (
                                <>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                                    <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
                                    <Input
                                      className="rounded-lg bg-white"
                                      placeholder="Enter AC current reading"
                                      value={row.acCurrentReading}
                                      onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Room</Label>
                          <Select
                            value={formRoomId}
                            onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
                            disabled={canPickBranch && !formBranchId}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                                <Input placeholder="Search room..." value={roomSearch}
                                  onChange={e => setRoomSearch(e.target.value)}
                                  onKeyDown={e => e.stopPropagation()}
                                  className="h-8 text-sm rounded-lg" autoFocus />
                              </div>
                              {dialogFlatFilteredRooms
                                .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
                                .map(r => (
                                  <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
                                ))}
                              {/* When this branch's rooms are all attached to
                                  flats (no standalone rooms exist at all), telling the
                                  user "No room found" reads like a bug/dead-end. Point
                                  them at the Flat dropdown above instead, which is the
                                  actual way to enter readings for those rooms. Plain
                                  search misses (standalone rooms exist, just none match
                                  the typed text) still show the old generic message. */}
                              {dialogFlatFilteredRooms.filter(r =>
                                r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  {dialogStandaloneRooms.length === 0
                                    ? "No standalone rooms in this branch — select a flat above instead"
                                    : "No room found"}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Only appears when this room currently has more
                            than one active tenant sharing the same meter
                            AND more than one of them still needs an entry
                            this month (once exactly one is left unread,
                            it's auto-filled — see unreadActiveTenants
                            above — so no tenant pick is needed). */}
                        {roomActiveTenants.length > 1 && unreadActiveTenants.length !== 1 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Tenant (this reading is a checkout for)
                            </Label>
                            <Select value={formTenantId} onValueChange={setFormTenantId}>
                              <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                              <SelectContent>
                                {roomActiveTenants.map(t => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.name} — joined at {t.joinReading ?? "—"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Previous + Current side by side */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
                            <Input
                              className="rounded-lg"
                              placeholder={
                                roomActiveTenants.length > 1 &&
                                unreadActiveTenants.length !== 1 &&
                                !formTenantId
                                  ? "Select a tenant first"
                                  : "Previous"
                              }
                              value={formPrevReading}
                              readOnly
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Current</Label>
                            <Input className="rounded-lg" placeholder="Current" value={formCurrReading}
                              onChange={e => setFormCurrReading(e.target.value)} />
                          </div>
                        </div>

                        {selectedRoomObj?.hostelType === "AC" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                              <Input className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
                              <Input className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
                                onChange={e => setFormAcCurr(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-muted-foreground">Mode:</Label>
                      <Button size="sm" className="rounded-lg" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
                      <Button size="sm" className="rounded-lg" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
                    </div>

                    {manualMode && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
                        {(!formFlatId || formFlatId === "all") && (
                          <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
                            onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                            placeholder="Enter rate for this room" />
                        )}
                        {(formFlatId && formFlatId !== "all") && (
                          <div className="space-y-2">
                            {flatRoomRows.map(row => (
                              <div key={row.roomId} className="flex gap-2 items-center">
                                <span className="w-24 text-sm">{row.roomNumber}</span>
                                <Input className="rounded-lg" type="number" value={manualRate}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setManualRate(val);
                                    const updated: Record<string, number> = {};
                                    flatRoomRows.forEach(r => { updated[String(r.roomId)] = val; });
                                    setRoomManualRates(prev => ({ ...prev, ...updated }));
                                  }}
                                  placeholder="Enter unit rate for all rooms" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                    <Button className="rounded-lg" onClick={handleAdd} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* ── Bill Dialog — rounded-2xl + contained scroll, matching the
          Add dialog's pattern. */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <div className="relative max-h-[90vh] overflow-y-auto p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4 shrink-0" />
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

      {/* ── Upload Dialog — rounded-2xl, matching the Add dialog's pattern. */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="rounded-2xl p-0 [&>button]:hidden">
          <div className="relative p-6">
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>Upload EB Excel</DialogTitle>
              <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
            </DialogHeader>
            <Input className="rounded-lg" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
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