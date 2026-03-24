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



export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>("/auth/login", { email, password });
  return res.data;
};




/* =====================================================
   AUTH / ROLE
   ===================================================== */
export const getUserRole = (): Role => {
  const role = sessionStorage.getItem("role");
  if (role === "ADMIN" || role === "USER" || role === "VIEWER") return role;
  return "VIEWER";
};

// Guards
const assertAdmin = () => {
  if (getUserRole() !== "ADMIN") {
    throw new Error("Admin access required");
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
// export const fetchRooms = async (page = 0, size = 10) => {
//   const res = await api.get("/rooms", { params: { page, size } });
//   return res.data;
// };

// export const getRooms = fetchRooms;

export const fetchRooms = async (page = 0, size = 10): Promise<Room[]> => {
  const res = await api.get("/rooms", { params: { page, size } });
  return Array.isArray(res.data) ? res.data : res.data.content ?? [];
};
export const getRooms = fetchRooms;

export const createRoom = async (data: {
  roomNumber: string;
  hostelType: string;
  totalBeds: number;
  rentPerBed: number;
  unitId: number; 
}): Promise<Room> => {
  assertAdmin();
  return (await api.post("/rooms", data)).data;
};

export const editRoom = async (
  roomId: number,
  data: Partial<Room>
): Promise<Room> => {
  assertAdmin();
  return (await api.put(`/rooms/${roomId}`, data)).data;
};

export const removeRoom = async (roomId: number): Promise<void> => {
  assertAdmin();
  await api.delete(`/rooms/${roomId}`);
};

/* =====================================================
   BEDS
   ===================================================== */
// lib/store.ts
// export const fetchBeds = async (page = 0, size = 10): Promise<Bed[]> => {
//   const res = await api.get("/beds", {
//     params: { page, size },
//   });
//   return res.data;
// };


// export const getBeds = fetchBeds;

export const fetchBeds = async (page = 0, size = 10): Promise<Bed[]> => {
  const res = await api.get("/beds", { params: { page, size } });
  return Array.isArray(res.data) ? res.data : res.data.content ?? [];
};
export const getBeds = fetchBeds;


export const updateBedStatus = async (
  bedId: number,
  isOccupied: boolean
): Promise<Bed> => {
  assertAdmin();
  return (await api.put(`/beds/${bedId}`, { isOccupied })).data;
};

/* =====================================================
   TENANTS (MATCHES BACKEND)
   ===================================================== */
export const fetchTenants = async (): Promise<Tenant[]> => {
  const res = await api.get("/tenants");
  return Array.isArray(res.data) ? res.data : res.data.content ?? [];
};
export const getTenants = fetchTenants;

export const getActiveTenants = async (): Promise<Tenant[]> =>
  (await fetchTenants()).filter(t => t.status === "Active");

export const getActiveTenantsByRoom = async (
  roomId: number
): Promise<Tenant[]> =>
  (await getActiveTenants()).filter(t => Number(t.roomId) === roomId);

/* -------- ADD TENANT -------- */
export const addTenant = async (
  data: TenantRequest
): Promise<Tenant> => {
  assertAdmin();
  const res = await api.post("/tenants", data);
  return res.data;
};

export const importTenantsExcel = async (
  file: File
): Promise<string> => {
  assertAdmin();

  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/tenants/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/* -------- CHECKOUT TENANT --------
   Backend: PUT /api/tenants/{id}/checkout
---------------------------------- */
export const checkoutTenant = async (
  tenantId: number,
  currentReading?: number | null
): Promise<Tenant> => {
  assertAdmin();

  if (!tenantId || tenantId <= 0) {
    throw new Error("Invalid tenant ID");
  }

  const body: Partial<TenantRequest> = {
    joinReading: currentReading ?? null,
  };

  const res = await api.put(
    `/tenants/${tenantId}/checkout`,
    body
  );

  return res.data;
};


/* -------- UPDATE TENANT -------- */
export const updateTenant = async (
  tenantId: number | string,
  data: TenantRequest
): Promise<Tenant> => {

  const role = getUserRole();

  // backend allows ADMIN + VIEWER
  if (role !== "ADMIN" && role !== "VIEWER") {
    throw new Error("Permission denied");
  }

  const res = await api.put(`/tenants/${tenantId}`, data);
  return res.data;
};
/* =====================================================
   EB READINGS
   ===================================================== */
export const fetchEBReadings = async (): Promise<EBReading[]> =>
  (await api.get("/eb-readings")).data;

export const getEBReadings = fetchEBReadings;

export const addEBReading = async (
  data: Partial<EBReading>
): Promise<EBReading> => {
  assertAdmin();
  return (await api.post("/eb-readings", data)).data;
};

export const updateEBReading = async (
  ebReadingId: string,
  data: Partial<EBReading>
): Promise<EBReading> => {
  assertAdmin();
  return (await api.put(`/eb-readings/${ebReadingId}`, data)).data;
};

export const deleteEBReading = async (
  ebReadingId: string
): Promise<void> => {
  assertAdmin();
  await api.delete(`/eb-readings/${ebReadingId}`);
};

/* =====================================================
   RENTS
   ===================================================== */
export const fetchRents = async (): Promise<Rent[]> => {
  const res = await api.get("/rents");
  return Array.isArray(res.data) ? res.data : res.data.content ?? [];
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
  assertAdmin();
  return (await api.post("/rents/generate", data)).data;
};

/* =====================================================
   RECORD RENT PAYMENT (MATCHES BACKEND)
   Backend: PUT /api/rents/{id}/payment
===================================================== */
export const recordRentPayment = async (
  rentId: string | number,
  paymentMode: PaymentMode,
  paymentStatus: "PENDING" | "PAID" | "PARTIAL"
): Promise<Rent> => {
  assertAdmin();

  return (
    await api.put(`/rents/${rentId}/payment`, {
      paymentMode,
      paymentStatus,
    })
  ).data;
};

export const deleteRent = async (rentId: string): Promise<void> => {
  assertAdmin();
  await api.delete(`/rents/${rentId}`);
};

/* =====================================================
   TENANT-WISE EB BILL
   ===================================================== */
export const getTenantWiseEBBill = async (
  roomNumber: string
): Promise<TenantEBBill[]> => {
  try {
    const res = await api.get("/eb-readings/tenant-wise-bill", {
      params: { roomNumber },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Failed to fetch EB bills:", err);
    return [];
  }
};

/* =====================================================
   RECORD PAYMENT
   ===================================================== */
export const recordPayment = async (
  rentId: string | number,
  paymentMode: PaymentMode
): Promise<Rent> => {
  assertAdmin();

  return (
    await api.put(`/rents/${rentId}/payment`, {
      paymentMode,
      paymentStatus: "PAID",
    })
  ).data;
};

/* =====================================================
   CHECKOUT SUMMARY (FRONTEND CALC)
   ===================================================== */
export const getCheckoutSummary = async (
  tenantId: string | number
) => {
  const id = Number(tenantId);

  // ------------------ Get Tenant ------------------
  const tenants = await getTenants();
  const tenant = tenants.find((t) => Number(t.id) === id);
  if (!tenant) return null;

  // ------------------ Get Pending Rents ------------------
  const rents = await fetchRents();

  const pendingRents = rents.filter(
    (r) =>
      Number(r.tenantId) === id &&
      r.paymentStatus !== "Paid"
  );

  const totalRentDue = pendingRents.reduce(
    (sum, r) => sum + (r.rentAmount ?? 0),
    0
  );

  // ------------------ Advance ------------------
  const advancePaid = tenant.advance ?? 0;

  return {
    tenant,
    pendingRents,
    totalRentDue,
    advancePaid,
  };
};

/* =====================================================
   BRANCH / UNIT
   ===================================================== */
export const fetchBranches = async (): Promise<Branch[]> =>
  (await api.get("/units")).data;

export const getBranches = fetchBranches;

export const createBranch = async (data: BranchRequest): Promise<Branch> => {
  assertAdmin();
  return (await api.post("/units", data)).data;
};

export const getBranchById = async (id: number): Promise<Branch> =>
  (await api.get(`/units/${id}`)).data;

export const updateBranch = async (
  id: number,
  data: BranchRequest
): Promise<Branch> => {
  assertAdmin();
  return (await api.put(`/units/${id}`, data)).data;
};

export const deleteBranch = async (id: number): Promise<void> => {
  assertAdmin();
  await api.delete(`/units/${id}`);
};

/* =====================================================
   WHATSAPP EB BILL
   ===================================================== */
export const sendEBBillWhatsApp = async (
  roomNumber: string,
  message: string
): Promise<void> => {
  assertAdmin();

  await api.post("/whatsapp/send-eb-bill", {
    roomNumber,
    message,
  });
};

export const getDashboard = async () => {
  const res = await api.get("/dashboard");
  return res.data;
};