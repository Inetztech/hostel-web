import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  getFoodSchedules,
  createFoodSchedule,
  updateFoodSchedule,
  deleteFoodSchedule,
  getUserRole,
  getBranches,
  fetchAllPages,
} from "@/lib/store";

import {
  FoodTimetable,
  FoodTimetableRequest,
  Branch,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  Clock,
} from "lucide-react";

/* =====================================================
   CONSTANTS
===================================================== */
const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/* =====================================================
   COMPONENT
===================================================== */
const FoodTimetablePage = () => {

  const role      = getUserRole()?.toUpperCase();
  const hasAccess = role === "ADMIN" || role === "SUPER_ADMIN";

  /* ── BRANCH STATE ── */
  const [branches, setBranches] = useState<Branch[]>([]);
  /* Set initial branch filter to "ALL" */
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

  /* Modal-specific branch selection state */
  const [modalBranch, setModalBranch] = useState<string>("");

  /* ── STATE ── */
  const [schedules,    setSchedules]    = useState<FoodTimetable[]>([]);
  const [form,         setForm]         = useState<FoodTimetableRequest>({
    dayName: "", breakfast: "", lunch: "", dinner: "",
    branchId: undefined,
  });
  const [addOpen,      setAddOpen]      = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [editSchedule, setEditSchedule] = useState<FoodTimetable | null>(null);
  const [loading,      setLoading]      = useState(false);

  const didLoad      = useRef(false);
  const didLoadBranches = useRef(false);

  /* Helper map to quickly lookup branch name by branchId */
  const branchMap = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach((b) => map.set(b.id, b.unitName));
    return map;
  }, [branches]);

  /* ── LOAD BRANCHES ──
     Branches are needed to resolve the BRANCH column for every role, not
     just Admin/Super Admin. fetchAllPages so branches beyond the first
     page of 10 still resolve correctly. */
  useEffect(() => {
    if (didLoadBranches.current) return;
    didLoadBranches.current = true;
    (async () => {
      try {
        const data = await fetchAllPages<Branch>(
          (pg, size) => getBranches(pg, size)
        );
        setBranches(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  /* Filter schedules: if "ALL" is selected, show all branches */
  const branchSchedules = useMemo(
    () =>
      selectedBranch && selectedBranch !== "ALL"
        ? schedules.filter((s) => s.branchId === Number(selectedBranch))
        : schedules,
    [schedules, selectedBranch]
  );

  const orderedSchedules = useMemo(
    () =>
      [...branchSchedules].sort(
        (a, b) =>
          ALL_DAYS.findIndex((d) => d.toLowerCase() === a.dayName.trim().toLowerCase()) -
          ALL_DAYS.findIndex((d) => d.toLowerCase() === b.dayName.trim().toLowerCase())
      ),
    [branchSchedules]
  );

  /* ── PAGINATION ──
     Client-side, 10 rows per page. Reset to page 0 whenever the branch
     filter changes so you never land on a now-empty page. */
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedBranch]);

  const paginatedSchedules = useMemo(
    () =>
      orderedSchedules.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
      ),
    [orderedSchedules, currentPage]
  );

  const totalPages = Math.max(1, Math.ceil(orderedSchedules.length / pageSize));

  const pageItems = useMemo(() => {
    const pages: (number | "...")[] = [];
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  /* Compute available days specifically for the branch selected inside the Add Modal */
  const modalAvailableDays = useMemo(() => {
    const activeBranchId = modalBranch ? Number(modalBranch) : form.branchId;
    if (!activeBranchId) return ALL_DAYS;

    const existingDays = schedules
      .filter((s) => s.branchId === activeBranchId)
      .map((s) => s.dayName.trim().toLowerCase());

    return ALL_DAYS.filter((d) => !existingDays.includes(d.toLowerCase()));
  }, [schedules, modalBranch, form.branchId]);

  /* Compute available days for the Edit Modal: days not already used by
     this schedule's branch, excluding the schedule currently being edited. */
  const editAvailableDays = useMemo(() => {
    if (!editSchedule) return ALL_DAYS;

    const existingDays = schedules
      .filter(
        (s) => s.branchId === editSchedule.branchId && s.id !== editSchedule.id
      )
      .map((s) => s.dayName.trim().toLowerCase());

    return ALL_DAYS.filter((d) => !existingDays.includes(d.toLowerCase()));
  }, [schedules, editSchedule]);

  /* "All 7 days scheduled" only makes sense when a single branch is in view. */
  const allDaysScheduled = useMemo(() => {
    if (selectedBranch === "ALL") return false;
    return branchSchedules.length >= 7;
  }, [selectedBranch, branchSchedules]);

  /* ── LOAD ──
     getFoodSchedules() is paginated, but this screen needs the FULL
     dataset in memory at once, so we pull every page via fetchAllPages. */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllPages<FoodTimetable>(
        (pg, size) => getFoodSchedules(pg, size)
      );
      setSchedules(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load food schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, [reload]);

  /* ── ADD ── */
  const handleAdd = async () => {
    if (!form.branchId) {
      toast.error("Please select a branch");
      return;
    }
    if (!form.dayName || !form.breakfast || !form.lunch || !form.dinner) {
      toast.error("All fields are required");
      return;
    }
    try {
      await createFoodSchedule(form);
      toast.success("Food Schedule Created");
      setAddOpen(false);
      setModalBranch("");
      setForm({
        dayName: "", breakfast: "", lunch: "", dinner: "",
        branchId: undefined,
      });
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  /* ── UPDATE ── */
  const handleEdit = async () => {
    if (!editSchedule) return;
    try {
      await updateFoodSchedule(editSchedule.id, {
        dayName:   editSchedule.dayName,
        breakfast: editSchedule.breakfast,
        lunch:     editSchedule.lunch,
        dinner:    editSchedule.dinner,
        branchId:  editSchedule.branchId,
      });
      toast.success("Food Schedule Updated");
      setEditOpen(false);
      setEditSchedule(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  /* ── DELETE ── */
  const handleDelete = async (id: number) => {
    try {
      await deleteFoodSchedule(id);
      toast.success("Food Schedule Deleted");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  /* Shared opener for the Add dialog */
  const openAddDialog = () => {
    const defaultBranch = selectedBranch !== "ALL" ? selectedBranch : "";
    setModalBranch(defaultBranch);
    setForm((f) => ({
      ...f,
      dayName: "",
      branchId: defaultBranch ? Number(defaultBranch) : undefined,
    }));
    setAddOpen(true);
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .ft-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; width: 100%; }

        .ft-main { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        .ft-content { flex: 1; min-width: 0; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .ft-sidebar { width: 100%; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }

        .ft-panel-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 12px; }
        .ft-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .ft-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        /* A11Y: header text darkened from #94a3b8 (~2.6:1) to #475569 (~7.6:1) on white. */
        .ft-table th { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fff; letter-spacing: 0.5px; }
        .ft-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .ft-table tr:hover { background: #fdfcff; }

        .ft-day-badge { display: inline-flex; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; color: #1d4ed8; background: #eff6ff; }
        .ft-branch-badge { display: inline-flex; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; max-width: 100%; }

        /* ACTION BUTTONS */
        .ft-action-btn { 
          width: 36px; 
          height: 36px; 
          border-radius: 8px; 
          border: 1px solid;
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          margin-right: 8px; 
          cursor: pointer; 
          transition: all 0.2s ease; 
        }
        .ft-action-btn:last-child { margin-right: 0; }
        .ft-action-btn:focus-visible, .ft-page-btn:focus-visible { outline: 2px solid #5200FF; outline-offset: 2px; }
        
        .ft-action-btn.edit {
          color: #1d4ed8 !important;
          border-color: #bfdbfe;
          background-color: #eff6ff;
        }
        .ft-action-btn.edit:hover { 
          background-color: #dbeafe; 
          border-color: #93c5fd; 
          color: #1e40af !important;
        }
        
        /* A11Y: red darkened from #dc2626 to #b91c1c for AA contrast on #fef2f2. */
        .ft-action-btn.del { 
          color: #b91c1c !important; 
          border-color: #fca5a5;
          background-color: #fef2f2;
        }
        .ft-action-btn.del:hover { 
          background-color: #fee2e2; 
          border-color: #f87171; 
          color: #991b1b !important;
        }

        .ft-sidebar-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); padding: 24px; }
        .ft-sidebar-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }

        /* RESPONSIVE: breakpoint matches Tailwind's "sm" (640px) */
        @media (max-width: 639px) {
          .ft-wrap { padding: 12px; }
          .ft-main { gap: 16px; }
          .ft-sidebar { gap: 16px; }
          .ft-panel-header { padding: 16px; }
          .ft-sidebar-card { padding: 16px; }
          .ft-desktop-table { display: none; }
        }
        @media (min-width: 640px) {
          .ft-mobile-list { display: none; }
        }
      `}</style>

      <div className="ft-wrap">
        {/* A11Y: the page had no h1, so the first heading (h3) skipped levels.
            Visually hidden h1 + h2 card titles gives a proper outline. */}
        <h1 className="sr-only">Food Timetable</h1>

        {/* MAIN LAYOUT */}
        <div className="ft-main flex-col">

          {/* TOP HEADER: MEAL TIMINGS */}
          <div className="ft-sidebar w-full">
            <div className="ft-sidebar-card bg-indigo-50/40 border-indigo-100">
              <h2 className="ft-sidebar-title text-indigo-950 mb-4">Meal Timings</h2>
              <div className="flex gap-3 items-start">
                <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} aria-hidden="true" />
                </div>
                <div className="text-[13px] text-indigo-900 leading-relaxed font-medium flex flex-col sm:flex-row gap-1.5 sm:gap-6 min-w-0">
                  <p><span className="font-bold text-indigo-950">Breakfast:</span> 8:00 AM – 9:30 AM</p>
                  <p><span className="font-bold text-indigo-950">Lunch:</span> 1:00 PM – 2:00 PM</p>
                  <p><span className="font-bold text-indigo-950">Dinner:</span> 8:30 PM – 9:30 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE / CARDS */}
          <div className="ft-content w-full">
            <div className="ft-panel-header">
              <h2 className="ft-panel-title">Weekly Meal Schedule</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
                {/* BRANCH SWITCHER WITH ALL BRANCHES OPTION */}
                {(role === "ADMIN" || role === "SUPER_ADMIN") && (
                  <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-10 w-full sm:w-[160px]">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      {/* A11Y: the combobox button had no accessible name. */}
                      <SelectTrigger
                        aria-label="Filter by branch"
                        className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-700"
                      >
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Branches</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasAccess && !allDaysScheduled && (
                  <Button
                    size="sm"
                    className="h-10 w-full sm:w-auto bg-[#5200FF] hover:bg-[#4200cc] text-white px-4 font-semibold"
                    onClick={openAddDialog}
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Add Schedule
                  </Button>
                )}
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="overflow-x-auto ft-desktop-table">
              <table className="ft-table">
                <caption className="sr-only">Weekly meal schedule</caption>
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">BRANCH</th>
                    <th scope="col">DAY</th>
                    <th scope="col">BREAKFAST</th>
                    <th scope="col">LUNCH</th>
                    <th scope="col">DINNER</th>
                    {hasAccess && <th scope="col" className="text-right">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={hasAccess ? 7 : 6} role="status" className="text-center py-12 text-slate-600">Loading…</td></tr>
                  ) : paginatedSchedules.length === 0 ? (
                    <tr><td colSpan={hasAccess ? 7 : 6} className="text-center py-12 text-slate-600">No schedules found.</td></tr>
                  ) : (
                    paginatedSchedules.map((row, i) => {
                      const branchLabel =
                        branchMap.get(row.branchId) || row.branchName || `Branch #${row.branchId}`;
                      return (
                        <tr key={row.id}>
                          <td className="text-[13px] font-semibold text-slate-600 w-12">{currentPage * pageSize + i + 1}</td>
                          {/* BRANCH NAME COLUMN */}
                          <td>
                            <div className="ft-branch-badge">{branchLabel}</div>
                          </td>
                          <td><div className="ft-day-badge">{row.dayName}</div></td>
                          <td className="text-[13px] font-medium text-slate-700">{row.breakfast}</td>
                          <td className="text-[13px] font-medium text-slate-700">{row.lunch}</td>
                          <td className="text-[13px] font-medium text-slate-700">{row.dinner}</td>
                          {hasAccess && (
                            <td className="text-right whitespace-nowrap">
                              {/* EDIT BUTTON */}
                              <button
                                type="button"
                                className="ft-action-btn edit"
                                title="Edit Schedule"
                                aria-label={`Edit ${row.dayName} schedule for ${branchLabel}`}
                                onClick={() => { setEditSchedule({ ...row }); setEditOpen(true); }}
                              >
                                <Pencil
                                  size={16}
                                  aria-hidden="true"
                                  className="w-4 h-4 stroke-[2.2] shrink-0"
                                  style={{ stroke: "#1d4ed8", display: "block" }}
                                />
                              </button>

                              {/* DELETE BUTTON */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="ft-action-btn del"
                                    title="Delete Schedule"
                                    aria-label={`Delete ${row.dayName} schedule for ${branchLabel}`}
                                  >
                                    <Trash2
                                      size={16}
                                      aria-hidden="true"
                                      className="w-4 h-4 stroke-[2.2] shrink-0"
                                      style={{ stroke: "#b91c1c", display: "block" }}
                                    />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {row.dayName}'s schedule?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(row.id!); }}>Delete</AlertDialogAction>
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

            {/* MOBILE CARD LIST */}
            <div className="ft-mobile-list divide-y divide-slate-100">
              {loading ? (
                <p role="status" className="text-center py-10 text-slate-600 text-sm">Loading…</p>
              ) : paginatedSchedules.length === 0 ? (
                <p className="text-center py-10 text-slate-600 text-sm">No schedules found.</p>
              ) : (
                paginatedSchedules.map((row) => {
                  const branchLabel =
                    branchMap.get(row.branchId) || row.branchName || `Branch #${row.branchId}`;
                  return (
                    <div key={row.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="ft-day-badge">{row.dayName}</span>
                          <span className="ft-branch-badge">
                            <span className="truncate">{branchLabel}</span>
                          </span>
                        </div>

                        {hasAccess && (
                          <div className="flex shrink-0">
                            <button
                              type="button"
                              className="ft-action-btn edit"
                              aria-label={`Edit ${row.dayName} schedule for ${branchLabel}`}
                              onClick={() => { setEditSchedule({ ...row }); setEditOpen(true); }}
                            >
                              <Pencil
                                size={16}
                                aria-hidden="true"
                                className="w-4 h-4 stroke-[2.2] shrink-0"
                                style={{ stroke: "#1d4ed8", display: "block" }}
                              />
                            </button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="ft-action-btn del"
                                  aria-label={`Delete ${row.dayName} schedule for ${branchLabel}`}
                                >
                                  <Trash2
                                    size={16}
                                    aria-hidden="true"
                                    className="w-4 h-4 stroke-[2.2] shrink-0"
                                    style={{ stroke: "#b91c1c", display: "block" }}
                                  />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {row.dayName}'s schedule?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(row.id!); }}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      <dl className="grid grid-cols-[88px_1fr] gap-y-1.5 text-[13px]">
                        <dt className="font-semibold text-slate-600">Breakfast</dt>
                        <dd className="text-slate-800 break-words">{row.breakfast}</dd>
                        <dt className="font-semibold text-slate-600">Lunch</dt>
                        <dd className="text-slate-800 break-words">{row.lunch}</dd>
                        <dt className="font-semibold text-slate-600">Dinner</dt>
                        <dd className="text-slate-800 break-words">{row.dinner}</dd>
                      </dl>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION */}
            {!loading && orderedSchedules.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-t border-[#f1f5f9] bg-white rounded-b-2xl">
                <div className="text-[13px] sm:text-[14px] text-[#475569] font-medium text-center sm:text-left" aria-live="polite">
                  Showing {paginatedSchedules.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, orderedSchedules.length)} of {orderedSchedules.length} schedules
                </div>
                <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous page"
                    className="ft-page-btn w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <span aria-hidden="true">&#8249;</span>
                  </button>

                  {pageItems.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots-${idx}`} aria-hidden="true" className="w-9 h-9 flex items-center justify-center text-slate-600 text-sm font-medium">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === currentPage;
                    return (
                      <button
                        type="button"
                        key={p}
                        aria-label={`Page ${p + 1}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`ft-page-btn w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-[#5200FF] text-white border border-[#5200FF]' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p + 1}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    aria-label="Next page"
                    className="ft-page-btn w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
                    disabled={(currentPage + 1) * pageSize >= orderedSchedules.length}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <span aria-hidden="true">&#8250;</span>
                  </button>
                </nav>
              </div>
            )}
          </div>

        </div>

        {/* ADD DIALOG */}
        {hasAccess && (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) {
                setModalBranch("");
                setForm({
                  dayName: "", breakfast: "", lunch: "", dinner: "",
                  branchId: undefined,
                });
              }
            }}
          >
            <DialogContent className="rounded-3xl max-w-lg w-[calc(100%-2rem)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Add Food Schedule</DialogTitle>
                <DialogDescription>
                  Create weekly food timetable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {(role === "ADMIN" || role === "SUPER_ADMIN") && branches.length > 0 && (
                  <Select
                    value={modalBranch}
                    onValueChange={(val) => {
                      setModalBranch(val);
                      setForm((f) => ({ ...f, branchId: Number(val), dayName: "" }));
                    }}
                  >
                    <SelectTrigger aria-label="Branch" className="w-full h-11 text-slate-700">
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
                )}

                <Select value={form.dayName} onValueChange={(v) => setForm({ ...form, dayName: v })}>
                  <SelectTrigger aria-label="Day" className="w-full h-11 text-slate-700">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalAvailableDays.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input placeholder="Breakfast" aria-label="Breakfast" className="h-11" value={form.breakfast} onChange={(e) => setForm({ ...form, breakfast: e.target.value })} />
                <Input placeholder="Lunch" aria-label="Lunch" className="h-11" value={form.lunch} onChange={(e) => setForm({ ...form, lunch: e.target.value })} />
                <Input placeholder="Dinner" aria-label="Dinner" className="h-11" value={form.dinner} onChange={(e) => setForm({ ...form, dinner: e.target.value })} />
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <DialogClose asChild><Button variant="outline" className="h-10">Cancel</Button></DialogClose>
                <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white h-10 px-6 font-semibold" onClick={handleAdd}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* EDIT DIALOG */}
        {hasAccess && (
          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditSchedule(null); }}>
            <DialogContent className="rounded-3xl max-w-lg w-[calc(100%-2rem)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Edit Food Schedule</DialogTitle>
                <DialogDescription>Update timetable details.</DialogDescription>
              </DialogHeader>
              {editSchedule && (
                <div className="space-y-4 pt-2">
                  {/* BRANCH SELECTION IN EDIT MODAL */}
                  {branches.length > 0 && (
                    <Select
                      value={String(editSchedule.branchId)}
                      onValueChange={(val) =>
                        setEditSchedule({ ...editSchedule, branchId: Number(val) })
                      }
                    >
                      <SelectTrigger aria-label="Branch" className="w-full h-11 text-slate-700">
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
                  )}

                  {/* DAY SELECTION IN EDIT MODAL — constrained to unscheduled days
                      for this branch (plus the schedule's own current day). */}
                  <Select
                    value={editSchedule.dayName}
                    onValueChange={(v) => setEditSchedule({ ...editSchedule, dayName: v })}
                  >
                    <SelectTrigger aria-label="Day" className="w-full h-11 text-slate-700">
                      <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {editAvailableDays.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input className="h-11" placeholder="Breakfast" aria-label="Breakfast" value={editSchedule.breakfast} onChange={(e) => setEditSchedule({ ...editSchedule, breakfast: e.target.value })} />
                  <Input className="h-11" placeholder="Lunch" aria-label="Lunch" value={editSchedule.lunch} onChange={(e) => setEditSchedule({ ...editSchedule, lunch: e.target.value })} />
                  <Input className="h-11" placeholder="Dinner" aria-label="Dinner" value={editSchedule.dinner} onChange={(e) => setEditSchedule({ ...editSchedule, dinner: e.target.value })} />
                </div>
              )}
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button variant="outline" className="h-10" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white h-10 px-6 font-semibold" onClick={handleEdit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default FoodTimetablePage;