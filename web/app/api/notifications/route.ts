import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.replace(/^postgresql\+psycopg:\/\//, "postgres://").replace(/^postgresql\+psycopg2:\/\//, "postgres://");

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const workspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const notifications = await sql`
      SELECT id, job_id, video_id, kind, title, message, read_at, created_at
      FROM user_notifications
      WHERE user_id = ${userId} AND organization_id = ${workspace}
      ORDER BY created_at DESC LIMIT 30
    `;
    const preferences = await sql`
      SELECT ingest_email_notifications, ingest_browser_notifications
      FROM user_preferences WHERE user_id = ${userId}
    `;
    return NextResponse.json({ notifications, preferences: preferences[0] || { ingest_email_notifications: true, ingest_browser_notifications: false } });
  } finally { await sql.end(); }
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const body = await request.json() as { id?: string; mark_all_read?: boolean };
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    if (body.mark_all_read) await sql`UPDATE user_notifications SET read_at = COALESCE(read_at, NOW()) WHERE user_id = ${userId}`;
    else if (body.id) await sql`UPDATE user_notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ${body.id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } finally { await sql.end(); }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const workspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const body = await request.json().catch(() => ({})) as { id?: string; clear_read?: boolean };
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    if (body.clear_read) {
      await sql`DELETE FROM user_notifications WHERE user_id = ${userId} AND organization_id = ${workspace} AND read_at IS NOT NULL`;
    } else if (body.id) {
      await sql`DELETE FROM user_notifications WHERE id = ${body.id} AND user_id = ${userId} AND organization_id = ${workspace} AND read_at IS NOT NULL`;
    }
    return NextResponse.json({ ok: true });
  } finally { await sql.end(); }
}
