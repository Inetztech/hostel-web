import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getUserRole } from "@/lib/auth";
import { Rent, PaymentTransaction } from "@/lib/types";
import {
  resolveTenantId,
  getTenantRents,
  getTenantPaymentHistory,
  submitPayment as submitPaymentApi,
  fetchPendingPayments,
  fetchAllPayments,
  approvePayment,
  rejectPayment,
} from "@/lib/store";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Upload, CheckCircle2, XCircle, Clock, ImageIcon, IndianRupee, History,
  ChevronLeft, ChevronRight, Receipt as ReceiptIcon, Download, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const getApiOrigin = (): string => {
  const base = api.defaults.baseURL ?? "";
  try { return new URL(base).origin; } catch { return ""; }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (n?: number | null) => `₹${Math.round(n ?? 0).toLocaleString()}`;

const fmtPdf = (n?: number | null) => `Rs. ${Math.round(n ?? 0).toLocaleString()}`;

const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const StatusPill = ({ status }: { status: string }) => {
  if (status === "APPROVED")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
};

const ProofThumb = ({ path }: { path?: string }) => {
  if (!path) return <span className="text-xs text-muted-foreground">—</span>;
  const url = `${getApiOrigin()}${path}`;
  const isPdf = path.toLowerCase().endsWith(".pdf");
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
      {isPdf ? <ImageIcon className="h-3.5 w-3.5" /> : (
        <img src={url} alt="proof" className="h-9 w-9 rounded object-cover border" />
      )}
      View proof
    </a>
  );
};

const downloadReceiptPdf = (p: PaymentTransaction) => {
  const receiptNo = `HMS-${String(p.id).padStart(6, "0")}`;
  const period = `${MONTHS[p.rentMonth - 1]} ${p.rentYear}`;

  const pageWidth = 420;
  const pageHeight = 660;
  const marginX = 24;
  const doc = new jsPDF({ unit: "pt", format: [pageWidth, pageHeight] });

  let y = 0;

  doc.setFillColor(15, 17, 23);
  doc.rect(0, 0, pageWidth, 66, "F");

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(marginX, 16, 34, 34, 8, 8, "F");
  doc.setTextColor(96, 165, 250);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("H", marginX + 17, 38, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text("Hostel HMS", marginX + 44, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 185, 195);
  doc.text("Management System", marginX + 44, 41);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 165, 175);
  doc.text("RECEIPT NO.", pageWidth - marginX, 26, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(receiptNo, pageWidth - marginX, 40, { align: "right" });

  y = 66;

  doc.setFillColor(236, 253, 245);
  doc.rect(0, y, pageWidth, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(4, 120, 87);
  doc.text("Payment Verified & Approved", marginX, y + 17);
  y += 26 + 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("AMOUNT PAID", pageWidth / 2, y, { align: "center" });
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 17, 23);
  doc.text(fmtPdf(p.amount), pageWidth / 2, y, { align: "center" });
  y += 16;
  doc.setDrawColor(229, 231, 235);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 30;

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(value, pageWidth - marginX, y, { align: "right" });
    y += 22;
  };

  row("Tenant Name", p.tenantName ?? "—");
  row("Phone Number", p.tenantPhone ?? "—");
  row("Room / Branch", `${p.roomNumber ?? "—"}${p.branchName ? " · " + p.branchName : ""}`);
  row("Billing Period", period);
  row("Payment Mode", p.paymentMode ?? "—");
  row("Transaction / UTR ID", p.transactionId ?? "—");
  row("Submitted On", fmtDateTime(p.submittedAt));
  row("Verified By", p.verifiedByName ?? "—");
  row("Verified On", fmtDateTime(p.verifiedAt));

  y += 8;
  doc.setDrawColor(243, 244, 246);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "This is a system-generated receipt and does not require a signature.",
    pageWidth / 2, y, { align: "center" }
  );

  doc.save(`Receipt_${receiptNo}.pdf`);
};

const ReceiptPreviewDialog = ({
  payment, onClose,
}: { payment: PaymentTransaction | null; onClose: () => void }) => {
  if (!payment) return null;
  const receiptNo = `HMS-${String(payment.id).padStart(6, "0")}`;

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-primary" /> Payment Receipt
          </DialogTitle>
          <DialogDescription>Receipt {receiptNo} · {MONTHS[payment.rentMonth - 1]} {payment.rentYear}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0f1117] text-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-none">Hostel HMS</p>
                <p className="text-[10px] text-white/40 mt-0.5">Management System</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9.5px] uppercase tracking-wide text-white/40">Receipt No.</p>
              <p className="text-xs font-semibold">{receiptNo}</p>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Payment Verified &amp; Approved</span>
          </div>

          <div className="px-5 py-5">
            <div className="text-center pb-4 mb-4 border-b border-dashed">
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Amount Paid</p>
              <p className="text-3xl font-extrabold mt-1">{fmt(payment.amount)}</p>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tenant Name</dt>
                <dd className="font-medium text-right">{payment.tenantName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Phone Number</dt>
                <dd className="font-medium text-right">{payment.tenantPhone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Room / Branch</dt>
                <dd className="font-medium text-right">{payment.roomNumber ?? "—"}{payment.branchName ? ` · ${payment.branchName}` : ""}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Payment Mode</dt>
                <dd className="font-medium">{payment.paymentMode ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Transaction ID</dt>
                <dd className="font-mono text-xs">{payment.transactionId ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Submitted On</dt>
                <dd className="font-medium text-xs">{fmtDateTime(payment.submittedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Verified On</dt>
                <dd className="font-medium text-xs">{fmtDateTime(payment.verifiedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => downloadReceiptPdf(payment)} className="gap-2">
            <Download className="h-4 w-4" /> Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TenantPayments = () => {
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [rents, setRents] = useState<Rent[]>([]);
  const [history, setHistory] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedRentId, setSelectedRentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"CASH" | "UPI">("UPI");
  const [txnId, setTxnId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<PaymentTransaction | null>(null);

  const loadAll = async (tid: number) => {
    setLoading(true);

    const [rentsResult, historyResult] = await Promise.allSettled([
      getTenantRents(tid),
      getTenantPaymentHistory(tid),
    ]);

    if (rentsResult.status === "fulfilled") {
      setRents(rentsResult.value);
    } else {
      console.error("Failed to load rents:", rentsResult.reason);
      toast.error("Failed to load pending dues");
    }

    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
    } else {
      console.error("Failed to load payment history:", historyResult.reason);
      toast.error("Failed to load payment history");
    }

    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const tid = await resolveTenantId();
        if (tid) {
          setTenantId(tid);
          await loadAll(tid);
        }
      } catch {
        toast.error("Could not resolve your tenant profile");
        setLoading(false);
      }
    })();
  }, []);

  const dueRents = useMemo(
    () => rents.filter((r) => (r.pendingAmount ?? 0) > 0),
    [rents]
  );

  const openPay = (rentId?: number) => {
    setSelectedRentId(rentId ? String(rentId) : (dueRents[0] ? String(dueRents[0].id) : ""));
    const target = dueRents.find((r) => r.id === (rentId ?? dueRents[0]?.id));
    setAmount(target ? String(Math.round(target.pendingAmount ?? 0)) : "");
    setMode("UPI");
    setTxnId("");
    setFile(null);
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedRentId) { toast.error("Select which month you're paying for"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!file) { toast.error("Please attach a payment screenshot / receipt"); return; }

    const fd = new FormData();
    fd.append("rentId", selectedRentId);
    fd.append("amount", amount);
    fd.append("paymentMode", mode);
    if (txnId) fd.append("transactionId", txnId);
    fd.append("proof", file);

    setSubmitting(true);
    try {
      await submitPaymentApi(fd);
      toast.success("Payment submitted! It will reflect once your warden/admin verifies it.");
      setPayOpen(false);
      if (tenantId) await loadAll(tenantId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">Pay your rent &amp; EB dues and track your payment history</p>
        </div>
        <Button onClick={() => openPay()} disabled={dueRents.length === 0} className="gap-2">
          <CreditCard className="h-4 w-4" /> Pay Now
        </Button>
      </div>

      {!loading && dueRents.length > 0 && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
            You have {dueRents.length} month{dueRents.length > 1 ? "s" : ""} with dues pending —{" "}
            {fmt(dueRents.reduce((s, r) => s + (r.pendingAmount ?? 0), 0))} total.
          </p>
        </Card>
      )}

      <Card className="p-0 overflow-hidden mb-8">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Pending Dues</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : dueRents.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">You're all caught up — no dues pending</TableCell></TableRow>
            ) : dueRents.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{MONTHS[r.rentMonth - 1]} {r.rentYear}</TableCell>
                <TableCell>{fmt(r.totalAmount)}</TableCell>
                <TableCell className="text-emerald-600">{fmt(r.paidAmount)}</TableCell>
                <TableCell className="text-rose-600 font-semibold">{fmt(r.pendingAmount)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openPay(r.id)}>Pay</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">My Payment History</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Txn ID</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : history.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments submitted yet</TableCell></TableRow>
            ) : history.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{MONTHS[h.rentMonth - 1]} {h.rentYear}</TableCell>
                <TableCell>{fmt(h.amount)}</TableCell>
                <TableCell>{h.paymentMode}</TableCell>
                <TableCell className="font-mono text-xs">{h.transactionId || "—"}</TableCell>
                <TableCell><ProofThumb path={h.proofDocument} /></TableCell>
                <TableCell>
                  <StatusPill status={h.status} />
                  {h.status === "REJECTED" && h.remarks && (
                    <div className="text-xs text-rose-500 mt-1 max-w-[180px]">{h.remarks}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(h.submittedAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {h.status === "APPROVED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setReceiptTarget(h)}
                    >
                      <ReceiptIcon className="h-3.5 w-3.5" /> Receipt
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ReceiptPreviewDialog payment={receiptTarget} onClose={() => setReceiptTarget(null)} />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit a Payment</DialogTitle>
            <DialogDescription>Attach a screenshot or receipt as proof — your warden/admin will verify it.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Which month?</Label>
              <Select value={selectedRentId} onValueChange={(v) => {
                setSelectedRentId(v);
                const target = dueRents.find((r) => String(r.id) === v);
                setAmount(target ? String(Math.round(target.pendingAmount ?? 0)) : "");
              }}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {dueRents.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {MONTHS[r.rentMonth - 1]} {r.rentYear} — due {fmt(r.pendingAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as "CASH" | "UPI")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Transaction / UTR ID (optional)</Label>
              <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. UPI reference number" />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Proof (screenshot / receipt)</Label>
              <label className="flex items-center gap-2 border border-dashed rounded-md px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Click to upload JPG, PNG or PDF (max 10MB)"}
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={submitPayment} disabled={submitting}>{submitting ? "Submitting…" : "Submit Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PAGE_SIZE = 10;

const ApproverPayments = () => {
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const [pending, setPending] = useState<PaymentTransaction[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);

  const [all, setAll] = useState<PaymentTransaction[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allPage, setAllPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<PaymentTransaction | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<PaymentTransaction | null>(null);

  const load = async (pPage = pendingPage, aPage = allPage) => {
    setLoading(true);

    const [pendingResult, allResult] = await Promise.allSettled([
      fetchPendingPayments(pPage, PAGE_SIZE),
      fetchAllPayments(aPage, PAGE_SIZE),
    ]);

    if (pendingResult.status === "fulfilled") {
      setPending(pendingResult.value.content);
      setPendingTotal(pendingResult.value.totalElements);
    } else {
      console.error("Failed to load pending payments:", pendingResult.reason);
      toast.error("Failed to load pending payments");
    }

    if (allResult.status === "fulfilled") {
      setAll(allResult.value.content);
      setAllTotal(allResult.value.totalElements);
    } else {
      console.error("Failed to load all payments:", allResult.reason);
      toast.error("Failed to load payment transactions");
    }

    setLoading(false);
  };

  useEffect(() => { load(0, 0); }, []);

  const approve = async (id: number) => {
    setBusyId(id);
    try {
      await approvePayment(id);
      toast.success("Payment approved and applied to rent");
      await load(pendingPage, allPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to approve payment");
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectPayment(rejectTarget.id, remarks);
      toast.success("Payment rejected");
      setRejectTarget(null);
      setRemarks("");
      await load(pendingPage, allPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to reject payment");
    } finally {
      setBusyId(null);
    }
  };

  const rows = tab === "pending" ? pending : all;
  const total = tab === "pending" ? pendingTotal : allTotal;
  const currentPage = tab === "pending" ? pendingPage : allPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1);
    if (tab === "pending") {
      setPendingPage(clamped);
      load(clamped, allPage);
    } else {
      setAllPage(clamped);
      load(pendingPage, clamped);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Payment Verification</h1>
          <p className="text-sm text-muted-foreground">Review tenant-submitted payments and proof documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "pending" ? "default" : "outline"} size="sm" onClick={() => setTab("pending")}>
            Pending ({pendingTotal})
          </Button>
          <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
            All Transactions ({allTotal})
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Room / Branch</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Txn ID</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                {tab === "pending" ? "No payments awaiting verification" : "No transactions yet"}
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.tenantName}</TableCell>
                <TableCell className="text-muted-foreground">{r.roomNumber ?? "—"} {r.branchName ? `· ${r.branchName}` : ""}</TableCell>
                <TableCell>{MONTHS[r.rentMonth - 1]} {r.rentYear}</TableCell>
                <TableCell className="font-semibold">{fmt(r.amount)}</TableCell>
                <TableCell>{r.paymentMode}</TableCell>
                <TableCell className="font-mono text-xs">{r.transactionId || "—"}</TableCell>
                <TableCell><ProofThumb path={r.proofDocument} /></TableCell>
                <TableCell>
                  <StatusPill status={r.status} />
                  {r.status === "REJECTED" && r.remarks && (
                    <div className="text-xs text-rose-500 mt-1 max-w-[180px]">{r.remarks}</div>
                  )}
                  {r.status === "APPROVED" && r.verifiedByName && (
                    <div className="text-xs text-muted-foreground mt-1">by {r.verifiedByName}</div>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {tab === "pending" ? (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busyId === r.id}
                        onClick={() => approve(r.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busyId === r.id}
                        onClick={() => { setRejectTarget(r); setRemarks(""); }}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  ) : r.status === "APPROVED" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReceiptTarget(r)}>
                      <ReceiptIcon className="h-3.5 w-3.5" /> Receipt
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-muted-foreground">
            <span>
              Page {currentPage + 1} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => goToPage(currentPage - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages - 1}
                onClick={() => goToPage(currentPage + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ReceiptPreviewDialog payment={receiptTarget} onClose={() => setReceiptTarget(null)} />

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Let {rejectTarget?.tenantName} know why this payment couldn't be verified.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason (e.g. amount mismatch, unreadable screenshot)…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={busyId === rejectTarget?.id}>Reject Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PaymentsPage = () => {
  const role = getUserRole();
  if (role === "TENANT") return <TenantPayments />;
  return <ApproverPayments />;
};

export default PaymentsPage;