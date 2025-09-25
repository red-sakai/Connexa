import Button from "../ui/Button";
import Button2 from "../ui/Button2";

export default function Navbar() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto animate-fade-in">
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
          <a href="#about" className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 relative group">
            About
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </a>
          <a href="#contact" className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 relative group">
            Contact
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </a>
        </div>
        
        <div className="space-x-4">
          <button className="text-indigo-600 hover:text-indigo-800 transition-colors duration-300 hover:scale-105 transform">
            Sign In
          </button>
          <Button2 className="shadow-lg hover:shadow-xl">
            Get Started
          </Button2>
        </div>
      </nav>
    </div>
  );
}
