import { useEffect, useState, useRef } from "react";
import {
  getRooms,
  getBeds,
  getEBReadings,
  getTenantWiseEBBill,
  getRents,
  getTenants,
  getFlats,
  getDashboard,
} from "@/lib/store";
import {
  Room,
  Bed,
  EBReading,
  TenantEBBill,
  Rent,
  Tenant,
  Flat,
  MONTHS,
  RoomReport,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, IndianRupee, Building2, Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  Amount helpers
// ─────────────────────────────────────────────────────────────────────────────
const getCollected = (r: Rent): number => {
  const total = r.totalAmount ?? 0;
  const paid  = r.paidAmount  ?? 0;
  switch (r.paymentStatus?.toUpperCase()) {
    case "PAID":    return total;
    case "PARTIAL": return paid;
    default:        return 0;
  }
};

const getPending = (r: Rent): number => {
  const total = r.totalAmount ?? 0;
  const paid  = r.paidAmount  ?? 0;
  switch (r.paymentStatus?.toUpperCase()) {
    case "PENDING": return total;
    case "PARTIAL": return total - paid;
    default:        return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  groupEBForTable — for display table only (one row per room/flat)
// ─────────────────────────────────────────────────────────────────────────────
const groupEBForTable = (readings: EBReading[]): EBReading[] => {
  const map = new Map<string, EBReading>();
  for (const r of readings) {
    let key: string;
    if (r.flatId != null && r.flatId !== 0) key = `F:${r.flatId}`;
    else if (r.roomId != null)              key = `R:${r.roomId}`;
    else                                    key = `X:${r.id}`;

    const existing = map.get(key);
    if (!existing || (r.unitsConsumed ?? 0) > (existing.unitsConsumed ?? 0)) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
};

// ─────────────────────────────────────────────────────────────────────────────
//  computeSplit
// ─────────────────────────────────────────────────────────────────────────────
function computeSplit(
  readings: EBReading[],
  roomToFlatMap: Map<number, number>
): { roomUnits: number; flatUnits: number } {

  const deduped = new Map<string, EBReading>();

  for (const r of readings) {
    const readingFlatId =
      r.flatId != null && Number(r.flatId) !== 0 ? Number(r.flatId) : undefined;
    const roomFlatId =
      r.roomId != null ? roomToFlatMap.get(Number(r.roomId)) : undefined;
    const effectiveFlatId = readingFlatId ?? roomFlatId;

    let roomKey: string;
    if (effectiveFlatId != null && r.roomId != null) {
      roomKey = `flat:${effectiveFlatId}:room:${r.roomId}`;
    } else if (effectiveFlatId != null) {
      roomKey = `flat:${effectiveFlatId}:noroom`;
    } else if (r.roomId != null) {
      roomKey = `room:${r.roomId}`;
    } else {
      roomKey = `unknown:${r.id}`;
    }

    const existing = deduped.get(roomKey);
    if (!existing) {
      deduped.set(roomKey, r);
    } else {
      const existCurr = existing.currentReading ?? 0;
      const thisCurr  = r.currentReading ?? 0;
      if (thisCurr > existCurr) {
        deduped.set(roomKey, r);
      }
    }
  }

  const flatAccum = new Map<number, number>();
  let roomUnits = 0;

  for (const r of deduped.values()) {
    const readingFlatId =
      r.flatId != null && Number(r.flatId) !== 0 ? Number(r.flatId) : undefined;
    const roomFlatId =
      r.roomId != null ? roomToFlatMap.get(Number(r.roomId)) : undefined;
    const effectiveFlatId = readingFlatId ?? roomFlatId;

    if (effectiveFlatId != null) {
      const meterUnits = (r.currentReading   ?? 0) - (r.previousReading   ?? 0);
      const acUnits    = (r.acCurrentReading  ?? 0) - (r.acPreviousReading  ?? 0);
      const netUnits   = Math.max(0, meterUnits - Math.max(0, acUnits));
      flatAccum.set(effectiveFlatId, (flatAccum.get(effectiveFlatId) ?? 0) + netUnits);
    } else {
      roomUnits += r.unitsConsumed ?? 0;
    }
  }

  const flatUnits = Array.from(flatAccum.values()).reduce((s, v) => s + v, 0);
  return { roomUnits, flatUnits };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper — safely unwrap paginated OR plain-array API responses
// ─────────────────────────────────────────────────────────────────────────────
function unwrap<T>(res: T[] | { content: T[]; totalElements: number } | null | undefined): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return (res as { content: T[]; totalElements: number })?.content ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  ReportsPage
// ─────────────────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const [rooms,          setRooms]          = useState<Room[]>([]);
  const [flats,          setFlats]          = useState<Flat[]>([]);
  const [beds,           setBeds]           = useState<Bed[]>([]);
  const [readings,       setReadings]       = useState<EBReading[]>([]);
  const [rents,          setRents]          = useState<Rent[]>([]);
  const [allTenants,     setAllTenants]     = useState<Tenant[]>([]);
  const [tenantBills,    setTenantBills]    = useState<TenantEBBill[]>([]);
  const [roomToFlatMap,  setRoomToFlatMap]  = useState<Map<number, number>>(new Map());
  const [dashTotalUnits, setDashTotalUnits] = useState<number>(0);

  // ── Dashboard occupancy stats (source of truth for beds) ──────────────────
  const [dashTotalBeds,     setDashTotalBeds]     = useState<number | null>(null);
  const [dashOccupiedBeds,  setDashOccupiedBeds]  = useState<number | null>(null);
  const [dashAvailableBeds, setDashAvailableBeds] = useState<number | null>(null);
  const [dashTotalRooms,    setDashTotalRooms]    = useState<number | null>(null);

  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear,  setSelYear]  = useState(new Date().getFullYear());

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchAll = async () => {
      // ── Step 1: fetch all paginated responses ──────────────────────────────
      const [roomsRes, flatsRes, bedsRes, readingsRes, rentsRes, tenantsRes] =
        await Promise.all([
          getRooms(0, 1000),
          getFlats(0, 1000),
          getBeds(0, 1000),
          getEBReadings(0, 1000),
          getRents(0, 1000),
          getTenants(0, 1000),
        ]);

      // ── Step 2: unwrap each paginated response into a plain typed array ────
      const roomsArr    = unwrap<Room>(roomsRes);
      const flatsArr    = unwrap<Flat>(flatsRes);
      const bedsArr     = unwrap<Bed>(bedsRes);
      const readingsArr = unwrap<EBReading>(readingsRes);
      const rentsArr    = unwrap<Rent>(rentsRes);
      const tenantsArr  = unwrap<Tenant>(tenantsRes);

      // ── Step 3: set state ──────────────────────────────────────────────────
      setRooms(roomsArr);
      setFlats(flatsArr);
      setBeds(bedsArr);
      setReadings(readingsArr);
      setRents(rentsArr);
      setAllTenants(tenantsArr);

      // ── Step 4: build roomId → flatId lookup map ───────────────────────────
      const r2f = new Map<number, number>();
      for (const rm of roomsArr) {
        if (rm.flatId != null && rm.flatId !== 0) {
          r2f.set(Number(rm.id), Number(rm.flatId));
        }
      }
      setRoomToFlatMap(r2f);

      // ── Step 5: dashboard — authoritative source for units & occupancy ─────
      try {
        const dash = await getDashboard();

        // EB units
        setDashTotalUnits(dash.totalUnits ?? 0);

        // Occupancy — use dashboard values when present; they match the
        // dashboard page exactly and avoid double-counting flat/room beds.
        if (dash.totalBeds     != null) setDashTotalBeds(dash.totalBeds);
        if (dash.occupiedBeds  != null) setDashOccupiedBeds(dash.occupiedBeds);
        if (dash.availableBeds != null) setDashAvailableBeds(dash.availableBeds);
        if (dash.totalRooms    != null) setDashTotalRooms(dash.totalRooms);
      } catch { /* ignore */ }

      // ── Step 6: tenant bills (room-wise display amounts) ───────────────────
      let allBills: TenantEBBill[] = [];

      const standaloneRooms = roomsArr.filter((rm) => !rm.flatId || rm.flatId === 0);
      for (const room of standaloneRooms) {
        try {
          const bills = await getTenantWiseEBBill({ roomId: room.id });
          allBills = [
            ...allBills,
            ...bills.map((b) => ({ ...b, flatId: undefined })),
          ];
        } catch { /* ignore */ }
      }

      for (const flat of flatsArr) {
        try {
          const bills = await getTenantWiseEBBill({ flatId: flat.id });
          allBills = [
            ...allBills,
            ...bills.map((b) => ({ ...b, flatId: flat.id })),
          ];
        } catch { /* ignore */ }
      }

      setTenantBills(allBills);
    };

    fetchAll();
  }, []);

  // ── Derived filters ─────────────────────────────────────────────────────────
  const filteredEB = readings.filter(
    (r) => Number(r.month) === selMonth && Number(r.year) === selYear
  );

  const tableEB = groupEBForTable(filteredEB);

  const filteredRent = rents.filter(
    (r) => Number(r.rentMonth) === selMonth && Number(r.rentYear) === selYear
  );

  // ── EB unit split ───────────────────────────────────────────────────────────
  const { roomUnits: roomBasedUnits, flatUnits: flatBasedUnits } =
    computeSplit(filteredEB, roomToFlatMap);

  const totalUnits =
    dashTotalUnits > 0 ? dashTotalUnits : roomBasedUnits + flatBasedUnits;

  // ── Rent totals ─────────────────────────────────────────────────────────────
  const totalRentCollected = filteredRent.reduce((s, r) => s + getCollected(r), 0);
  const totalRentPending   = filteredRent.reduce((s, r) => s + getPending(r),   0);
  const totalCost          = totalRentCollected + totalRentPending;

  // ── Occupancy — prefer dashboard API values (matches dashboard page) ────────
  // Fall back to local bed array only if dashboard didn't return these fields.
  const totalBedsDisplay     = dashTotalBeds     ?? beds.length;
  const occupiedBedsDisplay  = dashOccupiedBeds  ?? beds.filter((b) =>  b.isOccupied).length;
  const availableBedsDisplay = dashAvailableBeds ?? beds.filter((b) => !b.isOccupied).length;
  const totalRoomsDisplay    = dashTotalRooms    ?? rooms.length;

  const checkedOut = allTenants.filter((t) => t.status === "Checked_Out");

  // ── Room-wise EB report table ───────────────────────────────────────────────
  const roomReports = tableEB
    .map((r) => {
      const isFlat = r.flatId != null && r.flatId !== 0;

      if (isFlat) {
        const flat      = flats.find((f) => Number(f.id) === Number(r.flatId));
        const flatRooms = rooms.filter((rm) => Number(rm.flatId) === Number(r.flatId));
        const flatBeds  = beds.filter((b) =>
          flatRooms.some((rm) => Number(rm.id) === Number(b.roomId))
        );
        const flatBillRows = tenantBills.filter(
          (b) => b.flatId != null && Number(b.flatId) === Number(r.flatId)
        );
        const fAmount = flatBillRows.reduce((s, b) => s + (b.amount ?? 0), 0);

        const flatSplit = computeSplit(
          filteredEB.filter((er) => {
            const erFlatId =
              er.flatId != null && Number(er.flatId) !== 0
                ? Number(er.flatId)
                : er.roomId != null
                ? roomToFlatMap.get(Number(er.roomId))
                : undefined;
            return erFlatId === Number(r.flatId);
          }),
          roomToFlatMap
        );
        const flatReadingUnits = flatSplit.flatUnits + flatSplit.roomUnits;

        return {
          roomNumber:      flat?.flatNumber ?? `Flat #${r.flatId}`,
          hostelType:      flatRooms[0]?.hostelType ?? "NON_AC",
          isFlat:          true,
          previousReading: r.previousReading,
          currentReading:  r.currentReading,
          unitsConsumed:   flatReadingUnits || (r.unitsConsumed ?? 0),
          totalEBAmount:   fAmount || (r.ebAmount ?? 0),
          totalBeds:       flatBeds.length,
          occupiedBeds:    flatBeds.filter((b) => b.isOccupied).length,
          availableBeds:   flatBeds.filter((b) => !b.isOccupied).length,
        };
      } else {
        const room  = rooms.find((rm) => Number(rm.id) === Number(r.roomId));
        if (!room) return null;
        const rBeds = beds.filter((b) => Number(b.roomId) === Number(room.id));
        const roomBillRows = tenantBills.filter(
          (b) =>
            (b.flatId == null || b.flatId === 0) &&
            Number(b.roomId) === Number(r.roomId)
        );
        const rUnits  = roomBillRows.reduce((s, b) => s + (b.unitsConsumed ?? 0), 0);
        const rAmount = roomBillRows.reduce((s, b) => s + (b.amount ?? 0), 0);

        return {
          roomNumber:      room.roomNumber,
          hostelType:      room.hostelType,
          isFlat:          false,
          previousReading: r.previousReading,
          currentReading:  r.currentReading,
          unitsConsumed:   rUnits || (r.unitsConsumed ?? 0),
          totalEBAmount:   rAmount || (r.ebAmount ?? 0),
          totalBeds:       rBeds.length,
          occupiedBeds:    rBeds.filter((b) => b.isOccupied).length,
          availableBeds:   rBeds.filter((b) => !b.isOccupied).length,
        };
      }
    })
    .filter(Boolean) as (RoomReport & { isFlat: boolean })[];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const downloadRentCSV = () => {
    if (filteredRent.length === 0) return;
    const rows = filteredRent.map((r) => {
      const tenant = allTenants.find((t) => Number(t.id) === Number(r.tenantId));
      const room   = rooms.find((rm) => Number(rm.id) === Number(tenant?.roomId));
      return {
        Tenant:     tenant?.name || "N/A",
        RoomNumber: room?.roomNumber ?? "N/A",
        Total:      Math.round(r.totalAmount ?? 0),
        Collected:  Math.round(getCollected(r)),
        Pending:    Math.round(getPending(r)),
        Status:     r.paymentStatus,
        Month:      MONTHS[selMonth - 1],
        Year:       selYear,
      };
    });
    const header = Object.keys(rows[0]).join(",");
    const csv    = [header, ...rows.map((row) => Object.values(row).join(","))].join("\n");
    const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link   = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `rent-report-${selMonth}-${selYear}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive monthly reports
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(selYear)} onValueChange={(v) => setSelYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="rent">Rent ({filteredRent.length})</TabsTrigger>
          <TabsTrigger value="checkedout">Checked Out ({checkedOut.length})</TabsTrigger>
        </TabsList>

        {/* ── Summary Tab ── */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" />EB Overall
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-bold">{totalUnits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-bold">
                    ₹{Math.round(totalCost).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-success" />Rent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-bold text-success">
                    ₹{Math.round(totalRentCollected).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-bold text-destructive">
                    ₹{Math.round(totalRentPending).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Records</span>
                  <span>{filteredRent.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* ── Occupancy card — now uses dashboard API values ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Rooms</span>
                  <span className="font-bold">{totalRoomsDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Beds</span>
                  <span className="font-bold">{totalBedsDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupied Beds</span>
                  <span>{occupiedBedsDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Beds</span>
                  <span>{availableBedsDisplay}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />Tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-bold">
                    {allTenants.filter((t) => t.status === "Active").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Checked Out</span>
                  <span>{checkedOut.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>{allTenants.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Rent Tab ── */}
        <TabsContent value="rent">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rent Report</CardTitle>
              <button
                onClick={downloadRentCSV}
                className="px-3 py-1 text-sm rounded-lg border"
              >
                Download CSV
              </button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRent.map((r, i) => {
                    const tenant = allTenants.find(
                      (t) => Number(t.id) === Number(r.tenantId)
                    );
                    const room = rooms.find(
                      (rm) => Number(rm.id) === Number(tenant?.roomId)
                    );
                    return (
                      <TableRow key={i}>
                        <TableCell>{tenant?.name || "N/A"}</TableCell>
                        <TableCell>{room?.roomNumber ?? "N/A"}</TableCell>
                        <TableCell>
                          ₹{Math.round(r.totalAmount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-emerald-600 font-medium">
                          ₹{Math.round(getCollected(r)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-rose-600 font-medium">
                          ₹{Math.round(getPending(r)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.paymentStatus?.toUpperCase() === "PAID"
                                ? "default"
                                : r.paymentStatus?.toUpperCase() === "PARTIAL"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {r.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredRent.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No rent records for {MONTHS[selMonth - 1]} {selYear}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {filteredRent.length > 0 && (
                <div className="mt-4 pt-3 border-t flex justify-end gap-8 text-sm font-semibold">
                  <span>
                    Collected:{" "}
                    <span className="text-emerald-600">
                      ₹{Math.round(totalRentCollected).toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Pending:{" "}
                    <span className="text-rose-600">
                      ₹{Math.round(totalRentPending).toLocaleString()}
                    </span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Checked Out Tab ── */}
        <TabsContent value="checkedout">
          <Card>
            <CardHeader>
              <CardTitle>Checked Out Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedOut.map((t, i) => {
                    const room = rooms.find(
                      (r) => Number(r.id) === Number(t.roomId)
                    );
                    return (
                      <TableRow key={i}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>{room?.roomNumber ?? "N/A"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {checkedOut.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-muted-foreground py-8"
                      >
                        No checked-out tenants
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;