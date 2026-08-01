import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  createRuleRegulation,
  updateRuleRegulation,
  deleteRuleRegulation,
  getUserRole,
  getBranches,
  fetchRulesRegulations,
} from "@/lib/store";

import { RuleRegulation, RuleRegulationRequest, Branch } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  Plus, Pencil, Trash2, Download, Search, RefreshCw
} from "lucide-react";

/* ================= HELPERS ================= */
async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 100
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);
  const firstContent: T[] = first?.content ?? first ?? [];
  const total: number = first?.totalElements ?? firstContent.length;
  if (total <= pageSize) return firstContent;
  const totalPages = Math.ceil(total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
    )
  );
  return [...firstContent, ...rest.flat()];
}

function formatDate(raw?: string | null): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

/* ================= COMPONENT ================= */
const RuleRegulationPage = () => {
  const [rules, setRules] = useState<RuleRegulation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<RuleRegulationRequest>({
    title: "",
    description: "",
    category: "",
    published: true,
    createdBy: "Admin",
    branchId: undefined,
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleRegulation | null>(null);

  const role = getUserRole()?.toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canManage = role === "ADMIN" || role === "SUPER_ADMIN";

  /* ================= RESET HELPERS ================= */
  const resetCreateForm = () => {
    setForm({
      title: "",
      description: "",
      category: "",
      published: true,
      createdBy: "Admin",
      branchId: undefined,
    });
  };

  const closeCreateDialog = () => {
    setAddOpen(false);
    resetCreateForm();
  };

  const closeEditDialog = () => {
    setEditOpen(false);
    setEditRule(null);
  };

  /* ================= LOAD DATA ================= */
  const loadData = useCallback(async () => {
    try {
      if (initialLoad) setLoading(true);
      const [rulesData, branchesData] = await Promise.all([
        fetchAllPages<RuleRegulation>(fetchRulesRegulations, 100),
        canManage ? fetchAllPages<Branch>(getBranches, 100) : Promise.resolve([]),
      ]);
      setRules(canManage ? rulesData : rulesData.filter((r) => r.published));
      setBranches(branchesData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [canManage, initialLoad]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= CRUD ================= */
  const handleCreate = async () => {
    if (!form.branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      setLoading(true);
      await createRuleRegulation(form);
      toast.success("Rule created");
      closeCreateDialog();
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editRule) return;

    if (!editRule.branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!editRule.title?.trim() || !editRule.description?.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      setLoading(true);
      await updateRuleRegulation(editRule.id, {
        title: editRule.title,
        description: editRule.description,
        category: editRule.category,
        published: editRule.published,
        createdBy: editRule.createdBy,
        branchId: editRule.branchId,
      } as RuleRegulationRequest);
      toast.success("Rule updated");
      closeEditDialog();
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRuleRegulation(id);
      toast.success("Rule deleted");
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  };

  /* ================= FILTER & PAGINATION ================= */
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 8;

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        r.title.toLowerCase().includes(searchText.toLowerCase()) ||
        r.description.toLowerCase().includes(searchText.toLowerCase());
      const matchStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" ? r.published : !r.published);
      const matchBranch =
        selectedBranch === "all" ||
        (r.branchId === null || r.branchId === undefined ? true : String(r.branchId) === selectedBranch);
      return matchSearch && matchStatus && matchBranch;
    });
  }, [rules, searchText, selectedStatus, selectedBranch]);

  const paginatedRules = filteredRules.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(filteredRules.length / pageSize) || 1;

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rr-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .rr-main { display: flex; gap: 24px; align-items: flex-start; }
        .rr-content { flex: 1; min-width: 0; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }

        .rr-panel-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .rr-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .rr-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .rr-table th { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fff; letter-spacing: 0.5px; }
        .rr-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .rr-table tr:hover { background: #fdfcff; }

        .rr-action-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; margin-right: 8px; background: #fff; cursor: pointer; transition: 0.2s; }
        .rr-action-btn svg { width: 16px; height: 16px; min-width: 16px; min-height: 16px; stroke: currentColor; fill: none; display: block; }
        .rr-action-btn:last-child { margin-right: 0; }
        .rr-action-btn:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .rr-action-btn.del { color: #ef4444; }
        .rr-action-btn.del:hover { background: #fef2f2; border-color: #fca5a5; }
      `}</style>

      <div className="rr-wrap">
        {/* MAIN LAYOUT */}
        <div className="rr-main flex-col 2xl:flex-row">

          {/* TABLE */}
          <div className="rr-content w-full">
            <div className="rr-panel-header">
              <div className="rr-panel-title">Rules &amp; Regulations List</div>
              <div className="flex gap-2">
                {/* <Button variant="outline" size="sm" className="h-10 font-semibold text-slate-700 px-4">
                  <Download size={16} className="mr-2" /> Export
                </Button> */}

                {canManage && (
                  <Button size="sm" className="h-10 bg-[#5200FF] hover:bg-[#4200cc] text-white px-4 font-semibold" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add New Rule
                  </Button>
                )}
              </div>
            </div>

            {/* FILTERS */}
            <div className="flex items-center gap-3 p-5 border-b border-[#f1f5f9] bg-white flex-wrap">
              <div className="flex bg-white border border-[#e2e8f0] rounded-md h-10 px-3 w-[260px] items-center gap-2">
                <Search size={16} className="text-slate-400" />
                <input type="text" placeholder="Search rules..." value={searchText} onChange={(e) => { setSearchText(e.target.value); setCurrentPage(0); }} className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal" />
              </div>

              {canManage && (
                <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-10 w-[140px]">
                  <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(0); }}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* BRANCH SELECTOR FILTER */}
              <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-10 w-[160px]">
                <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setCurrentPage(0); }}>
                  <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                className="flex items-center gap-2 text-sm text-[#64748b] font-semibold hover:text-[#0f172a] ml-auto transition-colors"
                onClick={() => {
                  setSearchText("");
                  setSelectedStatus("all");
                  setSelectedBranch("all");
                  setCurrentPage(0);
                }}
              >
                <RefreshCw size={16} /> Clear Filters
              </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>RULE TITLE</th>
                    <th>BRANCH</th>
                    {canManage && <th>STATUS</th>}
                    <th>LAST UPDATED</th>
                    {canManage && <th className="text-right">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRules.length === 0 ? (
                    <tr><td colSpan={canManage ? 6 : 4} className="text-center py-12 text-slate-400">No rules found.</td></tr>
                  ) : (
                    paginatedRules.map((row, i) => {
                      const globalIdx = currentPage * pageSize + i;
                      const bName = row.branchName ?? "N/A";

                      return (
                        <tr key={row.id}>
                          <td className="text-[13px] font-semibold text-slate-500 w-12">{globalIdx + 1}</td>
                          <td>
                            <div className="text-[14px] font-bold text-slate-900 mb-1">{row.title}</div>
                            <div className="text-[12px] font-medium text-slate-500 max-w-[280px] truncate" title={row.description}>{row.description}</div>
                          </td>
                          <td className="text-[13px] font-medium text-slate-700">{bName}</td>
                          {canManage && (
                            <td>
                              {row.published ? (
                                <div className="text-[13px] font-semibold text-emerald-600 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Published
                                </div>
                              ) : (
                                <div className="text-[13px] font-semibold text-slate-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Draft
                                </div>
                              )}
                            </td>
                          )}
                          <td>
                            <div className="text-[13px] font-bold text-slate-800">{formatDate(row.updatedAt || row.createdAt)}</div>
                          </td>
                          {canManage && (
                            <td className="text-right whitespace-nowrap">
                              <button 
                                type="button"
                                className="rr-action-btn" 
                                title="Edit" 
                                onClick={() => { setEditRule({ ...row }); setEditOpen(true); }}
                              >
                                <Pencil className="w-4 h-4 text-slate-600" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button type="button" className="rr-action-btn del" title="Delete">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{row.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                                      onClick={(e) => { e.preventDefault(); handleDelete(row.id!); }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-6 py-5 border-t border-[#f1f5f9] bg-white rounded-b-2xl">
              <div className="text-[14px] text-[#64748b] font-medium">
                Showing {paginatedRules.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredRules.length)} of {filteredRules.length} rules
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm font-medium"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  &lt;
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  for (let i = 0; i < totalPages; i++) {
                    if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) pages.push(i);
                    else if (pages[pages.length - 1] !== '...') pages.push('...');
                  }
                  return pages.map((p, idx) => {
                    if (p === '...') return <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium">...</span>;
                    const isCurrent = p === currentPage;
                    return (
                      <button key={p} type="button" className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-[#5200FF] text-white border border-[#5200FF]' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`} onClick={() => setCurrentPage(p as number)}>
                        {(p as number) + 1}
                      </button>
                    );
                  });
                })()}
                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm font-medium"
                  disabled={(currentPage + 1) * pageSize >= filteredRules.length}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Dialog */}
        {canManage && (
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetCreateForm(); }}>
            <DialogContent className="rounded-3xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create Rule / Regulation</DialogTitle>
                <DialogDescription>
                  Published rules are visible to Wardens and Tenants; drafts stay admin-only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={form.branchId ? String(form.branchId) : ""} onValueChange={(v) => setForm({ ...form, branchId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Select value={form.published === false ? "draft" : "published"} onValueChange={(v) => setForm({ ...form, published: v === "published" })}>
                  <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published (visible to Warden/Tenant)</SelectItem>
                    <SelectItem value="draft">Draft (Admin only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" onClick={closeCreateDialog}>Cancel</Button></DialogClose>
                <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleCreate} disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {canManage && (
          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditRule(null); }}>
            <DialogContent className="rounded-3xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl">Edit Rule / Regulation</DialogTitle>
                <DialogDescription>Update the rule details.</DialogDescription>
              </DialogHeader>
              {editRule && (
                <div className="space-y-4">
                  <Select value={editRule.branchId ? String(editRule.branchId) : ""} onValueChange={(v) => setEditRule({ ...editRule, branchId: Number(v), branchName: branches.find((b) => String(b.id) === v)?.unitName ?? null })}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Title" value={editRule.title} onChange={(e) => setEditRule({ ...editRule, title: e.target.value })} />
                  <Textarea placeholder="Description" rows={5} value={editRule.description} onChange={(e) => setEditRule({ ...editRule, description: e.target.value })} />
                  <Select value={editRule.published ? "published" : "draft"} onValueChange={(v) => setEditRule({ ...editRule, published: v === "published" })}>
                    <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published (visible to Warden/Tenant)</SelectItem>
                      <SelectItem value="draft">Draft (Admin only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
                <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleEdit} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default RuleRegulationPage;