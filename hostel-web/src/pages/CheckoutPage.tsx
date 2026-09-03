import { useEffect, useState, useRef, useMemo } from "react";
import {
  getRooms,
  getTenants,
  getCheckoutSummary,
  checkoutTenant,
  addEBReading,
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
  // NEW: branches now come straight from the /units endpoint (getBranches),
  // not inferred from whatever rooms happen to be loaded. See branchOptions
  // below for why this matters.
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
      // FIX: branches are now fetched from their own endpoint (GET /units
      // via getBranches) instead of being derived from the rooms list.
      // Deriving from rooms meant any branch with zero rooms currently
      // provisioned (a newly created branch, or one that's been fully
      // vacated) would silently disappear from the "Select Branch"
      // dropdown, which is why only a handful of branches were showing
      // up even though more existed.
      const [roomList, allTenantList, allBranches] = await Promise.all([
        fetchAllPages<Room>(getRooms, 10),
        fetchAllPages<Tenant>(getTenants, 10),
        fetchAllPages<Branch>(getBranches, 10),
      ]);

      const activeTenants = allTenantList.filter((t) => t.status === "Active");

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

  // FIX: branchOptions now comes straight from the branches state (loaded
  // via getBranches/GET /units), not from `rooms`. This is the actual fix
  // for "only 5 branches showing" — every branch that exists shows up
  // here regardless of whether it currently has any rooms assigned.
  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        name: b.unitName || `Branch ${b.id}`,
      })),
    [branches]
  );

  // Warden/Tenant's own branch name, for the locked read-only label.
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

      const numericTenantId = Number(tenantId);
      const selected = tenants.find((t) => Number(t.id) === numericTenantId);
      if (!selected) return;

      const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
      const isAcRoom = room?.hostelType === "AC";

      const allReadings = await fetchAllPages<EBReading>(getEBReadings, 500);

      if (isAcRoom) {
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

      const roomReadings = allReadings
        .filter((r) => Number(r.roomId) === Number(selected.roomId))
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

      setFinalPrev(
        roomReadings.length > 0
          ? String(roomReadings[0].currentReading)
          : String(selected.joinReading ?? 0)
      );

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
      // Fallback summary initialized so panel doesn't stay hidden
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

  const flatTenants = selectedRoom?.flatId
    ? tenants.filter((t) => {
        const tenantRoom = rooms.find(
          (r) => Number(r.id) === Number(t.roomId)
        );
        return (
          tenantRoom &&
          Number(tenantRoom.flatId) === Number(selectedRoom.flatId)
        );
      })
    : [];

  const roomTenants =
    flatTenants.length > 0
      ? flatTenants
      : tenants.filter(
          (t) => Number(t.roomId) === Number(selectedTenant?.roomId)
        );

  const isAcRoom = selectedRoom?.hostelType === "AC";

  const dateForCalc  = checkOutDate ? new Date(checkOutDate) : new Date();
  const daysInMonth  = new Date(
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

  const appliedEBRate  = Number(ebRate || DEFAULT_EB_RATE || 13);
  const totalEBAmount  = finalEBUnits * appliedEBRate;
  const finalEBAmount  =
    roomTenants.length > 0 ? totalEBAmount / roomTenants.length : totalEBAmount;

  const calculatedNetPayable = summary
    ? summary.totalRentDue +
      tenantEBDue +
      extraRent +
      finalEBAmount +
      maintenanceCharge -
      summary.advancePaid
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
      try {
        const room = rooms.find(
          (r) => Number(r.id) === Number(selectedTenant.roomId)
        );

        if (room?.flatId) {
          const flatRooms = rooms.filter(
            (r) => Number(r.flatId) === Number(room.flatId)
          );
          for (const flatRoom of flatRooms) {
            await addEBReading({
              roomId:             flatRoom.id,
              flatId:             Number(room.flatId),
              month:              new Date().getMonth() + 1,
              year:               new Date().getFullYear(),
              previousReading:    Number(finalPrev) || 0,
              currentReading:     Number(finalCurr),
              acPreviousReading: isAcRoom && acPrev ? Number(acPrev) : 0,
              acCurrentReading:  isAcRoom && acCurr ? Number(acCurr) : 0,
              ebRate:             appliedEBRate,
              isCheckout:         true,
            });
          }
        } else {
          await addEBReading({
            roomId:             selectedTenant.roomId,
            flatId:             undefined,
            month:              new Date().getMonth() + 1,
            year:               new Date().getFullYear(),
            previousReading:    Number(finalPrev) || 0,
            currentReading:     Number(finalCurr),
            acPreviousReading: isAcRoom && acPrev ? Number(acPrev) : 0,
            acCurrentReading:  isAcRoom && acCurr ? Number(acCurr) : 0,
            ebRate:             appliedEBRate,
            isCheckout:         true,
          });
        }

        toast.success("EB Reading saved");
      } catch (ebErr: any) {
        console.error("EB Reading save failed:", ebErr);
        toast.error(
          "Failed to save EB reading: " + (ebErr.message ?? "Unknown error")
        );
        return;
      }

      if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

      await checkoutTenant(
        selectedTenant.id,
        finalCurr ? Number(finalCurr) : null,
        isAcRoom && acCurr ? Number(acCurr) : null
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
                // Warden/Tenant are always scoped to their own branch —
                // no dropdown, no "All Branches" option, just a locked label.
                <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  {ownBranchName}
                </div>
              )}

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
                    ["Monthly Rent", `₹${selectedTenant.monthlyRent}`],
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
                  {finalPrev &&
                    finalCurr &&
                    Number(finalCurr) >= Number(finalPrev) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Units: {Number(finalCurr) - Number(finalPrev)} · Amount:
                        ₹{(
                          (Number(finalCurr) - Number(finalPrev)) * appliedEBRate
                        ).toLocaleString()}{" "}
                        (
                        {selectedRoom?.flatId
                          ? `${roomTenants.length} flat tenants`
                          : `${roomTenants.length} room tenants`}
                        )
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
                    <Label className="text-xs">Extra Rent Days</Label>
                    <Input
                      type="number"
                      placeholder="Enter extra days"
                      value={extraDays}
                      onChange={(e) => setExtraDays(e.target.value)}
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!useManualRent}
                        onChange={() => setUseManualRent(false)}
                      />
                      <span className="text-xs">Auto Calculate</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={useManualRent}
                        onChange={() => setUseManualRent(true)}
                      />
                      <span className="text-xs">Manual Rent Per Day</span>
                    </div>

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

                    {extraDays && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extra Rent</span>
                        <span className="font-medium">
                          ₹{Math.round(extraRent).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra EB Value</span>
                    <span className="font-medium">
                      ₹{Math.round(finalEBAmount).toLocaleString()}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advance Paid</span>
                    <span className="font-medium text-success">
                      ₹{(summary?.advancePaid ?? selectedTenant.advance ?? 0).toLocaleString()}
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