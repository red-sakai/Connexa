import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { verifyAuthToken } from "../../lib/jwt";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  return token;
}

interface CreateEventBody {
  title: string;
  description?: string | null;
  event_at?: string | null;
  location?: string | null;
  host_name?: string | null;
  image_url?: string | null;
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

    const raw = (await req.json()) as Partial<CreateEventBody>;
    if (!raw.title) {
      return Response.json({ error: "title required" }, { status: 400 });
    }
    const body: CreateEventBody = {
      title: raw.title,
      description: raw.description ?? null,
      event_at: raw.event_at ?? null,
      location: raw.location ?? null,
      host_name: raw.host_name ?? null,
      image_url: raw.image_url ?? null,
    };

    const insert: Record<string, unknown> = {
      title: body.title,
      description: body.description ?? null,
      event_at: body.event_at ?? null,
      owner_id: user.sub,
      ...(body.host_name !== undefined && { host_name: body.host_name }),
      ...(body.location !== undefined && { location: body.location }),
    };

    const { data, error } = await supabase.from("events").insert([insert]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
}