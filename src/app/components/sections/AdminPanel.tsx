"use client";
import { useEffect, useState } from "react";
import Button from "../ui/Button";

type Props = { eventId: string };
type Attendee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact: string;
  created_at: string;
};
type AdminRow = { id: string; email: string; created_at: string };

export default function AdminPanel({ eventId }: Props) {
  const [list, setList] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("");

  // Delegated admins management
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminErr, setAdminErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const [attRes, evtRes] = await Promise.all([
        fetch(`/api/events/${eventId}/attendees`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        }),
        fetch(`/api/events/${eventId}`, { cache: "no-store" }),
      ]);

      const attJson = await attRes.json().catch(() => ({}));
      const evtJson = await evtRes.json().catch(() => ({}));

      if (!attRes.ok) throw new Error(attJson?.error || "Failed to load attendees");
      if (evtRes.ok && evtJson?.data?.title) setEventTitle(evtJson.data.title);

      setList(Array.isArray(attJson?.data) ? attJson.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmins() {
    setAdminErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Check if current user can manage (owner/admin)
      const me = await fetch(`/api/events/${eventId}/admins?me=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).then((r) => r.json()).catch(() => ({}));
      // canManage: only if owner/admin; me.allowed may be true for delegates too; we'll fetch list conditionally
      const listRes = await fetch(`/api/events/${eventId}/admins`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (listRes.ok) {
        const j = await listRes.json().catch(() => ({}));
        setAdmins(Array.isArray(j?.data) ? j.data : []);
        setCanManage(true);
      } else {
        // Not owner; still set canManage based on /admins?me=1 to indicate delegated access (no manage UI)
        setCanManage(false);
      }
    } catch (e: any) {
      setAdmins([]);
      setCanManage(false);
    }
  }

  async function addAdmin() {
    setSavingAdmin(true);
    setAdminErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/events/${eventId}/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: adminEmail }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminErr(j?.error || "Failed to add admin");
        return;
      }
      setAdminEmail("");
      await loadAdmins();
    } finally {
      setSavingAdmin(false);
    }
  }

  async function removeAdmin(email: string) {
    setSavingAdmin(true);
    setAdminErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/events/${eventId}/admins?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}));
        setAdminErr(j?.error || "Failed to remove admin");
        return;
      }
      await loadAdmins();
    } finally {
      setSavingAdmin(false);
    }
  }

  useEffect(() => {
    load();
    loadAdmins();
  }, [eventId]);

  return (
    <section className="min-h-screen bg-gray-50 px-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" href="/main" className="!px-3 !py-2 text-sm">
            ← Back to feed
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">{eventTitle ? `Event: ${eventTitle}` : `Event ID: ${eventId}`}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <p className="text-sm text-gray-600">
              Attendees: <span className="font-medium text-gray-900">{list.length}</span>
            </p>
            <Button variant="outline" onClick={load} className="!px-3 !py-1.5 text-sm">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Loading attendees…</div>
          ) : err ? (
            <div className="p-6 text-red-600">{err}</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-gray-600">No attendees yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Contact</th>
                    <th className="px-4 py-3 text-left font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {a.first_name} {a.last_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.email}</td>
                      <td className="px-4 py-3 text-gray-700">{a.contact}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delegated admins management (owner/admin only) */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delegated Admins</h2>
          {!canManage ? (
            <p className="text-sm text-gray-600">You don’t have permission to manage delegated admins.</p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Grant access by email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600"
                  />
                </div>
                <Button onClick={addAdmin} disabled={savingAdmin || !adminEmail} className="!px-4 !py-3">
                  {savingAdmin ? "Adding…" : "Add"}
                </Button>
              </div>
              {adminErr && <p className="text-sm text-red-600 mt-2">{adminErr}</p>}

              <div className="mt-4">
                {admins.length === 0 ? (
                  <p className="text-sm text-gray-600">No delegated admins yet.</p>
                ) : (
                  <ul className="divide-y">
                    {admins.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900">{a.email}</span>
                        <Button
                          variant="outline"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => removeAdmin(a.email)}
                          disabled={savingAdmin}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
