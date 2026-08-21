import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SearchContent } from "./search-content";

export default async function SearchPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <Suspense fallback={null}>
      <SearchContent profileInitial={profileInitial} />
    </Suspense>
  );
}
