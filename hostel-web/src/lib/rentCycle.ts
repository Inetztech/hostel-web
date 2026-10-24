export type RentBillingMode = "CALENDAR_MONTH" | "JOINING_DATE_CYCLE";

export type RentPeriodType =
  | "PARTIAL_FIRST_MONTH"
  | "FULL_MONTH"
  | "FIRST_CYCLE"
  | "SUBSEQUENT_CYCLE";

export interface RentPeriod {
  index: number;
  type: RentPeriodType;
  typeLabel: string;
  start: Date;
  end: Date;
  days: number;
  daysBase: number;
  dailyRent: number;
  rent: number;
  formula: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export const inr = (n: number): string =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

export const daysInMonth = (month1to12: number, year: number): number =>
  new Date(year, month1to12, 0).getDate();

export const parseLocalDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

export const addMonthsFromAnchor = (anchor: Date, n: number): Date => {
  const total = anchor.getFullYear() * 12 + anchor.getMonth() + n;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const day = Math.min(anchor.getDate(), new Date(y, m + 1, 0).getDate());
  return new Date(y, m, day);
};

/* ------------------------------------------------------------------ */
/* Cycle-mode helpers (mirror of RentCycleUtil / RentServiceImpl)      */
/* ------------------------------------------------------------------ */

/** 0 = cycle starting in the joining month; negative = before the tenant joined. */
export const cycleIndexFor = (checkIn: Date, month1to12: number, year: number): number =>
  year * 12 + month1to12 - (checkIn.getFullYear() * 12 + (checkIn.getMonth() + 1));

/** Start date of the cycle that begins in (month, year), or null when before joining. */
export const cycleStartFor = (checkIn: Date, month1to12: number, year: number): Date | null => {
  const idx = cycleIndexFor(checkIn, month1to12, year);
  return idx < 0 ? null : addMonthsFromAnchor(checkIn, idx);
};

export const cycleDueDateFor = (
  checkIn: Date,
  idx: number,
  _dueDay?: number | null
): Date => {
  const start = addMonthsFromAnchor(checkIn, idx);
  // day 0 of the next month = last day of the start's month
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
};

export type CycleBillability = "OK" | "BEFORE_JOINING" | "NOT_STARTED";

export const cycleBillability = (
  checkIn: Date,
  month1to12: number,
  year: number,
  today: Date = new Date()
): CycleBillability => {
  const start = cycleStartFor(checkIn, month1to12, year);
  if (!start) return "BEFORE_JOINING";
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return start.getTime() > t.getTime() ? "NOT_STARTED" : "OK";
};

export function buildRentPeriods(
  mode: RentBillingMode,
  monthlyRent: number,
  joinDate: Date,
  count = 3,
  checkInDayChargeable = true
): RentPeriod[] {
  const out: RentPeriod[] = [];

  for (let i = 0; i < count; i++) {
    if (mode === "JOINING_DATE_CYCLE") {
      const start = addMonthsFromAnchor(joinDate, i);
      const next = addMonthsFromAnchor(joinDate, i + 1);
      const end = new Date(next.getTime() - DAY_MS);
      const days = diffDays(start, next);
      out.push({
        index: i,
        type: i === 0 ? "FIRST_CYCLE" : "SUBSEQUENT_CYCLE",
        typeLabel: i === 0 ? "First cycle (full)" : "Next cycle (full)",
        start, end, days, daysBase: days,
        dailyRent: round2(monthlyRent / days),
        rent: round2(monthlyRent),
        formula: `Complete cycle ${fmtDate(start)} → ${fmtDate(end)} (${days} days) = ${inr(monthlyRent)}`,
      });
      continue;
    }

    const first = new Date(joinDate.getFullYear(), joinDate.getMonth() + i, 1);
    const dim = daysInMonth(first.getMonth() + 1, first.getFullYear());
    const lastDay = new Date(first.getFullYear(), first.getMonth(), dim);

    if (i === 0) {
      const joinDay = joinDate.getDate();
      const occupied = Math.max(
        0,
        Math.min(checkInDayChargeable ? dim - joinDay + 1 : dim - joinDay, dim)
      );
      const daily = monthlyRent / dim;
      out.push({
        index: 0,
        type: "PARTIAL_FIRST_MONTH",
        typeLabel: occupied === dim ? "First month (full)" : "Partial first month",
        start: checkInDayChargeable ? joinDate : new Date(joinDate.getTime() + DAY_MS),
        end: lastDay,
        days: occupied, daysBase: dim,
        dailyRent: round2(daily),
        rent: round2(daily * occupied),
        formula: `${inr(monthlyRent)} ÷ ${dim} days × ${occupied} days`,
      });
    } else {
      out.push({
        index: i,
        type: "FULL_MONTH",
        typeLabel: "Full month",
        start: first, end: lastDay,
        days: dim, daysBase: dim,
        dailyRent: round2(monthlyRent / dim),
        rent: round2(monthlyRent),
        formula: `Full month (${dim} days) = ${inr(monthlyRent)}`,
      });
    }
  }
  return out;
}