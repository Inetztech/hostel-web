// import { useEffect, useMemo, useState } from "react";
// import { getHostels, getBranches, getBusinessModel, saveBusinessModel } from "@/lib/store";
// import { Hostel, Branch, BusinessModel, EbCalculationMode } from "@/lib/types";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import { Building, Zap, Loader2 } from "lucide-react";

// // NEW: Business Model — mode selector between the existing (Extract)
// // EB calculation and the new Approximate calculation, independently
// // for Room and Flat, per branch. See backend
// // EBReadingServiceImpl "APPROXIMATE (BUSINESS MODEL)" section.

// const EMPTY_MODEL = (branchId: number): BusinessModel => ({
//   branchId,
//   roomEbMode: "EXTRACT",
//   roomApproximateEbRate: null,
//   flatEbMode: "EXTRACT",
//   flatApproximateEbAmount: null,
// });

// export default function BusinessModelPage() {
//   const [hostels, setHostels] = useState<Hostel[]>([]);
//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [hostelId, setHostelId] = useState<number | null>(null);
//   const [branchId, setBranchId] = useState<number | null>(null);

//   const [model, setModel] = useState<BusinessModel | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     (async () => {
//       try {
//         const [h, b] = await Promise.all([
//           getHostels(0, 200),
//           getBranches(0, 500),
//         ]);
//         setHostels(h.content);
//         setBranches(b.content);
//       } catch {
//         toast.error("Failed to load hostels/branches");
//       }
//     })();
//   }, []);

//   const branchesForHostel = useMemo(
//     () => branches.filter((b) => Number(b.hostelId) === Number(hostelId)),
//     [branches, hostelId]
//   );

//   useEffect(() => {
//     setBranchId(null);
//     setModel(null);
//   }, [hostelId]);

//   useEffect(() => {
//     if (!branchId) return;
//     setLoading(true);
//     getBusinessModel(branchId)
//       .then((m) => setModel(m))
//       .catch(() => {
//         toast.error("Failed to load business model");
//         setModel(EMPTY_MODEL(branchId));
//       })
//       .finally(() => setLoading(false));
//   }, [branchId]);

//   const handleSave = async () => {
//     if (!model || !branchId) return;

//     if (model.roomEbMode === "APPROXIMATE" &&
//         (!model.roomApproximateEbRate || model.roomApproximateEbRate <= 0)) {
//       toast.error("Enter a valid EB rate for Approximate Room EB");
//       return;
//     }
//     if (model.flatEbMode === "APPROXIMATE" &&
//         (!model.flatApproximateEbAmount || model.flatApproximateEbAmount <= 0)) {
//       toast.error("Enter a valid fixed EB amount for Approximate Flat EB");
//       return;
//     }

//     setSaving(true);
//     try {
//       const saved = await saveBusinessModel({
//         branchId,
//         roomEbMode: model.roomEbMode,
//         roomApproximateEbRate: model.roomEbMode === "APPROXIMATE" ? model.roomApproximateEbRate : null,
//         flatEbMode: model.flatEbMode,
//         flatApproximateEbAmount: model.flatEbMode === "APPROXIMATE" ? model.flatApproximateEbAmount : null,
//       });
//       setModel(saved);
//       toast.success("Business model saved successfully");
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message ?? "Failed to save business model");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const setRoomMode = (mode: EbCalculationMode) =>
//     setModel((m) => (m ? { ...m, roomEbMode: mode } : m));

//   const setFlatMode = (mode: EbCalculationMode) =>
//     setModel((m) => (m ? { ...m, flatEbMode: mode } : m));

//   return (
//     <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
//       <div className="flex items-center gap-3">
//         <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center">
//           <Zap className="h-5 w-5 text-violet-600" />
//         </div>
//         <div>
//           <h1 className="text-xl font-bold leading-none">Business Model</h1>
//           <p className="text-sm text-muted-foreground mt-1">EB calculation configuration</p>
//         </div>
//       </div>

//       <Card>
//         <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div className="space-y-1.5">
//             <Label>Hostel</Label>
//             <Select
//               value={hostelId != null ? String(hostelId) : undefined}
//               onValueChange={(v) => setHostelId(Number(v))}
//             >
//               <SelectTrigger>
//                 <SelectValue placeholder="Select hostel" />
//               </SelectTrigger>
//               <SelectContent>
//                 {hostels.map((h) => (
//                   <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-1.5">
//             <Label>Branch</Label>
//             <Select
//               value={branchId != null ? String(branchId) : undefined}
//               onValueChange={(v) => setBranchId(Number(v))}
//               disabled={!hostelId}
//             >
//               <SelectTrigger>
//                 <SelectValue placeholder={hostelId ? "Select branch" : "Select hostel first"} />
//               </SelectTrigger>
//               <SelectContent>
//                 {branchesForHostel.map((b) => (
//                   <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </CardContent>
//       </Card>

//       {loading && (
//         <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
//           <Loader2 className="h-4 w-4 animate-spin" /> Loading…
//         </div>
//       )}

//       {!loading && model && (
//         <>
//           <Card>
//             <CardHeader className="pb-3">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <Building className="h-4 w-4 text-indigo-500" /> Room EB Model
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <RadioGroup value={model.roomEbMode} onValueChange={(v) => setRoomMode(v as EbCalculationMode)}>
//                 <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
//                   <RadioGroupItem value="EXTRACT" id="room-extract" className="mt-1" />
//                   <div>
//                     <div className="font-medium text-sm">Extract Room EB</div>
//                     <div className="text-xs text-muted-foreground">
//                       Use actual/existing EB reading calculation
//                     </div>
//                   </div>
//                 </label>
//                 <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
//                   <RadioGroupItem value="APPROXIMATE" id="room-approx" className="mt-1" />
//                   <div>
//                     <div className="font-medium text-sm">Approximate Room EB</div>
//                     <div className="text-xs text-muted-foreground">
//                       Calculate EB based on tenant occupancy days
//                     </div>
//                   </div>
//                 </label>
//               </RadioGroup>

//               {model.roomEbMode === "APPROXIMATE" && (
//                 <div className="space-y-1.5 max-w-xs">
//                   <Label>EB Rate (₹ / unit)</Label>
//                   <Input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={model.roomApproximateEbRate ?? ""}
//                     onChange={(e) =>
//                       setModel((m) => (m ? { ...m, roomApproximateEbRate: e.target.value === "" ? null : Number(e.target.value) } : m))
//                     }
//                     placeholder="e.g. 13.00"
//                   />
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="pb-3">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <Building className="h-4 w-4 text-teal-500" /> Flat EB Model
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <RadioGroup value={model.flatEbMode} onValueChange={(v) => setFlatMode(v as EbCalculationMode)}>
//                 <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
//                   <RadioGroupItem value="EXTRACT" id="flat-extract" className="mt-1" />
//                   <div>
//                     <div className="font-medium text-sm">Extract Flat EB</div>
//                     <div className="text-xs text-muted-foreground">
//                       Use actual/existing Flat EB reading calculation
//                     </div>
//                   </div>
//                 </label>
//                 <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
//                   <RadioGroupItem value="APPROXIMATE" id="flat-approx" className="mt-1" />
//                   <div>
//                     <div className="font-medium text-sm">Approximate Flat EB</div>
//                     <div className="text-xs text-muted-foreground">
//                       Apply configured fixed EB amount
//                     </div>
//                   </div>
//                 </label>
//               </RadioGroup>

//               {model.flatEbMode === "APPROXIMATE" && (
//                 <div className="space-y-1.5 max-w-xs">
//                   <Label>Fixed EB Amount (₹)</Label>
//                   <Input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={model.flatApproximateEbAmount ?? ""}
//                     onChange={(e) =>
//                       setModel((m) => (m ? { ...m, flatApproximateEbAmount: e.target.value === "" ? null : Number(e.target.value) } : m))
//                     }
//                     placeholder="e.g. 500.00"
//                   />
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           <div className="flex justify-end">
//             <Button onClick={handleSave} disabled={saving}>
//               {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
//               Save Business Model
//             </Button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }











































































import { useEffect, useState } from "react";
import { getHostels, getBusinessModel, saveBusinessModel } from "@/lib/store";
import { Hostel, BusinessModel, EbCalculationMode, RentDueMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building, Zap, Loader2, Info, CalendarClock } from "lucide-react";

// Business Model — choose between the existing (Extract) EB calculation
// and the Approximate calculation, independently for Room and Flat,
// per HOSTEL (applies across all of that hostel's branches).
// See backend EBReadingServiceImpl "APPROXIMATE (BUSINESS MODEL)" section.

const EMPTY_MODEL = (hostelId: number): BusinessModel => ({
  hostelId,
  roomEbMode: "EXTRACT",
  roomApproximateEbRate: null,
  flatEbMode: "EXTRACT",
  flatApproximateEbAmount: null,
  rentDueMode: "NO_DUE",
  fixedDuePerDay: null,
  rentDueDay: 1,
});

// Fills the Rent Due fields for a model saved before the Rent Due Model
// existed (or returned by an older backend): they behave as NO_DUE.
const withRentDueDefaults = (m: BusinessModel): BusinessModel => ({
  ...m,
  rentDueMode: m.rentDueMode ?? "NO_DUE",
  fixedDuePerDay: m.fixedDuePerDay ?? null,
  rentDueDay: m.rentDueDay ?? 1,
});

// ---------- small UI helpers ----------

function ModeBadge({ mode }: { mode: EbCalculationMode }) {
  const approx = mode === "APPROXIMATE";
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
        approx
          ? "bg-violet-50 text-violet-700 border-violet-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {approx ? "Approximate" : "Extract"}
    </span>
  );
}

function DueBadge({ mode }: { mode: RentDueMode }) {
  const fixed = mode === "FIXED_DUE";
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
        fixed
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {fixed ? "Fixed Due" : "No Due"}
    </span>
  );
}

function ModeOption({
  value,
  id,
  selected,
  title,
  description,
}: {
  value: string;
  id: string;
  selected: boolean;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
        selected
          ? "border-violet-500 bg-violet-50/60 ring-1 ring-violet-500"
          : "hover:bg-muted/50"
      }`}
    >
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function RupeeInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ₹
      </span>
      <Input
        type="number"
        min="0"
        step="0.01"
        className="pl-7"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={placeholder}
      />
    </div>
  );
}

// ---------- page ----------

export default function BusinessModelPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [hostelId, setHostelId] = useState<number | null>(null);
  // Bumped after save so the Hostel <Select> remounts and shows its placeholder again
  const [selectKey, setSelectKey] = useState(0);

  const [model, setModel] = useState<BusinessModel | null>(null);
  const [savedModel, setSavedModel] = useState<BusinessModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty =
    model !== null &&
    savedModel !== null &&
    JSON.stringify(model) !== JSON.stringify(savedModel);

  useEffect(() => {
    (async () => {
      try {
        const h = await getHostels(0, 200);
        setHostels(h.content);
      } catch {
        toast.error("Failed to load hostels");
      }
    })();
  }, []);

  useEffect(() => {
    if (!hostelId) {
      setModel(null);
      setSavedModel(null);
      return;
    }

    // Ignore stale responses if the hostel changes mid-request
    let cancelled = false;
    setLoading(true);
    setModel(null);
    setSavedModel(null);

    getBusinessModel(hostelId)
      .then((m) => {
        if (cancelled) return;
        const loaded = m ? withRentDueDefaults(m) : EMPTY_MODEL(hostelId);
        setModel(loaded);
        setSavedModel(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load business model");
        const empty = EMPTY_MODEL(hostelId);
        setModel(empty);
        setSavedModel(empty);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostelId]);

  const handleSave = async () => {
    if (!model || !hostelId) return;

    if (
      model.roomEbMode === "APPROXIMATE" &&
      (!model.roomApproximateEbRate || model.roomApproximateEbRate <= 0)
    ) {
      toast.error("Enter a valid EB rate for Approximate Room EB");
      return;
    }
    if (
      model.flatEbMode === "APPROXIMATE" &&
      (!model.flatApproximateEbAmount || model.flatApproximateEbAmount <= 0)
    ) {
      toast.error("Enter a valid fixed EB amount for Approximate Flat EB");
      return;
    }
    if (
      model.rentDueMode === "FIXED_DUE" &&
      (!model.fixedDuePerDay || model.fixedDuePerDay <= 0)
    ) {
      toast.error("Enter a valid due amount per day for Fixed Due");
      return;
    }
    const dueDay = model.rentDueDay ?? 1;
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      toast.error("Rent due day must be a whole number between 1 and 28");
      return;
    }

    setSaving(true);
    try {
      await saveBusinessModel({
        hostelId,
        roomEbMode: model.roomEbMode,
        roomApproximateEbRate:
          model.roomEbMode === "APPROXIMATE" ? model.roomApproximateEbRate : null,
        flatEbMode: model.flatEbMode,
        flatApproximateEbAmount:
          model.flatEbMode === "APPROXIMATE" ? model.flatApproximateEbAmount : null,
        rentDueMode: model.rentDueMode ?? "NO_DUE",
        fixedDuePerDay:
          model.rentDueMode === "FIXED_DUE" ? model.fixedDuePerDay : null,
        rentDueDay: dueDay,
      });

      toast.success("Business model saved successfully");

      // Go back to the initial screen (no hostel selected)
      setHostelId(null);          // effect clears model + savedModel
      setSelectKey((k) => k + 1); // resets the Select to "Select hostel"
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save business model");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (savedModel) setModel(savedModel);
  };

  const setRoomMode = (mode: EbCalculationMode) =>
    setModel((m) => (m ? { ...m, roomEbMode: mode } : m));

  const setFlatMode = (mode: EbCalculationMode) =>
    setModel((m) => (m ? { ...m, flatEbMode: mode } : m));

  const setDueMode = (mode: RentDueMode) =>
    setModel((m) => (m ? { ...m, rentDueMode: mode } : m));

  const selectedHostelName = hostels.find((h) => h.id === hostelId)?.name;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center">
          <Zap className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-none">Business Model</h1>
          <p className="text-sm text-muted-foreground mt-1">EB calculation &amp; rent due configuration</p>
        </div>
      </div>

      {/* Hostel picker */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-1.5 w-full sm:max-w-sm">
            <Label>Hostel</Label>
            <Select
              key={selectKey}
              value={hostelId != null ? String(hostelId) : undefined}
              onValueChange={(v) => setHostelId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select hostel" />
              </SelectTrigger>
              <SelectContent>
                {hostels.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 sm:pb-2.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            This configuration applies to every branch under the selected hostel.
          </p>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!hostelId && !loading && (
        <div className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
          Select a hostel to view or change its EB calculation and rent due models.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && model && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Room EB */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4 text-indigo-500" /> Room EB Model
                  </CardTitle>
                  <ModeBadge mode={model.roomEbMode} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={model.roomEbMode}
                  onValueChange={(v) => setRoomMode(v as EbCalculationMode)}
                >
                  <ModeOption
                    value="EXTRACT"
                    id="room-extract"
                    selected={model.roomEbMode === "EXTRACT"}
                    title="Extract Room EB"
                    description="Use actual/existing EB reading calculation"
                  />
                  <ModeOption
                    value="APPROXIMATE"
                    id="room-approx"
                    selected={model.roomEbMode === "APPROXIMATE"}
                    title="Approximate Room EB"
                    description="Calculate EB based on tenant occupancy days"
                  />
                </RadioGroup>

                {model.roomEbMode === "APPROXIMATE" && (
                  <div className="space-y-1.5">
                    <Label>EB Rate (per unit)</Label>
                    <RupeeInput
                      value={model.roomApproximateEbRate}
                      onChange={(v) =>
                        setModel((m) => (m ? { ...m, roomApproximateEbRate: v } : m))
                      }
                      placeholder="e.g. 13.00"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flat EB */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4 text-teal-500" /> Flat EB Model
                  </CardTitle>
                  <ModeBadge mode={model.flatEbMode} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={model.flatEbMode}
                  onValueChange={(v) => setFlatMode(v as EbCalculationMode)}
                >
                  <ModeOption
                    value="EXTRACT"
                    id="flat-extract"
                    selected={model.flatEbMode === "EXTRACT"}
                    title="Extract Flat EB"
                    description="Use actual/existing Flat EB reading calculation"
                  />
                  <ModeOption
                    value="APPROXIMATE"
                    id="flat-approx"
                    selected={model.flatEbMode === "APPROXIMATE"}
                    title="Approximate Flat EB"
                    description="Apply configured fixed EB amount"
                  />
                </RadioGroup>

                {model.flatEbMode === "APPROXIMATE" && (
                  <div className="space-y-1.5">
                    <Label>Fixed EB Amount</Label>
                    <RupeeInput
                      value={model.flatApproximateEbAmount}
                      onChange={(v) =>
                        setModel((m) => (m ? { ...m, flatApproximateEbAmount: v } : m))
                      }
                      placeholder="e.g. 500.00"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rent Due Model */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-500" /> Rent Due Model
                </CardTitle>
                <DueBadge mode={model.rentDueMode ?? "NO_DUE"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={model.rentDueMode ?? "NO_DUE"}
                onValueChange={(v) => setDueMode(v as RentDueMode)}
              >
                <ModeOption
                  value="NO_DUE"
                  id="due-none"
                  selected={(model.rentDueMode ?? "NO_DUE") === "NO_DUE"}
                  title="No Due"
                  description="Never add a due amount — the Rent page shows the normal rent / EB calculation (Due = ₹0)"
                />
                <ModeOption
                  value="FIXED_DUE"
                  id="due-fixed"
                  selected={model.rentDueMode === "FIXED_DUE"}
                  title="Fixed Due"
                  description="Charge a fixed amount for every day the rent is overdue (Due = due days × amount per day)"
                />
              </RadioGroup>

              {model.rentDueMode === "FIXED_DUE" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Fixed Due Amount (per day)</Label>
                      <RupeeInput
                        value={model.fixedDuePerDay ?? null}
                        onChange={(v) =>
                          setModel((m) => (m ? { ...m, fixedDuePerDay: v } : m))
                        }
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rent falls due on day of month</Label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        step="1"
                        value={model.rentDueDay ?? ""}
                        onChange={(e) =>
                          setModel((m) =>
                            m
                              ? {
                                  ...m,
                                  rentDueDay:
                                    e.target.value === "" ? null : Number(e.target.value),
                                }
                              : m
                          )
                        }
                        placeholder="1 – 28"
                      />
                      <p className="text-xs text-muted-foreground">
                        Each day after this date counts as one due day.
                      </p>
                    </div>
                  </div>

                  {model.fixedDuePerDay != null && model.fixedDuePerDay > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                      <div className="font-medium text-sm">Example</div>
                      {[1, 2, 3, 5].map((days) => (
                        <div key={days} className="flex justify-between max-w-xs">
                          <span className="text-muted-foreground">
                            {days} day{days > 1 ? "s" : ""} due
                          </span>
                          <span className="font-medium">
                            ₹{(days * (model.fixedDuePerDay ?? 0)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Applies to new rent records only. Rent already generated keeps the due
                terms it was generated with.
              </p>
            </CardContent>
          </Card>

          {/* Sticky action bar — Save is always visible without scrolling */}
          <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground truncate">
              {dirty
                ? "You have unsaved changes"
                : selectedHostelName
                ? `No changes for ${selectedHostelName}`
                : "No changes"}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!dirty || saving}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!dirty || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Business Model
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}