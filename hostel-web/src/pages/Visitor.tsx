import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { 
  Plus, CheckCircle2, XCircle, LogIn, LogOut, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { 
  getUserRole, getBranchId, getMyProfile, 
  fetchVisitorsForCurrentUser, requestVisitor, updateVisitorStatus, 
  Visitor, VisitorStatus 
} from "@/lib/store";
import { VisitorRequestModal } from "../components/visitor/VisitorRequestModal";

const STATUS_STYLES: Record<VisitorStatus, { style: string; label: string }> = {
  PENDING: { style: "border-amber-500 text-amber-600 bg-amber-50", label: "Pending Approval" },
  APPROVED: { style: "border-emerald-500 text-emerald-600 bg-emerald-50", label: "Approved" },
  REJECTED: { style: "border-rose-500 text-red-600 bg-rose-50", label: "Rejected" },
  CHECKED_IN: { style: "border-blue-500 text-blue-600 bg-blue-50", label: "Checked In" },
  CHECKED_OUT: { style: "border-gray-500 text-gray-600 bg-gray-50", label: "Checked Out" },
};

const VisitorPage = () => {
  const role = useMemo(() => getUserRole()?.toUpperCase(), []);
  const branchId = useMemo(() => getBranchId() || 0, []);
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentTenant, setCurrentTenant] = useState<{ id: number; name: string; roomNumber: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const isManagement = role === "ADMIN" || role === "WARDEN" || role === "SUPER_ADMIN";

  const loadData = useCallback(async () => {
    try {
      const profile = await getMyProfile().catch(() => null);
      if (profile?.id) {
        setCurrentTenant({
          id: Number(profile.id),
          name: profile.name || "Tenant",
          roomNumber: (profile as any).roomNumber || "N/A",
        });
      }

      const data = await fetchVisitorsForCurrentUser(isManagement ? branchId : undefined);
      setVisitors(data);
    } catch {
      toast.error("Failed to load visitor records.");
    }
  }, [isManagement, branchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateRequest = useCallback(async (
    visitorName: string,
    visitorPhone: string,
    relation: string,
    visitDate: string,
    expectedInTime: string
  ) => {
    try {
      await requestVisitor({
        branchId,
        tenantId: currentTenant?.id,
        tenantName: currentTenant?.name,
        roomNumber: currentTenant?.roomNumber,
        visitorName,
        visitorPhone,
        relation,
        visitDate,
        expectedInTime,
      });
      toast.success("Visitor entry request submitted!");
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error("Failed to submit request.");
    }
  }, [branchId, currentTenant, loadData]);

  const handleStatusChange = useCallback(async (id: number, status: VisitorStatus) => {
    try {
      await updateVisitorStatus(id, status);
      toast.success(`Visitor status updated to ${status}`);
      loadData();
    } catch {
      toast.error("Failed to update status.");
    }
  }, [loadData]);

  const filteredVisitors = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return visitors;
    return visitors.filter((v) =>
      `${v.visitorName} ${v.visitorPhone} ${v.tenantName} ${v.relation} ${v.unitName || ""}`.toLowerCase().includes(term)
    );
  }, [visitors, search]);

  const paginatedRows = useMemo(() => {
    return filteredVisitors.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredVisitors, currentPage, pageSize]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-3 sm:p-4">
      {!isManagement && (
        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(true)} className="h-10 px-4 shadow-sm gap-2 font-medium">
            <Plus className="h-4 w-4" /> Request Visitor Entry
          </Button>
        </div>
      )}

      <div className="bg-card border rounded-xl p-3 flex justify-between items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search visitor, phone, tenant..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="pl-8 pr-8 border rounded-md h-9 text-xs w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => { setSearch(""); setCurrentPage(0); }} className="absolute right-2.5 top-2.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .vp-panel { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; margin-top: 16px; }
        .vp-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .vp-table th { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 16px 24px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fff; letter-spacing: 0.5px; }
        .vp-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .vp-table tr:hover { background: #fdfcff; }
      `}</style>

      <div className="vp-panel">
        <div className="overflow-x-auto">
          <table className="vp-table">
            <thead>
              <tr>
                <th>VISITOR NAME</th>
                <th>PHONE</th>
                <th>RELATION</th>
                <th>TENANT / ROOM</th>
                {role === "ADMIN" || role === "SUPER_ADMIN" ? <th>BRANCH</th> : null}
                <th>VISIT DATE</th>
                <th>EXPECTED IN</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={role === "ADMIN" || role === "SUPER_ADMIN" ? 9 : 8} className="text-center py-12 text-slate-400">
                    No visitors found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((v) => {
                  const config = STATUS_STYLES[v.status as VisitorStatus] || STATUS_STYLES.PENDING;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="text-[14px]  text-slate-900">{v.visitorName}</div>
                      </td>
                      <td className="text-[13px] text-slate-600">{v.visitorPhone}</td>
                      <td className="text-[13px] text-slate-600">{v.relation}</td>
                      <td>
                        <div className="text-[13px] font-semibold text-slate-900">{v.tenantName}</div>
                        <div className="text-[11px] text-slate-500">Room: {v.roomNumber || "N/A"}</div>
                      </td>
                      {role === "ADMIN" || role === "SUPER_ADMIN" ? (
                        <td className="text-[13px] font-medium text-slate-700">
                          {v.unitName || "Default Branch"}
                        </td>
                      ) : null}
                      <td className="text-[13px] font-medium text-slate-700">
                        {v.visitDate ? new Date(v.visitDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="text-[13px] text-slate-600">{v.expectedInTime}</td>
                      <td>
                        <Badge variant="outline" className={`text-[11px] px-2 py-0.5 border font-semibold ${config.style}`}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 h-full w-full">
                          {!isManagement ? (
                            <span className="text-xs text-muted-foreground">View Only</span>
                          ) : (
                            <>
                              {v.status === "PENDING" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleStatusChange(v.id, "APPROVED")}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => handleStatusChange(v.id, "REJECTED")}>
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              {v.status === "APPROVED" && (
                                <Button size="sm" variant="outline" className="h-7 px-2 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100" onClick={() => handleStatusChange(v.id, "CHECKED_IN")}>
                                  <LogIn className="h-3.5 w-3.5 mr-1" /> Check In
                                </Button>
                              )}
                              {v.status === "CHECKED_IN" && (
                                <Button size="sm" variant="outline" className="h-7 px-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100" onClick={() => handleStatusChange(v.id, "CHECKED_OUT")}>
                                  <LogOut className="h-3.5 w-3.5 mr-1" /> Check Out
                                </Button>
                              )}
                              {(v.status === "CHECKED_OUT" || v.status === "REJECTED") && (
                                <span className="text-xs text-muted-foreground italic">Completed</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-5 border-t border-[#f1f5f9] bg-white rounded-b-2xl">
          <div className="text-[14px] text-[#64748b] font-medium">
            Showing {paginatedRows.length === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredVisitors.length)} of {filteredVisitors.length} visitors
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              &#8249;
            </button>

            {(() => {
              const totalPages = Math.ceil(filteredVisitors.length / pageSize) || 1;
              const pages: (number | string)[] = [];
              for (let i = 0; i < totalPages; i++) {
                if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
                  pages.push(i);
                } else if (pages[pages.length - 1] !== '...') {
                  pages.push('...');
                }
              }

              return pages.map((p, idx) => {
                if (p === '...') {
                  return <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm font-medium">...</span>;
                }
                const isCurrent = p === currentPage;
                return (
                  <button
                    type="button"
                    key={p}
                    className={`w-9 h-9 rounded-md flex items-center justify-center font-medium text-[14px] transition-colors shadow-sm ${isCurrent ? 'bg-[#5200FF] text-white border border-[#5200FF]' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {(p as number) + 1}
                  </button>
                );
              });
            })()}

            <button
              type="button"
              className="w-9 h-9 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm text-lg leading-none font-bold"
              disabled={(currentPage + 1) * pageSize >= filteredVisitors.length}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>

      <VisitorRequestModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
};

export default VisitorPage;