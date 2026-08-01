//PublicRegistrationForm.tsx
import React, { useState, useRef } from "react";
import { IdProofType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Clock } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ID_PROOF_TYPE_LIST: IdProofType[] = [
  "AADHAR",
  "PAN",
  "VOTER_ID",
  "DRIVING_LICENSE",
  "PASSPORT",
];

interface PublicRegisterFormProps {
  hostelName?: string;
  roomTypes?: { sharing: string; price: number }[];
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
  const [idProofType, setIdProofType] = useState<IdProofType | "">("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [idProofDoc, setIdProofDoc] = useState<File | null>(null);
  const [preferredRoomType, setPreferredRoomType] = useState("");
  const [expectedMoveDate, setExpectedMoveDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (idProofType) fd.append("idProofType", idProofType);
    if (idProofNumber) fd.append("idProofNumber", idProofNumber);
    if (idProofDoc) fd.append("idProofDocument", idProofDoc);
    if (preferredRoomType) fd.append("preferredRoomType", preferredRoomType);
    fd.append("checkInDate", expectedMoveDate);
    
    // Status is set to PENDING for admin review & room allocation
    fd.append("status", "PENDING");

    setIsSubmitting(true);
    try {
      await onSubmit(fd);
    } catch {
      /* Error handled by caller */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 overflow-hidden">
      {/* Form Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase block mb-0.5">
            Resident Pre-Registration
          </span>
          <h3 className="text-lg font-bold">Apply for {hostelName}</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 rounded-full text-[11px] text-blue-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" /> Pending Admin Approval
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Section 1: Basic Contact Details */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            1. Applicant Details
          </p>

          <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="applicant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: ID Verification Documents */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            2. Identity Verification
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                ID Proof Type
              </label>
              <Select
                value={idProofType}
                onValueChange={(val) => setIdProofType(val as IdProofType)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-xs text-white h-9">
                  <SelectValue placeholder="Select ID Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {ID_PROOF_TYPE_LIST.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                ID Number
              </label>
              <input
                type="text"
                placeholder="Enter ID Number"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
              Upload ID Document (PDF or Image)
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 file:border-0 file:bg-slate-700 file:text-white file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs"
            />
            {idProofDoc && (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <FileText className="w-3 h-3" /> {idProofDoc.name} (
                {(idProofDoc.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Preferences */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            3. Stay Preferences
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                Preferred Sharing
              </label>
              <select
                value={preferredRoomType}
                onChange={(e) => setPreferredRoomType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Any Sharing Option</option>
                {roomTypes.map((rt, i) => (
                  <option key={i} value={rt.sharing}>
                    {rt.sharing} (₹{rt.price.toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
                Expected Move-In Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={expectedMoveDate}
                onChange={(e) => setExpectedMoveDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="text-xs px-4 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? "Submitting..." : "Submit Registration Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}