// import { setUserProfile, setUserPermissions} from "./auth";
// import api from "./api";
// import {
//   Room, Bed, EBReading, Rent, Tenant, Flat, FlatRequest, Role,
//   PaymentMode, TenantEBBill, Branch, BranchRequest, TenantRequest,
//   LoginResponse, User, Complaint, ComplaintStatus, FoodTimetable,
//   FoodTimetableRequest, Announcement, AnnouncementRequest, Admin,
//   AdminPageResponse, AdminRequest, RegisterUserRequest, UpdateUserRequest,
//   Hostel, HostelRequest, PaymentTransaction,BranchCleaningSummary,
//   PermissionCatalogItem, UserPermissionsResponse,CleaningStatus,
//   RuleRegulation, RuleRegulationRequest,
//   AppNotification, NotificationRequest,
//   Ticket, TicketSummary, TicketStats, TicketRequest, TicketReplyRequest,
//   TicketStatusUpdateRequest, BedLimitDecisionRequest, TicketStatus, TicketCategory,
//   MaintenanceDashboardStats, Cleaner, MaintenanceTask,CleanerWorkSummary,MaintenanceRequest,CleanerRequest,
//   HostelStatus,AddOnBedsRequest,
// } from "./types";


// export const addOnBeds = async (data: AddOnBedsRequest): Promise<Subscription> =>
//   d(await api.post("/subscriptions/my/add-on-beds", data));

// /* ── Shared helpers ───────────────────────────────────────────────────── */

// export const changePassword = async (
//   oldPassword: string,
//   newPassword: string
// ): Promise<void> => {
//   await api.put("/users/me/change-password", { oldPassword, newPassword });
// };


// /** Unwrap paginated API response into a consistent shape. */
// const page = (res: any) => ({
//   content:       res.data?.data?.content ?? res.data?.content ?? [],
//   totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
// });

// /** Unwrap `.data.data` from any response. */
// const d = (res: any) => res.data.data;

// /** Throw if the current user lacks write access. */
// const guard = () => {
//   const role = getUserRole();
//   if (!["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"].includes(role))
//     throw new Error("Access denied");
// };

// /** Throw if the current user isn't ADMIN/SUPER_ADMIN — used by ADMIN-only writes
//     such as Rules & Regulations create/edit/delete. Backend re-checks this too. */
// const adminGuard = () => {
//   const role = getUserRole();
//   if (!["SUPER_ADMIN", "ADMIN"].includes(role))
//     throw new Error("Only Admin users can perform this action");
// };

// /* ── Responsible contact (who to ask for permissions) ─────────────────
//    Used by AppLayout's "no permissions assigned" screen. Fails silently
//    (returns null) so the UI falls back to the generic role-based text
//    if the lookup errors out for any reason. */
// export const getResponsibleContact = async (): Promise<import("./types").ResponsibleContact | null> => {
//   try {
//     return d(await api.get("/users/me/responsible-contact"));
//   } catch {
//     return null;
//   }
// };

// /** Fetch every page of a paginated endpoint and return all items. */
// export async function fetchAllPages<T>(
//   fetcher: (page: number, size: number) => Promise<{ content: T[]; totalElements: number }>,
//   pageSize = 10
// ): Promise<T[]> {
//   const first = await fetcher(0, pageSize);
//   if (first.totalElements <= pageSize) return first.content;
//   const rest = await Promise.all(
//     Array.from({ length: Math.ceil(first.totalElements / pageSize) - 1 }, (_, i) =>
//       fetcher(i + 1, pageSize)
//     )
//   );
//   return [...first.content, ...rest.flatMap((r) => r.content)];
// }

// /* ── Auth ─────────────────────────────────────────────────────────────── */

// export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
//   const res = d(await api.post("/auth/login", { email, password }));
//   sessionStorage.setItem("token", res.token);
//   sessionStorage.setItem("refreshToken", res.refreshToken);
//   sessionStorage.setItem("role", res.role);

//   if (res.branchId != null) sessionStorage.setItem("branchId", String(res.branchId));

//   // The backend resolves and returns tenantId directly in the login
//   // response for TENANT-role accounts (AuthResponse.tenantId ->
//   // tenant.user_id). Use it immediately via the existing cache helper
//   // instead of clearing it and forcing resolveTenantId() to make a
//   // separate /dashboard/tenant round-trip the first time it's needed.
//   // For non-TENANT roles, res.tenantId will be null/absent, so we clear
//   // any stale value from a previous session instead.
//   if (res.tenantId != null) {
//     setCachedTenantId(res.tenantId);
//   } else {
//     sessionStorage.removeItem("tenantId");
//     sessionStorage.removeItem("tenantIdToken");
//   }

//   // ── Subscription expiry gating (ADMIN only) ──
//   // Cached immediately so route guards (ProtectedRoute / AppLayout) can
//   // check it synchronously without waiting on a /subscriptions/me call.
//   // Cleared on logout via clearSubscriptionExpiredFlag().
//   if (res.subscriptionExpired != null) {
//     sessionStorage.setItem("subscriptionExpired", String(res.subscriptionExpired));
//   } else {
//     sessionStorage.removeItem("subscriptionExpired");
//   }

//   // ── NEW: hostel operational status gating (ADMIN/WARDEN/TENANT) ──
//   // Cached immediately, same pattern as subscriptionExpired, so route
//   // guards can redirect to a "profile only" view for a non-ACTIVE
//   // hostel without an extra round-trip. Null for SUPER_ADMIN.
//   if (res.hostelStatus != null) {
//     sessionStorage.setItem("hostelStatus", res.hostelStatus);
//   } else {
//     sessionStorage.removeItem("hostelStatus");
//   }

//   setUserProfile({
//     email: res.email,
//     name: res.name,
//     phone: res.phone,
//     userId: res.userId ?? null,
//     hostelId: res.hostelId ?? null,
//     hostelName: res.hostelName ?? null,
//   });
//   return res;
// };

// /* ── My Profile (cached + de-duplicated) ──────────────────────────────── */

// let profileCache: { data: User; ts: number; token: string | null } | null = null;
// let profileInFlight: Promise<User> | null = null;
// let profileInFlightToken: string | null = null;
// const PROFILE_CACHE_MS = 30_000;

// export const getMyProfile = async (forceRefresh = false): Promise<User> => {
//   const currentToken = sessionStorage.getItem("token");
//   const now = Date.now();

//   const cacheValid =
//     !forceRefresh &&
//     profileCache !== null &&
//     profileCache.token === currentToken &&
//     now - profileCache.ts < PROFILE_CACHE_MS;

//   if (cacheValid) {
//     return profileCache!.data;
//   }

//   // Reuse the in-flight request for the same token, regardless of
//   // whether profileCache has been populated yet (it hasn't, on the
//   // very first concurrent calls — that's the bug this guard fixes).
//   if (!forceRefresh && profileInFlight && profileInFlightToken === currentToken) {
//     return profileInFlight;
//   }

//   profileInFlightToken = currentToken;
//   profileInFlight = (async () => {
//     try {
//       const data = await d(await api.get("/users/me"));
//       profileCache = { data, ts: Date.now(), token: currentToken };
//       setUserPermissions(data.permissions ?? []);
//       return data;
//     } finally {
//       profileInFlight = null;
//       profileInFlightToken = null;
//     }
//   })();

//   return profileInFlight;
// };

// // NOTE: matches backend UpdateUserRequest — email/password are optional.
// // Leave password blank/undefined to keep the current password unchanged.
// export const updateMyProfile = async (data: {
//   name: string;
//   phone: string;
//   email?: string;
//   password?: string;
// }): Promise<User> => {
//   const updated = d(await api.put("/users/me", data));
//   profileCache = null;
//   return updated;
// };

// export const getUserRole = (): Role => {
//   const role = sessionStorage.getItem("role");
//   return (["SUPER_ADMIN", "ADMIN", "WARDEN", "TENANT"].includes(role!)
//     ? role
//     : "WARDEN") as Role;
// };

// export const isTokenExpired = (token?: string): boolean => {
//   if (!token) return true;
//   try {
//     return Date.now() >= JSON.parse(atob(token.split(".")[1])).exp * 1000;
//   } catch {
//     return true;
//   }
// };

// /* ── Subscription / Billing (ADMIN only) ─────────────────────────────────
//    Backed by SubscriptionController on the server (/api/subscriptions/**).
//    These three endpoints are always reachable even when the ADMIN's
//    subscription has expired — every other endpoint is blocked server-side
//    by SubscriptionAccessFilter, which responds 402 with
//    { code: "SUBSCRIPTION_EXPIRED" }. Wire a response interceptor in api.ts
//    to catch that code and redirect to /subscription. */

// export interface Subscription {
//   hostelId: number;
//   hostelName: string;
//   planName: string;
//   amountPaid: number;
//   durationMonths: number;
//   durationLabel: string;
//   startDate: string | null;
//   endDate: string | null;
//   status: "ACTIVE" | "EXPIRED";
//   daysRemaining: number;
//   expiringSoon: boolean;
//   renewalRequired: boolean;
//   renewalStatus: string;

//   // ── NEW: Additional Bed Request (mirrors SubscriptionResponse.java) ──
//   currentPlanBedLimit: number;
//   additionalBedsRequested: number;
//   pricePerAdditionalBed: number;
//   additionalBedAmount: number;
//   totalSubscriptionAmount: number;
// }

// export interface SubscriptionPayment {
//   id: number;
//   planName: string;
//   amount: number;
//   durationMonths: number;
//   paymentDate: string;
//   cycleStartDate: string;
//   cycleEndDate: string;
//   paymentMode: string;
//   remarks?: string | null;

//   // ── NEW: additional-bed charge breakdown, shown separately on receipts ──
//   additionalBedsRequested: number;
//   pricePerAdditionalBed: number;
//   additionalBedAmount: number;
//   totalSubscriptionAmount: number;
// }

// export interface SubscriptionRenewRequest {
//   planName: string;
//   amount: number;
//   durationMonths: number;
//   paymentMode?: string;
//   remarks?: string;

//   // ── NEW: optional — omit or leave undefined for a plain renewal with no additional beds ──
//   additionalBedsRequested?: number;
//   pricePerAdditionalBed?: number;
// }

// /** Current billing cycle for the logged-in ADMIN's hostel. */
// export const getMySubscription = async (): Promise<Subscription> =>
//   d(await api.get("/subscriptions/me"));

// /** Full renewal/payment history for the logged-in ADMIN's hostel, most recent first. */
// export const getMySubscriptionHistory = async (): Promise<SubscriptionPayment[]> =>
//   d(await api.get("/subscriptions/me/history"));

// /** Record a renewal payment — extends (or reactivates) the subscription and restores access. */
// export const renewMySubscription = async (
//   data: SubscriptionRenewRequest
// ): Promise<Subscription> => {
//   const updated = d(await api.post("/subscriptions/me/renew", data));
//   // Access has been restored — clear the cached expiry flag immediately
//   // so route guards stop redirecting to /subscription on this device.
//   sessionStorage.setItem("subscriptionExpired", "false");
//   return updated;
// };

// /** Synchronous, session-cached read of the flag set at login — use this
//  *  for instant route-guard decisions. It can go stale during a long
//  *  session (an active subscription can expire mid-session), so pages
//  *  that show subscription details should still call getMySubscription(). */
// export const isSubscriptionExpiredCached = (): boolean =>
//   sessionStorage.getItem("subscriptionExpired") === "true";

// export const clearSubscriptionExpiredFlag = (): void => {
//   sessionStorage.removeItem("subscriptionExpired");
// };

// /* ── Hostel operational status (ADMIN/WARDEN/TENANT) ───────────────────
//    Synchronous, session-cached read of the flag set at login — same
//    pattern/caveats as isSubscriptionExpiredCached above: usable for
//    instant route-guard decisions, but can go stale mid-session if a
//    SUPER_ADMIN changes the hostel's status while this user is logged in. */

// export const getCachedHostelStatus = (): HostelStatus | null =>
//   (sessionStorage.getItem("hostelStatus") as HostelStatus | null) ?? null;

// export const isHostelInactiveCached = (): boolean => {
//   const status = getCachedHostelStatus();
//   return status !== null && status !== "ACTIVE";
// };

// export const clearHostelStatusFlag = (): void => {
//   sessionStorage.removeItem("hostelStatus");
// };

// /* ── Tenant identity (cached + token-bound) ───────────────────────────── */

// export const getCachedTenantId = (): number | null => {
//   const currentToken = sessionStorage.getItem("token");
//   const cachedToken   = sessionStorage.getItem("tenantIdToken");
//   const cachedId      = Number(sessionStorage.getItem("tenantId") || 0);

//   if (cachedId && cachedToken === currentToken) return cachedId;
//   return null;
// };

// export const setCachedTenantId = (tenantId: number): void => {
//   sessionStorage.setItem("tenantId", String(tenantId));
//   sessionStorage.setItem("tenantIdToken", sessionStorage.getItem("token") ?? "");
// };

// let tenantIdInFlight: Promise<number | null> | null = null;

// export const resolveTenantId = async (): Promise<number | null> => {
//   const cached = getCachedTenantId();
//   if (cached) return cached;

//   if (tenantIdInFlight) return tenantIdInFlight;

//   tenantIdInFlight = (async () => {
//     try {
//       const res = await api.get("/dashboard/tenant");
//       const tid = res.data?.data?.tenantId ?? res.data?.tenantId ?? null;
//       if (tid) setCachedTenantId(tid);
//       return tid;
//     } finally {
//       tenantIdInFlight = null;
//     }
//   })();

//   return tenantIdInFlight;
// };

// /* ── Generic paginated fetcher factory ───────────────────────────────── */

// const pageFetch = (path: string) =>
//   async (pg = 0, size = 10) => page(await api.get(path, { params: { page: pg, size } }));

// /* ── Rooms ────────────────────────────────────────────────────────────── */

// export const fetchRooms = pageFetch("/rooms");
// export const getRooms   = fetchRooms;

// export const createRoom = async (data: {
//   roomNumber: string; hostelType: string; totalBeds: number;
//   rentPerBed: number; unitId: number; flatId?: number | null;
// }): Promise<Room> => { guard(); return d(await api.post("/rooms", data)); };

// export const editRoom   = async (roomId: number, data: Partial<Room>): Promise<Room> =>
//   { guard(); return d(await api.put(`/rooms/${roomId}`, data)); };

// export const removeRoom = async (roomId: number): Promise<void> =>
//   { guard(); await api.delete(`/rooms/${roomId}`); };

// /* ── Beds ─────────────────────────────────────────────────────────────── */

// export const fetchBeds = pageFetch("/beds");
// export const getBeds   = fetchBeds;

// export const updateBedStatus = async (bedId: number, isOccupied: boolean): Promise<Bed> =>
//   { guard(); return d(await api.put(`/beds/${bedId}`, { occupied: isOccupied })); };

// export const createBed = async (roomId: number): Promise<Bed> =>
//   { guard(); return d(await api.post(`/beds/room/${roomId}`)); };

// export const getBedsByRoom = async (
//   roomId: number,
//   pg = 0,
//   size = 100
// ): Promise<Bed[]> => d(await api.get(`/beds/room/${roomId}`, { params: { page: pg, size } }));

// export const deleteBed = async (bedId: number): Promise<void> =>
//   { guard(); await api.delete(`/beds/${bedId}`); };

// /* ── Tenants ──────────────────────────────────────────────────────────── */

// export const fetchTenants = pageFetch("/tenants");
// export const getTenants   = fetchTenants;

// export const getActiveTenants = async (pg = 0, size = 10): Promise<Tenant[]> =>
//   (await fetchTenants(pg, size)).content.filter((t: Tenant) => t.status === "Active");

// export const getActiveTenantsByRoom = async (roomId: number): Promise<Tenant[]> =>
//   (await getActiveTenants()).filter((t) => Number(t.roomId) === Number(roomId));

// export const addTenant = async (data: TenantRequest | FormData): Promise<Tenant> =>
//   { guard(); return d(await api.post("/tenants", data)); };

// export const importTenantsExcel = async (file: File): Promise<string> => {
//   guard();
//   const fd = new FormData();
//   fd.append("file", file);
//   return d(await api.post("/tenants/import", fd));
// };

// export const deleteTenant = async (tenantId: number | string): Promise<void> => {
//   guard();
//   if (!tenantId) throw new Error("Invalid tenant ID");
//   await api.delete(`/tenants/${tenantId}`);
// };

// export const checkoutTenant = async (
//   tenantId: number,
//   currentReading?: number | null,
//   acFinalReading?: number | null
// ): Promise<Tenant> => {
//   guard();
//   return d(await api.put(`/tenants/${tenantId}/checkout`, {
//     finalReading: currentReading ?? null,
//     acFinalReading: acFinalReading ?? null,
//   }));
// };

// export const updateTenant = async (
//   tenantId: number | string, data: TenantRequest | FormData
// ): Promise<Tenant> => d(await api.put(`/tenants/${tenantId}`, data));

// /* ── EB Readings ──────────────────────────────────────────────────────── */

// export const fetchEBReadings = pageFetch("/eb-readings");
// export const getEBReadings   = fetchEBReadings;

// export const addEBReading = async (data: EBReading): Promise<EBReading> =>
//   { guard(); return d(await api.post("/eb-readings", data)); };

// export const updateEBReading = async (id: string, data: Partial<EBReading>): Promise<EBReading> =>
//   { guard(); return d(await api.put(`/eb-readings/${id}`, data)); };

// export const deleteEBReading = async (id: string): Promise<void> =>
//   { guard(); await api.delete(`/eb-readings/${id}`); };

// /* ── Rents ────────────────────────────────────────────────────────────── */

// export const fetchRents = pageFetch("/rents");
// export const getRents   = fetchRents;

// export const generateRent = async (data: {
//   tenantId: string; roomId: string; rentMonth: number;
//   rentYear: number; rentAmount: number; ebAmount: number;
// }): Promise<Rent> => { guard(); return d(await api.post("/rents/generate", data)); };

// export const recordRentPayment = async (
//   rentId: string | number,
//   paymentMode: PaymentMode,
//   paymentStatus: "PENDING" | "PAID" | "PARTIAL"
// ): Promise<Rent> => {
//   guard();
//   return d(await api.put(`/rents/${rentId}/payment`, { paymentMode, paymentStatus }));
// };

// export const deleteRent = async (rentId: string): Promise<void> =>
//   { guard(); await api.delete(`/rents/${rentId}`); };

// /* ── Tenant EB Bill ───────────────────────────────────────────────────── */

// export const getTenantWiseEBBill = async ({
//   roomId, flatId,
// }: { roomId?: number | null; flatId?: number | null }): Promise<TenantEBBill[]> => {
//   if (!roomId && !flatId) throw new Error("roomId or flatId required");
//   const url = roomId
//     ? `/eb-readings/tenant-wise-bill/room?roomId=${roomId}`
//     : `/eb-readings/tenant-wise-bill/flat?flatId=${flatId}`;
//   return (await api.get(url)).data?.data ?? [];
// };

// /* ── Record Payment ───────────────────────────────────────────────────── */

// export const recordPayment = async (
//   rentId: string | number, paymentMode: string, amount: number, transactionId?: string
// ) => (await api.put(`/rents/${rentId}/payment`, { paymentMode, amount, transactionId })).data;

// /* ── Checkout Summary ─────────────────────────────────────────────────── */

// export const getCheckoutSummary = async (tenantId: string | number) => {
//   const id = Number(tenantId);
//   const { content } = await fetchTenants(0, 500);
//   const tenant = content.find((t: Tenant) => Number(t.id) === id);
//   if (!tenant) return null;
//   const rents: Rent[] = (await api.get(`/rents/tenant/${id}`)).data?.data ?? [];
//   const pendingRents  = rents.filter((r) => r.paymentStatus !== "PAID");
//   return { tenant, pendingRents, totalRentDue: pendingRents.reduce((s, r) => s + (r.rentAmount ?? 0), 0), advancePaid: tenant.advance ?? 0 };
// };

// /* ── Hostels (parent of Branches) ────────────────────────────────────────
//    FIX (duplicate network calls): React.StrictMode double-invokes effects
//    in development. In-flight map collapses concurrent identical calls. */

// const hostelsInFlight = new Map<string, Promise<{ content: Hostel[]; totalElements: number }>>();

// export const fetchHostels = async (pg = 0, size = 10): Promise<{ content: Hostel[]; totalElements: number }> => {
//   const key = `${pg}-${size}`;

//   if (hostelsInFlight.has(key)) return hostelsInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       const res = await api.get("/hostels", { params: { page: pg, size } });
//       const raw = res.data?.data;

//       let rawContent: any[];
//       let totalElements: number;

//       if (Array.isArray(raw)) {
//         rawContent    = raw;
//         totalElements = raw.length;
//       } else if (raw?.content !== undefined) {
//         rawContent    = raw.content ?? [];
//         totalElements = raw.totalElements ?? rawContent.length;
//       } else {
//         rawContent    = [];
//         totalElements = 0;
//       }

//       return { content: rawContent as Hostel[], totalElements };
//     } finally {
//       hostelsInFlight.delete(key);
//     }
//   })();

//   hostelsInFlight.set(key, promise);
//   return promise;
// };

// export const getHostels = fetchHostels;

// export const getHostelById = async (id: number): Promise<Hostel> =>
//   (await api.get(`/hostels/${id}`)).data.data;

// export const createHostel = async (data: HostelRequest): Promise<Hostel> =>
//   { guard(); return (await api.post("/hostels", data)).data.data; };

// export const updateHostel = async (id: number, data: HostelRequest): Promise<Hostel> =>
//   { guard(); return (await api.put(`/hostels/${id}`, data)).data.data; };

// export const deleteHostel = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/hostels/${id}`); };

// /** Dedicated status-change call for HostelAdminPage's row "More" menu
//  *  (Mark Active / Mark Inactive / Suspend Hostel). Hits
//  *  PUT /super-admin/hostels/{id}/status?status=... (see
//  *  SuperAdminController#updateHostelStatus). */
// export const updateHostelStatus = async (
//   id: number,
//   status: HostelStatus
// ): Promise<import("./types").HostelAdmin> => {
//   guard();
//   return d(await api.put(`/super-admin/hostels/${id}/status`, null, { params: { status } }));
// };

// export const getSuperAdminDashboard = async (): Promise<import("./types").SuperAdminDashboard> =>
//   (await api.get("/super-admin/dashboard")).data.data;

// /* ── Merged Hostel + Admin (single /super-admin/hostels screen) ──────── */

// const hostelAdminsInFlight = new Map<string, Promise<import("./types").HostelAdminPageResponse>>();

// export const getAllHostelsWithAdmins = async (
//   pg = 0,
//   size = 50
// ): Promise<import("./types").HostelAdminPageResponse> => {
//   const key = `${pg}-${size}`;
//   if (hostelAdminsInFlight.has(key)) return hostelAdminsInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       return page(
//         await api.get("/super-admin/hostels", { params: { page: pg, size } })
//       ) as import("./types").HostelAdminPageResponse;
//     } finally {
//       hostelAdminsInFlight.delete(key);
//     }
//   })();

//   hostelAdminsInFlight.set(key, promise);
//   return promise;
// };

// export const getHostelWithAdminById = async (id: number): Promise<import("./types").HostelAdmin> =>
//   d(await api.get(`/super-admin/hostels/${id}`));

// export const createHostelWithAdmin = async (
//   data: import("./types").HostelAdminRequest | FormData
// ): Promise<import("./types").HostelAdmin> =>
//   { guard(); return d(await api.post("/super-admin/hostels", data)); };

// export const updateHostelWithAdmin = async (
//   id: number,
//   data: import("./types").HostelAdminRequest | FormData
// ): Promise<import("./types").HostelAdmin> =>
//   { guard(); return d(await api.put(`/super-admin/hostels/${id}`, data)); };

// export const deleteHostelWithAdmin = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/super-admin/hostels/${id}`); };

// /* ── Branches / Units ─────────────────────────────────────────────────── */

// export const fetchBranches = async (pg = 0, size = 10): Promise<{ content: Branch[]; totalElements: number }> => {
//   const res = await api.get("/units", { params: { page: pg, size } });

//   const raw = res.data?.data;

//   let rawContent: any[];
//   let totalElements: number;

//   if (Array.isArray(raw)) {
//     rawContent    = raw;
//     totalElements = raw.length;
//   } else if (raw?.content !== undefined) {
//     rawContent    = raw.content ?? [];
//     totalElements = raw.totalElements ?? rawContent.length;
//   } else if (Array.isArray(res.data?.content)) {
//     rawContent    = res.data.content;
//     totalElements = res.data.totalElements ?? rawContent.length;
//   } else if (Array.isArray(res.data)) {
//     rawContent    = res.data;
//     totalElements = res.data.length;
//   } else {
//     rawContent    = [];
//     totalElements = 0;
//   }

//   const content: Branch[] = rawContent.map((b: any) => {
//     const name =
//       b?.unitName   ??
//       b?.unit_name  ??
//       b?.name       ??
//       b?.branchName ??
//       "";
//     const hostelId =
//       b?.hostelId  ??
//       b?.hostel_id ??
//       b?.hostel?.id ??
//       undefined;
//     const hostelName =
//       b?.hostelName  ??
//       b?.hostel_name ??
//       b?.hostel?.name ??
//       undefined;
//     return {
//       ...b,
//       unitName:  name,
//       unit_name: name,
//       hostelId,
//       hostelName,
//     } as Branch;
//   });

//   return { content, totalElements };
// };

// export const getBranches = fetchBranches;

// export const getBranchId = (): number | null => {
//   const id = sessionStorage.getItem("branchId");
//   return id ? Number(id) : null;
// };

// export const createBranch = async (data: BranchRequest): Promise<Branch> => {
//   guard();
//   const res = await api.post("/units", data);
//   return res.data?.data ?? res.data;
// };

// export const updateBranch = async (id: number, data: BranchRequest): Promise<Branch> => {
//   guard();
//   const res = await api.put(`/units/${id}`, data);
//   return res.data?.data ?? res.data;
// };

// export const deleteBranch = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/units/${id}`); };

// /* ── WhatsApp ─────────────────────────────────────────────────────────── */

// export const sendEBBillWhatsApp = async (roomNumber: string): Promise<void> => {
//   guard();
//   if (!roomNumber) throw new Error("Room number is required");
//   return d(await api.post("/whatsapp/send-eb-bill", { roomNumber }));
// };

// /* ── Dashboard ────────────────────────────────────────────────────────── */

// export const getDashboard = async () => d(await api.get("/dashboard"));

// /* ── Complaints ───────────────────────────────────────────────────────── */

// export const createComplaint = async (data: { subject: string; description: string }): Promise<Complaint> => {
//   if (getUserRole() !== "TENANT") throw new Error("Only tenants can create complaints");
//   return (await api.post("/complaints", data)).data;
// };

// export const getMyComplaints = async (): Promise<Complaint[]> => {
//   if (getUserRole() !== "TENANT") throw new Error("Access denied");
//   return (await api.get("/complaints/my")).data ?? [];
// };

// export const getAllComplaints = async (): Promise<Complaint[]> =>
//   (await api.get("/complaints")).data ?? [];

// export const updateComplaintStatus = async (id: number, status: ComplaintStatus): Promise<Complaint> =>
//   (await api.put(`/complaints/${id}/status`, null, { params: { status } })).data;

// /* ── Flats ────────────────────────────────────────────────────────────── */

// export const fetchFlats = pageFetch("/flats");
// export const getFlats   = fetchFlats;

// export const fetchFlatsByBranch = async (branchId: number, pg = 0, size = 10): Promise<Flat[]> =>
//   (await api.get(`/flats/branch/${branchId}`, { params: { page: pg, size } })).data?.data?.content ?? [];
// export const getFlatsByBranch = fetchFlatsByBranch;

// export const createFlat = async (data: FlatRequest): Promise<Flat> =>
//   { guard(); return d(await api.post("/flats", data)); };

// export const updateFlat = async (id: number, data: FlatRequest): Promise<Flat> =>
//   { guard(); return d(await api.put(`/flats/${id}`, data)); };

// export const deleteFlat = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/flats/${id}`); };

// export const deleteEBReadingsByFlat = async (flatId: number): Promise<void> =>
//   { guard(); await api.delete("/eb-readings/by-flat", { params: { flatId } }); };

// export const deleteEBReadingsByRoom = async (roomId: number): Promise<void> =>
//   { guard(); await api.delete("/eb-readings/by-room", { params: { roomId } }); };

// /* ── Food Timetable ───────────────────────────────────────────────────── */

// export const fetchFoodSchedules    = async (): Promise<FoodTimetable[]>    => (await api.get("/food-timetable")).data?.data ?? [];
// export const getFoodSchedules      = fetchFoodSchedules;
// export const getFoodScheduleById   = async (id: number): Promise<FoodTimetable> => d(await api.get(`/food-timetable/${id}`));
// export const createFoodSchedule    = async (data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.post("/food-timetable", data)); };
// export const updateFoodSchedule    = async (id: number, data: FoodTimetableRequest): Promise<FoodTimetable> => { guard(); return d(await api.put(`/food-timetable/${id}`, data)); };
// export const deleteFoodSchedule    = async (id: number): Promise<void> => { guard(); await api.delete(`/food-timetable/${id}`); };

// /* ── Announcements ────────────────────────────────────────────────────── */

// export const fetchAnnouncements    = async (): Promise<Announcement[]>    => (await api.get("/announcements")).data?.data ?? [];
// export const getAnnouncements      = fetchAnnouncements;
// export const getAnnouncementById   = async (id: number): Promise<Announcement> => d(await api.get(`/announcements/${id}`));
// export const createAnnouncement    = async (data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.post("/announcements", data)); };
// export const updateAnnouncement    = async (id: number, data: AnnouncementRequest): Promise<Announcement> => { guard(); return d(await api.put(`/announcements/${id}`, data)); };
// export const deleteAnnouncement    = async (id: number): Promise<void> => { guard(); await api.delete(`/announcements/${id}`); };
// export const shareAnnouncementWhatsApp = async (id: number) => d(await api.post(`/announcements/${id}/share-whatsapp`));

// /* ── Rules & Regulations ─────────────────────────────────────────────── */
// export const fetchRulesRegulations = async (
//   pg = 0,
//   size = 10
// ): Promise<{ content: RuleRegulation[]; totalElements: number }> =>
//   page(await api.get("/rules-regulations", { params: { page: pg, size } }));
// export const getRulesRegulations = fetchRulesRegulations;
// export const getRuleRegulationById  = async (id: number): Promise<RuleRegulation> => d(await api.get(`/rules-regulations/${id}`));
// export const createRuleRegulation   = async (data: RuleRegulationRequest): Promise<RuleRegulation> => { adminGuard(); return d(await api.post("/rules-regulations", data)); };
// export const updateRuleRegulation   = async (id: number, data: RuleRegulationRequest): Promise<RuleRegulation> => { adminGuard(); return d(await api.put(`/rules-regulations/${id}`, data)); };
// export const deleteRuleRegulation   = async (id: number): Promise<void> => { adminGuard(); await api.delete(`/rules-regulations/${id}`); };

// /* =====================================================
//    SUPER ADMIN API
// ===================================================== */

// export const getSuperAdminBranchId = (): number | null => {
//   const v = sessionStorage.getItem("branchId");
//   return v ? parseInt(v, 10) : null;
// };

// export const createAdmin = async (data: AdminRequest): Promise<Admin> =>
//   d(await api.post("/super-admin/admins", data));

// const adminsInFlight = new Map<string, Promise<AdminPageResponse>>();

// export const getAllAdmins = async (pg = 0, size = 10): Promise<AdminPageResponse> => {
//   const key = `${pg}-${size}`;

//   if (adminsInFlight.has(key)) return adminsInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       return page(await api.get("/super-admin/admins", { params: { page: pg, size } })) as AdminPageResponse;
//     } finally {
//       adminsInFlight.delete(key);
//     }
//   })();

//   adminsInFlight.set(key, promise);
//   return promise;
// };

// export const getAdminById = async (id: number): Promise<Admin> =>
//   d(await api.get(`/super-admin/admins/${id}`));

// export const updateAdmin = async (id: number, data: AdminRequest): Promise<Admin> =>
//   d(await api.put(`/super-admin/admins/${id}`, data));

// export const deleteAdmin = async (id: number): Promise<void> => {
//   await api.delete(`/super-admin/admins/${id}`);
// };

// export const activateAdmin = async (id: number): Promise<Admin> =>
//   d(await api.put(`/super-admin/admins/${id}/activate`));

// export const deactivateAdmin = async (id: number): Promise<Admin> =>
//   d(await api.put(`/super-admin/admins/${id}/deactivate`));

// export const assignHostel = async (adminId: number, hostelId: number): Promise<Admin> =>
//   d(await api.put(`/super-admin/admins/${adminId}/assign-hostel`, null, { params: { hostelId } }));

// export const checkFraud = async (
//   phone?: string,
//   idProofNumber?: string
// ): Promise<import("./types").FraudCheckResponse> => {
//   const params: Record<string, string> = {};
//   if (phone)         params.phone         = phone;
//   if (idProofNumber) params.idProofNumber = idProofNumber;
//   const res = await api.get("/tenants/fraud-check", { params });
//   return res.data?.data ?? { fraud: false, records: [] };
// };

// export const markAbsconded = async (
//   tenantId: number,
//   reason?: string
// ): Promise<import("./types").Tenant> => {
//   guard();
//   const params: Record<string, string> = {};
//   if (reason?.trim()) params.reason = reason.trim();
//   const res = await api.put(`/tenants/${tenantId}/mark-absconded`, null, { params });
//   return d(res);
// };

// /* =====================================================
//    HIERARCHICAL RBAC — PERMISSIONS API
// ===================================================== */

// export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> =>
//   d(await api.get("/permissions/catalog"));

// let assignablePermissionsInFlight: Promise<PermissionCatalogItem[]> | null = null;

// export const getAssignablePermissions = async (): Promise<PermissionCatalogItem[]> => {
//   if (assignablePermissionsInFlight) return assignablePermissionsInFlight;

//   assignablePermissionsInFlight = (async () => {
//     try {
//       return d(await api.get("/permissions/assignable"));
//     } finally {
//       assignablePermissionsInFlight = null;
//     }
//   })();

//   return assignablePermissionsInFlight;
// };

// export const getUserPermissions = async (userId: number): Promise<UserPermissionsResponse> =>
//   d(await api.get(`/permissions/user/${userId}`));

// export const assignUserPermissions = async (
//   userId: number,
//   permissions: string[]
// ): Promise<UserPermissionsResponse> =>
//   d(await api.put(`/permissions/user/${userId}`, { permissions }));

// /* ── Users ────────────────────────────────────────────────────────────── */

// export const registerUser = async (data: RegisterUserRequest) =>
//   (await api.post("/register", data)).data;

// const usersInFlight = new Map<string, Promise<{ content: any[]; totalElements: number }>>();

// export const getUsers = async (pg = 0, size = 10) => {
//   const key = `${pg}-${size}`;

//   if (usersInFlight.has(key)) return usersInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       const res = await api.get("/users", { params: { page: pg, size } });
//       return {
//         content:       res.data?.data?.content ?? res.data?.data ?? [],
//         totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? 0,
//       };
//     } finally {
//       usersInFlight.delete(key);
//     }
//   })();

//   usersInFlight.set(key, promise);
//   return promise;
// };

// export const getUserById  = async (id: number): Promise<User>  => d(await api.get(`/users/${id}`));
// export const deleteUser   = async (id: number): Promise<void>  => { guard(); await api.delete(`/users/${id}`); };

// // NOTE: switched from RegisterUserRequest to UpdateUserRequest — role is
// // no longer part of the update payload; the backend stopped reading it
// // on this endpoint. Password is optional (blank/omitted = keep current).
// export const updateUser = async (id: number, data: UpdateUserRequest): Promise<User> =>
//   { guard(); return d(await api.put(`/users/${id}`, data)); };

// /* ── Payments ─────────────────────────────────────────────────────────── */

// const tenantRentsInFlight = new Map<number, Promise<Rent[]>>();

// export const getTenantRents = async (tenantId: number): Promise<Rent[]> => {
//   if (tenantRentsInFlight.has(tenantId)) return tenantRentsInFlight.get(tenantId)!;

//   const promise = (async () => {
//     try {
//       return (await api.get(`/rents/tenant/${tenantId}`)).data?.data ?? [];
//     } finally {
//       tenantRentsInFlight.delete(tenantId);
//     }
//   })();

//   tenantRentsInFlight.set(tenantId, promise);
//   return promise;
// };

// export const submitPayment = async (data: FormData): Promise<PaymentTransaction> =>
//   d(await api.post("/payments/submit", data));

// export const approvePayment = async (id: number): Promise<PaymentTransaction> =>
//   d(await api.put(`/payments/${id}/approve`));

// export const rejectPayment = async (
//   id: number,
//   remarks: string
// ): Promise<PaymentTransaction> => d(await api.put(`/payments/${id}/reject`, { remarks }));

// const pendingPaymentsInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

// export const fetchPendingPayments = async (
//   pg = 0,
//   size = 10
// ): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
//   const key = `${pg}-${size}`;

//   if (pendingPaymentsInFlight.has(key)) return pendingPaymentsInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       return await pageFetch("/payments/pending/page")(pg, size);
//     } finally {
//       pendingPaymentsInFlight.delete(key);
//     }
//   })();

//   pendingPaymentsInFlight.set(key, promise);
//   return promise;
// };

// const allPaymentsInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

// export const fetchAllPayments = async (
//   pg = 0,
//   size = 10
// ): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
//   const key = `${pg}-${size}`;

//   if (allPaymentsInFlight.has(key)) return allPaymentsInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       return await pageFetch("/payments/page")(pg, size);
//     } finally {
//       allPaymentsInFlight.delete(key);
//     }
//   })();

//   allPaymentsInFlight.set(key, promise);
//   return promise;
// };

// const tenantPaymentHistoryInFlight = new Map<string, Promise<{ content: PaymentTransaction[]; totalElements: number }>>();

// export const fetchTenantPaymentHistoryPaged = async (
//   tenantId: number,
//   pg = 0,
//   size = 10
// ): Promise<{ content: PaymentTransaction[]; totalElements: number }> => {
//   const key = `${tenantId}-${pg}-${size}`;

//   if (tenantPaymentHistoryInFlight.has(key)) return tenantPaymentHistoryInFlight.get(key)!;

//   const promise = (async () => {
//     try {
//       return await pageFetch(`/payments/tenant/${tenantId}/page`)(pg, size);
//     } finally {
//       tenantPaymentHistoryInFlight.delete(key);
//     }
//   })();

//   tenantPaymentHistoryInFlight.set(key, promise);
//   return promise;
// };

// export const getAllTenantPaymentHistory = (tenantId: number): Promise<PaymentTransaction[]> =>
//   fetchAllPages<PaymentTransaction>((pg, size) =>
//     fetchTenantPaymentHistoryPaged(tenantId, pg, size)
//   );

// export const getTenantPaymentHistory = async (
//   tenantId: number
// ): Promise<PaymentTransaction[]> =>
//   (await fetchTenantPaymentHistoryPaged(tenantId, 0, 10)).content;

// export const getPendingPayments = async (): Promise<PaymentTransaction[]> =>
//   (await fetchPendingPayments(0, 10)).content;

// export const getAllPayments = async (): Promise<PaymentTransaction[]> =>
//   (await fetchAllPayments(0, 10)).content;

// /* ── Notifications ─────────────────────────────────────────────────────── */

// export const fetchMyNotifications = async (): Promise<AppNotification[]> =>
//   (await api.get("/notifications")).data?.data ?? [];

// export const getMyNotifications = fetchMyNotifications;

// export const getUnreadNotificationCount = async (): Promise<number> =>
//   (await api.get("/notifications/unread-count")).data?.data?.count ?? 0;

// export const markNotificationAsRead = async (id: number): Promise<AppNotification> =>
//   d(await api.put(`/notifications/${id}/read`));

// export const markAllNotificationsAsRead = async (): Promise<void> => {
//   await api.put("/notifications/read-all");
// };

// export const deleteNotification = async (id: number): Promise<void> => {
//   await api.delete(`/notifications/${id}`);
// };

// export const createNotification = async (
//   data: NotificationRequest
// ): Promise<AppNotification[]> => { guard(); return d(await api.post("/notifications", data)); };

// /* ── Raise Ticket module ─────────────────────────────────────────────── */

// export const createTicket = async (data: TicketRequest): Promise<Ticket> => {
//   if (getUserRole() !== "ADMIN") throw new Error("Only Admins can raise tickets");
//   return d(await api.post("/tickets", data));
// };

// export const getMyTickets = async (): Promise<TicketSummary[]> =>
//   d(await api.get("/tickets/my")) ?? [];

// export const getAllTickets = async (filters?: {
//   status?: TicketStatus;
//   category?: TicketCategory;
// }): Promise<TicketSummary[]> =>
//   d(await api.get("/tickets", { params: filters })) ?? [];

// export const getTicketStats = async (): Promise<TicketStats> =>
//   d(await api.get("/tickets/stats"));

// export const getTicketById = async (id: number): Promise<Ticket> =>
//   d(await api.get(`/tickets/${id}`));

// export const addTicketReply = async (id: number, data: TicketReplyRequest): Promise<Ticket> =>
//   d(await api.post(`/tickets/${id}/replies`, data));

// export const updateTicketStatus = async (
//   id: number,
//   data: TicketStatusUpdateRequest
// ): Promise<Ticket> => {
//   guard();
//   return d(await api.put(`/tickets/${id}/status`, data));
// };

// export const decideBedLimitRequest = async (
//   id: number,
//   data: BedLimitDecisionRequest
// ): Promise<Ticket> => {
//   guard();
//   return d(await api.put(`/tickets/${id}/bed-limit-decision`, data));
// };

// /* ── Expenses ─────────────────────────────────────────────────────────── */

// export type Expense = {
//   id: number;
//   branchId: number;
//   category: string;
//   amount: number;
//   expenseDate: string;
//   description: string;
//   createdBy: number;
//   createdAt?: string;
//   updatedAt?: string;
// };

// export const fetchExpenses = async (): Promise<Expense[]> => {
//   const res = await api.get("/expense/getAll");
//   return res.data?.data ?? res.data ?? [];
// };

// export const getExpenses = fetchExpenses;

// export const createExpense = async (data: Omit<Expense, "id">): Promise<Expense> => {
//   guard();
//   return d(await api.post("/expense/save", data));
// };

// export const deleteExpense = async (id: number): Promise<void> => {
//   guard();
//   await api.delete(`/expense/delete/${id}`);
// };

// export const updateExpense = async (id: number, data: Omit<Expense, "id">): Promise<Expense> => {
//   guard();
//   return d(await api.put(`/expense/update/${id}`, data));
// };

// export type VisitorStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_IN" | "CHECKED_OUT";

// export interface Visitor {
//   id: number;
//   branchId: number;
//   tenantId: number;
//   tenantName: string;
//   roomNumber: string;
//   visitorName: string;
//   visitorPhone: string;
//   relation: string;
//   visitDate: string;
//   expectedInTime: string;
//   checkInTime?: string;
//   checkOutTime?: string;
//   status: VisitorStatus;
//   remarks?: string;
// }

// export const requestVisitor = async (
//   data: Omit<Visitor, "id" | "status">
// ): Promise<Visitor> => {
//   return d(await api.post("/visitors/request", data));
// };

// export const fetchBranchVisitors = async (branchId: number): Promise<Visitor[]> => {
//   const res = await api.get(`/visitors/branch/${branchId}`);
//   return res.data?.data ?? res.data ?? [];
// };

// export const fetchTenantVisitors = async (tenantId: number): Promise<Visitor[]> => {
//   const res = await api.get(`/visitors/tenant/${tenantId}`);
//   return res.data?.data ?? res.data ?? [];
// };

// export const updateVisitorStatus = async (
//   id: number,
//   status: VisitorStatus,
//   remarks?: string
// ): Promise<Visitor> => {
//   guard();
//   const res = await api.put(`/visitors/${id}/status`, null, {
//     params: { status, remarks }
//   });
//   return res.data?.data ?? res.data;
// };

// // ── Cleaners CRUD ──
// export const getMaintenanceCleaners = async (): Promise<Cleaner[]> =>
//   d(await api.get("/maintenance/cleaners"));

// export const getMaintenanceCleaner = async (id: number): Promise<Cleaner> =>
//   d(await api.get(`/maintenance/cleaners/${id}`));

// export const addMaintenanceCleaner = async (data: CleanerRequest): Promise<Cleaner> => {
//   guard();
//   return d(await api.post("/maintenance/cleaners", data));
// };

// export const updateMaintenanceCleaner = async (
//   id: number,
//   data: CleanerRequest
// ): Promise<Cleaner> => { guard(); return d(await api.put(`/maintenance/cleaners/${id}`, data)); };

// export const deleteMaintenanceCleaner = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/maintenance/cleaners/${id}`); };

// // ── Tasks CRUD ──
// export const getMaintenanceTasks = async (): Promise<MaintenanceTask[]> =>
//   d(await api.get("/maintenance/tasks"));

// export const getMaintenanceTask = async (id: number): Promise<MaintenanceTask> =>
//   d(await api.get(`/maintenance/tasks/${id}`));

// export const createMaintenanceTask = async (data: MaintenanceRequest): Promise<MaintenanceTask> => {
//   guard();
//   return d(await api.post("/maintenance/tasks", data));
// };

// export const updateMaintenanceTask = async (
//   id: number,
//   data: MaintenanceRequest
// ): Promise<MaintenanceTask> => { guard(); return d(await api.put(`/maintenance/tasks/${id}`, data)); };

// export const updateMaintenanceTaskStatus = async (
//   id: number,
//   status: CleaningStatus
// ): Promise<MaintenanceTask> => {
//   guard();
//   return d(await api.put(`/maintenance/tasks/${id}/status`, null, { params: { status } }));
// };

// export const deleteMaintenanceTask = async (id: number): Promise<void> =>
//   { guard(); await api.delete(`/maintenance/tasks/${id}`); };

// // ── Records / room status ──
// export const getMaintenanceRecords = async (
//   period: "daily" | "weekly" | "monthly" = "daily"
// ): Promise<MaintenanceTask[]> =>
//   d(await api.get("/maintenance/records", { params: { period } }));

// export const getMaintenanceRecordsByRange = async (
//   from: string,
//   to: string
// ): Promise<MaintenanceTask[]> =>
//   d(await api.get("/maintenance/records/range", { params: { from, to } }));

// export const getCurrentRoomCleaningStatus = async (): Promise<MaintenanceTask[]> =>
//   d(await api.get("/maintenance/rooms/status"));

// // ── Dashboard + reports ──
// export const getMaintenanceDashboard = async (): Promise<MaintenanceDashboardStats> =>
//   d(await api.get("/maintenance/dashboard"));

// export const getBranchWiseCleaningReport = async (): Promise<BranchCleaningSummary[]> =>
//   d(await api.get("/maintenance/reports/branch-wise"));

// export const getPendingCleaningReport = async (): Promise<MaintenanceTask[]> =>
//   d(await api.get("/maintenance/reports/pending"));

// export const getCleanerPerformanceReport = async (
//   period: "daily" | "weekly" | "monthly" = "monthly"
// ): Promise<CleanerWorkSummary[]> =>
//   d(await api.get("/maintenance/reports/cleaner-performance", { params: { period } }));

// // ── Exports ──
// const downloadFile = async (url: string, filename: string) => {
//   const res = await api.get(url, { responseType: "blob" });
//   const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
//   const link = document.createElement("a");
//   link.href = blobUrl;
//   link.setAttribute("download", filename);
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
//   window.URL.revokeObjectURL(blobUrl);
// };

// export const exportBranchWiseCleaningReport = (format: "excel" | "pdf" = "excel") =>
//   downloadFile(
//     `/maintenance/reports/branch-wise/export?format=${format}`,
//     `branch-wise-cleaning-report.${format === "pdf" ? "pdf" : "xlsx"}`
//   );

// export const exportPendingCleaningReport = (format: "excel" | "pdf" = "excel") =>
//   downloadFile(
//     `/maintenance/reports/pending/export?format=${format}`,
//     `pending-cleaning-report.${format === "pdf" ? "pdf" : "xlsx"}`
//   );

// export const exportCleanerPerformanceReport = (
//   format: "excel" | "pdf" = "excel",
//   period: "daily" | "weekly" | "monthly" = "monthly"
// ) =>
//   downloadFile(
//     `/maintenance/reports/cleaner-performance/export?format=${format}&period=${period}`,
//     `cleaner-performance-report.${format === "pdf" ? "pdf" : "xlsx"}`
//   );

// export const publicRegisterTenant = async (data: TenantRequest | FormData): Promise<Tenant> => {
//   return d(await api.post("/tenants/public-register", data));
// };



// /* ── Pending tenant approvals ─────────────────────────────────────── */

// export const getPendingTenants = async (): Promise<Tenant[]> =>
//   d(await api.get("/tenants/pending"));

// export const approveAndAllocateTenant = async (
//   tenantId: number,
//   data: {
//     roomId: number;
//     bedId: number;
//     advance?: number;
//     monthlyRent?: number;
//     joinReading?: number;
//     acJoinReading?: number;
//   }
// ): Promise<Tenant> => {
//   guard();
//   const params: Record<string, any> = {
//     roomId: data.roomId,
//     bedId: data.bedId,
//     advance: data.advance ?? 0,
//     monthlyRent: data.monthlyRent ?? 0,
//     joinReading: data.joinReading ?? 0,
//   };
//   if (data.acJoinReading != null) params.acJoinReading = data.acJoinReading;
//   return d(await api.put(`/tenants/${tenantId}/approve`, null, { params }));
// };

















































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
  HostelStatus,AddOnBedsRequest,
} from "./types";


export const addOnBeds = async (data: AddOnBedsRequest): Promise<Subscription> =>
  d(await api.post("/subscriptions/my/add-on-beds", data));

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

  // The backend resolves and returns tenantId directly in the login
  // response for TENANT-role accounts (AuthResponse.tenantId ->
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

  // ── Subscription expiry gating (ADMIN only) ──
  // Cached immediately so route guards (ProtectedRoute / AppLayout) can
  // check it synchronously without waiting on a /subscriptions/me call.
  // Cleared on logout via clearSubscriptionExpiredFlag().
  if (res.subscriptionExpired != null) {
    sessionStorage.setItem("subscriptionExpired", String(res.subscriptionExpired));
  } else {
    sessionStorage.removeItem("subscriptionExpired");
  }

  // ── NEW: hostel operational status gating (ADMIN/WARDEN/TENANT) ──
  // Cached immediately, same pattern as subscriptionExpired, so route
  // guards can redirect to a "profile only" view for a non-ACTIVE
  // hostel without an extra round-trip. Null for SUPER_ADMIN.
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

// NOTE: matches backend UpdateUserRequest — email/password are optional.
// Leave password blank/undefined to keep the current password unchanged.
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

/* ── Subscription / Billing (ADMIN only) ─────────────────────────────────
   Backed by SubscriptionController on the server (/api/subscriptions/**).
   These three endpoints are always reachable even when the ADMIN's
   subscription has expired — every other endpoint is blocked server-side
   by SubscriptionAccessFilter, which responds 402 with
   { code: "SUBSCRIPTION_EXPIRED" }. Wire a response interceptor in api.ts
   to catch that code and redirect to /subscription. */

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

  // ── NEW: Additional Bed Request (mirrors SubscriptionResponse.java) ──
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

  // ── NEW: additional-bed charge breakdown, shown separately on receipts ──
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

  // ── NEW: optional — omit or leave undefined for a plain renewal with no additional beds ──
  additionalBedsRequested?: number;
  pricePerAdditionalBed?: number;
}

/** Current billing cycle for the logged-in ADMIN's hostel. */
export const getMySubscription = async (): Promise<Subscription> =>
  d(await api.get("/subscriptions/me"));

/** Full renewal/payment history for the logged-in ADMIN's hostel, most recent first. */
export const getMySubscriptionHistory = async (): Promise<SubscriptionPayment[]> =>
  d(await api.get("/subscriptions/me/history"));

/** Record a renewal payment — extends (or reactivates) the subscription and restores access. */
export const renewMySubscription = async (
  data: SubscriptionRenewRequest
): Promise<Subscription> => {
  const updated = d(await api.post("/subscriptions/me/renew", data));
  // Access has been restored — clear the cached expiry flag immediately
  // so route guards stop redirecting to /subscription on this device.
  sessionStorage.setItem("subscriptionExpired", "false");
  return updated;
};

/** Synchronous, session-cached read of the flag set at login — use this
 *  for instant route-guard decisions. It can go stale during a long
 *  session (an active subscription can expire mid-session), so pages
 *  that show subscription details should still call getMySubscription(). */
export const isSubscriptionExpiredCached = (): boolean =>
  sessionStorage.getItem("subscriptionExpired") === "true";

export const clearSubscriptionExpiredFlag = (): void => {
  sessionStorage.removeItem("subscriptionExpired");
};

/* ── Hostel operational status (ADMIN/WARDEN/TENANT) ───────────────────
   Synchronous, session-cached read of the flag set at login — same
   pattern/caveats as isSubscriptionExpiredCached above: usable for
   instant route-guard decisions, but can go stale mid-session if a
   SUPER_ADMIN changes the hostel's status while this user is logged in. */

export const getCachedHostelStatus = (): HostelStatus | null =>
  (sessionStorage.getItem("hostelStatus") as HostelStatus | null) ?? null;

export const isHostelInactiveCached = (): boolean => {
  const status = getCachedHostelStatus();
  return status !== null && status !== "ACTIVE";
};

export const clearHostelStatusFlag = (): void => {
  sessionStorage.removeItem("hostelStatus");
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

export const createBed = async (roomId: number): Promise<Bed> =>
  { guard(); return d(await api.post(`/beds/room/${roomId}`)); };

export const getBedsByRoom = async (
  roomId: number,
  pg = 0,
  size = 100
): Promise<Bed[]> => d(await api.get(`/beds/room/${roomId}`, { params: { page: pg, size } }));

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

/* ── Pending tenant approvals ──────────────────────────────────────────
   Backs the "Pending Approvals" section on the Tenants page — public
   self-registrations (addTenant/publicRegisterTenant with status
   "PENDING") land here with no room/bed yet. getPendingTenants() is a
   dedicated, filter-free list (GET /tenants/pending) so a pending
   registration is never accidentally hidden by the branch/admin
   scoping used by getAllTenants(). approveAndAllocateTenant() assigns
   a room/bed + rent details and flips status to Active
   (PUT /tenants/{id}/approve). ── */

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
 *  (Mark Active / Mark Inactive / Suspend Hostel). Hits
 *  PUT /super-admin/hostels/{id}/status?status=... (see
 *  SuperAdminController#updateHostelStatus). */
export const updateHostelStatus = async (
  id: number,
  status: HostelStatus
): Promise<import("./types").HostelAdmin> => {
  guard();
  return d(await api.put(`/super-admin/hostels/${id}/status`, null, { params: { status } }));
};

export const getSuperAdminDashboard = async (): Promise<import("./types").SuperAdminDashboard> =>
  (await api.get("/super-admin/dashboard")).data.data;

/* ── Merged Hostel + Admin (single /super-admin/hostels screen) ──────── */

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

/* ── Rules & Regulations ─────────────────────────────────────────────── */
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
===================================================== */

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

// NOTE: switched from RegisterUserRequest to UpdateUserRequest — role is
// no longer part of the update payload; the backend stopped reading it
// on this endpoint. Password is optional (blank/omitted = keep current).
export const updateUser = async (id: number, data: UpdateUserRequest): Promise<User> =>
  { guard(); return d(await api.put(`/users/${id}`, data)); };

/* ── Payments ─────────────────────────────────────────────────────────── */

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

export const createNotification = async (
  data: NotificationRequest
): Promise<AppNotification[]> => { guard(); return d(await api.post("/notifications", data)); };

/* ── Raise Ticket module ─────────────────────────────────────────────── */

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
  visitDate: string;
  expectedInTime: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: VisitorStatus;
  remarks?: string;
}

export const requestVisitor = async (
  data: Omit<Visitor, "id" | "status">
): Promise<Visitor> => {
  return d(await api.post("/visitors/request", data));
};

export const fetchBranchVisitors = async (branchId: number): Promise<Visitor[]> => {
  const res = await api.get(`/visitors/branch/${branchId}`);
  return res.data?.data ?? res.data ?? [];
};

export const fetchTenantVisitors = async (tenantId: number): Promise<Visitor[]> => {
  const res = await api.get(`/visitors/tenant/${tenantId}`);
  return res.data?.data ?? res.data ?? [];
};

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

export const publicRegisterTenant = async (data: TenantRequest | FormData): Promise<Tenant> => {
  return d(await api.post("/tenants/public-register", data));
};