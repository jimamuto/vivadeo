"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`dash-nav-item${active ? " is-active" : ""}`} href={href as any}>
      {label}
    </Link>
  );
}

export function DashboardShell({
  workspace,
  profileInitial,
  children,
}: Readonly<{
  workspace: string;
  profileInitial: string;
  children: ReactNode;
}>) {
  return (
    <div className="shell page dashboard-wrap">
      <AppTopbar profileInitial={profileInitial} />
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar card">
          <div className="dashboard-sidebar-brand">
            <p className="muted">Workspace {workspace}</p>
          </div>
          <nav className="dashboard-nav">
            <NavItem href="/dashboard" label="Overview" />
            <NavItem href="/dashboard/ingest" label="Ingest" />
            <NavItem href="/dashboard/library" label="Library" />
            <NavItem href="/dashboard/jobs" label="Jobs" />
            <NavItem href="/dashboard/workspace" label="Workspace" />
          </nav>
          <div className="dashboard-sidebar-foot">
            <Link href="/" className="button-secondary">
              Landing
            </Link>
          </div>
        </aside>
        <div className="dashboard-stage">{children}</div>
      </div>
    </div>
  );
}
