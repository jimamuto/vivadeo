import { createFileRoute } from "@tanstack/react-router";
import { getRequestSession } from "~/lib/server-functions";
import { Suspense } from "react";
import { SearchContent } from "~/components/search-content";

function SearchPage() {
  const session = Route.useLoaderData();
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <Suspense fallback={null}>
      <SearchContent profileInitial={profileInitial} />
    </Suspense>
  );
}

export const Route = createFileRoute("/search")({ loader: () => getRequestSession(), component: SearchPage as any });
