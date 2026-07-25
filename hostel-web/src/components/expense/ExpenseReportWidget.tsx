import { useMemo, memo } from "react";
import { PieChart, Info } from "lucide-react";
import { Expense } from "@/lib/store";

const HARDCODED_CATEGORIES: Record<string, { style: string; label: string }> = {
  MAINTENANCE: { style: "border-amber-500 text-amber-600 bg-amber-50/40", label: "Maintenance" },
  UTILITIES: { style: "border-blue-500 text-blue-600 bg-blue-50/40", label: "Utilities" },
  SALARY: { style: "border-green-500 text-green-600 bg-green-50/40", label: "Staff Salary" },
  TAX: { style: "border-purple-500 text-purple-600 bg-purple-50/40", label: "Tax & Compliance" },
};

export const getCategoryStyleConfig = (categoryKey: string) => {
  const normalized = (categoryKey || "").toUpperCase();
  return HARDCODED_CATEGORIES[normalized] ?? {
    style: "border-indigo-500 text-indigo-600 bg-indigo-50/40 font-semibold",
    label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).toLowerCase(),
  };
};

export const ExpenseReportWidget = memo(({ data }: { data: Expense[] }) => {
  const calculations = useMemo(() => {
    let aggregate = 0;
    const breakdown: Record<string, number> = {};
    data.forEach((item) => {
      aggregate += item.amount;
      const cat = item.category.toUpperCase();
      breakdown[cat] = (breakdown[cat] || 0) + item.amount;
    });
    return { aggregate, breakdown };
  }, [data]);

  const visibleCategories = useMemo(() => Object.keys(calculations.breakdown), [calculations]);

  return (
    <div className="bg-muted/30 border rounded-xl p-4 space-y-3 print:bg-transparent print:border-none print:p-0">
      <div className="flex items-center gap-2 border-b pb-2">
        <PieChart className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold tracking-tight text-foreground uppercase">Dynamic Category Distribution</h2>
      </div>

      {visibleCategories.length === 0 ? (
        <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground italic bg-background rounded-lg border border-dashed">
          <Info className="h-4 w-4" /> No logged records match the current view criteria.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 print:grid-cols-4">
          {visibleCategories.map((catKey) => {
            const catAmount = calculations.breakdown[catKey];
            const share = calculations.aggregate > 0 ? Math.round((catAmount / calculations.aggregate) * 100) : 0;
            const config = getCategoryStyleConfig(catKey);

            return (
              <div key={catKey} className="bg-background border rounded-lg p-3 space-y-1.5 shadow-sm print:shadow-none print:border">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-wider">{config.label}</span>
                  <span className={`w-2 h-2 rounded-full border ${config.style.split(" ")[0]} print:hidden`} />
                </div>
                <p className="text-base font-extrabold tracking-tight">₹{Math.round(catAmount).toLocaleString("en-IN")}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                  <span>Distribution</span>
                  <span className="font-bold text-primary">{share}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
ExpenseReportWidget.displayName = "ExpenseReportWidget";