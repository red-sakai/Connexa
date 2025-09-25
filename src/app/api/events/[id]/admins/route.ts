import { NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/jwt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY!;
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
    const url = new URL(req.url);
    const me = url.searchParams.get("me");

    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    // Quick membership check for current user
    if (me) {
      const allowed = user.role === "admin" || (await isOwner(supa, user.sub, id)) || (await isDelegate(supa, user.email, id));
      return NextResponse.json({ allowed }, { status: 200 });
    }

    // Listing admins requires owner or global admin
    const allowed = user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supa
      .from("event_admins")
      .select("id, email, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: "Bad Request", details: String(e?.message || e) }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const allowed = user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email } = await req.json();
    if (typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("event_admins")
      .insert([{ event_id: id, email: email.toLowerCase() }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Bad Request", details: String(e?.message || e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supa = getServerSupabase();

    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const allowed = user.role === "admin" || (await isOwner(supa, user.sub, id));
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const { error } = await supa.from("event_admins").delete().eq("event_id", id).eq("email", email.toLowerCase());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: "Bad Request", details: String(e?.message || e) }, { status: 400 });
  }
}
