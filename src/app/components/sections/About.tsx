export default function About() {
  return (
    <section
      id="about"
      className="bg-gradient-to-br from-blue-50 to-indigo-100 px-6 pt-24 pb-8 md:pb-12 scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">About Connexa</h1>
          <p className="text-gray-600 mt-3">
            Built for the 7‑day Backend Development Challenge using Next.js and Supabase.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6 md:p-8">
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

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">What’s next</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Paid ticketing and payments</li>
            <li>Deeper analytics and exports</li>
            <li>Team collaboration workflows</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
