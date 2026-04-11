import { useEffect, useState, useMemo } from "react";

import {
  registerUser,
  getBranches,
  getUsers,
} from "@/lib/store";

import { Branch } from "@/lib/types";

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

import { toast } from "sonner";
import { Plus } from "lucide-react";

import { AgGridReact } from "ag-grid-react";

/* ================= TYPES ================= */

type User = {
  id: number;
  email: string;
  role: string;
  branchId?: number | null;
  unitName?: string;
};

const UserRegisterPage = () => {

  /* ================= STATE ================= */

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "VIEWER",
    branchId: "",
  });

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD ================= */

  const loadBranches = async () => {

    try {

      const data = await getBranches(0, 100);

      setBranches(data);

    }
    catch (err) {

      console.error(err);

      toast.error("Failed to load branches");

    }

  };

  const loadUsers = async () => {

    try {

      const data = await getUsers();

      setUsers(data);

    }
    catch (err) {

      console.error(err);

      toast.error("Failed to load users");

    }

  };

  useEffect(() => {

    loadBranches();
    loadUsers();

  }, []);

  /* ================= FORM ================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {

    const { name, value } = e.target;

    // if ADMIN selected → clear branch
    if (name === "role" && value === "ADMIN") {

      setForm({

        ...form,
        role: value,
        branchId: ""

      });

      return;

    }

    setForm({

      ...form,
      [name]: value,

    });

  };

  const handleSubmit = async () => {

    /* validation */

    if (!form.email || !form.password) {

      toast.error("Email & Password required");

      return;

    }

    if (form.role === "VIEWER" && !form.branchId) {

      toast.error("Branch required for VIEWER");

      return;

    }

    try {

      setLoading(true);

      await registerUser({

        email: form.email,
        password: form.password,
        role: form.role as "ADMIN" | "VIEWER",

        branchId:

          form.role === "ADMIN"
            ? null
            : Number(form.branchId),

      });

      toast.success("User created");

      await loadUsers();

      setOpen(false);

      setForm({

        email: "",
        password: "",
        role: "VIEWER",
        branchId: "",

      });

    }
    catch (e: any) {

      toast.error(

        e?.response?.data?.message ||
        "User creation failed"

      );

    }

    setLoading(false);

  };

  /* ================= AGGRID ================= */

  const columnDefs = useMemo(() => [

    {
      headerName: "ID",
      field: "id",
      width: 90,
      sortable: true,
      filter: true,
    },

    {
      headerName: "Email",
      field: "email",
      flex: 1,
      sortable: true,
      filter: true,
    },

    {
      headerName: "Role",
      field: "role",
      width: 130,
      sortable: true,
      filter: true,
    },

    {
      headerName: "Branch",
      field: "unitName",
      flex: 1,
      sortable: true,
      filter: true,

      valueGetter: (params:any) =>

        params.data?.unitName || "-",

    },

  ], []);

  const defaultColDef = useMemo(() => ({

    resizable: true,

  }), []);

  /* ================= UI ================= */

  return (

    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-2xl font-bold">

            Users

          </h1>

          <p className="text-sm text-muted-foreground">

            Create system users

          </p>

        </div>

        {/* CREATE USER */}

        <Dialog open={open} onOpenChange={setOpen}>

          <DialogTrigger asChild>

            <Button size="sm">

              <Plus className="h-4 w-4 mr-2" />

              Create User

            </Button>

          </DialogTrigger>

          <DialogContent>

            <DialogHeader>

              <DialogTitle>

                Create User

              </DialogTitle>

              <DialogDescription>

                Add a new user and assign branch access.

              </DialogDescription>

            </DialogHeader>

            <div className="space-y-3">

              {/* EMAIL */}

              <Input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />

              {/* PASSWORD */}

              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />

              {/* ROLE */}

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              >

                <option value="ADMIN">

                  ADMIN

                </option>

                <option value="VIEWER">

                  VIEWER

                </option>

              </select>

              {/* BRANCH only for viewer */}

              {form.role === "VIEWER" && (

                <select
                  name="branchId"
                  value={form.branchId}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >

                  <option value="">

                    Select Branch

                  </option>

                  {branches.map(b => (

                    <option
                      key={b.id}
                      value={b.id}
                    >

                      {b.unitName}

                    </option>

                  ))}

                </select>

              )}

            </div>

            <DialogFooter>

              <DialogClose asChild>

                <Button variant="outline">

                  Cancel

                </Button>

              </DialogClose>

              <Button
                disabled={loading}
                onClick={handleSubmit}
              >

                {loading
                  ? "Saving..."
                  : "Create"}

              </Button>

            </DialogFooter>

          </DialogContent>

        </Dialog>

      </div>

      {/* AGGRID TABLE */}

      <div
        className="ag-theme-alpine"
        style={{

          height: 513,
          width: "100%",

        }}
      >

        <AgGridReact

          rowData={users}

          columnDefs={columnDefs}

          defaultColDef={defaultColDef}

          pagination={true}

          paginationPageSize={10}

          paginationPageSizeSelector={[
            10,
            20,
            50,
            100
          ]}

          animateRows={true}

        />

      </div>

    </div>

  );

};

export default UserRegisterPage;