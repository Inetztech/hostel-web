// import api from "./api";
// import {
//   Room,
//   Bed,
//   EBReading,
//   Rent,
//   Tenant,
//   Flat,
//   FlatRequest,
//   Role,
//   PaymentMode,
//   TenantEBBill,
//   Branch,
//   BranchRequest,
//   TenantRequest,
//   LoginResponse,
//   User,
//   Complaint,
//   ComplaintStatus,
//   FoodTimetable,
//   FoodTimetableRequest,
//   Announcement,
//   AnnouncementRequest,
// } from "./types";

// /* =====================================================
//    AUTH
// ===================================================== */
// export const loginUser = async (
//   email: string,
//   password: string
// ): Promise<LoginResponse> => {
//   const res = await api.post("/auth/login", { email, password });
//   return res.data.data;
// };

// export const getUserRole = (): Role => {
//   const role = sessionStorage.getItem("role");
//   if (role === "ADMIN" || role === "WARDEN" || role === "TENANT") return role;
//   return "WARDEN";
// };

// const assertAccess = () => {
//   const role = getUserRole();
//   if (role !== "ADMIN" && role !== "WARDEN" && role !== "TENANT") {
//     throw new Error("Access denied");
//   }
// };

// /* =====================================================
//    JWT EXPIRY HELPER
// ===================================================== */
// export const isTokenExpired = (token?: string): boolean => {
//   if (!token) return true;
//   try {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     return Date.now() >= payload.exp * 1000;
//   } catch {
//     return true;
//   }
// };

// /* =====================================================
//    ROOMS
// ===================================================== */
// export const fetchRooms = async (page = 0, size = 10) => {
//   const res = await api.get("/rooms", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getRooms = fetchRooms;

// export const createRoom = async (data: {
//   roomNumber: string;
//   hostelType: string;
//   totalBeds: number;
//   rentPerBed: number;
//   unitId: number;
//   flatId?: number | null;
// }): Promise<Room> => {
//   assertAccess();
//   const res = await api.post("/rooms", data);
//   return res.data.data;
// };

// export const editRoom = async (roomId: number, data: Partial<Room>): Promise<Room> => {
//   assertAccess();
//   const res = await api.put(`/rooms/${roomId}`, data);
//   return res.data.data;
// };

// export const removeRoom = async (roomId: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/rooms/${roomId}`);
// };

// /* =====================================================
//    BEDS
// ===================================================== */
// export const fetchBeds = async (page = 0, size = 10) => {
//   const res = await api.get("/beds", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getBeds = fetchBeds;

// export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> => {
//   assertAccess();
//   const res = await api.put(`/beds/${bedId}`, { occupied: isOccupied });
//   return res.data.data;
// };

// /* =====================================================
//    TENANTS
// ===================================================== */
// export const fetchTenants = async (page = 0, size = 10): Promise<Tenant[]> => {
//   const res = await api.get("/tenants", { params: { page, size } });
//   return res.data?.data?.content ?? [];
// };
// export const getTenants = fetchTenants;

// export const getActiveTenants = async (page = 0, size = 10): Promise<Tenant[]> => {
//   const tenants = await fetchTenants(page, size);
//   return tenants.filter(t => t.status === "Active");
// };

// export const getActiveTenantsByRoom = async (roomId: number): Promise<Tenant[]> =>
//   (await getActiveTenants()).filter(t => Number(t.roomId) === Number(roomId));

// export const addTenant = async (data: TenantRequest | FormData): Promise<Tenant> => {
//   assertAccess();
//   const res = await api.post("/tenants", data);
//   return res.data.data;
// };

// export const importTenantsExcel = async (file: File): Promise<string> => {
//   assertAccess();
//   const formData = new FormData();
//   formData.append("file", file);
//   const res = await api.post("/tenants/import", formData);
//   return res.data.data;
// };

// export const deleteTenant = async (tenantId: number | string): Promise<void> => {
//   assertAccess();
//   if (!tenantId) throw new Error("Invalid tenant ID");
//   await api.delete(`/tenants/${tenantId}`);
// };

// export const checkoutTenant = async (
//   tenantId: number,
//   currentReading?: number | null,
//   acFinalReading?: number | null
// ): Promise<Tenant> => {
//   assertAccess();
//   const res = await api.put(`/tenants/${tenantId}/checkout`, {
//     finalReading:   currentReading ?? null,
//     acFinalReading: acFinalReading ?? null,
//   });
//   return res.data.data;
// };

// export const updateTenant = async (
//   tenantId: number | string,
//   data: TenantRequest | FormData
// ): Promise<Tenant> => {
//   const res = await api.put(`/tenants/${tenantId}`, data);
//   return res.data.data;
// };

// /* =====================================================
//    EB READINGS
// ===================================================== */
// export const fetchEBReadings = async (page = 0, size = 10): Promise<EBReading[]> => {
//   const res = await api.get("/eb-readings", { params: { page, size } });
//   return res.data?.data?.content ?? [];
// };
// export const getEBReadings = fetchEBReadings;

// export const addEBReading = async (data: EBReading): Promise<EBReading> => {
//   assertAccess();
//   const res = await api.post("/eb-readings", data);
//   return res.data.data;
// };

// export const updateEBReading = async (
//   ebReadingId: string,
//   data: Partial<EBReading>
// ): Promise<EBReading> => {
//   assertAccess();
//   const res = await api.put(`/eb-readings/${ebReadingId}`, data);
//   return res.data.data;
// };

// export const deleteEBReading = async (ebReadingId: string): Promise<void> => {
//   assertAccess();
//   await api.delete(`/eb-readings/${ebReadingId}`);
// };

// /* =====================================================
//    RENTS
// ===================================================== */
// export const fetchRents = async (page = 0, size = 10): Promise<Rent[]> => {
//   const res = await api.get("/rents", { params: { page, size } });
//   return res.data?.data?.content ?? [];
// };
// export const getRents = fetchRents;

// export const generateRent = async (data: {
//   tenantId: string;
//   roomId: string;
//   rentMonth: number;
//   rentYear: number;
//   rentAmount: number;
//   ebAmount: number;
// }): Promise<Rent> => {
//   assertAccess();
//   const res = await api.post("/rents/generate", data);
//   return res.data.data;
// };

// export const recordRentPayment = async (
//   rentId: string | number,
//   paymentMode: PaymentMode,
//   paymentStatus: "PENDING" | "PAID" | "PARTIAL"
// ): Promise<Rent> => {
//   assertAccess();
//   const res = await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus });
//   return res.data.data;
// };

// export const deleteRent = async (rentId: string): Promise<void> => {
//   assertAccess();
//   await api.delete(`/rents/${rentId}`);
// };

// /* =====================================================
//    TENANT-WISE EB BILL
// ===================================================== */
// export const getTenantWiseEBBill = async ({
//   roomId,
//   flatId,
// }: {
//   roomId?: number | null;
//   flatId?: number | null;
// }): Promise<TenantEBBill[]> => {
//   let url = "";
//   if (roomId) {
//     url = `/eb-readings/tenant-wise-bill/room?roomId=${roomId}`;
//   } else if (flatId) {
//     url = `/eb-readings/tenant-wise-bill/flat?flatId=${flatId}`;
//   } else {
//     throw new Error("roomId or flatId required");
//   }
//   const res = await api.get(url);
//   return res.data?.data ?? [];
// };

// /* =====================================================
//    RECORD PAYMENT
// ===================================================== */
// export const recordPayment = async (
//   rentId: string | number,
//   paymentMode: string,
//   amount: number,
//   transactionId?: string
// ) => {
//   const { data } = await api.put(`/rents/${rentId}/payment`, {
//     paymentMode,
//     amount,
//     transactionId,
//   });
//   return data;
// };

// /* =====================================================
//    CHECKOUT SUMMARY
// ===================================================== */
// export const getCheckoutSummary = async (tenantId: string | number) => {
//   const id = Number(tenantId);
//   const tenants = await getTenants();
//   const tenant = tenants.find(t => Number(t.id) === id);
//   if (!tenant) return null;

//   const res = await api.get(`/rents/tenant/${id}`);
//   const rents: Rent[] = res.data?.data ?? [];

//   const pendingRents = rents.filter(r => r.paymentStatus !== "PAID");
//   const totalRentDue = pendingRents.reduce((sum, r) => sum + (r.rentAmount ?? 0), 0);
//   const advancePaid  = tenant.advance ?? 0;

//   return { tenant, pendingRents, totalRentDue, advancePaid };
// };

// /* =====================================================
//    BRANCHES / UNITS
// ===================================================== */
// export const fetchBranches = async (page = 0, size = 10) => {
//   const res = await api.get("/units", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getBranches = fetchBranches;

// export const createBranch = async (data: BranchRequest): Promise<Branch> => {
//   assertAccess();
//   const res = await api.post("/units", data);
//   return res.data.data ?? res.data;
// };

// export const getBranchId = (): number | null => {
//   const id = sessionStorage.getItem("branchId");
//   if (!id) return null;
//   return Number(id);
// };

// export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> => {
//   assertAccess();
//   const res = await api.put(`/units/${id}`, data);
//   return res.data.data ?? res.data;
// };

// export const deleteBranch = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/units/${id}`);
// };

// /* =====================================================
//    WHATSAPP EB BILL
// ===================================================== */
// export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
//   assertAccess();
//   if (!roomNumber) throw new Error("Room number is required");
//   const res = await api.post("/whatsapp/send-eb-bill", { roomNumber });
//   return res.data.data;
// };

// /* =====================================================
//    DASHBOARD
// ===================================================== */
// export const getDashboard = async () => {
//   const res = await api.get("/dashboard");
//   return res.data.data;
// };

// /* =====================================================
//    USERS
// ===================================================== */
// export const registerUser = async (data: {
//   email: string;
//   password: string;
//   role: Role;
//   branchId: number;
// }) => {
//   const res = await api.post("/register", data);
//   return res.data;
// };

// export const getUsers = async (page = 0, size = 10) => {
//   const res = await api.get("/users", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.data ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };

// export const getUserById = async (id: number): Promise<User> => {
//   const res = await api.get(`/users/${id}`);
//   return res.data.data;
// };

// export const updateUser = async (
//   id: number,
//   data: {
//     email: string;
//     password?: string;
//     role: string;
//     branchId: number | null;
//   }
// ): Promise<User> => {
//   assertAccess();
//   const res = await api.put(`/users/${id}`, data);
//   return res.data.data;
// };

// export const deleteUser = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/users/${id}`);
// };

// /* =====================================================
//    COMPLAINTS
// ===================================================== */
// export const createComplaint = async (data: {
//   subject: string;
//   description: string;
// }): Promise<Complaint> => {
//   const role = getUserRole();
//   if (role !== "TENANT") throw new Error("Only tenants can create complaints");
//   const res = await api.post("/complaints", data);
//   return res.data?.data;
// };

// export const getMyComplaints = async (): Promise<Complaint[]> => {
//   const role = getUserRole();
//   if (role !== "TENANT") throw new Error("Access denied");
//   const res = await api.get("/complaints/my");
//   return res.data ?? [];
// };

// export const getAllComplaints = async (): Promise<Complaint[]> => {
//   const res = await api.get("/complaints");
//   return res.data ?? [];
// };

// export const updateComplaintStatus = async (
//   id: number,
//   status: ComplaintStatus
// ): Promise<Complaint> => {
//   const res = await api.put(`/complaints/${id}/status`, null, { params: { status } });
//   return res.data?.data;
// };

// /* =====================================================
//    FLATS
// ===================================================== */
// export const fetchFlats = async (page = 0, size = 10) => {
//   const res = await api.get("/flats", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getFlats = fetchFlats;

// export const fetchFlatsByBranch = async (
//   branchId: number,
//   page = 0,
//   size = 10
// ): Promise<Flat[]> => {
//   const res = await api.get(`/flats/branch/${branchId}`, { params: { page, size } });
//   return res.data?.data?.content ?? [];
// };
// export const getFlatsByBranch = fetchFlatsByBranch;

// export const createFlat = async (data: FlatRequest): Promise<Flat> => {
//   assertAccess();
//   const res = await api.post("/flats", data);
//   return res.data.data;
// };

// export const updateFlat = async (id: number, data: FlatRequest): Promise<Flat> => {
//   assertAccess();
//   const res = await api.put(`/flats/${id}`, data);
//   return res.data.data;
// };

// export const deleteFlat = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/flats/${id}`);
// };

// export const deleteEBReadingsByFlat = async (flatId: number): Promise<void> => {
//   assertAccess();
//   await api.delete("/eb-readings/by-flat", { params: { flatId } });
// };

// export const deleteEBReadingsByRoom = async (roomId: number): Promise<void> => {
//   assertAccess();
//   await api.delete("/eb-readings/by-room", { params: { roomId } });
// };

// /* =====================================================
//    FOOD TIMETABLE
// ===================================================== */
// export const fetchFoodSchedules = async (): Promise<FoodTimetable[]> => {
//   const res = await api.get("/food-timetable");
//   return res.data?.data ?? [];
// };
// export const getFoodSchedules = fetchFoodSchedules;

// export const createFoodSchedule = async (
//   data: FoodTimetableRequest
// ): Promise<FoodTimetable> => {
//   assertAccess();
//   const res = await api.post("/food-timetable", data);
//   return res.data.data;
// };

// export const getFoodScheduleById = async (id: number): Promise<FoodTimetable> => {
//   const res = await api.get(`/food-timetable/${id}`);
//   return res.data.data;
// };

// export const updateFoodSchedule = async (
//   id: number,
//   data: FoodTimetableRequest
// ): Promise<FoodTimetable> => {
//   assertAccess();
//   const res = await api.put(`/food-timetable/${id}`, data);
//   return res.data.data;
// };

// export const deleteFoodSchedule = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/food-timetable/${id}`);
// };

// /* =====================================================
//    ANNOUNCEMENTS
// ===================================================== */
// export const fetchAnnouncements = async (): Promise<Announcement[]> => {
//   const res = await api.get("/announcements");
//   return res.data?.data ?? [];
// };
// export const getAnnouncements = fetchAnnouncements;

// export const createAnnouncement = async (
//   data: AnnouncementRequest
// ): Promise<Announcement> => {
//   assertAccess();
//   const res = await api.post("/announcements", data);
//   return res.data.data;
// };

// export const getAnnouncementById = async (id: number): Promise<Announcement> => {
//   const res = await api.get(`/announcements/${id}`);
//   return res.data.data;
// };

// export const deleteAnnouncement = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/announcements/${id}`);
// };

// export const shareAnnouncementWhatsApp = async (id: number) => {
//   const res = await api.post(`/announcements/${id}/share-whatsapp`);
//   return res.data.data;
// };

// export const updateAnnouncement = async (
//   id: number,
//   data: AnnouncementRequest
// ): Promise<Announcement> => {
//   assertAccess();
//   const res = await api.put(`/announcements/${id}`, data);
//   return res.data.data;
// };






























































// import api from "./api";
// import {
//   Room,
//   Bed,
//   EBReading,
//   Rent,
//   Tenant,
//   Flat,
//   FlatRequest,
//   Role,
//   PaymentMode,
//   TenantEBBill,
//   Branch,
//   BranchRequest,
//   TenantRequest,
//   LoginResponse,
//   User,
//   Complaint,
//   ComplaintStatus,
//   FoodTimetable,
//   FoodTimetableRequest,
//   Announcement,
//   AnnouncementRequest,
// } from "./types";

// /* =====================================================
//    FETCH ALL PAGES HELPER
// ===================================================== */
// export async function fetchAllPages<T>(
//   fetcher: (page: number, size: number) => Promise<{ content: T[]; totalElements: number }>,
//   pageSize = 10
// ): Promise<T[]> {
//   const first = await fetcher(0, pageSize);
//   const all: T[] = [...first.content];
//   const total = first.totalElements;

//   if (total <= pageSize) return all;

//   const totalPages = Math.ceil(total / pageSize);
//   const remaining = await Promise.all(
//     Array.from({ length: totalPages - 1 }, (_, i) => fetcher(i + 1, pageSize))
//   );
//   remaining.forEach(r => all.push(...r.content));
//   return all;
// }

// /* =====================================================
//    AUTH
// ===================================================== */
// export const loginUser = async (
//   email: string,
//   password: string
// ): Promise<LoginResponse> => {
//   const res = await api.post("/auth/login", { email, password });
//   return res.data.data;
// };

// export const getUserRole = (): Role => {
//   const role = sessionStorage.getItem("role");
//   if (role === "ADMIN" || role === "WARDEN" || role === "TENANT") return role;
//   return "WARDEN";
// };

// const assertAccess = () => {
//   const role = getUserRole();
//   if (role !== "ADMIN" && role !== "WARDEN" && role !== "TENANT") {
//     throw new Error("Access denied");
//   }
// };

// /* =====================================================
//    JWT EXPIRY HELPER
// ===================================================== */
// export const isTokenExpired = (token?: string): boolean => {
//   if (!token) return true;
//   try {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     return Date.now() >= payload.exp * 1000;
//   } catch {
//     return true;
//   }
// };

// /* =====================================================
//    ROOMS
// ===================================================== */
// export const fetchRooms = async (page = 0, size = 10) => {
//   const res = await api.get("/rooms", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getRooms = fetchRooms;

// export const createRoom = async (data: {
//   roomNumber: string;
//   hostelType: string;
//   totalBeds: number;
//   rentPerBed: number;
//   unitId: number;
//   flatId?: number | null;
// }): Promise<Room> => {
//   assertAccess();
//   const res = await api.post("/rooms", data);
//   return res.data.data;
// };

// export const editRoom = async (roomId: number, data: Partial<Room>): Promise<Room> => {
//   assertAccess();
//   const res = await api.put(`/rooms/${roomId}`, data);
//   return res.data.data;
// };

// export const removeRoom = async (roomId: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/rooms/${roomId}`);
// };

// /* =====================================================
//    BEDS
// ===================================================== */
// export const fetchBeds = async (page = 0, size = 10) => {
//   const res = await api.get("/beds", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getBeds = fetchBeds;

// export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> => {
//   assertAccess();
//   const res = await api.put(`/beds/${bedId}`, { occupied: isOccupied });
//   return res.data.data;
// };

// /* =====================================================
//    TENANTS  ← now returns paginated shape
// ===================================================== */
// export const fetchTenants = async (page = 0, size = 10) => {
//   const res = await api.get("/tenants", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getTenants = fetchTenants;

// export const getActiveTenants = async (page = 0, size = 10): Promise<Tenant[]> => {
//   const res = await fetchTenants(page, size);
//   return res.content.filter((t: Tenant) => t.status === "Active");
// };

// export const getActiveTenantsByRoom = async (roomId: number): Promise<Tenant[]> =>
//   (await getActiveTenants()).filter(t => Number(t.roomId) === Number(roomId));

// export const addTenant = async (data: TenantRequest | FormData): Promise<Tenant> => {
//   assertAccess();
//   const res = await api.post("/tenants", data);
//   return res.data.data;
// };

// export const importTenantsExcel = async (file: File): Promise<string> => {
//   assertAccess();
//   const formData = new FormData();
//   formData.append("file", file);
//   const res = await api.post("/tenants/import", formData);
//   return res.data.data;
// };

// export const deleteTenant = async (tenantId: number | string): Promise<void> => {
//   assertAccess();
//   if (!tenantId) throw new Error("Invalid tenant ID");
//   await api.delete(`/tenants/${tenantId}`);
// };

// export const checkoutTenant = async (
//   tenantId: number,
//   currentReading?: number | null,
//   acFinalReading?: number | null
// ): Promise<Tenant> => {
//   assertAccess();
//   const res = await api.put(`/tenants/${tenantId}/checkout`, {
//     finalReading:   currentReading ?? null,
//     acFinalReading: acFinalReading ?? null,
//   });
//   return res.data.data;
// };

// export const updateTenant = async (
//   tenantId: number | string,
//   data: TenantRequest | FormData
// ): Promise<Tenant> => {
//   const res = await api.put(`/tenants/${tenantId}`, data);
//   return res.data.data;
// };

// /* =====================================================
//    EB READINGS  ← now returns paginated shape
// ===================================================== */
// export const fetchEBReadings = async (page = 0, size = 10) => {
//   const res = await api.get("/eb-readings", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getEBReadings = fetchEBReadings;

// export const addEBReading = async (data: EBReading): Promise<EBReading> => {
//   assertAccess();
//   const res = await api.post("/eb-readings", data);
//   return res.data.data;
// };

// export const updateEBReading = async (
//   ebReadingId: string,
//   data: Partial<EBReading>
// ): Promise<EBReading> => {
//   assertAccess();
//   const res = await api.put(`/eb-readings/${ebReadingId}`, data);
//   return res.data.data;
// };

// export const deleteEBReading = async (ebReadingId: string): Promise<void> => {
//   assertAccess();
//   await api.delete(`/eb-readings/${ebReadingId}`);
// };

// /* =====================================================
//    RENTS
// ===================================================== */
// export const fetchRents = async (page = 0, size = 10) => {
//   const res = await api.get("/rents", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getRents = fetchRents;

// export const generateRent = async (data: {
//   tenantId: string;
//   roomId: string;
//   rentMonth: number;
//   rentYear: number;
//   rentAmount: number;
//   ebAmount: number;
// }): Promise<Rent> => {
//   assertAccess();
//   const res = await api.post("/rents/generate", data);
//   return res.data.data;
// };

// export const recordRentPayment = async (
//   rentId: string | number,
//   paymentMode: PaymentMode,
//   paymentStatus: "PENDING" | "PAID" | "PARTIAL"
// ): Promise<Rent> => {
//   assertAccess();
//   const res = await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus });
//   return res.data.data;
// };

// export const deleteRent = async (rentId: string): Promise<void> => {
//   assertAccess();
//   await api.delete(`/rents/${rentId}`);
// };

// /* =====================================================
//    TENANT-WISE EB BILL
// ===================================================== */
// export const getTenantWiseEBBill = async ({
//   roomId,
//   flatId,
// }: {
//   roomId?: number | null;
//   flatId?: number | null;
// }): Promise<TenantEBBill[]> => {
//   let url = "";
//   if (roomId) {
//     url = `/eb-readings/tenant-wise-bill/room?roomId=${roomId}`;
//   } else if (flatId) {
//     url = `/eb-readings/tenant-wise-bill/flat?flatId=${flatId}`;
//   } else {
//     throw new Error("roomId or flatId required");
//   }
//   const res = await api.get(url);
//   return res.data?.data ?? [];
// };

// /* =====================================================
//    RECORD PAYMENT
// ===================================================== */
// export const recordPayment = async (
//   rentId: string | number,
//   paymentMode: string,
//   amount: number,
//   transactionId?: string
// ) => {
//   const { data } = await api.put(`/rents/${rentId}/payment`, {
//     paymentMode,
//     amount,
//     transactionId,
//   });
//   return data;
// };

// /* =====================================================
//    CHECKOUT SUMMARY
// ===================================================== */
// export const getCheckoutSummary = async (tenantId: string | number) => {
//   const id = Number(tenantId);
//   const res0 = await fetchTenants(0, 500);
//   const tenant = res0.content.find((t: Tenant) => Number(t.id) === id);
//   if (!tenant) return null;

//   const res = await api.get(`/rents/tenant/${id}`);
//   const rents: Rent[] = res.data?.data ?? [];

//   const pendingRents = rents.filter(r => r.paymentStatus !== "PAID");
//   const totalRentDue = pendingRents.reduce((sum, r) => sum + (r.rentAmount ?? 0), 0);
//   const advancePaid  = tenant.advance ?? 0;

//   return { tenant, pendingRents, totalRentDue, advancePaid };
// };

// /* =====================================================
//    BRANCHES / UNITS
// ===================================================== */
// export const fetchBranches = async (page = 0, size = 10) => {
//   const res = await api.get("/units", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getBranches = fetchBranches;

// export const createBranch = async (data: BranchRequest): Promise<Branch> => {
//   assertAccess();
//   const res = await api.post("/units", data);
//   return res.data.data ?? res.data;
// };

// export const getBranchId = (): number | null => {
//   const id = sessionStorage.getItem("branchId");
//   if (!id) return null;
//   return Number(id);
// };

// export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> => {
//   assertAccess();
//   const res = await api.put(`/units/${id}`, data);
//   return res.data.data ?? res.data;
// };

// export const deleteBranch = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/units/${id}`);
// };

// /* =====================================================
//    WHATSAPP EB BILL
// ===================================================== */
// export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
//   assertAccess();
//   if (!roomNumber) throw new Error("Room number is required");
//   const res = await api.post("/whatsapp/send-eb-bill", { roomNumber });
//   return res.data.data;
// };

// /* =====================================================
//    DASHBOARD
// ===================================================== */
// export const getDashboard = async () => {
//   const res = await api.get("/dashboard");
//   return res.data.data;
// };

// /* =====================================================
//    USERS
// ===================================================== */
// export const registerUser = async (data: {
//   email: string;
//   password: string;
//   role: Role;
//   branchId: number;
// }) => {
//   const res = await api.post("/register", data);
//   return res.data;
// };

// export const getUsers = async (page = 0, size = 10) => {
//   const res = await api.get("/users", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.data ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };

// export const getUserById = async (id: number): Promise<User> => {
//   const res = await api.get(`/users/${id}`);
//   return res.data.data;
// };

// export const updateUser = async (
//   id: number,
//   data: {
//     email: string;
//     password?: string;
//     role: string;
//     branchId: number | null;
//   }
// ): Promise<User> => {
//   assertAccess();
//   const res = await api.put(`/users/${id}`, data);
//   return res.data.data;
// };

// export const deleteUser = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/users/${id}`);
// };

// /* =====================================================
//    COMPLAINTS
// ===================================================== */
// export const createComplaint = async (data: {
//   subject: string;
//   description: string;
// }): Promise<Complaint> => {
//   const role = getUserRole();
//   if (role !== "TENANT") throw new Error("Only tenants can create complaints");
//   const res = await api.post("/complaints", data);
//   return res.data?.data;
// };

// export const getMyComplaints = async (): Promise<Complaint[]> => {
//   const role = getUserRole();
//   if (role !== "TENANT") throw new Error("Access denied");
//   const res = await api.get("/complaints/my");
//   return res.data ?? [];
// };

// export const getAllComplaints = async (): Promise<Complaint[]> => {
//   const res = await api.get("/complaints");
//   return res.data ?? [];
// };

// export const updateComplaintStatus = async (
//   id: number,
//   status: ComplaintStatus
// ): Promise<Complaint> => {
//   const res = await api.put(`/complaints/${id}/status`, null, { params: { status } });
//   return res.data?.data;
// };

// /* =====================================================
//    FLATS
// ===================================================== */
// export const fetchFlats = async (page = 0, size = 10) => {
//   const res = await api.get("/flats", { params: { page, size } });
//   return {
//     content:       res.data?.data?.content ?? res.data?.content ?? [],
//     totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//   };
// };
// export const getFlats = fetchFlats;

// export const fetchFlatsByBranch = async (
//   branchId: number,
//   page = 0,
//   size = 10
// ): Promise<Flat[]> => {
//   const res = await api.get(`/flats/branch/${branchId}`, { params: { page, size } });
//   return res.data?.data?.content ?? [];
// };
// export const getFlatsByBranch = fetchFlatsByBranch;

// export const createFlat = async (data: FlatRequest): Promise<Flat> => {
//   assertAccess();
//   const res = await api.post("/flats", data);
//   return res.data.data;
// };

// export const updateFlat = async (id: number, data: FlatRequest): Promise<Flat> => {
//   assertAccess();
//   const res = await api.put(`/flats/${id}`, data);
//   return res.data.data;
// };

// export const deleteFlat = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/flats/${id}`);
// };

// export const deleteEBReadingsByFlat = async (flatId: number): Promise<void> => {
//   assertAccess();
//   await api.delete("/eb-readings/by-flat", { params: { flatId } });
// };

// export const deleteEBReadingsByRoom = async (roomId: number): Promise<void> => {
//   assertAccess();
//   await api.delete("/eb-readings/by-room", { params: { roomId } });
// };

// /* =====================================================
//    FOOD TIMETABLE
// ===================================================== */
// export const fetchFoodSchedules = async (): Promise<FoodTimetable[]> => {
//   const res = await api.get("/food-timetable");
//   return res.data?.data ?? [];
// };
// export const getFoodSchedules = fetchFoodSchedules;

// export const createFoodSchedule = async (
//   data: FoodTimetableRequest
// ): Promise<FoodTimetable> => {
//   assertAccess();
//   const res = await api.post("/food-timetable", data);
//   return res.data.data;
// };

// export const getFoodScheduleById = async (id: number): Promise<FoodTimetable> => {
//   const res = await api.get(`/food-timetable/${id}`);
//   return res.data.data;
// };

// export const updateFoodSchedule = async (
//   id: number,
//   data: FoodTimetableRequest
// ): Promise<FoodTimetable> => {
//   assertAccess();
//   const res = await api.put(`/food-timetable/${id}`, data);
//   return res.data.data;
// };

// export const deleteFoodSchedule = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/food-timetable/${id}`);
// };

// /* =====================================================
//    ANNOUNCEMENTS
// ===================================================== */
// export const fetchAnnouncements = async (): Promise<Announcement[]> => {
//   const res = await api.get("/announcements");
//   return res.data?.data ?? [];
// };
// export const getAnnouncements = fetchAnnouncements;

// export const createAnnouncement = async (
//   data: AnnouncementRequest
// ): Promise<Announcement> => {
//   assertAccess();
//   const res = await api.post("/announcements", data);
//   return res.data.data;
// };

// export const getAnnouncementById = async (id: number): Promise<Announcement> => {
//   const res = await api.get(`/announcements/${id}`);
//   return res.data.data;
// };

// export const deleteAnnouncement = async (id: number): Promise<void> => {
//   assertAccess();
//   await api.delete(`/announcements/${id}`);
// };

// export const shareAnnouncementWhatsApp = async (id: number) => {
//   const res = await api.post(`/announcements/${id}/share-whatsapp`);
//   return res.data.data;
// };

// export const updateAnnouncement = async (
//   id: number,
//   data: AnnouncementRequest
// ): Promise<Announcement> => {
//   assertAccess();
//   const res = await api.put(`/announcements/${id}`, data);
//   return res.data.data;
// };
















































import api from "./api";
import {
  Room, Bed, EBReading, Rent, Tenant, Flat, FlatRequest, Role,
  PaymentMode, TenantEBBill, Branch, BranchRequest, TenantRequest,
  LoginResponse, User, Complaint, ComplaintStatus, FoodTimetable,
  FoodTimetableRequest, Announcement, AnnouncementRequest,
} from "./types";

/* ── Shared helpers ───────────────────────────────────────────────────── */

/** Unwrap paginated API response into a consistent shape. */
const page = (res: any) => ({
  content:       res.data?.data?.content ?? res.data?.content ?? [],
  totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
});

/** Unwrap `.data.data` from any response. */
const d = (res: any) => res.data.data;

/** Throw if the current user lacks write access. */
const guard = () => {
  const role = getUserRole();
  if (!["ADMIN", "WARDEN", "TENANT"].includes(role)) throw new Error("Access denied");
};

/** Fetch every page of a paginated endpoint and return all items. */
export async function fetchAllPages<T>(
  fetcher: (page: number, size: number) => Promise<{ content: T[]; totalElements: number }>,
  pageSize = 10
): Promise<T[]> {
  const first = await fetcher(0, pageSize);
  if (first.totalElements <= pageSize) return first.content;
  const rest = await Promise.all(
    Array.from({ length: Math.ceil(first.totalElements / pageSize) - 1 }, (_, i) =>
      fetcher(i + 1, pageSize)
    )
  );
  return [...first.content, ...rest.flatMap((r) => r.content)];
}

/* ── Auth ─────────────────────────────────────────────────────────────── */

export const loginUser = async (email: string, password: string): Promise<LoginResponse> =>
  d(await api.post("/auth/login", { email, password }));

export const getUserRole = (): Role => {
  const role = sessionStorage.getItem("role");
  return (["ADMIN", "WARDEN", "TENANT"].includes(role!) ? role : "WARDEN") as Role;
};

export const isTokenExpired = (token?: string): boolean => {
  if (!token) return true;
  try {
    return Date.now() >= JSON.parse(atob(token.split(".")[1])).exp * 1000;
  } catch {
    return true;
  }
};

/* ── Generic paginated fetcher factory ───────────────────────────────── */

const pageFetch = (path: string) =>
  async (pg = 0, size = 10) => page(await api.get(path, { params: { page: pg, size } }));

/* ── Rooms ────────────────────────────────────────────────────────────── */

export const fetchRooms = pageFetch("/rooms");
export const getRooms   = fetchRooms;

export const createRoom = async (data: {
  roomNumber: string; hostelType: string; totalBeds: number;
  rentPerBed: number; unitId: number; flatId?: number | null;
}): Promise<Room> => { guard(); return d(await api.post("/rooms", data)); };

export const editRoom   = async (roomId: number, data: Partial<Room>): Promise<Room> =>
  { guard(); return d(await api.put(`/rooms/${roomId}`, data)); };

export const removeRoom = async (roomId: number): Promise<void> =>
  { guard(); await api.delete(`/rooms/${roomId}`); };

/* ── Beds ─────────────────────────────────────────────────────────────── */

export const fetchBeds = pageFetch("/beds");
export const getBeds   = fetchBeds;

export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> =>
  { guard(); return d(await api.put(`/beds/${bedId}`, { occupied: isOccupied })); };

/* ── Tenants ──────────────────────────────────────────────────────────── */

export const fetchTenants = pageFetch("/tenants");
export const getTenants   = fetchTenants;

export const getActiveTenants = async (pg = 0, size = 10): Promise<Tenant[]> =>
  (await fetchTenants(pg, size)).content.filter((t: Tenant) => t.status === "Active");

export const getActiveTenantsByRoom = async (roomId: number): Promise<Tenant[]> =>
  (await getActiveTenants()).filter((t) => Number(t.roomId) === Number(roomId));

export const addTenant = async (data: TenantRequest | FormData): Promise<Tenant> =>
  { guard(); return d(await api.post("/tenants", data)); };

export const importTenantsExcel = async (file: File): Promise<string> => {
  guard();
  const fd = new FormData();
  fd.append("file", file);
  return d(await api.post("/tenants/import", fd));
};

export const deleteTenant = async (tenantId: number | string): Promise<void> => {
  guard();
  if (!tenantId) throw new Error("Invalid tenant ID");
  await api.delete(`/tenants/${tenantId}`);
};

export const checkoutTenant = async (
  tenantId: number,
  currentReading?: number | null,
  acFinalReading?: number | null
): Promise<Tenant> => {
  guard();
  return d(await api.put(`/tenants/${tenantId}/checkout`, {
    finalReading: currentReading ?? null,
    acFinalReading: acFinalReading ?? null,
  }));
};

export const updateTenant = async (
  tenantId: number | string, data: TenantRequest | FormData
): Promise<Tenant> => d(await api.put(`/tenants/${tenantId}`, data));

/* ── EB Readings ──────────────────────────────────────────────────────── */

export const fetchEBReadings = pageFetch("/eb-readings");
export const getEBReadings   = fetchEBReadings;

export const addEBReading = async (data: EBReading): Promise<EBReading> =>
  { guard(); return d(await api.post("/eb-readings", data)); };

export const updateEBReading = async (id: string, data: Partial<EBReading>): Promise<EBReading> =>
  { guard(); return d(await api.put(`/eb-readings/${id}`, data)); };

export const deleteEBReading = async (id: string): Promise<void> =>
  { guard(); await api.delete(`/eb-readings/${id}`); };

/* ── Rents ────────────────────────────────────────────────────────────── */

export const fetchRents = pageFetch("/rents");
export const getRents   = fetchRents;

export const generateRent = async (data: {
  tenantId: string; roomId: string; rentMonth: number;
  rentYear: number; rentAmount: number; ebAmount: number;
}): Promise<Rent> => { guard(); return d(await api.post("/rents/generate", data)); };

export const recordRentPayment = async (
  rentId: string | number,
  paymentMode: PaymentMode,
  paymentStatus: "PENDING" | "PAID" | "PARTIAL"
): Promise<Rent> => {
  guard();
  return d(await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus }));
};

export const deleteRent = async (rentId: string): Promise<void> =>
  { guard(); await api.delete(`/rents/${rentId}`); };

/* ── Tenant EB Bill ───────────────────────────────────────────────────── */

export const getTenantWiseEBBill = async ({
  roomId, flatId,
}: { roomId?: number | null; flatId?: number | null }): Promise<TenantEBBill[]> => {
  if (!roomId && !flatId) throw new Error("roomId or flatId required");
  const url = roomId
    ? `/eb-readings/tenant-wise-bill/room?roomId=${roomId}`
    : `/eb-readings/tenant-wise-bill/flat?flatId=${flatId}`;
  return (await api.get(url)).data?.data ?? [];
};

/* ── Record Payment ───────────────────────────────────────────────────── */

export const recordPayment = async (
  rentId: string | number, paymentMode: string, amount: number, transactionId?: string
) => (await api.put(`/rents/${rentId}/payment`, { paymentMode, amount, transactionId })).data;

/* ── Checkout Summary ─────────────────────────────────────────────────── */

export const getCheckoutSummary = async (tenantId: string | number) => {
  const id = Number(tenantId);
  const { content } = await fetchTenants(0, 500);
  const tenant = content.find((t: Tenant) => Number(t.id) === id);
  if (!tenant) return null;
  const rents: Rent[] = (await api.get(`/rents/tenant/${id}`)).data?.data ?? [];
  const pendingRents  = rents.filter((r) => r.paymentStatus !== "PAID");
  return { tenant, pendingRents, totalRentDue: pendingRents.reduce((s, r) => s + (r.rentAmount ?? 0), 0), advancePaid: tenant.advance ?? 0 };
};

/* ── Branches / Units ─────────────────────────────────────────────────── */

export const fetchBranches = async (pg = 0, size = 10) => {
  const res = await api.get("/units", { params: { page: pg, size } });
  return {
    content:       res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? [],
    totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
  };
};
export const getBranches = fetchBranches;

export const getBranchId = (): number | null => {
  const id = sessionStorage.getItem("branchId");
  return id ? Number(id) : null;
};

export const createBranch = async (data: BranchRequest): Promise<Branch> =>
  { guard(); return (await api.post("/units", data)).data.data ?? (await api.post("/units", data)).data; };

export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> =>
  { guard(); return (await api.put(`/units/${id}`, data)).data.data ?? (await api.put(`/units/${id}`, data)).data; };

export const deleteBranch = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/units/${id}`); };

/* ── WhatsApp ─────────────────────────────────────────────────────────── */

export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
  guard();
  if (!roomNumber) throw new Error("Room number is required");
  return d(await api.post("/whatsapp/send-eb-bill", { roomNumber }));
};

/* ── Dashboard ────────────────────────────────────────────────────────── */

export const getDashboard = async () => d(await api.get("/dashboard"));

/* ── Users ────────────────────────────────────────────────────────────── */

export const registerUser = async (data: {
  email: string; password: string; role: Role; branchId: number;
}) => (await api.post("/register", data)).data;

export const getUsers = async (pg = 0, size = 10) => {
  const res = await api.get("/users", { params: { page: pg, size } });
  return {
    content:       res.data?.data?.content ?? res.data?.data ?? [],
    totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
  };
};

export const getUserById  = async (id: number): Promise<User>  => d(await api.get(`/users/${id}`));
export const deleteUser   = async (id: number): Promise<void>  => { guard(); await api.delete(`/users/${id}`); };
export const updateUser   = async (id: number, data: { email: string; password?: string; role: string; branchId: number | null }): Promise<User> =>
  { guard(); return d(await api.put(`/users/${id}`, data)); };

/* ── Complaints ───────────────────────────────────────────────────────── */

export const createComplaint = async (data: { subject: string; description: string }): Promise<Complaint> => {
  if (getUserRole() !== "TENANT") throw new Error("Only tenants can create complaints");
  return (await api.post("/complaints", data)).data?.data;
};

export const getMyComplaints  = async (): Promise<Complaint[]> => {
  if (getUserRole() !== "TENANT") throw new Error("Access denied");
  return (await api.get("/complaints/my")).data ?? [];
};

export const getAllComplaints  = async (): Promise<Complaint[]> => (await api.get("/complaints")).data ?? [];

export const updateComplaintStatus = async (id: number, status: ComplaintStatus): Promise<Complaint> =>
  (await api.put(`/complaints/${id}/status`, null, { params: { status } })).data?.data;

/* ── Flats ────────────────────────────────────────────────────────────── */

export const fetchFlats = pageFetch("/flats");
export const getFlats   = fetchFlats;

export const fetchFlatsByBranch = async (branchId: number, pg = 0, size = 10): Promise<Flat[]> =>
  (await api.get(`/flats/branch/${branchId}`, { params: { page: pg, size } })).data?.data?.content ?? [];
export const getFlatsByBranch = fetchFlatsByBranch;

export const createFlat = async (data: FlatRequest): Promise<Flat> =>
  { guard(); return d(await api.post("/flats", data)); };

export const updateFlat = async (id: number, data: FlatRequest): Promise<Flat> =>
  { guard(); return d(await api.put(`/flats/${id}`, data)); };

export const deleteFlat = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/flats/${id}`); };

export const deleteEBReadingsByFlat = async (flatId: number): Promise<void> =>
  { guard(); await api.delete("/eb-readings/by-flat", { params: { flatId } }); };

export const deleteEBReadingsByRoom = async (roomId: number): Promise<void> =>
  { guard(); await api.delete("/eb-readings/by-room", { params: { roomId } }); };

/* ── Food Timetable ───────────────────────────────────────────────────── */

export const fetchFoodSchedules    = async (): Promise<FoodTimetable[]>    => (await api.get("/food-timetable")).data?.data ?? [];
export const getFoodSchedules      = fetchFoodSchedules;
export const getFoodScheduleById   = async (id: number): Promise<FoodTimetable> => d(await api.get(`/food-timetable/${id}`));
export const createFoodSchedule    = async (data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.post("/food-timetable", data)); };
export const updateFoodSchedule    = async (id: number, data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.put(`/food-timetable/${id}`, data)); };
export const deleteFoodSchedule    = async (id: number): Promise<void> => { guard(); await api.delete(`/food-timetable/${id}`); };

/* ── Announcements ────────────────────────────────────────────────────── */

export const fetchAnnouncements    = async (): Promise<Announcement[]>    => (await api.get("/announcements")).data?.data ?? [];
export const getAnnouncements      = fetchAnnouncements;
export const getAnnouncementById   = async (id: number): Promise<Announcement> => d(await api.get(`/announcements/${id}`));
export const createAnnouncement    = async (data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.post("/announcements", data)); };
export const updateAnnouncement    = async (id: number, data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.put(`/announcements/${id}`, data)); };
export const deleteAnnouncement    = async (id: number): Promise<void> => { guard(); await api.delete(`/announcements/${id}`); };
export const shareAnnouncementWhatsApp = async (id: number) => d(await api.post(`/announcements/${id}/share-whatsapp`));