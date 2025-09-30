import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { signAuthToken } from "../../../lib/jwt";

// Standard response helper
function respond(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: Request) {
  try {
    // Optional basic content-type check
    const ctype = req.headers.get("content-type") || "";
    if (!ctype.toLowerCase().includes("application/json")) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Content-Type must be application/json" },
      });
    }

    // Env validation
    if (!process.env.SUPABASE_URL) {
      return respond(500, {
        success: false,
        error: { code: "ENV_MISSING", message: "SUPABASE_URL is not set" },
      });
    }
    if (!process.env.SUPABASE_API_KEY) {
      return respond(500, {
        success: false,
        error: { code: "ENV_MISSING", message: "SUPABASE_API_KEY is not set" },
      });
    }

    // Input validation
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    if (typeof body !== "object" || body === null) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body structure" },
      });
    }

    const bodyObj = body as Record<string, unknown>;
    const rawEmail = bodyObj.email;
    const rawPassword = bodyObj.password;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!/\S+@\S+\.\S+/.test(email) || password.length < 8) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid email or password format" },
      });
    }

    // Auth attempt
    const { data, error } = await supabase.rpc("verify_login", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error("verify_login RPC error:", error);
      const msg = (error.message || "").toLowerCase();

      const isInternal =
        msg.includes("ambiguous") ||
        msg.includes("crypt") ||
        msg.includes("gen_salt") ||
        msg.includes("syntax") ||
        msg.includes("permission");

      if (isInternal) {
        return respond(500, {
          success: false,
          error: {
            code: "RPC_ERROR",
            message: "Authentication service error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          },
        });
      }

      return respond(401, {
        success: false,
        error: { code: "AUTH_FAILED", message: "Invalid credentials" },
      });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_id) {
      return respond(401, {
        success: false,
        error: { code: "AUTH_FAILED", message: "Invalid credentials" },
      });
    }

    const token = await signAuthToken({
      sub: row.user_id,
      email: row.email,
      role: row.role,
    });

    const resp = NextResponse.json({
      success: true,
      data: {
        user: { id: row.user_id, email: row.email, role: row.role },
        token,
      },
    }, { status: 200 });

    resp.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    return resp;
  } catch (e) {
    console.error("Login route error:", e);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
