import { useEffect, useMemo, useState } from "react";
import {
  fetchRooms,
  fetchBeds,
  createRoom,
  editRoom,
  removeRoom,
  fetchBranches,
  getUserRole,
  getBranchId,
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
  DialogDescription,
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
  AlertDialogDescription,
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

const RoomsPage = () => {

  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRoomData, setEditRoomData] = useState<Room | null>(null);

  const [roomNumber, setRoomNumber] = useState("");
  const [hostelType, setHostelType] = useState<HostelType>("Boys");
  const [totalBeds, setTotalBeds] = useState("");
  const [rentPerBed, setRentPerBed] = useState("");
  const [unitId, setUnitId] = useState("");

  /* ================= ROLE ================= */
  
  const role = getUserRole()?.toUpperCase();
  const isViewer = role === "VIEWER";

  const [branchId, setBranchId] = useState<number | undefined>(undefined);

  

  /* ================= LOAD DATA ================= */

  const reload = async () => {

  try {

    const [roomsData, bedsData, branchesData] = await Promise.all([
      fetchRooms(0, 1000),
      fetchBeds(0, 500),
      fetchBranches(0, 50),
    ]);

    if (isViewer) {

      const viewerBranchId = getBranchId();

      if (!viewerBranchId) {

        toast.error("Viewer not mapped to branch");

        setRooms([]);
        setBranches([]);
        setBeds([]);

        return;
      }

      setBranchId(viewerBranchId);

      // filter rooms by branch
      const filteredRooms =
        roomsData.filter(r =>
          Number(r.unitId) === Number(viewerBranchId)
        );

      // get room ids of that branch
      const roomIds =
        filteredRooms.map(r => r.id);

      // filter beds only for those rooms
      const filteredBeds =
        bedsData.filter(b =>
          roomIds.includes(b.roomId)
        );

      const filteredBranches =
        branchesData.filter(b =>
          Number(b.id) === Number(viewerBranchId)
        );

      setRooms(filteredRooms);
      setBeds(filteredBeds);  
      setBranches(filteredBranches);

    } else {

      setRooms(roomsData);
      setBeds(bedsData);
      setBranches(branchesData);

    }

  } catch (err) {

    console.error(err);
    toast.error("Failed loading rooms");

  }

};

  useEffect(() => {
    reload();
  }, [branchId]);

  /* ================= HELPERS ================= */

  const bedsByRoom = useMemo(() => {

    const map: Record<number, Bed[]> = {};

    beds.forEach((b) => {
      (map[b.roomId] ??= []).push(b);
    });

    return map;

  }, [beds]);

  const occupiedBeds = (roomId: number) =>
    (bedsByRoom[roomId] || []).filter(b => b.isOccupied).length;

  const branchMap = useMemo(() => {

    const map: Record<number, Branch> = {};

    branches.forEach((b) => {
      map[b.id] = b;
    });

    return map;

  }, [branches]);

  /* viewer branch tabs */

  const viewerBranches = useMemo(() => {

    if (isViewer && branchId) {

      return branches.filter(
        b => Number(b.id) === Number(branchId)
      );

    }

    return branches;

  }, [branches, isViewer, branchId]);

  /* ================= ACTIONS ================= */

  const handleAdd = async () => {

    if (!roomNumber || !unitId) {

      toast.error("Room number and branch required");
      return;

    }

    try {

      await createRoom({

        roomNumber,
        hostelType,
        totalBeds: Number(totalBeds) || 0,
        rentPerBed: Number(rentPerBed) || 0,
        unitId: Number(unitId),

      });

      toast.success("Room created");

      setAddOpen(false);

      setRoomNumber("");
      setUnitId("");
      setTotalBeds("");
      setRentPerBed("");

      reload();

    } catch (e: any) {

      toast.error(
        e?.response?.data?.message || "Create failed"
      );

    }

  };

  const handleEdit = async () => {

    if (!editRoomData) return;

    try {

      await editRoom(editRoomData.id, {

        ...editRoomData,
        totalBeds: Number(editRoomData.totalBeds) || 0,
        rentPerBed: Number(editRoomData.rentPerBed) || 0,

      });

      toast.success("Room updated");

      setEditOpen(false);
      setEditRoomData(null);

      reload();

    } catch (e: any) {

      toast.error(
        e?.response?.data?.message || "Update failed"
      );

    }

  };

  const handleDelete = async (id: number) => {

    try {

      await removeRoom(id);

      toast.success("Room deleted");

    } catch (e: any) {

      toast.error(
        e?.response?.data?.message || "Delete failed"
      );

    }

    reload();

  };

  /* ================= GRID DATA ================= */

  const rowData = useMemo(() => {

    return rooms.map(room => {

      const occ = occupiedBeds(room.id);

      const avail =
        (room.totalBeds || 0) - occ;

      const branch =
        branchMap[Number(room.unitId)];

      return {

        ...room,

        unitName:
          branch?.unitName ?? "N/A",

        occupied: occ,

        available: avail,

        status:
          avail > 0
            ? `${avail} Free`
            : "Full",

      };

    });

  }, [rooms, bedsByRoom, branchMap]);

  /* ================= COLUMNS ================= */

  const hasAccess = !isViewer;

  const columnDefs = useMemo<ColDef[]>(() => {

    const cols: ColDef[] = [

      {
        headerName: "Room No",
        field: "roomNumber",
        filter: true,
      },

      {
        headerName: "Hostel",
        field: "hostelType",
        filter: true,
      },

      {
        headerName: "Branch",
        field: "unitName",
        filter: true,
      },

      {
        headerName: "Beds",
        field: "totalBeds",
        width: 110,
      },

      {
        headerName: "Occupied",
        field: "occupied",
        width: 120,
      },

      {
        headerName: "Available",
        field: "available",
        width: 120,
      },

      {
        headerName: "Rent",
        field: "rentPerBed",

        valueFormatter:
          p => `₹${p.value}`,

      },

      {
        headerName: "Status",
        field: "status",

        cellRenderer:
          (p: any) => {

            let color =
              "text-green-600";

            if (p.data.available === 0)
              color = "text-red-500";

            else if (
              p.data.available === 1
            )
              color = "text-yellow-500";

            return (
              <span
                className={`font-medium ${color}`}
              >
                {p.value}
              </span>
            );

          },

      },

    ];

    if (hasAccess) {

      cols.push({

        headerName: "Actions",

        cellRenderer:
          (params: any) => (

            <div className="flex gap-2">

              <Button
                size="icon"
                variant="ghost"
                onClick={() => {

                  setEditRoomData(
                    { ...params.data }
                  );

                  setEditOpen(true);

                }}
              >

                <Pencil className="h-4 w-4" />

              </Button>

              <AlertDialog>

                <AlertDialogTrigger asChild>

                  <Button
                    size="icon"
                    variant="ghost"
                  >

                    <Trash2 className="h-4 w-4 text-destructive" />

                  </Button>

                </AlertDialogTrigger>

                <AlertDialogContent>

                  <AlertDialogHeader>

                    <AlertDialogTitle>

                      Delete Room {params.data.roomNumber}?

                    </AlertDialogTitle>

                    <AlertDialogDescription>

                      This action cannot be undone.

                    </AlertDialogDescription>

                  </AlertDialogHeader>

                  <AlertDialogFooter>

                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                      onClick={() =>
                        handleDelete(
                          params.data.id
                        )
                      }
                    >

                      Delete

                    </AlertDialogAction>

                  </AlertDialogFooter>

                </AlertDialogContent>

              </AlertDialog>

            </div>

          ),

      });

    }

    return cols;

  }, [isViewer]);

  const defaultColDef: ColDef = {

    sortable: true,

    resizable: true,

    flex: 1,

  };

  const Grid = ({ data }: { data: any[] }) => (

    <div
      className="ag-theme-alpine"
      style={{ height: 513 }}
    >

      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10,20,50,100]}
      />

    </div>

  );

  /* ================= UI ================= */

  return (

    <div className="p-4">

      <div className="flex justify-between mb-6">

        <div>

          <h1 className="text-2xl font-bold">
            Rooms & Beds
          </h1>

          <p className="text-sm text-muted-foreground">

            {rooms.length} rooms · {beds.length} beds

          </p>

        </div>

        {!isViewer && (

          <Dialog
            open={addOpen}
            onOpenChange={setAddOpen}
          >

            <DialogTrigger asChild>

              <Button size="sm">

                <Plus className="h-4 w-4 mr-2" />

                Add Room

              </Button>

            </DialogTrigger>

            <DialogContent>

              <DialogHeader>

                <DialogTitle>

                  Add Room

                </DialogTitle>

                <DialogDescription>
              Add room information and save your changes.
            </DialogDescription>

              </DialogHeader>

              <div className="grid gap-4">

                <Input
                  placeholder="Room Number"
                  value={roomNumber}
                  onChange={e =>
                    setRoomNumber(e.target.value)
                  }
                />

                <Select
                  value={unitId}
                  onValueChange={setUnitId}
                >

                  <SelectTrigger>

                    <SelectValue placeholder="Select Branch" />

                  </SelectTrigger>

                  <SelectContent>

                    {branches.map(b => (

                      <SelectItem
                        key={b.id}
                        value={String(b.id)}
                      >

                        {b.unitName}

                      </SelectItem>

                    ))}

                  </SelectContent>

                </Select>

                <Input
                  type="number"
                  placeholder="Beds"
                  value={totalBeds}
                  onChange={e =>
                    setTotalBeds(e.target.value)
                  }
                />

                <Input
                  type="number"
                  placeholder="Rent"
                  value={rentPerBed}
                  onChange={e =>
                    setRentPerBed(e.target.value)
                  }
                />

              </div>

              <DialogFooter>

                <DialogClose asChild>

                  <Button variant="outline">
                    Cancel
                  </Button>

                </DialogClose>

                <Button onClick={handleAdd}>
                  Create
                </Button>

              </DialogFooter>

            </DialogContent>

          </Dialog>

        )}

      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update room information and save your changes.
            </DialogDescription>
          </DialogHeader>

          {editRoomData && (
            <div className="grid gap-4">
              <Input
                value={editRoomData.roomNumber}
                onChange={(e) =>
                  setEditRoomData({ ...editRoomData, roomNumber: e.target.value })
                }
              />

              <Select
                value={String(editRoomData.unitId)}
                onValueChange={(v) =>
                  setEditRoomData({ ...editRoomData, unitId: Number(v) })
                }
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
                onValueChange={(v) =>
                  setEditRoomData({ ...editRoomData, hostelType: v as HostelType })
                }
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
                value={editRoomData.totalBeds || 0}
                onChange={(e) =>
                  setEditRoomData({ ...editRoomData, totalBeds: Number(e.target.value) })
                }
              />

              <Input
                type="number"
                value={editRoomData.rentPerBed || 0}
                onChange={(e) =>
                  setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })
                }
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

      <Tabs
        defaultValue={
          isViewer
            ? String(branchId ?? "")
            : "all"
        }
      >

        <TabsList>

          {!isViewer && (

            <TabsTrigger value="all">
              All
            </TabsTrigger>

          )}

          {viewerBranches.map(b => (

            <TabsTrigger
              key={b.id}
              value={String(b.id)}
            >

              {b.unitName}

            </TabsTrigger>

          ))}

        </TabsList>

        {!isViewer && (

          <TabsContent value="all">

            <Card>

              <CardContent>

                <Grid data={rowData} />

              </CardContent>

            </Card>

          </TabsContent>

        )}

        {viewerBranches.map(b => (

          <TabsContent
            key={b.id}
            value={String(b.id)}
          >

            <Card>

              <CardContent>

                <Grid
                  data={
                    rowData.filter(
                      r =>
                        String(r.unitId) ===
                        String(b.id)
                    )
                  }
                />

              </CardContent>

            </Card>

          </TabsContent>

        ))}

      </Tabs>

    </div>

  );

};

export default RoomsPage;