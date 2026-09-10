import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createBranch, updateBranch, deleteBranch, fetchBranches } from "@/lib/store";
import { getUserHostelId, getUserHostelName } from "@/lib/auth";
import { showBedLimitToast } from "@/lib/limitError";
import { Branch, BranchRequest } from "@/lib/types";
import { STATES, TN_DISTRICTS } from "@/lib/tnLocations";
import { LocationAreaSelect } from "@/components/LocationAreaSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Building2, Search, Plus,
  Pencil, Trash2, Phone, ChevronLeft, ChevronRight, MoreHorizontal, X,
} from "lucide-react";

interface BranchForm {
  unitName: string;
  state: string;
  district: string;
  area: string;
  location: string;
  phone: string;
  capacityBeds: string;
}
const EMPTY_FORM: BranchForm = {
  unitName: "", state: "", district: "", area: "", location: "", phone: "", capacityBeds: "",
};

const COLORS = [
  { color: '#8b5cf6', bg: '#f3e8ff' },
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#22c55e', bg: '#dcfce7' },
  { color: '#f97316', bg: '#ffedd5' },
  { color: '#ec4899', bg: '#fce7f3' },
  { color: '#64748b', bg: '#f1f5f9' },
];

const unwrapEntity = <T extends { id?: any }>(res: any): T | undefined => {
  if (res && res.id != null) return res as T;
  if (res?.data && res.data.id != null) return res.data as T;
  if (res?.data?.data && res.data.data.id != null) return res.data.data as T;
  return undefined;
};

const getPageNumbers = (current: number, total: number): (number | "...")[] => {
  const SIBLINGS = 1;
  const totalNumbers = SIBLINGS * 2 + 5;

  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftIndex = Math.max(current - SIBLINGS, 1);
  const rightIndex = Math.min(current + SIBLINGS, total);

  const showLeftEllipsis = leftIndex > 2;
  const showRightEllipsis = rightIndex < total - 1;

  const pages: (number | "...")[] = [];
  pages.push(1);
  if (showLeftEllipsis) pages.push("...");
  for (let p = Math.max(leftIndex, 2); p <= Math.min(rightIndex, total - 1); p++) {
    pages.push(p);
  }
  if (showRightEllipsis) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
};

const BranchPage = () => {
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  // Raw text the user is typing, and the debounced value actually sent to the API.
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [form,       setForm]       = useState<BranchForm>(EMPTY_FORM);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  const myHostelId   = getUserHostelId();
  const myHostelName = getUserHostelName();

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Whenever the debounced search term changes, go back to page 0.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { content, totalElements } = await fetchBranches(page, pageSize, debouncedSearch);
      setBranches(content);
      setTotalCount(totalElements);
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.message || fallback);

  const handleAdd = async () => {
    if (!form.unitName.trim()) { toast.error("Branch name required"); return; }
    if (!myHostelId) {
      toast.error("No hostel is assigned to your account yet. Ask your Super Admin to assign one.");
      return;
    }
    try {
      const res = await createBranch({
        unitName: form.unitName,
        location: form.location,
        state:    form.state || undefined,
        district: form.district || undefined,
        phone:    form.phone,
        hostelId: myHostelId,
        capacityBeds: form.capacityBeds === "" ? null : Number(form.capacityBeds),
      } as BranchRequest);

      toast.success("Branch created");
      setForm(EMPTY_FORM);
      setAddOpen(false);

      const newBranch = unwrapEntity<Branch>(res);
      navigate("/rooms", {
        state: newBranch?.id != null
          ? { unitId: newBranch.id, openAddRoom: true }
          : undefined,
      });

      loadBranches();
    } catch (e: any) {
      showBedLimitToast(e, navigate, "Create failed");
    }
  };

  const handleEdit = async () => {
    if (!editBranch) return;
    try {
      await updateBranch(editBranch.id, {
        unitName: editBranch.unitName,
        location: editBranch.location,
        state:    editBranch.state || undefined,
        district: editBranch.district || undefined,
        phone:    editBranch.phone ?? "",
        hostelId: editBranch.hostelId ?? myHostelId,
        capacityBeds: editBranch.capacityBeds ?? null,
      } as BranchRequest);
      toast.success("Branch updated");
      setEditOpen(false);
      setEditBranch(null);
      loadBranches();
    } catch (e: any) {
      showBedLimitToast(e, navigate, "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBranch(id);
      toast.success("Branch deleted");
      loadBranches();
    } catch (e: any) { err(e, "Delete failed"); }
  };

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage1Based = page + 1;
  const pageNumbers = getPageNumbers(currentPage1Based, totalPages);

  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .branch-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1500px; margin: 0 auto; }

        .branch-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .branch-main-title { font-size: 18px; font-weight: 700; color: #0f172a; }

        .branch-controls { display: flex; align-items: center; gap: 12px; }
        .branch-search { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 280px; }
        .branch-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

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

        .branch-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fff; flex-wrap: wrap; gap: 12px; }
        .branch-page-info { font-size: 13px; color: #64748b; }
        .branch-page-controls { display: flex; align-items: center; gap: 6px; }
        .branch-page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .branch-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .branch-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .branch-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .branch-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; }
      `}</style>

      <div className="branch-wrap">

        <div className="branch-main-header">
          <div className="branch-main-title">All Branches</div>

          <div className="branch-controls">
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
              <DialogTrigger asChild>
                <button className="branch-btn-primary" disabled={!myHostelId} title={!myHostelId ? "No hostel assigned to your account yet" : undefined}>
                  <Plus size={16} /> Add Branch
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px] rounded-2xl overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Add Branch</DialogTitle>
                  <DialogDescription>
                    Create a new branch under <span className="font-medium">{myHostelName ?? "your hostel"}</span>
                  </DialogDescription>
                </DialogHeader>
                <BranchFormFields form={form} hostelName={myHostelName ?? "Assigned Hostel"} onChange={setForm} />
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                  <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="branch-search">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {!myHostelId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3 mb-6">
            No hostel is assigned to your account yet. Ask your Super Admin to assign one before creating branches.
          </div>
        )}

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
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">No branches found.</td>
                  </tr>
                ) : (
                  branches.map(branch => {
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
                              onClick={() => {
                                setEditBranch({ ...branch });
                                setEditOpen(true);
                              }}
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
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {branch.unitName}?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(branch.id)} className="bg-red-600 hover:bg-red-700 rounded-lg">Delete</AlertDialogAction>
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
                onClick={() => setPage(p => Math.max(p - 1, 0))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="branch-page-ellipsis">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`branch-page-btn ${p === currentPage1Based ? "active" : ""}`}
                    onClick={() => setPage(p - 1)}
                  >
                    {p}
                  </button>
                )
              )}

              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8 rounded-lg"
                disabled={currentPage1Based >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditBranch(null); }}>
          <DialogContent className="sm:max-w-[640px] rounded-2xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Branch</DialogTitle>
              <DialogDescription>Update branch details</DialogDescription>
            </DialogHeader>
            {editBranch && (
              <BranchFormFields
                form={{
                  unitName: editBranch.unitName,
                  state: editBranch.state ?? "",
                  district: editBranch.district ?? "",
                  area: editBranch.location?.split(",")[0]?.trim() ?? "",
                  location: editBranch.location ?? "",
                  phone: editBranch.phone ?? "",
                  capacityBeds: editBranch.capacityBeds != null ? String(editBranch.capacityBeds) : "",
                }}
                hostelName={editBranch.hostelName ?? myHostelName ?? "Assigned Hostel"}
                onChange={(f) => {
                  setEditBranch({
                    ...editBranch,
                    unitName: f.unitName,
                    location: f.location,
                    state: f.state,
                    district: f.district,
                    phone: f.phone,
                    capacityBeds: f.capacityBeds === "" ? null : Number(f.capacityBeds),
                  });
                }}
              />
            )}
            <DialogFooter>
              <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const BranchFormFields = ({
  form, hostelName, onChange,
}: { form: BranchForm; hostelName: string; onChange: (f: BranchForm) => void }) => {
  const handleStateChange = (value: string) => {
    onChange({ ...form, state: value, district: "", area: "", location: "" });
  };

  const handleDistrictChange = (value: string) => {
    onChange({ ...form, district: value, area: "", location: "" });
  };

  const handleAreaChange = (value: string) => {
    const stateLabel = STATES.find(s => s.value === form.state)?.label ?? form.state;
    const composed = [value, form.district, stateLabel].filter(Boolean).join(", ");
    onChange({ ...form, area: value, location: composed });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Parent Hostel (Managed Backend)</Label>
        <Input value={hostelName} disabled className="bg-slate-50 cursor-not-allowed rounded-lg" />
      </div>

      <div className="space-y-1.5">
        <Label>Branch Name</Label>
        <Input
          placeholder="e.g. North Wing, Block A"
          value={form.unitName}
          className="rounded-lg"
          onChange={(e) => onChange({ ...form, unitName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={form.state} onValueChange={handleStateChange}>
            <SelectTrigger className="rounded-lg">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>District</Label>
          <SearchableSelect
            value={form.district}
            options={TN_DISTRICTS}
            disabled={!form.state}
            placeholder={!form.state ? "Select state first" : "Search district..."}
            onChange={handleDistrictChange}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Location</Label>
          <LocationAreaSelect
            value={form.area}
            district={form.district}
            stateLabel={STATES.find(s => s.value === form.state)?.label ?? "Tamil Nadu"}
            disabled={!form.district}
            placeholder={!form.district ? "Select district first" : "Select location"}
            onChange={handleAreaChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Contact Phone</Label>
          <Input
            placeholder="Contact Phone (10 digits)"
            value={form.phone}
            maxLength={10}
            className="rounded-lg"
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
            placeholder="e.g. 20"
            value={form.capacityBeds}
            className="rounded-lg"
            onChange={(e) => onChange({ ...form, capacityBeds: e.target.value.replace(/\D/g, "") })}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Leave Bed Capacity blank if this branch doesn't need its own cap — it will still be limited by the hostel's overall bed capacity.
      </p>
    </div>
  );
};

export default BranchPage;