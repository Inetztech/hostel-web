import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
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
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 10
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

const RuleRegulationPage = () => {
  const [rules, setRules] = useState<RuleRegulation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const initialLoadRef = useRef(true);
  const isFetchingRef = useRef(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleRegulation | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRule, setViewRule] = useState<RuleRegulation | null>(null);

  const [form, setForm] = useState<RuleRegulationRequest>({
    title: "",
    description: "",
    category: "",
    published: true,
    createdBy: "Admin",
    branchId: undefined,
  });

  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const role = getUserRole()?.toUpperCase();
  const canManage = role === "ADMIN" || role === "SUPER_ADMIN";

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

  const closeViewDialog = () => {
    setViewOpen(false);
    setViewRule(null);
  };

  const loadData = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;

    try {
      if (initialLoadRef.current) {
        setLoading(true);
      }
      const [rulesData, branchesData] = await Promise.all([
        fetchAllPages<RuleRegulation>(fetchRulesRegulations, 10),
        canManage ? fetchAllPages<Branch>(getBranches, 10) : Promise.resolve([]),
      ]);
      setRules(canManage ? rulesData : rulesData.filter((r) => r.published));
      setBranches(branchesData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rules & regulations");
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
      isFetchingRef.current = false;
    }
  }, [canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      toast.success("Rule created successfully");
      closeCreateDialog();
      await loadData(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to create rule");
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

      toast.success("Rule updated successfully");
      closeEditDialog();
      await loadData(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRuleRegulation(id);
      toast.success("Rule deleted successfully");
      await loadData(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete rule");
    }
  };

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
        (r.branchId === null || r.branchId === undefined
          ? true
          : String(r.branchId) === selectedBranch);
      return matchSearch && matchStatus && matchBranch;
    });
  }, [rules, searchText, selectedStatus, selectedBranch]);

  const paginatedRules = useMemo(() => {
    return filteredRules.slice(
      currentPage * pageSize,
      (currentPage + 1) * pageSize
    );
  }, [filteredRules, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRules.length / pageSize) || 1;

  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col 2xl:flex-row gap-6">
          <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 md:px-6 flex items-center justify-between border-b border-slate-100">
              <h1 className="text-base font-bold text-slate-900">
                Rules &amp; Regulations List
              </h1>
              {canManage && (
                <Button
                  size="sm"
                  className="h-10 bg-[#5200FF] hover:bg-[#4200cc] text-white px-4 font-semibold"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Rule
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-white flex-wrap">
              <div className="flex bg-white border border-slate-200 rounded-md h-10 px-3 w-full sm:w-[260px] items-center gap-2">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {canManage && (
                <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden h-10 w-[140px]">
                  <Select
                    value={selectedStatus}
                    onValueChange={(v) => {
                      setSelectedStatus(v);
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {canManage && (
                <div className="flex bg-[#ffffff] border border-slate-200 rounded-md overflow-hidden h-10 w-[160px]">
                  <Select
                    value={selectedBranch}
                    onValueChange={(v) => {
                      setSelectedBranch(v);
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.unitName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <button
                type="button"
                className="flex items-center gap-2 text-sm text-slate-500 font-semibold hover:text-slate-900 ml-auto transition-colors"
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

            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-left tracking-wider">
                      ID
                    </th>
                    <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-left tracking-wider">
                      RULE TITLE
                    </th>
                    <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-left tracking-wider">
                      BRANCH
                    </th>
                    {canManage && (
                      <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-left tracking-wider">
                        STATUS
                      </th>
                    )}
                    <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-left tracking-wider">
                      LAST UPDATED
                    </th>
                    <th className="text-[11px] font-semibold text-slate-400 uppercase px-6 py-4 text-right tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={canManage ? 6 : 5}
                        className="text-center py-20 text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-[#5200FF]" />
                          <span className="text-sm font-medium">Loading regulations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRules.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 6 : 5}
                        className="text-center py-16 text-slate-400 text-sm font-medium"
                      >
                        No rules found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRules.map((row, i) => {
                      const globalIdx = currentPage * pageSize + i;
                      const bName = row.branchName ?? "N/A";

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-[13px] font-semibold text-slate-500 w-12">
                            {globalIdx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[14px] text-slate-900 mb-1 font-medium">
                              {row.title}
                            </div>
                            <div
                              className="text-[12px] font-medium text-slate-500 max-w-[280px] truncate"
                              title={row.description}
                            >
                              {row.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[13px] font-medium text-slate-700">
                            {bName}
                          </td>
                          {canManage && (
                            <td className="px-6 py-4">
                              {row.published ? (
                                <div className="text-[13px] font-semibold text-emerald-600 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Published
                                </div>
                              ) : (
                                <div className="text-[13px] font-semibold text-slate-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Draft
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="text-[13px] text-slate-800">
                              {formatDate(row.updatedAt || row.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-md border border-slate-200 inline-flex items-center justify-center text-slate-600 mr-2 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                              title="View"
                              onClick={() => {
                                setViewRule(row);
                                setViewOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  className="w-8 h-8 rounded-md border border-slate-200 inline-flex items-center justify-center text-slate-600 mr-2 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                  title="Edit"
                                  onClick={() => {
                                    setEditRule({ ...row });
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-8 h-8 rounded-md border border-slate-200 inline-flex items-center justify-center text-red-500 bg-white hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete "{row.title}"?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This rule will be permanently deleted.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleDelete(row.id!);
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100 bg-white">
              <div className="text-[14px] text-slate-500 font-medium">
                Showing{" "}
                {paginatedRules.length === 0 ? 0 : currentPage * pageSize + 1}{" "}
                to{" "}
                {Math.min((currentPage + 1) * pageSize, filteredRules.length)}{" "}
                of {filteredRules.length} rules
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm font-medium"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  for (let i = 0; i < totalPages; i++) {
                    if (
                      i === 0 ||
                      i === totalPages - 1 ||
                      Math.abs(i - currentPage) <= 1
                    ) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== "...") {
                      pages.push("...");
                    }
                  }
                  return pages.map((p, idx) => {
                    if (p === "...")
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium"
                        >
                          ...
                        </span>
                      );
                    const isCurrent = p === currentPage;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${
                          isCurrent
                            ? "bg-[#5200FF] text-white border border-[#5200FF]"
                            : "border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => setCurrentPage(p as number)}
                      >
                        {(p as number) + 1}
                      </button>
                    );
                  });
                })()}
                <button
                  type="button"
                  className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-sm font-medium"
                  disabled={(currentPage + 1) * pageSize >= filteredRules.length}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW DIALOG */}
        <Dialog
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open);
            if (!open) closeViewDialog();
          }}
        >
          <DialogContent className="rounded-3xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Rule & Regulation Details
              </DialogTitle>
            </DialogHeader>
            {viewRule && (
              <div className="space-y-4 my-2 text-sm text-slate-700">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Title
                  </label>
                  <div className="text-base font-semibold text-slate-900">
                    {viewRule.title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Branch
                    </label>
                    <div className="font-medium text-slate-800">
                      {viewRule.branchName ?? "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <div>
                      {viewRule.published ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Last Updated
                  </label>
                  <div className="text-slate-600">
                    {formatDate(viewRule.updatedAt || viewRule.createdAt)}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {viewRule.description}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeViewDialog}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {canManage && (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetCreateForm();
            }}
          >
            <DialogContent className="rounded-3xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  Create Rule / Regulation
                </DialogTitle>
                <DialogDescription>
                  Published rules are visible to Wardens and Tenants; drafts stay admin-only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-2">
                <Select
                  value={form.branchId ? String(form.branchId) : ""}
                  onValueChange={(v) => setForm({ ...form, branchId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.unitName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <Select
                  value={form.published === false ? "draft" : "published"}
                  onValueChange={(v) =>
                    setForm({ ...form, published: v === "published" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">
                      Published (visible to Warden/Tenant)
                    </SelectItem>
                    <SelectItem value="draft">Draft (Admin only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={closeCreateDialog}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="bg-[#5200FF] hover:bg-[#4200cc] text-white"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canManage && (
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) setEditRule(null);
            }}
          >
            <DialogContent className="rounded-3xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  Edit Rule / Regulation
                </DialogTitle>
                <DialogDescription>Update rule details.</DialogDescription>
              </DialogHeader>
              {editRule && (
                <div className="space-y-4 my-2">
                  <Select
                    value={editRule.branchId ? String(editRule.branchId) : ""}
                    onValueChange={(v) =>
                      setEditRule({
                        ...editRule,
                        branchId: Number(v),
                        branchName:
                          branches.find((b) => String(b.id) === v)?.unitName ?? null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.unitName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Title"
                    value={editRule.title}
                    onChange={(e) =>
                      setEditRule({ ...editRule, title: e.target.value })
                    }
                  />
                  <Textarea
                    placeholder="Description"
                    rows={5}
                    value={editRule.description}
                    onChange={(e) =>
                      setEditRule({ ...editRule, description: e.target.value })
                    }
                  />
                  <Select
                    value={editRule.published ? "published" : "draft"}
                    onValueChange={(v) =>
                      setEditRule({ ...editRule, published: v === "published" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">
                        Published (visible to Warden/Tenant)
                      </SelectItem>
                      <SelectItem value="draft">Draft (Admin only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#5200FF] hover:bg-[#4200cc] text-white"
                  onClick={handleEdit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default RuleRegulationPage;