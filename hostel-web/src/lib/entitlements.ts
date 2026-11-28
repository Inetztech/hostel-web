// src/lib/entitlements.ts
//
// What the signed-in CUSTOMER's plan unlocks, read from GET /entitlements/me.
// Only CUSTOMER accounts use it; ADMIN / WARDEN / TENANT / SUPER_ADMIN behave exactly as before.
// Fails CLOSED: if the request fails the customer is treated as Free (Absconded List only).
import { useEffect, useState } from "react";
import api from "./api";
import { getUserRole } from "./auth";
import type { ModuleKey } from "./modules";

export interface EntitlementSnapshot {
  loaded: boolean;
  token: string | null;
  planCode: string | null;
  planName: string | null;
  status: string;
  expiresOn: string | null;
  modules: string[];
}

const EVENT = "hms:entitlements-changed";
const FREE_FALLBACK = ["ABSCONDED_LIST"];

const empty = (token: string | null): EntitlementSnapshot => ({
  loaded: false, token, planCode: null, planName: null, status: "NONE", expiresOn: null, modules: [],
});

let snapshot: EntitlementSnapshot = empty(null);
let inFlight: Promise<void> | null = null;

const currentToken = () => sessionStorage.getItem("token");

const read = (): EntitlementSnapshot => {
  const t = currentToken();
  if (snapshot.token !== t) snapshot = empty(t);   // new login / logout -> forget the old user's plan
  return snapshot;
};

const publish = (next: EntitlementSnapshot) => {
  snapshot = next;
  window.dispatchEvent(new Event(EVENT));
};

export const refreshEntitlements = async (force = false): Promise<void> => {
  const token = currentToken();
  if (!token || getUserRole() !== "CUSTOMER") return;
  if (!force && read().loaded) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await api.get("/entitlements/me");
      const d = res.data?.data ?? {};
      publish({
        loaded: true, token,
        planCode: d.planCode ?? null,
        planName: d.planName ?? null,
        status: d.status ?? "FREE",
        expiresOn: d.expiresOn ?? null,
        // The Absconded List is the one module every customer plan keeps - never let a refresh drop it.
        modules: Array.from(new Set([...(Array.isArray(d.modules) ? d.modules : []), ...FREE_FALLBACK])),
      });
    } catch {
      publish({ ...empty(token), loaded: true, status: "FREE", modules: FREE_FALLBACK });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};

export function useEntitlements() {
  const enabled = getUserRole() === "CUSTOMER";
  const [snap, setSnap] = useState<EntitlementSnapshot>(read);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => setSnap(read());
    window.addEventListener(EVENT, sync);
    void refreshEntitlements().then(sync);
    sync();
    return () => window.removeEventListener(EVENT, sync);
  }, [enabled]);

  return {
    /** false for every role except CUSTOMER: nothing is locked for them. */
    enabled,
    loaded: !enabled || snap.loaded,
    planName: snap.planName,
    planCode: snap.planCode,
    status: snap.status,
    expiresOn: snap.expiresOn,
    modules: snap.modules,
    hasModule: (m: ModuleKey | null): boolean =>
      !enabled || (m !== null && (m === "ABSCONDED_LIST" || snap.modules.includes(m))),
  };
}
