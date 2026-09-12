import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl
  .replace(/^postgresql\+psycopg:\/\//, "postgres://")
  .replace(/^postgresql\+psycopg2:\/\//, "postgres://");

async function getUserId(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id || null;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  if (!databaseUrl) return NextResponse.json({ detail: "Database is not configured" }, { status: 503 });
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await sql<{ city: string; timezone: string; date_format: string; theme: string }[]>`
      SELECT city, timezone, date_format, theme FROM user_preferences WHERE user_id = ${userId}
    `;
    return NextResponse.json(rows[0] || { city: "Nairobi", timezone: "Africa/Nairobi", date_format: "dd/MM/yyyy HH:mm", theme: "system" });
  } finally {
    await sql.end();
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  if (!databaseUrl) return NextResponse.json({ detail: "Database is not configured" }, { status: 503 });
  const body = await request.json() as { city?: string; timezone?: string; date_format?: string; theme?: string };
  const city = (body.city || "").trim().slice(0, 120);
  const timezone = (body.timezone || "UTC").trim().slice(0, 80);
  const dateFormat = (body.date_format || "dd/MM/yyyy HH:mm").trim().slice(0, 40);
  const theme = body.theme === "light" || body.theme === "dark" || body.theme === "system" ? body.theme : "system";
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql`
      INSERT INTO user_preferences (user_id, city, timezone, date_format, theme, created_at, updated_at)
      VALUES (${userId}, ${city}, ${timezone}, ${dateFormat}, ${theme}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        city = EXCLUDED.city,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        theme = EXCLUDED.theme,
        updated_at = NOW()
    `;
    const response = NextResponse.json({ city, timezone, date_format: dateFormat, theme });
    response.cookies.set("vivadeo_theme", theme, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } finally {
    await sql.end();
  }
}
