import { useEffect, useState } from "react";
import {
  getRooms,
  getActiveTenants,
  getCheckoutSummary,
  checkoutTenant,
  addEBReading,
  getUserRole,
  getTenantWiseEBBill,
  getEBReadings,
  updateBedStatus
} from "@/lib/store";
import { Room, Tenant, Rent, DEFAULT_EB_RATE } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { LogOut, Search } from "lucide-react";

const MAINTENANCE_CHARGE = 1000;

const CheckoutPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [finalPrev, setFinalPrev] = useState<string>("");
  const [finalCurr, setFinalCurr] = useState<string>("");
  const [tenantEBDue, setTenantEBDue] = useState<number>(0);
  const [extraDays, setExtraDays] = useState<string>("");

  const [useManualRent, setUseManualRent] = useState(false);
  const [rentPerDay, setRentPerDay] = useState<string>("");

  const [summary, setSummary] = useState<{
  pendingRents: Rent[];
  totalRentDue: number;
  advancePaid: number;
} | null>(null);

  const role = getUserRole();
  
  // -------------------- Load Rooms & Tenants --------------------
const reload = async () => {
  try {
    const [fetchedRooms, fetchedTenants] = await Promise.all([
      getRooms(0, 1000),
      getActiveTenants()
    ]);

    setRooms(fetchedRooms);
    setTenants(fetchedTenants ?? []);
  } catch (err) {
    console.error("Reload error:", err);
    toast.error("Failed to load rooms or tenants");
  }
};

  useEffect(() => {
    reload();
  }, []);

  // -------------------- Select Tenant --------------------
  const handleSelectTenant = async (tenantId: string) => {
  try {
    setSelectedTenantId(tenantId);
    setSummary(null);
    setTenantEBDue(0);

    const numericTenantId = Number(tenantId);

    const selected = tenants.find(
      (t) => Number(t.id) === numericTenantId
    );
    if (!selected) return;


    /* ---------------- LAST EB READING ---------------- */
const readings = await getEBReadings();

const roomReadings = readings
  .filter((r) => Number(r.roomId) === Number(selected.roomId))
  .sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

if (roomReadings.length > 0) {
  const lastReading = roomReadings[0];
  setFinalPrev(String(lastReading.currentReading));
}

    /* ---------------- RENT SUMMARY ---------------- */
    const checkout = await getCheckoutSummary(numericTenantId);

      if (checkout) {

        const rents = checkout.pendingRents ?? [];

        // Only rents that are not PAID
        const unpaidRents = rents.filter(r => r.paymentStatus !== "PAID");

        const totalRentDue = unpaidRents.reduce(
          (sum, r) => sum + (r.rentAmount ?? 0),
          0
        );

        const totalEBDue = unpaidRents.reduce(
          (sum, r) => sum + (r.ebAmount ?? 0),
          0
        );

        setSummary({
          pendingRents: unpaidRents,
          totalRentDue,
          advancePaid: checkout.advancePaid ?? 0,
        });

        setTenantEBDue(totalEBDue);
      }

      
    /* ---------------- TENANT-WISE EB ---------------- */
          const room = rooms.find(
            (r) => Number(r.id) === Number(selected.roomId)
          );

          if (!room?.roomNumber) {
            console.warn("Room not found for tenant");
            return;
          }

          const ebBills = await getTenantWiseEBBill(room.roomNumber);

          const tenantBill = ebBills.find(
            (bill) => Number(bill.tenantId) === numericTenantId
          );

          setTenantEBDue(tenantBill?.amount ?? 0);
// Only apply tenant-wise EB if pending rent exists
if ((checkout?.pendingRents ?? []).some(r => r.paymentStatus !== "PAID")) {
  setTenantEBDue(tenantBill?.amount ?? 0);
} else {
  setTenantEBDue(0);
}


  } catch (error) {
    console.error("Checkout fetch error:", error);
    toast.error("Failed to fetch checkout data");
  }
};

    const selectedTenant = tenants.find(
    (t) => Number(t.id) === Number(selectedTenantId)
  );

  const roomTenants = tenants.filter(
    (t) => Number(t.roomId) === Number(selectedTenant?.roomId)
  );

  const selectedRoom = selectedTenant
    ? rooms.find((r) => Number(r.id) === Number(selectedTenant.roomId))
    : null;


    const dateForCalc = checkOutDate ? new Date(checkOutDate) : new Date();

  const daysInMonth = new Date(
    dateForCalc.getFullYear(),
    dateForCalc.getMonth() + 1,
    0
  ).getDate();

    const extraRent =
      selectedTenant && extraDays
        ? useManualRent
          ? Number(extraDays) * Number(rentPerDay || 0)
          : Math.round(
              (selectedTenant.monthlyRent / daysInMonth) * Number(extraDays)
            )
        : 0;

    const finalEBUnits =
  finalPrev && finalCurr && Number(finalCurr) >= Number(finalPrev)
    ? Number(finalCurr) - Number(finalPrev)
    : 0;

const totalEBAmount = finalEBUnits * DEFAULT_EB_RATE;

const finalEBAmount =
  roomTenants.length > 0
    ? totalEBAmount / roomTenants.length
    : totalEBAmount;

const calculatedNetPayable =
  summary
    ? summary.totalRentDue +
      extraRent +
      tenantEBDue +
      finalEBAmount +
      MAINTENANCE_CHARGE -
      summary.advancePaid
    : 0;


const filteredTenants = tenants.filter(
  (t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search)
);

      const printCheckoutReceipt = () => {
        if (!selectedTenant || !summary) return;

        const roomNumber = selectedRoom?.roomNumber ?? "-";

        const printWindow = window.open("", "_blank");

        if (!printWindow) return;

        printWindow.document.write(`
          <html>
            <head>
              <title>Checkout Receipt</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  color: #000;
                }

                h2 {
                  text-align: center;
                  margin-bottom: 5px;
                }

                .section {
                  margin-top: 20px;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
                }

                td, th {
                  border: 1px solid #000;
                  padding: 8px;
                  text-align: left;
                }

                .right {
                  text-align: right;
                }

                .total {
                  font-weight: bold;
                  font-size: 16px;
                }
              </style>
            </head>

            <body>

              <h2>Tenant Check-Out Receipt</h2>
              <p style="text-align:center">
                Date: ${new Date().toLocaleDateString()}
              </p>

              <div class="section">
                <h3>Tenant Details</h3>
                <table>
                  <tr><td>Name</td><td>${selectedTenant.name}</td></tr>
                  <tr><td>Room</td><td>${roomNumber}</td></tr>
                  <tr><td>Phone</td><td>${selectedTenant.phone}</td></tr>
                  <tr><td>Check-in Date</td><td>${selectedTenant.checkInDate}</td></tr>
                </table>
              </div>

              <div class="section">
                <h3>Settlement Summary</h3>
                <table>
                  <tr>
                    <td>Pending Rent</td>
                    <td class="right">₹${summary.totalRentDue.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td>Pending EB</td>
                    <td class="right">₹${tenantEBDue.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td>Extra Rent</td>
                    <td class="right">₹${extraRent.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td>Extra EB</td>
                    <td class="right">₹${finalEBAmount.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td>Maintenance</td>
                    <td class="right">₹${MAINTENANCE_CHARGE.toLocaleString()}</td>
                  </tr>

                  <tr>
                    <td>Advance Paid</td>
                    <td class="right">₹${summary.advancePaid.toLocaleString()}</td>
                  </tr>

                  <tr class="total">
                    <td>${
                      calculatedNetPayable > 0
                        ? "Balance to Pay"
                        : "Refund Due"
                    }</td>
                    <td class="right">
                      ₹${Math.abs(calculatedNetPayable).toLocaleString()}
                    </td>
                  </tr>
                </table>
              </div>

              <br/><br/>
              <p>Signature: ________________________</p>

              <script>
                window.onload = function () {
                  window.print();
                  window.close();
                };
              </script>

            </body>
          </html>
        `);

        printWindow.document.close();
      };

  // -------------------- Confirm Checkout --------------------
  const handleConfirmCheckout = async () => {

  if (!selectedTenant) {
    toast.error("Select tenant");
    return;
  }

  const today = new Date().toISOString().split("T")[0]; 
  

  try {
    // -------------------- Optional Final EB Reading --------------------
    if (finalPrev && finalCurr) {
      await addEBReading({
        roomId: selectedTenant.roomId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        previousReading: Number(finalPrev),
        currentReading: Number(finalCurr),
        ebRate: DEFAULT_EB_RATE,
      });
    }

    if (!selectedTenant.id) {
      throw new Error("Selected tenant has no valid ID");
    }

    // -------------------- Checkout Tenant --------------------
    await checkoutTenant(
        selectedTenant.id,
        finalCurr ? Number(finalCurr) : null
      );

    // ====================  IMPORTANT PART ====================
    // Free the bed after checkout
    if (selectedTenant.bedId) {
      await updateBedStatus(Number(selectedTenant.bedId), false);
    }
    // ===========================================================

    
    toast.success(`${selectedTenant.name} checked out successfully`);

    printCheckoutReceipt();

    // Reset state
    setSelectedTenantId("");
    setCheckOutDate("");
    setFinalPrev("");
    setFinalCurr("");
    setSummary(null);
    setConfirmOpen(false);

    await reload();
  } catch (err: any) {
    toast.error(err.message ?? "Checkout failed");
  }
};

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tenant Check-Out</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controlled checkout with settlement summary
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Tenant selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Select Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {filteredTenants.map((t) => {
                  const room = rooms.find((r) => Number(r.id) === Number(t.roomId));
                  return (
                    <button
                      key={t.id.toString()} // JSX keys must be string
                      onClick={() => handleSelectTenant(t.id.toString())} // convert to string for state
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        Number(selectedTenantId) === Number(t.id)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium">{t.name}</div>
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

        {/* Right — Settlement */}
        <div className="lg:col-span-2">
          {!selectedTenant ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a tenant to proceed with checkout
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Tenant Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Tenant Info</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                  {[
                    ["Name", selectedTenant.name],
                    ["Room", selectedRoom?.roomNumber ?? "—"],
                    ["Phone", selectedTenant.phone],
                    ["Check-in", selectedTenant.checkInDate],
                    ["Monthly Rent", `₹${selectedTenant.monthlyRent}`],
                    ["Advance Paid", `₹${selectedTenant.advance}`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Final EB Reading */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Final EB Reading</CardTitle>
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
                  </div>
                  {finalPrev && finalCurr && Number(finalCurr) >= Number(finalPrev) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Units: {Number(finalCurr) - Number(finalPrev)} · Amount: ₹
                      {((Number(finalCurr) - Number(finalPrev)) * DEFAULT_EB_RATE).toLocaleString()} ({roomTenants.length} tenants)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Settlement Summary */}
              {summary && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Settlement Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Rent Records</span>
                      <span className="font-medium">{summary.pendingRents?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Pending Rent Due</span>
                      <span className="font-medium">
                        ₹{summary.totalRentDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Pending EB Due</span>
                      <span className="font-medium">
                        ₹{tenantEBDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maintenance</span>
                      <span className="font-medium">
                        ₹{MAINTENANCE_CHARGE.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs">Extra Rent Days</Label>

                      <Input
                        type="number"
                        placeholder="Enter extra days"
                        value={extraDays}
                        onChange={(e) => setExtraDays(e.target.value)}
                      />

                      {/* Auto Calculation */}
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={!useManualRent}
                          onChange={() => setUseManualRent(false)}
                        />
                        <span className="text-xs">Auto Calculate</span>
                      </div>

                      {/* Manual Calculation */}
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={useManualRent}
                          onChange={() => setUseManualRent(true)}
                        />
                        <span className="text-xs">Manual Rent Per Day</span>
                      </div>

                      {/* Manual Input */}
                      {useManualRent && (
                        <div className="grid gap-1">
                          <Label className="text-xs">Rent Per Day</Label>
                          <Input
                            type="number"
                            placeholder="Enter rent per day"
                            value={rentPerDay}
                            onChange={(e) => setRentPerDay(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Result */}
                        {extraDays && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Extra Rent</span>
                            <span className="font-medium">
                              ₹{extraRent.toLocaleString()}
                            </span>
                          </div>
                        )}
                    </div>


                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                      Extra EB Value
                      </span>
                      <span className="font-medium">
                        ₹{finalEBAmount.toLocaleString()}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Advance Paid</span>
                      <span className="font-medium text-success">
                        ₹{summary.advancePaid.toLocaleString()}
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
                        ₹{Math.abs(calculatedNetPayable).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Checkout */}
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
                            Are you sure you want to check out {selectedTenant.name} from room{" "}
                            {selectedRoom?.roomNumber}? This will mark the tenant as Checked-Out and free up the bed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleConfirmCheckout}>
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