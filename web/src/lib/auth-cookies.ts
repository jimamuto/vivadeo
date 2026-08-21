type CookieOptions = {
  expires?: Date | string;
  maxAge?: number;
  domain?: string;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
  httpOnly?: boolean;
};

export function forwardAuthCookies(authResponse: Response, response: Response): void {
  const setCookies = authResponse.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
}
