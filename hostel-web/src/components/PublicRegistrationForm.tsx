import React, { useState, useRef, useMemo } from "react";
import { IdProofType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Clock, Camera, Sparkles, UserCheck, ShieldCheck, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const ID_PROOF_TYPE_LIST: IdProofType[] = [
  "AADHAR",
  "PAN",
  "VOTER_ID",
  "DRIVING_LICENSE",
  "PASSPORT",
];

interface PublicRegisterFormProps {
  hostelName?: string;
  roomTypes?: { label: string; sharing: string; price: number; availableBeds?: number }[];
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

export default function PublicRegisterForm({
  hostelName = "Selected Branch",
  roomTypes = [],
  onSubmit,
  onCancel,
}: PublicRegisterFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tenantPhoto, setTenantPhoto] = useState<File | null>(null);
  const [idProofType, setIdProofType] = useState<IdProofType | "">("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [idProofDoc, setIdProofDoc] = useState<File | null>(null);
  const [preferredRoomType, setPreferredRoomType] = useState("");      
  const [preferredRoomSharing, setPreferredRoomSharing] = useState(""); 
  const [expectedMoveDate, setExpectedMoveDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const sharingOptions = useMemo(
    () => [...roomTypes].sort((a, b) => a.price - b.price),
    [roomTypes]
  );

  // Function to clear all form fields and reset file inputs
  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setTenantPhoto(null);
    setIdProofType("");
    setIdProofNumber("");
    setIdProofDoc(null);
    setPreferredRoomType("");
    setPreferredRoomSharing("");
    setExpectedMoveDate("");

    // Clear native file input DOM references
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !expectedMoveDate) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    const fd = new FormData();
    fd.append("name", name);
    fd.append("phone", phone);
    if (email) fd.append("email", email);
    if (tenantPhoto) fd.append("tenantPhoto", tenantPhoto);
    if (idProofType) fd.append("idProofType", idProofType);
    if (idProofNumber) fd.append("idProofNumber", idProofNumber);
    if (idProofDoc) fd.append("idProofDocument", idProofDoc);
    if (preferredRoomType) fd.append("preferredRoomType", preferredRoomType);
    if (preferredRoomSharing) fd.append("preferredRoomSharing", preferredRoomSharing);
    fd.append("checkInDate", expectedMoveDate);
    fd.append("status", "PENDING");

    setIsSubmitting(true);
    try {
      await onSubmit(fd);
      toast.success("Registration submitted successfully!");
      resetForm(); // Reset form fields here upon success
    } catch {
      /* Error handled by caller */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f1117] text-stone-100 rounded-3xl shadow-2xl border border-stone-800/80 overflow-hidden w-full max-w-4xl mx-auto">
      {/* Top Compact Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-stone-900 via-[#141824] to-stone-900 border-b border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase block">
              Pre-Registration
            </span>
            <h3 className="text-sm font-black tracking-tight text-white">
              Apply for <span className="text-emerald-400">{hostelName}</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-xl text-[11px] text-emerald-300 font-semibold">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Pending Review
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">

        {/* Section 1: Applicant Details */}
        <div className="bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800/80">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              <UserCheck className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              1. Applicant Details
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="applicant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
              Tenant Photo
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  setTenantPhoto(null);
                  return;
                }
                if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
                  toast.error("Only JPG and PNG images are allowed.");
                  e.target.value = "";
                  setTenantPhoto(null);
                  return;
                }
                if (file.size > MAX_FILE_SIZE) {
                  toast.error("File size must be under 10 MB.");
                  e.target.value = "";
                  setTenantPhoto(null);
                  return;
                }
                setTenantPhoto(file);
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-[11px] text-stone-300 file:border-0 file:bg-emerald-600 file:text-white file:rounded-lg file:px-2.5 file:py-1 file:mr-2 file:text-[10px] file:font-semibold file:cursor-pointer hover:file:bg-emerald-500"
            />
            {tenantPhoto && (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                <Camera className="w-3 h-3" /> {tenantPhoto.name}
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Identity Verification */}
        <div className="bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800/80">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              2. Identity Verification
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                ID Proof Type
              </label>
              <Select
                value={idProofType}
                onValueChange={(val) => setIdProofType(val as IdProofType)}
              >
                <SelectTrigger className="bg-stone-950 border-stone-800 text-xs text-white h-9 rounded-xl">
                  <SelectValue placeholder="Select ID Type" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-white rounded-xl shadow-xl">
                  {ID_PROOF_TYPE_LIST.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs focus:bg-emerald-600 focus:text-white rounded-lg my-0.5">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                ID Number
              </label>
              <input
                type="text"
                placeholder="Enter ID Number"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
              Upload ID Document (PDF / Image)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  setIdProofDoc(null);
                  return;
                }
                if (
                  ![
                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "application/pdf",
                  ].includes(file.type)
                ) {
                  toast.error("Only JPG, PNG, and PDF files are allowed.");
                  e.target.value = "";
                  setIdProofDoc(null);
                  return;
                }
                if (file.size > MAX_FILE_SIZE) {
                  toast.error("File size must be under 10 MB.");
                  e.target.value = "";
                  setIdProofDoc(null);
                  return;
                }
                setIdProofDoc(file);
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-[11px] text-stone-300 file:border-0 file:bg-emerald-600 file:text-white file:rounded-lg file:px-2.5 file:py-1 file:mr-2 file:text-[10px] file:font-semibold file:cursor-pointer hover:file:bg-emerald-500"
            />
            {idProofDoc && (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                <FileText className="w-3 h-3" /> {idProofDoc.name}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Stay Preferences */}
        <div className="bg-stone-900/40 border border-stone-800/60 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800/80">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              <Calendar className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              3. Stay Preferences
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Preferred Room Type
              </label>
              <div className="space-y-2 mt-1">
                {sharingOptions.length > 0 ? (
                  sharingOptions.map((opt) => (
                    <label
                      key={opt.label}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition ${
                        preferredRoomType === opt.label
                          ? "border-emerald-500 bg-emerald-950/40"
                          : "border-stone-800 bg-stone-950 hover:border-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs text-white">
                        <input
                          type="radio"
                          name="preferredRoomType"
                          checked={preferredRoomType === opt.label}
                          onChange={() => {
                            setPreferredRoomType(opt.label);
                            setPreferredRoomSharing(opt.sharing);
                          }}
                          className="accent-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-white block">{opt.label}</span>
                          <span className="text-[10px] text-stone-400">{opt.sharing}</span>
                        </div>
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        ₹{opt.price.toLocaleString()}/mo
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-stone-800 bg-stone-950 text-stone-400 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>No room sharing options available for this property yet.</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Expected Move-In Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={expectedMoveDate}
                onChange={(e) => setExpectedMoveDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 h-9"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex items-center justify-end gap-2.5">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="text-xs px-5 py-2.5 border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white rounded-xl h-9"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 h-9"
          >
            {isSubmitting ? "Submitting..." : "Submit Registration"}
          </Button>
        </div>
      </form>
    </div>
  );
}