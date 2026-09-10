import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  shareAnnouncementWhatsApp,
  getUserRole,
  fetchBranches,
  fetchAllPages,
} from "@/lib/store";

import { Announcement, AnnouncementRequest, Branch } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  Send,
  Search,
  RefreshCw,
} from "lucide-react";

function formatDate(raw: string): string {
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

const AnnouncementPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementRequest>({
    title: "",
    content: "",
    createdBy: "Admin",
    branchId: undefined,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);

  const role = getUserRole()?.toUpperCase();
  const hasAccess = role === "ADMIN" || role === "WARDEN" || role === "SUPER_ADMIN";

  const didLoad = useRef(false);

  const resetCreateForm = () => {
    setForm({
      title: "",
      content: "",
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
    setEditAnnouncement(null);
  };

  // CHANGED: previously called fetchAnnouncements() with no args, which
  // silently returned only the first backend page (page=0, size=10).
  // Since this page does its own client-side search/filter/pagination
  // over the full `announcements` array, it needs every row, not one
  // page. fetchAllPages() loops through every backend page and
  // concatenates the results.
  const reload = useCallback(async () => {
    try {
      const data = await fetchAllPages<Announcement>(fetchAnnouncements, 10);
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
    }
  }, []);

  // CHANGED: same issue and same fix as reload() above — fetchBranches()
  // with no args only returned the first 10 branches, which capped the
  // "Select Branch" dropdown and the branch filter at 10 entries even
  // though many more exist.
  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchAllPages<Branch>(fetchBranches, 10);
      setBranches(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load branches");
    }
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    reload();
    loadBranches();
  }, [reload, loadBranches]);

  const handleCreate = async () => {
    if (!form.branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!form.title.trim() || !form.content.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await createAnnouncement(form);

      toast.success("Announcement created successfully");

      closeCreateDialog();
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editAnnouncement) return;

    if (!editAnnouncement.branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!editAnnouncement.title?.trim() || !editAnnouncement.content?.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await updateAnnouncement(editAnnouncement.id, {
        title: editAnnouncement.title,
        content: editAnnouncement.content,
        createdBy: editAnnouncement.createdBy,
        branchId: editAnnouncement.branchId,
      } as AnnouncementRequest);

      toast.success("Announcement updated");
      setEditOpen(false);
      setEditAnnouncement(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  };

  const handleShare = async (id: number) => {
    try {
      setSharingId(id);
      await shareAnnouncementWhatsApp(id);
      toast.success("Shared on WhatsApp successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "WhatsApp share failed");
    } finally {
      setSharingId(null);
    }
  };

  const [searchText, setSearchText] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    return announcements.filter((a) => {
      const matchSearch =
        a.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchText.toLowerCase());
      const matchBranch =
        selectedBranch === "all" || String(a.branchId) === selectedBranch;
      return matchSearch && matchBranch;
    });
  }, [announcements, searchText, selectedBranch]);

  const paginatedRows = filteredRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .ap-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .ap-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .ap-panel-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .ap-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .ap-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .ap-table th { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fff; letter-spacing: 0.5px; }
        .ap-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .ap-table tr:hover { background: #fdfcff; }

        .ap-row-title { font-size: 13px; font-weight: 500; color: #334155; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ap-msg { font-size: 13px; color: #64748b; max-width: 320px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
        .ap-branch { font-size: 13px; font-weight: 500; color: #334155; }
        .ap-date { font-size: 13px; font-weight: 500; color: #334155; }
      `}</style>

      <div className="ap-wrap">
        <div className="ap-panel">
          <div className="ap-panel-header">
            <div className="ap-panel-title">All Announcements</div>
            <div className="flex gap-2">
              {hasAccess && (
                <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetCreateForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 bg-[#5200FF] hover:bg-[#4200cc] text-white">
                      <Plus className="h-4 w-4 mr-2" /> Add Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Create Announcement</DialogTitle>
                      <DialogDescription>Share important updates with hostel tenants via WhatsApp.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        value={form.branchId ? String(form.branchId) : ""}
                        onValueChange={(v) => setForm({ ...form, branchId: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.unitName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      <Textarea placeholder="Content" rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline" onClick={closeCreateDialog}>Cancel</Button></DialogClose>
                      <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleCreate} disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-5 border-b border-[#f1f5f9] bg-white flex-wrap">
            <div className="flex bg-white border border-[#e2e8f0] rounded-md h-10 px-3 w-[260px] items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(0); }}
                className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal"
              />
            </div>

            {(role === "ADMIN" || role === "SUPER_ADMIN") && (
              <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-10 w-[180px]">
                <Select
                  value={selectedBranch}
                  onValueChange={(v) => { setSelectedBranch(v); setCurrentPage(0); }}
                >
                  <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <button
              type="button"
              className="flex items-center gap-2 text-sm text-[#64748b] font-semibold hover:text-[#0f172a] ml-auto transition-colors"
              onClick={() => {
                setSearchText("");
                setSelectedBranch("all");
                setCurrentPage(0);
              }}
            >
              <RefreshCw size={16} /> Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>MESSAGE</th>
                  <th>BRANCH</th>
                  <th>CREATED BY</th>
                  <th>CREATED AT</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No announcements found.</td></tr>
                ) : (
                  paginatedRows.map((row) => {
                    const bName = row.branchName ?? "N/A";

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="ap-row-title" title={row.title || ""}>{row.title}</div>
                        </td>
                        <td><div className="ap-msg" title={row.content}>{row.content}</div></td>
                        <td>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                            {bName}
                          </span>
                        </td>
                        <td><div className="ap-branch">{row.createdBy}</div></td>
                        <td><div className="ap-date">{row.createdAt ? formatDate(row.createdAt) : "—"}</div></td>
                        <td className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 flex items-center justify-center transition-colors disabled:opacity-50"
                              title={`Share via WhatsApp with ${bName} tenants`}
                              disabled={sharingId === row.id}
                              onClick={() => handleShare(row.id!)}
                            >
                              <Send size={15} className="text-emerald-600 shrink-0" />
                            </button>

                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center transition-colors"
                              title="Edit announcement"
                              onClick={() => { setEditAnnouncement({ ...row }); setEditOpen(true); }}
                            >
                              <Pencil size={15} className="text-blue-600 shrink-0" />
                            </button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-300 flex items-center justify-center transition-colors"
                                  title="Delete announcement"
                                >
                                  <Trash2 size={15} className="text-red-600 shrink-0" />
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
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={(e) => { e.preventDefault(); handleDelete(row.id!); }}
                                  >
                                    Delete
                                  </AlertDialogAction>
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

          <div className="flex items-center justify-between px-6 py-5 border-t border-[#f1f5f9] bg-white rounded-b-2xl">
            <div className="text-[14px] text-[#64748b] font-medium">
              Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredRows.length)} of {filteredRows.length} announcements
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                &#8249;
              </button>

              {(() => {
                const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
                const pages: (number | string)[] = [];
                for (let i = 0; i < totalPages; i++) {
                  if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...');
                  }
                }

                return pages.map((p, idx) => {
                  if (p === '...') {
                    return <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium">...</span>;
                  }
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      type="button"
                      key={p}
                      className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-[#5200FF] text-white border border-[#5200FF]' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                      onClick={() => setCurrentPage(p as number)}
                    >
                      {(p as number) + 1}
                    </button>
                  );
                });
              })()}

              <button
                type="button"
                className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                disabled={(currentPage + 1) * pageSize >= filteredRows.length}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditAnnouncement(null); }}>
          <DialogContent className="rounded-3xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Announcement</DialogTitle>
              <DialogDescription>Update the announcement details.</DialogDescription>
            </DialogHeader>
            {editAnnouncement && (
              <div className="space-y-4">
                <Select
                  value={editAnnouncement.branchId ? String(editAnnouncement.branchId) : ""}
                  onValueChange={(v) => setEditAnnouncement({
                    ...editAnnouncement,
                    branchId: Number(v),
                    branchName: branches.find((b) => String(b.id) === v)?.unitName ?? null,
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.unitName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Title" value={editAnnouncement.title} onChange={(e) => setEditAnnouncement({ ...editAnnouncement, title: e.target.value })} />
                <Textarea placeholder="Content" rows={5} value={editAnnouncement.content} onChange={(e) => setEditAnnouncement({ ...editAnnouncement, content: e.target.value })} />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
              <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white" onClick={handleEdit} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AnnouncementPage;