"use client";

import { useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiCalendar } from "react-icons/fi";
import { FiUsers } from "react-icons/fi";
import { FiList } from "react-icons/fi";
import { FiShield } from "react-icons/fi";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { PiTicketBold } from "react-icons/pi";

type Feature = {
  title: string;
  desc: string;
  Icon: IconType;
};

export default function Features() {
  const items: Feature[] = [
    { title: "Create & Manage Events", desc: "Basic CRUD for events with date, time, and location.", Icon: FiCalendar },
    { title: "Attendee Registration (RSVP)", desc: "Simple sign-up for attendees with email capture.", Icon: FiUsers },
    { title: "Free Ticketing", desc: "Issue free tickets with capacity limits.", Icon: PiTicketBold },
    { title: "Event Listings", desc: "Public event pages and a simple listing view.", Icon: FiList },
    { title: "Admin Panel (Basic)", desc: "Manage events and view attendee lists.", Icon: FiShield },
  ];

  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<boolean[]>(() =>
    items.map((_, i) => i === 0)
  );

  // Swipe state
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const swiping = useRef(false);

  const total = items.length;
  const goTo = (i: number) => {
    setIndex(i);
    setVisited((v) => {
      if (v[i]) return v;
      const copy = [...v];
      copy[i] = true;
      return copy;
    });
  };
  const prev = () => {
    setIndex((cur) => {
      const nextIdx = (cur - 1 + total) % total;
      setVisited((v) => {
        if (v[nextIdx]) return v;
        const copy = [...v];
        copy[nextIdx] = true;
        return copy;
      });
      return nextIdx;
    });
  };
  const next = () => {
    setIndex((cur) => {
      const nextIdx = (cur + 1) % total;
      setVisited((v) => {
        if (v[nextIdx]) return v;
        const copy = [...v];
        copy[nextIdx] = true;
        return copy;
      });
      return nextIdx;
    });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    swiping.current = false;
    setDragX(0);
    setDragging(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Only treat as swipe if horizontal movement dominates
    if (!swiping.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        swiping.current = true;
        setDragging(true);
      } else {
        return;
      }
    }
    setDragX(dx);
  };

  const onTouchEnd = () => {
    if (swiping.current) {
      const threshold = 60;
      if (dragX > threshold) prev();
      else if (dragX < -threshold) next();
    }
    setDragX(0);
    setDragging(false);
    startX.current = null;
    startY.current = null;
    swiping.current = false;
  };

  return (
    <section id="features" className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          MVP features to ship this week
        </h2>
        <p className="text-gray-600 text-center max-w-3xl mx-auto mb-10">
          A focused feature set to plan, publish, and manage community events quickly.
        </p>

        {/* Carousel */}
        <div
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className={`${dragging ? "flex" : "flex transition-transform duration-500 ease-out"}`}
            style={{ transform: `translateX(calc(-${index * 100}% + ${dragX}px))` }}
          >
            {items.map(({ title, desc, Icon }) => (
              <div key={title} className="min-w-full p-8 md:p-12">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Arrow controls (hidden on mobile) */}
          <button
            type="button"
            aria-label="Previous"
            onClick={prev}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 backdrop-blur border border-gray-200 shadow hover:bg-white items-center justify-center"
          >
            <FiChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={next}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 backdrop-blur border border-gray-200 shadow hover:bg-white items-center justify-center"
          >
            <FiChevronRight className="h-5 w-5 text-gray-700" />
          </button>

          {/* Indicators */}
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {items.map((_, i) => {
              const isActive = i === index;
              const hasVisited = visited[i];
              return (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={isActive}
                  onClick={() => goTo(i)}
                  className={[
                    "h-2.5 w-2.5 rounded-full transition-all duration-300",
                    isActive
                      ? "bg-indigo-600 scale-125"
                      : hasVisited
                      ? "bg-indigo-400"
                      : "bg-gray-300",
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}