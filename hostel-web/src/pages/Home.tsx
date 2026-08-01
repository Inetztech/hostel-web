import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getHostels, fetchAllPages, addTenant, publicRegisterTenant } from "@/lib/store";
import { FraudCheckResponse } from "@/lib/types";
import PublicRegisterForm from "@/components/PublicRegistrationForm";

export interface Hostel {
  id: string | number;
  name: string;
  type?: "GENTS" | "LADIES" | "CO-ED";
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
  roomTypes?: {
    sharing: string;
    price: number;
    availableBeds: number;
  }[];
}

export default function HomePage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

  // Tab State inside Modal
  const [activeTab, setActiveTab] = useState<"VISIT" | "REGISTER">("VISIT");

  // Schedule Visit Form State
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00 AM");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

  const loadHostels = useCallback(async () => {
    setLoading(true);
    try {
      const hList = await fetchAllPages<Hostel>(
        (pg, size) => getHostels(pg, size),
        50
      );
      setHostels(hList);
    } catch {
      toast.error("Failed to load hostels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHostels();
  }, [loadHostels]);

  const handleOpenDetail = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setActiveTab("VISIT");
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

  // Pre-Registration Submission (Sets Pending State)
    const handleRegisterSubmit = async (formData: FormData) => {
  try {
    // Calls POST /api/tenants/public-register (bypasses auth guard)
    const newTenant = await publicRegisterTenant(formData);
    const fraudCheck: FraudCheckResponse | null =
      (newTenant as any)?.fraudCheck ?? null;

    if (fraudCheck?.fraud) {
      toast.warning(
        "Application received. Our admin team will verify previous record history during document review."
      );
    } else {
      toast.success(
        `Application submitted for ${selectedHostel?.name}! Your registration is now PENDING approval. Our admin will contact you shortly to assign your room.`
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

  const filteredHostels = hostels.filter((h) => {
    if (selectedTypeFilter === "ALL") return true;
    return h.type === selectedTypeFilter;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-['Outfit',sans-serif] text-slate-800 flex flex-col">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-[#0f172a] text-white border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl text-blue-400">
              🏢
            </div>
            <div>
              <span className="font-['Outfit',sans-serif] text-2xl font-bold tracking-tight block text-white">
                Brindha<span className="text-blue-500">vanam</span>
              </span>
              <span className="text-[10px] tracking-[2px] uppercase text-slate-400 font-semibold">
                Premium Student & Executive Living
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#properties" className="hover:text-blue-400 transition-colors">
              Properties
            </a>
            <a href="#about" className="hover:text-blue-400 transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-blue-400 transition-colors">
              Contact
            </a>
          </nav>

          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all duration-200"
          >
            Staff Portal
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative bg-[#0b1329] text-white py-24 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-3.5 py-1 text-[11px] font-semibold tracking-[2px] uppercase text-blue-400 bg-blue-950/60 border border-blue-800/60 rounded-full mb-6">
            Modern Accommodations Across Major Cities
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Elevate Your Stay With <span className="text-blue-500">World-Class Hostels</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
            Discover fully managed, secure residences equipped with high-speed internet, ergonomic study spaces, and nutritious daily dining.
          </p>

          <a
            href="#properties"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-widest px-8 py-4 rounded-lg shadow-xl shadow-blue-600/25 transition-all duration-200"
          >
            Browse Hostels ↓
          </a>
        </div>
      </section>

      {/* ── Properties Catalog ── */}
      <section id="properties" className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[2px] bg-blue-600" />
              <span className="text-xs font-bold tracking-widest uppercase text-blue-600">
                Explore Properties
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Featured Branches
            </h2>
          </div>

          <div className="flex items-center gap-2 mt-6 md:mt-0 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {["ALL", "LADIES", "GENTS", "CO-ED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTypeFilter(tab)}
                className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${
                  selectedTypeFilter === tab
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ALL" ? "All Hostels" : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <span className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Loading Live Hostels...
            </span>
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <p className="text-lg font-medium">No hostels match the selected criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHostels.map((hostel) => (
              <div
                key={hostel.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={hostel.image || DEFAULT_IMAGE}
                    alt={hostel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {hostel.type && (
                    <span className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md text-blue-400 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-md border border-blue-500/20 shadow-lg">
                      {hostel.type} PG
                    </span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {hostel.location && (
                      <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                        📍 {hostel.location}
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-snug">
                      {hostel.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-normal leading-relaxed">
                      {hostel.description ||
                        "A pristine, secure, and modern living facility with all essential amenities."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Starts from
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900">
                        ₹
                        {hostel.startingPrice
                          ? hostel.startingPrice.toLocaleString()
                          : "7,500"}
                        <span className="text-xs font-medium text-slate-500">
                          /mo
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenDetail(hostel)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] h-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                    {selectedHostel.name}
                  </h2>
                  {selectedHostel.address && (
                    <p className="text-[11px] text-blue-400 font-medium tracking-wide">
                      📍 {selectedHostel.address}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedHostel(null)}
                className="bg-slate-800 text-slate-300 hover:text-white hover:bg-red-600/80 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors shadow-md"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Left Column: Overview (5 Cols) */}
              <div className="lg:col-span-5 p-5 sm:p-6 space-y-6">
                <div className="h-48 sm:h-56 rounded-xl overflow-hidden relative shadow-inner bg-slate-900">
                  <img
                    src={selectedHostel.image || DEFAULT_IMAGE}
                    alt={selectedHostel.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1.5">
                    Property Overview
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedHostel.description ||
                      "A state-of-the-art living space designed for comfort and peace of mind."}
                  </p>
                </div>
              </div>

              {/* Right Column: Forms Engine (7 Cols) */}
              <div className="lg:col-span-7 bg-slate-900 text-white p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  {/* Tab Switcher Header */}
                  <div className="flex border-b border-slate-800 pb-3 mb-5 gap-4">
                    <button
                      onClick={() => setActiveTab("VISIT")}
                      className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
                        activeTab === "VISIT"
                          ? "text-blue-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📅 Schedule Visit
                      {activeTab === "VISIT" && (
                        <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-blue-500 rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("REGISTER")}
                      className={`text-xs font-bold uppercase tracking-wider transition-all pb-1 relative ${
                        activeTab === "REGISTER"
                          ? "text-blue-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📝 Pre-Register
                      {activeTab === "REGISTER" && (
                        <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-blue-500 rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "VISIT" ? (
                    <div>
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Book Property Tour
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Select a date to inspect rooms.
                        </p>
                      </div>

                      <form onSubmit={handleVisitSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Rahul Sharma"
                            className="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                              Visit Date
                            </label>
                            <input
                              type="date"
                              required
                              value={visitDate}
                              onChange={(e) => setVisitDate(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                              Time Slot
                            </label>
                            <select
                              value={visitTime}
                              onChange={(e) => setVisitTime(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
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
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99]"
                        >
                          Confirm Visit
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

                <p className="text-[10px] text-slate-500 text-center mt-4">
                  🔒 Information is processed securely by hostel management.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contact" className="bg-[#0b1329] text-white py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
          <div>
            <h4 className="text-xl font-bold text-white">Brindhavanam PG Hostels</h4>
            <p className="text-xs text-slate-400 mt-1">
              Providing premium corporate and student stays.
            </p>
          </div>
          <div className="text-xs text-slate-500 tracking-wider">
            &copy; {new Date().getFullYear()} Brindhavanam Hostels. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}