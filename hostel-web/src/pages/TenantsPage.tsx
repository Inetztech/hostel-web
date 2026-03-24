import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

import {
  getRooms,
  getBeds,
  getTenants,
  addTenant,
  updateTenant,
  getBranches,
  importTenantsExcel,
  getUserRole,
} from "@/lib/store";
 
import { Room, Bed, Tenant, IdProofType, Branch  } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { UserPlus, Eye, Search, Pencil } from "lucide-react";

const TenantsPage = () => {
  const role = getUserRole();

  /* ================= STATE ================= */

  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);

  /* ================= FORM ================= */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idProofType, setIdProofType] = useState<IdProofType | "">("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [roomId, setRoomId] = useState<number | "">("");
  const [bedId, setBedId] = useState<number | "">("");
  const [advance, setAdvance] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [checkInDate, setCheckInDate] = useState("");

  /* ================= LOAD DATA ================= */

  const load = async () => {
  const [r, b, t, br] = await Promise.all([
    getRooms(0, 1000), 
    getBeds(0, 1000),
    getTenants(),
    getBranches(),
  ]);

  setRooms(r);
  setBeds(b); 
  setTenants(t);
  setBranches(br);
};

useEffect(() => {
  load();
}, []);


  /* ================= HELPERS ================= */

  const roomNo = (id?: number | null) =>
  rooms.find((r) => r.id === Number(id))?.roomNumber ?? "-";

  const bedNo = (id?: number | null) =>
  beds.find((b) => b.id === Number(id))?.bedNumber ?? "-";

  const branchName = (roomId?: number | null) => {
  const room = rooms.find((r) => r.id === Number(roomId));
  if (!room) return "-";

  return branches.find((b) => b.id === room.unitId)?.unitName ?? "-";
  };

  /* ================= FILTER ================= */

  const filteredTenants = useMemo(() => {
    if (!search) return tenants;

    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) 
      // ||
      //   t.phone.includes(search)
    );
  }, [search, tenants]);

  /* ================= AVAILABLE ROOMS ================= */

  // const roomsWithBeds = useMemo(
  //   () => rooms.filter((r) => beds.some((b) => b.roomId === r.id && !b.occupied)),
  //   [rooms, beds]
  // );

  const availableBeds = useMemo(
    () => beds.filter((b) => b.roomId === roomId && !b.occupied),
    [beds, roomId]
  );

  useEffect(() => {
    setBedId("");
  }, [roomId]);

  /* ================= PRINT TENANT ================= */ 
      const handlePrintTenant = (tenant: Tenant) => {
      const printContent = `
        <html>
          <head>
            <title>Tenant Details</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { text-align: left; padding: 8px; border: 1px solid #ccc; }
              th { background-color: #f4f4f4; }
            </style>
          </head>
          <body>
            <h2>Tenant Details</h2>
            <table>
              <tr><th>Name</th><td>${tenant.name}</td></tr>
              <tr><th>Phone</th><td>${tenant.phone}</td></tr>
              <tr><th>Email</th><td>${tenant.email || "-"}</td></tr>
              <tr><th>Branch</th><td>${branchName(tenant.roomId)}</td></tr>
              <tr><th>Room</th><td>${roomNo(tenant.roomId)}</td></tr>
              <tr><th>Bed</th><td>${bedNo(tenant.bedId)}</td></tr>
              <tr><th>Status</th><td>${tenant.status}</td></tr>
              <tr><th>Check-in</th><td>${tenant.checkInDate}</td></tr>
              <tr><th>Check-out</th><td>${tenant.checkOutDate || "-"}</td></tr>
              <tr><th>Advance</th><td>${tenant.advance}</td></tr>
              <tr><th>Rent</th><td>${tenant.monthlyRent}</td></tr>
              <tr><th>Current EB Reading</th><td>${tenant.joinReading}</td></tr>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

  /* ================= RESET FORM ================= */

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setIdProofType("");
    setIdProofNumber("");
    setRoomId("");
    setBedId("");
    setAdvance("");
    setMonthlyRent("");
    setCurrentReading("");
    setCheckInDate("");
  };

  /* ================= ADD TENANT ================= */

  const handleAdd = async () => {
    if (!name || !phone || !roomId || !bedId) {
      toast.error("Fill required fields");
      return;
    }

    try {
      await addTenant({
        name,
        phone,
        email,
        idProofType: idProofType as IdProofType,
        idProofNumber,
        roomId: Number(roomId),
        bedId: Number(bedId),
        advance: Number(advance),
        monthlyRent: Number(monthlyRent),
        joinReading: Number(currentReading),
        checkInDate,
      });

      toast.success("Tenant added");

      setAddOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add tenant");
    }
  };

  /* ================= EDIT TENANT ================= */

  const handleEdit = async () => {
    if (!editTenant) return;

    try {
      await updateTenant(editTenant.id, {
        name,
        phone,
        email,
        idProofType: idProofType as IdProofType,
        idProofNumber,
        roomId: Number(roomId),
        bedId: Number(bedId),
        advance: Number(advance),
        monthlyRent: Number(monthlyRent),
        joinReading: Number(currentReading),
        checkInDate,
      });

      toast.success("Tenant updated");

      setEditOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  /* ================= IMPORT EXCEL ================= */

const handleExcelImport = async () => {

  if (!excelFile) {
    toast.error("Please select Excel file");
    return;
  }

  try {

    await importTenantsExcel(excelFile);

    toast.success("Excel imported successfully");

    setExcelFile(null);

    load();

  } catch (e: any) {

    toast.error(e.message || "Excel import failed");

  }

};

  /* ================= GRID ================= */

  const columnDefs: ColDef[] = [
  {
    headerName: "Name",
    field: "name",
    flex: 1,
    cellClass: "text-left",
  },
  {
    headerName: "Phone",
    field: "phone",
    flex: 1,
    cellClass: "text-left",
  },
  {
  headerName: "Branch",  
  valueGetter: (params) => {
    const roomId = params.data.roomId;
    return roomId ? branchName(roomId) : "-";
  },
  flex: 1,
  cellClass: "text-center",
},
{
  headerName: "Room",
  valueGetter: (params) => {
    const roomId = params.data.roomId;
    return roomId ? roomNo(roomId) : "-";
  },
  flex: 1,
  cellClass: "text-center",
},
  {
    headerName: "Status",
    field: "status",
    flex: 1,
    cellRenderer: (params: any) => <Badge>{params.value}</Badge>,
    cellClass: "text-center",
  },
  {
    headerName: "Action",
    flex: 1,
    cellRenderer: (params: any) => (
      <div className="flex justify-center gap-2">
        {/* View */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setViewTenant(params.data);
            setViewOpen(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>

        {/* Edit */}
        {role === "ADMIN" && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const t = params.data;
              setEditTenant(t);

              setName(t.name);
              setPhone(t.phone);
              setEmail(t.email || "");
              setIdProofType(t.idProofType);
              setIdProofNumber(t.idProofNumber || "");
              setRoomId(t.roomId);
              setBedId(t.bedId);
              setAdvance(String(t.advance));
              setMonthlyRent(String(t.monthlyRent));
              setCurrentReading(String(t.joinReading));
              setCheckInDate(t.checkInDate);

              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {/* Print */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handlePrintTenant(params.data)}
        >
          <span className="h-4 w-4">🖨️</span>
        </Button>
      </div>
    ),
    cellClass: "text-center",
  },
];

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 120,
};

  /* ================= UI ================= */

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold">Tenants</h1>

  {role === "ADMIN" && (
    <div className="flex gap-2 items-center">

      {/* Excel File Input */}

      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) =>
          setExcelFile(e.target.files ? e.target.files[0] : null)
        }
        className="w-[220px]"
      />

      {/* Import Excel Button */}

      <Button
        variant="outline"
        size="sm"
        onClick={handleExcelImport}
      >
        Import Excel
      </Button>

      {/* Check-In Dialog */}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Check-In
          </Button>
        </DialogTrigger>

            <DialogContent>

              <DialogHeader>
                <DialogTitle>New Tenant</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">

                <Input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
                <Input placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                <Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />

                <Select
                value={idProofType}
                onValueChange={(v) => setIdProofType(v as IdProofType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="IdProofType" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="AADHAR">AADHAR</SelectItem>
                  <SelectItem value="PAN">PAN</SelectItem>
                  <SelectItem value="Driving_License">Driving_License</SelectItem>
                </SelectContent>
              </Select>

                <Input placeholder="ID Proof Number" value={idProofNumber} onChange={(e)=>setIdProofNumber(e.target.value)} />

                <Select value={roomId ? String(roomId) : ""} onValueChange={(v)=>setRoomId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
                  <SelectContent>
                  {rooms.map((r)=>(
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.roomNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>

                <Select value={bedId ? String(bedId) : ""} onValueChange={(v)=>setBedId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((b)=>(
                      <SelectItem key={b.id} value={String(b.id)}>
                        Bed {b.bedNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input type="number" placeholder="Advance" value={advance} onChange={(e)=>setAdvance(e.target.value)} />
                <Input type="number" placeholder="Rent" value={monthlyRent} onChange={(e)=>setMonthlyRent(e.target.value)} />
                <Input type="number" placeholder="Current EB Reading" value={currentReading} onChange={(e)=>setCurrentReading(e.target.value)} />
                <Input type="date" value={checkInDate} onChange={(e)=>setCheckInDate(e.target.value)} />

              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>

                <Button onClick={handleAdd}>
                  Check-In
                </Button>
              </DialogFooter>

            </DialogContent>
          </Dialog>
          </div>
          )}
      </div>

      {/* SEARCH */}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input
          className="pl-9"
          placeholder="Search tenants..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />
      </div>

      {/* GRID */}

      <div className="ag-theme-alpine" style={{height:513}}>
        <AgGridReact
          rowData={filteredTenants}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>

      {/* EDIT TENANT */}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>

            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">

              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Select value={idProofType} onValueChange={(v)=>setIdProofType(v as IdProofType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="AADHAR">AADHAR</SelectItem>
                  <SelectItem value="PAN">PAN</SelectItem>
                  <SelectItem value="Driving_License">Driving_License</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="ID Proof Number"
                value={idProofNumber}
                onChange={(e)=>setIdProofNumber(e.target.value)}
              />

              {/* ROOM */}

              <Select value={roomId ? String(roomId) : ""} onValueChange={(v)=>setRoomId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Room" />
                </SelectTrigger>

                <SelectContent>
                  {rooms.map((r)=>(
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.roomNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* BED */}

              <Select value={bedId ? String(bedId) : ""} onValueChange={(v)=>setBedId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Bed" />
                </SelectTrigger>

                <SelectContent>
                  {beds
                    .filter((b)=>b.roomId === roomId)
                    .map((b)=>(
                      <SelectItem key={b.id} value={String(b.id)}>
                        Bed {b.bedNumber}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Advance"
                value={advance}
                onChange={(e)=>setAdvance(e.target.value)}
              />

              <Input
                type="number"
                placeholder="Rent"
                value={monthlyRent}
                onChange={(e)=>setMonthlyRent(e.target.value)}
              />

              <Input
                type="number"
                placeholder="Current EB Reading"
                value={currentReading}
                onChange={(e)=>setCurrentReading(e.target.value)}
              />

              <Input
                type="date"
                value={checkInDate}
                onChange={(e)=>setCheckInDate(e.target.value)}
              />

            </div>

            <DialogFooter>

              <Button
                variant="outline"
                onClick={()=>setEditOpen(false)}
              >
                Cancel
              </Button>

              <Button onClick={handleEdit}>
                Update Tenant
              </Button>

            </DialogFooter>

          </DialogContent>
        </Dialog>

      {/* VIEW TENANT */}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>

          {viewTenant && (
            <div className="grid gap-2 text-sm">
              <p>Name: {viewTenant.name}</p>
              <p>Phone: {viewTenant.phone}</p>
              <p>Email: {viewTenant.email}</p>
              <p>Identity Proof: {viewTenant.idProofType}</p>
              <p>ID Number: {viewTenant.idProofNumber}</p>
              <p>Branch: {branchName(viewTenant.roomId)}</p>
              <p>Room: {roomNo(viewTenant.roomId)}</p>
              <p>Bed: {bedNo(viewTenant.bedId)}</p>
              <p>Status: {viewTenant.status}</p>
              <p>Check-in: {viewTenant.checkInDate}</p>
              <p>Check-out: {viewTenant.checkOutDate}</p>
            </div>
          )}

        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TenantsPage;