import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { signAuthToken } from "../../../lib/jwt";

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_URL && !process.env.SUPBASE_URL) {
      return NextResponse.json({ error: "SUPABASE_URL is not set" }, { status: 500 });
    }
    if (!process.env.SUPABASE_API_KEY) {
      return NextResponse.json({ error: "SUPABASE_API_KEY is not set" }, { status: 500 });
    }

    const { email, password } = await req.json();
    if (typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("verify_login", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error("verify_login RPC error:", error);
      const msg = (error.message || "").toLowerCase();
      let clientMsg = `Invalid credentials`;
      if (msg.includes("ambiguous") && msg.includes("email")) {
        clientMsg =
          "Login failed: database function error (ambiguous 'email'). Qualify columns in SQL (use uc.email) and recreate functions.";
      } else if (msg.includes("crypt") || msg.includes("gen_salt")) {
        clientMsg =
          "Login failed: pgcrypto functions not found. Ensure search_path includes extensions or reinstall pgcrypto.";
      }
      return NextResponse.json({ error: clientMsg, details: error.message }, { status: 401 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_id) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signAuthToken({
      sub: row.user_id,
      email: row.email,
      role: row.role,
    });

    return NextResponse.json(
      { user: { id: row.user_id, email: row.email, role: row.role }, token },
      { status: 200 }
    );
  } catch (e) {
    console.error("Login route error:", e);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
