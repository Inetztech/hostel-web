import { useEffect, useMemo, useState } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getUserRole,
} from "@/lib/store";

import { Branch, BranchRequest } from "@/lib/types";

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

import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions } from "ag-grid-community";

const BranchPage = () => {
  /* ================= STATE ================= */
  const [branches, setBranches] = useState<Branch[]>([]);
  const [unitName, setUnitName] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  const role = getUserRole()?.toUpperCase();
  const hasAccess = true;

  /* ================= LOAD ================= */
  const reload = async () => {
  try {
    const data = await getBranches(0,10);

    setBranches(data);

  } catch (err) {
    console.error(err);
    toast.error("Failed to load branches");
  }
};

  useEffect(() => {
    reload();
  }, []);

  /* ================= CRUD ================= */
  const handleAdd = async () => {
    if (!unitName.trim()) {
      toast.error("Unit name required");
      return;
    }

    try {
      await createBranch({ unitName } as BranchRequest);
      toast.success("Branch created");
      setAddOpen(false);
      setUnitName("");
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const handleEdit = async () => {
    if (!editBranch) return;

    try {
      await updateBranch(editBranch.id, {
        unitName: editBranch.unitName,
      } as BranchRequest);

      toast.success("Branch updated");
      setEditOpen(false);
      setEditBranch(null);
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBranch(id);
      toast.success("Branch deleted");
      reload();
    } catch (e: any){
      toast.error(e?.response?.data?.message ||"Delete failed");
    }
  };

  /* ================= GRID ================= */
  const rowData = useMemo(() => branches, [branches]);

  const columnDefs: ColDef<Branch>[] = [
  {
    headerName: "Unit Name",
    field: "unitName",
    filter: true,
  },

  ...(hasAccess
  ?[
        {
          headerName: "Actions",
          cellRenderer: (params: { data: Branch }) => (
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditBranch({ ...params.data });
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
                      Delete Branch {params.data.unitName}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the branch and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(params.data.id)}
                    >
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

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    flex: 1,
  };



  /* ================= UI ================= */
  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">
            {branches.length} units
          </p>
        </div>

        {hasAccess && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>

            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
              <DialogDescription>
                Create a new branch by entering the unit name.
              </DialogDescription>
            </DialogHeader>

              <Input
                placeholder="Unit Name"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
              />

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
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update the branch unit name.
          </DialogDescription>
        </DialogHeader>

          {editBranch && (
            <Input
              value={editBranch.unitName}
              onChange={(e) =>
                setEditBranch({
                  ...editBranch,
                  unitName: e.target.value,
                })
              }
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRID */}
        <div className="ag-theme-alpine" style={{ height: 513 }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
          />
        </div>
    </div>
  );
};

export default BranchPage;