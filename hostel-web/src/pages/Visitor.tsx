import { useEffect, useState, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { toast } from "sonner";
import { 
  Plus, CheckCircle2, XCircle, LogIn, LogOut, Clock, 
  Users, ShieldAlert, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { getUserRole, getBranchId, getMyProfile } from "@/lib/store";
import { fetchBranchVisitors, fetchTenantVisitors, requestVisitor, updateVisitorStatus, Visitor, VisitorStatus } from "@/lib/store";
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
  const branchId = useMemo(() => getBranchId() || 1, []);
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentTenant, setCurrentTenant] = useState<{ id: number; name: string; roomNumber: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

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

      if (isManagement) {
        const data = await fetchBranchVisitors(branchId);
        setVisitors(data);
      } else if (profile?.id) {
        const data = await fetchTenantVisitors(Number(profile.id));
        setVisitors(data);
      }
    } catch {
      toast.error("Failed to load visitor records.");
    }
  }, [isManagement, branchId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Tenant Visitor Submit
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
        tenantId: currentTenant?.id || 1,
        tenantName: currentTenant?.name || "Tenant",
        roomNumber: currentTenant?.roomNumber || "N/A",
        visitorName,
        visitorPhone,
        relation,
        visitDate,
        expectedInTime,
      });
      toast.success("Visitor entry request submitted!");
      loadData();
    } catch {
      toast.error("Failed to submit request.");
    }
  }, [branchId, currentTenant, loadData]);

  // Warden Action: Approve / Reject / Check-In / Check-Out
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
      `${v.visitorName} ${v.visitorPhone} ${v.tenantName} ${v.relation}`.toLowerCase().includes(term)
    );
  }, [visitors, search]);

  const columnDefs = useMemo<ColDef[]>(() => [
    { headerName: "Visitor Name", field: "visitorName", flex: 1, minWidth: 150 },
    { headerName: "Phone", field: "visitorPhone", width: 130 },
    { headerName: "Relation", field: "relation", width: 120 },
    { headerName: "Tenant / Room", field: "tenantName", flex: 1, minWidth: 150, valueFormatter: (p) => `${p.value} (${p.data?.roomNumber || "N/A"})` },
    { headerName: "Visit Date", field: "visitDate", width: 120, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString("en-IN") : "-" },
    { headerName: "Expected In", field: "expectedInTime", width: 120 },
    {
      headerName: "Status",
      field: "status",
      width: 160,
      cellRenderer: (p: any) => {
        const config = STATUS_STYLES[p.value as VisitorStatus] || STATUS_STYLES.PENDING;
        return <Badge variant="outline" className={`text-xs px-2.5 py-0.5 border font-semibold ${config.style}`}>{config.label}</Badge>;
      },
    },
    {
      headerName: "Actions",
      width: 220,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => {
        const v: Visitor = p.data;
        if (!isManagement) return <span className="text-xs text-muted-foreground">View Only</span>;

        return (
          <div className="flex items-center gap-1.5 h-full">
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
          </div>
        );
      },
    },
  ], [isManagement, handleStatusChange]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Visitor Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isManagement ? "Approve, monitor, and record hostel visitor movements." : "Request entry approval for your family or friends."}
          </p>
        </div>

        {!isManagement && (
          <Button onClick={() => setIsModalOpen(true)} className="h-10 px-4 shadow-sm gap-2 font-medium">
            <Plus className="h-4 w-4" /> Request Visitor Entry
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-card border rounded-xl p-3 flex justify-between items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search visitor, phone, tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 border rounded-md h-9 text-xs w-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine border rounded-xl overflow-hidden shadow-sm bg-card" style={{ height: 480 }}>
        <AgGridReact
          rowData={filteredVisitors}
          columnDefs={columnDefs}
          rowHeight={48}
          pagination
          paginationPageSize={10}
          autoSizeStrategy={{ type: "fitGridWidth" }}
          animateRows
        />
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