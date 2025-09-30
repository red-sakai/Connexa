/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { signAuthToken } from "../../../lib/jwt";

export async function POST(req: Request) {
  try {
    // Env guard to catch misconfiguration early
    if (!process.env.SUPABASE_URL && !process.env.SUPBASE_URL) {
      return NextResponse.json({ error: "SUPABASE_URL is not set" }, { status: 500 });
    }
    if (!process.env.SUPABASE_API_KEY) {
      return NextResponse.json({ error: "SUPABASE_API_KEY is not set" }, { status: 500 });
    }

    const { email, password, role } = await req.json();
    if (typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }
    if (role && role !== "user" && role !== "admin") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("register_user", {
      p_email: email,
      p_password: password,
      p_role: role ?? "user",
    });

    if (error) {
      console.error("register_user RPC error:", error);
      const msg = (error.message || "").toLowerCase();
      let clientMsg = `Registration failed: ${error.message || "unknown error"}`;
      if (msg.includes("ambiguous") && msg.includes("email")) {
        clientMsg =
          "Registration failed: database function error (ambiguous 'email'). Qualify columns in SQL (use u.email) and recreate functions.";
      } else if (msg.includes("crypt") || msg.includes("gen_salt")) {
        clientMsg =
          "Registration failed: pgcrypto functions not found. Ensure search_path includes extensions or reinstall pgcrypto.";
      }
      return NextResponse.json(
        { error: clientMsg, details: error.message },
        { status: 400 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_id || !row?.email || !row?.role) {
      console.error("register_user RPC returned unexpected payload:", data);
      return NextResponse.json(
        { error: "Unexpected response from register_user" },
        { status: 502 }
      );
    }

    const token = await signAuthToken({
      sub: row.user_id,
      email: row.email,
      role: row.role,
    });

    return NextResponse.json(
      { user: { id: row.user_id, email: row.email, role: row.role }, token },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Register route error:", e);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
