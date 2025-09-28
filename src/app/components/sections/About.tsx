"use client";

import { useEffect, useRef, useState } from "react";

export default function About() {
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
    <section id="about" className="bg-white px-6 pt-24 pb-8 md:pb-12 scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <div
          ref={headerRef}
          className={`text-center mb-10 transition-all duration-700 ease-out ${
            headerInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">About Connexa</h1>
          <p className="text-gray-600 mt-3">
            Built for the 7‑day Backend Development Challenge using Next.js and Supabase.
          </p>
        </div>

        <div
          ref={cardRef}
          className={`bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6 md:p-8 transition-all duration-700 ease-out delay-150 ${
            cardInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Why this project?</h2>
          <p className="text-gray-700 leading-relaxed">
            This app was created to demonstrate a production‑minded backend in a tight timeframe.
            It uses Next.js (App Router) for server routes and rendering, and Supabase for Postgres,
            RPCs, and secure data access. The focus is on shipping a solid MVP in 7 days.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">What’s included</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>JWT authentication with hashed passwords and role‑based access control (RBAC)</li>
            <li>Events CRUD API with owner/admin permissions</li>
            <li>Normalized Postgres schema and indexes via Supabase SQL</li>
            <li>RESTful endpoints with validation and consistent responses</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">API Documentation</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <a
                href="https://docs.google.com/document/d/1Uu1q-nudvIg4AILp83KUZfF01CQIxcz3fvq_C4pNO1k/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-sm break-all"
              >
                API Documentation (Google Doc)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
