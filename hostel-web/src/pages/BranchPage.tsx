// import { useMemo, useState, useRef, useCallback } from "react";
// import { AgGridReact } from "ag-grid-react";
// import type { ColDef, IGetRowsParams } from "ag-grid-community";
// import api from "@/lib/api";
// import { createBranch, updateBranch, deleteBranch } from "@/lib/store";
// import { getUserHostelId, getUserHostelName } from "@/lib/auth";
// import { Branch, BranchRequest } from "@/lib/types";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle,
//   DialogDescription, DialogFooter, DialogClose, DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
//   AlertDialogDescription, AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import { toast } from "sonner";
// import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

// /* ── Types ── */
// interface BranchForm {
//   unitName: string;
//   location: string;
//   phone: string;
//   /** Optional bed-capacity split for this branch, out of the hostel's total.
//    *  Kept as a string in form state (same pattern as other numeric inputs
//    *  in this codebase, e.g. RoomsPage's totalBeds) — parsed to number/null
//    *  only when the request is actually sent. */
//   capacityBeds: string;
// }
// const EMPTY_FORM: BranchForm = { unitName: "", location: "", phone: "", capacityBeds: "" };

// const BranchPage = () => {
//   const [totalCount, setTotalCount] = useState(0);
//   const [addOpen,    setAddOpen]    = useState(false);
//   const [editOpen,   setEditOpen]   = useState(false);
//   const [form,       setForm]       = useState<BranchForm>(EMPTY_FORM);
//   const [editBranch, setEditBranch] = useState<Branch | null>(null);
//   const gridRef = useRef<AgGridReact>(null);

//   // Read the admin's own assigned hostel from session scoping
//   const myHostelId   = getUserHostelId();
//   const myHostelName = getUserHostelName();

//   const refreshGrid = useCallback(() => gridRef.current?.api?.refreshInfiniteCache(), []);

//   const err = (e: any, fallback: string) => toast.error(e?.response?.data?.message || fallback);

//   /* ── Datasource ── */
//   const datasource = useMemo(() => ({
//     getRows: async (params: IGetRowsParams) => {
//       try {
//         const res = await api.get("/units", {
//           params: { page: Math.floor(params.startRow / 10), size: 10 },
//         });
//         const content       = res.data?.data?.content ?? res.data?.content ?? [];
//         const totalElements = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;
//         setTotalCount(totalElements);
//         params.successCallback(content, totalElements);
//       } catch {
//         params.failCallback();
//         toast.error("Failed to load branches");
//       }
//     },
//   }), []);

//   /* ── CRUD ── */
//   const handleAdd = async () => {
//     if (!form.unitName.trim()) { toast.error("Branch name required"); return; }
//     if (!myHostelId) {
//       toast.error("No hostel is assigned to your account yet. Ask your Super Admin to assign one.");
//       return;
//     }
//     try {
//       await createBranch({
//         unitName: form.unitName,
//         location: form.location,
//         phone:    form.phone,
//         hostelId: myHostelId,
//         // ✅ optional split of the hostel's total bed capacity —
//         // "" (untouched) is sent as null so this branch has no individual cap.
//         capacityBeds: form.capacityBeds === "" ? null : Number(form.capacityBeds),
//       } as BranchRequest);
//       toast.success("Branch created");
//       setForm(EMPTY_FORM);
//       setAddOpen(false);
//       refreshGrid();
//     } catch (e: any) { err(e, "Create failed"); }
//   };

//   const handleEdit = async () => {
//     if (!editBranch) return;
//     try {
//       await updateBranch(editBranch.id, {
//         unitName: editBranch.unitName,
//         location: editBranch.location,
//         phone:    editBranch.phone ?? "",
//         hostelId: editBranch.hostelId ?? myHostelId,
//         // ✅ same optional split, carried through edit
//         capacityBeds: editBranch.capacityBeds ?? null,
//       } as BranchRequest);
//       toast.success("Branch updated");
//       setEditOpen(false);
//       setEditBranch(null);
//       refreshGrid();
//     } catch (e: any) { err(e, "Update failed"); }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await deleteBranch(id);
//       toast.success("Branch deleted");
//       refreshGrid();
//     } catch (e: any) { err(e, "Delete failed"); }
//   };

//   /* ── Columns ── */
//   const columnDefs: ColDef<Branch>[] = useMemo(() => [
//     { headerName: "Branch Name", field: "unitName",   filter: true },
//     { headerName: "Hostel",    field: "hostelName", filter: true },
//     { headerName: "Location",  field: "location",   filter: true },
//     { headerName: "Phone",     field: "phone",      filter: true },
//     {
//       // Total Beds = this branch's declared capacity/cap (Branch.capacityBeds),
//       // i.e. the ceiling enforced server-side on room/bed creation.
//       // "-" when no cap was set for this branch (uncapped, only bound by
//       // the hostel-wide cap).
//       headerName: "Total Beds",
//       field: "capacityBeds",
//       width: 120,
//       sortable: false,
//       filter: false,
//       valueGetter: (p) => p.data?.capacityBeds ?? "-",
//     },
//     {
//       // Bed Creation = actual beds created so far via Rooms & Beds
//       // (live bedCount from the backend projection), regardless of the
//       // capacityBeds cap above.
//       headerName: "Bed Creation",
//       field: "bedCount",
//       width: 130,
//       sortable: false,
//       filter: false,
//       valueGetter: (p) => p.data?.bedCount ?? 0,
//     },
//     // ✅ "Occupied" column (occupiedBedCount) remains removed per earlier request.
//     {
//       headerName: "Actions", sortable: false, filter: false,
//       cellRenderer: ({ data }: { data: Branch }) => {
//         if (!data) return null;
//         return (
//           <div className="flex gap-2">
//             <Button size="icon" variant="ghost"
//               onClick={() => { setEditBranch({ ...data }); setEditOpen(true); }}>
//               <Pencil className="h-4 w-4" />
//             </Button>

//             <AlertDialog>
//               <AlertDialogTrigger asChild>
//                 <Button size="icon" variant="ghost">
//                   <Trash2 className="h-4 w-4 text-destructive" />
//                 </Button>
//               </AlertDialogTrigger>
//               <AlertDialogContent>
//                 <AlertDialogHeader>
//                   <AlertDialogTitle>Delete {data.unitName}?</AlertDialogTitle>
//                   <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
//                 </AlertDialogHeader>
//                 <AlertDialogFooter>
//                   <AlertDialogCancel>Cancel</AlertDialogCancel>
//                   <AlertDialogAction onClick={() => handleDelete(data.id)}>Delete</AlertDialogAction>
//                 </AlertDialogFooter>
//               </AlertDialogContent>
//             </AlertDialog>
//           </div>
//         );
//       },
//     },
//   ], []);

//   const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, flex: 1 }), []);

//   /* ── Render ── */
//   return (
//     <div className="space-y-6">

//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold">Branches</h1>
//           <p className="text-sm text-muted-foreground flex items-center gap-1.5">
//             {totalCount} units
//             {myHostelName && (
//               <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2">
//                 <Building2 className="h-3 w-3" /> {myHostelName}
//               </span>
//             )}
//           </p>
//         </div>

//         {/* Add Dialog */}
//         <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
//           <DialogTrigger asChild>
//             <Button size="sm" disabled={!myHostelId} title={!myHostelId ? "No hostel assigned to your account yet" : undefined}>
//               <Plus className="h-4 w-4 mr-2" />Add Branch
//             </Button>
//           </DialogTrigger>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>Add Branch</DialogTitle>
//               <DialogDescription>
//                 Create a new branch under <span className="font-medium">{myHostelName ?? "your hostel"}</span>
//               </DialogDescription>
//             </DialogHeader>
//             <BranchFormFields form={form} hostelName={myHostelName ?? "Assigned Hostel"} onChange={setForm} />
//             <DialogFooter>
//               <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
//               <Button onClick={handleAdd}>Create</Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>

//       {!myHostelId && (
//         <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
//           No hostel is assigned to your account yet. Ask your Super Admin to assign one before creating branches.
//         </div>
//       )}

//       {/* Edit Dialog */}
//       <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditBranch(null); }}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Branch</DialogTitle>
//             <DialogDescription>Update branch details</DialogDescription>
//           </DialogHeader>
//           {editBranch && (
//             <BranchFormFields
//               form={{
//                 unitName: editBranch.unitName,
//                 location: editBranch.location ?? "",
//                 phone:    editBranch.phone    ?? "",
//                 capacityBeds: editBranch.capacityBeds != null ? String(editBranch.capacityBeds) : "",
//               }}
//               hostelName={editBranch.hostelName ?? myHostelName ?? "Assigned Hostel"}
//               onChange={(f) => setEditBranch({
//                 ...editBranch,
//                 ...f,
//                 capacityBeds: f.capacityBeds === "" ? null : Number(f.capacityBeds),
//               })}
//             />
//           )}
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
//             <Button onClick={handleEdit}>Save</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Grid */}
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

// /* ── Shared form fields ── */
// const BranchFormFields = ({
//   form, hostelName, onChange,
// }: { form: BranchForm; hostelName: string; onChange: (f: BranchForm) => void }) => (
//   <div className="space-y-4">
//     <div className="space-y-1.5">
//       <Label className="text-xs text-muted-foreground">Parent Hostel (Managed Backend)</Label>
//       <Input value={hostelName} disabled className="bg-slate-50 cursor-not-allowed" />
//     </div>

//     <div className="space-y-1.5">
//       <Label>Branch Name</Label>
//       <Input
//         placeholder="e.g. North Wing, Block A"
//         value={form.unitName}
//         onChange={(e) => onChange({ ...form, unitName: e.target.value })}
//       />
//     </div>

//     <div className="space-y-1.5">
//       <Label>Location</Label>
//       <Input
//         placeholder="e.g. 1st Floor, Main Campus"
//         value={form.location}
//         onChange={(e) => onChange({ ...form, location: e.target.value })}
//       />
//     </div>

//     <div className="space-y-1.5">
//       <Label>Contact Phone</Label>
//       <Input
//         placeholder="Contact Phone (10 digits)"
//         value={form.phone}
//         maxLength={10}
//         onChange={(e) => {
//           const val = e.target.value.replace(/\D/g, "");
//           onChange({ ...form, phone: val });
//         }}
//       />
//     </div>

//     {/* ✅ Optional bed-capacity split — this branch's share of the
//         hostel's total capacityBeds (e.g. a 50-bed hostel split 30/20
//         across two branches). Left blank = no individual cap for this
//         branch; it's still bound by the hostel-wide cap. Backend
//         (BranchServiceImpl#validateBranchCapacitySplit) rejects a value
//         that would push the sum of all branches past the hostel's total.
//         NOTE: this cap is enforced on create/edit only — it is no longer
//         what the "Total Beds" grid column displays (that now shows the
//         actual bed count created via Rooms & Beds). */}
//     <div className="space-y-1.5">
//       <Label>Bed Capacity (optional)</Label>
//       <Input
//         type="number"
//         min={0}
//         placeholder="e.g. 20 — this branch's share of the hostel's total beds"
//         value={form.capacityBeds}
//         onChange={(e) => onChange({ ...form, capacityBeds: e.target.value.replace(/\D/g, "") })}
//       />
//       <p className="text-xs text-muted-foreground">
//         Leave blank if this branch doesn't need its own cap — it will still be limited by the hostel's overall bed capacity.
//       </p>
//     </div>
//   </div>
// );

// export default BranchPage;



















































import { useState, useCallback, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { createBranch, updateBranch, deleteBranch } from "@/lib/store";
import { getUserHostelId, getUserHostelName } from "@/lib/auth";
import { Branch, BranchRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Building2, Search, Download, Plus,
  Pencil, Trash2, Phone, ChevronLeft, ChevronRight,
} from "lucide-react";

/* ── Types ──
   capacityBeds carried through the form (doc1's real feature — this
   branch's optional share of the hostel's total bed cap). No mock
   manager/occupancy/status fields — those don't exist in the backend
   model, so they've been dropped rather than faked. */
interface BranchForm {
  unitName: string;
  location: string;
  phone: string;
  capacityBeds: string;
}
const EMPTY_FORM: BranchForm = { unitName: "", location: "", phone: "", capacityBeds: "" };

const COLORS = [
  { color: '#8b5cf6', bg: '#f3e8ff' },
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#22c55e', bg: '#dcfce7' },
  { color: '#f97316', bg: '#ffedd5' },
  { color: '#ec4899', bg: '#fce7f3' },
  { color: '#64748b', bg: '#f1f5f9' },
];

const BranchPage = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [form,       setForm]       = useState<BranchForm>(EMPTY_FORM);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  // Read the admin's own assigned hostel from session scoping
  const myHostelId   = getUserHostelId();
  const myHostelName = getUserHostelName();

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/units", {
        params: { page, size: pageSize },
      });
      const content       = res.data?.data?.content ?? res.data?.content ?? [];
      const totalElements = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;
      setBranches(content);
      setTotalCount(totalElements);
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.message || fallback);

  /* ── CRUD ── */
  const handleAdd = async () => {
    if (!form.unitName.trim()) { toast.error("Branch name required"); return; }
    if (!myHostelId) {
      toast.error("No hostel is assigned to your account yet. Ask your Super Admin to assign one.");
      return;
    }
    try {
      await createBranch({
        unitName: form.unitName,
        location: form.location,
        phone:    form.phone,
        hostelId: myHostelId,
        capacityBeds: form.capacityBeds === "" ? null : Number(form.capacityBeds),
      } as BranchRequest);
      toast.success("Branch created");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      loadBranches();
    } catch (e: any) { err(e, "Create failed"); }
  };

  const handleEdit = async () => {
    if (!editBranch) return;
    try {
      await updateBranch(editBranch.id, {
        unitName: editBranch.unitName,
        location: editBranch.location,
        phone:    editBranch.phone ?? "",
        hostelId: editBranch.hostelId ?? myHostelId,
        capacityBeds: editBranch.capacityBeds ?? null,
      } as BranchRequest);
      toast.success("Branch updated");
      setEditOpen(false);
      setEditBranch(null);
      loadBranches();
    } catch (e: any) { err(e, "Update failed"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBranch(id);
      toast.success("Branch deleted");
      loadBranches();
    } catch (e: any) { err(e, "Delete failed"); }
  };

  const filteredBranches = branches.filter(b =>
    b.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.location && b.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .branch-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1500px; margin: 0 auto; }

        .branch-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .branch-main-title { font-size: 18px; font-weight: 700; color: #0f172a; }

        .branch-controls { display: flex; align-items: center; gap: 12px; }
        .branch-search { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 240px; }
        .branch-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

        .branch-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .branch-btn-outline:hover { background: #f8fafc; }

        .branch-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
        .branch-btn-primary:hover { background: #4200cc; }
        .branch-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .branch-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .branch-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        .branch-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .branch-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .branch-table tr:last-child td { border-bottom: none; }
        .branch-table tr:hover { background: #fdfcff; }

        .branch-icon-box { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .branch-name { font-size: 14px; font-weight: 600; color: #0f172a; }
        .branch-address { font-size: 12px; color: #64748b; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }

        .branch-contact { font-size: 13px; font-weight: 500; color: #475569; display: flex; align-items: center; gap: 8px; }
        .branch-beds { font-size: 14px; font-weight: 600; color: #0f172a; }
        .branch-beds-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }

        .branch-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
        .branch-action-btn:hover { background: #f8fafc; color: #0f172a; }

        .branch-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fff; }
        .branch-page-info { font-size: 13px; color: #64748b; }
        .branch-page-controls { display: flex; align-items: center; gap: 8px; }
        .branch-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .branch-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .branch-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .branch-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .branch-footer-info { display: flex; align-items: center; gap: 8px; padding: 16px 20px; background: #f8fafc; border-radius: 12px; font-size: 13px; color: #5200FF; margin-top: 24px; font-weight: 500; }
      `}</style>

      <div className="branch-wrap">

        {/* Main Content Header */}
        <div className="branch-main-header">
          <div className="branch-main-title">All Branches</div>

          <div className="branch-controls">
            <button className="branch-btn-outline"><Download size={16} /> Export</button>

            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
              <DialogTrigger asChild>
                <button className="branch-btn-primary" disabled={!myHostelId} title={!myHostelId ? "No hostel assigned to your account yet" : undefined}>
                  <Plus size={16} /> Add Branch
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Branch</DialogTitle>
                  <DialogDescription>
                    Create a new branch under <span className="font-medium">{myHostelName ?? "your hostel"}</span>
                  </DialogDescription>
                </DialogHeader>
                <BranchFormFields form={form} hostelName={myHostelName ?? "Assigned Hostel"} onChange={setForm} />
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc]">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-4">
          <div className="branch-search">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {!myHostelId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3 mb-6">
            No hostel is assigned to your account yet. Ask your Super Admin to assign one before creating branches.
          </div>
        )}

        {/* Table */}
        <div className="branch-table-container">
          <div className="overflow-x-auto">
            <table className="branch-table">
              <thead>
                <tr>
                  <th>BRANCH NAME</th>
                  <th>CONTACT</th>
                  <th>BED CAPACITY</th>
                  <th>BEDS CREATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">Loading branches...</td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">No branches found.</td>
                  </tr>
                ) : (
                  filteredBranches.map(branch => {
                    const color = COLORS[branch.id % COLORS.length];
                    return (
                      <tr key={branch.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="branch-icon-box" style={{ background: color.bg }}>
                              <Building2 size={18} color={color.color} />
                            </div>
                            <div>
                              <div className="branch-name">{branch.unitName}</div>
                              <div className="branch-address">{branch.location || 'No location set'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="branch-contact">
                            <Phone size={14} color="#94a3b8" /> {branch.phone || 'No phone'}
                          </div>
                        </td>
                        <td>
                          <div className="branch-beds">{branch.capacityBeds ?? "-"}</div>
                          <div className="branch-beds-sub">
                            {branch.capacityBeds != null ? "individual cap" : "uses hostel cap"}
                          </div>
                        </td>
                        <td>
                          <div className="branch-beds">{branch.bedCount ?? 0}</div>
                          <div className="branch-beds-sub">via Rooms &amp; Beds</div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                              onClick={() => { setEditBranch({ ...branch }); setEditOpen(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {branch.unitName}?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(branch.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="branch-pagination">
            <div className="branch-page-info">
              Showing {branches.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} branches
            </div>
            <div className="branch-page-controls">
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8 rounded-lg"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button className="branch-page-btn active">{page + 1}</button>
              {page + 1 < Math.ceil(totalCount / pageSize) && (
                <button className="branch-page-btn" onClick={() => setPage(page + 1)}>{page + 2}</button>
              )}
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8 rounded-lg"
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* <div className="branch-footer-info">
          <div className="w-5 h-5 rounded-full border border-blue-200 flex items-center justify-center bg-blue-50 shrink-0">
            <span className="text-[10px] font-bold">i</span>
          </div>
          You can add, edit, view or manage all branches from here.
        </div> */}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditBranch(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Branch</DialogTitle>
              <DialogDescription>Update branch details</DialogDescription>
            </DialogHeader>
            {editBranch && (
              <BranchFormFields
                form={{
                  unitName: editBranch.unitName,
                  location: editBranch.location ?? "",
                  phone:    editBranch.phone    ?? "",
                  capacityBeds: editBranch.capacityBeds != null ? String(editBranch.capacityBeds) : "",
                }}
                hostelName={editBranch.hostelName ?? myHostelName ?? "Assigned Hostel"}
                onChange={(f) => setEditBranch({
                  ...editBranch,
                  ...f,
                  capacityBeds: f.capacityBeds === "" ? null : Number(f.capacityBeds),
                })}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc]">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

/* ── Shared form fields (includes the real capacityBeds field) ── */
const BranchFormFields = ({
  form, hostelName, onChange,
}: { form: BranchForm; hostelName: string; onChange: (f: BranchForm) => void }) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Parent Hostel (Managed Backend)</Label>
      <Input value={hostelName} disabled className="bg-slate-50 cursor-not-allowed" />
    </div>

    <div className="space-y-1.5">
      <Label>Branch Name</Label>
      <Input
        placeholder="e.g. North Wing, Block A"
        value={form.unitName}
        onChange={(e) => onChange({ ...form, unitName: e.target.value })}
      />
    </div>

    <div className="space-y-1.5">
      <Label>Location</Label>
      <Input
        placeholder="e.g. 1st Floor, Main Campus"
        value={form.location}
        onChange={(e) => onChange({ ...form, location: e.target.value })}
      />
    </div>

    <div className="space-y-1.5">
      <Label>Contact Phone</Label>
      <Input
        placeholder="Contact Phone (10 digits)"
        value={form.phone}
        maxLength={10}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "");
          onChange({ ...form, phone: val });
        }}
      />
    </div>

    <div className="space-y-1.5">
      <Label>Bed Capacity (optional)</Label>
      <Input
        type="number"
        min={0}
        placeholder="e.g. 20 — this branch's share of the hostel's total beds"
        value={form.capacityBeds}
        onChange={(e) => onChange({ ...form, capacityBeds: e.target.value.replace(/\D/g, "") })}
      />
      <p className="text-xs text-muted-foreground">
        Leave blank if this branch doesn't need its own cap — it will still be limited by the hostel's overall bed capacity.
      </p>
    </div>
  </div>
);

export default BranchPage;