import React, { useEffect, useRef, useState } from "react";
import {
  apiLogin,
  apiGoogleLogin,
  type LoginResponse,
} from "../../services/api";
import {
  authCardClass,
  heroBackgroundStyle,
  heroOverlayClass,
} from "../../theme/heroStyles";

declare global {
  interface Window {
    GOOGLE_CLIENT_ID?: string;
    google?: any;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleBtnWrapRef = useRef<HTMLDivElement | null>(null);
  const googleInitDoneRef = useRef(false);
  const [googleWidth, setGoogleWidth] = useState<number>(0);
  const signInBtnRef = useRef<HTMLButtonElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r: LoginResponse = await apiLogin(email, password);
      localStorage.setItem("accessToken", r.access_token);
      localStorage.setItem("refreshToken", r.refresh_token);
      localStorage.setItem("userEmail", r.user?.email || "");
      localStorage.setItem("userRole", r.user?.role || "");
      setError(null);
      if ((r.user?.role || "").toLowerCase() === "admin") {
        window.location.hash = "#/admin";
      } else {
        window.location.hash = "#/map";
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let clientId = (
      window.GOOGLE_CLIENT_ID ||
      (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID ||
      ""
    ).trim();
    if (!clientId) {
      fetch("/auth/google/client-id", { cache: "no-store" })
        .then((r) => r.json())
        .then(({ client_id }) => {
          if (client_id) {
            window.GOOGLE_CLIENT_ID = client_id;
          }
        })
        .catch(() => {});
    }
    const tryInit = () => {
      if (googleInitDoneRef.current) return;
      clientId = (
        window.GOOGLE_CLIENT_ID ||
        (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID ||
        ""
      ).trim();
      if (!clientId || !window.google || !googleBtnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            if (!resp?.credential) return;
            setBusy(true);
            try {
              const r: LoginResponse = await apiGoogleLogin(resp.credential);
              localStorage.setItem("accessToken", r.access_token);
              localStorage.setItem("refreshToken", r.refresh_token);
              localStorage.setItem("userEmail", r.user?.email || "");
              localStorage.setItem("userRole", r.user?.role || "");
              setError(null);
              if ((r.user?.role || "").toLowerCase() === "admin") {
                window.location.hash = "#/admin";
              } else {
                window.location.hash = "#/map";
              }
            } catch (err: any) {
              setError(err?.message || "Google login failed");
            } finally {
              setBusy(false);
            }
          },
        });
        googleInitDoneRef.current = true;
        setGoogleReady(true);
      } catch {}
    };
    tryInit();
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (googleInitDoneRef.current) {
        window.clearInterval(timer);
        return;
      }
      attempts += 1;
      tryInit();
      if (attempts > 50) window.clearInterval(timer);
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Measure available width and re-render Google button to match the main button width
  useEffect(() => {
    const measure = () => {
      const w = signInBtnRef.current?.offsetWidth || googleBtnWrapRef.current?.offsetWidth || 360;
      const clamped = Math.max(260, Math.min(w, 1000));
      setGoogleWidth(clamped);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!googleReady) return;
    if (!window.google || !googleBtnRef.current) return;
    try {
      // Re-render button with new width
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: googleWidth || 360,
      });
    } catch {}
  }, [googleReady, googleWidth]);

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
              Discover hawker gems
            </span>
            <h1 className="text-4xl font-bold mb-2 text-center">
              Hello, Welcome Back
            </h1>
            <p className="text-gray-500 mb-1 text-center">
              Login in to view the hawker scores
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
            <div className="mb-1 w-full">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div className="w-full flex justify-end mb-2 mt-1">
              <a
                href="#/forgot-password"
                className="text-sm text-violet-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <button
              ref={signInBtnRef}
              disabled={busy}
              className="w-full py-3 rounded bg-violet-600 text-white font-semibold text-lg shadow hover:bg-violet-700 transition mb-1 mt-2"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
            <div className="w-full flex items-center my-1">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-4 text-gray-400 font-medium">or</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <div className="w-full mt-0.5 flex items-center justify-center">
              <div ref={googleBtnWrapRef}>
                <div ref={googleBtnRef} />
              </div>
            </div>
          </form>
          <div className="text-left text-sm text-gray-500 mt-8 w-full">
            Don't have an account?{" "}
            <a
              href="#/register"
              className="text-violet-600 font-semibold hover:underline"
            >
              Sign Up
            </a>
          </div>
          <div className="mt-3 flex justify-center">
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


