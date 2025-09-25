"use client";

import Button from "../ui/Button";
import { useEffect, useRef, useState } from "react";

export default function Contact() {
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Hook up to API/email service
  }

  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [headerInView, setHeaderInView] = useState(false);
  const [cardInView, setCardInView] = useState(false);

  useEffect(() => {
    const opts: IntersectionObserverInit = { threshold: 0.15 };
    const hObs = new IntersectionObserver(([e]) => setHeaderInView(e.isIntersecting), opts);
    const cObs = new IntersectionObserver(([e]) => setCardInView(e.isIntersecting), opts);
    if (headerRef.current) hObs.observe(headerRef.current);
    if (cardRef.current) cObs.observe(cardRef.current);
    return () => {
      hObs.disconnect();
      cObs.disconnect();
    };
  }, []);

  return (
    <section id="contact" className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div
          ref={headerRef}
          className={`text-center mb-10 transition-all duration-700 ease-out ${
            headerInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Get in touch</h2>
          <p className="text-gray-600 mt-2">
            Questions, feedback, or ideas? I'd love to hear from you.
          </p>
        </div>

        <div
          ref={cardRef}
          className={`max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 transition-all duration-700 ease-out delay-150 ${
            cardInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="How can I help?"
              />
            </div>

            <Button type="submit" className="w-full">Send message</Button>
          </form>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Prefer email? Reach me at <a href="mailto:jheredmiguelrepublica14@gmail.com" className="text-indigo-600 hover:text-indigo-700">jheredmiguelrepublica14@gmail.com</a>
          </p>
        </div>
      </div>
    </section>
  );
}
