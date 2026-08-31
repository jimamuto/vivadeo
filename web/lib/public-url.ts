export function publicAppUrl(request: Request, path: string): URL {
  return new URL(
    path,
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.url,
  );
}
