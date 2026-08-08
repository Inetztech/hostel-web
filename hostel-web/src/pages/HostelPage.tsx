import { useState, useCallback, useEffect } from "react";
import { fetchAllPages, getHostels, createHostel, updateHostel, deleteHostel, fetchTenants, fetchBranches } from "@/lib/store";
import { Hostel, HostelRequest, Tenant, Branch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Building2, Users, Download, Filter, Plus, Pencil, Trash2, Eye, MoreVertical,
  Search, ChevronRight, ChevronLeft, ChevronDown, AlertCircle, BedDouble, RefreshCw
} from "lucide-react";

/* ── Types ──
   FIX: `city` was missing from HostelForm even though the backend's
   Hostel entity has a `city` column and HostelRequest already declares
   `city?: string`. The Add/Edit dialogs simply never rendered a field
   for it, so it was never sent — city stayed NULL/blank on every hostel
   created or edited through the UI. Added below. */
interface HostelForm {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}
const EMPTY_FORM: HostelForm = { name: "", address: "", city: "", phone: "", email: "" };

function PlanBadge({ plan }: { plan: string }) {
  const color = plan === "Enterprise" ? "#8b5cf6" : plan === "Professional" ? "#3b82f6" : "#22c55e";
  const bg    = plan === "Enterprise" ? "#f5f3ff" : plan === "Professional" ? "#eff6ff" : "#f0fdf4";
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: "4px 10px", borderRadius: 6 }}>
      {plan}
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

// FIX: the backend's HostelStatus enum is uppercase ("ACTIVE" / "INACTIVE" /
// "SUSPENDED"), but the stat-card counts and status filter below compared
// against title-case strings ("Active" / "Inactive" / "Suspended"). Since
// the raw uppercase value never matched, Active/Inactive/Suspended Hostels
// always showed 0 even though every hostel really was Active. Normalize
// once here and reuse everywhere status is read or displayed.
const normalizeHostelStatus = (status?: string | null): string | undefined => {
  if (!status) return undefined;
  switch (status.toUpperCase()) {
    case "ACTIVE":    return "Active";
    case "INACTIVE":  return "Inactive";
    case "SUSPENDED": return "Suspended";
    default:          return status;
  }
};

const HostelPage = () => {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [cityFilter, setCityFilter] = useState("All Cities");

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<HostelForm>(EMPTY_FORM);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);

  // ── View (read-only) hostel dialog — powers the Eye action button.
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHostel, setViewHostel] = useState<any | null>(null);

  const err = (e: any, fallback: string) =>
    toast.error(e?.response?.data?.message || e?.message || fallback);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hList, tList, bList] = await Promise.all([
        fetchAllPages<Hostel>((pg, size) => getHostels(pg, size), 10).catch(() => []),
        fetchAllPages<Tenant>((pg, size) => fetchTenants(pg, size), 10).catch(() => []),
        fetchAllPages<Branch>((pg, size) => fetchBranches(pg, size), 10).catch(() => []),
      ]);
      setHostels(hList);
      setTenants(tList);
      setBranches(bList);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Computed Data ── */
  const activeTenants = tenants.filter(t => t.status === "Active");

  const enrichedHostels = hostels.map((h, i) => {
    const hostelActiveTenants = activeTenants.filter(t => {
      return (t as any).hostelId === h.id || (t as any).hostelName === h.name;
    });

    // Mock fields for UI fidelity
    const plans = ["Enterprise", "Professional", "Professional", "Starter", "Starter"];
    const statuses = ["Active", "Active", "Active", "Inactive", "Suspended"];

    // FIX: `capacity` used to be fabricated as max(tenantCount, tenantCount*1.2)
    // — a number derived from the tenant count itself, not real room/bed data.
    // For 1 tenant that formula rounds right back to 1, which is why the table
    // showed "1 / 1" and looked like "1 room, fully occupied" by coincidence.
    // Now both numbers come straight from the backend's real Bed records
    // (Hostel -> Branch -> Room -> Bed), so this reflects actual capacity.
    const totalBeds = (h as any).totalBeds ?? 0;
    const occupiedBeds = (h as any).occupiedBeds ?? 0;
    const totalRooms = (h as any).totalRooms ?? 0; // NEW — real room count per hostel

    // FIX: previously guessed city from the address string (or a mock
    // rotating list) whenever `(h as any).city` was undefined — which was
    // ALWAYS, because the backend response wasn't including the real
    // `city` column. That guess (h.address.split(" ")[0]) is why the City
    // column was silently showing the address instead of the real city.
    // Now we trust the backend value only, and show "—" if it's genuinely
    // missing, so a backend fix is immediately visible instead of masked.
    const city = (h as any).city || "—";

    return {
      ...h,
      activeTenantCount: hostelActiveTenants.length,
      totalRooms,
      totalBeds,
      occupiedBeds,
      plan: (h as any).planName || (h as any).plan || plans[i % plans.length],
      status: normalizeHostelStatus((h as any).status) || statuses[i % statuses.length],
      city,
    };
  });

  // Filtering
  const filteredHostels = enrichedHostels.filter(h => {
    if (searchTerm && !h.name.toLowerCase().includes(searchTerm.toLowerCase()) && !h.address?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== "All Status" && h.status !== statusFilter) return false;
    if (planFilter !== "All Plans" && h.plan !== planFilter) return false;
    if (cityFilter !== "All Cities" && h.city !== cityFilter) return false;
    return true;
  });

  // Pagination
  const totalItems = filteredHostels.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedHostels = filteredHostels.slice((page - 1) * pageSize, page * pageSize);

  // Stats
  const activeCount = enrichedHostels.filter(h => h.status === "Active").length;
  const inactiveCount = enrichedHostels.filter(h => h.status === "Inactive").length;
  const suspendedCount = enrichedHostels.filter(h => h.status === "Suspended").length;

  /* ── CRUD Handlers ── */
  const handleAdd = async () => {
    if (!form.name.trim())    { toast.error("Hostel name required"); return; }
    if (!form.address.trim()) { toast.error("Address required"); return; }
    try {
      await createHostel(form as HostelRequest);
      toast.success("Hostel created");
      setForm(EMPTY_FORM);
      setAddOpen(false);
      loadData();
    } catch (e: any) { err(e, "Create failed"); }
  };

  const handleEdit = async () => {
    if (!editHostel) return;
    try {
      await updateHostel(editHostel.id, {
        name:    editHostel.name,
        address: editHostel.address,
        city:    (editHostel as any).city ?? "",
        phone:   editHostel.phone ?? "",
        email:   editHostel.email ?? "",
      } as HostelRequest);
      toast.success("Hostel updated");
      setEditOpen(false);
      setEditHostel(null);
      loadData();
    } catch (e: any) { err(e, "Update failed"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHostel(id);
      toast.success("Hostel deleted");
      loadData();
    } catch (e: any) { err(e, "Delete failed — a hostel with branches assigned to it cannot be deleted"); }
  };

  // Opens the read-only summary dialog for a hostel — the Eye action.
  const openView = (h: any) => {
    setViewHostel(h);
    setViewOpen(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .h-wrap { font-family: 'Inter', sans-serif; min-height: 100%; color: #0f172a; }
        
        /* Breadcrumbs & Title */
        .h-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .h-title { font-size: 24px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 12px; }
        .h-breadcrumbs { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 4px; font-weight: 500; }
        
        /* Stats Grid */
        .h-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
        @media(max-width:1100px) { .h-stats { grid-template-columns: repeat(3, 1fr); } }
        @media(max-width:768px) { .h-stats { grid-template-columns: repeat(2, 1fr); } }
        .h-stat-card { background: #fff; border-radius: 14px; padding: 18px 20px; border: 1px solid #e8ecf0; box-shadow: 0 1px 4px rgba(0,0,0,.04); display: flex; align-items: center; gap: 14px; transition: box-shadow .2s; }
        .h-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .h-stat-val { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1; }
        .h-stat-label { font-size: 12px; color: #94a3b8; font-weight: 500; margin-bottom: 2px; }
        .h-stat-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

        /* Main Panel */
        .h-panel { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); overflow: hidden; }
        
        /* Panel Header */
        .h-panel-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .h-panel-title { font-size: 18px; font-weight: 700; }
        .h-panel-actions { display: flex; align-items: center; gap: 10px; }
        .h-btn-outline { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .h-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
        .h-btn-primary { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 8px; background: #3b82f6; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; }
        .h-btn-primary:hover { background: #2563eb; }

        /* Filters */
        .h-filters { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; background: #fff; }
        .h-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .h-search-box { flex: 1; min-width: 260px; height: 38px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; padding: 0 12px; gap: 8px; }
        .h-search-box input { border: none; outline: none; width: 100%; font-size: 13px; font-family: inherit; color: #0f172a; }
        .h-search-box input::placeholder { color: #94a3b8; }
        .h-filter-select { height: 38px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 0 12px; font-size: 13px; font-weight: 500; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; min-width: 130px; }
        .h-filter-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-left: 2px; }
        .h-clear-filters { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 13px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; font-family: inherit; }
        .h-clear-filters:hover { color: #0f172a; }

        /* Table */
        .h-table-wrap { width: 100%; overflow-x: auto; }
        .h-table { width: 100%; border-collapse: collapse; min-width: 850px; }
        .h-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #fff; }
        .h-table td { padding: 16px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .h-table tr:last-child td { border-bottom: none; }
        .h-table tr:hover td { background: #f8fafc; }

        /* Table Cells */
        .h-cell-hostel { display: flex; align-items: center; gap: 14px; }
        .h-cell-icon { width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .h-cell-name { font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 2px; }
        .h-cell-sub { font-size: 12px; color: #94a3b8; }
        .h-cell-tenants { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 13px; }
        
        /* Actions — padding:0 + explicit svg rules so the icon can never
           collapse to zero size or get swallowed by inherited styles. */
        .h-actions { display: flex; align-items: center; gap: 6px; }
        .h-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; padding: 0; }
        .h-action-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }

        /* Pagination — same icon-collapse fix as .h-action-btn above.
           FIX: the prev/next chevron buttons had no svg protection rule
           (display:block/flex-shrink:0), so the ChevronLeft/ChevronRight
           icons were being collapsed to zero size by the button's flex
           layout, rendering as empty boxes instead of "< 1 2 >". */
        .h-pagination { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 0 0 16px 16px; }
        .h-page-info { font-size: 13px; color: #64748b; }
        .h-page-info strong { color: #0f172a; }
        .h-page-controls { display: flex; align-items: center; gap: 8px; }
        .h-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748b; transition: all 0.2s; padding: 0; }
        .h-page-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .h-page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .h-page-btn.active { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; font-weight: 600; }
        .h-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .h-page-size { display: flex; align-items: center; gap: 8px; height: 32px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; color: #64748b; background: #fff; cursor: pointer; margin-left: 8px; }
        .h-view-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .h-view-row:last-child { border-bottom: none; }
        .h-view-label { font-size: 12px; color: #94a3b8; font-weight: 600; }
        .h-view-value { font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; }
      `}</style>

      <div className="h-wrap">
        {/* ── Stat Cards ── */}
        <div className="h-stats">
          <div className="h-stat-card">
            <div className="h-stat-icon" style={{ background: "#eef2ff" }}>
              <Building2 size={24} color="#6366f1" />
            </div>
            <div>
              <div className="h-stat-label">Total Hostels</div>
              <div className="h-stat-val">{enrichedHostels.length}</div>
              <div className="h-stat-sub">Active Hostels</div>
            </div>
          </div>
          
          <div className="h-stat-card">
            <div className="h-stat-icon" style={{ background: "#f0fdf4" }}>
              <Users size={24} color="#22c55e" />
            </div>
            <div>
              <div className="h-stat-label">Active Hostels</div>
              <div className="h-stat-val">{activeCount}</div>
              <div className="h-stat-sub">Operational</div>
            </div>
          </div>

          <div className="h-stat-card">
            <div className="h-stat-icon" style={{ background: "#fffbeb" }}>
              <AlertCircle size={24} color="#f59e0b" />
            </div>
            <div>
              <div className="h-stat-label">Inactive Hostels</div>
              <div className="h-stat-val">{inactiveCount}</div>
              <div className="h-stat-sub">Not Operational</div>
            </div>
          </div>

          <div className="h-stat-card">
            <div className="h-stat-icon" style={{ background: "#fef2f2" }}>
              <Users size={24} color="#ef4444" />
            </div>
            <div>
              <div className="h-stat-label">Suspended Hostels</div>
              <div className="h-stat-val">{suspendedCount}</div>
              <div className="h-stat-sub">Suspended</div>
            </div>
          </div>

          <div className="h-stat-card">
            <div className="h-stat-icon" style={{ background: "#f0f9ff" }}>
              <BedDouble size={24} color="#0ea5e9" />
            </div>
            <div>
              <div className="h-stat-label">Total Tenants</div>
              <div className="h-stat-val">{activeTenants.length.toLocaleString()}</div>
              <div className="h-stat-sub">Across All Hostels</div>
            </div>
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="h-panel">
          
          {/* Header */}
          <div className="h-panel-header">
            <div className="h-panel-title">All Hostels</div>
            <div className="h-panel-actions">
              <button type="button" className="h-btn-outline"><Filter size={16} /> Filter</button>
              <button type="button" className="h-btn-outline"><Download size={16} /> Export</button>
              <button type="button" className="h-btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add New Hostel
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="h-filters">
            <div className="h-search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search hostels..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>{s}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="h-filter-group">
              <div className="h-filter-label">Plan</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="h-filter-select">
                    {planFilter} <ChevronDown size={14} color="#94a3b8" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {["All Plans", "Enterprise", "Professional", "Starter"].map(p => (
                    <DropdownMenuItem key={p} onClick={() => setPlanFilter(p)}>{p}</DropdownMenuItem>
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
                  {["All Cities", "Bangalore", "Hyderabad", "Chennai", "Pune", "Delhi", "Ahmedabad", "Kochi"].map(c => (
                    <DropdownMenuItem key={c} onClick={() => setCityFilter(c)}>{c}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button type="button" className="h-clear-filters" onClick={() => {
              setSearchTerm(""); setStatusFilter("All Status"); setPlanFilter("All Plans"); setCityFilter("All Cities");
            }}>
              <RefreshCw size={14} /> Clear Filters
            </button>
          </div>

          {/* Table — "Added On" column removed per request */}
          <div className="h-table-wrap">
            <table className="h-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>City</th>
                  <th>Plan</th>
                  <th>Tenant / Room / Bed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                      <RefreshCw className="animate-spin mx-auto text-slate-400" size={24} />
                      <div className="text-slate-500 mt-2 text-sm">Loading hostels...</div>
                    </td>
                  </tr>
                ) : paginatedHostels.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
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
                      <td><PlanBadge plan={h.plan} /></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div className="h-cell-tenants">
                            <Users size={16} color="#94a3b8" />
                            <span>{h.activeTenantCount} Tenant{h.activeTenantCount === 1 ? "" : "s"}</span>
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {h.totalRooms} Room{h.totalRooms === 1 ? "" : "s"} · {h.occupiedBeds}/{h.totalBeds} Beds
                          </span>
                        </div>
                      </td>
                      <td><StatusBadge status={h.status} /></td>
                      <td>
                        <div className="h-actions">
                          <button type="button" className="h-action-btn" title="View" onClick={() => openView(h)}>
                            <Eye size={14} color="#64748b" />
                          </button>
                          <button type="button" className="h-action-btn" title="Edit" onClick={() => { setEditHostel({ ...h, status: h.status as Hostel["status"] }); setEditOpen(true); }}>
                            <Pencil size={14} color="#64748b" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="h-action-btn" title="More">
                                <MoreVertical size={14} color="#64748b" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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

          {/* Pagination */}
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
                  <button type="button" className="h-page-size">
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

      {/* View Dialog (read-only) — powers the Eye action button */}
      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setViewHostel(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hostel Details</DialogTitle>
            <DialogDescription>Read-only summary</DialogDescription>
          </DialogHeader>
          {viewHostel && (
            <div className="pt-1">
              <div className="h-view-row">
                <span className="h-view-label">Name</span>
                <span className="h-view-value">{viewHostel.name}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Address</span>
                <span className="h-view-value">{viewHostel.address || "—"}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">City</span>
                <span className="h-view-value">{viewHostel.city}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Phone</span>
                <span className="h-view-value">{viewHostel.phone || "—"}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Email</span>
                <span className="h-view-value">{viewHostel.email || "—"}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Plan</span>
                <span className="h-view-value">{viewHostel.plan}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Status</span>
                <span className="h-view-value">{viewHostel.status}</span>
              </div>
              <div className="h-view-row">
                <span className="h-view-label">Rooms / Beds</span>
                <span className="h-view-value">{viewHostel.totalRooms} Rooms · {viewHostel.occupiedBeds}/{viewHostel.totalBeds} Beds</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => { setViewOpen(false); setEditHostel(viewHostel); setEditOpen(true); }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog — City field added below Address */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Hostel</DialogTitle>
            <DialogDescription>Create a new hostel</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Hostel Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input placeholder="Contact Phone (10 digits)" value={form.phone} maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} />
            <Input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog — City field added below Address */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditHostel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hostel</DialogTitle>
            <DialogDescription>Update hostel details</DialogDescription>
          </DialogHeader>
          {editHostel && (
            <div className="space-y-3">
              <Input placeholder="Hostel Name" value={editHostel.name} onChange={(e) => setEditHostel({ ...editHostel, name: e.target.value })} />
              <Input placeholder="Address" value={editHostel.address || ""} onChange={(e) => setEditHostel({ ...editHostel, address: e.target.value })} />
              <Input placeholder="City" value={(editHostel as any).city || ""} onChange={(e) => setEditHostel({ ...editHostel, city: e.target.value } as any)} />
              <Input placeholder="Contact Phone (10 digits)" value={editHostel.phone || ""} maxLength={10} onChange={(e) => setEditHostel({ ...editHostel, phone: e.target.value.replace(/\D/g, "") })} />
              <Input placeholder="Email (optional)" value={editHostel.email || ""} onChange={(e) => setEditHostel({ ...editHostel, email: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostelPage;