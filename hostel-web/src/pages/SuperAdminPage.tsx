// src/pages/SuperAdminPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createAdmin, getAllAdmins, deleteAdmin, activateAdmin, deactivateAdmin,
  updateAdmin, getAllHostelsWithAdmins, fetchAllPages, fetchTenants,
  fetchBranches,
} from "@/lib/store";
import { Admin, Hostel, HostelAdmin, Tenant, Branch, Plan, SubscriptionSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ShieldCheck, ShieldOff, Search, Eye,
  Building2, Users, UserCheck, IndianRupee, Crown,
  TrendingUp, CalendarDays, ChevronRight, Zap, RefreshCw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ExtendedAdminRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  hostelId: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const base: React.CSSProperties = {
    width: 36, height: 36, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  if (type === "hostel") return <div style={{ ...base, background: "#eff6ff" }}><Building2 size={15} color="#3b82f6" /></div>;
  if (type === "admin")  return <div style={{ ...base, background: "#f5f3ff" }}><Users size={15} color="#8b5cf6" /></div>;
  if (type === "sub")    return <div style={{ ...base, background: "#ecfdf5" }}><Crown size={15} color="#10b981" /></div>;
  return <div style={{ ...base, background: "#fff7ed" }}><Zap size={15} color="#f97316" /></div>;
}

function SubStatusBadge({ status }: { status: string }) {
  if (status === "Active")
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>Active</span>;
  if (status === "Expiring Soon")
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#fff7ed", color: "#ea580c" }}>Expiring Soon</span>;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#fef2f2", color: "#dc2626" }}>Expired</span>;
}

function SkeletonCard() {
  return (
    <div className="sa-card" style={{ gap: 8 }}>
      <div style={{ height: 12, width: "60%", background: "#f1f5f9", borderRadius: 6 }} />
      <div style={{ height: 28, width: "40%", background: "#e2e8f0", borderRadius: 6, margin: "4px 0" }} />
      <div style={{ height: 10, width: "50%", background: "#f1f5f9", borderRadius: 6 }} />
      <div style={{ height: 10, width: "35%", background: "#f0fdf4", borderRadius: 6, marginTop: 6 }} />
    </div>
  );
}

// ── Rupee formatter ────────────────────────────────────────────────────────
function formatINR(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(1)}L`;
  if (amount >= 1_000)     return `₹${amount.toLocaleString("en-IN")}`;
  return `₹${amount}`;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const isAdminsView = location.pathname === "/super-admin/admins";

  // ── Dashboard data ─────────────────────────────────────────────────────
  // NOTE: typed as HostelAdmin[] (not Hostel[]) because getAllHostelsWithAdmins
  // returns the merged hostel+admin shape — including adminPhone, which is
  // the real source of truth for the "Phone" column below (Hostel.phone is
  // usually empty; the phone number lives on the admin/user record).
  const [hostels, setHostels]   = useState<HostelAdmin[]>([]);
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Admin management state ─────────────────────────────────────────────
  const [admins,     setAdmins]     = useState<any[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminPage,  setAdminPage]  = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any | null>(null);
  const [form, setForm] = useState<ExtendedAdminRequest>({ email: "", password: "", name: "", phone: "", hostelId: null });
  const [hostelSearch, setHostelSearch] = useState("");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<any | null>(null);

  // NOTE: Plan assignment (Select-based picker) is temporarily disabled.
  // `getPlans` and `assignHostelPlan` are not wired up to the store yet, so
  // `plans` is intentionally left as an empty array and the plan column /
  // dialog field render as READ-ONLY text instead of an editable <Select>.
  // This avoids calling an undefined `handleAssignPlan` handler.
  const [plans] = useState<Plan[]>([]);
  const [assigningPlan] = useState(false);

  // ── Load all dashboard stats ───────────────────────────────────────────
  // NOTE: Hostels are now loaded via getAllHostelsWithAdmins — the SAME
  // endpoint the Hostels & Admins page uses. Previously this called the
  // legacy getHostels() endpoint, which was returning a different (and
  // incomplete) hostel list than the Hostels & Admins screen. That caused
  // "Total Hostels" and "Monthly Revenue" here to disagree with the real
  // totals shown on /super-admin/hostels (e.g. showing ₹50,000 instead of
  // the correct ₹75,000 across all hostels). Using the same source keeps
  // both screens in sync.
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [hList, tList, sSummary] = await Promise.allSettled([
        fetchAllPages<HostelAdmin>((pg, size) => getAllHostelsWithAdmins(pg, size), 50),
        fetchAllPages<Tenant>((pg, size) => fetchTenants(pg, size), 100),
        fetchAllPages<Branch>((pg, size) => fetchBranches(pg, size), 50),
      ]);
      if (hList.status === "fulfilled") setHostels(hList.value);
      if (tList.status === "fulfilled") setTenants(tList.value);
    } catch {
      // individual errors surfaced via allSettled above
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load admins (paginated) ────────────────────────────────────────────
  const loadAdmins = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await getAllAdmins(adminPage, 10);
      setAdmins(res.content);
      setAdminTotal(res.totalElements);
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setAdminLoading(false);
    }
  }, [adminPage]);

  // ── Load plans (once — cheap, rarely changes, needed by the admin dialog) ──
  // const loadPlans = useCallback(async () => {
  //   try {
  //     const res = await getPlans(0, 100);
  //     setPlans(res.content);
  //   } catch {
  //     // silent: the plan picker just shows "No plans created yet" if this fails
  //   }
  // }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadAdmins(); }, [loadAdmins]);
  // useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { if (!dialogOpen) setHostelSearch(""); }, [dialogOpen]);

  // ── Computed stats ─────────────────────────────────────────────────────
  const activeHostels  = hostels.filter(h => (h as any).active !== false);
  const activeTenants  = tenants.filter(t => t.status === "Active");

  // Monthly Revenue is computed the same way the Hostels & Admins page
  // computes each row's "Total Price" — capacityBeds * bedPrice, summed
  // across every hostel — so the dashboard card and the per-hostel totals
  // always match, now that both screens read hostels from the same
  // getAllHostelsWithAdmins endpoint.
  const monthlyRevenue = hostels.reduce((sum, h) => {
    const capacityBeds = (h as any).capacityBeds ?? 0;
    const bedPrice = (h as any).bedPrice ?? 0;
    return sum + capacityBeds * bedPrice;
  }, 0);

  // Active admins count from the already-fetched first page (total gives real count)
  const activeAdminCount = adminTotal;

  // Top hostels by occupancy — group tenants by hostelId via branch
  // Map hostel → branches → count active tenants
  const branchByHostelId: Record<number, Branch[]> = {};
  branches.forEach(b => {
    if (b.hostelId != null) {
      (branchByHostelId[b.hostelId] ||= []).push(b);
    }
  });

  // Need rooms data for capacity; use tenants per hostel as approximation
  const hostelOccupancyList = hostels
    .map(h => {
      const hostelBranchIds = (branchByHostelId[h.id] || []).map(b => b.id);
      const hostelActiveTenants = activeTenants.filter(t => {
        return (t as any).hostelId === h.id || (t as any).hostelName === h.name;
      });
      const totalCapacity = hostelActiveTenants.length > 0
        ? Math.max(hostelActiveTenants.length, Math.round(hostelActiveTenants.length * (100 / 80)))
        : null;
      return {
        ...h,
        activeTenantCount: hostelActiveTenants.length,
        totalCapacity,
      };
    })
    .filter(h => h.activeTenantCount > 0 || hostels.length <= 10)
    .sort((a, b) => b.activeTenantCount - a.activeTenantCount)
    .slice(0, 5);

  const subscriptionRows = hostels.slice(0, 5).map(h => ({
    id: h.id,
    hostel: h.name,
    plan: (h as any).planName || "No Plan",
    status: (h as any).planName ? "Active" : "Unassigned",
  }));

  const recentActivity = [
    ...admins.slice(0, 3).map((a, i) => ({
      id: `admin-${a.id}`,
      icon: "admin" as const,
      text: `Admin "${a.name || a.email}" ${i === 0 ? "recently added" : "account active"}`,
      time: "Recently",
    })),
    ...hostels.slice(0, 2).map((h) => ({
      id: `hostel-${h.id}`,
      icon: "hostel" as const,
      text: `Hostel "${h.name}" registered`,
      time: "Active",
    })),
  ].slice(0, 5);

  // ── Admin dialog helpers ───────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm({ email: "", password: "", name: "", phone: "", hostelId: null });
    setDialogOpen(true);
  };

  const openEdit = (admin: any) => {
    setEditTarget(admin);
    setForm({ email: admin.email, password: "", name: admin.name || "", phone: admin.phone || "", hostelId: admin.hostelId ?? null });
    setDialogOpen(true);
  };

  const openView = (admin: any) => {
    setViewTarget(admin);
    setViewDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.hostelId) { toast.error("Please select a hostel"); return; }
    try {
      if (editTarget) { await updateAdmin(editTarget.id, form); toast.success("Admin updated"); }
      else { await createAdmin(form); toast.success("Admin created"); }
      setDialogOpen(false);
      loadAdmins();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Operation failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this admin?")) return;
    try { await deleteAdmin(id); toast.success("Admin deleted"); loadAdmins(); }
    catch { toast.error("Delete failed"); }
  };

  const handleToggle = async (admin: Admin) => {
    try {
      if (admin.active) { await deactivateAdmin(admin.id); toast.success("Admin deactivated"); }
      else { await activateAdmin(admin.id); toast.success("Admin activated"); }
      loadAdmins();
    } catch { toast.error("Toggle failed"); }
  };

  // Plan assignment is currently READ-ONLY (see `plans` state note above).
  // The handler + its backend call (assignHostelPlan) are disabled until the
  // store wiring is restored. Both Select-based plan pickers that used to
  // call this have been replaced with plain read-only text elsewhere in
  // this file, so nothing references handleAssignPlan anymore.
  // const handleAssignPlan = async (hostelId: number, planId: number) => {
  //   const target = plans.find(p => p.id === planId);
  //   if (!target) return;
  //   setAssigningPlan(true);
  //   const prevHostels = hostels;
  //   setHostels(hs => hs.map(h => h.id === hostelId ? { ...h, planId, planName: target.name } as HostelAdmin : h));
  //   try {
  //     await assignHostelPlan(hostelId, planId);
  //     toast.success(`Plan set to ${target.name}`);
  //   } catch (e: any) {
  //     setHostels(prevHostels); // rollback on failure
  //     toast.error(e?.response?.data?.message || "Failed to assign plan");
  //   } finally {
  //     setAssigningPlan(false);
  //   }
  // };

  const filteredHostels = hostels.filter(h => h.name.toLowerCase().includes(hostelSearch.toLowerCase()));
  const selectedHostel = hostels.find(h => h.id === form.hostelId);

  const viewHostel = viewTarget?.hostelId != null ? hostels.find(h => h.id === viewTarget.hostelId) : undefined;
  const viewPlanName = (viewHostel as any)?.planName ?? null;

  // ══════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .sa-wrap { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100%; }
        .sa-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 20px; }
        .sa-date { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; font-weight: 500; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px; background: #fff; }
        .sa-refresh-btn { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #64748b; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px; background: #fff; cursor: pointer; transition: all .15s; font-family: 'Inter', sans-serif; }
        .sa-refresh-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #374151; }
        .sa-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-bottom: 20px; }
        @media(max-width:1100px){ .sa-stats { grid-template-columns: repeat(3,1fr); } }
        @media(max-width:700px){ .sa-stats { grid-template-columns: repeat(2,1fr); } }
        .sa-card { background: #fff; border-radius: 14px; border: 1px solid #e8ecf0; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.04); transition: box-shadow .2s, transform .15s; }
        .sa-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
        .sa-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .sa-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sa-card-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
        .sa-card-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 2px; }
        .sa-card-sub { font-size: 11px; color: #94a3b8; }
        .sa-card-growth { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #10b981; margin-top: 8px; }
        .sa-card-growth span { color: #94a3b8; font-weight: 400; }
        .sa-two-col { display: grid; grid-template-columns: 1fr 360px; gap: 16px; margin-bottom: 20px; }
        @media(max-width:960px){ .sa-two-col { grid-template-columns: 1fr; } }
        .sa-panel { background: #fff; border-radius: 14px; border: 1px solid #e8ecf0; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: hidden; }
        .sa-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f1f5f9; }
        .sa-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .sa-view-all { font-size: 12px; font-weight: 600; color: #6366f1; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 3px; font-family: 'Inter', sans-serif; padding: 0; }
        .sa-view-all:hover { text-decoration: underline; }
        .sa-occ-table { width: 100%; border-collapse: collapse; }
        .sa-occ-table thead tr th { padding: 10px 20px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .sa-occ-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background .12s; }
        .sa-occ-table tbody tr:last-child { border-bottom: none; }
        .sa-occ-table tbody tr:hover { background: #f8fafc; }
        .sa-occ-table tbody td { padding: 12px 20px; vertical-align: middle; }
        .sa-hostel-name { font-size: 13px; font-weight: 600; color: #1e293b; }
        .sa-hostel-loc  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .sa-hostel-row-icon { width: 30px; height: 30px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sa-active-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 600; }
        .sa-occ-footer { padding: 12px 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
        .sa-occ-footer strong { color: #6366f1; }
        .sa-activity-list { padding: 8px 0; }
        .sa-activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; transition: background .12s; border-bottom: 1px solid #f8fafc; }
        .sa-activity-item:last-child { border-bottom: none; }
        .sa-activity-item:hover { background: #f8fafc; }
        .sa-activity-text { font-size: 12.5px; font-weight: 500; color: #1e293b; line-height: 1.45; }
        .sa-activity-time { font-size: 11px; color: #94a3b8; margin-top: 3px; }
        .sa-sub-table { width: 100%; border-collapse: collapse; }
        .sa-sub-table thead tr th { padding: 10px 20px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .sa-sub-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background .12s; }
        .sa-sub-table tbody tr:last-child { border-bottom: none; }
        .sa-sub-table tbody tr:hover { background: #f8fafc; }
        .sa-sub-table tbody td { padding: 14px 20px; font-size: 13px; color: #1e293b; vertical-align: middle; }
        .sa-admin-panel { background: #fff; border-radius: 14px; border: 1px solid #e8ecf0; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: hidden; }
        .sa-admin-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #f1f5f9; }
        .sa-admin-table { width: 100%; border-collapse: collapse; }
        .sa-admin-table thead tr th { padding: 10px 20px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .sa-admin-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background .12s; }
        .sa-admin-table tbody tr:hover { background: #f8fafc; }
        .sa-admin-table tbody td { padding: 13px 20px; font-size: 13px; color: #1e293b; vertical-align: middle; }
        .sa-admin-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #f1f5f9; background: #fafafa; font-size: 12px; color: #64748b; }
        .sa-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e8ecf0; background: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .12s; padding: 0; }
        .sa-icon-btn svg { display: block; flex-shrink: 0; pointer-events: none; }
        .sa-icon-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .sa-icon-btn.danger:hover { background: #fef2f2; border-color: #fca5a5; }
        .sa-skeleton-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .sa-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; color: #94a3b8; font-size: 13px; gap: 8px; }
        .sa-plan-trigger { height: 28px; font-size: 11px; border-radius: 7px; }
        .sa-view-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .sa-view-row:last-child { border-bottom: none; }
        .sa-view-label { font-size: 12px; color: #94a3b8; font-weight: 600; }
        .sa-view-value { font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; }
      `}</style>

      <div className="sa-wrap">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="sa-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sa-date">
              <CalendarDays size={13} />
              {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </div>
            {!isAdminsView && (
              <button type="button" className="sa-refresh-btn" onClick={loadStats} disabled={statsLoading}>
                <RefreshCw size={13} style={{ animation: statsLoading ? "spin 1s linear infinite" : "none" }} />
                {statsLoading ? "Loading…" : "Refresh"}
              </button>
            )}
          </div>
          {!isAdminsView && (
            <button
              type="button"
              className="sa-view-all"
              style={{ fontSize: 13, padding: "7px 14px", border: "1px solid #e0e7ff", borderRadius: 8, background: "#eef2ff", color: "#4f46e5" }}
              onClick={() => navigate("/super-admin/hostels")}
            >
              Manage Admins <ChevronRight size={13} />
            </button>
          )}
          {isAdminsView && (
            <button
              type="button"
              className="sa-view-all"
              style={{ fontSize: 13, padding: "7px 14px", border: "1px solid #e0e7ff", borderRadius: 8, background: "#eef2ff", color: "#4f46e5" }}
              onClick={() => navigate("/super-admin")}
            >
              ← Back to Dashboard
            </button>
          )}
        </div>

        {/* ════════════════ DASHBOARD VIEW ══════════════════════════════ */}
        {!isAdminsView && (
          <>
            {/* ── Stat Cards ─────────────────────────────────────────── */}
            <div className="sa-stats">
              {statsLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  {/* Total Hostels */}
                  <div className="sa-card">
                    <div className="sa-card-top">
                      <div>
                        <div className="sa-card-label">Total Hostels</div>
                        <div className="sa-card-value">{hostels.length}</div>
                        <div className="sa-card-sub">Active Hostels</div>
                      </div>
                      <div className="sa-card-icon" style={{ background: "#eff6ff" }}>
                        <Building2 size={20} color="#3b82f6" />
                      </div>
                    </div>
                    <div className="sa-card-growth">
                      <TrendingUp size={12} />
                      Live Data
                    </div>
                  </div>

                  {/* Total Admins */}
                  <div className="sa-card">
                    <div className="sa-card-top">
                      <div>
                        <div className="sa-card-label">Total Admins</div>
                        <div className="sa-card-value">{adminTotal}</div>
                        <div className="sa-card-sub">Active Admins</div>
                      </div>
                      <div className="sa-card-icon" style={{ background: "#f5f3ff" }}>
                        <Users size={20} color="#8b5cf6" />
                      </div>
                    </div>
                    <div className="sa-card-growth">
                      <TrendingUp size={12} />
                      Live Data
                    </div>
                  </div>

                  {/* Total Tenants */}
                  <div className="sa-card">
                    <div className="sa-card-top">
                      <div>
                        <div className="sa-card-label">Total Tenants</div>
                        <div className="sa-card-value">{activeTenants.length.toLocaleString()}</div>
                        <div className="sa-card-sub">Across All Hostels</div>
                      </div>
                      <div className="sa-card-icon" style={{ background: "#f0fdf4" }}>
                        <UserCheck size={20} color="#10b981" />
                      </div>
                    </div>
                    <div className="sa-card-growth">
                      <TrendingUp size={12} />
                      Live Data
                    </div>
                  </div>

                  {/* Monthly Revenue */}
                  <div className="sa-card">
                    <div className="sa-card-top">
                      <div>
                        <div className="sa-card-label">Monthly Revenue</div>
                        <div className="sa-card-value" style={{ fontSize: monthlyRevenue >= 1_000 ? 20 : 28 }}>
                          {monthlyRevenue > 0 ? formatINR(monthlyRevenue) : `₹0`}
                        </div>
                        <div className="sa-card-sub">Total Collections</div>
                      </div>
                      <div className="sa-card-icon" style={{ background: "#fff7ed" }}>
                        <IndianRupee size={20} color="#f97316" />
                      </div>
                    </div>
                    <div className="sa-card-growth">
                      <TrendingUp size={12} />
                      {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </div>
                  </div>

                  {/* Active Branches */}
                  <div className="sa-card">
                    <div className="sa-card-top">
                      <div>
                        <div className="sa-card-label">Total Branches</div>
                        <div className="sa-card-value">{branches.length}</div>
                        <div className="sa-card-sub">Across Hostels</div>
                      </div>
                      <div className="sa-card-icon" style={{ background: "#faf5ff" }}>
                        <Crown size={20} color="#a855f7" />
                      </div>
                    </div>
                    <div className="sa-card-growth">
                      <TrendingUp size={12} />
                      Live Data
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Top Hostels + Recent Activity ──────────────────────── */}
            <div className="sa-two-col">
              {/* Top Hostels by Occupancy */}
              <div className="sa-panel">
                <div className="sa-panel-header">
                  <span className="sa-panel-title">Hostels Overview</span>
                  <button type="button" className="sa-view-all" onClick={() => navigate("/super-admin/hostels")}>
                    View All <ChevronRight size={12} />
                  </button>
                </div>

                {statsLoading ? (
                  <div className="sa-empty-state sa-skeleton-pulse">Loading hostel data…</div>
                ) : hostels.length === 0 ? (
                  <div className="sa-empty-state">
                    <Building2 size={28} color="#cbd5e1" />
                    No hostels registered yet.
                  </div>
                ) : (
                  <>
                    <table className="sa-occ-table">
                      <thead>
                        <tr>
                          <th>Hostel Name</th>
                          <th>Tenants</th>
                          <th>Branches</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hostels.slice(0, 5).map(h => {
                          const hostelBranches = branches.filter(b => b.hostelId === h.id);
                          const hostelTenants  = activeTenants.filter(t => (t as any).hostelId === h.id || (t as any).hostelName === h.name);
                          return (
                            <tr key={h.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div className="sa-hostel-row-icon">
                                    <Building2 size={13} color="#3b82f6" />
                                  </div>
                                  <div>
                                    <div className="sa-hostel-name">{h.name}</div>
                                    <div className="sa-hostel-loc">{h.address || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {hostelTenants.length > 0 ? (
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                                    {hostelTenants.length}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                                )}
                              </td>
                              <td style={{ fontSize: 13, color: "#64748b" }}>
                                {hostelBranches.length > 0 ? hostelBranches.length : (h.branchCount ?? "—")}
                              </td>
                              <td>
                                <span className="sa-active-badge">Active</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="sa-occ-footer">
                      Showing {Math.min(5, hostels.length)} of <strong>{hostels.length}</strong> hostels
                    </div>
                  </>
                )}
              </div>

              {/* Recent Activity — derived from real admin + hostel data */}
              <div className="sa-panel">
                <div className="sa-panel-header">
                  <span className="sa-panel-title">Recent Activity</span>
                  <button type="button" className="sa-view-all" onClick={() => navigate("/super-admin/hostels")}>
                    View All <ChevronRight size={12} />
                  </button>
                </div>
                <div className="sa-activity-list">
                  {statsLoading ? (
                    <div className="sa-empty-state sa-skeleton-pulse">Loading…</div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map(a => (
                      <div key={a.id} className="sa-activity-item">
                        <ActivityIcon type={a.icon} />
                        <div>
                          <div className="sa-activity-text">{a.text}</div>
                          <div className="sa-activity-time">{a.time}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {admins.slice(0, 3).map((a) => (
                        <div key={`a-${a.id}`} className="sa-activity-item">
                          <ActivityIcon type="admin" />
                          <div>
                            <div className="sa-activity-text">
                              Admin "{a.name || a.email}" — {a.hostelName || "Unassigned"}
                            </div>
                            <div className="sa-activity-time">{a.active ? "Active" : "Inactive"}</div>
                          </div>
                        </div>
                      ))}
                      {hostels.slice(0, 2).map((h) => (
                        <div key={`h-${h.id}`} className="sa-activity-item">
                          <ActivityIcon type="hostel" />
                          <div>
                            <div className="sa-activity-text">Hostel "{h.name}" registered</div>
                            <div className="sa-activity-time">{h.address || "Active"}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Hostels / Subscription Status Table ──────────────────── */}
            <div className="sa-panel">
              <div className="sa-panel-header">
                <span className="sa-panel-title">Hostel Directory</span>
                <button type="button" className="sa-view-all" onClick={() => navigate("/super-admin/hostels")}>
                  View All <ChevronRight size={12} />
                </button>
              </div>

              {statsLoading ? (
                <div className="sa-empty-state sa-skeleton-pulse">Loading hostel directory…</div>
              ) : hostels.length === 0 ? (
                <div className="sa-empty-state">
                  <Building2 size={28} color="#cbd5e1" />
                  No hostels found.
                </div>
              ) : (
                <table className="sa-sub-table">
                  <thead>
                    <tr>
                      <th>Hostel Name</th>
                      <th>Address</th>
                      <th>Phone</th>
                      <th>Branches</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostels.slice(0, 5).map(h => {
                      const hostelBranches = branches.filter(b => b.hostelId === h.id);
                      return (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>{h.name}</td>
                          <td style={{ color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {h.address || "—"}
                          </td>
                          {/* Phone now comes from the admin/user record (adminPhone),
                              since Hostel.phone is typically unset. Falls back to
                              h.phone in case a hostel-level number is ever populated. */}
                          <td style={{ color: "#64748b" }}>{h.adminPhone || h.phone || "—"}</td>
                          <td style={{ color: "#64748b" }}>
                            {hostelBranches.length > 0 ? hostelBranches.length : (h.branchCount ?? "—")}
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════ ADMIN MANAGEMENT VIEW ══════════════════════ */}
        {isAdminsView && (
          <div className="sa-admin-panel">
            <div className="sa-admin-panel-header">
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Admin Management</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Manage and provision administrator credentials · {adminTotal} total admin{adminTotal !== 1 ? "s" : ""}
                </div>
              </div>
              <Button
                onClick={openCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg flex items-center gap-1.5"
              >
                <Plus size={15} /> Create Admin
              </Button>
            </div>

            {adminLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Loading admins…
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="sa-admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>ID</th>
                      <th>Profile</th>
                      <th>Email</th>
                      <th>Assigned Hostel</th>
                      <th style={{ width: 160 }}>Plan</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 165, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin, idx) => {
                      const adminHostelId = admin.hostelId ?? null;
                      const hostel = adminHostelId != null ? hostels.find(h => h.id === adminHostelId) : undefined;
                      const hostelPlanName = (hostel as any)?.planName ?? null;

                      return (
                        <tr key={admin.id}>
                          <td style={{ color: "#94a3b8", fontWeight: 500 }}>{adminPage * 10 + idx + 1}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
                              }}>
                                {(admin.name || admin.email || "?").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{admin.name || "—"}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{admin.phone || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 500, color: "#374151" }}>{admin.email}</td>
                          <td>
                            {admin.hostelName ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1e293b" }}>
                                <Building2 size={12} color="#94a3b8" />
                                {admin.hostelName}
                              </span>
                            ) : (
                              <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>Unassigned</span>
                            )}
                          </td>
                          <td>
                            {/* Plan assignment is read-only for now — see note near
                                the `plans` state declaration above. Previously this
                                rendered an editable <Select> wired to the now-removed
                                handleAssignPlan handler, which caused a build error
                                (handleAssignPlan is not defined). */}
                            {adminHostelId == null ? (
                              <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                            ) : hostelPlanName ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                                {hostelPlanName}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>No Plan</span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                              background: admin.active ? "#dcfce7" : "#f1f5f9",
                              color: admin.active ? "#16a34a" : "#64748b",
                            }}>
                              {admin.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button type="button" className="sa-icon-btn" title="View" onClick={() => openView(admin)}>
                                <Eye size={13} color="#64748b" />
                              </button>
                              <button type="button" className="sa-icon-btn" title="Edit" onClick={() => openEdit(admin)}>
                                <Pencil size={13} color="#64748b" />
                              </button>
                              <button type="button" className="sa-icon-btn" title={admin.active ? "Deactivate" : "Activate"} onClick={() => handleToggle(admin)}>
                                {admin.active
                                  ? <ShieldOff size={13} color="#f87171" />
                                  : <ShieldCheck size={13} color="#34d399" />}
                              </button>
                              <button type="button" className="sa-icon-btn danger" title="Delete" onClick={() => handleDelete(admin.id)}>
                                <Trash2 size={13} color="#f87171" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {admins.length === 0 && !adminLoading && (
                      <tr>
                        <td colSpan={7}>
                          <div className="sa-empty-state">
                            <Users size={28} color="#cbd5e1" />
                            No administrators found. Create one to get started.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="sa-admin-pagination">
              <span>
                Showing <strong style={{ color: "#0f172a" }}>{admins.length}</strong> of{" "}
                <strong style={{ color: "#0f172a" }}>{adminTotal}</strong> admins
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="outline" disabled={adminPage === 0} onClick={() => setAdminPage(p => p - 1)}
                  style={{ fontSize: 12, height: 30, padding: "0 12px" }}>← Prev</Button>
                <Button size="sm" variant="outline" disabled={(adminPage + 1) * 10 >= adminTotal} onClick={() => setAdminPage(p => p + 1)}
                  style={{ fontSize: 12, height: 30, padding: "0 12px" }}>Next →</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════ View Admin Dialog (read-only) ════ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">Admin Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="pt-1">
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {(viewTarget.name || viewTarget.email || "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{viewTarget.name || "—"}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{viewTarget.email}</div>
                </div>
              </div>

              <div className="sa-view-row">
                <span className="sa-view-label">Phone</span>
                <span className="sa-view-value">{viewTarget.phone || "—"}</span>
              </div>
              <div className="sa-view-row">
                <span className="sa-view-label">Assigned Hostel</span>
                <span className="sa-view-value">{viewTarget.hostelName || "Unassigned"}</span>
              </div>
              <div className="sa-view-row">
                <span className="sa-view-label">Subscription Plan</span>
                <span className="sa-view-value">{viewPlanName || "No Plan"}</span>
              </div>
              <div className="sa-view-row">
                <span className="sa-view-label">Status</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: viewTarget.active ? "#dcfce7" : "#f1f5f9",
                  color: viewTarget.active ? "#16a34a" : "#64748b",
                }}>
                  {viewTarget.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-5 mt-2 border-t border-slate-100">
                <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => { setViewDialogOpen(false); openEdit(viewTarget); }}
                >
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════ Create / Edit Admin Dialog ════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              {editTarget ? "Edit Admin" : "Create New Admin"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pt-2">
            {[
              { label: "Full Name",     key: "name",  type: "text",  placeholder: "John Doe" },
              { label: "Phone Number",  key: "phone", type: "tel",   placeholder: "9876543210" },
              { label: "Email Address", key: "email", type: "email", placeholder: "name@example.com" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">{f.label}</label>
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Password</label>
              <Input
                type="password"
                placeholder={editTarget ? "Leave blank to keep unchanged" : "••••••••"}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Assigned Hostel</label>
              <Select
                value={form.hostelId != null ? String(form.hostelId) : undefined}
                onValueChange={v => setForm(f => ({ ...f, hostelId: Number(v) }))}
              >
                <SelectTrigger className="border-slate-200 focus:ring-indigo-500">
                  <SelectValue placeholder="Select Hostel" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  <div className="flex items-center px-2 py-1.5 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <Search className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text" placeholder="Search hostel…"
                      value={hostelSearch}
                      onChange={e => setHostelSearch(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="w-full text-xs bg-transparent outline-none border-none py-0.5 text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <div className="pt-1">
                    {filteredHostels.map(h => (
                      <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                    ))}
                    {filteredHostels.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-3">No matches found</p>
                    )}
                  </div>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 pt-0.5">Admin screens will be scoped to this hostel.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Hostel's Subscription Plan</label>
              {form.hostelId == null ? (
                <div style={{
                  border: "1px dashed #e2e8f0", borderRadius: 8, padding: "10px 12px",
                  fontSize: 12, color: "#94a3b8", background: "#f8fafc",
                }}>
                  Select a hostel above to view its plan
                </div>
              ) : (
                <>
                  {/* Read-only plan display — plan assignment editing is disabled
                      until getPlans / assignHostelPlan are wired up in the store.
                      Previously this was an editable <Select> that called the now-
                      removed handleAssignPlan, which caused a build error. */}
                  <div style={{
                    border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px",
                    fontSize: 13, fontWeight: 600,
                    color: selectedHostel?.planName ? "#0f172a" : "#94a3b8",
                    background: "#f8fafc",
                  }}>
                    {selectedHostel?.planName || "No plan assigned"}
                  </div>
                  <p className="text-xs text-slate-400 pt-0.5">
                    Plan for "{selectedHostel?.name}". Plan editing is currently unavailable here.
                  </p>
                </>
              )}
            </div>

          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editTarget ? "Save Changes" : "Create Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}