// // src/lib/modules.ts
// //
// // Maps each frontend route to the sellable module that unlocks it. Mirrors the backend
// // AppModule enum (com.hostel.entity.AppModule): the backend is the real enforcement
// // (ModuleAccessFilter); this map only drives lock icons and the route guard.
// // Adding a module = one line here + one line in AppModule.java.

// export type ModuleKey =
//   | "ABSCONDED_LIST" | "DASHBOARD" | "STAFF_REGISTER" | "BRANCH" | "ROOMS" | "TENANTS"
//   | "CHECKOUT" | "EB_READINGS" | "DAMAGES" | "RENT" | "PAYMENTS" | "EXPENSES"
//   | "COMPLAINTS" | "MAINTENANCE" | "VISITORS" | "FOOD_TIMETABLE" | "SUNDAY_MEAL"
//   | "ANNOUNCEMENTS" | "RULES_REGULATIONS" | "TICKETS";

// export const ROUTE_MODULES: { path: string; module: ModuleKey }[] = [
//   { path: "/absconded",         module: "ABSCONDED_LIST" },
//   { path: "/dashboard",         module: "DASHBOARD" },
//   { path: "/staff-register",    module: "STAFF_REGISTER" },
//   { path: "/branch",            module: "BRANCH" },
//   { path: "/rooms",             module: "ROOMS" },
//   { path: "/tenants",           module: "TENANTS" },
//   { path: "/checkout",          module: "CHECKOUT" },
//   { path: "/eb-readings",       module: "EB_READINGS" },
//   { path: "/damages",           module: "DAMAGES" },
//   { path: "/rent",              module: "RENT" },
//   { path: "/payments",          module: "PAYMENTS" },
//   { path: "/expenses",          module: "EXPENSES" },
//   { path: "/complaints",        module: "COMPLAINTS" },
//   { path: "/maintenance",       module: "MAINTENANCE" },
//   { path: "/visitor",           module: "VISITORS" },
//   { path: "/food-timetable",    module: "FOOD_TIMETABLE" },
//   { path: "/sunday-meal",       module: "SUNDAY_MEAL" },
//   { path: "/announcements",     module: "ANNOUNCEMENTS" },
//   { path: "/rules-regulations", module: "RULES_REGULATIONS" },
//   { path: "/tickets",           module: "TICKETS" },
// ];

// /** Pages every signed-in customer may open whatever their plan. */
// const CUSTOMER_ALWAYS_ALLOWED = ["/profile"];

// export const LOCK_MESSAGE = "This feature is locked. Upgrade your plan to access it.";

// const matches = (pathname: string, base: string) =>
//   pathname === base || pathname.startsWith(base + "/");

// export const moduleForPath = (pathname: string): ModuleKey | null =>
//   ROUTE_MODULES.find((r) => matches(pathname, r.path))?.module ?? null;

// /** Default-deny: a path that is neither always-allowed nor owned by an unlocked module is blocked. */
// export const isPathAllowedForCustomer = (pathname: string, unlocked: string[]): boolean => {
//   if (CUSTOMER_ALWAYS_ALLOWED.some((p) => matches(pathname, p))) return true;
//   const m = moduleForPath(pathname);
//   return m !== null && unlocked.includes(m);
// };

























// src/lib/modules.ts
//
// Maps each frontend route to the sellable module that unlocks it. Mirrors the backend
// AppModule enum (com.hostel.entity.AppModule): the backend is the real enforcement
// (ModuleAccessFilter); this map only drives lock icons and the route guard.
// Adding a module = one line here + one line in AppModule.java.

export type ModuleKey =
  | "ABSCONDED_LIST" | "DASHBOARD" | "STAFF_REGISTER" | "BRANCH" | "ROOMS" | "TENANTS"
  | "CHECKOUT" | "EB_READINGS" | "DAMAGES" | "RENT" | "PAYMENTS" | "EXPENSES"
  | "COMPLAINTS" | "MAINTENANCE" | "VISITORS" | "FOOD_TIMETABLE" | "SUNDAY_MEAL"
  | "ANNOUNCEMENTS" | "RULES_REGULATIONS" | "TICKETS";

export const ROUTE_MODULES: { path: string; module: ModuleKey }[] = [
  { path: "/absconded",         module: "ABSCONDED_LIST" },
  { path: "/dashboard",         module: "DASHBOARD" },
  { path: "/staff-register",    module: "STAFF_REGISTER" },
  { path: "/branch",            module: "BRANCH" },
  { path: "/rooms",             module: "ROOMS" },
  { path: "/tenants",           module: "TENANTS" },
  { path: "/checkout",          module: "CHECKOUT" },
  { path: "/eb-readings",       module: "EB_READINGS" },
  { path: "/damages",           module: "DAMAGES" },
  { path: "/rent",              module: "RENT" },
  { path: "/payments",          module: "PAYMENTS" },
  { path: "/expenses",          module: "EXPENSES" },
  { path: "/complaints",        module: "COMPLAINTS" },
  { path: "/maintenance",       module: "MAINTENANCE" },
  { path: "/visitor",           module: "VISITORS" },
  { path: "/food-timetable",    module: "FOOD_TIMETABLE" },
  { path: "/sunday-meal",       module: "SUNDAY_MEAL" },
  { path: "/announcements",     module: "ANNOUNCEMENTS" },
  { path: "/rules-regulations", module: "RULES_REGULATIONS" },
  { path: "/tickets",           module: "TICKETS" },
];

/** Pages every signed-in customer may open whatever their plan. */
const CUSTOMER_ALWAYS_ALLOWED = ["/profile", "/plans"];

export const LOCK_MESSAGE = "This feature is locked. Upgrade your plan to access it.";

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

export const moduleForPath = (pathname: string): ModuleKey | null =>
  ROUTE_MODULES.find((r) => matches(pathname, r.path))?.module ?? null;

/** Default-deny: a path that is neither always-allowed nor owned by an unlocked module is blocked. */
export const isPathAllowedForCustomer = (pathname: string, unlocked: string[]): boolean => {
  if (CUSTOMER_ALWAYS_ALLOWED.some((p) => matches(pathname, p))) return true;
  const m = moduleForPath(pathname);
  return m !== null && unlocked.includes(m);
};
