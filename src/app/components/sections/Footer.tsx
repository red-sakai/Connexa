export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="text-lg font-semibold text-white">Connexa</span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href="#features" className="text-gray-300 hover:text-white">Features</a>
            <a href="#about" className="text-gray-300 hover:text-white">About</a>
            <a href="#contact" className="text-gray-300 hover:text-white">Contact</a>
            <a href="/signup" className="text-gray-300 hover:text-white">Sign Up</a>
            <a href="/signin" className="text-gray-300 hover:text-white">Sign In</a>
          </nav>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          © {year} Connexa. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
