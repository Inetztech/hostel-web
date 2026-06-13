// import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// import {
//   getRooms,
//   getEBReadings,
//   addEBReading,
//   deleteEBReading,
//   getTenantWiseEBBill,
//   sendEBBillWhatsApp,
//   getUserRole,
//   getTenants,
//   getBranchId,
//   getBranches,
//   getFlats,
//   deleteEBReadingsByFlat,
//   deleteEBReadingsByRoom,
// } from "@/lib/store";

// import { Room, EBReading, EBStatus, Tenant, Branch, Flat } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// import * as XLSX from "xlsx";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogClose,
//   DialogDescription,
// } from "@/components/ui/dialog";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogDescription,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";

// import { toast } from "sonner";
// import { Plus, Trash2, MessageCircle } from "lucide-react";

// import { AgGridReact } from "ag-grid-react";
// import { ColDef } from "ag-grid-community";

// const EBReadingsPage = () => {

//   // const role = getUserRole()?.toUpperCase();
//   // const branchId = getBranchId();
//   // const isAdmin = role === "ADMIN";
//   // const hasAccess = true;

//     const role = getUserRole()?.toUpperCase();
//     const branchId = getBranchId();
//     const isAdmin = role === "ADMIN";
//     const hasAccess = isAdmin || role === "WARDEN";

//   const [rooms, setRooms] = useState<Room[]>([]);
//   const [readings, setReadings] = useState<EBReading[]>([]);
//   const [tenants, setTenants] = useState<Tenant[]>([]);
//   const [uploadOpen, setUploadOpen] = useState(false);

//   const [tenantRows, setTenantRows] = useState<any[]>([]);

//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [selectedBranch, setSelectedBranch] = useState<string>(
//     role === "ADMIN" ? "all" : String(getBranchId() ?? "all")
//   );

//   const [addOpen, setAddOpen] = useState(false);
//   const [bulkOpen, setBulkOpen] = useState(false);
//   const [billOpen, setBillOpen] = useState(false);
//   const [manualRate, setManualRate] = useState<number | "">(13);
//   const [manualMode, setManualMode] = useState(false);
//   const [formFlatId, setFormFlatId] = useState("");
//   const [flats, setFlats] = useState<Flat[]>([]);

//   const [roomSearch, setRoomSearch] = useState("");

//   const [tenantBills, setTenantBills] = useState<any[]>([]);
//   const [billRoom, setBillRoom] = useState("");

//   const [bulkRows, setBulkRows] = useState<any[]>([]);
//   const [roomManualRates, setRoomManualRates] = useState<Record<string, number>>({});

//   const [flatRoomRows, setFlatRoomRows] = useState<any[]>([]);

//   const [formRoomId, setFormRoomId] = useState("");
//   const [formPrevReading, setFormPrevReading] = useState("");
//   const [formCurrReading, setFormCurrReading] = useState("");
//   const [formAcPrev, setFormAcPrev] = useState("");
//   const [formAcCurr, setFormAcCurr] = useState("");

//   const [allReadings, setAllReadings] = useState<EBReading[]>([]);

//   const selMonth = new Date().getMonth() + 1;
//   const selYear = new Date().getFullYear();

//   /* -------- RATE RESOLVER -------- */
//   const getRateForRoom = (roomId: string | number) => {
//     const roomRate = roomManualRates[String(roomId)];
//     if (manualMode && roomRate !== undefined) return roomRate;
//     if (typeof manualRate === "number") return manualRate;
//     return 13;
//   };

//   /* -------- CHECK IF ROOM IS AC -------- */
//   const isRoomAc = useCallback(
//     (roomId: string | numberhandleFlatRowChange = (
//     roomId: string | number,
//     field: "currentReading" | "acCurrentReading",
//     value: string
//   ) => {
//     setFlatRoomRows((prev) =>
//       prev.map((row) =>
//         row.roomId === roomId ? { ...row, [field]: value } : row
//       )
//     );
//   };

// const getRoomStartingACReading = useCallback(
//     (roomId: string | number) => {
//       const roomSpecificReadings = allReadings  // ← allReadings
//         .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });

//       if (roomSpecificReadings.length > 0) {
//         return Number(roomSpecificReadings[0].acCurrentReading ?? 0);
//       }

//       const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//       if (roomTenants.length > 0) {
//         return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
//       }

//       return 0;
//     },
//     [allReadings, tenants]  // ← allReadings in dependency array
//   );

//   const getRoomIdByRoomNumber = (roomNumber: string) => {
//     const room = rooms.find(r => r.roomNumber === roomNumber);
//     return room?.id;
//   };

// const getRoomStartingReading = useCallback(
//   (roomId: string | number) => {
//     const room = rooms.find(r => String(r.id) === String(roomId));

//     const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId)); // ← allReadings

//     if (roomReadings.length > 0) {
//       const sorted = roomReadings.sort((a, b) => {
//         if (b.year !== a.year) return b.year - a.year;
//         return b.month - a.month;
//       });
//       return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//     }

//     if (room?.flatId) {
//       const flatReadings = allReadings.filter(r => String(r.flatId) === String(room.flatId)); // ← allReadings
//       if (flatReadings.length > 0) {
//         const sorted = flatReadings.sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           return b.month - a.month;
//         });
//         return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
//       }
//     }

//     const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
//     if (roomTenants.length > 0) {
//       return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
//     }

//     return 0;
//   },
//   [allReadings, tenants, rooms] // ← allReadings in dependency array
// );

//   const roomTotals = useMemo(() => {
//     const map: Record<string, { units: number; amount: number }> = {};

//     tenantRows.forEach((row) => {
//       const key = row.flatId ? `flat-${row.flatId}` : `room-${row.roomId}`;
//       if (!map[key]) map[key] = { units: 0, amount: 0 };
//       map[key].amount += Number(row.tenantAmount ?? 0);
//       map[key].units = Math.round(
//         Number(row.currentReading ?? 0) - Number(row.previousReading ?? 0)
//       );
//     });

//     return map;
//   }, [tenantRows]);

//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     try {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       const data = await file.arrayBuffer();
//       const workbook = XLSX.read(data);
//       const sheet = workbook.Sheets[workbook.SheetNames[0]];
//       const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

//       let savedCount = 0;
//       let skippedCount = 0;

//       for (const row of jsonData) {
//         const room = filteredRooms.find(r => r.roomNumber === String(row.RoomNumber));
//         if (!room) { skippedCount++; continue; }

//         const prev = Number(row.Previous ?? 0);
//         const curr = Number(row.Current ?? 0);
//         const acPrev = Number(row.AcPrevious ?? 0);
//         const acCurr = Number(row.AcCurrent ?? 0);

//         const rowRate = Number(row.EbRate);
//         const ebRate = !isNaN(rowRate) && rowRate > 0 ? rowRate : getRateForRoom(room.id);

//         if (curr < prev) {
//           toast.error(`Invalid reading for Room ${row.RoomNumber}: current < previous`);
//           skippedCount++;
//           continue;
//         }

//         if (!row.Current && row.Current !== 0) { skippedCount++; continue; }

//         await addEBReading({
//           roomId: room.id,
//           flatId: formFlatId ? Number(formFlatId) : undefined,
//           month: selMonth,
//           year: selYear,
//           previousReading: prev,
//           currentReading: curr,
//           acPreviousReading: room?.hostelType === "AC" ? acPrev : 0,
//           acCurrentReading: room?.hostelType === "AC" ? acCurr : 0,
//           ebRate,
//           isCheckout: true,
//         });

//         savedCount++;
//       }

//       if (savedCount > 0) {
//         toast.success(
//           `${savedCount} reading${savedCount > 1 ? "s" : ""} saved` +
//           (skippedCount > 0 ? ` (${skippedCount} skipped)` : "")
//         );
//       } else {
//         toast.warning("No valid readings found in the file");
//       }

//       setUploadOpen(false);
//       e.target.value = "";
//       reload();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to process Excel");
//     }
//   };

//   const filteredRooms = useMemo(() => {
//     if (selectedBranch === "all") return rooms;
//     return rooms.filter(r => String(r.unitId) === selectedBranch);
//   }, [rooms, selectedBranch]);

//   const standaloneRooms = useMemo(() => {
//     return filteredRooms.filter(r => !r.flatId);
//   }, [filteredRooms]);

//   const flatFilteredRooms = useMemo(() => {
//     if (!formFlatId) return standaloneRooms;
//     return filteredRooms.filter(r => String(r.flatId) === String(formFlatId));
//   }, [filteredRooms, standaloneRooms, formFlatId]);

//   useEffect(() => {
//     if (!formFlatId) {
//       setFlatRoomRows([]);
//       return;
//     }

//     const roomsInFlat = filteredRooms.filter(r => String(r.flatId) === String(formFlatId));

//     const rows = roomsInFlat.map((room) => {
//       const allForRoom = readings
//         .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
//         .sort((a, b) => {
//           if (b.year !== a.year) return b.year - a.year;
//           if (b.month !== a.month) return b.month - a.month;
//           return (b.id ?? 0) - (a.id ?? 0);
//         });

//       const latest = allForRoom[0] ?? null;

//       return {
//         roomId: room.id,
//         roomNumber: room.roomNumber,
//         isAc: room.hostelType === "AC",
//         previousReading: latest != null
//           ? Number(latest.currentReading ?? 0)
//           : getRoomStartingReading(room.id),
//         currentReading: "",
//         acPreviousReading: latest != null
//           ? Number(latest.acCurrentReading ?? 0)
//           : getRoomStartingACReading(room.id),
//         acCurrentReading: "",
//       };
//     });

//     setFlatRoomRows(rows);
//   }, [formFlatId, filteredRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

//   /* LOAD DATA */
//   const reload = async () => {
//   const [roomData, readingData, tenantData, branchData, flatData] = await Promise.all([
//     getRooms(0, 1000),
//     getEBReadings(0, 1000),
//     getTenants(0, 1000),
//     getBranches(0, 50),
//     getFlats(0, 1000),
//   ]);

//   // ✅ Extract .content arrays from paginated responses
//   const roomList: Room[]     = (roomData as any)?.content     ?? roomData     ?? [];
//   const branchList: Branch[] = (branchData as any)?.content   ?? branchData   ?? [];
//   const flatList: Flat[]     = (flatData as any)?.content     ?? flatData     ?? [];

//   let filteredRoomsData = roomList;
//   let filteredTenants   = tenantData;   // getTenants already returns Tenant[]
//   let filteredReadings  = readingData;  // getEBReadings already returns EBReading[]

//   if (!isAdmin) {
//     filteredRoomsData = roomList.filter(r => r.unitId === branchId);
//     const roomIds  = new Set(filteredRoomsData.map(r => r.id));
//     const flatIds  = new Set(filteredRoomsData.map(r => r.flatId).filter(Boolean));
//     filteredTenants  = tenantData.filter(t => roomIds.has(t.roomId));
//     filteredReadings = readingData.filter(r =>
//       (r.roomId != null && roomIds.has(r.roomId)) ||
//       (r.flatId != null && flatIds.has(r.flatId))
//     );
//   }

//   setRooms(filteredRoomsData);
//   setReadings(filteredReadings);
//   setTenants(filteredTenants);
//   setAllReadings(readingData);
//   setBranches(branchList);      
//   setFlats(flatList);           
// };

//   const didLoad = useRef(false);

//   useEffect(() => {
//     if (didLoad.current) return;
//     didLoad.current = true;
//     reload();
//   }, []);

//   useEffect(() => {
//     if (!formRoomId) return;
//     const acPrev = getRoomStartingACReading(formRoomId);
//     setFormAcPrev(String(acPrev));
//   }, [formRoomId, getRoomStartingACReading]);

//   /* ROOM MAP */
//   const roomMap = useMemo(() => {
//     const map: Record<string, string> = {};
//     rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
//     return map;
//   }, [rooms]);

//   /* FILTER MONTH */
//   const filteredReadings = useMemo(() => {
//     let data = readings.filter(r => r.month === selMonth && r.year === selYear);

//     if (selectedBranch !== "all") {
//       const branchRooms = rooms.filter(r => String(r.unitId) === selectedBranch);
//       const branchRoomIds = new Set(branchRooms.map(r => r.id));
//       const branchFlatIds = new Set(branchRooms.map(r => r.flatId).filter(Boolean));

//       data = data.filter(r =>
//         (r.roomId != null && branchRoomIds.has(r.roomId)) ||
//         (r.flatId != null && branchFlatIds.has(r.flatId))
//       );
//     }

//     return data;
//   }, [readings, rooms, selectedBranch]);

//   /* TOTALS */
//   const totalUnits = filteredReadings.reduce((s, r) => s + (r.unitsConsumed ?? 0), 0);
//   const totalCost = tenantRows.reduce((s, r) => s + (r.tenantAmount ?? 0), 0);

//   const flatMap = useMemo(() => {
//     const map: Record<string, string> = {};
//     flats.forEach(f => { map[String(f.id)] = f.flatNumber; });
//     return map;
//   }, [flats]);

//   /* BUILD TENANT ROWS */
//   useEffect(() => {
//     const loadTenantBills = async () => {
//       const rows: any[] = [];
//       const flatHandled = new Set<number>();
//       const roomHandled = new Set<number>();

//       const flatReadingsRaw = filteredReadings.filter(r => r.flatId != null);
//       const flatReadingMap = new Map<number, EBReading>();
//       for (const r of flatReadingsRaw) {
//         const existing = flatReadingMap.get(r.flatId);
//         if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
//           flatReadingMap.set(r.flatId, r);
//         }
//       }
//       const flatReadings = Array.from(flatReadingMap.values());

//       const roomReadings = filteredReadings.filter(r => {
//         const room = rooms.find(room => room.id === r.roomId);
//         if (room?.flatId) return false;
//         return r.roomId != null;
//       });

//       for (const r of flatReadings) {
//         if (flatHandled.has(r.flatId)) continue;
//         flatHandled.add(r.flatId);

//         const bills = await getTenantWiseEBBill({ flatId: r.flatId });
//         bills.forEach((b: any) => {
//           const roomId = getRoomIdByRoomNumber(b.roomNumber);
//           rows.push({
//             id: r.id,
//             roomId,
//             flatId: r.flatId,
//             roomNumber: b.roomNumber,
//             flatNumber: b.flatNumber,
//             tenantName: b.tenantName,
//             previousReading: b.previousReading,
//             currentReading: b.currentReading,
//             acPreviousReading: b.acPreviousReading,
//             acCurrentReading: b.acCurrentReading,
//             unitsConsumed: b.totalUnits,
//             tenantAmount: b.amount,
//           });
//         });
//       }

//       for (const r of roomReadings) {
//         const room = rooms.find(room => room.id === r.roomId);
//         if (!room) continue;
//         if (room.flatId && flatHandled.has(room.flatId)) continue;
//         if (roomHandled.has(r.roomId)) continue;
//         roomHandled.add(r.roomId);

//         const bills = await getTenantWiseEBBill({ roomId: r.roomId });
//         bills.forEach((b: any) => {
//           const roomId = getRoomIdByRoomNumber(b.roomNumber);
//           rows.push({
//             id: r.id,
//             roomId,
//             flatId: room?.flatId,
//             roomNumber: b.roomNumber,
//             flatNumber: b.flatNumber,
//             tenantName: b.tenantName,
//             previousReading: b.previousReading,
//             currentReading: b.currentReading,
//             acPreviousReading: b.acPreviousReading,
//             acCurrentReading: b.acCurrentReading,
//             unitsConsumed: b.totalUnits,
//             tenantAmount: b.amount,
//           });
//         });
//       }

//       setTenantRows(rows);
//     };

//     loadTenantBills();
//   }, [filteredReadings, roomMap]);

//   const statusColor = (s: EBStatus) =>
//     s === "Paid" ? "border-success text-success" :
//       s === "Billed" ? "border-info text-info" : "border-warning text-warning";

//   useEffect(() => {
//     if (!formRoomId) return;
//     const prev = getRoomStartingReading(formRoomId);
//     setFormPrevReading(String(prev));
//     const acPrev = getRoomStartingACReading(formRoomId);
//     setFormAcPrev(String(acPrev));
//   }, [formRoomId, getRoomStartingReading, getRoomStartingACReading]);

//   useEffect(() => {
//     if (!bulkOpen) return;
//     const rows = filteredRooms.map(room => ({
//       roomId: room.id,
//       roomNumber: room.roomNumber,
//       previousReading: getRoomStartingReading(room.id),
//       currentReading: "",
//       acUnits: "",
//     }));
//     setBulkRows(rows);
//   }, [bulkOpen, rooms, getRoomStartingReading, getRoomStartingACReading]);

//   /* ADD READING */
//   const handleAdd = async () => {
//     try {
//       if (formFlatId) {
//         const validRows = flatRoomRows.filter(row => row.currentReading !== "");
//         if (validRows.length === 0) return toast.error("Enter at least one room reading");

//         for (const row of validRows) {
//           const prev = Number(row.previousReading);
//           const curr = Number(row.currentReading);
//           // Only use AC readings if the room is an AC room
//           const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
//           const acCurr = row.isAc ? Number(row.acCurrentReading) : 0;

//           if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }

//           await addEBReading({
//             flatId: Number(formFlatId),
//             roomId: Number(row.roomId),
//             month: selMonth,
//             year: selYear,
//             previousReading: prev,
//             currentReading: curr,
//             acPreviousReading: acPrev,
//             acCurrentReading: acCurr,
//             ebRate: getRateForRoom(row.roomId),
//             isCheckout: true,
//           });
//         }

//         toast.success("Flat readings saved");
//       } else {
//         if (!formRoomId || !formCurrReading) return toast.error("Fill room data");

//         const prev = Number(formPrevReading);
//         const curr = Number(formCurrReading);
//         const selectedRoomIsAc = isRoomAc(formRoomId);
//         const acPrev = selectedRoomIsAc ? Number(formAcPrev) : 0;
//         const acCurr = selectedRoomIsAc ? Number(formAcCurr) : 0;

//         if (curr < prev) return toast.error("Current reading cannot be less than previous");

//         await addEBReading({
//           roomId: Number(formRoomId),
//           month: selMonth,
//           year: selYear,
//           previousReading: prev,
//           currentReading: curr,
//           acPreviousReading: acPrev,
//           acCurrentReading: acCurr,
//           ebRate: getRateForRoom(formRoomId),
//           isCheckout: true,
//         });

//         toast.success("Room reading saved");
//       }

//       setAddOpen(false);
//       setRoomSearch("");
//       setFormFlatId("");
//       setFormRoomId("");
//       setFormPrevReading("");
//       setFormCurrReading("");
//       setFormAcPrev("");
//       setFormAcCurr("");
//       setFlatRoomRows([]);
//       setManualMode(false);
//       setManualRate(13);
//       setRoomManualRates({});
//       reload();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save readings");
//     }
//   };

//   const handleBulkChange = (roomId: string, value: string) => {
//     setBulkRows(prev => prev.map(r => r.roomId === roomId ? { ...r, currentReading: value } : r));
//   };

//   const handleBulkACChange = (roomId: string, value: string) => {
//     setBulkRows(prev => prev.map(r => r.roomId === roomId ? { ...r, acUnits: value } : r));
//   };

//   const handleSendWhatsApp = async (roomId: string) => {
//     try {
//       const roomNumber = roomMap[roomId];
//       if (!roomNumber) { toast.error("Room not found"); return; }

//       try {
//         await sendEBBillWhatsApp(roomNumber);
//         toast.success("WhatsApp sent successfully");
//       } catch (backendError: any) {
//         const msg = backendError?.response?.data?.error || backendError.message || "";
//         if (msg.includes("Channel not found")) {
//           toast.error("Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox.");
//         } else {
//           toast.error("Failed to send WhatsApp: " + msg);
//         }
//       }
//     } catch (e) {
//       toast.error("Unexpected error occurred while sending WhatsApp");
//     }
//   };

//   const handleDelete = async (id: string, flatId?: number, roomId?: number) => {
//     try {
//       if (flatId) {
//         await deleteEBReadingsByFlat(flatId);
//         toast.success("Flat readings deleted");
//       } else if (roomId) {
//         await deleteEBReadingsByRoom(roomId);
//         toast.success("Room readings deleted");
//       } else {
//         await deleteEBReading(id);
//         toast.success("Reading deleted");
//       }
//       reload();
//     } catch (err) {
//       toast.error("Failed to delete readings");
//     }
//   };

//   const handleDownloadExcel = async () => {
//     try {
//       const latestReadings = await getEBReadings();

//       const data = filteredRooms.map(room => {
//         let lastReading: EBReading | undefined;

//         const roomReadings = latestReadings
//           .filter(r => r.roomId === room.id)
//           .sort((a, b) => {
//             if (b.year !== a.year) return b.year - a.year;
//             return b.month - a.month;
//           });

//         if (roomReadings.length > 0) {
//           lastReading = roomReadings.reduce((max, r) =>
//             Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max
//           );
//         } else if (room.flatId) {
//           const flatReadings = latestReadings
//             .filter(r => r.flatId === room.flatId)
//             .sort((a, b) => {
//               if (b.year !== a.year) return b.year - a.year;
//               return b.month - a.month;
//             });

//           if (flatReadings.length > 0) {
//             lastReading = flatReadings.reduce((max, r) =>
//               Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max
//             );
//           }
//         }

//         const lastRate = lastReading?.ebRate ?? (typeof manualRate === "number" ? manualRate : 13);

//         return {
//           RoomNumber: room.roomNumber,
//           Previous: lastReading?.currentReading ?? 0,
//           Current: "",
//           AcPrevious: room?.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
//           AcCurrent: room?.hostelType === "AC" ? "" : "-",
//           EbRate: lastRate,
//         };
//       });

//       const worksheet = XLSX.utils.json_to_sheet(data);
//       worksheet["!cols"] = [
//         { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
//       ];

//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
//       XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
//       toast.success("Excel downloaded");
//     } catch (err) {
//       toast.error("Failed to download Excel");
//     }
//   };

//   /* AGGRID COLUMNS */
//   // const columns: ColDef[] = useMemo(
//   //   () => [
//   //     {
//   //       headerName: "Flat",
//   //       flex: 1,
//   //       valueGetter: (p) => {
//   //         const room = rooms.find(r => r.id === p.data.roomId);
//   //         if (!room?.flatId) return "-";
//   //         return flatMap[String(room.flatId)] || "-";
//   //       },
//   //     },
//   //     { headerName: "Room", flex: 1, valueGetter: (p) => roomMap[p.data.roomId] ?? "-" },
//   //     { headerName: "Tenant", field: "tenantName", flex: 1 },
//   //     { headerName: "Previous", field: "previousReading", flex: 1 },
//   //     { headerName: "Current", field: "currentReading", flex: 1 },
//   //     {
//   //       headerName: "AC Previous",
//   //       field: "acPreviousReading",
//   //       flex: 1,
//   //       valueFormatter: p => { const v = Number(p.value); return v ? Math.round(v) : "-"; },
//   //     },
//   //     {
//   //       headerName: "AC Current",
//   //       field: "acCurrentReading",
//   //       flex: 1,
//   //       valueFormatter: p => { const v = Number(p.value); return v ? Math.round(v) : "-"; },
//   //     },
//   //     {
//   //       headerName: "Units",
//   //       field: "unitsConsumed",
//   //       flex: 1,
//   //       valueFormatter: p => Math.round(Number(p.value ?? 0)),
//   //     },
//   //     {
//   //       headerName: "Total Units",
//   //       flex: 1,
//   //       valueGetter: p => Math.round(Number(p.data.currentReading ?? 0) - Number(p.data.previousReading ?? 0)),
//   //     },
//   //     {
//   //       headerName: "Tenant Amount",
//   //       field: "tenantAmount",
//   //       flex: 1,
//   //       valueFormatter: p => `₹${Math.round(Number(p.value ?? 0))}`,
//   //     },
//   //     {
//   //       headerName: "Total Amount",
//   //       flex: 1,
//   //       valueGetter: p => {
//   //         const key = p.data.flatId ? `flat-${p.data.flatId}` : `room-${p.data.roomId}`;
//   //         const total = roomTotals[key];
//   //         return total ? `₹${Math.round(total.amount)}` : "₹0";
//   //       },
//   //     },
//   //     {
//   //       headerName: "Actions",
//   //       minWidth: 120,
//   //       maxWidth: 140,
//   //       suppressSizeToFit: true,
//   //       cellRenderer: (p: any) => (
//   //         <div className="flex gap-2">
//   //           <Button size="icon" variant="ghost" onClick={() => handleSendWhatsApp(p.data.roomId)}>
//   //             <MessageCircle className="h-4 w-4 text-destructive" />
//   //           </Button>

//   //           {hasAccess && (
//   //             <AlertDialog>
//   //               <AlertDialogTrigger asChild>
//   //                 <Button size="icon" variant="ghost">
//   //                   <Trash2 className="h-4 w-4 text-destructive" />
//   //                 </Button>
//   //               </AlertDialogTrigger>
//   //               <AlertDialogContent>
//   //                 <AlertDialogHeader>
//   //                   <AlertDialogTitle>Delete EB Reading?</AlertDialogTitle>
//   //                   <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
//   //                 </AlertDialogHeader>
//   //                 <AlertDialogFooter>
//   //                   <AlertDialogCancel>Cancel</AlertDialogCancel>
//   //                   <AlertDialogAction
//   //                     onClick={() => handleDelete(
//   //                       String(p.data.id),
//   //                       p.data.flatId ? Number(p.data.flatId) : undefined,
//   //                       p.data.roomId ? Number(p.data.roomId) : undefined
//   //                     )}
//   //                     className="bg-destructive text-white"
//   //                   >
//   //                     Delete
//   //                   </AlertDialogAction>
//   //                 </AlertDialogFooter>
//   //               </AlertDialogContent>
//   //             </AlertDialog>
//   //           )}
//   //         </div>
//   //       ),
//   //     },
//   //   ],
//   //   [roomMap, roomTotals, flats, rooms]
//   // );

  

//   const columns: ColDef[] = useMemo(
//   () => [
//     {
//       headerName: "Flat",
//       flex: 1,
//       valueGetter: (p: any) => {
//         const room = rooms.find((r) => r.id === p.data.roomId);
//         if (!room?.flatId) return "-";
//         return flatMap[String(room.flatId)] || "-";
//       },
//     },
//     { headerName: "Room", flex: 1, valueGetter: (p: any) => roomMap[p.data.roomId] ?? "-" },
//     { headerName: "Tenant", field: "tenantName", flex: 1 },
//     { headerName: "Previous", field: "previousReading", flex: 1 },
//     { headerName: "Current", field: "currentReading", flex: 1 },
//     {
//       headerName: "AC Previous",
//       field: "acPreviousReading",
//       flex: 1,
//       valueFormatter: (p: any) => {
//         const v = Number(p.value);
//         return v ? String(Math.round(v)) : "-";
//       },
//     },
//     {
//       headerName: "AC Current",
//       field: "acCurrentReading",
//       flex: 1,
//       valueFormatter: (p: any) => {
//         const v = Number(p.value);
//         return v ? String(Math.round(v)) : "-";
//       },
//     },
//     {
//       headerName: "Units",
//       field: "unitsConsumed",
//       flex: 1,
//       valueFormatter: (p: any) => String(Math.round(Number(p.value ?? 0))),
//     },
//     {
//       headerName: "Total Units",
//       flex: 1,
//       valueGetter: (p: any) =>
//         Math.round(Number(p.data.currentReading ?? 0) - Number(p.data.previousReading ?? 0)),
//     },
//     {
//       headerName: "Tenant Amount",
//       field: "tenantAmount",
//       flex: 1,
//       valueFormatter: (p: any) => `₹${Math.round(Number(p.value ?? 0))}`,
//     },
//     {
//       headerName: "Total Amount",
//       flex: 1,
//       valueGetter: (p: any) => {
//         const key = p.data.flatId
//           ? `flat-${p.data.flatId}`
//           : `room-${p.data.roomId}`;
//         const total = roomTotals[key];
//         return total ? `₹${Math.round(total.amount)}` : "₹0";
//       },
//     },
//     {
//       headerName: "Actions",
//       minWidth: 120,
//       maxWidth: 140,
//       suppressSizeToFit: true,
//       cellRenderer: (p: any) => {
//         const onWhatsApp = () => handleSendWhatsApp(p.data.roomId);
//         const onDelete = () =>
//           handleDelete(
//             String(p.data.id),
//             p.data.flatId ? Number(p.data.flatId) : undefined,
//             p.data.roomId ? Number(p.data.roomId) : undefined
//           );

//         return (
//           <div className="flex gap-2 items-center h-full">
//             <Button size="icon" variant="ghost" onClick={onWhatsApp}>
//               <MessageCircle className="h-4 w-4 text-green-500" />
//             </Button>

//             {hasAccess && (
//               <Button
//                 size="icon"
//                 variant="ghost"
//                 onClick={() => {
//                   if (window.confirm("Delete this EB reading? This cannot be undone.")) {
//                     onDelete();
//                   }
//                 }}
//               >
//                 <Trash2 className="h-4 w-4 text-destructive" />
//               </Button>
//             )}
//           </div>
//         );
//       },
//     },
//   ],
//   [roomMap, roomTotals, flatMap, rooms, hasAccess, handleDelete, handleSendWhatsApp]
// );

//   const filteredTenantRows = useMemo(() => {
//     let data = tenantRows;

//     if (selectedBranch !== "all") {
//       data = data.filter(row => {
//         const room = rooms.find(r => r.id === row.roomId);
//         return String(room?.unitId) === selectedBranch;
//       });
//     }

//     if (formFlatId) {
//       data = data.filter(row => {
//         const room = rooms.find(r => r.id === row.roomId);
//         return String(room?.flatId) === String(formFlatId);
//       });
//     }

//     return data;
//   }, [tenantRows, selectedBranch, rooms, formFlatId]);

//   /* -------- DERIVED: selected room object -------- */
//   const selectedRoomObj = useMemo(
//     () => rooms.find(r => String(r.id) === String(formRoomId)),
//     [rooms, formRoomId]
//   );

//   return (
//     <div>
//       <div className="flex justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold">EB Readings</h1>
//           <p className="text-sm text-muted-foreground">Monthly electricity readings</p>
//         </div>

//         {hasAccess && (
//           <>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button size="sm">
//                   <Plus className="h-4 w-4 mr-2" />
//                   Add Reading
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="end">
//                 <DropdownMenuItem onClick={() => setAddOpen(true)}>
//                   Single Room Reading
//                 </DropdownMenuItem>
//                 <DropdownMenuItem onClick={() => setUploadOpen(true)}>
//                   Upload Excel Reading
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>

//             <Dialog
//               open={addOpen}
//               onOpenChange={(open) => {
//                 setAddOpen(open);
//                 if (!open) {
//                   setRoomSearch("");
//                   setFormFlatId("");
//                   setFormRoomId("");
//                   setFormPrevReading("");
//                   setFormCurrReading("");
//                   setFormAcPrev("");
//                   setFormAcCurr("");
//                   setFlatRoomRows([]);
//                   setManualMode(false);
//                   setManualRate(13);
//                   setRoomManualRates({});
//                 }
//               }}
//             >
//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>Add EB Reading</DialogTitle>
//                   <DialogDescription>
//                     Enter the electricity meter readings for this month to calculate tenant EB bills.
//                   </DialogDescription>
//                 </DialogHeader>

//                 <div className="grid gap-4">

//                   {/* FLAT SELECT */}
//                   <Label>Flat</Label>
//                   <Select value={formFlatId} onValueChange={setFormFlatId}>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select Flat" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {flats.map(f => (
//                         <SelectItem key={f.id} value={String(f.id)}>
//                           {f.flatNumber}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>

//                   {/* ── FLAT MODE ── */}
//                   {formFlatId ? (
//                     <div className="space-y-3 max-h-[300px] overflow-y-auto">
//                       {flatRoomRows.map(row => {
//                         /* dynamic columns: 3 for non-AC, 5 for AC */
//                         const cols = row.isAc ? "grid-cols-5" : "grid-cols-3";
//                         return (
//                           <div key={row.roomId}>
//                             {/* header row — rendered once per room for clarity */}
//                             <div className={`grid ${cols} font-semibold text-xs text-muted-foreground mb-1`}>
//                               <div>Room</div>
//                               <div>Prev</div>
//                               <div>Current</div>
//                               {row.isAc && <div>AC Prev</div>}
//                               {row.isAc && <div>AC Curr</div>}
//                             </div>
//                             <div className={`grid ${cols} gap-2 items-center`}>
//                               <div className="text-sm font-medium">{row.roomNumber}</div>
//                               <Input value={row.previousReading} readOnly />
//                               <Input
//                                 placeholder="Current"
//                                 value={row.currentReading}
//                                 onChange={e =>
//                                   handleFlatRowChange(row.roomId, "currentReading", e.target.value)
//                                 }
//                               />
//                               {/* AC inputs — only for AC rooms */}
//                               {row.isAc && (
//                                 <>
//                                   <Input value={row.acPreviousReading} readOnly />
//                                   <Input
//                                     placeholder="AC Current"
//                                     value={row.acCurrentReading}
//                                     onChange={e =>
//                                       handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)
//                                     }
//                                   />
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   ) : (
//                     /* ── ROOM MODE — standalone rooms only (no flatId) ── */
//                     <>
//                       <Label>Room</Label>
//                       <Select
//                         value={formRoomId}
//                         onValueChange={(val) => {
//                           setFormRoomId(val);
//                           setRoomSearch("");
//                         }}
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select room" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                             <Input
//                               placeholder="Search room..."
//                               value={roomSearch}
//                               onChange={e => setRoomSearch(e.target.value)}
//                               onKeyDown={e => e.stopPropagation()}
//                               className="h-8 text-sm"
//                               autoFocus
//                             />
//                           </div>

//                           {flatFilteredRooms
//                             .filter(r =>
//                               r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                             )
//                             .map(r => (
//                               <SelectItem key={r.id} value={String(r.id)}>
//                                 {r.roomNumber}
//                               </SelectItem>
//                             ))}

//                           {flatFilteredRooms.filter(r =>
//                             r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                           ).length === 0 && (
//                             <div className="px-3 py-2 text-sm text-muted-foreground">
//                               No room found
//                             </div>
//                           )}
//                         </SelectContent>
//                       </Select>

//                       <Input placeholder="Previous" value={formPrevReading} readOnly />
//                       <Input
//                         placeholder="Current"
//                         value={formCurrReading}
//                         onChange={e => setFormCurrReading(e.target.value)}
//                       />

//                       {/* AC Reading — shown ONLY when the selected room is an AC room */}
//                       {selectedRoomObj?.hostelType === "AC" && (
//                         <div className="space-y-2">
//                           <Label>AC Reading</Label>
//                           <Input
//                             type="number"
//                             placeholder="Previous"
//                             value={formAcPrev}
//                             readOnly
//                           />
//                           <Input
//                             type="number"
//                             placeholder="Current"
//                             value={formAcCurr}
//                             onChange={e => setFormAcCurr(e.target.value)}
//                           />
//                         </div>
//                       )}
//                     </>
//                   )}

//                   {/* RATE MODE */}
//                   <div className="flex items-center gap-2 mb-2">
//                     <Label>Mode:</Label>
//                     <Button
//                       size="sm"
//                       variant={manualMode ? "secondary" : "outline"}
//                       onClick={() => setManualMode(false)}
//                     >
//                       Automatic
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant={manualMode ? "outline" : "secondary"}
//                       onClick={() => setManualMode(true)}
//                     >
//                       Manual
//                     </Button>
//                   </div>

//                   {manualMode && (
//                     <div className="space-y-2">
//                       <Label>Unit Rate (₹)</Label>

//                       {!formFlatId && (
//                         <Input
//                           type="number"
//                           value={roomManualRates[formRoomId] ?? ""}
//                           onChange={e =>
//                             setRoomManualRates(prev => ({
//                               ...prev,
//                               [formRoomId]: Number(e.target.value),
//                             }))
//                           }
//                           placeholder="Enter rate for this room"
//                         />
//                       )}

//                       {formFlatId && (
//                         <div className="space-y-2">
//                           {flatRoomRows.map(row => (
//                             <div key={row.roomId} className="flex gap-2 items-center">
//                               <span className="w-24 text-sm">{row.roomNumber}</span>
//                               <Input
//                                 type="number"
//                                 value={manualRate}
//                                 onChange={e => {
//                                   const val = Number(e.target.value);
//                                   setManualRate(val);
//                                   const updated: Record<string, number> = {};
//                                   flatRoomRows.forEach(r => {
//                                     updated[String(r.roomId)] = val;
//                                   });
//                                   setRoomManualRates(prev => ({ ...prev, ...updated }));
//                                 }}
//                                 placeholder="Enter unit rate for all rooms"
//                               />
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 <DialogFooter>
//                   <DialogClose asChild>
//                     <Button variant="outline">Cancel</Button>
//                   </DialogClose>
//                   <Button onClick={handleAdd}>Save</Button>
//                 </DialogFooter>
//               </DialogContent>
//             </Dialog>
//           </>
//         )}
//       </div>

//       {/* BILL DIALOG */}
//       <Dialog open={billOpen} onOpenChange={setBillOpen}>
//         <DialogContent className="max-w-lg">
//           <DialogHeader>
//             <DialogTitle>EB Bill - Room {billRoom}</DialogTitle>
//             <DialogDescription>Tenant wise electricity bill</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-3 max-h-[400px] overflow-y-auto">
//             {tenantBills.length === 0 && (
//               <p className="text-sm text-muted-foreground">No tenant bill found</p>
//             )}
//             {tenantBills.map((bill, i) => (
//               <div key={i} className="flex justify-between border p-3 rounded-lg">
//                 <div>
//                   <p className="font-medium">{bill.tenantName || bill.name}</p>
//                   <p className="text-sm text-muted-foreground">
//                     {bill.acUser ? "AC User" : "Non-AC User"}
//                   </p>
//                 </div>
//                 <div className="font-semibold">
//                   ₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}
//                 </div>
//               </div>
//             ))}
//           </div>
//           <DialogFooter>
//             <DialogClose asChild>
//               <Button variant="outline">Close</Button>
//             </DialogClose>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* UPLOAD DIALOG */}
//       <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Upload EB Excel</DialogTitle>
//             <DialogDescription>
//               Upload Excel file with Room No, Previous, Current, AC Units
//             </DialogDescription>
//           </DialogHeader>
//           <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
//           <DialogFooter>
//             <DialogClose asChild>
//               <Button variant="outline">Cancel</Button>
//             </DialogClose>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* BRANCH FILTER */}
// <div className="mb-4 w-60">
//   {isAdmin ? (
//     <Select value={selectedBranch} onValueChange={setSelectedBranch}>
//       <SelectTrigger>
//         <SelectValue placeholder="Select Branch" />
//       </SelectTrigger>
//       <SelectContent>
//         <SelectItem value="all">All</SelectItem>
//         {branches.map(b => (
//           <SelectItem key={b.id} value={String(b.id)}>
//             {b.unitName}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   ) : (
//     <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
//       <span className="text-foreground font-semibold">
//         {branches.find(b => String(b.id) === selectedBranch)?.unitName ?? "Unit"}
//       </span>
//     </div>
//   )}
// </div>

//       <div className="ag-theme-alpine" style={{ height: 513 }}>
//         <AgGridReact
//           rowData={filteredTenantRows}
//           columnDefs={columns}
//           pagination={true}
//           paginationPageSize={10}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//         />
//       </div>

//       <div className="flex justify-end">
//         <Button size="sm" onClick={handleDownloadExcel}>Download Excel</Button>
//       </div>
//     </div>
//   );
// };

// export default EBReadingsPage;

































































































import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  getRooms,
  getEBReadings,
  addEBReading,
  deleteEBReading,
  getTenantWiseEBBill,
  sendEBBillWhatsApp,
  getUserRole,
  getTenants,
  getBranchId,
  getBranches,
  getFlats,
  deleteEBReadingsByFlat,
  deleteEBReadingsByRoom,
  fetchAllPages,
} from "@/lib/store";

import { Room, EBReading, EBStatus, Tenant, Branch, Flat } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import * as XLSX from "xlsx";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { Plus, Trash2, MessageCircle } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";

const EBReadingsPage = () => {
  const role     = getUserRole()?.toUpperCase();
  const branchId = getBranchId();
  const isAdmin  = role === "ADMIN";
  const hasAccess = isAdmin || role === "WARDEN";

  const [rooms,          setRooms]          = useState<Room[]>([]);
  const [readings,       setReadings]       = useState<EBReading[]>([]);
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [allReadings,    setAllReadings]    = useState<EBReading[]>([]);
  const [branches,       setBranches]       = useState<Branch[]>([]);
  const [flats,          setFlats]          = useState<Flat[]>([]);
  const [tenantRows,     setTenantRows]     = useState<any[]>([]);
  const [flatRoomRows,   setFlatRoomRows]   = useState<any[]>([]);
  const [bulkRows,       setBulkRows]       = useState<any[]>([]);
  const [tenantBills,    setTenantBills]    = useState<any[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [bulkOpen,   setBulkOpen]   = useState(false);
  const [billOpen,   setBillOpen]   = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<string>(
    role === "ADMIN" ? "all" : String(getBranchId() ?? "all")
  );

  const [manualRate,       setManualRate]       = useState<number | "">(13);
  const [manualMode,       setManualMode]       = useState(false);
  const [roomManualRates,  setRoomManualRates]  = useState<Record<string, number>>({});

  const [formFlatId,      setFormFlatId]      = useState("");
  const [formRoomId,      setFormRoomId]      = useState("");
  const [formPrevReading, setFormPrevReading] = useState("");
  const [formCurrReading, setFormCurrReading] = useState("");
  const [formAcPrev,      setFormAcPrev]      = useState("");
  const [formAcCurr,      setFormAcCurr]      = useState("");
  const [roomSearch,      setRoomSearch]      = useState("");
  const [billRoom,        setBillRoom]        = useState("");

  const selMonth = new Date().getMonth() + 1;
  const selYear  = new Date().getFullYear();

  /* ─── RATE ─────────────────────────────────────────────── */
  const getRateForRoom = (roomId: string | number) => {
    const roomRate = roomManualRates[String(roomId)];
    if (manualMode && roomRate !== undefined) return roomRate;
    if (typeof manualRate === "number") return manualRate;
    return 13;
  };

  /* ─── IS AC ─────────────────────────────────────────────── */
  const isRoomAc = useCallback(
    (roomId: string | number) => {
      const room = rooms.find(r => String(r.id) === String(roomId));
      return room?.hostelType === "AC";
    },
    [rooms]
  );

  /* ─── FLAT ROW CHANGE ───────────────────────────────────── */
  const handleFlatRowChange = (
    roomId: string | number,
    field: "currentReading" | "acCurrentReading",
    value: string
  ) => {
    setFlatRoomRows(prev =>
      prev.map(row => (row.roomId === roomId ? { ...row, [field]: value } : row))
    );
  };

  /* ─── STARTING READINGS ─────────────────────────────────── */
  const getRoomStartingACReading = useCallback(
    (roomId: string | number) => {
      const roomSpecific = allReadings
        .filter(r => r.roomId != null && String(r.roomId) === String(roomId))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          if (b.month !== a.month) return b.month - a.month;
          return (b.id ?? 0) - (a.id ?? 0);
        });
      if (roomSpecific.length > 0) return Number(roomSpecific[0].acCurrentReading ?? 0);

      const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
      if (roomTenants.length > 0)
        return Math.min(...roomTenants.map(t => Number(t.acJoinReading ?? 0)));
      return 0;
    },
    [allReadings, tenants]
  );

  const getRoomStartingReading = useCallback(
    (roomId: string | number) => {
      const room = rooms.find(r => String(r.id) === String(roomId));
      const roomReadings = allReadings.filter(r => String(r.roomId) === String(roomId));

      if (roomReadings.length > 0) {
        const sorted = [...roomReadings].sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });
        return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
      }

      if (room?.flatId) {
        const flatReadings = allReadings.filter(
          r => String(r.flatId) === String(room.flatId)
        );
        if (flatReadings.length > 0) {
          const sorted = [...flatReadings].sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
          });
          return Math.max(...sorted.map(r => Number(r.currentReading ?? 0)));
        }
      }

      const roomTenants = tenants.filter(t => String(t.roomId) === String(roomId));
      if (roomTenants.length > 0)
        return Math.min(...roomTenants.map(t => Number(t.joinReading ?? 0)));
      return 0;
    },
    [allReadings, tenants, rooms]
  );

  const getRoomIdByRoomNumber = (roomNumber: string) =>
    rooms.find(r => r.roomNumber === roomNumber)?.id;

  /* ─── ROOM TOTALS ───────────────────────────────────────── */
  const roomTotals = useMemo(() => {
    const map: Record<string, { units: number; amount: number }> = {};
    tenantRows.forEach(row => {
      const key = row.flatId ? `flat-${row.flatId}` : `room-${row.roomId}`;
      if (!map[key]) map[key] = { units: 0, amount: 0 };
      map[key].amount += Number(row.tenantAmount ?? 0);
      map[key].units = Math.round(
        Number(row.currentReading ?? 0) - Number(row.previousReading ?? 0)
      );
    });
    return map;
  }, [tenantRows]);

  /* ─── FILTERED ROOMS / FLATS ────────────────────────────── */
  const filteredRooms = useMemo(() => {
    if (selectedBranch === "all") return rooms;
    return rooms.filter(r => String(r.unitId) === selectedBranch);
  }, [rooms, selectedBranch]);

  const standaloneRooms = useMemo(
    () => filteredRooms.filter(r => !r.flatId),
    [filteredRooms]
  );

  const flatFilteredRooms = useMemo(() => {
    if (!formFlatId) return standaloneRooms;
    return filteredRooms.filter(r => String(r.flatId) === String(formFlatId));
  }, [filteredRooms, standaloneRooms, formFlatId]);

  const flatMap = useMemo(() => {
    const map: Record<string, string> = {};
    flats.forEach(f => { map[String(f.id)] = f.flatNumber; });
    return map;
  }, [flats]);

  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach(r => (map[String(r.id)] = r.roomNumber));
    return map;
  }, [rooms]);

  /* ─── FILTERED READINGS ─────────────────────────────────── */
  const filteredReadings = useMemo(() => {
    let data = readings.filter(r => r.month === selMonth && r.year === selYear);
    if (selectedBranch !== "all") {
      const branchRooms   = rooms.filter(r => String(r.unitId) === selectedBranch);
      const branchRoomIds = new Set(branchRooms.map(r => r.id));
      const branchFlatIds = new Set(branchRooms.map(r => r.flatId).filter(Boolean));
      data = data.filter(r =>
        (r.roomId != null && branchRoomIds.has(r.roomId)) ||
        (r.flatId != null && branchFlatIds.has(r.flatId))
      );
    }
    return data;
  }, [readings, rooms, selectedBranch, selMonth, selYear]);

  /* ─── RELOAD ────────────────────────────────────────────── */
  const reload = async () => {
    const [roomList, readingList, tenantList, branchList, flatList] = await Promise.all([
      fetchAllPages<Room>(getRooms),
      fetchAllPages<EBReading>(getEBReadings),
      fetchAllPages<Tenant>(getTenants),
      fetchAllPages<Branch>(getBranches),
      fetchAllPages<Flat>(getFlats),
    ]);

    let filteredRoomsData = roomList;
    let filteredTenants   = tenantList;
    let filteredReadings  = readingList;

    if (!isAdmin) {
      filteredRoomsData = roomList.filter(r => r.unitId === branchId);
      const roomIds = new Set(filteredRoomsData.map(r => r.id));
      const flatIds = new Set(filteredRoomsData.map(r => r.flatId).filter(Boolean));
      filteredTenants  = tenantList.filter(t => roomIds.has(t.roomId));
      filteredReadings = readingList.filter(r =>
        (r.roomId != null && roomIds.has(r.roomId)) ||
        (r.flatId != null && flatIds.has(r.flatId))
      );
    }

    setRooms(filteredRoomsData);
    setReadings(filteredReadings);
    setTenants(filteredTenants);
    setAllReadings(readingList);
    setBranches(branchList);
    setFlats(flatList);
  };

  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, []);

  /* ─── FLAT ROOM ROWS ─────────────────────────────────────── */
  useEffect(() => {
    if (!formFlatId) { setFlatRoomRows([]); return; }

    const roomsInFlat = filteredRooms.filter(
      r => String(r.flatId) === String(formFlatId)
    );

    const rows = roomsInFlat.map(room => {
      const allForRoom = readings
        .filter(r => r.roomId != null && String(r.roomId) === String(room.id))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          if (b.month !== a.month) return b.month - a.month;
          return (b.id ?? 0) - (a.id ?? 0);
        });
      const latest = allForRoom[0] ?? null;

      return {
        roomId:           room.id,
        roomNumber:       room.roomNumber,
        isAc:             room.hostelType === "AC",
        previousReading:  latest != null
          ? Number(latest.currentReading ?? 0)
          : getRoomStartingReading(room.id),
        currentReading:   "",
        acPreviousReading: latest != null
          ? Number(latest.acCurrentReading ?? 0)
          : getRoomStartingACReading(room.id),
        acCurrentReading: "",
      };
    });

    setFlatRoomRows(rows);
  }, [formFlatId, filteredRooms, readings, getRoomStartingReading, getRoomStartingACReading]);

  /* ─── SYNC FORM READINGS ON ROOM CHANGE ─────────────────── */
  useEffect(() => {
    if (!formRoomId) return;
    setFormPrevReading(String(getRoomStartingReading(formRoomId)));
    setFormAcPrev(String(getRoomStartingACReading(formRoomId)));
  }, [formRoomId, getRoomStartingReading, getRoomStartingACReading]);

  /* ─── BUILD TENANT BILL ROWS ─────────────────────────────── */
  useEffect(() => {
    const loadTenantBills = async () => {
      const rows: any[] = [];
      const flatHandled = new Set<number>();
      const roomHandled = new Set<number>();

      const flatReadingMap = new Map<number, EBReading>();
      for (const r of filteredReadings.filter(r => r.flatId != null)) {
        const existing = flatReadingMap.get(r.flatId);
        if (!existing || Number(r.currentReading ?? 0) > Number(existing.currentReading ?? 0)) {
          flatReadingMap.set(r.flatId, r);
        }
      }

      for (const r of Array.from(flatReadingMap.values())) {
        if (flatHandled.has(r.flatId)) continue;
        flatHandled.add(r.flatId);
        try {
          const bills = await getTenantWiseEBBill({ flatId: r.flatId });
          bills.forEach((b: any) => {
            rows.push({
              id:               r.id,
              roomId:           getRoomIdByRoomNumber(b.roomNumber),
              flatId:           r.flatId,
              roomNumber:       b.roomNumber,
              flatNumber:       b.flatNumber,
              tenantName:       b.tenantName,
              previousReading:  b.previousReading,
              currentReading:   b.currentReading,
              acPreviousReading: b.acPreviousReading,
              acCurrentReading:  b.acCurrentReading,
              unitsConsumed:    b.totalUnits,
              tenantAmount:     b.amount,
            });
          });
        } catch { /* skip failed flat */ }
      }

      const roomReadings = filteredReadings.filter(r => {
        const room = rooms.find(rm => rm.id === r.roomId);
        return !room?.flatId && r.roomId != null;
      });

      for (const r of roomReadings) {
        const room = rooms.find(rm => rm.id === r.roomId);
        if (!room) continue;
        if (room.flatId && flatHandled.has(room.flatId)) continue;
        if (roomHandled.has(r.roomId)) continue;
        roomHandled.add(r.roomId);
        try {
          const bills = await getTenantWiseEBBill({ roomId: r.roomId });
          bills.forEach((b: any) => {
            rows.push({
              id:               r.id,
              roomId:           getRoomIdByRoomNumber(b.roomNumber),
              flatId:           room?.flatId,
              roomNumber:       b.roomNumber,
              flatNumber:       b.flatNumber,
              tenantName:       b.tenantName,
              previousReading:  b.previousReading,
              currentReading:   b.currentReading,
              acPreviousReading: b.acPreviousReading,
              acCurrentReading:  b.acCurrentReading,
              unitsConsumed:    b.totalUnits,
              tenantAmount:     b.amount,
            });
          });
        } catch { /* skip failed room */ }
      }

      setTenantRows(rows);
    };

    if (filteredReadings.length > 0) loadTenantBills();
    else setTenantRows([]);
  }, [filteredReadings, roomMap]);

  /* ─── BULK ROWS ─────────────────────────────────────────── */
  useEffect(() => {
    if (!bulkOpen) return;
    setBulkRows(
      filteredRooms.map(room => ({
        roomId:          room.id,
        roomNumber:      room.roomNumber,
        previousReading: getRoomStartingReading(room.id),
        currentReading:  "",
        acUnits:         "",
      }))
    );
  }, [bulkOpen, rooms, getRoomStartingReading]);

  /* ─── ADD READING ───────────────────────────────────────── */
  const handleAdd = async () => {
    try {
      if (formFlatId) {
        const validRows = flatRoomRows.filter(row => row.currentReading !== "");
        if (validRows.length === 0) return toast.error("Enter at least one room reading");

        for (const row of validRows) {
          const prev   = Number(row.previousReading);
          const curr   = Number(row.currentReading);
          const acPrev = row.isAc ? Number(row.acPreviousReading) : 0;
          const acCurr = row.isAc ? Number(row.acCurrentReading)  : 0;
          if (curr < prev) { toast.error(`Invalid reading for Room ${row.roomNumber}`); continue; }

          await addEBReading({
            flatId:            Number(formFlatId),
            roomId:            Number(row.roomId),
            month:             selMonth,
            year:              selYear,
            previousReading:   prev,
            currentReading:    curr,
            acPreviousReading: acPrev,
            acCurrentReading:  acCurr,
            ebRate:            getRateForRoom(row.roomId),
            isCheckout:        true,
          });
        }
        toast.success("Flat readings saved");
      } else {
        if (!formRoomId || !formCurrReading) return toast.error("Fill room data");

        const prev   = Number(formPrevReading);
        const curr   = Number(formCurrReading);
        const acPrev = isRoomAc(formRoomId) ? Number(formAcPrev) : 0;
        const acCurr = isRoomAc(formRoomId) ? Number(formAcCurr) : 0;

        if (curr < prev) return toast.error("Current reading cannot be less than previous");

        await addEBReading({
          roomId:            Number(formRoomId),
          month:             selMonth,
          year:              selYear,
          previousReading:   prev,
          currentReading:    curr,
          acPreviousReading: acPrev,
          acCurrentReading:  acCurr,
          ebRate:            getRateForRoom(formRoomId),
          isCheckout:        true,
        });
        toast.success("Room reading saved");
      }

      setAddOpen(false);
      setRoomSearch("");
      setFormFlatId("");
      setFormRoomId("");
      setFormPrevReading("");
      setFormCurrReading("");
      setFormAcPrev("");
      setFormAcCurr("");
      setFlatRoomRows([]);
      setManualMode(false);
      setManualRate(13);
      setRoomManualRates({});
      reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save readings");
    }
  };

  /* ─── EXCEL UPLOAD ──────────────────────────────────────── */
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;

    const data     = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

    let savedCount = 0, skippedCount = 0;
    const savedRoomNumbers = new Set<string>(); // ← track saved rooms

    for (const row of jsonData) {
      const room = filteredRooms.find(r => r.roomNumber === String(row.RoomNumber));
      if (!room) { skippedCount++; continue; }

      const prev    = Number(row.Previous   ?? 0);
      const curr    = Number(row.Current    ?? 0);
      const acPrev  = Number(row.AcPrevious ?? 0);
      const acCurr  = Number(row.AcCurrent  ?? 0);
      const rowRate = Number(row.EbRate);
      const ebRate  = !isNaN(rowRate) && rowRate > 0
        ? rowRate
        : getRateForRoom(room.id);

      if (curr < prev) {
        toast.error(`Invalid reading for Room ${row.RoomNumber}`);
        skippedCount++;
        continue;
      }
      if (!row.Current && row.Current !== 0) { skippedCount++; continue; }

      await addEBReading({
        roomId:            room.id,
        flatId:            formFlatId ? Number(formFlatId) : undefined,
        month:             selMonth,
        year:              selYear,
        previousReading:   prev,
        currentReading:    curr,
        acPreviousReading: room.hostelType === "AC" ? acPrev : 0,
        acCurrentReading:  room.hostelType === "AC" ? acCurr : 0,
        ebRate,
        isCheckout:        true,
      });

      savedCount++;
      savedRoomNumbers.add(room.roomNumber); // ← collect for WhatsApp
    }

    if (savedCount > 0) {
      toast.success(
        `${savedCount} reading${savedCount > 1 ? "s" : ""} saved` +
        (skippedCount > 0 ? ` (${skippedCount} skipped)` : "") +
        ` — sending WhatsApp bills...`
      );

      // ── Auto-send WhatsApp for every saved room ──────────────────
      let sentCount = 0, failedRooms: string[] = [];

      for (const roomNumber of savedRoomNumbers) {
        try {
          await sendEBBillWhatsApp(roomNumber);
          sentCount++;
        } catch (err: any) {
          const msg = err?.response?.data?.error || err?.message || "";
          if (msg.includes("Channel not found")) {
            failedRooms.push(`${roomNumber} (not joined sandbox)`);
          } else {
            failedRooms.push(roomNumber);
          }
        }
      }

      if (sentCount > 0) {
        toast.success(`WhatsApp sent to ${sentCount} room${sentCount > 1 ? "s" : ""}`);
      }
      if (failedRooms.length > 0) {
        toast.warning(
          `WhatsApp failed for: ${failedRooms.join(", ")}`
        );
      }
    } else {
      toast.warning("No valid readings found in the file");
    }

    setUploadOpen(false);
    e.target.value = "";
    reload();
  } catch (err) {
    console.error(err);
    toast.error("Failed to process Excel");
  }
};

  /* ─── DELETE ────────────────────────────────────────────── */
  const handleDelete = async (id: string, flatId?: number, roomId?: number) => {
    try {
      if (flatId) {
        await deleteEBReadingsByFlat(flatId);
        toast.success("Flat readings deleted");
      } else if (roomId) {
        await deleteEBReadingsByRoom(roomId);
        toast.success("Room readings deleted");
      } else {
        await deleteEBReading(id);
        toast.success("Reading deleted");
      }
      reload();
    } catch {
      toast.error("Failed to delete readings");
    }
  };

  /* ─── WHATSAPP ──────────────────────────────────────────── */
  const handleSendWhatsApp = async (roomId: string) => {
    try {
      const roomNumber = roomMap[roomId];
      if (!roomNumber) { toast.error("Room not found"); return; }
      try {
        await sendEBBillWhatsApp(roomNumber);
        toast.success("WhatsApp sent successfully");
      } catch (backendError: any) {
        const msg = backendError?.response?.data?.error || backendError.message || "";
        if (msg.includes("Channel not found")) {
          toast.error("Failed to send WhatsApp. Ensure the recipient has joined the Twilio sandbox.");
        } else {
          toast.error("Failed to send WhatsApp: " + msg);
        }
      }
    } catch {
      toast.error("Unexpected error while sending WhatsApp");
    }
  };

  /* ─── DOWNLOAD EXCEL ────────────────────────────────────── */
  const handleDownloadExcel = async () => {
    try {
      const latestReadings = await fetchAllPages<EBReading>(getEBReadings);

      const data = filteredRooms.map(room => {
        let lastReading: EBReading | undefined;

        const roomReadings = latestReadings
          .filter(r => r.roomId === room.id)
          .sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
          });

        if (roomReadings.length > 0) {
          lastReading = roomReadings.reduce((max, r) =>
            Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max
          );
        } else if (room.flatId) {
          const flatReadings = latestReadings
            .filter(r => r.flatId === room.flatId)
            .sort((a, b) => {
              if (b.year !== a.year) return b.year - a.year;
              return b.month - a.month;
            });
          if (flatReadings.length > 0) {
            lastReading = flatReadings.reduce((max, r) =>
              Number(r.currentReading ?? 0) > Number(max.currentReading ?? 0) ? r : max
            );
          }
        }

        const lastRate = lastReading?.ebRate ?? (typeof manualRate === "number" ? manualRate : 13);

        return {
          RoomNumber:  room.roomNumber,
          Previous:    lastReading?.currentReading ?? 0,
          Current:     "",
          AcPrevious:  room.hostelType === "AC" ? (lastReading?.acCurrentReading ?? 0) : "-",
          AcCurrent:   room.hostelType === "AC" ? "" : "-",
          EbRate:      lastRate,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = [
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "EB Readings");
      XLSX.writeFile(workbook, `EB_Readings_${selMonth}_${selYear}.xlsx`);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to download Excel");
    }
  };

  /* ─── BULK CHANGE ───────────────────────────────────────── */
  const handleBulkChange = (roomId: string, value: string) =>
    setBulkRows(prev => prev.map(r => r.roomId === roomId ? { ...r, currentReading: value } : r));

  const handleBulkACChange = (roomId: string, value: string) =>
    setBulkRows(prev => prev.map(r => r.roomId === roomId ? { ...r, acUnits: value } : r));

  /* ─── FILTERED TENANT ROWS ──────────────────────────────── */
  const filteredTenantRows = useMemo(() => {
    let data = tenantRows;
    if (selectedBranch !== "all") {
      data = data.filter(row => {
        const room = rooms.find(r => r.id === row.roomId);
        return String(room?.unitId) === selectedBranch;
      });
    }
    if (formFlatId) {
      data = data.filter(row => {
        const room = rooms.find(r => r.id === row.roomId);
        return String(room?.flatId) === String(formFlatId);
      });
    }
    return data;
  }, [tenantRows, selectedBranch, rooms, formFlatId]);

  /* ─── SELECTED ROOM OBJ ─────────────────────────────────── */
  const selectedRoomObj = useMemo(
    () => rooms.find(r => String(r.id) === String(formRoomId)),
    [rooms, formRoomId]
  );

  /* ─── AG-GRID COLUMNS ───────────────────────────────────── */
  const columns: ColDef[] = useMemo(
    () => [
      {
        headerName: "Flat",
        flex: 1,
        valueGetter: (p: any) => {
          const room = rooms.find(r => r.id === p.data.roomId);
          if (!room?.flatId) return "-";
          return flatMap[String(room.flatId)] || "-";
        },
      },
      { headerName: "Room",   flex: 1, valueGetter: (p: any) => roomMap[p.data.roomId] ?? "-" },
      { headerName: "Tenant", flex: 1, field: "tenantName" },
      { headerName: "Previous", flex: 1, field: "previousReading" },
      { headerName: "Current",  flex: 1, field: "currentReading"  },
      {
        headerName: "AC Previous",
        field: "acPreviousReading",
        flex: 1,
        valueFormatter: (p: any) => { const v = Number(p.value); return v ? String(Math.round(v)) : "-"; },
      },
      {
        headerName: "AC Current",
        field: "acCurrentReading",
        flex: 1,
        valueFormatter: (p: any) => { const v = Number(p.value); return v ? String(Math.round(v)) : "-"; },
      },
      {
        headerName: "Units",
        field: "unitsConsumed",
        flex: 1,
        valueFormatter: (p: any) => String(Math.round(Number(p.value ?? 0))),
      },
      {
        headerName: "Total Units",
        flex: 1,
        valueGetter: (p: any) =>
          Math.round(Number(p.data.currentReading ?? 0) - Number(p.data.previousReading ?? 0)),
      },
      {
        headerName: "Tenant Amount",
        field: "tenantAmount",
        flex: 1,
        valueFormatter: (p: any) => `₹${Math.round(Number(p.value ?? 0))}`,
      },
      {
        headerName: "Total Amount",
        flex: 1,
        valueGetter: (p: any) => {
          const key   = p.data.flatId ? `flat-${p.data.flatId}` : `room-${p.data.roomId}`;
          const total = roomTotals[key];
          return total ? `₹${Math.round(total.amount)}` : "₹0";
        },
      },
      {
        headerName: "Actions",
        minWidth: 120,
        maxWidth: 140,
        suppressSizeToFit: true,
        cellRenderer: (p: any) => (
          <div className="flex gap-2 items-center h-full">
            <Button size="icon" variant="ghost" onClick={() => handleSendWhatsApp(p.data.roomId)}>
              <MessageCircle className="h-4 w-4 text-green-500" />
            </Button>
            {hasAccess && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Delete this EB reading? This cannot be undone.")) {
                    handleDelete(
                      String(p.data.id),
                      p.data.flatId ? Number(p.data.flatId) : undefined,
                      p.data.roomId ? Number(p.data.roomId) : undefined
                    );
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [roomMap, flatMap, rooms, roomTotals, hasAccess]
  );

  /* ─── RESET DIALOG ──────────────────────────────────────── */
  const resetAddDialog = () => {
    setRoomSearch("");
    setFormFlatId("");
    setFormRoomId("");
    setFormPrevReading("");
    setFormCurrReading("");
    setFormAcPrev("");
    setFormAcCurr("");
    setFlatRoomRows([]);
    setManualMode(false);
    setManualRate(13);
    setRoomManualRates({});
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">EB Readings</h1>
          <p className="text-sm text-muted-foreground">Monthly electricity readings</p>
        </div>

        {hasAccess && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reading
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddOpen(true)}>
                  Single Room Reading
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                  Upload Excel Reading
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* ── Add Dialog ── */}
            <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) resetAddDialog(); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add EB Reading</DialogTitle>
                  <DialogDescription>
                    Enter the electricity meter readings for this month.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  {/* Flat Select */}
                  <Label>Flat</Label>
                  <Select value={formFlatId} onValueChange={setFormFlatId}>
                    <SelectTrigger><SelectValue placeholder="Select Flat" /></SelectTrigger>
                    <SelectContent>
                      {flats.map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.flatNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* FLAT MODE */}
                  {formFlatId ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {flatRoomRows.map(row => {
                        const cols = row.isAc ? "grid-cols-5" : "grid-cols-3";
                        return (
                          <div key={row.roomId}>
                            <div className={`grid ${cols} font-semibold text-xs text-muted-foreground mb-1`}>
                              <div>Room</div>
                              <div>Prev</div>
                              <div>Current</div>
                              {row.isAc && <div>AC Prev</div>}
                              {row.isAc && <div>AC Curr</div>}
                            </div>
                            <div className={`grid ${cols} gap-2 items-center`}>
                              <div className="text-sm font-medium">{row.roomNumber}</div>
                              <Input value={row.previousReading} readOnly />
                              <Input
                                placeholder="Current"
                                value={row.currentReading}
                                onChange={e => handleFlatRowChange(row.roomId, "currentReading", e.target.value)}
                              />
                              {row.isAc && (
                                <>
                                  <Input value={row.acPreviousReading} readOnly />
                                  <Input
                                    placeholder="AC Current"
                                    value={row.acCurrentReading}
                                    onChange={e => handleFlatRowChange(row.roomId, "acCurrentReading", e.target.value)}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ROOM MODE */
                    <>
                      <Label>Room</Label>
                      <Select value={formRoomId} onValueChange={val => { setFormRoomId(val); setRoomSearch(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
                            <Input
                              placeholder="Search room..."
                              value={roomSearch}
                              onChange={e => setRoomSearch(e.target.value)}
                              onKeyDown={e => e.stopPropagation()}
                              className="h-8 text-sm"
                              autoFocus
                            />
                          </div>
                          {flatFilteredRooms
                            .filter(r => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
                            .map(r => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
                            ))}
                          {flatFilteredRooms.filter(r =>
                            r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No room found</div>
                          )}
                        </SelectContent>
                      </Select>

                      <Input placeholder="Previous" value={formPrevReading} readOnly />
                      <Input
                        placeholder="Current"
                        value={formCurrReading}
                        onChange={e => setFormCurrReading(e.target.value)}
                      />

                      {selectedRoomObj?.hostelType === "AC" && (
                        <div className="space-y-2">
                          <Label>AC Reading</Label>
                          <Input type="number" placeholder="Previous" value={formAcPrev} readOnly />
                          <Input
                            type="number"
                            placeholder="Current"
                            value={formAcCurr}
                            onChange={e => setFormAcCurr(e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Rate Mode */}
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Mode:</Label>
                    <Button size="sm" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(false)}>Automatic</Button>
                    <Button size="sm" variant={manualMode ? "outline" : "secondary"} onClick={() => setManualMode(true)}>Manual</Button>
                  </div>

                  {manualMode && (
                    <div className="space-y-2">
                      <Label>Unit Rate (₹)</Label>
                      {!formFlatId && (
                        <Input
                          type="number"
                          value={roomManualRates[formRoomId] ?? ""}
                          onChange={e => setRoomManualRates(prev => ({ ...prev, [formRoomId]: Number(e.target.value) }))}
                          placeholder="Enter rate for this room"
                        />
                      )}
                      {formFlatId && (
                        <div className="space-y-2">
                          {flatRoomRows.map(row => (
                            <div key={row.roomId} className="flex gap-2 items-center">
                              <span className="w-24 text-sm">{row.roomNumber}</span>
                              <Input
                                type="number"
                                value={manualRate}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setManualRate(val);
                                  const updated: Record<string, number> = {};
                                  flatRoomRows.forEach(r => { updated[String(r.roomId)] = val; });
                                  setRoomManualRates(prev => ({ ...prev, ...updated }));
                                }}
                                placeholder="Enter unit rate for all rooms"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleAdd}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* ── Bill Dialog ── */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>EB Bill - Room {billRoom}</DialogTitle>
            <DialogDescription>Tenant wise electricity bill</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tenantBills.length === 0 && (
              <p className="text-sm text-muted-foreground">No tenant bill found</p>
            )}
            {tenantBills.map((bill, i) => (
              <div key={i} className="flex justify-between border p-3 rounded-lg">
                <div>
                  <p className="font-medium">{bill.tenantName || bill.name}</p>
                  <p className="text-sm text-muted-foreground">{bill.acUser ? "AC User" : "Non-AC User"}</p>
                </div>
                <div className="font-semibold">₹{Number(bill.amount ?? bill.tenantAmount ?? 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload EB Excel</DialogTitle>
            <DialogDescription>Upload Excel file with RoomNumber, Previous, Current, AcPrevious, AcCurrent, EbRate columns</DialogDescription>
          </DialogHeader>
          <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Branch Filter ── */}
      <div className="mb-4 w-60">
        {isAdmin ? (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">
              {branches.find(b => String(b.id) === selectedBranch)?.unitName ?? "Unit"}
            </span>
          </div>
        )}
      </div>

      {/* ── AG Grid ── */}
      <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact
          rowData={filteredTenantRows}
          columnDefs={columns}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={handleDownloadExcel}>Download Excel</Button>
      </div>
    </div>
  );
};

export default EBReadingsPage;