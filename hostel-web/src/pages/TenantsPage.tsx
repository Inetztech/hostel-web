// import { useEffect, useMemo, useState, useRef } from "react";
// import { AgGridReact } from "ag-grid-react";
// import type { ColDef } from "ag-grid-community";

// import {
//   getRooms,
//   getBeds,
//   getTenants,
//   addTenant,
//   updateTenant,
//   deleteTenant,
//   getBranches,
//   importTenantsExcel,
//   getUserRole,
//   getBranchId,
// } from "@/lib/store";

// import { Room, Bed, Tenant, IdProofType, Branch } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
//   DialogDescription,
//   DialogClose,
// } from "@/components/ui/dialog";

// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { UserPlus, Eye, Search, Pencil, Trash2, FileText } from "lucide-react";

// /* ─────────────────────────────────────────────────────────────
//    CONSTANTS
// ───────────────────────────────────────────────────────────── */
// const MAX_FILE_SIZE = 10 * 1024 * 1024; 
// const API_BASE = "http://localhost:8080";

// /* ─────────────────────────────────────────────────────────────
//    IdProofUploadField — defined OUTSIDE the page component so it
//    is never recreated on re-render. Receives everything it needs
//    as props; no internal ref ambiguity.
// ───────────────────────────────────────────────────────────── */
// interface IdProofUploadFieldProps {
//   idProofDoc: File | null;
//   existing?: string | null;
//   onChange: (file: File | null) => void;
// }

// const IdProofUploadField = ({
//   idProofDoc,
//   existing,
//   onChange,
// }: IdProofUploadFieldProps) => {
//   const inputRef = useRef<HTMLInputElement>(null);

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

//       const file = e.target.files?.[0] ?? null;

//       if (!file) {
//         onChange(null);
//         return;
//       }

//       // =========================
//       // FILE TYPE VALIDATION
//       // =========================
//       const allowedTypes = [
//           "image/jpeg",
//           "image/jpg",
//           "image/png",
//           "application/pdf",
//         ];

//       if (!allowedTypes.includes(file.type)) {

//         toast.error(
//           "Only JPG, JPEG, PNG images and PDF files are allowed"
//         );

//         e.target.value = "";

//         if (inputRef.current) {
//           inputRef.current.value = "";
//         }

//         onChange(null);

//         return;
//       }

//       // =========================
//       // FILE SIZE VALIDATION
//       // =========================
//       if (file.size > MAX_FILE_SIZE) {

//         toast.error(
//           "File too large. Maximum allowed size is 10 MB."
//         );

//         e.target.value = "";

//         if (inputRef.current) {
//           inputRef.current.value = "";
//         }

//         onChange(null);

//         return;
//       }

//       onChange(file);
//     };

//   return (
//     <div className="space-y-1.5">
//       <label className="text-xs font-medium text-muted-foreground">
//         ID Proof Document (PDF or Image, max 10 MB)
//       </label>

//       {/*
//         Use a native <input> — NOT shadcn <Input> — so that
//         e.target.value = "" resets the picker reliably in all browsers.
//       */}
//       <input
//         ref={inputRef}
//         type="file"
//         accept=".pdf,.jpg,.jpeg,.png"
//         onChange={handleChange}
//         className="flex h-9 w-full rounded-md border border-input bg-transparent
//                    px-3 py-1 text-sm shadow-sm
//                    file:border-0 file:bg-transparent file:text-sm file:font-medium
//                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
//                    disabled:cursor-not-allowed disabled:opacity-50"
//       />

//       {idProofDoc && (
//         <p className="text-xs text-green-600 flex items-center gap-1">
//           <FileText className="h-3 w-3" />
//           {idProofDoc.name}{" "}
//           <span className="text-muted-foreground">
//             ({(idProofDoc.size / 1024).toFixed(1)} KB)
//           </span>
//         </p>
//       )}

//       {!idProofDoc && existing && (
//         <a
//           href={`${API_BASE}${existing}`}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="text-xs text-blue-600 underline flex items-center gap-1"
//         >
//           <FileText className="h-3 w-3" />
//           View current document
//         </a>
//       )}
//     </div>
//   );
// };

// /* ─────────────────────────────────────────────────────────────
//    PAGE
// ───────────────────────────────────────────────────────────── */
// const TenantsPage = () => {
//   const role = getUserRole()?.toUpperCase();
//   const branchId = getBranchId();
//   const isAdmin = role === "ADMIN";
//   const hasAccess = true;

//   /* ================= STATE ================= */

//   const [rooms, setRooms] = useState<Room[]>([]);
//   const [beds, setBeds] = useState<Bed[]>([]);
//   const [tenants, setTenants] = useState<Tenant[]>([]);
//   const [search, setSearch] = useState("");

//   const [addOpen, setAddOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [viewOpen, setViewOpen] = useState(false);

//   const [editTenant, setEditTenant] = useState<Tenant | null>(null);
//   const [excelFile, setExcelFile] = useState<File | null>(null);
//   const excelInputRef = useRef<HTMLInputElement>(null);

//   const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
//   const [selectedBranch, setSelectedBranch] = useState<string>(
//     role === "ADMIN" ? "all" : String(getBranchId() ?? "all")
//   );

//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [roomSearch, setRoomSearch] = useState("");

//   /* ================= FORM ================= */

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [idProofType, setIdProofType] = useState<IdProofType | "">("");
//   const [idProofNumber, setIdProofNumber] = useState("");
//   const [roomId, setRoomId] = useState<number | "">("");
//   const [bedId, setBedId] = useState<number | "">("");
//   const [advance, setAdvance] = useState("");
//   const [monthlyRent, setMonthlyRent] = useState("");
//   const [currentReading, setCurrentReading] = useState("");
//   const [checkInDate, setCheckInDate] = useState("");
//   const [acJoinReading, setAcJoinReading] = useState("");
//   // Only set when the file has already passed the size check in IdProofUploadField
//   const [idProofDoc, setIdProofDoc] = useState<File | null>(null);


//   // Derived: is the currently selected room an AC room?
//     const selectedRoomIsAC = useMemo(() => {
//       if (!roomId) return false;
//       const room = rooms.find((r) => r.id === Number(roomId));
//       return room?.hostelType === "AC";
//     }, [roomId, rooms]);

//   /* ================= LOAD DATA ================= */

//   const load = async () => {
//     const [r, b, t, br] = await Promise.all([
//       getRooms(0, 1000),
//       getBeds(0, 1000),
//       getTenants(0, 1000),
//       getBranches(0, 1000),
//     ]);

//     let filteredRooms = r;
//     let filteredBeds = b;
//     let filteredTenants = t;

//     if (!isAdmin) {
//       filteredRooms = r.filter((room) => room.unitId === branchId);
//       const roomIds = filteredRooms.map((room) => room.id);
//       filteredBeds = b.filter((bed) => roomIds.includes(bed.roomId));
//       filteredTenants = t.filter((tenant) => roomIds.includes(tenant.roomId));
//     }

//     setRooms(filteredRooms);
//     setBeds(filteredBeds);
//     setTenants(filteredTenants || []);
//     setBranches(br);
//   };

//   const hasLoaded = useRef(false);

//   useEffect(() => {
//     if (hasLoaded.current) return;
//     hasLoaded.current = true;
//     load();
//   }, []);


//       useEffect(() => {
//       if (!selectedRoomIsAC) {
//         setAcJoinReading("");
//       }
//     }, [selectedRoomIsAC]);

//   /* ================= HELPERS ================= */

//   const roomNo = (id?: number | null) =>
//     rooms.find((r) => r.id === Number(id))?.roomNumber ?? "-";

//   const bedNo = (id?: number | null) =>
//     beds.find((b) => b.id === Number(id))?.bedNumber ?? "-";

//   const branchName = (roomId?: number | null) => {
//     const room = rooms.find((r) => r.id === Number(roomId));
//     if (!room) return "-";
//     return branches.find((b) => b.id === room.unitId)?.unitName ?? "-";
//   };

//     // Fix — also handles 413 and blob/string bodies:
//   const extractError = (e: any, fallback: string): string => {
//     // Axios wraps the response — try the structured body first
//     const msg = e?.response?.data?.message   // our ApiResponse.message
//             || e?.response?.data?.error      // Spring default
//             || e?.message
//             || fallback;
//     return msg;
//   };

//   /* ================= FILTER ================= */

//   const filteredTenants = useMemo(() => {
//     let data = tenants;

//     if (selectedBranch !== "all") {
//       data = data.filter((t) => {
//         const room = rooms.find((r) => r.id === t.roomId);
//         return String(room?.unitId) === selectedBranch;
//       });
//     }

//     if (search) {
//       data = data.filter((t) =>
//         t.name.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     return data;
//   }, [tenants, search, selectedBranch, rooms]);

//   // const availableBeds = useMemo(() => {
//   //   return beds.filter(
//   //     (b) =>
//   //       b.roomId === Number(roomId) &&
//   //       (!b.isOccupied || b.id === editTenant?.bedId)
//   //   );
//   // }, [beds, roomId, editTenant]);

//   const availableBeds = useMemo(() => {
//   return beds.filter((b) => {
//     if (b.roomId !== Number(roomId)) return false;
//     const isOccupied = b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";
//     return !isOccupied || b.id === editTenant?.bedId;
//   });
// }, [beds, roomId, editTenant]);

//   // const availableRooms = useMemo(() => {
//   //   return rooms.filter((r) =>
//   //     beds.some((b) => b.roomId === r.id && !b.isOccupied)
//   //   );
//   // }, [rooms, beds]);

//   const availableRooms = useMemo(() => {
//   return rooms.filter((r) =>
//     beds.some((b) => {
//       const isOccupied = b.isOccupied === true || (b.isOccupied as any) === 1 || String(b.isOccupied) === "true";
//       return b.roomId === r.id && !isOccupied;
//     })
//   );
// }, [rooms, beds]);

//   useEffect(() => {
//     if (!editTenant) {
//       setBedId("");
//     }
//   }, [roomId, editTenant]);

//   /* ================= PRINT TENANT ================= */

//   const handlePrintTenant = (tenant: Tenant) => {
//     const printContent = `
//       <html>
//         <head>
//           <title>Tenant Details</title>
//           <style>
//             body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
//             h2 { text-align: center; margin-bottom: 20px; }
//             table { width: 100%; border-collapse: collapse; }
//             th, td { text-align: left; padding: 8px; border: 1px solid #ccc; }
//             th { background-color: #f4f4f4; }
//           </style>
//         </head>
//         <body>
//           <h2>Tenant Details</h2>
//           <table>
//             <tr><th>Name</th><td>${tenant.name}</td></tr>
//             <tr><th>Phone</th><td>${tenant.phone}</td></tr>
//             <tr><th>Email</th><td>${tenant.email || "-"}</td></tr>
//             <tr><th>Branch</th><td>${branchName(tenant.roomId)}</td></tr>
//             <tr><th>Room</th><td>${roomNo(tenant.roomId)}</td></tr>
//             <tr><th>Bed</th><td>${bedNo(tenant.bedId)}</td></tr>
//             <tr><th>Status</th><td>${tenant.status}</td></tr>
//             <tr><th>Check-in</th><td>${tenant.checkInDate}</td></tr>
//             <tr><th>Check-out</th><td>${tenant.checkOutDate || "-"}</td></tr>
//             <tr><th>Advance</th><td>${tenant.advance}</td></tr>
//             <tr><th>Rent</th><td>${tenant.monthlyRent}</td></tr>
//             <tr><th>Current EB Reading</th><td>${tenant.joinReading}</td></tr>
//             <tr><th>AC Current EB Reading</th><td>${tenant.acJoinReading ?? "-"}</td></tr>
//           </table>
//         </body>
//       </html>
//     `;
//     const printWindow = window.open("", "_blank");
//     if (!printWindow) return;
//     printWindow.document.write(printContent);
//     printWindow.document.close();
//     printWindow.focus();
//     printWindow.print();
//   };

//   /* ================= RESET FORM ================= */

//   const resetForm = () => {
//     setName("");
//     setPhone("");
//     setEmail("");
//     setIdProofType("");
//     setIdProofNumber("");
//     setRoomId("");
//     setBedId("");
//     setAdvance("");
//     setMonthlyRent("");
//     setCurrentReading("");
//     setAcJoinReading("");
//     setCheckInDate("");
//     setIdProofDoc(null);
//   };

//   /* ================= BUILD FORM DATA ================= */

//   const buildFormData = () => {
//     const fd = new FormData();

//     if (name)          fd.append("name", name);
//     if (phone)         fd.append("phone", phone);
//     if (email)         fd.append("email", email);
//     if (idProofType)   fd.append("idProofType", idProofType);
//     if (idProofNumber) fd.append("idProofNumber", idProofNumber);
//     if (roomId !== "") fd.append("roomId", String(roomId));
//     if (bedId !== "")  fd.append("bedId", String(bedId));

//     fd.append("advance",     advance     || "0");
//     fd.append("monthlyRent", monthlyRent || "0");
//     fd.append("joinReading", currentReading || "0");

//     if (acJoinReading) fd.append("acJoinReading", acJoinReading);
//     if (checkInDate)   fd.append("checkInDate", checkInDate);

//     // idProofDoc is only set after passing size validation, so append directly
//     if (idProofDoc) {
//       fd.append("idProofDocument", idProofDoc);
//     }

//     return fd;
//   };

//   /* ================= ADD TENANT ================= */

//   const handleAdd = async () => {
//     if (!name || !phone || !roomId || !bedId) {
//       toast.error("Fill required fields");
//       return;
//     }

//     try {
//       await addTenant(buildFormData());

//       toast.success("Tenant added");
//       setAddOpen(false);
//       resetForm();
//       load();

//       const sendHostelRulesWhatsApp = (phone: string, tenantName: string) => {
//         const message = encodeURIComponent(`Hi ${tenantName},

// 🏠 Brindhavanam Gents Hostel – Vadapalani

// 📜 Updated Hostel Rules & Regulations

// 1. Hostel Fee Payment
//    Hostel fee must be transferred only to 98848 25258.
//    🔴 Do not transfer to 98402 34475 henceforth.

// 2. Due Date & Late Fee
//    Hostel fee should be paid on or before the 5th of every month.
//    A late fee of ₹100 per week will be charged for delays.

// 3. Vacating Notice
//    Residents must give 15 days' prior notice through WhatsApp (98848 25258) before vacating.
//    Caution deposit (advance) will be returned on the last day.

// 4. Notice Period & Advance Refund Policy
//    If a 15-day notice is not given, rent will be deducted accordingly.
//    Advance amount will not be refunded in case of vacating without the notice period.

// 5. Hostel Timings
//    Entry must be before 11:00 p.m.
//    Prior intimation is mandatory for late entry.

// 6. Food Consumption Policy 🍱
//    Food is strictly not allowed inside rooms. Use terrace/dining area.

// 7. Prohibited Activities
//    Smoking and consumption of alcohol are strictly prohibited.

// 8. Responsibility Clause
//    Management is not responsible for loss of belongings or unlawful activities.

// 9. Maintenance Deduction
//    ₹1000 maintenance charge will be deducted from your advance at the time of vacating.
// `);
//         window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
//       };

//       sendHostelRulesWhatsApp(phone, name);
//     } catch (e: any) {
//       // 413 means the server's multipart limit is too low — not the file itself.
//       // Fix: add these two lines to application.properties:
//       //   spring.servlet.multipart.max-file-size=10MB
//       //   spring.servlet.multipart.max-request-size=15MB
//       toast.error(extractError(e, "Failed to add tenant"));
//     }
//   };

//   /* ================= EDIT TENANT ================= */

//   const handleEdit = async () => {
//     if (!editTenant) return;

//     try {
//       await updateTenant(editTenant.id, buildFormData());

//       toast.success("Tenant updated");
//       setEditOpen(false);
//       resetForm();
//       load();
//     } catch (e: any) {
//       toast.error(extractError(e, "Update failed"));
//     }
//   };

//   /* ================= DELETE TENANT ================= */

//   const handleDeleteTenant = async (tenant: Tenant) => {
//     const confirmDelete = confirm(`Delete tenant "${tenant.name}" ?`);
//     if (!confirmDelete) return;

//     try {
//       await deleteTenant(tenant.id);
//       toast.success("Tenant deleted");
//       load();
//     } catch (e: any) {
//       toast.error(extractError(e, "Delete failed"));
//     }
//   };

//   /* ================= IMPORT EXCEL ================= */

//   const handleExcelImport = async () => {
//     if (!excelFile) {
//       toast.error("Please select an Excel file first");
//       return;
//     }

//     try {
//       await importTenantsExcel(excelFile);
//       toast.success("Excel imported successfully");
//       setExcelFile(null);
//       if (excelInputRef.current) excelInputRef.current.value = "";
//       load();
//       window.dispatchEvent(new Event("beds-updated"));
//     } catch (e: any) {
//       toast.error(extractError(e, "Excel import failed"), { duration: 8000 });
//     }
//   };

//   /* ================= GRID ================= */

//   const columnDefs: ColDef[] = [
//     { headerName: "Name",  field: "name",  flex: 1, cellClass: "text-left" },
//     { headerName: "Phone", field: "phone", flex: 1, cellClass: "text-left" },
//     {
//       headerName: "Branch",
//       valueGetter: (p) => (p.data.roomId ? branchName(p.data.roomId) : "-"),
//       flex: 1,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Room",
//       valueGetter: (p) => (p.data.roomId ? roomNo(p.data.roomId) : "-"),
//       flex: 1,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Type",
//       valueGetter: (p) => {
//         const room = rooms.find((r) => r.id === p.data.roomId);
//         return room?.hostelType === "AC" ? "AC" : "Non-AC";
//       },
//       cellRenderer: (p: any) => (
//         <Badge variant={p.value === "AC" ? "default" : "secondary"}>
//           {p.value}
//         </Badge>
//       ),
//     },
//     {
//       headerName: "Status",
//       field: "status",
//       flex: 1,
//       cellRenderer: (p: any) => <Badge>{p.value}</Badge>,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Action",
//       flex: 1,
//       minWidth: 220,
//       cellRenderer: (p: any) => (
//         <div className="flex justify-center gap-2">
//           <Button size="icon" variant="ghost" onClick={() => { setViewTenant(p.data); setViewOpen(true); }}>
//             <Eye className="h-4 w-4" />
//           </Button>

//           {hasAccess && (
//             <Button
//               size="icon"
//               variant="ghost"
//               onClick={() => {
//                 const t = p.data;
//                 setEditTenant(t);
//                 setName(t.name);
//                 setPhone(t.phone);
//                 setEmail(t.email || "");
//                 setIdProofType(t.idProofType);
//                 setIdProofNumber(t.idProofNumber || "");
//                 setRoomId(t.roomId);
//                 setBedId(t.bedId);
//                 setAdvance(String(t.advance));
//                 setMonthlyRent(String(t.monthlyRent));
//                 setCurrentReading(String(t.joinReading));
//                 setAcJoinReading(String(t.acJoinReading ?? ""));
//                 setCheckInDate(t.checkInDate);
//                 setIdProofDoc(null);
//                 setEditOpen(true);
//               }}
//             >
//               <Pencil className="h-4 w-4" />
//             </Button>
//           )}

//           {hasAccess && (
//             <Button size="icon" variant="ghost" onClick={() => handleDeleteTenant(p.data)}>
//               <Trash2 className="h-4 w-4 text-red-500" />
//             </Button>
//           )}

//           <Button size="icon" variant="ghost" onClick={() => handlePrintTenant(p.data)}>
//             <span className="h-4 w-4">🖨️</span>
//           </Button>
//         </div>
//       ),
//       cellClass: "text-center",
//     },
//   ];

//   const defaultColDef: ColDef = {
//     sortable: true,
//     filter: true,
//     resizable: true,
//     minWidth: 120,
//   };

//   /* ================= UI ================= */

//   return (
//     <div className="space-y-4">

//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">Tenants</h1>

//         {hasAccess && (
//           <div className="flex gap-2 items-center">

//             <Input
//               ref={excelInputRef}
//               type="file"
//               accept=".xlsx,.xls"
//               className="w-44"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (!file) return;
//                 if (file.size > MAX_FILE_SIZE) {
//                   toast.error("File size must be below 10 MB");
//                   e.target.value = "";
//                   return;
//                 }
//                 setExcelFile(file);
//               }}
//             />

//             <Button variant="outline" size="sm" onClick={handleExcelImport}>
//               Import Excel
//             </Button>

//             {/* ── ADD / CHECK-IN DIALOG ── */}
//             <Dialog
//               open={addOpen}
//               onOpenChange={(open) => {
//                 setAddOpen(open);
//                 if (!open) { resetForm(); setRoomSearch(""); }
//               }}
//             >
//               <DialogTrigger asChild>
//                 <Button size="sm">
//                   <UserPlus className="mr-2 h-4 w-4" />
//                   Check-In
//                 </Button>
//               </DialogTrigger>

//               <DialogContent className="max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                   <DialogTitle>Add Tenant</DialogTitle>
//                   <DialogDescription>
//                     Enter tenant details and assign an available room and bed.
//                   </DialogDescription>
//                 </DialogHeader>

//                 <div className="grid gap-3">
//                   <Input placeholder="Name"  value={name}  onChange={(e) => setName(e.target.value)} />
//                   <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
//                   <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

//                   <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
//                     <SelectTrigger><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="AADHAR">AADHAR</SelectItem>
//                       <SelectItem value="PAN">PAN</SelectItem>
//                       <SelectItem value="VOTER_ID">VOTER_ID</SelectItem>
//                       <SelectItem value="DRIVING_LICENSE">DRIVING_LICENSE</SelectItem>
//                       <SelectItem value="PASSPORT">PASSPORT</SelectItem>
//                     </SelectContent>
//                   </Select>

//                   <Input
//                     placeholder="ID Proof Number"
//                     value={idProofNumber}
//                     onChange={(e) => setIdProofNumber(e.target.value)}
//                   />

//                   {/*
//                     KEY FIX: IdProofUploadField is now defined outside this
//                     component, so it is stable across renders. idProofDoc and
//                     onChange are passed as props — no stale closures.
//                   */}
//                   <IdProofUploadField
//                     idProofDoc={idProofDoc}
//                     onChange={setIdProofDoc}
//                   />

//                   {/* Room selector with search */}
//                   <Select
//                     value={roomId ? String(roomId) : ""}
//                     onValueChange={(v) => { setRoomId(Number(v)); setRoomSearch(""); }}
//                   >
//                     <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
//                     <SelectContent>
//                       <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                         <Input
//                           placeholder="Search room..."
//                           value={roomSearch}
//                           onChange={(e) => setRoomSearch(e.target.value)}
//                           onKeyDown={(e) => e.stopPropagation()}
//                           className="h-8 text-sm"
//                           autoFocus
//                         />
//                       </div>
//                       {availableRooms
//                         .filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
//                         .map((r) => (
//                           <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                         ))}
//                       {availableRooms.filter((r) =>
//                         r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                       ).length === 0 && (
//                         <div className="px-3 py-2 text-sm text-muted-foreground">No room found</div>
//                       )}
//                     </SelectContent>
//                   </Select>

//                   <Select
//                     value={bedId ? String(bedId) : ""}
//                     onValueChange={(v) => setBedId(Number(v))}
//                   >
//                     <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
//                     <SelectContent>
//                       {availableBeds.map((b) => (
//                         <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>

//                   <Input type="number" placeholder="Advance"             value={advance}         onChange={(e) => setAdvance(e.target.value)} />
//                   <Input type="number" placeholder="Rent"                value={monthlyRent}     onChange={(e) => setMonthlyRent(e.target.value)} />
//                   <Input type="number" placeholder="Current EB Reading"  value={currentReading}  onChange={(e) => setCurrentReading(e.target.value)} />
//                   {selectedRoomIsAC && (
//                     <div className="space-y-1.5">
//                       <label className="text-xs font-medium text-muted-foreground">
//                         AC Current Reading (optional)
//                       </label>
//                       <Input
//                         type="number"
//                         placeholder="AC Current Reading"
//                         value={acJoinReading}
//                         onChange={(e) => setAcJoinReading(e.target.value)}
//                       />
//                     </div>
//                   )}
//                   <Input type="date"   value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
//                 </div>

//                 <DialogFooter>
//                   <DialogClose asChild>
//                     <Button variant="outline">Cancel</Button>
//                   </DialogClose>
//                   <Button onClick={handleAdd}>Check-In</Button>
//                 </DialogFooter>
//               </DialogContent>
//             </Dialog>

//           </div>
//         )}
//       </div>

//       {/* BRANCH FILTER */}
//       <div className="w-60">
//         <Select value={selectedBranch} onValueChange={setSelectedBranch}>
//           <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
//           <SelectContent>
//             {isAdmin && <SelectItem value="all">All</SelectItem>}
//             {branches
//               .filter((b) => isAdmin || b.id === branchId)
//               .map((b) => (
//                 <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//               ))}
//           </SelectContent>
//         </Select>
//       </div>

//       {/* SEARCH */}
//       <div className="relative">
//         <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
//         <Input
//           className="pl-9"
//           placeholder="Search tenants..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//       </div>

//       {/* GRID */}
//       <div className="ag-theme-alpine" style={{ height: 513 }}>
//         <AgGridReact<Tenant>
//           rowData={filteredTenants}
//           columnDefs={columnDefs}
//           defaultColDef={defaultColDef}
//           pagination={true}
//           paginationPageSize={10}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//         />
//       </div>

//       {/* ── EDIT TENANT DIALOG ── */}
//       <Dialog
//         open={editOpen}
//         onOpenChange={(open) => {
//           setEditOpen(open);
//           if (!open) resetForm();
//         }}
//       >
//         <DialogContent className="max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Edit Tenant</DialogTitle>
//             <DialogDescription>Update tenant information and save your changes.</DialogDescription>
//           </DialogHeader>

//           <div className="grid gap-3">
//             <Input placeholder="Name"  value={name}  onChange={(e) => setName(e.target.value)} />
//             <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
//             <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

//             <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
//               <SelectTrigger><SelectValue /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="AADHAR">AADHAR</SelectItem>
//                 <SelectItem value="PAN">PAN</SelectItem>
//                 <SelectItem value="VOTER_ID">VOTER_ID</SelectItem>
//                 <SelectItem value="DRIVING_LICENSE">DRIVING_LICENSE</SelectItem>
//                 <SelectItem value="PASSPORT">PASSPORT</SelectItem>
//               </SelectContent>
//             </Select>

//             <Input
//               placeholder="ID Proof Number"
//               value={idProofNumber}
//               onChange={(e) => setIdProofNumber(e.target.value)}
//             />

//             <IdProofUploadField
//               idProofDoc={idProofDoc}
//               existing={editTenant?.idProofDocument}
//               onChange={setIdProofDoc}
//             />

//             {/* Room */}
//             <Select
//               value={roomId ? String(roomId) : ""}
//               onValueChange={(v) => setRoomId(Number(v))}
//             >
//               <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
//               <SelectContent>
//                 {rooms
//                   .filter(
//                     (r) =>
//                       beds.some((b) => b.roomId === r.id && !b.isOccupied) ||
//                       r.id === editTenant?.roomId
//                   )
//                   .map((r) => (
//                     <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                   ))}
//               </SelectContent>
//             </Select>

//             {/* Bed */}
//             <Select
//               value={bedId ? String(bedId) : ""}
//               onValueChange={(v) => setBedId(Number(v))}
//             >
//               <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
//               <SelectContent>
//                 {availableBeds.map((b) => (
//                   <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>

//             <Input type="number" placeholder="Advance"             value={advance}         onChange={(e) => setAdvance(e.target.value)} />
//             <Input type="number" placeholder="Rent"                value={monthlyRent}     onChange={(e) => setMonthlyRent(e.target.value)} />
//             <Input type="number" placeholder="Current EB Reading"  value={currentReading}  onChange={(e) => setCurrentReading(e.target.value)} />
//            {selectedRoomIsAC && (
//                 <div className="space-y-1.5">
//                   <label className="text-xs font-medium text-muted-foreground">
//                     AC Current Reading (optional)
//                   </label>
//                   <Input
//                     type="number"
//                     placeholder="AC Current Reading"
//                     value={acJoinReading}
//                     onChange={(e) => setAcJoinReading(e.target.value)}
//                   />
//                 </div>
//               )}
//             <Input type="date"   value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
//             <Button onClick={handleEdit}>Update Tenant</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ── VIEW TENANT DIALOG ── */}
//       <Dialog open={viewOpen} onOpenChange={setViewOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Tenant Details</DialogTitle>
//             <DialogDescription>View complete information about this tenant.</DialogDescription>
//           </DialogHeader>

//           {viewTenant && (
//             <div className="grid gap-2 text-sm">
//               <p>Name: {viewTenant.name}</p>
//               <p>Phone: {viewTenant.phone}</p>
//               <p>Email: {viewTenant.email}</p>
//               <p>Identity Proof: {viewTenant.idProofType}</p>
//               <p>ID Number: {viewTenant.idProofNumber}</p>

//               {viewTenant.idProofDocument ? (
//                 <p className="flex items-center gap-1">
//                   ID Document:{" "}
//                   <a
//                     href={`${API_BASE}${viewTenant.idProofDocument}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-blue-600 underline flex items-center gap-1"
//                   >
//                     <FileText className="h-3 w-3" />
//                     View / Download
//                   </a>
//                 </p>
//               ) : (
//                 <p className="text-muted-foreground text-xs">No ID document uploaded</p>
//               )}

//               <p>Branch: {branchName(viewTenant.roomId)}</p>
//               <p>Room: {roomNo(viewTenant.roomId)}</p>
//               <p>Bed: {bedNo(viewTenant.bedId)}</p>
//               <p>Status: {viewTenant.status}</p>
//               <p>Check-in: {viewTenant.checkInDate}</p>
//               <p>Check-out: {viewTenant.checkOutDate ?? "-"}</p>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//     </div>
//   );
// };

// export default TenantsPage;































// import { useEffect, useMemo, useState, useRef, useCallback } from "react";
// import { AgGridReact } from "ag-grid-react";
// import type { ColDef, GridReadyEvent, PaginationChangedEvent } from "ag-grid-community";

// import {
//   fetchRooms,
//   fetchBeds,
//   addTenant,
//   updateTenant,
//   deleteTenant,
//   getBranches,
//   importTenantsExcel,
//   getUserRole,
//   getBranchId,
// } from "@/lib/store";

// import { Room, Bed, Tenant, IdProofType, Branch } from "@/lib/types";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
//   DialogDescription,
//   DialogClose,
// } from "@/components/ui/dialog";

// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import {
//   UserPlus,
//   Eye,
//   Search,
//   Pencil,
//   Trash2,
//   FileText,
// } from "lucide-react";
// import api from "@/lib/api";

// /* ─────────────────────────────────────────────────────────────
//    CONSTANTS
// ───────────────────────────────────────────────────────────── */
// const MAX_FILE_SIZE = 10 * 1024 * 1024;
// const API_BASE      = "http://localhost:8080";
// const PAGE_SIZE     = 10;

// /* ─────────────────────────────────────────────────────────────
//    GENERIC HELPER — fetch every page (for small reference data)
// ───────────────────────────────────────────────────────────── */
// async function fetchAllPages<T>(
//   fetchFn: (page: number, size: number) => Promise<any>,
//   pageSize = 10
// ): Promise<T[]> {
//   const first = await fetchFn(0, pageSize);
//   const firstContent: T[] = first?.content ?? (Array.isArray(first) ? first : []);
//   const total: number     = first?.totalElements ?? firstContent.length;
//   if (total <= pageSize) return firstContent;
//   const totalPages = Math.ceil(total / pageSize);
//   const rest = await Promise.all(
//     Array.from({ length: totalPages - 1 }, (_, i) =>
//       fetchFn(i + 1, pageSize).then((r: any) => r?.content ?? (Array.isArray(r) ? r : []))
//     )
//   );
//   return [...firstContent, ...rest.flat()];
// }

// /* ─────────────────────────────────────────────────────────────
//    SERVER-SIDE TENANT FETCHER
// ───────────────────────────────────────────────────────────── */
// const fetchTenantsPage = async (
//   page: number,
//   size: number,
//   unitId?: string
// ): Promise<{ content: Tenant[]; totalElements: number }> => {
//   const params: Record<string, any> = { page, size };
//   if (unitId && unitId !== "all") params.unitId = unitId;

//   const res = await api.get("/tenants", { params });
//   return {
//     content:       res.data?.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? 0,
//   };
// };

// /* ─────────────────────────────────────────────────────────────
//    IdProofUploadField
// ───────────────────────────────────────────────────────────── */
// interface IdProofUploadFieldProps {
//   idProofDoc: File | null;
//   existing?: string | null;
//   onChange: (file: File | null) => void;
// }

// const IdProofUploadField = ({ idProofDoc, existing, onChange }: IdProofUploadFieldProps) => {
//   const inputRef = useRef<HTMLInputElement>(null);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0] ?? null;
//     if (!file) { onChange(null); return; }
//     const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only JPG, JPEG, PNG images and PDF files are allowed");
//       e.target.value = "";
//       if (inputRef.current) inputRef.current.value = "";
//       onChange(null);
//       return;
//     }
//     if (file.size > MAX_FILE_SIZE) {
//       toast.error("File too large. Maximum allowed size is 10 MB.");
//       e.target.value = "";
//       if (inputRef.current) inputRef.current.value = "";
//       onChange(null);
//       return;
//     }
//     onChange(file);
//   };

//   return (
//     <div className="space-y-1.5">
//       <label className="text-xs font-medium text-muted-foreground">
//         ID Proof Document (PDF or Image, max 10 MB)
//       </label>
//       <input
//         ref={inputRef}
//         type="file"
//         accept=".pdf,.jpg,.jpeg,.png"
//         onChange={handleChange}
//         className="flex h-9 w-full rounded-md border border-input bg-transparent
//                    px-3 py-1 text-sm shadow-sm
//                    file:border-0 file:bg-transparent file:text-sm file:font-medium
//                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
//                    disabled:cursor-not-allowed disabled:opacity-50"
//       />
//       {idProofDoc && (
//         <p className="text-xs text-green-600 flex items-center gap-1">
//           <FileText className="h-3 w-3" />
//           {idProofDoc.name}{" "}
//           <span className="text-muted-foreground">({(idProofDoc.size / 1024).toFixed(1)} KB)</span>
//         </p>
//       )}
//       {!idProofDoc && existing && (
//         <a
//           href={`${API_BASE}${existing}`}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="text-xs text-blue-600 underline flex items-center gap-1"
//         >
//           <FileText className="h-3 w-3" />
//           View current document
//         </a>
//       )}
//     </div>
//   );
// };

// /* ─────────────────────────────────────────────────────────────
//    PAGE
// ───────────────────────────────────────────────────────────── */
// const TenantsPage = () => {
//   const role     = getUserRole()?.toUpperCase();
//   const branchId = getBranchId();
//   const isWarden  = role === "WARDEN";
//   const isAdmin   = !isWarden;
//   const hasAccess = true;

//   /* ── Reference data ── */
//   const [rooms,    setRooms]    = useState<Room[]>([]);
//   const [beds,     setBeds]     = useState<Bed[]>([]);
//   const [branches, setBranches] = useState<Branch[]>([]);
//   const [wardenBranchName, setWardenBranchName] = useState("");

//   /* ── ALL tenants loaded for AG Grid (AG Grid handles pagination internally) ── */
//   const [tenants,       setTenants]       = useState<Tenant[]>([]);
//   const [totalElements, setTotalElements] = useState(0);
//   const [loading,       setLoading]       = useState(false);

//   /* ── Track current AG Grid page so CRUD reloads same page ── */
//   const [agCurrentPage, setAgCurrentPage] = useState(0);
//   const gridRef = useRef<AgGridReact<Tenant>>(null);

//   /* ── UI filters ── */
//   const [search,         setSearch]         = useState("");
//   const [selectedBranch, setSelectedBranch] = useState<string>(
//     isWarden ? String(branchId ?? "all") : "all"
//   );

//   /* ── Dialogs ── */
//   const [addOpen,  setAddOpen]  = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [viewOpen, setViewOpen] = useState(false);

//   const [editTenant, setEditTenant] = useState<Tenant | null>(null);
//   const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
//   const [excelFile,  setExcelFile]  = useState<File | null>(null);
//   const excelInputRef = useRef<HTMLInputElement>(null);
//   const [roomSearch, setRoomSearch] = useState("");

//   /* ── Form ── */
//   const [name,           setName]           = useState("");
//   const [phone,          setPhone]          = useState("");
//   const [email,          setEmail]          = useState("");
//   const [idProofType,    setIdProofType]    = useState<IdProofType | "">("");
//   const [idProofNumber,  setIdProofNumber]  = useState("");
//   const [roomId,         setRoomId]         = useState<number | "">("");
//   const [bedId,          setBedId]          = useState<number | "">("");
//   const [advance,        setAdvance]        = useState("");
//   const [monthlyRent,    setMonthlyRent]    = useState("");
//   const [currentReading, setCurrentReading] = useState("");
//   const [checkInDate,    setCheckInDate]    = useState("");
//   const [acJoinReading,  setAcJoinReading]  = useState("");
//   const [idProofDoc,     setIdProofDoc]     = useState<File | null>(null);

//   /* ── Derived ── */
//   const selectedRoomIsAC = useMemo(() => {
//     if (!roomId) return false;
//     return rooms.find((r) => r.id === Number(roomId))?.hostelType === "AC";
//   }, [roomId, rooms]);

//   /* ═══════════════════════════════════════════════════════════
//      LOAD TENANTS — fetch all pages for the branch so AG Grid
//      can paginate, sort, and filter natively (same pattern as
//      the Rooms page which sends all rows to AG Grid).
//   ═══════════════════════════════════════════════════════════ */
//   const loadTenants = useCallback(async (branch?: string) => {
//     setLoading(true);
//     try {
//       const activeBranch = branch ?? selectedBranch;

//       // Fetch all pages so AG Grid has the full dataset
//       const allTenants: Tenant[] = [];
//       let page = 0;
//       const size = 100;

//       while (true) {
//         const { content, totalElements: total } = await fetchTenantsPage(
//           page, size, activeBranch
//         );
//         allTenants.push(...content);
//         if (allTenants.length >= total || content.length === 0) break;
//         page++;
//       }

//       setTenants(allTenants);
//       setTotalElements(allTenants.length);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load tenants");
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedBranch]);

//   /* ═══════════════════════════════════════════════════════════
//      LOAD REFERENCE DATA — once only
//   ═══════════════════════════════════════════════════════════ */
//   const refLoaded = useRef(false);

//   useEffect(() => {
//     if (refLoaded.current) return;
//     refLoaded.current = true;

//     (async () => {
//       try {
//         const [allRooms, allBeds, allBranches] = await Promise.all([
//           fetchAllPages<Room>(fetchRooms),
//           fetchAllPages<Bed>(fetchBeds),
//           fetchAllPages<Branch>(getBranches),
//         ]);

//         let filteredRooms = allRooms;
//         let filteredBeds  = allBeds;

//         if (isWarden) {
//           filteredRooms = allRooms.filter((r) => r.unitId === branchId);
//           const roomIds  = new Set(filteredRooms.map((r) => r.id));
//           filteredBeds   = allBeds.filter((b) => roomIds.has(b.roomId));
//           const wb = allBranches.find((b) => Number(b.id) === Number(branchId));
//           setWardenBranchName(wb?.unitName ?? "Unknown Branch");
//         }

//         setRooms(filteredRooms);
//         setBeds(filteredBeds);
//         setBranches(allBranches);

//         await loadTenants(isWarden ? String(branchId) : "all");
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load reference data");
//       }
//     })();
//   }, []);

//   /* ── Reload when branch filter changes ── */
//   const branchFilterMounted = useRef(false);
//   useEffect(() => {
//     if (!branchFilterMounted.current) {
//       branchFilterMounted.current = true;
//       return;
//     }
//     loadTenants(selectedBranch);
//   }, [selectedBranch]);

//   useEffect(() => {
//     if (!selectedRoomIsAC) setAcJoinReading("");
//   }, [selectedRoomIsAC]);

//   useEffect(() => {
//     if (!editTenant) setBedId("");
//   }, [roomId, editTenant]);

//   /* ═══════════════════════════════════════════════════════════
//      HELPERS
//   ═══════════════════════════════════════════════════════════ */
//   const roomNo = (id?: number | null) =>
//     rooms.find((r) => r.id === Number(id))?.roomNumber ?? "-";

//   const bedNo = (id?: number | null) =>
//     beds.find((b) => b.id === Number(id))?.bedNumber ?? "-";

//   const branchName = (rId?: number | null) => {
//     const room = rooms.find((r) => r.id === Number(rId));
//     if (!room) return "-";
//     return branches.find((b) => b.id === room.unitId)?.unitName ?? "-";
//   };

//   const extractError = (e: any, fallback: string): string =>
//     e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

//   /* ── Client-side search filter ── */
//   const filteredTenants = useMemo(() => {
//     if (!search) return tenants;
//     return tenants.filter((t) =>
//       t.name.toLowerCase().includes(search.toLowerCase())
//     );
//   }, [tenants, search]);

//   const availableBeds = useMemo(() => {
//     return beds.filter((b) => {
//       if (b.roomId !== Number(roomId)) return false;
//       const isOccupied =
//         b.isOccupied === true ||
//         (b.isOccupied as any) === 1 ||
//         String(b.isOccupied) === "true";
//       return !isOccupied || b.id === editTenant?.bedId;
//     });
//   }, [beds, roomId, editTenant]);

//   const availableRooms = useMemo(() => {
//     return rooms.filter((r) =>
//       beds.some((b) => {
//         const isOccupied =
//           b.isOccupied === true ||
//           (b.isOccupied as any) === 1 ||
//           String(b.isOccupied) === "true";
//         return b.roomId === r.id && !isOccupied;
//       })
//     );
//   }, [rooms, beds]);

//   /* ═══════════════════════════════════════════════════════════
//      AG GRID PAGINATION — track current page for CRUD reload
//   ═══════════════════════════════════════════════════════════ */
//   const handlePaginationChanged = useCallback((event: PaginationChangedEvent) => {
//     const page = event.api.paginationGetCurrentPage();
//     setAgCurrentPage(page);
//   }, []);

//   /* After reload, restore the page the user was on */
//   const restoreAgPage = useCallback((targetPage: number) => {
//     if (!gridRef.current?.api) return;
//     gridRef.current.api.paginationGoToPage(targetPage);
//   }, []);

//   /* ═══════════════════════════════════════════════════════════
//      PRINT
//   ═══════════════════════════════════════════════════════════ */
//   const handlePrintTenant = (tenant: Tenant) => {
//     const printContent = `
//       <html><head><title>Tenant Details</title>
//       <style>
//         body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
//         h2 { text-align: center; margin-bottom: 20px; }
//         table { width: 100%; border-collapse: collapse; }
//         th, td { text-align: left; padding: 8px; border: 1px solid #ccc; }
//         th { background-color: #f4f4f4; }
//       </style></head><body>
//       <h2>Tenant Details</h2><table>
//         <tr><th>Name</th><td>${tenant.name}</td></tr>
//         <tr><th>Phone</th><td>${tenant.phone}</td></tr>
//         <tr><th>Email</th><td>${tenant.email || "-"}</td></tr>
//         <tr><th>Branch</th><td>${branchName(tenant.roomId)}</td></tr>
//         <tr><th>Room</th><td>${roomNo(tenant.roomId)}</td></tr>
//         <tr><th>Bed</th><td>${bedNo(tenant.bedId)}</td></tr>
//         <tr><th>Status</th><td>${tenant.status}</td></tr>
//         <tr><th>Check-in</th><td>${tenant.checkInDate}</td></tr>
//         <tr><th>Check-out</th><td>${tenant.checkOutDate || "-"}</td></tr>
//         <tr><th>Advance</th><td>${tenant.advance}</td></tr>
//         <tr><th>Rent</th><td>${tenant.monthlyRent}</td></tr>
//         <tr><th>Current EB Reading</th><td>${tenant.joinReading}</td></tr>
//         <tr><th>AC Current EB Reading</th><td>${tenant.acJoinReading ?? "-"}</td></tr>
//       </table></body></html>`;
//     const w = window.open("", "_blank");
//     if (!w) return;
//     w.document.write(printContent);
//     w.document.close();
//     w.focus();
//     w.print();
//   };

//   /* ═══════════════════════════════════════════════════════════
//      FORM HELPERS
//   ═══════════════════════════════════════════════════════════ */
//   const resetForm = () => {
//     setName(""); setPhone(""); setEmail("");
//     setIdProofType(""); setIdProofNumber("");
//     setRoomId(""); setBedId("");
//     setAdvance(""); setMonthlyRent("");
//     setCurrentReading(""); setAcJoinReading("");
//     setCheckInDate(""); setIdProofDoc(null);
//   };

//   const buildFormData = () => {
//     const fd = new FormData();
//     if (name)          fd.append("name", name);
//     if (phone)         fd.append("phone", phone);
//     if (email)         fd.append("email", email);
//     if (idProofType)   fd.append("idProofType", idProofType);
//     if (idProofNumber) fd.append("idProofNumber", idProofNumber);
//     if (roomId !== "") fd.append("roomId", String(roomId));
//     if (bedId  !== "") fd.append("bedId",  String(bedId));
//     fd.append("advance",     advance     || "0");
//     fd.append("monthlyRent", monthlyRent || "0");
//     fd.append("joinReading", currentReading || "0");
//     if (acJoinReading) fd.append("acJoinReading", acJoinReading);
//     if (checkInDate)   fd.append("checkInDate", checkInDate);
//     if (idProofDoc)    fd.append("idProofDocument", idProofDoc);
//     return fd;
//   };

//   /* ═══════════════════════════════════════════════════════════
//      CRUD
//   ═══════════════════════════════════════════════════════════ */
//   const handleAdd = async () => {
//     if (!name || !phone || !roomId || !bedId) {
//       toast.error("Fill required fields");
//       return;
//     }
//     try {
//       await addTenant(buildFormData());
//       toast.success("Tenant added");
//       setAddOpen(false);
//       resetForm();
//       await loadTenants();
//       // After add, go to page 0 to see the new tenant
//       restoreAgPage(0);

//       const sendHostelRulesWhatsApp = (phone: string, tenantName: string) => {
//         const message = encodeURIComponent(`Hi ${tenantName},

// 🏠 Brindhavanam Gents Hostel – Vadapalani

// 📜 Updated Hostel Rules & Regulations

// 1. Hostel Fee Payment
//    Hostel fee must be transferred only to 98848 25258.
//    🔴 Do not transfer to 98402 34475 henceforth.

// 2. Due Date & Late Fee
//    Hostel fee should be paid on or before the 5th of every month.
//    A late fee of ₹100 per week will be charged for delays.

// 3. Vacating Notice
//    Residents must give 15 days' prior notice through WhatsApp (98848 25258) before vacating.
//    Caution deposit (advance) will be returned on the last day.

// 4. Notice Period & Advance Refund Policy
//    If a 15-day notice is not given, rent will be deducted accordingly.
//    Advance amount will not be refunded in case of vacating without the notice period.

// 5. Hostel Timings
//    Entry must be before 11:00 p.m.
//    Prior intimation is mandatory for late entry.

// 6. Food Consumption Policy 🍱
//    Food is strictly not allowed inside rooms. Use terrace/dining area.

// 7. Prohibited Activities
//    Smoking and consumption of alcohol are strictly prohibited.

// 8. Responsibility Clause
//    Management is not responsible for loss of belongings or unlawful activities.

// 9. Maintenance Deduction
//    ₹1000 maintenance charge will be deducted from your advance at the time of vacating.
// `);
//         window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
//       };
//       sendHostelRulesWhatsApp(phone, name);
//     } catch (e: any) {
//       toast.error(extractError(e, "Failed to add tenant"));
//     }
//   };

//   const handleEdit = async () => {
//     if (!editTenant) return;
//     const savedPage = agCurrentPage;
//     try {
//       await updateTenant(editTenant.id, buildFormData());
//       toast.success("Tenant updated");
//       setEditOpen(false);
//       resetForm();
//       await loadTenants();
//       // Restore the page the user was on
//       setTimeout(() => restoreAgPage(savedPage), 50);
//     } catch (e: any) {
//       toast.error(extractError(e, "Update failed"));
//     }
//   };

//   const handleDeleteTenant = async (tenant: Tenant) => {
//     if (!confirm(`Delete tenant "${tenant.name}" ?`)) return;
//     const savedPage = agCurrentPage;
//     try {
//       await deleteTenant(tenant.id);
//       toast.success("Tenant deleted");
//       await loadTenants();
//       setTimeout(() => restoreAgPage(savedPage), 50);
//     } catch (e: any) {
//       toast.error(extractError(e, "Delete failed"));
//     }
//   };

//   const handleExcelImport = async () => {
//     if (!excelFile) { toast.error("Please select an Excel file first"); return; }
//     try {
//       await importTenantsExcel(excelFile);
//       toast.success("Excel imported successfully");
//       setExcelFile(null);
//       if (excelInputRef.current) excelInputRef.current.value = "";
//       await loadTenants();
//       restoreAgPage(0);
//       window.dispatchEvent(new Event("beds-updated"));
//     } catch (e: any) {
//       toast.error(extractError(e, "Excel import failed"), { duration: 8000 });
//     }
//   };

//   /* ═══════════════════════════════════════════════════════════
//      AG GRID
//   ═══════════════════════════════════════════════════════════ */
//   const columnDefs: ColDef[] = [
//     { headerName: "Name",  field: "name",  flex: 1, cellClass: "text-left" },
//     { headerName: "Phone", field: "phone", flex: 1, cellClass: "text-left" },
//     {
//       headerName: "Branch",
//       valueGetter: (p) => (p.data.roomId ? branchName(p.data.roomId) : "-"),
//       flex: 1,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Room",
//       valueGetter: (p) => (p.data.roomId ? roomNo(p.data.roomId) : "-"),
//       flex: 1,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Type",
//       valueGetter: (p) => {
//         const room = rooms.find((r) => r.id === p.data.roomId);
//         return room?.hostelType === "AC" ? "AC" : "Non-AC";
//       },
//       cellRenderer: (p: any) => (
//         <Badge variant={p.value === "AC" ? "default" : "secondary"}>{p.value}</Badge>
//       ),
//     },
//     {
//       headerName: "Status",
//       field: "status",
//       flex: 1,
//       cellRenderer: (p: any) => <Badge>{p.value}</Badge>,
//       cellClass: "text-center",
//     },
//     {
//       headerName: "Action",
//       flex: 1,
//       minWidth: 220,
//       cellRenderer: (p: any) => (
//         <div className="flex justify-center gap-2">
//           <Button size="icon" variant="ghost"
//             onClick={() => { setViewTenant(p.data); setViewOpen(true); }}>
//             <Eye className="h-4 w-4" />
//           </Button>

//           {hasAccess && (
//             <Button size="icon" variant="ghost"
//               onClick={() => {
//                 const t = p.data;
//                 setEditTenant(t);
//                 setName(t.name);
//                 setPhone(t.phone);
//                 setEmail(t.email || "");
//                 setIdProofType(t.idProofType);
//                 setIdProofNumber(t.idProofNumber || "");
//                 setRoomId(t.roomId);
//                 setBedId(t.bedId);
//                 setAdvance(String(t.advance));
//                 setMonthlyRent(String(t.monthlyRent));
//                 setCurrentReading(String(t.joinReading));
//                 setAcJoinReading(String(t.acJoinReading ?? ""));
//                 setCheckInDate(t.checkInDate);
//                 setIdProofDoc(null);
//                 setEditOpen(true);
//               }}>
//               <Pencil className="h-4 w-4" />
//             </Button>
//           )}

//           {hasAccess && (
//             <Button size="icon" variant="ghost"
//               onClick={() => handleDeleteTenant(p.data)}>
//               <Trash2 className="h-4 w-4 text-red-500" />
//             </Button>
//           )}

//           <Button size="icon" variant="ghost"
//             onClick={() => handlePrintTenant(p.data)}>
//             <span className="h-4 w-4">🖨️</span>
//           </Button>
//         </div>
//       ),
//       cellClass: "text-center",
//     },
//   ];

//   const defaultColDef: ColDef = {
//     sortable: true,
//     filter: true,
//     resizable: true,
//     minWidth: 120,
//   };

//   /* ═══════════════════════════════════════════════════════════
//      UI
//   ═══════════════════════════════════════════════════════════ */
//   return (
//     <div className="space-y-4">

//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">Tenants</h1>

//         {hasAccess && (
//           <div className="flex gap-2 items-center">
//             <Input
//               ref={excelInputRef}
//               type="file"
//               accept=".xlsx,.xls"
//               className="w-44"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (!file) return;
//                 if (file.size > MAX_FILE_SIZE) {
//                   toast.error("File size must be below 10 MB");
//                   e.target.value = "";
//                   return;
//                 }
//                 setExcelFile(file);
//               }}
//             />
//             <Button variant="outline" size="sm" onClick={handleExcelImport}>
//               Import Excel
//             </Button>

//             {/* ADD / CHECK-IN DIALOG */}
//             <Dialog open={addOpen} onOpenChange={(open) => {
//               setAddOpen(open);
//               if (!open) { resetForm(); setRoomSearch(""); }
//             }}>
//               <DialogTrigger asChild>
//                 <Button size="sm">
//                   <UserPlus className="mr-2 h-4 w-4" />
//                   Check-In
//                 </Button>
//               </DialogTrigger>

//               <DialogContent className="max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                   <DialogTitle>Add Tenant</DialogTitle>
//                   <DialogDescription>
//                     Enter tenant details and assign an available room and bed.
//                   </DialogDescription>
//                 </DialogHeader>

//                 <div className="grid gap-3">
//                   <Input placeholder="Name"  value={name}  onChange={(e) => setName(e.target.value)} />
//                   <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
//                   <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

//                   <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
//                     <SelectTrigger><SelectValue placeholder="ID Proof Type" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="AADHAR">AADHAR</SelectItem>
//                       <SelectItem value="PAN">PAN</SelectItem>
//                       <SelectItem value="VOTER_ID">VOTER_ID</SelectItem>
//                       <SelectItem value="DRIVING_LICENSE">DRIVING_LICENSE</SelectItem>
//                       <SelectItem value="PASSPORT">PASSPORT</SelectItem>
//                     </SelectContent>
//                   </Select>

//                   <Input placeholder="ID Proof Number" value={idProofNumber}
//                     onChange={(e) => setIdProofNumber(e.target.value)} />

//                   <IdProofUploadField idProofDoc={idProofDoc} onChange={setIdProofDoc} />

//                   <Select value={roomId ? String(roomId) : ""}
//                     onValueChange={(v) => { setRoomId(Number(v)); setRoomSearch(""); }}>
//                     <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
//                     <SelectContent>
//                       <div className="px-2 py-1.5 sticky top-0 bg-background z-10">
//                         <Input placeholder="Search room..." value={roomSearch}
//                           onChange={(e) => setRoomSearch(e.target.value)}
//                           onKeyDown={(e) => e.stopPropagation()}
//                           className="h-8 text-sm" autoFocus />
//                       </div>
//                       {availableRooms
//                         .filter((r) => r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
//                         .map((r) => (
//                           <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                         ))}
//                       {availableRooms.filter((r) =>
//                         r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase())
//                       ).length === 0 && (
//                         <div className="px-3 py-2 text-sm text-muted-foreground">No room found</div>
//                       )}
//                     </SelectContent>
//                   </Select>

//                   <Select value={bedId ? String(bedId) : ""}
//                     onValueChange={(v) => setBedId(Number(v))}>
//                     <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
//                     <SelectContent>
//                       {availableBeds.map((b) => (
//                         <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>

//                   <Input type="number" placeholder="Advance"            value={advance}        onChange={(e) => setAdvance(e.target.value)} />
//                   <Input type="number" placeholder="Rent"               value={monthlyRent}    onChange={(e) => setMonthlyRent(e.target.value)} />
//                   <Input type="number" placeholder="Current EB Reading" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} />

//                   {selectedRoomIsAC && (
//                     <div className="space-y-1.5">
//                       <label className="text-xs font-medium text-muted-foreground">
//                         AC Current Reading (optional)
//                       </label>
//                       <Input type="number" placeholder="AC Current Reading"
//                         value={acJoinReading} onChange={(e) => setAcJoinReading(e.target.value)} />
//                     </div>
//                   )}

//                   <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
//                 </div>

//                 <DialogFooter>
//                   <DialogClose asChild>
//                     <Button variant="outline">Cancel</Button>
//                   </DialogClose>
//                   <Button onClick={handleAdd}>Check-In</Button>
//                 </DialogFooter>
//               </DialogContent>
//             </Dialog>
//           </div>
//         )}
//       </div>

//       {/* BRANCH FILTER */}
//       <div className="w-60">
//         {isAdmin ? (
//           <Select value={selectedBranch} onValueChange={setSelectedBranch}>
//             <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All</SelectItem>
//               {branches.map((b) => (
//                 <SelectItem key={b.id} value={String(b.id)}>{b.unitName}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         ) : (
//           <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
//             <span className="text-foreground font-semibold">{wardenBranchName}</span>
//           </div>
//         )}
//       </div>

//       {/* SEARCH */}
//       <div className="relative">
//         <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
//         <Input className="pl-9" placeholder="Search tenants..."
//           value={search} onChange={(e) => setSearch(e.target.value)} />
//       </div>

//       {/* GRID — AG Grid handles pagination natively (same as Rooms page) */}
//       <div className="ag-theme-alpine" style={{ height: 513 }}>
//         <AgGridReact<Tenant>
//           ref={gridRef}
//           rowData={filteredTenants}
//           columnDefs={columnDefs}
//           defaultColDef={defaultColDef}
//           /* ── AG Grid built-in pagination ── */
//           pagination={true}
//           paginationPageSize={PAGE_SIZE}
//           paginationPageSizeSelector={[10, 20, 50, 100]}
//           /* ── track current page for CRUD restore ── */
//           onPaginationChanged={handlePaginationChanged}
//           /* ── loading overlay ── */
//           overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading…</span>'
//           loading={loading}
//         />
//       </div>

//       {/* EDIT TENANT DIALOG */}
//       <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
//         <DialogContent className="max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Edit Tenant</DialogTitle>
//             <DialogDescription>Update tenant information and save your changes.</DialogDescription>
//           </DialogHeader>

//           <div className="grid gap-3">
//             <Input placeholder="Name"  value={name}  onChange={(e) => setName(e.target.value)} />
//             <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
//             <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

//             <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
//               <SelectTrigger><SelectValue /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="AADHAR">AADHAR</SelectItem>
//                 <SelectItem value="PAN">PAN</SelectItem>
//                 <SelectItem value="VOTER_ID">VOTER_ID</SelectItem>
//                 <SelectItem value="DRIVING_LICENSE">DRIVING_LICENSE</SelectItem>
//                 <SelectItem value="PASSPORT">PASSPORT</SelectItem>
//               </SelectContent>
//             </Select>

//             <Input placeholder="ID Proof Number" value={idProofNumber}
//               onChange={(e) => setIdProofNumber(e.target.value)} />

//             <IdProofUploadField
//               idProofDoc={idProofDoc}
//               existing={editTenant?.idProofDocument}
//               onChange={setIdProofDoc}
//             />

//             <Select value={roomId ? String(roomId) : ""}
//               onValueChange={(v) => setRoomId(Number(v))}>
//               <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
//               <SelectContent>
//                 {rooms
//                   .filter((r) =>
//                     beds.some((b) => b.roomId === r.id && !b.isOccupied) ||
//                     r.id === editTenant?.roomId
//                   )
//                   .map((r) => (
//                     <SelectItem key={r.id} value={String(r.id)}>{r.roomNumber}</SelectItem>
//                   ))}
//               </SelectContent>
//             </Select>

//             <Select value={bedId ? String(bedId) : ""}
//               onValueChange={(v) => setBedId(Number(v))}>
//               <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
//               <SelectContent>
//                 {availableBeds.map((b) => (
//                   <SelectItem key={b.id} value={String(b.id)}>Bed {b.bedNumber}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>

//             <Input type="number" placeholder="Advance"            value={advance}        onChange={(e) => setAdvance(e.target.value)} />
//             <Input type="number" placeholder="Rent"               value={monthlyRent}    onChange={(e) => setMonthlyRent(e.target.value)} />
//             <Input type="number" placeholder="Current EB Reading" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} />

//             {selectedRoomIsAC && (
//               <div className="space-y-1.5">
//                 <label className="text-xs font-medium text-muted-foreground">
//                   AC Current Reading (optional)
//                 </label>
//                 <Input type="number" placeholder="AC Current Reading"
//                   value={acJoinReading} onChange={(e) => setAcJoinReading(e.target.value)} />
//               </div>
//             )}

//             <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
//             <Button onClick={handleEdit}>Update Tenant</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* VIEW TENANT DIALOG */}
//       <Dialog open={viewOpen} onOpenChange={setViewOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Tenant Details</DialogTitle>
//             <DialogDescription>View complete information about this tenant.</DialogDescription>
//           </DialogHeader>

//           {viewTenant && (
//             <div className="grid gap-2 text-sm">
//               <p>Name: {viewTenant.name}</p>
//               <p>Phone: {viewTenant.phone}</p>
//               <p>Email: {viewTenant.email}</p>
//               <p>Identity Proof: {viewTenant.idProofType}</p>
//               <p>ID Number: {viewTenant.idProofNumber}</p>

//               {viewTenant.idProofDocument ? (
//                 <p className="flex items-center gap-1">
//                   ID Document:{" "}
//                   <a href={`${API_BASE}${viewTenant.idProofDocument}`}
//                     target="_blank" rel="noopener noreferrer"
//                     className="text-blue-600 underline flex items-center gap-1">
//                     <FileText className="h-3 w-3" />
//                     View / Download
//                   </a>
//                 </p>
//               ) : (
//                 <p className="text-muted-foreground text-xs">No ID document uploaded</p>
//               )}

//               <p>Branch: {branchName(viewTenant.roomId)}</p>
//               <p>Room: {roomNo(viewTenant.roomId)}</p>
//               <p>Bed: {bedNo(viewTenant.bedId)}</p>
//               <p>Status: {viewTenant.status}</p>
//               <p>Check-in: {viewTenant.checkInDate}</p>
//               <p>Check-out: {viewTenant.checkOutDate ?? "-"}</p>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//     </div>
//   );
// };

// export default TenantsPage;



















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
const API_BASE      = "http://localhost:8080";
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