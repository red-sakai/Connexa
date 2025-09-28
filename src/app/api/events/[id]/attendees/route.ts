import { NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/jwt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Consistent response helper
function respond(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

// Improved bearer extraction
function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

// Central auth parsing (used for GET only)
async function parseAuth(req: Request) {
  const token = getBearer(req);
  if (!token) {
    return { error: { code: "UNAUTHORIZED", message: "Missing bearer token" } };
  }
  try {
    const user = await verifyAuthToken(token);
    return { user };
  } catch {
    return { error: { code: "UNAUTHORIZED", message: "Invalid token" } };
  }
}

// Strengthened env guard
function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
  if (!url || !service) throw new Error("Supabase environment not configured");
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

    const { user, error: authError } = await parseAuth(req);
    if (authError) return respond(401, { success: false, error: authError });

    const allowed =
      user.role === "admin" ||
      (await isOwner(supa, user.sub, id)) ||
      (await isDelegate(supa, user.email, id));

    if (!allowed) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    const { data, error } = await supa
      .from("attendees")
      .select("id, first_name, last_name, email, contact, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to load attendees" },
      });
    }

    return respond(200, { success: true, data: { attendees: data } });
  } catch (e) {
    console.error("Attendees GET error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    if (typeof rawBody !== "object" || rawBody === null) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body structure" },
      });
    }

    const body = rawBody as Record<string, unknown>;

    const first_name =
      typeof body.first_name === "string" ? body.first_name.trim() : "";
    const last_name =
      typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const contact =
      typeof body.contact === "string" ? body.contact.trim() : "";

    if (
      !first_name ||
      !last_name ||
      !email ||
      !contact ||
      first_name.length > 120 ||
      last_name.length > 120
    ) {
      return respond(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing or invalid fields",
        },
      });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid email" },
      });
    }
    if (contact.length < 3) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid contact" },
      });
    }

    const { data, error } = await supa
      .from("attendees")
      .insert([{ event_id: id, first_name, last_name, email, contact }])
      .select()
      .single();

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("already")
      ) {
        return respond(409, {
          success: false,
          error: { code: "CONFLICT", message: "Attendee already registered" },
        });
      }
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to register attendee" },
      });
    }

    return respond(201, { success: true, data: { attendee: data } });
  } catch (e) {
    console.error("Attendees POST error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
