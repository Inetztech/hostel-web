import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  registerUser,
  getBranches,
  getUsers,
  updateUser,
  deleteUser,
  getPermissionCatalog,
  getUserPermissions,
  assignUserPermissions,
} from "@/lib/store";
import { Branch, User, RegisterUserRequest, PermissionCatalogItem } from "@/lib/types";
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
import {
  Users,
  Search, Download, Plus, Pencil, Trash2, ChevronDown, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, Building2, IndianRupee, Zap, FileText, Settings,
} from "lucide-react";

/* ================= TYPES ================= */

interface UserForm {
  name: string;
  phone: string;
  email: string;
  role: string;
  branchId: string;
}

const EMPTY_FORM: UserForm = {
  name: "",
  phone: "",
  email: "",
  role: "",
  branchId: "",
};

/* Phone numbers everywhere in this file are stored/validated as
   exactly 10 digits, digits-only (no spaces, +91, dashes, etc). */
const PHONE_LENGTH = 10;
const sanitizePhoneInput = (raw: string) => raw.replace(/\D/g, "").slice(0, PHONE_LENGTH);
const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

const COLORS = [
  { color: '#8b5cf6', bg: '#f3e8ff' },
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#22c55e', bg: '#dcfce7' },
  { color: '#f97316', bg: '#ffedd5' },
  { color: '#ec4899', bg: '#fce7f3' },
  { color: '#64748b', bg: '#f1f5f9' },
  { color: '#14b8a6', bg: '#ccfbf1' },
];

const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

// Same module → icon/color/order mapping used in PermissionManagementPage,
// so the permission checklist here looks consistent with that page.
const MODULE_META: Record<string, { icon: any; color: string; bg: string; order: number }> = {
  Property:   { icon: Building2,   color: '#3b82f6', bg: '#eff6ff', order: 0 },
  People:     { icon: Users,       color: '#f97316', bg: '#ffedd5', order: 1 },
  Finance:    { icon: IndianRupee, color: '#22c55e', bg: '#dcfce7', order: 2 },
  Operations: { icon: Zap,         color: '#eab308', bg: '#fef9c3', order: 3 },
  Reporting:  { icon: FileText,    color: '#a855f7', bg: '#f3e8ff', order: 4 },
};
const DEFAULT_MODULE_META = { icon: Settings, color: '#64748b', bg: '#f1f5f9', order: 99 };

const groupByModule = (list: PermissionCatalogItem[]) => {
  const map: Record<string, PermissionCatalogItem[]> = {};
  list.forEach(item => { (map[item.module] ||= []).push(item); });
  return Object.entries(map).sort(
    (a, b) => (MODULE_META[a[0]]?.order ?? 99) - (MODULE_META[b[0]]?.order ?? 99)
  );
};

/* ================= COMPONENT ================= */

const UserRegisterPage = () => {
  const location = useLocation();

  /* ================= STATE ================= */

  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [users,      setUsers]      = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [form,       setForm]       = useState<UserForm>(EMPTY_FORM);
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(0);
  const [pageSize]   = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Permissions — Create dialog ─────────────────────────────────────────
  const [permCatalog, setPermCatalog]     = useState<PermissionCatalogItem[]>([]);
  const [permLoading, setPermLoading]     = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // ── Permissions — Edit dialog ───────────────────────────────────────────
  const [editPermCatalog, setEditPermCatalog]     = useState<PermissionCatalogItem[]>([]);
  const [editPermLoading, setEditPermLoading]     = useState(false);
  const [editSelectedPerms, setEditSelectedPerms] = useState<Set<string>>(new Set());

  /* ================= LOAD DATA ================= */

  const loadBranches = useCallback(async () => {
    try {
      const first = await getBranches(0, 10);
      const total = first.totalElements ?? first.content.length;

      if (total <= first.content.length) {
        setBranches(first.content);
      } else {
        const all = await getBranches(0, total);
        setBranches(all.content);
      }
    } catch {
      toast.error("Failed to load branches");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers(page, pageSize);
      setUsers(result.content);
      setTotalCount(result.totalElements);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadBranches();
    loadUsers();
  }, [loadBranches, loadUsers]);

  /* ── INCOMING NAVIGATION STATE ————————————————————————————
     TenantsPage redirects here right after a tenant is checked in
     without an inline login (no email was given at check-in), passing
     { openAddUser, prefill: { name, phone, email, branchId }, role }
     via router state. Pre-fill the Create User form with what was
     already collected and pop the Add dialog open, so the flow goes
     straight from "checked in a tenant" to "give them a login" in one
     step — mirrors the RoomsPage → TenantsPage openAddTenant handoff.
     ── */
  useEffect(() => {
    const navState = location.state as
      {
        openAddUser?: boolean;
        prefill?: { name?: string; phone?: string; email?: string; branchId?: number | string };
        role?: string;
      } | null;
    if (!navState?.openAddUser) return;

    const p = navState.prefill ?? {};
    setForm({
      name:     p.name ?? "",
      phone:    sanitizePhoneInput(p.phone ?? ""),
      email:    p.email ?? "",
      role:     navState.role ?? "TENANT",
      branchId: p.branchId != null ? String(p.branchId) : "",
    });
    setAddOpen(true);

    // Clear the navigation state after consuming it so a refresh or
    // back/forward navigation doesn't keep re-opening the dialog.
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /* ================= PERMISSIONS — CREATE DIALOG ================= */

  // Loads the assignable catalog once a role is picked in the Create dialog.
  useEffect(() => {
    if (!addOpen || !form.role) {
      setPermCatalog([]);
      setSelectedPerms(new Set());
      return;
    }
    let cancelled = false;
    setPermLoading(true);
    getPermissionCatalog()
      .then(list => {
        if (cancelled) return;
        setPermCatalog(list);
        setSelectedPerms(new Set());
      })
      .catch(() => { if (!cancelled) toast.error("Failed to load permissions"); })
      .finally(() => { if (!cancelled) setPermLoading(false); });
    return () => { cancelled = true; };
  }, [addOpen, form.role]);

  const toggleCreatePerm = (name: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const groupedCreateCatalog = useMemo(() => groupByModule(permCatalog), [permCatalog]);

  /* ================= PERMISSIONS — EDIT DIALOG ================= */

  // Loads the target user's real granted permissions from
  // GET /permissions/user/{id} (same call PermissionManagementPage uses).
  useEffect(() => {
    if (!editOpen || !editUser) {
      setEditPermCatalog([]);
      setEditSelectedPerms(new Set());
      return;
    }
    let cancelled = false;
    setEditPermLoading(true);
    getUserPermissions(editUser.id)
      .then(res => {
        if (cancelled) return;
        setEditPermCatalog(res.catalog);
        setEditSelectedPerms(new Set(res.catalog.filter(c => c.granted).map(c => c.name)));
      })
      .catch(() => { if (!cancelled) toast.error("Failed to load permissions"); })
      .finally(() => { if (!cancelled) setEditPermLoading(false); });
    return () => { cancelled = true; };
  }, [editOpen, editUser?.id]);

  const toggleEditPerm = (name: string) => {
    setEditSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const groupedEditCatalog = useMemo(() => groupByModule(editPermCatalog), [editPermCatalog]);

  /* ================= FORM HELPERS ================= */

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm(prev => ({ ...prev, phone: sanitizePhoneInput(value) }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUser(prev => {
      if (!prev) return prev;
      if (name === "phone") return { ...prev, phone: sanitizePhoneInput(value) };
      return { ...prev, [name]: value };
    });
  }, []);

  /* ================= CRUD ================= */

  const handleAddSubmit = async () => {
    if (!form.email) {
      toast.error("Email required");
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`);
      return;
    }
    if (!form.role) {
      toast.error("Role required");
      return;
    }
    if (!form.branchId) {
      toast.error("Branch required");
      return;
    }
    try {
      setLoading(true);
      const payload: RegisterUserRequest = {
        name:     form.name,
        phone:    form.phone,
        email:    form.email,
        role:     form.role as "WARDEN" | "TENANT",
        branchId: Number(form.branchId),
      };
      const created = await registerUser(payload);

      // FIX: registerUser's response doesn't reliably expose `.id` (some
      // backends return it nested, or just a success message), so the old
      // code's `newUserId` came back undefined and the whole
      // assignUserPermissions call was skipped — silently, with no error —
      // even though checkboxes were ticked. That's why permissions never
      // stuck on create.
      // Now: try the common response shapes first, then fall back to
      // looking the just-created user up by email, and surface an error
      // if we still can't resolve an id instead of failing silently.
      let newUserId: number | undefined =
        (created as any)?.id ??
        (created as any)?.userId ??
        (created as any)?.user?.id;

      if (!newUserId) {
        try {
          const lookup = await getUsers(0, 50);
          const match = (lookup.content as User[]).find(
            (u) => u.email?.toLowerCase() === form.email.toLowerCase()
          );
          newUserId = match?.id;
        } catch {
          // fall through — handled by the missing-id branch below
        }
      }

      if (selectedPerms.size > 0) {
        if (newUserId) {
          try {
            await assignUserPermissions(newUserId, Array.from(selectedPerms));
          } catch (permErr: any) {
            toast.error(
              permErr?.response?.data?.message ||
              "User created, but assigning permissions failed. Edit the user to try again."
            );
          }
        } else {
          toast.error(
            "User created, but couldn't resolve the new user's ID to assign permissions. Edit the user to assign them."
          );
        }
      }

      toast.success("User created — login credentials emailed");
      setForm(EMPTY_FORM);
      setSelectedPerms(new Set());
      setAddOpen(false);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editUser) return;
    if (!editUser.role) {
      toast.error("Role required");
      return;
    }
    if (editUser.phone && !isValidPhone(editUser.phone)) {
      toast.error(`Phone number must be exactly ${PHONE_LENGTH} digits`);
      return;
    }
    try {
      setLoading(true);
      const payload: RegisterUserRequest = {
        name:     editUser.name ?? "",
        phone:    editUser.phone ?? "",
        email:    editUser.email,
        password: editUser.password || undefined,
        role:     editUser.role as "WARDEN" | "TENANT",
        branchId: Number(editUser.branchId) || Number((editUser as any).branch?.id) || null,
      };
      await updateUser(editUser.id, payload);

      try {
        await assignUserPermissions(editUser.id, Array.from(editSelectedPerms));
      } catch {
        toast.error("User updated, but saving permissions failed.");
      }

      toast.success("User updated");
      setEditOpen(false);
      setEditUser(null);
      loadUsers();
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
      loadUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }, [loadUsers]);

  const openEditDialog = useCallback((user: User) => {
    setEditUser({ ...user, phone: sanitizePhoneInput(user.phone ?? "") });
    setEditOpen(true);
  }, []);

  /* ================= PERMISSION CHECKLIST (shared markup) ================= */

  const renderPermChecklist = (
    grouped: [string, PermissionCatalogItem[]][],
    isLoading: boolean,
    selected: Set<string>,
    onToggle: (name: string) => void,
    onSelectAll: () => void,
    onClearAll: () => void,
  ) => (
    <div className="border rounded-xl p-3 space-y-3 max-h-56 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Permissions</span>
        <div className="flex gap-3">
          <button type="button" className="text-[11px] font-medium text-blue-600 hover:underline" onClick={onSelectAll} disabled={isLoading}>
            Select All
          </button>
          <button type="button" className="text-[11px] font-medium text-slate-500 hover:underline" onClick={onClearAll} disabled={isLoading}>
            Clear All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" /> Loading permissions…
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-slate-400 py-2">No permissions available.</div>
      ) : (
        grouped.map(([moduleName, items]) => {
          const meta = MODULE_META[moduleName] || DEFAULT_MODULE_META;
          const Icon = meta.icon;
          return (
            <div key={moduleName} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{moduleName}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-5">
                {items.map(item => (
                  <label key={item.name} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(item.name)}
                      onChange={() => onToggle(item.name)}
                      className="h-3.5 w-3.5 rounded border-gray-300 shrink-0"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /* ================= DERIVED ================= */

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleBadgeColor = (role?: string) => {
    if (role === "WARDEN") return { color: '#3b82f6', bg: '#eff6ff' };
    return { color: '#22c55e', bg: '#dcfce7' }; // TENANT / other
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .usr-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1500px; margin: 0 auto; }

        /* Main Content Header */
        .usr-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .usr-main-title { font-size: 18px; font-weight: 700; color: #0f172a; }

        .usr-controls { display: flex; align-items: center; gap: 12px; }
        .usr-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .usr-btn-outline:hover { background: #f8fafc; }
        .usr-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 10px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
        .usr-btn-primary:hover { background: #4200cc; }

        /* Search & Filters */
        .usr-filters-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .usr-search { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; height: 38px; background: #fff; width: 260px; }
        .usr-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

        .usr-filter-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 14px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; min-width: 140px; }
        .usr-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; }

        /* Table */
        .usr-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .usr-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .usr-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .usr-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .usr-table tr:last-child td { border-bottom: none; }
        .usr-table tr:hover { background: #fdfcff; }

        .usr-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
        .usr-name { font-size: 14px; font-weight: 600; color: #0f172a; }
        .usr-phone { font-size: 12px; color: #64748b; margin-top: 4px; }
        .usr-email { font-size: 13px; color: #475569; font-weight: 500; }

        .usr-role-badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }

        .usr-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .usr-branch-loc { font-size: 12px; color: #64748b; margin-top: 2px; }

        .usr-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .usr-status-badge.active { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .usr-status-badge.inactive { color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; }
        .usr-status-badge.pending { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }

        .usr-date { font-size: 12px; font-weight: 600; color: #0f172a; }
        .usr-time { font-size: 11px; color: #64748b; margin-top: 2px; }

        .usr-action-btn { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
        .usr-action-btn:hover { background: #f8fafc; color: #0f172a; }
        .usr-action-btn svg { flex-shrink: 0; }

        /* Pagination */
        .usr-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fff; }
        .usr-page-info { font-size: 13px; color: #64748b; }
        .usr-page-controls { display: flex; align-items: center; gap: 8px; }
        .usr-page-btn { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .usr-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .usr-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .usr-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .usr-footer-info { display: flex; align-items: center; gap: 8px; padding: 16px 20px; background: #f8fafc; border-radius: 12px; font-size: 13px; color: #5200FF; margin-top: 24px; font-weight: 500; }
      `}</style>

      <div className="usr-wrap">

        {/* Main Content Header */}
        <div className="usr-main-header">
          <div className="usr-main-title">All Registered Users</div>

          <div className="usr-controls">
            {/* <button className="usr-btn-outline"><Download size={16} className="shrink-0" /> Export</button> */}

            <Dialog
              open={addOpen}
              onOpenChange={(v) => {
                setAddOpen(v);
                if (!v) { setForm(EMPTY_FORM); setSelectedPerms(new Set()); }
              }}
            >
              <DialogTrigger asChild>
                <button className="usr-btn-primary">
                  <Plus size={16} className="shrink-0" /> Add New User
                </button>
              </DialogTrigger>
              {/* FIX: rounded-2xl was on the same element as overflow-y-auto,
                  so the scrollbar track ran flush against the right edge
                  top-to-bottom and visually squared off the top-right /
                  bottom-right corners (see screenshot). The rounding +
                  clipping now lives on this OUTER wrapper (overflow-hidden,
                  no scroll here), while a separate INNER div handles the
                  scrolling. That keeps every corner rounded regardless of
                  scrollbar. Widened to sm:max-w-2xl and the fields switched
                  to a 2-column grid (landscape layout) so the form is much
                  shorter and needs far less scrolling in the first place. */}
              <DialogContent className="sm:max-w-2xl rounded-2xl overflow-hidden p-0 max-h-[85vh] flex flex-col">
                <div className="px-6 pt-6">
                  <DialogHeader>
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>Add a new user and assign branch access. A password is generated automatically and emailed to them.</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="overflow-y-auto px-6 pb-2 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} className="rounded-xl" />
                    <Input
                      name="phone"
                      placeholder="Phone Number (10 digits)"
                      value={form.phone}
                      onChange={handleChange}
                      inputMode="numeric"
                      type="tel"
                      maxLength={PHONE_LENGTH}
                      className="rounded-xl"
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        setForm(prev => ({ ...prev, phone: sanitizePhoneInput(prev.phone + pasted) }));
                      }}
                    />
                    <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="rounded-xl" />
                    <select name="role" value={form.role} onChange={handleChange} className="border p-2 rounded-xl w-full text-sm">
                      <option value="">Select Role</option>
                      <option value="WARDEN">WARDEN</option>
                      <option value="TENANT">TENANT</option>
                    </select>
                    {form.role && (
                      <select name="branchId" value={form.branchId} onChange={handleChange} className="border p-2 rounded-xl w-full text-sm">
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.unitName}</option>)}
                      </select>
                    )}
                  </div>
                  {form.email && (
                    <p className="text-xs text-muted-foreground mt-2">
                      A password will be generated automatically and emailed to <span className="font-medium">{form.email}</span>.
                    </p>
                  )}

                  {form.role && (
                    <div className="mt-3">
                      {renderPermChecklist(
                        groupedCreateCatalog,
                        permLoading,
                        selectedPerms,
                        toggleCreatePerm,
                        () => setSelectedPerms(new Set(permCatalog.map(c => c.name))),
                        () => setSelectedPerms(new Set()),
                      )}
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 pt-2 border-t">
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline" className="rounded-xl">Cancel</Button></DialogClose>
                    <Button disabled={loading} onClick={handleAddSubmit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-xl">
                      {loading ? "Saving..." : "Create"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="usr-filters-row">
          <div className="usr-search">
            <Search size={16} color="#94a3b8" className="shrink-0" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="usr-clear-btn" onClick={() => setSearchTerm("")}>
            <RefreshCw size={14} className="shrink-0" /> Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="usr-table-container">
          <div className="overflow-x-auto">
            <table className="usr-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>BRANCH</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const avatarColor = COLORS[idx % COLORS.length];
                    const roleColor = roleBadgeColor(user.role);

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="usr-avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <div className="usr-name">{user.name || "Unknown"}</div>
                              <div className="usr-phone">{user.phone || "No phone"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="usr-email">{user.email}</div>
                        </td>
                        <td>
                          <div className="usr-role-badge" style={{ background: roleColor.bg, color: roleColor.color }}>
                            {user.role}
                          </div>
                        </td>
                        <td>
                          <div className="usr-branch-name">{user.unitName ?? (user as any).branch?.unitName ?? "-"}</div>
                        </td>
                        <td>
                          <div className="usr-status-badge active">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Active
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="usr-action-btn"
                              onClick={() => openEditDialog(user)}
                              title="Edit"
                            >
                              <Pencil size={16} className="shrink-0" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="usr-action-btn" title="Delete">
                                  <Trash2 size={16} color="#ef4444" className="shrink-0" />
                                </button>
                              </AlertDialogTrigger>
                              {/* rounded-2xl matches the rest of the app's
                                  destructive-confirm dialogs */}
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {user.email}?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete</AlertDialogAction>
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
          <div className="usr-pagination">
            <div className="usr-page-info">
              Showing {users.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} users
            </div>
            <div className="usr-page-controls">
              <button
                className="usr-page-btn"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} className="shrink-0" />
              </button>
              <button className="usr-page-btn active">{page + 1}</button>
              {page + 1 < Math.ceil(totalCount / pageSize) && (
                <button className="usr-page-btn" onClick={() => setPage(page + 1)}>{page + 2}</button>
              )}
              <button
                className="usr-page-btn"
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={16} className="shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* <div className="usr-footer-info">
          <div className="w-5 h-5 rounded-full border border-blue-200 flex items-center justify-center bg-blue-50 shrink-0">
            <span className="text-[10px] font-bold">i</span>
          </div>
          You can add, edit, view, activate, deactivate or delete users and their permissions from here.
        </div> */}

        {/* EDIT DIALOG */}
        <Dialog
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) { setEditUser(null); setEditSelectedPerms(new Set()); }
          }}
        >
          <DialogContent className="sm:max-w-2xl rounded-2xl overflow-hidden p-0 max-h-[85vh] flex flex-col">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user details.</DialogDescription>
              </DialogHeader>
            </div>

            {editUser && (
              <div className="overflow-y-auto px-6 pb-2 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Input name="name" placeholder="Full Name" value={editUser.name || ""} onChange={handleEditChange} className="rounded-xl" />
                  <Input
                    name="phone"
                    placeholder="Phone Number (10 digits)"
                    value={editUser.phone || ""}
                    onChange={handleEditChange}
                    inputMode="numeric"
                    type="tel"
                    maxLength={PHONE_LENGTH}
                    className="rounded-xl"
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      setEditUser(prev => prev ? { ...prev, phone: sanitizePhoneInput((prev.phone || "") + pasted) } : prev);
                    }}
                  />
                  <Input name="email" placeholder="Email" value={editUser.email} onChange={handleEditChange} className="rounded-xl" />
                  <Input name="password" type="password" placeholder="New password (leave blank to keep)" onChange={handleEditChange} className="rounded-xl" />
                  <select name="role" value={editUser.role} onChange={handleEditChange} className="border p-2 rounded-xl w-full text-sm">
                    <option value="">Select Role</option>
                    <option value="WARDEN">WARDEN</option>
                    <option value="TENANT">TENANT</option>
                  </select>
                  {editUser.role && (
                    <select name="branchId" value={editUser.branchId ?? (editUser as any).branch?.id ?? ""} onChange={handleEditChange} className="border p-2 rounded-xl w-full text-sm">
                      <option value="">Select Branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.unitName}</option>)}
                    </select>
                  )}
                </div>

                {editUser.role && (
                  <div className="mt-3">
                    {renderPermChecklist(
                      groupedEditCatalog,
                      editPermLoading,
                      editSelectedPerms,
                      toggleEditPerm,
                      () => setEditSelectedPerms(new Set(editPermCatalog.map(c => c.name))),
                      () => setEditSelectedPerms(new Set()),
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="px-6 pb-6 pt-2 border-t">
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button disabled={loading} onClick={handleEditSubmit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-xl">
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserRegisterPage;