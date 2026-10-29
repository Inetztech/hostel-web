// src/components/AdminPermissionsDrawer.tsx
//
// Super Admin -> Platform Admin -> Hostels -> "Manage Permissions".
// Lets the Super Admin switch each Hostel Admin PAGE ON/OFF for one specific
// admin (keyed by the admin's user id = admin_id). Changes are only sent when
// "Save Changes" is pressed. The server derives who is acting from the login
// token and re-checks every request, so nothing here is trusted for security.
//
// UX: slides in from the right, closes by itself after a successful save.
//
// NOTE: this drawer is a plain fixed-position panel rendered through a portal
// (NOT the Radix <Sheet>). Radix's scroll-lock and any global "dialog" CSS were
// blocking touch scrolling on mobile, so the panel owns its own scroll area.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Search, ShieldCheck, Loader2, Check, X, Mail, Building2, Clock } from "lucide-react";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminPermissions, saveAdminPermissions } from "@/lib/store";
import type { PermissionCatalogItem, UserPermissionsResponse } from "@/lib/types";

interface AdminPermissionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** users.id of the Hostel Admin (admin_id). */
  adminId: number | null;
  /** Shown while loading and as a fallback if the server sends no hostel name. */
  hostelName?: string;
  onSaved?: () => void;
}

type Filter = "ALL" | "ON" | "OFF";

const SLIDE_MS = 320;

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

const formatDate = (iso?: string | null) => {
  if (!iso) return "Never changed";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
};

const initials = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

/* Motion styles (scoped by the apd- prefix). Respects reduced-motion. */
const MOTION_CSS = `
@keyframes apd-slide-in  { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes apd-slide-out { from { transform: translateX(0); }    to { transform: translateX(100%); } }
@keyframes apd-back-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes apd-back-out  { from { opacity: 1; } to { opacity: 0; } }
@keyframes apd-rise {
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes apd-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes apd-pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
  100% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}
.apd-panel      { animation: apd-slide-in ${SLIDE_MS}ms cubic-bezier(.22,1,.36,1) both; }
.apd-panel-out  { animation: apd-slide-out ${SLIDE_MS}ms cubic-bezier(.55,0,.55,.2) both; }
.apd-back       { animation: apd-back-in ${SLIDE_MS}ms ease-out both; }
.apd-back-out   { animation: apd-back-out ${SLIDE_MS}ms ease-in both; }
.apd-item   { animation: apd-rise 380ms cubic-bezier(.22,1,.36,1) both; }
.apd-fade   { animation: apd-fade 320ms ease-out both; }
.apd-changed{ animation: apd-pulse-ring 700ms ease-out 1; }
.apd-bar    { transition: width 450ms cubic-bezier(.22,1,.36,1); }
.apd-body   { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
@media (prefers-reduced-motion: reduce) {
  .apd-panel, .apd-panel-out, .apd-back, .apd-back-out,
  .apd-item, .apd-fade, .apd-changed { animation: none !important; }
  .apd-bar { transition: none !important; }
}
`;

export default function AdminPermissionsDrawer({
  open, onOpenChange, adminId, hostelName, onSaved,
}: AdminPermissionsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<UserPermissionsResponse | null>(null);
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [confirmDisableAll, setConfirmDisableAll] = useState(false);
  const [confirmSaveRevoke, setConfirmSaveRevoke] = useState(false);

  // Keeps the panel mounted while the slide-out animation plays.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => { setMounted(false); setClosing(false); }, SLIDE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock the page behind the drawer while it is on screen.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  const applyResponse = (res: UserPermissionsResponse) => {
    const on = new Set(res.catalog.filter((c) => c.granted).map((c) => c.name as string));
    setData(res);
    setInitial(on);
    setSelected(new Set(on));
  };

  useEffect(() => {
    if (!open || !adminId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setSearch("");
    setFilter("ALL");
    getAdminPermissions(adminId)
      .then((res) => { if (!cancelled) applyResponse(res); })
      .catch((e: any) => {
        if (!cancelled) toast.error(e?.response?.data?.message || "Failed to load permissions");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, adminId]);

  const close = () => onOpenChange(false);

  // Escape closes the drawer (unless a confirmation or a save is in progress).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !confirmDisableAll && !confirmSaveRevoke) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, confirmDisableAll, confirmSaveRevoke, onOpenChange]);

  const dirty = !sameSet(initial, selected);
  const catalog = data?.catalog ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      if (filter === "ON" && !selected.has(c.name as string)) return false;
      if (filter === "OFF" && selected.has(c.name as string)) return false;
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.module.toLowerCase().includes(q);
    });
  }, [catalog, search, filter, selected]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionCatalogItem[]> = {};
    visible.forEach((c) => { (map[c.module] ??= []).push(c); });
    return map;
  }, [visible]);

  const toggle = (name: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(name); else next.delete(name);
      return next;
    });

  const setModule = (items: PermissionCatalogItem[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((i) => { if (on) next.add(i.name as string); else next.delete(i.name as string); });
      return next;
    });

  const enableAll = () => setSelected(new Set(catalog.map((c) => c.name as string)));
  const disableAll = () => { setSelected(new Set()); setConfirmDisableAll(false); };

  const revokedCount = [...initial].filter((p) => !selected.has(p)).length;

  const doSave = async () => {
    if (!adminId) return;
    try {
      setSaving(true);
      const res = await saveAdminPermissions(adminId, Array.from(selected));
      applyResponse(res);
      toast.success("Permissions updated");
      onSaved?.();
      // Close the drawer right after a successful save.
      setConfirmSaveRevoke(false);
      close();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
      setConfirmSaveRevoke(false);
    }
  };

  // Turning pages OFF takes effect immediately for the admin, so ask first when
  // the save would switch off a lot of pages at once.
  const handleSave = () => {
    if (revokedCount >= 3) setConfirmSaveRevoke(true);
    else void doSave();
  };

  const total = catalog.length;
  const onCount = selected.size;
  const pct = total ? Math.round((onCount / total) * 100) : 0;
  const statusLabel =
    onCount === 0 ? "No access" : onCount >= total ? "Full access" : "Limited access";
  const statusTone =
    onCount === 0
      ? "bg-red-50 text-red-700 ring-red-200"
      : onCount >= total
        ? "bg-green-50 text-green-700 ring-green-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: total },
    { key: "ON", label: "ON", count: onCount },
    { key: "OFF", label: "OFF", count: total - onCount },
  ];

  let rowIndex = 0;

  const panel = mounted
    ? createPortal(
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div
            className={closing ? "apd-back-out" : "apd-back"}
            onClick={() => { if (!saving) close(); }}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
              background: "rgba(15, 23, 42, 0.5)",
            }}
            aria-hidden="true"
          />

          {/* Panel */}
          <aside
            aria-modal="true"
            aria-label="Manage Permissions"
            className={`${closing ? "apd-panel-out" : "apd-panel"} border-l bg-slate-50 shadow-2xl`}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0,
              width: "100%", maxWidth: 576,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* ---------- Header ---------- */}
            <header className="flex shrink-0 items-start gap-3 border-b bg-white px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-tight text-slate-900">Manage Permissions</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Switch Hostel Admin pages ON or OFF for this admin only. Changes apply after you save.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            {/* ---------- Body (own scroll area) ---------- */}
            <div
              className="apd-body px-4 py-4 sm:px-5"
              style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y" }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading permissions…
                </div>
              ) : !data ? (
                <p className="py-24 text-center text-sm text-slate-500">Permissions could not be loaded.</p>
              ) : (
                <>
                  {/* Admin profile card */}
                  <div className="apd-fade rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {initials(data.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{data.name || "—"}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                              data.active === false
                                ? "bg-slate-100 text-slate-600 ring-slate-200"
                                : "bg-green-50 text-green-700 ring-green-200"
                            }`}
                          >
                            {data.active === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <Mail className="h-3 w-3 shrink-0" aria-hidden="true" /> {data.email || "—"}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs">
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1 text-slate-500">
                          <Building2 className="h-3 w-3" aria-hidden="true" /> Hostel
                        </dt>
                        <dd className="truncate font-medium text-slate-800" title={data.hostelName || hostelName || "—"}>
                          {data.hostelName || hostelName || "—"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-slate-500">Admin Name</dt>
                        <dd className="truncate font-medium text-slate-800" title={data.name || "—"}>
                          {data.name || "—"}
                        </dd>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <dt className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3" aria-hidden="true" /> Last updated
                        </dt>
                        <dd className="break-words font-medium text-slate-800">
                          {formatDate(data.lastUpdatedAt)}
                          {data.lastUpdatedBy ? ` · ${data.lastUpdatedBy}` : ""}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Access summary with animated progress bar */}
                  <div className="apd-fade mt-3 rounded-2xl border bg-white p-4 shadow-sm" style={{ animationDelay: "60ms" }}>
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs font-medium text-slate-600" aria-live="polite">
                        {onCount} of {total} pages ON
                      </span>
                    </div>
                    <div
                      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Share of pages switched on"
                    >
                      <div
                        className="apd-bar h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="apd-fade mt-4 space-y-2" style={{ animationDelay: "110ms" }}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search permissions"
                        aria-label="Search permissions"
                        className="h-10 bg-white pl-9 text-base sm:text-sm"
                      />
                    </div>

                    {/* flex (not grid) so global grid rules can't stack these */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        type="button" variant="outline" size="sm"
                        className="h-10 sm:h-9"
                        style={{ flex: "1 1 0%", width: "auto" }}
                        onClick={enableAll} disabled={saving}
                      >
                        Enable All
                      </Button>
                      <Button
                        type="button" variant="outline" size="sm"
                        className="h-10 sm:h-9"
                        style={{ flex: "1 1 0%", width: "auto" }}
                        onClick={() => setConfirmDisableAll(true)}
                        disabled={saving || selected.size === 0}
                      >
                        Disable All
                      </Button>
                    </div>

                    <div className="flex w-full rounded-xl bg-slate-200/70 p-1" role="tablist" aria-label="Filter permissions">
                      {filterTabs.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          role="tab"
                          aria-selected={filter === t.key}
                          onClick={() => setFilter(t.key)}
                          style={{ flex: "1 1 0%" }}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                            filter === t.key
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t.label} <span className="ml-0.5 text-slate-400">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permission groups */}
                  <div className="mt-4 space-y-4 pb-2">
                    {Object.keys(grouped).length === 0 && (
                      <p className="py-8 text-center text-sm text-slate-500">No permissions match your search.</p>
                    )}

                    {Object.entries(grouped).map(([module, items]) => {
                      const moduleOn = items.filter((i) => selected.has(i.name as string)).length;
                      const allOn = moduleOn === items.length;
                      return (
                        <section key={module} className="rounded-2xl border bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center justify-between px-1">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {module}
                              <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
                                {moduleOn}/{items.length}
                              </span>
                            </h3>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setModule(items, !allOn)}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                            >
                              {allOn ? <X className="h-3 w-3" aria-hidden="true" /> : <Check className="h-3 w-3" aria-hidden="true" />}
                              {allOn ? "Turn all OFF" : "Turn all ON"}
                            </button>
                          </div>

                          <ul className="space-y-1.5">
                            {items.map((item) => {
                              const on = selected.has(item.name as string);
                              const changed = on !== initial.has(item.name as string);
                              const delay = Math.min(rowIndex++, 14) * 28;
                              return (
                                <li
                                  key={item.name}
                                  style={{ animationDelay: `${delay}ms` }}
                                  className={`apd-item flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 transition-colors ${
                                    changed
                                      ? "apd-changed border-amber-300 bg-amber-50"
                                      : "border-slate-200 bg-white hover:bg-slate-50"
                                  }`}
                                >
                                  <label
                                    htmlFor={`perm-${item.name}`}
                                    className="flex-1 cursor-pointer pr-3 text-sm font-medium text-slate-700"
                                  >
                                    {item.label}
                                    {changed && (
                                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                        changed
                                      </span>
                                    )}
                                  </label>
                                  <span className={`mr-3 text-xs font-semibold ${on ? "text-green-700" : "text-slate-500"}`}>
                                    {on ? "ON" : "OFF"}
                                  </span>
                                  {/* Self-contained toggle: the project has no @radix-ui/react-switch dependency */}
                                  <button
                                    type="button"
                                    role="switch"
                                    id={`perm-${item.name}`}
                                    aria-checked={on}
                                    aria-label={`${item.label}: ${on ? "ON" : "OFF"}`}
                                    disabled={saving}
                                    onClick={() => toggle(item.name as string, !on)}
                                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                      on ? "bg-blue-600" : "bg-slate-300"
                                    }`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
                                        on ? "translate-x-5" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ---------- Footer ---------- */}
            <footer
              className="flex shrink-0 items-center justify-between gap-2 border-t bg-white px-3 pt-2 sm:px-5 sm:pt-3"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            >
              <span
                className={`min-w-0 truncate text-[11px] font-medium sm:text-xs ${dirty ? "text-amber-700" : "text-slate-400"}`}
                aria-live="polite"
              >
                {dirty ? "● Unsaved changes" : "No changes"}
              </span>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button" variant="outline" className="h-9 px-3"
                  style={{ width: "auto" }}
                  onClick={close} disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="button" className="h-9 px-3"
                  style={{ width: "auto" }}
                  onClick={handleSave}
                  disabled={!dirty || saving || loading || !data}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </footer>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <style>{MOTION_CSS}</style>

      {panel}

      <AlertDialog open={confirmDisableAll} onOpenChange={setConfirmDisableAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable all pages?</AlertDialogTitle>
            <AlertDialogDescription>
              Every page will be switched OFF for this admin. Nothing is saved until you press Save Changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as is</AlertDialogCancel>
            <AlertDialogAction onClick={disableAll}>Disable All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSaveRevoke} onOpenChange={setConfirmSaveRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch off {revokedCount} pages?</AlertDialogTitle>
            <AlertDialogDescription>
              The admin loses access to these pages right away, and wardens under the same hostel lose them too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void doSave(); }} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}