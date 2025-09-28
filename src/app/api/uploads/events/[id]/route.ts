import { NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/jwt";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Consistent response helper
function respond(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

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
    throw new Error("ENV_MISSING:SUPABASE_URL");
  }
  if (!service && !anon) {
    throw new Error("ENV_MISSING:SUPABASE_SERVICE_ROLE_KEY");
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

    // Auth
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

    // Supabase client
    let supa: SupabaseClient;
    try {
      supa = getServerSupabase();
    } catch (e: unknown) {
      const rawMsg = e instanceof Error ? e.message : "";
      const msg = String(rawMsg || "");
      if (msg.startsWith("ENV_MISSING")) {
        return respond(500, {
          success: false,
          error: {
            code: "ENV_MISSING",
            message: msg.replace("ENV_MISSING:", "") + " is not set",
          },
        });
      }
      return respond(500, {
        success: false,
        error: { code: "SERVER_ERROR", message: "Supabase configuration error" },
      });
    }

    if (!(await canAccess(supa, user, id))) {
      return respond(403, {
        success: false,
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }

    // Multipart form parsing
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid multipart form data" },
      });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File field 'file' is required" },
      });
    }

    // Validation constraints
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size === 0) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File is empty" },
      });
    }
    if (file.size > maxBytes) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File exceeds 5MB limit" },
      });
    }
    const contentType = file.type || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Only image uploads allowed" },
      });
    }

    const ext = (file.name?.split(".").pop() || "").toLowerCase() || "jpg";
    const path = `event-images/${id}/${Date.now()}.${ext}`;

    // Upload
    const arrayBuf = await file.arrayBuffer();
    const { error: uploadError } = await supa.storage
      .from("event-images")
      .upload(path, arrayBuf, {
        cacheControl: "3600",
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return respond(500, {
        success: false,
        error: { code: "STORAGE_ERROR", message: "Failed to upload file" },
      });
    }

    const { data } = supa.storage.from("event-images").getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) {
      return respond(500, {
        success: false,
        error: { code: "STORAGE_ERROR", message: "Failed to obtain public URL" },
      });
    }

    return respond(201, {
      success: true,
      data: { url, path },
    });
  } catch (e) {
    console.error("Event image upload error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
