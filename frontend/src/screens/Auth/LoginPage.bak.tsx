import React, { useEffect, useRef, useState } from "react";
import {
  apiLogin,
  apiGoogleLogin,
  type LoginResponse,
} from "../../services/api";

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
  // Removed remember me state
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleInitDoneRef = useRef(false);

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
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
        });
        googleInitDoneRef.current = true;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div
        className="flex flex-row w-full max-w-[1300px] min-h-[82vh] mx-auto rounded-[2.5rem] shadow-2xl bg-white p-0 md:p-0 gap-0 md:gap-0 relative overflow-hidden"
        style={{ margin: "2vw" }}
      >
        {/* Left: Login Form */}
        <div className="flex flex-col justify-center w-full max-w-xl px-6 md:px-12 lg:px-18 py-16 md:py-20 h-full mx-auto md:ml-20 lg:ml-32 xl:ml-40">
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
            <h1 className="text-4xl font-bold mb-2">Hello, Welcome Back</h1>
            <p className="text-gray-500 mb-1">
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
            {/* Removed Remember me checkbox and Forgot Password link */}
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <button
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
            <div className="w-full mt-0.5">
              <button
                type="button"
                className="w-full py-3 rounded border border-gray-300 bg-white text-gray-700 font-semibold text-lg shadow flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                onClick={() => {
                  if (window.google && window.GOOGLE_CLIENT_ID) {
                    window.google.accounts.id.prompt();
                  } else {
                    alert(
                      "Google login is not ready. Please try again in a moment."
                    );
                  }
                }}
                disabled={busy}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_17_40)">
                    <path
                      d="M23.766 12.276c0-.818-.074-1.604-.213-2.356H12.24v4.451h6.484a5.537 5.537 0 01-2.4 3.632v3.017h3.877c2.27-2.092 3.565-5.176 3.565-8.744z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12.24 24c3.24 0 5.963-1.07 7.95-2.91l-3.877-3.017c-1.08.726-2.457 1.155-4.073 1.155-3.13 0-5.78-2.112-6.734-4.946H1.53v3.09A11.997 11.997 0 0012.24 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.506 14.282A7.19 7.19 0 014.84 12c0-.793.137-1.563.366-2.282V6.627H1.53A11.997 11.997 0 000 12c0 1.885.453 3.668 1.53 5.373l3.976-3.09z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.24 4.771c1.765 0 3.34.607 4.584 1.8l3.43-3.43C18.2 1.07 15.477 0 12.24 0A11.997 11.997 0 001.53 6.627l3.976 3.09c.954-2.834 3.604-4.946 6.734-4.946z"
                      fill="#EA4335"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_17_40">
                      <path fill="#fff" d="M0 0h24v24H0z" />
                    </clipPath>
                  </defs>
                </svg>
                Sign in with Google
              </button>
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
        </div>
        {/* Right: Image Section */}
        <div className="hidden md:block">
          <div
            className="absolute top-0 left-[62%] h-full overflow-hidden"
            style={{ width: "32%", zIndex: 1 }}
          >
            <img
              src="/images/login_image.jpg"
              alt="Login Visual"
              className="h-full w-full object-cover object-center rounded-[2.5rem]"
              style={{ display: "block" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
