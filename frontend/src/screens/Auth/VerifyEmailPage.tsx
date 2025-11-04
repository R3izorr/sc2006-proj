import React, { useEffect, useState } from "react";
import { apiVerifyEmailConfirm } from "../../services/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("Verifying…");

  useEffect(() => {
    // Support hash-based routing: #/verify-email?token=...
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
    if (!token) {
      setStatus("err");
      setMsg("Missing verification token");
      return;
    }
    apiVerifyEmailConfirm(token)
      .then(() => {
        setStatus("ok");
        setMsg("Email verified. You may sign in now.");
      })
      .catch((e) => {
        setStatus("err");
        setMsg(e?.message || "Verification failed");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div
        className="flex flex-col items-center justify-center w-full max-w-[1100px] min-h-[82vh] mx-auto rounded-[2.5rem] shadow-2xl bg-white p-0 relative overflow-hidden"
        style={{ margin: "2vw" }}
      >
        <div className="flex flex-col justify-center items-center w-full max-w-[600px] px-6 md:px-12 py-16 md:py-20 h-full mx-auto text-center">
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
            <h1 className="text-4xl font-bold mb-4 text-center">
              Email Verification
            </h1>
            {status === "idle" && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 text-lg">{msg}</p>
              </div>
            )}
            {status === "ok" && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-gray-800 text-lg font-medium">{msg}</p>
              </div>
            )}
            {status === "err" && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-red-600 text-lg font-medium">{msg}</p>
              </div>
            )}
          </div>
          <div className="mt-8">
            <a
              href="#/login"
              className="px-8 py-3 rounded bg-violet-600 text-white font-semibold text-lg shadow hover:bg-violet-700 transition inline-block"
            >
              Go to Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}



