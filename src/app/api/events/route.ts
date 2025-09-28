import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { verifyAuthToken } from "../../lib/jwt";

// Unified response helper
function respond(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

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
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to fetch events" },
      });
    }

    // Backward compatibility:
    // Previously: { data: [...] }
    // Now also keeps success envelope while preserving original 'data' array shape.
    return respond(200, {
      success: true,
      // legacy shape (array)
      data,
      // new structured namespace
      events: data,
      meta: { count: data?.length ?? 0 },
    });
  } catch (e) {
    console.error("Events GET error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) {
      return respond(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing bearer token" },
      });
    }

    let user;
    try {
      user = await verifyAuthToken(token);
    } catch {
      return respond(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid token" },
      });
    }

    let raw: any;
    try {
      raw = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    // ...existing validation logic...
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Title is required" },
      });
    }
    if (title.length > 200) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Title too long" },
      });
    }
    const description =
      raw.description === null || typeof raw.description === "string"
        ? raw.description
        : undefined;
    if (typeof description === "string" && description.length > 5000) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Description too long" },
      });
    }
    const event_at =
      raw.event_at === null || typeof raw.event_at === "string"
        ? raw.event_at
        : undefined;
    if (event_at) {
      const dt = new Date(event_at);
      if (isNaN(dt.getTime())) {
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid event_at datetime" },
        });
      }
    }
    const location =
      raw.location === null || typeof raw.location === "string"
        ? raw.location
        : undefined;
    const host_name =
      raw.host_name === null || typeof raw.host_name === "string"
        ? raw.host_name
        : undefined;
    const image_url =
      raw.image_url === null || typeof raw.image_url === "string"
        ? raw.image_url
        : undefined;

    const insert: Record<string, unknown> = {
      title,
      description: description ?? null,
      event_at: event_at ?? null,
      owner_id: user.sub,
      host_name: host_name ?? null,
      location: location ?? null,
      image_url: image_url ?? null,
    };

    const { data, error } = await supabase
      .from("events")
      .insert([insert])
      .select()
      .single();

    if (error) {
      console.error("Events POST DB error:", error);
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to create event" },
      });
    }

    return respond(201, {
      success: true,
      // legacy shape (single event object)
      data,
      // structured new shape
      event: data,
    });
  } catch (e) {
    console.error("Events POST error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}