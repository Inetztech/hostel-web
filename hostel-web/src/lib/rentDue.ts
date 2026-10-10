import type { RentDueConfig } from "@/lib/types";

export const DEFAULT_RENT_DUE_DAY = 1;

export const NO_DUE_CONFIG: RentDueConfig = {
  rentDueMode: "NO_DUE",
  fixedDuePerDay: null,
  rentDueDay: DEFAULT_RENT_DUE_DAY,
};

export interface RentDueResult {
  dueDate: string | null;
  dueDays: number;
  dueAmount: number;
  perDay: number;
}

export const NO_DUE_RESULT: RentDueResult = {
  dueDate: null,
  dueDays: 0,
  dueAmount: 0,
  perDay: 0,
};

/** True only for FIXED_DUE with a positive per-day amount. */
export const isFixedDue = (cfg?: RentDueConfig | null): boolean =>
  cfg?.rentDueMode === "FIXED_DUE" && Number(cfg.fixedDuePerDay) > 0;

// "YYYY-MM-DD" → [y, m, d] without any timezone shift.
const parseYmd = (s: string | null | undefined): [number, number, number] | null => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return y && m && d ? [y, m, d] : null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The date a month's rent falls due: the configured due day of the NEXT month
 * (clamped to that month's length; December rolls over to January). The
 * check-in date is not needed — the due date is always after check-in — and the
 * parameter is kept so existing callers keep compiling.
 */
export function computeDueDate(
  dueDay: number | null | undefined,
  _checkInDate: string | null | undefined,
  month: number,
  year: number
): string {
  const wanted = dueDay != null && dueDay >= 1 ? dueDay : DEFAULT_RENT_DUE_DAY;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  return `${nextYear}-${pad(nextMonth)}-${pad(Math.min(wanted, lastDay))}`;
}

/** Whole days after dueDate up to asOf (default today); 0 until the due date has passed. */
export function computeDueDays(dueDate: string, asOf: Date = new Date()): number {
  const due = parseYmd(dueDate);
  if (!due) return 0;
  // UTC day numbers, so daylight-saving shifts can never add or drop a day.
  const dueUtc = Date.UTC(due[0], due[1] - 1, due[2]);
  const asOfUtc = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const days = Math.round((asOfUtc - dueUtc) / 86_400_000);
  return days > 0 ? days : 0;
}

/** NO_DUE → 0; FIXED_DUE → dueDays × perDay (0 days → 0). */
export function computeDueAmount(cfg: RentDueConfig | null | undefined, dueDays: number): number {
  if (!isFixedDue(cfg) || dueDays <= 0) return 0;
  return Math.round(dueDays * Number(cfg!.fixedDuePerDay) * 100) / 100;
}

/** Full due preview for one tenant's rent period under the active config. */
export function computeRentDue(
  cfg: RentDueConfig | null | undefined,
  checkInDate: string | null | undefined,
  month: number,
  year: number,
  asOf: Date = new Date()
): RentDueResult {
  if (!isFixedDue(cfg)) return NO_DUE_RESULT;
  const dueDate = computeDueDate(cfg!.rentDueDay, checkInDate, month, year);
  const dueDays = computeDueDays(dueDate, asOf);
  return {
    dueDate,
    dueDays,
    dueAmount: computeDueAmount(cfg, dueDays),
    perDay: Number(cfg!.fixedDuePerDay),
  };
}