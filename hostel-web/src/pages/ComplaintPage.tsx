import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getUserRole,
  getBranches,
  getBranchId,
  getRooms,
  fetchAllPages,
} from "@/lib/store";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Branch, Room } from "@/lib/types";

import { Plus } from "lucide-react";

import { Complaint, ComplaintStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

/* ================= HELPERS ================= */

const getStatusColor = (status: ComplaintStatus) => {
  switch (status) {
    case "OPEN":
      return "bg-red-100 text-red-600";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-700";
    case "RESOLVED":
      return "bg-green-100 text-green-600";
    default:
      return "";
  }
};

/* ── Safe array extractor: handles both raw array and { content: [] } shapes ── */
const toArray = <T,>(val: any): T[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.content)) return val.content;
  if (Array.isArray(val.data?.content)) return val.data.content;
  if (Array.isArray(val.data)) return val.data;
  return [];
};

const ComplaintPage = () => {
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isAdmin  = role === "ADMIN";
  const isWarden = role === "WARDEN";

  const [complaints,    setComplaints]    = useState<Complaint[]>([]);
  const [subject,       setSubject]       = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [description,   setDescription]  = useState("");
  const [searchText,    setSearchText]    = useState("");
  const [addOpen,       setAddOpen]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [tableLoading,  setTableLoading]  = useState(true);
  const [updatingId,    setUpdatingId]    = useState<number | null>(null);
  const [rooms,         setRooms]         = useState<Room[]>([]);
  const [branches,      setBranches]      = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    role === "ADMIN" ? "all" : String(getBranchId() ?? "all")
  );

  const didFetch = useRef(false);

  /* ================= RESET HELPERS ================= */

  const resetComplaintForm = () => {
    setSubject("");
    setCustomSubject("");
    setDescription("");
  };

  const closeComplaintDialog = () => {
    setAddOpen(false);
    resetComplaintForm();
  };

  /* ================= LOAD ================= */

const loadComplaints = useCallback(async () => {
    try {
      setTableLoading(true);

      const [complaintsResult, branchResult, roomResult] = await Promise.allSettled([
        role === "TENANT" ? getMyComplaints() : getAllComplaints(),
        fetchAllPages<Branch>(getBranches),
        fetchAllPages<Room>(getRooms),
      ]);

      if (complaintsResult.status === "fulfilled") {
        setComplaints(toArray<Complaint>(complaintsResult.value));
      } else {
        console.error("Complaints failed:", complaintsResult.reason);
        toast.error("Failed to load complaints");
      }

      if (branchResult.status === "fulfilled") {
        setBranches(toArray<Branch>(branchResult.value));
      } else {
        console.error("Branches failed:", branchResult.reason);
      }

      if (roomResult.status === "fulfilled") {
        setRooms(toArray<Room>(roomResult.value));
      } else {
        console.error("Rooms failed:", roomResult.reason);
      }
    } finally {
      setTableLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadComplaints();
  }, [loadComplaints]);

  /* ================= CREATE ================= */

  const handleCreate = async () => {
    const finalSubject = subject === "OTHER" ? customSubject : subject;

    if (!finalSubject.trim() || !description.trim()) {
      toast.error("All fields required");
      return;
    }

    try {
      setLoading(true);
      await createComplaint({ subject: finalSubject, description });
      toast.success("Complaint submitted");
      closeComplaintDialog();
      await loadComplaints();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS ================= */

  const handleStatusChange = async (id: number, status: ComplaintStatus) => {
    try {
      setUpdatingId(id);
      await updateComplaintStatus(id, status);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
      toast.success("Status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
      loadComplaints();
    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= GRID ================= */

  const rowData = useMemo(() => {
    let data = complaints;

    // Warden: always scoped to their branch
    if (role === "WARDEN" && branchId) {
      data = data.filter((c) => {
        const room = rooms.find((r) => r.roomNumber === c.roomNumber);
        return String(room?.unitId) === String(branchId);
      });
    }

    // Admin: filter by selected branch dropdown
    if (role === "ADMIN" && selectedBranch !== "all") {
      data = data.filter((c) => {
        const room = rooms.find((r) => r.roomNumber === c.roomNumber);
        return String(room?.unitId) === selectedBranch;
      });
    }

    return data;
  }, [complaints, selectedBranch, rooms, role, branchId]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      { headerName: "ID", field: "id", width: 90 },

      ...(role === "ADMIN" || role === "WARDEN"
        ? [
            {
              headerName: "Tenant / Room",
              flex: 1.5,
              valueGetter: (params: any) =>
                `${params.data.tenantName ?? "-"} (${params.data.roomNumber ?? "-"})`,
            },
          ]
        : []),

      { headerName: "Subject", field: "subject", filter: true },

      {
        headerName: "Description",
        field: "description",
        wrapText: true,
        autoHeight: true,
        flex: 2,
      },

      {
        headerName: "Status",
        field: "status",
        cellRenderer: (params: any) => (
          <span className={`px-2 py-1 rounded ${getStatusColor(params.value)}`}>
            {params.value}
          </span>
        ),
      },

      {
        headerName: "Date",
        field: "createdAt",
        valueFormatter: (params: any) =>
          params.value ? params.value.slice(0, 10) : "",
      },

      ...(role === "ADMIN" || role === "WARDEN"
        ? [
            {
              headerName: "Action",
              cellRenderer: (params: any) => {
                const c = params.data;
                return (
                  <select
                    value={c.status}
                    disabled={updatingId !== null}
                    onChange={(e) =>
                      handleStatusChange(c.id, e.target.value as ComplaintStatus)
                    }
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                );
              },
            },
          ]
        : []),
    ],
    [role, updatingId]
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, flex: 1 }),
    []
  );

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Complaints</h1>

        {role === "TENANT" && (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetComplaintForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Complaint
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Complaint</DialogTitle>
                <DialogDescription>Submit a new complaint</DialogDescription>
              </DialogHeader>

              <Select
                value={subject}
                onValueChange={(value) => {
                  setSubject(value);
                  if (value !== "OTHER") setCustomSubject("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIFI">Wifi</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="WATER">Water</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              {subject === "OTHER" && (
                <Input
                  placeholder="Enter subject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              )}

              <textarea
                placeholder="Describe your issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border p-2 rounded w-full"
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={closeComplaintDialog}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleCreate}
                  disabled={
                    loading ||
                    !description.trim() ||
                    !(subject === "OTHER"
                      ? customSubject.trim()
                      : subject.trim())
                  }
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* BRANCH FILTER */}
      <div className="w-60">
        {isAdmin ? (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger>
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.unitName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : role === "TENANT" ? null : (
          /* Warden: static branch label */
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">
              {branches.find((b) => String(b.id) === String(branchId))
                ?.unitName ?? `Branch ${branchId}`}
            </span>
          </div>
        )}
      </div>

      {/* SEARCH */}
      <Input
        placeholder="Search complaints..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {/* GRID */}
      <div className="ag-theme-alpine" style={{ height: 513, width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          quickFilterText={searchText}
        />
      </div>
    </div>
  );
};

export default ComplaintPage;