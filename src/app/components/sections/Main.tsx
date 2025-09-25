import Button from "../ui/Button";

export default function Main() {
  return (
    <main className="bg-white">
      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          Everything you need to run great events
        </h2>
        <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
          Plan, promote, and manage your community events from one place.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Event Scheduling", desc: "Create single or recurring events with timezones." },
            { title: "Attendee Management", desc: "Track registrations, RSVPs, and check-ins." },
            { title: "Ticketing", desc: "Free and paid tickets with quotas and promo codes." },
            { title: "Email & Notifications", desc: "Automated updates and reminders to attendees." },
            { title: "Analytics", desc: "Understand growth with dashboards and exports." },
            { title: "Collaboration", desc: "Invite co-hosts and manage roles with ease." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center mb-4 font-bold">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Create", desc: "Set up your event details, tickets, and brand." },
              { step: "2", title: "Promote", desc: "Share your event page and send invites." },
              { step: "3", title: "Host", desc: "Check in attendees and collect feedback." },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl bg-white/80 backdrop-blur p-6 border border-white/60 shadow">
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold mb-3">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming events (sample) */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Upcoming events</h2>
            <p className="text-gray-600">A quick preview of what’s happening.</p>
          </div>
          <Button variant="outline" href="/signup" className="hidden sm:inline-flex">
            Create Event
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <article key={i} className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-indigo-200 to-blue-100" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Community Meetup #{i}</h3>
                <p className="text-gray-600 mb-3">Aug {10 + i}, 6:00 PM • Central Hall</p>
                <Button variant="outline" href="/signup" className="w-full">
                  Get Tickets
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to grow your community?</h2>
            <p className="text-indigo-100 mt-1">Create your first event in minutes.</p>
          </div>
          <Button href="/signup" className="bg-white text-indigo-700 hover:bg-indigo-50">
            Get Started Free
          </Button>
        </div>
      </section>
    </main>
  );
}
