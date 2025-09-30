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

// NEW: sanitize env (mirrors attendees route)
function sanitizeEnvValue(raw?: string) {
  if (!raw) return raw;
  return raw.trim().split(/\s+/)[0];
}

// Build a Supabase client using service role on the server (falls back to anon if needed)
function getServerSupabase(): SupabaseClient {
  const rawUrl = process.env.SUPABASE_URL;
  const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawAnon = process.env.SUPABASE_API_KEY;

  const url = sanitizeEnvValue(rawUrl);
  const service = sanitizeEnvValue(rawService);
  const anon = sanitizeEnvValue(rawAnon);

  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!service && !anon) throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_API_KEY is not set");

  if (/\bJWT_SECRET=/.test(String(rawService))) {
    console.warn(
      "[env warning] SUPABASE_SERVICE_ROLE_KEY appears to contain another assignment (e.g. 'JWT_SECRET='). " +
        "Fix your .env so each VAR=VALUE is on its own line."
    );
  }

  return createClient(url, service || (anon as string));
}

async function isOwner(supa: SupabaseClient, userId: string, eventId: string) {
  const { data } = await supa.from("events").select("owner_id").eq("id", eventId).single();
  return data?.owner_id === userId;
}

async function isDelegate(supa: SupabaseClient, email: string | undefined, eventId: string) {
  if (!email) return false;
  const { data } = await supa
    .from("event_admins")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", email)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    // AuthN
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    // Supabase client
    let supa: SupabaseClient;
    try {
      supa = getServerSupabase();
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Supabase config error" }, { status: 500 });
    }

    // Fetch event (to allow claiming ownership if unassigned)
    const { data: eventRow, error: eventErr } = await supa
      .from("events")
      .select("id, owner_id")
      .eq("id", id)
      .maybeSingle();

    if (eventErr) {
      return NextResponse.json(
        {
          error: "Failed to load event",
          details: eventErr.message,
          hint: /permission/i.test(eventErr.message)
            ? "Check that service role key is correct (env may be malformed)."
            : undefined,
        },
        { status: 500 }
      );
    }
    if (!eventRow) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If event has no owner yet, claim it (first authenticated actor becomes owner)
    if (!eventRow.owner_id) {
      await supa
        .from("events")
        .update({ owner_id: user.sub })
        .eq("id", id)
        .is("owner_id", null);
    }

    // Authorization after possible ownership claim
    const allowed =
      user.role === "admin" ||
      (await isOwner(supa, user.sub, id)) ||
      (await isDelegate(supa, (user as any).email, id));

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Forbidden",
          reason: "You are not the event creator (or newly claimed owner), admin, or delegate.",
        },
        { status: 403 }
      );
    }

    // Read multipart form
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = (file.name?.split(".").pop() || "").toLowerCase() || "jpg";
    const path = `event-images/${id}/${Date.now()}.${ext}`;

    // Upload using ArrayBuffer (works on Node runtime)
    const arrayBuf = await file.arrayBuffer();
    const { error } = await supa.storage
      .from("event-images")
      .upload(path, arrayBuf, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = supa.storage.from("event-images").getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 });

    return NextResponse.json({ url }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Bad Request",
        details: String(e?.message || e),
        hint: /SUPABASE_URL|SERVICE_ROLE_KEY/i.test(String(e?.message || e))
          ? "Verify .env formatting (each VAR=VALUE on its own line)."
          : undefined,
      },
      { status: 400 }
    );
  }
}
