"use client";
import Button2 from "../ui/Button2";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  function scrollToSection(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/#${id}`);
    }
  }

  return (
    <div className="absolute inset-x-0 top-0 z-20">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto animate-fade-in bg-transparent">
        <div className="flex items-center space-x-2 group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">Connexa</span>
        </div>
        
        <div className="hidden md:flex space-x-8">
          <a href="#features" className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 relative group">
            Features
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </a>
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, "about")}
            className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 relative group"
          >
            About
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </a>
          <a href="#contact" className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 relative group">
            Contact
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </a>
        </div>
        
        <div className="space-x-4">
          <Button2 href="/signin" className="!px-6 !py-3 !text-base !rounded-lg !shadow-xl hover:scale-105">
            Get Started
          </Button2>
        </div>
      </nav>
    </div>
  );
}