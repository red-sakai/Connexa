"use client";

import Button from "../ui/Button";

export default function Contact() {
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Hook up to API/email service
  }

  return (
    <section id="contact" className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Get in touch</h2>
          <p className="text-gray-600 mt-2">Questions, feedback, or ideas? I'd love to hear from you.</p>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
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
