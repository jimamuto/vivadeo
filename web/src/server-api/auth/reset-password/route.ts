import { HttpRequest, HttpResponse } from "~/lib/http-compat";
import { postAuthEndpoint } from "~/lib/auth";

export async function GET(request: HttpRequest) {
  return HttpResponse.redirect(new URL("/reset-password", request.url));
}

export async function POST(request: HttpRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/reset-password", {
    token: String(form.get("token") || ""),
    newPassword: String(form.get("password") || ""),
  });
  if (authResponse.ok) {
    return HttpResponse.redirect(new URL("/sign-in?reset=done", request.url));
  }
  let errorCode = "UNKNOWN";
  try {
    const body = await authResponse.json();
    errorCode = body.code || body.message || "UNKNOWN";
  } catch {
    /* ignore */
  }
  return HttpResponse.redirect(
    new URL(
      `/reset-password?error=${encodeURIComponent(errorCode)}`,
      request.url,
    ),
  );
}
