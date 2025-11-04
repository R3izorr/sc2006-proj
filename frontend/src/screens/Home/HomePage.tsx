import React from "react";

export default function HomePage() {
  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        // Try to get display name from localStorage or fallback to email prefix
        const displayName = localStorage.getItem("displayName");
        const email = localStorage.getItem("userEmail");
        let name =
          displayName && displayName.trim()
            ? displayName
            : email
            ? email.split("@")[0]
            : "User";
        setUserName(name);
      } else {
        setUserName(null);
      }
    }
  }, []);

  // Handler for nav click (only for nav link, not logo)
  const handleNavLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userName) {
      window.location.hash = "/profile";
    } else {
      window.location.hash = "/login";
    }
  };

  // Handler for Learn More button
  const handleLearnMore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userName) {
      window.location.hash = "/map";
    } else {
      window.location.hash = "/login";
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* Hero Section - relatively positioned, fills viewport, allows content below */}
      <section
        className="relative w-full h-screen flex flex-col justify-center items-center z-10"
        style={{
          backgroundImage: "url('/images/HomePageBG.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        {/* Top Navigation - inside hero, absolute, highest z-index */}
        <nav className="flex justify-between items-center px-12 py-10 w-full z-30 absolute top-0 left-0">
          <span
            className="text-[#DCDCDC] text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Hawkerrr
          </span>
          <button
            type="button"
            role="link"
            tabIndex={0}
            onClick={handleNavLinkClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleNavLinkClick(e as any);
              }
            }}
            className="text-[#DCDCDC] text-lg font-normal hover:underline cursor-pointer bg-transparent border-none outline-none select-none focus-visible:ring-2 focus-visible:ring-[#DCDCDC]"
            style={{
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
            }}
            aria-label={userName ? "Go to profile" : "Go to login"}
          >
            {userName ? userName : "Login"}
          </button>
        </nav>
        {/* Hero Content - reduced font size */}
        <div className="flex flex-col items-center justify-center text-center px-4 pt-24 z-20 relative w-full h-full">
          <h1
            className="text-[#DCDCDC] text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Hawker Opportunity Score
          </h1>
          <p
            className="text-[#DCDCDC] text-sm md:text-base font-normal mb-16 max-w-2xl mx-auto"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Discover the best locations to open new hawker centres in Singapore
            <br />
            using data-driven insights.
          </p>
          <button
            className="inline-block px-8 py-3 rounded-full bg-[#DCDCDC] text-black text-base font-semibold shadow hover:bg-[#DCDCDC] transition tracking-wide"
            style={{ fontFamily: "Montserrat, sans-serif" }}
            onClick={handleLearnMore}
          >
            LEARN MORE
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white border-t border-b z-20 relative">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              src="/icons/bus.svg"
              alt="Transport Access"
              className="w-16 h-16 mb-2"
            />
            <h3 className="font-bold text-xl mb-1 ">Transport Access</h3>
            <p className=" text-base">
              See proximity to MRT stations and bus stops for every subzone.
            </p>
            <p className=" text-sm">
              Easily identify areas with the best connectivity for your business
              or project.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              src="/icons/hawker.svg"
              alt="Hawker Density"
              className="w-16 h-16 mb-2"
            />
            <h3 className="font-bold text-xl mb-1 ">Hawker Density</h3>
            <p className=" text-base">
              Visualize existing hawker centres and identify underserved areas.
            </p>
            <p className=" text-sm">
              Spot opportunities in regions lacking affordable food options.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              src="/icons/mrt-exit.svg"
              alt="Demographic Insights"
              className="w-16 h-16 mb-2"
            />
            <h3 className="font-bold text-xl mb-1 ">Demographic Insights</h3>
            <p className=" text-base">
              Explore population, industry, and other key demographic data.
            </p>
            <p className=" text-sm">
              Make informed decisions with up-to-date, data-driven insights.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black bg-opacity-80 text-[#DCDCDC] py-8 px-4 mt-auto z-20 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left text-sm">
            &copy; {new Date().getFullYear()} Hawker Opportunity Score. All
            rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/R3izorr/sc2006-proj"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-[#DCDCDC] hover:text-[#DCDCDC]"
            >
              GitHub
            </a>
            <a
              href="mailto:contact@hawkeropportunity.sg"
              className="hover:underline text-[#DCDCDC] hover:text-[#DCDCDC]"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


