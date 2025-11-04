import type { CSSProperties } from "react";

export const heroBackgroundStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(28, 16, 62, 0.7), rgba(76, 44, 114, 0.85)), url('/images/login-bg-unsplash.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

export const heroOverlayClass = "absolute inset-0 bg-black/20 backdrop-blur-[1px]";

export const authCardClass =
  "relative flex flex-col items-center justify-center w-full max-w-[1100px] min-h-[75vh] mx-auto rounded-[2.5rem] shadow-[0_35px_90px_-25px_rgba(15,15,45,0.6)] bg-white/90 backdrop-blur-2xl border border-white/40 overflow-hidden";

