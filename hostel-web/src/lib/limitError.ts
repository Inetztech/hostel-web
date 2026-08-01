import { toast } from "sonner";
import { NavigateFunction } from "react-router-dom";

/**
 * Bed/capacity limit errors from the backend (BedServiceImpl / BranchServiceImpl,
 * enforced off Subscription.plan) typically come back as a 400/403/409 with a
 * message mentioning "limit" or "capacity". This is a heuristic match — tighten
 * it to the exact backend string once you've confirmed it via the Network tab.
 */
export const isBedLimitError = (e: any): boolean => {
  const status = e?.response?.status;
  const msg = (e?.response?.data?.message || "").toLowerCase();
  return msg.includes("limit") || msg.includes("capacity") || status === 409 || status === 403;
};

/**
 * Shows a persistent toast with a direct "Add Beds" action that jumps to the
 * subscription page's Add Beds Request panel, instead of a plain error toast.
 */
export const showBedLimitToast = (e: any, navigate: NavigateFunction, fallback: string) => {
  if (isBedLimitError(e)) {
    const message = e?.response?.data?.message || "You've reached your bed limit for the current plan.";
    toast.error(message, {
      duration: 8000,
      action: {
        label: "Add Beds",
        onClick: () => navigate("/subscription"),
      },
    });
  } else {
    toast.error(e?.response?.data?.message || fallback);
  }
};