import { useEffect, useState, useRef, useMemo } from "react";

import {
  getRooms,
  getRents,
  getTenants,
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

  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [roomList, rentList, tenantList, pendingDamages] = await Promise.all([
        fetchAllPages<Room>(getRooms),
        fetchAllPages<Rent>(getRents),
        fetchAllPages<Tenant>(getTenants),
        getPendingDamageSummary().catch(() => ({} as Record<number, number>)),
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

      // CHANGED: was `room?.rentPerBed ?? 0` — now uses the tenant's own
      // monthlyRent (falls back to the room's default only if unset), so
      // two tenants in the same room can show different rent amounts.
      const rentPerBed = resolveTenantRent(Number(b.tenantId), room);
      const rentRecord = getRentStatus(
        b.tenantId,
        bill.roomNumber,
        room?.id
      );

      const recordTotal  = rentRecord ? Number(rentRecord.totalAmount  || 0) : 0;
      const recordRent   = rentRecord ? Number(rentRecord.rentAmount   || 0) : rentPerBed;
      const recordEB     = rentRecord ? Number(rentRecord.ebAmount     || 0) : b.amount ?? 0;
      const recordDamage = rentRecord ? Number((rentRecord as any).damageAmount || 0) : 0;

      const displayEB     = rentRecord ? recordEB     : (b.amount ?? 0);
      const displayRent   = rentRecord ? recordRent   : rentPerBed;
      // Once a Rent row exists, its damageAmount is the source of truth.
      // Until then, fall back to unbilled DamageTenant shares for this
      // tenant so a reported damage is visible before "Generate" is clicked.
      const displayDamage = rentRecord
        ? recordDamage
        : (pendingDamageMap.get(Number(b.tenantId)) ?? 0);
      const displayTotal  = rentRecord
        ? recordTotal
        : rentPerBed + (b.amount ?? 0) + displayDamage;

      const currentPaid   = Number(rentRecord?.paidAmount || 0);
      const currentStatus = normalizeStatus(rentRecord?.paymentStatus);

      const currentPending = rentRecord
        ? currentStatus === "PAID"
          ? 0
          : currentStatus === "PARTIAL"
          ? recordTotal - currentPaid
          : recordTotal
        : rentPerBed + (b.amount ?? 0) + displayDamage;

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

    // Tenants with an unbilled damage share but no EB bill row and no Rent
    // row yet for this month (e.g. damage reported before any EB reading
    // exists) would otherwise never show up on this page at all. Surface
    // them as their own rows so the pending damage is still visible.
    const coveredTenantIds = new Set<number>([
      ...ebRows.map((r) => r.tenantId),
      ...orphanRows.map((r) => r.tenantId),
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
        const rentPerBed   = resolveTenantRent(Number(tenantId), room);

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
          currentPending:  rentPerBed + damageAmount,
          pending:         rentPerBed + damageAmount,
          rentRecord:      undefined,
          unitId:          room?.unitId,
          amount:          0,
          paymentStatus:   undefined,
        } as RentRow;
      })
      .filter((r): r is RentRow => r !== null);

    let allRows = [...ebRows, ...orphanRows, ...damageOnlyRows];

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
  }, [filteredBills, rooms, tenants, selectedBranch, selectedRoom, month, year, rents, search, tenantNameMap, tenantRentMap, pendingDamageMap]);

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
    try {
      await generateRent({
        tenantId:   String(bill.tenantId),
        roomId:     String(room.id),
        rentMonth:  month,
        rentYear:   year,
        // CHANGED: was `room.rentPerBed` — now the tenant's own monthlyRent
        // (with room.rentPerBed only as a fallback) so the generated Rent
        // record is billed at the tenant's actual agreed rent.
        rentAmount: resolveTenantRent(bill.tenantId, room),
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
            // CHANGED: was `room.rentPerBed` — see handleGenerate above.
            rentAmount: resolveTenantRent(Number(b.tenantId), room),
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

        .rt-table { width: 100%; border-collapse: collapse; min-width: 1200px; }
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
                      <th>ROOM & BED</th>
                      <th>BRANCH</th>
                      <th>RENT (₹)</th>
                      <th>EB (₹)</th>
                      <th>DAMAGE (₹)</th>
                      <th>TOTAL (₹)</th>
                      <th>STATUS</th>
                      <th>PENDING (₹)</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-12 text-slate-400">No rent records found for {MONTHS[month - 1]} {year}.</td></tr>
                    ) : (
                      paginatedRows.map((row, i) => {
                        const sStatus = row.rentRecord?.paymentStatus ? normalizeStatus(row.rentRecord.paymentStatus) : "UNGENERATED";
                        let statusClass = "ungenerated";
                        let displayStatus = sStatus;

                        const isOverdueMock = (sStatus === "PENDING" || sStatus === "PARTIAL") && (row.pending > 0);
                        if (sStatus === "PAID") { statusClass = "paid"; displayStatus = "Paid"; }
                        else if (isOverdueMock) { statusClass = "overdue"; displayStatus = "Overdue"; }
                        else if (sStatus === "PENDING" || sStatus === "PARTIAL") { statusClass = "pending"; displayStatus = sStatus === "PARTIAL" ? "Partial" : "Pending"; }
                        else { statusClass = "not-due"; displayStatus = "Not Due"; }

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
                                  <div className="rt-tenant-phone">{row.tenantId + 9876543200}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="rt-room">{row.roomNumber} - Bed {(i % 4) + 1}</div>
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
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.total))}</span></td>
                            <td><div className={`rt-status ${statusClass}`}>{displayStatus}</div></td>
                            <td>
                              <div className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.pending > 0 ? row.pending : row.total))}</div>
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

          <div>
            <div className="rt-panel p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="rt-panel-title">Overdue Tenants</h2>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:underline">View All</a>
              </div>
              <div className="space-y-4">
                {topOverdueTenants.map((t, i) => (
                  <div key={i} className="flex justify-between items-start pb-4 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.tenantName}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{t.roomNumber} - Bed 1</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">₹{new Intl.NumberFormat('en-IN').format(Math.round(t.pending))}</div>
                      <div className="text-[10px] font-semibold text-rose-500 mt-0.5">{(i % 5) + 3} days overdue</div>
                    </div>
                  </div>
                ))}
                {topOverdueTenants.length === 0 && (
                  <div className="text-sm text-slate-400 text-center py-4">No overdue tenants found.</div>
                )}
              </div>
              {overdueCount > 3 && (
                <div className="text-center mt-4">
                  <a href="#" className="text-xs font-semibold text-indigo-600 hover:underline">+{overdueCount - 3} more tenants</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentPage;