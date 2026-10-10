import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getUserRole,
  getBranches,
  getBranchId,
  getRooms,
  fetchAllPages,
} from "@/lib/store";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Branch, Room } from "@/lib/types";

import {
  Plus,
  AlertCircle,
  Search,
  RefreshCw,
  PenSquare,
  Droplets,
  Zap,
  Home,
  Grid,
  Wifi,
} from "lucide-react";

import { Complaint, ComplaintStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/* ================= HELPERS ================= */

const getCategoryMapping = (subject: string) => {
  const s = (subject || "").toUpperCase();
  if (s.includes("WATER") || s.includes("PLUMB"))
    return { name: "Plumbing", icon: Droplets, color: "text-blue-700 bg-blue-50" };
  if (s.includes("ELEC") || s.includes("LIGHT") || s.includes("POWER"))
    return { name: "Electrical", icon: Zap, color: "text-orange-700 bg-orange-50" };
  if (s.includes("WIFI") || s.includes("INTERNET"))
    return { name: "Internet", icon: Wifi, color: "text-indigo-700 bg-indigo-50" };
  if (s.includes("CLEAN") || s.includes("HOUSE"))
    return { name: "Housekeeping", icon: Home, color: "text-teal-700 bg-teal-50" };
  if (s.includes("FURN"))
    return { name: "Furniture", icon: Grid, color: "text-pink-700 bg-pink-50" };
  return { name: "Other", icon: AlertCircle, color: "text-slate-600 bg-slate-50" };
};

/* ── Safe array extractor: handles both raw array and { content: [] } shapes ── */
const toArray = <T,>(val: any): T[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.content)) return val.content;
  if (Array.isArray(val.data?.content)) return val.data.content;
  if (Array.isArray(val.data)) return val.data;
  return [];
};

/* ── Compact page-number sequence, e.g. [1,2,3,'…',9,10] ── */
const getPageNumbers = (current: number, total: number): (number | "ellipsis")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-800",
];

const ComplaintPage = () => {
  const role = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isAdmin = role === "ADMIN";
  const isStaff = isAdmin || role === "WARDEN";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [description, setDescription] = useState("");
  const [searchText, setSearchText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    role === "ADMIN" ? "all" : String(branchId ?? "all")
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const didFetch = useRef(false);

  /* ================= RESET HELPERS ================= */

  const resetComplaintForm = () => {
    setSubject("");
    setCustomSubject("");
    setDescription("");
  };

  const closeComplaintDialog = () => {
    setAddOpen(false);
    resetComplaintForm();
  };

  /* ================= LOAD ================= */

  const loadComplaints = useCallback(async () => {
    try {
      setTableLoading(true);

      const [complaintsResult, branchResult, roomResult] = await Promise.allSettled([
        role === "TENANT"
          ? fetchAllPages<Complaint>(getMyComplaints)
          : fetchAllPages<Complaint>(getAllComplaints),
        fetchAllPages<Branch>(getBranches),
        fetchAllPages<Room>(getRooms),
      ]);

      if (complaintsResult.status === "fulfilled") {
        setComplaints(toArray<Complaint>(complaintsResult.value));
      } else {
        toast.error("Failed to load complaints");
      }

      if (branchResult.status === "fulfilled") {
        setBranches(toArray<Branch>(branchResult.value));
      }

      if (roomResult.status === "fulfilled") {
        setRooms(toArray<Room>(roomResult.value));
      }
    } finally {
      setTableLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadComplaints();
  }, [loadComplaints]);

  /* ================= CREATE ================= */

  const handleCreate = async () => {
    const finalSubject = subject === "OTHER" ? customSubject : subject;

    if (!finalSubject.trim() || !description.trim()) {
      toast.error("All fields required");
      return;
    }

    try {
      setLoading(true);
      await createComplaint({ subject: finalSubject, description });
      toast.success("Complaint submitted");
      closeComplaintDialog();
      await loadComplaints();
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS ================= */

  const handleStatusChange = async (id: number, status: ComplaintStatus) => {
    try {
      setUpdatingId(id);
      await updateComplaintStatus(id, status);
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
      loadComplaints();
    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= FILTERED DATA ================= */

  const rowData = useMemo(() => {
    let data = complaints;

    // Warden: always scoped to their branch
    if (role === "WARDEN" && branchId) {
      data = data.filter((c) => {
        const room = rooms.find((r) => r.roomNumber === c.roomNumber);
        return String(room?.unitId) === String(branchId);
      });
    }

    // Admin: filter by selected branch dropdown
    if (role === "ADMIN" && selectedBranch !== "all") {
      data = data.filter((c) => {
        const room = rooms.find((r) => r.roomNumber === c.roomNumber);
        return String(room?.unitId) === selectedBranch;
      });
    }

    if (statusFilter !== "all") {
      data = data.filter((c) => c.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      data = data.filter((c) => getCategoryMapping(c.subject).name === categoryFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      data = data.filter(
        (c) =>
          c.subject?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.tenantName?.toLowerCase().includes(q) ||
          c.roomNumber?.toLowerCase().includes(q)
      );
    }

    return data;
  }, [complaints, selectedBranch, rooms, role, branchId, statusFilter, categoryFilter, searchText]);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch, statusFilter, categoryFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(rowData.length / pageSize));

  // Clamp currentPage if filters shrink the result set below the current page
  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(Math.max(0, totalPages - 1));
  }, [currentPage, totalPages]);

  const paginatedRows = rowData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage + 1, totalPages),
    [currentPage, totalPages]
  );

  const categoryOptions = useMemo(() => {
    const names = new Set(complaints.map((c) => getCategoryMapping(c.subject).name));
    return Array.from(names);
  }, [complaints]);

  const clearFilters = () => {
    setSelectedBranch(role === "ADMIN" ? "all" : String(branchId ?? "all"));
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchText("");
  };

  /* ================= ROW VIEW MODEL (shared by table + mobile cards) ================= */

  const rowViews = paginatedRows.map((row, i) => {
    const tenantName = row.tenantName || "Unknown Tenant";
    const initials = tenantName.substring(0, 2).toUpperCase();
    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const roomObj = rooms.find((r) => r.roomNumber === row.roomNumber);
    const isAc = roomObj?.hostelType === "AC";
    const branchName =
      branches.find((b) => String(b.id) === String(roomObj?.unitId))?.unitName ?? "-";

    const cat = getCategoryMapping(row.subject || "");

    let statusClass = "open";
    let displayStatus = "Open";
    if (row.status === "RESOLVED") {
      statusClass = "resolved";
      displayStatus = "Resolved";
    } else if (row.status === "IN_PROGRESS") {
      statusClass = "inprogress";
      displayStatus = "In Progress";
    }

    const dateObj = row.createdAt ? new Date(row.createdAt) : null;
    const dateStr = dateObj
      ? `${String(dateObj.getDate()).padStart(2, "0")} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`
      : "-";
    const timeStr = dateObj
      ? `${dateObj.getHours() % 12 || 12}:${String(dateObj.getMinutes()).padStart(2, "0")} ${
          dateObj.getHours() >= 12 ? "PM" : "AM"
        }`
      : "";

    return {
      row,
      serial: currentPage * pageSize + i + 1,
      tenantName,
      initials,
      avatarClass,
      roomObj,
      isAc,
      branchName,
      cat,
      statusClass,
      displayStatus,
      dateStr,
      timeStr,
    };
  });

  /* ── Status action menu (used in table + cards) ── */
  const renderActions = (id: number | undefined, serial: number) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 lg:h-8 lg:w-8 p-0 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-xl shadow-sm"
          disabled={updatingId === id}
          title="Change status"
          aria-label={`Change status of complaint ${serial}`}
        >
          <PenSquare size={14} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 bg-white border border-slate-200 shadow-md rounded-xl p-1">
        <DropdownMenuLabel className="text-[10px] font-bold text-slate-600 px-2 py-1 uppercase">
          Set Status
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleStatusChange(id!, "OPEN")}
          className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
        >
          Open
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange(id!, "IN_PROGRESS")}
          className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
        >
          In Progress
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange(id!, "RESOLVED")}
          className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
        >
          Resolved
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /* ================= UI ================= */

  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .cp-wrap { font-family: 'Inter', sans-serif; padding: 0; max-width: 1600px; margin: 0 auto; }
        @media (min-width: 1024px) { .cp-wrap { padding: 12px 16px; } }

        .cp-panel { background: #fff; border-radius: 14px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .cp-panel-header { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #f1f5f9; }
        .cp-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

        /* ================= TABLE (desktop only) ================= */
        .cp-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
        .cp-table th { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .cp-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .cp-table tr:hover { background: #fdfcff; }

        .cp-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
        .cp-tenant-name { font-size: 13px; font-weight: 600; color: #0f172a; }

        .cp-room { font-size: 13px; font-weight: 600; color: #0f172a; }
        .cp-room-type { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }

        .cp-branch { font-size: 13px; font-weight: 500; color: #0f172a; }

        .cp-cid { font-size: 13px; font-weight: 600; color: #0f172a; }
        .cp-desc { font-size: 13px; color: #475569; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cp-date { font-size: 13px; font-weight: 600; color: #0f172a; }
        .cp-time { font-size: 11px; color: #475569; margin-top: 2px; }

        .cp-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; white-space: nowrap; }
        .cp-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
        .cp-status.resolved { color: #15803d; }
        .cp-status.resolved::before { background: #15803d; }
        .cp-status.inprogress { color: #c2410c; }
        .cp-status.inprogress::before { background: #c2410c; }
        .cp-status.open { color: #be123c; }
        .cp-status.open::before { background: #be123c; }

        .cp-category { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

        /* ================= MOBILE CARDS (default) ================= */
        .cp-card { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
        .cp-card:last-child { border-bottom: 0; }
        .cp-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .cp-card-top-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .cp-card-no { font-size: 12px; font-weight: 700; color: #475569; }
        .cp-card-status-row { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .cp-card-desc { margin-top: 10px; font-size: 14px; line-height: 1.45; color: #1e293b; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
        .cp-card-meta { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .cp-card-tenant { display: flex; align-items: center; min-width: 0; }
        .cp-card-tenant .cp-avatar { margin-right: 10px; }
        .cp-card-tenant-text { min-width: 0; }
        .cp-card-tenant-text .cp-tenant-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cp-card-sub { font-size: 12px; color: #475569; margin-top: 2px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .cp-card-sub .cp-room-type { margin-top: 0; }
        .cp-card-date { text-align: right; flex-shrink: 0; }
        .cp-empty { padding: 40px 16px; text-align: center; color: #475569; font-size: 14px; }

        /* ================= PAGINATION (mobile default: stacked) ================= */
        .cp-footer { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 12px; border-top: 1px solid #f1f5f9; }
        .cp-footer-info { flex: 1 1 auto; min-width: 0; font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cp-pager { display: flex; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 4px; margin-left: auto; }
        .app-page-content .cp-page-btn { min-width: 30px; min-height: 30px; height: 30px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; border: 1px solid #e2e8f0; background: #fff; color: #475569; }
        .cp-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .cp-page-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
        .cp-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cp-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; font-weight: 600; }
        .cp-page-ellipsis { min-width: 24px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #64748b; }

        /* ================= DESKTOP (>= 1024px) ================= */
        @media (min-width: 1024px) {
          .cp-panel-header { padding: 14px 16px; }



          .cp-footer { padding: 16px 20px; gap: 12px; }
          .cp-footer-info { font-size: 13px; }
          .cp-pager { gap: 8px; }
          .app-page-content .cp-page-btn { min-width: 32px; min-height: 32px; height: 32px; }
        }
      `}</style>

      <div className="cp-wrap">
        <div className="cp-panel">
          <div className="cp-panel-header">
            <h1 className="cp-panel-title">All Complaints</h1>
            <div className="flex gap-2">
              {role === "TENANT" || isStaff ? (
                <Dialog
                  open={addOpen}
                  onOpenChange={(open) => {
                    setAddOpen(open);
                    if (!open) resetComplaintForm();
                  }}
                >
                  {role === "TENANT" && (
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8 rounded-xl bg-[#5200FF] hover:bg-[#4200cc] text-white">
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Add Complaint
                      </Button>
                    </DialogTrigger>
                  )}

                  <DialogContent className="max-w-lg w-[94vw] rounded-2xl overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Add Complaint</DialogTitle>
                      <DialogDescription>Submit a new complaint</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <Select
                        value={subject}
                        onValueChange={(value) => {
                          setSubject(value);
                          if (value !== "OTHER") setCustomSubject("");
                        }}
                      >
                        <SelectTrigger aria-label="Complaint subject" className="rounded-xl">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="WIFI">Wifi</SelectItem>
                          <SelectItem value="FOOD">Food</SelectItem>
                          <SelectItem value="WATER">Water</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      {subject === "OTHER" && (
                        <Input
                          placeholder="Enter subject"
                          aria-label="Custom complaint subject"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="rounded-xl"
                        />
                      )}

                      <textarea
                        placeholder="Describe your issue..."
                        aria-label="Complaint description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="border p-2 rounded-xl w-full h-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" className="rounded-xl" onClick={closeComplaintDialog}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        className="rounded-xl bg-[#5200FF] hover:bg-[#4200cc] text-white"
                        onClick={handleCreate}
                        disabled={
                          loading ||
                          !description.trim() ||
                          !(subject === "OTHER" ? customSubject.trim() : subject.trim())
                        }
                      >
                        {loading ? "Submitting..." : "Submit"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>

          {/* ================= FILTERS =================
              Phone:   row 1 = Search + Clear | row 2 = Branch + Category | row 3 = Status
              Desktop (lg+): single wrapping row, Clear pushed to the right */}
          <div
            role="group"
            aria-label="Filter complaints"
            className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 p-3 border-b border-[#f1f5f9] bg-white lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:p-4"
          >
            {/* Search */}
            <div className="flex items-center gap-2 h-10 lg:h-9 min-w-0 px-2.5 bg-white border border-[#e2e8f0] rounded-xl focus-within:border-[#5200FF] lg:w-[220px] lg:px-3">
              <input
                type="text"
                placeholder="Search complaints..."
                aria-label="Search complaints"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:font-normal placeholder:text-slate-500"
              />
              <Search size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
            </div>

            {/* Clear (2nd on phone, pushed right + last on desktop) */}
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1.5 h-10 lg:h-9 px-2 min-w-0 whitespace-nowrap text-[13px] font-medium text-[#475569] bg-white border border-[#e2e8f0] rounded-xl hover:bg-slate-50 hover:text-[#0f172a] lg:order-last lg:ml-auto lg:px-3 lg:text-sm lg:border-transparent"
            >
              <RefreshCw size={14} aria-hidden="true" /> Clear Filters
            </button>

            {/* Branch */}
            <div className="flex items-center h-10 lg:h-9 min-w-0 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden lg:w-40 lg:flex-none">
              <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!isAdmin}>
                <SelectTrigger
                  aria-label="Filter by branch"
                  className="h-10 lg:h-9 w-full min-w-0 px-3 border-0 shadow-none focus:ring-0 text-sm font-medium text-slate-700"
                >
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex items-center h-10 lg:h-9 min-w-0 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden lg:w-40 lg:flex-none">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="h-10 lg:h-9 w-full min-w-0 px-3 border-0 shadow-none focus:ring-0 text-sm font-medium text-slate-700"
                >
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (full width on phone) */}
            <div className="col-span-2 flex items-center h-10 lg:h-9 min-w-0 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden lg:col-span-1 lg:w-40 lg:flex-none">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  aria-label="Filter by status"
                  className="h-10 lg:h-9 w-full min-w-0 px-3 border-0 shadow-none focus:ring-0 text-sm font-medium text-slate-700"
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
            <table className="cp-table">
              <caption className="sr-only">Complaints</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  {isStaff && <th scope="col">TENANT / ROOM</th>}
                  {isStaff && <th scope="col">BRANCH</th>}
                  <th scope="col">CATEGORY</th>
                  <th scope="col">DESCRIPTION</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">REPORTED ON</th>
                  {isStaff && <th scope="col">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-600" role="status">
                      Loading complaints...
                    </td>
                  </tr>
                ) : rowViews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-600">
                      No complaints found.
                    </td>
                  </tr>
                ) : (
                  rowViews.map((v) => {
                    const CatIcon = v.cat.icon;
                    return (
                      <tr key={v.row.id}>
                        <td>
                          <div className="cp-cid">{v.serial}</div>
                        </td>

                        {isStaff && (
                          <td>
                            <div className="flex items-center">
                              <div className={`cp-avatar ${v.avatarClass}`} aria-hidden="true">
                                {v.initials}
                              </div>
                              <div>
                                <div className="cp-tenant-name">{v.tenantName}</div>
                                <div className="cp-room">{v.row.roomNumber || "-"}</div>
                              </div>
                            </div>
                          </td>
                        )}

                        {isStaff && (
                          <td>
                            <div className="cp-branch">{v.branchName}</div>
                            {v.roomObj && (
                              <div
                                className={`cp-room-type ${
                                  v.isAc ? "bg-green-100 text-green-800" : "bg-indigo-100 text-indigo-800"
                                }`}
                              >
                                {v.isAc ? "AC" : "Non-AC"}
                              </div>
                            )}
                          </td>
                        )}

                        <td>
                          <div className={`cp-category ${v.cat.color}`}>
                            <CatIcon size={12} aria-hidden="true" /> {v.cat.name}
                          </div>
                        </td>

                        <td>
                          <div className="cp-desc" title={v.row.description || "-"}>
                            {v.row.description || "-"}
                          </div>
                        </td>

                        <td>
                          <div className={`cp-status ${v.statusClass}`}>{v.displayStatus}</div>
                        </td>

                        <td>
                          <div className="cp-date">{v.dateStr}</div>
                          {v.timeStr && <div className="cp-time">{v.timeStr}</div>}
                        </td>

                        {isStaff && <td>{renderActions(v.row.id, v.serial)}</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </div>

          {/* ================= MOBILE CARDS ================= */}
          <div className="block lg:hidden" aria-label="Complaints list">
            {tableLoading ? (
              <div className="cp-empty" role="status">
                Loading complaints...
              </div>
            ) : rowViews.length === 0 ? (
              <div className="cp-empty">No complaints found.</div>
            ) : (
              rowViews.map((v) => {
                const CatIcon = v.cat.icon;
                return (
                  <article key={v.row.id} className="cp-card">
                    <div className="cp-card-top">
                      <div className="cp-card-top-left">
                        <span className="cp-card-no">#{v.serial}</span>
                        <span className={`cp-category ${v.cat.color}`}>
                          <CatIcon size={12} aria-hidden="true" /> {v.cat.name}
                        </span>
                      </div>
                      <div className="cp-card-status-row">
                        <span className={`cp-status ${v.statusClass}`}>{v.displayStatus}</span>
                        {isStaff && renderActions(v.row.id, v.serial)}
                      </div>
                    </div>

                    <p className="cp-card-desc">{v.row.description || "-"}</p>

                    <div className="cp-card-meta">
                      {isStaff ? (
                        <div className="cp-card-tenant">
                          <div className={`cp-avatar ${v.avatarClass}`} aria-hidden="true">
                            {v.initials}
                          </div>
                          <div className="cp-card-tenant-text">
                            <div className="cp-tenant-name">{v.tenantName}</div>
                            <div className="cp-card-sub">
                              <span>Room {v.row.roomNumber || "-"}</span>
                              <span>{v.branchName}</span>
                              {v.roomObj && (
                                <span
                                  className={`cp-room-type ${
                                    v.isAc ? "bg-green-100 text-green-800" : "bg-indigo-100 text-indigo-800"
                                  }`}
                                >
                                  {v.isAc ? "AC" : "Non-AC"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="cp-card-sub">Reported on</span>
                      )}

                      <div className="cp-card-date">
                        <div className="cp-date">{v.dateStr}</div>
                        {v.timeStr && <div className="cp-time">{v.timeStr}</div>}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* ================= PAGINATION ================= */}
          <div className="cp-footer">
            <div className="cp-footer-info" aria-live="polite">
              Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to{" "}
              {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} complaints
            </div>
            <nav aria-label="Pagination" className="cp-pager">
              <button
                type="button"
                className="cp-page-btn"
                aria-label="Previous page"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <span aria-hidden="true">&lt;</span>
              </button>

              {pageNumbers.map((p, idx) =>
                p === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="cp-page-ellipsis" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={p}
                    className={`cp-page-btn ${p === currentPage + 1 ? "active" : ""}`}
                    aria-label={`Page ${p}`}
                    aria-current={p === currentPage + 1 ? "page" : undefined}
                    onClick={() => setCurrentPage(p - 1)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className="cp-page-btn"
                aria-label="Next page"
                disabled={currentPage + 1 >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <span aria-hidden="true">&gt;</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintPage;