import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadTenantCheckoutReport } from "@/lib/CheckoutReport";

interface CheckoutReportButtonProps {
  tenantId: number | string;
  tenantName?: string;
  /** "icon" = compact table-row action, "button" = labelled button (dialogs). */
  variant?: "icon" | "button";
  className?: string;
}


const CheckoutReportButton = ({
  tenantId,
  tenantName,
  variant = "icon",
  className,
}: CheckoutReportButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      await downloadTenantCheckoutReport(tenantId, tenantName);
      toast.success("Checkout report downloaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate the checkout report");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={loading}
        title={loading ? "Generating PDF…" : "Download checkout details (PDF)"}
        aria-label="Download checkout details PDF"
      >
        {loading ? (
          <Loader2 size={16} color="#2563eb" strokeWidth={2} className="shrink-0 animate-spin" />
        ) : (
          <FileDown size={16} color="#2563eb" strokeWidth={2} className="shrink-0" />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className ?? "rounded-lg"}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" /> Download Details
        </>
      )}
    </Button>
  );
};

export default CheckoutReportButton;