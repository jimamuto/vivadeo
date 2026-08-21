import { createFileRoute, Navigate } from "@tanstack/react-router";

function ClipStudioRedirect() {
  return <Navigate to="/search" replace />;
}

export const Route = createFileRoute("/dashboard/clip-studio")({ component: ClipStudioRedirect as any });
