import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.replace(/^postgresql\+psycopg:\/\//, "postgres://").replace(/^postgresql\+psycopg2:\/\//, "postgres://");

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const body = await request.json() as { email?: boolean; browser?: boolean };
  const email = body.email !== false;
  const browser = body.browser === true;
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql`
      INSERT INTO user_preferences (user_id, city, timezone, date_format, theme, ingest_email_notifications, ingest_browser_notifications, created_at, updated_at)
      VALUES (${userId}, '', 'UTC', 'dd/MM/yyyy HH:mm', 'system', ${email}, ${browser}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET ingest_email_notifications = EXCLUDED.ingest_email_notifications, ingest_browser_notifications = EXCLUDED.ingest_browser_notifications, updated_at = NOW()
    `;
    return NextResponse.json({ ingest_email_notifications: email, ingest_browser_notifications: browser });
  } finally { await sql.end(); }
}
