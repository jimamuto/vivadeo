import { HttpRequest, HttpResponse } from "~/lib/http-compat";
import { postAuthEndpoint } from "~/lib/auth";

export async function GET(request: HttpRequest) {
  return HttpResponse.redirect(new URL("/forgot-password", request.url));
}

export async function POST(request: HttpRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/request-password-reset", {
    email: String(form.get("email") || ""),
    redirectTo: new URL("/reset-password", request.url).toString()
  });
  if (authResponse.ok) {
    return HttpResponse.redirect(new URL("/sign-in?reset=sent", request.url));
  }
  return new HttpResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers
  });
}
