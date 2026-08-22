"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";

type NavIcon = "chat" | "ingest" | "library" | "jobs" | "workspace" | "settings";

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    workspace: "M4 7h16v13H4z M8 7V4h8v3 M8 12h8 M8 16h5",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7 M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6L7 7 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4",
  };
  return <svg className="dash-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: NavIcon }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`dash-nav-item${active ? " is-active" : ""}`} href={href as any} aria-label={label} title={label}>
      <NavGlyph icon={icon} /><span>{label}</span>
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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("vivadeo.sidebar-collapsed") === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("vivadeo.sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className={`shell page dashboard-wrap${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <Link href="/dashboard/ingest" className="dashboard-brand-mark"><span>V</span><strong>Vivadeo</strong></Link>
          <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Open sidebar" : "Close sidebar"}>
            <span className="sidebar-expander" aria-hidden="true" />
          </button>
        </div>
        <p className="sidebar-workspace">{workspace}</p>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <NavItem href="/chat" label="Chat" icon="chat" />
          <NavItem href="/dashboard/ingest" label="Ingest" icon="ingest" />
          <NavItem href="/dashboard/library" label="Library" icon="library" />
          <NavItem href="/dashboard/jobs" label="Jobs" icon="jobs" />
          <NavItem href="/dashboard/workspace" label="Workspace" icon="workspace" />
        </nav>
        <nav className="dashboard-nav dashboard-nav-secondary" aria-label="Account navigation">
          <NavItem href="/settings" label="Settings" icon="settings" />
        </nav>
      </aside>
      <div className="dashboard-frame">
        <AppTopbar profileInitial={profileInitial} title={pathname === "/chat" ? "Chat" : "Workspace"} />
        <main className="dashboard-stage">{children}</main>
      </div>
    </div>
  );
}
