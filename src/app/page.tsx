import Navbar from "./components/sections/Navbar"
import Hero from "./components/sections/Hero"
import Features from "./components/sections/Features"
import About from "./components/sections/About"
import Contact from "./components/sections/Contact"
import Footer from "./components/sections/Footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}