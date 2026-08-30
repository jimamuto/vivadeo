"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavIcon = "chat" | "ingest" | "library" | "jobs" | "settings";

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    settings: "M9.4 3.8 10 2h4l.6 1.8 1.7.8 1.8-.6 2.8 2.8-.6 1.8.8 1.7L23 11v4l-1.9.7-.8 1.7.6 1.8-2.8 2.8-1.8-.6-1.7.8L14 23h-4l-.7-1.9-1.7-.8-1.8.6L3 18.1l.6-1.8-.8-1.7L1 15v-4l1.8-.6.8-1.7L3 6.9l2.8-2.8 1.8.6 1.8-.9ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  };
  return <svg className="dash-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavItem({ href, label, icon, activePaths = [] }: { href: string; label: string; icon: NavIcon; activePaths?: string[] }) {
  const pathname = usePathname();
  const active = [href, ...activePaths].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return (
    <Link className={`dash-nav-item${active ? " is-active" : ""}`} href={href as any} aria-label={label} data-tooltip={label}>
      <NavGlyph icon={icon} /><span>{label}</span>
    </Link>
  );
}

export function DashboardShell({
  workspace,
  profileInitial,
  profileName,
  profileImage,
  children,
}: Readonly<{
  workspace: string;
  profileInitial: string;
  profileName?: string;
  profileImage?: string | null;
  children: ReactNode;
}>) {
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
          {collapsed ? (
            <button className="dashboard-brand-collapsed-toggle" type="button" onClick={toggleSidebar} aria-label="Expand sidebar" data-tooltip="Expand sidebar">
              <span className="sidebar-expander collapsed-brand-expander" aria-hidden="true" />
            </button>
          ) : (
            <>
              <Link href="/" className="dashboard-brand-mark">
                <img className="dashboard-brand-logo" src="/vivadeoavatar.png" alt="Vivadeo" />
              </Link>
              <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label="Close sidebar" data-tooltip="Close sidebar">
                <span className="sidebar-expander" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <form className="dashboard-sidebar-search" action="/chat" method="get" role="search" data-tooltip="Search archive">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
          <input name="q" type="search" placeholder="Search" aria-label="Search videos" />
        </form>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <NavItem href="/chat" label="Chat" icon="chat" />
          <NavItem href="/dashboard/library" label="Library" icon="library" />
          <NavItem href="/dashboard/jobs" activePaths={["/jobs"]} label="Jobs" icon="jobs" />
          <div className="dashboard-nav-divider" aria-hidden="true" />
          <NavItem href="/settings" label="Settings" icon="settings" />
        </nav>
        <div className="dashboard-account">
          {accountMenuOpen ? (
            <div className="dashboard-account-menu">
              <Link href="/settings#help"><span>?</span> Help &amp; Feedback</Link>
              <form action="/api/auth/sign-out" method="post"><button type="submit"><span>↪</span> Log out</button></form>
            </div>
          ) : null}
          <button className="dashboard-account-trigger" type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen}>
            <span className="dashboard-account-avatar">{profileImage ? <img src={profileImage} alt="" /> : profileInitial}</span>
            <span className="dashboard-account-name">{profileName || profileInitial}</span>
            <strong aria-hidden="true">•••</strong>
          </button>
        </div>
      </aside>
      <div className="dashboard-frame">
        <main className="dashboard-stage">{children}</main>
      </div>
    </div>
  );
}
