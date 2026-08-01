import { useEffect, useState, useCallback, memo } from "react";
import { toast } from "sonner";
import { FolderPlus, Tag, Sparkles, Calendar, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Expense } from "@/lib/store";

const HARDCODED_CATEGORIES: Record<string, { label: string }> = {
  MAINTENANCE: { label: "Maintenance" },
  UTILITIES: { label: "Utilities" },
  SALARY: { label: "Staff Salary" },
  TAX: { label: "Tax & Compliance" },
};

interface ExpenseDialogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: Expense | null;
  onSubmit: (description: string, amount: number, category: string, expenseDate: string) => void;
  currentBranch: string;
}

export const ExpenseDialogModal = memo(({
  open,
  onOpenChange,
  editingExpense,
  onSubmit,
  currentBranch,
}: ExpenseDialogModalProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedMenuCat, setSelectedMenuCat] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description || "");
      setAmount(String(editingExpense.amount || ""));
      setExpenseDate(editingExpense.expenseDate || new Date().toISOString().slice(0, 10));

      const normalizedCat = (editingExpense.category || "").toUpperCase();
      if (HARDCODED_CATEGORIES[normalizedCat]) {
        setSelectedMenuCat(normalizedCat);
        setCustomCategory("");
      } else {
        setSelectedMenuCat("OTHER");
        setCustomCategory(editingExpense.category || "");
      }
    } else {
      setDescription("");
      setAmount("");
      setSelectedMenuCat("");
      setCustomCategory("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
    }
  }, [editingExpense, open]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return toast.error("Please enter a valid expense description.");
    if (!selectedMenuCat) return toast.error("Please select a target category.");

    let finalCategory = selectedMenuCat;
    if (selectedMenuCat === "OTHER") {
      if (!customCategory.trim()) return toast.error("Please define custom category name.");
      finalCategory = customCategory.trim().toUpperCase();
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return toast.error("Provide a valid numeric amount.");
    if (!expenseDate) return toast.error("Please select a valid transaction date.");
    if (currentBranch === "all" && !editingExpense) return toast.error("Please pick a branch target location.");

    onSubmit(description, Number(amount), finalCategory, expenseDate);
    onOpenChange(false);
  }, [description, selectedMenuCat, customCategory, amount, expenseDate, currentBranch, editingExpense, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* rounded-2xl + overflow-hidden ensures every corner (including any
          header/footer background) is clipped to the rounded shape instead
          of the default sharp/square corners */}
      <DialogContent className="sm:max-w-[540px] rounded-2xl overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="h-4 w-4 text-primary" />
            {editingExpense ? "Edit Expense Record" : "Create Expense Entry"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingExpense ? "Modify existing transaction details below." : "Enter transaction details to log financial outflow."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              type="text"
              placeholder="e.g., Internet Bill / Maintenance repair"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border rounded-xl px-3 h-9 text-sm w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Category
              </label>
              <Select value={selectedMenuCat} onValueChange={setSelectedMenuCat}>
                <SelectTrigger className="h-9 text-sm bg-background rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.keys(HARDCODED_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>{HARDCODED_CATEGORIES[cat].label}</SelectItem>
                  ))}
                  <SelectItem value="OTHER" className="text-indigo-600 font-medium">+ Custom Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="border rounded-xl px-3 h-9 text-sm w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {selectedMenuCat === "OTHER" && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Custom Category Name
              </label>
              <input
                type="text"
                placeholder="e.g., Food, Marketing"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="border border-indigo-200 rounded-xl px-3 h-9 text-sm w-full bg-indigo-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground text-sm">₹</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border rounded-xl pl-6 pr-3 h-9 w-full text-sm bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="rounded-xl">
              {editingExpense ? <Edit className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              {editingExpense ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
ExpenseDialogModal.displayName = "ExpenseDialogModal";