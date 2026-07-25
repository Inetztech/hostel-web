// src/components/TicketDetailDialog.tsx
import { useEffect, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BedDouble, Send, Clock, MessageSquare, CheckCircle2, XCircle,
  ArrowRightCircle, Loader2,
} from "lucide-react";

import {
  getTicketById, addTicketReply, updateTicketStatus, decideBedLimitRequest,
} from "@/lib/store";
import {
  Ticket, TicketStatus, TICKET_STATUS_OPTIONS,
} from "@/lib/types";

/* ================= HELPERS ================= */

const statusColor = (status: TicketStatus) => {
  switch (status) {
    case "OPEN":        return "bg-red-100 text-red-700 border-red-200";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-700 border-amber-200";
    case "RESOLVED":    return "bg-emerald-100 text-emerald-700 border-emerald-200";
    // case "CLOSED":      return "bg-gray-100 text-gray-600 border-gray-200";
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

const bedDecisionColor = (decision?: string | null) => {
  switch (decision) {
    case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
    default:         return "bg-amber-100 text-amber-700 border-amber-200";
  }
};

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";

// Delay (ms) between showing the success toast and auto-closing the dialog,
// so the user actually gets to read the confirmation before the card disappears.
const AUTO_CLOSE_DELAY_MS = 900;

interface TicketDetailDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true for the Super Admin view: enables status update, bed-limit decision & resolution notes. */
  isSuperAdmin: boolean;
  /** Called after any mutating action (reply / status change / bed decision) so the parent list can refresh. */
  onChanged?: () => void;
}

export default function TicketDetailDialog({
  ticketId, open, onOpenChange, isSuperAdmin, onChanged,
}: TicketDetailDialogProps) {
  const [ticket, setTicket]       = useState<Ticket | null>(null);
  const [loading, setLoading]     = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying]   = useState(false);

  const [statusDraft, setStatusDraft]   = useState<TicketStatus>("OPEN");
  const [statusNote, setStatusNote]     = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [approvedBedLimit, setApprovedBedLimit] = useState("");
  const [bedRemarks, setBedRemarks]             = useState("");
  const [decidingBed, setDecidingBed]           = useState<"APPROVED" | "REJECTED" | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const data = await getTicketById(ticketId);
      setTicket(data);
      setStatusDraft(data.status);
      setStatusNote("");
      setApprovedBedLimit(data.requestedBedLimit != null ? String(data.requestedBedLimit) : "");
      setBedRemarks("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) load();
    if (!open) {
      setTicket(null);
      setReplyText("");
    }
  }, [open, ticketId, load]);

  const handleReply = async () => {
    if (!ticket || !replyText.trim()) return;
    try {
      setReplying(true);
      const updated = await addTicketReply(ticket.id, { message: replyText.trim() });
      setTicket(updated);
      setReplyText("");
      toast.success("Reply sent");
      onChanged?.();
      // Replies stay in-dialog — the conversation is ongoing, so we don't auto-close here.
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const handleStatusSave = async () => {
    if (!ticket) return;
    try {
      setSavingStatus(true);
      const updated = await updateTicketStatus(ticket.id, {
        status: statusDraft,
        note: statusNote.trim() || undefined,
      });
      setTicket(updated);
      setStatusNote("");
      toast.success(`Ticket marked as ${updated.statusLabel}`);
      onChanged?.();

      // Give the toast a moment to be seen, then close the card.
      window.setTimeout(() => {
        onOpenChange(false);
      }, AUTO_CLOSE_DELAY_MS);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleBedDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!ticket) return;
    try {
      setDecidingBed(decision);
      const updated = await decideBedLimitRequest(ticket.id, {
        decision,
        approvedBedLimit: decision === "APPROVED" && approvedBedLimit
          ? Number(approvedBedLimit) : undefined,
        remarks: bedRemarks.trim() || undefined,
      });
      setTicket(updated);
      toast.success(decision === "APPROVED" ? "Bed limit request approved" : "Bed limit request rejected");
      onChanged?.();

      // Same pattern as status save: let the toast register, then close.
      window.setTimeout(() => {
        onOpenChange(false);
      }, AUTO_CLOSE_DELAY_MS);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record decision");
    } finally {
      setDecidingBed(null);
    }
  };

  const isBedLimitTicket = ticket?.category === "BED_LIMIT_INCREASE";
  const bedDecisionPending = isBedLimitTicket && (ticket?.bedLimitDecision ?? "PENDING") === "PENDING";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {ticket ? (
              <>
                <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</span>
                <span>{ticket.subject}</span>
              </>
            ) : (
              "Ticket"
            )}
          </DialogTitle>
          <DialogDescription>
            {ticket ? `Raised by ${ticket.raisedByName}${ticket.hostelName ? ` · ${ticket.hostelName}` : ""}` : "Loading ticket detail…"}
          </DialogDescription>
        </DialogHeader>

        {loading || !ticket ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Meta badges ───────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusColor(ticket.status)}>{ticket.statusLabel}</Badge>
              <Badge variant="outline" className={priorityColor(ticket.priority)}>{ticket.priorityLabel}</Badge>
              <Badge variant="outline">{ticket.categoryLabel}</Badge>
              {isBedLimitTicket && (
                <Badge variant="outline" className={bedDecisionColor(ticket.bedLimitDecision)}>
                  <BedDouble className="h-3 w-3 mr-1" />
                  {ticket.bedLimitDecisionLabel ?? "Pending Review"}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>Created: <span className="text-foreground">{fmtDateTime(ticket.createdAt)}</span></div>
              <div>Last updated: <span className="text-foreground">{fmtDateTime(ticket.updatedAt)}</span></div>
              {ticket.resolvedAt && <div>Resolved: <span className="text-foreground">{fmtDateTime(ticket.resolvedAt)}</span></div>}
              {ticket.closedAt && <div>Closed: <span className="text-foreground">{fmtDateTime(ticket.closedAt)}</span></div>}
            </div>

            {/* ── Description ──────────────────────────────────────── */}
            <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>

            {/* ── Bed Limit Increase details ───────────────────────── */}
            {isBedLimitTicket && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <BedDouble className="h-4 w-4" /> Bed Limit Increase Request
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Current limit: <span className="font-semibold">{ticket.currentBedLimit ?? "—"}</span></div>
                  <div>Requested limit: <span className="font-semibold">{ticket.requestedBedLimit ?? "—"}</span></div>
                </div>

                {isSuperAdmin && bedDecisionPending && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200">
                    <label className="text-xs font-medium text-muted-foreground">
                      Approved bed limit (defaults to requested value)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      placeholder={String(ticket.requestedBedLimit ?? "")}
                      value={approvedBedLimit}
                      onChange={(e) => setApprovedBedLimit(e.target.value)}
                    />
                    <Textarea
                      placeholder="Remarks (optional)"
                      value={bedRemarks}
                      onChange={(e) => setBedRemarks(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={decidingBed !== null}
                        onClick={() => handleBedDecision("APPROVED")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {decidingBed === "APPROVED" ? "Approving…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={decidingBed !== null}
                        onClick={() => handleBedDecision("REJECTED")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {decidingBed === "REJECTED" ? "Rejecting…" : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Super Admin: status update ───────────────────────── */}
            {isSuperAdmin && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <ArrowRightCircle className="h-4 w-4" /> Update Status
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as TicketStatus)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={savingStatus || statusDraft === ticket.status}
                    onClick={handleStatusSave}
                  >
                    {savingStatus ? "Saving…" : "Save Status"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Note for this status change / resolution details (optional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {ticket.resolutionNotes && (
              <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm">
                <span className="font-medium text-blue-800">Resolution notes: </span>
                {ticket.resolutionNotes}
              </div>
            )}

            <Separator />

            {/* ── History / thread ─────────────────────────────────── */}
            <div>
              <div className="text-sm font-medium flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" /> Ticket History
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {ticket.replies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
                {ticket.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-md border p-2.5 text-sm ${
                      r.type === "STATUS_CHANGE" ? "bg-gray-50 border-gray-200" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-xs">
                        {r.authorName ?? "System"}
                        {r.authorRole && <span className="text-muted-foreground font-normal"> · {r.authorRole.replace("_", " ")}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                    {r.type === "STATUS_CHANGE" ? (
                      <p className="text-xs text-muted-foreground">
                        Status changed {r.statusFrom ? `from ${r.statusFrom} ` : ""}to <span className="font-semibold">{r.statusTo}</span>
                        {r.message ? ` — ${r.message}` : ""}
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap">{r.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Reply box ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <Textarea
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button size="sm" disabled={replying || !replyText.trim()} onClick={handleReply}>
                  <Send className="h-4 w-4 mr-1" />
                  {replying ? "Sending…" : "Send Reply"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}