import { useEffect, useMemo, useState } from "react";
import {
  fetchRooms,
  fetchBeds,
  createRoom,
  editRoom,
  removeRoom,
  fetchBranches,
  getUserRole,
} from "@/lib/store";

import { Room, Bed, HostelType, Branch } from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";

const PAGE_SIZE = 10; 

const RoomsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRoomData, setEditRoomData] = useState<Room | null>(null);

  const [page, setPage] = useState(0);
  const [roomNumber, setRoomNumber] = useState("");
  const [hostelType, setHostelType] = useState<HostelType>("Boys");
  const [totalBeds, setTotalBeds] = useState("");
  const [rentPerBed, setRentPerBed] = useState("");
  const [unitId, setUnitId] = useState<string>("");

  const role = getUserRole();

  /* ================= LOAD DATA ================= */
  const reload = async () => {
    try {
      const [roomsData, bedsData, branchesData] = await Promise.all([
        fetchRooms(0, 1000), // fetch all rooms at once for client-side pagination
        fetchBeds(),
        fetchBranches(),
      ]);

      setRooms(roomsData);
      setBeds(bedsData);
      setBranches(branchesData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rooms");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  /* ================= HELPERS ================= */
    const bedsByRoom = useMemo(() => {
      const map: Record<number, Bed[]> = {};
      beds.forEach((b) => {
        if (!map[b.roomId]) map[b.roomId] = [];
        map[b.roomId].push(b);
      });
      return map;
    }, [beds]);

    const occupiedBeds = (roomId: number) => 
      (bedsByRoom[roomId] || []).filter(b => b.occupied).length;

  /* ================= ACTIONS ================= */
  const handleAdd = async () => {
    if (!roomNumber || !unitId) {
      toast.error("Room number and branch required");
      return;
    }

    await createRoom({
      roomNumber,
      hostelType,
      totalBeds: Number(totalBeds),
      rentPerBed: Number(rentPerBed),
      unitId: Number(unitId),
    });

    toast.success("Room created");
    setAddOpen(false);
    setRoomNumber("");
    setUnitId("");
    setTotalBeds("");
    setRentPerBed("");
    reload();
  };

  const handleEdit = async () => {
    if (!editRoomData) return;

    await editRoom(editRoomData.id, {
      roomNumber: editRoomData.roomNumber,
      hostelType: editRoomData.hostelType,
      totalBeds: Number(editRoomData.totalBeds),
      rentPerBed: Number(editRoomData.rentPerBed),
      unitId: editRoomData.unitId,
    });

    toast.success("Room updated");
    setEditOpen(false);
    setEditRoomData(null);
    reload();
  };

  const handleDelete = async (id: number) => {
    await removeRoom(id);
    toast.success("Room deleted");
    reload();
  };

  /* ================= GRID DATA ================= */
   const rowData = useMemo(() => {
  return rooms.map((room) => {
    const occ = occupiedBeds(room.id);
    const avail = room.totalBeds - occ;

    // Map the branch properly
    const branch = branches.find((b) => b.id === room.unitId);

    return {
      ...room,
      unitId: room.unitId,
      unitName: branch ? branch.unitName : "N/A", 
      occupied: occ,
      available: avail,
      status: avail > 0 ? `${avail} Free` : "Full",
    };
  });
}, [rooms, beds, branches]);

  /* ================= PAGINATION ================= */
  const totalRows = rowData.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);

  const paginatedRowData = useMemo(() => {
    const start = page * PAGE_SIZE;
    return rowData.slice(start, start + PAGE_SIZE);
  }, [rowData, page]);

    const roomsByBranch = useMemo(() => {
    const map: Record<string, any[]> = {};
    branches.forEach((b) => {
      map[String(b.id)] = rowData.filter((r) => String(r.unitId) === String(b.id));
    });
    return map;
  }, [rowData, branches]);

  const paginatedRoomsByBranch = useMemo(() => {
    const map: Record<string, any[]> = {};
    branches.forEach((b) => {
      const branchRooms = roomsByBranch[String(b.id)] || [];
      const start = page * PAGE_SIZE;
      map[String(b.id)] = branchRooms.slice(start, start + PAGE_SIZE);
    });
    return map;
  }, [roomsByBranch, branches, page]);

  /* ================= COLUMN DEFINITIONS ================= */
  const columnDefs: ColDef[] = [
    { headerName: "Room No", field: "roomNumber", filter: true },
    { headerName: "Hostel", field: "hostelType", filter: true },
    { headerName: "Branch", field: "unitName", filter: true },
    { headerName: "Beds", field: "totalBeds", width: 110 },
    { headerName: "Occupied", field: "occupied", width: 120 },
    { headerName: "Available", field: "available", width: 120 },
    { headerName: "Rent", field: "rentPerBed", valueFormatter: (p) => `₹${p.value}` },
    {
      headerName: "Status",
      field: "status",
      cellRenderer: (p: any) => {
        let color = "text-green-600";
        if (p.data.available === 0) color = "text-red-500";
        else if (p.data.available === 1) color = "text-yellow-500";
        return <span className={`font-medium ${color}`}>{p.value}</span>;
      },
    },
    ...(role === "ADMIN"
      ? [
          {
            headerName: "Actions",
            cellRenderer: (params: any) => (
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditRoomData({ ...params.data });
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete Room {params.data.roomNumber}?
                      </AlertDialogTitle>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(params.data.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ),
          },
        ]
      : []),
  ];

  const defaultColDef: ColDef = { sortable: true, resizable: true, flex: 1 };

  /* ================= GRID COMPONENT ================= */
  const Grid = ({ data }: { data: any[] }) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i);
    return (
      <div>
        <div className="ag-theme-alpine" style={{ height: 513 }}>
          <AgGridReact rowData={data} columnDefs={columnDefs} defaultColDef={defaultColDef} />
        </div>

        {/* PAGINATION BUTTONS */}
        <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            {"<"}
          </Button>

          {pages.map((p) => (
            <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)}>
              {p + 1}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {">"}
          </Button>
        </div>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rooms & Beds</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.length} rooms · {beds.length} beds
          </p>
        </div>

        {role === "ADMIN" && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <Input placeholder="Room Number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />

                <Select value={unitId} onValueChange={(v) => setUnitId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.unitName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys">Boys</SelectItem>
                    <SelectItem value="Girls">Girls</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="number" placeholder="Beds" value={totalBeds} onChange={(e) => setTotalBeds(e.target.value)} />
                <Input type="number" placeholder="Rent" value={rentPerBed} onChange={(e) => setRentPerBed(e.target.value)} />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAdd}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
          </DialogHeader>

          {editRoomData && (
            <div className="grid gap-4">
              <Input
                value={editRoomData.roomNumber}
                onChange={(e) => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })}
              />

              <Select
                value={String(editRoomData.unitId)}
                onValueChange={(v) => setEditRoomData({ ...editRoomData, unitId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={editRoomData.hostelType}
                onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={editRoomData.totalBeds}
                onChange={(e) => setEditRoomData({ ...editRoomData, totalBeds: Number(e.target.value) })}
              />

              <Input
                type="number"
                value={editRoomData.rentPerBed}
                onChange={(e) => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TABS */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {branches.map((b) => (
            <TabsTrigger key={b.id} value={String(b.id)}>
              {b.unitName}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ALL ROOMS */}
        <TabsContent value="all">
          <Card>
            <CardContent>
              <Grid data={paginatedRowData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANCH ROOMS */}
        {branches.map((b) => (
          <TabsContent key={b.id} value={String(b.id)}>
            <Card>
              <CardContent>
                <Grid data={paginatedRoomsByBranch[String(b.id)] || []} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default RoomsPage;