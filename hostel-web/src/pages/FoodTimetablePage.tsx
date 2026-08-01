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
  getBranchId,
  getBranches,
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
  const branchId  = getBranchId(); 

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

  const didLoad   = useRef(false);

  /* Helper map to quickly lookup branch name by branchId */
  const branchMap = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach((b: any) => {
      // Safely check for unitName, name, or branchName properties
      const name = b.unitName || b.name || b.branchName || `Branch #${b.id}`;
      map.set(b.id, name);
    });
    return map;
  }, [branches]);

  /* ── LOAD BRANCHES (Always load branches for all roles to resolve names) ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await getBranches(0, 50);
        // Support array responses or paginated content structures
        const branchList = Array.isArray(res) ? res : res?.content || [];
        setBranches(branchList);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedBranch || selectedBranch === "ALL") return;
    setForm((f) => ({ ...f, branchId: Number(selectedBranch) }));
  }, [selectedBranch]);

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

  /* Compute available days specifically for the branch selected inside the Add Modal */
  const modalAvailableDays = useMemo(() => {
    const activeBranchId = modalBranch ? Number(modalBranch) : form.branchId;
    if (!activeBranchId) return ALL_DAYS;

    const existingDays = schedules
      .filter((s) => s.branchId === activeBranchId)
      .map((s) => s.dayName.trim().toLowerCase());

    return ALL_DAYS.filter((d) => !existingDays.includes(d.toLowerCase()));
  }, [schedules, modalBranch, form.branchId]);

  const allDaysScheduled = branchSchedules.length >= 7;

  /* ── LOAD ── */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFoodSchedules();
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

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-slate-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .ft-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; width: 100%; }

        .ft-main { display: flex; gap: 24px; align-items: flex-start; }
        .ft-content { flex: 1; min-width: 0; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .ft-sidebar { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }

        .ft-panel-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 12px; }
        .ft-panel-title { font-size: 16px; font-weight: 700; color: #0f172a; }

        .ft-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .ft-table th { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fff; letter-spacing: 0.5px; }
        .ft-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .ft-table tr:hover { background: #fdfcff; }

        .ft-day-badge { display: inline-flex; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; color: #1d4ed8; background: #eff6ff; }
        .ft-branch-badge { display: inline-flex; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; }

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
        
        .ft-action-btn.edit {
          color: #2563eb !important;
          border-color: #bfdbfe;
          background-color: #eff6ff;
        }
        .ft-action-btn.edit:hover { 
          background-color: #dbeafe; 
          border-color: #93c5fd; 
          color: #1d4ed8 !important;
        }
        
        .ft-action-btn.del { 
          color: #dc2626 !important; 
          border-color: #fca5a5;
          background-color: #fef2f2;
        }
        .ft-action-btn.del:hover { 
          background-color: #fee2e2; 
          border-color: #f87171; 
          color: #b91c1c !important;
        }

        .ft-sidebar-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); padding: 24px; }
        .ft-sidebar-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
      `}</style>

      <div className="ft-wrap">
        {/* MAIN LAYOUT */}
        <div className="ft-main flex-col lg:flex-row">

          {/* LEFT SIDEBAR: MEAL TIMINGS */}
          <div className="ft-sidebar w-full lg:w-[320px]">
            <div className="ft-sidebar-card bg-indigo-50/40 border-indigo-100">
              <h3 className="ft-sidebar-title text-indigo-950 mb-4">Meal Timings</h3>
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div className="text-[13px] text-indigo-900/80 leading-relaxed font-medium space-y-1">
                  <p><span className="font-bold text-indigo-950">Breakfast:</span> 8:00 AM – 9:30 AM</p>
                  <p><span className="font-bold text-indigo-950">Lunch:</span> 1:00 PM – 2:00 PM</p>
                  <p><span className="font-bold text-indigo-950">Dinner:</span> 8:30 PM – 9:30 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TABLE */}
          <div className="ft-content w-full lg:w-auto">
            <div className="ft-panel-header">
              <div className="ft-panel-title">Weekly Meal Schedule</div>
              <div className="flex gap-2 items-center flex-wrap">
                {/* BRANCH SWITCHER WITH ALL BRANCHES OPTION */}
                {hasAccess && (
                  <div className="flex bg-white border border-[#e2e8f0] rounded-md overflow-hidden h-10 w-[160px]">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="border-0 shadow-none focus:ring-0 text-sm h-full w-full font-medium text-slate-600">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Branches</SelectItem>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.unitName || b.name || b.branchName || `Branch #${b.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasAccess && !allDaysScheduled && (
                  <Button
                    size="sm"
                    className="h-10 bg-[#5200FF] hover:bg-[#4200cc] text-white px-4 font-semibold"
                    onClick={() => {
                      const defaultBranch = selectedBranch !== "ALL" ? selectedBranch : "";
                      setModalBranch(defaultBranch);
                      setForm((f) => ({
                        ...f,
                        dayName: "",
                        branchId: defaultBranch ? Number(defaultBranch) : undefined,
                      }));
                      setAddOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Schedule
                  </Button>
                )}
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>BRANCH</th>
                    <th>DAY</th>
                    <th>BREAKFAST</th>
                    <th>LUNCH</th>
                    <th>DINNER</th>
                    {hasAccess && <th className="text-right">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={hasAccess ? 7 : 6} className="text-center py-12 text-slate-400">Loading…</td></tr>
                  ) : orderedSchedules.length === 0 ? (
                    <tr><td colSpan={hasAccess ? 7 : 6} className="text-center py-12 text-slate-400">No schedules found.</td></tr>
                  ) : (
                    orderedSchedules.map((row, i) => (
                      <tr key={row.id}>
                        <td className="text-[13px] font-semibold text-slate-500 w-12">{i + 1}</td>
                        {/* BRANCH NAME COLUMN */}
                        <td>
                          <div className="ft-branch-badge">
                            {branchMap.get(row.branchId) || `Branch #${row.branchId}`}
                          </div>
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
                              onClick={() => { setEditSchedule({ ...row }); setEditOpen(true); }}
                            >
                              <Pencil 
                                size={16} 
                                className="w-4 h-4 stroke-[2.2] text-blue-600 shrink-0" 
                                style={{ stroke: "#2563eb", display: "block" }} 
                              />
                            </button>

                            {/* DELETE BUTTON */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="ft-action-btn del" title="Delete Schedule">
                                  <Trash2 
                                    size={16} 
                                    className="w-4 h-4 stroke-[2.2] text-red-600 shrink-0" 
                                    style={{ stroke: "#dc2626", display: "block" }} 
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
            <DialogContent className="rounded-3xl max-w-2xl w-[94vw]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Add Food Schedule</DialogTitle>
                <DialogDescription>
                  Create weekly food timetable.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {branches.length > 0 && (
                  <Select
                    value={modalBranch}
                    onValueChange={(val) => {
                      setModalBranch(val);
                      setForm((f) => ({ ...f, branchId: Number(val), dayName: "" }));
                    }}
                  >
                    <SelectTrigger className="w-full h-11 text-slate-600">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.unitName || b.name || b.branchName || `Branch #${b.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={form.dayName} onValueChange={(v) => setForm({ ...form, dayName: v })}>
                  <SelectTrigger className="w-full h-11 text-slate-600">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalAvailableDays.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input placeholder="Breakfast" className="h-11" value={form.breakfast} onChange={(e) => setForm({ ...form, breakfast: e.target.value })} />
                <Input placeholder="Lunch" className="h-11" value={form.lunch} onChange={(e) => setForm({ ...form, lunch: e.target.value })} />
                <Input placeholder="Dinner" className="h-11 sm:col-span-2" value={form.dinner} onChange={(e) => setForm({ ...form, dinner: e.target.value })} />
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild><Button variant="outline" className="h-10">Cancel</Button></DialogClose>
                <Button className="bg-[#5200FF] hover:bg-[#4200cc] text-white h-10 px-6 font-semibold" onClick={handleAdd}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* EDIT DIALOG */}
        {hasAccess && (
          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditSchedule(null); }}>
            <DialogContent className="rounded-3xl max-w-2xl w-[94vw]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Edit Food Schedule</DialogTitle>
                <DialogDescription>Update timetable details.</DialogDescription>
              </DialogHeader>
              {editSchedule && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {branches.length > 0 && (
                    <Select
                      value={String(editSchedule.branchId)}
                      onValueChange={(val) =>
                        setEditSchedule({ ...editSchedule, branchId: Number(val) })
                      }
                    >
                      <SelectTrigger className="w-full h-11 text-slate-600">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.unitName || b.name || b.branchName || `Branch #${b.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input 
                    className="h-11" 
                    placeholder="Day Name"
                    value={editSchedule.dayName} 
                    onChange={(e) => setEditSchedule({ ...editSchedule, dayName: e.target.value })} 
                  />
                  <Input className="h-11" placeholder="Breakfast" value={editSchedule.breakfast} onChange={(e) => setEditSchedule({ ...editSchedule, breakfast: e.target.value })} />
                  <Input className="h-11" placeholder="Lunch" value={editSchedule.lunch} onChange={(e) => setEditSchedule({ ...editSchedule, lunch: e.target.value })} />
                  <Input className="h-11 sm:col-span-2" placeholder="Dinner" value={editSchedule.dinner} onChange={(e) => setEditSchedule({ ...editSchedule, dinner: e.target.value })} />
                </div>
              )}
              <DialogFooter className="mt-4">
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