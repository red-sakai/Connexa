"use client"
import Button from "../ui/Button";
import { useEffect, useState } from "react";

export default function Hero() {
  const [showDivider, setShowDivider] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowDivider(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden pt-16">
      {/* Animated background decorations */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-72 h-72 bg-indigo-400/40 rounded-full blur-3xl animate-float-slow top-[-4rem] left-[-4rem]" />
        <div className="absolute w-96 h-96 bg-purple-400/40 rounded-full blur-3xl animate-float-slower bottom-[-6rem] right-[-2rem]" />
        <div className="absolute w-64 h-64 bg-blue-400/40 rounded-full blur-3xl animate-float-medium top-1/3 right-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_60%)]" />
      </div>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-up opacity-0 animation-delay-300">
            Bring Your Community
            <span className="text-indigo-600 animate-pulse"> Together</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up opacity-0 animation-delay-500">
            Connexa makes it easy to organize, manage, and grow your community events. 
            From small meetups to large conferences, we&rsquo;ve got you covered.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up opacity-0 animation-delay-700">
            <Button href="/signin">
              Start Planning Events
            </Button>
            <Button variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Squiggly divider (appears on scroll) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 transition-all duration-700 ease-out ${
          showDivider ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-24 md:h-40">
          <path
            fill="#ffffff"
            d="M0,224 C120,202.7 240,181.3 360,170.7 C480,160 600,160 720,176 C840,192 960,224 1080,213.3 C1200,202.7 1320,149.3 1440,128 L1440,320 L0,320 Z"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Subtle float for background blobs */
        @keyframes float {
          0% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-15px) translateX(10px) scale(1.04); }
          100% { transform: translateY(0) translateX(0) scale(1); }
        }
        .animate-float-slow { animation: float 18s ease-in-out infinite; }
        .animate-float-slower { animation: float 28s ease-in-out infinite; }
        .animate-float-medium { animation: float 22s ease-in-out infinite; }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-700 { animation-delay: 0.7s; }
        .animation-delay-900 { animation-delay: 0.9s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-1100 { animation-delay: 1.1s; }
      `}</style>
    </div>
  );
}