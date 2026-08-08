import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

        .pg-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Outfit', sans-serif;
          background: #f5ede4;
        }

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
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #f5ede4;
          padding: 60px 52px;
          position: relative;
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

        @media (max-width: 820px) {
          .pg-left { display: none; }
          .pg-right {
            width: 100%;
            padding: 48px 32px;
          }
        }
      `}</style>

      <div className="pg-root">
        <div className="pg-left">
          <div className="arch-bg" />
          <div className="arch-bg-2" />

          <div className="h-lines">
            {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
          </div>

          <div className="pg-badge">
            <div className="pg-badge-icon">🏡</div>
            <span className="pg-badge-text">Est. 2018</span>
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

        <div className="pg-right">
          <div className="form-container">
            <div className="form-eyebrow">
              <div className="eyebrow-line" />
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
                  <span className="field-label-dot" />
                  Email Address
                </label>
                <div className="field-input-wrap">
                  <input
                    className="field-input"
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">
                  <span className="field-label-dot" />
                  Password
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
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-banner">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">{error}</span>
                </div>
              )}

              <div className="submit-wrap">
                <button type="submit" className="submit-btn" disabled={loading}>
                  <div className="btn-inner">
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <span className="btn-arrow">→</span>
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
        </div>
      </div>
    </>
  );
}