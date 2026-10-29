import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CalendarDays, Info } from "lucide-react";
import {
  buildRentPeriods, fmtDate, inr, parseLocalDate, type RentBillingMode,
} from "@/lib/rentCycle";

interface Props {
  idPrefix: string;
  value: RentBillingMode;
}

// Shared with HostelAdminPage, which renders the dropdown itself.
export const RENT_CYCLE_OPTIONS: { value: RentBillingMode; label: string; description: string }[] = [
  {
    value: "CALENDAR_MONTH",
    label: "Calendar Month",
    description: "Joining month is pro-rated by days; later months are billed in full (current behaviour).",
  },
  {
    value: "JOINING_DATE_CYCLE",
    label: "Joining-Date Cycle",
    description: "Rent runs joining date → same date next month (15-Sep → 15-Oct = one full cycle).",
  },
];

export default function BusinessModelRentBilling({ idPrefix, value }: Props) {
  const [sampleRent, setSampleRent] = useState("7000");
  const [sampleJoin, setSampleJoin] = useState("2026-09-15");

  const periods = useMemo(() => {
    const join = parseLocalDate(sampleJoin);
    const rent = Number(sampleRent);
    if (!join || !(rent > 0)) return [];
    return buildRentPeriods(value, rent, join, 3);
  }, [value, sampleRent, sampleJoin]);

  return (
    <section className="h-bm-block h-bm-billing" aria-label="Rent cycle example">
      <style>{`
        .h-bm-billing { margin: 0; }
        .h-bm-sample { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
        .h-bm-sample .h-bm-field { min-width: 150px; flex: 1; }
        .h-bm-sample input { border-radius: 999px !important; height: 34px !important; font-size: 12.5px !important; background: #fff !important; }
        .h-bm-period-wrap { overflow-x: auto; }
        .h-bm-period { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 520px; }
        .h-bm-period th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: #475569; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        .h-bm-period td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; vertical-align: top; }
        .h-bm-period tr:last-child td { border-bottom: none; }
        .h-bm-period .amt { font-weight: 700; color: #166534; white-space: nowrap; }
        .h-bm-period .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .h-bm-period .tag.partial { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .h-bm-period .sub { color: #475569; font-size: 11px; margin-top: 2px; }
      `}</style>

      <div className="h-bm-block-title">
        <span className="h-bm-icon" style={{ background: "#ecfeff" }}>
          <CalendarDays size={13} color="#0891b2" aria-hidden="true" />
        </span>
        Rent Cycle Example
      </div>

      <div className="h-bm-sample">
        <div className="h-bm-field">
          <label htmlFor={`${idPrefix}-sample-rent`} className="h-bm-field-label">Example monthly rent (₹)</label>
          <Input
            id={`${idPrefix}-sample-rent`}
            inputMode="numeric"
            value={sampleRent}
            onChange={(e) => setSampleRent(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="h-bm-field">
          <label htmlFor={`${idPrefix}-sample-join`} className="h-bm-field-label">Example joining date</label>
          <Input
            id={`${idPrefix}-sample-join`}
            type="date"
            value={sampleJoin}
            onChange={(e) => setSampleJoin(e.target.value)}
          />
        </div>
      </div>

      <div className="h-bm-period-wrap">
        {periods.length === 0 ? (
          <div className="h-bm-field-hint">Enter a rent amount and joining date to preview the calculation.</div>
        ) : (
          <table className="h-bm-period">
            <caption className="sr-only">Worked rent calculation example</caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Dates</th>
                <th scope="col">How it is calculated</th>
                <th scope="col">Rent</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.index}>
                  <td>
                    <span className={`tag ${p.type === "PARTIAL_FIRST_MONTH" && p.days !== p.daysBase ? "partial" : ""}`}>
                      {p.typeLabel}
                    </span>
                  </td>
                  <td>
                    {fmtDate(p.start)} → {fmtDate(p.end)}
                    <div className="sub">{p.days} day{p.days === 1 ? "" : "s"}</div>
                  </td>
                  <td>
                    {p.formula}
                    <div className="sub">Daily rent {inr(p.dailyRent)} ({inr(Number(sampleRent))} ÷ {p.daysBase})</div>
                  </td>
                  <td className="amt">{inr(p.rent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* <div className="h-bm-note">
        <Info size={12} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Month lengths (28/29/30/31) and leap years are handled automatically. The rent used is each tenant's own
          monthly rent. A room/bed transfer inside a period splits it by days (old rent → new rent). Changing this
          affects new rent records only.
        </span>
      </div> */}
    </section>
  );
}