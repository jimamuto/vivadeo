import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import * as authSchema from "@/lib/auth-schema";

// ---------------------------------------------------------------------------
// Email helper — uses Resend when configured, otherwise logs to console so
// verification/reset links still work in development without a real API key.
// ---------------------------------------------------------------------------
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Vivadeo <no-reply@example.com>";

  if (!apiKey || apiKey === "change-me-resend") {
    // Development fallback: print the email to the server console so the
    // developer can copy the verification / reset link.
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    console.log("\n[EMAIL] ─────────────────────────────────────────────────");
    console.log(`[EMAIL] To:      ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] ${text}`);
    console.log("[EMAIL] ─────────────────────────────────────────────────\n");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    console.error("[EMAIL] Resend error:", await res.text());
  }
}

type AuthHandlers = {
  GET: (request: Request) => Response | Promise<Response>;
  POST: (request: Request) => Response | Promise<Response>;
};

type AuthHandler = (request: Request) => Response | Promise<Response>;

const rawDatabaseUrl =
  process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl
  .replace(/^postgresql\+psycopg:\/\//, "postgres://")
  .replace(/^postgresql\+psycopg2:\/\//, "postgres://");
const authBaseUrl =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const authSecret = process.env.BETTER_AUTH_SECRET || "";

// Email verification is only enforced when a real email provider is configured.
// In development (placeholder key) users can sign in immediately after sign-up.
const resendKey = process.env.RESEND_API_KEY || "";
const emailVerificationEnabled =
  resendKey.length > 0 && resendKey !== "change-me-resend";

function createFallbackHandler(): AuthHandler {
  const missing = [
    !databaseUrl ? "AUTH_DATABASE_URL" : null,
    !authBaseUrl ? "BETTER_AUTH_URL" : null,
    !authSecret ? "BETTER_AUTH_SECRET" : null,
  ].filter(Boolean);
  const body = JSON.stringify({
    error: `Better Auth is not configured. Missing: ${missing.join(", ")}.`,
  });
  return async () => {
    return new Response(body, {
      status: 501,
      headers: { "content-type": "application/json" },
    });
  };
}

let authHandler: AuthHandler = createFallbackHandler();
export let auth: ReturnType<typeof betterAuth>;

if (databaseUrl && authBaseUrl && authSecret) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema: authSchema });
  auth = betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailVerificationEnabled,
      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string; name?: string };
        url: string;
      }) => {
        await sendEmail(
          user.email,
          "Reset your Vivadeo password",
          `<p>Hi ${user.name || user.email},</p>
           <p>Click the link below to reset your password. This link expires in 1 hour.</p>
           <p><a href="${url}">${url}</a></p>
           <p>If you did not request a password reset, you can safely ignore this email.</p>`,
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: { email: string; name?: string };
        url: string;
      }) => {
        await sendEmail(
          user.email,
          "Verify your Vivadeo email address",
          `<p>Hi ${user.name || user.email},</p>
           <p>Click the link below to verify your email address and activate your account:</p>
           <p><a href="${url}">${url}</a></p>
           <p>This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>`,
        );
      },
    },
    organization: {
      enabled: true,
    },
  } as never);

  authHandler = auth.handler as AuthHandler;
} else {
  auth = {
    api: {
      getSession: async () => null,
    },
  } as ReturnType<typeof betterAuth>;
}

const authHandlers: AuthHandlers = {
  GET: authHandler,
  POST: authHandler,
};

function createAuthEndpointRequest(
  request: Request,
  path: string,
  body?: Record<string, unknown>,
) {
  const url = new URL(`/api/auth${path}`, request.url);
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  // Better Auth requires Origin for CSRF protection on POST requests.
  // Forward it from the original request, or fall back to the base URL.
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  headers.set("origin", origin);
  headers.set("accept", "application/json");
  if (body) {
    headers.set("content-type", "application/json");
  }

  return new Request(url, {
    method: body ? "POST" : request.method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function postAuthEndpoint(
  request: Request,
  path: string,
  body: Record<string, unknown>,
) {
  return authHandlers.POST(createAuthEndpointRequest(request, path, body));
}

export { authHandlers, postAuthEndpoint };
