import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { verifyAuthToken } from "../../../lib/jwt";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

async function canAccess(user: { sub: string; role: string }, eventId: string) {
  if (user.role === "admin") return true;
  const { data } = await supabase.from("events").select("owner_id").eq("id", eventId).single();
  return data?.owner_id === user.sub;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Count attendees for this event
  const { count, error: cntErr } = await supabase
    .from("attendees")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  const attendees_count = cntErr ? 0 : (count ?? 0);

  return NextResponse.json({ data: { ...data, attendees_count } }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, description, event_at, host_name, location, image_url } = body || {};
    const update: any = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (event_at) update.event_at = event_at;
    if (host_name !== undefined) update.host_name = host_name;
    if (location !== undefined) update.location = location;
    if (image_url !== undefined) update.image_url = image_url;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { data, error } = await supabase.from("events").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
