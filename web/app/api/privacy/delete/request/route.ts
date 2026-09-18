import { NextResponse } from "next/server";
import { auth, sendDeletionCode } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ detail: "Authentication is required." }, { status: 401 });
  }

  try {
    await sendDeletionCode(session.user.id, session.user.email);
    return NextResponse.json({ message: "A deletion code was sent to your email." });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Could not send deletion code." }, { status: 503 });
  }
}
