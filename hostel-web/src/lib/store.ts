import { setUserProfile, setUserPermissions} from "./auth";
import api from "./api";
import {
  Room, Bed, EBReading, Rent, Tenant, Flat, FlatRequest, Role,
  PaymentMode, TenantEBBill, Branch, BranchRequest, TenantRequest,
  LoginResponse, User, Complaint, ComplaintStatus, FoodTimetable,
  FoodTimetableRequest, Announcement, AnnouncementRequest, Admin,
  AdminPageResponse, AdminRequest, RegisterUserRequest, UpdateUserRequest,
  Hostel, HostelRequest, PaymentTransaction,BranchCleaningSummary,
  PermissionCatalogItem, UserPermissionsResponse,CleaningStatus,
  RuleRegulation, RuleRegulationRequest,
  AppNotification, NotificationRequest,
  Ticket, TicketSummary, TicketStats, TicketRequest, TicketReplyRequest,
  TicketStatusUpdateRequest, BedLimitDecisionRequest, TicketStatus, TicketCategory,
  MaintenanceDashboardStats, Cleaner, MaintenanceTask,CleanerWorkSummary,MaintenanceRequest,CleanerRequest,
  HostelStatus,AddOnBedsRequest,Damage,DamageRequest,DamageStatus,
} from "./types";

const buildDamageFormData = (data: Partial<DamageRequest>): FormData => {
  const fd = new FormData();
  if (data.hostelId != null) fd.append("hostelId", String(data.hostelId));
  if (data.branchId != null) fd.append("branchId", String(data.branchId));
  (data.roomIds ?? []).forEach((id) => fd.append("roomIds", String(id)));
  if (data.title != null) fd.append("title", data.title);
  if (data.description != null) fd.append("description", data.description);
  if (data.damageDate != null) fd.append("damageDate", data.damageDate);
  if (data.totalAmount != null) fd.append("totalAmount", String(data.totalAmount));
  if (data.notes != null) fd.append("notes", data.notes);
  (data.tenantIds ?? []).forEach((id) => fd.append("tenantIds", String(id)));
  (data.photos ?? []).forEach((file) => fd.append("photos", file));
  return fd;
};

export const fetchDamages = async (
  pg = 0,
  size = 10
): Promise<{ content: Damage[]; totalElements: number }> =>
  page(await api.get("/damages", { params: { page: pg, size } }));

export const getDamages = fetchDamages;

export const getDamageById = async (id: number): Promise<Damage> =>
  d(await api.get(`/damages/${id}`));

export const createDamage = async (data: DamageRequest): Promise<Damage> => {
  guard();
  return d(await api.post("/damages", buildDamageFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  }));
};

export const updateDamage = async (
  id: number,
  data: Partial<DamageRequest>
): Promise<Damage> => {
  guard();
  return d(await api.put(`/damages/${id}`, buildDamageFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  }));
};

export const updateDamageStatus = async (
  id: number,
  status: DamageStatus
): Promise<Damage> => {
  guard();
  return d(await api.put(`/damages/${id}/status`, null, { params: { status } }));
};

export const deleteDamage = async (id: number): Promise<void> => {
  guard();
  await api.delete(`/damages/${id}`);
};

/**
 * Sum of unbilled damage shares per tenant (damage reported but not yet
 * folded into a Rent record). Backed by GET /damages/pending-summary.
 * Used by the Rent page to show a tenant's pending damage amount before
 * "Generate" has been clicked for that month — otherwise the Rent page
 * only ever reads damageAmount off an already-generated Rent row, and a
 * freshly reported damage would show as blank there even though it's
 * visible on the Damage/Penalty page.
 */
export const getPendingDamageSummary = async (): Promise<Record<number, number>> =>
  d(await api.get("/damages/pending-summary"));

const tenantDamagesInFlight = new Map<string, Promise<{ content: Damage[]; totalElements: number }>>();

export const fetchDamagesByTenant = async (
  tenantId: number,
  pg = 0,
  size = 10
): Promise<{ content: Damage[]; totalElements: number }> => {
  const key = `${tenantId}-${pg}-${size}`;
  if (tenantDamagesInFlight.has(key)) return tenantDamagesInFlight.get(key)!;

  const promise = (async () => {
    try {
      return await pageFetch(`/damages/tenant/${tenantId}`)(pg, size);
    } finally {
      tenantDamagesInFlight.delete(key);
    }
  })();

  tenantDamagesInFlight.set(key, promise);
  return promise;
};

export const getAllDamagesByTenant = (tenantId: number): Promise<Damage[]> =>
  fetchAllPages<Damage>((pg, size) => fetchDamagesByTenant(tenantId, pg, size));

export const addOnBeds = async (data: AddOnBedsRequest): Promise<Subscription> =>
  d(await api.post("/subscriptions/my/add-on-beds", data));

export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  await api.put("/users/me/change-password", { oldPassword, newPassword });
};

const page = (res: any) => ({
  content:       res.data?.data?.content ?? res.data?.content ?? [],
  totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
});

const d = (res: any) => res.data.data;

const guard = () => {
  const role = getUserRole();
  if (!["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"].includes(role))
    throw new Error("Access denied");
};

const adminGuard = () => {
  const role = getUserRole();
  if (!["SUPER_ADMIN", "ADMIN"].includes(role))
    throw new Error("Only Admin users can perform this action");
};

export const getResponsibleContact = async (): Promise<import("./types").ResponsibleContact | null> => {
  try {
    return d(await api.get("/users/me/responsible-contact"));
  } catch {
    return null;
  }
};

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

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const res = d(await api.post("/auth/login", { email, password }));
  sessionStorage.setItem("token", res.token);
  sessionStorage.setItem("refreshToken", res.refreshToken);
  sessionStorage.setItem("role", res.role);

  if (res.branchId != null) sessionStorage.setItem("branchId", String(res.branchId));

  if (res.tenantId != null) {
    setCachedTenantId(res.tenantId);
  } else {
    sessionStorage.removeItem("tenantId");
    sessionStorage.removeItem("tenantIdToken");
  }

  if (res.subscriptionExpired != null) {
    sessionStorage.setItem("subscriptionExpired", String(res.subscriptionExpired));
  } else {
    sessionStorage.removeItem("subscriptionExpired");
  }

  if (res.hostelStatus != null) {
    sessionStorage.setItem("hostelStatus", res.hostelStatus);
  } else {
    sessionStorage.removeItem("hostelStatus");
  }

  setUserProfile({
    email: res.email,
    name: res.name,
    phone: res.phone,
    userId: res.userId ?? null,
    hostelId: res.hostelId ?? null,
    hostelName: res.hostelName ?? null,
  });
  return res;
};

let profileCache: { data: User; ts: number; token: string | null } | null = null;
let profileInFlight: Promise<User> | null = null;
let profileInFlightToken: string | null = null;
const PROFILE_CACHE_MS = 30_000;

export const getMyProfile = async (forceRefresh = false): Promise<User> => {
  const currentToken = sessionStorage.getItem("token");
  const now = Date.now();

  const cacheValid =
    !forceRefresh &&
    profileCache !== null &&
    profileCache.token === currentToken &&
    now - profileCache.ts < PROFILE_CACHE_MS;

  if (cacheValid) {
    return profileCache!.data;
  }

  if (!forceRefresh && profileInFlight && profileInFlightToken === currentToken) {
    return profileInFlight;
  }

  profileInFlightToken = currentToken;
  profileInFlight = (async () => {
    try {
      const data = await d(await api.get("/users/me"));
      profileCache = { data, ts: Date.now(), token: currentToken };
      setUserPermissions(data.permissions ?? []);
      return data;
    } finally {
      profileInFlight = null;
      profileInFlightToken = null;
    }
  })();

  return profileInFlight;
};

export const updateMyProfile = async (data: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}): Promise<User> => {
  const updated = d(await api.put("/users/me", data));
  profileCache = null;
  return updated;
};

export const getUserRole = (): Role => {
  const role = sessionStorage.getItem("role");
  return (["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"].includes(role!)
    ? role
    : "WARDEN") as Role;
};

export const isTokenExpired = (token?: string): boolean => {
  if (!token) return true;
  try {
    return Date.now() >= JSON.parse(atob(token.split(".")[1])).exp * 1000;
  } catch {
    return true;
  }
};

export interface Subscription {
  hostelId: number;
  hostelName: string;
  planName: string;
  amountPaid: number;
  durationMonths: number;
  durationLabel: string;
  startDate: string | null;
  endDate: string | null;
  status: "ACTIVE" | "EXPIRED";
  daysRemaining: number;
  expiringSoon: boolean;
  renewalRequired: boolean;
  renewalStatus: string;
  currentPlanBedLimit: number;
  additionalBedsRequested: number;
  pricePerAdditionalBed: number;
  additionalBedAmount: number;
  totalSubscriptionAmount: number;
}

export interface SubscriptionPayment {
  id: number;
  planName: string;
  amount: number;
  durationMonths: number;
  paymentDate: string;
  cycleStartDate: string;
  cycleEndDate: string;
  paymentMode: string;
  remarks?: string | null;
  additionalBedsRequested: number;
  pricePerAdditionalBed: number;
  additionalBedAmount: number;
  totalSubscriptionAmount: number;
}

export interface SubscriptionRenewRequest {
  planName: string;
  amount: number;
  durationMonths: number;
  paymentMode?: string;
  remarks?: string;
  additionalBedsRequested?: number;
  pricePerAdditionalBed?: number;
}

export const getMySubscription = async (): Promise<Subscription> =>
  d(await api.get("/subscriptions/me"));

export const getMySubscriptionHistory = async (): Promise<SubscriptionPayment[]> =>
  d(await api.get("/subscriptions/me/history"));

export const renewMySubscription = async (
  data: SubscriptionRenewRequest
): Promise<Subscription> => {
  const updated = d(await api.post("/subscriptions/me/renew", data));
  sessionStorage.setItem("subscriptionExpired", "false");
  return updated;
};

export const isSubscriptionExpiredCached = (): boolean =>
  sessionStorage.getItem("subscriptionExpired") === "true";

export const clearSubscriptionExpiredFlag = (): void => {
  sessionStorage.removeItem("subscriptionExpired");
};

export const getCachedHostelStatus = (): HostelStatus | null =>
  (sessionStorage.getItem("hostelStatus") as HostelStatus | null) ?? null;

export const isHostelInactiveCached = (): boolean => {
  const status = getCachedHostelStatus();
  return status !== null && status !== "ACTIVE";
};

export const clearHostelStatusFlag = (): void => {
  sessionStorage.removeItem("hostelStatus");
};

export const getCachedTenantId = (): number | null => {
  const currentToken = sessionStorage.getItem("token");
  const cachedToken   = sessionStorage.getItem("tenantIdToken");
  const cachedId      = Number(sessionStorage.getItem("tenantId") || 0);

  if (cachedId && cachedToken === currentToken) return cachedId;
  return null;
};

export const setCachedTenantId = (tenantId: number): void => {
  sessionStorage.setItem("tenantId", String(tenantId));
  sessionStorage.setItem("tenantIdToken", sessionStorage.getItem("token") ?? "");
};

let tenantIdInFlight: Promise<number | null> | null = null;

export const resolveTenantId = async (): Promise<number | null> => {
  const cached = getCachedTenantId();
  if (cached) return cached;

  if (tenantIdInFlight) return tenantIdInFlight;

  tenantIdInFlight = (async () => {
    try {
      const res = await api.get("/dashboard/tenant");
      const tid = res.data?.data?.tenantId ?? res.data?.tenantId ?? null;
      if (tid) setCachedTenantId(tid);
      return tid;
    } finally {
      tenantIdInFlight = null;
    }
  })();

  return tenantIdInFlight;
};

const pageFetchInFlight = new Map<string, Promise<{ content: any[]; totalElements: number }>>();

const pageFetch = (path: string) =>
  async (pg = 0, size = 10) => {
    const key = `${path}-${pg}-${size}`;
    if (pageFetchInFlight.has(key)) return pageFetchInFlight.get(key)!;

    const promise = (async () => {
      try {
        return page(await api.get(path, { params: { page: pg, size } }));
      } finally {
        pageFetchInFlight.delete(key);
      }
    })();

    pageFetchInFlight.set(key, promise);
    return promise;
  };

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

export const fetchBeds = pageFetch("/beds");
export const getBeds   = fetchBeds;

export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> =>
  { guard(); return d(await api.put(`/beds/${bedId}`, { occupied: isOccupied })); };

export const createBed = async (roomId: number): Promise<Bed> =>
  { guard(); return d(await api.post(`/beds/room/${roomId}`)); };

export const getBedsByRoom = async (
  roomId: number,
  pg = 0,
  size = 10
): Promise<Bed[]> => d(await api.get(`/beds/room/${roomId}`, { params: { page: pg, size } }));

export const deleteBed = async (bedId: number): Promise<void> =>
  { guard(); await api.delete(`/beds/${bedId}`); };

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

export const getPendingTenants = async (): Promise<Tenant[]> =>
  d(await api.get("/tenants/pending"));

export const approveAndAllocateTenant = async (
  tenantId: number,
  data: {
    roomId: number;
    bedId: number;
    advance?: number;
    monthlyRent?: number;
    joinReading?: number;
    acJoinReading?: number;
  }
): Promise<Tenant> => {
  guard();
  const params: Record<string, any> = {
    roomId: data.roomId,
    bedId: data.bedId,
    advance: data.advance ?? 0,
    monthlyRent: data.monthlyRent ?? 0,
    joinReading: data.joinReading ?? 0,
  };
  if (data.acJoinReading != null) params.acJoinReading = data.acJoinReading;
  return d(await api.put(`/tenants/${tenantId}/approve`, null, { params }));
};

export const fetchEBReadings = pageFetch("/eb-readings");
export const getEBReadings   = fetchEBReadings;

export const addEBReading = async (data: EBReading): Promise<EBReading> =>
  { guard(); return d(await api.post("/eb-readings", data)); };

export const updateEBReading = async (id: string, data: Partial<EBReading>): Promise<EBReading> =>
  { guard(); return d(await api.put(`/eb-readings/${id}`, data)); };

export const deleteEBReading = async (id: string): Promise<void> =>
  { guard(); await api.delete(`/eb-readings/${id}`); };

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

export const getTenantWiseEBBill = async ({
  roomId, flatId, month, year,
}: {
  roomId?: number | null;
  flatId?: number | null;
  month: number;
  year: number;
}): Promise<TenantEBBill[]> => {
  if (!roomId && !flatId) throw new Error("roomId or flatId required");
  if (!month || !year) throw new Error("month and year required");

  const url = roomId
    ? `/eb-readings/tenant-wise-bill/room?roomId=${roomId}&month=${month}&year=${year}`
    : `/eb-readings/tenant-wise-bill/flat?flatId=${flatId}&month=${month}&year=${year}`;

  return (await api.get(url)).data?.data ?? [];
};

export const recordPayment = async (
  rentId: string | number, paymentMode: string, amount: number, transactionId?: string
) => (await api.put(`/rents/${rentId}/payment`, { paymentMode, amount, transactionId })).data;

export const getCheckoutSummary = async (tenantId: string | number) => {
  const id = Number(tenantId);
  const { content } = await fetchTenants(0, 10);
  const tenant = content.find((t: Tenant) => Number(t.id) === id);
  if (!tenant) return null;
  const rents: Rent[] = (await api.get(`/rents/tenant/${id}`)).data?.data ?? [];
  const pendingRents  = rents.filter((r) => r.paymentStatus !== "PAID");
  return { tenant, pendingRents, totalRentDue: pendingRents.reduce((s, r) => s + (r.rentAmount ?? 0), 0), advancePaid: tenant.advance ?? 0 };
};

const hostelsInFlight = new Map<string, Promise<{ content: Hostel[]; totalElements: number }>>();

export const fetchHostels = async (pg = 0, size = 10): Promise<{ content: Hostel[]; totalElements: number }> => {
  const key = `${pg}-${size}`;

  if (hostelsInFlight.has(key)) return hostelsInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await api.get("/hostels", {
        params: { page: pg, size, _t: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const raw = res.data?.data;

      let rawContent: any[];
      let totalElements: number;

      if (Array.isArray(raw)) {
        rawContent    = raw;
        totalElements = raw.length;
      } else if (raw?.content !== undefined) {
        rawContent    = raw.content ?? [];
        totalElements = raw.totalElements ?? rawContent.length;
      } else {
        rawContent    = [];
        totalElements = 0;
      }

      return { content: rawContent as Hostel[], totalElements };
    } finally {
      hostelsInFlight.delete(key);
    }
  })();

  hostelsInFlight.set(key, promise);
  return promise;
};

export const getHostels = fetchHostels;

export const getHostelById = async (id: number): Promise<Hostel> =>
  (await api.get(`/hostels/${id}`)).data.data;

export const createHostel = async (data: HostelRequest): Promise<Hostel> =>
  { guard(); return (await api.post("/hostels", data)).data.data; };

export const updateHostel = async (id: number, data: HostelRequest): Promise<Hostel> =>
  { guard(); return (await api.put(`/hostels/${id}`, data)).data.data; };

export const deleteHostel = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/hostels/${id}`); };

export const updateHostelStatus = async (
  id: number,
  status: HostelStatus
): Promise<import("./types").HostelAdmin> => {
  guard();
  return d(await api.put(`/super-admin/hostels/${id}/status`, null, { params: { status } }));
};

export const getSuperAdminDashboard = async (): Promise<import("./types").SuperAdminDashboard> =>
  (await api.get("/super-admin/dashboard")).data.data;

const hostelAdminsInFlight = new Map<string, Promise<import("./types").HostelAdminPageResponse>>();

export const getAllHostelsWithAdmins = async (
  pg = 0,
  size = 10
): Promise<import("./types").HostelAdminPageResponse> => {
  const key = `${pg}-${size}`;
  if (hostelAdminsInFlight.has(key)) return hostelAdminsInFlight.get(key)!;

  const promise = (async () => {
    try {
      return page(
        await api.get("/super-admin/hostels", { params: { page: pg, size } })
      ) as import("./types").HostelAdminPageResponse;
    } finally {
      hostelAdminsInFlight.delete(key);
    }
  })();

  hostelAdminsInFlight.set(key, promise);
  return promise;
};

export const getHostelWithAdminById = async (id: number): Promise<import("./types").HostelAdmin> =>
  d(await api.get(`/super-admin/hostels/${id}`));

export const createHostelWithAdmin = async (
  data: import("./types").HostelAdminRequest | FormData
): Promise<import("./types").HostelAdmin> =>
  { guard(); return d(await api.post("/super-admin/hostels", data)); };

export const updateHostelWithAdmin = async (
  id: number,
  data: import("./types").HostelAdminRequest | FormData
): Promise<import("./types").HostelAdmin> =>
  { guard(); return d(await api.put(`/super-admin/hostels/${id}`, data)); };

export const deleteHostelWithAdmin = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/super-admin/hostels/${id}`); };

const branchesInFlight = new Map<string, Promise<{ content: Branch[]; totalElements: number }>>();

export const fetchBranches = async (pg = 0, size = 10): Promise<{ content: Branch[]; totalElements: number }> => {
  const key = `${pg}-${size}`;

  if (branchesInFlight.has(key)) return branchesInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await api.get("/units", { params: { page: pg, size } });

      const raw = res.data?.data;

      let rawContent: any[];
      let totalElements: number;

      if (Array.isArray(raw)) {
        rawContent    = raw;
        totalElements = raw.length;
      } else if (raw?.content !== undefined) {
        rawContent    = raw.content ?? [];
        totalElements = raw.totalElements ?? rawContent.length;
      } else if (Array.isArray(res.data?.content)) {
        rawContent    = res.data.content;
        totalElements = res.data.totalElements ?? rawContent.length;
      } else if (Array.isArray(res.data)) {
        rawContent    = res.data;
        totalElements = res.data.length;
      } else {
        rawContent    = [];
        totalElements = 0;
      }

      const content: Branch[] = rawContent.map((b: any) => {
        const name =
          b?.unitName   ??
          b?.unit_name  ??
          b?.name       ??
          b?.branchName ??
          "";
        const hostelId =
          b?.hostelId  ??
          b?.hostel_id ??
          b?.hostel?.id ??
          undefined;
        const hostelName =
          b?.hostelName  ??
          b?.hostel_name ??
          b?.hostel?.name ??
          undefined;
        return {
          ...b,
          unitName:  name,
          unit_name: name,
          hostelId,
          hostelName,
        } as Branch;
      });

      return { content, totalElements };
    } finally {
      branchesInFlight.delete(key);
    }
  })();

  branchesInFlight.set(key, promise);
  return promise;
};

export const getBranches = fetchBranches;

export const getBranchId = (): number | null => {
  const id = sessionStorage.getItem("branchId");
  return id ? Number(id) : null;
};

export const createBranch = async (data: BranchRequest): Promise<Branch> => {
  guard();
  const res = await api.post("/units", data);
  return res.data?.data ?? res.data;
};

export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> => {
  guard();
  const res = await api.put(`/units/${id}`, data);
  return res.data?.data ?? res.data;
};

export const deleteBranch = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/units/${id}`); };

export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
  guard();
  if (!roomNumber) throw new Error("Room number is required");
  return d(await api.post("/whatsapp/send-eb-bill", { roomNumber }));
};

export const getDashboard = async () => d(await api.get("/dashboard"));

export const getMyComplaints = async (
  pg = 0,
  size = 10
): Promise<{ content: Complaint[]; totalElements: number }> => {
  if (getUserRole() !== "TENANT") throw new Error("Only tenants can create complaints");
  return page(await api.get("/complaints/my", { params: { page: pg, size } }));
};

export const getAllComplaints = async (
  pg = 0,
  size = 10
): Promise<{ content: Complaint[]; totalElements: number }> =>
  page(await api.get("/complaints", { params: { page: pg, size } }));

export const createComplaint = async (data: { subject: string; description: string }): Promise<Complaint> => {
  if (getUserRole() !== "TENANT") throw new Error("Only tenants can create complaints");
  return (await api.post("/complaints", data)).data;
};

export const updateComplaintStatus = async (id: number, status: ComplaintStatus): Promise<Complaint> =>
  (await api.put(`/complaints/${id}/status`, null, { params: { status } })).data;

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

export const fetchFoodSchedules = async (
  pg = 0,
  size = 10
): Promise<{ content: FoodTimetable[]; totalElements: number }> =>
  page(await api.get("/food-timetable", { params: { page: pg, size } }));

export const getFoodSchedules      = fetchFoodSchedules;
export const getFoodScheduleById   = async (id: number): Promise<FoodTimetable> => d(await api.get(`/food-timetable/${id}`));
export const createFoodSchedule    = async (data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.post("/food-timetable", data)); };
export const updateFoodSchedule    = async (id: number, data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.put(`/food-timetable/${id}`, data)); };
export const deleteFoodSchedule    = async (id: number): Promise<void> => { guard(); await api.delete(`/food-timetable/${id}`); };

export const fetchAnnouncements = async (
  pg = 0,
  size = 10
): Promise<{ content: Announcement[]; totalElements: number }> =>
  page(await api.get("/announcements", { params: { page: pg, size } }));

export const getAnnouncements = fetchAnnouncements;

export const getAnnouncementById   = async (id: number): Promise<Announcement> => d(await api.get(`/announcements/${id}`));
export const createAnnouncement    = async (data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.post("/announcements", data)); };
export const updateAnnouncement    = async (id: number, data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.put(`/announcements/${id}`, data)); };
export const deleteAnnouncement    = async (id: number): Promise<void> => { guard(); await api.delete(`/announcements/${id}`); };
export const shareAnnouncementWhatsApp = async (id: number) => d(await api.post(`/announcements/${id}/share-whatsapp`));

export const fetchRulesRegulations = async (
  pg = 0,
  size = 10
): Promise<{ content: RuleRegulation[]; totalElements: number }> =>
  page(await api.get("/rules-regulations", { params: { page: pg, size } }));
export const getRulesRegulations = fetchRulesRegulations;
export const getRuleRegulationById  = async (id: number): Promise<RuleRegulation> => d(await api.get(`/rules-regulations/${id}`));
export const createRuleRegulation   = async (data: RuleRegulationRequest): Promise<RuleRegulation> => { adminGuard(); return d(await api.post("/rules-regulations", data)); };
export const updateRuleRegulation   = async (id: number, data: RuleRegulationRequest): Promise<RuleRegulation> => { adminGuard(); return d(await api.put(`/rules-regulations/${id}`, data)); };
export const deleteRuleRegulation   = async (id: number): Promise<void> => { adminGuard(); await api.delete(`/rules-regulations/${id}`); };

export const getSuperAdminBranchId = (): number | null => {
  const v = sessionStorage.getItem("branchId");
  return v ? parseInt(v, 10) : null;
};

export const createAdmin = async (data: AdminRequest): Promise<Admin> =>
  d(await api.post("/super-admin/admins", data));

const adminsInFlight = new Map<string, Promise<AdminPageResponse>>();

export const getAllAdmins = async (pg = 0, size = 10): Promise<AdminPageResponse> => {
  const key = `${pg}-${size}`;

  if (adminsInFlight.has(key)) return adminsInFlight.get(key)!;

  const promise = (async () => {
    try {
      return page(await api.get("/super-admin/admins", { params: { page: pg, size } })) as AdminPageResponse;
    } finally {
      adminsInFlight.delete(key);
    }
  })();

  adminsInFlight.set(key, promise);
  return promise;
};

export const getAdminById = async (id: number): Promise<Admin> =>
  d(await api.get(`/super-admin/admins/${id}`));

export const updateAdmin = async (id: number, data: AdminRequest): Promise<Admin> =>
  d(await api.put(`/super-admin/admins/${id}`, data));

export const deleteAdmin = async (id: number): Promise<void> => {
  await api.delete(`/super-admin/admins/${id}`);
};

export const activateAdmin = async (id: number): Promise<Admin> =>
  d(await api.put(`/super-admin/admins/${id}/activate`));

export const deactivateAdmin = async (id: number): Promise<Admin> =>
  d(await api.put(`/super-admin/admins/${id}/deactivate`));

export const assignHostel = async (adminId: number, hostelId: number): Promise<Admin> =>
  d(await api.put(`/super-admin/admins/${adminId}/assign-hostel`, null, { params: { hostelId } }));

export const checkFraud = async (
  phone?: string,
  idProofNumber?: string
): Promise<import("./types").FraudCheckResponse> => {
  const params: Record<string, string> = {};
  if (phone)         params.phone         = phone;
  if (idProofNumber) params.idProofNumber = idProofNumber;
  const res = await api.get("/tenants/fraud-check", { params });
  return res.data?.data ?? { fraud: false, records: [] };
};

export const markAbsconded = async (
  tenantId: number,
  reason?: string
): Promise<import("./types").Tenant> => {
  guard();
  const params: Record<string, string> = {};
  if (reason?.trim()) params.reason = reason.trim();
  const res = await api.put(`/tenants/${tenantId}/mark-absconded`, null, { params });
  return d(res);
};

export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> =>
  d(await api.get("/permissions/catalog"));

let assignablePermissionsInFlight: Promise<PermissionCatalogItem[]> | null = null;

export const getAssignablePermissions = async (): Promise<PermissionCatalogItem[]> => {
  if (assignablePermissionsInFlight) return assignablePermissionsInFlight;

  assignablePermissionsInFlight = (async () => {
    try {
      return d(await api.get("/permissions/assignable"));
    } finally {
      assignablePermissionsInFlight = null;
    }
  })();

  return assignablePermissionsInFlight;
};

export const getUserPermissions = async (userId: number): Promise<UserPermissionsResponse> =>
  d(await api.get(`/permissions/user/${userId}`));

export const assignUserPermissions = async (
  userId: number,
  permissions: string[]
): Promise<UserPermissionsResponse> =>
  d(await api.put(`/permissions/user/${userId}`, { permissions }));

export const registerUser = async (data: RegisterUserRequest) =>
  (await api.post("/register", data)).data;

const usersInFlight = new Map<string, Promise<{ content: any[]; totalElements: number }>>();

export const getUsers = async (pg = 0, size = 10) => {
  const key = `${pg}-${size}`;

  if (usersInFlight.has(key)) return usersInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await api.get("/users", { params: { page: pg, size } });
      return {
        content:       res.data?.data?.content ?? res.data?.data ?? [],
        totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
      };
    } finally {
      usersInFlight.delete(key);
    }
  })();

  usersInFlight.set(key, promise);
  return promise;
};

export const getUserById  = async (id: number): Promise<User>  => d(await api.get(`/users/${id}`));
export const deleteUser   = async (id: number): Promise<void>  => { guard(); await api.delete(`/users/${id}`); };

export const updateUser = async (id: number, data: UpdateUserRequest): Promise<User> =>
  { guard(); return d(await api.put(`/users/${id}`, data)); };

const tenantRentsInFlight = new Map<number, Promise<Rent[]>>();

export const getTenantRents = async (tenantId: number): Promise<Rent[]> => {
  if (tenantRentsInFlight.has(tenantId)) return tenantRentsInFlight.get(tenantId)!;

  const promise = (async () => {
    try {
      return (await api.get(`/rents/tenant/${tenantId}`)).data?.data ?? [];
    } finally {
      tenantRentsInFlight.delete(tenantId);
    }
  })();

  tenantRentsInFlight.set(tenantId, promise);
  return promise;
};

export const submitPayment = async (data: FormData): Promise<PaymentTransaction> =>
  d(await api.post("/payments/submit", data));

export const approvePayment = async (id: number): Promise<PaymentTransaction> =>
  d(await api.put(`/payments/${id}/approve`));

export const rejectPayment = async (
  id: number,
  remarks: string
): Promise<PaymentTransaction> => d(await api.put(`/payments/${id}/reject`, { remarks }));

const pendingPaymentsInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

export const fetchPendingPayments = async (
  pg = 0,
  size = 10
): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
  const key = `${pg}-${size}`;

  if (pendingPaymentsInFlight.has(key)) return pendingPaymentsInFlight.get(key)!;

  const promise = (async () => {
    try {
      return await pageFetch("/payments/pending/page")(pg, size);
    } finally {
      pendingPaymentsInFlight.delete(key);
    }
  })();

  pendingPaymentsInFlight.set(key, promise);
  return promise;
};

const allPaymentsInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

export const fetchAllPayments = async (
  pg = 0,
  size = 10
): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
  const key = `${pg}-${size}`;

  if (allPaymentsInFlight.has(key)) return allPaymentsInFlight.get(key)!;

  const promise = (async () => {
    try {
      return await pageFetch("/payments/page")(pg, size);
    } finally {
      allPaymentsInFlight.delete(key);
    }
  })();

  allPaymentsInFlight.set(key, promise);
  return promise;
};

const tenantPaymentHistoryInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

export const fetchTenantPaymentHistoryPaged = async (
  tenantId: number,
  pg = 0,
  size = 10
): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
  const key = `${tenantId}-${pg}-${size}`;

  if (tenantPaymentHistoryInFlight.has(key)) return tenantPaymentHistoryInFlight.get(key)!;

  const promise = (async () => {
    try {
      return await pageFetch(`/payments/tenant/${tenantId}/page`)(pg, size);
    } finally {
      tenantPaymentHistoryInFlight.delete(key);
    }
  })();

  tenantPaymentHistoryInFlight.set(key, promise);
  return promise;
};

export const getAllTenantPaymentHistory = (tenantId: number): Promise<PaymentTransaction[]> =>
  fetchAllPages<PaymentTransaction>((pg, size) =>
    fetchTenantPaymentHistoryPaged(tenantId, pg, size)
  );

export const getTenantPaymentHistory = async (
  tenantId: number
): Promise<PaymentTransaction[]> =>
  (await fetchTenantPaymentHistoryPaged(tenantId, 0, 10)).content;

export const getPendingPayments = async (): Promise<PaymentTransaction[]> =>
  (await fetchPendingPayments(0, 10)).content;

export const getAllPayments = async (): Promise<PaymentTransaction[]> =>
  (await fetchAllPayments(0, 10)).content;

export const fetchMyNotifications = async (): Promise<AppNotification[]> =>
  (await api.get("/notifications")).data?.data ?? [];

export const getMyNotifications = fetchMyNotifications;

let unreadCountCache: { value: number; ts: number } | null = null;
let unreadCountInFlight: Promise<number> | null = null;
const UNREAD_CACHE_MS = 5000;

export const getUnreadNotificationCount = async (): Promise<number> => {
  const now = Date.now();

  if (unreadCountCache && now - unreadCountCache.ts < UNREAD_CACHE_MS) {
    return unreadCountCache.value;
  }

  if (unreadCountInFlight) return unreadCountInFlight;

  unreadCountInFlight = (async () => {
    try {
      const value = (await api.get("/notifications/unread-count")).data?.data?.count ?? 0;
      unreadCountCache = { value, ts: Date.now() };
      return value;
    } finally {
      unreadCountInFlight = null;
    }
  })();

  return unreadCountInFlight;
};

export const invalidateUnreadCountCache = (): void => {
  unreadCountCache = null;
};

export const markNotificationAsRead = async (id: number): Promise<AppNotification> => {
  const result = d(await api.put(`/notifications/${id}/read`));
  invalidateUnreadCountCache();
  return result;
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put("/notifications/read-all");
  invalidateUnreadCountCache();
};

export const deleteNotification = async (id: number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
  invalidateUnreadCountCache();
};

export const createNotification = async (
  data: NotificationRequest
): Promise<AppNotification[]> => { guard(); return d(await api.post("/notifications", data)); };

export const createTicket = async (data: TicketRequest): Promise<Ticket> => {
  if (getUserRole() !== "ADMIN") throw new Error("Only Admins can raise tickets");
  return d(await api.post("/tickets", data));
};

export const getMyTickets = async (): Promise<TicketSummary[]> =>
  d(await api.get("/tickets/my")) ?? [];

export const getAllTickets = async (filters?: {
  status?: TicketStatus;
  category?: TicketCategory;
}): Promise<TicketSummary[]> =>
  d(await api.get("/tickets", { params: filters })) ?? [];

export const getTicketStats = async (): Promise<TicketStats> =>
  d(await api.get("/tickets/stats"));

export const getTicketById = async (id: number): Promise<Ticket> =>
  d(await api.get(`/tickets/${id}`));

export const addTicketReply = async (id: number, data: TicketReplyRequest): Promise<Ticket> =>
  d(await api.post(`/tickets/${id}/replies`, data));

export const updateTicketStatus = async (
  id: number,
  data: TicketStatusUpdateRequest
): Promise<Ticket> => {
  guard();
  return d(await api.put(`/tickets/${id}/status`, data));
};

export const decideBedLimitRequest = async (
  id: number,
  data: BedLimitDecisionRequest
): Promise<Ticket> => {
  guard();
  return d(await api.put(`/tickets/${id}/bed-limit-decision`, data));
};

export type Expense = {
  id: number;
  branchId: number;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
};

export const fetchExpenses = async (): Promise<Expense[]> => {
  const res = await api.get("/expense/getAll");
  return res.data?.data ?? res.data ?? [];
};

export const getExpenses = fetchExpenses;

export const createExpense = async (data: Omit<Expense, "id">): Promise<Expense> => {
  guard();
  return d(await api.post("/expense/save", data));
};

export const deleteExpense = async (id: number): Promise<void> => {
  guard();
  await api.delete(`/expense/delete/${id}`);
};

export const updateExpense = async (id: number, data: Omit<Expense, "id">): Promise<Expense> => {
  guard();
  return d(await api.put(`/expense/update/${id}`, data));
};

export interface VisitorRequestData {
  tenantId?: number;
  name: string;
  phone: number;
  purpose: string;
  relationship: string;
  visitDate: string;
  expectedArrivalTime?: string;
  expectedExitTime?: string;
  status?: string;
}

export interface Visitor {
  id: number;
  visitorId?: number;
  tenantId: number;
  tenantName: string;
  tenantPhone: number;
  roomNumber: string;
  unitId?: number;
  unitName?: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  purpose: string;
  visitDate: string;
  expectedInTime: string;
  expectedExitTime?: string;
  status: VisitorStatus;
}

export type VisitorStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_IN" | "CHECKED_OUT";

const mapVisitorResponse = (res: any): Visitor => {
  return {
    id: res.visitorId ?? res.id,
    visitorId: res.visitorId ?? res.id,
    tenantId: res.tenantId,
    tenantName: res.tenantName || "Tenant",
    tenantPhone: res.tenantPhone || 0,
    roomNumber: res.roomNumber || "N/A",
    unitId: res.unitId,
    unitName: res.unitName,
    visitorName: res.name || res.visitorName || "",
    visitorPhone: String(res.phone || res.visitorPhone || ""),
    relation: res.relationship || res.relation || "Guest",
    purpose: res.purpose || "",
    visitDate: res.visitDate || "",
    expectedInTime: res.expectedArrivalTime || res.expectedInTime || "-",
    expectedExitTime: res.expectedExitTime || "-",
    status: (res.status || "PENDING") as VisitorStatus,
  };
};

export const fetchVisitorsForCurrentUser = async (branchId?: number): Promise<Visitor[]> => {
  const params: Record<string, any> = {};
  if (branchId && branchId > 0) {
    params.branchId = branchId;
  }
  const response = await api.get("/visitor/getAll", { params });
  const rawList = Array.isArray(response.data) ? response.data : response.data?.content || [];
  return rawList.map(mapVisitorResponse);
};

export const fetchBranchVisitors = async (branchId?: number): Promise<Visitor[]> => {
  return fetchVisitorsForCurrentUser(branchId);
};

export const fetchTenantVisitors = async (_tenantId?: number): Promise<Visitor[]> => {
  return fetchVisitorsForCurrentUser();
};

export const updateVisitorStatus = async (id: number, status: VisitorStatus): Promise<Visitor> => {
  const response = await api.put(`/visitor/status/${id}`, null, {
    params: { status },
  });
  return mapVisitorResponse(response.data);
};

export const getTenantId = (): number | null => {
  const tid = sessionStorage.getItem("tenantId");
  return tid ? Number(tid) : null;
};

export const requestVisitor = async (data: {
  branchId?: number;
  tenantId?: number;
  tenantName?: string;
  roomNumber?: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  visitDate: string;
  expectedInTime: string;
}): Promise<Visitor> => {

  const resolvedTenantId = data.tenantId || getTenantId();

  if (!resolvedTenantId) {
    throw new Error("Tenant ID not found in session. Please log in again.");
  }

  const numericPhone = parseInt(data.visitorPhone.replace(/\D/g, ""), 10) || 0;

  const payload: VisitorRequestData = {
    tenantId: resolvedTenantId,
    name: data.visitorName,
    phone: numericPhone,
    purpose: "Visiting Tenant",
    relationship: data.relation,
    visitDate: data.visitDate,
    expectedArrivalTime: data.expectedInTime ? `${data.expectedInTime}:00` : "09:00:00",
    status: "PENDING",
  };

  const response = await api.post("/visitor/save", payload);
  return mapVisitorResponse(response.data);
};

export const fetchMaintenanceCleaners = async (
  pg = 0,
  size = 10
): Promise<{ content: Cleaner[]; totalElements: number }> =>
  page(await api.get("/maintenance/cleaners", { params: { page: pg, size } }));

export const getMaintenanceCleaners = fetchMaintenanceCleaners;

export const getMaintenanceCleaner = async (id: number): Promise<Cleaner> =>
  d(await api.get(`/maintenance/cleaners/${id}`));

export const addMaintenanceCleaner = async (data: CleanerRequest): Promise<Cleaner> => {
  guard();
  return d(await api.post("/maintenance/cleaners", data));
};

export const updateMaintenanceCleaner = async (
  id: number,
  data: CleanerRequest
): Promise<Cleaner> => { guard(); return d(await api.put(`/maintenance/cleaners/${id}`, data)); };

export const deleteMaintenanceCleaner = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/maintenance/cleaners/${id}`); };

export const fetchMaintenanceTasks = async (
  pg = 0,
  size = 10
): Promise<{ content: MaintenanceTask[]; totalElements: number }> =>
  page(await api.get("/maintenance/tasks", { params: { page: pg, size } }));

export const getMaintenanceTasks = fetchMaintenanceTasks;

export const getMaintenanceTask = async (id: number): Promise<MaintenanceTask> =>
  d(await api.get(`/maintenance/tasks/${id}`));

export const createMaintenanceTask = async (data: MaintenanceRequest): Promise<MaintenanceTask> => {
  guard();
  return d(await api.post("/maintenance/tasks", data));
};

export const updateMaintenanceTask = async (
  id: number,
  data: MaintenanceRequest
): Promise<MaintenanceTask> => { guard(); return d(await api.put(`/maintenance/tasks/${id}`, data)); };

export const updateMaintenanceTaskStatus = async (
  id: number,
  status: CleaningStatus
): Promise<MaintenanceTask> => {
  guard();
  return d(await api.put(`/maintenance/tasks/${id}/status`, null, { params: { status } }));
};

export const deleteMaintenanceTask = async (id: number): Promise<void> =>
  { guard(); await api.delete(`/maintenance/tasks/${id}`); };

export const getMaintenanceRecords = async (
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<MaintenanceTask[]> =>
  d(await api.get("/maintenance/records", { params: { period } }));

export const getMaintenanceRecordsByRange = async (
  from: string,
  to: string
): Promise<MaintenanceTask[]> =>
  d(await api.get("/maintenance/records/range", { params: { from, to } }));

export const getCurrentRoomCleaningStatus = async (): Promise<MaintenanceTask[]> =>
  d(await api.get("/maintenance/rooms/status"));

export const getMaintenanceDashboard = async (): Promise<MaintenanceDashboardStats> =>
  d(await api.get("/maintenance/dashboard"));

export const getBranchWiseCleaningReport = async (): Promise<BranchCleaningSummary[]> =>
  d(await api.get("/maintenance/reports/branch-wise"));

export const getPendingCleaningReport = async (): Promise<MaintenanceTask[]> =>
  d(await api.get("/maintenance/reports/pending"));

export const getCleanerPerformanceReport = async (
  period: "daily" | "weekly" | "monthly" = "monthly"
): Promise<CleanerWorkSummary[]> =>
  d(await api.get("/maintenance/reports/cleaner-performance", { params: { period } }));

const downloadFile = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const exportBranchWiseCleaningReport = (format: "excel" | "pdf" = "excel") =>
  downloadFile(
    `/maintenance/reports/branch-wise/export?format=${format}`,
    `branch-wise-cleaning-report.${format === "pdf" ? "pdf" : "xlsx"}`
  );

export const exportPendingCleaningReport = (format: "excel" | "pdf" = "excel") =>
  downloadFile(
    `/maintenance/reports/pending/export?format=${format}`,
    `pending-cleaning-report.${format === "pdf" ? "pdf" : "xlsx"}`
  );

export const exportCleanerPerformanceReport = (
  format: "excel" | "pdf" = "excel",
  period: "daily" | "weekly" | "monthly" = "monthly"
) =>
  downloadFile(
    `/maintenance/reports/cleaner-performance/export?format=${format}&period=${period}`,
    `cleaner-performance-report.${format === "pdf" ? "pdf" : "xlsx"}`
  );

export const publicRegisterTenant = async (data: TenantRequest | FormData): Promise<Tenant> => {
  return d(await api.post("/tenants/public-register", data));
};