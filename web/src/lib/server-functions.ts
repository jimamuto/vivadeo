import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders, getCookie } from "@tanstack/start-server-core";
import { auth } from "~/lib/auth";
import { fetchDashboardData } from "~/components/dashboard-data";

export const getRequestSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  return session?.user
    ? { user: { name: session.user.name, email: session.user.email } }
    : null;
});

export const getDashboardData = createServerFn({ method: "GET" })
  .validator((workspace: string) => workspace)
  .handler(({ data: workspace }) => fetchDashboardData(workspace));

export const getActiveWorkspace = createServerFn({ method: "GET" }).handler(
  () => getCookie("vivadeo_workspace") || "default-workspace",
);
