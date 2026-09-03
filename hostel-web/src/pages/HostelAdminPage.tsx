import { useState, useCallback, useEffect } from "react";
import {
  getAllHostelsWithAdmins, createHostelWithAdmin, updateHostelWithAdmin,
  deleteHostelWithAdmin, updateHostelStatus, fetchAllPages, uploadHostelImages,
} from "@/lib/store";
import api from "@/lib/api";
import { HostelAdmin, HostelAdminRequest } from "@/lib/types";
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
  Wallet, FileText, CheckCircle2, PauseCircle, Ban, User, FileUp, BedDouble,
  Image as ImageIcon, X as XIcon,
} from "lucide-react";

// Minimum number of hostel gallery photos required when creating a hostel.
const MIN_HOSTEL_PHOTOS = 5;

interface CombinedForm {
  name: string; address: string; city: string;
  totalBeds: string; duration: string; document: File | null;
  bedPrice: string;
  adminName: string; adminPhone: string; adminEmail: string;
  photos: File[]; // NEW: hostel gallery images (min MIN_HOSTEL_PHOTOS on create)
}

const EMPTY_FORM: CombinedForm = {
  name: "", address: "", city: "",
  totalBeds: "", duration: "", document: null,
  bedPrice: "",
  adminName: "", adminPhone: "", adminEmail: "",
  photos: [],
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
      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
      padding: "8px 12px", marginTop: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#166534", fontWeight: 600 }}>
        <Wallet size={14} />
        {beds} beds × {formatINR(price)}/bed × {months} mo
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{formatINR(total)}</div>
    </div>
  );
}

// Multi-photo picker used in the Add Hostel modal. Enforces a minimum
// photo count via the caption under the file input (styled
// red/below-min, green/met, matching the existing bed-limit floor
// caption pattern already used in the Edit modal) and renders a
// thumbnail grid with per-photo removal.
function HostelPhotosPicker({
  photos, onChange,
}: { photos: File[]; onChange: (files: File[]) => void }) {
  const previews = photos.map((f) => URL.createObjectURL(f));

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onChange([...photos, ...Array.from(fileList)]);
  };

  const removeAt = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  const belowMin = photos.length < MIN_HOSTEL_PHOTOS;

  return (
    <div>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        multiple
        className="rounded-full"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div style={{
        fontSize: 11, marginTop: 4, fontWeight: 600,
        color: belowMin ? "#ef4444" : "#16a34a",
      }}>
        {photos.length} / {MIN_HOSTEL_PHOTOS} minimum photos selected
        {belowMin ? ` — add ${MIN_HOSTEL_PHOTOS - photos.length} more` : ""}
      </div>

      {previews.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 4, marginTop: 6, maxWidth: 340 }}>
          {previews.map((url, idx) => (
            <div
              key={idx}
              style={{
                position: "relative", aspectRatio: "1", borderRadius: 6,
                overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9",
              }}
            >
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                title="Remove photo"
                style={{
                  position: "absolute", top: 1, right: 1, width: 13, height: 13,
                  borderRadius: "50%", background: "rgba(15,23,42,0.75)", border: "none",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", padding: 0,
                }}
              >
                <XIcon size={8} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const HostelAdminPage = () => {
  const [hostels, setHostels] = useState<HostelAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
      const hList = await fetchAllPages<HostelAdmin>(
        (pg, size) => getAllHostelsWithAdmins(pg, size), 10
      );
      setHostels(hList);
    } catch {
      toast.error("Failed to load hostels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const enrichedHostels: EnrichedHostel[] = hostels.map((h) => {
    const capacityBeds = h.capacityBeds ?? 0;
    const bedPrice = h.bedPrice ?? 0;
    const durationMonths = h.durationMonths ?? 1;

    return {
      ...h,
      activeTenantCount: (h as any).activeTenantCount ?? 0,
      branchCount: h.branchCount ?? 0,
      totalRooms: h.totalRooms ?? 0,
      totalBeds: h.totalBeds ?? 0,
      occupiedBeds: h.occupiedBeds ?? 0,
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
    // Require at least MIN_HOSTEL_PHOTOS hostel gallery photos before creating.
    if (form.photos.length < MIN_HOSTEL_PHOTOS) {
      toast.error(`Please add at least ${MIN_HOSTEL_PHOTOS} hostel photos`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildHostelAdminPayload({
        name: form.name, address: form.address, city: form.city,
        totalBeds: Number(form.totalBeds), durationMonths: Number(form.duration),
        bedPrice: Number(form.bedPrice),
        adminName: form.adminName, adminPhone: form.adminPhone,
        adminEmail: form.adminEmail,
      }, form.document);
      const created = await createHostelWithAdmin(payload);

      // Upload the gallery photos to the hostel that was just created.
      // A failure here doesn't roll back hostel creation — the hostel and
      // admin already exist — so it's surfaced as its own toast rather than
      // thrown, and the admin can add photos later from Edit.
      try {
        await uploadHostelImages((created as any).id, form.photos);
      } catch {
        toast.error("Hostel created, but photo upload failed — you can add photos later from Edit");
      }

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
      photos: [],
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
    // Guard: the bed limit can go UP (52 -> 55) or stay the same, but
    // never DOWN below what's already been committed for this hostel.
    // "Already committed" is the larger of two numbers:
    //   - editHostel.capacityBeds — the bed limit/subscription figure
    //     that was already saved for this hostel (e.g. set to 52 when
    //     it was created), even if no rooms have been built yet.
    //   - editHostel.totalBeds — the ACTUAL beds physically created
    //     across this hostel's rooms, in case that ever exceeds the
    //     saved capacity figure.
    // Using just one of these was the bug: checking only actual room
    // beds let 52 -> 50 through whenever no rooms existed yet, even
    // though the hostel's own bed limit was already 52.
    const existingBedFloor = Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0);
    if (existingBedFloor > 0 && Number(editForm.totalBeds) < existingBedFloor) {
      toast.error(
        `Cannot reduce the bed limit to ${editForm.totalBeds} because ${existingBedFloor} beds have already been created. The bed limit must be at least ${existingBedFloor}.`
      );
      return;
    }
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

      // If new photos were picked in the Edit modal, upload them too —
      // this is additive (appends to the existing gallery), not a
      // required minimum, since the hostel already has photos from
      // creation (or an admin can still be adding its first batch).
      if (editForm.photos.length > 0) {
        try {
          await uploadHostelImages(editHostel.id, editForm.photos);
        } catch {
          toast.error("Hostel updated, but photo upload failed");
        }
      }

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

        /* Modal Rounded & Landscape Layout Styles */
        .h-modal-rounded {
          border-radius: 20px !important;
          overflow: hidden !important;
        }

        .h-landscape-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 6px;
        }

        .h-form-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .h-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #334155;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
        }

        .h-card-inputs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .h-card-inputs .h-full {
          grid-column: span 2;
        }

        .h-card-inputs input,
        .h-card-inputs button[role="combobox"] {
          border-radius: 999px !important;
          background: #ffffff !important;
          height: 34px !important;
          font-size: 12.5px !important;
        }

        @media (max-width: 768px) {
          .h-landscape-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Compact variants — used by both Add and Edit modals so the form
           stays short enough to fit without excess empty space or scroll. */
        .h-landscape-grid-compact {
          gap: 12px;
        }

        .h-form-card-compact {
          padding: 10px;
          gap: 6px;
        }

        .h-form-card-compact .h-card-inputs {
          gap: 6px;
        }

        .h-form-card-compact .h-card-header {
          padding-bottom: 5px;
        }

        @media (max-width: 768px) {
          .h-landscape-grid-compact {
            grid-template-columns: 1fr;
          }
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

          {/* Table View */}
          <div className="h-table-wrap">
            <table className="h-table">
              <thead>
                <tr>
                  <th>Hostel & Location</th>
                  <th>Pricing & Duration</th>
                  <th>Assigned Admin</th>
                  <th>Beds / Capacity</th>
                  <th>Branches & Tenants</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                      Loading hostels...
                    </td>
                  </tr>
                ) : paginatedHostels.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                      No hostels found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedHostels.map((h, idx) => {
                    const iconBg = ["#eff6ff", "#f0fdf4", "#fef3c7"][idx % 3];
                    const iconColor = ["#2563eb", "#16a34a", "#d97706"][idx % 3];
                    return (
                      <tr key={h.id}>
                        <td>
                          <div className="h-cell-hostel">
                            <div className="h-cell-icon" style={{ background: iconBg }}>
                              <Building2 size={20} color={iconColor} />
                            </div>
                            <div>
                              <div className="h-cell-name">{h.name}</div>
                              <div className="h-cell-sub">{h.city} • {h.address}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <PriceBadge bedPrice={h.bedPrice} />
                            <div className="h-cell-sub" style={{ marginTop: 4 }}>
                              {h.durationMonths} month{h.durationMonths === 1 ? "" : "s"} plan
                            </div>
                          </div>
                        </td>
                        <td>
                          <AdminBadge hostel={h} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {h.occupiedBeds} / {h.capacityBeds || h.totalBeds} occupied
                          </div>
                          <div className="h-cell-sub">{h.totalRooms} rooms total</div>
                        </td>
                        <td>
                          <div className="h-cell-tenants">
                            <Users size={14} color="#64748b" />
                            <span>{h.activeTenantCount} Tenants</span>
                          </div>
                          <div className="h-cell-sub">{h.branchCount} branch{h.branchCount === 1 ? "" : "es"}</div>
                        </td>
                        <td>
                          <StatusBadge status={h.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="h-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="h-action-btn"
                              title="View Details"
                              onClick={() => openView(h)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="h-action-btn"
                              title="Edit Hostel"
                              onClick={() => openEdit(h)}
                            >
                              <Pencil size={15} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="h-action-btn"
                                  disabled={statusUpdatingId === h.id}
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {STATUS_ACTIONS.map(action => (
                                  <DropdownMenuItem
                                    key={action.status}
                                    onClick={() => handleStatusChange(h, action.status)}
                                    disabled={h.rawStatus === action.status}
                                  >
                                    <action.icon size={14} style={{ color: action.color, marginRight: 8 }} />
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(h.id)}
                                  style={{ color: "#ef4444" }}
                                >
                                  <Trash2 size={14} style={{ marginRight: 8 }} />
                                  Delete Hostel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="h-pagination">
            <div className="h-page-info">
              Showing <strong>{totalItems === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{" "}
              <strong>{Math.min(page * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> hostels
            </div>
            <div className="h-page-controls">
              <button
                type="button"
                className="h-page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`h-page-btn ${page === pageNum ? "active" : ""}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                className="h-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md h-modal-rounded rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{viewHostel?.name}</DialogTitle>
            <DialogDescription>{viewHostel?.address}, {viewHostel?.city}</DialogDescription>
          </DialogHeader>

          {viewHostel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "12px 0" }}>
              <div className="h-view-row">
                <span className="h-view-label">Status</span>
                <StatusBadge status={viewHostel.status} />
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Price Per Bed</span>
                <span className="h-view-value price">{formatINR(viewHostel.bedPrice)}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Plan Duration</span>
                <span className="h-view-value">{viewHostel.durationMonths} Months</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Bed Capacity / Occupied</span>
                <span className="h-view-value">{viewHostel.occupiedBeds} / {viewHostel.capacityBeds}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Total Projection</span>
                <span className="h-view-value">{formatINR(viewHostel.totalPrice)}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Assigned Admin</span>
                <span className="h-view-value">{viewHostel.adminName || "None"} ({viewHostel.adminEmail || "N/A"})</span>
              </div>
              {viewHostel.documentUrl && (
                <div className="h-view-row">
                  <span className="h-view-label">Registration Document</span>
                  <a
                    href={resolveDocumentUrl(viewHostel.documentUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="h-view-doc-link"
                  >
                    <FileText size={14} /> View File
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modal (Landscape Cards Layout, compact) — Hostel Images sits in
          the LEFT column, stacked under Hostel Details. Uses the same
          "-compact" density classes as the Edit modal so the whole form
          fits in view without excess padding/height. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl h-modal-rounded rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Add Hostel</DialogTitle>
            <DialogDescription>Create a new hostel and its admin in one step</DialogDescription>
          </DialogHeader>

          <div className="h-landscape-grid h-landscape-grid-compact">
            {/* Left Column: Hostel Details + Hostel Images */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Card 1: Hostel Details */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <BedDouble size={14} className="text-blue-600" />
                  <span>Hostel Details</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Hostel Name"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Total Beds *"
                      value={form.totalBeds}
                      onChange={e => setForm(p => ({ ...p, totalBeds: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Address"
                      value={form.address}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select value={form.duration} onValueChange={v => setForm(p => ({ ...p, duration: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Duration *" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.months} value={String(opt.months)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="Price per Bed (₹) *"
                      value={form.bedPrice}
                      onChange={e => setForm(p => ({ ...p, bedPrice: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                </div>
                <TotalPricePreview
                  totalBeds={form.totalBeds}
                  bedPrice={form.bedPrice}
                  durationMonths={form.duration}
                />
              </div>

              {/* Card 4 (moved): Hostel Images — minimum MIN_HOSTEL_PHOTOS required */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <ImageIcon size={14} className="text-blue-600" />
                  <span>Hostel Images</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <HostelPhotosPicker
                      photos={form.photos}
                      onChange={(photos) => setForm(p => ({ ...p, photos }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Admin & Document Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Card 2: Admin Info */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <User size={14} className="text-blue-600" />
                  <span>Admin Information</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Admin Name"
                      value={form.adminName}
                      onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Admin Phone (10 digits)"
                      maxLength={10}
                      value={form.adminPhone}
                      onChange={e => setForm(p => ({ ...p, adminPhone: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="email"
                      placeholder="Admin Email"
                      value={form.adminEmail}
                      onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Document Upload */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <FileUp size={14} className="text-blue-600" />
                  <span>Document Attachment</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="rounded-full"
                      onChange={e => setForm(p => ({ ...p, document: e.target.files?.[0] ?? null }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal (Landscape Cards Layout) — Hostel Images sits in the
          LEFT column, stacked under Hostel Details, matching the Add modal. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl h-modal-rounded rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Edit Hostel</DialogTitle>
            <DialogDescription>Update property details or assigned administrator.</DialogDescription>
          </DialogHeader>

          <div className="h-landscape-grid h-landscape-grid-compact">
            {/* Left Column: Hostel Details + Hostel Images */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Card 1: Hostel Details */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <BedDouble size={14} className="text-blue-600" />
                  <span>Hostel Details</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      placeholder="Hostel Name"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City"
                      value={editForm.city}
                      onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Total Beds *"
                      value={editForm.totalBeds}
                      onChange={e => setEditForm(p => ({ ...p, totalBeds: e.target.value.replace(/\D/g, "") }))}
                    />
                    {editHostel && Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0) > 0 && (() => {
                      const floor = Math.max(editHostel.capacityBeds || 0, editHostel.totalBeds || 0);
                      const belowFloor = editForm.totalBeds !== "" && Number(editForm.totalBeds) < floor;
                      return (
                        <div style={{ fontSize: 11, color: belowFloor ? "#ef4444" : "#94a3b8", marginTop: 4, paddingLeft: 4, fontWeight: belowFloor ? 600 : 400 }}>
                          {belowFloor
                            ? `Can't go below ${floor} — ${floor} beds already created`
                            : `Min ${floor} — already created`}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="h-full">
                    <Input
                      placeholder="Address"
                      value={editForm.address}
                      onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select value={editForm.duration} onValueChange={v => setEditForm(p => ({ ...p, duration: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Duration *" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.months} value={String(opt.months)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="Price per Bed (₹) *"
                      value={editForm.bedPrice}
                      onChange={e => setEditForm(p => ({ ...p, bedPrice: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                </div>
                <TotalPricePreview
                  totalBeds={editForm.totalBeds}
                  bedPrice={editForm.bedPrice}
                  durationMonths={editForm.duration}
                />
              </div>

              {/* Card 4 (moved): Hostel Images — additive, no minimum on edit */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <ImageIcon size={14} className="text-blue-600" />
                  <span>Add More Images</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      multiple
                      className="rounded-full"
                      onChange={e => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length === 0) return;
                        setEditForm(p => ({ ...p, photos: [...p.photos, ...files] }));
                        e.target.value = "";
                      }}
                    />
                    {editForm.photos.length > 0 && (
                      <div style={{ fontSize: 11, color: "#16a34a", marginTop: 6, fontWeight: 600 }}>
                        {editForm.photos.length} new photo{editForm.photos.length === 1 ? "" : "s"} ready to upload
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Admin & Document Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Card 2: Admin Info */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <User size={14} className="text-blue-600" />
                  <span>Admin Information</span>
                </div>
                <div className="h-card-inputs">
                  <div>
                    <Input
                      placeholder="Admin Name"
                      value={editForm.adminName}
                      onChange={e => setEditForm(p => ({ ...p, adminName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Admin Phone"
                      maxLength={10}
                      value={editForm.adminPhone}
                      onChange={e => setEditForm(p => ({ ...p, adminPhone: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="email"
                      placeholder="Admin Email"
                      value={editForm.adminEmail}
                      onChange={e => setEditForm(p => ({ ...p, adminEmail: e.target.value }))}
                    />
                  </div>
                  <div className="h-full">
                    <Input
                      type="password"
                      placeholder="Reset Password (Optional)"
                      value={editForm.adminPassword}
                      onChange={e => setEditForm(p => ({ ...p, adminPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Document Upload */}
              <div className="h-form-card h-form-card-compact">
                <div className="h-card-header">
                  <FileUp size={14} className="text-blue-600" />
                  <span>Document Attachment</span>
                </div>
                <div className="h-card-inputs">
                  <div className="h-full">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="rounded-full"
                      onChange={e => setEditForm(p => ({ ...p, document: e.target.files?.[0] ?? null }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostelAdminPage;