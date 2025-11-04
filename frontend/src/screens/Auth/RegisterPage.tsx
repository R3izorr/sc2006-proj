import React, { useState } from "react";
import { apiRegister } from "../../services/api";
import {
  authCardClass,
  heroBackgroundStyle,
  heroOverlayClass,
} from "../../theme/heroStyles";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [industry, setIndustry] = useState("student");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(null);
    try {
      if (password !== password2) {
        throw new Error("Passwords do not match");
      }
      // Client-side password validation
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      if (!/[A-Z]/.test(password)) {
        throw new Error("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(password)) {
        throw new Error("Password must contain at least one lowercase letter");
      }
      if (!/\d/.test(password)) {
        throw new Error("Password must contain at least one number");
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) {
        throw new Error("Password must contain at least one special character");
      }
      const phoneOrUndef = phone.trim() ? phone.trim() : undefined;
      await apiRegister(
        email.trim(),
        password,
        fullName.trim(),
        industry,
        phoneOrUndef
      );
      setError(null);
      setOk("A verify mail has been sent to your email. Please check your inbox");
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
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
      <div className={authCardClass} style={{ margin: "4vw 2vw" }}>
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
              Join the hawker journey
            </span>
            <h1 className="text-4xl font-bold mb-2 text-center">
              Create your account
            </h1>
            <p className="text-gray-500 mb-1 text-center">
              Register to view the hawker scores
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-start mt-2"
          >
            <div className="mb-2 w-full">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
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
            <div className="mb-2 w-full">
              <input
                type="password"
                placeholder="Password"
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
                placeholder="Re-enter Password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div className="mb-2 w-full">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              >
                <option value="student">Student</option>
                <option value="businessmen">Businessmen</option>
              </select>
            </div>
            <div className="mb-2 w-full">
              <input
                type="text"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
            <button
              disabled={busy}
              className="w-full py-3 rounded bg-violet-600 text-white font-semibold text-lg shadow hover:bg-violet-700 transition mb-1 mt-2"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
            <div className="w-full flex items-center my-1">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-4 text-gray-400 font-medium">or</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <div className="w-full mt-0.5">
              <a
                href="#/login"
                className="w-full py-3 rounded border border-gray-300 bg-white text-gray-700 font-semibold text-lg shadow flex items-center justify-center gap-2 hover:bg-gray-50 transition text-center"
              >
                Already have an account? Sign in
              </a>
            </div>
          </form>
          <div className="text-left text-sm text-gray-500 mt-8 w-full">
            <a
              href="#/home"
              className="text-violet-600 font-semibold hover:underline"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

