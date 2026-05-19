import { NextRequest, NextResponse } from "next/server";

const windowMs = 60_000;
const maxRequests = 120;
const buckets = new Map<string, { start: number; count: number }>();

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth") || pathname.startsWith("/api/proxy");
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(ip, { start: now, count: 1 });
    return NextResponse.next();
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
