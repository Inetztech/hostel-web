import { useEffect, useState, useMemo, useRef, useCallback } from "react";

import {
  registerUser,
  getBranches,
  getUsers,
  updateUser,
  deleteUser,
} from "@/lib/store";

import { Branch, User } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
import type { ColDef, IGetRowsParams } from "ag-grid-community";

/* ================= TYPES ================= */

interface UserForm {
  email: string;
  password: string;
  role: string;
  branchId: string;
}

const EMPTY_FORM: UserForm = {
  email: "",
  password: "",
  role: "",
  branchId: "",
};

/* ================= COMPONENT ================= */

const UserRegisterPage = () => {

  /* ================= STATE ================= */

  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [form,       setForm]       = useState<UserForm>(EMPTY_FORM);
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const gridRef = useRef<AgGridReact>(null);
  const didLoad = useRef(false);

  /* ================= LOAD BRANCHES ================= */
  // Dynamically fetches ALL branches regardless of total count —
  // Step 1: page 0 size=10 to read totalElements
  // Step 2: re-fetch with exact total if more records exist
  const loadBranches = useCallback(async () => {
    try {
      const first = await getBranches(0, 10);
      const total = first.totalElements ?? first.content.length;

      if (total <= first.content.length) {
        // All records came back in the first call
        setBranches(first.content);
      } else {
        // Fetch all using real total as page size
        const all = await getBranches(0, total);
        setBranches(all.content);
      }
    } catch {
      toast.error("Failed to load branches");
    }
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    loadBranches();
  }, [loadBranches]);

  /* ================= DATASOURCE ================= */

  const datasource = useMemo(() => ({
    getRows: async (params: IGetRowsParams) => {
      const pageSize = 10;
      const page     = Math.floor(params.startRow / pageSize);
      try {
        const result = await getUsers(page, pageSize);
        setTotalCount(result.totalElements);
        params.successCallback(result.content, result.totalElements);
      } catch (err) {
        console.error(err);
        params.failCallback();
        toast.error("Failed to load users");
      }
    },
  }), []);

  /* ================= REFRESH ================= */

  const refreshGrid = useCallback(() => {
    gridRef.current?.api?.refreshInfiniteCache();
  }, []);

  /* ================= FORM HELPERS ================= */

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "role" && value === "ADMIN" ? { branchId: "" } : {}),
    }));
  }, []);

  const handleEditChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value,
        ...(name === "role" && value === "ADMIN" ? { branchId: "" } : {}),
      };
    });
  }, []);

  /* ================= CRUD ================= */

  const handleAddSubmit = async () => {
    if (!form.email || !form.password) {
      toast.error("Email & Password required");
      return;
    }
    if (form.role === "WARDEN" && !form.branchId) {
      toast.error("Branch required for WARDEN");
      return;
    }
    try {
      setLoading(true);
      await registerUser({
        email:    form.email,
        password: form.password,
        role:     form.role as "ADMIN" | "WARDEN",
        branchId: form.role === "ADMIN" ? null : Number(form.branchId),
      });
      toast.success("User created");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editUser) return;
    try {
      setLoading(true);
      await updateUser(editUser.id, {
        email:    editUser.email,
        password: (editUser as any).password || undefined,
        role:     editUser.role,
        branchId: editUser.role === "ADMIN"
          ? null
          : Number((editUser as any).branchId) || null,
      });
      toast.success("User updated");
      setEditOpen(false);
      setEditUser(null);
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteUser(id);
      toast.success("User deleted");
      refreshGrid();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }, [refreshGrid]);

  const openEditDialog = useCallback((user: User) => {
    setEditUser({ ...user });
    setEditOpen(true);
  }, []);

  /* ================= GRID ================= */

  const columnDefs: ColDef<User>[] = useMemo(() => [
    {
      headerName: "ID",
      field: "id",
      width: 80,
      sortable: true,
      filter: true,
    },
    {
      headerName: "Email",
      field: "email",
      flex: 1.5,
      sortable: true,
      filter: true,
    },
    {
      headerName: "Role",
      field: "role",
      width: 120,
      sortable: true,
      filter: true,
    },
    {
      headerName: "Branch",
      field: "unitName",
      flex: 1,
      sortable: true,
      filter: true,
      valueGetter: (params: any) => params.data?.unitName ?? "-",
    },
    {
      headerName: "Actions",
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: User }) => {

        if (!params.data) return null;

        return (
          <div className="flex gap-2">

            {/* EDIT */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => openEditDialog(params.data)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {/* DELETE */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {params.data.email}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
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
        );
      },
    },
  ], [handleDelete, openEditDialog]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    flex: 1,
  }), []);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} users
          </p>
        </div>

        {/* ADD DIALOG */}
        <Dialog
          open={addOpen}
          onOpenChange={(v) => { setAddOpen(v); if (!v) setForm(EMPTY_FORM); }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>
                Add a new user and assign branch access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />
              
              <select name="role" value={form.role} onChange={handleChange} className="border p-2 rounded w-full">
                <option value="">Select Role</option>
                {/* Remove ADMIN option — only SUPER_ADMIN can create ADMINs */}
                <option value="WARDEN">WARDEN</option>
                <option value="TENANT">TENANT</option>
              </select>

              {(form.role === "WARDEN" || form.role === "TENANT") && (
                <select
                  name="branchId"
                  value={form.branchId}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.unitName}</option>
                  ))}
                </select>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button disabled={loading} onClick={handleAddSubmit}>
                {loading ? "Saving..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* EDIT DIALOG */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => { setEditOpen(v); if (!v) setEditUser(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>

          {editUser && (
            <div className="space-y-3">
              <Input
                name="email"
                placeholder="Email"
                value={editUser.email}
                onChange={handleEditChange}
              />
              <Input
                name="password"
                type="password"
                placeholder="New password (leave blank to keep)"
                onChange={handleEditChange}
              />
              <select
                name="role"
                value={editUser.role}
                onChange={handleEditChange}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="WARDEN">WARDEN</option>
                <option value="TENANT">TENANT</option>
              </select>

              {(editUser.role === "WARDEN" || editUser.role === "TENANT") && (
                <select
                  name="branchId"
                  value={(editUser as any).branchId ?? ""}
                  onChange={handleEditChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.unitName}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={loading} onClick={handleEditSubmit}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRID */}
      <div className="ag-theme-alpine" style={{ height: 513, width: "100%" }}>
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
          animateRows
        />
      </div>

    </div>
  );
};

export default UserRegisterPage;