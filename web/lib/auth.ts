import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

type AuthHandlers = {
  GET: (request: Request) => Response | Promise<Response>;
  POST: (request: Request) => Response | Promise<Response>;
};

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl
  .replace(/^postgresql\+psycopg:\/\//, "postgres://")
  .replace(/^postgresql\+psycopg2:\/\//, "postgres://");
const authBaseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const authSecret = process.env.BETTER_AUTH_SECRET || "";

function createFallbackHandlers(): AuthHandlers {
  const missing = [
    !databaseUrl ? "AUTH_DATABASE_URL" : null,
    !authBaseUrl ? "BETTER_AUTH_URL" : null,
    !authSecret ? "BETTER_AUTH_SECRET" : null
  ].filter(Boolean);
  const body = JSON.stringify({
    error: `Better Auth is not configured. Missing: ${missing.join(", ")}.`
  });
  return {
    async GET() {
      return new Response(body, { status: 501, headers: { "content-type": "application/json" } });
    },
    async POST() {
      return new Response(body, { status: 501, headers: { "content-type": "application/json" } });
    }
  };
}

let authHandlers: AuthHandlers = createFallbackHandlers();

if (databaseUrl && authBaseUrl && authSecret) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);
  const auth = betterAuth({
    baseURL: authBaseUrl,
    secret: authSecret,
    database: drizzleAdapter(db, { provider: "pg" }),
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

  authHandlers = auth.handler as unknown as AuthHandlers;
}

export { authHandlers };
