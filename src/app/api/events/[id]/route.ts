import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { verifyAuthToken } from "../../../lib/jwt";

// Unified response helper
function respond(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

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
  try {
    const { id } = await ctx.params;
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error || !data) {
      return respond(404, {
        success: false,
        error: { code: "NOT_FOUND", message: "Event not found" },
      });
    }

    const { count, error: cntErr } = await supabase
      .from("attendees")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

    if (cntErr) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to count attendees" },
      });
    }

    return respond(200, {
      success: true,
      data: { event: { ...data, attendees_count: count ?? 0 } },
    });
  } catch (e) {
    console.error("Event GET error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const token = getBearer(req);
    if (!token) {
      return respond(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing bearer token" },
      });
    }
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, id))) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    const {
      title,
      description,
      event_at,
      host_name,
      location,
      image_url,
    } = body || {};

    const update: Record<string, unknown> = {};

    if (typeof title === "string" && title.trim()) update.title = title.trim();
    if (description !== undefined) {
      if (description === null || typeof description === "string") update.description = description;
      else
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "description must be string or null" },
        });
    }
    if (event_at) {
      const dt = new Date(event_at);
      if (isNaN(dt.getTime()))
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid event_at datetime" },
        });
      update.event_at = event_at;
    }
    if (host_name !== undefined) {
      if (host_name === null || typeof host_name === "string") update.host_name = host_name;
      else
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "host_name must be string or null" },
        });
    }
    if (location !== undefined) {
      if (location === null || typeof location === "string") update.location = location;
      else
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "location must be string or null" },
        });
    }
    if (image_url !== undefined) {
      if (image_url === null || typeof image_url === "string") update.image_url = image_url;
      else
        return respond(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "image_url must be string or null" },
        });
    }

    if (Object.keys(update).length === 0) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "No valid fields to update" },
      });
    }

    const { data, error } = await supabase
      .from("events")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to update event" },
      });
    }

    return respond(200, { success: true, data: { event: data } });
  } catch (e) {
    console.error("Event PUT error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = getBearer(req);
    if (!token) {
      return respond(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing bearer token" },
      });
    }
    const user = await verifyAuthToken(token);
    if (!(await canAccess(user, id))) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      return respond(500, {
        success: false,
        error: { code: "DB_ERROR", message: "Failed to delete event" },
      });
    }

    return respond(200, { success: true, data: { deleted: true } });
  } catch (e) {
    console.error("Event DELETE error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
