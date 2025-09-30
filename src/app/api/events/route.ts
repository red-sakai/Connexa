/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { verifyAuthToken } from "../../lib/jwt";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

export async function GET() {
  const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyAuthToken(token);

    const { title, description, event_at, host_name, location } = await req.json();
    if (!title || !event_at) {
      return NextResponse.json({ error: "title and event_at required" }, { status: 400 });
    }

    const insert: any = {
      title,
      description: description ?? null,
      event_at,
      owner_id: user.sub,
    };
    if (host_name !== undefined) insert.host_name = host_name;
    if (location !== undefined) insert.location = location;

    const { data, error } = await supabase.from("events").insert([insert]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}