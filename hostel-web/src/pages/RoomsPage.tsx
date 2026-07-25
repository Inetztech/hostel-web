// import { useEffect, useMemo, useState, useCallback } from "react";
// import api from "@/lib/api";
// import {
//   createRoom,
//   editRoom,
//   removeRoom,
//   getBranches,
//   getUserRole,
//   getBranchId,
//   getFlats,
// } from "@/lib/store";

// import { Room, HostelType, Branch, Flat } from "@/lib/types";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle,
//   DialogTrigger, DialogDescription, DialogFooter, DialogClose,
// } from "@/components/ui/dialog";
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
//   AlertDialogDescription, AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import {
//   Plus, Pencil, Trash2,
//   Search, Download, RefreshCw,
//   ChevronLeft, ChevronRight, Building2,
// } from "lucide-react";

// /* ================= GENERIC HELPER — fetch every page of any paginated store fn ================= */
// async function fetchAllPages<T>(
//   fetchFn: (page: number, size: number) => Promise<any>,
//   pageSize = 10
// ): Promise<T[]> {
//   const first = await fetchFn(0, pageSize);
//   const firstContent: T[] = first?.content ?? first ?? [];
//   const total: number     = first?.totalElements ?? firstContent.length;
//   if (total <= pageSize) return firstContent;
//   const totalPages = Math.ceil(total / pageSize);
//   const rest = await Promise.all(
//     Array.from({ length: totalPages - 1 }, (_, i) =>
//       fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? r ?? [])
//     )
//   );
//   return [...firstContent, ...rest.flat()];
// }

// /* ================= ID NORMALIZATION HELPER =================
//    Warden's branch id (getBranchId(), often sourced from sessionStorage
//    / a JWT claim) can come back as a string ("6") while Branch.id from
//    the API is numeric (6). Strict `===` silently fails on that mismatch
//    — always compare via String(...) on both sides. */
// const idsMatch = (a: unknown, b: unknown): boolean =>
//   a != null && b != null && String(a) === String(b);

// /* ================= COMPONENT ================= */
// const RoomsPage = () => {

//   /* ================= STATE ================= */
//   const [branches,   setBranches]   = useState<Branch[]>([]);
//   const [flats,      setFlats]      = useState<Flat[]>([]);
//   const [rooms,      setRooms]      = useState<Room[]>([]);
//   const [totalCount, setTotalCount] = useState(0);

//   const [page,       setPage]       = useState(0);
//   const [pageSize]   = useState(10);
//   const [loading,    setLoading]    = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   const [addOpen,        setAddOpen]        = useState(false);
//   const [editOpen,       setEditOpen]       = useState(false);
//   const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
//   const [selectedBranch, setSelectedBranch] = useState<string>("all");

//   const [supporting, setSupporting] = useState<"idle" | "loading" | "done">("idle");

//   const [roomNumber,  setRoomNumber]  = useState("");
//   const [hostelType,  setHostelType]  = useState<HostelType | "">("");
//   const [totalBeds,   setTotalBeds]   = useState("");
//   const [rentPerBed,  setRentPerBed]  = useState("");
//   const [unitId,      setUnitId]      = useState("");
//   const [flatId,      setFlatId]      = useState("");

//   const [wardenBranchName, setWardenBranchName] = useState("");

//   const role     = getUserRole()?.toUpperCase();
//   const isWarden = role === "WARDEN";
//   const isAdmin  = !isWarden;

//   /* ================= RESET FORM ================= */
//   const resetAddForm = () => {
//     setRoomNumber(""); setHostelType(""); setTotalBeds("");
//     setRentPerBed(""); setUnitId(""); setFlatId("");
//   };

//   /* ================= LOAD SUPPORTING DATA ================= */
//   const loadSupportingData = useCallback(async () => {
//     if (supporting !== "idle") return;
//     setSupporting("loading");
//     try {
//       const [branchesResult, flatsResult] = await Promise.allSettled([
//         fetchAllPages<Branch>(getBranches),
//         fetchAllPages<Flat>(getFlats),
//       ]);

//       const branchesData: Branch[] = branchesResult.status === "fulfilled" ? branchesResult.value : [];
//       const flatsData:    Flat[]   = flatsResult.status    === "fulfilled" ? flatsResult.value    : [];

//       setBranches(branchesData);
//       setFlats(flatsData);

//       if (isWarden) {
//         const bid = getBranchId();
//         if (!bid) { toast.error("Warden not mapped to a branch"); return; }
//         // idsMatch guards against the string/number id mismatch noted above
//         const branch = branchesData.find((b: Branch) => idsMatch(b.id, bid));
//         setWardenBranchName(branch?.unitName || `Branch ${bid}`);
//         setSelectedBranch(String(bid));
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed loading supporting data");
//     } finally {
//       setSupporting("done");
//     }
//   }, [isWarden, supporting]);

//   useEffect(() => { loadSupportingData(); }, [loadSupportingData]);

//   /* ================= LOAD ROOMS (real API, page-based) ================= */
//   const loadRooms = useCallback(async () => {
//     if (supporting !== "done") return;
//     setLoading(true);
//     try {
//       const queryParams: Record<string, any> = { page, size: pageSize };
//       if (selectedBranch !== "all") {
//         queryParams.unitId = selectedBranch;
//       }

//       const res = await api.get(`/rooms`, { params: queryParams });
//       const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
//       const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

//       const enriched = content.map((room: Room) => {
//         const occ   = room.occupiedBeds ?? 0;
//         const avail = (room.totalBeds   || 0) - occ;

//         // Fall back to resolving the branch name client-side (idsMatch)
//         // in case this row's unitName ever comes back empty.
//         const resolvedUnitName =
//           room.unitName ||
//           branches.find((b) => idsMatch(b.id, room.unitId))?.unitName ||
//           "-";

//         return {
//           ...room,
//           unitName:  resolvedUnitName,
//           flatName:  room.flatName ?? "N/A",
//           occupied:  occ,
//           available: avail,
//           status:    avail > 0 ? (occ > 0 ? "Partially Occupied" : "Available") : "Occupied",
//         };
//       });

//       setRooms(enriched);
//       setTotalCount(totalElements);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load rooms");
//     } finally {
//       setLoading(false);
//     }
//   }, [page, pageSize, selectedBranch, supporting, branches]);

//   useEffect(() => { loadRooms(); }, [loadRooms]);

//   /* ================= HELPERS ================= */
//   const flatsByBranch = useMemo(() => {
//     if (!unitId) return [];
//     return flats.filter(f => String(f.branchId) === unitId);
//   }, [flats, unitId]);

//   const flatsByEditBranch = useMemo(() => {
//     if (!editRoomData?.unitId) return [];
//     return flats.filter(f => String(f.branchId) === String(editRoomData.unitId));
//   }, [flats, editRoomData?.unitId]);

//   const getRoomTypeName = (beds: number, type: string) => {
//     const prefix = beds === 1 ? 'Single' : beds === 2 ? 'Double' : beds === 3 ? 'Triple' : beds === 4 ? 'Quad' : `${beds} Bed`;
//     const suffix = type === 'AC' ? 'AC' : type === 'NON_AC' ? 'Non-AC' : type;
//     return `${prefix} ${suffix}`;
//   };

//   const getRoomTypeColor = (typeStr: string) => {
//     if (typeStr.includes('Single')) return { color: '#3b82f6', bg: '#eff6ff' };
//     if (typeStr.includes('Double')) return { color: '#22c55e', bg: '#dcfce7' };
//     if (typeStr.includes('Triple')) return { color: '#8b5cf6', bg: '#f3e8ff' };
//     if (typeStr.includes('Quad')) return { color: '#f97316', bg: '#ffedd5' };
//     return { color: '#64748b', bg: '#f1f5f9' };
//   };

//   /* ================= CRUD ================= */
//   const handleAdd = async () => {
//     if (!roomNumber || !unitId || !hostelType) {
//       toast.error("Room number, branch, and room type are required");
//       return;
//     }
//     try {
//       await createRoom({
//         roomNumber,
//         hostelType: hostelType as HostelType,
//         totalBeds:  Number(totalBeds)  || 0,
//         rentPerBed: Number(rentPerBed) || 0,
//         unitId:     Number(unitId),
//         flatId:     flatId ? Number(flatId) : null,
//       });
//       toast.success("Room created");
//       setAddOpen(false);
//       resetAddForm();
//       loadRooms();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Create failed");
//     }
//   };

//   const handleEdit = async () => {
//     if (!editRoomData) return;
//     try {
//       // Spread the full editRoomData so no real field silently drops off
//       // an edit (matches the corrected AG-Grid version's payload shape).
//       await editRoom(editRoomData.id, {
//         ...editRoomData,
//         totalBeds:  Number(editRoomData.totalBeds)  || 0,
//         rentPerBed: Number(editRoomData.rentPerBed) || 0,
//       });
//       toast.success("Room updated");
//       setEditOpen(false);
//       setEditRoomData(null);
//       loadRooms();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Update failed");
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await removeRoom(id);
//       toast.success("Room deleted");
//       loadRooms();
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message || "Delete failed");
//     }
//   };

//   const filteredRooms = rooms.filter(r =>
//     r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     (r.unitName && r.unitName.toLowerCase().includes(searchTerm.toLowerCase()))
//   );

//   /* ================= UI ================= */
//   return (
//     <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         .rm-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

//         .rm-layout { display: flex; gap: 24px; align-items: flex-start; margin-top: 12px; }
//         .rm-sidebar { width: 260px; flex-shrink: 0; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; }
//         .rm-main { flex: 1; min-width: 0; }

//         .rm-sidebar-title { font-size: 14px; font-weight: 700; color: #0f172a; padding: 16px 20px 12px; }
//         .rm-sidebar-search { margin: 0 20px 16px; display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; }
//         .rm-sidebar-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

//         .rm-branch-list { padding-bottom: 16px; }
//         .rm-branch-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; cursor: pointer; transition: background 0.2s; }
//         .rm-branch-item:hover { background: #f8fafc; }
//         .rm-branch-item.active { background: #f3e8ff; border-left: 3px solid #5200FF; padding-left: 17px; }

//         .rm-branch-item-left { display: flex; align-items: center; gap: 12px; }
//         .rm-branch-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
//         .rm-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }
//         .rm-branch-item.active .rm-branch-name { color: #5200FF; }

//         .rm-main-header { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 20px; gap: 12px; }
//         .rm-btn-outline { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; transition: all 0.2s; }
//         .rm-btn-outline:hover { background: #f8fafc; }
//         .rm-btn-primary { display: flex; align-items: center; gap: 8px; background: #5200FF; border: none; border-radius: 8px; padding: 0 16px; height: 38px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
//         .rm-btn-primary:hover { background: #4200cc; }

//         .rm-filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
//         .rm-search-main { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; width: 220px; }
//         .rm-search-main input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }
//         .rm-clear-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; background: transparent; border: none; padding: 6px 12px; margin-left: auto; }

//         .rm-table-container { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
//         .rm-table { width: 100%; border-collapse: collapse; min-width: 860px; }
//         .rm-table th { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; background: #fafafa; letter-spacing: 0.5px; }
//         .rm-table td { padding: 16px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
//         .rm-table tr:last-child td { border-bottom: none; }
//         .rm-table tr:hover { background: #fdfcff; }

//         .rm-col-number { font-size: 14px; font-weight: 600; color: #0f172a; }
//         .rm-type-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }

//         .rm-count { font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }

//         .rm-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
//         .rm-status-badge.occupied { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
//         .rm-status-badge.partially { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
//         .rm-status-badge.available { color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; }

//         .rm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; }
//         .rm-page-info { font-size: 13px; color: #64748b; }
//         .rm-page-controls { display: flex; align-items: center; gap: 8px; }
//         .rm-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
//         .rm-page-btn:hover:not(:disabled) { background: #f8fafc; }
//         .rm-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
//         .rm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
//       `}</style>

//       <div className="rm-wrap">

//         <div className="rm-layout">

//           {/* Left Sidebar — branch filter, wired to the real selectedBranch/page state */}
//           <div className="rm-sidebar">
//             <div className="rm-sidebar-title">Branches</div>
//             <div className="rm-sidebar-search">
//               <Search size={14} color="#94a3b8" />
//               <input type="text" placeholder="Search branches..." />
//             </div>

//             <div className="rm-branch-list">
//               <div
//                 className={`rm-branch-item ${selectedBranch === 'all' ? 'active' : ''} ${isWarden ? 'pointer-events-none opacity-50' : ''}`}
//                 onClick={() => { if (!isWarden) { setSelectedBranch('all'); setPage(0); } }}
//               >
//                 <div className="rm-branch-item-left">
//                   <div className="rm-branch-icon" style={{ background: '#f5f3ff' }}>
//                     <Building2 size={16} color="#8b5cf6" />
//                   </div>
//                   <span className="rm-branch-name">All Branches</span>
//                 </div>
//               </div>

//               {branches.map(branch => {
//                 const bgColors   = ['#eff6ff', '#dcfce7', '#ffedd5', '#f3e8ff', '#ffe4e6', '#f1f5f9'];
//                 const textColors = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#e11d48', '#64748b'];
//                 const idx = branch.id % 6;
//                 const disabledForWarden = isWarden && !idsMatch(branch.id, getBranchId());

//                 return (
//                   <div
//                     key={branch.id}
//                     className={`rm-branch-item ${selectedBranch === String(branch.id) ? 'active' : ''} ${disabledForWarden ? 'pointer-events-none opacity-50' : ''}`}
//                     onClick={() => { if (!disabledForWarden) { setSelectedBranch(String(branch.id)); setPage(0); } }}
//                   >
//                     <div className="rm-branch-item-left">
//                       <div className="rm-branch-icon" style={{ background: bgColors[idx] }}>
//                         <Building2 size={16} color={textColors[idx]} />
//                       </div>
//                       <span className="rm-branch-name">{branch.unitName}</span>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Main Content Area */}
//           <div className="rm-main">
//             <div className="rm-main-header">
//               <button className="rm-btn-outline"><Download size={16} /> Export</button>

//               {isAdmin && (
//                 <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
//                   <DialogTrigger asChild>
//                     <button className="rm-btn-primary"><Plus size={16} /> Add Room</button>
//                   </DialogTrigger>
//                   <DialogContent>
//                     <DialogHeader>
//                       <DialogTitle>Add Room</DialogTitle>
//                       <DialogDescription>Create a new room and map it to a branch.</DialogDescription>
//                     </DialogHeader>
//                     <div className="space-y-3">
//                       <Input placeholder="Room Number" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
//                       <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
//                         <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="AC">AC</SelectItem>
//                           <SelectItem value="NON_AC">Non-AC</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <Input type="number" placeholder="Total Beds" value={totalBeds} onChange={e => setTotalBeds(e.target.value)} />
//                       <Input type="number" placeholder="Rent per Bed (Monthly)" value={rentPerBed} onChange={e => setRentPerBed(e.target.value)} />
//                       {isWarden ? (
//                         <Input value={wardenBranchName} disabled className="bg-slate-50" />
//                       ) : (
//                         <Select value={unitId} onValueChange={(v) => { setUnitId(v); setFlatId(""); }}>
//                           <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
//                           <SelectContent>
//                             {branches.length > 0 ? branches.map(b => (
//                               <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                             )) : (
//                               <div className="p-2 text-xs text-muted-foreground text-center">No branches found</div>
//                             )}
//                           </SelectContent>
//                         </Select>
//                       )}
//                       <Select
//                         value={flatId}
//                         onValueChange={setFlatId}
//                         disabled={!unitId || flatsByBranch.length === 0}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder={
//                             !unitId ? "Select a Branch first"
//                             : flatsByBranch.length === 0 ? "No Flats Available"
//                             : "Select Flat / Floor (Optional)"
//                           } />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {flatsByBranch.map(f => (
//                             <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <DialogFooter>
//                       <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
//                       <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc]">Save Room</Button>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>
//               )}
//             </div>

//             <div className="rm-filters-row">
//               <div className="rm-search-main">
//                 <Search size={16} color="#94a3b8" />
//                 <input type="text" placeholder="Search rooms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
//               </div>
//               <button className="rm-clear-btn" onClick={() => { setSearchTerm(""); setSelectedBranch(isWarden ? String(getBranchId()) : "all"); setPage(0); }}>
//                 <RefreshCw size={14} /> Clear Filters
//               </button>
//             </div>

//             <div className="rm-table-container">
//               <div className="overflow-x-auto">
//                 <table className="rm-table">
//                   <thead>
//                     <tr>
//                       <th>ROOM NO.</th>
//                       <th>ROOM TYPE</th>
//                       <th>BRANCH</th>
//                       <th className="text-center">BEDS</th>
//                       <th className="text-center">OCCUPIED</th>
//                       <th className="text-center">AVAILABLE</th>
//                       <th>STATUS</th>
//                       {isAdmin && <th>ACTIONS</th>}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {loading ? (
//                       <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">Loading rooms...</td></tr>
//                     ) : filteredRooms.length === 0 ? (
//                       <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">No rooms found.</td></tr>
//                     ) : (
//                       filteredRooms.map((room: any) => {
//                         const typeName  = getRoomTypeName(room.totalBeds, room.hostelType);
//                         const typeColor = getRoomTypeColor(typeName);

//                         return (
//                           <tr key={room.id}>
//                             <td><span className="rm-col-number">{room.roomNumber}</span></td>
//                             <td>
//                               <span className="rm-type-badge" style={{ background: typeColor.bg, color: typeColor.color }}>
//                                 {typeName}
//                               </span>
//                             </td>
//                             <td>
//                               <div className="rm-branch-name">{room.unitName || "-"}</div>
//                             </td>
//                             <td className="text-center"><span className="rm-count">{room.totalBeds}</span></td>
//                             <td className="text-center"><span className="rm-count">{room.occupied}</span></td>
//                             <td className="text-center"><span className="rm-count">{room.available}</span></td>
//                             <td>
//                               <div className={`rm-status-badge ${room.status === 'Occupied' ? 'occupied' : room.status === 'Partially Occupied' ? 'partially' : 'available'}`}>
//                                 <div className={`w-1.5 h-1.5 rounded-full ${room.status === 'Occupied' ? 'bg-green-500' : room.status === 'Partially Occupied' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
//                                 {room.status}
//                               </div>
//                             </td>
//                             {isAdmin && (
//                               <td>
//                                 <div className="flex gap-2">
//                                   <Button
//                                     size="icon"
//                                     variant="outline"
//                                     className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
//                                     onClick={() => { setEditRoomData({ ...room }); setEditOpen(true); }}
//                                   >
//                                     <Pencil className="h-3.5 w-3.5 text-slate-500" />
//                                   </Button>
//                                   <AlertDialog>
//                                     <AlertDialogTrigger asChild>
//                                       <Button
//                                         size="icon"
//                                         variant="outline"
//                                         className="w-8 h-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-none"
//                                       >
//                                         <Trash2 className="h-3.5 w-3.5 text-red-500" />
//                                       </Button>
//                                     </AlertDialogTrigger>
//                                     <AlertDialogContent>
//                                       <AlertDialogHeader>
//                                         <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
//                                         <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
//                                       </AlertDialogHeader>
//                                       <AlertDialogFooter>
//                                         <AlertDialogCancel>Cancel</AlertDialogCancel>
//                                         <AlertDialogAction onClick={() => handleDelete(room.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
//                                       </AlertDialogFooter>
//                                     </AlertDialogContent>
//                                   </AlertDialog>
//                                 </div>
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="rm-pagination">
//                 <div className="rm-page-info">
//                   Showing {rooms.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} rooms
//                 </div>
//                 <div className="rm-page-controls">
//                   <Button
//                     size="icon" variant="outline" className="w-8 h-8 rounded-lg"
//                     disabled={page === 0} onClick={() => setPage(p => p - 1)}
//                   >
//                     <ChevronLeft className="h-4 w-4" />
//                   </Button>
//                   <button className="rm-page-btn active">{page + 1}</button>
//                   {page + 1 < Math.ceil(totalCount / pageSize) && (
//                     <button className="rm-page-btn" onClick={() => setPage(page + 1)}>{page + 2}</button>
//                   )}
//                   <Button
//                     size="icon" variant="outline" className="w-8 h-8 rounded-lg"
//                     disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)}
//                   >
//                     <ChevronRight className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* EDIT DIALOG — admin only, matches the corrected version's field shape */}
//         {isAdmin && (
//           <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditRoomData(null); }}>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Edit Room</DialogTitle>
//                 <DialogDescription>Update room details.</DialogDescription>
//               </DialogHeader>
//               {editRoomData && (
//                 <div className="space-y-3">
//                   <Input placeholder="Room Number" value={editRoomData.roomNumber} onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })} />
//                   <Select value={String(editRoomData.unitId)} onValueChange={v => setEditRoomData({ ...editRoomData, unitId: Number(v), flatId: null })}>
//                     <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
//                     <SelectContent>
//                       {branches.map(b => (
//                         <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                   <Select
//                     value={editRoomData.flatId ? String(editRoomData.flatId) : ""}
//                     onValueChange={v => setEditRoomData({ ...editRoomData, flatId: v ? Number(v) : null })}
//                     disabled={!editRoomData.unitId || flatsByEditBranch.length === 0}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder={
//                         !editRoomData.unitId ? "Select a Branch first"
//                         : flatsByEditBranch.length === 0 ? "No Flats Available"
//                         : "Select Flat / Floor (Optional)"
//                       } />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {flatsByEditBranch.map(f => (
//                         <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                   <Select value={editRoomData.hostelType || ""} onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}>
//                     <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="AC">AC</SelectItem>
//                       <SelectItem value="NON_AC">Non-AC</SelectItem>
//                     </SelectContent>
//                   </Select>
//                   <Input type="number" placeholder="Total Beds" value={String(editRoomData.totalBeds ?? 0)} onChange={e => setEditRoomData({ ...editRoomData, totalBeds: Number(e.target.value) })} />
//                   <Input type="number" placeholder="Rent per Bed (Monthly)" value={String(editRoomData.rentPerBed ?? 0)} onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })} />
//                 </div>
//               )}
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
//                 <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc]">Save Changes</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         )}
//       </div>
//     </div>
//   );
// };

// export default RoomsPage;
















































import { useEffect, useMemo, useState, useCallback } from "react";
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
  ChevronLeft, ChevronRight, Building2,
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

/* ================= ID NORMALIZATION HELPER =================
   Warden's branch id (getBranchId(), often sourced from sessionStorage
   / a JWT claim) can come back as a string ("6") while Branch.id from
   the API is numeric (6). Strict `===` silently fails on that mismatch
   — always compare via String(...) on both sides. */
const idsMatch = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) === String(b);

/* ================= ENTITY UNWRAP HELPER =================
   Different endpoints (createFlat, createRoom, etc.) may return the
   entity directly, or wrapped in { data: {...} }, or double-wrapped in
   { data: { data: {...} } }. This normalizes any of those shapes into
   a usable object, or undefined if none of them contain a valid id. */
const unwrapEntity = <T extends { id?: any }>(res: any): T | undefined => {
  if (res && res.id != null) return res as T;
  if (res?.data && res.data.id != null) return res.data as T;
  if (res?.data?.data && res.data.data.id != null) return res.data.data as T;
  return undefined;
};

/* ================= Shared Bed Count Picker (used by Add + Edit) =================
   Plain number input for the room's bed count. One component, used by
   both dialogs (and each bulk room entry), so the three forms can never
   drift out of sync. */
function BedCountPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      min={1}
      placeholder="Total Beds"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
    />
  );
}

/* ================= Shared Flat Assignment Field (used by Add + Edit) =================
   Lets the admin decide whether a room sits directly under the branch,
   or under one of the branch's flats/floors. When "Assign to Flat" is
   picked, they can either choose an existing flat or type a brand-new
   flat number — the flat gets created on the fly (via createFlat) right
   before the room itself is submitted, so there's no need to leave this
   dialog and go create the flat first on the Flats page. */
export interface FlatAssignmentValue {
  mode: "direct" | "flat";
  flatId: string;        // id of an existing flat — "" if creating a new one
  newFlatNumber: string; // used when flatId === "" and mode === "flat"
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
    <div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {flatsForBranch.length > 0 && (
            <Select
              value={value.flatId}
              onValueChange={(v) => onChange({ ...value, flatId: v, newFlatNumber: "" })}
            >
              <SelectTrigger><SelectValue placeholder="Select an existing Flat" /></SelectTrigger>
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
            onChange={(e) => onChange({ ...value, newFlatNumber: e.target.value, flatId: "" })}
          />
        </div>
      )}
    </div>
  );
}

/* ================= Shared Room Entry Row (Flat bulk-create mode) =================
   When "Assign to Flat" is chosen, the Add Room dialog switches from
   "one room" to "a batch of rooms under this flat" — e.g. picking flat
   "F1" and adding three entries builds F1-HALL (4 beds, Non-AC),
   F1-Room-1 (2 beds, AC), F1-Room-2 (3 beds, Non-AC) in one Save. Each
   entry only needs a short suffix ("HALL", "Room-1") — the full room
   number is assembled as `${flatLabel}-${suffix}` at submit time. */
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

/** Assembles the final room number from a flat label + a per-entry name.
 *  If the admin already typed the flat prefix into the name field
 *  themselves (e.g. typed "F1-HALL" instead of just "HALL" when the flat
 *  is "F1"), this detects that and does NOT prepend it again — avoiding
 *  a doubled-up "F1-F1-HALL". Comparison is case-insensitive since flat
 *  numbers and typed prefixes may differ only in casing. */
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
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, position: "relative", display: "flex", flexDirection: "column", gap: 8, background: "#fafafa" }}>
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

      <Input
        placeholder="Room Name (e.g. HALL, Room-1)"
        value={entry.suffix}
        onChange={(e) => onChange({ suffix: e.target.value })}
        style={{ paddingRight: canRemove ? 32 : undefined }}
      />
      {flatLabel && entry.suffix.trim() && (
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Will be created as <strong style={{ color: "#5200FF" }}>{buildRoomNumber(flatLabel, entry.suffix)}</strong>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => onChange({ hostelType: "AC" })} style={pillButtonStyle(entry.hostelType === "AC")}>AC</button>
        <button type="button" onClick={() => onChange({ hostelType: "NON_AC" })} style={pillButtonStyle(entry.hostelType === "NON_AC")}>Non-AC</button>
      </div>

      <BedCountPicker value={entry.totalBeds} onChange={(v) => onChange({ totalBeds: v })} />

      <Input
        type="number"
        placeholder="Rent per Bed (Monthly)"
        value={entry.rentPerBed}
        onChange={(e) => onChange({ rentPerBed: e.target.value })}
      />
    </div>
  );
}

/* ================= COMPONENT ================= */
const RoomsPage = () => {

  /* ================= STATE ================= */
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [flats,      setFlats]      = useState<Flat[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page,       setPage]       = useState(0);
  const [pageSize]   = useState(10);
  const [loading,    setLoading]    = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [addOpen,        setAddOpen]        = useState(false);
  const [editOpen,       setEditOpen]       = useState(false);
  const [editRoomData,   setEditRoomData]   = useState<Room | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const [supporting, setSupporting] = useState<"idle" | "loading" | "done">("idle");

  const [roomNumber,  setRoomNumber]  = useState("");
  const [hostelType,  setHostelType]  = useState<HostelType | "">("");
  const [totalBeds,   setTotalBeds]   = useState("");
  const [rentPerBed,  setRentPerBed]  = useState("");
  const [unitId,      setUnitId]      = useState("");

  // Replaces the old bare `flatId` state — tracks whether the room being
  // created goes directly under the branch or under a (possibly new) flat.
  const [flatAssign, setFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);
  const [editFlatAssign, setEditFlatAssign] = useState<FlatAssignmentValue>(EMPTY_FLAT_ASSIGNMENT);

  // When flatAssign.mode === "flat", Add Room switches to bulk mode: one
  // or more room entries (each its own name-suffix/type/bed-count),
  // created together under that one flat in a single Save.
  const [flatRoomEntries, setFlatRoomEntries] = useState<RoomEntryValue[]>([blankRoomEntry()]);

  const addRoomEntry = () => setFlatRoomEntries(prev => [...prev, blankRoomEntry()]);
  const removeRoomEntry = (key: string) =>
    setFlatRoomEntries(prev => (prev.length > 1 ? prev.filter(e => e.key !== key) : prev));
  const updateRoomEntry = (key: string, patch: Partial<RoomEntryValue>) =>
    setFlatRoomEntries(prev => prev.map(e => (e.key === key ? { ...e, ...patch } : e)));

  const [wardenBranchName, setWardenBranchName] = useState("");

  const role     = getUserRole()?.toUpperCase();
  const isWarden = role === "WARDEN";
  const isAdmin  = !isWarden;

  // Wardens never see the Branch selector (it's fixed to their own
  // branch), but the Add form's `unitId` state was never actually being
  // populated for them — silently breaking Add Room for Warden accounts.
  // This resolves to the right branch id for both roles everywhere the
  // Add form needs it.
  const effectiveUnitId = isWarden ? String(getBranchId() ?? "") : unitId;

  /* ================= RESET FORM ================= */
  const resetAddForm = () => {
    setRoomNumber(""); setHostelType(""); setTotalBeds("");
    setRentPerBed(""); setUnitId(""); setFlatAssign(EMPTY_FLAT_ASSIGNMENT);
    setFlatRoomEntries([blankRoomEntry()]);
  };

  /* ================= LOAD SUPPORTING DATA ================= */
  const loadSupportingData = useCallback(async () => {
    if (supporting !== "idle") return;
    setSupporting("loading");
    try {
      const [branchesResult, flatsResult] = await Promise.allSettled([
        fetchAllPages<Branch>(getBranches),
        fetchAllPages<Flat>(getFlats),
      ]);

      const branchesData: Branch[] = branchesResult.status === "fulfilled" ? branchesResult.value : [];
      const flatsData:    Flat[]   = flatsResult.status    === "fulfilled" ? flatsResult.value    : [];

      // Strip any nullish/undefined rows before they ever hit state — a
      // single bad entry in a paginated response used to crash every
      // downstream `.branchId` / `.id` access in this component.
      setBranches(branchesData.filter(Boolean));
      setFlats(flatsData.filter(Boolean));

      if (branchesResult.status === "rejected") {
        console.error(branchesResult.reason);
        toast.error("Failed loading branches");
      }
      if (flatsResult.status === "rejected") {
        console.error(flatsResult.reason);
        toast.error("Failed loading flats");
      }

      if (isWarden) {
        const bid = getBranchId();
        if (!bid) { toast.error("Warden not mapped to a branch"); return; }
        // idsMatch guards against the string/number id mismatch noted above
        const branch = branchesData.filter(Boolean).find((b: Branch) => idsMatch(b.id, bid));
        setWardenBranchName(branch?.unitName || `Branch ${bid}`);
        setSelectedBranch(String(bid));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed loading supporting data");
    } finally {
      setSupporting("done");
    }
  }, [isWarden, supporting]);

  useEffect(() => { loadSupportingData(); }, [loadSupportingData]);

  /* ================= LOAD ROOMS (real API, page-based) ================= */
  const loadRooms = useCallback(async () => {
    if (supporting !== "done") return;
    setLoading(true);
    try {
      const queryParams: Record<string, any> = { page, size: pageSize };
      if (selectedBranch !== "all") {
        queryParams.unitId = selectedBranch;
      }

      const res = await api.get(`/rooms`, { params: queryParams });
      const content: Room[]       = res.data?.data?.content      ?? res.data?.content      ?? [];
      const totalElements: number = res.data?.data?.totalElements ?? res.data?.totalElements ?? 0;

      const enriched = content.filter(Boolean).map((room: Room) => {
        const occ   = room.occupiedBeds ?? 0;
        const avail = (room.totalBeds   || 0) - occ;

        // Fall back to resolving the branch name client-side (idsMatch)
        // in case this row's unitName ever comes back empty.
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
  }, [page, pageSize, selectedBranch, supporting, branches]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* ================= HELPERS ================= */
  const flatsByBranch = useMemo(() => {
    if (!effectiveUnitId) return [];
    return flats.filter(f => f && String(f.branchId) === effectiveUnitId);
  }, [flats, effectiveUnitId]);

  // Display label for the flat currently selected/typed in the Add form —
  // used for the "Will be created as F1-HALL" live preview on each entry.
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

  /** Resolves a FlatAssignmentValue into a flatId to send with the room
   *  payload — creating the flat first via createFlat() if the admin
   *  typed a brand-new flat number instead of picking an existing one.
   *  Shared by both handleAdd and handleEdit so the "create room under a
   *  new flat in one step" behavior is identical in both dialogs. */
  const resolveFlatId = async (
    assign: FlatAssignmentValue,
    branchId: number
  ): Promise<number | null> => {
    if (assign.mode === "direct") return null;
    if (assign.flatId) return Number(assign.flatId);

    const flatNumber = assign.newFlatNumber.trim();
    const rawResponse = await createFlat({ flatNumber, branchId });

    // createFlat's return shape isn't trustworthy across every backend
    // response wrapping, so unwrap defensively...
    let newFlat = unwrapEntity<Flat>(rawResponse);

    if (!newFlat) {
      // ...and if that still doesn't give us a usable Flat, re-fetch the
      // flats list and find the one we just created by flatNumber+branch.
      // This makes flat creation work regardless of what createFlat
      // actually returns, as long as the POST itself succeeded server-side.
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
      setFlats(prev => [...prev, newFlat!]); // keep local flats list in sync immediately
    }

    return newFlat.id;
  };

  const handleAdd = async () => {
    if (!effectiveUnitId) {
      toast.error("Branch is required");
      return;
    }

    /* ── Direct Room mode — unchanged single-room flow.
       NOTE: beds are created server-side inside addRoom() on the
       backend (RoomServiceImpl), so there is no separate bed-seeding
       call here. Doing it client-side too would double the bed count
       and eat into the hostel/branch bed-capacity guards. ── */
    if (flatAssign.mode === "direct") {
      if (!roomNumber || !hostelType) {
        toast.error("Room number and room type are required");
        return;
      }
      try {
        const desiredBeds = Number(totalBeds) || 0;
        await createRoom({
          roomNumber,
          hostelType: hostelType as HostelType,
          totalBeds:  desiredBeds,
          rentPerBed: Number(rentPerBed) || 0,
          unitId:     Number(effectiveUnitId),
          flatId:     null,
        });
        toast.success(`Room created with ${desiredBeds} bed${desiredBeds === 1 ? "" : "s"}`);
        setAddOpen(false);
        resetAddForm();
        loadRooms();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Create failed");
      }
      return;
    }

    /* ── Assign to Flat mode — bulk-create every valid room entry under
       one flat, e.g. F1-HALL, F1-Room-1, F1-Room-2. Each room is
       created (and its beds seeded) entirely server-side — the loop
       here just issues one createRoom call per entry, sequentially,
       and isolates failures per-room so one bad entry doesn't silently
       drop the rest of the batch. ── */
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

      // Sequential, not Promise.all — capacity guards on the backend
      // check remaining capacity against beds already committed to the
      // DB, so rooms need to land one at a time for those checks to see
      // an up-to-date count.
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
      toast.error(e?.response?.data?.message || "Create failed");
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
      // Spread the full editRoomData so no real field silently drops off
      // an edit. Bed rows are reconciled server-side inside updateRoom()
      // on the backend (adds/removes to match totalBeds) — no separate
      // client-side reconciliation call needed here.
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
      toast.error(e?.response?.data?.message || "Update failed");
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
    // Pre-fill the flat-assignment toggle from the room's current flatId
    // so editing a room that's already under a flat doesn't reset it.
    setEditFlatAssign({
      mode: room.flatId ? "flat" : "direct",
      flatId: room.flatId ? String(room.flatId) : "",
      newFlatNumber: "",
    });
    setEditOpen(true);
  };

  const filteredRooms = rooms.filter(r =>
    r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.unitName && r.unitName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  /* ================= UI ================= */
  return (
    <div className="min-h-full bg-[#fcfcfc] text-gray-900 font-sans pb-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .rm-wrap { font-family: 'Inter', sans-serif; padding: 24px 32px; max-width: 1600px; margin: 0 auto; }

        .rm-layout { display: flex; gap: 24px; align-items: flex-start; margin-top: 12px; }
        .rm-sidebar { width: 260px; flex-shrink: 0; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; }
        .rm-main { flex: 1; min-width: 0; }

        .rm-sidebar-title { font-size: 14px; font-weight: 700; color: #0f172a; padding: 16px 20px 12px; }
        .rm-sidebar-search { margin: 0 20px 16px; display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; height: 38px; background: #fff; }
        .rm-sidebar-search input { border: none; outline: none; width: 100%; font-size: 13px; background: transparent; }

        .rm-branch-list { padding-bottom: 16px; }
        .rm-branch-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; cursor: pointer; transition: background 0.2s; }
        .rm-branch-item:hover { background: #f8fafc; }
        .rm-branch-item.active { background: #f3e8ff; border-left: 3px solid #5200FF; padding-left: 17px; }

        .rm-branch-item-left { display: flex; align-items: center; gap: 12px; }
        .rm-branch-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .rm-branch-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rm-branch-item.active .rm-branch-name { color: #5200FF; }

        .rm-main-header { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 20px; gap: 12px; }
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

        .rm-count { font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }

        .rm-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .rm-status-badge.occupied { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .rm-status-badge.partially { color: #f97316; background: #fff7ed; border: 1px solid #fed7aa; }
        .rm-status-badge.available { color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; }

        .rm-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #fff; }
        .rm-page-info { font-size: 13px; color: #64748b; }
        .rm-page-controls { display: flex; align-items: center; gap: 8px; }
        .rm-page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #475569; background: #fff; cursor: pointer; }
        .rm-page-btn:hover:not(:disabled) { background: #f8fafc; }
        .rm-page-btn.active { background: #5200FF; color: #fff; border-color: #5200FF; }
        .rm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="rm-wrap">

        <div className="rm-layout">

          {/* Left Sidebar — branch filter, wired to the real selectedBranch/page state */}
          <div className="rm-sidebar">
            <div className="rm-sidebar-title">Branches</div>
            <div className="rm-sidebar-search">
              <Search size={14} color="#94a3b8" />
              <input type="text" placeholder="Search branches..." />
            </div>

            <div className="rm-branch-list">
              <div
                className={`rm-branch-item ${selectedBranch === 'all' ? 'active' : ''} ${isWarden ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => { if (!isWarden) { setSelectedBranch('all'); setPage(0); } }}
              >
                <div className="rm-branch-item-left">
                  <div className="rm-branch-icon" style={{ background: '#f5f3ff' }}>
                    <Building2 size={16} color="#8b5cf6" />
                  </div>
                  <span className="rm-branch-name">All Branches</span>
                </div>
              </div>

              {branches.map(branch => {
                const bgColors   = ['#eff6ff', '#dcfce7', '#ffedd5', '#f3e8ff', '#ffe4e6', '#f1f5f9'];
                const textColors = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#e11d48', '#64748b'];
                const idx = branch.id % 6;
                const disabledForWarden = isWarden && !idsMatch(branch.id, getBranchId());

                return (
                  <div
                    key={branch.id}
                    className={`rm-branch-item ${selectedBranch === String(branch.id) ? 'active' : ''} ${disabledForWarden ? 'pointer-events-none opacity-50' : ''}`}
                    onClick={() => { if (!disabledForWarden) { setSelectedBranch(String(branch.id)); setPage(0); } }}
                  >
                    <div className="rm-branch-item-left">
                      <div className="rm-branch-icon" style={{ background: bgColors[idx] }}>
                        <Building2 size={16} color={textColors[idx]} />
                      </div>
                      <span className="rm-branch-name">{branch.unitName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="rm-main">
            <div className="rm-main-header">
              <button className="rm-btn-outline"><Download size={16} /> Export</button>

              {isAdmin && (
                <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
                  <DialogTrigger asChild>
                    <button className="rm-btn-primary"><Plus size={16} /> Add Room</button>
                  </DialogTrigger>
                  <DialogContent className={flatAssign.mode === "flat" ? "sm:max-w-[480px]" : undefined}>
                    <DialogHeader>
                      <DialogTitle>{flatAssign.mode === "flat" ? "Add Rooms under a Flat" : "Add Room"}</DialogTitle>
                      <DialogDescription>
                        {flatAssign.mode === "flat"
                          ? "Create one or more rooms together under the same flat/floor."
                          : "Create a new room and map it to a branch."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {flatAssign.mode === "direct" && (
                        <Input placeholder="Room Number" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
                      )}

                      {isWarden ? (
                        <Input value={wardenBranchName} disabled className="bg-slate-50" />
                      ) : (
                        <Select
                          value={unitId}
                          onValueChange={(v) => { setUnitId(v); setFlatAssign(EMPTY_FLAT_ASSIGNMENT); }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                          <SelectContent>
                            {branches.length > 0 ? branches.map(b => (
                              <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                            )) : (
                              <div className="p-2 text-xs text-muted-foreground text-center">No branches found</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Choose whether this room sits directly under the
                          branch, or under one of its flats (existing or
                          newly typed in) — shared with the Edit dialog. */}
                      <FlatAssignmentField
                        unitId={effectiveUnitId}
                        flatsForBranch={flatsByBranch}
                        value={flatAssign}
                        onChange={setFlatAssign}
                      />

                      {flatAssign.mode === "direct" ? (
                        <>
                          <Select value={hostelType} onValueChange={(v) => setHostelType(v as HostelType)}>
                            <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AC">AC</SelectItem>
                              <SelectItem value="NON_AC">Non-AC</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Bed count — quick presets (Single/Double/Triple/
                              Quad) or a custom number, shared with Edit. */}
                          <BedCountPicker value={totalBeds} onChange={setTotalBeds} />

                          <Input type="number" placeholder="Rent per Bed (Monthly)" value={rentPerBed} onChange={e => setRentPerBed(e.target.value)} />
                        </>
                      ) : (
                        <>
                          {/* Bulk room builder — one card per room that will
                              be created under this flat. Each gets its own
                              name suffix, AC/Non-AC type, and bed count. */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleAdd} className="bg-[#5200FF] hover:bg-[#4200cc]">
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

            <div className="rm-filters-row">
              <div className="rm-search-main">
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Search rooms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button className="rm-clear-btn" onClick={() => { setSearchTerm(""); setSelectedBranch(isWarden ? String(getBranchId()) : "all"); setPage(0); }}>
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
                    ) : filteredRooms.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">No rooms found.</td></tr>
                    ) : (
                      filteredRooms.map((room: any) => {
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
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(room.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
                    disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <button className="rm-page-btn active">{page + 1}</button>
                  {page + 1 < Math.ceil(totalCount / pageSize) && (
                    <button className="rm-page-btn" onClick={() => setPage(page + 1)}>{page + 2}</button>
                  )}
                  <Button
                    size="icon" variant="outline" className="w-8 h-8 rounded-lg"
                    disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EDIT DIALOG — admin only. Uses the same BedCountPicker and
            FlatAssignmentField as the Add dialog above, so both forms
            share one implementation and can't drift apart. */}
        {isAdmin && (
          <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditRoomData(null); setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Room</DialogTitle>
                <DialogDescription>Update room details.</DialogDescription>
              </DialogHeader>
              {editRoomData && (
                <div className="space-y-3">
                  <Input placeholder="Room Number" value={editRoomData.roomNumber} onChange={e => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })} />
                  <Select
                    value={String(editRoomData.unitId)}
                    onValueChange={v => {
                      setEditRoomData({ ...editRoomData, unitId: Number(v) });
                      setEditFlatAssign(EMPTY_FLAT_ASSIGNMENT); // branch changed — flat choice no longer valid
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FlatAssignmentField
                    unitId={editRoomData.unitId ? String(editRoomData.unitId) : ""}
                    flatsForBranch={flatsByEditBranch}
                    value={editFlatAssign}
                    onChange={setEditFlatAssign}
                  />

                  <Select value={editRoomData.hostelType || ""} onValueChange={(v) => setEditRoomData({ ...editRoomData, hostelType: v as HostelType })}>
                    <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="NON_AC">Non-AC</SelectItem>
                    </SelectContent>
                  </Select>

                  <BedCountPicker
                    value={String(editRoomData.totalBeds ?? "")}
                    onChange={(v) => setEditRoomData({ ...editRoomData, totalBeds: Number(v) || 0 })}
                  />

                  <Input type="number" placeholder="Rent per Bed (Monthly)" value={String(editRoomData.rentPerBed ?? 0)} onChange={e => setEditRoomData({ ...editRoomData, rentPerBed: Number(e.target.value) })} />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEdit} className="bg-[#5200FF] hover:bg-[#4200cc]">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default RoomsPage;