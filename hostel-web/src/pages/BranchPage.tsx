import { useEffect, useMemo, useState } from "react";
import {
  fetchBranches,
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

import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";

const BranchPage = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBranchData, setEditBranchData] = useState<Branch | null>(null);
  const [unitName, setUnitName] = useState("");

  const role = getUserRole()?.toUpperCase();

  /* ================= LOAD DATA ================= */
  const reload = async () => {
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch {
      toast.error("Failed to load branches");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  /* ================= ACTIONS ================= */
  const handleAdd = async () => {
    if (!unitName) {
      toast.error("Unit name required");
      return;
    }

    try {
      await createBranch({ unitName } as BranchRequest);
      toast.success("Branch created");
      setAddOpen(false);
      setUnitName("");
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create branch");
    }
  };

  const handleEdit = async () => {
    if (!editBranchData) return;

    try {
      await updateBranch(editBranchData.id, {
        unitName: editBranchData.unitName,
      } as BranchRequest);
      toast.success("Branch updated");
      setEditOpen(false);
      setEditBranchData(null);
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update branch");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBranch(id);
      toast.success("Branch deleted");
      reload();
    } catch {
      toast.error("Failed to delete branch");
    }
  };

  /* ================= GRID DATA ================= */
  const rowData = useMemo(() => branches, [branches]);

  const columnDefs: ColDef[] = [
    { headerName: "Unit Name", field: "unitName", filter: true },

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
                    setEditBranchData({ ...params.data });
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

  const Grid = ({ data }: { data: any[] }) => (
    <div className="ag-theme-alpine" style={{ height: 500 }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 20, 50, 100]}
      />
    </div>
  );

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

        {role === "ADMIN" && (
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
              </DialogHeader>

              <div className="grid gap-4">
                <Input
                  placeholder="Unit Name"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                />
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
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>

          {editBranchData && (
            <div className="grid gap-4">
              <Input
                value={editBranchData.unitName}
                onChange={(e) =>
                  setEditBranchData({
                    ...editBranchData,
                    unitName: e.target.value,
                  })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRID */}
      <Card>
        <CardContent>
          <Grid data={rowData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchPage;