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
  const safeKey = categoryKey || "";
  const normalized = safeKey.toUpperCase();
  return (
    HARDCODED_CATEGORIES[normalized] ?? {
      style: "border-indigo-200 text-indigo-600 bg-indigo-50 font-semibold",
      label: safeKey ? safeKey.charAt(0).toUpperCase() + safeKey.slice(1).toLowerCase() : "Uncategorized",
      color: "#6366f1",
    }
  );
};

interface ExpenseReportWidgetProps {
  data: Expense[];
  /** e.g. "October 2026" or "All of 2026". Falls back to "Selected Period". */
  periodLabel?: string;
}

/* A11Y: sub-labels were text-gray-400 (#9ca3af, ~2.5:1 on white) which fails
   WCAG AA. text-gray-600 (#4b5563, ~7.5:1) passes. */
const LABEL_CLASS =
  "text-[11px] font-medium text-gray-600 uppercase tracking-wide truncate";
const SUBTEXT_CLASS = "text-[10px] text-gray-600 mt-0.5 truncate";
const VALUE_CLASS = "text-[18px] font-bold text-gray-900 mt-0.5 truncate";
const CARD_CLASS =
  "bg-white border border-gray-100 rounded-xl p-4 flex gap-4 items-center shadow-sm";

export const ExpenseReportWidget = memo(
  ({ data, periodLabel = "Selected Period" }: ExpenseReportWidgetProps) => {
    const calculations = useMemo(() => {
      let aggregate = 0;
      const breakdown: Record<string, number> = {};

      data.forEach((item) => {
        const amt = Number(item.amount) || 0;
        aggregate += amt;
        const cat = (item.category || "").toUpperCase();
        breakdown[cat] = (breakdown[cat] || 0) + amt;
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
        topCategoryPercentage:
          aggregate > 0 ? Math.round((maxVal / aggregate) * 100) : 0,
      };
    }, [data]);

    const average =
      data.length > 0 ? Math.round(calculations.aggregate / data.length) : 0;

    return (
      <div className="space-y-4 mb-4">
        <div className="expense-stats-grid grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Expenses */}
          <div className={CARD_CLASS}>
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-purple-50 text-purple-600"
              aria-hidden="true"
            >
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Total Expenses</p>
              <p className={VALUE_CLASS}>
                ₹{Math.round(calculations.aggregate).toLocaleString("en-IN")}
              </p>
              <p className={SUBTEXT_CLASS}>{periodLabel}</p>
            </div>
          </div>

          {/* Total Transactions */}
          <div className={CARD_CLASS}>
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500"
              aria-hidden="true"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Total Transactions</p>
              <p className={VALUE_CLASS}>{data.length}</p>
              <p className={SUBTEXT_CLASS}>{periodLabel}</p>
            </div>
          </div>

          {/* Average Expense */}
          <div className={CARD_CLASS}>
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600"
              aria-hidden="true"
            >
              <LineChart className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Average Expense</p>
              <p className={VALUE_CLASS}>₹{average.toLocaleString("en-IN")}</p>
              <p className={SUBTEXT_CLASS}>Per Transaction</p>
            </div>
          </div>

          {/* Top Category */}
          <div className={CARD_CLASS}>
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500"
              aria-hidden="true"
            >
              <Tag className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Top Category</p>
              <p className={VALUE_CLASS}>{calculations.topCategory}</p>
              <p className={SUBTEXT_CLASS}>
                {calculations.topCategoryPercentage}% of Total
              </p>
            </div>
          </div>

          {/* Budget Utilization
              NOTE: still a placeholder value. Replace with real budget data
              or remove this card before release. */}
          <div className={CARD_CLASS}>
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-pink-50 text-pink-500"
              aria-hidden="true"
            >
              <div className="relative flex items-center justify-center h-6 w-6 rounded-full border-[4px] border-pink-400" />
            </div>
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Budget Utilization</p>
              <p className={VALUE_CLASS}>100%</p>
              <p className={SUBTEXT_CLASS}>of allocated budget</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
ExpenseReportWidget.displayName = "ExpenseReportWidget";