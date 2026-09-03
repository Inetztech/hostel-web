import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  TrendingDown,
  FileSpreadsheet,
  Search,
  X,
  Filter,
  RotateCcw,
  Eye,
  Columns,
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  Scissors,
  MoreVertical,
  Wallet,
  LineChart,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getUserRole,
  getBranchId,
  getMyProfile,
  fetchAllPages,
  getRooms,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  Expense,
} from "@/lib/store";
import { Room, MONTHS } from "@/lib/types";
import { ExpenseDialogModal } from "../components/expense/ExpenseDialogModal";
import { ExpenseExportModal } from "../components/expense/ExpenseExportModal";
import {
  ExpenseReportWidget,
  getCategoryStyleConfig,
} from "../components/expense/ExpenseReportWidget";

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

const ExpensePage = () => {
  const role = useMemo(() => getUserRole()?.toUpperCase(), []);
  const branchId = useMemo(() => getBranchId(), []);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userId, setUserId] = useState<number>(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [selectedBranch, setSelectedBranch] = useState(
    role !== "ADMIN" && branchId ? String(branchId) : "all",
  );
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const loadingRef = useRef(false);

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(0);
  }, [search, month, year, selectedBranch]);

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i),
    [],
  );

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const profile = await getMyProfile().catch(() => null);
      if (profile?.id) setUserId(Number(profile.id));

      // ── FIX: previously this called fetchExpenses() twice per load
      // (once for `content`, once again just to compute `.length` for
      // `totalElements`, both wrapped in fetchAllPages). fetchExpenses()
      // hits GET /expense/getAll, which already returns the full,
      // unpaginated list in one response — so fetchAllPages added no
      // value here and the second call was pure duplication, visible as
      // two identical "getAll" requests fired back-to-back in the
      // Network tab. Now it's a single direct call. ──
      const [roomList, expenseList] = await Promise.all([
        fetchAllPages<Room>(getRooms).catch(() => []),
        fetchExpenses().catch(() => []),
      ]);

      setRooms(
        role === "ADMIN"
          ? roomList
          : roomList.filter((r) => String(r.unitId) === String(branchId)),
      );
      setExpenses(expenseList);
    } catch {
      toast.error("Failed to sync expense logs.");
    } finally {
      loadingRef.current = false;
    }
  }, [role, branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Branch is chosen inside the modal itself, so it's accepted as a
  // param here instead of falling back to the page-level filter.
  const handleSaveExpense = useCallback(
    async (
      description: string,
      amount: number,
      category: string,
      expenseDate: string,
      branchId: number,
    ) => {
      try {
        const activeUserId = userId || (role === "WARDEN" ? 2 : 1);
        const payload = {
          description,
          amount,
          category,
          expenseDate,
          branchId,
          createdBy: activeUserId,
        };

        if (editingExpense) {
          await updateExpense(editingExpense.id, payload);
          toast.success("Expense updated.");
        } else {
          await createExpense(payload);
          toast.success("Expense created.");
        }
        loadData();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Operation failed.");
      }
    },
    [userId, role, editingExpense, loadData],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Permanently delete this record?")) return;
      try {
        await deleteExpense(id);
        toast.success("Expense deleted.");
        loadData();
      } catch {
        toast.error("Failed to delete record.");
      }
    },
    [loadData],
  );

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase().trim();
    return expenses.filter((e) => {
      if (!e.expenseDate) return false;
      const d = new Date(e.expenseDate);
      if (
        month !== 0 &&
        (d.getMonth() + 1 !== month || d.getFullYear() !== year)
      )
        return false;
      if (month === 0 && d.getFullYear() !== year) return false;
      if (
        role !== "ADMIN" &&
        branchId &&
        String(e.branchId) !== String(branchId)
      )
        return false;
      if (selectedBranch !== "all" && String(e.branchId) !== selectedBranch)
        return false;
      return (
        !term ||
        `${e.description} ${getCategoryStyleConfig(e.category).label}`
          .toLowerCase()
          .includes(term)
      );
    });
  }, [expenses, month, year, selectedBranch, search, role, branchId]);

  const branchList = useMemo(
    () =>
      Array.from(
        new Map(
          rooms.map((r) => [
            r.unitId,
            { id: r.unitId, name: r.unitName || `Branch ${r.unitId}` },
          ]),
        ).values(),
      ),
    [rooms],
  );

  // Quick lookup: branchId -> branch name, for the table's Branch column
  const branchNameMap = useMemo(
    () => new Map(branchList.map((b) => [String(b.id), b.name])),
    [branchList],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  // Clamp currentPage if filters shrink the result set below the current page
  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(Math.max(0, totalPages - 1));
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    return filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredRows, currentPage]);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage + 1, totalPages),
    [currentPage, totalPages],
  );

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-4 bg-[#f8f9fa] min-h-screen">
      
      {/* Top Filter and Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-10 w-10 p-0 border-gray-200 bg-white shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
          </Button>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex items-center">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-28 h-10 border-0 shadow-none text-[13px] font-medium focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Months</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex items-center">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 h-10 border-0 shadow-none text-[13px] font-medium focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-64 shadow-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expense..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 border border-gray-200 rounded-lg h-10 text-[13px] w-full bg-white focus:outline-none focus:border-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Expense
          </Button>
          <Button
            onClick={() => setIsExportOpen(true)}
            variant="outline"
            className="h-10 border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 font-bold shadow-sm px-5"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Export Excel
          </Button>
        </div>
      </div>

      <ExpenseReportWidget data={filteredRows} />

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mt-4">
        <div className="flex justify-end items-center gap-3 mb-4">
          <Button variant="outline" size="sm" className="h-9 text-xs font-bold border-gray-200 text-gray-700 rounded-lg shadow-sm">
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Clear Filters
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs font-bold border-gray-200 text-gray-700 rounded-lg shadow-sm">
            <Columns className="h-3.5 w-3.5 mr-2" /> Columns <ArrowDown className="h-3 w-3 ml-1 text-gray-400" />
          </Button>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6">
          <style>{`
            .cp-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
            .cp-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
            .cp-table td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
            .cp-table tr:hover { background: #fdfcff; }
            .ex-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; padding: 0; }
            .ex-action-btn:hover { background: #f8fafc; color: #0f172a; }
            .ex-action-btn svg { width: 16px !important; height: 16px !important; flex-shrink: 0; display: inline-block; }
            .ex-page-btn { min-width: 32px; height: 32px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; border: 1px solid #e2e8f0; background: #fff; color: #64748b; }
            .ex-page-btn:hover:not(:disabled) { background: #f8fafc; }
            .ex-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .ex-page-btn.active { background: #5200FF; border-color: #5200FF; color: #fff; font-weight: 600; }
            .ex-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #94a3b8; }
          `}</style>
          <table className="cp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Branch</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#64748b] text-[18px] font-medium bg-white">
                    No expenses found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const date = row.expenseDate ? new Date(row.expenseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                  const config = getCategoryStyleConfig(row.category);
                  const branchName = branchNameMap.get(String(row.branchId)) || `Branch ${row.branchId}`;
                  
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="text-[13px]  text-gray-900">{date}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-[13px] font-medium text-gray-700">{branchName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                          </div>
                          <span className="text-[13px]  text-gray-900">{row.description || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="outline" className={config.style + " font-bold px-3 py-1 rounded-full text-[11px] border"}>
                          {config.label}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-[14px]  text-gray-900">₹{Math.round(Number(row.amount)).toLocaleString('en-IN')}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="ex-action-btn"
                            title="Edit"
                            onClick={() => {
                              setEditingExpense(row);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={16} color="#64748b" strokeWidth={2} className="shrink-0" />
                          </button>
                          <button
                            className="ex-action-btn"
                            title="Delete"
                            onClick={() => handleDelete(row.id!)}
                          >
                            <Trash2 size={16} color="#ef4444" strokeWidth={2} className="shrink-0" />
                          </button>
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
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#f1f5f9] bg-white">
          <div className="text-[13px] text-[#64748b]">
            Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to{" "}
            {Math.min((currentPage + 1) * pageSize, filteredRows.length)} of {filteredRows.length} expenses
          </div>
          <div className="flex items-center gap-2">
            <button
              className="ex-page-btn"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              &lt;
            </button>

            {pageNumbers.map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="ex-page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`ex-page-btn ${p === currentPage + 1 ? "active" : ""}`}
                  onClick={() => setCurrentPage(p - 1)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className="ex-page-btn"
              disabled={currentPage + 1 >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <ExpenseDialogModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingExpense={editingExpense}
        onSubmit={handleSaveExpense}
        currentBranch={selectedBranch}
        branchOptions={branchList}
      />
      <ExpenseExportModal
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        activeRows={filteredRows}
        allExpenses={expenses}
        month={month}
        year={year}
        branchOptions={branchList}
      />
    </div>
  );
};

export default ExpensePage;