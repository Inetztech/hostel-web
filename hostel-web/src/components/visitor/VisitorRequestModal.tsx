import { useState, useCallback, memo } from "react";
import { toast } from "sonner";
import { UserPlus, Calendar, Clock, Phone, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface VisitorRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (visitorName: string, visitorPhone: string, relation: string, visitDate: string, expectedInTime: string) => void;
}

export const VisitorRequestModal = memo(({
  open,
  onOpenChange,
  onSubmit,
}: VisitorRequestModalProps) => {
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedInTime, setExpectedInTime] = useState("10:00");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return toast.error("Please enter visitor name.");
    if (!visitorPhone.trim() || visitorPhone.length < 10) return toast.error("Provide a valid phone number.");
    if (!relation.trim()) return toast.error("Specify relationship (e.g. Parent, Friend).");
    if (!visitDate) return toast.error("Select visit date.");
    if (!expectedInTime) return toast.error("Specify expected in-time.");

    onSubmit(visitorName, visitorPhone, relation, visitDate, expectedInTime);
    onOpenChange(false);
    setVisitorName("");
    setVisitorPhone("");
    setRelation("");
  }, [visitorName, visitorPhone, relation, visitDate, expectedInTime, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-5 w-5 text-primary" /> Request Visitor Entry
          </DialogTitle>
          <DialogDescription className="text-xs">
            Provide details of your visitor for warden approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" /> Visitor Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="border rounded-md px-3 h-9 text-xs w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <input
                type="tel"
                placeholder="10-digit phone"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                className="border rounded-md px-3 h-9 text-xs w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Relation
              </label>
              <input
                type="text"
                placeholder="Father / Brother / Friend"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="border rounded-md px-3 h-9 text-xs w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Visit Date
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="border rounded-md px-3 h-9 text-xs w-full bg-background focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Expected In-Time
              </label>
              <input
                type="time"
                value={expectedInTime}
                onChange={(e) => setExpectedInTime(e.target.value)}
                className="border rounded-md px-3 h-9 text-xs w-full bg-background focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
VisitorRequestModal.displayName = "VisitorRequestModal";