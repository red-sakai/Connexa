"use client";

import { useEffect, useState } from "react";
import Button from "../ui/Button";

type TicketProps = { eventId: string };
type EventData = {
  id?: string;
  title?: string;
  description?: string | null;
  event_at?: string | null;
  location?: string | null;
  host_name?: string | null;
  image_url?: string | null;
};

export default function Ticket({ eventId }: TicketProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const body = (await res.json().catch(() => ({}))) as { data?: EventData; error?: string };
        if (!res.ok) {
          if (mounted) setErr(body?.error || "Event not found");
        } else if (mounted) {
          setEvent(body.data ?? null);
        }
      } catch {
        if (mounted) setErr("Failed to load event");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    if (!first || !last || !contact || !email) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          contact,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitErr(body?.error || "Failed to register");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitErr("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const when =
    event?.event_at
      ? new Date(event.event_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : "TBA";

  return (
    <section className="min-h-screen bg-gray-50 px-6 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" href="/main" className="!px-3 !py-2 text-sm">
            ← Back to feed
          </Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          {loading && <p className="text-gray-600">Loading event…</p>}
          {err && !loading && <p className="text-red-600">{err}</p>}

          {!loading && !err && event && (
            <>
              <header className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{event.title}</h1>
                <p className="text-gray-600 mt-1">{event.description || "No description provided."}</p>
                <div className="mt-4 text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">When:</span> {when}</p>
                  <p><span className="font-medium">Where:</span> {event.location || "TBA"}</p>
                  <p><span className="font-medium">Host:</span> {event.host_name || "Organizer"}</p>
                </div>
              </header>

              {!submitted ? (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                      <input
                        id="first"
                        type="text"
                        value={first}
                        onChange={(e) => setFirst(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label htmlFor="last" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                      <input
                        id="last"
                        type="text"
                        value={last}
                        onChange={(e) => setLast(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                        placeholder="Dela Cruz"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">Contact number</label>
                      <input
                        id="contact"
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                        placeholder="+63 9xx xxx xxxx"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {submitErr && <p className="text-sm text-red-600">{submitErr}</p>}

                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Processing…" : "Confirm and get ticket"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">You&rsquo;re in!</h2>
                  <p className="text-gray-600 mt-1">
                    A confirmation will be sent to {email}. See you at {event?.location || "the venue"}.
                  </p>
                  <div className="mt-6 flex gap-3 justify-center">
                    <Button href="/main" variant="outline">Back to feed</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
