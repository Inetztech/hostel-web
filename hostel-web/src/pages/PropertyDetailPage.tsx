import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  getHostels,
  fetchAllPages,
  publicRegisterTenant,
  getPublicRoomTypesForHostel,
  getHostelImages,
} from "@/lib/store";
import api from "@/lib/api";
import { FraudCheckResponse } from "@/lib/types";
import PublicRegisterForm from "@/components/PublicRegistrationForm";
import type { Hostel } from "@/pages/Home";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80";

// Turns a backend-relative image path (e.g. "/uploads/hostel-images/303/xyz.png")
// into an absolute URL the browser can load. Mirrors the same helper in
// Home.tsx — same backend, same relative-path convention.
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

// Amenity icon lookup — falls back to a generic dot if the name isn't mapped.
const AMENITY_ICON: Record<string, string> = {
  Parking: "🅿️",
  Refrigerator: "🧊",
  "Power Backup": "🔌",
  Almirah: "🚪",
  "Bed Sheet": "🛏️",
  CCTV: "📹",
  "House Keeping": "🧹",
  Bathroom: "🚿",
  Wash: "🧺",
  AC: "❄️",
  Wifi: "📶",
  Pillow: "🛌",
  Lift: "🛗",
  "Drinking Water": "💧",
};

interface RoomType {
  label: string;     
  sharing: string;
  price: number;
  availableBeds: number;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [allHostels, setAllHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSharing, setSelectedSharing] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setActiveImage(0);
      try {
        const list = await fetchAllPages<Hostel>(
          (pg, size) => getHostels(pg, size),
          10
        );
        if (cancelled) return;
        setAllHostels(list);
        const match = list.find((h) => String(h.id) === String(id));
        if (match) {
          setHostel(match);

          // /hostels doesn't include gallery photos — same as HomePage,
          // pull this hostel's images separately from
          // GET /hostel-images/{hostelId} and attach primary + full gallery.
          try {
            const images = await getHostelImages(Number(match.id));
            if (!cancelled && images && images.length > 0) {
              const primary = images.find((img) => img.isPrimary) ?? images[0];
              const gallery = images
                .map((img) => resolveImageUrl(img.imageUrl))
                .filter((u): u is string => !!u);

              setHostel((prev) =>
                prev
                  ? {
                      ...prev,
                      image: resolveImageUrl(primary.imageUrl) || prev.image,
                      gallery,
                    }
                  : prev
              );
            }
          } catch (err: any) {
            console.error(
              `[PropertyDetailPage] getHostelImages(${match.id}) failed — falling back to DEFAULT_IMAGE.`,
              "status:", err?.response?.status,
              "url:", err?.config?.url,
              err
            );
          }

          try {
            const roomTypes = await getPublicRoomTypesForHostel(match.id);
            if (!cancelled) {
              setHostel((prev) => (prev ? { ...prev, roomTypes } : prev));
              const sharings = Array.from(new Set(roomTypes.map((r) => r.sharing)));
              if (sharings.length) setSelectedSharing(sharings[0]);
            }
          } catch (err) {
            console.error(`[PropertyDetailPage] getPublicRoomTypesForHostel(${match.id}) failed`, err);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load property details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const gallery = useMemo(() => {
    if (!hostel) return [DEFAULT_IMAGE];
    // gallery already contains every uploaded photo (primary included) once
    // getHostelImages resolves; image alone covers the brief window before
    // that call returns, and DEFAULT_IMAGE covers hostels with none yet.
    const imgs =
      hostel.gallery && hostel.gallery.length > 0
        ? hostel.gallery
        : [hostel.image].filter(Boolean as unknown as (v?: string) => v is string);
    return imgs.length ? imgs : [DEFAULT_IMAGE];
  }, [hostel]);

  // Gallery can shrink between renders (e.g. still loading) — keep the
  // active index in range so a stale index never points past the end.
  const safeActiveImage = activeImage % gallery.length;
  const goNextImage = () => setActiveImage((i) => (i + 1) % gallery.length);

  const sharingTypes = useMemo(
    () => Array.from(new Set((hostel?.roomTypes || []).map((r) => r.sharing))),
    [hostel]
  );

  const roomsForSharing = useMemo(
    () => (hostel?.roomTypes || []).filter((r) => r.sharing === selectedSharing),
    [hostel, selectedSharing]
  );

  const nearbyProperties = useMemo(
    () =>
      allHostels.filter(
        (h) =>
          String(h.id) !== String(id) &&
          (h.city ? h.city === hostel?.city : true)
      ).slice(0, 4),
    [allHostels, id, hostel]
  );

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
          `Application submitted for ${hostel?.name}! Your registration is now PENDING approval.`
        );
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Application submission failed. Please try again."
      );
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
        <span className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Loading Property...
        </span>
      </div>
    );
  }

  if (notFound || !hostel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 text-center px-6">
        <p className="text-lg font-bold text-slate-800 mb-2">
          We couldn't find that property.
        </p>
        <p className="text-sm text-slate-500 mb-6">
          It may have been removed or the link is out of date.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-['Outfit',sans-serif] text-slate-800">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
              🏢
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Brindha<span className="text-indigo-600">vanam</span>
            </span>
          </Link>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white transition-all duration-300"
          >
            Portal Login
          </button>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-slate-400">
        <Link to="/" className="hover:text-indigo-600 transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/#properties" className="hover:text-indigo-600 transition-colors">
          Properties
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600">{hostel.name}</span>
      </div>

      {/* ── Main Layout: gallery+content left, sticky booking sidebar right ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-10">
          {/* Gallery */}
          <div>
            <div className="relative h-80 sm:h-96 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 group">
              <img
                src={gallery[safeActiveImage]}
                alt={hostel.name}
                onClick={gallery.length > 1 ? goNextImage : undefined}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGE;
                }}
                className={`w-full h-full object-cover ${
                  gallery.length > 1 ? "cursor-pointer" : ""
                }`}
              />
              {gallery.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-sm px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {gallery.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safeActiveImage ? "bg-white w-4" : "bg-white/50 w-1.5"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      i === safeActiveImage
                        ? "border-indigo-600"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {hostel.name}
              </h1>
              {hostel.address && (
                <p className="text-sm text-indigo-600 font-semibold mt-1">
                  📍 {hostel.address}
                </p>
              )}
            </div>
          </div>

          {/* About */}
          <section>
            <h2 className="text-xs font-extrabold tracking-widest uppercase text-indigo-600 mb-2">
              About the Property
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {hostel.description ||
                "A pristine, secure, and modern living facility outfitted with top-tier amenities."}
            </p>
          </section>

          {/* Room Details cards */}
          {sharingTypes.length > 0 && (
            <section>
              <h2 className="text-xs font-extrabold tracking-widest uppercase text-indigo-600 mb-4">
                Room Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {sharingTypes.map((sharing) => {
                  const cheapest = Math.min(
                    ...(hostel.roomTypes || [])
                      .filter((r) => r.sharing === sharing)
                      .map((r) => r.price)
                  );
                  return (
                    <button
                      key={sharing}
                      onClick={() => {
                        setSelectedSharing(sharing);
                        setSelectedRoom(null);
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        selectedSharing === sharing
                          ? "border-indigo-600 bg-indigo-50/60"
                          : "border-slate-200 bg-white hover:border-indigo-200"
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-700">{sharing}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        starting from
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        ₹{cheapest.toLocaleString()}/month
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Amenities */}
          {hostel.amenities && hostel.amenities.length > 0 && (
            <section>
              <h2 className="text-xs font-extrabold tracking-widest uppercase text-indigo-600 mb-4">
                Amazing Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                {hostel.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2.5">
                    <span className="text-base">{AMENITY_ICON[a] || "•"}</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {a}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Nearby Properties */}
          {nearbyProperties.length > 0 && (
            <section>
              <h2 className="text-xs font-extrabold tracking-widest uppercase text-indigo-600 mb-4">
                Nearby Properties
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {nearbyProperties.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => navigate(`/property/${h.id}`)}
                    className="w-40 shrink-0 text-left group"
                  >
                    <div className="h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80">
                      <img
                        src={h.image || DEFAULT_IMAGE}
                        alt={h.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-2 truncate">
                      {h.name}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right column: sticky booking sidebar ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            {sharingTypes.length > 0 && (
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-500 mb-3">
                  Select Sharing Type
                </h3>
                <div className="flex gap-2 mb-5 flex-wrap">
                  {sharingTypes.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSharing(s);
                        setSelectedRoom(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedSharing === s
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-500 mb-1">
                  Select Room Type
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  You can change your room type before onboarding.
                </p>
                <div className="space-y-2">
                  {roomsForSharing.map((room, i) => (
                    <label
                      key={i}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        selectedRoom === room
                          ? "border-indigo-600 bg-indigo-50/60"
                          : "border-slate-200 hover:border-indigo-200"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRoom === room}
                          onChange={() =>
                            setSelectedRoom(selectedRoom === room ? null : room)
                          }
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          {room.sharing}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {room.availableBeds} beds available
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{room.price.toLocaleString()}/month
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-Register */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-5">
                📝 Pre-Register
              </h3>
              <PublicRegisterForm
                hostelName={hostel.name}
                roomTypes={hostel.roomTypes}
                onSubmit={handleRegisterSubmit}
                onCancel={() => navigate("/")}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-4">
            🔒 All submitted data is encrypted and processed securely.
          </p>
        </div>
      </div>
    </div>
  );
}