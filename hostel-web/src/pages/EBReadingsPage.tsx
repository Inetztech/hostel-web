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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { Plus, Trash2, Eye } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";

const EBReadingsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<EBReading[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantRows, setTenantRows] = useState<any[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const [tenantBills, setTenantBills] = useState<any[]>([]);
  const [billRoom, setBillRoom] = useState("");

  const [bulkRows, setBulkRows] = useState<any[]>([]);

  const [formRoomId, setFormRoomId] = useState("");
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");

  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const role = getUserRole();
  const selMonth = new Date().getMonth() + 1;
  const selYear = new Date().getFullYear();

  /* LOAD DATA */
  const reload = async () => {
  const [roomData, readingData, tenantData] = await Promise.all([
    getRooms(0, 1000),
    getEBReadings(),
    getTenants(),
  ]);

  const roomsArray = Array.isArray(roomData) ? roomData : roomData.content ?? [];
  setRooms(roomsArray);
  setReadings(readingData);
  setTenants(tenantData);
};

  useEffect(() => {
    reload();
  }, []);

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

      /* ------- Build EB Message ------ */
           const buildEBMessage = (
            roomNumber: string,
            reading: EBReading,
            tenantBills: any[]
          ) => {

            const tenantsText = tenantBills
              .map(
                (t) =>
                  `• ${t.tenantName || t.name} : ₹${Number(
                    t.amount ?? t.tenantAmount ?? 0
                  ).toFixed(0)}`
              )
              .join("\n");

            return `*EB BILL DETAILS*

          🏠 Room : ${roomNumber}

          📊 Reading Details
          ---------------------------
          Previous : ${reading.previousReading}
          Current  : ${reading.currentReading}
          Units    : ${reading.unitsConsumed}

          💰 Total EB Amount : ₹${reading.ebAmount}

          👥 Tenant Share
          ---------------------------
          ${tenantsText}

          ✅ Please pay on time.
          Thank you 🙏`;
          };

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
      }));

      setBulkRows(rows);
    }, [bulkOpen, rooms, getRoomStartingReading]);

  /* ADD READING */
  const handleAdd = async () => {
    if (!formRoomId || !formPrevReading || !formCurrReading)
      return toast.error("Fill all fields");

    if (+formCurrReading < +formPrevReading)
      return toast.error("Current reading cannot be less");

    await addEBReading({
      roomId: formRoomId,
      month: selMonth,
      year: selYear,
      previousReading: Number(formPrevReading),
      currentReading: Number(formCurrReading),
    });

    toast.success("Reading added");

    setAddOpen(false);
    setFormRoomId("");
    setFormPrevReading("");
    setFormCurrReading("");

    reload();
  };

  const handleBulkChange = (roomId: string, value: string) => {
  setBulkRows((prev) =>
    prev.map((r) =>
      r.roomId === roomId ? { ...r, currentReading: value } : r
    )
  );
};

    /* --------------WhatApp Send Handle -------------- */
    const handleSendWhatsApp = async (roomId: string) => {
      try {
        const roomNumber = roomMap[roomId];

        if (!roomNumber) {
          toast.error("Room not found");
          return;
        }

        // tenant bills
        const bills = await getTenantWiseEBBill(roomNumber);

        // room reading
        const reading = filteredReadings.find(
          (r) => String(r.roomId) === String(roomId)
        );

        if (!reading) {
          toast.error("EB reading not found");
          return;
        }

        // build message
        const message = buildEBMessage(
          roomNumber,
          reading,
          bills
        );

        // call backend
        await sendEBBillWhatsApp(roomNumber, message);

        toast.success("WhatsApp sent successfully ");
      } catch (e) {
        console.error(e);
        toast.error("Failed to send WhatsApp");
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

      await addEBReading({
        roomId: row.roomId,
        month: selMonth,
        year: selYear,
        previousReading: Number(row.previousReading),
        currentReading: Number(row.currentReading),
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

  /* VIEW BILL */
  const handleViewBill = async (roomId: string) => {
    const roomNumber = roomMap[roomId];
    const data = await getTenantWiseEBBill(roomNumber);

    setTenantBills(data || []);
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
      valueFormatter: (p) => `₹${Number(p.value || 0).toFixed(2)}`,
    },
    {
      headerName: "Actions",
      flex: 1,
      cellRenderer: (p: any) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleViewBill(p.data.roomId)}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSendWhatsApp(p.data.roomId)}
          >
            📲
          </Button>

          {role === "ADMIN" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete EB reading?</AlertDialogTitle>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(p.data.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ],
  [roomMap, role]
);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">EB Readings</h1>
          <p className="text-sm text-muted-foreground">
            Monthly electricity readings
          </p>
        </div>

        {role !== "VIEWER" && (
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

            {/* <p className="text-sm text-muted-foreground">
              Units: {bill.units ?? "-"}
            </p> */}
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
              onGridReady={onGridReady}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50, 100]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EBReadingsPage;