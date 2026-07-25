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
import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Icons ──────────────────────────────────────────────────
   Previously these action/pagination icons were hand-rolled
   inline SVGs, and they weren't rendering (blank boxes) no
   matter what stroke color was used. Meanwhile the lucide-react
   icons used elsewhere on this same page (Download, Plus,
   ChevronDown) render correctly. So the custom SVGs — not the
   color — were the problem. Switched these four to lucide-react
   (Send, Trash2, ChevronLeft, ChevronRight) to match what's
   already proven to work in this build.
   ─────────────────────────────────────────────────────────── */

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

  // Page-level "All Rooms" table filter (by the ROOM/BED column). Kept
  // separate from `formFlatId` below — that one drives the Add-dialog's
  // Flat picker and was being reused for this dropdown too, which meant
  // the "All Rooms" filter was actually listing Flats. If a branch has no
  // flats (only standalone rooms), that made the dropdown show nothing
  // but the default option. This filter now lists actual rooms instead.
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
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcPrev,      setFormAcPrev]      = useState("");
  const [formAcCurr,      setFormAcCurr]      = useState("");
  const [roomSearch,      setRoomSearch]      = useState("");
  const [billRoom,        setBillRoom]        = useState("");

  // ── Add-dialog-scoped branch selection. Kept separate from the page's
  // `selectedBranch` filter (which can be "all") — a reading always
  // belongs to exactly one branch, and this makes that explicit rather
  // than relying on the backend inferring it from room/flat.
  const [formBranchId, setFormBranchId] = useState("");

  // Month/Year filter. Previously `selMonth`/`selYear` were hardcoded to
  // today's date, and the "May 2025" box next to the filters was just a
  // static <div> with a decorative chevron — it didn't open anything and
  // wasn't wired to these values at all. Now it's real state, driven by
  // an actual dropdown below.
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());

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

  /* ─── ROOM TOTALS ───────────────────────────────────────── */
  const roomTotals = useMemo(() => {
    const map: Record<string, { units: number; amount: number }> = {};
    tenantRows.forEach(row => {
      const key = row.flatId ? `flat-${row.flatId}` : `room-${row.roomId}`;
      if (!map[key]) map[key] = { units: 0, amount: 0 };
      map[key].amount += Number(row.tenantAmount ?? 0);
      map[key].units = Math.round(
        Number(row.currentReading ?? 0) - Number(row.previousReading ?? 0)
      );
    });
    return map;
  }, [tenantRows]);

  /* ─── FILTERED ROOMS (page-level view filter, driven by selectedBranch) ── */
  const filteredRooms = useMemo(() => {
    if (selectedBranch === "all") return rooms;
    return rooms.filter(r => Number(r.unitId) === Number(selectedBranch));
  }, [rooms, selectedBranch]);

  const standaloneRooms = useMemo(
    () => filteredRooms.filter(r => !r.flatId),
    [filteredRooms]
  );

  const flatFilteredRooms = useMemo(() => {
    if (!formFlatId || formFlatId === "all") return standaloneRooms;
    return filteredRooms.filter(r => String(r.flatId) === String(formFlatId));
  }, [filteredRooms, standaloneRooms, formFlatId]);

  /* ─── DIALOG-SCOPED ROOMS/FLATS (Add EB Reading dialog only) ────────────
     Driven by `formBranchId`, NOT the page-level `selectedBranch`. This
     matters when the page filter is "All" — without this, the dialog's
     Flat/Room dropdowns would show rooms from every branch mixed together.
  ───────────────────────────────────────────────────────────────────────── */
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

  const flatMap = useMemo(() => {
    const map: Record<string, string> = {};
    flats.forEach(f => { map[String(f.id)] = f.flatNumber; });
    return map;
  }, [flats]);

  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
    return map;
  }, [rooms]);

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
  useEffect(() => {
    if (!formRoomId) return;
    setFormPrevReading(String(getRoomStartingReading(formRoomId)));
    setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
  }, [formRoomId, getRoomStartingReading, getRoomStartingACReading]);

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
          const bills = await getTenantWiseEBBill({ flatId: r.flatId });

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
          const bills = await getTenantWiseEBBill({ roomId: r.roomId });

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
                previousReading: r.previousReading ?? b.previousReading,
                currentReading: r.currentReading ?? b.currentReading,
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
          await addEBReading({
            flatId: Number(formFlatId), roomId: Number(row.roomId),
            branchId: branchIdNum,
            month: selMonth, year: selYear,
            previousReading: prev, currentReading: curr,
            acPreviousReading: acPrev, acCurrentReading: acCurr,
            ebRate: getRateForRoom(row.roomId), isCheckout: true,
          });
        }
        toast.success("Flat readings saved");
      } else {
        if (!formRoomId || !formCurrReading) { toast.error("Fill room data"); return; }
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
          ebRate: getRateForRoom(formRoomId), isCheckout: true,
        });
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
    setRoomSearch(""); setFormFlatId("all"); setFormRoomId(""); setFormBranchId("");
    setFormPrevReading(""); setFormCurrReading("");
    setFormAcPrev(""); setFormAcCurr("");
    setFlatRoomRows([]); setManualMode(false);
    setManualRate(13); setRoomManualRates({});
  };

  // Default the dialog's branch when it's opened.
  // WARDEN: locked to their own branch (they never see the selector).
  // ADMIN/SUPER_ADMIN: pre-fill from the page-level filter if one is set,
  // otherwise leave blank so they must pick explicitly.
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
  const pageSize = 8;
  const paginatedRows = filteredTenantRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

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

        .eb-action-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; }
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

        .eb-chart-container { padding: 20px; }
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
                        const units = Math.round(curr - prev);
                        const amount = Math.round(Number(row.tenantAmount ?? 0));
                        // NOTE: there's no real "paid" flag coming back from the
                        // backend yet (getTenantWiseEBBill doesn't return payment
                        // status). Previously this alternated Pending/Collected
                        // based on row position (i % 5), which was fake data.
                        // Until real payment tracking is wired up, anything with
                        // a billed amount is honestly "Pending".
                        const status = row.tenantAmount ? "Pending" : "Not Read";

                        return (
                          <tr key={row.id || `${row.roomId}-${i}`}>
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
                                  <button className="eb-action-btn" onClick={() => {
                                    if (window.confirm("Delete this EB reading?")) {
                                      handleDelete(String(row.id), row.flatId ? Number(row.flatId) : undefined, row.roomId ? Number(row.roomId) : undefined);
                                    }
                                  }} title="Delete">
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
                <div className="flex gap-2">
                  <button
                    className="eb-action-btn w-8"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button className="eb-action-btn w-8 active">{currentPage + 1}</button>
                  <button
                    className="eb-action-btn w-8"
                    disabled={(currentPage + 1) * pageSize >= filteredTenantRows.length}
                    onClick={() => setCurrentPage(p => p + 1)}
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
            {/* ── Add Dialog ── */}
            <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add EB Reading</DialogTitle>
                  <DialogDescription>Enter the electricity meter readings for this month.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  {/* Branch selector — ADMIN/SUPER_ADMIN pick explicitly
                      (required before Flat/Room become available); WARDEN's
                      branch is fixed, so it's shown read-only instead. */}
                  <Label>Branch</Label>
                  {canPickBranch ? (
                    <Select
                      value={formBranchId}
                      onValueChange={val => {
                        setFormBranchId(val);
                        setFormFlatId("all");
                        setFormRoomId("");
                        setRoomSearch("");
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                      <span className="text-foreground font-semibold">
                        {branches.find(b => Number(b.id) === Number(formBranchId))?.unitName ?? "Unit"}
                      </span>
                    </div>
                  )}

                  <Label>Flat</Label>
                  <Select
                    value={formFlatId}
                    onValueChange={setFormFlatId}
                    disabled={canPickBranch && !formBranchId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">No Flat (standalone room)</SelectItem>
                      {dialogFlats.map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(formFlatId && formFlatId !== "all") ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {flatRoomRows.map(row => {
                        const cols = row.isAc ? "grid-cols-5" : "grid-cols-3";
                        return (
                          <div key={row.roomId}>
                            <div className={`grid ${cols} font-semibold text-xs text-muted-foreground mb-1`}>
                              <div>Room</div><div>Prev</div><div>Current</div>
                              {row.isAc && <div>AC Prev</div>}
                              {row.isAc && <div>AC Curr</div>}
                            </div>
                            <div className={`grid ${cols} gap-2 items-center`}>
                              <div className="text-sm font-medium">{row.roomNumber}</div>
                              <Input value={row.previousReading} readOnly />
                              <Input placeholder="Current" value={row.currentReading}
                                onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)} />
                              {row.isAc && (
                                <>
                                  <Input value={row.acPreviousReading} readOnly />
                                  <Input placeholder="AC Current" value={row.acCurrentReading}
                                    onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)} />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <Label>Room</Label>
                      <Select
                        value={formRoomId}
                        onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
                        disabled={canPickBranch && !formBranchId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                            <Input placeholder="Search room..." value={roomSearch}
                              onChange={e => setRoomSearch(e.target.value)}
                              onKeyDown={e => e.stopPropagation()}
                              className="h-8 text-sm" autoFocus />
                          </div>
                          {dialogFlatFilteredRooms
                            .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
                            .map(r => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
                            ))}
                          {dialogFlatFilteredRooms.filter(r =>
                            r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No room found</div>
                          )}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Previous" value={formPrevReading} readOnly />
                      <Input placeholder="Current" value={formCurrReading}
                        onChange={e => setFormCurrReading(e.target.value)} />
                      {selectedRoomObj?.hostelType === "AC" && (
                        <div className="space-y-2">
                          <Label>AC Reading</Label>
                          <Input type="number" placeholder="Previous" value={formAcPrev} readOnly />
                          <Input type="number" placeholder="Current" value={formAcCurr}
                            onChange={e => setFormAcCurr(e.target.value)} />
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <Label>Mode:</Label>
                    <Button size="sm" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
                    <Button size="sm" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
                  </div>

                  {manualMode && (
                    <div className="space-y-2">
                      <Label>Unit Rate (₹)</Label>
                      {(!formFlatId || formFlatId === "all") && (
                        <Input type="number" value={roomManualRates[formRoomId] ?? ""}
                          onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                          placeholder="Enter rate for this room" />
                      )}
                      {(formFlatId && formFlatId !== "all") && (
                        <div className="space-y-2">
                          {flatRoomRows.map(row => (
                            <div key={row.roomId} className="flex gap-2 items-center">
                              <span className="w-24 text-sm">{row.roomNumber}</span>
                              <Input type="number" value={manualRate}
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

                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleAdd} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* ── Bill Dialog ── */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-lg">
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
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload EB Excel</DialogTitle>
            <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
          </DialogHeader>
          <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default EBReadingsPage;