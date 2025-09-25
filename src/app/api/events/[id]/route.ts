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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("events").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, params.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, description, event_at } = body || {};
    const update: any = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (event_at) update.event_at = event_at;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { data, error } = await supabase.from("events").update(update).eq("id", params.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, params.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("events").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
