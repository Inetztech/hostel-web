import { useCallback, useEffect, useState } from "react";
import api from "./api";
import type { PropertyType } from "./types";

const CACHE_MS = 30_000;

let cache: { value: PropertyType | null; ts: number; token: string | null } | null = null;
let inFlight: Promise<PropertyType | null> | null = null;
let inFlightToken: string | null = null;

const currentRole = (): string => (sessionStorage.getItem("role") ?? "").toUpperCase();

export const getMyPropertyType = async (forceRefresh = false): Promise<PropertyType | null> => {
  const token = sessionStorage.getItem("token");

  // SUPER_ADMIN is not tied to one hostel; nothing to resolve.
  if (!token || currentRole() === "SUPER_ADMIN") return null;

  if (
    !forceRefresh &&
    cache &&
    cache.token === token &&
    Date.now() - cache.ts < CACHE_MS
  ) {
    return cache.value;
  }

  if (!forceRefresh && inFlight && inFlightToken === token) return inFlight;

  inFlightToken = token;
  inFlight = (async () => {
    try {
      const res = await api.get("/users/me/property-type");
      const raw = res.data?.data?.propertyType ?? res.data?.propertyType ?? null;
      const value: PropertyType | null = raw === "ROOM" || raw === "FLAT" ? raw : null;
      cache = { value, ts: Date.now(), token };
      return value;
    } catch {
      // Never block the app on this lookup; fall back to the unrestricted UI.
      return null;
    } finally {
      inFlight = null;
      inFlightToken = null;
    }
  })();

  return inFlight;
};

export const invalidatePropertyTypeCache = (): void => {
  cache = null;
};

export function usePropertyType() {
  const [propertyType, setPropertyType] = useState<PropertyType | null>(
    cache && cache.token === sessionStorage.getItem("token") ? cache.value : null
  );
  const [loading, setLoading] = useState<boolean>(
    !(cache && cache.token === sessionStorage.getItem("token")) && currentRole() !== "SUPER_ADMIN"
  );

  const refresh = useCallback(async (force = false) => {
    const value = await getMyPropertyType(force);
    setPropertyType(value);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyPropertyType().then((value) => {
      if (cancelled) return;
      setPropertyType(value);
      setLoading(false);
    });

    // Pick up a Super Admin change when the user returns to the tab.
    const onFocus = () => { refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return {
    propertyType,
    loading,
    isFlatBased: propertyType === "FLAT",
    isRoomBased: propertyType === "ROOM",
    refresh,
  };
}