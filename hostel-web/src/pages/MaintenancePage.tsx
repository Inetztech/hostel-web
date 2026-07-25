import { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, Eye, RefreshCw, CheckCircle2, Clock, Hourglass, Users,
  ChevronLeft, ChevronRight, X, ChevronDown, Building, Check, Trash2, AlertTriangle
} from "lucide-react";

import {
  fetchBranches,
  fetchRooms,
  getMaintenanceCleaners,
  addMaintenanceCleaner,
  deleteMaintenanceCleaner,
  getMaintenanceTasks,
  createMaintenanceTask,
  updateMaintenanceTaskStatus,
  deleteMaintenanceTask,
  getMaintenanceDashboard,
  getCurrentRoomCleaningStatus,
} from "@/lib/store";
import {
  Branch,
  Room,
  Cleaner,
  MaintenanceTask,
  MaintenanceDashboardStats,
  CleaningStatus,
  CleanerRequest,
} from "@/lib/types";

/* ── Helpers ──────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<CleaningStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  CLEANED: "Completed",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const StatusBadge = ({ status }: { status: CleaningStatus }) => {
  if (status === "CLEANED")
    return <span className="inline-flex px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-600 rounded">Completed</span>;
  if (status === "IN_PROGRESS")
    return <span className="inline-flex px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-600 rounded">In Progress</span>;
  return <span className="inline-flex px-2 py-0.5 text-[11px] font-medium bg-orange-50 text-orange-600 rounded">Pending</span>;
};

const Avatar = ({ name }: { name: string }) => {
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700"];
  const color = colors[(name || "?").charCodeAt(0) % colors.length];

  return (
    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${color}`}>
      {initial}
    </div>
  );
};

const PAGE_SIZE = 8;

export default function MaintenancePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CleaningStatus>("ALL");
  const [branchFilter, setBranchFilter] = useState<"ALL" | number>("ALL");
  const [cleanerFilter, setCleanerFilter] = useState<"ALL" | number>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [stats, setStats] = useState<MaintenanceDashboardStats | null>(null);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<MaintenanceTask[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // View-all / full-schedule expansion toggles for the two summary cards.
  // These just widen the visible list in place; the paginated table below
  // remains the source of truth for full filtering/searching.
  const [showAllCleaners, setShowAllCleaners] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Add Cleaner Modal State
  const [isAddCleanerOpen, setIsAddCleanerOpen] = useState(false);
  const [newCleanerName, setNewCleanerName] = useState("");
  const [newCleanerPhone, setNewCleanerPhone] = useState("");
  const [newCleanerBranch, setNewCleanerBranch] = useState("");
  const [newCleanerActive, setNewCleanerActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Surface partial/total failures from the "assign rooms" step instead of
  // only logging them — this is what was silently hiding the 0-rooms bug.
  const [modalError, setModalError] = useState<string | null>(null);

  // Rooms available for the branch currently selected in the Add Cleaner
  // modal — fetched fresh whenever the branch changes, so the room list
  // is always scoped to that branch.
  const [branchRooms, setBranchRooms] = useState<Room[]>([]);
  const [loadingBranchRooms, setLoadingBranchRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  // Row-level "updating status" indicator
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    // Each source is fetched independently — if one endpoint isn't ready
    // yet or errors out, it just falls back to an empty/zeroed state
    // instead of blanking out the rest of the page.
    const [statsRes, cleanersRes, tasksRes, branchesRes, scheduleRes] = await Promise.allSettled([
      getMaintenanceDashboard(),
      getMaintenanceCleaners(),
      getMaintenanceTasks(),
      fetchBranches(0, 100),
      getCurrentRoomCleaningStatus(),
    ]);

    if (statsRes.status === "fulfilled") {
      setStats(statsRes.value);
    } else {
      console.error("Failed to fetch maintenance dashboard:", statsRes.reason);
      setStats({ totalRooms: 0, completed: 0, pending: 0, inProgress: 0, cleaners: 0 });
    }

    if (cleanersRes.status === "fulfilled") {
      setCleaners(cleanersRes.value ?? []);
    } else {
      console.error("Failed to fetch cleaners:", cleanersRes.reason);
      setCleaners([]);
    }

    if (tasksRes.status === "fulfilled") {
      setTasks(tasksRes.value ?? []);
    } else {
      console.error("Failed to fetch maintenance tasks:", tasksRes.reason);
      setTasks([]);
    }

    if (branchesRes.status === "fulfilled") {
      setBranches(branchesRes.value.content ?? []);
    } else {
      console.error("Failed to fetch branches:", branchesRes.reason);
      setBranches([]);
    }

    if (scheduleRes.status === "fulfilled") {
      setTodaySchedule((scheduleRes.value ?? []).filter((t) => t.scheduledDate === todayISO()));
    } else {
      console.error("Failed to fetch today's cleaning schedule:", scheduleRes.reason);
      setTodaySchedule([]);
    }

    if (showLoader) setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Whenever the branch picked in the Add Cleaner modal changes, load that
  // branch's rooms so they can be assigned to the new cleaner.
  useEffect(() => {
    if (!newCleanerBranch) {
      setBranchRooms([]);
      setSelectedRoomIds([]);
      return;
    }
    const branchId = Number(newCleanerBranch);
    setSelectedRoomIds([]);
    setLoadingBranchRooms(true);
    fetchRooms(0, 200)
      .then((res) => {
        // Coerce before comparing — the backend can return unitId (or an
        // equivalent field) as a string while branchId here is a Number.
        // A strict `===` between "3" and 3 silently fails, leaving this
        // list empty with no error, which is what was hiding every room
        // from the picker even though they exist for that branch.
        const roomBranchId = (r: any): number | null => {
          const raw = r?.unitId ?? r?.unit_id ?? r?.unit?.id ?? r?.branchId ?? r?.branch_id ?? r?.branch?.id;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        };
        setBranchRooms((res.content ?? []).filter((r) => roomBranchId(r) === branchId));
      })
      .catch((err) => {
        console.error("Failed to fetch rooms for branch:", err);
        setBranchRooms([]);
      })
      .finally(() => setLoadingBranchRooms(false));
  }, [newCleanerBranch]);

  const toggleRoomSelection = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const closeAddCleanerModal = () => {
    setIsAddCleanerOpen(false);
    setNewCleanerName("");
    setNewCleanerPhone("");
    setNewCleanerBranch("");
    setNewCleanerActive(true);
    setSelectedRoomIds([]);
    setBranchRooms([]);
    setModalError(null);
  };

  const handleAddCleaner = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setSubmitting(true);
      const branchId = Number(newCleanerBranch);
      const payload: CleanerRequest = {
        name: newCleanerName,
        phone: newCleanerPhone,
        branchId,
        active: newCleanerActive,
      };
      const newCleaner = await addMaintenanceCleaner(payload);

      // Assign the new cleaner to each room picked in the modal by
      // creating a pending cleaning task for it, scheduled today.
      let failedRooms: { roomId: number; reason: any }[] = [];
      if (selectedRoomIds.length > 0) {
        const results = await Promise.allSettled(
          selectedRoomIds.map((roomId) =>
            createMaintenanceTask({
              branchId,
              roomId,
              cleanerId: newCleaner.id,
              status: "PENDING",
              scheduledDate: todayISO(),
            })
          )
        );
        failedRooms = results
          .map((r, i) => ({ r, roomId: selectedRoomIds[i] }))
          .filter(({ r }) => r.status === "rejected")
          .map(({ r, roomId }) => ({ roomId, reason: (r as PromiseRejectedResult).reason }));

        if (failedRooms.length > 0) {
          console.error("Some room assignments failed:", failedRooms);
        }
      }

      // Refetch from the backend rather than patching local state — the
      // Cleaner object returned above has assignedRooms computed BEFORE
      // the tasks were created, so it's stale. A full reload picks up
      // the real assigned-rooms count and puts the new tasks into
      // Today's Schedule / the main table.
      await loadData(false);

      if (failedRooms.length > 0) {
        // Cleaner WAS created, but not every room assignment succeeded —
        // keep the modal open (instead of silently closing it) so the
        // user actually sees this instead of a false "0 rooms assigned".
        const roomLabels = failedRooms
          .map(({ roomId }) => branchRooms.find((r) => r.id === roomId)?.roomNumber ?? `#${roomId}`)
          .join(", ");
        const firstReason =
          failedRooms[0].reason?.response?.data?.message ||
          failedRooms[0].reason?.message ||
          "Unknown error";
        setModalError(
          `Cleaner "${newCleanerName}" was created, but ${failedRooms.length} of ${selectedRoomIds.length} room assignment(s) failed (rooms: ${roomLabels}). Reason: ${firstReason}. You can retry assigning these rooms from the room list below.`
        );
        // Keep only the failed rooms selected so a retry is one click away.
        setSelectedRoomIds(failedRooms.map((f) => f.roomId));
      } else {
        closeAddCleanerModal();
      }
    } catch (err: any) {
      console.error("Failed to create cleaner", err);
      setModalError(
        err?.response?.data?.message || err?.message || "Failed to create cleaner. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCleaner = async (id: number) => {
    if (!confirm("Remove this cleaner?")) return;
    try {
      await deleteMaintenanceCleaner(id);
      setCleaners((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete cleaner", err);
    }
  };

  const cycleStatus = (status: CleaningStatus): CleaningStatus =>
    status === "PENDING" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "CLEANED" : "PENDING";

  const handleAdvanceStatus = async (task: MaintenanceTask) => {
    const nextStatus = cycleStatus(task.status);
    try {
      setUpdatingTaskId(task.id);
      const updated = await updateMaintenanceTaskStatus(task.id, nextStatus);
      // Update BOTH the main table's tasks AND the Today's Schedule card —
      // they're populated from two different endpoints (getMaintenanceTasks
      // vs getCurrentRoomCleaningStatus), so only patching `tasks` left the
      // schedule card showing a stale status (e.g. "In Progress") even after
      // the main table already showed "Completed".
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setTodaySchedule((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error("Failed to update task status", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Delete this cleaning task?")) return;
    try {
      await deleteMaintenanceTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setBranchFilter("ALL");
    setCleanerFilter("ALL");
    setCurrentPage(1);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !search ||
        t.roomNumber?.toLowerCase().includes(search.toLowerCase()) ||
        String(t.roomId).includes(search);
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      // Coerce both sides — same string-vs-number mismatch as the room
      // picker above can otherwise make tasks disappear from the table
      // even though they were created successfully.
      const matchesBranch = branchFilter === "ALL" || Number(t.branchId) === Number(branchFilter);
      const matchesCleaner = cleanerFilter === "ALL" || Number(t.cleanerId) === Number(cleanerFilter);
      return matchesSearch && matchesStatus && matchesBranch && matchesCleaner;
    });
  }, [tasks, search, statusFilter, branchFilter, cleanerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const pagedTasks = filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, branchFilter, cleanerFilter]);

  // "View All" just lifts the 5-row cap on the Cleaners card; the counts
  // and delete actions all still hit the same live `cleaners` state.
  const visibleCleaners = showAllCleaners ? cleaners : cleaners.slice(0, 5);
  const visibleSchedule = showFullSchedule ? todaySchedule : todaySchedule.slice(0, 5);

  // The backend's /dashboard endpoint was returning zeroed-out counts even
  // though the Cleaners and Today's Schedule tables (populated from their
  // own endpoints) clearly had data. Rather than trust that endpoint for
  // numbers we can already compute from data we've fetched, derive the top
  // stat cards directly from `tasks` and `cleaners` so they can never
  // diverge from what the rest of the page is showing. `totalRooms` still
  // falls back to the dashboard stat since it may legitimately include
  // rooms that don't have a task yet.
  const derivedStats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "CLEANED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const activeCleaners = cleaners.filter((c) => c.active).length;

    return {
      totalRooms: stats?.totalRooms ?? tasks.length,
      completed,
      pending,
      inProgress,
      cleaners: activeCleaners,
    };
  }, [tasks, cleaners, stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading data...
      </div>
    );
  }

  const pct = (part?: number, whole?: number) =>
    whole ? (((part ?? 0) / whole) * 100).toFixed(1) : "0.0";

  const statsArray = [
    { label: "Total Rooms", value: derivedStats.totalRooms, sub: "All Rooms", icon: Building, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-100" },
    { label: "Completed", value: derivedStats.completed, sub: `${pct(derivedStats.completed, derivedStats.totalRooms)}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
    { label: "Pending", value: derivedStats.pending, sub: `${pct(derivedStats.pending, derivedStats.totalRooms)}%`, icon: Clock, color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-100" },
    { label: "In Progress", value: derivedStats.inProgress, sub: `${pct(derivedStats.inProgress, derivedStats.totalRooms)}%`, icon: Hourglass, color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-100" },
    { label: "Cleaners", value: derivedStats.cleaners, sub: "Active Cleaners", icon: Users, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* TOP STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statsArray.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)] transition-all">
            <div className="flex items-start justify-between">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ring-1 ${stat.bg} ${stat.color} ${stat.ring}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{stat.value}</p>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CLEANERS LIST */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Cleaners</h2>
            <button onClick={() => setIsAddCleanerOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Add Cleaner
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-normal break-words">
              <thead className="bg-gray-50/50 text-[10px] uppercase font-semibold text-gray-400">
                <tr>
                  <th className="px-5 py-3">Cleaner</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Assigned Rooms</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cleaners.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400 text-[12px]">No cleaners yet</td></tr>
                )}
                {visibleCleaners.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-2">
                      <Avatar name={c.name} />
                      <span className="font-medium text-gray-800 text-[13px]">{c.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[12px]">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-[12px]">{c.branchName || "—"}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium text-[12px]">{c.assignedRooms}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium ${c.active ? "text-emerald-600" : "text-gray-400"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteCleaner(c.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors p-1.5 border border-rose-200 rounded-md bg-white shadow-sm"
                        title="Remove cleaner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-medium">Total Cleaners: {cleaners.length}</span>
            {cleaners.length > 5 && (
              <button
                onClick={() => setShowAllCleaners((v) => !v)}
                className="text-[12px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors border border-blue-100"
              >
                {showAllCleaners ? "Show Less" : "View All"}
              </button>
            )}
          </div>
        </div>

        {/* TODAY'S SCHEDULE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Today's Cleaning Schedule</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-normal break-words">
              <thead className="bg-gray-50/50 text-[10px] uppercase font-semibold text-gray-400">
                <tr>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Cleaner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todaySchedule.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400 text-[12px]">Nothing scheduled for today</td></tr>
                )}
                {visibleSchedule.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-blue-600 font-medium text-[12px]">{s.roomNumber || s.roomId}</td>
                    <td className="px-4 py-3 text-gray-500 text-[12px]">{s.branchName || "—"}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Avatar name={s.cleanerName || "?"} />
                      <span className="font-medium text-gray-800 text-[13px]">{s.cleanerName || "Unassigned"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.status === "CLEANED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdvanceStatus(s)}
                          disabled={updatingTaskId === s.id}
                          className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-colors p-1.5 border border-gray-200 hover:border-blue-200 rounded-md bg-white shadow-sm disabled:opacity-50"
                          title={s.status === "PENDING" ? "Mark as In Progress" : "Mark as Completed"}
                        >
                          <RefreshCw className={`w-4 h-4 ${updatingTaskId === s.id ? "animate-spin" : ""}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {todaySchedule.length > 5 && (
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setShowFullSchedule((v) => !v)}
                className="text-[12px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border border-blue-200 transition-colors shadow-sm"
              >
                <Eye className="h-4 w-4" />
                {showFullSchedule ? "Show Less" : "View Full Schedule"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER & MAIN TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">

        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[140px]"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.unitName}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | CleaningStatus)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[140px]"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLEANED">Completed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={cleanerFilter}
              onChange={(e) => setCleanerFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[140px]"
            >
              <option value="ALL">All Cleaners</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-hidden w-full">
          <table className="w-full text-left text-sm whitespace-normal break-words table-fixed">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-semibold text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Room No.</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Cleaner</th>
                <th className="px-4 py-3">Cleaning Status</th>
                <th className="px-4 py-3">Scheduled Date</th>
                <th className="px-4 py-3">Completed At</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedTasks.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-[12px]">No cleaning tasks found</td></tr>
              )}
              {pagedTasks.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-900 text-[13px]">{r.roomNumber || r.roomId}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{r.branchName || "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 text-[12px]">{r.cleanerName || "Unassigned"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{r.scheduledDate}{r.scheduledTime ? ` · ${r.scheduledTime}` : ""}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAdvanceStatus(r)}
                        disabled={updatingTaskId === r.id}
                        className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-colors p-1.5 border border-gray-200 hover:border-blue-200 rounded-md bg-white shadow-sm disabled:opacity-50"
                        title="Advance status"
                      >
                        {updatingTaskId === r.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(r.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors p-1.5 border border-rose-200 rounded-md bg-white shadow-sm"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-2xl">
          <span className="text-[12px] text-gray-500">
            Showing {filteredTasks.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, filteredTasks.length)} of {filteredTasks.length} rooms
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 flex items-center justify-center gap-1 rounded border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="px-3 text-sm font-medium text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 flex items-center justify-center gap-1 rounded border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Info Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-600 text-[12px]">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Cleaning status is updated by the assigned cleaner. Please ensure rooms are inspected after cleaning.</span>
      </div>

      {/* ADD CLEANER MODAL */}
      {isAddCleanerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Cleaner</h3>
              <button
                onClick={closeAddCleanerModal}
                className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCleaner} className="p-6 space-y-4">
              {modalError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[12px]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newCleanerName}
                  onChange={e => setNewCleanerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newCleanerPhone}
                  onChange={e => setNewCleanerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
                <select
                  required
                  value={newCleanerBranch}
                  onChange={e => setNewCleanerBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="" disabled>Select a branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.unitName}</option>
                  ))}
                </select>
              </div>

              {newCleanerBranch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assign Rooms <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {loadingBranchRooms && (
                      <div className="flex items-center justify-center gap-2 py-4 text-gray-400 text-xs">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading rooms...
                      </div>
                    )}
                    {!loadingBranchRooms && branchRooms.length === 0 && (
                      <div className="py-4 text-center text-gray-400 text-xs px-3">
                        No rooms found for{" "}
                        <span className="font-medium text-gray-500">
                          {branches.find((b) => String(b.id) === newCleanerBranch)?.unitName || "this branch"}
                        </span>
                        . Add rooms to this branch first, or double-check the branch has rooms under it.
                      </div>
                    )}
                    {!loadingBranchRooms && branchRooms.map((room) => (
                      <label
                        key={room.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoomIds.includes(room.id)}
                          onChange={() => toggleRoomSelection(room.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                        />
                        <span className="font-medium text-gray-800">{room.roomNumber}</span>
                        <span className="text-gray-400 text-xs">
                          {room.hostelType} · {room.totalBeds} beds
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedRoomIds.length > 0 && (
                    <p className="text-[11px] text-blue-600 mt-1.5 font-medium">
                      {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={newCleanerActive}
                  onClick={() => setNewCleanerActive(!newCleanerActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${newCleanerActive ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span aria-hidden="true" className={`pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${newCleanerActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">Active (Available for cleaning)</span>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeAddCleanerModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  {submitting ? 'Saving...' : 'Save Cleaner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}