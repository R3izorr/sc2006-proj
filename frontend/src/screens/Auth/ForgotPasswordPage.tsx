import React, { useState } from "react";
import { apiPasswordResetRequest } from "../../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await apiPasswordResetRequest(email.trim());
      setMsg("If this email exists and is verified, a reset link has been sent.");
    } catch (e: any) {
      setErr(e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div
        className="flex flex-col items-center justify-center w-full max-w-[1100px] min-h-[82vh] mx-auto rounded-[2.5rem] shadow-2xl bg-white p-0 relative overflow-hidden"
        style={{ margin: "2vw" }}
      >
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
            <h1 className="text-4xl font-bold mb-2 text-center">
              Forgot Password?
            </h1>
            <p className="text-gray-500 mb-1 text-center">
              Enter your email and we'll send you a reset link
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-start mt-2"
          >
            <div className="mb-2 w-full">
              <input
                type="email"
                placeholder="stanley@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {busy ? "Sending…" : "Send reset link"}
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




