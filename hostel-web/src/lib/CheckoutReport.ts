import api from "@/lib/api";

/**
 * Pulls a readable message out of a failed blob request. With
 * responseType "blob" axios hands the error body back as a Blob, so the
 * backend's JSON ({ message } / { error }) has to be read from it.
 */
async function extractErrorMessage(err: any): Promise<string> {
  const data = err?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      const msg = json?.message ?? json?.error;
      if (msg) return String(msg);
    } catch {
      /* not JSON – fall through to the generic messages below */
    }
  }

  const status = err?.response?.status;
  if (status === 403) return "You do not have access to this tenant's report";
  if (status === 404) return "Tenant not found";

  return err?.message || "Failed to generate the checkout report";
}

const filenameFromDisposition = (header?: string): string | null => {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try { return decodeURIComponent(utf8[1]); } catch { /* ignore */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
};

const fallbackFilename = (tenantId: number | string, tenantName?: string): string => {
  const safeName = (tenantName ?? "tenant").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "tenant";
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `Checkout_Report_${safeName}_${tenantId}_${today}.pdf`;
};

/**
 * GET /api/tenants/{tenantId}/checkout-report/pdf and save the response as a
 * file. Throws an Error with a user-presentable message on failure.
 */
export async function downloadTenantCheckoutReport(
  tenantId: number | string,
  tenantName?: string
): Promise<void> {
  let res;
  try {
    res = await api.get(`/tenants/${tenantId}/checkout-report/pdf`, {
      responseType: "blob",
      headers: { Accept: "application/pdf, application/json" },
    });
  } catch (err) {
    throw new Error(await extractErrorMessage(err));
  }

  const blob: Blob = res.data;
  if (!blob || blob.size === 0 || blob.type.includes("json")) {
    // A 200 that is not a PDF (e.g. a proxy error page) – surface it instead of saving junk.
    throw new Error("The server did not return a PDF");
  }

  // Content-Disposition is not in the CORS exposed headers, so this is usually
  // empty in the browser and the generated fallback name is used.
  const filename =
    filenameFromDisposition(res.headers?.["content-disposition"]) ?? fallbackFilename(tenantId, tenantName);

  const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
}