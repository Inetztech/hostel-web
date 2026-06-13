import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import api from "@/lib/api";
import {
  createFlat,
  updateFlat,
  deleteFlat,
  getUserRole,
} from "@/lib/store";

import { Flat, FlatRequest, Branch } from "@/lib/types";

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

import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef, IGetRowsParams } from "ag-grid-community";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const DEFAULT_PAGE_SIZE  = 10;
const BRANCH_PAGE_SIZE   = 10;
const GRID_HEIGHT        = 513;   // same fixed height as UserRegisterPage

/* ─────────────────────────────────────────────────────────────
   BRANCH FETCHER  (two-step: read total → fetch all)
───────────────────────────────────────────────────────────── */
const fetchAllBranches = async (): Promise<Branch[]> => {
  const firstRes = await api.get("/units", { params: { page: 0, size: 10 } });

  const total: number =
    firstRes.data?.data?.totalElements ??
    firstRes.data?.totalElements ??
    0;

  const firstContent: Branch[] =
    firstRes.data?.data?.content ??
    firstRes.data?.content ??
    firstRes.data?.data ??
    [];

  if (total <= firstContent.length) return firstContent;

  const allRes = await api.get("/units", { params: { page: 0, size: total } });
  return (
    allRes.data?.data?.content ??
    allRes.data?.content ??
    allRes.data?.data ??
    []
  );
};

/* ─────────────────────────────────────────────────────────────
   BRANCH SEARCHABLE DROPDOWN  (lazy-loads on open)
───────────────────────────────────────────────────────────── */
interface BranchDropdownProps {
  value:       string;
  onChange:    (id: string, name: string) => void;
  placeholder?: string;
}

const BranchDropdown = ({
  value,
  onChange,
  placeholder = "Select Branch",
}: BranchDropdownProps) => {
  const [open,         setOpen]         = useState(false);
  const [search,       setSearch]       = useState("");
  const [allBranches,  setAllBranches]  = useState<Branch[]>([]);
  const [visibleCount, setVisibleCount] = useState(BRANCH_PAGE_SIZE);
  const [loading,      setLoading]      = useState(false);
  const [selectedName, setSelectedName] = useState("");

  const searchRef    = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return allBranches;
    return allBranches.filter(b =>
      b.unitName.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [allBranches, search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleOpen = async () => {
    setOpen(true);
    setSearch("");
    setVisibleCount(BRANCH_PAGE_SIZE);
    if (allBranches.length === 0) {
      setLoading(true);
      try {
        setAllBranches(await fetchAllBranches());
      } catch {
        toast.error("Failed to load branches");
      } finally {
        setLoading(false);
      }
    }
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - 40 &&
      visibleCount < filtered.length
    ) {
      setVisibleCount(prev => prev + BRANCH_PAGE_SIZE);
    }
  };

  const handleSelect = (b: Branch) => {
    onChange(String(b.id), b.unitName);
    setSelectedName(b.unitName);
    setOpen(false);
  };

  const displayLabel = value
    ? selectedName ||
      allBranches.find(b => String(b.id) === value)?.unitName ||
      `Branch #${value}`
    : placeholder;

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input
                   bg-transparent px-3 py-2 text-sm shadow-sm
                   focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {displayLabel}
        </span>
        <ChevronRight className="h-4 w-4 opacity-50 rotate-90" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md shadow-lg"
          style={{
            border:          "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            color:           "#1a202c",
          }}
        >
          {/* Search row */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(BRANCH_PAGE_SIZE); }}
              placeholder="Search branches…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              style={{ color: "#1a202c" }}
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>

          {/* List */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-52 overflow-y-auto py-1"
          >
            {loading && allBranches.length === 0 && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400">
                No branches found
              </p>
            )}
            {visible.map(b => {
              const sel = String(b.id) === value;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  onMouseEnter={e =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.backgroundColor =
                      sel ? "#f1f5f9" : "#ffffff")
                  }
                  style={{
                    backgroundColor: sel ? "#f1f5f9" : "#ffffff",
                    color:           "#1a202c",
                    fontWeight:      sel ? 600 : 400,
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm transition-colors"
                >
                  {b.unitName}
                </button>
              );
            })}
            {filtered.length > 0 && (
              <p
                className="px-3 py-1.5 text-xs"
                style={{ borderTop: "1px solid #f1f5f9", color: "#94a3b8" }}
              >
                Showing {visible.length} of {filtered.length}
                {visibleCount < filtered.length && " — scroll for more"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const FlatPage = () => {

  /* ── Auth ── */
  const role      = getUserRole()?.toUpperCase();
  const hasAccess = role === "ADMIN";

  /* ── State ── */
  const [totalCount,       setTotalCount]       = useState(0);
  const [addOpen,          setAddOpen]          = useState(false);
  const [editOpen,         setEditOpen]         = useState(false);
  const [editFlat,         setEditFlat]         = useState<Flat | null>(null);
  const [flatNumber,       setFlatNumber]       = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [editBranchId,     setEditBranchId]     = useState("");
  const [loading,          setLoading]          = useState(false);

  const gridRef = useRef<AgGridReact>(null);
  const didLoad = useRef(false);

  /* ── AG Grid infinite datasource ──
     Mirrors UserRegisterPage datasource exactly.
     AG Grid calls getRows with startRow/endRow;
     we convert to page/size and hand back the slice + total.        */
  const datasource = useMemo(() => ({
    getRows: async (params: IGetRowsParams) => {
      const pageSize = DEFAULT_PAGE_SIZE;
      const page     = Math.floor(params.startRow / pageSize);
      try {
        const res = await api.get("/flats", { params: { page, size: pageSize } });
        const content: Flat[] =
          res.data?.data?.content ?? res.data?.content ?? [];
        const total: number =
          res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

        setTotalCount(total);
        params.successCallback(content, total);
      } catch (err) {
        console.error(err);
        params.failCallback();
        toast.error("Failed to load flats");
      }
    },
  }), []);

  /* ── Refresh helper ── */
  const refreshGrid = useCallback(() => {
    gridRef.current?.api?.refreshInfiniteCache();
  }, []);

  /* ── Initial trigger (AgGridReact fires datasource on mount;
        this ref guard prevents double-fire in StrictMode)         ── */
  useEffect(() => {
    didLoad.current = true;
  }, []);

  /* ── CRUD ── */

  const handleAdd = async () => {
    if (!flatNumber.trim()) {
      toast.error("Flat number is required");
      return;
    }
    if (!selectedBranchId) {
      toast.error("Branch is required");
      return;
    }
    try {
      setLoading(true);
      await createFlat({
        flatNumber: flatNumber.trim(),
        branchId:   Number(selectedBranchId),
      } as FlatRequest);
      toast.success("Flat created");
      setFlatNumber("");
      setSelectedBranchId("");
      setAddOpen(false);
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editFlat) return;
    if (!editFlat.flatNumber.trim()) {
      toast.error("Flat number is required");
      return;
    }
    try {
      setLoading(true);
      await updateFlat(editFlat.id, {
        flatNumber: editFlat.flatNumber.trim(),
        branchId:   Number(editBranchId || editFlat.branchId),
      });
      toast.success("Flat updated");
      setEditOpen(false);
      setEditFlat(null);
      setEditBranchId("");
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteFlat(id);
      toast.success("Flat deleted");
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }, [refreshGrid]);

  const openEditDialog = useCallback((flat: Flat) => {
    setEditFlat({ ...flat });
    setEditBranchId(String(flat.branchId ?? ""));
    setEditOpen(true);
  }, []);

  /* ── Column definitions ── */
  const columnDefs: ColDef<Flat>[] = useMemo(() => [
    {
      headerName: "Flat",
      field:      "flatNumber",
      flex:       1,
      sortable:   true,
      filter:     true,
    },
    {
      headerName: "Branch",
      field:      "branchName",
      flex:       1,
      sortable:   true,
      filter:     true,
      valueGetter: (p: any) => p.data?.branchName ?? "—",
    },
    ...(hasAccess
      ? [{
          headerName: "Actions",
          width:      120,
          sortable:   false,
          filter:     false,
          cellRenderer: (params: { data: Flat }) => {
            if (!params.data) return null;
            return (
              <div className="flex gap-2 items-center h-full">

                {/* Edit */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(params.data)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {params.data.flatNumber}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-white"
                        onClick={() => handleDelete(params.data.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

              </div>
            );
          },
        }]
      : []),
  ], [hasAccess, handleDelete, openEditDialog]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    flex:      1,
  }), []);

  /* ─────────────────────────────────────────────────────────
     UI
  ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Flats</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} flat{totalCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── ADD DIALOG ── */}
        {hasAccess && (
          <Dialog
            open={addOpen}
            onOpenChange={(v) => {
              setAddOpen(v);
              if (!v) { setFlatNumber(""); setSelectedBranchId(""); }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Flat
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Flat</DialogTitle>
                <DialogDescription>
                  Create a new flat and assign it to a branch.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Flat Number</label>
                  <Input
                    placeholder="e.g. F-101"
                    value={flatNumber}
                    onChange={e => setFlatNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Branch</label>
                  <BranchDropdown
                    value={selectedBranchId}
                    onChange={id => setSelectedBranchId(id)}
                    placeholder="Select Branch"
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button disabled={loading} onClick={handleAdd}>
                  {loading ? "Saving…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ── EDIT DIALOG ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) { setEditFlat(null); setEditBranchId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Flat</DialogTitle>
            <DialogDescription>Update the flat details below.</DialogDescription>
          </DialogHeader>

          {editFlat && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Flat Number</label>
                <Input
                  value={editFlat.flatNumber}
                  onChange={e =>
                    setEditFlat({ ...editFlat, flatNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Branch</label>
                <BranchDropdown
                  value={editBranchId}
                  onChange={id => setEditBranchId(id)}
                  placeholder={editFlat.branchName || "Select Branch"}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={loading} onClick={handleEdit}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AG GRID — infinite row model, built-in pagination
            Matches UserRegisterPage exactly:
            • rowModelType="infinite"
            • pagination + paginationPageSize
            • paginationPageSizeSelector
            AG Grid renders its own footer with:
            "Page Size: [10▼]  1 to 10 of 12  |< < Page 1 of 2 > >|"   ── */}
      <div
        className="ag-theme-alpine"
        style={{ height: GRID_HEIGHT, width: "100%" }}
      >
        <AgGridReact
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          cacheBlockSize={DEFAULT_PAGE_SIZE}
          maxBlocksInCache={5}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={DEFAULT_PAGE_SIZE}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          animateRows
          rowHeight={48}
          headerHeight={44}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading…</span>'
          overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">No flats found</span>'
        />
      </div>

    </div>
  );
};

export default FlatPage;




























// import {
//   useEffect,
//   useMemo,
//   useState,
//   useRef,
//   useCallback,
// } from "react";

// import {
//   getFlats,
//   createFlat,
//   updateFlat,
//   deleteFlat,
//   getBranches,
//   getUserRole,
// } from "@/lib/store";

// import { Flat, FlatRequest, Branch } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogDescription,
//   DialogFooter,
//   DialogClose,
// } from "@/components/ui/dialog";

// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogDescription,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";

// import {
//   Plus,
//   Pencil,
//   Trash2,
//   Building2,
//   Home,
//   Layers3,
// } from "lucide-react";

// import { AgGridReact } from "ag-grid-react";
// import type { ColDef } from "ag-grid-community";

// /* ================= COMPONENT ================= */

// const FlatPage = () => {
//   /* ================= STATE ================= */

//   const [flats, setFlats] = useState<Flat[]>([]);
//   const [branches, setBranches] = useState<Branch[]>([]);

//   const [flatNumber, setFlatNumber] = useState("");
//   const [branchId, setBranchId] = useState<string>("");

//   const [addOpen, setAddOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);

//   const [editFlat, setEditFlat] = useState<Flat | null>(null);

//   const role = getUserRole()?.toUpperCase();
//   const hasAccess = role === "ADMIN";

//   const didLoad = useRef(false);

//   /* ================= LOAD ================= */

//   const reload = useCallback(async () => {
//     try {
//       const [flatData, branchData] = await Promise.all([
//         getFlats(0, 100),
//         getBranches(0, 100),
//       ]);

//       setFlats(flatData);
//       setBranches(branchData);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load data");
//     }
//   }, []);

//   /* ================= INIT ================= */

//   useEffect(() => {
//     if (didLoad.current) return;

//     didLoad.current = true;

//     reload();
//   }, [reload]);

//   /* ================= CRUD ================= */

//   const handleAdd = async () => {
//     if (!flatNumber || !branchId) {
//       toast.error("All fields required");
//       return;
//     }

//     try {
//       await createFlat({
//         flatNumber,
//         branchId: Number(branchId),
//       } as FlatRequest);

//       toast.success("Flat created");

//       setFlatNumber("");
//       setBranchId("");

//       setAddOpen(false);

//       await reload();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Create failed");
//     }
//   };

//   const handleEdit = async () => {
//     if (!editFlat) return;

//     try {
//       await updateFlat(editFlat.id, {
//         flatNumber: editFlat.flatNumber,
//         branchId: editFlat.branchId,
//       });

//       toast.success("Flat updated");

//       setEditOpen(false);
//       setEditFlat(null);

//       await reload();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Update failed");
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await deleteFlat(id);

//       toast.success("Flat deleted");

//       await reload();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Delete failed");
//     }
//   };

//   /* ================= GRID ================= */

//   const columnDefs: ColDef<Flat>[] = useMemo(
//     () => [
//       {
//         headerName: "Flat Number",
//         field: "flatNumber",
//         flex: 1.2,
//         filter: true,

//         cellRenderer: (params: any) => (
//           <div className="flex items-center gap-3 h-full">
//             <div className="bg-blue-100 p-2 rounded-xl">
//               <Home className="h-4 w-4 text-blue-600" />
//             </div>

//             <span className="font-medium text-slate-700">
//               {params.value}
//             </span>
//           </div>
//         ),
//       },

//       {
//         headerName: "Branch",
//         field: "branchName",
//         flex: 1.2,
//         filter: true,

//         cellRenderer: (params: any) => (
//           <div className="flex items-center gap-3 h-full">
//             <div className="bg-indigo-100 p-2 rounded-xl">
//               <Building2 className="h-4 w-4 text-indigo-600" />
//             </div>

//             <span className="text-slate-700">
//               {params.value}
//             </span>
//           </div>
//         ),
//       },

//       ...(hasAccess
//         ? [
//             {
//               headerName: "Actions",
//               width: 160,
//               sortable: false,

//               cellRenderer: (params: { data: Flat }) => (
//                 <div className="flex items-center gap-2 h-full">

//                   {/* EDIT */}

//                   <Button
//                     size="icon"
//                     className="h-9 w-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
//                     onClick={() => {
//                       setEditFlat({ ...params.data });
//                       setEditOpen(true);
//                     }}
//                   >
//                     <Pencil className="h-4 w-4" />
//                   </Button>

//                   {/* DELETE */}

//                   <AlertDialog>
//                     <AlertDialogTrigger asChild>
//                       <Button
//                         size="icon"
//                         className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 text-white"
//                       >
//                         <Trash2 className="h-4 w-4" />
//                       </Button>
//                     </AlertDialogTrigger>

//                     <AlertDialogContent className="rounded-3xl">
//                       <AlertDialogHeader>
//                         <AlertDialogTitle>
//                           Delete {params.data.flatNumber} ?
//                         </AlertDialogTitle>

//                         <AlertDialogDescription>
//                           This action cannot be undone.
//                         </AlertDialogDescription>
//                       </AlertDialogHeader>

//                       <AlertDialogFooter>
//                         <AlertDialogCancel>
//                           Cancel
//                         </AlertDialogCancel>

//                         <AlertDialogAction
//                           className="bg-red-600 hover:bg-red-700"
//                           onClick={() =>
//                             handleDelete(params.data.id)
//                           }
//                         >
//                           Delete
//                         </AlertDialogAction>
//                       </AlertDialogFooter>
//                     </AlertDialogContent>
//                   </AlertDialog>
//                 </div>
//               ),
//             },
//           ]
//         : []),
//     ],
//     [hasAccess]
//   );

//   const defaultColDef = useMemo(
//     () => ({
//       sortable: true,
//       resizable: true,
//       flex: 1,
//     }),
//     []
//   );

//   /* ================= UI ================= */

//   return (
//     <div className="space-y-6 p-1">

//       {/* HEADER */}

//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

//         <div>
//           <h1 className="text-3xl font-bold text-slate-800">
//             Flats
//           </h1>

//           <p className="text-sm text-slate-500 mt-1">
//             Manage hostel flats and branches
//           </p>
//         </div>

//         {/* ADD FLAT */}

//         {hasAccess && (
//           <Dialog
//             open={addOpen}
//             onOpenChange={(open) => {
//               setAddOpen(open);

//               if (!open) {
//                 setFlatNumber("");
//                 setBranchId("");
//               }
//             }}
//           >
//             <DialogTrigger asChild>
//               <Button className="h-11 rounded-xl px-5 bg-blue-600 hover:bg-blue-700 shadow-md">
//                 <Plus className="h-4 w-4 mr-2" />
//                 Add Flat
//               </Button>
//             </DialogTrigger>

//             <DialogContent className="rounded-3xl">

//               <DialogHeader>
//                 <DialogTitle className="text-2xl">
//                   Add Flat
//                 </DialogTitle>

//                 <DialogDescription>
//                   Create a new flat
//                 </DialogDescription>
//               </DialogHeader>

//               <div className="space-y-4 py-2">

//                 <div className="space-y-2">
//                   <label className="text-sm font-medium">
//                     Flat Number
//                   </label>

//                   <Input
//                     className="h-11 rounded-xl"
//                     placeholder="Enter flat number"
//                     value={flatNumber}
//                     onChange={(e) =>
//                       setFlatNumber(e.target.value)
//                     }
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-sm font-medium">
//                     Branch
//                   </label>

//                   <Select
//                     value={branchId}
//                     onValueChange={setBranchId}
//                   >
//                     <SelectTrigger className="h-11 rounded-xl">
//                       <SelectValue placeholder="Select Branch" />
//                     </SelectTrigger>

//                     <SelectContent>
//                       {branches.map((b) => (
//                         <SelectItem
//                           key={b.id}
//                           value={String(b.id)}
//                         >
//                           {b.unitName}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>

//               <DialogFooter>
//                 <DialogClose asChild>
//                   <Button
//                     variant="outline"
//                     className="rounded-xl"
//                   >
//                     Cancel
//                   </Button>
//                 </DialogClose>

//                 <Button
//                   className="rounded-xl bg-blue-600 hover:bg-blue-700"
//                   onClick={handleAdd}
//                 >
//                   Create Flat
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         )}
//       </div>

//       {/* STATS */}

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

//         <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">

//           <div className="flex items-center justify-between">

//             <div>
//               <p className="text-sm text-blue-100">
//                 Total Flats
//               </p>

//               <h2 className="text-3xl font-bold mt-2">
//                 {flats.length}
//               </h2>
//             </div>

//             <div className="bg-white/20 p-3 rounded-2xl">
//               <Layers3 className="h-7 w-7" />
//             </div>
//           </div>
//         </div>

//         <div className="rounded-3xl border bg-white p-6 shadow-sm">
//           <p className="text-sm text-slate-500">
//             Active Branches
//           </p>

//           <h2 className="text-3xl font-bold mt-2 text-slate-800">
//             {branches.length}
//           </h2>
//         </div>

//         <div className="rounded-3xl border bg-white p-6 shadow-sm">
//           <p className="text-sm text-slate-500">
//             System Status
//           </p>

//           <h2 className="text-3xl font-bold mt-2 text-green-600">
//             Active
//           </h2>
//         </div>
//       </div>

//       {/* EDIT DIALOG */}

//       <Dialog
//         open={editOpen}
//         onOpenChange={(open) => {
//           setEditOpen(open);

//           if (!open) {
//             setEditFlat(null);
//           }
//         }}
//       >
//         <DialogContent className="rounded-3xl">

//           <DialogHeader>
//             <DialogTitle className="text-2xl">
//               Edit Flat
//             </DialogTitle>

//             <DialogDescription>
//               Update flat details
//             </DialogDescription>
//           </DialogHeader>

//           {editFlat && (
//             <div className="space-y-4 py-2">

//               <div className="space-y-2">
//                 <label className="text-sm font-medium">
//                   Flat Number
//                 </label>

//                 <Input
//                   className="h-11 rounded-xl"
//                   value={editFlat.flatNumber}
//                   onChange={(e) =>
//                     setEditFlat({
//                       ...editFlat,
//                       flatNumber: e.target.value,
//                     })
//                   }
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium">
//                   Branch
//                 </label>

//                 <Select
//                   value={String(editFlat.branchId)}
//                   onValueChange={(val) =>
//                     setEditFlat({
//                       ...editFlat,
//                       branchId: Number(val),
//                     })
//                   }
//                 >
//                   <SelectTrigger className="h-11 rounded-xl">
//                     <SelectValue />
//                   </SelectTrigger>

//                   <SelectContent>
//                     {branches.map((b) => (
//                       <SelectItem
//                         key={b.id}
//                         value={String(b.id)}
//                       >
//                         {b.unitName}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//           )}

//           <DialogFooter>
//             <Button
//               variant="outline"
//               className="rounded-xl"
//               onClick={() => setEditOpen(false)}
//             >
//               Cancel
//             </Button>

//             <Button
//               className="rounded-xl bg-blue-600 hover:bg-blue-700"
//               onClick={handleEdit}
//             >
//               Save Changes
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* GRID */}

//       <div className="rounded-3xl overflow-hidden border bg-white shadow-sm">

//         <div className="px-6 py-5 border-b bg-slate-50">
//           <h2 className="text-lg font-semibold text-slate-800">
//             Flat List
//           </h2>

//           <p className="text-sm text-slate-500">
//             View and manage all flats
//           </p>
//         </div>

//         <div
//           className="ag-theme-alpine"
//           style={{
//             height: 825,
//             width: "100%",
//           }}
//         >
//           <AgGridReact
//             rowData={flats}
//             columnDefs={columnDefs}
//             defaultColDef={defaultColDef}
//             pagination
//             animateRows
//             rowHeight={72}
//             headerHeight={60}
//             paginationPageSize={10}
//             paginationPageSizeSelector={[10, 20, 50, 100]}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FlatPage;