// import {
//   useMemo,
//   useState,
//   useRef,
//   useCallback,
// } from "react";

// import api from "@/lib/api";
// import {
//   createBranch,
//   updateBranch,
//   deleteBranch,
//   getUserRole,
// } from "@/lib/store";

// import { Branch, BranchRequest } from "@/lib/types";

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

// import { toast } from "sonner";
// import { Plus, Pencil, Trash2 } from "lucide-react";

// import { AgGridReact } from "ag-grid-react";
// import type { ColDef, IGetRowsParams } from "ag-grid-community";

// /* ================= TYPES ================= */

// interface BranchForm {
//   unitName: string;
//   location: string;
// }

// const EMPTY_FORM: BranchForm = {
//   unitName: "",
//   location: "",
// };

// /* ================= COMPONENT ================= */

// const BranchPage = () => {

//   /* ================= STATE ================= */

//   const [totalCount, setTotalCount] = useState(0);
//   const [addOpen,    setAddOpen]    = useState(false);
//   const [editOpen,   setEditOpen]   = useState(false);
//   const [form,       setForm]       = useState<BranchForm>(EMPTY_FORM);
//   const [editBranch, setEditBranch] = useState<Branch | null>(null);

//   const gridRef   = useRef<AgGridReact>(null);
//   const hasAccess = true;

//   /* ================= DATASOURCE ================= */

//   const datasource = useMemo(() => ({
//     getRows: async (params: IGetRowsParams) => {
//       const pageSize = 10;
//       const page     = Math.floor(params.startRow / pageSize);

//       try {
//         const res = await api.get(`/units`, { params: { page, size: pageSize } });

//         const content       = res.data?.data?.content ?? res.data?.content ?? [];
//         const totalElements = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

//         setTotalCount(totalElements);
//         params.successCallback(content, totalElements);
//       } catch (err) {
//         console.error(err);
//         params.failCallback();
//         toast.error("Failed to load branches");
//       }
//     },
//   }), []);

//   /* ================= REFRESH ================= */

//   const refreshGrid = useCallback(() => {
//     gridRef.current?.api?.refreshInfiniteCache();
//   }, []);

//   /* ================= CRUD ================= */

//   const handleAdd = async () => {
//     if (!form.unitName.trim()) {
//       toast.error("Unit name required");
//       return;
//     }

//     try {
//       await createBranch({
//         unitName: form.unitName,
//         location: form.location,
//       } as BranchRequest);

//       toast.success("Branch created");
//       setForm(EMPTY_FORM);
//       setAddOpen(false);
//       refreshGrid();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Create failed");
//     }
//   };

//   const handleEdit = async () => {
//     if (!editBranch) return;

//     try {
//       await updateBranch(editBranch.id, {
//         unitName: editBranch.unitName,
//         location: editBranch.location,
//       } as BranchRequest);

//       toast.success("Branch updated");
//       setEditOpen(false);
//       setEditBranch(null);
//       refreshGrid();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Update failed");
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await deleteBranch(id);
//       toast.success("Branch deleted");
//       refreshGrid();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Delete failed");
//     }
//   };

//   /* ================= GRID ================= */

//   const columnDefs: ColDef<Branch>[] = useMemo(() => [
//     {
//       headerName: "Unit Name",
//       field: "unitName",
//       filter: true,
//     },
//     {
//       headerName: "Location",
//       field: "location",
//       filter: true,
//     },
//     ...(hasAccess ? [{
//       headerName: "Actions",
//       sortable: false,
//       filter: false,
//       cellRenderer: (params: { data: Branch }) => {

//         // Guard: row not loaded yet during infinite scroll
//         if (!params.data) return null;

//         return (
//           <div className="flex gap-2">

//             {/* EDIT */}
//             <Button
//               size="icon"
//               variant="ghost"
//               onClick={() => {
//                 setEditBranch({ ...params.data });
//                 setEditOpen(true);
//               }}
//             >
//               <Pencil className="h-4 w-4" />
//             </Button>

//             {/* DELETE */}
//             <AlertDialog>
//               <AlertDialogTrigger asChild>
//                 <Button size="icon" variant="ghost">
//                   <Trash2 className="h-4 w-4 text-destructive" />
//                 </Button>
//               </AlertDialogTrigger>

//               <AlertDialogContent>
//                 <AlertDialogHeader>
//                   <AlertDialogTitle>
//                     Delete {params.data.unitName}?
//                   </AlertDialogTitle>
//                   <AlertDialogDescription>
//                     This action cannot be undone.
//                   </AlertDialogDescription>
//                 </AlertDialogHeader>

//                 <AlertDialogFooter>
//                   <AlertDialogCancel>Cancel</AlertDialogCancel>
//                   <AlertDialogAction
//                     onClick={() => handleDelete(params.data.id)}
//                   >
//                     Delete
//                   </AlertDialogAction>
//                 </AlertDialogFooter>
//               </AlertDialogContent>
//             </AlertDialog>

//           </div>
//         );
//       },
//     }] : []),
//   ], [hasAccess]);

//   const defaultColDef = useMemo(
//     () => ({ sortable: true, resizable: true, flex: 1 }),
//     []
//   );

//   /* ================= UI ================= */

//   return (
//     <div className="space-y-6">

//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold">Branches</h1>
//           <p className="text-sm text-muted-foreground">
//             {totalCount} units
//           </p>
//         </div>

//         {/* ADD DIALOG */}
//         {hasAccess && (
//           <Dialog
//             open={addOpen}
//             onOpenChange={(open) => {
//               setAddOpen(open);
//               if (!open) setForm(EMPTY_FORM);
//             }}
//           >
//             <DialogTrigger asChild>
//               <Button size="sm">
//                 <Plus className="h-4 w-4 mr-2" />
//                 Add Branch
//               </Button>
//             </DialogTrigger>

//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Add Branch</DialogTitle>
//                 <DialogDescription>Create a new branch</DialogDescription>
//               </DialogHeader>

//               <div className="space-y-3">
//                 <Input
//                   placeholder="Unit Name"
//                   value={form.unitName}
//                   onChange={(e) =>
//                     setForm({ ...form, unitName: e.target.value })
//                   }
//                 />
//                 <Input
//                   placeholder="Location"
//                   value={form.location}
//                   onChange={(e) =>
//                     setForm({ ...form, location: e.target.value })
//                   }
//                 />
//               </div>

//               <DialogFooter>
//                 <DialogClose asChild>
//                   <Button variant="outline">Cancel</Button>
//                 </DialogClose>
//                 <Button onClick={handleAdd}>Create</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         )}
//       </div>

//       {/* EDIT DIALOG */}
//       <Dialog
//         open={editOpen}
//         onOpenChange={(open) => {
//           setEditOpen(open);
//           if (!open) setEditBranch(null);
//         }}
//       >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Branch</DialogTitle>
//             <DialogDescription>Update branch details</DialogDescription>
//           </DialogHeader>

//           {editBranch && (
//             <div className="space-y-3">
//               <Input
//                 placeholder="Unit Name"
//                 value={editBranch.unitName}
//                 onChange={(e) =>
//                   setEditBranch({ ...editBranch, unitName: e.target.value })
//                 }
//               />
//               <Input
//                 placeholder="Location"
//                 value={editBranch.location ?? ""}
//                 onChange={(e) =>
//                   setEditBranch({ ...editBranch, location: e.target.value })
//                 }
//               />
//             </div>
//           )}

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setEditOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleEdit}>Save</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* GRID */}
//       <div className="ag-theme-alpine" style={{ height: 513 }}>
//         <AgGridReact
//           ref={gridRef}
//           rowModelType="infinite"
//           datasource={datasource}
//           cacheBlockSize={10}
//           maxBlocksInCache={5}
//           columnDefs={columnDefs}
//           defaultColDef={defaultColDef}
//           pagination
//           paginationPageSize={10}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//         />
//       </div>

//     </div>
//   );
// };

// export default BranchPage;







































import { useMemo, useState, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, IGetRowsParams } from "ag-grid-community";
import api from "@/lib/api";
import { createBranch, updateBranch, deleteBranch } from "@/lib/store";
import { Branch, BranchRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

/* ── Types ── */
interface BranchForm { unitName: string; location: string; }
const EMPTY_FORM: BranchForm = { unitName: "", location: "" };

const BranchPage = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [form,       setForm]       = useState<BranchForm>(EMPTY_FORM);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const refreshGrid = useCallback(() => gridRef.current?.api?.refreshInfiniteCache(), []);

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.message || fallback);

  /* ── Datasource ── */
  const datasource = useMemo(() => ({
    getRows: async (params: IGetRowsParams) => {
      try {
        const res = await api.get("/units", {
          params: { page: Math.floor(params.startRow / 10), size: 10 },
        });
        const content       = res.data?.data?.content ?? res.data?.content ?? [];
        const totalElements = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;
        setTotalCount(totalElements);
        params.successCallback(content, totalElements);
      } catch {
        params.failCallback();
        toast.error("Failed to load branches");
      }
    },
  }), []);

  /* ── CRUD ── */
  const handleAdd = async () => {
    if (!form.unitName.trim()) { toast.error("Unit name required"); return; }
    try {
      await createBranch(form as BranchRequest);
      toast.success("Branch created");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      refreshGrid();
    } catch (e: any) { err(e, "Create failed"); }
  };

  const handleEdit = async () => {
    if (!editBranch) return;
    try {
      await updateBranch(editBranch.id, {
        unitName: editBranch.unitName, location: editBranch.location,
      } as BranchRequest);
      toast.success("Branch updated");
      setEditOpen(false);
      setEditBranch(null);
      refreshGrid();
    } catch (e: any) { err(e, "Update failed"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBranch(id);
      toast.success("Branch deleted");
      refreshGrid();
    } catch (e: any) { err(e, "Delete failed"); }
  };

  /* ── Columns ── */
  const columnDefs: ColDef<Branch>[] = useMemo(() => [
    { headerName: "Unit Name", field: "unitName", filter: true },
    { headerName: "Location",  field: "location",  filter: true },
    {
      headerName: "Actions", sortable: false, filter: false,
      cellRenderer: ({ data }: { data: Branch }) => {
        if (!data) return null;
        return (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost"
              onClick={() => { setEditBranch({ ...data }); setEditOpen(true); }}>
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
                  <AlertDialogTitle>Delete {data.unitName}?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(data.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ], []);

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, flex: 1 }), []);

  /* ── Render ── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">{totalCount} units</p>
        </div>

        {/* Add Dialog */}
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Branch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
              <DialogDescription>Create a new branch</DialogDescription>
            </DialogHeader>
            <BranchFormFields form={form} onChange={setForm} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAdd}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditBranch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch details</DialogDescription>
          </DialogHeader>
          {editBranch && (
            <BranchFormFields
              form={{ unitName: editBranch.unitName, location: editBranch.location ?? "" }}
              onChange={(f) => setEditBranch({ ...editBranch, ...f })}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grid */}
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

/* ── Shared form fields ── */
const BranchFormFields = ({
  form, onChange,
}: { form: BranchForm; onChange: (f: BranchForm) => void }) => (
  <div className="space-y-3">
    <Input placeholder="Unit Name" value={form.unitName}
      onChange={(e) => onChange({ ...form, unitName: e.target.value })} />
    <Input placeholder="Location"  value={form.location}
      onChange={(e) => onChange({ ...form, location: e.target.value })} />
  </div>
);

export default BranchPage;