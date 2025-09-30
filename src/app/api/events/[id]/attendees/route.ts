/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/jwt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

function sanitizeEnvValue(raw?: string) {
  if (!raw) return raw;
  // Take only the first whitespace-delimited token (guards against "KEY OTHER_KEY=...").
  const first = raw.trim().split(/\s+/)[0];
  return first;
}

function getServerSupabase(): SupabaseClient {
  const rawUrl = process.env.SUPABASE_URL;
  const rawService =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

  const url = sanitizeEnvValue(rawUrl);
  const service = sanitizeEnvValue(rawService);

  if (!url || !service) {
    throw new Error("Supabase env not configured");
  }

  // Detect likely misformatted .env (multiple assignments on one line)
  if (/\bJWT_SECRET=/.test(String(rawService))) {
    console.warn(
      "[env warning] SUPABASE_SERVICE_ROLE_KEY appears to include another assignment (e.g. 'JWT_SECRET='). " +
        "Check your .env file: each VAR=VALUE must be on its own line."
    );
  }

  return createClient(url, service);
}

async function isOwner(supa: SupabaseClient, userId: string, eventId: string) {
  const { data } = await supa.from("events").select("owner_id").eq("id", eventId).single();
  return data?.owner_id === userId;
}

async function isDelegate(supa: SupabaseClient, email: string, eventId: string) {
  const { data } = await supa.from("event_admins").select("id").eq("event_id", eventId).eq("email", email).maybeSingle();
  return Boolean(data?.id);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const allowed = user.role === "admin" || (await isOwner(supa, user.sub, id)) || (await isDelegate(supa, user.email, id));
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supa
      .from("attendees")
      .select("id, first_name, last_name, email, contact, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Bad Request",
        details: String(e?.message || e),
        hint:
          /env not configured/i.test(String(e?.message || e))
            ? "Check .env formatting (each VAR=VALUE on its own line)."
            : undefined,
      },
      { status: 400 }
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const { first_name, last_name, email, contact } = await req.json();
    if (!first_name || !last_name || !email || !contact) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("attendees")
      .insert([{ event_id: id, first_name, last_name, email, contact }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Bad Request",
        details: String(e?.message || e),
        hint:
          /env not configured/i.test(String(e?.message || e))
            ? "Check .env formatting (each VAR=VALUE on its own line)."
            : undefined,
      },
      { status: 400 }
    );
  }
}
