// import { useEffect, useState, type ReactNode } from "react";
// import api from "@/lib/api";
// import { Button } from "@/components/ui/button";
// import {
//   Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
// } from "@/components/ui/select";
// import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// type Option = { id: number; name: string };
// type Row = {
//   tenantId: number; tenantName: string; phone: string;
//   idProofNumber?: string | null;
//   hostelAdminId?: number | null; hostelAdminName?: string | null;
//   hostelName?: string | null; branchName?: string | null;
//   status: string; abscondedReason?: string | null;
//   flaggedDate?: string | null; flaggedBy?: string | null;
// };
// type PageData = {
//   content: Row[]; totalElements: number; page: number; size: number;
//   admins: Option[]; branches: Option[];
// };

// const PAGE_SIZE = 10;
// const dash = (v?: string | number | null) =>
//   v === null || v === undefined || v === "" ? "—" : String(v);

// const HEADERS = [
//   "Tenant", "Contact", "Hostel Admin", "Hostel / Branch",
//   "ID Proof Number", "Status", "Reason / Note", "Flagged",
// ];

// interface AbscondedListPanelProps {
//   /** Data is fetched only while true (lets a closed dialog skip the request). */
//   active: boolean;
//   /** Renders the heading area; receives the total so it can show the count badge. */
//   renderHeader?: (total: number) => ReactNode;
// }

// const AbscondedListPanel = ({ active, renderHeader }: AbscondedListPanelProps) => {
//   const [data, setData] = useState<PageData | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [page, setPage] = useState(0);
//   const [search, setSearch] = useState("");
//   const [debounced, setDebounced] = useState("");
//   const [adminId, setAdminId] = useState("all");
//   const [unitId, setUnitId] = useState("all");

//   useEffect(() => {
//     const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 400);
//     return () => clearTimeout(t);
//   }, [search]);

//   // Loads only while active, so the Tenants page load is not affected.
//   useEffect(() => {
//     if (!active) return;
//     let cancelled = false;
//     (async () => {
//       setLoading(true);
//       setError("");
//       try {
//         const params: Record<string, any> = { page, size: PAGE_SIZE };
//         if (adminId !== "all") params.adminId = adminId;
//         if (unitId !== "all") params.unitId = unitId;
//         if (debounced) params.search = debounced;
//         const res = await api.get("/tenants/absconded", { params });
//         if (!cancelled) setData(res.data?.data ?? null);
//       } catch (e: any) {
//         if (!cancelled) setError(e?.response?.data?.message || "Failed to load absconded tenants");
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();
//     return () => { cancelled = true; };
//   }, [active, page, adminId, unitId, debounced]);

//   const total = data?.totalElements ?? 0;
//   const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
//   const rows = data?.content ?? [];

//   const resetFilters = () => {
//     setSearch(""); setDebounced(""); setAdminId("all");
//     setUnitId("all"); setPage(0);
//   };

//   return (
//     <>
//       {renderHeader?.(total)}

//       <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
//         <div className="col-span-2 lg:col-span-1 flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 h-8 bg-white">
//           <Search size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
//           <input
//             aria-label="Search absconded tenants"
//             placeholder="Name, phone, ID proof..."
//             className="w-full min-w-0 text-xs outline-none bg-transparent"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </div>

//         <Select value={adminId} onValueChange={(v) => { setAdminId(v); setPage(0); }}>
//           <SelectTrigger aria-label="Filter by hostel admin" className="h-8 rounded-lg text-xs">
//             <SelectValue placeholder="All Hostel Admins" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All Hostel Admins</SelectItem>
//             {(data?.admins ?? []).map((a) => (
//               <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Select value={unitId} onValueChange={(v) => { setUnitId(v); setPage(0); }}>
//           <SelectTrigger aria-label="Filter by branch" className="h-8 rounded-lg text-xs">
//             <SelectValue placeholder="All Branches" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All Branches</SelectItem>
//             {(data?.branches ?? []).map((b) => (
//               <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <Button variant="outline" className="h-8 rounded-lg text-xs" onClick={resetFilters}>
//           Clear Filters
//         </Button>
//       </div>

//       <div className="mt-3 max-h-[42vh] overflow-auto rounded-lg border border-slate-200">
//         <table className="w-full text-xs table-fixed min-w-[860px]">
//           <colgroup>
//             <col style={{ width: "13%" }} />
//             <col style={{ width: "13%" }} />
//             <col style={{ width: "12%" }} />
//             <col style={{ width: "17%" }} />
//             <col style={{ width: "13%" }} />
//             <col style={{ width: "9%" }} />
//             <col style={{ width: "12%" }} />
//             <col style={{ width: "11%" }} />
//           </colgroup>
//           <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600 sticky top-0 z-[1]">
//             <tr>
//               {HEADERS.map((h) => (
//                 <th key={h} scope="col" className="px-2 py-2 text-left font-bold whitespace-nowrap">{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr><td colSpan={8} className="py-8 text-center text-slate-500">
//                 <Loader2 className="inline h-4 w-4 animate-spin mr-2" aria-hidden="true" />Loading…
//               </td></tr>
//             ) : error ? (
//               <tr><td colSpan={8} className="py-8 text-center text-red-600">{error}</td></tr>
//             ) : rows.length === 0 ? (
//               <tr><td colSpan={8} className="py-8 text-center text-slate-500">No absconded tenants found.</td></tr>
//             ) : (
//               rows.map((r) => (
//                 <tr key={r.tenantId} className="border-t border-slate-100 align-top">
//                   <td className="px-2 py-2 break-words">
//                     <div className="font-semibold text-slate-900">{dash(r.tenantName)}</div>
//                   </td>
//                   <td className="px-2 py-2">
//                     <div className="whitespace-nowrap">{dash(r.phone)}</div>
//                   </td>
//                   <td className="px-2 py-2 break-words">
//                     <div>{dash(r.hostelAdminName)}</div>
//                   </td>
//                   <td className="px-2 py-2 break-words">
//                     <div>{dash(r.hostelName)}</div>
//                     <div className="text-[11px] text-slate-500">{dash(r.branchName)}</div>
//                   </td>
//                   <td className="px-2 py-2 break-all">{dash(r.idProofNumber)}</td>
//                   <td className="px-2 py-2">
//                     <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
//                       {r.status}
//                     </span>
//                   </td>
//                   <td className="px-2 py-2 break-words">{dash(r.abscondedReason)}</td>
//                   <td className="px-2 py-2 break-words">
//                     <div className="whitespace-nowrap">{dash(r.flaggedDate)}</div>
//                     <div className="text-[11px] text-slate-500">{dash(r.flaggedBy)}</div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
//         <div className="text-xs text-slate-600">
//           Showing {total === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
//         </div>
//         <div className="flex items-center gap-2">
//           <Button size="icon" variant="outline" aria-label="Previous page" className="w-7 h-7 rounded-lg"
//             disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
//             <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
//           </Button>
//           <span className="text-xs">Page {page + 1} / {totalPages}</span>
//           <Button size="icon" variant="outline" aria-label="Next page" className="w-7 h-7 rounded-lg"
//             disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
//             <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
//           </Button>
//         </div>
//       </div>
//     </>
//   );
// };

// export default AbscondedListPanel;






















































































import { useEffect, useState, type ReactNode } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Option = { id: number; name: string };
type Row = {
  tenantId: number; tenantName: string; phone: string;
  idProofNumber?: string | null;
  hostelAdminId?: number | null; hostelAdminName?: string | null; hostelAdminPhone?: string | null;
  hostelName?: string | null; branchName?: string | null;
  status: string; abscondedReason?: string | null;
  flaggedDate?: string | null; flaggedBy?: string | null;
};
type PageData = {
  content: Row[]; totalElements: number; page: number; size: number;
  admins: Option[]; branches: Option[];
};

const PAGE_SIZE = 10;
const dash = (v?: string | number | null) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const HEADERS = [
  "Tenant", "Contact", "Hostel Admin", "Hostel / Branch",
  "ID Proof Number", "Status", "Reason / Note", "Flagged",
];

interface AbscondedListPanelProps {
  /** Data is fetched only while true (lets a closed dialog skip the request). */
  active: boolean;
  /** Renders the heading area; receives the total so it can show the count badge. */
  renderHeader?: (total: number) => ReactNode;
  /**
   * Customer mode: nothing is listed until a full phone / Aadhaar / Voter ID / Driving Licence
   * number is typed and Enter is pressed; only the matching tenant(s) are then shown in full.
   */
  searchOnly?: boolean;
}

const AbscondedListPanel = ({ active, renderHeader, searchOnly = false }: AbscondedListPanelProps) => {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [adminId, setAdminId] = useState("all");
  const [unitId, setUnitId] = useState("all");

  useEffect(() => {
    if (searchOnly) return;               // customers search on Enter, not while typing
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search, searchOnly]);

  // Every Enter / Search click runs a fresh lookup, even for the same text.
  const [searchNonce, setSearchNonce] = useState(0);
  const submitSearch = () => { setDebounced(search.trim()); setPage(0); setSearchNonce((n) => n + 1); };

  // Loads only while active, so the Tenants page load is not affected.
  useEffect(() => {
    if (!active) return;
    if (searchOnly && !debounced) { setData(null); setError(""); return; }   // nothing to look up yet
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, any> = { page, size: PAGE_SIZE };
        if (adminId !== "all") params.adminId = adminId;
        if (unitId !== "all") params.unitId = unitId;
        if (debounced) params.search = debounced;
        const res = await api.get("/tenants/absconded", { params });
        if (!cancelled) setData(res.data?.data ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || "Failed to load absconded tenants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, page, adminId, unitId, debounced, searchOnly, searchNonce]);

  const total = data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.content ?? [];

  const resetFilters = () => {
    setSearch(""); setDebounced(""); setAdminId("all");
    setUnitId("all"); setPage(0);
  };

  return (
    <>
      {renderHeader?.(total)}

      <div className={`mt-3 grid grid-cols-2 gap-2 ${searchOnly ? "lg:grid-cols-[1fr_auto_auto]" : "lg:grid-cols-4"}`}>
        <div className={`col-span-2 ${searchOnly ? "lg:col-span-1" : "lg:col-span-1"} flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 h-8 bg-white`}>
          <Search size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
          <input
            aria-label="Search absconded tenants"
            placeholder={searchOnly ? "Phone, Aadhaar, Voter ID or Driving Licence no. — press Enter" : "Name, phone, ID proof..."}
            className="w-full min-w-0 text-xs outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (searchOnly && e.key === "Enter") submitSearch(); }}
          />
        </div>

        {!searchOnly && (<>
        <Select value={adminId} onValueChange={(v) => { setAdminId(v); setPage(0); }}>
          <SelectTrigger aria-label="Filter by hostel admin" className="h-8 rounded-lg text-xs">
            <SelectValue placeholder="All Hostel Admins" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hostel Admins</SelectItem>
            {(data?.admins ?? []).map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={unitId} onValueChange={(v) => { setUnitId(v); setPage(0); }}>
          <SelectTrigger aria-label="Filter by branch" className="h-8 rounded-lg text-xs">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {(data?.branches ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        </>)}

        {searchOnly && (
          <Button className="h-8 rounded-lg text-xs" onClick={submitSearch} disabled={loading}>
            Search
          </Button>
        )}
        <Button variant="outline" className="h-8 rounded-lg text-xs" onClick={resetFilters}>
          {searchOnly ? "Clear" : "Clear Filters"}
        </Button>
      </div>

      <div className="mt-3 max-h-[42vh] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs table-fixed min-w-[860px]">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600 sticky top-0 z-[1]">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} scope="col" className="px-2 py-2 text-left font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" aria-hidden="true" />Loading…
              </td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="py-8 text-center text-red-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500">
                {searchOnly && !debounced
                  ? "Enter a tenant's full phone, Aadhaar, Voter ID or Driving Licence number and press Enter."
                  : searchOnly
                    ? "No absconded record found for that number."
                    : "No absconded tenants found."}
              </td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.tenantId} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-2 break-words">
                    <div className="font-semibold text-slate-900">{dash(r.tenantName)}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="whitespace-nowrap">{dash(r.phone)}</div>
                  </td>
                  <td className="px-2 py-2 break-words">
                    <div>{dash(r.hostelAdminName)}</div>
                    {r.hostelAdminPhone && (
                      <div className="text-[11px] text-slate-500 whitespace-nowrap">{r.hostelAdminPhone}</div>
                    )}
                  </td>
                  <td className="px-2 py-2 break-words">
                    <div>{dash(r.hostelName)}</div>
                    <div className="text-[11px] text-slate-500">{dash(r.branchName)}</div>
                  </td>
                  <td className="px-2 py-2 break-all">{dash(r.idProofNumber)}</td>
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 break-words">{dash(r.abscondedReason)}</td>
                  <td className="px-2 py-2 break-words">
                    <div className="whitespace-nowrap">{dash(r.flaggedDate)}</div>
                    <div className="text-[11px] text-slate-500">{dash(r.flaggedBy)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-slate-600">
          Showing {total === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous page" className="w-7 h-7 rounded-lg"
            disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Button>
          <span className="text-xs">Page {page + 1} / {totalPages}</span>
          <Button size="icon" variant="outline" aria-label="Next page" className="w-7 h-7 rounded-lg"
            disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AbscondedListPanel;
