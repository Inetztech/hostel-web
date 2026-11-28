// src/lib/upgradeRequests.ts — SUPER_ADMIN side of the customer -> hostel owner upgrade.
import api from "./api";

export type UpgradeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BillingCycle = "MONTHLY" | "YEARLY";

export interface UpgradeRequestView {
  id: number;
  userId: number;
  customerName: string | null;
  customerEmail: string | null;
  hostelName: string;
  address: string;
  city: string;
  totalBeds: number;
  ownerName: string;
  phone: string;
  status: UpgradeStatus;
  adminNote: string | null;
  hostelId: number | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  propertyType: string | null;
  rentBillingMode: string | null;
  ebMode: string | null;
  ebValue: number | null;
  rentDueMode: string | null;
  fixedDuePerDay: number | null;
  rentDueDay: number | null;
  durationMonths: number | null;
  bedPrice: number | null;
}

export interface SaasPlanOption {
  id: number;
  code: string;
  name: string;
  active: boolean;
  free: boolean;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  modules: string[];
}

const d = (res: any) => res.data?.data;

export const listUpgradeRequests = async (status?: UpgradeStatus): Promise<UpgradeRequestView[]> =>
  (d(await api.get("/super-admin/upgrade-requests", { params: status ? { status } : {} })) ?? []);

export const approveUpgradeRequest = async (
  id: number,
  body: { planId?: number; billingCycle?: BillingCycle; note?: string; bedPrice: number; durationMonths: number }
): Promise<UpgradeRequestView> => d(await api.put(`/super-admin/upgrade-requests/${id}/approve`, body));

export const rejectUpgradeRequest = async (id: number, note: string): Promise<UpgradeRequestView> =>
  d(await api.put(`/super-admin/upgrade-requests/${id}/reject`, { note }));

export const listSaasPlans = async (): Promise<SaasPlanOption[]> =>
  (d(await api.get("/super-admin/saas/plans")) ?? []);