import React, { useState } from "react";
import { apiRegister } from "../../services/api";

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
      const phoneOrUndef = phone.trim() ? phone.trim() : undefined;
      await apiRegister(
        email.trim(),
        password,
        fullName.trim(),
        industry,
        phoneOrUndef
      );
      setError(null);
      setOk("Registration successful. Redirecting to sign in…");
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div
        className="flex flex-row w-full max-w-[1300px] min-h-[82vh] mx-auto rounded-[2.5rem] shadow-2xl bg-white p-0 md:p-0 gap-0 md:gap-0 relative overflow-hidden"
        style={{ margin: "2vw" }}
      >
        {/* Left: Register Form */}
        <div className="flex flex-col justify-center w-full max-w-xl px-20 py-20 h-full ml-20">
          <div className="mb-8 w-full flex flex-col items-start">
            <div className="flex items-center gap-2 mb-6">
              <img
                src="/images/hawker-logo.png"
                alt="Hawkerrr Logo"
                className="w-8 h-8 object-contain"
                style={{ borderRadius: "0.5rem" }}
              />
              <span className="font-bold text-lg text-gray-800">Hawkerrr</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Create your account</h1>
            <p className="text-gray-500 mb-1">
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
        {/* Right: Solid Color Section (no image) */}
        <div className="hidden md:block">
          <div
            className="absolute top-0 right-0 h-full"
            style={{ width: "42.5%", zIndex: 1 }}
          >
            <div
              className="bg-gradient-to-br from-[#232946] to-[#6c63ff] h-full w-full rounded-[2.5rem]"
              style={{ boxShadow: "0 4px 32px 0 rgba(44,62,80,0.10)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
