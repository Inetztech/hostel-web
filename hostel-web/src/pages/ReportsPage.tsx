import { useEffect, useState } from "react";
import {
  getRooms,
  getBeds,
  getEBReadings,
  getActiveTenantsByRoom,
  getTenantWiseEBBill,
  getRents,
  getTenants,
} from "@/lib/store";
import {
  Room,
  Bed,
  EBReading,
  TenantEBBill,
  Rent,
  Tenant,
  MONTHS,
  RoomReport,
  MemberReport,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Zap, IndianRupee, Building2, Users } from "lucide-react";

const ReportsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [readings, setReadings] = useState<EBReading[]>([]);
  const [rents, setRents] = useState<Rent[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [tenantBills, setTenantBills] = useState<TenantEBBill[]>([]);
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  // Loading data properly with async/await
  useEffect(() => {
  const fetchData = async () => {

    const roomsData = await getRooms(0,1000);
    const bedsData = await getBeds(0,1000);
    const readingsData = await getEBReadings(0,1000);
    const rentsData = await getRents(0,1000);
    const tenantsData = await getTenants(0,1000);
    setRooms(roomsData);
    setBeds(bedsData);
    setReadings(readingsData);
    setRents(rentsData);
    setAllTenants(tenantsData);

    let allBills: TenantEBBill[] = [];

    for (const room of roomsData) {
      const bills = await getTenantWiseEBBill(room.roomNumber);
      allBills = [...allBills, ...bills];
    }

    setTenantBills(allBills);
  };

  fetchData();
}, []);

  // Filter EB and Rent by selected month/year
  const filteredEB = readings.filter(r => r.month === selMonth && r.year === selYear);
  const filteredRent = rents.filter(r => r.rentMonth === selMonth && r.rentYear === selYear);

  // Room-wise EB report
  const roomReports: RoomReport[] = filteredEB
  .map(r => {
    const room = rooms.find(
      rm => Number(rm.id) === Number(r.roomId)
    );
    if (!room) return null;

    const rBeds = beds.filter(
      b => Number(b.roomId) === Number(room.id)
    );

    return {
      roomNumber: room.roomNumber,
      hostelType: room.hostelType,
      previousReading: r.previousReading,
      currentReading: r.currentReading,
      unitsConsumed: r.unitsConsumed,
      totalEBAmount: r.ebAmount,
      totalBeds: rBeds.length,
      occupiedBeds: rBeds.filter(b => b.isOccupied).length,
      availableBeds: rBeds.filter(b => !b.isOccupied).length,
    };
  })
  .filter(Boolean) as RoomReport[];

  // Member-wise EB report
  const memberReports: MemberReport[] = tenantBills.map(bill => {
  const tenant = allTenants.find(
    t => Number(t.id) === Number(bill.tenantId)
  );

  const room = rooms.find(
    r => Number(r.id) === Number(tenant?.roomId)
  );

  return {
    tenantName: bill.tenantName,
    roomNumber: room?.roomNumber ?? "N/A",
    individualEBAmount: bill.amount,
    month: selMonth,
    year: selYear,
  };
});

  // Summaries
  const totalUnits = roomReports.reduce((s, r) => s + r.unitsConsumed, 0);
  const totalEBCost = roomReports.reduce((s, r) => s + r.totalEBAmount, 0);
  const boysReports = roomReports.filter(r => r.hostelType === "Boys");
  const girlsReports = roomReports.filter(r => r.hostelType === "Girls");
  const occupiedBeds = beds.filter(b => b.isOccupied).length;
  const availableBeds = beds.filter(b => !b.isOccupied).length;
  const totalRentCollected = filteredRent.filter(r => r.paymentStatus?.toUpperCase() === "PAID").reduce((s, r) => s + r.totalAmount, 0);
  const totalRentPending = filteredRent.filter(r => r.paymentStatus?.toUpperCase() !== "PAID").reduce((s, r) => s + r.totalAmount, 0);
  const checkedOut = allTenants.filter(t => t.status === "Checked_Out");

  const years = [2024, 2025, 2026, 2027, 2028];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Comprehensive monthly reports</p>
      </div>

      {/* Month & Year Selection */}
      <div className="flex items-center gap-3 mb-6">
        <Select value={String(selMonth)} onValueChange={v => setSelMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(selYear)} onValueChange={v => setSelYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="rent">Rent ({filteredRent.length})</TabsTrigger>
          <TabsTrigger value="checkedout">Checked Out ({checkedOut.length})</TabsTrigger>
        </TabsList>

        {/* SUMMARY TAB */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* EB Overall */}
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
                  <span className="font-bold">₹{totalEBCost.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boys Units</span>
                  <span>{boysReports.reduce((s, r) => s + r.unitsConsumed, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Girls Units</span>
                  <span>{girlsReports.reduce((s, r) => s + r.unitsConsumed, 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Rent */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-success" />Rent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-bold text-success">₹{totalRentCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-bold text-destructive">₹{totalRentPending.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Records</span>
                  <span>{filteredRent.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Rooms</span><span className="font-bold">{rooms.length}</span></div>
                <div className="flex justify-between"><span>Occupied Beds</span><span>{occupiedBeds}</span></div>
                <div className="flex justify-between"><span>Available Beds</span><span>{availableBeds}</span></div>
              </CardContent>
            </Card>

            {/* Tenants */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />Tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-bold">{allTenants.filter(t => t.status === "Active").length}</span>
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


      <TabsContent value="rent">
        <Card>
          <CardHeader>
            <CardTitle>Rent Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRent.map((r, i) => {
                  const tenant = allTenants.find(t => Number(t.id) === Number(r.tenantId));
                  return (
                    <TableRow key={i}>
                      <TableCell>{tenant?.name || "N/A"}</TableCell>
                      <TableCell>₹{r.totalAmount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.paymentStatus?.toUpperCase() === "PAID"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {r.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

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
                    r => Number(r.id) === Number(t.roomId)
                  );

                  return (
                    <TableRow key={i}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{room?.roomNumber ?? "N/A"}</TableCell>
                    </TableRow>
                  );
                })}
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