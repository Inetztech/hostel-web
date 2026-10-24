import {
  addMonthsFromAnchor, cycleIndexFor, cycleDueDateFor, type RentBillingMode,
} from "@/lib/rentCycle";

export interface BranchRentConfig {
  hostelId?: number | null;
  rentDueMode?: "NO_DUE" | "FIXED_DUE" | string | null;
  fixedDuePerDay?: number | null;
  rentDueDay?: number | null;
  rentBillingMode?: RentBillingMode | string | null;
}

export type CyclePeriodType = "BEFORE_JOINING" | "FIRST_CYCLE" | "SUBSEQUENT_CYCLE";

export interface CycleRentPreview {
  periodType: CyclePeriodType;
  billable: boolean;
  reason?: string;
  start: Date | null;
  end: Date | null;
  days: number;
  rentAmount: number;
  dueDate: Date | null;
  dueDays: number;
  dueAmount: number;
  duePerDay: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isCycleConfig = (cfg?: BranchRentConfig | null): boolean =>
  (cfg?.rentBillingMode ?? "").toString().trim().toUpperCase() === "JOINING_DATE_CYCLE";

export function previewCycleRent(args: {
  monthlyRent: number;
  checkIn: Date | null;
  month: number;
  year: number;
  config?: BranchRentConfig | null;
  today?: Date;
}): CycleRentPreview | null {
  const { monthlyRent, checkIn, month, year, config } = args;
  if (!isCycleConfig(config) || !checkIn) return null;

  const today = startOfDay(args.today ?? new Date());
  const idx = cycleIndexFor(checkIn, month, year);

  if (idx < 0) {
    return {
      periodType: "BEFORE_JOINING", billable: false,
      reason: "Tenant had not joined in this period",
      start: null, end: null, days: 0, rentAmount: 0,
      dueDate: null, dueDays: 0, dueAmount: 0, duePerDay: 0,
    };
  }

  const start = addMonthsFromAnchor(checkIn, idx);
  const next = addMonthsFromAnchor(checkIn, idx + 1);
  const end = new Date(next.getTime() - DAY_MS);
  const days = Math.round((next.getTime() - start.getTime()) / DAY_MS);

  const started = start.getTime() <= today.getTime();
  const perDay = Number(config?.fixedDuePerDay ?? 0);
  const fixed = config?.rentDueMode === "FIXED_DUE" && perDay > 0;

  // Due date honours rentDueDay (grace), same as the backend.
  const dueDate = fixed ? cycleDueDateFor(checkIn, idx, config?.rentDueDay) : null;
  const dueDays =
    started && fixed && dueDate
      ? Math.max(0, Math.round((today.getTime() - dueDate.getTime()) / DAY_MS))
      : 0;

  return {
    periodType: idx === 0 ? "FIRST_CYCLE" : "SUBSEQUENT_CYCLE",
    billable: started,
    reason: started
      ? undefined
      : `This rent cycle starts on ${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} and can't be generated yet`,
    start, end, days,
    rentAmount: round2(monthlyRent),
    dueDate,
    dueDays,
    dueAmount: fixed ? round2(dueDays * perDay) : 0,
    duePerDay: fixed ? perDay : 0,
  };
}