import { setUserProfile, setUserPermissions} from "./auth";
import api from "./api";
import {
  Room, Bed, EBReading, Rent, Tenant, Flat, FlatRequest, Role,
  PaymentMode, TenantEBBill, Branch, BranchRequest, TenantRequest,
  LoginResponse, User, Complaint, ComplaintStatus, FoodTimetable,
  FoodTimetableRequest, Announcement, AnnouncementRequest, Admin,
  AdminPageResponse, AdminRequest, RegisterUserRequest,
  Hostel, HostelRequest, PaymentTransaction,BranchCleaningSummary,
  PermissionCatalogItem, UserPermissionsResponse,CleaningStatus,
  RuleRegulation, RuleRegulationRequest,
  AppNotification, NotificationRequest,
  Ticket, TicketSummary, TicketStats, TicketRequest, TicketReplyRequest,
  TicketStatusUpdateRequest, BedLimitDecisionRequest, TicketStatus, TicketCategory,
  MaintenanceDashboardStats, Cleaner, MaintenanceTask,CleanerWorkSummary,MaintenanceRequest,CleanerRequest,
} from "./types";

/* ── Shared helpers ───────────────────────────────────────────────────── */

export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  await api.put("/users/me/change-password", { oldPassword, newPassword });
};


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
  if (!["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"].includes(role))
    throw new Error("Access denied");
};

/** Throw if the current user isn't ADMIN/SUPER_ADMIN — used by ADMIN-only writes
    such as Rules & Regulations create/edit/delete. Backend re-checks this too. */
const adminGuard = () => {
  const role = getUserRole();
  if (!["SUPER_ADMIN", "ADMIN"].includes(role))
    throw new Error("Only Admin users can perform this action");
};

/* ── Responsible contact (who to ask for permissions) ─────────────────
   Used by AppLayout's "no permissions assigned" screen. Fails silently
   (returns null) so the UI falls back to the generic role-based text
   if the lookup errors out for any reason. */
export const getResponsibleContact = async (): Promise<import("./types").ResponsibleContact | null> => {
  try {
    return d(await api.get("/users/me/responsible-contact"));
  } catch {
    return null;
  }
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

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const res = d(await api.post("/auth/login", { email, password }));
  sessionStorage.setItem("token", res.token);
  sessionStorage.setItem("refreshToken", res.refreshToken);
  sessionStorage.setItem("role", res.role);

  if (res.branchId != null) sessionStorage.setItem("branchId", String(res.branchId));

  // FIX: the backend now resolves and returns tenantId directly in the
  // login response for TENANT-role accounts (AuthResponse.tenantId ->
  // tenant.user_id). Use it immediately via the existing cache helper
  // instead of clearing it and forcing resolveTenantId() to make a
  // separate /dashboard/tenant round-trip the first time it's needed.
  // For non-TENANT roles, res.tenantId will be null/absent, so we clear
  // any stale value from a previous session instead.
  if (res.tenantId != null) {
    setCachedTenantId(res.tenantId);
  } else {
    sessionStorage.removeItem("tenantId");
    sessionStorage.removeItem("tenantIdToken");
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

/* ── My Profile (cached + de-duplicated) ──────────────────────────────── */

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

  // Reuse the in-flight request for the same token, regardless of
  // whether profileCache has been populated yet (it hasn't, on the
  // very first concurrent calls — that's the bug this guard fixes).
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

export const updateMyProfile = async (data: { name: string; phone: string }): Promise<User> => {
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

/* ── Tenant identity (cached + token-bound) ───────────────────────────── */

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

/** Creates ONE individual Bed row under a room (backend numbers it
 *  sequentially per room). Call this in a loop — e.g. from RoomsPage's
 *  seedBedsForRoom() — to seed a newly created room's beds to match the
 *  bed count chosen in the Add Room form (1 · Single / 2 · Double /
 *  3 · Triple / 4 · Quad, or a custom number). Without this, a room's
 *  `totalBeds` was just a number on the Room row with no real Bed
 *  records behind it — which is why bed drill-down views could show
 *  "No beds created" for rooms that otherwise looked fully set up. */
export const createBed = async (roomId: number): Promise<Bed> =>
  { guard(); return d(await api.post(`/beds/room/${roomId}`)); };

/** All bed rows that already exist under a specific room. Used on Room
 *  Edit to reconcile the actual Bed rows to a new desired bed count —
 *  see RoomsPage's reconcileBedsForRoom(). */
export const getBedsByRoom = async (
  roomId: number,
  pg = 0,
  size = 100
): Promise<Bed[]> => d(await api.get(`/beds/room/${roomId}`, { params: { page: pg, size } }));

/** Deletes a single bed by id — used when a room's bed count is reduced
 *  on Edit. Callers should only ever pass a bed that's confirmed vacant
 *  (isOccupied === false); the backend does not itself refuse to delete
 *  an occupied bed, so that check must happen client-side first. */
export const deleteBed = async (bedId: number): Promise<void> =>
  { guard(); await api.delete(`/beds/${bedId}`); };

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

/* ── Hostels (parent of Branches) ────────────────────────────────────────
   FIX (duplicate network calls): React.StrictMode double-invokes effects
   in development. In-flight map collapses concurrent identical calls. */

const hostelsInFlight = new Map<string, Promise<{ content: Hostel[]; totalElements: number }>>();

export const fetchHostels = async (pg = 0, size = 10): Promise<{ content: Hostel[]; totalElements: number }> => {
  const key = `${pg}-${size}`;

  if (hostelsInFlight.has(key)) return hostelsInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await api.get("/hostels", { params: { page: pg, size } });
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

/** Dedicated status-change call for HostelAdminPage's row "More" menu
 *  (Mark Active / Mark Inactive / Suspend Hostel).
 *
 *  FIX: this previously called PATCH /hostels/{id}/status with a JSON
 *  body, which 404'd — the merged Hostel+Admin workflow (and its status
 *  action) lives on SuperAdminController at /api/super-admin/hostels,
 *  NOT the plain /hostels controller, and the backend endpoint is a PUT
 *  that takes `status` as a query param, not a JSON body. That mismatch
 *  is exactly what produced:
 *    NoResourceFoundException: No static resource api/hostels/2/status
 *  because Spring had no mapping at all for that path, and fell through
 *  to the static-resource resolver.
 *
 *  Now correctly hits PUT /super-admin/hostels/{id}/status?status=...
 *  (see SuperAdminController#updateHostelStatus /
 *  SuperAdminServiceImpl#updateHostelStatus), and returns the enriched
 *  HostelAdmin shape (with admin fields) that HostelAdminPage.tsx's
 *  handleStatusChange/loadData actually expect — not a bare Hostel. */
export const updateHostelStatus = async (
  id: number,
  status: import("./types").HostelStatus
): Promise<import("./types").HostelAdmin> => {
  guard();
  return d(await api.put(`/super-admin/hostels/${id}/status`, null, { params: { status } }));
};

export const getSuperAdminDashboard = async (): Promise<import("./types").SuperAdminDashboard> =>
  (await api.get("/super-admin/dashboard")).data.data;

/* ── Merged Hostel + Admin (single /super-admin/hostels screen) ────────
   Replaces the old two-step flow (create Hostel on /hostels, then
   create/assign an Admin on /super-admin/admins) with one screen and
   one form that creates/updates both together in a single request. ── */

const hostelAdminsInFlight = new Map<string, Promise<import("./types").HostelAdminPageResponse>>();

export const getAllHostelsWithAdmins = async (
  pg = 0,
  size = 50
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

/* ── Branches / Units ─────────────────────────────────────────────────── */

export const fetchBranches = async (pg = 0, size = 10): Promise<{ content: Branch[]; totalElements: number }> => {
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

/* ── WhatsApp ─────────────────────────────────────────────────────────── */

export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
  guard();
  if (!roomNumber) throw new Error("Room number is required");
  return d(await api.post("/whatsapp/send-eb-bill", { roomNumber }));
};

/* ── Dashboard ────────────────────────────────────────────────────────── */

export const getDashboard = async () => d(await api.get("/dashboard"));

/* ── Complaints ───────────────────────────────────────────────────────── */

export const createComplaint = async (data: { subject: string; description: string }): Promise<Complaint> => {
  if (getUserRole() !== "TENANT") throw new Error("Only tenants can create complaints");
  return (await api.post("/complaints", data)).data;
};

export const getMyComplaints = async (): Promise<Complaint[]> => {
  if (getUserRole() !== "TENANT") throw new Error("Access denied");
  return (await api.get("/complaints/my")).data ?? [];
};

export const getAllComplaints = async (): Promise<Complaint[]> =>
  (await api.get("/complaints")).data ?? [];

export const updateComplaintStatus = async (id: number, status: ComplaintStatus): Promise<Complaint> =>
  (await api.put(`/complaints/${id}/status`, null, { params: { status } })).data;

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

/* ── Rules & Regulations ─────────────────────────────────────────────────
   View is open to ADMIN, WARDEN and TENANT (server filters WARDEN/TENANT
   down to published rules only). Create/Edit/Delete are ADMIN-only —
   guarded server-side via @PreAuthorize; guard() below just avoids a
   pointless round-trip for roles that can never succeed. */
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

/* =====================================================
   SUPER ADMIN API
===================================================== */

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

/* =====================================================
   HIERARCHICAL RBAC — PERMISSIONS API
   SUPER_ADMIN → assigns permissions to ADMIN
   ADMIN       → assigns permissions to WARDEN and TENANT
   WARDEN      → assigns permissions to TENANT
   A user can only ever grant a subset of what they hold themselves.
===================================================== */

/** Every permission that exists in the system (for building a full reference list). */
export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> =>
  d(await api.get("/permissions/catalog"));

let assignablePermissionsInFlight: Promise<PermissionCatalogItem[]> | null = null;

/** Permissions the logged-in user is allowed to hand down to a subordinate. */
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

/** A specific user's role + current permission catalog (with `granted` flags). */
export const getUserPermissions = async (userId: number): Promise<UserPermissionsResponse> =>
  d(await api.get(`/permissions/user/${userId}`));

/** Replace a subordinate user's permission set. Send the full desired set (not a diff). */
export const assignUserPermissions = async (
  userId: number,
  permissions: string[]
): Promise<UserPermissionsResponse> =>
  d(await api.put(`/permissions/user/${userId}`, { permissions }));

/* ── Users ────────────────────────────────────────────────────────────── */

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
export const updateUser   = async (id: number, data: RegisterUserRequest): Promise<User> =>
  { guard(); return d(await api.put(`/users/${id}`, data)); };

/* ── Payments ─────────────────────────────────────────────────────────── */

/** Tenant's own rents (used for "Pending Dues" on PaymentsPage).
 *  In-flight map collapses duplicate concurrent calls (e.g. React
 *  StrictMode double-invoking the effect in TenantPayments) into a
 *  single network request per tenantId. */
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

/** Tenant submits a payment (rentId/amount/mode/proof) for verification. */
export const submitPayment = async (data: FormData): Promise<PaymentTransaction> =>
  d(await api.post("/payments/submit", data));

/** Approve a pending payment — applies it to the tenant's rent. */
export const approvePayment = async (id: number): Promise<PaymentTransaction> =>
  d(await api.put(`/payments/${id}/approve`));

/** Reject a pending payment with a reason shown to the tenant. */
export const rejectPayment = async (
  id: number,
  remarks: string
): Promise<PaymentTransaction> => d(await api.put(`/payments/${id}/reject`, { remarks }));

/* ── Payments (Paginated + de-duplicated) ─────────────────────────────
   FIX: the backend controller/service only expose the paginated routes
   /payments/pending/page, /payments/page, /payments/tenant/{id}/page —
   the older non-paginated /payments/pending, /payments,
   /payments/tenant/{id} routes were removed entirely from the service
   interface (only Page<> methods remain in PaymentTransactionServiceImpl,
   see getHistoryForTenant/getAllForApprover/getPendingForApprover, all
   of which now require a Pageable argument).

   Calling the old plain routes therefore 404s — Spring has no
   @GetMapping left to match "/payments/tenant/4", so it falls through
   to the static resource resolver, surfacing as:
     NoResourceFoundException: No static resource api/payments/tenant/4
   which is exactly the "Failed to load payment history" toast seen on
   TenantPayments.

   Fix: every payments fetcher below — paginated or "flat list" —
   ultimately calls one of the three /page routes. Nothing calls a
   non-page payments URL anymore. In-flight maps (same pattern as
   fetchHostels/getAllAdmins) collapse StrictMode's duplicate mount
   calls into a single network request per unique page/size/tenantId. */

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

/** Paginated tenant payment history (for a specific tenant, one page at a time). */
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

/** Fetch a tenant's entire payment history across all pages (uses fetchAllPages<T>). */
export const getAllTenantPaymentHistory = (tenantId: number): Promise<PaymentTransaction[]> =>
  fetchAllPages<PaymentTransaction>((pg, size) =>
    fetchTenantPaymentHistoryPaged(tenantId, pg, size)
  );

/** Used by TenantPayments — expects a plain array. A tenant's own
 *  history is always small, so a single size=100 page through the
 *  route that actually exists on the backend covers it in one call. */
export const getTenantPaymentHistory = async (
  tenantId: number
): Promise<PaymentTransaction[]> =>
  (await fetchTenantPaymentHistoryPaged(tenantId, 0, 10)).content;

/** Back-compat aliases for any code still importing the old plain-list
 *  names — both now route through the /page endpoints under the hood. */
export const getPendingPayments = async (): Promise<PaymentTransaction[]> =>
  (await fetchPendingPayments(0, 10)).content;

export const getAllPayments = async (): Promise<PaymentTransaction[]> =>
  (await fetchAllPayments(0, 10)).content;

/* ── Notifications ─────────────────────────────────────────────────────── */

export const fetchMyNotifications = async (): Promise<AppNotification[]> =>
  (await api.get("/notifications")).data?.data ?? [];

export const getMyNotifications = fetchMyNotifications;

export const getUnreadNotificationCount = async (): Promise<number> =>
  (await api.get("/notifications/unread-count")).data?.data?.count ?? 0;

export const markNotificationAsRead = async (id: number): Promise<AppNotification> =>
  d(await api.put(`/notifications/${id}/read`));

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put("/notifications/read-all");
};

export const deleteNotification = async (id: number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};

/** Admin/Warden: send a custom notification/message to their branch's tenants (or another role). */
export const createNotification = async (
  data: NotificationRequest
): Promise<AppNotification[]> => { guard(); return d(await api.post("/notifications", data)); };



/* ── Raise Ticket module (Admin ↔ Super Admin) ──────────────────────────
   ADMIN raises tickets (incl. Bed Size / Bed Limit Increase requests) and
   sees only their own; SUPER_ADMIN sees every ticket across every hostel,
   updates status, decides bed-limit requests, and replies. Both roles can
   reply on a ticket they're allowed to view. ──────────────────────────── */

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

/* ── Expenses ─────────────────────────────────────────────────────────── */

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
  guard(); // Enforces write permissions check
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

export type VisitorStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_IN" | "CHECKED_OUT";

export interface Visitor {
  id: number;
  branchId: number;
  tenantId: number;
  tenantName: string;
  roomNumber: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  visitDate: string;        // "YYYY-MM-DD"
  expectedInTime: string;   // "HH:mm"
  checkInTime?: string;
  checkOutTime?: string;
  status: VisitorStatus;
  remarks?: string;
}

/* ── Visitor Management ────────────────────────────────────────────────── */

/** Tenant: Submit a visitor entry request */
export const requestVisitor = async (
  data: Omit<Visitor, "id" | "status">
): Promise<Visitor> => {
  return d(await api.post("/visitors/request", data));
};

/** Warden/Admin: Fetch all visitor records for a specific branch */
export const fetchBranchVisitors = async (branchId: number): Promise<Visitor[]> => {
  const res = await api.get(`/visitors/branch/${branchId}`);
  return res.data?.data ?? res.data ?? [];
};

/** Tenant: Fetch visitor request history for the logged-in tenant */
export const fetchTenantVisitors = async (tenantId: number): Promise<Visitor[]> => {
  const res = await api.get(`/visitors/tenant/${tenantId}`);
  return res.data?.data ?? res.data ?? [];
};

/** Warden/Admin: Update visitor status (APPROVE, REJECT, CHECKED_IN, CHECKED_OUT) */
export const updateVisitorStatus = async (
  id: number,
  status: VisitorStatus,
  remarks?: string
): Promise<Visitor> => {
  guard();
  const res = await api.put(`/visitors/${id}/status`, null, {
    params: { status, remarks }
  });
  return res.data?.data ?? res.data;
};




// ── Cleaners CRUD ──
export const getMaintenanceCleaners = async (): Promise<Cleaner[]> =>
  d(await api.get("/maintenance/cleaners"));

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

// ── Tasks CRUD ──
export const getMaintenanceTasks = async (): Promise<MaintenanceTask[]> =>
  d(await api.get("/maintenance/tasks"));

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

// ── Records / room status ──
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

// ── Dashboard + reports ──
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

// ── Exports ──
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