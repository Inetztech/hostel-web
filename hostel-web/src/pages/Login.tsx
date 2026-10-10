import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getUserRole } from "@/lib/auth";
import { loginUser } from "@/lib/store";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const role = getUserRole();
    if (!role) return;

    if (role === "SUPER_ADMIN") {
      navigate("/super-admin", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      sessionStorage.setItem("role", data.role);
      if (data.branchId) {
        sessionStorage.setItem("branchId", String(data.branchId));
      }

      if (data.role === "SUPER_ADMIN") {
        navigate("/super-admin", { replace: true });
      } else if (data.role === "ADMIN" && data.subscriptionExpired) {
        navigate("/subscription", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          height: 100%;
          overflow: hidden;
        }

        .pg-root {
          height: 100vh;
          display: flex;
          font-family: 'Outfit', sans-serif;
          background: #f5ede4;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
        }

        /* Mobile-only brand header — hidden on desktop */
        .pg-mobile-hero { display: none; }

        .pg-left {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          background: #2c1810;
        }

        .pg-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 60px,
              rgba(255,255,255,0.018) 60px,
              rgba(255,255,255,0.018) 61px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 60px,
              rgba(255,255,255,0.018) 60px,
              rgba(255,255,255,0.018) 61px
            );
          pointer-events: none;
        }

        .pg-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 20% 80%, rgba(186,97,42,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 50% 50% at 85% 15%, rgba(139,62,19,0.25) 0%, transparent 60%);
          pointer-events: none;
        }

        .arch-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 420px;
          border: 1px solid rgba(186,97,42,0.2);
          border-radius: 160px 160px 0 0;
          z-index: 0;
        }

        .arch-bg-2 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 240px;
          height: 320px;
          border: 1px solid rgba(186,97,42,0.12);
          border-radius: 120px 120px 0 0;
          z-index: 0;
        }

        .h-lines {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 48px 0;
          z-index: 1;
        }
        .h-lines span {
          display: block;
          height: 1px;
          width: 32px;
          background: rgba(186,97,42,0.25);
          margin-left: auto;
        }
        .h-lines span:nth-child(even) { width: 20px; }

        .pg-badge {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .pg-badge-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(186,97,42,0.18);
          border: 1px solid rgba(186,97,42,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .pg-badge-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(245,196,147,0.7);
        }

        .pg-brand {
          position: relative;
          z-index: 2;
        }

        .pg-brand-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(186,97,42,0.8);
          border: 1px solid rgba(186,97,42,0.3);
          border-radius: 2px;
          padding: 4px 10px;
          margin-bottom: 16px;
        }

        .pg-brand h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 52px;
          font-weight: 600;
          color: #f5ede4;
          line-height: 1.05;
          letter-spacing: -1px;
          margin-bottom: 14px;
        }

        .pg-brand h1 em {
          font-style: italic;
          color: #e0905a;
        }

        .pg-brand p {
          font-size: 13px;
          font-weight: 300;
          color: rgba(245,237,228,0.45);
          letter-spacing: 0.8px;
          line-height: 1.8;
          max-width: 280px;
        }

        .pg-right {
          width: 460px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #f5ede4;
          padding: 60px 52px;
          position: relative;
          overflow: hidden;
        }

        .pg-right::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 20px,
            rgba(186,97,42,0.018) 20px,
            rgba(186,97,42,0.018) 21px
          );
          pointer-events: none;
        }

        .pg-right::after {
          content: '';
          position: absolute;
          left: 0; top: 10%; bottom: 10%;
          width: 2px;
          background: linear-gradient(to bottom, transparent, #e0905a, transparent);
          opacity: 0.4;
        }

        .form-container {
          position: relative;
          z-index: 1;
        }

        .form-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .eyebrow-line {
          width: 28px;
          height: 1px;
          background: #c47a45;
        }

        .eyebrow-text {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #c47a45;
        }

        .form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 600;
          color: #1c0f08;
          line-height: 1.1;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .form-title span {
          display: block;
          font-style: italic;
          color: #c47a45;
        }

        .form-subtitle {
          font-size: 13px;
          font-weight: 300;
          color: #9a7a6a;
          margin-bottom: 40px;
          letter-spacing: 0.3px;
        }

        .field-group {
          margin-bottom: 22px;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #7a5a48;
          margin-bottom: 10px;
        }

        .field-label-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #c47a45;
        }

        .field-input-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          height: 52px;
          background: #efe4d8;
          border: 1.5px solid transparent;
          border-bottom: 1.5px solid #d4a882;
          border-radius: 6px 6px 0 0;
          padding: 0 18px;
          font-size: 14px;
          font-family: 'Outfit', sans-serif;
          font-weight: 400;
          color: #1c0f08;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }

        .field-input.has-toggle {
          padding-right: 48px;
        }

        .field-input:focus {
          background: #e8d9cc;
          border-bottom-color: #c47a45;
          box-shadow: 0 2px 0 0 #c47a45;
        }

        .field-input::placeholder {
          color: #b89a88;
          font-weight: 300;
        }

        .field-toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #9a7a6a;
          transition: color 0.2s;
        }

        .field-toggle-btn:hover {
          color: #c47a45;
        }

        .field-toggle-btn:focus-visible {
          outline: 2px solid #c47a45;
          outline-offset: 2px;
          border-radius: 4px;
        }

        .forgot-row {
          text-align: right;
          margin-top: 10px;
        }

        .forgot-link {
          font-size: 12px;
          font-weight: 500;
          color: #c47a45;
          text-decoration: none;
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #f9e8e4;
          border-left: 3px solid #c0472f;
          border-radius: 0 6px 6px 0;
          padding: 12px 14px;
          margin-bottom: 20px;
        }

        .error-icon {
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .error-text {
          font-size: 13px;
          color: #8b2c18;
          font-weight: 400;
          line-height: 1.5;
        }

        .submit-wrap {
          margin-top: 8px;
          position: relative;
        }

        .submit-btn {
          width: 100%;
          height: 54px;
          background: #2c1810;
          color: #f5ede4;
          border: none;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: background 0.2s, transform 0.15s;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(186,97,42,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .submit-btn:hover:not(:disabled) {
          background: #3d2218;
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-arrow {
          font-size: 16px;
          transition: transform 0.2s;
        }

        .submit-btn:hover .btn-arrow {
          transform: translateX(3px);
        }

        .form-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 32px 0 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #d4c5ba;
        }

        .form-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.8px;
          color: #b09080;
        }

        .form-footer strong {
          font-weight: 500;
          color: #8a6a58;
        }

        .spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(245,237,228,0.3);
          border-top-color: #f5ede4;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ============================================================
           MOBILE / TABLET (<= 820px)
           Layout: dark brand header on top, light form sheet that
           slides up over it with rounded corners. Inputs are 16px so
           iOS Safari doesn't zoom on focus; every tap target >= 44px.
           ============================================================ */
        @media (max-width: 820px) {
          .pg-root {
            flex-direction: column;
            height: 100vh;
            height: 100dvh;
            background: #2c1810;
          }

          .pg-left { display: none; }

          /* ── Brand header ── */
          .pg-mobile-hero {
            display: block;
            position: relative;
            flex-shrink: 0;
            overflow: hidden;
            background: #2c1810;
            padding: calc(26px + env(safe-area-inset-top, 0px)) 28px 64px;
          }
          .pg-mobile-hero::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse 80% 90% at 10% 100%, rgba(186,97,42,0.38) 0%, transparent 65%),
              radial-gradient(ellipse 50% 60% at 95% 0%, rgba(139,62,19,0.3) 0%, transparent 60%);
            pointer-events: none;
          }
          .pg-mobile-hero::after {
            content: '';
            position: absolute;
            right: -36px;
            top: -28px;
            width: 190px;
            height: 250px;
            border: 1px solid rgba(186,97,42,0.28);
            border-radius: 95px 95px 0 0;
            box-shadow: 0 0 0 18px rgba(186,97,42,0.05);
            pointer-events: none;
          }
          .mh-top {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
          }
          .mh-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(186,97,42,0.18);
            border: 1px solid rgba(186,97,42,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          }
          .mh-est {
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(245,196,147,0.75);
          }
          .mh-name {
            position: relative;
            z-index: 1;
            font-family: 'Cormorant Garamond', serif;
            font-size: 40px;
            font-weight: 600;
            line-height: 1;
            letter-spacing: -0.5px;
            color: #f5ede4;
          }
          .mh-name em { font-style: italic; color: #e0905a; }
          .mh-tag {
            position: relative;
            z-index: 1;
            margin-top: 10px;
            font-size: 12.5px;
            font-weight: 300;
            line-height: 1.6;
            letter-spacing: 0.4px;
            color: rgba(245,237,228,0.6);
            max-width: 260px;
          }

          /* ── Form sheet ── */
          .pg-right {
            width: 100%;
            height: auto;
            flex: 1;
            min-height: 0;
            margin-top: -28px;
            border-radius: 28px 28px 0 0;
            padding: 32px 24px calc(24px + env(safe-area-inset-bottom, 0px));
            justify-content: flex-start;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 -10px 30px rgba(28,15,8,0.25);
            z-index: 2;
          }
          .pg-right::after { display: none; }

          .form-container {
            width: 100%;
            max-width: 440px;
            margin: auto;
          }

          .form-eyebrow { margin-bottom: 14px; }
          .eyebrow-text { font-size: 11px; }

          .form-title {
            font-size: 36px;
            margin-bottom: 8px;
          }
          .form-title span { display: inline; margin-left: 8px; }

          .form-subtitle {
            font-size: 14px;
            margin-bottom: 28px;
            line-height: 1.5;
          }

          .field-group { margin-bottom: 18px; }

          .field-label {
            font-size: 11px;
            margin-bottom: 8px;
          }

          .field-input {
            height: 56px;
            font-size: 16px;          /* prevents iOS zoom-on-focus */
            padding: 0 16px;
            background: #fffaf5;
            border: 1.5px solid #e0cdbd;
            border-radius: 14px;
          }
          .field-input.has-toggle { padding-right: 56px; }
          .field-input:focus {
            background: #fff;
            border-color: #c47a45;
            box-shadow: 0 0 0 4px rgba(196,122,69,0.16);
          }
          .field-input::placeholder { font-size: 15px; }

          .field-toggle-btn {
            right: 6px;
            width: 44px;
            height: 44px;
            border-radius: 10px;
          }
          .field-toggle-btn:active { background: rgba(196,122,69,0.12); }

          .forgot-row { margin-top: 4px; }
          .forgot-link {
            display: inline-block;
            font-size: 13px;
            padding: 10px 0 10px 12px;   /* 44px+ tap area */
          }

          .error-banner {
            border-radius: 0 10px 10px 0;
            padding: 12px 14px;
            margin-bottom: 16px;
          }

          .submit-wrap { margin-top: 6px; }
          .submit-btn {
            height: 56px;
            font-size: 15px;
            border-radius: 14px;
            box-shadow: 0 8px 18px rgba(44,24,16,0.28);
            touch-action: manipulation;
          }
          .submit-btn:hover:not(:disabled) { transform: none; }
          .submit-btn:active:not(:disabled) {
            transform: scale(0.985);
            background: #3d2218;
          }

          .form-divider { margin: 26px 0 0; }
          .form-footer { margin-top: 16px; font-size: 11.5px; }
        }

        /* Small phones */
        @media (max-width: 360px) {
          .pg-mobile-hero { padding-left: 22px; padding-right: 22px; }
          .mh-name { font-size: 34px; }
          .pg-right { padding-left: 18px; padding-right: 18px; }
          .form-title { font-size: 32px; }
        }

        /* Phones in landscape / very short screens: compact the header */
        @media (max-width: 820px) and (max-height: 560px) {
          .pg-mobile-hero { padding-top: calc(14px + env(safe-area-inset-top, 0px)); padding-bottom: 48px; }
          .mh-top { margin-bottom: 8px; }
          .mh-name { font-size: 30px; }
          .mh-tag { display: none; }
          .form-subtitle { margin-bottom: 18px; }
          .form-eyebrow { margin-bottom: 8px; }
        }
      `}</style>

      <div className="pg-root">
        {/* Mobile-only brand header (hidden on desktop via CSS) */}
        <header className="pg-mobile-hero">
          <div className="mh-top">
            <div className="mh-icon" aria-hidden="true">🏡</div>
            <span className="mh-est">Est. 2014</span>
          </div>
          <div className="mh-name">
            Brindha<em>vanam</em>
          </div>
          <p className="mh-tag">A home away from home — comfort, community, and care.</p>
        </header>

        {/* Decorative brand panel (desktop only) */}
        <div className="pg-left">
          <div className="arch-bg" aria-hidden="true" />
          <div className="arch-bg-2" aria-hidden="true" />

          <div className="h-lines" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
          </div>

          <div className="pg-badge">
            <div className="pg-badge-icon" aria-hidden="true">🏡</div>
            <span className="pg-badge-text">Est. 2014</span>
          </div>

          <div className="pg-brand">
            <div className="pg-brand-tag">PG Hostel Management</div>
            <h1>
              Brindha<em>vanam</em>
            </h1>
            <p>
              A home away from home — managing comfort, community, and care for every resident.
            </p>
          </div>
        </div>

        {/* Lighthouse: "Document does not have a main landmark" —
            the form panel is the page's main content, so it is <main>. */}
        <main className="pg-right">
          <div className="form-container">
            <div className="form-eyebrow">
              <div className="eyebrow-line" aria-hidden="true" />
              <span className="eyebrow-text">Staff Portal</span>
            </div>

            <h2 className="form-title">
              Welcome
              <span>back.</span>
            </h2>
            <p className="form-subtitle">Sign in to manage your hostel operations</p>

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email Address
                  <span className="field-label-dot" aria-hidden="true" />
                </label>
                <div className="field-input-wrap">
                  <input
                    className="field-input"
                    id="email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">
                  Password
                  <span className="field-label-dot" aria-hidden="true" />
                </label>
                <div className="field-input-wrap">
                  <input
                    className="field-input has-toggle"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                <div className="forgot-row">
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <span className="error-icon" aria-hidden="true">⚠</span>
                  <span className="error-text">{error}</span>
                </div>
              )}

              <div className="submit-wrap">
                <button type="submit" className="submit-btn" disabled={loading}>
                  <div className="btn-inner">
                    {loading ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>

            <div className="form-divider">
              <div className="divider-line" />
            </div>

            <div className="form-footer">
              <strong>Brindhavanam PG Hostel</strong> &nbsp;·&nbsp; &copy; {new Date().getFullYear()}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}