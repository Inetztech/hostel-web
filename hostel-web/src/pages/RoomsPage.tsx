import { useEffect, useMemo, useState, useRef, useCallback } from "react";

import api from "@/lib/api";
import {
  createRoom,
  editRoom,
  removeRoom,
  getBranches,
  getUserRole,
  getBranchId,
  getFlats,
} from "@/lib/store";

import { Room, HostelType, Branch, Flat } from "@/lib/types";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef, IGetRowsParams } from "ag-grid-community";

/* ===============================================================
   GENERIC HELPER — fetch every page of any paginated store fn.
=============================================================== */
async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 10
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);

  const firstContent: T[] = first?.content ?? first ?? [];
  const total: number     = first?.totalElements ?? firstContent.length;

  if (total <= pageSize) return firstContent;

  const totalPages = Math.ceil(total / pageSize);

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
    )
  );

  return [...firstContent, ...rest.flat()];
}

/* ================= COMPONENT ================= */

const RoomsPage = () => {

  /* ================= STATE ================= */

  const [branches,       setBranches]       = useState<Branch[]>([]);
  const [flats,          setFlats]          = useState<Flat[]>([]);
  const [totalCount,     setTotalCount]     = useState(0);

  const [addOpen,        setAddOpen]        = useState(false);
  const [editOpen,       setEditOpen]       = useState(false);
  const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const [supporting, setSupporting] = useState<"idle" | "loading" | "done">("idle");

  const [roomNumber,  setRoomNumber]  = useState("");
  const [hostelType,  setHostelType]  = useState<HostelType | "">("");
  const [totalBeds,   setTotalBeds]   = useState("");
  const [rentPerBed,  setRentPerBed]  = useState("");
  const [unitId,      setUnitId]      = useState("");
  const [flatId,      setFlatId]      = useState("");

  const [wardenBranchName, setWardenBranchName] = useState("");

  const gridRef = useRef<AgGridReact>(null);

  const role     = getUserRole()?.toUpperCase();
  const isWarden = role === "WARDEN";
  const isAdmin  = !isWarden;

  /* ================= RESET FORM ================= */

  const resetAddForm = () => {
    setRoomNumber("");
    setHostelType("");
    setTotalBeds("");
    setRentPerBed("");
    setUnitId("");
    setFlatId("");
  };

  /* ================= LOAD SUPPORTING DATA ================= */

  const loadSupportingData = useCallback(async () => {
    if (supporting !== "idle") return;
    setSupporting("loading");
    try {
      const [branchesResult, flatsResult] = await Promise.allSettled([
        fetchAllPages<Branch>(getBranches),
        fetchAllPages<Flat>(getFlats),
      ]);

      const branchesData: Branch[] = branchesResult.status === "fulfilled" ? branchesResult.value : [];
      const flatsData:    Flat[]   = flatsResult.status    === "fulfilled" ? flatsResult.value    : [];

      setBranches(branchesData);
      setFlats(flatsData);

      if (isWarden) {
        const bid = getBranchId();
        if (!bid) { toast.error("Warden not mapped to a branch"); return; }
        const branch = branchesData.find((b: Branch) => b.id === bid);
        setWardenBranchName(branch?.unitName ?? "");
        setSelectedBranch(String(bid));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed loading supporting data");
    } finally {
      setSupporting("done");
    }
  }, [isWarden, supporting]);

  useEffect(() => {
    loadSupportingData();
  }, [loadSupportingData]);

  /* ================= REFRESH GRID WHEN BRANCH FILTER CHANGES ================= */
  // ✅ replaces the setTimeout hack — fires only after supporting data is ready

  const refreshGrid = useCallback(() => {
    gridRef.current?.api?.refreshInfiniteCache();
  }, []);

  useEffect(() => {
    if (supporting === "done") {
      refreshGrid();
    }
  }, [selectedBranch, supporting, refreshGrid]);

  /* ================= DATASOURCE ================= */
  // ✅ occupied comes from room.occupiedBeds set by backend toResponse()
  // ✅ unitId sent to backend for server-side branch filtering

  const datasource = useMemo(() => ({
    getRows: async (params: IGetRowsParams) => {
      const pageSize = 10;
      const page     = Math.floor(params.startRow / pageSize);

      try {
        const queryParams: Record<string, any> = { page, size: pageSize };

        // ✅ send unitId to backend — backend filters by branch server-side
        if (selectedBranch !== "all") {
          queryParams.unitId = selectedBranch;
        }

        const res = await api.get(`/rooms`, { params: queryParams });

        const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
        const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

        const enriched = content.map((room: Room) => {
          const occ   = room.occupiedBeds ?? 0;   // ✅ from backend RoomResponse.occupiedBeds
          const avail = (room.totalBeds   || 0) - occ;
          return {
            ...room,
            flatName:  room.flatName ?? "N/A",
            occupied:  occ,
            available: avail,
            status:    avail > 0 ? `${avail} Free` : "Full",
          };
        });

        setTotalCount(totalElements);
        params.successCallback(enriched, totalElements);
      } catch (err) {
        console.error(err);
        params.failCallback();
        toast.error("Failed to load rooms");
      }
    },
  }), [selectedBranch]); // ✅ clean single dependency

  /* ================= HELPERS ================= */

  const flatsByBranch = useMemo(() => {
    if (!unitId) return [];
    return flats.filter(f => String(f.branchId) === unitId);
  }, [flats, unitId]);

  const flatsByEditBranch = useMemo(() => {
    if (!editRoomData?.unitId) return [];
    return flats.filter(f => String(f.branchId) === String(editRoomData.unitId));
  }, [flats, editRoomData?.unitId]);

  /* ================= CRUD ================= */

  const handleAdd = async () => {
    if (!roomNumber || !unitId || !hostelType) {
      toast.error("Room number, branch, and room type are required");
      return;
    }
    try {
      await createRoom({
        roomNumber,
        hostelType: hostelType as HostelType,
        totalBeds:  Number(totalBeds)  || 0,
        rentPerBed: Number(rentPerBed) || 0,
        unitId:     Number(unitId),
        flatId:     flatId ? Number(flatId) : null,
      });
      toast.success("Room created");
      setAddOpen(false);
      resetAddForm();
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const handleEdit = async () => {
    if (!editRoomData) return;
    try {
      await editRoom(editRoomData.id, {
        ...editRoomData,
        totalBeds:  Number(editRoomData.totalBeds)  || 0,
        rentPerBed: Number(editRoomData.rentPerBed) || 0,
      });
      toast.success("Room updated");
      setEditOpen(false);
      setEditRoomData(null);
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    try {
      await removeRoom(id);
      toast.success("Room deleted");
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }, [refreshGrid]);

  const openEditDialog = useCallback((room: Room) => {
    setEditRoomData({ ...room });
    setEditOpen(true);
  }, []);

  /* ================= COLUMNS ================= */

  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [
      { headerName: "Flat",     field: "flatName",   filter: true },
      { headerName: "Room No",  field: "roomNumber", filter: true },
      {
        headerName: "Room Type",
        field: "hostelType",
        filter: true,
        cellRenderer: (p: any) => {
          if (!p.data) return null;
          const isAC = p.value === "AC";
          return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isAC
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}>
              {isAC ? "AC" : "NON AC"}
            </span>
          );
        },
      },
      { headerName: "Branch",    field: "unitName",   filter: true },
      { headerName: "Beds",      field: "totalBeds",  width: 110 },
      { headerName: "Occupied",  field: "occupied",   width: 120 },
      { headerName: "Available", field: "available",  width: 120 },
      {
        headerName: "Rent",
        field: "rentPerBed",
        valueFormatter: (p: any) => p.value ? `₹${p.value}` : "",
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: (p: any) => {
          if (!p.data) return null;
          let color = "text-green-600";
          if (p.data.available === 0)      color = "text-red-500";
          else if (p.data.available === 1) color = "text-yellow-500";
          return <span className={`font-medium ${color}`}>{p.value}</span>;
        },
      },
    ];

    if (isAdmin) {
      cols.push({
        headerName: "Actions",
        width: 130,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center justify-center gap-2 h-full">
              <Button size="icon" variant="ghost" onClick={() => openEditDialog(params.data)}>
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
                    <AlertDialogTitle>Delete Room {params.data.roomNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
          );
        },
      });
    }

    return cols;
  }, [isAdmin, handleDelete, openEditDialog]);

  const defaultColDef: ColDef = { sortable: true, resizable: true, flex: 1 };

  /* ================= UI ================= */

  return (
    <div className="p-4">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rooms & Beds</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} rooms
          </p>
        </div>

        {isAdmin && (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room</DialogTitle>
                <DialogDescription>Add room information and save your changes.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <Input
                  placeholder="Room Number"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                />
                <Select value={unitId} onValueChange={(v) => { setUnitId(v); setFlatId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.length > 0 ? branches.map((b) => (
                      <SelectItem key={String(b.id)} value={String(b.id)}>{b.unitName}</SelectItem>
                    )) : (
                      <div className="p-2 text-xs text-muted-foreground text-center">No branches found</div>
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={flatId}
                  onValueChange={setFlatId}
                  disabled={!unitId || flatsByBranch.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !unitId ? "Select a Branch first"
                      : flatsByBranch.length === 0 ? "No Flats Available"
                      : "Select Flat"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {flatsByBranch.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={hostelType} onValueChange={v => setHostelType(v as HostelType)}>
                  <SelectTrigger><SelectValue placeholder="Select Room Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="NON_AC">Non-AC</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Beds" value={totalBeds} onChange={e => setTotalBeds(e.target.value)} />
                <Input type="number" placeholder="Rent" value={rentPerBed} onChange={e => setRentPerBed(e.target.value)} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAdd}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* EDIT DIALOG */}
      {isAdmin && (
        <Dialog
          open={editOpen}
          onOpenChange={(open) => { setEditOpen(open); if (!open) setEditRoomData(null); }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
              <DialogDescription>Update room information and save your changes.</DialogDescription>
            </DialogHeader>
            {editRoomData && (
              <div className="grid gap-4">
                <Input
                  value={editRoomData.roomNumber}
                  onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })}
                />
                <Select
                  value={String(editRoomData.unitId)}
                  onValueChange={v => setEditRoomData({ ...editRoomData, unitId: Number(v), flatId: null })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(editRoomData.flatId || "")}
                  onValueChange={v => setEditRoomData({ ...editRoomData, flatId: v ? Number(v) : null })}
                  disabled={!editRoomData.unitId || flatsByEditBranch.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !editRoomData.unitId ? "Select a Branch first"
                      : flatsByEditBranch.length === 0 ? "No Flats Available"
                      : "Select Flat"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {flatsByEditBranch.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={editRoomData.hostelType || ""}
                  onValueChange={v => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Room Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="NON_AC">Non-AC</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={editRoomData.totalBeds || 0}
                  onChange={e => setEditRoomData({ ...editRoomData, totalBeds: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={editRoomData.rentPerBed || 0}
                  onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BRANCH FILTER */}
      <div className="mb-4 w-60">
        {isAdmin ? (
          <Select
            value={selectedBranch}
            onValueChange={setSelectedBranch}  // ✅ no setTimeout — useEffect handles refresh
          >
            <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">{wardenBranchName}</span>
          </div>
        )}
      </div>

      {/* GRID */}
      <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          cacheBlockSize={10}
          maxBlocksInCache={5}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>

    </div>
  );
};

export default RoomsPage;