// import { useState, useEffect, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { toast } from "sonner";
// import { getHostels, fetchAllPages, publicRegisterTenant } from "@/lib/store";
// import { FraudCheckResponse } from "@/lib/types";
// import PublicRegisterForm from "@/components/PublicRegistrationForm";
// import { Search, X } from "lucide-react";

// export interface Hostel {
//   id: string | number;
//   name: string;
//   type?: "GENTS" | "LADIES" | "CO-LIVING";
//   location?: string;
//   city?: string;
//   address?: string;
//   startingPrice?: number;
//   rating?: number;
//   reviewsCount?: number;
//   image?: string;
//   gallery?: string[];
//   description?: string;
//   amenities?: string[];
//   roomTypes?: {
//     sharing: string;
//     price: number;
//     availableBeds: number;
//   }[];
// }

// export default function HomePage() {
//   const navigate = useNavigate();
//   const [hostels, setHostels] = useState<Hostel[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
//   const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

//   // Search state — matches against hostel name, location, city, and address
//   const [searchQuery, setSearchQuery] = useState<string>("");

//   // Tab State inside Modal
//   const [activeTab, setActiveTab] = useState<"VISIT" | "REGISTER">("VISIT");

//   // Schedule Visit Form State
//   const [visitDate, setVisitDate] = useState("");
//   const [visitTime, setVisitTime] = useState("10:00 AM");
//   const [fullName, setFullName] = useState("");
//   const [phone, setPhone] = useState("");

//   const DEFAULT_IMAGE =
//     "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

//   const loadHostels = useCallback(async (silent = false) => {
//     if (!silent) setLoading(true);
//     try {
//       const hList = await fetchAllPages<Hostel>(
//         (pg, size) => getHostels(pg, size),
//         10
//       );
//       setHostels(hList);
//     } catch {
//       if (!silent) toast.error("Failed to load hostels");
//     } finally {
//       if (!silent) setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadHostels();

//     const onFocus = () => loadHostels(true);
//     const onVisibility = () => {
//       if (document.visibilityState === "visible") loadHostels(true);
//     };

//     window.addEventListener("focus", onFocus);
//     document.addEventListener("visibilitychange", onVisibility);

//     return () => {
//       window.removeEventListener("focus", onFocus);
//       document.removeEventListener("visibilitychange", onVisibility);
//     };
//   }, [loadHostels]);

//   const handleOpenDetail = (hostel: Hostel) => {
//     setSelectedHostel(hostel);
//     setActiveTab("VISIT");
//   };

//   const handleVisitSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     toast.success(
//       `Visit scheduled for ${selectedHostel?.name} on ${visitDate} at ${visitTime}!`
//     );
//     setVisitDate("");
//     setFullName("");
//     setPhone("");
//     setSelectedHostel(null);
//   };

//   const handleRegisterSubmit = async (formData: FormData) => {
//     try {
//       const newTenant = await publicRegisterTenant(formData);
//       const fraudCheck: FraudCheckResponse | null =
//         (newTenant as any)?.fraudCheck ?? null;

//       if (fraudCheck?.fraud) {
//         toast.warning(
//           "Application received. Our admin team will verify previous record history during document review."
//         );
//       } else {
//         toast.success(
//           `Application submitted for ${selectedHostel?.name}! Your registration is now PENDING approval.`
//         );
//       }
//       setSelectedHostel(null);
//     } catch (e: any) {
//       toast.error(
//         e?.response?.data?.message ||
//           e?.message ||
//           "Application submission failed. Please try again."
//       );
//       throw e;
//     }
//   };

//   // Normalize helper for case-insensitive, whitespace-tolerant matching
//   const normalize = (v?: string) => (v || "").toLowerCase().trim();

//   const filteredHostels = useMemo(() => {
//     const q = normalize(searchQuery);
//     return hostels.filter((h) => {
//       const matchesType =
//         selectedTypeFilter === "ALL" || h.type === selectedTypeFilter;

//       if (!matchesType) return false;
//       if (!q) return true;

//       const haystack = [h.name, h.location, h.city, h.address]
//         .map(normalize)
//         .join(" ");

//       return haystack.includes(q);
//     });
//   }, [hostels, selectedTypeFilter, searchQuery]);

//   // Distinct list of locations/cities for a quick-pick suggestion row
//   const distinctLocations = useMemo(() => {
//     const set = new Set<string>();
//     hostels.forEach((h) => {
//       const loc = h.city || h.location;
//       if (loc) set.add(loc);
//     });
//     return Array.from(set).slice(0, 8);
//   }, [hostels]);

//   return (
//     <div className="min-h-screen bg-slate-50/50 font-['Outfit',sans-serif] text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
//       {/* ── Top Header ── */}
//       <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
//         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
//           <div
//             className="flex items-center gap-3.5 cursor-pointer group"
//             onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
//           >
//             <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
//               🏢
//             </div>
//             <div>
//               <span className="text-2xl font-black tracking-tight block text-slate-900">
//                 Brindha<span className="text-indigo-600">vanam</span>
//               </span>
//               <span className="text-[11px] tracking-wider uppercase text-slate-400 font-bold">
//                 Managed Residences
//               </span>
//             </div>
//           </div>

//           <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
//             <a href="#properties" className="hover:text-indigo-600 transition-colors">
//               Properties
//             </a>
//             <a href="#about" className="hover:text-indigo-600 transition-colors">
//               Experience
//             </a>
//             <a href="#contact" className="hover:text-indigo-600 transition-colors">
//               Support
//             </a>
//           </nav>

//           <button
//             onClick={() => navigate("/login")}
//             className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white shadow-sm hover:shadow-indigo-500/25 transition-all duration-300"
//           >
//             Portal Login
//           </button>
//         </div>
//       </header>

//       {/* ── Hero Section ── */}
//       <section className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-28 px-6 overflow-hidden">
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

//         <div className="max-w-4xl mx-auto text-center relative z-10">
//           <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 backdrop-blur-md">
//             <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
//             Now Accepting Bookings for 2026
//           </div>

//           <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-[1.15]">
//             Redefining Modern Living for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Students & Professionals</span>
//           </h1>
//           <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
//             Experience premium co-living spaces complete with high-speed connectivity, 24/7 security, gourmet dining, and vibrant community areas.
//           </p>

//           {/* Hero Search Bar — search by hostel name or location */}
//           <div className="max-w-xl mx-auto mb-8">
//             <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 border border-white/10 overflow-hidden">
//               <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search by hostel name or location..."
//                 className="w-full bg-transparent px-3 py-4 text-sm text-slate-800 placeholder-slate-400 outline-none"
//               />
//               {searchQuery && (
//                 <button
//                   onClick={() => setSearchQuery("")}
//                   className="pr-4 text-slate-400 hover:text-slate-700 transition-colors"
//                   aria-label="Clear search"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               )}
//             </div>
//             {!searchQuery && distinctLocations.length > 0 && (
//               <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
//                 {distinctLocations.map((loc) => (
//                   <button
//                     key={loc}
//                     onClick={() => setSearchQuery(loc)}
//                     className="text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-colors"
//                   >
//                     📍 {loc}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           <a
//             href="#properties"
//             className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02]"
//           >
//             Explore Available Spaces
//             <span className="text-sm">↓</span>
//           </a>
//         </div>
//       </section>

//       {/* ── Properties Catalog ── */}
//       <section id="properties" className="max-w-7xl mx-auto px-6 py-20 flex-1 w-full">
//         <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/60 gap-6">
//           <div>
//             <div className="flex items-center gap-2 mb-2">
//               <span className="w-8 h-1 rounded-full bg-indigo-600" />
//               <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-600">
//                 Directory
//               </span>
//             </div>
//             <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
//               Our Properties
//             </h2>
//           </div>

//           <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
//             {/* Inline search (also available here, mirrors hero search) */}
//             <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/80 shadow-xs w-full md:w-72">
//               <Search className="w-3.5 h-3.5 text-slate-400 ml-3.5 shrink-0" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search hostel or location..."
//                 className="w-full bg-transparent px-2.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none"
//               />
//               {searchQuery && (
//                 <button
//                   onClick={() => setSearchQuery("")}
//                   className="pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
//                   aria-label="Clear search"
//                 >
//                   <X className="w-3.5 h-3.5" />
//                 </button>
//               )}
//             </div>

//             <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
//               {["ALL", "LADIES", "GENTS", "CO-LIVING"].map((tab) => (
//                 <button
//                   key={tab}
//                   onClick={() => setSelectedTypeFilter(tab)}
//                   className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-xl transition-all ${
//                     selectedTypeFilter === tab
//                       ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
//                       : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
//                   }`}
//                 >
//                   {tab === "ALL" ? "All Branches" : tab}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {loading ? (
//           <div className="py-32 flex flex-col items-center justify-center text-slate-400">
//             <span className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
//             <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
//               Fetching Properties...
//             </span>
//           </div>
//         ) : filteredHostels.length === 0 ? (
//           <div className="py-24 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
//             <p className="text-sm font-semibold">
//               {searchQuery
//                 ? `No properties match "${searchQuery}".`
//                 : "No properties match your filter requirements."}
//             </p>
//             {searchQuery && (
//               <button
//                 onClick={() => setSearchQuery("")}
//                 className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
//               >
//                 Clear Search
//               </button>
//             )}
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {filteredHostels.map((hostel) => (
//               <div
//                 key={hostel.id}
//                 className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
//               >
//                 <div className="relative h-64 overflow-hidden bg-slate-100">
//                   <img
//                     src={hostel.image || DEFAULT_IMAGE}
//                     alt={hostel.name}
//                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
//                   />
//                   {hostel.type && (
//                     <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-indigo-300 text-[10px] font-extrabold tracking-wider uppercase px-3.5 py-1.5 rounded-xl border border-indigo-500/20 shadow-lg">
//                       {hostel.type} Living
//                     </span>
//                   )}
//                 </div>

//                 <div className="p-7 flex-1 flex flex-col justify-between">
//                   <div>
//                     {hostel.location && (
//                       <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
//                         📍 {hostel.location}
//                       </div>
//                     )}
//                     <h3 className="text-xl font-black text-slate-900 mb-2.5 leading-snug">
//                       {hostel.name}
//                     </h3>
//                     <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-normal leading-relaxed">
//                       {hostel.description ||
//                         "A pristine, secure, and modern living facility outfitted with top-tier amenities."}
//                     </p>
//                   </div>

//                   <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
//                     <div>
//                       <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">
//                         Starting from
//                       </span>
//                       <span className="text-xl font-black text-slate-900">
//                         ₹
//                         {hostel.startingPrice
//                           ? hostel.startingPrice.toLocaleString()
//                           : "7,500"}
//                         <span className="text-xs font-semibold text-slate-400">
//                           /mo
//                         </span>
//                       </span>
//                     </div>
//                     <button
//                       onClick={() => navigate(`/property/${hostel.id}`)}
//                       className="bg-stone-900 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-widest px-7 py-4 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-lg"
//                     >
//                       View Details →
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* ── Detailed Modal ── */}
//       {selectedHostel && (
//         <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
//           <div className="bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] h-full flex flex-col shadow-2xl border border-slate-800 overflow-hidden relative text-white">

//             {/* Modal Header */}
//             <div className="bg-slate-900 text-white px-7 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
//               <div className="flex items-center gap-3.5">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">
//                   🏢
//                 </div>
//                 <div>
//                   <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
//                     {selectedHostel.name}
//                   </h2>
//                   {selectedHostel.address && (
//                     <p className="text-[11px] text-indigo-400 font-medium tracking-wide mt-0.5">
//                       📍 {selectedHostel.address}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <button
//                 onClick={() => setSelectedHostel(null)}
//                 className="bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all"
//               >
//                 ✕
//               </button>
//             </div>

//             {/* Modal Body — single scroll region shared by both columns */}
//             <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 items-start">

//               {/* Left Column: Dark Theme Image & Overview (Takes 5 Cols) */}
//               <div className="lg:col-span-5 p-6 sm:p-8 lg:sticky lg:top-0 space-y-6 bg-slate-900 border-r border-slate-800">
//                 <div className="h-52 sm:h-60 rounded-2xl overflow-hidden relative shadow-inner bg-slate-950 border border-slate-800">
//                   <img
//                     src={selectedHostel.image || DEFAULT_IMAGE}
//                     alt={selectedHostel.name}
//                     className="w-full h-full object-cover"
//                   />
//                 </div>

//                 <div>
//                   <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
//                     Property Overview
//                   </h3>
//                   <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
//                     {selectedHostel.description ||
//                       "A state-of-the-art living space designed for maximum comfort, study productivity, and peace of mind."}
//                   </p>
//                 </div>
//               </div>

//               {/* Right Column: Content/Forms (Takes 7 Cols) */}
//               <div className="lg:col-span-7 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between">
//                 <div>
//                   {/* Tab Switcher Header */}
//                   <div className="flex border-b border-slate-800 pb-3 mb-6 gap-6">
//                     <button
//                       onClick={() => setActiveTab("VISIT")}
//                       className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
//                         activeTab === "VISIT"
//                           ? "text-indigo-400"
//                           : "text-slate-400 hover:text-slate-200"
//                       }`}
//                     >
//                       📅 Schedule Visit
//                       {activeTab === "VISIT" && (
//                         <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
//                       )}
//                     </button>
//                     <button
//                       onClick={() => setActiveTab("REGISTER")}
//                       className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
//                         activeTab === "REGISTER"
//                           ? "text-indigo-400"
//                           : "text-slate-400 hover:text-slate-200"
//                       }`}
//                     >
//                       📝 Pre-Register
//                       {activeTab === "REGISTER" && (
//                         <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
//                       )}
//                     </button>
//                   </div>

//                   {/* Tab Content */}
//                   {activeTab === "VISIT" ? (
//                     <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl">
//                       <div className="mb-5">
//                         <h4 className="text-sm font-bold text-white uppercase tracking-wider">
//                           Book Property Tour
//                         </h4>
//                         <p className="text-[11px] text-slate-400 mt-0.5">
//                           Choose a convenient date and time slot to inspect the rooms in person.
//                         </p>
//                       </div>

//                       <form onSubmit={handleVisitSubmit} className="space-y-4">
//                         <div>
//                           <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                             Full Name
//                           </label>
//                           <input
//                             type="text"
//                             required
//                             value={fullName}
//                             onChange={(e) => setFullName(e.target.value)}
//                             placeholder="Rahul Sharma"
//                             className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                           />
//                         </div>

//                         <div>
//                           <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                             Phone Number
//                           </label>
//                           <input
//                             type="tel"
//                             required
//                             value={phone}
//                             onChange={(e) => setPhone(e.target.value)}
//                             placeholder="+91 98765 43210"
//                             className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                           />
//                         </div>

//                         <div className="grid grid-cols-2 gap-3">
//                           <div>
//                             <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                               Visit Date
//                             </label>
//                             <input
//                               type="date"
//                               required
//                               value={visitDate}
//                               onChange={(e) => setVisitDate(e.target.value)}
//                               className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                             />
//                           </div>
//                           <div>
//                             <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                               Time Slot
//                             </label>
//                             <select
//                               value={visitTime}
//                               onChange={(e) => setVisitTime(e.target.value)}
//                               className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                             >
//                               <option>10:00 AM</option>
//                               <option>01:00 PM</option>
//                               <option>04:00 PM</option>
//                               <option>06:00 PM</option>
//                             </select>
//                           </div>
//                         </div>

//                         <button
//                           type="submit"
//                           className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.99]"
//                         >
//                           Confirm Tour Booking
//                         </button>
//                       </form>
//                     </div>
//                   ) : (
//                     <PublicRegisterForm
//                       hostelName={selectedHostel.name}
//                       roomTypes={selectedHostel.roomTypes}
//                       onSubmit={handleRegisterSubmit}
//                       onCancel={() => setSelectedHostel(null)}
//                     />
//                   )}
//                 </div>

//                 <p className="text-[10px] text-slate-500 text-center mt-6">
//                   🔒 All submitted data is encrypted and processed securely.
//                 </p>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}

//       {/* Footer */}
//       <footer id="contact" className="bg-slate-900 text-white py-14 px-6 border-t border-slate-800">
//         <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
//           <div>
//             <h4 className="text-lg font-black tracking-tight text-white">Brindhavanam PG Hostels</h4>
//             <p className="text-xs text-slate-400 mt-1 font-normal">
//               Providing premier corporate and student accommodation solutions.
//             </p>
//           </div>
//           <div className="text-xs text-slate-500 tracking-wider font-medium">
//             &copy; {new Date().getFullYear()} Brindhavanam Hostels. All rights reserved.
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }



























































































// import { useState, useEffect, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { toast } from "sonner";
// import { getHostels, fetchAllPages, publicRegisterTenant, getHostelImagesBatch } from "@/lib/store";
// import api from "@/lib/api";
// import { FraudCheckResponse } from "@/lib/types";
// import PublicRegisterForm from "@/components/PublicRegistrationForm";
// import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

// export interface Hostel {
//   id: string | number;
//   name: string;
//   type?: "GENTS" | "LADIES" | "CO-LIVING";
//   location?: string;
//   city?: string;
//   address?: string;
//   startingPrice?: number;
//   rating?: number;
//   reviewsCount?: number;
//   image?: string;
//   gallery?: string[];
//   description?: string;
//   amenities?: string[];
//   roomTypes?: {
//     sharing: string;
//     price: number;
//     availableBeds: number;
//   }[];
// }

// const resolveImageUrl = (url?: string | null): string | null => {
//   if (!url) return null;
//   if (/^https?:\/\//i.test(url)) return url;
//   const base = api.defaults.baseURL || "";
//   let origin: string;
//   try {
//     origin = new URL(base, window.location.origin).origin;
//   } catch {
//     origin = window.location.origin;
//   }
//   return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
// };

// interface HostelCardImageProps {
//   images: string[];
//   alt: string;
//   fallback: string;
// }

// function HostelCardImage({ images, alt, fallback }: HostelCardImageProps) {
//   const slides = images.length > 0 ? images : [fallback];
//   const [index, setIndex] = useState(0);
//   const [erroredSlides, setErroredSlides] = useState<Record<number, boolean>>({});

//   // Gallery can change (e.g. after a background refresh) — keep index in range.
//   const safeIndex = index % slides.length;
//   const src = erroredSlides[safeIndex] ? fallback : slides[safeIndex];
//   const hasMultiple = slides.length > 1;

//   const goNext = (e?: React.MouseEvent) => {
//     e?.stopPropagation();
//     setIndex((i) => (i + 1) % slides.length);
//   };
//   const goPrev = (e?: React.MouseEvent) => {
//     e?.stopPropagation();
//     setIndex((i) => (i - 1 + slides.length) % slides.length);
//   };

//   return (
//     <div className="relative w-full h-full">
//       <img
//         src={src}
//         alt={alt}
//         onClick={hasMultiple ? goNext : undefined}
//         onError={() =>
//           setErroredSlides((prev) => (prev[safeIndex] ? prev : { ...prev, [safeIndex]: true }))
//         }
//         className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${
//           hasMultiple ? "cursor-pointer" : ""
//         }`}
//       />

//       {hasMultiple && (
//         <>
//           <button
//             type="button"
//             onClick={goPrev}
//             aria-label="Previous photo"
//             className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
//           >
//             <ChevronLeft className="w-4 h-4" />
//           </button>
//           <button
//             type="button"
//             onClick={goNext}
//             aria-label="Next photo"
//             className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
//           >
//             <ChevronRight className="w-4 h-4" />
//           </button>
//           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-sm px-2 py-1 rounded-full">
//             {slides.map((_, i) => (
//               <span
//                 key={i}
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIndex(i);
//                 }}
//                 className={`h-1.5 rounded-full cursor-pointer transition-all ${
//                   i === safeIndex ? "bg-white w-4" : "bg-white/50 w-1.5"
//                 }`}
//               />
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// export default function HomePage() {
//   const navigate = useNavigate();
//   const [hostels, setHostels] = useState<Hostel[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
//   const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

//   // Search state — matches against hostel name, location, city, and address
//   const [searchQuery, setSearchQuery] = useState<string>("");

//   // Tab State inside Modal
//   const [activeTab, setActiveTab] = useState<"VISIT" | "REGISTER">("VISIT");

//   // Schedule Visit Form State
//   const [visitDate, setVisitDate] = useState("");
//   const [visitTime, setVisitTime] = useState("10:00 AM");
//   const [fullName, setFullName] = useState("");
//   const [phone, setPhone] = useState("");

//   const DEFAULT_IMAGE =
//     "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

//   const loadHostels = useCallback(async (silent = false) => {
//     if (!silent) setLoading(true);
//     try {
//       const hList = await fetchAllPages<Hostel>(
//         (pg, size) => getHostels(pg, size),
//         10
//       );

//       // Single batched request for every hostel's images instead of
//       // one getHostelImages() call per hostel. The previous N+1 pattern
//       // (Promise.all over hList calling getHostelImages(id) each) meant
//       // that on a public, unauthenticated page with many hostels, a
//       // burst of N simultaneous requests went out — any individual
//       // failure (timeout, rate limit, transient network blip) was
//       // caught per-hostel and silently fell back to DEFAULT_IMAGE,
//       // which is why some cards showed real photos and others didn't
//       // depending on which requests happened to fail. getHostelImagesBatch
//       // already exists in lib/store for exactly this case (one request,
//       // 30s cache) but wasn't being used here.
//       let imagesByHostelId: Record<number, import("@/lib/types").HostelImageDTO[]> = {};
//       try {
//         imagesByHostelId = await getHostelImagesBatch(
//           hList.map((h) => Number(h.id))
//         );
//       } catch (err) {
//         console.error("[HomePage] getHostelImagesBatch failed — all cards will use DEFAULT_IMAGE.", err);
//       }

//       const hListWithImages = hList.map((h) => {
//         const images = imagesByHostelId[Number(h.id)];
//         if (!images || images.length === 0) return h;

//         const primary = images.find((img) => img.isPrimary) ?? images[0];
//         const gallery = images
//           .map((img) => resolveImageUrl(img.imageUrl))
//           .filter((u): u is string => !!u);

//         return {
//           ...h,
//           image: resolveImageUrl(primary.imageUrl) || h.image,
//           gallery,
//         };
//       });

//       setHostels(hListWithImages);
//     } catch (err) {
//       console.error("[HomePage] loadHostels failed:", err);
//       if (!silent) toast.error("Failed to load hostels");
//     } finally {
//       if (!silent) setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadHostels();

//     const onFocus = () => loadHostels(true);
//     const onVisibility = () => {
//       if (document.visibilityState === "visible") loadHostels(true);
//     };

//     window.addEventListener("focus", onFocus);
//     document.addEventListener("visibilitychange", onVisibility);

//     return () => {
//       window.removeEventListener("focus", onFocus);
//       document.removeEventListener("visibilitychange", onVisibility);
//     };
//   }, [loadHostels]);

//   const handleOpenDetail = (hostel: Hostel) => {
//     setSelectedHostel(hostel);
//     setActiveTab("VISIT");
//   };

//   const handleVisitSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     toast.success(
//       `Visit scheduled for ${selectedHostel?.name} on ${visitDate} at ${visitTime}!`
//     );
//     setVisitDate("");
//     setFullName("");
//     setPhone("");
//     setSelectedHostel(null);
//   };

//   const handleRegisterSubmit = async (formData: FormData) => {
//     try {
//       const newTenant = await publicRegisterTenant(formData);
//       const fraudCheck: FraudCheckResponse | null =
//         (newTenant as any)?.fraudCheck ?? null;

//       if (fraudCheck?.fraud) {
//         toast.warning(
//           "Application received. Our admin team will verify previous record history during document review."
//         );
//       } else {
//         toast.success(
//           `Application submitted for ${selectedHostel?.name}! Your registration is now PENDING approval.`
//         );
//       }
//       setSelectedHostel(null);
//     } catch (e: any) {
//       toast.error(
//         e?.response?.data?.message ||
//           e?.message ||
//           "Application submission failed. Please try again."
//       );
//       throw e;
//     }
//   };

//   // Normalize helper for case-insensitive, whitespace-tolerant matching
//   const normalize = (v?: string) => (v || "").toLowerCase().trim();

//   const filteredHostels = useMemo(() => {
//     const q = normalize(searchQuery);
//     return hostels.filter((h) => {
//       const matchesType =
//         selectedTypeFilter === "ALL" || h.type === selectedTypeFilter;

//       if (!matchesType) return false;
//       if (!q) return true;

//       const haystack = [h.name, h.location, h.city, h.address]
//         .map(normalize)
//         .join(" ");

//       return haystack.includes(q);
//     });
//   }, [hostels, selectedTypeFilter, searchQuery]);

//   // Distinct list of locations/cities for a quick-pick suggestion row
//   const distinctLocations = useMemo(() => {
//     const set = new Set<string>();
//     hostels.forEach((h) => {
//       const loc = h.city || h.location;
//       if (loc) set.add(loc);
//     });
//     return Array.from(set).slice(0, 8);
//   }, [hostels]);

//   return (
//     <div className="min-h-screen bg-slate-50/50 font-['Outfit',sans-serif] text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
//       {/* ── Top Header ── */}
//       <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
//         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
//           <div
//             className="flex items-center gap-3.5 cursor-pointer group"
//             onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
//           >
//             <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
//               🏢
//             </div>
//             <div>
//               <span className="text-2xl font-black tracking-tight block text-slate-900">
//                 Brindha<span className="text-indigo-600">vanam</span>
//               </span>
//               <span className="text-[11px] tracking-wider uppercase text-slate-400 font-bold">
//                 Managed Residences
//               </span>
//             </div>
//           </div>

//           <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
//             <a href="#properties" className="hover:text-indigo-600 transition-colors">
//               Properties
//             </a>
//             <a href="#about" className="hover:text-indigo-600 transition-colors">
//               Experience
//             </a>
//             <a href="#contact" className="hover:text-indigo-600 transition-colors">
//               Support
//             </a>
//           </nav>

//           <button
//             onClick={() => navigate("/login")}
//             className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white shadow-sm hover:shadow-indigo-500/25 transition-all duration-300"
//           >
//             Portal Login
//           </button>
//         </div>
//       </header>

//       {/* ── Hero Section ── */}
//       <section className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-28 px-6 overflow-hidden">
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

//         <div className="max-w-4xl mx-auto text-center relative z-10">
//           <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 backdrop-blur-md">
//             <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
//             Rooms Filling Fast — Book Your Visit Today
//           </div>

//           <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-[1.15]">
//             Safe, Comfortable PG Stays for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Students & Working Professionals</span>
//           </h1>
//           <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
//             Find verified hostels with flexible sharing options, home-style meals, 24/7 security, and high-speed Wi-Fi — schedule a visit or register online in minutes.
//           </p>

//           {/* Hero Search Bar — search by hostel name or location */}
//           <div className="max-w-xl mx-auto mb-8">
//             <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 border border-white/10 overflow-hidden">
//               <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search by hostel name or location..."
//                 className="w-full bg-transparent px-3 py-4 text-sm text-slate-800 placeholder-slate-400 outline-none"
//               />
//               {searchQuery && (
//                 <button
//                   onClick={() => setSearchQuery("")}
//                   className="pr-4 text-slate-400 hover:text-slate-700 transition-colors"
//                   aria-label="Clear search"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               )}
//             </div>
//             {!searchQuery && distinctLocations.length > 0 && (
//               <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
//                 {distinctLocations.map((loc) => (
//                   <button
//                     key={loc}
//                     onClick={() => setSearchQuery(loc)}
//                     className="text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-colors"
//                   >
//                     📍 {loc}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           <a
//             href="#properties"
//             className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02]"
//           >
//             Explore Available Spaces
//             <span className="text-sm">↓</span>
//           </a>
//         </div>
//       </section>

//       {/* ── Properties Catalog ── */}
//       <section id="properties" className="max-w-7xl mx-auto px-6 py-20 flex-1 w-full">
//         <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/60 gap-6">
//           <div>
//             <div className="flex items-center gap-2 mb-2">
//               <span className="w-8 h-1 rounded-full bg-indigo-600" />
//               <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-600">
//                 Directory
//               </span>
//             </div>
//             <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
//               Our Properties
//             </h2>
//           </div>

//           <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
//             {/* Inline search (also available here, mirrors hero search) */}
//             <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/80 shadow-xs w-full md:w-72">
//               <Search className="w-3.5 h-3.5 text-slate-400 ml-3.5 shrink-0" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search hostel or location..."
//                 className="w-full bg-transparent px-2.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none"
//               />
//               {searchQuery && (
//                 <button
//                   onClick={() => setSearchQuery("")}
//                   className="pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
//                   aria-label="Clear search"
//                 >
//                   <X className="w-3.5 h-3.5" />
//                 </button>
//               )}
//             </div>

//             <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
//               {["ALL", "LADIES", "GENTS", "CO-LIVING"].map((tab) => (
//                 <button
//                   key={tab}
//                   onClick={() => setSelectedTypeFilter(tab)}
//                   className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-xl transition-all ${
//                     selectedTypeFilter === tab
//                       ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
//                       : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
//                   }`}
//                 >
//                   {tab === "ALL" ? "All Branches" : tab}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {loading ? (
//           <div className="py-32 flex flex-col items-center justify-center text-slate-400">
//             <span className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
//             <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
//               Fetching Properties...
//             </span>
//           </div>
//         ) : filteredHostels.length === 0 ? (
//           <div className="py-24 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
//             <p className="text-sm font-semibold">
//               {searchQuery
//                 ? `No properties match "${searchQuery}".`
//                 : "No properties match your filter requirements."}
//             </p>
//             {searchQuery && (
//               <button
//                 onClick={() => setSearchQuery("")}
//                 className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
//               >
//                 Clear Search
//               </button>
//             )}
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {filteredHostels.map((hostel) => (
//               <div
//                 key={hostel.id}
//                 className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
//               >
//                 <div className="relative h-64 overflow-hidden bg-slate-100">
//                   <HostelCardImage
//                     images={
//                       hostel.gallery && hostel.gallery.length > 0
//                         ? hostel.gallery
//                         : hostel.image
//                         ? [hostel.image]
//                         : []
//                     }
//                     alt={hostel.name}
//                     fallback={DEFAULT_IMAGE}
//                   />
//                   {hostel.type && (
//                     <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-indigo-300 text-[10px] font-extrabold tracking-wider uppercase px-3.5 py-1.5 rounded-xl border border-indigo-500/20 shadow-lg pointer-events-none">
//                       {hostel.type} Living
//                     </span>
//                   )}
//                 </div>

//                 <div className="p-7 flex-1 flex flex-col justify-between">
//                   <div>
//                     {hostel.location && (
//                       <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
//                         📍 {hostel.location}
//                       </div>
//                     )}
//                     <h3 className="text-xl font-black text-slate-900 mb-2.5 leading-snug">
//                       {hostel.name}
//                     </h3>
//                     <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-normal leading-relaxed">
//                       {hostel.description ||
//                         "A pristine, secure, and modern living facility outfitted with top-tier amenities."}
//                     </p>
//                   </div>

//                   <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
//                     <div>
//                       <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">
//                         Starting from
//                       </span>
//                       <span className="text-xl font-black text-slate-900">
//                         ₹
//                         {hostel.startingPrice
//                           ? hostel.startingPrice.toLocaleString()
//                           : "7,500"}
//                         <span className="text-xs font-semibold text-slate-400">
//                           /mo
//                         </span>
//                       </span>
//                     </div>
//                     <button
//                       onClick={() => navigate(`/property/${hostel.id}`)}
//                       className="bg-stone-900 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-widest px-7 py-4 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-lg"
//                     >
//                       View Details →
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* ── Detailed Modal ── */}
//       {selectedHostel && (
//         <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
//           <div className="bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] h-full flex flex-col shadow-2xl border border-slate-800 overflow-hidden relative text-white">

//             {/* Modal Header */}
//             <div className="bg-slate-900 text-white px-7 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
//               <div className="flex items-center gap-3.5">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">
//                   🏢
//                 </div>
//                 <div>
//                   <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
//                     {selectedHostel.name}
//                   </h2>
//                   {selectedHostel.address && (
//                     <p className="text-[11px] text-indigo-400 font-medium tracking-wide mt-0.5">
//                       📍 {selectedHostel.address}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <button
//                 onClick={() => setSelectedHostel(null)}
//                 className="bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all"
//               >
//                 ✕
//               </button>
//             </div>

//             {/* Modal Body — single scroll region shared by both columns */}
//             <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 items-start">

//               {/* Left Column: Dark Theme Image & Overview (Takes 5 Cols) */}
//               <div className="lg:col-span-5 p-6 sm:p-8 lg:sticky lg:top-0 space-y-6 bg-slate-900 border-r border-slate-800">
//                 <div className="h-52 sm:h-60 rounded-2xl overflow-hidden relative shadow-inner bg-slate-950 border border-slate-800 group">
//                   <HostelCardImage
//                     images={
//                       selectedHostel.gallery && selectedHostel.gallery.length > 0
//                         ? selectedHostel.gallery
//                         : selectedHostel.image
//                         ? [selectedHostel.image]
//                         : []
//                     }
//                     alt={selectedHostel.name}
//                     fallback={DEFAULT_IMAGE}
//                   />
//                 </div>

//                 <div>
//                   <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
//                     Property Overview
//                   </h3>
//                   <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
//                     {selectedHostel.description ||
//                       "A state-of-the-art living space designed for maximum comfort, study productivity, and peace of mind."}
//                   </p>
//                 </div>
//               </div>

//               {/* Right Column: Content/Forms (Takes 7 Cols) */}
//               <div className="lg:col-span-7 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between">
//                 <div>
//                   {/* Tab Switcher Header */}
//                   <div className="flex border-b border-slate-800 pb-3 mb-6 gap-6">
//                     <button
//                       onClick={() => setActiveTab("VISIT")}
//                       className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
//                         activeTab === "VISIT"
//                           ? "text-indigo-400"
//                           : "text-slate-400 hover:text-slate-200"
//                       }`}
//                     >
//                       📅 Schedule Visit
//                       {activeTab === "VISIT" && (
//                         <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
//                       )}
//                     </button>
//                     <button
//                       onClick={() => setActiveTab("REGISTER")}
//                       className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
//                         activeTab === "REGISTER"
//                           ? "text-indigo-400"
//                           : "text-slate-400 hover:text-slate-200"
//                       }`}
//                     >
//                       📝 Pre-Register
//                       {activeTab === "REGISTER" && (
//                         <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
//                       )}
//                     </button>
//                   </div>

//                   {/* Tab Content */}
//                   {activeTab === "VISIT" ? (
//                     <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl">
//                       <div className="mb-5">
//                         <h4 className="text-sm font-bold text-white uppercase tracking-wider">
//                           Book Property Tour
//                         </h4>
//                         <p className="text-[11px] text-slate-400 mt-0.5">
//                           Choose a convenient date and time slot to inspect the rooms in person.
//                         </p>
//                       </div>

//                       <form onSubmit={handleVisitSubmit} className="space-y-4">
//                         <div>
//                           <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                             Full Name
//                           </label>
//                           <input
//                             type="text"
//                             required
//                             value={fullName}
//                             onChange={(e) => setFullName(e.target.value)}
//                             placeholder="Rahul Sharma"
//                             className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                           />
//                         </div>

//                         <div>
//                           <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                             Phone Number
//                           </label>
//                           <input
//                             type="tel"
//                             required
//                             value={phone}
//                             onChange={(e) => setPhone(e.target.value)}
//                             placeholder="+91 98765 43210"
//                             className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                           />
//                         </div>

//                         <div className="grid grid-cols-2 gap-3">
//                           <div>
//                             <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                               Visit Date
//                             </label>
//                             <input
//                               type="date"
//                               required
//                               value={visitDate}
//                               onChange={(e) => setVisitDate(e.target.value)}
//                               className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                             />
//                           </div>
//                           <div>
//                             <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
//                               Time Slot
//                             </label>
//                             <select
//                               value={visitTime}
//                               onChange={(e) => setVisitTime(e.target.value)}
//                               className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
//                             >
//                               <option>10:00 AM</option>
//                               <option>01:00 PM</option>
//                               <option>04:00 PM</option>
//                               <option>06:00 PM</option>
//                             </select>
//                           </div>
//                         </div>

//                         <button
//                           type="submit"
//                           className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.99]"
//                         >
//                           Confirm Tour Booking
//                         </button>
//                       </form>
//                     </div>
//                   ) : (
//                     <PublicRegisterForm
//                       hostelName={selectedHostel.name}
//                       roomTypes={selectedHostel.roomTypes}
//                       onSubmit={handleRegisterSubmit}
//                       onCancel={() => setSelectedHostel(null)}
//                     />
//                   )}
//                 </div>

//                 <p className="text-[10px] text-slate-500 text-center mt-6">
//                   🔒 All submitted data is encrypted and processed securely.
//                 </p>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}

//       {/* Footer */}
//       <footer id="contact" className="bg-slate-900 text-white py-14 px-6 border-t border-slate-800">
//         <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
//           <div>
//             <h4 className="text-lg font-black tracking-tight text-white">Brindhavanam PG Hostels</h4>
//             <p className="text-xs text-slate-400 mt-1 font-normal">
//               Providing premier corporate and student accommodation solutions.
//             </p>
//           </div>
//           <div className="text-xs text-slate-500 tracking-wider font-medium">
//             &copy; {new Date().getFullYear()} Brindhavanam Hostels. All rights reserved.
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }





































































































import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getHostels, fetchAllPages, publicRegisterTenant, getHostelImagesBatch, getPublicStartingPrices, getPublicRoomTypesForHostel } from "@/lib/store";
import api from "@/lib/api";
import { FraudCheckResponse, PublicRoomTypeSummary } from "@/lib/types";
import PublicRegisterForm from "@/components/PublicRegistrationForm";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

export interface Hostel {
  id: string | number;
  name: string;
  type?: "GENTS" | "LADIES" | "CO-LIVING";
  location?: string;
  city?: string;
  address?: string;
  startingPrice?: number;
  rating?: number;
  reviewsCount?: number;
  image?: string;
  gallery?: string[];
  description?: string;
  amenities?: string[];
  roomTypes?: PublicRoomTypeSummary[];
}

const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = api.defaults.baseURL || "";
  let origin: string;
  try {
    origin = new URL(base, window.location.origin).origin;
  } catch {
    origin = window.location.origin;
  }
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

interface HostelCardImageProps {
  images: string[];
  alt: string;
  fallback: string;
}

function HostelCardImage({ images, alt, fallback }: HostelCardImageProps) {
  const slides = images.length > 0 ? images : [fallback];
  const [index, setIndex] = useState(0);
  const [erroredSlides, setErroredSlides] = useState<Record<number, boolean>>({});

  // Gallery can change (e.g. after a background refresh) — keep index in range.
  const safeIndex = index % slides.length;
  const src = erroredSlides[safeIndex] ? fallback : slides[safeIndex];
  const hasMultiple = slides.length > 1;

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i + 1) % slides.length);
  };
  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        onClick={hasMultiple ? goNext : undefined}
        onError={() =>
          setErroredSlides((prev) => (prev[safeIndex] ? prev : { ...prev, [safeIndex]: true }))
        }
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${
          hasMultiple ? "cursor-pointer" : ""
        }`}
      />

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-sm px-2 py-1 rounded-full">
            {slides.map((_, i) => (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${
                  i === safeIndex ? "bg-white w-4" : "bg-white/50 w-1.5"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

  // Search state — matches against hostel name, location, city, and address
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Tab State inside Modal
  const [activeTab, setActiveTab] = useState<"VISIT" | "REGISTER">("VISIT");

  // Schedule Visit Form State
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00 AM");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

  const loadHostels = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const hList = await fetchAllPages<Hostel>(
        (pg, size) => getHostels(pg, size),
        10
      );

      // Single batched request for every hostel's images instead of
      // one getHostelImages() call per hostel. The previous N+1 pattern
      // (Promise.all over hList calling getHostelImages(id) each) meant
      // that on a public, unauthenticated page with many hostels, a
      // burst of N simultaneous requests went out — any individual
      // failure (timeout, rate limit, transient network blip) was
      // caught per-hostel and silently fell back to DEFAULT_IMAGE,
      // which is why some cards showed real photos and others didn't
      // depending on which requests happened to fail. getHostelImagesBatch
      // already exists in lib/store for exactly this case (one request,
      // 30s cache) but wasn't being used here.
      let imagesByHostelId: Record<number, import("@/lib/types").HostelImageDTO[]> = {};
      try {
        imagesByHostelId = await getHostelImagesBatch(
          hList.map((h) => Number(h.id))
        );
      } catch (err) {
        console.error("[HomePage] getHostelImagesBatch failed — all cards will use DEFAULT_IMAGE.", err);
      }

      // Real per-hostel starting price via the public, unauthenticated
      // /api/rooms/public/starting-prices endpoint (min rentPerBed per
      // hostel, computed server-side in RoomServiceImpl). This used to
      // call fetchBranches()/fetchRooms() directly from this page, which
      // hit the authenticated /api/rooms endpoint and 403'd for anonymous
      // homepage visitors (RoomController.getAllRooms requires
      // SUPER_ADMIN/TENANT/ADMIN+WARDEN — it was never meant to be public).
      // The dedicated endpoint returns only {hostelId: minPrice}, nothing
      // else about the rooms, so no admin/pricing/occupancy data leaks.
      let minPriceByHostelId: Record<number, number> = {};
      try {
        minPriceByHostelId = await getPublicStartingPrices(
          hList.map((h) => Number(h.id))
        );
      } catch (err) {
        console.error("[HomePage] Failed to fetch public starting prices.", err);
      }

      const hListWithImages = hList.map((h) => {
        const images = imagesByHostelId[Number(h.id)];
        const minPrice = minPriceByHostelId[Number(h.id)];

        const withPrice = minPrice != null ? { ...h, startingPrice: minPrice } : h;

        if (!images || images.length === 0) return withPrice;

        const primary = images.find((img) => img.isPrimary) ?? images[0];
        const gallery = images
          .map((img) => resolveImageUrl(img.imageUrl))
          .filter((u): u is string => !!u);

        return {
          ...withPrice,
          image: resolveImageUrl(primary.imageUrl) || withPrice.image,
          gallery,
        };
      });

      setHostels(hListWithImages);
    } catch (err) {
      console.error("[HomePage] loadHostels failed:", err);
      if (!silent) toast.error("Failed to load hostels");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHostels();

    const onFocus = () => loadHostels(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadHostels(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadHostels]);

  const handleOpenDetail = async (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setActiveTab("VISIT");

    // roomTypes isn't fetched in the initial list load (only images +
    // starting prices are batched there). Fetch it lazily here, via the
    // public, unauthenticated /rooms/public/room-types endpoint — the
    // authenticated /rooms endpoint 403s for anonymous homepage visitors.
    if (!hostel.roomTypes || hostel.roomTypes.length === 0) {
      try {
        const roomTypes = await getPublicRoomTypesForHostel(hostel.id);
        setSelectedHostel((prev) =>
          prev && String(prev.id) === String(hostel.id) ? { ...prev, roomTypes } : prev
        );
        // cache it on the list too, so reopening the same card is instant
        setHostels((prev) =>
          prev.map((h) => (String(h.id) === String(hostel.id) ? { ...h, roomTypes } : h))
        );
      } catch (err) {
        console.error(`[HomePage] getPublicRoomTypesForHostel(${hostel.id}) failed`, err);
      }
    }
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      `Visit scheduled for ${selectedHostel?.name} on ${visitDate} at ${visitTime}!`
    );
    setVisitDate("");
    setFullName("");
    setPhone("");
    setSelectedHostel(null);
  };

  const handleRegisterSubmit = async (formData: FormData) => {
    try {
      const newTenant = await publicRegisterTenant(formData);
      const fraudCheck: FraudCheckResponse | null =
        (newTenant as any)?.fraudCheck ?? null;

      if (fraudCheck?.fraud) {
        toast.warning(
          "Application received. Our admin team will verify previous record history during document review."
        );
      } else {
        toast.success(
          `Application submitted for ${selectedHostel?.name}! Your registration is now PENDING approval.`
        );
      }
      setSelectedHostel(null);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Application submission failed. Please try again."
      );
      throw e;
    }
  };

  // Normalize helper for case-insensitive, whitespace-tolerant matching
  const normalize = (v?: string) => (v || "").toLowerCase().trim();

  const filteredHostels = useMemo(() => {
    const q = normalize(searchQuery);
    return hostels.filter((h) => {
      const matchesType =
        selectedTypeFilter === "ALL" || h.type === selectedTypeFilter;

      if (!matchesType) return false;
      if (!q) return true;

      const haystack = [h.name, h.location, h.city, h.address]
        .map(normalize)
        .join(" ");

      return haystack.includes(q);
    });
  }, [hostels, selectedTypeFilter, searchQuery]);

  // Distinct list of locations/cities for a quick-pick suggestion row
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    hostels.forEach((h) => {
      const loc = h.city || h.location;
      if (loc) set.add(loc);
    });
    return Array.from(set).slice(0, 8);
  }, [hostels]);

  // ── Dynamic footer link columns ──
  // Built straight from the live hostels list (not hardcoded), grouped
  // by location -> the hostel types actually available there, e.g.
  // "Ladies PG in Chennai", "Co-living in Cuddalore" — only rendered
  // when that combination genuinely exists in the data, and each link
  // is functional (filters + scrolls to the properties grid).
  const TYPE_LABELS: Record<string, string> = {
    LADIES: "Ladies PG",
    GENTS: "Gents PG",
    "CO-LIVING": "Co-living",
  };

  const footerLocationColumns = useMemo(() => {
    const byLocation = new Map<string, Set<string>>();
    hostels.forEach((h) => {
      const loc = h.city || h.location;
      if (!loc) return;
      if (!byLocation.has(loc)) byLocation.set(loc, new Set());
      if (h.type) byLocation.get(loc)!.add(h.type);
    });

    return Array.from(byLocation.entries())
      .slice(0, 4)
      .map(([location, types]) => ({
        location,
        types: Array.from(types),
      }));
  }, [hostels]);

  const handleFooterLinkClick = (location: string, type?: string) => {
    setSearchQuery(location);
    setSelectedTypeFilter(type ?? "ALL");
    document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-['Outfit',sans-serif] text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
              🏢
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight block text-slate-900">
                Brindha<span className="text-indigo-600">vanam</span>
              </span>
              <span className="text-[11px] tracking-wider uppercase text-slate-400 font-bold">
                Managed Residences
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#properties" className="hover:text-indigo-600 transition-colors">
              Properties
            </a>
            <a href="#about" className="hover:text-indigo-600 transition-colors">
              Experience
            </a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">
              Support
            </a>
          </nav>

          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white shadow-sm hover:shadow-indigo-500/25 transition-all duration-300"
          >
            Portal Login
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-28 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Now Accepting Bookings for 2026
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-[1.15]">
            Redefining Modern Living for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Students & Professionals</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
            Experience premium co-living spaces complete with high-speed connectivity, 24/7 security, gourmet dining, and vibrant community areas.
          </p>

          {/* Hero Search Bar — search by hostel name or location */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 border border-white/10 overflow-hidden">
              <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by hostel name or location..."
                className="w-full bg-transparent px-3 py-4 text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="pr-4 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {!searchQuery && distinctLocations.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {distinctLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setSearchQuery(loc)}
                    className="text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-colors"
                  >
                    📍 {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="#properties"
            className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02]"
          >
            Explore Available Spaces
            <span className="text-sm">↓</span>
          </a>
        </div>
      </section>

      {/* ── Properties Catalog ── */}
      <section id="properties" className="max-w-7xl mx-auto px-6 py-20 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/60 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-1 rounded-full bg-indigo-600" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-600">
                Directory
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Our Properties
            </h2>
          </div>

          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
            {/* Inline search (also available here, mirrors hero search) */}
            <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/80 shadow-xs w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hostel or location..."
                className="w-full bg-transparent px-2.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
              {["ALL", "LADIES", "GENTS", "CO-LIVING"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTypeFilter(tab)}
                  className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-xl transition-all ${
                    selectedTypeFilter === tab
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab === "ALL" ? "All Branches" : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-slate-400">
            <span className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Fetching Properties...
            </span>
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="py-24 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-sm font-semibold">
              {searchQuery
                ? `No properties match "${searchQuery}".`
                : "No properties match your filter requirements."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHostels.map((hostel) => (
              <div
                key={hostel.id}
                className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-64 overflow-hidden bg-slate-100">
                  <HostelCardImage
                    images={
                      hostel.gallery && hostel.gallery.length > 0
                        ? hostel.gallery
                        : hostel.image
                        ? [hostel.image]
                        : []
                    }
                    alt={hostel.name}
                    fallback={DEFAULT_IMAGE}
                  />
                  {hostel.type && (
                    <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-indigo-300 text-[10px] font-extrabold tracking-wider uppercase px-3.5 py-1.5 rounded-xl border border-indigo-500/20 shadow-lg pointer-events-none">
                      {hostel.type} Living
                    </span>
                  )}
                </div>

                <div className="p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {hostel.location && (
                      <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        📍 {hostel.location}
                      </div>
                    )}
                    <h3 className="text-xl font-black text-slate-900 mb-2.5 leading-snug">
                      {hostel.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-normal leading-relaxed">
                      {hostel.description ||
                        "A pristine, secure, and modern living facility outfitted with top-tier amenities."}
                    </p>
                  </div>

                  <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        {hostel.startingPrice ? "Starting from" : "Pricing"}
                      </span>
                      {hostel.startingPrice ? (
                        <span className="text-xl font-black text-slate-900">
                          ₹{hostel.startingPrice.toLocaleString()}
                          <span className="text-xs font-semibold text-slate-400">
                            /mo
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500">
                          Contact for pricing
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/property/${hostel.id}`)}
                      className="bg-stone-900 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-widest px-7 py-4 rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-lg"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Detailed Modal ── */}
      {selectedHostel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] h-full flex flex-col shadow-2xl border border-slate-800 overflow-hidden relative text-white">

            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-7 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">
                  🏢
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                    {selectedHostel.name}
                  </h2>
                  {selectedHostel.address && (
                    <p className="text-[11px] text-indigo-400 font-medium tracking-wide mt-0.5">
                      📍 {selectedHostel.address}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedHostel(null)}
                className="bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body — single scroll region shared by both columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 items-start">

              {/* Left Column: Dark Theme Image & Overview (Takes 5 Cols) */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:sticky lg:top-0 space-y-6 bg-slate-900 border-r border-slate-800">
                <div className="h-52 sm:h-60 rounded-2xl overflow-hidden relative shadow-inner bg-slate-950 border border-slate-800 group">
                  <HostelCardImage
                    images={
                      selectedHostel.gallery && selectedHostel.gallery.length > 0
                        ? selectedHostel.gallery
                        : selectedHostel.image
                        ? [selectedHostel.image]
                        : []
                    }
                    alt={selectedHostel.name}
                    fallback={DEFAULT_IMAGE}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
                    Property Overview
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {selectedHostel.description ||
                      "A state-of-the-art living space designed for maximum comfort, study productivity, and peace of mind."}
                  </p>
                </div>
              </div>

              {/* Right Column: Content/Forms (Takes 7 Cols) */}
              <div className="lg:col-span-7 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  {/* Tab Switcher Header */}
                  <div className="flex border-b border-slate-800 pb-3 mb-6 gap-6">
                    <button
                      onClick={() => setActiveTab("VISIT")}
                      className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
                        activeTab === "VISIT"
                          ? "text-indigo-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📅 Schedule Visit
                      {activeTab === "VISIT" && (
                        <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("REGISTER")}
                      className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
                        activeTab === "REGISTER"
                          ? "text-indigo-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📝 Pre-Register
                      {activeTab === "REGISTER" && (
                        <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "VISIT" ? (
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl">
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Book Property Tour
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Choose a convenient date and time slot to inspect the rooms in person.
                        </p>
                      </div>

                      <form onSubmit={handleVisitSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Rahul Sharma"
                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
                              Visit Date
                            </label>
                            <input
                              type="date"
                              required
                              value={visitDate}
                              onChange={(e) => setVisitDate(e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
                              Time Slot
                            </label>
                            <select
                              value={visitTime}
                              onChange={(e) => setVisitTime(e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                            >
                              <option>10:00 AM</option>
                              <option>01:00 PM</option>
                              <option>04:00 PM</option>
                              <option>06:00 PM</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.99]"
                        >
                          Confirm Tour Booking
                        </button>
                      </form>
                    </div>
                  ) : (
                    <PublicRegisterForm
                      hostelName={selectedHostel.name}
                      roomTypes={selectedHostel.roomTypes}
                      onSubmit={handleRegisterSubmit}
                      onCancel={() => setSelectedHostel(null)}
                    />
                  )}
                </div>

                <p className="text-[10px] text-slate-500 text-center mt-6">
                  🔒 All submitted data is encrypted and processed securely.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white pt-14 pb-8 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <h4 className="text-lg font-black tracking-tight text-white">
                Brindhavanam PG Hostels
              </h4>
              <p className="text-xs text-slate-400 mt-2 font-normal leading-relaxed">
                Providing premier corporate and student accommodation solutions.
              </p>
            </div>

            {/* Dynamic location columns — generated from live hostel data */}
            {footerLocationColumns.map(({ location, types }) => (
              <div key={location}>
                <h5 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-4">
                  {location}
                </h5>
                <ul className="space-y-2.5">
                  <li>
                    <button
                      onClick={() => handleFooterLinkClick(location)}
                      className="text-xs text-slate-400 hover:text-white transition-colors text-left"
                    >
                      All properties in {location}
                    </button>
                  </li>
                  {types.map((type) => (
                    <li key={type}>
                      <button
                        onClick={() => handleFooterLinkClick(location, type)}
                        className="text-xs text-slate-400 hover:text-white transition-colors text-left"
                      >
                        {TYPE_LABELS[type] ?? type} in {location}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Static support column */}
            <div>
              <h5 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-4">
                Support
              </h5>
              <ul className="space-y-2.5">
                <li>
                  <a href="#properties" className="text-xs text-slate-400 hover:text-white transition-colors">
                    Properties
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-xs text-slate-400 hover:text-white transition-colors">
                    Experience
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-xs text-slate-400 hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 text-xs text-slate-500 tracking-wider font-medium text-center sm:text-left">
            &copy; {new Date().getFullYear()} Brindhavanam Hostels. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}