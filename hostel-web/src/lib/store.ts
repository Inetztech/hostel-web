import api from "./api";
import {
  Room,
  Bed,
  EBReading,
  Rent,
  Tenant,
  Role,
  PaymentMode,
  TenantEBBill,
  Branch,
  BranchRequest,
  TenantRequest,
  LoginResponse,
} from "./types";

/* =====================================================
   AUTH
===================================================== */
export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
};

export const getUserRole = (): Role => {
  const role = sessionStorage.getItem("role");
  if (role === "ADMIN" ||  role === "VIEWER") return role;
  return "VIEWER";
};

const assertAccess = () => {
  const role = getUserRole();

  if (role !== "ADMIN" && role !== "VIEWER") {
    throw new Error("Access denied");
  }
};

/* =====================================================
   JWT EXPIRY HELPER
===================================================== */
export const isTokenExpired = (token?: string): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

/* =====================================================
   ROOMS
===================================================== */
export const fetchRooms = async (page = 0, size = 10): Promise<Room[]> => {
  const res = await api.get("/rooms", { params: { page, size } });
  return res.data?.data?.content ?? [];
};

export const getRooms = fetchRooms;

export const createRoom = async (data: {
  roomNumber: string;
  hostelType: string;
  totalBeds: number;
  rentPerBed: number;
  unitId: number;
}): Promise<Room> => {
  assertAccess();
  const res = await api.post("/rooms", data);
  return res.data.data;
};

export const editRoom = async (roomId: number, data: Partial<Room>): Promise<Room> => {
  assertAccess();
  const res = await api.put(`/rooms/${roomId}`, data);
  return res.data.data;
};

export const removeRoom = async (roomId: number): Promise<void> => {
  assertAccess();
  await api.delete(`/rooms/${roomId}`);
};

/* =====================================================
   BEDS
===================================================== */
export const fetchBeds = async (page = 0, size = 10): Promise<Bed[]> => {
  const res = await api.get("/beds", { params: { page, size } });
  return res.data?.data ?? [];
};

export const getBeds = fetchBeds;

export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> => {
  assertAccess();
  const res = await api.put(`/beds/${bedId}`, { occupied: isOccupied });
  return res.data.data;
};

/* =====================================================
   TENANTS
===================================================== */
export const fetchTenants = async (
  page = 0,
  size = 10
): Promise<Tenant[]> => {

  const res = await api.get("/tenants", {
    params: { page, size }
  });

  return res.data?.data?.content ?? [];
};

export const getTenants = fetchTenants;

export const getActiveTenants = async (): Promise<Tenant[]> =>
  (await fetchTenants()).filter(t => t.status === "Active");

export const getActiveTenantsByRoom = async (roomId: number): Promise<Tenant[]> =>
  (await getActiveTenants()).filter(t => Number(t.roomId) === Number(roomId));

export const addTenant = async (data: TenantRequest): Promise<Tenant> => {
  assertAccess();
  const res = await api.post("/tenants", data);
  return res.data.data;
};

export const importTenantsExcel = async (file: File): Promise<string> => {
  assertAccess();
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/tenants/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const deleteTenant = async (tenantId: number | string): Promise<void> => {
  assertAccess();
  if (!tenantId) throw new Error("Invalid tenant ID");
  await api.delete(`/tenants/${tenantId}`);
};

export const checkoutTenant = async (tenantId: number, currentReading?: number | null): Promise<Tenant> => {
  assertAccess();
  const res = await api.put(`/tenants/${tenantId}/checkout`, {
    finalReading: currentReading ?? null,
  });
  return res.data.data;
};

export const updateTenant = async (tenantId: number | string, data: TenantRequest): Promise<Tenant> => {
  const role = getUserRole();
  if (role !== "ADMIN" && role !== "VIEWER") throw new Error("Permission denied");
  const res = await api.put(`/tenants/${tenantId}`, data);
  return res.data.data;
};

/* =====================================================
   EB READINGS
===================================================== */
export const fetchEBReadings = async (
  page = 0,
  size = 10
): Promise<EBReading[]> => {

  const res = await api.get("/eb-readings", {
    params: { page, size }
  });

  return res.data?.data?.content ?? [];
};

export const getEBReadings = fetchEBReadings;

export const addEBReading = async (data: EBReading): Promise<EBReading> => {
  assertAccess();
  const res = await api.post("/eb-readings", data);
  return res.data.data;
};

export const updateEBReading = async (ebReadingId: string, data: Partial<EBReading>): Promise<EBReading> => {
  assertAccess();
  const res = await api.put(`/eb-readings/${ebReadingId}`, data);
  return res.data.data;
};

export const deleteEBReading = async (ebReadingId: string): Promise<void> => {
  assertAccess();
  await api.delete(`/eb-readings/${ebReadingId}`);
};

/* =====================================================
   RENTS
===================================================== */
export const fetchRents = async (
  page = 0,
  size = 10
): Promise<Rent[]> => {

  const res = await api.get("/rents", {
    params: { page, size }
  });

  return res.data?.data?.content ?? [];
};

export const getRents = fetchRents;

export const generateRent = async (data: {
  tenantId: string;
  roomId: string;
  rentMonth: number;
  rentYear: number;
  rentAmount: number;
  ebAmount: number;
}): Promise<Rent> => {
  assertAccess();
  const res = await api.post("/rents/generate", data);
  return res.data.data;
};

export const recordRentPayment = async (rentId: string | number, paymentMode: PaymentMode, paymentStatus: "PENDING" | "PAID" | "PARTIAL"): Promise<Rent> => {
  assertAccess();
  const res = await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus });
  return res.data.data;
};

export const deleteRent = async (rentId: string): Promise<void> => {
  assertAccess();
  await api.delete(`/rents/${rentId}`);
};

/* =====================================================
   TENANT-WISE EB BILL
===================================================== */
export const getTenantWiseEBBill = async (roomNumber: string): Promise<TenantEBBill[]> => {
  try {
    const res = await api.get("/eb-readings/tenant-wise-bill", { params: { roomNumber } });
    return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  } catch (err) {
    console.error("Failed to fetch EB bills:", err);
    return [];
  }
};

/* =====================================================
   RECORD PAYMENT
===================================================== */
export const recordPayment = async (rentId: string | number, paymentMode: PaymentMode): Promise<Rent> => {
  assertAccess();
  const res = await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus: "PAID" });
  return res.data.data;
};

/* =====================================================
   CHECKOUT SUMMARY
===================================================== */
export const getCheckoutSummary = async (tenantId: string | number) => {
  const id = Number(tenantId);
  const tenants = await getTenants();
  const tenant = tenants.find(t => Number(t.id) === id);
  if (!tenant) return null;

  const rents = await fetchRents();
  const pendingRents = rents.filter(r => Number(r.tenantId) === id && r.paymentStatus !== "PAID");
  const totalRentDue = pendingRents.reduce((sum, r) => sum + (r.rentAmount ?? 0), 0);
  const advancePaid = tenant.advance ?? 0;

  return { tenant, pendingRents, totalRentDue, advancePaid };
};

/* =====================================================
   BRANCHES / UNITS
===================================================== */
export const fetchBranches = async (page = 0, size = 10): Promise<Branch[]> => {
  const res = await api.get(`/units`, {
    params: { page, size }
  });

  return res.data?.data?.content ?? [];
};
export const getBranches = fetchBranches;

export const createBranch = async (data: BranchRequest): Promise<Branch> => {
  assertAccess();
  const res = await api.post("/units", data);
  return res.data.data ?? res.data;
};

export const getBranchById = async (id: number): Promise<Branch> => {
  assertAccess();
  const res = await api.get(`/units/${id}`);
  return res.data.data ?? res.data;
};

export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> => {
  assertAccess();
  const res = await api.put(`/units/${id}`, data);
  return res.data.data ?? res.data;
};

export const deleteBranch = async (id: number): Promise<void> => {
  assertAccess();
  await api.delete(`/units/${id}`);
};

/* =====================================================
   WHATSAPP EB BILL
===================================================== */
export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
  assertAccess();
  if (!roomNumber) throw new Error("Room number is required");
  const res = await api.post("/whatsapp/send-eb-bill", { roomNumber });
  return res.data.data;
};

/* =====================================================
   DASHBOARD
===================================================== */
export const getDashboard = async () => {
  const res = await api.get("/dashboard");
  return res.data.data;
};