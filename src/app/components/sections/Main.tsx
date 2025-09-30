"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "../ui/Button";
import { useRouter } from "next/navigation";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiMapPin,
  FiClock,
  FiUsers,
} from "react-icons/fi";
import Image from "next/image";

type EventItem = {
  id: string;
  title: string;
  host: string;
  hostInitials: string;
  when: string;
  where: string;
  attendees: number;
  liked: boolean;
  description: string;
  bannerClass: string;
  ownerId?: string;
  eventAtISO?: string | null;
  imageUrl?: string | null;
};

type EventApi = {
  id: string;
  title: string;
  host_name?: string | null;
  event_at?: string | null;
  location?: string | null;
  description?: string | null;
  owner_id?: string | null;
  image_url?: string | null;
};

export default function Main() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userSub, setUserSub] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [delegateSet, setDelegateSet] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 4;
  const router = useRouter();

  // Decode JWT payload locally to extract sub/email/role
  function parseTokenField<T = unknown>(token: string, field: string): T | null {
    try {
      const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
      if (!base64) return null;
      const payload = JSON.parse(atob(base64));
      return (payload?.[field] ?? null) as T | null;
    } catch {
      return null;
    }
  }

  function initialsFrom(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async function isDelegatedFor(eventId: string): Promise<boolean> {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/events/${eventId}/admins?me=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      return Boolean(j?.allowed);
    } catch {
      return false;
    }
  }

  async function checkDelegationForChunk(chunk: EventItem[]) {
    const entries = await Promise.all(
      chunk.map(async (e) => ({ id: e.id, allowed: await isDelegatedFor(e.id) }))
    );
    setDelegateSet((prev: Set<string>) => {
      const copy = new Set(prev);
      for (const { id, allowed } of entries) if (allowed) copy.add(id);
      return copy;
    });
  }

  // Add: hydrate a chunk with attendees_count (moved above fetchEvents)
  const hydrateWithCounts = useCallback(async (chunk: EventItem[]): Promise<EventItem[]> => {
    return Promise.all(
      chunk.map(async (e) => {
        try {
          const r = await fetch(`/api/events/${e.id}`, { cache: "no-store" });
          const j = (await r.json().catch(() => ({}))) as { data?: { attendees_count?: number } };
          const cnt = r.ok ? (j?.data?.attendees_count ?? 0) : e.attendees;
          return { ...e, attendees: cnt };
        } catch {
          return e;
        }
      })
    );
  }, []);

  // Helper: fetch events list, hydrate first PAGE_SIZE, and check delegation for visible ones
  const fetchEvents = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/events?ts=${Date.now()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = await res.json();
      const list = Array.isArray(body?.data) ? body.data : [];
      const palette = [
        "bg-gradient-to-br from-indigo-200 to-blue-100",
        "bg-gradient-to-br from-purple-200 to-pink-100",
        "bg-gradient-to-br from-emerald-200 to-teal-100",
      ];
      const mapped: EventItem[] = list.map((ev: unknown, i: number) => {
        const e = ev as {
          id: string;
          title: string;
          host_name?: string;
          event_at?: string | null;
          location?: string | null;
          description?: string | null;
          owner_id?: string;
          image_url?: string | null;
        };
        const hostName = e.host_name || "Organizer";
        return {
          id: e.id,
          title: e.title,
          host: hostName,
          hostInitials: initialsFrom(hostName),
          when: e.event_at
            ? new Date(e.event_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "TBA",
          where: e.location || "TBA",
          attendees: 0, // will be hydrated per page
          liked: false,
          description: e.description ?? "",
          bannerClass: palette[i % palette.length],
          ownerId: e.owner_id ?? undefined,
          eventAtISO: e.event_at ?? null,
          imageUrl: e.image_url ?? null,
        };
      });

      setAllEvents(mapped);

      // Hydrate first page with attendee counts
      const initialSlice = mapped.slice(0, PAGE_SIZE);
      const hydrated = await hydrateWithCounts(initialSlice);
      setEvents(hydrated);
      await checkDelegationForChunk(initialSlice);
    } catch {
      // ignore
    }
  }, [PAGE_SIZE, checkDelegationForChunk, hydrateWithCounts]);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) {
      const email = parseTokenField<string>(t, "email");
      const sub = parseTokenField<string>(t, "sub");
      const role = parseTokenField<string>(t, "role");
      if (email) setUserEmail(email);
      if (sub) setUserSub(sub);
      if (role) setUserRole(role);
    }
  }, []);

  // Initial feed load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const userInitial = userEmail?.[0]?.toUpperCase() || "U";

  function logout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  function toggleLike(id: string) {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, liked: !e.liked } : e))
    );
  }

  // Refetch next page instead of all
  async function loadMore() {
    setLoadingMore(true);
    try {
      const start = events.length;
      const end = Math.min(start + PAGE_SIZE, allEvents.length);
      if (start >= end) return;
      const nextSlice = allEvents.slice(start, end);
      const hydrated = await hydrateWithCounts(nextSlice);
      setEvents((prev) => [...prev, ...hydrated]);
      await checkDelegationForChunk(nextSlice);
    } finally {
      setLoadingMore(false);
    }
  }

  // Editing state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editHost, setEditHost] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(e: EventItem) {
    setEditId(e.id);
    setEditTitle(e.title);
    setEditHost(e.host === "Organizer" ? "" : e.host);
    setEditLocation(e.where === "TBA" ? "" : e.where);
    setEditDesc(e.description || "");
    // derive date/time from ISO
    if (e.eventAtISO) {
      const d = new Date(e.eventAtISO);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      setEditDate(`${yyyy}-${mm}-${dd}`);
      setEditTime(`${hh}:${min}`);
    } else {
      setEditDate("");
      setEditTime("");
    }
  }
  function closeEdit() {
    setEditId(null);
    setEditError(null);
  }
  function canEdit(e: EventItem) {
    return (userSub && e.ownerId && userSub === e.ownerId) || userRole === "admin";
  }
  function buildISO(dateStr: string, timeStr: string) {
    if (!dateStr) return null;
    const dt = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
    return new Date(dt).toISOString();
  }
  // Add: helper to check ownership (without admin override)
  function isOwner(e: EventItem) {
    return Boolean(userSub && e.ownerId && userSub === e.ownerId);
  }
  function canManage(e: EventItem) {
    return isOwner(e) || delegateSet.has(e.id);
  }

  async function submitEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editId) return;
    setEditError(null);
    const event_at = buildISO(editDate, editTime);
    if (!editTitle || !event_at) {
      setEditError("Please provide a title and date/time.");
      return;
    }
    setEditSubmitting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/events/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          event_at,
          host_name: editHost || null,
          location: editLocation || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(body?.error || "Failed to update event");
        return;
      }
      const updated = body?.data;
      if (updated?.id) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === updated.id
              ? {
                  ...e,
                  title: updated.title,
                  description: updated.description ?? "",
                  host: updated.host_name || "Organizer",
                  hostInitials: initialsFrom(updated.host_name || "Organizer"),
                  where: updated.location || "TBA",
                  when: updated.event_at
                    ? new Date(updated.event_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "TBA",
                  eventAtISO: updated.event_at ?? null,
                  imageUrl: updated.image_url ?? e.imageUrl, // keep/refresh image url if present
                }
              : e
          )
        );
      }
      closeEdit();
    } catch {
      setEditError("Network error. Try again.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Helper: validate remote image URLs to prevent Next/Image errors
  function isSafeImageUrl(url: string) {
    try {
      const u = new URL(url);
      return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname;
    } catch {
      return false;
    }
  }

  // Add: central create-event navigation helper
  const EVENT_CREATE_PATH = "/eventcreation";
  function goCreate() {
    router.push(EVENT_CREATE_PATH);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left sidebar */}
          <aside className="hidden md:block md:col-span-3 sticky top-24 self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">Welcome back</p>
                  {userEmail ? (
                    <p className="text-sm text-gray-600 truncate" title={userEmail}>
                      {userEmail}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">Plan your next event</p>
                  )}
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Button
                  variant="outline"
                  onClick={logout}
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  Log out
                </Button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Shortcuts
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a className="text-gray-700 hover:text-indigo-600" href="#">
                    My Events
                  </a>
                </li>
                <li>
                  <a className="text-gray-700 hover:text-indigo-600" href="#">
                    Saved
                  </a>
                </li>
                <li>
                  <a className="text-gray-700 hover:text-indigo-600" href="#">
                    Following
                  </a>
                </li>
              </ul>
            </div>
          </aside>

          {/* Feed */}
          <section className="md:col-span-6 space-y-6">
            {/* Composer */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {userInitial}
                </div>
                <button
                  aria-label="Create a new event"
                  className="flex-1 text-left text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => router.push("/eventcreation")}
                >
                  What’s your next event?
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {/* Replaced href with onClick */}
                <Button variant="outline" onClick={goCreate} className="flex-1">
                  Create event
                </Button>
                <Button variant="outline" onClick={goCreate} className="flex-1">
                  Invite friends
                </Button>
              </div>
            </div>

            {/* Empty state */}
            {events.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
                <p className="font-medium text-gray-900 mb-2">No events yet</p>
                <p className="mb-4">Be the first to create an event for everyone to join.</p>
                <Button variant="outline" onClick={goCreate}>
                  Create event
                </Button>
              </div>
            )}

            {/* Events feed */}
            {events.map((e) => (
              <article
                key={e.id}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <header className="flex items-center gap-3 p-5">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    {e.hostInitials}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 leading-tight">
                      {e.host}
                    </p>
                    <p className="text-xs text-gray-500">{e.when}</p>
                  </div>
                </header>

                {e.imageUrl && isSafeImageUrl(e.imageUrl) ? (
                  <div className="relative h-44 md:h-56 w-full">
                    <Image
                      src={e.imageUrl}
                      alt={e.title || "Event image"}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onError={(ev) => {
                        // Hide broken image container -> fallback shown below by state update
                        (ev.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className={`h-44 md:h-56 ${e.bannerClass}`} />
                )}

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {e.title}
                  </h3>
                  <p className="mt-1 text-gray-700 leading-relaxed line-clamp-3">
                    {e.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <FiClock aria-hidden /> {e.when}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FiMapPin aria-hidden /> {e.where}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FiUsers aria-hidden /> {e.attendees} going
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleLike(e.id)}
                        aria-pressed={e.liked}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          e.liked
                            ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <FiHeart className={e.liked ? "text-indigo-600" : ""} />
                        Like
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Comment on event"
                      >
                        <FiMessageCircle />
                        Comment
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Share event"
                      >
                        <FiShare2 />
                        Share
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage(e) && (
                        <Button
                          variant="outline"
                          className="!px-4 !py-2"
                          onClick={() => router.push(`/events/${e.id}/admin`)}
                        >
                          Admin Panel
                        </Button>
                      )}
                      {canEdit(e) && (
                        <Button variant="outline" className="!px-4 !py-2" onClick={() => openEdit(e)}>
                          Edit
                        </Button>
                      )}
                      {!isOwner(e) && (
                        <Button variant="outline" href={`/tickets/${e.id}`} className="!px-4 !py-2">
                          Get tickets
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full inline-flex items-center justify-center gap-2"
                onClick={loadMore}
                disabled={loadingMore || events.length >= allEvents.length}
              >
                {loadingMore && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"
                    />
                  </svg>
                )}
                {events.length >= allEvents.length ? "No more events" : loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Upcoming
              </p>
              <ul className="space-y-3 text-sm">
                {events.slice(0, 3).map((u) => (
                  <li key={`up-${u.id}`} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {u.hostInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {u.title}
                      </p>
                      <p className="text-gray-600">{u.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Suggestions
              </p>
              <div className="space-y-3">
                {["PUP Devs", "Cloud Club", "UI Circle"].map((g) => (
                  <div key={g} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
                        {g
                          .split(" ")
                          .map((s) => s[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm text-gray-900">{g}</span>
                    </div>
                    <Button variant="outline" className="!px-3 !py-1.5 text-xs">
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Event</h2>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>
                <div>
                  <label htmlFor="edit-time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    id="edit-time"
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-host" className="block text-sm font-medium text-gray-700 mb-1">Host / Organizer</label>
                <input
                  id="edit-host"
                  type="text"
                  value={editHost}
                  onChange={(e) => setEditHost(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                  placeholder="e.g., PUP Devs"
                />
              </div>

              <div>
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  id="edit-location"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                  placeholder="e.g., Central Hall"
                />
              </div>

              <div>
                <label htmlFor="edit-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="edit-desc"
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                />
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={closeEdit} className="!px-4 !py-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting} className="!px-4 !py-2">
                  {editSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}