import { NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/jwt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Consistent response helper
function respond(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return "";
  return token || "";
}

// Centralized auth parse
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

function getServerSupabase(): SupabaseClient {
  if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL missing");
  }
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
  if (!service) throw new Error("Service key missing");
  return createClient(process.env.SUPABASE_URL, service);
}

async function isOwner(supa: SupabaseClient, userId: string, eventId: string) {
  const { data } = await supa.from("events").select("owner_id").eq("id", eventId).single();
  return data?.owner_id === userId;
}

async function isDelegate(supa: SupabaseClient, email: string, eventId: string) {
  const { data } = await supa.from("event_admins").select("id").eq("event_id", eventId).eq("email", email).maybeSingle();
  return Boolean(data?.id);
}

interface AdminAssignBody {
  email: string;
  role?: string; // placeholder for future use
}

// GET /events/:id/admins[?me=1]
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const { user, error: authError } = await parseAuth(req);
    if (authError) return respond(401, { success: false, error: authError });

    const url = new URL(req.url);
    const meCheck = url.searchParams.get("me");

    // Membership check path (?me=1)
    if (meCheck) {
      const allowed =
        user.role === "admin" ||
        (await isOwner(supa, user.sub, id)) ||
        (await isDelegate(supa, user.email, id));
      return respond(200, { success: true, data: { allowed } });
    }

    // Listing requires owner or platform admin
    const allowed =
      user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    const { data, error } = await supa
      .from("event_admins")
      .select("id, email, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to load admins" },
      });
    }
    return respond(200, { success: true, data: { admins: data } });
  } catch (e) {
    console.error("Admins GET error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

// POST /events/:id/admins  { email }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const { user, error: authError } = await parseAuth(req);
    if (authError) return respond(401, { success: false, error: authError });

    const allowed =
      user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

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
    const body = rawBody as Partial<AdminAssignBody>;

    if (!body.email || typeof body.email !== "string" || !/\S+@\S+\.\S+/.test(body.email)) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Valid email required" },
      });
    }

    const email = body.email.trim().toLowerCase();

    const { data, error } = await supa
      .from("event_admins")
      .insert([{ event_id: id, email }])
      .select()
      .single();

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const conflict =
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("already");
      if (conflict) {
        return respond(409, {
          success: false,
          error: { code: "CONFLICT", message: "Admin already assigned" },
        });
      }
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to assign admin" },
      });
    }

    return respond(201, { success: true, data: { admin: data } });
  } catch (e) {
    console.error("Admins POST error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

// DELETE /events/:id/admins?email=someone@example.com
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const { user, error: authError } = await parseAuth(req);
    if (authError) return respond(401, { success: false, error: authError });

    const allowed =
      user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Valid email query param required" },
      });
    }

    const { error } = await supa
      .from("event_admins")
      .delete()
      .eq("event_id", id)
      .eq("email", email.toLowerCase());

    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to remove admin" },
      });
    }

    return respond(200, { success: true, data: { removed: true } });
  } catch (e) {
    console.error("Admins DELETE error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
