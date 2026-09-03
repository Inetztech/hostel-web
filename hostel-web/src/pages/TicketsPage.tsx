import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  createTicket, getMyTickets,
} from "@/lib/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogClose, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Ticket as TicketIcon } from "lucide-react";

import TicketDetailDialog from "@/components/TicketDetailDialog";
import {
  TicketSummary, TicketCategory,
  TICKET_CATEGORY_OPTIONS,
} from "@/lib/types";

/* ================= HELPERS ================= */

const statusColor = (status: string) => {
  switch (status) {
    case "OPEN":        return "bg-red-100 text-red-700 border-red-200";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-700 border-amber-200";
    case "RESOLVED":    return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "CLOSED":      return "bg-gray-100 text-gray-600 border-gray-200";
    default:            return "";
  }
};

const priorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT": return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":   return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM": return "bg-blue-100 text-blue-700 border-blue-200";
    case "LOW":    return "bg-gray-100 text-gray-600 border-gray-200";
    default:       return "";
  }
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";

const DEFAULT_PRIORITY = "HIGH" as const;

const TicketsPage = () => {
  const [tickets, setTickets]     = useState<TicketSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [detailId, setDetailId]   = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── form state ──────────────────────────────────────────────────────
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState<TicketCategory | "">("");

  const didFetch = useRef(false);

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setCategory("");
  };

  const closeDialog = () => {
    setAddOpen(false);
    resetForm();
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyTickets();
      setTickets(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim() || !category) {
      toast.error("Subject, description and category are required");
      return;
    }

    try {
      setSubmitting(true);
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: category as TicketCategory,
        priority: DEFAULT_PRIORITY,
      });
      toast.success("Ticket raised successfully");
      closeDialog();
      await loadTickets();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message ?? "Failed to raise ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [tickets]
  );

  return (
    <div className="space-y-6">
      {/* HEADER — title on the left, Raise Ticket button pinned to the right */}
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TicketIcon className="h-6 w-6 text-violet-500" /> Support Tickets
        </h1>

        <Dialog
          open={addOpen}
          onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Raise Ticket
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg rounded-2xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Raise a Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and Super Admin will review it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as TicketCategory)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TICKET_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl"
              />

              <Textarea
                placeholder="Describe your issue in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl" onClick={closeDialog}>Cancel</Button>
              </DialogClose>
              <Button className="rounded-xl" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Replies</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No tickets raised yet
                </TableCell>
              </TableRow>
            )}
            {!loading && sorted.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                <TableCell className="max-w-[220px] truncate">{t.subject}</TableCell>
                <TableCell className="text-xs">{t.categoryLabel}</TableCell>
                <TableCell><Badge variant="outline" className={priorityColor(t.priority)}>{t.priorityLabel}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={statusColor(t.status)}>{t.statusLabel}</Badge></TableCell>
                <TableCell>{t.replyCount}</TableCell>
                <TableCell className="text-xs">{fmtDate(t.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetail(t.id); }}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <TicketDetailDialog
        ticketId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isSuperAdmin={false}
        onChanged={loadTickets}
      />
    </div>
  );
};

export default TicketsPage;