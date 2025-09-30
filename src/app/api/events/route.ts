import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { verifyAuthToken } from "../../lib/jwt";

// Unified response helper
function respond(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const parts = auth.split(/\s+/);
  if (parts.length < 2) return "";
  if (parts[0].toLowerCase() !== "bearer") return "";
  return parts[1].trim();
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

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    if (typeof raw !== "object" || raw === null) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body structure" },
      });
    }
    const obj = raw as Record<string, unknown>;

    // ...existing validation logic...
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
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
      obj.description === null || typeof obj.description === "string"
        ? obj.description
        : undefined;
    if (typeof description === "string" && description.length > 5000) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Description too long" },
      });
    }
    const event_at =
      obj.event_at === null || typeof obj.event_at === "string"
        ? obj.event_at
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
      obj.location === null || typeof obj.location === "string"
        ? obj.location
        : undefined;
    const host_name =
      obj.host_name === null || typeof obj.host_name === "string"
        ? obj.host_name
        : undefined;
    const image_url =
      obj.image_url === null || typeof obj.image_url === "string"
        ? obj.image_url
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