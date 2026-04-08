import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getRooms,
  getEBReadings,
  addEBReading,
  deleteEBReading,
  getTenantWiseEBBill,
  sendEBBillWhatsApp,
  getUserRole,
  getTenants,
} from "@/lib/store";

import { Room, EBReading, EBStatus, Tenant } from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { Plus, Trash2, Eye } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";

const EBReadingsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<EBReading[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantRows, setTenantRows] = useState<any[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [manualRate, setManualRate] = useState<number | "">(13);
  const [manualMode, setManualMode] = useState(false);
  const rateValue = typeof manualRate === "number" ? manualRate : 13;
  

  const [tenantBills, setTenantBills] = useState<any[]>([]);
  const [billRoom, setBillRoom] = useState("");

  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});
  

  const [formRoomId, setFormRoomId] = useState("");
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcUnits, setFormAcUnits] = useState("");


  const role = getUserRole()?.toUpperCase();
  const hasAccess = true;


  const selMonth = new Date().getMonth() + 1;
  const selYear = new Date().getFullYear();

  /* -------- RATE RESOLVER (SINGLE SOURCE OF TRUTH) -------- */
const getRateForRoom = (roomId: string | number) => {
  const roomRate = roomManualRates[String(roomId)];

  if (manualMode && roomRate !== undefined) {
    return roomRate;
  }

  if (typeof manualRate === "number") {
    return manualRate;
  }

  return 13;
};

  /* LOAD DATA */
  const reload = async () => {

  const [roomData, readingData, tenantData] = await Promise.all([
    getRooms(0,1000),
    getEBReadings(0,1000),
    getTenants(0,1000),
  ]);

  setRooms(roomData);
  setReadings(readingData);
  setTenants(tenantData);
};

  useEffect(() => {
    reload();
  }, []);


  const calculateTenantShareProportional = (
  previousReading: number,
  currentReading: number,
  tenants: Tenant[],
  rate: number
) => {
  const totalRoomUnits = currentReading - previousReading;

  if (totalRoomUnits <= 0) return tenants.map(t => ({ ...t, units: 0, amount: 0 }));

  // Calculate each tenant's individual units (difference from their join reading)
  const tenantUnitsRaw = tenants.map(t => {
    const join = Number(t.joinReading || previousReading);
    return currentReading - join > 0 ? currentReading - join : 0;
  });

  const totalRawUnits = tenantUnitsRaw.reduce((a, b) => a + b, 0);

  // Proportional allocation
  return tenants.map((t, i) => {
    const units = +(tenantUnitsRaw[i] / totalRawUnits * totalRoomUnits).toFixed(2);
    const amount = +(units * rate).toFixed(2);
    return { ...t, units, amount };
  });
};

  /* ROOM MAP */
  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach((r) => (map[String(r.id)] = r.roomNumber));
    return map;
  }, [rooms]);

  /* FILTER MONTH */
  const filteredReadings = useMemo(
    () => readings.filter((r) => r.month === selMonth && r.year === selYear),
    [readings]
  );

  // calculate EB amount based on manual or automatic mode
    const calculateEBAmount = (units: number, roomId: string | number) => {
    const rate = getRateForRoom(roomId);
    return +(units * rate).toFixed(2);
    };

// split total EB among tenants equally
const calculateTenantShare = (totalAmount: number, tenants: any[]) => {
  const totalTenants = tenants.length;
  return tenants.map((t) => ({
    ...t,
    amount: +(totalAmount / totalTenants).toFixed(2),
  }));
};

  /* TOTALS */
  const totalUnits = filteredReadings.reduce(
    (s, r) => s + (r.unitsConsumed ?? 0),
    0
  );

  const totalCost = filteredReadings.reduce(
    (s, r) => s + (r.ebAmount ?? 0),
    0
  );

      const getRoomStartingReading = useCallback(
      (roomId: string | number) => {
        /* last EB reading */
        const lastReading = readings
          .filter((r) => String(r.roomId) === String(roomId))
          .sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
          })[0];

        if (lastReading) {
          return lastReading.currentReading;
        }

        /* MIN join reading of tenants */
        const roomTenants = tenants.filter(
          (t) => String(t.roomId) === String(roomId)
        );

        if (roomTenants.length === 0) return 0;

        return Math.min(
          ...roomTenants.map((t) => Number(t.joinReading ?? 0))
        );
      },
      [readings, tenants]
    );

      /* BUILD TENANT ROWS */
      useEffect(() => {
        const buildTenantRows = async () => {
          if (filteredReadings.length === 0) {
            setTenantRows([]);
            return;
          }

          const roomNumbers = [
            ...new Set(filteredReadings.map((r) => roomMap[r.roomId])),
          ];

          const billResults = await Promise.all(
            roomNumbers.map((rn) => getTenantWiseEBBill(rn))
          );

          const billMap: Record<string, any[]> = {};
          roomNumbers.forEach((rn, i) => {
            billMap[rn] = billResults[i] || [];
          });

          const rows: any[] = [];

          filteredReadings.forEach((r) => {
            const roomNumber = roomMap[r.roomId];
            const bills = billMap[roomNumber];

            bills?.forEach((b: any) => {
              rows.push({
                ...r,
                tenantName: b.tenantName || b.name,
                tenantAmount: Number(b.amount ?? b.tenantAmount ?? 0),
              });
            });
          });

          setTenantRows(rows);
        };

        buildTenantRows();
      }, [filteredReadings, roomMap]);


      /* STATUS COLOR */
      const statusColor = (s: EBStatus) =>
        s === "Paid"
          ? "border-success text-success"
          : s === "Billed"
          ? "border-info text-info"
          : "border-warning text-warning";

          /* AUTO PREVIOUS */
          useEffect(() => {
          if (!formRoomId) return;

          const prev = getRoomStartingReading(formRoomId);
          setFormPrevReading(String(prev));

        }, [formRoomId, getRoomStartingReading]);

      useEffect(() => {
      if (!bulkOpen) return;

      const rows = rooms.map((room) => ({
        roomId: room.id,
        roomNumber: room.roomNumber,
        previousReading: getRoomStartingReading(room.id),
        currentReading: "",
        acUnits: "",
      }));

      setBulkRows(rows);
    }, [bulkOpen, rooms, getRoomStartingReading]);

    

  /* ADD READING */
  const handleAdd = async () => {
  if (!formRoomId || !formPrevReading || !formCurrReading)
    return toast.error("Fill all fields");

  if (+formCurrReading < +formPrevReading)
    return toast.error("Current reading cannot be less");

  const selectedRoomId = Number(formRoomId);
  const units = Number(formCurrReading) - Number(formPrevReading);

  const rateForRoom = roomManualRates[formRoomId?.toString() || ""];

  const ebAmount = calculateEBAmount(units, selectedRoomId);

  await addEBReading({
    roomId: selectedRoomId,
    month: selMonth,
    year: selYear,
    acUnits: Number(formAcUnits || 0),
    previousReading: Number(formPrevReading),
    currentReading: Number(formCurrReading),
    ebAmount,
    ebRate: getRateForRoom(selectedRoomId),
  });

  toast.success("Reading added");

  setAddOpen(false);
  setFormRoomId("");
  setFormPrevReading("");
  setFormCurrReading("");
  setFormAcUnits("");

  reload();
};

  const handleBulkChange = (roomId: string, value: string) => {
  setBulkRows((prev) =>
    prev.map((r) =>
      r.roomId === roomId ? { ...r, currentReading: value } : r
    )
  );
};

const handleBulkACChange = (roomId: string, value: string) => {
  setBulkRows(prev =>
    prev.map(r =>
      r.roomId === roomId ? { ...r, acUnits: value } : r
    )
  );
};

    /* -------------- WhatsApp Send Handle (Backend builds message) -------------- */
const handleSendWhatsApp = async (roomId: string) => {
  try {
    const roomNumber = roomMap[roomId];

    if (!roomNumber) {
      toast.error("Room not found");
      return;
    }

    // Call backend directly, backend will fetch tenants and reading, build message
    try {
      await sendEBBillWhatsApp(roomNumber);
      toast.success("WhatsApp sent successfully");
    } catch (backendError: any) {
      console.error("Backend error:", backendError);

      // check for Twilio sandbox specific error
      const msg = backendError?.response?.data?.error || backendError.message || "";
      if (msg.includes("Channel not found")) {
        toast.error(
          "Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox."
        );
      } else {
        toast.error("Failed to send WhatsApp: " + msg);
      }
    }
  } catch (e) {
    console.error("Unexpected error:", e);
    toast.error("Unexpected error occurred while sending WhatsApp");
  }
};

const handleBulkSave = async () => {
  try {
    for (const row of bulkRows) {
      if (!row.currentReading) continue;

      if (+row.currentReading < +row.previousReading) {
        toast.error(`Invalid reading for Room ${row.roomNumber}`);
        return;
      }

      const units = Number(row.currentReading) - Number(row.previousReading);
      
      const rateForRoom = roomManualRates[row.roomId];

      const ebAmount = calculateEBAmount(units, row.roomId);

      await addEBReading({
        roomId: row.roomId,
        month: selMonth,
        year: selYear,
        previousReading: Number(row.previousReading),
        currentReading: Number(row.currentReading),
        acUnits: Number(row.acUnits || 0),
        ebAmount,
        ebRate: getRateForRoom(row.roomId),
      });
    }

    toast.success("Bulk readings saved");
    setBulkOpen(false);
    reload();
  } catch {
    toast.error("Failed to save readings");
  }
};

  /* DELETE */
  const handleDelete = async (id: string) => {
    await deleteEBReading(id);
    toast.success("Deleted");
    reload();
  };

  const handleViewBill = async (roomId: string) => {
  const roomNumber = roomMap[roomId];
  if (!roomNumber) return toast.error("Room not found");

  const reading = filteredReadings.find(
    (r) => String(r.roomId) === String(roomId)
  );

  if (!reading) return toast.error("Reading not found");

  // fetch already calculated tenant bills
  const bills = await getTenantWiseEBBill(roomNumber);

  setTenantBills(bills);
  setBillRoom(roomNumber);
  setBillOpen(true);
};

  /* AGGRID */
  const columns: ColDef[] = useMemo(
  () => [
    {
      headerName: "Room",
      field: "roomId",
      flex: 1,
      valueGetter: (p) => roomMap[p.data.roomId] ?? "-",
    },
    { headerName: "Tenant", field: "tenantName", flex: 1 },
    { headerName: "Previous", field: "previousReading", flex: 1 },
    { headerName: "Current", field: "currentReading", flex: 1 },
    { headerName: "Units", field: "unitsConsumed", flex: 1 },
    {
  headerName: "Tenant Amount",
  field: "tenantAmount",
  flex: 1,
  valueGetter: (p) => {
    // Use saved tenantAmount if present
    if (p.data.tenantAmount !== undefined && p.data.tenantAmount !== null) {
      return Number(p.data.tenantAmount);
    }

    // Otherwise, calculate for manual rooms
    const rateForRoom = roomManualRates[String(p.data.roomId)];
    if (rateForRoom !== undefined) {
      const roomTenants = tenants.filter(
        (t) => String(t.roomId) === String(p.data.roomId)
      );

      const result = calculateTenantShareProportional(
        Number(p.data.previousReading),
        Number(p.data.currentReading),
        roomTenants,
        rateForRoom
      );

      const tenant = result.find((r) => r.name === p.data.tenantName);
      return tenant?.amount || 0;
    }

    return Number(p.data.tenantAmount ?? 0);
  },
  valueFormatter: (p) => `₹${Number(p.value).toFixed(2)}`,
},
    {
      headerName: "Actions",
      flex: 1,
      cellRenderer: (p: any) => (
        <div className="flex gap-2">
          {/* VIEW BILL */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleViewBill(p.data.roomId)}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* WHATSAPP */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSendWhatsApp(p.data.roomId)}
          >
            📲
          </Button>

          {/* DELETE (ADMIN ONLY) */}
          {hasAccess && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete EB Reading?
                </AlertDialogTitle>

                <AlertDialogDescription>
                  This action cannot be undone. The electricity reading and
                  calculated tenant bills for this month will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                  <AlertDialogAction
                    onClick={() => handleDelete(p.data.id)}
                    className="bg-destructive text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    }
  ],
  [roomMap, role]
);


  return (
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">EB Readings</h1>
          <p className="text-sm text-muted-foreground">
            Monthly electricity readings
          </p>
        </div>

        {hasAccess  && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reading
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddOpen(true)}>
                  Single Room Reading
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                  Bulk Room Reading
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add EB Reading</DialogTitle>

                  <DialogDescription>
                    Enter the electricity meter readings for this month to calculate tenant EB bills.
                  </DialogDescription>

                </DialogHeader>

                <div className="grid gap-4">
                  <Label>Room</Label>

                  <Select
                    value={formRoomId}
                    onValueChange={setFormRoomId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>

                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.roomNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Previous"
                    value={formPrevReading}
                    readOnly
                  />

                  <Input
                    placeholder="Current"
                    value={formCurrReading}
                    onChange={(e) =>
                      setFormCurrReading(e.target.value)
                    }
                  />

                  <div className="space-y-2">
                  <Label>AC Units (Optional)</Label>
                  <Input
                    type="number"
                    value={formAcUnits}
                    onChange={(e) => setFormAcUnits(e.target.value)}
                    placeholder="Enter AC consumption"
                  />
                </div>

                <div className="flex items-center gap-2 mb-2">
                <Label>Mode:</Label>
                <Button
                  size="sm"
                  variant={manualMode ? "secondary" : "outline"}
                  onClick={() => setManualMode(false)}
                >
                  Automatic
                </Button>
                <Button
                  size="sm"
                  variant={manualMode ? "outline" : "secondary"}
                  onClick={() => setManualMode(true)}
                >
                  Manual
                </Button>
              </div>

           {manualMode && (
          <Input
            type="number"
            value={roomManualRates[formRoomId?.toString() || ""] } 
            onChange={(e) =>
              setRoomManualRates((prev) => ({
                ...prev,
                [formRoomId?.toString() || ""]: Number(e.target.value),
              }))
            }
            placeholder="Enter unit rate"
          />
        )}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>

                  <Button onClick={handleAdd}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <Dialog open={billOpen} onOpenChange={setBillOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>
        EB Bill - Room {billRoom}
      </DialogTitle>

      <DialogDescription>
        Tenant wise electricity bill
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-3 max-h-[400px] overflow-y-auto">

      {tenantBills.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tenant bill found
        </p>
      )}

      {tenantBills.map((bill, i) => (
        <div
          key={i}
          className="flex justify-between border p-3 rounded-lg"
        >
          <div>
            <p className="font-medium">
              {bill.tenantName || bill.name}
            </p>

            <p className="text-sm text-muted-foreground">
              {bill.acUser ? "AC User" : "Non-AC User"}
            </p> 
          </div>

          <div className="font-semibold">
            ₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}
          </div>
        </div>
      ))}

    </div>

    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">
          Close
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>


      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk EB Reading</DialogTitle>
          <DialogDescription>
            Enter current reading for each room
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {bulkRows.map((row) => (
            <div
              key={row.roomId}
              className="grid grid-cols-3 gap-3 items-center"
            >
              <div className="font-medium">Room {row.roomNumber}</div>

              <Input
                value={row.previousReading}
                readOnly
              />

              <Input
                placeholder="Current Reading"
                value={row.currentReading}
                onChange={(e) =>
                  handleBulkChange(row.roomId, e.target.value)
                }
              />

              <div className="space-y-2">
              <Label>AC Units (Optional)</Label>
              <Input
                type="number"
                placeholder="AC Units"
                value={row.acUnits}
                onChange={(e) =>
                  handleBulkACChange(row.roomId, e.target.value)
                }
              />
              </div>
              

              <div className="flex items-center gap-2 mb-2">
              <Label>Mode:</Label>
              <Button
                size="sm"
                variant={manualMode ? "secondary" : "outline"}
                onClick={() => setManualMode(false)}
              >
                Automatic
              </Button>
              <Button
                size="sm"
                variant={manualMode ? "outline" : "secondary"}
                onClick={() => setManualMode(true)}
              >
                Manual
              </Button>
            </div>

            <Input
              type="number"
              value={roomManualRates[row.roomId?.toString() || ""]} 
              onChange={(e) =>
                setRoomManualRates((prev) => ({
                  ...prev,
                  [row.roomId?.toString() || ""]: Number(e.target.value),
                }))
              }
              placeholder="Enter unit rate"
            />
            </div>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button onClick={handleBulkSave}>
            Save All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <div className="flex gap-4 text-sm mb-4">
        <span>{filteredReadings.length} readings</span>
        <span>{totalUnits} units</span>
        <span className="font-bold">₹{totalCost}</span>
      </div>

      <Card>
        <CardContent className="pt-4 px-0">
          <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact
          rowData={tenantRows}
          columnDefs={columns}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10,20,50,100]}
        />
      </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EBReadingsPage;    