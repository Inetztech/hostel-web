import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  createRoom,
  editRoom,
  removeRoom,
  getBranches,
  getUserRole,
  getBranchId,
  getFlats,
  createFlat,
} from "@/lib/store";
import { showBedLimitToast, isBedLimitError } from "@/lib/limitError";

import { Room, HostelType, Branch, Flat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2,
  Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, Check, Building2, MoreHorizontal,
} from "lucide-react";

/* ================= GENERIC HELPER — fetch every page of any paginated store fn ================= */
async function fetchAllPages<T>(
  fetchFn: (page: number, size: number) => Promise<any>,
  pageSize = 10
): Promise<T[]> {
  const first = await fetchFn(0, pageSize);
  const firstContent: T[] = first?.content ?? first ?? [];
  const total: number     = first?.totalElements ?? firstContent.length;
  if (total <= pageSize) return firstContent;
  const totalPages = Math.ceil(total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
    )
  );
  return [...firstContent, ...rest.flat()];
}

const idsMatch = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) === String(b);

const unwrapEntity = <T extends { id?: any }>(res: any): T | undefined => {
  if (res && res.id != null) return res as T;
  if (res?.data && res.data.id != null) return res.data as T;
  if (res?.data?.data && res.data.data.id != null) return res.data.data as T;
  return undefined;
};

const getPageNumbers = (current: number, total: number): (number | "...")[] => {
  const SIBLINGS = 1; // pages shown on each side of current
  const totalNumbers = SIBLINGS * 2 + 5; // first, last, current, 2 ellipses buffer

  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftIndex = Math.max(current - SIBLINGS, 1);
  const rightIndex = Math.min(current + SIBLINGS, total);

  const showLeftEllipsis = leftIndex > 2;
  const showRightEllipsis = rightIndex < total - 1;

  const pages: (number | "...")[] = [];

  pages.push(1);

  if (showLeftEllipsis) pages.push("...");

  for (let p = Math.max(leftIndex, 2); p <= Math.min(rightIndex, total - 1); p++) {
    pages.push(p);
  }

  if (showRightEllipsis) pages.push("...");

  if (total > 1) pages.push(total);

  return pages;
};

function Field({
  label, required, children, className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", letterSpacing: 0.2, textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function BedCountPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      min={1}
      placeholder="e.g. 2"
      value={value}
      className="rounded-lg"
      onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
    />
  );
}

export interface FlatAssignmentValue {
  mode: "direct" | "flat";
  flatId: string;      
  newFlatNumber: string; 
}

const EMPTY_FLAT_ASSIGNMENT: FlatAssignmentValue = { mode: "direct", flatId: "", newFlatNumber: "" };

function FlatAssignmentField({
  unitId, flatsForBranch, value, onChange,
}: {
  unitId: string;
  flatsForBranch: Flat[];
  value: FlatAssignmentValue;
  onChange: (v: FlatAssignmentValue) => void;
}) {
  return (
    <Field label="Room Assignment">
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          disabled={!unitId}
          onClick={() => onChange({ ...EMPTY_FLAT_ASSIGNMENT, mode: "direct" })}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            border: value.mode === "direct" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
            background: value.mode === "direct" ? "#f5f3ff" : "#fff",
            color: value.mode === "direct" ? "#5200FF" : "#475569",
            cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
          }}
        >
          Direct Room (No Flat)
        </button>
        <button
          type="button"
          disabled={!unitId}
          onClick={() => onChange({ ...value, mode: "flat" })}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            border: value.mode === "flat" ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
            background: value.mode === "flat" ? "#f5f3ff" : "#fff",
            color: value.mode === "flat" ? "#5200FF" : "#475569",
            cursor: unitId ? "pointer" : "not-allowed", opacity: unitId ? 1 : 0.5,
          }}
        >
          Assign to Flat
        </button>
      </div>

      {value.mode === "flat" && (
        <div style={{ display: "flex", gap: 6 }}>
          {flatsForBranch.length > 0 && (
            <Select
              value={value.flatId}
              onValueChange={(v) => onChange({ ...value, flatId: v, newFlatNumber: "" })}
            >
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select an existing Flat" /></SelectTrigger>
              <SelectContent>
                {flatsForBranch.map(f => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder={flatsForBranch.length > 0 ? "...or type a new Flat Number" : "Flat Number (will be created)"}
            value={value.newFlatNumber}
            className="rounded-lg"
            onChange={(e) => onChange({ ...value, newFlatNumber: e.target.value, flatId: "" })}
          />
        </div>
      )}
    </Field>
  );
}

/* ================= Shared Room Entry Row (Flat bulk-create mode) ================= */
export interface RoomEntryValue {
  key: string;
  suffix: string;
  hostelType: HostelType | "";
  totalBeds: string;
  rentPerBed: string;
}

let roomEntryCounter = 0;
const blankRoomEntry = (): RoomEntryValue => ({
  key: `entry-${Date.now()}-${roomEntryCounter++}`,
  suffix: "", hostelType: "", totalBeds: "", rentPerBed: "",
});

const buildRoomNumber = (flatLabel: string, rawSuffix: string): string => {
  const suffix = rawSuffix.trim();
  const label = flatLabel.trim();
  if (!label) return suffix;
  const prefix = `${label}-`;
  if (suffix.toLowerCase().startsWith(prefix.toLowerCase())) return suffix;
  return `${prefix}${suffix}`;
};

const pillButtonStyle = (active: boolean) => ({
  flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  border: active ? "1.5px solid #5200FF" : "1px solid #e2e8f0",
  background: active ? "#f5f3ff" : "#fff",
  color: active ? "#5200FF" : "#475569",
  cursor: "pointer", transition: "all 0.15s",
}) as const;

function RoomEntryRow({
  entry, flatLabel, onChange, onRemove, canRemove,
}: {
  entry: RoomEntryValue;
  flatLabel: string;
  onChange: (patch: Partial<RoomEntryValue>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, position: "relative", display: "flex", flexDirection: "column", gap: 10, background: "#fafafa" }}>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove this room"
          style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
        >
          <Trash2 size={14} color="#ef4444" />
        </button>
      )}

      <Field label="Room Name" required>
        <Input
          placeholder="e.g. HALL, Room-1"
          value={entry.suffix}
          onChange={(e) => onChange({ suffix: e.target.value })}
          className="rounded-lg"
          style={{ paddingRight: canRemove ? 32 : undefined }}
        />
      </Field>
      {flatLabel && entry.suffix.trim() && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -4 }}>
          Will be created as <strong style={{ color: "#5200FF" }}>{buildRoomNumber(flatLabel, entry.suffix)}</strong>
        </div>
      )}

      <Field label="Room Type" required>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => onChange({ hostelType: "AC" })} style={pillButtonStyle(entry.hostelType === "AC")}>AC</button>
          <button type="button" onClick={() => onChange({ hostelType: "NON_AC" })} style={pillButtonStyle(entry.hostelType === "NON_AC")}>Non-AC</button>
        </div>
      </Field>

      <div style={{ display: "flex", gap: 8 }}>
        <Field label="Total Beds" required className="flex-1">
          <BedCountPicker value={entry.totalBeds} onChange={(v) => onChange({ totalBeds: v })} />
        </Field>
        <Field label="Rent / Bed (Monthly)" className="flex-1">
          <Input
            type="number"
            placeholder="e.g. 4500"
            value={entry.rentPerBed}
            className="rounded-lg"
            onChange={(e) => onChange({ rentPerBed: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */
const RoomsPage = () => {

  const location = useLocation();
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [flats,      setFlats]      = useState<Flat[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page,       setPage]       = useState(0);
  const [pageSize]   = useState(10);
  const [loading,    setLoading]    = useState(false);

  // Raw input the user types into the search box (updates instantly for a
  // responsive field) vs. the debounced value that's actually sent to the
  // API. Search now runs server-side across ALL rooms/pages, not just the
  // 10 rows already loaded on the current page.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [addOpen,        setAddOpen]        = useState(false);
  const [editOpen,       setEditOpen]       = useState(false);
  const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // "idle" | "loading" | "done" | "error" — surfaced in the UI so a
  // failed branch fetch doesn't just silently show an empty dropdown.
  const [supporting, setSupporting] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [branchesLoading, setBranchesLoading] = useState(false);

  const [roomNumber,  setRoomNumber]  = useState("");
  const [hostelType,  setHostelType]  = useState<HostelType | "">("");
  const [totalBeds,   setTotalBeds]   = useState("");
  const [rentPerBed,  setRentPerBed]  = useState("");
  const [unitId,      setUnitId]      = useState("");

  const [flatAssign, setFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);
  const [editFlatAssign, setEditFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);

  const [flatRoomEntries, setFlatRoomEntries] = useState<RoomEntryValue[]>([blankRoomEntry()]);

  const addRoomEntry = () => setFlatRoomEntries(prev => [...prev, blankRoomEntry()]);
  const removeRoomEntry = (key: string) =>
    setFlatRoomEntries(prev => (prev.length > 1 ? prev.filter(e => e.key !== key) : prev));
  const updateRoomEntry = (key: string, patch: Partial<RoomEntryValue>) =>
    setFlatRoomEntries(prev => prev.map(e => (e.key === key ? { ...e, ...patch } : e)));

  const [branchSearchTerm, setBranchSearchTerm] = useState("");

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);

  const [wardenBranchName, setWardenBranchName] = useState("");

  const role     = getUserRole()?.toUpperCase();
  const isWarden = role === "WARDEN";
  const isAdmin  = !isWarden;

  const effectiveUnitId = isWarden ? String(getBranchId() ?? "") : unitId;

  /* ================= RESET FORM ================= */
  const resetAddForm = () => {
    setRoomNumber(""); setHostelType(""); setTotalBeds("");
    setRentPerBed(""); setUnitId(""); setFlatAssign(EMPTY_FLAT_ASSIGNMENT);
    setFlatRoomEntries([blankRoomEntry()]);
  };

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const branchesData = (await fetchAllPages<Branch>(getBranches)).filter(
        (b): b is Branch => !!b && b.id != null
      );
      setBranches(branchesData);

      if (isWarden) {
        const bid = getBranchId();
        if (!bid) {
          toast.error("Warden not mapped to a branch");
        } else {
          const branch = branchesData.find((b) => idsMatch(b.id, bid));
          setWardenBranchName(branch?.unitName || `Branch ${bid}`);
          setSelectedBranch(String(bid));
        }
      }
      return branchesData;
    } catch (err) {
      console.error(err);
      toast.error("Failed loading branches");
      return [];
    } finally {
      setBranchesLoading(false);
    }
  }, [isWarden]);

  /* ================= LOAD SUPPORTING DATA (branches + flats, once) ================= */
  const loadSupportingData = useCallback(async () => {
    if (supporting !== "idle") return;
    setSupporting("loading");
    try {
      const [, flatsResult] = await Promise.allSettled([
        loadBranches(),
        fetchAllPages<Flat>(getFlats),
      ]);

      const flatsData: Flat[] = flatsResult.status === "fulfilled" ? flatsResult.value : [];
      setFlats(flatsData.filter(Boolean));

      if (flatsResult.status === "rejected") {
        console.error(flatsResult.reason);
        toast.error("Failed loading flats");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed loading supporting data");
    } finally {
      setSupporting("done");
    }
  }, [loadBranches, supporting]);

  useEffect(() => { loadSupportingData(); }, [loadSupportingData]);

  useEffect(() => {
    if (addOpen && isAdmin) {
      loadBranches();
    }
  }, [addOpen, isAdmin, loadBranches]);

  useEffect(() => {
    if (addOpen && isAdmin && selectedBranch !== "all" && !unitId) {
      setUnitId(selectedBranch);
    }
  }, [addOpen, isAdmin, selectedBranch, unitId]);

  /* ── Close the branch dropdown on outside click ── */
  useEffect(() => {
    if (!branchDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [branchDropdownOpen]);

  /* ================= INCOMING NAVIGATION STATE ================= */
  useEffect(() => {
    if (supporting !== "done") return;
    const navState = location.state as { unitId?: number | string; openAddRoom?: boolean } | null;
    if (!navState) return;

    if (navState.unitId != null && !isWarden) {
      setSelectedBranch(String(navState.unitId));
      setUnitId(String(navState.unitId));
      setPage(0);
    }
    if (navState.openAddRoom && isAdmin) {
      setAddOpen(true);
    }

    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supporting, location.state, isWarden, isAdmin]);

  /* ================= DEBOUNCE SEARCH INPUT ================= */
  // Wait 400ms after the user stops typing before hitting the API, and
  // jump back to page 0 since the result set (and its page count) changes.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  /* ================= LOAD ROOMS (real API, page-based, server-side search) ================= */
  const loadRooms = useCallback(async () => {
    if (supporting !== "done") return;
    setLoading(true);
    try {
      const queryParams: Record<string, any> = { page, size: pageSize };
      if (selectedBranch !== "all") {
        queryParams.unitId = selectedBranch;
      }
      if (debouncedSearch) {
        queryParams.search = debouncedSearch;
      }

      const res = await api.get(`/rooms`, { params: queryParams });
      const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
      const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

      const enriched = content.filter(Boolean).map((room: Room) => {
        const occ   = room.occupiedBeds ?? 0;
        const avail = (room.totalBeds   || 0) - occ;

        const resolvedUnitName =
          room.unitName ||
          branches.find((b) => idsMatch(b.id, room.unitId))?.unitName ||
          "-";

        return {
          ...room,
          unitName:  resolvedUnitName,
          flatName:  room.flatName ?? "N/A",
          occupied:  occ,
          available: avail,
          status:    avail > 0 ? (occ > 0 ? "Partially Occupied" : "Available") : "Occupied",
        };
      });

      setRooms(enriched);
      setTotalCount(totalElements);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedBranch, debouncedSearch, supporting, branches]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* ================= HELPERS ================= */
  const flatsByBranch = useMemo(() => {
    if (!effectiveUnitId) return [];
    return flats.filter(f => f && String(f.branchId) === effectiveUnitId);
  }, [flats, effectiveUnitId]);

  const addFlatLabel = flatAssign.flatId
    ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
    : flatAssign.newFlatNumber.trim();

  const flatsByEditBranch = useMemo(() => {
    if (!editRoomData?.unitId) return [];
    return flats.filter(f => f && String(f.branchId) === String(editRoomData.unitId));
  }, [flats, editRoomData?.unitId]);

  const getRoomTypeName = (beds: number, type: string) => {
    const prefix = beds === 1 ? 'Single' : beds === 2 ? 'Double' : beds === 3 ? 'Triple' : beds === 4 ? 'Quad' : `${beds} Bed`;
    const suffix = type === 'AC' ? 'AC' : type === 'NON_AC' ? 'Non-AC' : type;
    return `${prefix} ${suffix}`;
  };

  const getRoomTypeColor = (typeStr: string) => {
    if (typeStr.includes('Single')) return { color: '#3b82f6', bg: '#eff6ff' };
    if (typeStr.includes('Double')) return { color: '#22c55e', bg: '#dcfce7' };
    if (typeStr.includes('Triple')) return { color: '#8b5cf6', bg: '#f3e8ff' };
    if (typeStr.includes('Quad')) return { color: '#f97316', bg: '#ffedd5' };
    return { color: '#64748b', bg: '#f1f5f9' };
  };

  const resolveFlatId = async (
    assign: FlatAssignmentValue,
    branchId: number
  ): Promise<number | null> => {
    if (assign.mode === "direct") return null;
    if (assign.flatId) return Number(assign.flatId);

    const flatNumber = assign.newFlatNumber.trim();
    const rawResponse = await createFlat({ flatNumber, branchId });

    let newFlat = unwrapEntity<Flat>(rawResponse);

    if (!newFlat) {
      console.warn("createFlat did not return a usable Flat object, re-fetching flats list:", rawResponse);
      const allFlats = (await fetchAllPages<Flat>(getFlats)).filter(Boolean);
      setFlats(allFlats);
      newFlat = allFlats.find(
        f => f && String(f.branchId) === String(branchId) && f.flatNumber === flatNumber
      );
      if (!newFlat) {
        throw new Error(
          "Flat may not have been created — check the Network tab for the /flats request."
        );
      }
    } else {
      setFlats(prev => [...prev, newFlat!]);
    }

    return newFlat.id;
  };

  const handleAdd = async () => {
    if (!effectiveUnitId) {
      toast.error("Branch is required");
      return;
    }

    if (flatAssign.mode === "direct") {
      if (!roomNumber || !hostelType) {
        toast.error("Room number and room type are required");
        return;
      }
      try {
        const desiredBeds = Number(totalBeds) || 0;
        const res = await createRoom({
          roomNumber,
          hostelType: hostelType as HostelType,
          totalBeds:  desiredBeds,
          rentPerBed: Number(rentPerBed) || 0,
          unitId:     Number(effectiveUnitId),
          flatId:     null,
        });

        const newRoom = unwrapEntity<Room>(res);

        toast.success(`Room created with ${desiredBeds} bed${desiredBeds === 1 ? "" : "s"}`);
        setAddOpen(false);
        resetAddForm();

        navigate("/tenants", {
          state: {
            unitId: Number(effectiveUnitId),
            roomId: newRoom?.id,
            openAddTenant: true,
          },
        });
      } catch (e: any) {
        showBedLimitToast(e, navigate, "Create failed");
      }
      return;
    }

    if (!flatAssign.flatId && !flatAssign.newFlatNumber.trim()) {
      toast.error("Select an existing flat or enter a new flat number");
      return;
    }
    const validEntries = flatRoomEntries.filter(
      e => e.suffix.trim() && e.hostelType && Number(e.totalBeds) > 0
    );
    if (validEntries.length === 0) {
      toast.error("Add at least one room with a name, room type, and bed count");
      return;
    }

    try {
      const resolvedFlatId = await resolveFlatId(flatAssign, Number(effectiveUnitId));
      const flatLabel = flatAssign.flatId
        ? (flatsByBranch.find(f => String(f.id) === flatAssign.flatId)?.flatNumber ?? "")
        : flatAssign.newFlatNumber.trim();

      let created = 0;
      const failedNames: string[] = [];

      for (const entry of validEntries) {
        const desiredBeds = Number(entry.totalBeds) || 0;
        const roomNumberToCreate = buildRoomNumber(flatLabel, entry.suffix);

        try {
          await createRoom({
            roomNumber: roomNumberToCreate,
            hostelType: entry.hostelType as HostelType,
            totalBeds:  desiredBeds,
            rentPerBed: Number(entry.rentPerBed) || 0,
            unitId:     Number(effectiveUnitId),
            flatId:     resolvedFlatId,
          });
          created++;
        } catch (innerErr: any) {
          console.error(`Failed creating room "${roomNumberToCreate}":`, innerErr);
          if (isBedLimitError(innerErr)) {
            // Limit hit mid-batch — show the "Add Beds" toast once and stop;
            // every remaining entry in this batch would fail the same way.
            showBedLimitToast(innerErr, navigate, "Create failed");
            break;
          }
          failedNames.push(
            `${roomNumberToCreate} (${innerErr?.response?.data?.message || "unknown error"})`
          );
        }
      }

      if (created > 0) {
        toast.success(`${created} room${created === 1 ? "" : "s"} created under ${flatLabel}`);
      }
      if (failedNames.length > 0) {
        toast.error(`Failed to create: ${failedNames.join(", ")}`);
      }
      if (created > 0) {
        setAddOpen(false);
        resetAddForm();
        loadRooms();
      }
    } catch (e: any) {
      showBedLimitToast(e, navigate, "Create failed");
    }
  };

  const handleEdit = async () => {
    if (!editRoomData) return;
    if (editFlatAssign.mode === "flat" && !editFlatAssign.flatId && !editFlatAssign.newFlatNumber.trim()) {
      toast.error("Select an existing flat or enter a new flat number");
      return;
    }
    try {
      const resolvedFlatId = await resolveFlatId(editFlatAssign, Number(editRoomData.unitId));
      const desiredBeds = Number(editRoomData.totalBeds) || 0;
      await editRoom(editRoomData.id, {
        ...editRoomData,
        totalBeds:  desiredBeds,
        rentPerBed: Number(editRoomData.rentPerBed) || 0,
        flatId:     resolvedFlatId,
      });
      toast.success("Room updated");
      setEditOpen(false);
      setEditRoomData(null);
      loadRooms();
    } catch (e: any) {
      // Bumping totalBeds on an existing room can also push past the cap.
      showBedLimitToast(e, navigate, "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await removeRoom(id);
      toast.success("Room deleted");
      loadRooms();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const openEditRoom = (room: Room) => {
    setEditRoomData({ ...room });
    setEditFlatAssign({
      mode: room.flatId ? "flat" : "direct",
      flatId: room.flatId ? String(room.flatId) : "",
      newFlatNumber: "",
    });
    setEditOpen(true);
  };

  // NOTE: `rooms` is now already the search-matched, server-paginated set —
  // no client-side re-filtering here. Filtering only the current page's 10
  // rows was the original bug (a room on page 7 wouldn't show up while
  // viewing page 1).

  const visibleBranches = branchSearchTerm.trim()
    ? branches.filter(b => (b.unitName || "").toLowerCase().includes(branchSearchTerm.toLowerCase()))
    : branches;

  // Label shown on the dropdown trigger button.
  const selectedBranchLabel = isWarden
    ? wardenBranchName
    : selectedBranch === "all"
      ? "All Branches"
      : (branches.find(b => String(b.id) === selectedBranch)?.unitName ?? "Select Branch");

  const selectBranchOption = (value: string) => {
    setSelectedBranch(value);
    setPage(0);
    setBranchDropdownOpen(false);
    setBranchSearchTerm("");
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedBranch(isWarden ? String(getBranchId()) : "all");
    setPage(0);
  };

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage1Based = page + 1;
  const pageNumbers = getPageNumbers(currentPage1Based, totalPages);

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rm-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .rm-layout { display: flex; flex-direction: column; gap: 24px; align-items: stretch; margin-top: 12px; }
        .rm-main { flex: 1; min-width: 0; }

        /* ── Branch dropdown (replaces the old horizontal branch strip) ── */
        .rm-branch-dropdown-wrap { position: relative; display: inline-block; }
        .rm-branch-dropdown-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
          min-width: 220px; padding: 0 14px; height: 40px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #fff; cursor: pointer;
          font-size: 13px; font-weight: 600; color: #0f172a; transition: border-color 0.15s;
        }
        .rm-branch-dropdown-trigger:hover { border-color: #cbd5e1; }
        .rm-branch-dropdown-trigger.disabled { cursor: not-allowed; opacity: 0.6; }
        .rm-branch-dropdown-trigger-left { display: flex; align-items: center; gap: 10px; }
        .rm-branch-dropdown-chevron { transition: transform 0.15s; color: #94a3b8; }
        .rm-branch-dropdown-chevron.open { transform: rotate(180deg); }

        .rm-branch-dropdown-menu {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
          width: 300px; max-height: 340px; overflow-y: auto;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12); padding: 6px;
        }
        .rm-branch-dropdown-search {
          display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0;
          border-radius: 8px; padding: 0 10px; height: 34px; margin-bottom: 6px; background: #fafafa;
        }
        .rm-branch-dropdown-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

        .rm-branch-dropdown-item {
          display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px;
          font-size: 13px; font-weight: 500; color: #334155; cursor: pointer;
        }
        .rm-branch-dropdown-item:hover { background: #f8fafc; }
        .rm-branch-dropdown-item.active { background: #f3e8ff; color: #5200FF; font-weight: 600; }
        .rm-branch-dropdown-item.disabled { cursor: not-allowed; opacity: 0.5; }
        .rm-branch-dropdown-item .check-slot { width: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rm-branch-dropdown-empty { padding: 12px 10px; font-size: 12.5px; color: #94a3b8; text-align: center; }

        .rm-main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .rm-main-header-right { display: flex; align-items: center; gap: 12px; }
        .rm-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
        .rm-btn-outline:hover { background: #f8fafc; }
        .rm-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
        .rm-btn-primary:hover { background: #4200cc; }

        .rm-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .rm-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
        .rm-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
        .rm-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; margin-left: auto; }

        .rm-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
        .rm-table { width: 100%; border-collapse: collapse; min-width: 860px; }
        .rm-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
        .rm-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .rm-table tr:last-child td { border-bottom: none; }
        .rm-table tr:hover { background: #fdfcff; }

        .rm-col-number { font-size: 14px; font-weight: 600; color: #0f172a; }
        .rm-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }

        .rm-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }

        .rm-count { font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }

        .rm-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .rm-status-badge.occupied { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .rm-status-badge.partially { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
        .rm-status-badge.available { color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; }

        .rm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; flex-wrap: wrap; gap: 12px; }
        .rm-page-info { font-size: 13px; color: #64748b; }
        .rm-page-controls { display: flex; align-items: center; gap: 6px; }
        .rm-page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .rm-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .rm-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .rm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rm-page-ellipsis { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; }

        /* Landscape dialog layout for Add/Edit Room — widened so a
           3-column grid reads comfortably and fields never feel
           squeezed against the card edges. */
        .rm-dialog-landscape { max-width: 900px !important; width: 96vw; }
        .rm-dialog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 20px; }
        .rm-dialog-grid .rm-span-2 { grid-column: span 2; }
        .rm-dialog-grid .rm-span-3 { grid-column: 1 / -1; }
        .rm-entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 760px) {
          .rm-dialog-grid { grid-template-columns: 1fr 1fr; }
          .rm-dialog-grid .rm-span-2 { grid-column: 1 / -1; }
        }
        @media (max-width: 520px) {
          .rm-dialog-grid { grid-template-columns: 1fr; }
          .rm-dialog-grid .rm-span-2 { grid-column: 1; }
          .rm-entry-grid { grid-template-columns: 1fr; }
        }

        /* Soften the selected/focus ring on selects & inputs inside the
           dialog so a chosen value (e.g. a picked Branch) reads as a
           normal filled field instead of a bright, full-width blue
           highlight competing with the label above it. */
        .rm-dialog-landscape button[role="combobox"],
        .rm-dialog-landscape input {
          border-color: #e2e8f0 !important;
          box-shadow: none !important;
        }
        .rm-dialog-landscape button[role="combobox"]:focus,
        .rm-dialog-landscape button[role="combobox"]:focus-visible,
        .rm-dialog-landscape input:focus,
        .rm-dialog-landscape input:focus-visible {
          border-color: #5200FF !important;
          box-shadow: 0 0 0 3px rgba(82,0,255,0.12) !important;
          outline: none !important;
        }
      `}</style>

      <div className="rm-wrap">

        <div className="rm-layout">

          {/* Main Content Area */}
          <div className="rm-main">
            <div className="rm-main-header">
              <div className="rm-branch-dropdown-wrap" ref={branchDropdownRef}>
                <button
                  type="button"
                  className={`rm-branch-dropdown-trigger ${isWarden ? "disabled" : ""}`}
                  onClick={() => { if (!isWarden) setBranchDropdownOpen(o => !o); }}
                >
                  <span className="rm-branch-dropdown-trigger-left">
                    <Building2 size={16} color="#8b5cf6" />
                    {selectedBranchLabel}
                  </span>
                  {!isWarden && (
                    <ChevronDown size={16} className={`rm-branch-dropdown-chevron ${branchDropdownOpen ? "open" : ""}`} />
                  )}
                </button>

                {branchDropdownOpen && !isWarden && (
                  <div className="rm-branch-dropdown-menu">
                    <div className="rm-branch-dropdown-search">
                      <Search size={13} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Search branches..."
                        value={branchSearchTerm}
                        onChange={(e) => setBranchSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div
                      className={`rm-branch-dropdown-item ${selectedBranch === "all" ? "active" : ""}`}
                      onClick={() => selectBranchOption("all")}
                    >
                      <span className="check-slot">{selectedBranch === "all" && <Check size={14} />}</span>
                      All Branches
                    </div>

                    {visibleBranches.length === 0 ? (
                      <div className="rm-branch-dropdown-empty">No branches found.</div>
                    ) : (
                      visibleBranches.map(branch => (
                        <div
                          key={branch.id}
                          className={`rm-branch-dropdown-item ${selectedBranch === String(branch.id) ? "active" : ""}`}
                          onClick={() => selectBranchOption(String(branch.id))}
                        >
                          <span className="check-slot">{selectedBranch === String(branch.id) && <Check size={14} />}</span>
                          {branch.unitName}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="rm-main-header-right">
                <button className="rm-btn-outline"><Download size={16} /> Export</button>

                {isAdmin && (
                  <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
                    <DialogTrigger asChild>
                      <button className="rm-btn-primary"><Plus size={16} /> Add Room</button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl overflow-hidden rm-dialog-landscape">
                      <DialogHeader>
                        <DialogTitle>{flatAssign.mode === "flat" ? "Add Rooms under a Flat" : "Add Room"}</DialogTitle>
                        <DialogDescription>
                          {flatAssign.mode === "flat"
                            ? "Create one or more rooms together under the same flat/floor."
                            : "Create a new room and map it to a branch."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
                        <div className="rm-span-3">
                          {isWarden ? (
                            <Field label="Branch">
                              <Input value={wardenBranchName} disabled className="bg-slate-50 rounded-lg" />
                            </Field>
                          ) : (
                            <Field label="Branch" required>
                              <div className="space-y-1">
                                <Select
                                  key={branches.length}
                                  value={unitId}
                                  onValueChange={(v) => { setUnitId(v); setFlatAssign(EMPTY_FLAT_ASSIGNMENT); }}
                                >
                                  <SelectTrigger className="rounded-lg">
                                    <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branchesLoading ? (
                                      <div className="p-2 text-xs text-muted-foreground text-center">Loading branches…</div>
                                    ) : branches.length > 0 ? (
                                      branches
                                        .filter(b => b && b.id != null)
                                        .map(b => (
                                          <SelectItem key={String(b.id)} value={String(b.id)}>
                                            {b.unitName || `Branch ${b.id}`}
                                          </SelectItem>
                                        ))
                                    ) : (
                                      <div className="p-2 text-xs text-muted-foreground text-center">
                                        No branches found
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                {!branchesLoading && branches.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => loadBranches()}
                                    className="text-[11px] font-medium text-[#5200FF] hover:underline flex items-center gap-1"
                                  >
                                    <RefreshCw size={11} /> Retry loading branches
                                  </button>
                                )}
                              </div>
                            </Field>
                          )}
                        </div>
                        <div className="rm-span-3">
                          <FlatAssignmentField
                            unitId={effectiveUnitId}
                            flatsForBranch={flatsByBranch}
                            value={flatAssign}
                            onChange={setFlatAssign}
                          />
                        </div>

                        {flatAssign.mode === "direct" ? (
                          <>
                            <Field label="Room Number" required>
                              <Input placeholder="e.g. 101" value={roomNumber} className="rounded-lg" onChange={e => setRoomNumber(e.target.value)} />
                            </Field>

                            <Field label="Room Type" required>
                              <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
                                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Type" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AC">AC</SelectItem>
                                  <SelectItem value="NON_AC">Non-AC</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>

                            {/* Bed count — plain number input, shared with Edit. */}
                            <Field label="Total Beds" required>
                              <BedCountPicker value={totalBeds} onChange={setTotalBeds} />
                            </Field>

                            <Field label="Rent per Bed (Monthly)" className="rm-span-2">
                              <Input type="number" placeholder="e.g. 4500" value={rentPerBed} className="rounded-lg" onChange={e => setRentPerBed(e.target.value)} />
                            </Field>
                          </>
                        ) : (
                          <div className="rm-span-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div className="rm-entry-grid">
                              {flatRoomEntries.map(entry => (
                                <RoomEntryRow
                                  key={entry.key}
                                  entry={entry}
                                  flatLabel={addFlatLabel}
                                  onChange={(patch) => updateRoomEntry(entry.key, patch)}
                                  onRemove={() => removeRoomEntry(entry.key)}
                                  canRemove={flatRoomEntries.length > 1}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={addRoomEntry}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                width: "100%", padding: "8px 0", borderRadius: 8,
                                border: "1.5px dashed #cbd5e1", background: "#fff",
                                fontSize: 12.5, fontWeight: 600, color: "#5200FF", cursor: "pointer",
                              }}
                            >
                              <Plus size={14} /> Add Another Room
                            </button>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="rounded-lg">Cancel</Button></DialogClose>
                        <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">
                          {flatAssign.mode === "flat"
                            ? (() => {
                                const n = flatRoomEntries.filter(e => e.suffix.trim()).length;
                                return n > 0 ? `Save ${n} Room${n === 1 ? "" : "s"}` : "Save Rooms";
                              })()
                            : "Save Room"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="rm-filters-row">
              <div className="rm-search-main">
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button className="rm-clear-btn" onClick={clearFilters}>
                <RefreshCw size={14} /> Clear Filters
              </button>
            </div>

            <div className="rm-table-container">
              <div className="overflow-x-auto">
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>ROOM NO.</th>
                      <th>ROOM TYPE</th>
                      <th>BRANCH</th>
                      <th className="text-center">BEDS</th>
                      <th className="text-center">OCCUPIED</th>
                      <th className="text-center">AVAILABLE</th>
                      <th>STATUS</th>
                      {isAdmin && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">Loading rooms...</td></tr>
                    ) : rooms.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">No rooms found.</td></tr>
                    ) : (
                      rooms.map((room: any) => {
                        const typeName  = getRoomTypeName(room.totalBeds, room.hostelType);
                        const typeColor = getRoomTypeColor(typeName);

                        return (
                          <tr key={room.id}>
                            <td><span className="rm-col-number">{room.roomNumber}</span></td>
                            <td>
                              <span className="rm-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
                                {typeName}
                              </span>
                            </td>
                            <td>
                              <div className="rm-branch-name">{room.unitName || "-"}</div>
                            </td>
                            <td className="text-center"><span className="rm-count">{room.totalBeds}</span></td>
                            <td className="text-center"><span className="rm-count">{room.occupied}</span></td>
                            <td className="text-center"><span className="rm-count">{room.available}</span></td>
                            <td>
                              <div className={`rm-status-badge ${room.status === 'Occupied' ? 'occupied' : room.status === 'Partially Occupied' ? 'partially' : 'available'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${room.status === 'Occupied' ? 'bg-green-500' : room.status === 'Partially Occupied' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                {room.status}
                              </div>
                            </td>
                            {isAdmin && (
                              <td>
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                                    onClick={() => openEditRoom(room)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(room.id)} className="bg-red-600 hover:bg-red-700 rounded-lg">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rm-pagination">
                <div className="rm-page-info">
                  Showing {rooms.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} rooms
                </div>

                <div className="rm-page-controls">
                  <Button
                    size="icon" variant="outline" className="w-8 h-8 rounded-lg"
                    disabled={page === 0} onClick={() => setPage(p => Math.max(p - 1, 0))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="rm-page-ellipsis">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`rm-page-btn ${p === currentPage1Based ? "active" : ""}`}
                        onClick={() => setPage(p - 1)}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <Button
                    size="icon" variant="outline" className="w-8 h-8 rounded-lg"
                    disabled={currentPage1Based >= totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditRoomData(null); setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); } }}>

            <DialogContent className="rounded-2xl overflow-hidden rm-dialog-landscape">
              <DialogHeader>
                <DialogTitle>Edit Room</DialogTitle>
                <DialogDescription>Update room details.</DialogDescription>
              </DialogHeader>
              {editRoomData && (
                <div className="rm-dialog-grid max-h-[65vh] overflow-y-auto pr-1">
                  {/* Step 1 — Branch first */}
                  <div className="rm-span-3">
                    <Field label="Branch" required>
                      <Select
                        value={String(editRoomData.unitId)}
                        onValueChange={v => {
                          setEditRoomData({ ...editRoomData, unitId: Number(v) });
                          setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); // branch changed — flat choice no longer valid
                        }}
                      >
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                        <SelectContent>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Step 2 — Direct Room vs Assign to Flat */}
                  <div className="rm-span-3">
                    <FlatAssignmentField
                      unitId={editRoomData.unitId ? String(editRoomData.unitId) : ""}
                      flatsForBranch={flatsByEditBranch}
                      value={editFlatAssign}
                      onChange={setEditFlatAssign}
                    />
                  </div>

                  {/* Step 3 — Room Number, Room Type, Beds and Rent laid
                      out across the 3-column landscape grid. */}
                  <Field label="Room Number" required>
                    <Input placeholder="e.g. 101" value={editRoomData.roomNumber} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })} />
                  </Field>

                  <Field label="Room Type" required>
                    <Select value={editRoomData.hostelType || ""} onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}>
                      <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="NON_AC">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Total Beds" required>
                    <BedCountPicker
                      value={String(editRoomData.totalBeds ?? "")}
                      onChange={(v) => setEditRoomData({ ...editRoomData, totalBeds: Number(v) || 0 })}
                    />
                  </Field>

                  <Field label="Rent per Bed (Monthly)" className="rm-span-2">
                    <Input type="number" placeholder="e.g. 4500" value={String(editRoomData.rentPerBed ?? 0)} className="rounded-lg" onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })} />
                  </Field>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc] rounded-lg">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default RoomsPage;