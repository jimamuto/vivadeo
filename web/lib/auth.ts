import { randomInt, randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import * as authSchema from "@/lib/auth-schema";
import { getWorkspaceRoleOverrides } from "@/lib/workspace-role-overrides";
import { EmailClient, KnownEmailSendStatus } from "@azure/communication-email";

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  const senderAddress = process.env.EMAIL_FROM;
  if (!connectionString || !senderAddress) {
    throw new Error("Azure email is not configured");
  }

  const poller = await new EmailClient(connectionString).beginSend({
    senderAddress,
    content: { subject, html },
    recipients: { to: [{ address: to }] },
  });
  while (!poller.isDone()) await poller.poll();
  const result = poller.getResult();
  if (!result || result.status !== KnownEmailSendStatus.Succeeded) {
    throw new Error(`Azure email send failed: ${result?.error?.message || result?.status || "unknown status"}`);
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
const verificationCodeLifetimeMs = 10 * 60 * 1000;
const verificationCodeIdentifier = (email: string) => `email-verification:${email.toLowerCase()}`;

export async function sendVerificationCode(email: string): Promise<void> {
  if (!databaseUrl) throw new Error("Auth database is not configured");
  const normalizedEmail = email.trim().toLowerCase();
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + verificationCodeLifetimeMs);
  const identifier = verificationCodeIdentifier(normalizedEmail);
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql`DELETE FROM verification WHERE identifier = ${identifier}`;
    await sql`
      INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
      VALUES (${randomUUID()}, ${identifier}, ${code}, ${expiresAt}, NOW(), NOW())
    `;
    await sendEmail(
      normalizedEmail,
      "Your Vivadeo verification code",
      `<p>Your Vivadeo verification code is:</p>
       <p style="font-size: 28px; letter-spacing: 0.24em; font-weight: 700;">${code}</p>
       <p>This code expires in 10 minutes. If you did not create a Vivadeo account, you can ignore this email.</p>`,
    );
  } finally {
    await sql.end();
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  if (!databaseUrl) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = verificationCodeIdentifier(normalizedEmail);
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await sql<{ value: string; expires_at: Date }[]>`
      SELECT value, expires_at FROM verification
      WHERE identifier = ${identifier}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const record = rows[0];
    if (!record || record.value !== code.trim() || new Date(record.expires_at).getTime() < Date.now()) {
      return false;
    }
    const updated = await sql`
      UPDATE "user" SET email_verified = TRUE, updated_at = NOW()
      WHERE lower(email) = ${normalizedEmail}
    `;
    await sql`DELETE FROM verification WHERE identifier = ${identifier}`;
    return updated.count > 0;
  } finally {
    await sql.end();
  }
}

export const emailVerificationEnabled = Boolean(
  process.env.AZURE_COMMUNICATION_CONNECTION_STRING && process.env.EMAIL_FROM,
);

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
export let auth: ReturnType<typeof betterAuth> | any;

if (databaseUrl && authBaseUrl && authSecret) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema: authSchema });
  auth = betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    plugins: [organization()],
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
      }: {
        user: { email: string; name?: string };
        url: string;
      }) => {
        await sendVerificationCode(user.email);
      },
    },
    user: {
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async ({
          user,
          url,
        }: {
          user: { email: string; name?: string };
          url: string;
        }) => {
          await sendEmail(
            user.email,
            "Confirm your Vivadeo account deletion",
            `<p>Hi ${user.name || user.email},</p>
             <p>Click the link below to permanently delete your account:</p>
             <p><a href="${url}">${url}</a></p>
             <p>If you did not request account deletion, you can safely ignore this email.</p>`,
          );
        },
      },
    },
  } as never);

  authHandler = auth.handler as AuthHandler;
} else {
  auth = {
    api: {
      getSession: async () => null,
    },
  };
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
    method: body ? "POST" : "GET",
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

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  if (role === "member") return "editor";
  return "viewer";
}

async function getWorkspaceForEmail(email: string): Promise<string | null> {
  if (!databaseUrl) return null;
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await sql<{ organization_id: string }[]>`
      SELECT m.organization_id
      FROM member m
      JOIN "user" u ON u.id = m.user_id
      WHERE lower(u.email) = ${email.trim().toLowerCase()}
      ORDER BY m.created_at ASC
      LIMIT 1
    `;
    return rows[0]?.organization_id || null;
  } finally {
    await sql.end();
  }
}

async function getSessionEmail(request: Request): Promise<string | null> {
  const sessionResponse = await authHandlers.GET(
    createAuthEndpointRequest(request, "/get-session"),
  );
  if (!sessionResponse.ok) return null;
  const sessionPayload = (await sessionResponse.json()) as { user?: { email?: string | null } };
  return sessionPayload.user?.email?.trim().toLowerCase() || null;
}

async function getWorkspaceRoleForRequest(
  request: Request,
  organizationId: string,
): Promise<WorkspaceRole | null> {
  const email = await getSessionEmail(request);
  if (!email || !databaseUrl) return null;

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await sql<{ role: string | null }[]>`
      SELECT m.role
      FROM member m
      JOIN "user" u ON u.id = m.user_id
      WHERE m.organization_id = ${organizationId} AND lower(u.email) = ${email}
      LIMIT 1
    `;
    if (!rows[0]) return null;

    const overrides = await getWorkspaceRoleOverrides(organizationId);
    return overrides.workspaceRoles[email]
      || overrides.inviteRoles[email]
      || normalizeWorkspaceRole(rows[0].role);
  } finally {
    await sql.end();
  }
}

export { authHandlers, getSessionEmail, getWorkspaceRoleForRequest, getWorkspaceForEmail, normalizeWorkspaceRole, postAuthEndpoint };
