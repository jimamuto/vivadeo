import { HttpRequest, HttpResponse } from "~/lib/http-compat";
import { forwardAuthCookies } from "~/lib/auth-cookies";
import { postAuthEndpoint } from "~/lib/auth";

export async function GET(request: HttpRequest) {
  return HttpResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST(request: HttpRequest) {
  const authResponse = await postAuthEndpoint(request, "/sign-out", {});
  const response = HttpResponse.redirect(new URL("/", request.url));
  forwardAuthCookies(authResponse, response);
  // Clear legacy cookie name from an earlier config attempt.
  response.cookies.set("vivadeo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("vivadeo_workspace", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
