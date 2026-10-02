import { useState, useCallback, memo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Expense } from "@/lib/store";
import { MONTHS } from "@/lib/types";

const getCategoryLabel = (category: Expense["category"]) =>
  String(category)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

interface ExpenseExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeRows: Expense[];
  allExpenses: Expense[];
  month: number;
  year: number;
  branchOptions: { id: number; name: string }[];
}

export const ExpenseExportModal = memo(({
  open,
  onOpenChange,
  activeRows,
  allExpenses,
  month,
  year,
  branchOptions,
}: ExpenseExportModalProps) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const executeExport = useCallback((dataset: Expense[], fileLabel: string) => {
    if (dataset.length === 0) return toast.error("No expense records found to export.");

    const sortedData = [...dataset].sort((a, b) => (a.expenseDate > b.expenseDate ? 1 : -1));
    const exportRows = sortedData.map((exp, index) => ({
      "S.No": index + 1,
      "Expense Date": exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-IN") : "-",
      "Description": exp.description,
      "Category": getCategoryLabel(exp.category),
      "Amount (₹)": exp.amount,
      "Branch": branchOptions.find((b) => String(b.id) === String(exp.branchId))?.name || `Branch ${exp.branchId}`,
    }));

    exportRows.push({
      "S.No": "" as any,
      "Expense Date": "",
      "Description": "TOTAL OUTFLOW",
      "Category": "",
      "Amount (₹)": sortedData.reduce((s, i) => s + i.amount, 0),
      "Branch": "",
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 22 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `Expense_Report_${fileLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast.success(`Exported ${dataset.length} records.`);
    onOpenChange(false);
  }, [branchOptions, onOpenChange]);

  const handleCustomRangeExport = useCallback(() => {
    if (!fromDate && !toDate) return toast.error("Select a start or end date.");
    const filtered = allExpenses.filter((exp) => {
      if (!exp.expenseDate) return false;
      const d = exp.expenseDate.slice(0, 10);
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });
    executeExport(filtered, `${fromDate || "Start"}_to_${toDate || "Present"}`);
  }, [allExpenses, fromDate, toDate, executeExport]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-emerald-700">
            <FileSpreadsheet className="h-5 w-5" /> Export Expense Report to Excel
          </DialogTitle>
          <DialogDescription className="text-xs">
            Download your current active view, custom date range, or entire database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-2">
          <div className="p-3 border rounded-lg bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Active Filtered View</span>
              <Badge variant="outline" className="text-[10px]">{activeRows.length} Records</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Exports matching ({month === 0 ? "All Months" : MONTHS[month - 1]} {year}).
            </p>
            <Button onClick={() => executeExport(activeRows, `${month === 0 ? "All_Months" : MONTHS[month - 1]}_${year}`)} size="sm" variant="outline" className="w-full text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              Download Filtered View ({activeRows.length})
            </Button>
          </div>

          <div className="p-3 border rounded-lg bg-card space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Download Custom Date Range
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border rounded px-2 h-8 text-xs w-full bg-background focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border rounded px-2 h-8 text-xs w-full bg-background focus:outline-none" />
              </div>
            </div>
            <Button onClick={handleCustomRangeExport} size="sm" variant="outline" className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary/5">
              Download Date Range
            </Button>
          </div>

          <div className="p-3 border rounded-lg bg-muted/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">All-Time Complete Dump</span>
              <Badge variant="secondary" className="text-[10px]">{allExpenses.length} Total Entries</Badge>
            </div>
            <Button onClick={() => executeExport(allExpenses, "ALL_TIME")} size="sm" className="w-full text-xs h-8">
              Download All Entries ({allExpenses.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
ExpenseExportModal.displayName = "ExpenseExportModal";