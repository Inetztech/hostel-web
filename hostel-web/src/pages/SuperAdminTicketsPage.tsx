import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getAllTickets, getTicketStats } from "@/lib/store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Ticket as TicketIcon, Inbox, BedDouble, Clock3, CheckCircle2,
  ListChecks,
} from "lucide-react";

import TicketDetailDialog from "@/components/TicketDetailDialog";
import {
  TicketSummary, TicketStats, TicketStatus, TicketCategory,
  TICKET_STATUS_OPTIONS, TICKET_CATEGORY_OPTIONS,
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

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </CardContent>
  </Card>
);

const SuperAdminTicketsPage = () => {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [stats, setStats]     = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter]     = useState<TicketStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "ALL">("ALL");

  const [detailId, setDetailId]     = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const didFetch = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketData, statData] = await Promise.all([
        getAllTickets({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        }),
        getTicketStats(),
      ]);
      setTickets(ticketData);
      setStats(statData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  // Initial load — runs exactly once, even under StrictMode's double-invoke.
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change — skips the very first render (already
  // handled above) so it never double-fires alongside the mount effect.
  useEffect(() => {
    if (!didFetch.current) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const filtered = useMemo(() => {
    let data = tickets;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter((t) =>
        t.subject.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.hostelName ?? "").toLowerCase().includes(q) ||
        (t.raisedByName ?? "").toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [tickets, searchText]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TicketIcon className="h-6 w-6 text-violet-500" /> Support Tickets
        </h1>
      </div>

      {/* STATS — "Closed" card removed; grid now holds 5 cards instead of 6. */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total"       value={stats.total}      icon={ListChecks}    color="bg-violet-100 text-violet-600" />
          <StatCard label="Open"        value={stats.open}       icon={Inbox}         color="bg-red-100 text-red-600" />
          <StatCard label="In Progress" value={stats.inProgress} icon={Clock3}        color="bg-amber-100 text-amber-600" />
          <StatCard label="Resolved"    value={stats.resolved}   icon={CheckCircle2}  color="bg-emerald-100 text-emerald-600" />
          <StatCard label="Bed Requests Pending" value={stats.pendingBedLimitRequests} icon={BedDouble} color="bg-teal-100 text-teal-600" />
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by ticket, subject, hostel or admin…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {TICKET_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {TICKET_CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Hostel / Admin</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-gray-300" />
                    No tickets found.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium text-foreground">{t.hostelName ?? "—"}</div>
                  <div className="text-muted-foreground">{t.raisedByName}</div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {t.subject}
                  {t.category === "BED_LIMIT_INCREASE" && (
                    <BedDouble className="inline h-3.5 w-3.5 ml-1.5 text-teal-500" />
                  )}
                </TableCell>
                <TableCell className="text-xs">{t.categoryLabel}</TableCell>
                <TableCell><Badge variant="outline" className={priorityColor(t.priority)}>{t.priorityLabel}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={statusColor(t.status)}>{t.statusLabel}</Badge></TableCell>
                <TableCell className="text-xs">{fmtDate(t.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetail(t.id); }}>
                    Review
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
        isSuperAdmin
        onChanged={load}
      />
    </div>
  );
};

export default SuperAdminTicketsPage;