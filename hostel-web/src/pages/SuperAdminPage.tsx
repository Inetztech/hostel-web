// src/pages/SuperAdminPage.tsx
import { useEffect, useState } from "react";
import {
  createAdmin, getAllAdmins, deleteAdmin, activateAdmin, deactivateAdmin, updateAdmin
} from "@/lib/store";
import { Admin, AdminRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff } from "lucide-react";

export default function SuperAdminPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Admin | null>(null);
  const [form, setForm] = useState<AdminRequest>({ email: "", password: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAllAdmins(page, 10);
      setAdmins(res.content);
      setTotal(res.totalElements);
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ email: "", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (admin: Admin) => {
    setEditTarget(admin);
    setForm({ email: admin.email, password: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editTarget) {
        await updateAdmin(editTarget.id, form);
        toast.success("Admin updated");
      } else {
        await createAdmin(form);
        toast.success("Admin created");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this admin?")) return;
    try {
      await deleteAdmin(id);
      toast.success("Admin deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleToggle = async (admin: Admin) => {
    try {
      if (admin.active) {
        await deactivateAdmin(admin.id);
        toast.success("Admin deactivated");
      } else {
        await activateAdmin(admin.id);
        toast.success("Admin activated");
      }
      load();
    } catch {
      toast.error("Toggle failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Management</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Admins ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 pr-4 text-muted-foreground">{admin.id}</td>
                    <td className="py-3 pr-4 font-medium">{admin.email}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={admin.active ? "default" : "secondary"}>
                        {admin.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(admin)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(admin)}
                        title={admin.active ? "Deactivate" : "Activate"}
                      >
                        {admin.active
                          ? <ShieldOff className="h-3 w-3 text-red-500" />
                          : <ShieldCheck className="h-3 w-3 text-green-500" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              size="sm" variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >Prev</Button>
            <Button
              size="sm" variant="outline"
              disabled={(page + 1) * 10 >= total}
              onClick={() => setPage(p => p + 1)}
            >Next</Button>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Admin" : "Create Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder={editTarget ? "New password (leave blank to keep)" : "Password"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>
                {editTarget ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}