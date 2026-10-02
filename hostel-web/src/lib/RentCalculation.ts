export const CHECK_IN_DAY_CHARGEABLE = true;

export interface RentBreakdown {
  monthlyRent: number;
  daysInMonth: number;
  checkInDate: string | null;
  proRated: boolean;
  occupiedDays: number;
  dailyRent: number;
  rentAmount: number;
  transferApplied?: boolean;
  transferEffectiveDate?: string;
  previousRent?: number;
  newRent?: number;
}

export interface TransferForProration {
  effectiveDate: string; 
  previousRent?: number | null;
  newRent?: number | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function isCheckInMonth(
  checkInDate: string | null | undefined,
  month: number,
  year: number
): boolean {
  if (!checkInDate) return false;
  const d = new Date(checkInDate);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

export function occupiedDaysInCheckInMonth(
  checkInDate: string,
  monthDaysTotal: number,
  checkInDayChargeable: boolean = CHECK_IN_DAY_CHARGEABLE
): number {
  const d = new Date(checkInDate);
  const checkInDay = d.getDate();
  const occupied = checkInDayChargeable
    ? monthDaysTotal - checkInDay + 1
    : monthDaysTotal - checkInDay;
  return Math.max(0, Math.min(occupied, monthDaysTotal));
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function findTransferInBillingMonth(
  transfers: TransferForProration[] | null | undefined,
  month: number,
  year: number
): TransferForProration | null {
  if (!transfers || transfers.length === 0) return null;
  const match = transfers.find((t) => {
    if (t.status !== "COMPLETED") return false;
    const d = new Date(t.effectiveDate);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
  return match ?? null;
}

export function computeRentForMonthWithTransfer(
  oldRent: number,
  newRent: number,
  transferEffectiveDate: string,
  checkInDate: string | null | undefined,
  month: number,
  year: number,
  checkInDayChargeable: boolean = CHECK_IN_DAY_CHARGEABLE
): number {
  const totalDays = daysInMonth(month, year);

  let periodStartDay = 1;
  if (isCheckInMonth(checkInDate, month, year) && checkInDate) {
    const checkInDay = new Date(checkInDate).getDate();
    periodStartDay = checkInDayChargeable ? checkInDay : checkInDay + 1;
  }
  periodStartDay = Math.max(1, Math.min(periodStartDay, totalDays + 1));

  const transferDay = new Date(transferEffectiveDate).getDate();
  const effectiveDay = Math.max(transferDay, periodStartDay);
  const oldRentDays = Math.max(0, effectiveDay - periodStartDay);
  const newRentDays = Math.max(0, totalDays - effectiveDay + 1);

  const dailyOld = totalDays > 0 ? oldRent / totalDays : 0;
  const dailyNew = totalDays > 0 ? newRent / totalDays : 0;

  return round2(dailyOld * oldRentDays + dailyNew * newRentDays);
}

export function computeRentBreakdown(
  monthlyRent: number,
  checkInDate: string | null | undefined,
  month: number,
  year: number,
  checkInDayChargeable: boolean = CHECK_IN_DAY_CHARGEABLE,
  transfers?: TransferForProration[] | null
): RentBreakdown {
  const totalDays = daysInMonth(month, year);
  const daily = totalDays > 0 ? monthlyRent / totalDays : 0;

  const transferInMonth = findTransferInBillingMonth(transfers, month, year);

  if (transferInMonth) {
    const oldRent = transferInMonth.previousRent ?? monthlyRent;
    const newRent = transferInMonth.newRent ?? monthlyRent;
    const rentAmount = computeRentForMonthWithTransfer(
      oldRent, newRent, transferInMonth.effectiveDate,
      checkInDate, month, year, checkInDayChargeable
    );
    return {
      monthlyRent,
      daysInMonth: totalDays,
      checkInDate: checkInDate ?? null,
      proRated: true,
      occupiedDays: totalDays, // mixed old/new-rate days; not a single occupied-day count
      dailyRent: daily,
      rentAmount,
      transferApplied: true,
      transferEffectiveDate: transferInMonth.effectiveDate,
      previousRent: oldRent,
      newRent: newRent,
    };
  }

  const proRated = isCheckInMonth(checkInDate, month, year);

  if (proRated && checkInDate) {
    const occupied = occupiedDaysInCheckInMonth(checkInDate, totalDays, checkInDayChargeable);
    return {
      monthlyRent,
      daysInMonth: totalDays,
      checkInDate,
      proRated: true,
      occupiedDays: occupied,
      dailyRent: daily,
      rentAmount: round2(daily * occupied),
    };
  }

  return {
    monthlyRent,
    daysInMonth: totalDays,
    checkInDate: checkInDate ?? null,
    proRated: false,
    occupiedDays: totalDays,
    dailyRent: daily,
    rentAmount: round2(monthlyRent),
  };
}


export function computeRentForMonth(
  monthlyRent: number,
  checkInDate: string | null | undefined,
  month: number,
  year: number,
  checkInDayChargeable: boolean = CHECK_IN_DAY_CHARGEABLE,
  transfers?: TransferForProration[] | null
): number {
  if (!checkInDate && !findTransferInBillingMonth(transfers, month, year)) {
    return round2(monthlyRent);
  }
  return computeRentBreakdown(monthlyRent, checkInDate, month, year, checkInDayChargeable, transfers).rentAmount;
}