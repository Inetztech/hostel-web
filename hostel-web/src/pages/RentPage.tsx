import { useEffect, useState, useRef } from "react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { useMemo } from "react";

import {
  getRooms,
  getRents,
  getTenantWiseEBBill,
  generateRent,
  recordPayment,
  deleteRent,
  getUserRole,
  getBranchId,
} from "@/lib/store";

import {
  Room,
  Rent,
  TenantEBBill,
  MONTHS,
  PAYMENT_MODES,
  PaymentMode,
} from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { CreditCard, Trash2 } from "lucide-react";

const RentPage = () => {
  
const role = getUserRole()?.toUpperCase();
const branchId = getBranchId();
const hasAccess = true;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [rents, setRents] = useState<Rent[]>([]);
  const [ebBills, setEbBills] = useState<
    (TenantEBBill & { roomNumber: string })[]
  >([]);
  const [search, setSearch] = useState("");


  const loadingRef = useRef(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [paymentModes, setPaymentModes] =
    useState<Record<string, PaymentMode>>({});

  /* ================= HELPERS ================= */

  const normalizeStatus = (status?: string) =>
    (status || "").toUpperCase();

  const isPaid = (status?: string) =>
    normalizeStatus(status) === "PAID";

  const payStatusColor = (status?: string) => {
    const s = normalizeStatus(status);

    return s === "PAID"
      ? "border-green-500 text-green-600"
      : s === "PARTIAL"
      ? "border-yellow-500 text-yellow-600"
      : "border-red-500 text-red-600";
  };

  const scopedRents = useMemo(() => {
  return rents.filter((r) => {
    const matchMonthYear =
      Number(r.rentMonth) === month &&
      Number(r.rentYear) === year;

    if (!matchMonthYear) return false;

    if (role === "ADMIN") return true;

    const room = rooms.find(
      (rm) => String(rm.id) === String(r.roomId)
    );

    return room && String(room.unitId) === String(branchId);
  });
}, [rents, rooms, month, year, role, branchId]);

  /* ================= LOAD DATA ================= */

 const reload = async () => {
  if (loadingRef.current) return;
  loadingRef.current = true;

  try {

    const [roomData, rentData] = await Promise.all([
      getRooms(0,1000),
      getRents(0,1000),
    ]);

    const filteredRooms =
      role === "ADMIN"
        ? roomData
        : roomData.filter(
            (room) =>
              String(room.unitId) === String(branchId)
          );

    setRooms(filteredRooms);
    setRents(rentData);

    await loadAllRoomsEB(filteredRooms);

  } catch (err) {
    toast.error("Failed to load data");
  } finally {
    loadingRef.current = false;
  }
};

  useEffect(() => {
    reload();
  }, []);


  

  /* ================= LOAD EB ================= */

  const loadAllRoomsEB = async (roomData: Room[]) => {
  try {
    if (!Array.isArray(roomData) || roomData.length === 0) {
      setEbBills([]);
      return;
    }

    const results = await Promise.all(
      roomData.map(async (room) => {
        try {
          const bills = await getTenantWiseEBBill(room.roomNumber);
          return (bills || []).map((b) => ({
            ...b,
            roomNumber: room.roomNumber,
          }));
        } catch (err) {
          console.error(`Failed to load EB for room ${room.roomNumber}`, err);
          return [];
        }
      })
    );

    // Flatten the array and update state
    setEbBills(results.flat());
    } catch (err) {
      console.error("Unexpected EB loading error", err);
      toast.error("Failed to load EB data");
      setEbBills([]);
    }
  };

  const getRoomObj = (roomNumber: string) =>
    rooms.find((r) => r.roomNumber === roomNumber);

  const getRentStatus = (tenantId: number, roomNumber: string) => {
    const room = getRoomObj(roomNumber);

    return rents.find(
      (r) =>
        Number(r.tenantId) === tenantId &&
        Number(r.rentMonth) === month &&
        Number(r.rentYear) === year &&
        room &&
        String(r.roomId) === String(room.id)
    );
  };

  const filteredBills = ebBills.filter((bill) =>
    `${bill.tenantName} ${bill.roomNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const rowData = useMemo(() => {
  return filteredBills.map((bill) => {
    const room = getRoomObj(bill.roomNumber);
    const rentPerBed = room?.rentPerBed ?? 0;

    const rentRecord = getRentStatus(
      bill.tenantId,
      bill.roomNumber
    );

    return {
      ...bill,
      rentPerBed,
      total: rentPerBed + bill.amount,
      rentRecord,
    };
  });
}, [filteredBills, scopedRents, rooms, month, year]);




const columnDefs = useMemo<ColDef[]>(() => [
  {
    headerName: "Room No",
    field: "roomNumber",
    filter: true,
    flex: 1,
    minWidth: 110,
  },
  {
    headerName: "Tenant",
    field: "tenantName",
    filter: true,
    flex: 2,
    minWidth: 160,
  },
  {
    headerName: "EB",
    field: "amount",
    filter: true,
    flex: 1,
    minWidth: 120,
    valueFormatter: (p) => `₹${Number(p.value ?? 0).toFixed(2)}`,
  },
  {
    headerName: "Rent",
    field: "rentPerBed",
    filter: true,
    flex: 1,
    minWidth: 120,
    valueFormatter: (p) => `₹${Number(p.value ?? 0).toFixed(2)}`,
  },
  {
    headerName: "Total",
    field: "total",
    flex: 1,
    minWidth: 130,
    cellStyle: { fontWeight: "600" },
    valueFormatter: (p) => `₹${Number(p.value ?? 0).toFixed(2)}`,
  },
  {
    headerName: "Status",
    field: "paymentStatus",
    filter: true,
    flex: 1,
    minWidth: 150,
    maxWidth: 170,
    cellStyle: {
      display: "flex",
      alignItems: "center",
    },
    cellRenderer: (params: any) => {
      const status =
        params.data.rentRecord?.paymentStatus || "UNGENERATED";

      return (
        <Badge
          variant="outline"
          className={`text-xs ${payStatusColor(status)}`}
        >
          {status}
        </Badge>
      );
    },
  },

  ...(hasAccess
    ? [
        {
  headerName: "Actions",
  sortable: false,
  filter: false,
  resizable: false,
  flex: 2,
  minWidth: 340,
  cellRenderer: (params: any) => {
    const bill = params.data;
    const rentRecord = bill.rentRecord;

    return (
      <div className="flex gap-2 items-center w-full">
        {/* Generate */}
        {!rentRecord && (
          <Button size="sm" onClick={() => handleGenerate(bill)}>Generate</Button>
        )}

        {/* Payment */}
        {rentRecord && !isPaid(rentRecord.paymentStatus) && (
          <>
            <Select
              value={paymentModes[rentRecord.id] || ""}
              onValueChange={(value: PaymentMode) =>
                setPaymentModes((p) => ({ ...p, [rentRecord.id]: value }))
              }
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={() => handlePayment(rentRecord)}>
              <CreditCard className="h-3 w-3 mr-1" />
              Pay
            </Button>
          </>
        )}

        {/* Delete */}
        {rentRecord && (
          <Button size="sm" variant="destructive" onClick={() => handleDelete(rentRecord)}>
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        )}
      </div>
    );
  },
},
      ]
    : []),
], [paymentModes, rents, rooms]);



  /* ================= GENERATE ================= */

  const handleGenerate = async (
    bill: TenantEBBill & { roomNumber: string }
  ) => {
    
    const room = getRoomObj(bill.roomNumber);
    if (!room) return;

    try {
      await generateRent({
        tenantId: String(bill.tenantId),
        roomId: String(room.id),
        rentMonth: month,
        rentYear: year,
        rentAmount: room.rentPerBed,
        ebAmount: bill.amount,
      });

      toast.success(`Rent generated for ${bill.tenantName}`);
      reload();
    } catch {
      toast.error("Failed to generate rent");
    }
  };

  const handleGenerateAll = async () => {

    if (!confirm("Generate rent for all tenants?")) return;

    const billsToGenerate = ebBills.filter(
      (bill) => !getRentStatus(bill.tenantId, bill.roomNumber)
    );

    try {
      await Promise.all(
        billsToGenerate.map(async (bill) => {
          const room = getRoomObj(bill.roomNumber);
          if (!room) return;

          await generateRent({
            tenantId: String(bill.tenantId),
            roomId: String(room.id),
            rentMonth: month,
            rentYear: year,
            rentAmount: room.rentPerBed,
            ebAmount: bill.amount,
          });
        })
      );

      toast.success("All rents generated");
      reload();
    } catch {
      toast.error("Failed generating rents");
    }
  };

  /* ================= PAYMENT ================= */

  const handlePayment = async (rent: Rent) => {

    const selectedMode = paymentModes[rent.id];
    if (!selectedMode) return toast.error("Select payment mode");

    try {
      await recordPayment(rent.id, selectedMode);
      toast.success("Payment recorded");

      setPaymentModes((prev) => {
        const updated = { ...prev };
        delete updated[rent.id];
        return updated;
      });

      reload();
    } catch {
      toast.error("Payment failed");
    }
  };

  /* ================= DELETE ================= */

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

  /* ================= TOTAL CALCULATION ================= */

  let totalCollected = 0;
  let totalPending = 0;

scopedRents.forEach((r) => {
  const total = Number(r.totalAmount) || 0;
  const status = normalizeStatus(r.paymentStatus);

  if (status === "PAID") totalCollected += total;
  else totalPending += total;
});

  const totalAmount = totalCollected + totalPending;

  const collectionPercent =
    totalAmount > 0
      ? Math.round((totalCollected / totalAmount) * 100)
      : 0;

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Rent & EB Management</h1>
          <p className="text-sm text-muted-foreground">
            {MONTHS[month - 1]} {year}
          </p>
        </div>

        <div className="flex gap-6 text-sm">
          <div className="text-green-600 font-semibold">
            <p>Collected</p>
            <p className="text-lg">
              ₹{totalCollected.toLocaleString()}
            </p>
          </div>

          <div className="text-red-600 font-semibold">
            <p>Pending</p>
            <p className="text-lg">
              ₹{totalPending.toLocaleString()}
            </p>
          </div>

          <div className="text-blue-600 font-semibold">
            <p>Collection</p>
            <p className="text-lg">{collectionPercent}%</p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4">
        <Select
          value={String(month)}
          onValueChange={(v) => setMonth(Number(v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasAccess && (
          <Button size="sm" onClick={handleGenerateAll}>
            Generate All
          </Button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search tenant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-md px-3 py-2 text-sm w-64"
      />

      {/* TABLE */}
        <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10,20,50,100]}
          domLayout="normal"
          animateRows={true}
        />
      </div>
    </div>
  );
};

export default RentPage;