import { HttpRequest, HttpResponse } from "~/lib/http-compat";
import { authHandlers } from "~/lib/auth";

export async function GET(request: HttpRequest) {
  return HttpResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST(request: HttpRequest) {
  const authResponse = await authHandlers.POST(request.clone());
  if (authResponse.status !== 501) {
    return new HttpResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers
    });
  }
  return HttpResponse.redirect(new URL("/dashboard?invite=accepted", request.url));
}
