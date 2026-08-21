import { HttpRequest, HttpResponse } from "~/lib/http-compat";

export async function POST(request: HttpRequest) {
  const form = await request.formData();
  const workspace = String(form.get("workspace") || "default-workspace");
  const response = HttpResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("vivadeo_workspace", workspace, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
