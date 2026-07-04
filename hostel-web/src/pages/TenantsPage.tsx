import { useEffect, useMemo, useState, useRef, useCallback, useReducer } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, PaginationChangedEvent } from "ag-grid-community";
import {
  fetchRooms, fetchBeds, addTenant, updateTenant, deleteTenant,
  getBranches, importTenantsExcel, getUserRole, getBranchId,
} from "@/lib/store";
import { Room, Bed, Tenant, IdProofType, Branch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Eye, Search, Pencil, Trash2, FileText } from "lucide-react";
import api from "@/lib/api";

/* ── Constants ──────────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const API_BASE      = "https://api.brindhavanamhostels.com";
const PAGE_SIZE     = 10;

/* ── Helpers ────────────────────────────────────────────────────────── */
async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 10
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);
  const content: T[] = first?.content ?? (Array.isArray(first) ? first : []);
  const total: number = first?.totalElements ?? content.length;
  if (total <= pageSize) return content;
  const rest = await Promise.all(
    Array.from({ length: Math.ceil(total / pageSize) - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? (Array.isArray(r) ? r : []))
    )
  );
  return [...content, ...rest.flat()];
}

const fetchTenantsPage = async (
  page: number, size: number, unitId?: string
): Promise<{ content: Tenant[]; totalElements: number }> => {
  const params: Record<string, any> = { page, size };
  if (unitId && unitId !== "all") params.unitId = unitId;
  const res = await api.get("/tenants", { params });
  return {
    content:       res.data?.data?.content ?? [],
    totalElements: res.data?.data?.totalElements ?? 0,
  };
};

/* ── Form state ─────────────────────────────────────────────────────── */
type FormState = {
  name: string; phone: string; email: string;
  idProofType: IdProofType | ""; idProofNumber: string;
  roomId: number | ""; bedId: number | "";
  advance: string; monthlyRent: string;
  currentReading: string; acJoinReading: string;
  checkInDate: string; idProofDoc: File | null;
};

const EMPTY_FORM: FormState = {
  name: "", phone: "", email: "", idProofType: "", idProofNumber: "",
  roomId: "", bedId: "", advance: "", monthlyRent: "",
  currentReading: "", acJoinReading: "", checkInDate: "", idProofDoc: null,
};

type FormAction =
  | { type: "set"; field: keyof FormState; value: any }
  | { type: "reset" }
  | { type: "load"; payload: Partial<FormState> };

const formReducer = (state: FormState, action: FormAction): FormState => {
  if (action.type === "reset") return { ...EMPTY_FORM };
  if (action.type === "load")  return { ...EMPTY_FORM, ...action.payload };
  return { ...state, [action.field]: action.value };
};

/* ── IdProofUploadField ─────────────────────────────────────────────── */
const IdProofUploadField = ({
  idProofDoc, existing, onChange,
}: { idProofDoc: File | null; existing?: string | null; onChange: (f: File | null) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        ID Proof Document (PDF or Image, max 10 MB)
      </label>
      <input
        ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (!file) { onChange(null); return; }
          if (!["image/jpeg","image/jpg","image/png","application/pdf"].includes(file.type)) {
            toast.error("Only JPG, JPEG, PNG images and PDF files are allowed");
            e.target.value = ""; onChange(null); return;
          }
          if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large. Maximum allowed size is 10 MB.");
            e.target.value = ""; onChange(null); return;
          }
          onChange(file);
        }}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {idProofDoc && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {idProofDoc.name} <span className="text-muted-foreground">({(idProofDoc.size / 1024).toFixed(1)} KB)</span>
        </p>
      )}
      {!idProofDoc && existing && (
        <a href={`${API_BASE}${existing}`} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 underline flex items-center gap-1">
          <FileText className="h-3 w-3" /> View current document
        </a>
      )}
    </div>
  );
};

/* ── Shared TenantForm ──────────────────────────────────────────────── */
const ID_PROOF_TYPES: IdProofType[] = ["AADHAR","PAN","VOTER_ID","DRIVING_LICENSE","PASSPORT"];

const TenantForm = ({
  form, dispatch, rooms, beds, editTenant, existingDoc,
}: {
  form: FormState; dispatch: React.Dispatch<FormAction>;
  rooms: Room[]; beds: Bed[]; editTenant?: Tenant | null; existingDoc?: string | null;
}) => {
  const [roomSearch, setRoomSearch] = useState("");
  const set = (field: keyof FormState) => (value: any) => dispatch({ type: "set", field, value });

  const isAC = rooms.find((r) => r.id === Number(form.roomId))?.hostelType === "AC";

  const availableBeds = beds.filter((b) => {
    if (b.roomId !== Number(form.roomId)) return false;
    const occupied = b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";
    return !occupied || b.id === editTenant?.bedId;
  });

  const availableRooms = editTenant
    ? rooms.filter((r) => beds.some((b) => b.roomId === r.id && !b.isOccupied) || r.id === editTenant.roomId)
    : rooms.filter((r) => beds.some((b) => {
        const occ = b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";
        return b.roomId === r.id && !occ;
      }));

  return (
    <div className="grid gap-3">
      <Input placeholder="Name"  value={form.name}  onChange={(e) => set("name")(e.target.value)} />
      <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
      <Input placeholder="Email" value={form.email} onChange={(e) => set("email")(e.target.value)} />

      <Select value={form.idProofType} onValueChange={set("idProofType")}>
        <SelectTrigger><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
        <SelectContent>
          {ID_PROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input placeholder="ID Proof Number" value={form.idProofNumber}
        onChange={(e) => set("idProofNumber")(e.target.value)} />

      <IdProofUploadField idProofDoc={form.idProofDoc} existing={existingDoc} onChange={set("idProofDoc")} />

      <Select value={form.roomId ? String(form.roomId) : ""}
        onValueChange={(v) => { set("roomId")(Number(v)); setRoomSearch(""); }}>
        <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
            <Input placeholder="Search room..." value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-8 text-sm" autoFocus />
          </div>
          {availableRooms
            .filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
            .map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>)}
          {availableRooms.filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No room found</div>
          )}
        </SelectContent>
      </Select>

      <Select value={form.bedId ? String(form.bedId) : ""} onValueChange={(v) => set("bedId")(Number(v))}>
        <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
        <SelectContent>
          {availableBeds.map((b) => <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input type="number" placeholder="Advance"            value={form.advance}        onChange={(e) => set("advance")(e.target.value)} />
      <Input type="number" placeholder="Rent"               value={form.monthlyRent}    onChange={(e) => set("monthlyRent")(e.target.value)} />
      <Input type="number" placeholder="Current EB Reading" value={form.currentReading} onChange={(e) => set("currentReading")(e.target.value)} />

      {isAC && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">AC Current Reading (optional)</label>
          <Input type="number" placeholder="AC Current Reading"
            value={form.acJoinReading} onChange={(e) => set("acJoinReading")(e.target.value)} />
        </div>
      )}

      <Input type="date" value={form.checkInDate} onChange={(e) => set("checkInDate")(e.target.value)} />
    </div>
  );
};

/* ── Page ───────────────────────────────────────────────────────────── */
const TenantsPage = () => {
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isWarden = role === "WARDEN";

  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [beds,     setBeds]     = useState<Bed[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [wardenBranchName, setWardenBranchName] = useState("");

  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [agCurrentPage, setAgCurrentPage] = useState(0);
  const gridRef = useRef<AgGridReact<Tenant>>(null);

  const [search,         setSearch]         = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>(isWarden ? String(branchId ?? "all") : "all");

  // FIX 1: Keep a ref that always mirrors selectedBranch state so
  //         loadTenants() never closes over a stale value.
  const selectedBranchRef = useRef(selectedBranch);
  useEffect(() => { selectedBranchRef.current = selectedBranch; }, [selectedBranch]);

  const [addOpen,  setAddOpen]  = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  const [excelFile,  setExcelFile]  = useState<File | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [form, dispatch] = useReducer(formReducer, EMPTY_FORM);

  /* ── Reload beds from server (keeps isOccupied in sync after CRUD) ── */
  const reloadBeds = useCallback(async () => {
    try {
      const allBeds = await fetchAllPages<Bed>(fetchBeds);
      if (isWarden) {
        const allRooms = await fetchAllPages<Room>(fetchRooms);
        const roomIds = new Set(allRooms.filter((r) => r.unitId === branchId).map((r) => r.id));
        setBeds(allBeds.filter((b) => roomIds.has(b.roomId)));
      } else {
        setBeds(allBeds);
      }
    } catch {
      // non-critical, silently ignore
    }
  }, [isWarden, branchId]);

  /* ── Data loaders ── */
  // FIX 2: No dependency on selectedBranch state — reads from ref instead.
  //         This makes the callback stable (created once) so every handler
  //         that calls loadTenants() always gets the live version.
  const loadTenants = useCallback(async (branch?: string) => {
    setLoading(true);
    try {
      // Use the explicitly-passed branch first; fall back to the ref (never stale).
      const activeBranch = branch ?? selectedBranchRef.current;
      const all: Tenant[] = [];
      let pg = 0;
      while (true) {
        const { content, totalElements } = await fetchTenantsPage(pg, 100, activeBranch);
        all.push(...content);
        if (all.length >= totalElements || content.length === 0) break;
        pg++;
      }
      setTenants(all);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []); // stable — no deps needed since it reads branch from ref

  // FIX 3: Keep a ref to loadTenants so handlers that capture it at mount
  //         time (like handleExcelImport) always call the current function.
  const loadTenantsRef = useRef(loadTenants);
  useEffect(() => { loadTenantsRef.current = loadTenants; }, [loadTenants]);

  const refLoaded = useRef(false);
  useEffect(() => {
    if (refLoaded.current) return;
    refLoaded.current = true;
    (async () => {
      try {
        const [allRooms, allBeds, allBranches] = await Promise.all([
          fetchAllPages<Room>(fetchRooms),
          fetchAllPages<Bed>(fetchBeds),
          fetchAllPages<Branch>(getBranches),
        ]);
        const filteredRooms = isWarden ? allRooms.filter((r) => r.unitId === branchId) : allRooms;
        const roomIds = new Set(filteredRooms.map((r) => r.id));
        setRooms(filteredRooms);
        setBeds(isWarden ? allBeds.filter((b) => roomIds.has(b.roomId)) : allBeds);
        setBranches(allBranches);
        if (isWarden) {
          setWardenBranchName(allBranches.find((b) => Number(b.id) === Number(branchId))?.unitName ?? "Unknown Branch");
        }
        await loadTenants(isWarden ? String(branchId) : "all");
      } catch {
        toast.error("Failed to load reference data");
      }
    })();
  }, []);

  const branchFilterMounted = useRef(false);
  useEffect(() => {
    if (!branchFilterMounted.current) { branchFilterMounted.current = true; return; }
    loadTenants(selectedBranch);
  }, [selectedBranch]);

  /* ── Display helpers ── */
  const roomNo     = (id?: number | null) => rooms.find((r) => r.id === Number(id))?.roomNumber ?? "-";
  const bedNo      = (id?: number | null) => beds.find((b) => b.id === Number(id))?.bedNumber ?? "-";
  const branchName = (rId?: number | null) => {
    const room = rooms.find((r) => r.id === Number(rId));
    return branches.find((b) => b.id === room?.unitId)?.unitName ?? "-";
  };
  const extractError = (e: any, fallback: string) =>
    e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

  const restoreAgPage = useCallback((target: number) => {
    setTimeout(() => gridRef.current?.api?.paginationGoToPage(target), 50);
  }, []);

  /* ── Force AG Grid to repaint after external data change ── */
  const refreshGrid = useCallback(() => {
    setTimeout(() => {
      gridRef.current?.api?.refreshCells({ force: true });
    }, 100);
  }, []);

  /* ── Build FormData from current form state ── */
  const buildFormData = () => {
    const fd = new FormData();
    if (form.name)          fd.append("name", form.name);
    if (form.phone)         fd.append("phone", form.phone);
    if (form.email)         fd.append("email", form.email);
    if (form.idProofType)   fd.append("idProofType", form.idProofType);
    if (form.idProofNumber) fd.append("idProofNumber", form.idProofNumber);
    if (form.roomId !== "") fd.append("roomId", String(form.roomId));
    if (form.bedId  !== "") fd.append("bedId",  String(form.bedId));
    fd.append("advance",     form.advance     || "0");
    fd.append("monthlyRent", form.monthlyRent || "0");
    fd.append("joinReading", form.currentReading || "0");
    if (form.acJoinReading) fd.append("acJoinReading", form.acJoinReading);
    if (form.checkInDate)   fd.append("checkInDate", form.checkInDate);
    if (form.idProofDoc)    fd.append("idProofDocument", form.idProofDoc);
    return fd;
  };

  /* ── Print ── */
  const handlePrintTenant = (t: Tenant) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Tenant Details</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h2{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border:1px solid #ccc}th{background:#f4f4f4}</style></head><body>
      <h2>Tenant Details</h2><table>
      <tr><th>Name</th><td>${t.name}</td></tr><tr><th>Phone</th><td>${t.phone}</td></tr>
      <tr><th>Email</th><td>${t.email||"-"}</td></tr><tr><th>Branch</th><td>${branchName(t.roomId)}</td></tr>
      <tr><th>Room</th><td>${roomNo(t.roomId)}</td></tr><tr><th>Bed</th><td>${bedNo(t.bedId)}</td></tr>
      <tr><th>Status</th><td>${t.status}</td></tr><tr><th>Check-in</th><td>${t.checkInDate}</td></tr>
      <tr><th>Check-out</th><td>${t.checkOutDate||"-"}</td></tr><tr><th>Advance</th><td>${t.advance}</td></tr>
      <tr><th>Rent</th><td>${t.monthlyRent}</td></tr>
      <tr><th>Current EB Reading</th><td>${t.joinReading}</td></tr>
      <tr><th>AC Current EB Reading</th><td>${t.acJoinReading??"-"}</td></tr>
      </table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  /* ── CRUD ── */
  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.roomId || !form.bedId) {
      toast.error("Fill required fields"); return;
    }
    try {
      await addTenant(buildFormData());
      toast.success("Tenant added");
      setAddOpen(false);
      dispatch({ type: "reset" });
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
      refreshGrid();
      restoreAgPage(0);
      // Send hostel rules via WhatsApp
      const msg = encodeURIComponent(`Hi ${form.name},\n\n🏠 Brindhavanam Gents Hostel – Vadapalani\n\n📜 Updated Hostel Rules & Regulations\n\n1. Hostel Fee Payment\n   Hostel fee must be transferred only to 98848 25258.\n   🔴 Do not transfer to 98402 34475 henceforth.\n\n2. Due Date & Late Fee\n   Hostel fee should be paid on or before the 5th of every month.\n   A late fee of ₹100 per week will be charged for delays.\n\n3. Vacating Notice\n   Residents must give 15 days' prior notice through WhatsApp (98848 25258) before vacating.\n   Caution deposit (advance) will be returned on the last day.\n\n4. Notice Period & Advance Refund Policy\n   If a 15-day notice is not given, rent will be deducted accordingly.\n   Advance amount will not be refunded in case of vacating without the notice period.\n\n5. Hostel Timings\n   Entry must be before 11:00 p.m.\n   Prior intimation is mandatory for late entry.\n\n6. Food Consumption Policy 🍱\n   Food is strictly not allowed inside rooms. Use terrace/dining area.\n\n7. Prohibited Activities\n   Smoking and consumption of alcohol are strictly prohibited.\n\n8. Responsibility Clause\n   Management is not responsible for loss of belongings or unlawful activities.\n\n9. Maintenance Deduction\n   ₹1000 maintenance charge will be deducted from your advance at the time of vacating.`);
      window.open(`https://wa.me/${form.phone}?text=${msg}`, "_blank");
    } catch (e: any) {
      toast.error(extractError(e, "Failed to add tenant"));
    }
  };

  const handleEdit = async () => {
    if (!editTenant) return;
    const savedPage = agCurrentPage;
    try {
      await updateTenant(editTenant.id, buildFormData());
      toast.success("Tenant updated");
      setEditOpen(false);
      dispatch({ type: "reset" });
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
      refreshGrid();
      restoreAgPage(savedPage);
    } catch (e: any) {
      toast.error(extractError(e, "Update failed"));
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Delete tenant "${tenant.name}" ?`)) return;
    const savedPage = agCurrentPage;
    try {
      await deleteTenant(tenant.id);
      toast.success("Tenant deleted");
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
      refreshGrid();
      restoreAgPage(savedPage);
    } catch (e: any) {
      toast.error(extractError(e, "Delete failed"));
    }
  };

  // FIX 4: handleExcelImport now uses loadTenantsRef so it always calls
  //         the latest loadTenants with the correct selectedBranch value,
  //         even though this handler was created at mount time.
  const handleExcelImport = async () => {
    if (!excelFile) { toast.error("Please select an Excel file first"); return; }
    try {
      await importTenantsExcel(excelFile);
      toast.success("Excel imported successfully");
      setExcelFile(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
      await Promise.all([loadTenantsRef.current(), reloadBeds()]);
      refreshGrid();
      restoreAgPage(0);
      window.dispatchEvent(new Event("beds-updated"));
    } catch (e: any) {
      toast.error(extractError(e, "Excel import failed"), { duration: 8000 });
    }
  };

  /* ── Filtered rows ── */
  const filteredTenants = useMemo(
    () => search ? tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : tenants,
    [tenants, search]
  );

  /* ── AG Grid ── */
  const columnDefs: ColDef[] = [
    { headerName: "Name",  field: "name",  flex: 1, cellClass: "text-left" },
    { headerName: "Phone", field: "phone", flex: 1, cellClass: "text-left" },
    { headerName: "Branch", valueGetter: (p) => branchName(p.data.roomId), flex: 1, cellClass: "text-center" },
    { headerName: "Room",   valueGetter: (p) => roomNo(p.data.roomId),     flex: 1, cellClass: "text-center" },
    {
      headerName: "Type",
      valueGetter: (p) => rooms.find((r) => r.id === p.data.roomId)?.hostelType === "AC" ? "AC" : "Non-AC",
      cellRenderer: (p: any) => <Badge variant={p.value === "AC" ? "default" : "secondary"}>{p.value}</Badge>,
    },
    {
      headerName: "Status", field: "status", flex: 1,
      cellRenderer: (p: any) => <Badge>{p.value}</Badge>, cellClass: "text-center",
    },
    {
      headerName: "Action", flex: 1, minWidth: 220,
      cellRenderer: (p: any) => (
        <div className="flex justify-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => { setViewTenant(p.data); setViewOpen(true); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => {
            const t = p.data;
            setEditTenant(t);
            dispatch({ type: "load", payload: {
              name: t.name, phone: t.phone, email: t.email || "",
              idProofType: t.idProofType, idProofNumber: t.idProofNumber || "",
              roomId: t.roomId, bedId: t.bedId,
              advance: String(t.advance), monthlyRent: String(t.monthlyRent),
              currentReading: String(t.joinReading), acJoinReading: String(t.acJoinReading ?? ""),
              checkInDate: t.checkInDate, idProofDoc: null,
            }});
            setEditOpen(true);
          }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDeleteTenant(p.data)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handlePrintTenant(p.data)}>
            <span className="h-4 w-4">🖨️</span>
          </Button>
        </div>
      ),
      cellClass: "text-center",
    },
  ];

  const defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, minWidth: 120 };

  /* ── Render ── */
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <div className="flex gap-2 items-center">
          <Input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="w-44"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_FILE_SIZE) { toast.error("File size must be below 10 MB"); e.target.value = ""; return; }
              setExcelFile(file);
            }} />
          <Button variant="outline" size="sm" onClick={handleExcelImport}>Import Excel</Button>

          {/* Add Dialog */}
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) dispatch({ type: "reset" }); }}>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Check-In
            </Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Tenant</DialogTitle>
                <DialogDescription>Enter tenant details and assign an available room and bed.</DialogDescription>
              </DialogHeader>
              <TenantForm form={form} dispatch={dispatch} rooms={rooms} beds={beds} />
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAdd}>Check-In</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Branch filter */}
      <div className="w-60">
        {!isWarden ? (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">{wardenBranchName}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact<Tenant>
          ref={gridRef} rowData={filteredTenants} columnDefs={columnDefs} defaultColDef={defaultColDef}
          pagination paginationPageSize={PAGE_SIZE} paginationPageSizeSelector={[10,20,50,100]}
          onPaginationChanged={(e: PaginationChangedEvent) => setAgCurrentPage(e.api.paginationGetCurrentPage())}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading…</span>'
          loading={loading}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) dispatch({ type: "reset" }); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information and save your changes.</DialogDescription>
          </DialogHeader>
          <TenantForm form={form} dispatch={dispatch} rooms={rooms} beds={beds}
            editTenant={editTenant} existingDoc={editTenant?.idProofDocument} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Update Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>View complete information about this tenant.</DialogDescription>
          </DialogHeader>
          {viewTenant && (
            <div className="grid gap-2 text-sm">
              {[
                ["Name", viewTenant.name], ["Phone", viewTenant.phone], ["Email", viewTenant.email],
                ["Identity Proof", viewTenant.idProofType], ["ID Number", viewTenant.idProofNumber],
                ["Branch", branchName(viewTenant.roomId)], ["Room", roomNo(viewTenant.roomId)],
                ["Bed", bedNo(viewTenant.bedId)], ["Status", viewTenant.status],
                ["Check-in", viewTenant.checkInDate], ["Check-out", viewTenant.checkOutDate ?? "-"],
              ].map(([label, val]) => <p key={label}>{label}: {val}</p>)}
              {viewTenant.idProofDocument ? (
                <p className="flex items-center gap-1">ID Document:{" "}
                  <a href={`${API_BASE}${viewTenant.idProofDocument}`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> View / Download
                  </a>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No ID document uploaded</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantsPage;