import { useEffect, useState, useRef, useMemo } from "react";

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
import { CreditCard, Trash2, Wallet, CheckSquare, Clock, FileText, AlertCircle, Plus, Eye, Printer, MoreVertical, Download, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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
    <div className="flex items-center gap-2">
      {/* If there is no rent record generated yet, show Generate Button */}
      {!rentRecord && (
        <Button size="sm" variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0" onClick={() => onGenerate(bill)}>
          Generate
        </Button>
      )}

      {/* If unpaid, show quick pay controls */}
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
  const [selectedRoom, setSelectedRoom] = useState("all");

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
     ROOT CAUSE CONFIRMED VIA DB: getTenantWiseEBBill({ roomId }) does not
     reliably scope its response to the roomId passed in — when queried for
     a room that has no EB reading of its own, the backend can echo back
     another room's tenant/bill data. The old code trusted the API's
     b.roomNumber / b.tenantName blindly, which caused one real EB reading
     (e.g. Anbarasan / Room 101) to be duplicated and mislabeled under
     unrelated rooms (e.g. D1) in the Rent grid.

     FIX:
     1. After fetching a room's/flat's bills, VALIDATE each bill actually
        belongs to that room/flat (via tenantId → tenant.roomId, falling
        back to roomNumber match). Reject anything that can't be verified.
     2. After merging all bills, DEDUPE by tenantId so the same tenant can
        never appear twice for the same month even if a validation edge
        case slips through.
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

        // Lookup: tenantId → room (via tenants array) — used to validate
        // that a returned bill genuinely belongs to the room/flat queried.
        const tenantRoomLookup = new Map<number, Room>();
        tenants.forEach((t) => {
          const room = rooms.find((r) => String(r.id) === String(t.roomId));
          if (room) tenantRoomLookup.set(Number(t.id), room);
        });

        // ── FLAT-BASED BILLS ──────────────────────────────────────────────
        const flatBillResults = await Promise.all(
          flatIds.map(async (flatId) => {
            try {
              const bills = await getTenantWiseEBBill({ flatId, roomId: null });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              return bills
                .filter((b: any) => {
                  // Validate: bill's tenant must actually live in a room
                  // belonging to this flat.
                  if (b.tenantId != null) {
                    const room = tenantRoomLookup.get(Number(b.tenantId));
                    if (room) return String(room.flatId) === String(flatId);
                  }
                  // Fallback: roomNumber echoed by API must belong to this flat
                  const echoedRoomNumber = extractRoomNumber(b);
                  if (echoedRoomNumber) {
                    const room = rooms.find((r) => r.roomNumber === echoedRoomNumber);
                    if (room) return String(room.flatId) === String(flatId);
                  }
                  return false; // can't verify → reject rather than mislabel
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
                    flatNumber = String(flatId); // fallback: use flatId as identifier
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

        // ── STANDALONE ROOM BILLS ─────────────────────────────────────────
        const roomBillResults = await Promise.all(
          standaloneRooms.map(async (room) => {
            try {
              const bills = await getTenantWiseEBBill({
                roomId: room.id,
                flatId: null,
              });
              if (!bills || bills.length === 0) return [] as EBBillRow[];

              const roomTenantIds = new Set(
                tenants
                  .filter((t) => String(t.roomId) === String(room.id))
                  .map((t) => Number(t.id))
              );

              return bills
                .filter((b: any) => {
                  // Validate: only keep bills whose tenant actually lives
                  // in THIS room. This is what prevents another room's
                  // bill (e.g. Room 101) from being echoed and relabeled
                  // as this room's bill (e.g. D1).
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

        // Belt-and-braces: never show the same tenant twice for the same
        // month, even if a validation edge case above slips through.
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

    if (selectedRoom !== "all") {
      allRows = allRows.filter((r) => {
        const room = getRoomObj(r.roomNumber) ?? getRoomById(r.rentRecord?.roomId ?? "");
        return room ? String(room.id) === selectedRoom : false;
      });
    }

    return allRows;
  }, [filteredBills, rooms, tenants, selectedBranch, selectedRoom, month, year, rents, search, tenantNameMap]);

  /* ── room options (scoped to selected branch) ── */
  const roomOptions = useMemo(() => {
    const scoped =
      selectedBranch === "all"
        ? rooms
        : rooms.filter((r) => String(r.unitId) === selectedBranch);
    return scoped
      .map((r) => ({ id: r.id, label: r.roomNumber }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rooms, selectedBranch]);

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

  /* ── Stats & Derived Values ── */
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 8;
  const paginatedRows = rowData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const pendingCount = rowData.filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0).length;
  const paidCount = rowData.filter(r => normalizeStatus(r.paymentStatus) === 'PAID').length;
  const overdueCount = rowData.filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0).length;
  const totalTenants = rowData.length;

  const paidPercent = totalTenants ? (paidCount / totalTenants) * 100 : 0;
  const pendingPercent = totalTenants ? (pendingCount / totalTenants) * 100 : 0;
  const overduePercent = totalTenants ? (overdueCount / totalTenants) * 100 : 0;

  const totalCollected = rowData.reduce((sum, r) => sum + (r.paid || 0), 0);
  const totalPending = rowData.reduce((sum, r) => sum + (r.pending || 0), 0);
  const totalAmount = totalCollected + totalPending;
  const collectionPercent = totalAmount ? Math.round((totalCollected / totalAmount) * 10000) / 100 : 0;

  const mockOverdueAmount = rowData.filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0).reduce((sum, r) => sum + (r.pending || 0), 0);

  const pieData = [
    { name: "Collected", value: totalCollected, color: "#22c55e" },
    { name: "Pending", value: totalPending, color: "#f97316" }
  ];

  const topOverdueTenants = [...rowData]
    .filter(r => (normalizeStatus(r.paymentStatus) === 'PENDING' || normalizeStatus(r.paymentStatus) === 'PARTIAL') && r.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 3);

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
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

        .rt-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
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
                  {/* <Button variant="outline" size="sm" className="h-8">
                    <Download size={14} className="mr-2" /> Export
                  </Button> */}
                  {hasAccess && (
                    <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleGenerateAll}>
                       ALL Generation
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters */}
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
                      <th>STATUS</th>
                      <th>AMOUNT (₹)</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">No rent records found.</td></tr>
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
                              {/* <div className="rt-branch-sub">Tamil Nadu</div> */}
                            </td>
                            {/* ROUNDED: Math.round() applied so decimal values (e.g. 7,708.5) display as whole numbers */}
                            <td><span className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.total))}</span></td>
                            <td><div className={`rt-status ${statusClass}`}>{displayStatus}</div></td>
                            <td>
                              {/* ROUNDED: Math.round() applied so decimal values (e.g. 7,708.5) display as whole numbers */}
                              <div className="rt-value">{new Intl.NumberFormat('en-IN').format(Math.round(row.pending > 0 ? row.pending : row.total))}</div>
                              
                            </td>
                            <td>
                              <ActionCell bill={row} rentRecord={row.rentRecord} onGenerate={handleGenerate} onPayment={handlePayment} onDelete={handleDelete} />
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
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 text-lg leading-none font-bold" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>&#8249;</button>
                  <button className="w-8 h-8 rounded bg-[#5200FF] text-white flex items-center justify-center font-medium text-sm">{currentPage + 1}</button>
                  <button className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 text-lg leading-none font-bold" disabled={(currentPage + 1) * pageSize >= rowData.length} onClick={() => setCurrentPage(p => p + 1)}>&#8250;</button>
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