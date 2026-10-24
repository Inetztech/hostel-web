import { toast } from "sonner";
import { NavigateFunction } from "react-router-dom";

export const isBedLimitError = (e: any): boolean => {
  const status = e?.response?.status;
  const msg = (e?.response?.data?.message || "").toLowerCase();
  return msg.includes("limit") || msg.includes("capacity") || status === 409 || status === 403;
};

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