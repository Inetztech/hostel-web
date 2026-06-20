export type Role = "SUPER_ADMIN" | "ADMIN" | "WARDEN" | "TENANT";
export type HostelType = "AC" | "NON_AC";
export type TenantStatus = "Active" | "Checked_Out";
export type EBStatus = "Pending" | "Billed" | "Paid";
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL";
export type PaymentMode = "CASH" | "UPI";
export type IdProofType = "AADHAR" | "PAN" | "VOTER_ID" | "DRIVING_LICENSE" | "PASSPORT";
export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface User {
  id: number;
  email: string;
  role: Role;
  branch: Branch;
}

export interface Admin {
  id: number;
  email: string;
  active: boolean;
  role: Role;
}

export interface AdminRequest {
  email: string;
  password: string;
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
}

export interface FoodTimetableRequest {
  dayName: string;

  breakfast: string;

  lunch: string;

  dinner: string;
}

export interface Announcement {
  id: number;

  title: string;

  content: string;

  createdBy: string;

  createdAt: string;
}

export interface AnnouncementRequest {
  title: string;

  content: string;

  createdBy: string;
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
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  role: string; 
  branchId?: number;
}

export interface Branch {
  id: number;
  unitName: string;
  location: string;
}

export interface BranchRequest {
  unitName: string;
  location: string;
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

  idProofDocument?: string | null
  
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
}

export interface TenantRequest {
  name: string;
  phone: string;
  email?: string;
  idProofType: IdProofType;
  idProofNumber: string;
  idProofDocument?: File | null;
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