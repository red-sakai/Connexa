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

// Build a Supabase client using service role on the server (falls back to anon if needed)
function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_API_KEY;
  if (!url) {
    throw new Error("SUPABASE_URL is not set");
  }
  if (!service && !anon) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_API_KEY is not set");
  }
  return createClient(url, service || (anon as string));
}

async function canAccess(supa: SupabaseClient, user: { sub: string; role: string }, eventId: string) {
  if (user.role === "admin") return true;
  const { data } = await supa.from("events").select("owner_id").eq("id", eventId).single();
  return data?.owner_id === user.sub;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    // AuthN + AuthZ
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    // Supabase service client (bypasses storage RLS)
    let supa: SupabaseClient;
    try {
      supa = getServerSupabase();
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Supabase config error" }, { status: 500 });
    }

    if (!(await canAccess(supa, user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json({ error: "Bad Request", details: String(e?.message || e) }, { status: 400 });
  }
}
