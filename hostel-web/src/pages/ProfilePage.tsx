// src/pages/ProfilePage.tsx
import { useState, useEffect } from "react";
import { getUserRole, logout } from "@/lib/auth";
import { getMyProfile, updateMyProfile, changePassword } from "@/lib/store";
import {
  User, Mail, Phone, Building2, Shield, Key, LogOut,
  Edit3, Save, X, Eye, EyeOff, CheckCircle2, AlertCircle,
  Calendar, Lock, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Role badge config ── */
const roleMeta: Record<string, { label: string; bg: string; text: string; ring: string; dot: string; accent: string }> = {
  SUPER_ADMIN: { label: "Super Admin", bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  dot: "bg-violet-500",  accent: "from-violet-500 to-purple-600" },
  ADMIN:       { label: "Admin",       bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500",    accent: "from-blue-500 to-indigo-600" },
  WARDEN:      { label: "Warden",      bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", accent: "from-emerald-500 to-teal-600" },
  TENANT:      { label: "Tenant",      bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500",   accent: "from-amber-400 to-orange-500" },
};

export default function ProfilePage() {
  const role     = getUserRole();
  const roleKey  = role?.toUpperCase() ?? "";
  const meta     = roleMeta[roleKey] ?? {
    label: role ?? "User",
    bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200", dot: "bg-gray-400",
    accent: "from-gray-400 to-gray-600",
  };

  /* ── Profile state — populated from GET /users/me ──
     Response shape is FLAT: { id, email, name, phone, role, branchId, unitName } */
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branchName, setBranchName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  /* ── Edit mode ── */
  const [editing,    setEditing]    = useState(false);
  const [editName,   setEditName]   = useState("");
  const [editPhone,  setEditPhone]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState<"" | "success" | "error">("");

  /* ── Change-password form ── */
  const [showPwd,    setShowPwd]    = useState(false);
  const [oldPwd,     setOldPwd]     = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld,    setShowOld]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [pwdSaving,  setPwdSaving]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState<"" | "success" | "mismatch" | "short" | "empty" | "error">("");
  const [pwdErrorText, setPwdErrorText] = useState("");

  /* Load full profile from backend — single source of truth, works for
     every role including TENANT (whose branch is resolved server-side
     through their room/unit assignment, not via users.branch_id). */
  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);

    (async () => {
      try {
        const profile: any = await getMyProfile();
        if (cancelled) return;

        setName(profile.name ?? "");
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setBranchName(profile.unitName ?? "");
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* Sync edit fields whenever the loaded profile changes */
  useEffect(() => {
    setEditName(name);
    setEditPhone(phone);
  }, [name, phone]);

  const initials = (name || meta.label)
    .split(/\s+/)
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /* ── Save profile — persists via PUT /users/me (userRepository.save
     on the backend), so it survives refresh / a new session, not just
     sessionStorage. ── */
  async function handleSave() {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setName(updated.name ?? editName.trim());
      setPhone(updated.phone ?? editPhone.trim());
      setEditing(false);
      setSaveMsg("success");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error("Failed to update profile", err);
      setSaveMsg("error");
      setTimeout(() => setSaveMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  /* ── Change password — verified + persisted server-side via
     PUT /users/me/change-password (old password checked against the
     stored hash, new one re-encoded and saved through userRepository). ── */
  async function handleChangePassword() {
    if (pwdSaving) return;
    if (!oldPwd || !newPwd || !confirmPwd) { setPwdMsg("empty");    return; }
    if (newPwd.length < 6)                 { setPwdMsg("short");    return; }
    if (newPwd !== confirmPwd)             { setPwdMsg("mismatch"); return; }

    setPwdSaving(true);
    try {
      await changePassword(oldPwd, newPwd);
      setPwdMsg("success");
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => { setPwdMsg(""); setShowPwd(false); }, 3000);
    } catch (err: any) {
      console.error("Failed to change password", err);
      setPwdErrorText(
        err?.response?.data?.message || "Current password is incorrect or update failed"
      );
      setPwdMsg("error");
    } finally {
      setPwdSaving(false);
    }
  }

  /* ── Computed display values ── */
  const displayName   = name       || "—";
  const displayEmail  = email      || "—";
  const displayPhone  = phone      || "—";
  const displayBranch = loadingProfile ? "Loading…" : (branchName || "—");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 mt-2">

      {/* ══════════════════════════════════════════
          AVATAR + IDENTITY CARD
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Gradient banner — role-tinted */}
        <div className={cn("h-32 bg-gradient-to-r", meta.accent)} />

        <div className="px-8 pb-8 relative">
          {/* Avatar row */}
          <div className="flex justify-between items-end -mt-12 mb-5">
            <div className="relative">
              <div className="h-[100px] w-[100px] rounded-full flex items-center justify-center text-[34px] font-semibold text-orange-500 bg-[#fff4ed] shadow-sm ring-4 ring-white">
                {initials || <User className="h-10 w-10" />}
              </div>
              <div className="absolute bottom-2 right-2 h-[18px] w-[18px] bg-emerald-500 ring-[3px] ring-white rounded-full" />
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors bg-white shadow-sm"
              >
                <Edit3 className="h-4 w-4" /> Edit Profile
              </button>
            )}
          </div>

          {/* ── View / Edit mode ── */}
          {editing ? (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editName.trim() || saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(name); setEditPhone(phone); }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>
                <span className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide",
                  meta.bg, meta.text
                )}>
                  <Shield className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
              <p className="text-gray-500 text-[15px] font-medium mt-1.5">
                {loadingProfile ? "Loading…" : displayEmail}
              </p>
            </div>
          )}

          {/* Save feedback */}
          {saveMsg === "success" && (
            <div className="mt-5 flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-4 py-3 rounded-xl max-w-xl">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Profile updated successfully
            </div>
          )}
          {saveMsg === "error" && (
            <div className="mt-5 flex items-center gap-2 text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl max-w-xl">
              <AlertCircle className="h-4 w-4 shrink-0" /> Failed to update. Please try again.
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ACCOUNT DETAILS SECTION
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[17px] font-bold text-gray-900">Account Details</h4>
            <p className="text-[13px] text-gray-500 mt-0.5">View your personal and account information</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailBox icon={User} label="Display Name" value={displayName} loading={loadingProfile} iconBg="bg-purple-50" iconColor="text-purple-600" />
            <DetailBox icon={Mail} label="Email Address" value={displayEmail} loading={loadingProfile} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <DetailBox icon={Phone} label="Phone Number" value={displayPhone} loading={loadingProfile} iconBg="bg-purple-50" iconColor="text-purple-600" />
            <DetailBox icon={Building2} label="Branch" value={displayBranch} loading={loadingProfile} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <DetailBox icon={Shield} label="Role" value={meta.label} valueColor="text-indigo-600" iconBg="bg-blue-50" iconColor="text-blue-600" />

            <div className="flex items-center p-4 rounded-xl border border-gray-100 bg-white">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0 mr-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-1">Account Status</p>
                <span className="inline-block px-3 py-1 rounded bg-green-100 text-green-700 text-xs font-bold tracking-wide">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECURITY SECTION
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[17px] font-bold text-gray-900">Security</h4>
            <p className="text-[13px] text-gray-500 mt-0.5">Manage your password and account security</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white gap-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 mr-4">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-1">Password</p>
                <p className="text-xl font-bold text-gray-700 tracking-[0.2em] leading-none mt-1">.............</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  setShowPwd((v) => !v);
                  setPwdMsg("");
                  setPwdErrorText("");
                  setOldPwd(""); setNewPwd(""); setConfirmPwd("");
                }}
                className="flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors bg-white shadow-sm"
              >
                <Key className="h-4 w-4" /> Change Password
              </button>
            </div>
          </div>

          {showPwd && (
            <div className="mt-6 border-t border-gray-100 pt-6 max-w-xl mx-auto space-y-4">
              <PwdInput
                label="Current Password"
                value={oldPwd}
                onChange={setOldPwd}
                show={showOld}
                toggleShow={() => setShowOld((v) => !v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PwdInput
                  label="New Password"
                  value={newPwd}
                  onChange={setNewPwd}
                  show={showNew}
                  toggleShow={() => setShowNew((v) => !v)}
                />
                <PwdInput
                  label="Confirm New Password"
                  value={confirmPwd}
                  onChange={setConfirmPwd}
                  show={showConf}
                  toggleShow={() => setShowConf((v) => !v)}
                />
              </div>

              {newPwd && <PasswordStrength password={newPwd} />}

              {pwdMsg === "empty" && <FeedbackMsg type="error" message="Please fill in all password fields" />}
              {pwdMsg === "mismatch" && <FeedbackMsg type="error" message="New passwords do not match" />}
              {pwdMsg === "short" && <FeedbackMsg type="error" message="Password must be at least 6 characters" />}
              {pwdMsg === "error" && <FeedbackMsg type="error" message={pwdErrorText || "Failed to change password"} />}
              {pwdMsg === "success" && <FeedbackMsg type="success" message="Password changed successfully" />}

              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={pwdSaving}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {pwdSaving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SIGN OUT
      ══════════════════════════════════════════ */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-colors bg-white shadow-sm"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

    </div>
  );
}

/* ── Info box component for the account-details grid ── */
function DetailBox({
  icon: Icon, label, value, valueColor = "text-gray-900", iconBg = "bg-gray-50", iconColor = "text-gray-500", loading = false,
}: any) {
  return (
    <div className="flex items-center p-4 rounded-xl border border-gray-100 bg-white">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mr-4", iconBg, iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium mb-1 truncate">{label}</p>
        {loading ? (
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
        ) : (
          <p className={cn("text-sm font-bold truncate", valueColor)}>{value}</p>
        )}
      </div>
    </div>
  );
}

/* ── Password input ── */
function PwdInput({
  label, value, onChange, show, toggleShow,
}: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggleShow: () => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Password strength indicator ── */
function PasswordStrength({ password }: { password: string }) {
  const len   = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);

  const levels = [
    { label: "Weak",   color: "bg-red-400" },
    { label: "Fair",   color: "bg-amber-400" },
    { label: "Good",   color: "bg-blue-400" },
    { label: "Strong", color: "bg-emerald-500" },
  ];
  const lvl = levels[Math.max(0, score - 1)];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {levels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i < score ? lvl.color : "bg-gray-100"
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-gray-400">
        Password strength: <span className="font-semibold text-gray-600">{lvl.label}</span>
      </p>
    </div>
  );
}

/* ── Feedback message ── */
function FeedbackMsg({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm",
      type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
    )}>
      {type === "success"
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle  className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}