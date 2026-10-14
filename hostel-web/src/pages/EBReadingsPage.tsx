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
import { Plus, Download, RefreshCw, Send, Trash2, ChevronLeft, ChevronRight, X, MoreHorizontal, Zap } from "lucide-react";
import { usePropertyType } from "@/lib/propertyType";

const isMonthlyTenant = (t: any) => (t?.tenantStay ?? "MONTHLY") !== "DAILY";

// An "informational" row is a DAILY-stay tenant's checkout record: it is
// shown as-is (settled units/amount vs advance) and never goes through the
// bill endpoint.
//
// FIX: this used to be true for ANY row with a tenantId + isCheckout, so a
// MONTHLY tenant's checkout row (e.g. Nivesh) was drawn as a DAILY record
// with the raw stored units (68u / Rs.884) instead of his real segment bill
// (40u / Rs.520). A MONTHLY tenant's checkout row is a normal billing row;
// his bill comes from the flat/room bill like everybody else's. The tenant
// record is the authority for the stay type, the reading's own tenantStay
// is the fallback.
const isInformationalReading = (reading: any, tenant?: any) => {
  if (reading?.tenantId == null || reading?.isCheckout !== true) return false;
  const stay = tenant?.tenantStay ?? reading?.tenantStay ?? "MONTHLY";
  return stay === "DAILY";
};

const EBReadingsPage = () => {
  // ── role is uppercased for all comparisons ────────────────────────────
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId(); // number | null

  // Business Model property type (ROOM / FLAT / null = not configured).
  // Only controls which selector the Add EB Reading form shows - the EB
  // calculation itself (EBServiceImpl) is untouched.
  const { propertyType, loading: propertyTypeLoading } = usePropertyType();
  const isFlatMode = propertyType === "FLAT";
  const isRoomMode = propertyType === "ROOM";

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

  const [flatSharedPrev, setFlatSharedPrev] = useState("");
  const [flatSharedCurr, setFlatSharedCurr] = useState("");

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


  const calculateInformationalShare = useCallback(
    (
      targetTenantId: number,
      prevReading: number,
      currReading: number,
      rate: number,
      occupants: Tenant[],
      meterFlatId: number | null,
      meterRoomId: number | null
    ): { units: number; amount: number } => {
      if (!(currReading > prevReading) || occupants.length === 0) {
        return { units: 0, amount: 0 };
      }

      const localLastBilled = new Map<number, number>();
      allReadings.forEach((r: any) => {
        if (r.tenantId == null) return;
        const sameMeter = meterFlatId != null
          ? Number(r.flatId) === Number(meterFlatId)
          : Number(r.roomId) === Number(meterRoomId);
        if (!sameMeter) return;

        const val = Number(r.currentReading ?? 0);
        const key = Number(r.tenantId);
        const prevMax = localLastBilled.get(key);
        if (prevMax == null || val > prevMax) localLastBilled.set(key, val);
      });

      const isPresentInSegment = (t: Tenant, segStart: number, segEnd: number): boolean => {
        const join = Number(t.joinReading);
        if (!Number.isFinite(join) || join > segStart) return false;

        if (Number(t.id) === targetTenantId) {
          return currReading >= segEnd;
        }

        const lastBilled = localLastBilled.get(Number(t.id));
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
    [allReadings]
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

  // AC "Previous" for ONE room.
  //
  // FIX (AC meter jumped 20 -> 60 on a sibling room): AC is metered PER
  // ROOM, but a flat checkout writes a copy of the checkout row onto
  // EVERY room of the flat (the main meter is shared). Those sibling
  // copies used to carry the checked-out tenant's AC value (e.g. Anbu's
  // 50 -> 60 in W1-ROOM-1), and this function took the maximum
  // acCurrentReading over every row of the room, checkout rows included,
  // so W1-ROOM-2's AC Previous became 60 instead of 20.
  //
  // Rule now: a CHECKOUT row only moves this room's AC floor when a
  // tenant of THIS room provably owns it (tenantId belongs to a tenant
  // whose room is this room). Genuine EB-page rows always count. The
  // room's own tenants' acCheckoutReading values are an additional,
  // trustworthy floor. This also protects against sibling rows that were
  // saved before the backend fix.
  const getRoomStartingACReading = useCallback(
    (roomId: string | number) => {
      const rid = String(roomId);

      const roomRows = allReadings.filter(
        r => r.roomId != null && String(r.roomId) === rid
      );

      // Tenants of THIS room (monthly only; checked-out ones included).
      const roomTenants = monthlyTenants.filter(t => String(t.roomId) === rid);
      const roomTenantIds = new Set(roomTenants.map(t => Number(t.id)));

      const rowCountsForAc = (r: any) => {
        if (r.isCheckout !== true) return true;
        if (r.tenantId == null) return false;
        return roomTenantIds.has(Number(r.tenantId));
      };

      const rowAcFloor = roomRows
        .filter(rowCountsForAc)
        .reduce((m, r) => Math.max(m, Number(r.acCurrentReading ?? 0)), 0);

      // AC checkout readings recorded on this room's own tenants.
      const tenantAcFloor = roomTenants.reduce((m, t) => {
        const co = Number((t as any).acCheckoutReading);
        const join = Number((t as any).acJoinReading);
        if (!Number.isFinite(co) || co <= 0) return m;
        if (Number.isFinite(join) && join > 0 && co <= join) return m;
        return Math.max(m, co);
      }, 0);

      const acFloor = Math.max(rowAcFloor, tenantAcFloor);

      const genuineRoomReadings = roomRows.filter(r => r.isCheckout !== true);
      if (genuineRoomReadings.length > 0) {
        const latest = genuineRoomReadings.reduce((a, b) =>
          Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
        );
        return Math.max(Number(latest.acCurrentReading ?? 0), acFloor);
      }

      const joins = roomTenants
        .map(t => Number((t as any).acJoinReading))
        .filter(v => Number.isFinite(v) && v > 0);
      const joinFloor = joins.length > 0 ? Math.min(...joins) : 0;

      return Math.max(joinFloor, acFloor);
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
     EB advance at check-in.

     FIX (missing tenants after a checkout): a flat bill row used to find
     its room with `rooms.find(r => r.roomNumber === b.roomNumber)`. Room
     numbers are not unique across the whole system (the checkout list
     shows several "Q1-ROOM-1" / "Q1-ROOM-2" entries), so a bill for
     Q1-ROOM-1 could be pinned to a DIFFERENT room with the same label,
     in another branch, and then thrown away by the branch filter. Only
     Q1-HALL (a unique label) survived, which is why just Anbu and Amal
     were shown. The room is now resolved inside the bill's own flat
     first, then from the tenant's own room. */
  useEffect(() => {
    let cancelled = false;

    const loadTenantBills = async () => {
      const rows: any[] = [];
      const flatHandled = new Set<number>();
      const roomHandled = new Set<number>();

      // Resolve the room a bill line belongs to.
      //  1. a room INSIDE the bill's flat with that room number (unique there;
      //     also correct for a tenant transferred out of that room)
      //  2. the tenant's own room
      //  3. any room with that number (last resort)
      const resolveBillRoomId = (
        b: any,
        flatId: number | null | undefined
      ): number | undefined => {
        const sameNumber = rooms.filter(rm => rm.roomNumber === b.roomNumber);
        if (flatId != null) {
          const inFlat = sameNumber.find(rm => String(rm.flatId) === String(flatId));
          if (inFlat) return inFlat.id;
        }
        if (b.tenantId != null) {
          const t = tenantById.get(Number(b.tenantId));
          if (t?.roomId != null) return Number(t.roomId);
        }
        return sameNumber[0]?.id;
      };

      // Informational rows are DAILY tenants' checkout records only. They
      // never go through getTenantWiseEBBill — that endpoint returns the
      // room's MONTHLY occupants, which is not what these rows represent.
      // They are pushed straight through and excluded from the grouping
      // loops below so they can't stand in for a room's real reading and
      // can't be swallowed by the per-room de-dup logic. A MONTHLY
      // tenant's checkout row is NOT informational: it stays in
      // billingReadings and the tenant gets a normal bill line below.
      const isInfo = (r: any) =>
        isInformationalReading(
          r,
          r.tenantId != null ? tenantById.get(Number(r.tenantId)) : undefined
        );

      const informationalReadings = filteredReadings.filter(r => isInfo(r));
      const billingReadings = filteredReadings.filter(r => !isInfo(r));

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
            tenantId, prevReading, currReading, rate, occupants,
            flatId, r.roomId ?? null
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
              const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
              rows.push({
                id: r.id,
                roomId: resolveBillRoomId(b, r.flatId),
                flatId: r.flatId,
                roomNumber: b.roomNumber,
                flatNumber: b.flatNumber,
                branchId: (r as any).branchId ?? null,
                branchName: (r as any).branchName ?? null,
                tenantId: b.tenantId ?? null,
                tenantName: b.tenantName,
                checkedOut: billTenant?.status === "Checked_Out",
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
              const billTenant = b.tenantId != null ? tenantById.get(Number(b.tenantId)) : undefined;
              rows.push({
                id: r.id,
                roomId: room.id,
                flatId: room.flatId,
                roomNumber: room.roomNumber,
                flatNumber: b.flatNumber,
                branchId: (r as any).branchId ?? null,
                branchName: (r as any).branchName ?? null,
                tenantId: b.tenantId ?? null,
                tenantName: b.tenantName,
                checkedOut: billTenant?.status === "Checked_Out",
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

      // A newer run (filters changed while bills were loading) wins.
      if (!cancelled) setTenantRows(rows);
    };

    if (filteredReadings.length > 0) loadTenantBills();
    else setTenantRows([]);

    return () => { cancelled = true; };
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

      // Flat-based hostel: a reading is always entered against a flat.
      if (isFlatMode && (!formFlatId || formFlatId === "all")) {
        toast.error("Select a flat first");
        return;
      }

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
      await deleteEBReadingsByFlat(flatId, selMonth, selYear);
      toast.success("Flat readings deleted for selected month");
    } else if (roomId) {
      await deleteEBReadingsByRoom(roomId, selMonth, selYear);
      toast.success("Room readings deleted for selected month");
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
  // An informational row is deleted BY ID ONLY.
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

  const monthLabel = new Date(selYear, selMonth - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  askConfirm(
    "Delete this EB reading?",
    () => {
      handleDelete(
        String(row.id),
        row.flatId ? Number(row.flatId) : undefined,
        row.roomId ? Number(row.roomId) : undefined
      );
    },
    {
      description: `This deletes the ${row.flatId ? "flat" : "room"}'s readings for ${monthLabel} only. This action cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    }
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
        const room = rooms.find(r => Number(r.id) === Number(row.roomId));
        // Fall back to the row's own branch when its room could not be
        // resolved, rather than silently dropping the tenant.
        const unit = room?.unitId ?? row.branchId;
        return unit != null ? Number(unit) === Number(selectedBranch) : true;
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

  // Go back to page 1 whenever the filters change, and never sit on a
  // page that no longer exists (e.g. after deleting the last row of the
  // last page).
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch, selectedRoomId, selMonth, selYear]);

  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

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
  if (propertyTypeLoading) {
    return (
      <div role="status" className="flex items-center justify-center py-24 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .eb-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: none; margin: 0 auto; }

        .eb-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        @media (min-width: 1536px) { .eb-layout { flex-direction: row; } .eb-content { flex: 1; min-width: 0; } .eb-sidebar { width: 340px; flex-shrink: 0; } }

        .eb-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .eb-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #f1f5f9; }
        .eb-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .eb-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        /* A11Y: header text darkened from #64748b to #475569 so it clears
           the 4.5:1 contrast ratio on the #fafafa header background. */
        .eb-table th { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .eb-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .eb-table tr:hover { background: #fdfcff; }

        .eb-room-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-tenant-name { font-size: 12px; color: #475569; margin-top: 2px; }
        .eb-reading-val { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-amount { font-size: 13px; font-weight: 600; color: #0f172a; }
        .eb-empty { color: #475569; }

        /* A11Y: every status badge text colour was re-picked so it meets
           4.5:1 against its own tinted background (orange #f97316 and
           green #16a34a were both below that). */
        .eb-status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .eb-status.collected { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.pending { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.not-read { color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; }
        .eb-status.prepaid { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.due { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }
        .eb-status.refund { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .eb-status.settled { color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; }
        .eb-status.pay { color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; }

        .eb-row-informational td { background: #fcfdff; }
        .eb-daily-tag { display: inline-flex; align-items: center; margin-left: 6px; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; letter-spacing: 0.3px; }

        .eb-action-btn { width: 28px; height: 28px; min-width: 28px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; flex-shrink: 0; padding: 0; line-height: 0; font-size: 12px; font-weight: 600; }
        .eb-action-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
        .eb-action-btn svg {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 14px !important;
          height: 14px !important;
          min-width: 14px !important;
          min-height: 14px !important;
          stroke: #475569 !important;
          color: #475569 !important;
          flex-shrink: 0 !important;
          pointer-events: none;
        }
        .eb-action-btn:hover svg { stroke: #0f172a !important; color: #0f172a !important; }
        .eb-action-btn:disabled { cursor: not-allowed; background: #f8fafc; }
        .eb-action-btn:disabled svg { stroke: #94a3b8 !important; color: #94a3b8 !important; }
        .eb-action-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; }

        .eb-pagination-row { flex-wrap: wrap; }
        .eb-page-ellipsis { cursor: default; background: transparent; border-color: transparent; }
        .eb-page-ellipsis svg { stroke: #64748b !important; color: #64748b !important; }

        .eb-chart-container { padding: 20px; }

        .eb-flat-room-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafafa; }
        .eb-flat-room-card + .eb-flat-room-card { margin-top: 14px; }
        .eb-flat-room-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }

        .eb-dlg-head { display: flex; align-items: center; gap: 12px; padding-right: 36px; margin-bottom: 18px; }
        .eb-dlg-icon { width: 40px; height: 40px; border-radius: 12px; background: #f1ebff; color: #5200FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .eb-dlg-title { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .eb-dlg-sub { font-size: 12.5px; color: #64748b; margin-top: 2px; }
        .eb-dlg-section { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #fff; }
        .eb-dlg-section + .eb-dlg-section { margin-top: 14px; }
        .eb-dlg-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
        .eb-dlg-step { width: 20px; height: 20px; border-radius: 999px; background: #5200FF; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .eb-dlg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .eb-dlg-meter { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fafafa; }
        .eb-dlg-meter + .eb-dlg-meter { margin-top: 12px; }
        .eb-dlg-empty { border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; font-size: 13px; color: #64748b; background: #f8fafc; }
        .eb-dlg-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f1f5f9; gap: 2px; }
        .eb-dlg-seg button { border: 0; background: transparent; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; }
        .eb-dlg-seg button[aria-pressed="true"] { background: #fff; color: #5200FF; box-shadow: 0 1px 2px rgba(15,23,42,.12); }
        @media (max-width: 520px) { .eb-dlg-grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="eb-wrap">
        <div className="eb-layout">
          <div>
            <div className="eb-panel">
              <div className="eb-panel-header">
                <h1 className="eb-panel-title">EB Readings List</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="h-8">
                    <Download size={14} className="mr-2" aria-hidden="true" /> Export
                  </Button>
                  {hasAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
                          <Plus size={14} className="mr-2" aria-hidden="true" /> Add EB Reading
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={openAddDialog}>{isFlatMode ? "Single Flat Reading" : "Single Room Reading"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUploadOpen(true)}>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#f1f5f9] bg-[#fafafa]">
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[180px]">
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!hasAccess || !canPickBranch}>
                    {/* A11Y: Radix renders the trigger as a <button role="combobox">
                        with no text label of its own, so Lighthouse flags it. */}
                    <SelectTrigger aria-label="Filter by branch" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
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

                <div className={`${isFlatMode ? "hidden" : "flex"} bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-9 w-[150px]`}>
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger aria-label="Filter by room" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
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
                    <SelectTrigger aria-label="Filter by month and year" className="border-0 shadow-none focus:ring-0 text-sm h-full w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthYearOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-[#475569] font-medium hover:text-[#0f172a]"
                  onClick={() => {
                    setSelectedBranch(defaultBranch);
                    setSelectedRoomId("all");
                    setSelMonth(now.getMonth() + 1);
                    setSelYear(now.getFullYear());
                  }}
                >
                  <RefreshCw size={14} aria-hidden="true" /> Clear
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="eb-table">
                  <caption className="sr-only">EB readings for the selected month</caption>
                  <thead>
                    <tr>
                      <th scope="col">ROOM / BED</th>
                      <th scope="col">PREV READING</th>
                      <th scope="col">CURR READING</th>
                      <th scope="col">UNITS</th>
                      <th scope="col">AMOUNT (₹)</th>
                      <th scope="col">STATUS</th>
                      <th scope="col">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr>
                        {/* A11Y: was text-slate-400 (#94a3b8, ~2.6:1 on white);
                            now #475569 (~7.5:1). */}
                        <td colSpan={7} className="text-center py-12 eb-empty">No EB readings found.</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, i) => {
                        // Prefer the room the row resolved to; fall back to
                        // the bill's own room number instead of "Unknown".
                        const rName = roomMap[row.roomId] || row.roomNumber || "Unknown";
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
                            key={`${row.id ?? "no-id"}-${row.roomId ?? "no-room"}-${row.tenantId ?? "no-tenant"}-${i}`}
                            className={informational ? "eb-row-informational" : undefined}
                          >
                            <td>
                              <div className="eb-room-name">
                                {rName}
                                {informational && <span className="eb-daily-tag">DAILY</span>}
                              </div>
                              <div className="eb-tenant-name">
                                {tenantName}
                                {(informational || row.checkedOut) && " — checked out"}
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
                              <div className={`eb-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>
                                {informational
                                  ? (status === "Pay" ? "Pay" : status === "Refund" ? "Refund" : "Settled")
                                  : status}
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                {/* No bill to send for a settled daily stay. */}
                                {!informational && (
                                  <button
                                    type="button"
                                    className="eb-action-btn"
                                    onClick={() => handleSendWhatsApp(row.roomId)}
                                    title="Send Bill"
                                    aria-label={`Send bill for room ${rName} on WhatsApp`}
                                  >
                                    <Send size={14} aria-hidden="true" />
                                  </button>
                                )}
                                {hasAccess && (
                                  <button
                                    type="button"
                                    className="eb-action-btn"
                                    onClick={() => handleDeleteReadingClick(row)}
                                    title={informational ? "Remove record" : "Delete"}
                                    aria-label={
                                      informational
                                        ? `Remove checkout record for room ${rName}`
                                        : `Delete EB reading for room ${rName}`
                                    }
                                  >
                                    <Trash2 size={14} aria-hidden="true" />
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

              <div className="eb-mobile-pagination flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
                <div className="text-[13px] text-[#475569]" aria-live="polite">
                  Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredTenantRows.length)} of {filteredTenantRows.length} readings
                </div>
                {/* A11Y: pagination wrapped in a labelled <nav>; the icon-only
                    prev/next buttons and numbered buttons now have names. */}
                <nav aria-label="Pagination" className="flex gap-2 eb-pagination-row">
                  <button
                    type="button"
                    className="eb-action-btn w-8"
                    aria-label="Previous page"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="eb-action-btn w-8 eb-page-ellipsis" aria-hidden="true">
                        <MoreHorizontal size={14} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={p}
                        className={`eb-action-btn w-8 ${p === currentPage + 1 ? "active" : ""}`}
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
                    className="eb-action-btn w-8"
                    aria-label="Next page"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {hasAccess && (
          <>

            <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
              <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="eb-add-mobile-dialog sm:max-w-[760px] max-h-[90vh] overflow-hidden rounded-2xl p-0 [&>button]:hidden">
                <div className="eb-add-mobile-scroll relative max-h-[90vh] overflow-y-auto p-6">
                  <DialogClose asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  </DialogClose>

                  <DialogHeader className="space-y-0">
                    <div className="eb-dlg-head">
                      <div className="eb-dlg-icon"><Zap className="h-5 w-5" aria-hidden="true" /></div>
                      <div>
                        <DialogTitle className="eb-dlg-title">Add EB Reading</DialogTitle>
                        <DialogDescription className="eb-dlg-sub">
                          {isFlatMode
                            ? "Enter the shared meter reading for a flat."
                            : isRoomMode
                              ? "Enter the meter reading for a room."
                              : "Enter the electricity meter readings for this month."}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div>
                    {/* Section 1 — Branch + Flat side by side (Room-based hostel: Branch only) */}
                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">1</span>{isRoomMode ? "Branch" : "Branch & Flat"}</div>
                    <div className={isRoomMode ? "grid grid-cols-1 gap-4" : "eb-dlg-grid-2"}>
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
                            <SelectTrigger aria-label="Branch" className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
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

                      <div className={isRoomMode ? "hidden" : "space-y-1.5"}>
                        <Label className="text-xs font-medium text-muted-foreground">Flat</Label>
                        <Select
                          value={formFlatId}
                          onValueChange={val => { setFormFlatId(val); setFlatSearch(""); }}
                          disabled={canPickBranch && !formBranchId}
                        >
                          <SelectTrigger aria-label="Flat" className="rounded-lg">
                            <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select Flat"} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                              <Input placeholder="Search flat..." aria-label="Search flat" value={flatSearch}
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
                    </div>

                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">2</span>Meter reading</div>
                    {(formFlatId && formFlatId !== "all") ? (
                      <div className="space-y-0 max-h-[360px] overflow-y-auto pr-1">
                        {/* ── SHARED FLAT METER ──
                            One physical EB meter for the whole flat — one
                            Previous/Current pair, applied to every room
                            listed below once saved. */}
                        <div className="eb-dlg-meter">
                          <div className="eb-flat-room-title">
                            Shared Flat Meter
                            {roomsInFormFlat.length > 0 && (
                              <span className="font-normal text-muted-foreground">
                                {" "}— applies to {roomsInFormFlat.map(r => r.roomNumber).join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="eb-dlg-grid-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-flat-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
                              <Input id="eb-flat-prev" className="rounded-lg bg-white" value={flatSharedPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-flat-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
                              <Input
                                id="eb-flat-curr"
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
                          <div key={row.roomId} className="eb-dlg-meter">
                            <div className="eb-flat-room-title">Room {row.roomNumber} — AC Meter</div>
                            <div className="eb-dlg-grid-2">
                              <div className="space-y-1.5">
                                <Label htmlFor={`eb-ac-prev-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                                <Input id={`eb-ac-prev-${row.roomId}`} className="rounded-lg bg-white" value={row.acPreviousReading} readOnly />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor={`eb-ac-curr-${row.roomId}`} className="text-xs font-medium text-muted-foreground">AC Current</Label>
                                <Input
                                  id={`eb-ac-curr-${row.roomId}`}
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
                    ) : isFlatMode ? (
                      <div className="eb-dlg-empty">Select a flat above to enter its shared meter reading.</div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Room</Label>
                          <Select
                            value={formRoomId}
                            onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}
                            disabled={canPickBranch && !formBranchId}
                          >
                            <SelectTrigger aria-label="Room" className="rounded-lg">
                              <SelectValue placeholder={canPickBranch && !formBranchId ? "Select branch first" : "Select room"} />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                                <Input placeholder="Search room..." aria-label="Search room" value={roomSearch}
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
                        <div className="eb-dlg-grid-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="eb-room-prev" className="text-xs font-medium text-muted-foreground">Previous</Label>
                            <Input
                              id="eb-room-prev"
                              className="rounded-lg"
                              placeholder="Previous"
                              value={formPrevReading}
                              readOnly
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="eb-room-curr" className="text-xs font-medium text-muted-foreground">Current</Label>
                            <Input id="eb-room-curr" className="rounded-lg" placeholder="Current" value={formCurrReading}
                              onChange={e => setFormCurrReading(e.target.value)} />
                          </div>
                        </div>

                        {selectedRoomObj?.hostelType === "AC" && (
                          <div className="eb-dlg-grid-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-room-ac-prev" className="text-xs font-medium text-muted-foreground">AC Previous</Label>
                              <Input id="eb-room-ac-prev" className="rounded-lg" type="number" placeholder="Previous" value={formAcPrev} readOnly />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="eb-room-ac-curr" className="text-xs font-medium text-muted-foreground">AC Current</Label>
                              <Input id="eb-room-ac-curr" className="rounded-lg" type="number" placeholder="Current" value={formAcCurr}
                                onChange={e => setFormAcCurr(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    </div>

                    <div className="eb-dlg-section">
                      <div className="eb-dlg-section-title"><span className="eb-dlg-step">3</span>Unit rate</div>
                      <div className="eb-dlg-seg" role="group" aria-label="Rate mode">
                        <button type="button" aria-pressed={!manualMode} onClick={() => setManualMode(false)}>Automatic</button>
                        <button type="button" aria-pressed={manualMode} onClick={() => setManualMode(true)}>Manual</button>
                      </div>
                    {manualMode && (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="eb-unit-rate" className="text-xs font-medium text-muted-foreground">Unit Rate (₹)</Label>
                        {(!formFlatId || formFlatId === "all") ? (
                          <Input id="eb-unit-rate" className="rounded-lg" type="number" value={roomManualRates[formRoomId] ?? ""}
                            onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                            placeholder="Enter rate for this room" />
                        ) : (
                          // One meter, one rate — applies to the whole flat.
                          <Input id="eb-unit-rate" className="rounded-lg" type="number" value={manualRate}
                            onChange={e => setManualRate(Number(e.target.value))}
                            placeholder="Enter unit rate for this flat's shared meter" />
                        )}
                      </div>
                    )}
                    </div>
                  </div>

                  <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                    <Button className="rounded-lg bg-[#5200FF] text-white hover:bg-[#4200cc]" onClick={handleAdd} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Reading"}
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
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden="true" />
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
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </DialogClose>
            <DialogHeader>
              <DialogTitle>{isFlatMode ? "Upload Bulk Flat Reading" : "Upload Bulk Room Reading"}</DialogTitle>
              <DialogDescription>
                {isFlatMode
                  ? "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns. Every room of the same flat must carry the same Previous/Current (shared flat meter)."
                  : "Upload an Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns."}
              </DialogDescription>
            </DialogHeader>
            <Input className="rounded-lg" type="file" accept=".xlsx, .xls" aria-label="Upload EB readings Excel file" onChange={handleFileUpload} />
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