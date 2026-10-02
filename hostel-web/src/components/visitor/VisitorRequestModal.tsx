import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VisitorRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    visitorName: string,
    visitorPhone: string,
    relation: string,
    visitDate: string,
    expectedInTime: string
  ) => void | Promise<void>;
}

const RELATIONS = ["Friend", "Parent", "Sibling", "Relative", "Guardian", "Colleague", "Other"];

const todayISO = () => new Date().toISOString().split("T")[0];

/* Shared look: matches the "Add Branch" dialog inputs */
const inputCls =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 " +
  "transition-colors";

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label className="mb-1.5 block text-sm font-semibold text-slate-900">
    {text} {required && <span className="text-red-500">*</span>}
  </label>
);

export const VisitorRequestModal = ({ open, onOpenChange, onSubmit }: VisitorRequestModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [visitDate, setVisitDate] = useState(todayISO());
  const [inTime, setInTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fresh form every time the dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setRelation("");
      setVisitDate(todayISO());
      setInTime("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Visitor name is required.");
    if (!/^\d{10}$/.test(phone)) return toast.error("Enter a valid 10-digit phone number.");
    if (!relation) return toast.error("Please select the relation.");
    if (!visitDate) return toast.error("Visit date is required.");
    if (!inTime) return toast.error("Expected arrival time is required.");

    setSubmitting(true);
    try {
      await onSubmit(name.trim(), phone, relation, visitDate, inTime);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] rounded-2xl border-0 bg-white p-8 shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-bold text-slate-900">Request Visitor Entry</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Submit a visitor entry request for <span className="font-semibold text-slate-600">approval</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          <div>
            <Label text="Visitor Name" required />
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Kumar"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label text="Contact Phone" required />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="Contact Phone (10 digits)"
                className={inputCls}
              />
            </div>
            <div>
              <Label text="Relation" required />
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger className={inputCls + " justify-between"}>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label text="Visit Date" required />
              <input
                type="date"
                min={todayISO()}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label text="Expected In Time" required />
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 rounded-lg bg-[#5200FF] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4300d1] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisitorRequestModal;