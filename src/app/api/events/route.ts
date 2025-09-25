import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { verifyAuthToken } from "../../lib/jwt";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

export async function GET(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const query =
      user.role === "admin"
        ? supabase.from("events").select("*").order("created_at", { ascending: false })
        : supabase.from("events").select("*").eq("owner_id", user.sub).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const body = await req.json();
    const { title, description, event_at } = body || {};
    if (!title || !event_at) {
      return NextResponse.json({ error: "title and event_at required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("events")
      .insert([{ title, description: description ?? null, event_at, owner_id: user.sub }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
