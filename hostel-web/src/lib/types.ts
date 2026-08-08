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

export type DamageStatus = "PENDING" | "PAID" | "CANCELLED";

export interface DamageTenantShare {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantPhone?: string;
  shareAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  rentId?: number | null;
}

export interface Damage {
  id: number;
  hostelId: number;
  hostelName?: string;
  branchId: number;
  branchName?: string;
  roomIds: number[];
  roomNumbers?: string[];
  title: string;
  description?: string;
  damageDate: string;
  totalAmount: number;
  status: DamageStatus;
  notes?: string;
  tenantIds: number[];
  tenants: DamageTenantShare[];
  photoUrls: string[];
  createdByName?: string;
  createdAt?: string;
}

export interface DamageRequest {
  hostelId: number;
  branchId: number;
  roomIds: number[];
  title: string;
  description?: string;
  damageDate: string;
  totalAmount: number;
  tenantIds: number[];
  notes?: string;
  photos?: File[];
}

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
  permissions?: string[];
}

export interface RegisterUserRequest {
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: "ADMIN" | "WARDEN" | "TENANT";
  branchId: number | null;
  permissions?: PermissionName[];
}

export interface UpdateUserRequest {
  name: string;
  phone: string;
  email: string;
  password?: string;
  branchId?: number | null;
  permissions?: PermissionName[];
}

export interface Admin {
  id: number;
  email: string;
  active: boolean;
  role: Role;
  name?: string;
  phone?: string;
  hostelId?: number | null;
  hostelName?: string | null;
  permissions?: string[];
}

export type PermissionName =
  | "MANAGE_HOSTELS" | "MANAGE_BRANCHES" | "MANAGE_ROOMS" | "MANAGE_FLAT"
  | "MANAGE_WARDENS" | "MANAGE_TENANTS"
  | "MANAGE_PAYMENTS" | "VIEW_PAYMENTS" | "MANAGE_RENTS" | "MANAGE_EXPENSES"
  | "MANAGE_MAINTENANCE" | "VIEW_MAINTENANCE"
  | "MANAGE_ANNOUNCEMENTS" | "MANAGE_FOOD_TIMETABLE" | "MANAGE_RULES_REGULATIONS"
  | "MANAGE_EB_READINGS" | "MANAGE_COMPLAINTS" | "MANAGE_VISITORS"
  | "VIEW_DASHBOARD" | "VIEW_REPORTS";

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
  branchName?: string;
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
  subscriptionExpired?: boolean | null;
  hostelStatus?: HostelStatus | null;
  tenantId?: number | null;
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

export const DEFAULT_EB_RATE = 13;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ID_PROOF_TYPES: IdProofType[] = [
  "AADHAR", "PAN", "VOTER_ID", "DRIVING_LICENSE", "PASSPORT"
];

export const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI"];

export interface ResponsibleContact {
  name: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "WARDEN";
}

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

export interface TicketRequest {
}

export interface AddOnBedsRequest {
  additionalBedsRequested: number;
  remarks?: string;
}

export interface TicketReplyRequest {
  message: string;
}

export interface TicketStatusUpdateRequest {
  status: TicketStatus;
  note?: string;
}

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