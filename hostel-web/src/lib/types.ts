export type Role = "SUPER_ADMIN" | "ADMIN" | "WARDEN" | "TENANT";
export type HostelType = "AC" | "NON_AC";
export type TenantStatus = "PENDING" | "Active" | "Checked_Out" | "Absconded"; 
export type EBStatus = "Pending" | "Billed" | "Paid";
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL";
export type PaymentMode = "CASH" | "UPI";
export type IdProofType = "AADHAR" | "PAN" | "VOTER_ID" | "DRIVING_LICENSE" | "PASSPORT";
export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type PaymentTxnStatus = "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";
export type CleaningStatus = "PENDING" | "IN_PROGRESS" | "CLEANED";

export interface PaymentTransaction {
  id: number;
  rentId: number;
  rentMonth: number;
  rentYear: number;
  tenantId: number;
  tenantName: string;
  tenantPhone?: string;
  roomNumber?: string;
  branchName?: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  proofDocument?: string;
  status: PaymentTxnStatus;
  submittedByRole: string;
  submittedByName: string;
  submittedAt: string;
  verifiedByName?: string;
  verifiedAt?: string;
  remarks?: string;
}


// ── FRAUD DETECTION TYPES ─────────────────────────────────────────────
export interface FraudRecord {
  tenantId: number;
  branchName: string;
  matchedOn: "phone" | "idProofNumber" | "phone & idProofNumber";
  branchContact?: string;
  status: TenantStatus;
  pendingAmount: number;
  checkInDate: string;
  checkOutDate: string | null;
  reason: string | null;
}

export interface FraudCheckResponse {
  fraud: boolean;
  records: FraudRecord[];
}
// ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  role: Role;
  branch: Branch;
  branchId?: number | null;
  unitName?: string;
  name?: string;
  phone?: string;
  password?: string;
  // ─── Hierarchical RBAC: permissions currently granted to this user ──
  // SUPER_ADMIN => full catalog (backend populates every value).
  permissions?: string[];
  // ─────────────────────────────────────────────────────────────────
}

// ── Payload for registerUser() in lib/store.ts (CREATE only) ──────────
// Role is required and editable here — this is the only place a new
// account's role is ever set. Kept separate from AdminRequest, which is
// the SUPER_ADMIN -> ADMIN-only creation payload (email/password/active
// only, no role/branch).
export interface RegisterUserRequest {
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: "ADMIN" | "WARDEN" | "TENANT";
  branchId: number | null;
  // Optional initial grant — must be a subset of what the creator holds;
  // validated server-side. Omit to create with no permissions.
  permissions?: PermissionName[];
}

// ── Payload for updateUser() / updateMyProfile() in lib/store.ts ──────
// Used for PUT /users/{id} and PUT /users/me. Deliberately has NO `role`
// field — role can no longer be changed via these endpoints (the backend
// stopped reading/applying it). Password is optional: omit or leave
// blank to keep the user's current password unchanged.
export interface UpdateUserRequest {
  name: string;
  phone: string;
  email: string;
  password?: string;
  branchId?: number | null;
  // Optional — must be a subset of what the requester holds; validated
  // server-side. Omitted = leave the user's current permission set untouched.
  permissions?: PermissionName[];
}
// ─────────────────────────────────────────────────────────────────────

export interface Admin {
  id: number;
  email: string;
  active: boolean;
  role: Role;
  name?: string;
  phone?: string;
  // ─── Assigned hostel (SUPER_ADMIN → ADMIN scoping) ──────────
  hostelId?: number | null;
  hostelName?: string | null;
  // ─── Hierarchical RBAC: permissions granted by SUPER_ADMIN ──
  permissions?: string[];
}

// ── Hierarchical RBAC (permission catalog / assignment) ────────────────
export type PermissionName =
  | "MANAGE_HOSTELS" | "MANAGE_BRANCHES" | "MANAGE_ROOMS" | "MANAGE_FLAT"
  | "MANAGE_WARDENS" | "MANAGE_TENANTS"
  | "MANAGE_PAYMENTS" | "VIEW_PAYMENTS" | "MANAGE_RENTS" | "MANAGE_EXPENSES"
  | "MANAGE_MAINTENANCE" | "VIEW_MAINTENANCE"
  | "MANAGE_ANNOUNCEMENTS" | "MANAGE_FOOD_TIMETABLE" | "MANAGE_RULES_REGULATIONS"
  | "MANAGE_EB_READINGS" | "MANAGE_COMPLAINTS" | "MANAGE_VISITORS"
  | "VIEW_DASHBOARD" | "VIEW_REPORTS";

/** One row of the permission matrix — `granted` is contextual to the endpoint that returned it. */
export interface PermissionCatalogItem {
  name: PermissionName;
  label: string;
  module: string;
  granted: boolean;
}

export interface UserPermissionsResponse {
  userId: number;
  email: string;
  name?: string;
  role: Role;
  catalog: PermissionCatalogItem[];
}
// ─────────────────────────────────────────────────────────────────────

export interface AdminRequest {
  name?: string;
  phone?: string;
  email: string;
  password: string;
  active?: boolean;
  hostelId?: number | null;
  permissions?: PermissionName[];
}

export interface AdminPageResponse {
  content: Admin[];
  totalElements: number;
  totalPages: number;
}

export interface FoodTimetable {
  id: number;
  dayName: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  branchId?: number;
}

export interface FoodTimetableRequest {
  dayName: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  branchId?: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  branchId?: number | null;
  branchName?: string | null; 
}

export interface AnnouncementRequest {
  title: string;
  content: string;
  createdBy: string;
  branchId?: number | null; 
}

export interface RuleRegulation {
  id: number;
  title: string;
  description: string;
  category?: string | null;
  published: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

export interface RuleRegulationRequest {
  title: string;
  description: string;
  category?: string | null;
  published?: boolean;
  createdBy: string;
  branchId?: number | null;
}

export interface WhatsAppShare {
  tenantName: string;
  phone: string;
  whatsappUrl: string;
}

export interface Complaint {
  id: number;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  tenantId: number;
  tenantName?: string;
  roomNumber?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  role: Role;
  message?: string;
  branchId?: number;
  email?: string;
  name?: string;
  phone?: string;
  unitName?: string;
  userId?: number;
  hostelId?: number | null;
  hostelName?: string | null;
  /** ADMIN-only: true when this hostel's subscription end date has passed. */
  subscriptionExpired?: boolean | null;
  /** ADMIN/WARDEN/TENANT: the hostel's operational status. Null for SUPER_ADMIN. */
  hostelStatus?: HostelStatus | null;
  tenantId?: number | null;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  role: string;
  branchId?: number;
}

export type HostelStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Hostel {
  id: number;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: HostelStatus;
  branchCount?: number;
  tenantCount?: number;
  planId?: number | null;
  planName?: string | null;
}

export interface HostelRequest {
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
}

// ── Merged Hostel + Admin (single /super-admin/hostels screen) ─────────
export interface HostelAdmin {
  id: number;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: HostelStatus;
  branchCount?: number;
  planId?: number | null;
  planName?: string | null;
  totalRooms?: number;
  totalBeds?: number;
  occupiedBeds?: number;
  capacityBeds?: number;
  durationMonths?: number;
  documentUrl?: string | null;
  bedPrice?: number | null;
  adminId?: number | null;
  adminName?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
  adminActive?: boolean;
  permissions?: string[];
}

export interface HostelAdminRequest {
  name: string;
  address: string;
  city: string;
  totalBeds: number;
  durationMonths: number;
  bedPrice?: number;
  document?: File;
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword?: string;
}

export interface HostelAdminPageResponse {
  content: HostelAdmin[];
  totalElements: number;
  totalPages: number;
}

export interface SuperAdminDashboard {
  totalHostels: number;
  activeHostels: number;
  inactiveHostels: number;
  suspendedHostels: number;
  totalAdmins: number;
  activeAdmins: number;
  totalTenants: number;
  totalBranches: number;
  hostelsOverview: {
    id: number;
    name: string;
    city?: string;
    tenantCount: number;
    branchCount: number;
    status: HostelStatus;
  }[];
}

export interface Branch {
  id: number;
  unitName: string;
  location: string;
  phone?:   string;
  hostelId?:   number;
  hostelName?: string;
  capacityBeds?: number | null;
  roomCount?: number;
  bedCount?: number;
  occupiedBedCount?: number;
}

export interface BranchRequest {
  unitName: string;
  location: string;
  phone?:   string;
  hostelId: number;
  capacityBeds?: number | null;
}

export interface Room {
  id: number;
  roomNumber: string;
  hostelType: HostelType;
  totalBeds: number;
  rentPerBed: number;
  unitId: number;
  unitName?: string;
  flatId?: number | null;
  flatName?: string | null;
  beds?: Bed[];
  occupiedBeds?: number;
  availableBeds?: number;
}

export interface Bed {
  id: number;
  isOccupied: boolean;
  bedNumber: number;
  roomId: number;
}

export interface Flat {
  id: number;
  flatNumber: string;
  branchId: number;
  branchName?: string;
}

export interface FlatRequest {
  flatNumber: string;
  branchId: number;
}

export interface Tenant {
  id: number;
  name: string;
  phone: string;
  email: string;
  idProofType: IdProofType;
  idProofNumber: string;
  idProofDocument?: string | null;
  tenantPhoto?: string | null; 
  roomId: number;
  bedId: number;
  advance: number;
  monthlyRent: number;
  joinReading: number;
  checkoutReading: number | null;
  acJoinReading: number | null;
  acCheckoutReading: number | null;
  checkInDate: string;
  checkOutDate: string | null;
  status: TenantStatus;
  fraudCheck?: FraudCheckResponse | null;
  hostelId?: number | null;
  hostelName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

export interface TenantRequest {
  name: string;
  phone: string;
  email?: string;
  idProofType: IdProofType;
  idProofNumber: string;
  idProofDocument?: File | null;
  tenantPhoto?: string | null; 
  roomId: number;
  bedId: number;
  joinReading: number;
  acJoinReading: number | null;
  advance: number;
  monthlyRent: number;
  checkInDate: string;
}

export interface EBReading {
  id?: number;
  flatId?: number;
  roomId?: number;
  branchId?: number | null;
  branchName?: string | null;
  month: number;
  year: number;
  previousReading: number;
  currentReading: number;
  acPreviousReading?: number;
  acCurrentReading?: number;
  unitsConsumed?: number;
  acUnits?: number;
  ebRate?: number;
  ebAmount?: number;
  isCheckout?: boolean;
  status?: EBStatus;
}

export interface TenantEBBill {
  tenantId: number;
  tenantName: string;
  roomId: number;
  roomNumber: string;
  flatId?: number;
  flatNumber?: string;
  previousReading: number;
  currentReading: number;
  acPreviousReading: number;
  acCurrentReading: number;
  unitsConsumed: number;
  amount: number;
}

export interface Rent {
  id: number;
  tenantId: number;
  tenantName?: string;
  roomId: number;
  rentMonth: number;
  rentYear: number;
  rentAmount: number;
  ebAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode | null;
  paymentDate: string | null;
}

export interface RoomReport {
  roomNumber: string;
  hostelType: HostelType;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  totalEBAmount: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
}

export interface MemberReport {
  tenantName: string;
  roomNumber: string;
  individualEBAmount: number;
  month: number;
  year: number;
}

export interface CheckoutSummary {
  tenant: Tenant;
  roomNumber: string;
  pendingRents: Rent[];
  totalRentDue: number;
  totalEBDue: number;
  advancePaid: number;
  netPayable: number;
}

export const DEFAULT_EB_RATE = 13;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ID_PROOF_TYPES: IdProofType[] = [
  "AADHAR", "PAN", "VOTER_ID", "DRIVING_LICENSE", "PASSPORT"
];

export const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI"];

// ── Responsible contact (for "no permissions assigned" screen) ────────
export interface ResponsibleContact {
  name: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "WARDEN";
}
// ─────────────────────────────────────────────────────────────────────

// ── Notification / Messaging module ────────────────────────────────────
export type NotificationType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "ROOM_ADDED"
  | "FLAT_ADDED"
  | "EB_READING"
  | "ANNOUNCEMENT"
  | "RULE_REGULATION"
  | "COMPLAINT"
  | "FOOD_TIMETABLE"
  | "PAYMENT_REMINDER"
  | "PAYMENT_DUE"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_CONFIRMATION"
  | "PAYMENT_REJECTED"
  | "TICKET_CREATED"
  | "TICKET_REPLY"
  | "TICKET_STATUS_UPDATE"
  | "BED_LIMIT_DECISION";

export interface AppNotification {
  id: number;
  branchId?: number | null;
  branchName?: string | null;
  recipientRole: Role;
  recipientId?: number | null;
  type: NotificationType;
  typeLabel: string;
  title: string;
  message: string;
  referenceId?: number | null;
  isRead: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface NotificationRequest {
  title: string;
  message: string;
  recipientRoles?: Role[];
  branchIds?: number[];
}
// ─────────────────────────────────────────────────────────────────────

export interface Plan {
  id: number;
  name: string;
  price: number;
  billingPeriod: string;
  durationLabel: string;
  description?: string;
  hostelLimit: number;
  branchLimit: number | null;
  bedLimit: number | null;
  features: string[];
  status: "Active" | "Inactive";
  colorHex?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanRequest {
  name: string;
  price: number;
  billingPeriod: string;
  durationLabel?: string;
  description?: string;
  hostelLimit?: number;
  branchLimit?: number | null;
  bedLimit: number | null;
  features?: string[];
  status?: "Active" | "Inactive";
  colorHex?: string;
}

export interface PlanPageResponse {
  content: Plan[];
  totalElements: number;
  totalPages: number;
}

/* ── Subscriptions (Hostel/Admin <-> Plan, with billing history) ────────── */

export type SubscriptionDisplayStatus = "Active" | "Expiring Soon" | "Expired" | "Cancelled";
export type SubscriptionPaymentStatus = "Paid" | "Pending" | "Partial";

export interface Subscription {
  id: number;
  hostelId: number;
  hostelName: string;
  hostelCity?: string;
  adminId?: number | null;
  adminName?: string | null;
  adminEmail?: string | null;
  planId: number;
  planName: string;
  colorHex?: string;
  startDate: string;
  endDate: string;
  status: SubscriptionDisplayStatus;
  paymentStatus: SubscriptionPaymentStatus;
  amount: number;
  billingPeriod: string;
  nextRenewalDate: string;
  daysToRenewal: number;
}

export interface SubscriptionRequest {
  hostelId?: number;
  planId: number;
  paymentStatus?: SubscriptionPaymentStatus;
  transactionId?: string;
}

export interface SubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSoon: number;
  expired: number;
  totalRevenueThisMonth: number;
}

export interface SubscriptionPayment {
  id: number;
  planName: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  type: "NEW" | "RENEWAL" | "PLAN_CHANGE";
  paymentStatus: SubscriptionPaymentStatus;
  transactionId?: string;
  paidAt: string;
  recordedBy?: string;
}

export interface SubscriptionPageResponse {
  content: Subscription[];
  totalElements: number;
  totalPages: number;
}

// ── Raise Ticket module (Admin ↔ Super Admin) ──────────────────────────
export type TicketCategory =
  | "TECHNICAL_ISSUE"
  | "SUBSCRIPTION_ISSUE"
  | "BED_LIMIT_INCREASE"
  | "ACCOUNT_ISSUE"
  | "FEATURE_REQUEST"
  | "BILLING_ISSUE"
  | "OTHER";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type BedLimitDecision = "PENDING" | "APPROVED" | "REJECTED";

export type TicketReplyType = "REPLY" | "STATUS_CHANGE";

export const TICKET_CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "TECHNICAL_ISSUE",    label: "Technical Issue" },
  { value: "FEATURE_REQUEST",    label: "Feature Request" },
  { value: "BILLING_ISSUE",      label: "Billing Issue" },
  { value: "OTHER",              label: "Other" },
];

export const TICKET_PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW",    label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH",   label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "OPEN",        label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED",    label: "Resolved" },
];

/** Payload for ADMIN raising a new support ticket. */
export interface TicketRequest {
}


export interface AddOnBedsRequest {
  additionalBedsRequested: number;
  remarks?: string;
}

/** Payload for either ADMIN or SUPER_ADMIN posting a reply on a ticket. */
export interface TicketReplyRequest {
  message: string;
}

/** Payload for SUPER_ADMIN updating a ticket's status. */
export interface TicketStatusUpdateRequest {
  status: TicketStatus;
  note?: string;
}

/** Payload for SUPER_ADMIN approving/rejecting a BED_LIMIT_INCREASE ticket. */
export interface BedLimitDecisionRequest {
  decision: "APPROVED" | "REJECTED";
  approvedBedLimit?: number;
  remarks?: string;
}

export interface TicketReply {
  id: number;
  type: TicketReplyType;
  message: string;
  statusFrom?: TicketStatus | null;
  statusTo?: TicketStatus | null;
  authorId?: number | null;
  authorName?: string | null;
  authorRole?: Role | null;
  createdAt: string;
}

/** Lightweight row for ticket list views. */
export interface TicketSummary {
  id: number;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  statusLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  bedLimitDecision?: BedLimitDecision | null;
  hostelId?: number | null;
  hostelName?: string | null;
  raisedByUserId: number;
  raisedByName: string;
  replyCount: number;
  createdAt: string;
  updatedAt?: string | null;
}

/** Full ticket detail, including its complete reply/status-change history. */
export interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  statusLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  currentBedLimit?: number | null;
  requestedBedLimit?: number | null;
  bedLimitDecision?: BedLimitDecision | null;
  bedLimitDecisionLabel?: string | null;
  raisedByUserId: number;
  raisedByName: string;
  raisedByEmail?: string | null;
  hostelId?: number | null;
  hostelName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  resolutionNotes?: string | null;
  replies: TicketReply[];
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  pendingBedLimitRequests: number;
}

export interface Cleaner {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  branchId: number;
  branchName?: string;
  active: boolean;
  assignedRooms: number;
}

export interface CleanerRequest {
  name: string;
  phone?: string;
  email?: string;
  branchId: number;
  active: boolean;
}

export interface MaintenanceTask {
  id: number;
  branchId: number;
  branchName?: string;
  roomId: number;
  roomNumber?: string;
  cleanerId?: number | null;
  cleanerName?: string | null;
  status: CleaningStatus;
  scheduledDate: string;
  scheduledTime?: string | null;
  completedAt?: string | null;
  notes?: string;
}

export interface MaintenanceRequest {
  branchId: number;
  roomId: number;
  cleanerId?: number | null;
  status?: CleaningStatus;
  scheduledDate: string;
  scheduledTime?: string | null;
  notes?: string;
}

export interface MaintenanceDashboardStats {
  totalRooms: number;
  completed: number;
  pending: number;
  inProgress: number;
  cleaners: number;
}

export interface BranchCleaningSummary {
  branchId: number;
  branchName: string;
  totalRooms: number;
  cleaned: number;
  pending: number;
  inProgress: number;
  progressPercent: number;
}

export interface CleanerWorkSummary {
  cleanerId: number;
  cleanerName: string;
  branchId: number;
  branchName: string;
  roomsCleanedToday: number;
  roomsCleanedThisWeek: number;
  roomsCleanedThisMonth: number;
  totalAssignedActive: number;
}