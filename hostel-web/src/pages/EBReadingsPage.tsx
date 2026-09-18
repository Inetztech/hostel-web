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
//   // relevant/shown when the selected STANDALONE room (no flatId) currently
//   // has more than one active tenant sharing the same meter AND more than
//   // one of them still needs a reading recorded this month — see
//   // roomActiveTenants and unreadActiveTenants below. Flats with a shared
//   // meter (see flatSharedPrev/flatSharedCurr) never need this — there's
//   // no single tenant to attribute a shared-meter reading to.
//   const [formTenantId,    setFormTenantId]    = useState("");
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [roomSearch,      setRoomSearch]      = useState("");
//   const [flatSearch,      setFlatSearch]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");

//   // ── FLAT MODE (shared meter) ────────────────────────────────────────
//   // A flat's electricity meter is ONE physical meter shared by every room
//   // in that flat — it is NOT one meter per room. So there is exactly one
//   // "Previous" / "Current" pair for the whole flat, and every room in the
//   // flat gets saved with the SAME previousReading/currentReading for a
//   // given month. (Previously each room tracked its own previous/current
//   // independently, which let rooms in the same flat silently drift to
//   // different numbers — e.g. EX-1 stuck on an old tenant's reading while
//   // EX-2/EX-3 advanced further — even though physically there's only one
//   // meter to read.)
//   const [flatSharedPrev, setFlatSharedPrev] = useState("");
//   const [flatSharedCurr, setFlatSharedCurr] = useState("");
//   // AC units, unlike the main EB meter, are typically separate per-room
//   // wall units even inside a shared-meter flat, so those stay per-room.
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

//   /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
//   const handleFlatAcRowChange = (roomId: number, value: string) => {
//     setFlatAcRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   // getRoomRecordedCeiling / getRoomRecordedACCeiling — the highest
//   // reading actually SAVED (room or its flat) for this room's meter, with
//   // NO active tenant's joinReading folded in.
//   //
//   // IMPORTANT: this is ONLY a valid floor when there is a single
//   // continuous meter history for the room (the "one active tenant" /
//   // "no active tenant" cases below). It must NEVER be used to clamp a
//   // SPECIFIC tenant's own Previous upward in a shared-meter room with
//   // several active tenants, because rows saved for OTHER tenants sharing
//   // that same room this month do not represent "the meter has already
//   // advanced past this tenant's segment" — they represent a DIFFERENT
//   // tenant's own segment of the same overlapping period. Using them as a
//   // ceiling for this tenant silently throws away the real units between
//   // their own join reading and that unrelated ceiling (see
//   // getRoomStartingReading's docstring for the single-tenant case, where
//   // this ceiling IS the correct thing to use).
//   const getRoomRecordedCeiling = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));
//       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
//       const highestRoomRecorded = roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.currentReading ?? 0)))
//         : 0;
//       let highestFlatRecorded = 0;
//       if (room?.flatId) {
//         const flatReadings = allReadings.filter(r => String(r.flatId) === String(room.flatId));
//         if (flatReadings.length > 0) {
//           highestFlatRecorded = Math.max(...flatReadings.map(r => Number(r.currentReading ?? 0)));
//         }
//       }
//       return Math.max(highestRoomRecorded, highestFlatRecorded);
//     },
//     [allReadings, rooms]
//   );

//   const getRoomRecordedACCeiling = useCallback(
//     (roomId: string | number) => {
//       const roomReadings = allReadings.filter(
//         r => r.roomId != null && String(r.roomId) === String(roomId)
//       );
//       return roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.acCurrentReading ?? 0)))
//         : 0;
//     },
//     [allReadings]
//   );

//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const roomReadings = allReadings.filter(
//         r => r.roomId != null && String(r.roomId) === String(roomId)
//       );
//       const highestRecorded = roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.acCurrentReading ?? 0)))
//         : null;

//       const activeTenants = tenants.filter(
//         t => String(t.roomId) === String(roomId) && String(t.status).toLowerCase() === "active"
//       );
//       const highestActiveJoin = activeTenants.length > 0
//         ? Math.max(...activeTenants.map(t => Number(t.acJoinReading ?? 0)))
//         : null;

//       if (highestRecorded != null) {
//         return Math.max(highestRecorded, highestActiveJoin ?? 0);
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants]
//   );

//   // getRoomStartingReading — for a room, "Previous" is the HIGHEST of:
//   //   - the highest currentReading ever recorded for the room itself
//   //   - the highest currentReading ever recorded for the room's flat
//   //     (covers rooms that used to be tracked via the flat's meter)
//   //   - the highest joinReading among tenants CURRENTLY ACTIVE in the
//   //     room — a tenant's own check-in snapshot is a real physical meter
//   //     reading and can never be lower than the true last-known value,
//   //     so it must be considered even once a reading already exists.
//   // Only when there is NO reading history at all do we fall back to the
//   // LOWEST active tenant's joinReading (or, failing that, the lowest
//   // joinReading among any tenant ever assigned to the room), so the very
//   // first reading still covers whoever moved in first.
//   //
//   // This is safe to use as a ceiling ONLY when there is a single,
//   // unambiguous meter history to continue from — i.e. the "0 or 1 active
//   // tenant" case. It must NOT be reused for a specific tenant's own
//   // Previous in a multi-tenant shared-meter room (see
//   // getRoomRecordedCeiling's docstring above).
//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));

//       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
//       const highestRoomRecorded = roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.currentReading ?? 0)))
//         : null;

//       let highestFlatRecorded: number | null = null;
//       if (room?.flatId) {
//         const flatReadings = allReadings.filter(r => String(r.flatId) === String(room.flatId));
//         if (flatReadings.length > 0) {
//           highestFlatRecorded = Math.max(...flatReadings.map(r => Number(r.currentReading ?? 0)));
//         }
//       }

//       const recorded = [highestRoomRecorded, highestFlatRecorded].filter(
//         (v): v is number => v != null
//       );

//       // Active tenants may have joined (a real physical meter snapshot at
//       // check-in) AFTER the last saved reading — that snapshot can never be
//       // lower than the true last-known value, so it has to be considered
//       // even once a reading already exists for the room.
//       const activeTenants = tenants.filter(
//         t => String(t.roomId) === String(roomId) && String(t.status).toLowerCase() === "active"
//       );
//       const highestActiveJoin = activeTenants.length > 0
//         ? Math.max(...activeTenants.map(t => Number(t.joinReading ?? 0)))
//         : null;

//       if (recorded.length > 0) {
//         return Math.max(...recorded, highestActiveJoin ?? 0);
//       }

//       // No reading history at all — fall back to the LOWEST active tenant's
//       // joinReading, so the first reading still covers whoever moved in first.
//       if (activeTenants.length > 0) {
//         return Math.min(...activeTenants.map(t => Number(t.joinReading ?? 0)));
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants, rooms]
//   );

//   // The flat's own shared-meter "Previous" value.
//   //
//   // FIX: this used to look ONLY at saved EBReading rows for the flat, and
//   // fell back to tenants' own join readings solely when the flat had NO
//   // reading history at all. That breaks as soon as a flat already has at
//   // least one saved reading (e.g. an earlier tenant's checkout) AND a
//   // brand-new tenant then checks into another room in the SAME flat with
//   // a higher "Current EB Reading" captured at check-in (Tenants page) —
//   // that check-in value is a real physical meter snapshot taken AFTER
//   // the last saved reading, so the flat's true last-known value can never
//   // be lower than it. Ignoring it left "Previous" stuck on the older,
//   // lower, already-superseded number for every room/tenant in the flat.
//   //
//   // Now:
//   //   - If the flat has at least one saved reading, Previous is the
//   //     HIGHER of (a) the highest currentReading ever saved for the flat,
//   //     and (b) the highest joinReading among tenants CURRENTLY ACTIVE
//   //     anywhere in the flat — a more-recent check-in's own snapshot can
//   //     only be at or after whatever was last recorded.
//   //   - If the flat has NEVER had a reading saved, Previous falls back to
//   //     the LOWEST active tenant's joinReading instead (not the highest),
//   //     so the very first flat-wide reading still covers consumption all
//   //     the way back to whoever moved in first — otherwise that stretch
//   //     would never get billed to anyone.
//   const getFlatStartingReading = useCallback(
//     (flatId: string | number) => {
//       const flatReadings = allReadings.filter(
//         r => r.flatId != null && String(r.flatId) === String(flatId)
//       );
//       const roomIdsInFlat = new Set(
//         rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
//       );
//       const flatActiveTenants = tenants.filter(
//         t => roomIdsInFlat.has(t.roomId) && String(t.status).toLowerCase() === "active"
//       );

//       if (flatReadings.length > 0) {
//         const highestRecorded = Math.max(...flatReadings.map(r => Number(r.currentReading ?? 0)));
//         const highestActiveJoin = flatActiveTenants.length > 0
//           ? Math.max(...flatActiveTenants.map(t => Number(t.joinReading ?? 0)))
//           : 0;
//         return Math.max(highestRecorded, highestActiveJoin);
//       }

//       if (flatActiveTenants.length > 0) {
//         return Math.min(...flatActiveTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, rooms, tenants]
//   );

//   const getRoomIdByRoomNumber = (roomNumber: string) =>
//     rooms.find(r => r.roomNumber === roomNumber)?.id;

//   /* ─── PER-TENANT READING MATCHING (standalone / non-flat rooms only) ──
//      A STANDALONE room's meter (no flatId — the room itself is the unit
//      with its own meter) can still be shared by more than one active
//      tenant. When that happens we can NEVER just take the min/max of all
//      readings saved for that room this month to decide a "Previous"
//      value — each saved reading this month is its own tenant's checkout
//      segment (previousReading = that tenant's own join reading), not one
//      continuously-advancing meter value.

//      These helpers match a saved reading back to the SPECIFIC tenant it
//      belongs to, using the same two signals in order of trust:
//        1. tenantId on the reading itself (set at save time). Now that the
//           backend actually persists and returns tenantId on every
//           EBReading, this is the primary, reliable match.
//        2. Legacy fallback: previousReading === this tenant's own
//           joinReading, but ONLY when no other active tenant in the room
//           shares that same joinReading (otherwise we can't tell them
//           apart, so we deliberately return nothing rather than guess).

//      Flats with a shared meter (formFlatId flow below) do NOT use these —
//      a shared-meter reading isn't "owned" by any one tenant, so there's
//      nothing here to match against. */
//   const getRoomActiveTenantsFor = useCallback(
//     (roomId: string | number) =>
//       tenants
//         .filter(
//           t =>
//             String(t.roomId) === String(roomId) &&
//             String(t.status).toLowerCase() === "active"
//         )
//         .sort((a, b) => Number(a.joinReading ?? 0) - Number(b.joinReading ?? 0)),
//     [tenants]
//   );

//   const getRoomReadingsThisMonthFor = useCallback(
//     (roomId: string | number) =>
//       allReadings.filter(
//         r =>
//           r.roomId != null &&
//           String(r.roomId) === String(roomId) &&
//           r.month === selMonth &&
//           r.year === selYear
//       ),
//     [allReadings, selMonth, selYear]
//   );

//   const findTenantOwnReadingThisMonth = useCallback(
//     (tenant: Tenant, roomId: string | number) => {
//       const roomReadingsThisMonthForRoom = getRoomReadingsThisMonthFor(roomId);

//       const byTenantId = roomReadingsThisMonthForRoom.find(
//         r => r.tenantId != null && Number(r.tenantId) === Number(tenant.id)
//       );
//       if (byTenantId) return byTenantId;

//       const join = Number(tenant.joinReading ?? NaN);
//       if (!Number.isFinite(join)) return undefined;

//       const activeTenantsForRoom = getRoomActiveTenantsFor(roomId);
//       const sameJoinSiblingCount = activeTenantsForRoom.filter(
//         t => Number(t.joinReading ?? NaN) === join
//       ).length;
//       if (sameJoinSiblingCount > 1) return undefined; // ambiguous — can't safely infer

//       return roomReadingsThisMonthForRoom.find(
//         r => r.tenantId == null && Number(r.previousReading) === join
//       );
//     },
//     [getRoomReadingsThisMonthFor, getRoomActiveTenantsFor]
//   );

//   const getUnreadActiveTenantsFor = useCallback(
//     (roomId: string | number) =>
//       getRoomActiveTenantsFor(roomId).filter(t => !findTenantOwnReadingThisMonth(t, roomId)),
//     [getRoomActiveTenantsFor, findTenantOwnReadingThisMonth]
//   );

//   // getTenantLastKnownReading — a tenant's own "Previous" for THIS room,
//   // carried forward across months.
//   //
//   // FIX: the multi-tenant shared-meter branches below used to fall back
//   // straight to `tenant.joinReading` the moment `findOwnReadingThisMonth`
//   // came back empty for the CURRENT month. That's correct for a tenant's
//   // very first reading ever, but wrong for every month after that: once
//   // a tenant had a reading saved in, say, March, opening the dialog again
//   // in April found no reading "this month" (April), and reset Previous
//   // all the way back to their original joinReading — silently discarding
//   // every unit already billed in March and re-billing that whole span
//   // again. (The single-active-tenant branch never had this bug, because
//   // it already falls back to getRoomStartingReading, which searches
//   // across all months via allReadings — not just the selected month.)
//   //
//   // This helper mirrors that: it searches ALL of this tenant's own saved
//   // readings for this room (matched by tenantId, not just "this month"),
//   // takes the most recent one (by year then month), and uses ITS
//   // currentReading/acCurrentReading as the new Previous. Only when the
//   // tenant has never had a reading saved for this room at all does it
//   // fall back to their own joinReading/acJoinReading.
//   const getTenantLastKnownReading = useCallback(
//     (tenant: Tenant, roomId: string | number) => {
//       const ownReadings = allReadings.filter(
//         r =>
//           r.roomId != null &&
//           String(r.roomId) === String(roomId) &&
//           r.tenantId != null &&
//           Number(r.tenantId) === Number(tenant.id)
//       );

//       if (ownReadings.length === 0) {
//         return {
//           curr: Number(tenant.joinReading ?? 0),
//           acCurr: Number(tenant.acJoinReading ?? 0),
//         };
//       }

//       const latest = ownReadings.reduce((best, r) => {
//         if (r.year !== best.year) return r.year > best.year ? r : best;
//         return r.month > best.month ? r : best;
//       });

//       return {
//         curr: Number(latest.currentReading ?? tenant.joinReading ?? 0),
//         acCurr: Number(latest.acCurrentReading ?? tenant.acJoinReading ?? 0),
//       };
//     },
//     [allReadings]
//   );

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

//   // Rooms belonging to the flat currently selected in the Add dialog.
//   const roomsInFormFlat = useMemo(() => {
//     if (!formFlatId || formFlatId === "all") return [];
//     return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
//   }, [dialogRooms, formFlatId]);

//   // Tenants currently active in the room selected in the Add dialog
//   // (single-room / standalone mode only).
//   const roomActiveTenants = useMemo(() => {
//     if (!formRoomId) return [];
//     return getRoomActiveTenantsFor(formRoomId);
//   }, [formRoomId, getRoomActiveTenantsFor]);

//   // Readings already saved for the currently-selected room, for the EXACT
//   // month/year being entered in this dialog. Checking out a tenant through
//   // this dialog doesn't flip that tenant to "inactive" — that only happens
//   // on the separate Tenant Check-Out page — so a tenant can still show up
//   // in roomActiveTenants above even after their own checkout reading was
//   // already saved this month.
//   const roomReadingsThisMonth = useMemo(() => {
//     if (!formRoomId) return [];
//     return getRoomReadingsThisMonthFor(formRoomId);
//   }, [formRoomId, getRoomReadingsThisMonthFor]);

//   // A reading saved this month "belongs" to a given tenant when we know
//   // for certain which tenant it was recorded for — see the shared
//   // findTenantOwnReadingThisMonth helper above for the matching rules.
//   const findOwnReadingThisMonth = useCallback(
//     (tenant: Tenant) => findTenantOwnReadingThisMonth(tenant, formRoomId),
//     [findTenantOwnReadingThisMonth, formRoomId]
//   );

//   // Active tenants in this room who do NOT yet have their own reading
//   // recorded for the selected month — i.e. still need a fresh entry.
//   const unreadActiveTenants = useMemo(() => {
//     if (!formRoomId) return [];
//     return getUnreadActiveTenantsFor(formRoomId);
//   }, [formRoomId, getUnreadActiveTenantsFor]);

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

//   /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ──────────────────
//      A flat has ONE physical EB meter shared by every room inside it, so
//      there is exactly one "Previous"/"Current" pair for the whole flat —
//      not one per room. This effect just computes that single shared
//      Previous value (from the flat's own reading history via
//      getFlatStartingReading) plus, separately, each AC room's own AC
//      previous value (AC units are typically separate per-room, even
//      inside a shared-meter flat). */
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
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ─────
//      Each tenant's own reading this month is matched specifically via
//      findOwnReadingThisMonth (tenantId first, joinReading fallback second
//      — see the helper above). Logic:
//        - No active tenants left            → room's own starting reading.
//        - Exactly 1 active tenant           → that tenant's own reading if
//                                               already saved this month
//                                               (continue from their own
//                                               currentReading), else the
//                                               room's starting reading
//                                               (getRoomStartingReading
//                                               already folds in this
//                                               tenant's own joinReading, so
//                                               there's no need to reach
//                                               into tenant.joinReading
//                                               directly here).
//        - 2+ active tenants, exactly 1 of
//          them still unread this month      → auto-fill from that
//                                               tenant's OWN last known
//                                               reading — their most
//                                               recently saved reading for
//                                               this room in ANY earlier
//                                               month if one exists, else
//                                               their own joinReading (see
//                                               getTenantLastKnownReading
//                                               below).
//                                               FIX #1: this used to be
//                                               Math.max(ownJoin,
//                                               getRoomRecordedCeiling(...)),
//                                               which clamped this specific
//                                               tenant's Previous up to the
//                                               highest currentReading
//                                               recorded for the room from
//                                               ANY tenant's row this month.
//                                               But a sibling tenant's own
//                                               checkout row does NOT mean
//                                               "the meter has already
//                                               advanced past this tenant's
//                                               segment" — it's a different
//                                               tenant's own overlapping
//                                               segment. Clamping to it
//                                               silently discarded every
//                                               unit between this tenant's
//                                               real join reading and that
//                                               unrelated ceiling.
//                                               FIX #2: it also used to fall
//                                               straight back to
//                                               tenant.joinReading the
//                                               moment there was no reading
//                                               for the CURRENT month —
//                                               which reset Previous back to
//                                               the tenant's original
//                                               check-in value every single
//                                               month after their first
//                                               reading, instead of
//                                               continuing from wherever
//                                               their last saved reading
//                                               left off. getTenantLastKnownReading
//                                               fixes this by searching
//                                               across ALL months, not just
//                                               the one currently selected.
//        - 2+ active tenants, 0 or 2+ of
//          them still unread this month      → ambiguous, wait for an
//                                               explicit tenant pick. */
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
//         // No own reading yet — use the room's true last-known value,
//         // which already takes this tenant's own joinReading into account
//         // (and can never be lower than it).
//         setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//         setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//       }
//       return;
//     }

//     // Multiple active tenants sharing this meter.
//     if (unreadActiveTenants.length === 1) {
//       // Only one of them still needs an entry this month — unambiguous,
//       // no need to force an explicit pick. Previous = this tenant's own
//       // LAST KNOWN reading (most recent saved reading for this room in
//       // any earlier month), falling back to their own joinReading only
//       // if they've never had a reading saved here before — never a
//       // ceiling borrowed from another tenant's row (see the docstring
//       // above this effect for why that was wrong), and never reset back
//       // to joinReading once a later reading already exists (FIX #2).
//       const only = unreadActiveTenants[0];
//       const { curr, acCurr } = getTenantLastKnownReading(only, formRoomId);
//       setFormPrevReading(String(curr));
//       setFormAcPrev(String(acCurr));
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
//     getTenantLastKnownReading,
//   ]);

//   // Once the admin picks which tenant this checkout reading belongs to
//   // (only shown/needed when roomActiveTenants.length > 1 AND more than
//   // one of them still needs an entry this month), pull "Previous" /
//   // "AC Previous" from THAT tenant's own data — their own saved reading
//   // this month if one exists, else their own LAST KNOWN reading from any
//   // earlier month, else their own joinReading (see
//   // getTenantLastKnownReading above).
//   //
//   // FIX #1: this used to fall back to Math.max(ownJoin,
//   // getRoomRecordedCeiling(formRoomId)) — i.e. it could get bumped up by
//   // whatever the HIGHEST currentReading recorded for the room happened to
//   // be, even if that reading belonged to a completely different tenant's
//   // segment. That's exactly what corrupted 3SHA-1 (joined at 100): once
//   // 3SHA-2/3/4's own rows had been saved up to 150-190, opening this
//   // dialog for 3SHA-1 clamped their Previous up to that unrelated value
//   // instead of their real 100, silently losing every unit in between.
//   // FIX #2: it also used to fall straight back to `t.joinReading` the
//   // moment there was no reading for the CURRENT month, wiping out any
//   // reading that tenant had saved in an EARLIER month and re-billing that
//   // whole earlier span again the next time the dialog opened. The only
//   // thing allowed to move a tenant's Previous off their own last known
//   // value is THEIR OWN prior saved reading (this month via
//   // findOwnReadingThisMonth, or an earlier month via
//   // getTenantLastKnownReading) — never another tenant's row.
//   useEffect(() => {
//     if (!formTenantId) return;
//     const t = roomActiveTenants.find(rt => String(rt.id) === String(formTenantId));
//     if (!t) return;
//     const own = findOwnReadingThisMonth(t);
//     if (own) {
//       setFormPrevReading(String(Number(own.currentReading ?? 0)));
//       setFormAcPrev(String(Number(own.acCurrentReading ?? 0)));
//     } else {
//       const { curr, acCurr } = getTenantLastKnownReading(t, formRoomId);
//       setFormPrevReading(String(curr));
//       setFormAcPrev(String(acCurr));
//     }
//   }, [
//     formTenantId,
//     roomActiveTenants,
//     findOwnReadingThisMonth,
//     getTenantLastKnownReading,
//     formRoomId,
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
//         // ── SHARED FLAT METER ──
//         // One physical meter for the whole flat: every room in the flat
//         // gets saved with the SAME previousReading/currentReading for
//         // this month. There is no per-tenant attribution here — the
//         // proportional split across tenants happens later, at checkout
//         // time, against this one shared reading (see CheckoutPage).
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
//           ebRate: getRateForRoom(formRoomId), isCheckout: false,
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
//         // NOTE: bulk Excel upload lets an admin type a different
//         // Previous/Current per room row-by-row. If this room belongs to a
//         // flat with a shared meter, make sure every row for that flat's
//         // rooms carries the SAME Previous/Current — the sheet itself
//         // doesn't enforce that, so a mismatched bulk upload can
//         // reintroduce the same drift this fix addresses for the on-screen
//         // Add EB Reading dialog.
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           // Use the room's own branch (unitId) when uploading via Excel,
//           // since there's no per-row branch selector for bulk upload.
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
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
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

//         .eb-chart-container { padding: 20px; }

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
//                         {/* ── SHARED FLAT METER ──
//                             One physical EB meter for the whole flat — one
//                             Previous/Current pair, applied to every room
//                             listed below once saved. */}
//                         <div className="eb-flat-room-card">
//                           <div className="eb-flat-room-title">
//                             Shared Flat Meter
//                             {roomsInFormFlat.length > 0 && (
//                               <span className="font-normal text-muted-foreground">
//                                 {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
//                               </span>
//                             )}
//                           </div>
//                           <div className="grid grid-cols-2 gap-4">
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                               <Input className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                               <Input
//                                 className="rounded-lg bg-white"
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
//                         {flatAcRows.map(row => (
//                           <div key={row.roomId} className="eb-flat-room-card">
//                             <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
//                             <div className="grid grid-cols-2 gap-4">
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                 <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                 <Input
//                                   className="rounded-lg bg-white"
//                                   placeholder="Enter AC current reading"
//                                   value={row.acCurrentReading}
//                                   onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
//                                 />
//                               </div>
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

//                         {/* Only appears when this STANDALONE room currently
//                             has more than one active tenant sharing the
//                             same meter AND more than one of them still
//                             needs an entry this month (once exactly one is
//                             left unread, it's auto-filled — see
//                             unreadActiveTenants above — so no tenant pick
//                             is needed). Flats with a shared meter never
//                             need this — see the Shared Flat Meter card
//                             above instead. */}
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
//                                 roomActiveTenants.length > 0 &&
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
//                         {(!formFlatId || formFlatId === "all") ? (
//                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         ) : (
//                           // One meter, one rate — applies to the whole flat.
//                           <Input className="rounded-lg" type="number" value={manualRate}
//                             onChange={e => setManualRate(Number(e.target.value))}
//                             placeholder="Enter unit rate for this flat's shared meter" />
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

//       {/* ── Bill Dialog */}
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

//       {/* ── Upload Dialog */}
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
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [roomSearch,      setRoomSearch]      = useState("");
//   const [flatSearch,      setFlatSearch]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");

//   // ── FLAT MODE (shared meter) ────────────────────────────────────────
//   // A flat's electricity meter is ONE physical meter shared by every room
//   // in that flat — it is NOT one meter per room. So there is exactly one
//   // "Previous" / "Current" pair for the whole flat, and every room in the
//   // flat gets saved with the SAME previousReading/currentReading for a
//   // given month. (Previously each room tracked its own previous/current
//   // independently, which let rooms in the same flat silently drift to
//   // different numbers — e.g. EX-1 stuck on an old tenant's reading while
//   // EX-2/EX-3 advanced further — even though physically there's only one
//   // meter to read.)
//   const [flatSharedPrev, setFlatSharedPrev] = useState("");
//   const [flatSharedCurr, setFlatSharedCurr] = useState("");
//   // AC units, unlike the main EB meter, are typically separate per-room
//   // wall units even inside a shared-meter flat, so those stay per-room.
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

//   /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
//   const handleFlatAcRowChange = (roomId: number, value: string) => {
//     setFlatAcRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   // getRoomStartingACReading — a room's own AC meter "Previous". Same
//   // shared-meter shape as getRoomStartingReading below: HIGHEST of the
//   // highest acCurrentReading ever recorded for the room and the highest
//   // acJoinReading among tenants CURRENTLY ACTIVE in the room, once any
//   // reading history exists; otherwise the LOWEST active tenant's
//   // acJoinReading, so the very first AC reading still covers whoever
//   // moved in first.
//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const roomReadings = allReadings.filter(
//         r => r.roomId != null && String(r.roomId) === String(roomId)
//       );
//       const highestRecorded = roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.acCurrentReading ?? 0)))
//         : null;

//       const activeTenants = tenants.filter(
//         t => String(t.roomId) === String(roomId) && String(t.status).toLowerCase() === "active"
//       );
//       const highestActiveJoin = activeTenants.length > 0
//         ? Math.max(...activeTenants.map(t => Number(t.acJoinReading ?? 0)))
//         : null;

//       if (highestRecorded != null) {
//         return Math.max(highestRecorded, highestActiveJoin ?? 0);
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants]
//   );

//   // getRoomStartingReading — a room's main EB meter "Previous".
//   //
//   // A standalone room is treated as ONE continuously-advancing shared
//   // meter, exactly like a flat's shared meter (see getFlatStartingReading
//   // below) — regardless of how many tenants are currently active in it.
//   // There is no per-tenant "Previous" here: whatever Current is saved
//   // this time becomes next time's Previous, full stop. Individual tenant
//   // checkouts are settled separately on the Tenant Check-Out page (which
//   // does its own proportional split using each tenant's own join/
//   // checkout readings) — they are NOT selected or entered through this
//   // Add EB Reading dialog.
//   //
//   // "Previous" is the HIGHEST of:
//   //   - the highest currentReading ever recorded for the room itself
//   //   - the highest currentReading ever recorded for the room's flat
//   //     (covers rooms that used to be tracked via the flat's meter)
//   //   - the highest joinReading among tenants CURRENTLY ACTIVE in the
//   //     room — a tenant's own check-in snapshot is a real physical meter
//   //     reading and can never be lower than the true last-known value,
//   //     so it must be considered even once a reading already exists.
//   // Only when there is NO reading history at all do we fall back to the
//   // LOWEST active tenant's joinReading (or, failing that, the lowest
//   // joinReading among any tenant ever assigned to the room), so the very
//   // first reading still covers whoever moved in first — e.g. with T1=100,
//   // T2=150, T3=160, T4=190 all active and no readings yet, Previous = 100.
//   // After that first Current is saved (say 200), the NEXT time this room
//   // is opened Previous = 200, then 280, then 350, and so on — continuing
//   // forward regardless of any tenant checking out in between.
//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));

//       const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));
//       const highestRoomRecorded = roomReadings.length > 0
//         ? Math.max(...roomReadings.map(r => Number(r.currentReading ?? 0)))
//         : null;

//       let highestFlatRecorded: number | null = null;
//       if (room?.flatId) {
//         const flatReadings = allReadings.filter(r => String(r.flatId) === String(room.flatId));
//         if (flatReadings.length > 0) {
//           highestFlatRecorded = Math.max(...flatReadings.map(r => Number(r.currentReading ?? 0)));
//         }
//       }

//       const recorded = [highestRoomRecorded, highestFlatRecorded].filter(
//         (v): v is number => v != null
//       );

//       // Active tenants may have joined (a real physical meter snapshot at
//       // check-in) AFTER the last saved reading — that snapshot can never be
//       // lower than the true last-known value, so it has to be considered
//       // even once a reading already exists for the room.
//       const activeTenants = tenants.filter(
//         t => String(t.roomId) === String(roomId) && String(t.status).toLowerCase() === "active"
//       );
//       const highestActiveJoin = activeTenants.length > 0
//         ? Math.max(...activeTenants.map(t => Number(t.joinReading ?? 0)))
//         : null;

//       if (recorded.length > 0) {
//         return Math.max(...recorded, highestActiveJoin ?? 0);
//       }

//       // No reading history at all — fall back to the LOWEST active tenant's
//       // joinReading, so the first reading still covers whoever moved in first.
//       if (activeTenants.length > 0) {
//         return Math.min(...activeTenants.map(t => Number(t.joinReading ?? 0)));
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants, rooms]
//   );

//   // The flat's own shared-meter "Previous" value.
//   //
//   // FIX: this used to look ONLY at saved EBReading rows for the flat, and
//   // fell back to tenants' own join readings solely when the flat had NO
//   // reading history at all. That breaks as soon as a flat already has at
//   // least one saved reading (e.g. an earlier tenant's checkout) AND a
//   // brand-new tenant then checks into another room in the SAME flat with
//   // a higher "Current EB Reading" captured at check-in (Tenants page) —
//   // that check-in value is a real physical meter snapshot taken AFTER
//   // the last saved reading, so the flat's true last-known value can never
//   // be lower than it. Ignoring it left "Previous" stuck on the older,
//   // lower, already-superseded number for every room/tenant in the flat.
//   //
//   // Now:
//   //   - If the flat has at least one saved reading, Previous is the
//   //     HIGHER of (a) the highest currentReading ever saved for the flat,
//   //     and (b) the highest joinReading among tenants CURRENTLY ACTIVE
//   //     anywhere in the flat — a more-recent check-in's own snapshot can
//   //     only be at or after whatever was last recorded.
//   //   - If the flat has NEVER had a reading saved, Previous falls back to
//   //     the LOWEST active tenant's joinReading instead (not the highest),
//   //     so the very first flat-wide reading still covers consumption all
//   //     the way back to whoever moved in first — otherwise that stretch
//   //     would never get billed to anyone.
//   const getFlatStartingReading = useCallback(
//     (flatId: string | number) => {
//       const flatReadings = allReadings.filter(
//         r => r.flatId != null && String(r.flatId) === String(flatId)
//       );
//       const roomIdsInFlat = new Set(
//         rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
//       );
//       const flatActiveTenants = tenants.filter(
//         t => roomIdsInFlat.has(t.roomId) && String(t.status).toLowerCase() === "active"
//       );

//       if (flatReadings.length > 0) {
//         const highestRecorded = Math.max(...flatReadings.map(r => Number(r.currentReading ?? 0)));
//         const highestActiveJoin = flatActiveTenants.length > 0
//           ? Math.max(...flatActiveTenants.map(t => Number(t.joinReading ?? 0)))
//           : 0;
//         return Math.max(highestRecorded, highestActiveJoin);
//       }

//       if (flatActiveTenants.length > 0) {
//         return Math.min(...flatActiveTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, rooms, tenants]
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

//   // Rooms belonging to the flat currently selected in the Add dialog.
//   const roomsInFormFlat = useMemo(() => {
//     if (!formFlatId || formFlatId === "all") return [];
//     return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
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

//   /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ──────────────────
//      A flat has ONE physical EB meter shared by every room inside it, so
//      there is exactly one "Previous"/"Current" pair for the whole flat —
//      not one per room. This effect just computes that single shared
//      Previous value (from the flat's own reading history via
//      getFlatStartingReading) plus, separately, each AC room's own AC
//      previous value (AC units are typically separate per-room, even
//      inside a shared-meter flat). */
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
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ─────
//      A standalone room is ONE continuously-advancing shared meter, exactly
//      like the flat's shared meter above — no per-tenant checkout selection
//      happens in this dialog at all, regardless of how many tenants are
//      currently active in the room. Previous always comes straight from
//      getRoomStartingReading/getRoomStartingACReading, which already fold
//      in every active tenant's own join reading as a floor and the room's
//      (or its flat's) last saved reading as the running value. Whatever
//      Current gets saved here becomes next time's Previous — individual
//      tenant checkouts (e.g. a mid-month checkout reading for one
//      roommate) are entered on the Tenant Check-Out page instead, which
//      does its own proportional split using each tenant's own join/
//      checkout readings. */
//   useEffect(() => {
//     if (!formRoomId) return;
//     setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//     setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//   }, [formRoomId, allReadings, getRoomStartingReading, getRoomStartingACReading]);

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
//         // ── SHARED FLAT METER ──
//         // One physical meter for the whole flat: every room in the flat
//         // gets saved with the SAME previousReading/currentReading for
//         // this month. There is no per-tenant attribution here — the
//         // proportional split across tenants happens later, at checkout
//         // time, against this one shared reading (see CheckoutPage).
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
//         // Same shape as the flat branch above: one previousReading/
//         // currentReading pair for the room's own meter, saved with no
//         // tenantId — regardless of how many tenants are currently active
//         // in the room. Per-tenant checkout amounts are worked out
//         // separately by the backend's calculateTenantWiseBillByRoom
//         // (using each tenant's own join/checkout readings), not by
//         // anything selected in this dialog.
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
//         // NOTE: bulk Excel upload lets an admin type a different
//         // Previous/Current per room row-by-row. If this room belongs to a
//         // flat with a shared meter, make sure every row for that flat's
//         // rooms carries the SAME Previous/Current — the sheet itself
//         // doesn't enforce that, so a mismatched bulk upload can
//         // reintroduce the same drift this fix addresses for the on-screen
//         // Add EB Reading dialog.
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           // Use the room's own branch (unitId) when uploading via Excel,
//           // since there's no per-row branch selector for bulk upload.
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
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
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

//         .eb-chart-container { padding: 20px; }

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
//                         {/* ── SHARED FLAT METER ──
//                             One physical EB meter for the whole flat — one
//                             Previous/Current pair, applied to every room
//                             listed below once saved. */}
//                         <div className="eb-flat-room-card">
//                           <div className="eb-flat-room-title">
//                             Shared Flat Meter
//                             {roomsInFormFlat.length > 0 && (
//                               <span className="font-normal text-muted-foreground">
//                                 {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
//                               </span>
//                             )}
//                           </div>
//                           <div className="grid grid-cols-2 gap-4">
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                               <Input className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                               <Input
//                                 className="rounded-lg bg-white"
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
//                         {flatAcRows.map(row => (
//                           <div key={row.roomId} className="eb-flat-room-card">
//                             <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
//                             <div className="grid grid-cols-2 gap-4">
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                 <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                 <Input
//                                   className="rounded-lg bg-white"
//                                   placeholder="Enter AC current reading"
//                                   value={row.acCurrentReading}
//                                   onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
//                                 />
//                               </div>
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

//                         {/* Previous + Current side by side. Previous is always
//                             the room's own running shared-meter value (see
//                             getRoomStartingReading) — no tenant selection is
//                             ever needed here, regardless of how many tenants
//                             are active in the room. */}
//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                             <Input
//                               className="rounded-lg"
//                               placeholder="Previous"
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
//                         {(!formFlatId || formFlatId === "all") ? (
//                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         ) : (
//                           // One meter, one rate — applies to the whole flat.
//                           <Input className="rounded-lg" type="number" value={manualRate}
//                             onChange={e => setManualRate(Number(e.target.value))}
//                             placeholder="Enter unit rate for this flat's shared meter" />
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

//       {/* ── Bill Dialog */}
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

//       {/* ── Upload Dialog */}
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
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev,      setFormAcPrev]      = useState("");
//   const [formAcCurr,      setFormAcCurr]      = useState("");
//   const [roomSearch,      setRoomSearch]      = useState("");
//   const [flatSearch,      setFlatSearch]      = useState("");
//   const [billRoom,        setBillRoom]        = useState("");
//   const [formBranchId, setFormBranchId] = useState("");

//   // ── FLAT MODE (shared meter) ────────────────────────────────────────
//   // A flat's electricity meter is ONE physical meter shared by every room
//   // in that flat — it is NOT one meter per room. So there is exactly one
//   // "Previous" / "Current" pair for the whole flat, and every room in the
//   // flat gets saved with the SAME previousReading/currentReading for a
//   // given month. (Previously each room tracked its own previous/current
//   // independently, which let rooms in the same flat silently drift to
//   // different numbers — e.g. EX-1 stuck on an old tenant's reading while
//   // EX-2/EX-3 advanced further — even though physically there's only one
//   // meter to read.)
//   const [flatSharedPrev, setFlatSharedPrev] = useState("");
//   const [flatSharedCurr, setFlatSharedCurr] = useState("");
//   // AC units, unlike the main EB meter, are typically separate per-room
//   // wall units even inside a shared-meter flat, so those stay per-room.
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

//   /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
//   const handleFlatAcRowChange = (roomId: number, value: string) => {
//     setFlatAcRows(prev =>
//       prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
//     );
//   };

//   /* ─── STARTING READINGS ─────────────────────────────────── */
//   // FIX (Previous/Current reading flow): all three "starting reading"
//   // helpers below now follow one rule, matching the required EB Reading
//   // flow exactly:
//   //
//   //   1. The Previous Reading for a room/flat must come ONLY from the
//   //      latest GENUINE EB Reading Page entry ever saved for it — i.e.
//   //      a row saved with isCheckout === false via this page's own "Add
//   //      EB Reading" dialog/Excel upload. "Latest" means the most
//   //      recently SAVED row (highest id), so the sequence
//   //      100 -> 150 -> 180 -> 200 stays strictly in save order.
//   //   2. A row written by a tenant checkout/check-in (isCheckout ===
//   //      true, or any tenant-scoped reading) must NEVER be considered —
//   //      intermediate tenant checkouts/check-ins must not move the
//   //      room/flat meter's Previous/Current sequence at all. Likewise, a
//   //      currently-active tenant's own joinReading is no longer used to
//   //      "bump up" Previous once real reading history exists — only a
//   //      genuine EB Reading Page entry can do that.
//   //   3. Only when NO genuine EB Reading Page entry exists yet at all do
//   //      we fall back to the room/flat's minimum/initial meter reading:
//   //      the earliest joinReading among every tenant who has ever lived
//   //      there (active or already checked out), so the very first EB
//   //      reading still covers whoever moved in first — this is exactly
//   //      what makes an "Initial Checkout" tenant's own Join Reading the
//   //      Previous Reading the very first time an EB Reading is created
//   //      for that room/flat.
//   const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const genuineRoomReadings = allReadings.filter(
//         r => r.roomId != null && String(r.roomId) === String(roomId) && r.isCheckout !== true
//       );

//       if (genuineRoomReadings.length > 0) {
//         const latest = genuineRoomReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         return Number(latest.acCurrentReading ?? 0);
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants]
//   );

//   // getRoomStartingReading — a room's main EB meter "Previous".
//   //
//   // A standalone room is treated as ONE continuously-advancing shared
//   // meter, exactly like a flat's shared meter (see getFlatStartingReading
//   // below) — regardless of how many tenants are currently active in it,
//   // and regardless of any tenant checking in or out of it in between.
//   // There is no per-tenant "Previous" here: whatever Current is saved
//   // this time becomes next time's Previous, full stop. Individual tenant
//   // checkouts are settled separately on the Tenant Check-Out page (which
//   // does its own proportional split using each tenant's own join/
//   // checkout readings, and writes its own EB reading rows tagged
//   // isCheckout: true purely as a billing record) — they are NOT selected
//   // or entered through this Add EB Reading dialog, and must NEVER affect
//   // what this dialog treats as Previous.
//   const getRoomStartingReading = useCallback(
//     (roomId: string | number) => {
//       const room = rooms.find(r => String(r.id) === String(roomId));

//       // Only genuine (non-checkout) EB Reading Page rows for the room
//       // itself, or for its flat (a room can have been tracked via the
//       // flat's shared meter instead), feed the running sequence.
//       const genuineReadings = allReadings.filter(r => {
//         if (r.isCheckout === true) return false;
//         const matchesRoom = String(r.roomId) === String(roomId);
//         const matchesFlat =
//           room?.flatId != null && r.flatId != null && String(r.flatId) === String(room.flatId);
//         return matchesRoom || matchesFlat;
//       });

//       if (genuineReadings.length > 0) {
//         // "Latest valid EB reading" = the most recently SAVED genuine
//         // reading (highest id) — its Current becomes this room's next
//         // Previous, e.g. 100 -> 150, then 150 -> 180, then 180 -> 200.
//         const latest = genuineReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         return Number(latest.currentReading ?? 0);
//       }

//       // No genuine EB Reading Page entry exists yet for this room (or its
//       // flat) — fall back to the room/flat's minimum/initial meter
//       // reading: the earliest joinReading among every tenant who has
//       // ever lived in the room (active or already checked out), so the
//       // very first EB reading still covers whoever moved in first.
//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       const flatTenants = room?.flatId != null
//         ? tenants.filter(t => {
//             const tRoom = rooms.find(r => Number(r.id) === Number(t.roomId));
//             return tRoom?.flatId != null && String(tRoom.flatId) === String(room.flatId);
//           })
//         : [];
//       const baselineTenants = flatTenants.length > 0 ? flatTenants : roomTenants;

//       if (baselineTenants.length > 0) {
//         return Math.min(...baselineTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, tenants, rooms]
//   );

//   // The flat's own shared-meter "Previous" value — same rule as
//   // getRoomStartingReading above, keyed on flatId instead of roomId.
//   const getFlatStartingReading = useCallback(
//     (flatId: string | number) => {
//       const genuineFlatReadings = allReadings.filter(
//         r => r.isCheckout !== true && r.flatId != null && String(r.flatId) === String(flatId)
//       );

//       if (genuineFlatReadings.length > 0) {
//         const latest = genuineFlatReadings.reduce((a, b) =>
//           Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
//         );
//         return Number(latest.currentReading ?? 0);
//       }

//       // No genuine flat-level reading has ever been saved — anchor to
//       // the earliest join reading among everyone who has ever lived in
//       // this flat (active or already checked out), so the very first
//       // flat-wide reading still covers whoever moved in first.
//       const roomIdsInFlat = new Set(
//         rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
//       );
//       const flatAllTenants = tenants.filter(t => roomIdsInFlat.has(t.roomId));
//       if (flatAllTenants.length > 0) {
//         return Math.min(...flatAllTenants.map(t => Number(t.joinReading ?? 0)));
//       }
//       return 0;
//     },
//     [allReadings, rooms, tenants]
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

//   // Rooms belonging to the flat currently selected in the Add dialog.
//   const roomsInFormFlat = useMemo(() => {
//     if (!formFlatId || formFlatId === "all") return [];
//     return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
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

//   /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ──────────────────
//      A flat has ONE physical EB meter shared by every room inside it, so
//      there is exactly one "Previous"/"Current" pair for the whole flat —
//      not one per room. This effect just computes that single shared
//      Previous value (from the flat's own reading history via
//      getFlatStartingReading) plus, separately, each AC room's own AC
//      previous value (AC units are typically separate per-room, even
//      inside a shared-meter flat). */
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
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

//   /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ─────
//      A standalone room is ONE continuously-advancing shared meter, exactly
//      like the flat's shared meter above — no per-tenant checkout selection
//      happens in this dialog at all, regardless of how many tenants are
//      currently active in the room. Previous always comes straight from
//      getRoomStartingReading/getRoomStartingACReading, which already fold
//      in every active tenant's own join reading as a floor and the room's
//      (or its flat's) last saved reading as the running value. Whatever
//      Current gets saved here becomes next time's Previous — individual
//      tenant checkouts (e.g. a mid-month checkout reading for one
//      roommate) are entered on the Tenant Check-Out page instead, which
//      does its own proportional split using each tenant's own join/
//      checkout readings. */
//   useEffect(() => {
//     if (!formRoomId) return;
//     setFormPrevReading(String(getRoomStartingReading(formRoomId)));
//     setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
//   }, [formRoomId, allReadings, getRoomStartingReading, getRoomStartingACReading]);

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
//         // ── SHARED FLAT METER ──
//         // One physical meter for the whole flat: every room in the flat
//         // gets saved with the SAME previousReading/currentReading for
//         // this month. There is no per-tenant attribution here — the
//         // proportional split across tenants happens later, at checkout
//         // time, against this one shared reading (see CheckoutPage).
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
//         // Same shape as the flat branch above: one previousReading/
//         // currentReading pair for the room's own meter, saved with no
//         // tenantId — regardless of how many tenants are currently active
//         // in the room. Per-tenant checkout amounts are worked out
//         // separately by the backend's calculateTenantWiseBillByRoom
//         // (using each tenant's own join/checkout readings), not by
//         // anything selected in this dialog.
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
//         // NOTE: bulk Excel upload lets an admin type a different
//         // Previous/Current per room row-by-row. If this room belongs to a
//         // flat with a shared meter, make sure every row for that flat's
//         // rooms carries the SAME Previous/Current — the sheet itself
//         // doesn't enforce that, so a mismatched bulk upload can
//         // reintroduce the same drift this fix addresses for the on-screen
//         // Add EB Reading dialog.
//         await addEBReading({
//           roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
//           // Use the room's own branch (unitId) when uploading via Excel,
//           // since there's no per-row branch selector for bulk upload.
//           branchId: room.unitId != null ? Number(room.unitId) : undefined,
//           month: selMonth, year: selYear,
//           previousReading: prev, currentReading: curr,
//           acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
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
//         .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
//         .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
//         .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

//         .eb-pagination-row { flex-wrap: wrap; }
//         .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
//         .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

//         .eb-chart-container { padding: 20px; }

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
//                         {/* ── SHARED FLAT METER ──
//                             One physical EB meter for the whole flat — one
//                             Previous/Current pair, applied to every room
//                             listed below once saved. */}
//                         <div className="eb-flat-room-card">
//                           <div className="eb-flat-room-title">
//                             Shared Flat Meter
//                             {roomsInFormFlat.length > 0 && (
//                               <span className="font-normal text-muted-foreground">
//                                 {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
//                               </span>
//                             )}
//                           </div>
//                           <div className="grid grid-cols-2 gap-4">
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                               <Input className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
//                             </div>
//                             <div className="space-y-1.5">
//                               <Label className="text-xs font-medium text-muted-foreground">Current</Label>
//                               <Input
//                                 className="rounded-lg bg-white"
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
//                         {flatAcRows.map(row => (
//                           <div key={row.roomId} className="eb-flat-room-card">
//                             <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
//                             <div className="grid grid-cols-2 gap-4">
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Previous</Label>
//                                 <Input className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <Label className="text-xs font-medium text-muted-foreground">AC Current</Label>
//                                 <Input
//                                   className="rounded-lg bg-white"
//                                   placeholder="Enter AC current reading"
//                                   value={row.acCurrentReading}
//                                   onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
//                                 />
//                               </div>
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

//                         {/* Previous + Current side by side. Previous is always
//                             the room's own running shared-meter value (see
//                             getRoomStartingReading) — no tenant selection is
//                             ever needed here, regardless of how many tenants
//                             are active in the room. */}
//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="space-y-1.5">
//                             <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
//                             <Input
//                               className="rounded-lg"
//                               placeholder="Previous"
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
//                         {(!formFlatId || formFlatId === "all") ? (
//                           <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
//                             onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
//                             placeholder="Enter rate for this room" />
//                         ) : (
//                           // One meter, one rate — applies to the whole flat.
//                           <Input className="rounded-lg" type="number" value={manualRate}
//                             onChange={e => setManualRate(Number(e.target.value))}
//                             placeholder="Enter unit rate for this flat's shared meter" />
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

//       {/* ── Bill Dialog */}
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

//       {/* ── Upload Dialog */}
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

/* ─── DAILY-STAY TENANTS ARE NOT PART OF THE MONTHLY EB CYCLE ──────────
   A DAILY-stay tenant pays for electricity ONCE, as a flat advance
   `ebAmount` collected at check-in and folded into their totalAmount
   (see TenantServiceImpl.computeTotalAmount). Two consequences matter
   for this page:

     1. Checkout writes ONE informational row for them —
        TenantServiceImpl.checkoutTenant saves an EBReading stamped with
        the tenant and isCheckout = true. It is a RECORD, not a raw
        meter delta: it carries the tenant's REAL proportional share
        (units/rate/amount) so this screen can show exactly what they
        used, what they'd already paid in advance, and whether they
        still owe or are due a refund.

     2. Their joinReading / acJoinReading ARE still captured at check-in,
        but only as REFERENCE meter snapshots. They must never be used as
        a billing anchor. Feeding them into the "Previous reading"
        fallbacks below dragged the baseline to the wrong number and made
        the first genuine EB reading for that room/flat compute a wrong
        unit count for everyone else sharing the meter.

   Every place this file reads joinReading/acJoinReading therefore filters
   to MONTHLY tenants first. tenantStay defaults to MONTHLY server-side,
   but legacy rows can be null, so null is treated as MONTHLY. */
const isMonthlyTenant = (t: any) => (t?.tenantStay ?? "MONTHLY") !== "DAILY";

/* A row is informational IFF it carries a tenantId AND isCheckout === true.
   No other write path in this codebase ever attaches a tenantId to a plain
   room-level EBReading row:
     - routine "Add EB Reading" / Excel bulk upload: no tenantId, ever.
     - a MONTHLY tenant's own checkout: writes a room/flat-WIDE entry with
       no tenantId (see TenantServiceImpl.checkoutTenant, non-DAILY branch).
     - only the DAILY-stay settlement branch attaches both a tenantId and
       isCheckout=true to a room-level row.
   This used to also require the tenant to resolve locally (tenantById)
   AND, as a fallback, required ebRate === 0. Neither is safe anymore now
   that informational rows store a REAL nonzero rate/units for display —
   the ebRate===0 fallback broke as soon as we stopped forcing rate to 0,
   and depending on tenantById meant a not-yet-loaded or stale tenant list
   could misclassify a genuine daily settlement row as a normal reading,
   sending it into the room-bill matching path where it either shows as a
   bogus "-, raw-delta-units, ₹0" row or gets silently absorbed by the
   per-room de-dup logic once a genuine monthly reading also exists. */
const isInformationalReading = (reading: any) =>
  reading?.tenantId != null && reading?.isCheckout === true;

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
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcPrev,      setFormAcPrev]      = useState("");
  const [formAcCurr,      setFormAcCurr]      = useState("");
  const [roomSearch,      setRoomSearch]      = useState("");
  const [flatSearch,      setFlatSearch]      = useState("");
  const [billRoom,        setBillRoom]        = useState("");
  const [formBranchId, setFormBranchId] = useState("");

  // ── FLAT MODE (shared meter) ────────────────────────────────────────
  // A flat's electricity meter is ONE physical meter shared by every room
  // in that flat — it is NOT one meter per room. So there is exactly one
  // "Previous" / "Current" pair for the whole flat, and every room in the
  // flat gets saved with the SAME previousReading/currentReading for a
  // given month. (Previously each room tracked its own previous/current
  // independently, which let rooms in the same flat silently drift to
  // different numbers — e.g. EX-1 stuck on an old tenant's reading while
  // EX-2/EX-3 advanced further — even though physically there's only one
  // meter to read.)
  const [flatSharedPrev, setFlatSharedPrev] = useState("");
  const [flatSharedCurr, setFlatSharedCurr] = useState("");
  // AC units, unlike the main EB meter, are typically separate per-room
  // wall units even inside a shared-meter flat, so those stay per-room.
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
     Single source of truth for "tenants whose meter readings count".
     Everything that anchors a Previous reading derives from this list,
     never from `tenants` directly. */
  const monthlyTenants = useMemo(
    () => tenants.filter(isMonthlyTenant),
    [tenants]
  );

  // Lookup used to resolve an informational row's tenant (name, advance
  // paid, etc.) once it has already been classified via isInformationalReading.
  const tenantById = useMemo(() => {
    const map = new Map<number, any>();
    tenants.forEach(t => map.set(Number(t.id), t));
    return map;
  }, [tenants]);

  // Mirrors CheckoutPage.tsx's tenantLastBilledReading — the highest
  // currentReading ever saved for each tenant specifically. Needed so the
  // recomputed segment math below can tell that a roommate was already
  // "closed out" of a segment, exactly like CheckoutPage does.
  const tenantLastBilledReadingAll = useMemo(() => {
    const map = new Map<number, number>();
    allReadings.forEach((r: any) => {
      if (r.tenantId == null) return;
      const val = Number(r.currentReading ?? 0);
      const key = Number(r.tenantId);
      const prevMax = map.get(key);
      if (prevMax == null || val > prevMax) map.set(key, val);
    });
    return map;
  }, [allReadings]);

  // Recomputes a checked-out DAILY tenant's true proportional share of a
  // shared meter window (previousReading -> currentReading) — the SAME
  // segment math CheckoutPage.tsx used at checkout time. This lets this
  // screen display the tenant's real units/amount even when the backend
  // hasn't (yet) persisted the derived unitsConsumed/ebAmount on their
  // informational row: everything needed (the row's own prev/curr
  // readings, its ebRate, and the room/flat's tenant roster) is already
  // available here.
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

  /* ─── FLAT AC ROW CHANGE ─────────────────────────────────── */
  const handleFlatAcRowChange = (roomId: number, value: string) => {
    setFlatAcRows(prev =>
      prev.map(row => (row.roomId === roomId ? { ...row, acCurrentReading: value } : row))
    );
  };

  /* ─── STARTING READINGS ─────────────────────────────────── */
  // All three "starting reading" helpers below follow one rule, matching
  // the required EB Reading flow exactly:
  //
  //   1. The Previous Reading for a room/flat must come ONLY from the
  //      latest GENUINE EB Reading Page entry ever saved for it — i.e.
  //      a row saved with isCheckout === false via this page's own "Add
  //      EB Reading" dialog/Excel upload. "Latest" means the most
  //      recently SAVED row (highest id), so the sequence
  //      100 -> 150 -> 180 -> 200 stays strictly in save order.
  //   2. A row written by a tenant checkout/check-in (isCheckout ===
  //      true, or any tenant-scoped reading) must NEVER be considered —
  //      intermediate tenant checkouts/check-ins must not move the
  //      room/flat meter's Previous/Current sequence at all.
  //   3. Only when NO genuine EB Reading Page entry exists yet at all do
  //      we fall back to the room/flat's minimum/initial meter reading:
  //      the earliest joinReading among every MONTHLY tenant who has ever
  //      lived there (active or already checked out), so the very first
  //      EB reading still covers whoever moved in first.
  //   4. DAILY-stay tenants are excluded from that fallback entirely —
  //      their joinReading is a reference snapshot, not a billing anchor.
  const getRoomStartingACReading = useCallback(
  (roomId: string | number) => {
    const genuineRoomReadings = allReadings.filter(
      r => r.roomId != null && String(r.roomId) === String(roomId) && r.isCheckout !== true
    );

    // NEW: a checkout row's AC reading (informational or not) is still a
    // real physical AC-meter snapshot. It must act as a floor so the
    // next genuine reading can't start below units already accounted for
    // by a checkout — this mirrors the main-meter fix below.
    const anyAcReadingsForRoom = allReadings.filter(
      r => r.roomId != null && String(r.roomId) === String(roomId)
    );
    const checkoutAcFloor = anyAcReadingsForRoom.length > 0
      ? Math.max(...anyAcReadingsForRoom.map(r => Number(r.acCurrentReading ?? 0)))
      : 0;

    if (genuineRoomReadings.length > 0) {
      const latest = genuineRoomReadings.reduce((a, b) =>
        Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
      );
      return Math.max(Number(latest.acCurrentReading ?? 0), checkoutAcFloor);
    }

    const roomTenants = monthlyTenants.filter(t => String(t.roomId) === String(roomId));
    const joinFloor = roomTenants.length > 0
      ? Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)))
      : 0;

    return Math.max(joinFloor, checkoutAcFloor);
  },
  [allReadings, monthlyTenants]
);

// getRoomStartingReading — a room's main EB meter "Previous".
//
// FIX (bug: double-billing after a checkout): this used to derive
// Previous ONLY from rows with isCheckout !== true, on the theory that a
// checkout row is a per-tenant proportional split and shouldn't move the
// room's running baseline. That was true for the SPLIT itself, but wrong
// for the room's own physical meter: whatever currentReading a checkout
// row recorded (a DAILY tenant's settlement row, or a MONTHLY tenant's
// own checkout reading) is a real, higher meter value the physical meter
// has already reached. Excluding it entirely let this dialog default
// Previous back to a stale, lower number (e.g. 100) even after a
// checkout had genuinely advanced the meter to 200 — so the next Add EB
// Reading re-billed the 100→200 span to whoever happened to still be in
// the room, double-charging units someone already settled.
//
// The fix: keep genuine (non-checkout) rows as the primary source of
// Previous (unchanged), but ALSO compute a floor from every reading
// (checkout or not) recorded for this room/flat, and never return less
// than that floor. A meter reading can't go backward regardless of who
// or what wrote it.
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

    if (genuineReadings.length > 0) {
      const latest = genuineReadings.reduce((a, b) =>
        Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
      );
      return Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
    }

    // No genuine EB Reading Page entry exists yet for this room (or its
    // flat) — fall back to the room/flat's minimum/initial meter
    // reading: the earliest joinReading among every MONTHLY tenant who
    // has ever lived in the room (active or already checked out), so the
    // very first EB reading still covers whoever moved in first. Still
    // never allowed to sit below a real checkout's currentReading.
    const roomTenants = monthlyTenants.filter(t => String(t.roomId) === String(roomId));
    const flatTenants = room?.flatId != null
      ? monthlyTenants.filter(t => {
          const tRoom = rooms.find(r => Number(r.id) === Number(t.roomId));
          return tRoom?.flatId != null && String(tRoom.flatId) === String(room.flatId);
        })
      : [];
    const baselineTenants = flatTenants.length > 0 ? flatTenants : roomTenants;

    const joinFloor = baselineTenants.length > 0
      ? Math.min(...baselineTenants.map(t => Number(t.joinReading ?? 0)))
      : 0;

    return Math.max(joinFloor, checkoutFloor);
  },
  [allReadings, monthlyTenants, rooms]
);

// The flat's own shared-meter "Previous" value — same checkoutFloor fix
// as getRoomStartingReading above, keyed on flatId instead of roomId.
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

    if (genuineFlatReadings.length > 0) {
      const latest = genuineFlatReadings.reduce((a, b) =>
        Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
      );
      return Math.max(Number(latest.currentReading ?? 0), checkoutFloor);
    }

    const roomIdsInFlat = new Set(
      rooms.filter(r => String(r.flatId) === String(flatId)).map(r => r.id)
    );
    const flatAllTenants = monthlyTenants.filter(t => roomIdsInFlat.has(t.roomId));
    const joinFloor = flatAllTenants.length > 0
      ? Math.min(...flatAllTenants.map(t => Number(t.joinReading ?? 0)))
      : 0;

    return Math.max(joinFloor, checkoutFloor);
  },
  [allReadings, rooms, monthlyTenants]
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

  // Rooms belonging to the flat currently selected in the Add dialog.
  const roomsInFormFlat = useMemo(() => {
    if (!formFlatId || formFlatId === "all") return [];
    return dialogRooms.filter(r => String(r.flatId) === String(formFlatId));
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

  /* ─── FLAT SHARED METER (uses dialog-scoped rooms) ──────────────────
     A flat has ONE physical EB meter shared by every room inside it, so
     there is exactly one "Previous"/"Current" pair for the whole flat —
     not one per room. This effect just computes that single shared
     Previous value (from the flat's own reading history via
     getFlatStartingReading) plus, separately, each AC room's own AC
     previous value (AC units are typically separate per-room, even
     inside a shared-meter flat). */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formFlatId, roomsInFormFlat, allReadings, getFlatStartingReading, getRoomStartingACReading]);

  /* ─── SYNC FORM READINGS ON ROOM CHANGE (standalone rooms only) ─────
     A standalone room is ONE continuously-advancing shared meter, exactly
     like the flat's shared meter above — no per-tenant checkout selection
     happens in this dialog at all, regardless of how many tenants are
     currently active in the room. Previous always comes straight from
     getRoomStartingReading/getRoomStartingACReading, which already fold
     in every MONTHLY tenant's own join reading as a floor and the room's
     (or its flat's) last saved reading as the running value. Whatever
     Current gets saved here becomes next time's Previous — individual
     tenant checkouts (e.g. a mid-month checkout reading for one
     roommate) are entered on the Tenant Check-Out page instead, which
     does its own proportional split using each tenant's own join/
     checkout readings. */
  useEffect(() => {
    if (!formRoomId) return;
    setFormPrevReading(String(getRoomStartingReading(formRoomId)));
    setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
  }, [formRoomId, allReadings, getRoomStartingReading, getRoomStartingACReading]);

  /* ─── BUILD TENANT BILL ROWS ───────────────────────────────
     The backend already excludes DAILY-stay tenants from every bill it
     returns. The id sets below are built from monthlyTenants as a second
     guard so a stale/daily row can never slip into this table. A room
     whose only occupant is a daily tenant comes back as an "Unassigned"
     row carrying the room's units — that is intentional: the meter did
     move, but the units are not billed to someone who already paid their
     EB advance at check-in. */
  useEffect(() => {
    const loadTenantBills = async () => {
      const rows: any[] = [];
      const flatHandled = new Set<number>();
      const roomHandled = new Set<number>();

      // Informational DAILY checkout rows never go through
      // getTenantWiseEBBill — that endpoint returns the room's MONTHLY
      // occupants, which is not what these rows represent. They are pushed
      // straight through and excluded from the grouping loops below so
      // they can't stand in for a room's real reading and can't be
      // swallowed by the per-room de-dup logic.
      const informationalReadings = filteredReadings.filter(r =>
        isInformationalReading(r)
      );
      const billingReadings = filteredReadings.filter(
        r => !isInformationalReading(r)
      );

      for (const r of informationalReadings) {
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
            tenantId, prevReading, currReading, rate, occupants
          );
          grossUnits  = computed.units;
          grossAmount = computed.amount;
        }

        const advancePaid = Number(tenant?.ebAmount ?? 0);
        const netAmount   = grossAmount - advancePaid; // > 0 due, <= 0 paid/refund

        rows.push({
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
        });
      }

      const flatReadingMap = new Map<number, EBReading>();
      for (const r of billingReadings.filter(r => r.flatId != null)) {
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
            monthlyTenants
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

      const roomReadings = billingReadings.filter(r => {
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
          const bills = await getTenantWiseEBBill({
            roomId: r.roomId,
            month: r.month,
            year: r.year,
          });

          const roomTenantIds = new Set(
            monthlyTenants
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
  }, [filteredReadings, roomMap, rooms, monthlyTenants, tenantById, tenants, calculateInformationalShare]);

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
        // ── SHARED FLAT METER ──
        // One physical meter for the whole flat: every room in the flat
        // gets saved with the SAME previousReading/currentReading for
        // this month. There is no per-tenant attribution here — the
        // proportional split across MONTHLY tenants happens later, at
        // checkout time, against this one shared reading.
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
        // Same shape as the flat branch above: one previousReading/
        // currentReading pair for the room's own meter, saved with no
        // tenantId — regardless of how many tenants are currently active
        // in the room. Per-tenant checkout amounts are worked out
        // separately by the backend's calculateTenantWiseBillByRoom
        // (using each MONTHLY tenant's own join/checkout readings), not
        // by anything selected in this dialog.
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
        // NOTE: bulk Excel upload lets an admin type a different
        // Previous/Current per room row-by-row. If this room belongs to a
        // flat with a shared meter, make sure every row for that flat's
        // rooms carries the SAME Previous/Current — the sheet itself
        // doesn't enforce that, so a mismatched bulk upload can
        // reintroduce the same drift this fix addresses for the on-screen
        // Add EB Reading dialog.
        await addEBReading({
          roomId: room.id, flatId: (formFlatId && formFlatId !== "all") ? Number(formFlatId) : undefined,
          // Use the room's own branch (unitId) when uploading via Excel,
          // since there's no per-row branch selector for bulk upload.
          branchId: room.unitId != null ? Number(room.unitId) : undefined,
          month: selMonth, year: selYear,
          previousReading: prev, currentReading: curr,
          acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
          acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
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
    // An informational row is deleted BY ID ONLY. The room/flat variants
    // wipe every reading for that room or flat, which would destroy the
    // room's real billing history just to remove one record line.
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
        .eb-status.prepaid { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.due { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.refund { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.settled { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.pay { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }

        .eb-row-informational td { background: #fcfdff; }
        .eb-daily-tag { display: inline-flex; align-items: center; margin-left: 6px; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; letter-spacing: 0.3px; }

        .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
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
        .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
        .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
        .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

        .eb-pagination-row { flex-wrap: wrap; }
        .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
        .eb-page-ellipsis svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }

        .eb-chart-container { padding: 20px; }

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
                        const informational = row.informational === true;

                        // An informational row now carries the tenant's
                        // REAL proportional units/amount (computed at
                        // checkout, or recomputed client-side as a
                        // fallback when the backend hasn't sent it yet),
                        // not a forced-zero placeholder and not the raw
                        // meter delta.
                        const units = informational
                          ? Math.round(Number(row.unitsConsumed ?? 0))
                          : row.unitsConsumed != null
                            ? Math.round(Number(row.unitsConsumed))
                            : Math.round(curr - prev);

                        const amount = Math.round(Number(row.tenantAmount ?? 0));

                        // For a settled DAILY stay, "Pending/Not Read"
                        // doesn't mean anything — what matters is whether
                        // they still owe money (Due) or don't (Paid).
                        const netAmount = Number(row.netAmount ?? 0);
                        // netAmount = grossAmount (units * rate) - advancePaid
                        //   > 0  → tenant's real usage cost MORE than their
                        //          advance, so they still owe the difference: "Pay"
                        //   < 0  → tenant's advance was MORE than their real
                        //          usage cost, so they're owed the difference back: "Refund"
                        //   = 0  → advance exactly covered usage: "Settled"
                        const status = informational
                          ? (netAmount > 0 ? "Pay" : netAmount < 0 ? "Refund" : "Settled")
                          : (row.tenantAmount ? "Pending" : "Not Read");

                        return (
                          <tr
                            key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${i}`}
                            className={informational ? "eb-row-informational" : undefined}
                          >
                            <td>
                              <div className="eb-room-name">
                                {rName}
                                {informational && <span className="eb-daily-tag">DAILY</span>}
                              </div>
                              <div className="eb-tenant-name">
                                {tenantName}
                                {informational && " — checked out"}
                              </div>
                            </td>
                            <td><span className="eb-reading-val">{prev}</span></td>
                            <td><span className="eb-reading-val">{curr || "—"}</span></td>
                            <td><span className="eb-reading-val">{units || "—"}</span></td>
                            <td>
                              <span className="eb-amount">
                                {informational
                                  ? (netAmount !== 0
                                      ? `₹${new Intl.NumberFormat('en-IN').format(Math.abs(Math.round(netAmount)))}`
                                      : "₹0")
                                  : amount
                                    ? `₹${new Intl.NumberFormat('en-IN').format(amount)}`
                                    : "—"}
                              </span>
                              {informational && (
                                <div className="eb-tenant-name" style={{ marginTop: 2 }}>
                                  {units}u @ ₹{Math.round(Number(row.tenantAmount ?? 0) / (units || 1))} · Advance ₹{row.advancePaid}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className={`eb-status ${status.toLowerCase()}`}>
                                {informational
                                  ? (status === "Pay" ? "Pay" : status === "Refund" ? "Refund" : "Settled")
                                  : status}
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                {/* No bill to send for a settled daily stay. */}
                                {!informational && (
                                  <button className="eb-action-btn" onClick={() => handleSendWhatsApp(row.roomId)} title="Send Bill">
                                    <Send size={14} />
                                  </button>
                                )}
                                {hasAccess && (
                                  <button
                                    className="eb-action-btn"
                                    onClick={() => handleDeleteReadingClick(row)}
                                    title={informational ? "Remove record" : "Delete"}
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
                        {/* ── SHARED FLAT METER ──
                            One physical EB meter for the whole flat — one
                            Previous/Current pair, applied to every room
                            listed below once saved. */}
                        <div className="eb-flat-room-card">
                          <div className="eb-flat-room-title">
                            Shared Flat Meter
                            {roomsInFormFlat.length > 0 && (
                              <span className="font-normal text-muted-foreground">
                                {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
                              <Input className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Current</Label>
                              <Input
                                className="rounded-lg bg-white"
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
                        {flatAcRows.map(row => (
                          <div key={row.roomId} className="eb-flat-room-card">
                            <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
                            <div className="grid grid-cols-2 gap-4">
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
                                  onChange={e => handleFlatAcRowChange(row.roomId, e.target.value)}
                                />
                              </div>
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

                        {/* Previous + Current side by side. Previous is always
                            the room's own running shared-meter value (see
                            getRoomStartingReading) — no tenant selection is
                            ever needed here, regardless of how many tenants
                            are active in the room. */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Previous</Label>
                            <Input
                              className="rounded-lg"
                              placeholder="Previous"
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
                        {(!formFlatId || formFlatId === "all") ? (
                          <Input className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
                            onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                            placeholder="Enter rate for this room" />
                        ) : (
                          // One meter, one rate — applies to the whole flat.
                          <Input className="rounded-lg" type="number" value={manualRate}
                            onChange={e => setManualRate(Number(e.target.value))}
                            placeholder="Enter unit rate for this flat's shared meter" />
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

      {/* ── Bill Dialog */}
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

      {/* ── Upload Dialog */}
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