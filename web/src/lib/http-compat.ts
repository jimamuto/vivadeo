type Cookie = { name: string; value: string };

export type HttpRequest = Request & {
  nextUrl: URL;
  cookies: { get(name: string): Cookie | undefined };
};

export function asHttpRequest(request: Request): HttpRequest {
  const url = new URL(request.url);
  const values = new Map(
    (request.headers.get("cookie") || "").split(";").flatMap((part) => {
      const [name, ...rest] = part.trim().split("=");
      return name ? [[name, decodeURIComponent(rest.join("="))] as const] : [];
    }),
  );
  return Object.assign(request, {
    nextUrl: url,
    cookies: { get: (name: string) => values.has(name) ? { name, value: values.get(name)! } : undefined },
  });
}

export class HttpResponse extends Response {
  static json(data: unknown, init?: ResponseInit): HttpResponse {
    return new HttpResponse(JSON.stringify(data), {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
  }

  static redirect(url: string | URL, init?: number | ResponseInit): HttpResponse {
    const responseInit = typeof init === "number" ? { status: init } : init;
    return new HttpResponse(null, {
      status: responseInit?.status || 302,
      headers: { location: String(url), ...(responseInit?.headers || {}) },
    });
  }

  get cookies() {
    return {
      set: (name: string, value: string, options: Record<string, unknown> = {}) => {
        const parts = [`${name}=${encodeURIComponent(value)}`];
        if (options.path) parts.push(`Path=${options.path}`);
        if (options.httpOnly) parts.push("HttpOnly");
        if (options.secure) parts.push("Secure");
        if (options.sameSite) parts.push(`SameSite=${String(options.sameSite)}`);
        if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
        this.headers.append("set-cookie", parts.join("; "));
      },
    };
  }
}
