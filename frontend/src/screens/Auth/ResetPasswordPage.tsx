import React, { useState } from "react";
import { apiPasswordResetConfirm } from "../../services/api";
import {
  authCardClass,
  heroBackgroundStyle,
  heroOverlayClass,
} from "../../theme/heroStyles";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      let token = "";
      try {
        const url = new URL(window.location.href);
        token = url.searchParams.get("token") || "";
        if (!token) {
          const hash = window.location.hash || "";
          const q = hash.split("?")[1] || "";
          const sp = new URLSearchParams(q);
          token = sp.get("token") || "";
        }
      } catch {}
      if (!token) throw new Error("Missing token");
      if (password !== password2) throw new Error("Passwords do not match");
      // client-side policy
      if (password.length < 8)
        throw new Error("Password must be at least 8 characters long");
      if (!/[A-Z]/.test(password))
        throw new Error("Password must contain at least one uppercase letter");
      if (!/[a-z]/.test(password))
        throw new Error("Password must contain at least one lowercase letter");
      if (!/\d/.test(password))
        throw new Error("Password must contain at least one number");
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password))
        throw new Error("Password must contain at least one special character");
      await apiPasswordResetConfirm(token, password);
      setMsg("Password reset successful. Redirecting to sign in…");
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 1200);
    } catch (e: any) {
      setErr(e?.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4 py-16"
      style={heroBackgroundStyle}
    >
      <div className={heroOverlayClass} aria-hidden="true" />
      <div className={authCardClass} style={{ margin: "2vw" }}>
        <div className="flex flex-col justify-center w-full max-w-[600px] px-6 md:px-12 py-16 md:py-20 h-full mx-auto">
          <div className="mb-8 w-full flex flex-col items-center">
            <a
              href="#/"
              className="flex items-center gap-2 mb-6 justify-center hover:opacity-80 transition-opacity"
            >
              <img
                src="/images/hawker-logo.png"
                alt="Hawkerrr Logo"
                className="w-8 h-8 object-contain"
                style={{ borderRadius: "0.5rem" }}
              />
              <span className="font-bold text-lg text-gray-800">Hawkerrr</span>
            </a>
            <span className="uppercase tracking-[0.35em] text-xs md:text-[0.75rem] text-violet-600/90 font-semibold px-4 py-1 rounded-full bg-white/70 shadow-sm mb-4">
              Secure your access
            </span>
            <h1 className="text-4xl font-bold mb-2 text-center">
              Reset Password
            </h1>
            <p className="text-gray-500 mb-1 text-center">
              Enter your new password below
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-start mt-2"
          >
            <div className="mb-2 w-full">
              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                Minimum 8 characters, at least one uppercase, one lowercase, one
                number, and one special character.
              </div>
            </div>
            <div className="mb-2 w-full">
              <input
                type="password"
                placeholder="Confirm Password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
            {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}
            <button
              disabled={busy}
              className="w-full py-3 rounded bg-violet-600 text-white font-semibold text-lg shadow hover:bg-violet-700 transition mb-1 mt-2"
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </form>
          <div className="text-left text-sm text-gray-500 mt-8 w-full">
            Remember your password?{" "}
            <a
              href="#/login"
              className="text-violet-600 font-semibold hover:underline"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}



