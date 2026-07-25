// src/pages/TicketsPage.tsx
// ADMIN-facing "Raise Ticket" module: create support tickets (technical
// issues, subscription issues, bed limit increase requests, account
// issues, feature requests, billing issues, or anything else) and track
// their own tickets through to resolution.
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  createTicket, getMyTickets, getHostelById,
} from "@/lib/store";
import { getUserHostelId } from "@/lib/auth";
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
import { toast } from "sonner";
import { Plus, Ticket as TicketIcon, BedDouble, Inbox } from "lucide-react";

import TicketDetailDialog from "@/components/TicketDetailDialog";
import {
  TicketSummary, TicketCategory, TicketPriority,
  TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS,
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

const TicketsPage = () => {
  const [tickets, setTickets]     = useState<TicketSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentBedLimit, setCurrentBedLimit] = useState<number | null>(null);

  const [detailId, setDetailId]   = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── form state ──────────────────────────────────────────────────────
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState<TicketCategory | "">("");
  const [priority, setPriority]       = useState<TicketPriority>("MEDIUM");
  const [requestedBedLimit, setRequestedBedLimit] = useState("");

  const didFetch = useRef(false);

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setCategory("");
    setPriority("MEDIUM");
    setRequestedBedLimit("");
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

    // Best-effort: show the hostel's current bed capacity as context when
    // raising a Bed Limit Increase request. Non-fatal if it fails.
    const hostelId = getUserHostelId();
    if (hostelId) {
      getHostelById(hostelId)
        .then((h: any) => setCurrentBedLimit(h.capacityBeds ?? null))
        .catch(() => setCurrentBedLimit(null));
    }
  }, [loadTickets]);

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim() || !category) {
      toast.error("Subject, description and category are required");
      return;
    }
    if (category === "BED_LIMIT_INCREASE" && !requestedBedLimit.trim()) {
      toast.error("Please specify the requested bed limit");
      return;
    }

    try {
      setSubmitting(true);
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: category as TicketCategory,
        priority,
        requestedBedLimit: category === "BED_LIMIT_INCREASE" ? Number(requestedBedLimit) : undefined,
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

          <DialogContent className="max-w-lg">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <Textarea
                placeholder="Describe your issue in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              {category === "BED_LIMIT_INCREASE" && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <BedDouble className="h-4 w-4" /> Bed Limit Increase Request
                  </div>
                  {currentBedLimit != null && (
                    <p className="text-xs text-muted-foreground">
                      Current bed limit: <span className="font-semibold text-foreground">{currentBedLimit}</span>
                    </p>
                  )}
                  <Input
                    type="number"
                    min={1}
                    placeholder="Requested bed limit"
                    value={requestedBedLimit}
                    onChange={(e) => setRequestedBedLimit(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="rounded-md border">
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
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-gray-300" />
                    No tickets raised yet.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && sorted.map((t) => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(t.id)}>
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
      </div>

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