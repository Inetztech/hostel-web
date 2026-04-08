export type Role = "ADMIN" | "VIEWER";
export type HostelType = "Boys" | "Girls";
export type TenantStatus = "Active" | "Checked_Out";
export type EBStatus = "Pending" | "Billed" | "Paid";
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL";
export type PaymentMode = "CASH" | "UPI";
export type IdProofType = "AADHAR" | "PAN" | "VOTER_ID" | "DRIVING_LICENSE" | "PASSPORT";

export interface LoginResponse {
  token: string;
  refreshToken: string;
  role: Role;
  message?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  role: string; 
}

export interface Branch {
  id: number;
  unitName: string;
}

export interface BranchRequest {
  unitName: string;
}

export interface Room {
  id: number;     
  roomNumber: string;
  hostelType: HostelType;
  totalBeds: number;
  rentPerBed: number;
  unitId: number;   
  unitName?: string;
}

export interface Bed {
  id: number;
  isOccupied: boolean;
  bedNumber: number;
  roomId: number;
}

export interface Tenant {
  id: number;
  name: string;
  phone: string;
  email: string;
  idProofType: IdProofType;
  idProofNumber: string;

  roomId: number;
  bedId: number;

  advance: number;
  monthlyRent: number;

  acUser: boolean;

  joinReading: number;
  checkoutReading: number | null;

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
  roomId: number;
  bedId: number;

  joinReading: number;
  acUser: boolean;
  advance: number;
  monthlyRent: number;
  checkInDate: string;
}

export interface EBReading {
  id?: number;
  roomId: number;
  month: number;
  year: number;
  previousReading: number;
  currentReading: number;
  acUnits?: number;
  unitsConsumed?: number; 
  ebRate?: number;      
  ebAmount?: number;      
  status?: EBStatus;     
}

export interface TenantEBBill {
  tenantId: number;
  tenantName: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  amount: number;
}

export interface Rent {
  id: number;
  tenantId: number;
  roomId: number;
  rentMonth: number;
  rentYear: number;
  rentAmount: number;
  ebAmount: number;
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