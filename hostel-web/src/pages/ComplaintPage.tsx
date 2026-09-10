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
    return { name: "Plumbing", icon: Droplets, color: "text-blue-500 bg-blue-50" };
  if (s.includes("ELEC") || s.includes("LIGHT") || s.includes("POWER"))
    return { name: "Electrical", icon: Zap, color: "text-orange-500 bg-orange-50" };
  if (s.includes("WIFI") || s.includes("INTERNET"))
    return { name: "Internet", icon: Wifi, color: "text-indigo-500 bg-indigo-50" };
  if (s.includes("CLEAN") || s.includes("HOUSE"))
    return { name: "Housekeeping", icon: Home, color: "text-teal-500 bg-teal-50" };
  if (s.includes("FURN"))
    return { name: "Furniture", icon: Grid, color: "text-pink-500 bg-pink-50" };
  return { name: "Other", icon: AlertCircle, color: "text-slate-500 bg-slate-50" };
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

const ComplaintPage = () => {
  const role = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isAdmin = role === "ADMIN";

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
    } catch (err) {
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
    } catch (err) {
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

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  /* ================= UI ================= */

  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .cp-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .cp-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-bottom: 24px; }
        .cp-panel-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .cp-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }

        .cp-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
        .cp-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
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
        .cp-time { font-size: 11px; color: #64748b; margin-top: 2px; }

        .cp-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #fff; }
        .cp-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
        .cp-status.resolved { color: #16a34a; }
        .cp-status.resolved::before { background: #16a34a; }
        .cp-status.inprogress { color: #f97316; }
        .cp-status.inprogress::before { background: #f97316; }
        .cp-status.open { color: #e11d48; }
        .cp-status.open::before { background: #e11d48; }

        .cp-category { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

        .cp-page-btn { min-width: 32px; height: 32px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; border: 1px solid #e2e8f0; background: #fff; color: #64748b; }
        .cp-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .cp-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cp-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; font-weight: 600; }
        .cp-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #94a3b8; }
      `}</style>

      <div className="cp-wrap">
        <div className="cp-panel">
          <div className="cp-panel-header">
            <div className="cp-panel-title">All Complaints</div>
            <div className="flex gap-2">
              {role === "TENANT" || isAdmin || role === "WARDEN" ? (
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
                        <Plus className="h-4 w-4 mr-2" /> Add Complaint
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
                        <SelectTrigger className="rounded-xl">
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
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="rounded-xl"
                        />
                      )}

                      <textarea
                        placeholder="Describe your issue..."
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

          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-[#f1f5f9] bg-white flex-wrap">
            <div className="flex bg-white border border-[#e2e8f0] rounded-xl h-9 px-3 w-[220px] items-center">
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border-0 bg-transparent outline-none text-sm w-full font-medium text-slate-600 placeholder:font-normal"
              />
              <Search size={14} className="text-slate-400" />
            </div>

            <div className="flex bg-white border border-[#e2e8f0] rounded-xl overflow-hidden h-9 w-[160px]">
              <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!isAdmin}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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

            <div className="flex bg-[#ffffff] border border-[#e2e8f0] rounded-xl overflow-hidden h-9 w-[160px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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

            <div className="flex bg-white border border-[#e2e8f0] rounded-xl overflow-hidden h-9 w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
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

            <button
              className="flex items-center gap-1.5 text-sm text-[#64748b] font-medium hover:text-[#0f172a] ml-auto"
              onClick={clearFilters}
            >
              <RefreshCw size={14} /> Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {(isAdmin || role === "WARDEN") && <th>TENANT / ROOM</th>}
                  {(isAdmin || role === "WARDEN") && <th>BRANCH</th>}
                  <th>CATEGORY</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th>REPORTED ON</th>
                  {(isAdmin || role === "WARDEN") && <th>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Loading complaints...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No complaints found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, i) => {
                    const tenantName = row.tenantName || "Unknown Tenant";
                    const initials = tenantName.substring(0, 2).toUpperCase();
                    const colors = [
                      "bg-indigo-100 text-indigo-600",
                      "bg-blue-100 text-blue-600",
                      "bg-emerald-100 text-emerald-600",
                      "bg-rose-100 text-rose-600",
                      "bg-orange-100 text-orange-600",
                    ];
                    const avatarClass = colors[i % colors.length];
                    const roomObj = rooms.find((r) => r.roomNumber === row.roomNumber);
                    const isAc = roomObj?.hostelType === "AC";
                    const branchName =
                      branches.find((b) => String(b.id) === String(roomObj?.unitId))?.unitName ?? "-";

                    const cat = getCategoryMapping(row.subject || "");
                    const CatIcon = cat.icon;

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

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="cp-cid">{currentPage * pageSize + i + 1}</div>
                        </td>

                        {(isAdmin || role === "WARDEN") && (
                          <td>
                            <div className="flex items-center">
                              <div className={`cp-avatar ${avatarClass}`}>{initials}</div>
                              <div>
                                <div className="cp-tenant-name">{tenantName}</div>
                                <div className="cp-room">{row.roomNumber || "-"}</div>
                              </div>
                            </div>
                          </td>
                        )}

                        {(isAdmin || role === "WARDEN") && (
                          <td>
                            <div className="cp-branch">{branchName}</div>
                            {roomObj && (
                              <div
                                className={`cp-room-type ${
                                  isAc ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
                                }`}
                              >
                                {isAc ? "AC" : "Non-AC"}
                              </div>
                            )}
                          </td>
                        )}

                        <td>
                          <div className={`cp-category ${cat.color}`}>
                            <CatIcon size={12} /> {cat.name}
                          </div>
                        </td>

                        <td>
                          <div className="cp-desc" title={row.description || "-"}>
                            {row.description || "-"}
                          </div>
                        </td>

                        <td>
                          <div className={`cp-status ${statusClass}`}>{displayStatus}</div>
                        </td>

                        <td>
                          <div className="cp-date">{dateStr}</div>
                          {timeStr && <div className="cp-time">{timeStr}</div>}
                        </td>

                        {(isAdmin || role === "WARDEN") && (
                          <td>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-xl shadow-sm"
                                  disabled={updatingId === row.id}
                                  title="Change status"
                                >
                                  <PenSquare size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 bg-white border border-slate-200 shadow-md rounded-xl p-1">
                                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                                  Set Status
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(row.id!, "OPEN")}
                                  className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
                                >
                                  Open
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(row.id!, "IN_PROGRESS")}
                                  className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
                                >
                                  In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(row.id!, "RESOLVED")}
                                  className="text-xs cursor-pointer hover:bg-slate-100 px-2 py-1.5 rounded-lg"
                                >
                                  Resolved
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-[#f1f5f9]">
            <div className="text-[13px] text-[#64748b]">
              Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to{" "}
              {Math.min((currentPage + 1) * pageSize, rowData.length)} of {rowData.length} complaints
            </div>
            <div className="flex items-center gap-2">
              <button
                className="cp-page-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                &lt;
              </button>

              {pageNumbers.map((p, idx) =>
                p === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="cp-page-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`cp-page-btn ${p === currentPage + 1 ? "active" : ""}`}
                    onClick={() => setCurrentPage(p - 1)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="cp-page-btn"
                disabled={currentPage + 1 >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintPage;