"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../ui/Button";
import Image from "next/image";

export default function EventCreation() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [whenDate, setWhenDate] = useState("");
  const [whenTime, setWhenTime] = useState("");
  const [description, setDescription] = useState("");
  const [hostName, setHostName] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function buildEventAt() {
    if (!whenDate) return null;
    const dt = whenTime ? `${whenDate}T${whenTime}:00` : `${whenDate}T00:00:00`;
    return new Date(dt).toISOString();
  }

  async function uploadImageViaAPI(eventId: string, token: string | null): Promise<string | null> {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await fetch(`/api/uploads/events/${eventId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const json = (await res.json().catch(() => ({} as unknown))) as { error?: string; url?: string };
    if (!res.ok) {
      const msg = json.error || res.statusText || "Upload failed";
      throw new Error(msg);
    }
    return typeof json.url === "string" ? json.url : null;
  }

  // Normalize any error value (string | object) into a user-displayable string
  function normalizeError(err: unknown): string {
    if (!err) return "Unexpected error";
    if (typeof err === "string") return err;
    if (typeof err === "object") {
      const anyErr = err as any;
      if (typeof anyErr.message === "string") return anyErr.message;
      if (typeof anyErr.code === "string" && typeof anyErr.message === "string") {
        return `${anyErr.code}: ${anyErr.message}`;
      }
      try {
        return JSON.stringify(anyErr);
      } catch {
        return "Error";
      }
    }
    return String(err);
  }

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const token = getToken();
    if (!token) {
      setError("Please sign in to create an event.");
      // optional redirect; comment out if you prefer to keep user on form
      // router.push("/");
      return;
    }

    const event_at = buildEventAt();
    if (!title || !event_at) {
      setError("Please provide a title and date/time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          event_at,
          host_name: hostName || null,
          location: location || null,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        data?: { id?: string };
        error?: unknown;
      };

      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired or unauthorized. Please log in again.");
          // router.push("/"); // uncomment if you want auto-redirect
          return;
        }
        setError(normalizeError(body?.error) || "Failed to create event");
        return;
      }

      const created = body?.data;
      if (created?.id && imageFile) {
        try {
          const imageUrl = await uploadImageViaAPI(created.id as string, token);
          if (imageUrl) {
            const putRes = await fetch(`/api/events/${created.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ image_url: imageUrl }),
            });
            const putJson = (await putRes.json().catch(() => ({}))) as {
              error?: unknown;
            };
            if (!putRes.ok) {
              setError(
                normalizeError(putJson?.error) ||
                  "Failed to attach image to event."
              );
              return;
            }
          } else {
            setError("Image upload returned no URL. Check storage policies.");
            return;
          }
        } catch (upErr) {
          setError(`Image upload failed: ${normalizeError(upErr)}`);
          return;
        }
      }

      router.push("/main");
    } catch (err) {
      setError(`Network error: ${normalizeError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-gray-50 px-6 pt-24 pb-16">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" href="/" className="!px-3 !py-2 text-sm">
            ← Back
          </Button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create an Event</h1>
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Host/Organizer */}
            <div>
              <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">Host / Organizer</label>
              <input
                id="host"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="e.g., PUP Devs"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="e.g., Central Hall"
              />
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="e.g., Community Tech Meetup"
              />
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  id="date"
                  type="date"
                  required
                  value={whenDate}
                  onChange={(e) => setWhenDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  id="time"
                  type="time"
                  required
                  value={whenTime}
                  onChange={(e) => setWhenTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                placeholder="Tell people what to expect..."
              />
            </div>

            {/* Optional image upload */}
            <div>
              <label htmlFor="banner" className="block text-sm font-medium text-gray-700 mb-1">
                Banner image (optional)
              </label>
              <input
                id="banner"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
              {imagePreview && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Event banner preview"
                    width={1200}
                    height={600}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Errors and actions */}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Creating..." : "Create Event"}
              </Button>
              <Button variant="outline" href="/main" className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}