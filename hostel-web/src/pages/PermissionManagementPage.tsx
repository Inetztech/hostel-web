import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { getUserRole } from "@/lib/auth";
import {
  getUsers, getPermissionCatalog, getUserPermissions, assignUserPermissions,
} from "@/lib/store";
import { User, PermissionCatalogItem } from "@/lib/types";
import { toast } from "sonner";
import {
  User as UserIcon, ShieldCheck, Lock, UserMinus, Search, Copy, Save, CheckCircle2, XCircle, Settings,
  Building2, Users, IndianRupee, Zap, FileText, Info, Loader2
} from "lucide-react";

type Subordinate = {
  id: number;
  name?: string;
  email: string;
  role: string;
  hostel?: string;
  access?: "Full Access" | "Limited Access" | "No Access";
  avatarColor?: string;
  avatarBg?: string;
};

const MODULE_META: Record<string, { icon: any; color: string; bg: string; order: number }> = {
  Property:  { icon: Building2,     color: '#3b82f6', bg: '#eff6ff', order: 0 },
  People:    { icon: Users,         color: '#f97316', bg: '#ffedd5', order: 1 },
  Finance:   { icon: IndianRupee,   color: '#22c55e', bg: '#dcfce7', order: 2 },
  Operations:{ icon: Zap,           color: '#eab308', bg: '#fef9c3', order: 3 },
  Reporting: { icon: FileText,      color: '#a855f7', bg: '#f3e8ff', order: 4 },
};
const DEFAULT_MODULE_META = { icon: Settings, color: '#64748b', bg: '#f1f5f9', order: 99 };

const COLORS = [
  { color: '#a855f7', bg: '#f3e8ff' },
  { color: '#22c55e', bg: '#dcfce7' },
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#f97316', bg: '#ffedd5' },
  { color: '#ec4899', bg: '#fce7f3' }
];

const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

export default function PermissionManagementPage() {
  const role = getUserRole();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subordinate | null>(null);
  const [catalogSize, setCatalogSize] = useState<number | null>(null);

  useEffect(() => {
    getPermissionCatalog()
      .then(list => setCatalogSize(list.length))
      .catch(() => {});
  }, []);

  const deriveAccess = (permissions?: string[]): Subordinate["access"] => {
    const count = permissions?.length ?? 0;
    if (count === 0) return "No Access";
    if (catalogSize != null && count >= catalogSize) return "Full Access";
    return "Limited Access";
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers(0, 50);
      const allowedRoles = role === "ADMIN" ? ["WARDEN", "TENANT"] : ["TENANT"];
      setSubordinates((res.content as User[])
        .filter((u) => allowedRoles.includes(u.role))
        .map((u, i) => ({
          id: u.id,
          name: u.name || "Unknown User",
          email: u.email,
          role: u.role,
          hostel: (u as any).branch?.hostelName || u.unitName || "Assigned Hostel",
          access: deriveAccess(u.permissions),
          avatarColor: COLORS[i % COLORS.length].color,
          avatarBg: COLORS[i % COLORS.length].bg
        }))
      );
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [role, catalogSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (subordinates.length > 0 && !selectedSub) {
      setSelectedSub(subordinates[0]);
    }
  }, [subordinates, selectedSub]);

  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [pending, setPending] = useState<Set<PermissionCatalogItem["name"]>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCatalogFor = useCallback(async (sub: Subordinate) => {
    setCatalogLoading(true);
    try {
      const res = await getUserPermissions(sub.id);
      setCatalog(res.catalog);
      setPending(new Set(res.catalog.filter(c => c.granted).map(c => c.name)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load permissions");
      setCatalog([]);
      setPending(new Set());
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSub) loadCatalogFor(selectedSub);
    else { setCatalog([]); setPending(new Set()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSub?.id]);

  const grantedSet = useMemo(() => new Set(catalog.filter(c => c.granted).map(c => c.name)), [catalog]);
    const hasChanges = useMemo(() => {
    if (pending.size !== grantedSet.size) return true;
    for (const name of pending) if (!grantedSet.has(name)) return true;
    return false;
  }, [pending, grantedSet]);

  const togglePermission = (name: PermissionCatalogItem["name"]) => {
    if (saving) return;
    setPending(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleSelectAll = () => { if (!saving) setPending(new Set(catalog.map(c => c.name))); };
  const handleClearAll  = () => { if (!saving) setPending(new Set()); };

  const handleCopyPermissions = async () => {
    const granted = catalog.filter(c => pending.has(c.name)).map(c => c.label);
    if (granted.length === 0) { toast.error("No permissions selected to copy"); return; }
    try {
      await navigator.clipboard.writeText(granted.join(", "));
      toast.success("Permissions copied to clipboard");
    } catch {
      toast.error("Could not copy — clipboard access blocked");
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedSub) return;
    setSaving(true);
    try {
      const res = await assignUserPermissions(selectedSub.id, Array.from(pending));
      setCatalog(res.catalog);
      const grantedNames = res.catalog.filter(c => c.granted).map(c => c.name);
      setPending(new Set(grantedNames));
      const newAccess = deriveAccess(grantedNames);
      setSubordinates(prev => prev.map(s => s.id === selectedSub.id ? { ...s, access: newAccess } : s));
      setSelectedSub(prev => prev && prev.id === selectedSub.id ? { ...prev, access: newAccess } : prev);
      toast.success("Permissions updated — the admin will need to re-login to see the change");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const groupedCatalog = useMemo(() => {
    const map: Record<string, PermissionCatalogItem[]> = {};
    catalog.forEach(item => { (map[item.module] ||= []).push(item); });
    return Object.entries(map).sort(
      (a, b) => (MODULE_META[a[0]]?.order ?? 99) - (MODULE_META[b[0]]?.order ?? 99)
    );
  }, [catalog]);

  const filteredSubs = subordinates.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const fullAccessCount = subordinates.filter(s => s.access === "Full Access").length;
  const limitedAccessCount = subordinates.filter(s => s.access === "Limited Access").length;
  const noAccessCount = subordinates.filter(s => s.access === "No Access").length;

  const wardenCount = subordinates.filter(s => s.role === "WARDEN").length;
  const tenantCount = subordinates.filter(s => s.role === "TENANT").length;

  const roleNounPlural = role === "ADMIN" ? "wardens & tenants" : "tenants";
  const pageSubtitle =
    role === "ADMIN" ? "Manage Warden & Tenant Permissions" : "Manage Tenant Permissions";
  const pageSubtext =
    role === "ADMIN" ? "Configure what modules and actions each warden or tenant can access."
    : "Configure what modules and actions each tenant can access.";

  type StatCard = { title: string; value: number; subtext: string; icon: any; color: string; bg: string };

  const statCards: StatCard[] =
    role === "ADMIN"
      ? [
          { title: "Total Wardens", value: wardenCount, subtext: "Warden Accounts", icon: UserIcon, color: "#a855f7", bg: "#f3e8ff" },
          { title: "Total Tenants", value: tenantCount, subtext: "Tenant Accounts", icon: Users, color: "#0ea5e9", bg: "#e0f2fe" },
          { title: "With Full Access", value: fullAccessCount, subtext: "Full Access Accounts", icon: ShieldCheck, color: "#22c55e", bg: "#dcfce7" },
          { title: "Without Permissions", value: noAccessCount, subtext: "No Permissions Assigned", icon: UserMinus, color: "#3b82f6", bg: "#eff6ff" },
        ]
      : [
          { title: "Total Tenants", value: subordinates.length, subtext: "All Tenant Accounts", icon: UserIcon, color: "#a855f7", bg: "#f3e8ff" },
          { title: "Tenants with Full Access", value: fullAccessCount, subtext: "Full Access Accounts", icon: ShieldCheck, color: "#22c55e", bg: "#dcfce7" },
          { title: "Tenants with Limited Access", value: limitedAccessCount, subtext: "Limited Access Accounts", icon: Lock, color: "#f97316", bg: "#ffedd5" },
          { title: "Without Permissions", value: noAccessCount, subtext: "No Permissions Assigned", icon: UserMinus, color: "#3b82f6", bg: "#eff6ff" },
        ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .perm-wrap { font-family: 'Inter', sans-serif; width: 100%; max-width: 100%; }
        
        .perm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 1100px) { .perm-stats { grid-template-columns: repeat(2, 1fr); } }
        .perm-stat-card { background: #fff; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .perm-stat-icon-wrapper { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .perm-stat-content { display: flex; flex-direction: column; }
        .perm-stat-title { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .perm-stat-value { font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 4px; }
        .perm-stat-subtext { font-size: 11px; color: #94a3b8; font-weight: 500; }

        .perm-subtitle { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .perm-subtext { font-size: 12px; color: #64748b; margin-bottom: 20px; }
        .perm-split { display: flex; gap: 24px; align-items: flex-start; }
        @media (max-width: 900px) { .perm-split { flex-direction: column; } }
        
        .perm-sidebar { width: 340px; background: #fff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 20px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        @media (max-width: 900px) { .perm-sidebar { width: 100%; } }
        .perm-sidebar-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .perm-search { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; margin-bottom: 16px; background: #f8fafc; }
        .perm-search input { border: none; outline: none; width: 100%; font-size: 12px; background: transparent; }
        .perm-list { display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px; }
        .perm-list::-webkit-scrollbar { width: 4px; }
        .perm-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .perm-list-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
        .perm-list-item:hover { background: #f8fafc; }
        .perm-list-item.active { background: #fdfaef; border: 1px solid #f3e8ff; border-left: 3px solid #8b5cf6; background: #fdfbff; }
        .perm-avatar { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .perm-list-item.active .perm-avatar { background: #f3e8ff !important; color: #8b5cf6 !important; }
        
        .perm-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .perm-item-name { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .perm-item-hostel { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .perm-item-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
        .perm-item-badge.full { color: #8b5cf6; }
        .perm-item-badge.limited { color: #f97316; }
        .perm-item-badge.none { color: #94a3b8; }

        .perm-main { flex: 1; background: #fff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 24px; min-width: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .perm-main-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .perm-main-title { font-size: 16px; font-weight: 700; color: #0f172a; }
        .perm-main-title span { color: #64748b; font-weight: 500; }
        .perm-actions { display: flex; gap: 12px; }
        .perm-btn-outline { display: flex; align-items: center; gap: 6px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 14px; height: 36px; font-size: 12px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .perm-btn-outline:hover { background: #f8fafc; }
        .perm-btn-primary { display: flex; align-items: center; gap: 6px; background: #8b5cf6; border: none; border-radius: 8px; padding: 0 16px; height: 36px; font-size: 12px; font-weight: 500; color: #fff; cursor: pointer; transition: background 0.2s; }
        .perm-btn-primary:hover { background: #7c3aed; }
        
        .perm-quick-access { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
        .perm-quick-label { font-size: 13px; font-weight: 600; color: #0f172a; margin-right: 4px; }
        .perm-quick-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500; color: #64748b; background: #fff; cursor: pointer; transition: all 0.2s; }
        .perm-quick-btn.active.full { color: #22c55e; border-color: #bbf7d0; background: #f0fdf4; }
        .perm-quick-btn.active.limited { color: #f97316; border-color: #fed7aa; background: #fff7ed; }
        .perm-quick-btn.active.custom { color: #8b5cf6; border-color: #e9d5ff; background: #faf5ff; }

        .perm-table-wrapper { overflow-x: auto; margin-bottom: 16px; }
        .perm-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .perm-table th { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding: 12px 16px; text-align: center; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .perm-table th:first-child { text-align: left; }
        .perm-table th .th-sub { display: block; font-size: 9px; font-weight: 500; color: #cbd5e1; margin-top: 2px; text-transform: none; }
        
        .perm-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; text-align: center; vertical-align: middle; }
        .perm-table td:first-child { text-align: left; }
        
        .perm-module-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .perm-module-desc { font-size: 11px; color: #64748b; margin-top: 2px; }

        .perm-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin: 0 auto; transition: all 0.2s; }
        .perm-radio.selected { border-color: #8b5cf6; }
        .perm-radio.selected::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; }

        .perm-module-row td { background: #fafafa; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
        .perm-module-row .perm-module-name { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; }

        .perm-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; cursor: pointer; transition: all 0.15s; background: #fff; }
        .perm-toggle.granted { color: #16a34a; border-color: #bbf7d0; background: #f0fdf4; }
        .perm-toggle.granted:hover:not(:disabled) { background: #dcfce7; }
        .perm-toggle.revoked { color: #94a3b8; border-color: #e2e8f0; background: #f8fafc; }
        .perm-toggle.revoked:hover:not(:disabled) { background: #f1f5f9; color: #64748b; }
        .perm-toggle:disabled { cursor: not-allowed; opacity: 0.6; }

        .perm-quick-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .perm-btn-outline:disabled, .perm-btn-primary:disabled { cursor: not-allowed; }

        .perm-footer-info { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; }
      `}</style>

      <div className="perm-wrap">
        <div className="perm-stats">
          {statCards.map((card) => (
            <div className="perm-stat-card" key={card.title}>
              <div className="perm-stat-icon-wrapper" style={{ background: card.bg }}>
                <card.icon size={20} color={card.color} />
              </div>
              <div className="perm-stat-content">
                <span className="perm-stat-title">{card.title}</span>
                <span className="perm-stat-value">{card.value}</span>
                <span className="perm-stat-subtext">{card.subtext}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="perm-subtitle">{pageSubtitle}</div>
        <div className="perm-subtext">{pageSubtext}</div>

        <div className="perm-split">
          <div className="perm-sidebar">
            <div className="perm-sidebar-title">{role === "ADMIN" ? "Wardens & Tenants" : "Tenants"}</div>
            <div className="perm-search">
              <Search size={14} color="#94a3b8" />
              <input 
                type="text" 
                placeholder={role === "ADMIN" ? "Search warden or tenant..." : "Search tenant..."} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="perm-list">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading...</div>
              ) : filteredSubs.map(sub => (
                <div 
                  key={sub.id} 
                  className={`perm-list-item ${selectedSub?.id === sub.id ? 'active' : ''}`}
                  onClick={() => setSelectedSub(sub)}
                >
                  <div className="perm-avatar" style={{ background: sub.avatarBg, color: sub.avatarColor }}>
                    {getInitials(sub.name)}
                  </div>
                  <div className="perm-item-info">
                    <span className="perm-item-name">{sub.name}</span>
                    <span className="perm-item-hostel">{sub.hostel}</span>
                  </div>
                  <span className={`perm-item-badge ${sub.access === 'Full Access' ? 'full' : sub.access === 'No Access' ? 'none' : 'limited'}`}>
                    {sub.access}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
              Showing 1 to {filteredSubs.length} of {subordinates.length} {roleNounPlural}
            </div>
          </div>

          <div className="perm-main">
            {selectedSub ? (
              <>
                <div className="perm-main-header">
                  <div className="perm-main-title">
                    Permissions for <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{selectedSub.name}</span> <span>({selectedSub.hostel})</span>
                  </div>
                  <div className="perm-actions">
                    <button className="perm-btn-outline" onClick={handleCopyPermissions} disabled={catalogLoading}>
                      <Copy size={14} /> Copy Permissions
                    </button>
                    <button
                      className="perm-btn-primary"
                      onClick={handleSaveChanges}
                      disabled={saving || catalogLoading || !hasChanges}
                      style={{ opacity: (saving || catalogLoading || !hasChanges) ? 0.6 : 1, cursor: (saving || catalogLoading || !hasChanges) ? 'not-allowed' : 'pointer' }}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>

                <div className="perm-quick-access">
                  <span className="perm-quick-label">Quick Access</span>
                  <button className="perm-quick-btn" onClick={handleSelectAll} disabled={catalogLoading || saving}>
                    <CheckCircle2 size={14} /> Select All
                  </button>
                  <button className="perm-quick-btn" onClick={handleClearAll} disabled={catalogLoading || saving}>
                    <XCircle size={14} /> Clear All
                  </button>
                  {hasChanges && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f97316', marginLeft: 4 }}>
                      Unsaved changes
                    </span>
                  )}
                </div>

                {catalogLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
                    <Loader2 size={16} className="animate-spin" /> Loading permissions…
                  </div>
                ) : (
                  <div className="perm-table-wrapper">
                    <table className="perm-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>MODULE / PERMISSION</th>
                          <th style={{ width: 160 }}>STATUS<span className="th-sub">Click to toggle</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedCatalog.map(([moduleName, items]) => {
                          const meta = MODULE_META[moduleName] || DEFAULT_MODULE_META;
                          const Icon = meta.icon;
                          return (
                            <Fragment key={moduleName}>
                              <tr className="perm-module-row">
                                <td colSpan={2}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                                      <Icon size={16} color={meta.color} />
                                    </div>
                                    <span className="perm-module-name">{moduleName}</span>
                                  </div>
                                </td>
                              </tr>
                              {items.map(item => {
                                const isGranted = pending.has(item.name);
                                return (
                                  <tr key={item.name}>
                                    <td>
                                      <span className="perm-module-desc" style={{ fontSize: 13, color: '#334155', paddingLeft: 44 }}>
                                        {item.label}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        className={`perm-toggle ${isGranted ? 'granted' : 'revoked'}`}
                                        onClick={() => togglePermission(item.name)}
                                        disabled={saving}
                                      >
                                        {isGranted ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        {isGranted ? 'Granted' : 'Not Granted'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                        {groupedCatalog.length === 0 && (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                              No permissions in the catalog.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="perm-footer-info">
                  <Info size={14} color="#3b82f6" />
                  Toggle permissions above, then click Save Changes to apply them. The admin will need to re-login to see the update.
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-sm text-slate-400">
                Select an admin from the sidebar to manage permissions.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}