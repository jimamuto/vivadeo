import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import * as authSchema from "@/lib/auth-schema";

type AuthHandlers = {
  GET: (request: Request) => Response | Promise<Response>;
  POST: (request: Request) => Response | Promise<Response>;
};

type AuthHandler = (request: Request) => Response | Promise<Response>;

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl
  .replace(/^postgresql\+psycopg:\/\//, "postgres://")
  .replace(/^postgresql\+psycopg2:\/\//, "postgres://");
const authBaseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const authSecret = process.env.BETTER_AUTH_SECRET || "";

function createFallbackHandler(): AuthHandler {
  const missing = [
    !databaseUrl ? "AUTH_DATABASE_URL" : null,
    !authBaseUrl ? "BETTER_AUTH_URL" : null,
    !authSecret ? "BETTER_AUTH_SECRET" : null
  ].filter(Boolean);
  const body = JSON.stringify({
    error: `Better Auth is not configured. Missing: ${missing.join(", ")}.`
  });
  return async () => {
    return new Response(body, { status: 501, headers: { "content-type": "application/json" } });
  };
}

let authHandler: AuthHandler = createFallbackHandler();

if (databaseUrl && authBaseUrl && authSecret) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema: authSchema });
  const auth = betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true
    },
    organization: {
      enabled: true
    },
    cookies: {
      sessionToken: {
        name: "vivadeo_session"
      }
    }
  } as never);

  authHandler = auth.handler as AuthHandler;
}

const authHandlers: AuthHandlers = {
  GET: authHandler,
  POST: authHandler
};

function createAuthEndpointRequest(request: Request, path: string, body?: Record<string, unknown>) {
  const url = new URL(`/api/auth${path}`, request.url);
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  headers.set("accept", "application/json");
  if (body) {
    headers.set("content-type", "application/json");
  }

  return new Request(url, {
    method: body ? "POST" : request.method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function postAuthEndpoint(request: Request, path: string, body: Record<string, unknown>) {
  return authHandlers.POST(createAuthEndpointRequest(request, path, body));
}

export { authHandlers, postAuthEndpoint };
