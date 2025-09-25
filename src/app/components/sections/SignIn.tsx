"use client";

import React, { useState } from "react";
import Link from "next/link";
import Button from "../ui/Button";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  function validate() {
    const next: typeof errors = {};
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) next.email = "Please enter a valid email.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(body?.error || "Invalid credentials");
        return;
      }
      // Optionally persist token for authenticated requests
      if (body?.token) localStorage.setItem("token", body.token);
      router.push("/main"); // changed from "/"
    } catch {
      setApiError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 border border-white/60">
        <div className="mb-4">
          <Button variant="outline" href="/" className="!px-3 !py-2 text-sm">
            ← Back
          </Button>
        </div>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <span className="font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to Connexa</h1>
          <p className="text-gray-600 mt-1">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 ${
                errors.email ? "border-red-400" : "border-gray-300"
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="#" className="text-sm text-indigo-600 hover:text-indigo-700">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 ${
                  errors.password ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-3 my-auto text-sm text-indigo-600 hover:text-indigo-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="remember" className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
          </div>

          {apiError && <p className="text-sm text-red-600">{apiError}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
