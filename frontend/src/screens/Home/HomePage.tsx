import React from "react";

// Modern animations and styles
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-40px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(40px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.8s ease-out;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.8s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.6s ease-out;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  html {
    scroll-behavior: smooth;
  }
  
  .progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b);
    z-index: 9999;
    transition: width 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }
  
  .gradient-border {
    position: relative;
    background: white;
  }
  
  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .gradient-border:hover::before {
    opacity: 1;
  }
`;

export default function HomePage() {
  const [userName, setUserName] = React.useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [animateNumbers, setAnimateNumbers] = React.useState(false);
  const statsRef = React.useRef<HTMLDivElement>(null);

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

  // Scroll progress and back to top button
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 300);

      // Animate numbers when stats section is in view
      if (statsRef.current && !animateNumbers) {
        const rect = statsRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setAnimateNumbers(true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [animateNumbers]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <>
      <style>{styles}</style>
      {/* Progress Bar */}
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 animate-float"
          aria-label="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
      
      <div className="relative w-full min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      {/* Hero Section - Modern with glassmorphism */}
      <section className="relative w-full min-h-screen flex flex-col justify-center items-center z-10">
        {/* Blurred background image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/images/HomePageBG.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "blur(8px)",
          }}
        />
        {/* Modern gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/40 to-black/70 z-10" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        {/* Top Navigation - Clean transparent */}
        <nav className="flex justify-between items-center px-8 md:px-12 py-6 w-full z-30 absolute top-0 left-0">
          <div className="flex items-center gap-3">
            <img 
              src="/images/hawker-logo.png" 
              alt="Hawkerrr Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain"
            />
            <span
              className="text-white text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Hawkerrr
            </span>
          </div>
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
            className="px-6 py-2 rounded-full bg-transparent border border-white/40 text-white text-sm md:text-base font-medium hover:bg-white/10 cursor-pointer transition-all duration-300 hover:scale-105"
            style={{
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
            }}
            aria-label={userName ? "Go to profile" : "Go to login"}
          >
            {userName ? userName : "Login"}
          </button>
        </nav>
        
        {/* Hero Content - Modern typography */}
        <div className="flex flex-col items-center justify-center text-center px-6 pt-20 z-20 relative w-full h-full animate-fade-in">
          <h1
            className="text-white text-4xl md:text-7xl font-black mb-6 leading-tight tracking-tight max-w-5xl"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Hawker Opportunity
            <span className="block mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Score Platform
            </span>
          </h1>
          <p
            className="text-gray-200 text-base md:text-xl font-light mb-10 max-w-3xl mx-auto leading-relaxed"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Discover the best locations to open new hawker centres in Singapore using advanced 
            data analytics, demographic insights, and transport connectivity metrics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="group px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-base font-bold shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={handleLearnMore}
            >
              Get Started
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Statistics Section - Modern Bento Grid */}
      <section ref={statsRef} className="py-20 md:py-32 bg-gray-900 z-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-gray-900 to-pink-950/20"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Impact
              <span className="block mt-1 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                By The Numbers
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Comprehensive data analysis powering smarter decisions
            </p>
          </div>
          
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Large stat card */}
            <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl bg-gray-800/50 backdrop-blur-sm p-10 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-violet-500 animate-scale-in">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className={`text-7xl md:text-8xl font-black bg-gradient-to-br from-violet-400 to-purple-400 bg-clip-text text-transparent mb-6 ${animateNumbers ? 'animate-scale-in' : ''}`} style={{ fontFamily: "Montserrat, sans-serif" }}>
                  332
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Subzones Analyzed</h3>
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                  Comprehensive coverage across Singapore's entire urban landscape with detailed demographic and geographic analysis
                </p>
                <div className="mt-8 flex items-center gap-2 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">100% Coverage</span>
                </div>
              </div>
            </div>
            
            {/* Medium stat cards */}
            <div className="group relative overflow-hidden rounded-3xl bg-gray-800/50 backdrop-blur-sm p-8 shadow-lg hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-violet-500 animate-slide-in-right">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className={`text-5xl md:text-6xl font-black bg-gradient-to-br from-violet-400 to-purple-400 bg-clip-text text-transparent mb-4 ${animateNumbers ? 'animate-scale-in' : ''}`} style={{ fontFamily: "Montserrat, sans-serif" }}>
                  1000+
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Data Points</h3>
                <p className="text-gray-300 text-sm">
                  Population, transport, and amenities data
                </p>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-3xl bg-gray-800/50 backdrop-blur-sm p-8 shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-pink-500 animate-slide-in-right" style={{animationDelay: '0.1s'}}>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className={`text-4xl md:text-5xl font-black bg-gradient-to-br from-pink-400 to-orange-400 bg-clip-text text-transparent mb-4 ${animateNumbers ? 'animate-scale-in' : ''}`} style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Real-time
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Interactive Map</h3>
                <p className="text-gray-300 text-sm">
                  Visualize and compare subzones instantly
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Modern Card Grid */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-gray-950 to-gray-900 z-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Why Choose
              <span className="block mt-1 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                Hawkerrr
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Powerful features designed for data-driven decision making
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-violet-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative z-10 flex items-start space-x-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Data-Driven Decisions</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Access comprehensive demographic, transport, and facility data to make informed business decisions with confidence
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-purple-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative z-10 flex items-start space-x-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Visual Analysis</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Interactive color-coded maps and heatmaps let you quickly identify high-opportunity areas at a glance
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-pink-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative z-10 flex items-start space-x-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Export Reports</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Download detailed Excel reports with rankings, demographics, and metrics for your selected subzones
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-orange-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative z-10 flex items-start space-x-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Compare Instantly</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Side-by-side comparison tool helps you evaluate up to two subzones with detailed metrics and charts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Modern Bento Grid */}
      <section id="features" className="py-20 md:py-32 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 z-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjOGI1Y2Y2IiBzdHJva2Utb3BhY2l0eT0iLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Key Features
              <span className="block mt-1 text-3xl md:text-4xl bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Comprehensive tools for analyzing hawker centre opportunities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Transport Access Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 p-10 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="flex gap-3 items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <img
                      src="/icons/mrt-exit.svg"
                      alt="MRT"
                      className="w-10 h-10"
                    />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <img
                      src="/icons/bus.svg"
                      alt="Bus"
                      className="w-10 h-10"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-2xl mb-3 text-white">Transport Access</h3>
                  <p className="text-blue-50 text-base leading-relaxed mb-2">
                    Display MRT stations and bus stops for every subzone.
                  </p>
                  <p className="text-blue-100/80 text-sm">
                    Identify areas with the best connectivity for your business
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hawker Density Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 p-10 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <img
                    src="/icons/hawker.svg"
                    alt="Hawker Density"
                    className="w-14 h-14"
                  />
                </div>
                <div>
                  <h3 className="font-black text-2xl mb-3 text-white">Hawker Density</h3>
                  <p className="text-orange-50 text-base leading-relaxed mb-2">
                    Visualize existing hawker centres and identify underserved areas.
                  </p>
                  <p className="text-orange-100/80 text-sm">
                    Spot opportunities in regions lacking affordable food options
                  </p>
                </div>
              </div>
            </div>
            
            {/* Demographic Insights Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-600 p-10 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <img
                    src="/icons/chart.svg"
                    alt="Demographic Insights"
                    className="w-12 h-12"
                  />
                </div>
                <div>
                  <h3 className="font-black text-2xl mb-3 text-white">Demographic Insights</h3>
                  <p className="text-purple-50 text-base leading-relaxed mb-2">
                    Explore population, industry, and other key demographic data.
                  </p>
                  <p className="text-purple-100/80 text-sm">
                    Make informed decisions with up-to-date insights
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Modern Process Flow */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-gray-950 to-gray-900 z-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Our Methodology
              <span className="block mt-1 text-3xl md:text-4xl bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                How Scoring Works
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              We use a comprehensive data-driven approach to evaluate hawker centre opportunities across Singapore
            </p>
          </div>
          
          {/* Process Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-violet-500">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-3xl font-black mb-6 shadow-lg">
                  1
                </div>
                <h3 className="font-black text-2xl text-white mb-4">Demand Analysis</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Population density, demographics, and residential patterns analyzed in detail
                </p>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-purple-500">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center text-3xl font-black mb-6 shadow-lg">
                  2
                </div>
                <h3 className="font-black text-2xl text-white mb-4">Supply Evaluation</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Existing hawker centres and food establishment density mapped
                </p>
              </div>
            </div>
            
            <div className="group relative overflow-hidden p-8 rounded-3xl bg-gray-800/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 border-2 border-gray-700 hover:border-pink-500">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-500 to-orange-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-600 text-white flex items-center justify-center text-3xl font-black mb-6 shadow-lg">
                  3
                </div>
                <h3 className="font-black text-2xl text-white mb-4">Accessibility Score</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  Proximity to public transport (MRT stations & bus stops) calculated
                </p>
              </div>
            </div>
          </div>

          {/* CTA Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 p-10 md:p-12 shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiIGN4PSIzMCIgY3k9IjMwIiByPSIxMCIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Comprehensive Algorithm
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
                Hawker-Opportunity Score (H-Score)
              </h3>
              <p className="text-purple-100 text-lg md:text-xl max-w-3xl mx-auto mb-8 leading-relaxed">
                Our algorithm combines these factors with configurable weights to produce a comprehensive score for each subzone, helping you make data-driven decisions.
              </p>
              <a
                href="/Hawker_Opportunity_Score.pdf"
                download
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-violet-600 text-base font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Full Methodology
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Modern Design */}
      <footer className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-300 py-16 px-6 mt-auto z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjOGI1Y2Y2IiBzdHJva2Utb3BhY2l0eT0iLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand Section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Hawkerrr
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Data-driven insights for hawker centre opportunities across Singapore. Making location intelligence accessible to everyone.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://github.com/R3izorr/sc2006-proj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-violet-600 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={handleLearnMore}
                    className="text-gray-400 hover:text-violet-400 transition-colors duration-300 text-sm"
                  >
                    Get Started
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-gray-400 hover:text-violet-400 transition-colors duration-300 text-sm"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <a
                    href="/Hawker_Opportunity_Score.pdf"
                    download
                    className="text-gray-400 hover:text-violet-400 transition-colors duration-300 text-sm inline-flex items-center gap-1"
                  >
                    Methodology
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white">Get in Touch</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:contact@hawkeropportunity.sg"
                    className="text-gray-400 hover:text-violet-400 transition-colors duration-300 text-sm inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    contact@hawkeropportunity.sg
                  </a>
                </li>
              </ul>
              <div className="pt-4">
                <p className="text-gray-500 text-xs">
                  Built for SC2006 Software Engineering Project
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Hawker Opportunity Score. All rights reserved.
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Made with</span>
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span>in Singapore</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}


