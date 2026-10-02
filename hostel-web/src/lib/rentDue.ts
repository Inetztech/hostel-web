import type { RentDueConfig } from "@/lib/types";

// Rent Due Model helpers (Super Admin → Business Model).
//
//   NO_DUE    → Due Amount = ₹0
//   FIXED_DUE → Due Amount = Due Days × Fixed Due Per Day
//
// The per-day amount and the due day always come from the hostel's saved
// Business Model (GET /rents/due-config) — nothing is hard-coded here. This
// mirrors the backend's RentDueUtil exactly; keep the two in sync. The backend
// stays the authority: it recomputes the due when a Rent record is generated
// and keeps it up to date until the rent is paid. This file only drives the
// preview for rows that have not been generated yet.

export const DEFAULT_RENT_DUE_DAY = 1;

export const NO_DUE_CONFIG: RentDueConfig = {
  rentDueMode: "NO_DUE",
  fixedDuePerDay: null,
  rentDueDay: DEFAULT_RENT_DUE_DAY,
};

export interface RentDueResult {
  /** "YYYY-MM-DD" the rent falls due, or null when no due applies. */
  dueDate: string | null;
  dueDays: number;
  dueAmount: number;
  /** ₹ per due day in force (0 for NO_DUE). */
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
 * The date a month's rent falls due: the configured due day (clamped to the
 * month's length). For the check-in month it is never earlier than the check-in
 * date — a tenant can't owe rent before moving in.
 */
export function computeDueDate(
  dueDay: number | null | undefined,
  checkInDate: string | null | undefined,
  month: number,
  year: number
): string {
  const lastDay = new Date(year, month, 0).getDate();
  const wanted = dueDay != null && dueDay >= 1 ? dueDay : DEFAULT_RENT_DUE_DAY;
  let day = Math.min(wanted, lastDay);

  const ci = parseYmd(checkInDate);
  if (ci && ci[0] === year && ci[1] === month && ci[2] > day) day = ci[2];

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Whole days from dueDate to asOf (default today); 0 until the due date has passed. */
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