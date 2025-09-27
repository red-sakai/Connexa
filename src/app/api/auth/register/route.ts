import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { signAuthToken } from "../../../lib/jwt";

interface RegisterBody {
  email: string;
  password: string;
  name?: string | null;
  role?: string | null; // added
}

export async function POST(req: Request) {
  try {
    // Env guard to catch misconfiguration early
    if (!process.env.SUPABASE_URL && !process.env.SUPBASE_URL) {
      return NextResponse.json({ error: "SUPABASE_URL is not set" }, { status: 500 });
    }
    if (!process.env.SUPABASE_API_KEY) {
      return NextResponse.json({ error: "SUPABASE_API_KEY is not set" }, { status: 500 });
    }

    const data = (await req.json()) as Partial<RegisterBody>;
    if (!data.email || !data.password) {
      return Response.json({ error: "email and password required" }, { status: 400 });
    }
    const body: RegisterBody = {
      email: data.email,
      password: data.password,
      name: data.name ?? null,
      role: data.role ?? null, // added
    };

    if (typeof body.email !== "string" || !/\S+@\S+\.\S+/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }

    const { data: { user }, error } = await supabase.rpc("register_user", {
      p_email: body.email,
      p_password: body.password,
      p_role: body.role ?? "user",
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Register route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
