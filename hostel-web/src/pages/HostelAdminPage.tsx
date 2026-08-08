import { useState, useCallback, useEffect } from "react";
import { getAllHostelsWithAdmins, createHostelWithAdmin, updateHostelWithAdmin,
  deleteHostelWithAdmin, updateHostelStatus, fetchTenants, fetchBranches, fetchAllPages,
  fetchRooms, fetchBeds,
} from "@/lib/store";
import api from "@/lib/api";
import { HostelAdmin, HostelAdminRequest, Tenant, Branch, Room, Bed } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Building2, Users, Download, Filter, Plus, Pencil, Trash2, Eye, MoreVertical,
  Search, ChevronRight, ChevronLeft, ChevronDown, RefreshCw, ShieldCheck, ShieldOff,
  Wallet, FileText, BedDouble, DoorOpen, User as UserIcon, CheckCircle2, PauseCircle, Ban,
} from "lucide-react";

interface CombinedForm {
  name: string; address: string; city: string;
  totalBeds: string; duration: string; document: File | null;
  bedPrice: string;
  adminName: string; adminPhone: string; adminEmail: string;
}
const EMPTY_FORM: CombinedForm = {
  name: "", address: "", city: "",
  totalBeds: "", duration: "", document: null,
  bedPrice: "",
  adminName: "", adminPhone: "", adminEmail: "",
};

interface EditCombinedForm extends CombinedForm {
  adminPassword: string;
}
const EMPTY_EDIT_FORM: EditCombinedForm = {
  ...EMPTY_FORM,
  adminPassword: "",
};

const DURATION_OPTIONS: { label: string; months: number }[] = [
  { label: "1 Month",  months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year",   months: 12 },
];

const STATUS_ACTIONS: { status: "ACTIVE" | "INACTIVE" | "SUSPENDED"; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { status: "ACTIVE",    label: "Mark Active",    icon: CheckCircle2, color: "#16a34a" },
  { status: "INACTIVE",  label: "Mark Inactive",  icon: PauseCircle,  color: "#f59e0b" },
  { status: "SUSPENDED", label: "Suspend Hostel", icon: Ban,          color: "#ef4444" },
];

const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const resolveDocumentUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = api.defaults.baseURL || "";
  let origin: string;
  try {
    origin = new URL(base, window.location.origin).origin;
  } catch {
    origin = window.location.origin;
  }
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

function PriceBadge({ bedPrice }: { bedPrice: number }) {
  if (!bedPrice) {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: 6 }}>
        No Price Set
      </span>
    );
  }
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", padding: "4px 10px", borderRadius: 6 }}>
      {formatINR(bedPrice)}/bed
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isAct = status === "Active";
  const isSus = status === "Suspended";
  const color = isAct ? "#16a34a" : isSus ? "#ef4444" : "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{status}</span>
    </div>
  );
}

type EnrichedHostel = Omit<HostelAdmin, "status"> & {
  activeTenantCount: number;
  branchCount: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  capacityBeds: number;
  bedPrice: number;
  durationMonths: number;
  totalPrice: number;
  status: string;
  rawStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  city: string;
};

function AdminBadge({ hostel }: { hostel: EnrichedHostel }) {
  if (!hostel.adminId) {
    return <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No admin assigned</span>;
  }
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
        {hostel.adminName || hostel.adminEmail}
        {hostel.adminActive
          ? <ShieldCheck size={13} color="#16a34a" />
          : <ShieldOff size={13} color="#ef4444" />}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{hostel.adminEmail}</div>
    </div>
  );
}

const normalizeHostelStatus = (status?: string | null): string | undefined => {
  if (!status) return undefined;
  switch (status.toUpperCase()) {
    case "ACTIVE":    return "Active";
    case "INACTIVE":  return "Inactive";
    case "SUSPENDED": return "Suspended";
    default:          return status;
  }
};

const toRawHostelStatus = (status?: string | null): "ACTIVE" | "INACTIVE" | "SUSPENDED" => {
  const upper = (status || "").toUpperCase();
  if (upper === "INACTIVE" || upper === "SUSPENDED") return upper;
  return "ACTIVE";
};

function buildHostelAdminPayload(
  base: Omit<HostelAdminRequest, "document">,
  document: File | null
): HostelAdminRequest | FormData {
  if (!document) return base;
  const fd = new FormData();
  Object.entries(base).forEach(([key, value]) => {
    if (value !== undefined && value !== null) fd.append(key, String(value));
  });
  fd.append("document", document);
  return fd;
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map(row => row.map(csvEscape).join(","));
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function TotalPricePreview({ totalBeds, bedPrice, durationMonths }: {
  totalBeds: string; bedPrice: string; durationMonths: string;
}) {
  const beds = Number(totalBeds) || 0;
  const price = Number(bedPrice) || 0;
  const months = Number(durationMonths) || 1;
  if (!beds || !price) return null;
  const total = beds * price * months;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
      padding: "10px 12px", marginTop: -4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#166534", fontWeight: 600 }}>
        <Wallet size={14} />
        {beds} beds × {formatINR(price)}/bed × {months} month{months === 1 ? "" : "s"}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{formatINR(total)}</div>
    </div>
  );
}

const HostelAdminPage = () => {
  const [hostels, setHostels] = useState<HostelAdmin[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  const [bedDetailsOpen, setBedDetailsOpen] = useState(false);
  const [bedDetailsHostel, setBedDetailsHostel] = useState<EnrichedHostel | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [showFilters, setShowFilters] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CombinedForm>(EMPTY_FORM);
  const [editHostel, setEditHostel] = useState<EnrichedHostel | null>(null);
  const [editForm, setEditForm] = useState<EditCombinedForm>(EMPTY_EDIT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewHostel, setViewHostel] = useState<EnrichedHostel | null>(null);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const err = (e: any, fallback: string) =>
    toast.error(e?.response?.data?.message || e?.message || fallback);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hList, tList, bList, rList, bedList] = await Promise.all([
        fetchAllPages<HostelAdmin>((pg, size) => getAllHostelsWithAdmins(pg, size), 10).catch(() => []),
        fetchAllPages<Tenant>((pg, size) => fetchTenants(pg, size), 10).catch(() => []),
        fetchAllPages<Branch>((pg, size) => fetchBranches(pg, size), 10).catch(() => []),
        fetchAllPages<Room>((pg, size) => fetchRooms(pg, size), 10).catch(() => []),
        fetchAllPages<Bed>((pg, size) => fetchBeds(pg, size), 10).catch(() => []),
      ]);
      setHostels(hList);
      setTenants(tList);
      setBranches(bList);
      setRooms(rList);
      setBeds(bedList);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeTenants = tenants.filter(t => t.status === "Active");

  // NOTE: totalRooms / totalBeds / occupiedBeds are computed locally by
  // joining branches -> rooms -> beds (same pattern as getHostelHierarchy
  // below), rather than trusting HostelAdmin.totalRooms / totalBeds /
  // occupiedBeds from the backend. Those backend-computed fields were not
  // being populated by getAllHostelsWithAdmins, which caused the
  // "0/0 Beds · 0 Rooms" display even for hostels with branches and tenants.
  const enrichedHostels: EnrichedHostel[] = hostels.map((h) => {
    const hostelActiveTenants = activeTenants.filter(t =>
      (t as any).hostelId === h.id || (t as any).hostelName === h.name);

    const hostelBranches = branches.filter(b =>
      (b as any).hostelId === h.id || (b as any).hostelName === h.name);

    const branchIds = new Set(hostelBranches.map(b => b.id));
    const hostelRooms = rooms.filter(r => branchIds.has(r.unitId));
    const roomIds = new Set(hostelRooms.map(r => r.id));
    const hostelBeds = beds.filter(bd => roomIds.has(bd.roomId));

    const capacityBeds = h.capacityBeds ?? 0;
    const bedPrice = h.bedPrice ?? 0;
    const durationMonths = h.durationMonths ?? 1;

    return {
      ...h,
      activeTenantCount: hostelActiveTenants.length,
      branchCount: hostelBranches.length,
      totalRooms: hostelRooms.length,
      totalBeds: hostelBeds.length,
      occupiedBeds: hostelBeds.filter(bd => bd.isOccupied).length,
      capacityBeds,
      bedPrice,
      durationMonths,
      totalPrice: capacityBeds * bedPrice * durationMonths,
      status: normalizeHostelStatus(h.status) || "Active",
      rawStatus: toRawHostelStatus(h.status),
      city: h.city || "—",
    };
  });

  const filteredHostels = enrichedHostels.filter(h => {
    if (searchTerm &&
        !h.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(h.adminName || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(h.adminEmail || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== "All Status" && h.status !== statusFilter) return false;
    if (cityFilter !== "All Cities" && h.city !== cityFilter) return false;
    return true;
  });

  const totalItems = filteredHostels.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedHostels = filteredHostels.slice((page - 1) * pageSize, page * pageSize);

  const cities = Array.from(new Set(enrichedHostels.map(h => h.city).filter(c => c && c !== "—")));

  const handleExport = useCallback(() => {
    if (filteredHostels.length === 0) {
      toast.error("No hostels to export — adjust your filters and try again");
      return;
    }
    const headers = [
      "Hostel Name", "Address", "City", "Price/Bed", "Duration (Months)", "Bed Capacity", "Total Beds", "Total Price",
      "Admin Name", "Admin Email", "Admin Phone", "Admin Active",
      "Status", "Branches", "Tenants", "Rooms", "Occupied Beds",
    ];
    const rows = filteredHostels.map(h => [
      h.name,
      h.address || "",
      h.city === "—" ? "" : h.city,
      h.bedPrice,
      h.durationMonths,
      h.capacityBeds,
      h.totalBeds,
      h.totalPrice,
      h.adminName || "",
      h.adminEmail || "",
      h.adminPhone || "",
      h.adminId ? (h.adminActive ? "Yes" : "No") : "",
      h.status,
      h.branchCount,
      h.activeTenantCount,
      h.totalRooms,
      h.occupiedBeds,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`hostels-admins-${stamp}.csv`, headers, rows);
    toast.success(`Exported ${filteredHostels.length} hostel${filteredHostels.length === 1 ? "" : "s"}`);
  }, [filteredHostels]);

  const handleAdd = async () => {
    if (!form.name.trim())         { toast.error("Hostel name required"); return; }
    if (!form.address.trim())      { toast.error("Address required"); return; }
    if (!form.city.trim())         { toast.error("City required"); return; }
    if (!form.totalBeds || Number(form.totalBeds) <= 0) { toast.error("Total beds required"); return; }
    if (!form.duration)            { toast.error("Duration required"); return; }
    if (!form.bedPrice || Number(form.bedPrice) <= 0) { toast.error("Price per bed is required"); return; }
    if (!form.adminName.trim())    { toast.error("Admin name required"); return; }
    if (!/^\d{10}$/.test(form.adminPhone)) { toast.error("Admin phone must be 10 digits"); return; }
    if (!form.adminEmail.trim())   { toast.error("Admin email required"); return; }
    setSubmitting(true);
    try {
      const payload = buildHostelAdminPayload({
        name: form.name, address: form.address, city: form.city,
        totalBeds: Number(form.totalBeds), durationMonths: Number(form.duration),
        bedPrice: Number(form.bedPrice),
        adminName: form.adminName, adminPhone: form.adminPhone,
        adminEmail: form.adminEmail,
      }, form.document);
      await createHostelWithAdmin(payload);
      toast.success("Hostel created — login details emailed to the admin");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      loadData();
    } catch (e: any) { err(e, "Create failed"); }
    finally { setSubmitting(false); }
  };

  const openEdit = (h: EnrichedHostel) => {
    setEditHostel(h);
    setEditForm({
      name: h.name, address: h.address, city: h.city || "",
      totalBeds: h.capacityBeds ? String(h.capacityBeds) : "",
      duration: h.durationMonths ? String(h.durationMonths) : "",
      document: null,
      bedPrice: h.bedPrice ? String(h.bedPrice) : "",
      adminName: h.adminName || "", adminPhone: h.adminPhone || "", adminEmail: h.adminEmail || "",
      adminPassword: "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editHostel) return;
    if (!editForm.name.trim())    { toast.error("Hostel name required"); return; }
    if (!editForm.address.trim()) { toast.error("Address required"); return; }
    if (!editForm.city.trim())    { toast.error("City required"); return; }
    if (!editForm.totalBeds || Number(editForm.totalBeds) <= 0) { toast.error("Total beds required"); return; }
    if (!editForm.duration)       { toast.error("Duration required"); return; }
    if (!editForm.bedPrice || Number(editForm.bedPrice) <= 0) { toast.error("Price per bed is required"); return; }
    if (!editForm.adminName.trim()) { toast.error("Admin name required"); return; }
    if (!/^\d{10}$/.test(editForm.adminPhone)) { toast.error("Admin phone must be 10 digits"); return; }
    if (!editForm.adminEmail.trim()) { toast.error("Admin email required"); return; }
    setSubmitting(true);
    try {
      const payload = buildHostelAdminPayload({
        name: editForm.name, address: editForm.address, city: editForm.city,
        totalBeds: Number(editForm.totalBeds), durationMonths: Number(editForm.duration),
        bedPrice: Number(editForm.bedPrice),
        adminName: editForm.adminName, adminPhone: editForm.adminPhone,
        adminEmail: editForm.adminEmail,
        adminPassword: editForm.adminPassword || undefined,
      }, editForm.document);
      await updateHostelWithAdmin(editHostel.id, payload);
      toast.success("Hostel updated");
      setEditOpen(false);
      setEditHostel(null);
      loadData();
    } catch (e: any) { err(e, "Update failed"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHostelWithAdmin(id);
      toast.success("Hostel deleted");
      loadData();
    } catch (e: any) { err(e, "Delete failed — a hostel with branches assigned to it cannot be deleted"); }
  };

  const handleStatusChange = async (h: EnrichedHostel, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") => {
    if (h.rawStatus === status) return;
    setStatusUpdatingId(h.id);
    try {
      await updateHostelStatus(h.id, status);
      toast.success(`${h.name} marked ${normalizeHostelStatus(status)}`);
      loadData();
    } catch (e: any) {
      err(e, "Failed to update hostel status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openView = (h: EnrichedHostel) => { setViewHostel(h); setViewOpen(true); };

  const openBedDetails = (h: EnrichedHostel) => { setBedDetailsHostel(h); setBedDetailsOpen(true); };

  const getHostelHierarchy = (h: EnrichedHostel) => {
    const hostelBranches = branches.filter(b =>
      (b as any).hostelId === h.id || (b as any).hostelName === h.name);

    return hostelBranches.map(branch => {
      const branchRooms = rooms.filter(r => r.unitId === branch.id);
      const roomsWithBeds = branchRooms.map(room => {
        const roomBeds = beds.filter(bd => bd.roomId === room.id);
        const bedsWithTenant = roomBeds.map(bed => {
          const tenant = tenants.find(t => t.bedId === bed.id && t.status === "Active");
          return { bed, tenant };
        });
        return { room, beds: bedsWithTenant };
      });
      return { branch, rooms: roomsWithBeds };
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .h-wrap { font-family: 'Inter', sans-serif; min-height: 100%; color: #0f172a; }
        .h-panel { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); overflow: hidden; }
        .h-panel-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .h-panel-title { font-size: 18px; font-weight: 700; }
        .h-panel-actions { display: flex; align-items: center; gap: 10px; }
        .h-btn-outline { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .h-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
        .h-btn-outline.active { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
        .h-btn-primary { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 999px; background: #3b82f6; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; }
        .h-btn-primary:hover { background: #2563eb; }
        .h-filters { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; background: #fff; }
        .h-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .h-search-box { flex: 1; min-width: 260px; height: 38px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; display: flex; align-items: center; padding: 0 16px; gap: 8px; }
        .h-search-box input { border: none; outline: none; width: 100%; font-size: 13px; font-family: inherit; color: #0f172a; }
        .h-search-box input::placeholder { color: #94a3b8; }
        .h-filter-select { height: 38px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; padding: 0 16px; font-size: 13px; font-weight: 500; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; min-width: 130px; }
        .h-filter-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-left: 2px; }
        .h-clear-filters { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 13px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; font-family: inherit; }
        .h-clear-filters:hover { color: #0f172a; }
        .h-table-wrap { width: 100%; overflow-x: auto; }
        .h-table { width: 100%; border-collapse: collapse; min-width: 950px; }
        .h-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #fff; }
        .h-table td { padding: 16px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .h-table tr:last-child td { border-bottom: none; }
        .h-table tr:hover td { background: #f8fafc; }
        .h-cell-hostel { display: flex; align-items: center; gap: 14px; }
        .h-cell-icon { width: 40px; height: 40px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .h-cell-name { font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 2px; }
        .h-cell-sub { font-size: 12px; color: #94a3b8; }
        .h-cell-tenants { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 13px; }
        .h-actions { display: flex; align-items: center; gap: 6px; }
        .h-action-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; padding: 0; }
        .h-action-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
        .h-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .h-pagination { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 0 0 16px 16px; }
        .h-page-info { font-size: 13px; color: #64748b; }
        .h-page-info strong { color: #0f172a; }
        .h-page-controls { display: flex; align-items: center; gap: 8px; }
        .h-page-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748b; transition: all 0.2s; padding: 0; }
        .h-page-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .h-page-btn.active { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; font-weight: 600; }
        .h-page-btn[style*="auto"] { border-radius: 999px; }
        .h-view-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .h-view-label { font-size: 12px; color: #94a3b8; font-weight: 600; }
        .h-view-value { font-size: 13px; color: #0f172a; font-weight: 500; }
        .h-view-value.price { color: #16a34a; font-weight: 700; }
        .h-view-doc-link { font-size: 13px; font-weight: 600; color: #2563eb; display: flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: none; }
        .h-view-doc-link:hover { text-decoration: underline; }
        .h-form-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin: 14px 0 6px; grid-column: 1 / -1; }
        .h-form-section:first-child { margin-top: 0; }
        .h-required { color: #ef4444; margin-left: 2px; }
        .h-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
        .h-form-grid .h-span-2 { grid-column: 1 / -1; }
        .h-form-grid input, .h-form-grid button[role="combobox"] { border-radius: 999px !important; }
        @media (max-width: 640px) {
          .h-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="h-wrap">
        <div className="h-panel">
          <div className="h-panel-header">
            <div className="h-panel-title">All Hostels</div>
            <div className="h-panel-actions">
              <button
                type="button"
                className={`h-btn-outline ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(v => !v)}
                aria-pressed={showFilters}
                title={showFilters ? "Hide filters" : "Show filters"}
              >
                <Filter size={16} /> Filter
              </button>
              <button type="button" className="h-btn-outline" onClick={handleExport}>
                <Download size={16} /> Export
              </button>
              <button type="button" className="h-btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add Hostel
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="h-filters">
              <div className="h-search-box">
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search hostels or admins..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>

              <div className="h-filter-group">
                <div className="h-filter-label">Status</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="h-filter-select">
                      {statusFilter} <ChevronDown size={14} color="#94a3b8" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["All Status", "Active", "Inactive", "Suspended"].map(s => (
                      <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="h-filter-group">
                <div className="h-filter-label">City</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="h-filter-select">
                      {cityFilter} <ChevronDown size={14} color="#94a3b8" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["All Cities", ...cities].map(c => (
                      <DropdownMenuItem key={c} onClick={() => { setCityFilter(c!); setPage(1); }}>{c}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button type="button" className="h-clear-filters" onClick={() => {
                setSearchTerm(""); setStatusFilter("All Status"); setCityFilter("All Cities"); setPage(1);
              }}>
                <RefreshCw size={14} /> Clear Filters
              </button>
            </div>
          )}

          <div className="h-table-wrap">
            <table className="h-table">
              <thead>
                <tr>
                  <th>Hostel</th>
                  <th>City</th>
                  <th>Price/Bed</th>
                  <th>Admin</th>
                  <th>Branch/Tenant/Bed/Room</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                      <RefreshCw className="animate-spin mx-auto text-slate-400" size={24} />
                      <div className="text-slate-500 mt-2 text-sm">Loading hostels...</div>
                    </td>
                  </tr>
                ) : paginatedHostels.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      No hostels found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedHostels.map((h, idx) => (
                    <tr key={h.id}>
                      <td>
                        <div className="h-cell-hostel">
                          <div className="h-cell-icon" style={{
                            background: idx % 3 === 0 ? "#eff6ff" : idx % 3 === 1 ? "#f0fdf4" : "#f5f3ff",
                            color: idx % 3 === 0 ? "#3b82f6" : idx % 3 === 1 ? "#22c55e" : "#8b5cf6"
                          }}>
                            <Building2 size={18} />
                          </div>
                          <div>
                            <div className="h-cell-name">{h.name}</div>
                            <div className="h-cell-sub">{h.address || "No address provided"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{h.city}</td>
                      <td>
                        <PriceBadge bedPrice={h.bedPrice} />
                        {h.totalPrice > 0 && (
                          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 4 }}>
                            Total: {formatINR(h.totalPrice)}
                          </div>
                        )}
                      </td>
                      <td><AdminBadge hostel={h} /></td>
                      <td>
                        <div
                          onClick={() => openBedDetails(h)}
                          title="Click to view branch, room & bed details"
                          style={{ display: "flex", flexDirection: "column", gap: 2, cursor: "pointer" }}
                        >
                          <div className="h-cell-tenants">
                            <Building2 size={16} color="#94a3b8" />
                            <span>{h.branchCount} Branch{h.branchCount === 1 ? "" : "es"}</span>
                          </div>
                          <div className="h-cell-tenants">
                            <Users size={16} color="#94a3b8" />
                            <span>{h.activeTenantCount} Tenant{h.activeTenantCount === 1 ? "" : "s"}</span>
                          </div>
                          <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dotted" }}>
                            {h.occupiedBeds}/{h.totalBeds} Beds · {h.totalRooms} Room{h.totalRooms === 1 ? "" : "s"}
                          </span>
                        </div>
                      </td>
                      <td><StatusBadge status={h.status} /></td>
                      <td>
                        <div className="h-actions">
                          <button type="button" className="h-action-btn" title="View" onClick={() => openView(h)}>
                            <Eye size={14} color="#64748b" />
                          </button>
                          <button type="button" className="h-action-btn" title="Edit" onClick={() => openEdit(h)}>
                            <Pencil size={14} color="#64748b" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="h-action-btn"
                                title="More"
                                disabled={statusUpdatingId === h.id}
                              >
                                {statusUpdatingId === h.id
                                  ? <RefreshCw size={14} className="animate-spin" color="#64748b" />
                                  : <MoreVertical size={14} color="#64748b" />}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_ACTIONS.filter(a => a.status !== h.rawStatus).map(a => {
                                const Icon = a.icon;
                                return (
                                  <DropdownMenuItem key={a.status} onClick={() => handleStatusChange(h, a.status)}>
                                    <Icon size={14} className="mr-2" style={{ color: a.color }} /> {a.label}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(h.id)}>
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="h-pagination">
            <div className="h-page-info">
              Showing <strong>{paginatedHostels.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> hostels
            </div>
            <div className="h-page-controls">
              <button type="button" className="h-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`h-page-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))}
              <button type="button" className="h-page-btn" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="h-page-btn" style={{ width: "auto", padding: "0 10px", borderRadius: 999 }}>
                    {pageSize} / page <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[10, 20, 50].map(s => (
                    <DropdownMenuItem key={s} onClick={() => { setPageSize(s); setPage(1); }}>{s} / page</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setViewHostel(null); }}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Hostel &amp; Admin Details</DialogTitle>
            <DialogDescription>Read-only summary</DialogDescription>
          </DialogHeader>
          {viewHostel && (
            <div className="pt-1 max-h-[60vh] overflow-y-auto pr-1">
              <div className="h-form-section">Hostel</div>
              <div className="h-view-row"><span className="h-view-label">Name</span><span className="h-view-value">{viewHostel.name}</span></div>
              <div className="h-view-row"><span className="h-view-label">Address</span><span className="h-view-value">{viewHostel.address || "—"}</span></div>
              <div className="h-view-row"><span className="h-view-label">City</span><span className="h-view-value">{viewHostel.city || "—"}</span></div>
              <div className="h-view-row"><span className="h-view-label">Status</span><span className="h-view-value">{normalizeHostelStatus(viewHostel.status)}</span></div>
              <div className="h-view-row"><span className="h-view-label">Branches</span><span className="h-view-value">{viewHostel.branchCount ?? 0}</span></div>
              <div className="h-view-row"><span className="h-view-label">Bed Capacity</span><span className="h-view-value">{viewHostel.capacityBeds ?? "—"}</span></div>
              <div className="h-view-row"><span className="h-view-label">Rooms / Beds</span><span className="h-view-value">{viewHostel.totalRooms ?? 0} Rooms · {viewHostel.occupiedBeds ?? 0}/{viewHostel.totalBeds ?? 0} Beds</span></div>
              <div className="h-view-row">
                <span className="h-view-label">Price / Bed</span>
                <span className="h-view-value">
                  {viewHostel.bedPrice ? `${formatINR(viewHostel.bedPrice)}/bed` : "No price set"}
                </span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Duration</span>
                <span className="h-view-value">
                  {viewHostel.durationMonths} month{viewHostel.durationMonths === 1 ? "" : "s"}
                </span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Total Price</span>
                <span className="h-view-value price">
                  {viewHostel.bedPrice ? formatINR(viewHostel.totalPrice) : "—"}
                </span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Document</span>
                {viewHostel.documentUrl ? (
                  <a
                    href={resolveDocumentUrl(viewHostel.documentUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-view-doc-link"
                  >
                    <FileText size={13} /> View Document
                  </a>
                ) : (
                  <span className="h-view-value" style={{ color: "#94a3b8" }}>No document uploaded</span>
                )}
              </div>
              <div className="h-form-section">Admin</div>
              {viewHostel.adminId ? (
                <>
                  <div className="h-view-row"><span className="h-view-label">Name</span><span className="h-view-value">{viewHostel.adminName || "—"}</span></div>
                  <div className="h-view-row"><span className="h-view-label">Email</span><span className="h-view-value">{viewHostel.adminEmail}</span></div>
                  <div className="h-view-row"><span className="h-view-label">Phone</span><span className="h-view-value">{viewHostel.adminPhone || "—"}</span></div>
                  <div className="h-view-row"><span className="h-view-label">Active</span><span className="h-view-value">{viewHostel.adminActive ? "Yes" : "No"}</span></div>
                </>
              ) : (
                <div style={{ padding: "8px 0", color: "#94a3b8", fontSize: 13 }}>No admin assigned yet.</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setViewOpen(false); if (viewHostel) openEdit(viewHostel); }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bedDetailsOpen} onOpenChange={(open) => { setBedDetailsOpen(open); if (!open) setBedDetailsHostel(null); }}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{bedDetailsHostel?.name} — Branches, Rooms &amp; Beds</DialogTitle>
            <DialogDescription>
              {bedDetailsHostel?.branchCount ?? 0} branch{(bedDetailsHostel?.branchCount ?? 0) === 1 ? "" : "es"} · {bedDetailsHostel?.occupiedBeds ?? 0}/{bedDetailsHostel?.totalBeds ?? 0} beds occupied
            </DialogDescription>
          </DialogHeader>
          {bedDetailsHostel && (() => {
            const hierarchy = getHostelHierarchy(bedDetailsHostel);
            if (hierarchy.length === 0) {
              return (
                <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No branches found under this hostel yet.
                </div>
              );
            }
            return (
              <div className="max-h-[65vh] overflow-y-auto pr-1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {hierarchy.map(({ branch, rooms: branchRooms }) => (
                  <div key={branch.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
                    }}>
                      <Building2 size={15} color="#3b82f6" />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>{branch.unitName}</span>
                      {branch.location && (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>· {branch.location}</span>
                      )}
                    </div>

                    {branchRooms.length === 0 ? (
                      <div style={{ padding: "12px 14px", fontSize: 12.5, color: "#94a3b8" }}>
                        No rooms created under this branch yet.
                      </div>
                    ) : (
                      <div style={{ padding: "8px 14px" }}>
                        {branchRooms.map(({ room, beds: roomBeds }) => (
                          <div key={room.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <DoorOpen size={13} color="#64748b" />
                              <span style={{ fontWeight: 600, fontSize: 12.5, color: "#334155" }}>
                                Room {room.roomNumber}
                              </span>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                ({room.hostelType}{room.flatName ? ` · ${room.flatName}` : ""})
                              </span>
                            </div>

                            {roomBeds.length === 0 ? (
                              <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 19 }}>No beds created in this room.</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 19 }}>
                                {roomBeds.map(({ bed, tenant }) => (
                                  <div key={bed.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                    <BedDouble size={13} color={bed.isOccupied ? "#16a34a" : "#94a3b8"} />
                                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Bed {bed.bedNumber}</span>
                                    {tenant ? (
                                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a" }}>
                                        <UserIcon size={12} /> {tenant.name}
                                        {tenant.phone && (
                                          <span style={{ color: "#64748b", fontWeight: 500 }}>· {tenant.phone}</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Vacant</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBedDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="sm:max-w-[720px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Hostel</DialogTitle>
            <DialogDescription>Create a new hostel and its admin in one step</DialogDescription>
          </DialogHeader>
          <div className="h-form-grid max-h-[65vh] overflow-y-auto pr-1">
            <div className="h-form-section">Hostel</div>
            <Input placeholder="Hostel Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input
              type="number"
              min={1}
              placeholder="Total Beds *"
              value={form.totalBeds}
              onChange={(e) => setForm({ ...form, totalBeds: e.target.value.replace(/\D/g, "") })}
            />
            <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
              <SelectTrigger><SelectValue placeholder="Duration *" /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(o => (
                  <SelectItem key={o.months} value={String(o.months)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min={1}
              required
              placeholder="Price per Bed (₹) *"
              value={form.bedPrice}
              onChange={(e) => setForm({ ...form, bedPrice: e.target.value.replace(/\D/g, "") })}
            />
            <div className="h-span-2">
              <TotalPricePreview totalBeds={form.totalBeds} bedPrice={form.bedPrice} durationMonths={form.duration} />
            </div>

            <div className="h-span-2">
              <label className="h-form-section" style={{ display: "block", marginBottom: 6, marginTop: 0 }}>Document</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ borderRadius: 999 }}
                onChange={(e) => setForm({ ...form, document: e.target.files?.[0] ?? null })}
              />
              {form.document && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{form.document.name}</div>
              )}
            </div>

            <div className="h-form-section">Admin</div>
            <Input placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            <Input placeholder="Admin Phone (10 digits)" value={form.adminPhone} maxLength={10} onChange={(e) => setForm({ ...form, adminPhone: e.target.value.replace(/\D/g, "") })} />
            <Input placeholder="Admin Email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="rounded-full">Cancel</Button></DialogClose>
            <Button onClick={handleAdd} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditHostel(null); }}>
        <DialogContent className="sm:max-w-[720px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Hostel</DialogTitle>
            <DialogDescription>Update details</DialogDescription>
          </DialogHeader>
          {editHostel && (
            <div className="h-form-grid max-h-[65vh] overflow-y-auto pr-1">
              <div className="h-form-section">Hostel</div>
              <Input placeholder="Hostel Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Input placeholder="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              <Input placeholder="City" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              <Input
                type="number"
                min={1}
                placeholder="Total Beds *"
                value={editForm.totalBeds}
                onChange={(e) => setEditForm({ ...editForm, totalBeds: e.target.value.replace(/\D/g, "") })}
              />
              <Select value={editForm.duration} onValueChange={(v) => setEditForm({ ...editForm, duration: v })}>
                <SelectTrigger><SelectValue placeholder="Duration *" /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(o => (
                    <SelectItem key={o.months} value={String(o.months)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                required
                placeholder="Price per Bed (₹) *"
                value={editForm.bedPrice}
                onChange={(e) => setEditForm({ ...editForm, bedPrice: e.target.value.replace(/\D/g, "") })}
              />
              <div className="h-span-2">
                <TotalPricePreview totalBeds={editForm.totalBeds} bedPrice={editForm.bedPrice} durationMonths={editForm.duration} />
              </div>

              <div className="h-span-2">
                <label className="h-form-section" style={{ display: "block", marginBottom: 6, marginTop: 0 }}>
                  Document {editHostel?.documentUrl && <span style={{ fontWeight: 400, color: "#94a3b8" }}>(leave blank to keep current)</span>}
                </label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{ borderRadius: 999 }}
                  onChange={(e) => setEditForm({ ...editForm, document: e.target.files?.[0] ?? null })}
                />
                {editForm.document && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{editForm.document.name}</div>
                )}
              </div>

              <div className="h-form-section">Admin</div>
              <Input placeholder="Admin Name" value={editForm.adminName} onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })} />
              <Input placeholder="Admin Phone (10 digits)" value={editForm.adminPhone} maxLength={10} onChange={(e) => setEditForm({ ...editForm, adminPhone: e.target.value.replace(/\D/g, "") })} />
              <Input placeholder="Admin Email" value={editForm.adminEmail} onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostelAdminPage;