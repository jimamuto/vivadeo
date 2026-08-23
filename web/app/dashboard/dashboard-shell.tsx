"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";

type NavIcon = "chat" | "ingest" | "library" | "jobs" | "settings";

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7 M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6L7 7 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4",
  };
  return <svg className="dash-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavItem({ href, label, icon, activePaths = [] }: { href: string; label: string; icon: NavIcon; activePaths?: string[] }) {
  const pathname = usePathname();
  const active = [href, ...activePaths].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return (
    <Link className={`dash-nav-item${active ? " is-active" : ""}`} href={href as any} aria-label={label} title={label}>
      <NavGlyph icon={icon} /><span>{label}</span>
    </Link>
  );
}

export function DashboardShell({
  workspace,
  profileInitial,
  profileName,
  children,
}: Readonly<{
  workspace: string;
  profileInitial: string;
  profileName?: string;
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

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
          <Link href="/dashboard/ingest" className="dashboard-brand-mark">
            <span className="dashboard-brand-icon" aria-hidden="true">W</span>
            <strong>Vivadeo</strong>
          </Link>
          {!collapsed ? (
            <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label="Close sidebar">
              <span className="sidebar-expander" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <form className="dashboard-sidebar-search" action="/chat" method="get" role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
          <input name="q" type="search" placeholder="Search" aria-label="Search videos" />
        </form>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <NavItem href="/chat" label="Chat" icon="chat" />
          <NavItem href="/dashboard/ingest" label="Ingest" icon="ingest" />
          <NavItem href="/dashboard/library" label="Library" icon="library" />
          <NavItem href="/dashboard/jobs" activePaths={["/jobs"]} label="Jobs" icon="jobs" />
        </nav>
        <div className="dashboard-account">
          {accountMenuOpen ? (
            <div className="dashboard-account-menu">
              <Link href="/settings"><span>⚙</span> Settings</Link>
              <Link href="/settings#help"><span>?</span> Help &amp; Feedback</Link>
              <form action="/api/auth/sign-out" method="post"><button type="submit"><span>↪</span> Log out</button></form>
            </div>
          ) : null}
          <button className="dashboard-account-trigger" type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen}>
            <span className="dashboard-account-avatar">{profileInitial}</span>
            <span className="dashboard-account-name">{profileName || profileInitial}</span>
            <strong aria-hidden="true">•••</strong>
          </button>
        </div>
      </aside>
      <div className="dashboard-frame">
        <AppTopbar profileInitial={profileInitial} title={pathname === "/chat" ? "Chat" : "Workspace"} sidebarCollapsed={collapsed} onToggleSidebar={collapsed ? toggleSidebar : undefined} />
        <main className="dashboard-stage">{children}</main>
      </div>
    </div>
  );
}
