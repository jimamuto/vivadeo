import type { NextResponse } from "next/server";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

function parseSetCookie(header: string): { name: string; value: string; options: CookieOptions } | null {
  const parts = header.split(";").map((part) => part.trim());
  const [nameValue, ...attrs] = parts;
  const eq = nameValue.indexOf("=");
  if (eq === -1) return null;

  const name = nameValue.slice(0, eq);
  const rawValue = nameValue.slice(eq + 1);
  let value = rawValue;
  try {
    value = decodeURIComponent(rawValue);
  } catch {
    value = rawValue;
  }
  const options: CookieOptions = { path: "/" };

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === "httponly") {
      options.httpOnly = true;
    } else if (lower === "secure") {
      options.secure = true;
    } else if (lower.startsWith("path=")) {
      options.path = attr.slice("path=".length);
    } else if (lower.startsWith("max-age=")) {
      options.maxAge = Number(attr.slice("max-age=".length));
    } else if (lower.startsWith("samesite=")) {
      const sameSite = attr.slice("samesite=".length).toLowerCase();
      if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
        options.sameSite = sameSite;
      }
    }
  }

  return { name, value, options };
}

/** Forward Better Auth Set-Cookie headers onto a Next.js route response. */
export function forwardAuthCookies(authResponse: Response, response: NextResponse): void {
  const rawCookies =
    typeof authResponse.headers.getSetCookie === "function"
      ? authResponse.headers.getSetCookie()
      : [];

  for (const header of rawCookies) {
    const parsed = parseSetCookie(header);
    if (!parsed) continue;
    response.cookies.set(parsed.name, parsed.value, parsed.options);
  }
}
