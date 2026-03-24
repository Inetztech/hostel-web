export type Role = "ADMIN" | "USER" | "VIEWER";
export type HostelType = "Boys" | "Girls";
export type TenantStatus = "Active" | "Checked_Out";
export type EBStatus = "Pending" | "Billed" | "Paid";
export type PaymentStatus = "Pending" | "Paid" | "Partial" | "PAID" | "UNPAID" | "Unpaid";
export type PaymentMode = "Cash" | "UPI" | "Bank Transfer";
export type IdProofType = "Aadhar" | "PAN" | "Voter ID" | "Driving License" | "Passport";


export interface LoginResponse {
  token: string;
  role: Role;
  message?: string;
}

export interface Room {
  id: number;     
  roomNumber: string;
  hostelType: HostelType;
  totalBeds: number;
  rentPerBed: number;
  unitId: number;   
  unitName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bed {
  id: number;
  occupied: boolean;
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

  advance: number;
  monthlyRent: number;
  checkInDate: string;
}

export interface EBReading {
  id: string;
  roomId: string;
  month: number;
  year: number;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  ebAmount: number;
  status: EBStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Rent {
  id: string;
  tenantId: string;
  roomId: string;
  rentMonth: number;
  rentYear: number;
  rentAmount: number;
  ebAmount: number;
  otherCharges: number;
  discount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentDate: string | null;
  paymentMode: PaymentMode | null;
  createdAt: string;
  updatedAt: string;
}

// ── Report Types ──
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

export interface TenantEBBill {
  tenantId: number;
  tenantName: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  amount: number;
  
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

export interface Branch {
  id: number;
  unitName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchRequest {
  unitName: string;
}

// ── Constants ──
export const DEFAULT_EB_RATE = 13;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ID_PROOF_TYPES: IdProofType[] = ["Aadhar", "PAN", "Voter ID", "Driving License", "Passport"];
export const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer"];
