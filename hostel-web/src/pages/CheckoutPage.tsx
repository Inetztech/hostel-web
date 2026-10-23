import { useEffect, useState, useRef, useMemo } from "react";
import {
  getRooms,
  getTenants,
  getCheckoutSummary,
  checkoutTenant,
  getUserRole,
  getEBReadings,
  updateBedStatus,
  getBranchId,
  getBranches,
  fetchAllPages,
  getBusinessModel,
} from "@/lib/store";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Room, Tenant, Rent, EBReading, Branch, DEFAULT_EB_RATE, MONTHS } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, Search, ChevronRight, Building2 } from "lucide-react";

/* Card section heading. Renders an <h2> (the page title is the <h1>) so the
   heading order is h1 -> h2 with no skipped level. shadcn's CardTitle renders
   an <h3>, which is what Lighthouse flagged. Same visual style as before. */
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold leading-none tracking-tight">{children}</h2>
);

// Today's date as YYYY-MM-DD in the user's LOCAL timezone (not UTC), so the
// date input defaults to the correct day.
const getTodayISO = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ─────────────────────────────────────────────────────────────────────
// Business-model (EB mode) helpers
// ─────────────────────────────────────────────────────────────────────
//   EXTRACT      -> meter-segment split (existing behaviour)
//   APPROX_ROOM  -> (room units x Approximate Room EB Rate)   split by occupancy days
//   APPROX_FLAT  -> (flat units x Approximate Flat EB Rate)   split by occupancy days
//                   + the tenant's AC share (AC units x the same rate)
//   FIXED_ROOM   -> (Fixed Room EB Amount)                    split by occupancy days
//   FIXED_FLAT   -> (Fixed Flat EB Amount)                    split by occupancy days
type EbMode = "EXTRACT" | "APPROX_ROOM" | "APPROX_FLAT" | "FIXED_ROOM" | "FIXED_FLAT";

const EB_MODE_SHORT: Record<EbMode, string> = {
  EXTRACT: "",
  APPROX_ROOM: "Approx. Room",
  APPROX_FLAT: "Approx. Flat",
  FIXED_ROOM: "Fixed Room",
  FIXED_FLAT: "Fixed Flat",
};

interface BusinessModelLite {
  propertyType?: string | null;
  roomEbMode?: string | null;
  flatEbMode?: string | null;
  roomApproximateEbRate?: number | null;
  roomFixedEbAmount?: number | null;
  flatApproximateEbRate?: number | null;
  flatFixedEbAmount?: number | null;
  // Legacy column: the old "Approximate flat amount". Treated as a FIXED flat amount.
  flatApproximateEbAmount?: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Parse "YYYY-MM-DD" (or an ISO string) as LOCAL midnight.
const parseLocalDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Days a tenant occupied within [monthStart, monthEnd]. Same convention as
 * the backend's occupancyDays():
 *  - already there on the 1st (check-in on/before the 1st, or unknown)
 *      -> counted from the 1st, inclusive                 (Aug 1  -> 31)
 *  - checked in mid-month -> check-in day itself NOT counted
 *                                                         (Aug 10 -> 21)
 *  - a check-out inside the month IS counted (inclusive end).
 */
const occupancyDaysInMonth = (
  checkIn: Date | null,
  checkOut: Date | null,
  monthStart: Date,
  monthEnd: Date
): number => {
  const alreadyThereOnFirst = !checkIn || checkIn.getTime() <= monthStart.getTime();
  const start = alreadyThereOnFirst ? monthStart : (checkIn as Date);
  const end =
    checkOut && checkOut.getTime() < monthEnd.getTime() ? checkOut : monthEnd;

  if (end.getTime() < start.getTime()) return 0;

  const days =
    Math.round((end.getTime() - start.getTime()) / DAY_MS) +
    (alreadyThereOnFirst ? 1 : 0);
  return Math.max(days, 0);
};

function splitPending(r: Rent): { rentPending: number; ebPending: number } {
  // Rent Due Model: the due amount for overdue days (₹0 under NO_DUE) is part
  // of what the tenant owes for the rent, so it is settled with the rent side
  // — payments cover rent + due first, then EB (same order as before).
  const rentAmt = (r.rentAmount ?? 0) + (r.dueAmount ?? 0);
  const ebAmt   = r.ebAmount   ?? 0;
  const paid    = r.paidAmount ?? 0;

  if (r.paymentStatus === "PAID") {
    return { rentPending: 0, ebPending: 0 };
  }

  if (r.paymentStatus === "PENDING") {
    return { rentPending: rentAmt, ebPending: ebAmt };
  }

  const rentPending = Math.max(rentAmt - paid, 0);
  const rentCovered = Math.min(paid, rentAmt);
  const ebPending   = Math.max(ebAmt - Math.max(paid - rentCovered, 0), 0);

  return { rentPending, ebPending };
}

interface PendingRentDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  room: Room | null;
  pendingRents: Rent[];
  advancePaid: number;
  maintenanceCharge: number;
}

const statusMeta: Record<
  string,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline" }
> = {
  PAID:    { label: "Paid",    variant: "default" },
  PARTIAL: { label: "Partial", variant: "secondary" },
  PENDING: { label: "Unpaid",  variant: "destructive" },
};

const PendingRentDialog = ({
  open,
  onClose,
  tenant,
  room,
  pendingRents,
  advancePaid,
  maintenanceCharge,
}: PendingRentDialogProps) => {
  if (!tenant) return null;

  const totalRentDue = pendingRents.reduce(
    (sum, r) => sum + splitPending(r).rentPending,
    0
  );

  const totalEBDue = pendingRents.reduce(
    (sum, r) => sum + splitPending(r).ebPending,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden rounded-3xl p-0">
        {/* The scroller carries its OWN max-height, so it scrolls whether the
            dialog shell lays out as flex or grid (the shell's `grid` class can
            beat `flex` and then flex-1 / min-h-0 never constrain the child). */}
        <div className="pr-scroll max-h-[85vh] overflow-y-auto overscroll-contain p-6 space-y-4">
        <style>{`
          .pr-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
          .pr-scroll::-webkit-scrollbar { width: 6px; }
          .pr-scroll::-webkit-scrollbar-track { background: transparent; margin: 14px 0; }
          .pr-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
          .pr-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
        <DialogHeader>
          <DialogTitle>Pending Rent Records</DialogTitle>
        </DialogHeader>

        <div className="bg-muted rounded-2xl px-4 py-3 text-sm space-y-1 mb-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Name</span>
            <span className="font-medium">{tenant.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Phone</span>
            <span className="font-medium">{tenant.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Room</span>
            <span className="font-medium">{room?.roomNumber ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Check-in</span>
            <span className="font-medium">{tenant.checkInDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Total Records</span>
            <span className="font-medium">{pendingRents.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {pendingRents.length === 0 ? (
            <p className="text-sm text-center text-slate-600 py-6">
              No pending rent records
            </p>
          ) : (
            pendingRents.map((rent) => {
              const meta = statusMeta[rent.paymentStatus] ?? statusMeta["PENDING"];
              const monthLabel =
                MONTHS[(rent.rentMonth ?? 1) - 1] ?? `Month ${rent.rentMonth}`;
              const { rentPending, ebPending } = splitPending(rent);

              return (
                <div
                  key={rent.id}
                  className="border rounded-2xl px-4 py-3 text-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {monthLabel} {rent.rentYear}
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>Monthly Rent</span>
                    <span className="text-right font-medium text-foreground">
                      ₹{(rent.rentAmount ?? 0).toLocaleString()}
                    </span>

                    <span>EB Amount</span>
                    <span className="text-right font-medium text-foreground">
                      ₹{Math.round(rent.ebAmount ?? 0).toLocaleString()}
                    </span>

                    {(rent.dueAmount ?? 0) > 0 && (
                      <>
                        <span>
                          Due Amount ({rent.dueDays ?? 0} day{(rent.dueDays ?? 0) === 1 ? "" : "s"})
                        </span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(rent.dueAmount ?? 0).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentStatus === "PARTIAL" && (
                      <>
                        <span>Amount Paid</span>
                        <span className="text-right font-medium text-green-700">
                          ₹{(rent.paidAmount ?? 0).toLocaleString()}
                        </span>
                        <span>Rent Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(rentPending).toLocaleString()}
                        </span>
                        <span>EB Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{Math.round(ebPending).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentStatus === "PENDING" && (
                      <>
                        <span>Total Pending</span>
                        <span className="text-right font-medium text-destructive">
                          ₹{(
                            (rent.rentAmount ?? 0) + (rent.ebAmount ?? 0) + (rent.dueAmount ?? 0)
                          ).toLocaleString()}
                        </span>
                      </>
                    )}

                    {rent.paymentDate && (
                      <>
                        <span>Due Date</span>
                        <span className="text-right font-medium text-foreground">
                          {rent.paymentDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {pendingRents.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Rent Due</span>
                <span className="font-medium">
                  ₹{Math.round(totalRentDue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total EB Due</span>
                <span className="font-medium">
                  ₹{Math.round(totalEBDue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Maintenance</span>
                <span className="font-medium">
                  ₹{maintenanceCharge.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Advance Paid</span>
                <span className="font-medium text-green-700">
                  ₹{advancePaid.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>
                  {totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
                    ? "Total Due"
                    : "Refund Due"}
                </span>
                <span
                  className={
                    totalRentDue + totalEBDue + maintenanceCharge - advancePaid > 0
                      ? "text-destructive"
                      : "text-green-700"
                  }
                >
                  ₹{Math.round(
                    Math.abs(totalRentDue + totalEBDue + maintenanceCharge - advancePaid)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
};



const CheckoutPage = () => {
  const [rooms, setRooms]                         = useState<Room[]>([]);
  const [tenants, setTenants]                     = useState<Tenant[]>([]);
  const [allTenants, setAllTenants]                = useState<Tenant[]>([]);
  const [branches, setBranches]                   = useState<Branch[]>([]);
  const [selectedTenantId, setSelectedTenantId]   = useState<string>("");
  // Defaults to today; the user can edit it from the "Check-Out Date" card.
  const [checkOutDate, setCheckOutDate]           = useState<string>(getTodayISO());
  const [search, setSearch]                       = useState<string>("");
  const [confirmOpen, setConfirmOpen]             = useState<boolean>(false);
  const [pendingRentDialogOpen, setPendingRentDialogOpen] = useState(false);
  const [finalPrev, setFinalPrev]                 = useState<string>("");
  const [finalCurr, setFinalCurr]                 = useState<string>("");
  const [tenantEBDue, setTenantEBDue]             = useState<number>(0);
  const [extraDays, setExtraDays]                 = useState<string>("");
  // true once the user has typed their own value; until then the field
  // follows the days used in the check-out month automatically.
  const [extraDaysEdited, setExtraDaysEdited]   = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch]       = useState(
    getUserRole() === "ADMIN" ? "all" : String(getBranchId() ?? "all")
  );
  // AC sub-meter readings (only used when the tenant's room is an AC room).
  const [acPrev, setAcPrev]                       = useState<string>("");
  const [acCurr, setAcCurr]                       = useState<string>("");
  const [useManualRent, setUseManualRent]         = useState(false);
  const [rentPerDay, setRentPerDay]               = useState<string>("");
  const [ebRate, setEbRate]                       = useState<string>(String(DEFAULT_EB_RATE || 13));
  // Per-checkout override of the hostel's Approximate (Room / Flat) EB Rate.
  // null = use the rate from the business model.
  const [approxRateOverride, setApproxRateOverride] = useState<string | null>(null);
  // Per-checkout override of the hostel's Fixed (Room / Flat) EB Amount.
  // null = use the amount from the business model.
  const [fixedOverride, setFixedOverride]         = useState<string | null>(null);
  const [maintenanceCharge, setMaintenanceCharge] = useState<number>(1000);
  const [overrideNoticePeriod, setOverrideNoticePeriod] = useState<boolean>(false);
  const [meterScope, setMeterScope]               = useState<"room" | "flat">("flat");

  // The hostel's Business Model (EB mode selector). null = not configured or
  // not loadable -> Extract mode.
  const [businessModel, setBusinessModel]         = useState<BusinessModelLite | null>(null);
  // Why the business model could not be applied (shown to the user instead of
  // silently falling back to Extract).
  const [businessModelNote, setBusinessModelNote] = useState<string | null>(null);

  // Every EB reading fetched for the currently-selected tenant's checkout
  // flow. Kept around so calculateProportionalEBShare can look up each
  // roommate's own last billed reading.
  const [ebReadingsAll, setEbReadingsAll]         = useState<EBReading[]>([]);
  const [summary, setSummary] = useState<{
    pendingRents: Rent[];
    totalRentDue: number;
    advancePaid: number;
  } | null>(null);

  const role     = getUserRole();
  const branchId = getBranchId();
  const isAdmin  = role === "ADMIN";

  const reload = async () => {
    try {
      const [roomList, allTenantList, allBranches] = await Promise.all([
        fetchAllPages<Room>(getRooms, 10),
        fetchAllPages<Tenant>(getTenants, 10),
        fetchAllPages<Branch>(getBranches, 10),
      ]);

      const activeTenants = allTenantList.filter((t) => t.status === "Active");

      setAllTenants(allTenantList);

      const filteredRooms =
        role === "ADMIN"
          ? roomList
          : roomList.filter(
              (room) => String(room.unitId) === String(branchId)
            );

      const filteredTenants =
        role === "ADMIN"
          ? activeTenants
          : activeTenants.filter((tenant) =>
              filteredRooms.some(
                (room) => String(room.id) === String(tenant.roomId)
              )
            );

      const filteredBranches =
        role === "ADMIN"
          ? allBranches
          : allBranches.filter((b) => String(b.id) === String(branchId));

      setRooms(filteredRooms);
      setTenants(filteredTenants);
      setBranches(filteredBranches);
    } catch (err) {
      console.error("Reload error:", err);
      toast.error("Failed to load rooms or tenants");
    }
  };

  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, []);

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        name: b.unitName || `Branch ${b.id}`,
      })),
    [branches]
  );

  const ownBranchName = useMemo(() => {
    if (isAdmin) return null;
    return (
      branchOptions.find((b) => String(b.id) === String(branchId))?.name ??
      (branchId ? `Branch ${branchId}` : "—")
    );
  }, [isAdmin, branchOptions, branchId]);

  // The Business Model is configured per HOSTEL, not per branch/unit, so the
  // lookup key must be the hostel id. Resolution order:
  //   1. the room's branch (unit) -> its hostelId
  //   2. the tenant's own hostelId
  //   3. the logged-in user's hostelId (saved in session at login)
  const resolveHostelId = (room: Room | undefined, tenant: Tenant): number | null => {
    const fromBranch = branches.find(
      (b) => Number(b.id) === Number(room?.unitId)
    )?.hostelId;

    const raw =
      fromBranch ?? tenant.hostelId ?? sessionStorage.getItem("hostelId");
    if (raw == null || raw === "") return null;

    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // ───────────────────────────────────────────────────────────────────
  // AC PREVIOUS READING for a room.
  //
  // Same rule the EB Readings page uses for its AC "Previous" box
  // (getRoomStartingACReading):
  //   1. the AC current reading of the room's latest GENUINE EB entry
  //      (isCheckout !== true, highest id), then
  //   2. never lower than the AC floor for this room (see below), then
  //   3. with no readings at all, fall back to the earliest AC join
  //      reading among the room's MONTHLY tenants, then the tenant's own.
  // AC readings are per ROOM even inside a shared-meter flat.
  //
  // FIX (AC Previous jumped 20 -> 60 for roommates of a different room):
  // a flat checkout writes a copy of the checkout row onto EVERY room of
  // the flat (the main meter is shared), and those sibling copies used to
  // carry the checked-out tenant's AC value (Anbu: 50 -> 60 in
  // W1-ROOM-1). The old floor was the maximum acCurrentReading over every
  // row of the room, checkout rows included, so W1-ROOM-2 (AC 20) read 60.
  //
  // Now a CHECKOUT row only counts for this room's AC meter when a tenant
  // of THIS room provably owns it (tenantId belongs to a tenant of this
  // room). Genuine EB-page rows always count. The room's own tenants'
  // acCheckoutReading values are an additional, trustworthy floor. This
  // also protects against sibling rows saved before the backend fix.
  // ───────────────────────────────────────────────────────────────────
  const computeAcPrevious = (
    roomId: number,
    selected: Tenant,
    readings: EBReading[],
    everyTenant: Tenant[]
  ): number => {
    const roomRows = readings.filter(
      (r) => r.roomId != null && Number(r.roomId) === Number(roomId)
    );

    const roomMonthly = everyTenant.filter(
      (t) => Number(t.roomId) === Number(roomId) && t.tenantStay !== "DAILY"
    );
    const roomTenantIds = new Set(roomMonthly.map((t) => Number(t.id)));

    const rowCountsForAc = (r: any) => {
      if (r.isCheckout !== true) return true;
      if (r.tenantId == null) return false;
      return roomTenantIds.has(Number(r.tenantId));
    };

    const rowAcFloor = roomRows
      .filter(rowCountsForAc)
      .reduce((m, r) => Math.max(m, Number(r.acCurrentReading ?? 0)), 0);

    // This room's own tenants' AC checkout readings.
    const tenantAcFloor = roomMonthly.reduce((m, t) => {
      const co = Number((t as any).acCheckoutReading);
      const join = Number((t as any).acJoinReading);
      if (!Number.isFinite(co) || co <= 0) return m;
      if (Number.isFinite(join) && join > 0 && co <= join) return m;
      return Math.max(m, co);
    }, 0);

    const acFloor = Math.max(rowAcFloor, tenantAcFloor);

    const genuine = roomRows.filter((r: any) => r.isCheckout !== true);
    if (genuine.length > 0) {
      const latest = genuine.reduce((a, b) =>
        Number(b.id ?? 0) > Number(a.id ?? 0) ? b : a
      );
      return Math.max(Number(latest.acCurrentReading ?? 0), acFloor);
    }

    const joins = roomMonthly
      .map((t) => Number((t as any).acJoinReading))
      .filter((v) => Number.isFinite(v) && v > 0);

    const joinFloor =
      joins.length > 0
        ? Math.min(...joins)
        : Number((selected as any).acJoinReading ?? 0) || 0;

    return Math.max(joinFloor, acFloor);
  };



  const handleSelectTenant = async (tenantId: string) => {
    try {
      setSelectedTenantId(tenantId);
      setSummary({ pendingRents: [], totalRentDue: 0, advancePaid: 0 });
      setTenantEBDue(0);
      setAcPrev("");
      setAcCurr("");
      setFinalPrev("");
      setFinalCurr("");
      setExtraDays("");
      setExtraDaysEdited(false);
      setOverrideNoticePeriod(false);
      setMeterScope("flat");
      setCheckOutDate(getTodayISO());
      setBusinessModel(null);
      setBusinessModelNote(null);
      setApproxRateOverride(null);
      setFixedOverride(null);

      const numericTenantId = Number(tenantId);
      const selected = tenants.find((t) => Number(t.id) === numericTenantId);
      if (!selected) return;

      setMaintenanceCharge(selected.tenantStay === "DAILY" ? 0 : 1000);

      const room   = rooms.find((r) => Number(r.id) === Number(selected.roomId));
      const isAcRoom = room?.hostelType === "AC";

      // Load the hostel's Business Model so this page follows the same
      // Extract / Approximate / Fixed mode the backend bills with.
      const hostelIdForModel = resolveHostelId(room, selected);
      if (hostelIdForModel == null) {
        setBusinessModel(null);
        setBusinessModelNote("Hostel could not be determined — using Extract mode.");
      } else {
        try {
          const bm = await getBusinessModel(hostelIdForModel);
          setBusinessModel((bm as BusinessModelLite) ?? null);
        } catch (bmErr: any) {
          const status = bmErr?.response?.status;
          console.warn("Business model not available, using Extract mode:", bmErr);
          setBusinessModel(null);
          if (status === 404) {
            // No model configured for this hostel yet -> plain Extract, no warning.
            setBusinessModelNote(null);
          } else if (status === 403) {
            setBusinessModelNote(
              "No access to this hostel's business model — using Extract mode."
            );
          } else {
            setBusinessModelNote(
              `Business model could not be loaded (${status ?? "network error"}) — using Extract mode.`
            );
          }
        }
      }

      const allReadings = await fetchAllPages<EBReading>(getEBReadings, 10);
      setEbReadingsAll(allReadings);

      if (isAcRoom) {
        // AC units stay per-room even inside a shared-meter flat, so this
        // is unaffected by the flat-vs-room split below.
        setAcPrev(
          String(
            computeAcPrevious(Number(selected.roomId), selected, allReadings, allTenants)
          )
        );
      }

      const joinReading = Number(selected.joinReading ?? 0);

      // A flat's EB meter is ONE physical meter shared by every room in
      // that flat, not one meter per room. "Previous" for a room that
      // belongs to a flat is the flat's own latest known meter value.
      if (room?.flatId != null) {
        const flatReadings = allReadings.filter(
          (r) => Number(r.flatId) === Number(room.flatId)
        );
        const roomIdsInFlat = new Set(
          rooms.filter((r) => Number(r.flatId) === Number(room.flatId)).map((r) => r.id)
        );
        const flatAllTenants = allTenants.filter(
          (t) => roomIdsInFlat.has(Number(t.roomId))
        );

        // Bulk entries (Add EB Reading page) settle every active tenant's
        // share in one shot — the latest one is a genuine "everyone is paid
        // up to here" floor.
        const bulkReadings = flatReadings.filter(
          (r: any) => r.isCheckout === false
        );

        let flatPrevious: number;
        if (bulkReadings.length > 0) {
          const highestBulk = Math.max(
            ...bulkReadings.map((r) => Number(r.currentReading ?? 0))
          );
          const activeFlatTenants = flatAllTenants.filter(
            (t) => String(t.status).toLowerCase() === "active"
          );
          const highestActiveJoin = activeFlatTenants.length > 0
            ? Math.max(...activeFlatTenants.map((t) => Number(t.joinReading ?? 0)))
            : 0;
          flatPrevious = Math.max(highestBulk, highestActiveJoin);
        } else if (flatReadings.length > 0) {
          flatPrevious = Math.min(
            ...flatReadings.map((r) => Number(r.previousReading ?? 0)),
            joinReading
          );
        } else if (flatAllTenants.length > 0) {
          const validFlatJoinReadings = flatAllTenants
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          flatPrevious = validFlatJoinReadings.length > 0
            ? Math.min(...validFlatJoinReadings, joinReading)
            : joinReading;
        } else {
          flatPrevious = joinReading;
        }

        setFinalPrev(String(flatPrevious));
      } else {
        const roomTenantsAll = allTenants.filter(
          (t) => Number(t.roomId) === Number(selected.roomId)
        );

        const roomReadingsForThisRoom = allReadings.filter(
          (r) => Number(r.roomId) === Number(selected.roomId)
        );

        const bulkRoomReadings = roomReadingsForThisRoom.filter(
          (r: any) => r.isCheckout === false
        );

        let roomPrevious: number;

        if (bulkRoomReadings.length > 0) {
          const highestBulk = Math.max(
            ...bulkRoomReadings.map((r) => Number(r.currentReading ?? 0))
          );
          const activeRoomTenants = roomTenantsAll.filter(
            (t) => String(t.status).toLowerCase() === "active"
          );
          const highestActiveJoin = activeRoomTenants.length > 0
            ? Math.max(...activeRoomTenants.map((t) => Number(t.joinReading ?? 0)))
            : 0;
          roomPrevious = Math.max(highestBulk, highestActiveJoin);
        } else if (roomReadingsForThisRoom.length > 0) {
          const validRoomJoinReadingsA = roomTenantsAll
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          roomPrevious = Math.min(
            ...roomReadingsForThisRoom.map((r) => Number(r.previousReading ?? 0)),
            ...(validRoomJoinReadingsA.length > 0 ? validRoomJoinReadingsA : [joinReading]),
            joinReading
          );
        } else if (roomTenantsAll.length > 0) {
          const validRoomJoinReadingsB = roomTenantsAll
            .filter((t) => t.tenantStay !== "DAILY")
            .map((t) => Number(t.joinReading))
            .filter((v) => Number.isFinite(v) && v > 0);

          roomPrevious = validRoomJoinReadingsB.length > 0
            ? Math.min(...validRoomJoinReadingsB, joinReading)
            : joinReading;
        } else {
          roomPrevious = joinReading;
        }

        setFinalPrev(String(roomPrevious));
      }

      const roomOwnReadings = allReadings.filter(
        (r) => Number(r.roomId) === Number(selected.roomId)
      );
      const flatReadings = room?.flatId
        ? allReadings.filter((r) => Number(r.flatId) === Number(room.flatId))
        : [];

      const usingFlatLevelReadings = !!room?.flatId;
      const relevantReadings = usingFlatLevelReadings
        ? (flatReadings.length > 0 ? flatReadings : roomOwnReadings)
        : roomOwnReadings;

      if (relevantReadings.length > 0) {
        setMeterScope(usingFlatLevelReadings ? "flat" : "room");
      }

      const checkout = await getCheckoutSummary(numericTenantId);

      const rents       = checkout?.pendingRents ?? [];
      const unpaidRents = rents.filter((r) => r.paymentStatus !== "PAID");

      const totalRentDue = unpaidRents.reduce(
        (sum, r) => sum + splitPending(r).rentPending,
        0
      );
      const totalEBDue = unpaidRents.reduce(
        (sum, r) => sum + splitPending(r).ebPending,
        0
      );

      setSummary({
        pendingRents: unpaidRents,
        totalRentDue,
        advancePaid: checkout?.advancePaid ?? selected.advance ?? 0,
      });

      setTenantEBDue(totalEBDue);
    } catch (error) {
      console.error("Checkout fetch error:", error);
      toast.error("Failed to fetch checkout data");
      const selected = tenants.find((t) => Number(t.id) === Number(tenantId));
      setSummary({
        pendingRents: [],
        totalRentDue: 0,
        advancePaid: selected?.advance ?? 0,
      });
    }
  };



  const selectedTenant = tenants.find(
    (t) => Number(t.id) === Number(selectedTenantId)
  );


  const selectedRoom = selectedTenant
    ? rooms.find((r) => Number(r.id) === Number(selectedTenant.roomId))
    : null;

  const registrationFees = Number(selectedTenant?.registrationFees ?? 0);

  // The Pending Amount entered on the tenant at check-in (Add / Edit Tenant).
  // It is still owed by the tenant, so it is added to the amount payable.
  const tenantPendingAmount = Number(selectedTenant?.pendingAmount ?? 0);

  const isDailyStay = selectedTenant?.tenantStay === "DAILY";

  const advanceEbCollected = isDailyStay
    ? Number(selectedTenant?.ebAmount ?? 0)
    : 0;

  const dailyStayTotal = isDailyStay
    ? Number(selectedTenant?.totalAmount ?? 0)
    : 0;


  const flatTenants = selectedRoom?.flatId
    ? allTenants.filter((t) => {
        const tenantRoom = rooms.find(
          (r) => Number(r.id) === Number(t.roomId)
        );
        return (
          tenantRoom &&
          Number(tenantRoom.flatId) === Number(selectedRoom.flatId)
        );
      })
    : [];

  const roomOnlyTenants = allTenants.filter(
    (t) => Number(t.roomId) === Number(selectedTenant?.roomId)
  );

  const roomTenants =
    meterScope === "room"
      ? roomOnlyTenants
      : flatTenants.length > 0
        ? flatTenants
        : roomOnlyTenants;

  const isAcRoom = selectedRoom?.hostelType === "AC";

  // AC sub-meter figures shown under the main reading for AC rooms.
  const hasAcReading =
    isAcRoom && acCurr !== "" && Number(acCurr) >= Number(acPrev || 0);
  const acUnits = hasAcReading ? Number(acCurr) - Number(acPrev || 0) : 0;
  const acInvalid =
    isAcRoom && acCurr !== "" && Number(acCurr) < Number(acPrev || 0);

  // ───────────────────────────────────────────────────────────────────
  // Which EB calculation applies to this tenant?
  //   • a room that belongs to a flat  -> flat settings (Flat EB)
  //   • a standalone room              -> room settings (Room EB)
  // Property Type gating: a ROOM hostel never uses its flat settings and a
  // FLAT hostel never uses its room settings, even if a stray value is stored.
  //
  // Per scope the mode is one of:
  //   EXACTLY     -> EXTRACT (meter-segment split)
  //   APPROXIMATE -> units x rate/unit, split by occupancy days
  //   FIXED       -> fixed ₹ amount, split by occupancy days
  // Legacy: a flat APPROXIMATE row that has only a fixed amount (no rate) is FIXED.
  //
  // DAILY-stay tenants never take part in the monthly EB cycle, so they
  // always keep the existing Extract settlement (advance EB netting).
  // ───────────────────────────────────────────────────────────────────
  const propertyType = String(businessModel?.propertyType ?? "").toUpperCase();
  const roomSettingsActive = propertyType !== "FLAT";
  const flatSettingsActive = propertyType !== "ROOM";

  const roomRateBase  = Number(businessModel?.roomApproximateEbRate ?? 0);
  const roomFixedBase = Number(businessModel?.roomFixedEbAmount ?? 0);
  const flatRateBase  = Number(businessModel?.flatApproximateEbRate ?? 0);
  const flatLegacyAmount = Number(businessModel?.flatApproximateEbAmount ?? 0);
  const flatFixedBase =
    Number(businessModel?.flatFixedEbAmount ?? 0) > 0
      ? Number(businessModel?.flatFixedEbAmount)
      : flatLegacyAmount;

  const ebMode: EbMode = (() => {
    if (!selectedTenant || !selectedRoom || isDailyStay || !businessModel) {
      return "EXTRACT";
    }

    if (selectedRoom.flatId != null) {
      if (!flatSettingsActive) return "EXTRACT";
      const mode = String(businessModel.flatEbMode ?? "").toUpperCase();
      if (mode === "FIXED") {
        return flatFixedBase > 0 ? "FIXED_FLAT" : "EXTRACT";
      }
      if (mode === "APPROXIMATE") {
        if (flatRateBase > 0) return "APPROX_FLAT";
        // legacy: amount-only "approximate" flat == fixed flat
        if (flatLegacyAmount > 0) return "FIXED_FLAT";
      }
      return "EXTRACT";
    }

    if (!roomSettingsActive) return "EXTRACT";
    const mode = String(businessModel.roomEbMode ?? "").toUpperCase();
    if (mode === "FIXED") {
      return roomFixedBase > 0 ? "FIXED_ROOM" : "EXTRACT";
    }
    if (mode === "APPROXIMATE" && roomRateBase > 0) return "APPROX_ROOM";
    return "EXTRACT";
  })();

  const isApproximate = ebMode !== "EXTRACT";
  const isFixedMode   = ebMode === "FIXED_ROOM" || ebMode === "FIXED_FLAT";
  const isRateApprox  = ebMode === "APPROX_ROOM" || ebMode === "APPROX_FLAT";
  // Flat modes split across the whole flat; room modes across the room only.
  const isFlatScope   = ebMode === "APPROX_FLAT" || ebMode === "FIXED_FLAT";
  // Mirrors the backend: only Approximate FLAT mode (a) makes every mid-month
  // join a slice boundary and (b) charges the tenant's AC share on top.
  const isApproxFlat  = ebMode === "APPROX_FLAT";

  // The hostel's configured values for the active mode.
  const approxBaseRate = ebMode === "APPROX_FLAT" ? flatRateBase : roomRateBase;
  const fixedBase      = ebMode === "FIXED_FLAT" ? flatFixedBase : roomFixedBase;

  // The Fixed EB amount actually used: the edited value for this check-out if
  // the user typed one, otherwise the hostel's configured Fixed amount.
  const fixedApplied =
    fixedOverride != null
      ? Math.max(Number(fixedOverride) || 0, 0)
      : fixedBase;

  const tenantLastBilledReading = useMemo(() => {
    const map = new Map<number, number>();
    const meterFlatId = selectedRoom?.flatId ?? null;
    const meterRoomId = selectedRoom?.id ?? null;
    if (meterFlatId == null && meterRoomId == null) return map;

    ebReadingsAll.forEach((r: any) => {
      if (r.tenantId == null) return;
      const sameMeter = meterFlatId != null
        ? Number(r.flatId) === Number(meterFlatId)
        : Number(r.roomId) === Number(meterRoomId);
      if (!sameMeter) return;

      const val = Number(r.currentReading ?? 0);
      const key = Number(r.tenantId);
      const prevMax = map.get(key);
      if (prevMax == null || val > prevMax) map.set(key, val);
    });
    return map;
  }, [ebReadingsAll, selectedRoom]);

  // Parse as LOCAL midnight (a bare "YYYY-MM-DD" string would be parsed as
  // UTC and could land on the previous day in some timezones).
  const dateForCalc  = checkOutDate
    ? new Date(`${checkOutDate}T00:00:00`)
    : new Date();
  const daysInMonth  = new Date(
    dateForCalc.getFullYear(),
    dateForCalc.getMonth() + 1,
    0
  ).getDate();

  // Month of the chosen Check-Out Date (e.g. "October") and how many days the
  // tenant has used in it (e.g. check-out 23 Oct, already there on the 1st
  // -> 23 days). Drives the "<Month> Rent Days" field below.
  const usedMonthLabel = MONTHS[dateForCalc.getMonth()] ?? "Month";
  const usedDaysInMonth = selectedTenant
    ? occupancyDaysInMonth(
        parseLocalDate(selectedTenant.checkInDate as any),
        parseLocalDate(checkOutDate) ?? dateForCalc,
        new Date(dateForCalc.getFullYear(), dateForCalc.getMonth(), 1),
        new Date(dateForCalc.getFullYear(), dateForCalc.getMonth() + 1, 0)
      )
    : 0;

  // Keep the field equal to the days used this month until the user edits it.
  useEffect(() => {
    if (!selectedTenant || extraDaysEdited) return;
    setExtraDays(usedDaysInMonth > 0 ? String(usedDaysInMonth) : "");
  }, [selectedTenant?.id, usedDaysInMonth, extraDaysEdited]);

  const effectiveMonthlyRent = useMemo(() => {
    const tenantRent = Number(selectedTenant?.monthlyRent ?? 0);
    if (tenantRent > 0) return tenantRent;

    // The Room entity stores the default rent as `rentPerBed` (there is no
    // `monthlyRent` on a room). Same fallback the Rent page and the backend use.
    const roomRent = Number(
      selectedRoom?.rentPerBed ?? (selectedRoom as any)?.monthlyRent ?? 0
    );
    if (roomRent > 0) return roomRent;

    const roommatePool = roomTenants.length > 0 ? roomTenants : flatTenants;
    const roommateRent = roommatePool
      .map((t) => Number(t.monthlyRent ?? 0))
      .find((r) => r > 0);

    return roommateRent ?? 0;
  }, [selectedTenant, selectedRoom, roomTenants, flatTenants]);

  // A DAILY tenant already has an explicit per-day rate on their record,
  // so "Auto Calculate" for extra days uses that directly.
  const autoRentPerDay = isDailyStay
    ? Number(selectedTenant?.amountPerDay ?? 0)
    : effectiveMonthlyRent / daysInMonth;

  const extraRent =
    selectedTenant && extraDays
      ? useManualRent
        ? Number(extraDays) * Number(rentPerDay || 0)
        : Math.round(autoRentPerDay * Number(extraDays))
      : 0;

  const hasFinalReading =
    !!finalCurr && Number(finalCurr) >= Number(finalPrev || 0);

  const finalEBUnits = hasFinalReading
    ? Number(finalCurr) - Number(finalPrev)
    : 0;

  // ───────────────────────────────────────────────────────────────────
  // APPROXIMATE (rate) units — same meter window the backend bills with.
  //
  // Backend: units for a checked-out tenant = (their checkout reading) minus
  // the MONTH'S window start, where window start = the lowest previousReading
  // among the month's billable readings for that room / flat (and, on the
  // very first billing cycle, lowered to the lowest monthly-tenant join
  // reading). Using finalPrev here instead would disagree with the backend
  // whenever a reading was already saved earlier in the same month.
  //
  // Falls back to finalPrev when the month has no saved reading yet.
  // ───────────────────────────────────────────────────────────────────
  const approxWindowStart = (() => {
    const fallback = Number(finalPrev) || 0;
    if (!isRateApprox || !selectedRoom || !hasFinalReading) return fallback;

    const m = dateForCalc.getMonth() + 1;
    const y = dateForCalc.getFullYear();
    const flatIdForScope = selectedRoom.flatId ?? null;

    const roomIdsInScope = new Set<number>(
      flatIdForScope != null
        ? rooms
            .filter((r) => Number(r.flatId) === Number(flatIdForScope))
            .map((r) => Number(r.id))
        : [Number(selectedRoom.id)]
    );

    // DAILY tenants' informational rows never take part in billing windows.
    const dailyIds = new Set(
      allTenants.filter((t) => t.tenantStay === "DAILY").map((t) => Number(t.id))
    );

    const inScope = (r: EBReading): boolean =>
      flatIdForScope != null
        ? Number(r.flatId) === Number(flatIdForScope) ||
          (r.roomId != null && roomIdsInScope.has(Number(r.roomId)))
        : r.roomId != null && Number(r.roomId) === Number(selectedRoom.id);

    const billable = ebReadingsAll.filter(
      (r) => inScope(r) && !(r.tenantId != null && dailyIds.has(Number(r.tenantId)))
    );

    const thisMonth = billable.filter(
      (r) => Number(r.month) === m && Number(r.year) === y
    );
    if (thisMonth.length === 0) return fallback;

    let start = Math.min(...thisMonth.map((r) => Number(r.previousReading ?? 0)));

    // First billing cycle: no billable reading in any earlier month.
    const firstCycle = !billable.some(
      (r) =>
        Number(r.year) < y || (Number(r.year) === y && Number(r.month) < m)
    );
    if (firstCycle) {
      const end = Number(finalCurr);
      const pool = (flatIdForScope != null ? flatTenants : roomOnlyTenants).filter(
        (t) => t.tenantStay !== "DAILY"
      );
      const joins = pool
        .map((t) => Number(t.joinReading))
        .filter((v) => Number.isFinite(v) && v < end);
      if (joins.length > 0) start = Math.min(start, ...joins);
    }

    return start;
  })();

  const approxUnits =
    hasFinalReading && isRateApprox
      ? Math.max(Number(finalCurr) - approxWindowStart, 0)
      : 0;

  // Units shown as "Total Units": the month window for Approximate modes,
  // the plain Previous -> Current delta otherwise.
  const displayUnits = isRateApprox ? approxUnits : finalEBUnits;

  // In Approximate mode the hostel's Approximate EB Rate (Room or Flat)
  // replaces the manually typed rate (this is also the rate sent to the backend).
  // In Fixed mode there is no per-unit rate, so the typed/default rate is only
  // passed along for the record.
  const overrideRateNum = approxRateOverride != null ? Number(approxRateOverride) : NaN;
  const approxRateApplied =
    Number.isFinite(overrideRateNum) && overrideRateNum > 0
      ? overrideRateNum
      : approxBaseRate;
  const appliedEBRate  = isRateApprox
    ? approxRateApplied
    : Number(ebRate || DEFAULT_EB_RATE || 13);
  const totalEBAmount  = displayUnits * appliedEBRate;

  // ───────────────────────────────────────────────────────────────────
  // NORMAL (main-meter) share — Extract mode.
  //
  // The split runs over the FULL main-meter units (e.g. 100 -> 190 = 90
  // units). AC units are NOT deducted from the main meter first: the AC
  // share is a separate charge that is ADDED on top (see calculateAcShare).
  // ───────────────────────────────────────────────────────────────────
  const calculateProportionalEBShare = (
    tenantId: number | null | undefined,
    prevReading: number,
    currReading: number,
    rate: number,
    occupants: Tenant[]
  ): { share: number; units: number; segments: { units: number; count: number }[] } => {
    if (!tenantId || !(currReading > prevReading) || occupants.length === 0) {
      return { share: 0, units: 0, segments: [] };
    }

    const numericTenantId = Number(tenantId);

    const isPresentInSegment = (
      t: Tenant,
      segStart: number,
      segEnd: number
    ): boolean => {
      const join = Number(t.joinReading);
      if (!Number.isFinite(join) || join > segStart) return false;

      const lastBilled = tenantLastBilledReading.get(Number(t.id));

      if (Number(t.id) === numericTenantId) {
        if (lastBilled != null && segEnd > lastBilled) return false;
        return currReading >= segEnd;
      }

      if (t.status === "Checked_Out") {
        const co = Number(t.checkoutReading);
        if (Number.isFinite(co)) {
          return co >= segEnd;
        }
        if (lastBilled != null) return segEnd <= lastBilled;
        return false;
      }
      if (lastBilled != null && segEnd > lastBilled) return false;
      return true;
    };

    const boundarySet = new Set<number>();
    occupants.forEach((t) => {
      const join = Number(t.joinReading);
      if (Number.isFinite(join) && join > prevReading && join < currReading) {
        boundarySet.add(join);
      }
      if (Number(t.id) !== numericTenantId) {
        const co = Number(t.checkoutReading);
        if (t.status === "Checked_Out" && Number.isFinite(co) && co > prevReading && co < currReading) {
          boundarySet.add(co);
        }
      }
      const lastBilled = tenantLastBilledReading.get(Number(t.id));
      if (lastBilled != null && lastBilled > prevReading && lastBilled < currReading) {
        boundarySet.add(lastBilled);
      }
    });

    const points = [
      prevReading,
      ...Array.from(boundarySet).sort((a, b) => a - b),
      currReading,
    ];

    let share = 0;
    let myUnits = 0;
    const segments: { units: number; count: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      const segUnits = segEnd - segStart;
      if (segUnits <= 0) continue;

      const presentInSegment = occupants.filter((t) =>
        isPresentInSegment(t, segStart, segEnd)
      );

      const presentCount = presentInSegment.length || 1;

      segments.push({ units: segUnits, count: presentCount });

      const tenantPresent = presentInSegment.some(
        (t) => Number(t.id) === numericTenantId
      );

      if (tenantPresent) {
        myUnits += segUnits / presentCount;
        share += (segUnits * rate) / presentCount;
      }
    }

    return { share, units: myUnits, segments };
  };

  // ───────────────────────────────────────────────────────────────────
  // AC share. The room's AC units are shared ONLY by the tenants of that
  // AC room, split by AC-meter segments (acJoinReading / acCheckoutReading).
  // Returns the selected tenant's AC UNITS. This is charged IN ADDITION to
  // the normal main-meter share (Extract mode) or to the flat's Approximate
  // share (Approximate Flat mode, at the same Approximate rate).
  // ───────────────────────────────────────────────────────────────────
  const calculateAcShare = (): {
    units: number;
    segments: { units: number; count: number }[];
  } => {
    if (!isAcRoom || !selectedTenant || !hasAcReading || acUnits <= 0) {
      return { units: 0, segments: [] };
    }

    const acStart = Number(acPrev || 0);
    const acEnd = Number(acCurr);
    const selectedId = Number(selectedTenant.id);

    // Everyone who has lived in this AC room (monthly + daily headcount).
    const occupants = roomOnlyTenants;

    const acCheckoutOf = (t: Tenant): number | null => {
      const v = Number((t as any).acCheckoutReading);
      return Number.isFinite(v) && v > 0 ? v : null;
    };

    const isPresent = (t: Tenant, segStart: number, segEnd: number): boolean => {
      const join = Number((t as any).acJoinReading ?? 0);
      if (Number.isFinite(join) && join > segStart) return false;

      if (Number(t.id) === selectedId) return acEnd >= segEnd;

      if (t.status === "Checked_Out") {
        const co = acCheckoutOf(t);
        return co != null && co >= segEnd;
      }
      return true;
    };

    const pts = new Set<number>([acStart, acEnd]);
    occupants.forEach((t) => {
      const join = Number((t as any).acJoinReading ?? 0);
      if (Number.isFinite(join) && join > acStart && join < acEnd) pts.add(join);
      if (Number(t.id) !== selectedId && t.status === "Checked_Out") {
        const co = acCheckoutOf(t);
        if (co != null && co > acStart && co < acEnd) pts.add(co);
      }
    });
    const sorted = Array.from(pts).sort((a, b) => a - b);

    let units = 0;
    const segments: { units: number; count: number }[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const segStart = sorted[i];
      const segEnd = sorted[i + 1];
      const segUnits = segEnd - segStart;
      if (segUnits <= 0) continue;

      const present = occupants.filter((t) => isPresent(t, segStart, segEnd));
      const count = present.length || 1;
      segments.push({ units: segUnits, count });

      if (present.some((t) => Number(t.id) === selectedId)) {
        units += segUnits / count;
      }
    }

    return { units, segments };
  };

  // ───────────────────────────────────────────────────────────────────
  // Approximate / Fixed (occupancy-days) share — TIME-SLICE rule.
  // Mirrors EBReadingServiceImpl.splitApproximateWithFrozen.
  //
  //  • Every tenant who left on/before this check-out date makes a slice
  //    boundary on their own check-out day (this tenant too).
  //  • APPROX_FLAT ONLY: every tenant who joined mid-month (on or before
  //    this check-out date) also makes a slice boundary on their check-in
  //    day. The cost used before the joiner arrived is settled at that
  //    boundary and the joiner pays none of it.
  //  • Cost settled at a boundary:
  //      APPROX_ROOM / APPROX_FLAT -> (reading at boundary - window start) x rate
  //            (check-out boundary: the leaver's checkout reading;
  //             join boundary:      the joiner's join reading)
  //      FIXED_ROOM  / FIXED_FLAT  -> fixed amount x dayOfMonth / daysInMonth
  //  • Slice cost = cost at this boundary - cost at the previous boundary.
  //    It is shared only by the tenants PRESENT in that slice, in
  //    proportion to the days each was present in the slice.
  //  • A slice with nobody in it carries its cost into the next slice.
  //  • This tenant's share = the sum of his part of every slice up to his
  //    own check-out day. Nothing after that day can change it.
  // Month = the month of the chosen Check-Out Date.
  // ───────────────────────────────────────────────────────────────────
  const calculateApproximateShare = (): {
    share: number;
    total: number;
    myDays: number;
    breakdown: string;
    monthLabel: string;
  } | null => {
    if (!isApproximate || !selectedTenant) return null;

    const checkOut   = parseLocalDate(checkOutDate) ?? new Date();
    const y          = checkOut.getFullYear();
    const m          = checkOut.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd   = new Date(y, m + 1, 0);
    const monthLen   = monthEnd.getDate();
    const monthLabel = `${MONTHS[m] ?? m + 1} ${y}`;
    const selectedId = Number(selectedTenant.id);

    const pool = (isFlatScope ? flatTenants : roomOnlyTenants)
      // DAILY-stay tenants are not part of the monthly EB split.
      .filter((t) => t.tenantStay !== "DAILY");

    // The tenant being checked out is always in the pool.
    const pooled = pool.some((t) => Number(t.id) === selectedId)
      ? pool
      : [...pool, selectedTenant];

    // Same rule as the backend's sanitizedCheckoutReading().
    const validCheckoutReading = (t: Tenant): number | null => {
      const co = Number((t as any).checkoutReading);
      const join = Number(t.joinReading);
      if (!Number.isFinite(co) || co <= 0) return null;
      if (Number.isFinite(join) && join > 0 && co <= join) return null;
      return co;
    };

    const rate = approxRateApplied;

    type Person = {
      isSelected: boolean;
      checkIn: Date | null;
      out: Date | null;            // effective check-out date (null = still there)
      boundaryCost: number | null; // cost settled on their check-out day
      joinDay: number | null;      // day-of-month of a mid-month join boundary
      joinCost: number | null;     // cost settled on that join day
    };

    const people: Person[] = pooled.map((t) => {
      const isSelected = Number(t.id) === selectedId;
      const checkIn = parseLocalDate(t.checkInDate as any);
      const out = isSelected
        ? checkOut
        : t.status === "Checked_Out"
          ? parseLocalDate((t as any).checkOutDate)
          : null;

      let boundaryCost: number | null = null;
      const insideWindow =
        out != null &&
        out.getTime() >= monthStart.getTime() &&
        out.getTime() <= checkOut.getTime();

      if (insideWindow && out) {
        if (isFixedMode) {
          boundaryCost = (fixedApplied * out.getDate()) / monthLen;
        } else if (isSelected) {
          boundaryCost = hasFinalReading ? approxUnits * rate : 0;
        } else {
          const co = validCheckoutReading(t);
          // A leaver with no usable checkout reading is NOT frozen by the
          // backend in rate mode, so it makes no boundary.
          boundaryCost =
            co != null ? Math.max(co - approxWindowStart, 0) * rate : null;
        }
      }

      // Join boundary (APPROX_FLAT only): a tenant who checked in AFTER the
      // 1st of this month and on/before the check-out date. The joiner is
      // not present on the check-in day itself, so the slice that ends on
      // that day is shared only by the people who were already there.
      let joinDay: number | null = null;
      let joinCost: number | null = null;
      if (
        isApproxFlat &&
        hasFinalReading &&
        checkIn != null &&
        checkIn.getTime() > monthStart.getTime() &&
        checkIn.getTime() <= checkOut.getTime()
      ) {
        const jr = Number(t.joinReading);
        if (Number.isFinite(jr) && jr > 0) {
          joinDay = checkIn.getDate();
          joinCost = Math.max(jr - approxWindowStart, 0) * rate;
        }
      }

      return { isSelected, checkIn, out, boundaryCost, joinDay, joinCost };
    });

    const total = isFixedMode
      ? fixedApplied
      : hasFinalReading
        ? approxUnits * rate
        : 0;

    const myDays = occupancyDaysInMonth(
      parseLocalDate(selectedTenant.checkInDate as any),
      checkOut,
      monthStart,
      monthEnd
    );

    if (!isFixedMode && !hasFinalReading) {
      return { share: 0, total, myDays, breakdown: "", monthLabel };
    }

    // Was this person counted as present on day-of-month `day`?
    // Check-in day NOT counted (unless already there on the 1st);
    // check-out day IS counted.
    const presentOn = (p: Person, day: number): boolean => {
      const d = new Date(y, m, day).getTime();
      const alreadyThere = !p.checkIn || p.checkIn.getTime() <= monthStart.getTime();
      const there = alreadyThere || (p.checkIn as Date).getTime() < d;
      if (!there) return false;
      return !p.out || d <= p.out.getTime();
    };

    // Boundaries: day -> cost settled by then (max if several land on the
    // same day). Check-out days always; join days in APPROX_FLAT only.
    const cumAt = new Map<number, number>();
    people.forEach((p) => {
      if (p.out && p.boundaryCost != null) {
        const day = p.out.getDate();
        cumAt.set(day, Math.max(cumAt.get(day) ?? 0, p.boundaryCost));
      }
      if (p.joinDay != null && p.joinCost != null) {
        cumAt.set(p.joinDay, Math.max(cumAt.get(p.joinDay) ?? 0, p.joinCost));
      }
    });
    const boundaryDays = Array.from(cumAt.keys()).sort((a, b) => a - b);
    const selectedIdx = people.findIndex((p) => p.isSelected);

    let share = 0;
    let carry = 0;
    let fromDay = 1;
    let prevCum = 0;
    const parts: string[] = [];

    boundaryDays.forEach((toDay) => {
      const cum = Math.max(cumAt.get(toDay) ?? 0, prevCum);   // never goes backwards
      const cost = cum - prevCum + carry;

      const days = people.map((p) => {
        let n = 0;
        for (let d = fromDay; d <= toDay; d++) if (presentOn(p, d)) n++;
        return n;
      });
      const sum = days.reduce((a, b) => a + b, 0);

      if (cost > 0 && sum > 0) {
        const mine = days[selectedIdx];
        if (mine > 0) {
          share += (cost * mine) / sum;
          parts.push(`₹${Math.round(cost).toLocaleString()}×${mine}/${sum}`);
        }
        carry = 0;
      } else {
        carry = cost > 0 ? cost : 0;   // vacant slice -> carry forward
      }

      fromDay = toDay + 1;
      prevCum = cum;
    });

    return { share, total, myDays, breakdown: parts.join(" + "), monthLabel };
  };

  const approx = calculateApproximateShare();

  const {
    share: extractShare,
    units: extractUnits,
    segments: extractSegments,
  } = calculateProportionalEBShare(
    selectedTenant ? Number(selectedTenant.id) : null,
    Number(finalPrev) || 0,
    Number(finalCurr) || 0,
    appliedEBRate,
    roomTenants
  );

  // AC part (AC rooms only): the tenant's AC units x rate — ADDED on top of
  // the normal share (Extract) or the flat's Approximate share (APPROX_FLAT),
  // never deducted from the main-meter units. Approximate Room and both Fixed
  // modes do not charge AC separately (same as the backend).
  const acApplies = !approx || isApproxFlat;
  const acShare = acApplies ? calculateAcShare() : { units: 0, segments: [] };
  const acShareAmount = acShare.units * appliedEBRate;

  // The tenant's EB share for this checkout, whichever mode applies.
  // Extract        = normal share (full main-meter segments) + AC share.
  // Approx. Flat   = occupancy-slice share of the flat's units + AC share.
  // Other approx   = occupancy-slice share only.
  const finalEBAmount = approx
    ? approx.share + (isApproxFlat ? acShareAmount : 0)
    : extractShare + acShareAmount;
  // Total billed units for this tenant (normal + AC), Extract mode only.
  const finalEBBilledUnits = approx ? 0 : extractUnits + acShare.units;
  // Meter-segment breakdown only makes sense in Extract mode.
  const ebSegments = approx ? [] : extractSegments;
  const acSegments = acApplies ? acShare.segments : [];

  const ebPayableAfterAdvance = isDailyStay
    ? (hasFinalReading ? finalEBAmount - advanceEbCollected : 0)
    : finalEBAmount;

  // The tenant's Pending Amount (entered at check-in) is added on top of
  // everything else that is owed at check-out.
  const calculatedNetPayable = summary
    ? summary.totalRentDue +
      tenantEBDue +
      ebPayableAfterAdvance +
      maintenanceCharge +
      extraRent +
      tenantPendingAmount -
      summary.advancePaid
    : maintenanceCharge + tenantPendingAmount;

  const handleConfirmCheckout = async () => {
    if (!selectedTenant) {
      toast.error("Select tenant");
      return;
    }
    if (!checkOutDate) {
      toast.error("Check-Out Date is required");
      return;
    }
    if (
      selectedTenant.checkInDate &&
      checkOutDate < String(selectedTenant.checkInDate).slice(0, 10)
    ) {
      toast.error("Check-Out Date cannot be before the Check-in Date");
      return;
    }
    if (isAcRoom && acCurr === "") {
      toast.error("AC Current Reading is required for AC room");
      return;
    }
    if (isAcRoom && Number(acCurr) < Number(acPrev || 0)) {
      toast.error("AC Current Reading cannot be less than AC Previous Reading");
      return;
    }
    if (!finalCurr) {
      toast.error("Final EB Current Reading is required");
      return;
    }

    try {
      if (!selectedTenant.id) throw new Error("Selected tenant has no valid ID");

      const ebAmountCharged = finalEBAmount;

      await checkoutTenant(
        selectedTenant.id,
        finalCurr ? Number(finalCurr) : null,
        isAcRoom && acCurr !== "" ? Number(acCurr) : null,
        overrideNoticePeriod,
        appliedEBRate,
        ebAmountCharged,
        checkOutDate
      );

      if (selectedTenant.bedId) {
        await updateBedStatus(Number(selectedTenant.bedId), false);
      }

      toast.success(`${selectedTenant.name} checked out successfully`);

      setSelectedTenantId("");
      setCheckOutDate(getTodayISO());
      setFinalPrev("");
      setFinalCurr("");
      setAcPrev("");
      setAcCurr("");
      setSummary(null);
      setConfirmOpen(false);
      setExtraDays("");
      setExtraDaysEdited(false);
      setRentPerDay("");
      setUseManualRent(false);
      setOverrideNoticePeriod(false);
      setBusinessModel(null);
      setBusinessModelNote(null);
      setApproxRateOverride(null);
      setFixedOverride(null);

      await reload();
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message ?? "Checkout failed");
    }
  };

  const filteredTenants = tenants
    .filter(
      (t) =>
        (t.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.phone ?? "").includes(search)
    )
    .filter((t) => {
      if (selectedBranch === "all") return true;
      const room = rooms.find((r) => String(r.id) === String(t.roomId));
      return room && String(room.unitId) === selectedBranch;
    });

  const ebModeLabel =
    ebMode === "APPROX_ROOM"
      ? `Approximate Room · ₹${approxRateApplied}/unit, split by occupancy days`
      : ebMode === "APPROX_FLAT"
        ? `Approximate Flat · ₹${approxRateApplied}/unit, split by occupancy days${isAcRoom ? " + AC share" : ""}`
        : ebMode === "FIXED_ROOM"
          ? `Fixed Room · ₹${fixedApplied.toLocaleString()}, split by occupancy days`
          : ebMode === "FIXED_FLAT"
            ? `Fixed Flat · ₹${fixedApplied.toLocaleString()}, split by occupancy days`
            : "Extract · exact meter units, split by meter segments";

  // Label / helper text / current value of the editable EB input, by mode.
  const ebInputLabel =
    ebMode === "FIXED_FLAT"
      ? "Fixed Flat EB Amount (₹)"
      : ebMode === "FIXED_ROOM"
        ? "Fixed Room EB Amount (₹)"
        : "EB Rate Per Unit";

  const ebInputValue = isFixedMode
    ? (fixedOverride ?? String(fixedBase))
    : isRateApprox
      ? (approxRateOverride ?? String(approxBaseRate))
      : ebRate;

  const ebInputHint =
    ebMode === "APPROX_ROOM"
      ? `Defaults to the hostel's Approximate Room EB Rate (₹${approxBaseRate}/unit). You can change it for this check-out.`
      : ebMode === "APPROX_FLAT"
        ? `Defaults to the hostel's Approximate Flat EB Rate (₹${approxBaseRate}/unit). You can change it for this check-out.`
        : ebMode === "FIXED_ROOM"
          ? `Defaults to the hostel's Fixed Room EB Amount (₹${fixedBase.toLocaleString()}). You can change it for this check-out.`
          : ebMode === "FIXED_FLAT"
            ? `Defaults to the hostel's Fixed Flat EB Amount (₹${fixedBase.toLocaleString()}). You can change it for this check-out.`
            : "Default Rate: ₹13 per unit";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tenant Check-Out</h1>
        {/* text-muted-foreground failed contrast (Lighthouse); slate-600 passes AA. */}
        <p className="text-sm text-slate-600 mt-1">
          Controlled checkout with settlement summary
        </p>
      </div>

      <PendingRentDialog
        open={pendingRentDialogOpen}
        onClose={() => setPendingRentDialogOpen(false)}
        tenant={selectedTenant ?? null}
        room={selectedRoom ?? null}
        pendingRents={summary?.pendingRents ?? []}
        advancePaid={summary?.advancePaid ?? 0}
        maintenanceCharge={maintenanceCharge}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <SectionTitle>Select Tenant</SectionTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <Select
                  value={selectedBranch}
                  onValueChange={(v) => setSelectedBranch(v)}
                >
                  <SelectTrigger aria-label="Filter by branch" className="mb-3">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branchOptions.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-slate-600 shrink-0" aria-hidden="true" />
                  {ownBranchName}
                </div>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" aria-hidden="true" />
                <Input
                  className="pl-9"
                  aria-label="Search tenant"
                  placeholder="Search Tenant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {filteredTenants.map((t) => {
                  const room = rooms.find(
                    (r) => Number(r.id) === Number(t.roomId)
                  );
                  return (
                    <button
                      key={t.id.toString()}
                      type="button"
                      onClick={() => handleSelectTenant(t.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all border ${
                        Number(selectedTenantId) === Number(t.id)
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-gray-800 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium">
                        {t.name}
                        {t.tenantStay === "DAILY" && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                            Daily
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {room?.roomNumber} · {t.phone}
                      </div>
                    </button>
                  );
                })}
                {filteredTenants.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-4">
                    No active tenants
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedTenant ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-600">
                Select a tenant to proceed with checkout
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle>Tenant Info</SectionTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                  {[
                    ["Name",        selectedTenant.name],
                    [
                      "Flat Number",
                      selectedRoom?.flatName
                        ? selectedRoom.flatName
                        : selectedRoom?.flatId
                          ? `Flat-${selectedRoom.flatId}`
                          : "No Flat",
                    ],
                    ["Room",         selectedRoom?.roomNumber ?? "—"],
                    ["Phone",        selectedTenant.phone],
                    ["Check-in",     selectedTenant.checkInDate],
                    ["Stay Type",    isDailyStay ? "Daily" : "Monthly"],
                    ...(isDailyStay
                      ? ([
                          [
                            "Days × Rate",
                            `${selectedTenant.noOfDays ?? 0} × ₹${selectedTenant.amountPerDay ?? 0}`,
                          ],
                          ["Advance EB Amount", `₹${advanceEbCollected.toLocaleString()}`],
                          ["Daily Stay Total",  `₹${dailyStayTotal.toLocaleString()}`],
                        ] as [string, string][])
                      : ([
                          ["Monthly Rent", `₹${effectiveMonthlyRent.toLocaleString()}`],
                        ] as [string, string][])),
                    ["Advance Paid", `₹${selectedTenant.advance}`],
                    ["Pending Amount", `₹${tenantPendingAmount.toLocaleString()}`],
                    ["Room Type",    isAcRoom ? "AC" : "Non-AC"],
                    ["EB Mode",      businessModelNote ? `${ebModeLabel} (${businessModelNote})` : ebModeLabel],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-slate-600">{label}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle>Final EB Reading</SectionTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="eb-prev" className="text-xs">Previous Reading</Label>
                      <Input
                        id="eb-prev"
                        type="number"
                        value={finalPrev}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="eb-curr" className="text-xs">Current Reading</Label>
                      <Input
                        id="eb-curr"
                        type="number"
                        value={finalCurr}
                        required
                        onChange={(e) => setFinalCurr(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    {/* ── AC SUB-METER (AC rooms only) ──
                        AC units are metered per ROOM, even inside a flat
                        whose main meter is shared. */}
                    {isAcRoom && (
                      <>
                        <div className="grid gap-1.5">
                          <Label htmlFor="ac-prev" className="text-xs">AC Previous Reading</Label>
                          <Input
                            id="ac-prev"
                            type="number"
                            value={acPrev}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="ac-curr" className="text-xs">AC Current Reading</Label>
                          <Input
                            id="ac-curr"
                            type="number"
                            value={acCurr}
                            required
                            onChange={(e) => setAcCurr(e.target.value)}
                            placeholder="0"
                            className={acInvalid ? "border-destructive" : undefined}
                          />
                          {acInvalid && (
                            <p className="text-[11px] text-destructive">
                              AC current reading cannot be less than AC previous reading.
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── EB RATE (Extract / Approximate)  or  FIXED EB AMOUNT (Fixed Room / Flat) ──
                        Both are editable for this check-out. */}
                    <div className="grid gap-1.5 mt-4">
                      <Label htmlFor="eb-rate" className="text-xs">
                        {ebInputLabel}
                      </Label>
                      <Input
                        id="eb-rate"
                        type="number"
                        min="0"
                        step={isFixedMode ? "1" : "0.01"}
                        value={ebInputValue}
                        onChange={(e) => {
                          if (isFixedMode) setFixedOverride(e.target.value);
                          else if (isRateApprox) setApproxRateOverride(e.target.value);
                          else setEbRate(e.target.value);
                        }}
                        placeholder={isFixedMode ? "Enter Fixed EB Amount" : "Enter EB Rate"}
                      />
                      <p className="text-[11px] text-slate-600">
                        {ebInputHint}
                        {isRateApprox && approxRateApplied !== approxBaseRate && (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() => setApproxRateOverride(null)}
                          >
                            Reset to ₹{approxBaseRate}
                          </button>
                        )}
                        {isFixedMode && fixedApplied !== fixedBase && (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() => setFixedOverride(null)}
                          >
                            Reset to ₹{fixedBase.toLocaleString()}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] mt-3">
                    <span className="text-slate-600">EB Mode: </span>
                    <span className="font-medium">{ebModeLabel}</span>
                  </p>

                  {businessModelNote && (
                    <p className="text-[11px] mt-1 text-amber-700">
                      {businessModelNote}
                    </p>
                  )}

                  {/* Extract & Approximate (Room / Flat): need a final reading for units */}
                  {hasFinalReading && !isFixedMode && (
                    <p className="text-xs text-slate-600 mt-2">
                      Total Units: {displayUnits} · Total
                      Amount: ₹{totalEBAmount.toLocaleString()}
                      {isRateApprox && approxWindowStart !== (Number(finalPrev) || 0) && (
                        <> (month window starts at {approxWindowStart})</>
                      )}
                      {ebSegments.length > 0 && (
                        <>
                          {" "}
                          · {selectedTenant?.name ?? "This tenant"}'s share: ₹
                          {Math.round(finalEBAmount).toLocaleString()}{" "}
                          (
                          {ebSegments
                            .map((s) => `${s.units}u÷${s.count}`)
                            .join(" + ")}
                          {acSegments.length > 0 && (
                            <>
                              {" "}+ AC{" "}
                              {acSegments
                                .map((s) => `${s.units}u÷${s.count}`)
                                .join(" + ")}
                            </>
                          )}
                          {" "}= {Math.round(finalEBBilledUnits * 100) / 100} units × ₹{appliedEBRate}
                          )
                        </>
                      )}
                      {approx && (
                        <>
                          {" "}
                          · {selectedTenant?.name ?? "This tenant"}'s share: ₹
                          {Math.round(finalEBAmount).toLocaleString()}{" "}
                          ({approx.myDays} days · {approx.breakdown}, {approx.monthLabel}
                          {isApproxFlat && acShare.units > 0 && (
                            <>
                              {" "}+ AC{" "}
                              {Math.round(acShare.units * 100) / 100} units × ₹{appliedEBRate} = ₹
                              {Math.round(acShareAmount).toLocaleString()}
                            </>
                          )}
                          )
                        </>
                      )}
                    </p>
                  )}

                  {/* AC sub-meter units for this room (Extract and Approximate Flat) */}
                  {isAcRoom && hasAcReading && acApplies && (
                    <p className="text-xs text-slate-600 mt-1">
                      AC Units: {acUnits} ({acPrev} → {acCurr}) · added on top of the{" "}
                      {approx ? "flat's approximate share" : "main-meter units"} ·{" "}
                      {selectedTenant?.name ?? "This tenant"}'s AC share:{" "}
                      {Math.round(acShare.units * 100) / 100} units = ₹
                      {Math.round(acShareAmount).toLocaleString()}
                      {acSegments.length > 0 && (
                        <>
                          {" "}(
                          {acSegments
                            .map((s) => `${s.units}u÷${s.count}`)
                            .join(" + ")}
                          )
                        </>
                      )}
                    </p>
                  )}

                  {/* Fixed Room / Fixed Flat: fixed amount, doesn't depend on the reading */}
                  {isFixedMode && approx && (
                    <p className="text-xs text-slate-600 mt-2">
                      {ebMode === "FIXED_FLAT" ? "Flat EB" : "Room EB"}: ₹{fixedApplied.toLocaleString()} ·{" "}
                      {selectedTenant?.name ?? "This tenant"}'s share: ₹
                      {Math.round(finalEBAmount).toLocaleString()}{" "}
                      ({approx.myDays} days · {approx.breakdown}, {approx.monthLabel})
                    </p>
                  )}

                  {isRateApprox && !hasFinalReading && (
                    <p className="text-xs text-slate-600 italic mt-2">
                      Enter the current reading to calculate the {ebMode === "APPROX_FLAT" ? "flat's" : "room's"} EB units.
                    </p>
                  )}

                  {isDailyStay && (
                    <p className="text-xs mt-1">
                      <span className="text-slate-600">
                        Advance EB collected at check-in: ₹
                        {advanceEbCollected.toLocaleString()} ·{" "}
                      </span>
                      {hasFinalReading ? (
                        <span
                          className={
                            ebPayableAfterAdvance > 0
                              ? "font-medium text-destructive"
                              : "font-medium text-success"
                          }
                        >
                          {ebPayableAfterAdvance > 0
                            ? `EB still to pay: ₹${Math.round(ebPayableAfterAdvance).toLocaleString()}`
                            : `EB refundable: ₹${Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}`}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">
                          Enter current reading to calculate
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle>Settlement Summary</SectionTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">
                      Pending Rent Records
                    </span>
                    {/* Real <button> so it is keyboard-focusable and announced. */}
                    <button
                      type="button"
                      aria-label={`View ${summary?.pendingRents?.length ?? 0} pending rent records`}
                      onClick={() => setPendingRentDialogOpen(true)}
                      className="rounded-md"
                    >
                      <Badge
                        className="cursor-pointer bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors rounded-md px-2 py-1 flex items-center gap-1"
                      >
                        {summary?.pendingRents?.length ?? 0}
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </Badge>
                    </button>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Total Pending Rent Due
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(summary?.totalRentDue ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Total Pending EB Due
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(tenantEBDue).toLocaleString()}
                    </span>
                  </div>

                  {/* Pending Amount entered on the tenant at check-in. It is
                      added to the Balance to Pay below. */}
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Pending Amount
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(tenantPendingAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label htmlFor="maintenance" className="text-sm font-normal text-slate-600">Maintenance</Label>
                    <div className="w-32">
                      <Input
                        id="maintenance"
                        type="number"
                        value={maintenanceCharge}
                        onChange={(e) => setMaintenanceCharge(Number(e.target.value) || 0)}
                        className="h-8 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="extra-days" className="text-xs">{usedMonthLabel} Rent Days</Label>
                    <Input
                      id="extra-days"
                      type="number"
                      placeholder={`${usedMonthLabel} Rent Days`}
                      value={extraDays}
                      onChange={(e) => {
                        setExtraDays(e.target.value);
                        setExtraDaysEdited(true);
                      }}
                    />
                    <p className="text-[11px] text-slate-600">
                      Days used in {usedMonthLabel} {dateForCalc.getFullYear()} in this room: {usedDaysInMonth} of {daysInMonth}
                      {extraDaysEdited && String(usedDaysInMonth) !== extraDays && (
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => {
                            setExtraDaysEdited(false);
                            setExtraDays(usedDaysInMonth > 0 ? String(usedDaysInMonth) : "");
                          }}
                        >
                          Reset to {usedDaysInMonth} days
                        </button>
                      )}
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        id="rent-auto"
                        type="radio"
                        name="extra-rent-mode"
                        checked={!useManualRent}
                        onChange={() => setUseManualRent(false)}
                      />
                      <label htmlFor="rent-auto" className="text-xs">
                        Auto Calculate
                        {isDailyStay && Number(selectedTenant.amountPerDay ?? 0) > 0 && (
                          <span className="text-slate-600">
                            {" "}(₹{selectedTenant.amountPerDay}/day from check-in)
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="rent-manual"
                        type="radio"
                        name="extra-rent-mode"
                        checked={useManualRent}
                        onChange={() => setUseManualRent(true)}
                      />
                      <label htmlFor="rent-manual" className="text-xs">Daily Basic Tenant Manual Rent Per Day</label>
                    </div>

                    {useManualRent && (
                      <div className="grid gap-1">
                        <Label htmlFor="rent-per-day" className="text-xs">Daily Basic Tenant Rent Per Day</Label>
                        <Input
                          id="rent-per-day"
                          type="number"
                          placeholder="Enter Daily Basic Tenant rent per day"
                          value={rentPerDay}
                          onChange={(e) => setRentPerDay(e.target.value)}
                        />
                      </div>
                    )}

                    {!useManualRent && extraDays && autoRentPerDay === 0 && (
                      <p className="text-[11px] text-amber-700">
                        No rent per day found for this tenant, room, or roommates —
                        switch to "Daily Basic Tenant Manual Rent Per Day" or set a rent amount to
                        auto-calculate extra rent.
                      </p>
                    )}

                    {extraDays && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">After Checkout Extra Rent</span>
                        <span className="font-medium text-success">
                          ₹{Math.round(extraRent).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      After Checkout EB Value
                      {isApproximate && (
                        <span className="text-[11px]">
                          {" "}({EB_MODE_SHORT[ebMode]}
                          {isApproxFlat && isAcRoom && hasAcReading ? " + AC" : ""})
                        </span>
                      )}
                      {!isApproximate && isAcRoom && hasAcReading && (
                        <span className="text-[11px]"> (main meter + AC)</span>
                      )}
                    </span>
                    <span className="font-medium">
                      ₹{Math.round(finalEBAmount).toLocaleString()}
                    </span>
                  </div>

                  {isDailyStay && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Advance EB Amount (paid at check-in)
                        </span>
                        <span className="font-medium text-success">
                          ₹{advanceEbCollected.toLocaleString()}
                        </span>
                      </div>

                      {hasFinalReading ? (
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            {ebPayableAfterAdvance > 0
                              ? "EB Balance to Pay"
                              : "EB Refund"}
                          </span>
                          <span
                            className={
                              ebPayableAfterAdvance > 0
                                ? "font-medium text-destructive"
                                : "font-medium text-success"
                            }
                          >
                            ₹{Math.round(Math.abs(ebPayableAfterAdvance)).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            EB Balance / Refund
                          </span>
                          <span className="text-xs italic text-slate-600">
                            Pending reading entry
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-slate-600">Advance Paid</span>
                    <span className="font-medium text-success">
                      ₹{(summary?.advancePaid ?? selectedTenant.advance ?? 0).toLocaleString()}
                    </span>
                  </div>


                  <div className="flex justify-between">
                    <span className="text-slate-600">Registration Fees</span>
                    <span className="font-medium text-success">
                      ₹{registrationFees.toLocaleString()}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-base">
                    <span className="font-semibold">
                      {calculatedNetPayable > 0 ? "Balance to Pay" : "Refund Due"}
                    </span>
                    <span
                      className={`font-bold ${
                        calculatedNetPayable > 0
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      ₹{Math.round(Math.abs(calculatedNetPayable)).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ── Check-Out Date card (sits above "Proceed to Check-Out") ── */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle>Check-Out Date</SectionTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-1.5">
                    <Label htmlFor="checkout-date" className="text-xs">
                      Check-out Date
                    </Label>
                    <Input
                      id="checkout-date"
                      type="date"
                      value={checkOutDate}
                      min={
                        selectedTenant.checkInDate
                          ? String(selectedTenant.checkInDate).slice(0, 10)
                          : undefined
                      }
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-600">
                      Defaults to today. Change it if the tenant vacated on a different date.
                      {isApproximate && " In Approximate / Fixed mode this date also sets the tenant's occupancy days."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="grid gap-4">
                    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmOpen(true)}
                      >
                        <LogOut className="h-4 w-4 mr-2" aria-hidden="true" /> Proceed to Check-Out
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Check-Out</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to check out{" "}
                            {selectedTenant.name} from room{" "}
                            {selectedRoom?.roomNumber} on {checkOutDate}? This
                            will mark the tenant as Checked-Out and free up the
                            bed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        {selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                            <p>
                              {selectedTenant.checkoutStatus === "NOTICE_ACTIVE"
                                ? `This tenant is still within their one-month notice period${
                                    selectedTenant.remainingNoticeDays != null
                                      ? ` (${selectedTenant.remainingNoticeDays} day(s) remaining)`
                                      : ""
                                  }.`
                                : "This tenant has not submitted a checkout notice yet."}{" "}
                              Final checkout will be blocked unless you override it below.
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={overrideNoticePeriod}
                                onChange={(e) =>
                                  setOverrideNoticePeriod(e.target.checked)
                                }
                              />
                              <span>
                                Override notice period and check out immediately
                              </span>
                            </label>
                          </div>
                        )}

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleConfirmCheckout}
                            disabled={
                              selectedTenant.checkoutStatus !== "NOTICE_COMPLETED" &&
                              !overrideNoticePeriod
                            }
                          >
                            Confirm Check-Out
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;