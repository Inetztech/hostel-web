import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
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
import { ExpenseDialogModal } from "@/components/expense/ExpenseDialogModal";
import { ExpenseExportModal } from "@/components/expense/ExpenseExportModal";
import {
  ExpenseReportWidget,
  getCategoryStyleConfig,
} from "@/components/expense/ExpenseReportWidget";

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

      const [roomList, expenseList] = await Promise.all([
        fetchAllPages<Room>(getRooms).catch(() => []),
        fetchAllPages<Expense>(async () => ({
          content: await fetchExpenses(),
          totalElements: (await fetchExpenses()).length,
        })).catch(() => []),
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

  const handleSaveExpense = useCallback(
    async (
      description: string,
      amount: number,
      category: string,
      expenseDate: string,
    ) => {
      try {
        const activeUserId = userId || (role === "WARDEN" ? 2 : 1);
        const payload = {
          description,
          amount,
          category,
          expenseDate,
          branchId: Number(selectedBranch),
          createdBy: activeUserId,
        };

        if (editingExpense) {
          await updateExpense(editingExpense.id, {
            ...payload,
            branchId: editingExpense.branchId,
          });
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
    [selectedBranch, userId, role, editingExpense, loadData],
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

  const grossOutflow = useMemo(
    () => filteredRows.reduce((a, b) => a + b.amount, 0),
    [filteredRows],
  );
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

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Date",
        field: "expenseDate",
        width: 120,
        suppressSizeToFit: true, // 👈 Keeps date column compact and fixed
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleDateString("en-IN") : "-",
      },
      {
        headerName: "Description",
        field: "description",
        flex: 1, // 👈 Takes ALL remaining space dynamically
        minWidth: 200,
      },
      {
        headerName: "Category",
        field: "category",
        width: 150,
        suppressSizeToFit: true,
        cellRenderer: (p: any) => (
          <Badge
            variant="outline"
            className={getCategoryStyleConfig(p.value).style}
          >
            {getCategoryStyleConfig(p.value).label}
          </Badge>
        ),
      },
      {
        headerName: "Amount",
        field: "amount",
        width: 130,
        suppressSizeToFit: true,
        cellStyle: { fontWeight: "700" },
        valueFormatter: (p) =>
          `₹${Math.round(Number(p.value)).toLocaleString("en-IN")}`,
      },
      {
        headerName: "Actions",
        width: 190, // 👈 Comfortably fits both buttons + icons
        minWidth: 190,
        suppressSizeToFit: true, // 👈 Prevents AG Grid from squeezing this column
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-1.5 h-full">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => {
                setEditingExpense(p.data);
                setIsModalOpen(true);
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
              onClick={() => handleDelete(p.data.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          </div>
        ),
      },
    ],
    [handleDelete],
  );
  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-3">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1 text-red-600 font-extrabold text-sm">
            <TrendingDown className="h-4 w-4" /> ₹
            {Math.round(grossOutflow).toLocaleString("en-IN")}
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Log Expense
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-3 flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {role === "ADMIN" && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branchList.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 border rounded h-8 text-xs w-full bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {(search ||
            month !== new Date().getMonth() + 1 ||
            year !== new Date().getFullYear()) && (
            <Button
              onClick={() => {
                setMonth(new Date().getMonth() + 1);
                setYear(new Date().getFullYear());
                setSearch("");
              }}
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>

        <Button
          onClick={() => setIsExportOpen(true)}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" />{" "}
          Export Excel
        </Button>
      </div>

      <ExpenseReportWidget data={filteredRows} />
      <div
        className="ag-theme-alpine border rounded-xl overflow-hidden shadow-sm bg-card"
        style={{ height: 460 }}
      >
        <AgGridReact
          rowData={filteredRows}
          columnDefs={columnDefs}
          autoSizeStrategy={{
            type: "fitGridWidth", // Stretches the Description column to fill the entire container
          }}
          suppressCellFocus={true}
          rowHeight={48}
          pagination
          paginationPageSize={10}
          animateRows
        />
      </div>

      <ExpenseDialogModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingExpense={editingExpense}
        onSubmit={handleSaveExpense}
        currentBranch={selectedBranch}
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