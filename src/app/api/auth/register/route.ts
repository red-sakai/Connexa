import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { signAuthToken } from "../../../lib/jwt";

// Standard response helper (mirrors login route style)
function respond(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

interface RegisterBody {
  email: string;
  password: string;
  name?: string | null;
  role?: string | null;
}

export async function POST(req: Request) {
  try {
    // Environment validation
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

    // Parse body
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      });
    }

    const rawEmail =
      typeof requestBody.email === "string"
        ? requestBody.email.trim().toLowerCase()
        : "";
    const password = requestBody.password;
    const name =
      typeof requestBody.name === "string" ? requestBody.name.trim() : null;
    let role =
      typeof requestBody.role === "string"
        ? requestBody.role.trim().toLowerCase()
        : "user";

    // Optional: constrain roles
    const allowedRoles = new Set(["user", "admin"]);
    if (!allowedRoles.has(role)) role = "user";

    // Validation
    if (!/\S+@\S+\.\S+/.test(rawEmail) || typeof password !== "string") {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid email or password" },
      });
    }
    if (password.length < 8) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" },
      });
    }
    if (name && name.length > 120) {
      return respond(400, {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name too long" },
      });
    }

    // RPC call
    const { data: rpcData, error } = await supabase.rpc("register_user", {
      p_email: rawEmail,
      p_password: password,
      p_role: role,
    });

    if (error) {
      console.error("register_user RPC error:", error);
      const msg = (error.message || "").toLowerCase();

      // Conflict (duplicate)
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return respond(409, {
          success: false,
            error: { code: "CONFLICT", message: "Email already registered" },
        });
      }

      const internalIndicators = ["ambiguous", "crypt", "gen_salt", "permission", "syntax"];
      const isInternal = internalIndicators.some(k => msg.includes(k));

      if (isInternal) {
        return respond(500, {
          success: false,
          error: {
            code: "RPC_ERROR",
            message: "Registration service error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          },
        });
      }

      return respond(400, {
        success: false,
        error: { code: "REGISTRATION_FAILED", message: "Registration failed" },
      });
    }

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!row?.user_id || !row?.email || !row?.role) {
      console.error("register_user RPC returned unexpected payload:", rpcData);
      return respond(500, {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unexpected registration response" },
      });
    }

    // Token
    const token = await signAuthToken({
      sub: row.user_id,
      email: row.email,
      role: row.role,
    });

    return respond(201, {
      success: true,
      data: {
        user: { id: row.user_id, email: row.email, role: row.role },
        token,
      },
    });
  } catch (err: unknown) {
    console.error("Register route error:", err);
    return respond(500, {
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
