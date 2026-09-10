import { useMemo, memo } from "react";
import { Expense } from "@/lib/store";
import { Wallet, ArrowRightLeft, LineChart, Tag } from "lucide-react";

const HARDCODED_CATEGORIES: Record<string, { style: string; label: string; color: string }> = {
  MAINTENANCE: { style: "border-amber-500 text-amber-600 bg-amber-50", label: "Maintenance", color: "#f59e0b" },
  UTILITIES: { style: "border-blue-500 text-blue-600 bg-blue-50", label: "Utilities", color: "#3b82f6" },
  SALARY: { style: "border-green-500 text-green-600 bg-green-50", label: "Staff Salary", color: "#10b981" },
  TAX: { style: "border-purple-500 text-purple-600 bg-purple-50", label: "Tax & Compliance", color: "#8b5cf6" },
  SNACKS: { style: "border-purple-200 text-purple-600 bg-purple-50", label: "Snacks", color: "#7c3aed" },
};

export const getCategoryStyleConfig = (categoryKey: string) => {
  const normalized = (categoryKey || "").toUpperCase();
  return HARDCODED_CATEGORIES[normalized] ?? {
    style: "border-indigo-200 text-indigo-600 bg-indigo-50 font-semibold",
    label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).toLowerCase(),
    color: "#6366f1"
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
    
    let maxCat = "";
    let maxVal = 0;
    Object.entries(breakdown).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });

    return { 
      aggregate, 
      topCategory: maxCat ? getCategoryStyleConfig(maxCat).label : "N/A",
      topCategoryPercentage: aggregate > 0 ? Math.round((maxVal / aggregate) * 100) : 0,
    };
  }, [data]);

  return (
    <div className="space-y-4 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm">
          <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-purple-50 text-purple-600">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">Total Expenses</p>
            <p className="text-[18px] font-bold text-gray-900 mt-0.5 truncate">₹{Math.round(calculations.aggregate).toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">This Month</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm">
          <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">Total Transactions</p>
            <p className="text-[18px] font-bold text-gray-900 mt-0.5 truncate">{data.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">This Month</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm">
          <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600">
            <LineChart className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">Average Expense</p>
            <p className="text-[18px] font-bold text-gray-900 mt-0.5 truncate">₹{data.length > 0 ? Math.round(calculations.aggregate / data.length).toLocaleString("en-IN") : 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">Per Transaction</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm">
          <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500">
            <Tag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">Top Category</p>
            <p className="text-[18px] font-bold text-gray-900 mt-0.5 truncate">{calculations.topCategory}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{calculations.topCategoryPercentage}% of Total</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm">
          <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-pink-50 text-pink-500">
            <div className="relative flex items-center justify-center h-6 w-6 rounded-full border-[4px] border-pink-400">
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">Budget Utilization</p>
            <p className="text-[18px] font-bold text-gray-900 mt-0.5 truncate">100%</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">of allocated budget</p>
          </div>
        </div>
      </div>
    </div>
  );
});
ExpenseReportWidget.displayName = "ExpenseReportWidget";