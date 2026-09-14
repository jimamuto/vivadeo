"use client";

import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getSettingsSectionLabel } from "@/app/settings/settings-sections";

type NavIcon = "chat" | "search" | "ingest" | "library" | "jobs" | "review";
type PaletteIcon = NavIcon | "workspace" | "settings" | "shield" | "profile";
type PaletteCommand = { label: string; description: string; href: string; group: string; icon: PaletteIcon; keywords: string };
type UserNotification = { id: string; job_id: string; video_id: string | null; kind: string; title: string; message: string; read_at: string | null; created_at: string };

const PALETTE_COMMANDS: PaletteCommand[] = [
  { label: "Review evidence", description: "Confirm the moments behind a result", href: "/dashboard/review", group: "Quick actions", icon: "review", keywords: "review verify evidence moments citations" },
  { label: "Ask Vivadeo", description: "Start searching your video archive", href: "/chat", group: "Quick actions", icon: "search", keywords: "search ask answer new chat footage" },
  { label: "Add video", description: "Upload a file or import a video URL", href: "/dashboard/ingest", group: "Quick actions", icon: "ingest", keywords: "upload import ingest source url" },
  { label: "Library", description: "Browse and manage workspace videos", href: "/dashboard/library", group: "Workspace", icon: "library", keywords: "videos sources archive collections" },
  { label: "Workspace", description: "Manage members and workspace access", href: "/dashboard/workspace", group: "Workspace", icon: "workspace", keywords: "organization team members roles invites" },
  { label: "Profile settings", description: "Update your profile and preferences", href: "/settings/account", group: "Settings", icon: "profile", keywords: "account name avatar timezone preferences" },
  { label: "Security", description: "Manage your password", href: "/settings/security", group: "Settings", icon: "shield", keywords: "password login security" },
  { label: "Data and privacy", description: "Review privacy and account controls", href: "/settings/privacy", group: "Settings", icon: "shield", keywords: "privacy data delete account" },
  { label: "Answer service", description: "Configure how Vivadeo answers questions", href: "/settings/ai-providers", group: "Settings", icon: "settings", keywords: "answer service provider model settings" },
];

function PaletteGlyph({ icon }: { icon: PaletteIcon }) {
  const paths: Record<PaletteIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16 16l4 4",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    workspace: "M4 19v-8l8-6 8 6v8 M8 19v-5h8v5",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6 7 7 M17 17l1.4 1.4 M18.4 5.6 17 7 M7 17l-1.4 1.4",
    shield: "M12 3l7 3v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6z M9 12l2 2 4-4",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21c.8-4 3.1-6 7-6s6.2 2 7 6",
    review: "M4 5h16v14H4z M7 9h3 M7 13h6 M14 9h3 M16 13h1",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16 16l4 4",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    review: "M4 5h16v14H4z M7 9h3 M7 13h6 M14 9h3 M16 13h1",
  };
  return <svg className="dash-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavItem({ href, label, icon, activePaths = [], showActive = true }: { href: string; label: string; icon: NavIcon; activePaths?: string[]; showActive?: boolean }) {
  const pathname = usePathname();
  const active = showActive && [href, ...activePaths].some((path) => pathname === path || pathname.startsWith(`${path}/`));
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
  sidebarContent,
  breadcrumbDetail,
  breadcrumbActions,
  onStartNewChat,
  children,
}: Readonly<{
  workspace: string;
  profileInitial: string;
  profileName?: string;
  profileImage?: string | null;
  sidebarContent?: ReactNode;
  breadcrumbDetail?: ReactNode;
  breadcrumbActions?: ReactNode;
  onStartNewChat?: () => void;
  children: ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeCommand, setActiveCommand] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const paletteRef = useRef<HTMLDialogElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isSettingsPage = pathname.startsWith("/settings");
  const settingsSection = pathname.startsWith("/settings/") ? pathname.split("/")[2] : "";
  const settingsSectionLabel = getSettingsSectionLabel(settingsSection);
  const pageLabel = pathname.startsWith("/dashboard/library")
    ? "Library"
    : pathname.startsWith("/dashboard/jobs")
      ? "History"
      : pathname.startsWith("/dashboard/ingest")
      ? "Ingest"
        : pathname.startsWith("/search")
          ? "Search"
          : pathname.startsWith("/dashboard/review")
            ? "Review"
            : pathname.startsWith("/dashboard/output")
              ? "Output"
        : isSettingsPage
          ? "Settings"
          : pathname.startsWith("/jobs")
            ? "Job progress"
            : "Chat";

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("vivadeo.sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      setPaletteOpen(true);
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  useEffect(() => {
    const dialog = paletteRef.current;
    if (!dialog) return;
    if (paletteOpen && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => paletteInputRef.current?.focus());
    } else if (!paletteOpen && dialog.open) {
      dialog.close();
    }
  }, [paletteOpen]);

  useEffect(() => setActiveCommand(0), [paletteQuery]);

  useEffect(() => {
    let active = true;
    const shown = new Set<string>();
    async function refreshNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok || !active) return;
        const payload = await response.json() as { notifications: UserNotification[]; preferences: { ingest_browser_notifications?: boolean } };
        setNotifications(payload.notifications);
        if (payload.preferences?.ingest_browser_notifications && "Notification" in window && Notification.permission === "granted") {
          payload.notifications.filter((item) => !item.read_at && !shown.has(item.id)).forEach((item) => { shown.add(item.id); new Notification(item.title, { body: item.message, tag: item.id }); });
        }
      } catch { return; }
    }
    void refreshNotifications();
    const timer = window.setInterval(() => void refreshNotifications(), 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function markNotificationsRead() {
    setNotificationsOpen((current) => !current);
    if (!notificationsOpen && notifications.some((item) => !item.read_at)) {
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all_read: true }) });
    }
  }

  useEffect(() => {
    function closeOpenMenus(event: PointerEvent) {
      const menu = accountMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
      const notificationsMenu = notificationsRef.current;
      if (notificationsOpen && event.target instanceof Node && !notificationsMenu?.contains(event.target)) setNotificationsOpen(false);
    }

    function closeOpenMenusWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && accountMenuRef.current?.open) {
        accountMenuRef.current.open = false;
        accountMenuRef.current.querySelector<HTMLElement>("summary")?.focus();
      }
      if (event.key === "Escape" && notificationsOpen) {
        setNotificationsOpen(false);
        notificationsRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOpenMenus);
    document.addEventListener("keydown", closeOpenMenusWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeOpenMenus);
      document.removeEventListener("keydown", closeOpenMenusWithKeyboard);
    };
  }, [notificationsOpen]);

  function closePalette() {
    setPaletteOpen(false);
    setPaletteQuery("");
  }

  function runCommand(command: PaletteCommand) {
    closePalette();
    router.push(command.href as any);
  }

  const query = paletteQuery.trim().toLowerCase();
  const matchingCommands = PALETTE_COMMANDS.filter((command) =>
    `${command.label} ${command.description} ${command.keywords}`.toLowerCase().includes(query),
  );
  const paletteCommands = query
    ? [
        ...matchingCommands,
        { label: `Search archive for “${paletteQuery.trim()}”`, description: "Ask Vivadeo across your workspace videos", href: `/chat?q=${encodeURIComponent(paletteQuery.trim())}`, group: "Search", icon: "search" as PaletteIcon, keywords: "" },
      ]
    : PALETTE_COMMANDS;
  const commandGroups = paletteCommands.reduce<Array<{ label: string; commands: PaletteCommand[] }>>((groups, command) => {
    const group = groups.find((item) => item.label === command.group);
    if (group) group.commands.push(command);
    else groups.push({ label: command.group, commands: [command] });
    return groups;
  }, []);

  function handlePaletteKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveCommand((current) => (current + direction + paletteCommands.length) % paletteCommands.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = paletteCommands[activeCommand];
      if (command) runCommand(command);
    }
  }

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("vivadeo.sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className={`shell page dashboard-wrap${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside id="dashboard-sidebar" className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <Link href="/" className="dashboard-brand-mark" aria-label="Go to home" data-tooltip="Go to home">
            {collapsed
              ? <img className="dashboard-brand-collapsed-icon" src="/vivadeo-mark.png" alt="Vivadeo" />
              : <BrandLogo className="dashboard-brand-logo" />}
          </Link>
          {!collapsed ? <button className="dashboard-sidebar-close" type="button" onClick={toggleSidebar} aria-label="Close sidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button> : null}
        </div>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <span className="dashboard-nav-label">Workflow</span>
          <NavItem href="/dashboard/ingest" label="Add video" icon="ingest" />
          <NavItem href="/search" label="Search" icon="search" activePaths={["/chat"]} />
          <NavItem href="/dashboard/review" label="Review" icon="review" />
          <NavItem href="/dashboard/library" label="Library" icon="library" />
        </nav>
        {sidebarContent ? <div className="dashboard-sidebar-content">{sidebarContent}</div> : null}
      </aside>
      {!collapsed ? <button className="dashboard-sidebar-backdrop" type="button" onClick={toggleSidebar} aria-label="Close sidebar" /> : null}
      <div className="dashboard-frame">
        <header className="dashboard-command-bar">
          <div className="dashboard-command-leading">
            <button
              className="dashboard-command-sidebar-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-controls="dashboard-sidebar"
              aria-expanded={!collapsed}
              data-tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="sidebar-expander" aria-hidden="true" />
            </button>
            <span className="dashboard-command-divider" aria-hidden="true" />
            <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
              <Link href="/chat">Workspace</Link>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              {settingsSectionLabel ? (
                <>
                  <Link href="/settings/account">Settings</Link>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                  <span aria-current="page">{settingsSectionLabel}</span>
                </>
              ) : (
                <>
                  <span aria-current={breadcrumbDetail ? undefined : "page"}>{pageLabel}</span>
                  {breadcrumbDetail ? (
                    <>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                      <span className="dashboard-breadcrumb-detail" aria-current="page">{breadcrumbDetail}</span>
                      {breadcrumbActions ? <span className="dashboard-breadcrumb-actions">{breadcrumbActions}</span> : null}
                    </>
                  ) : null}
                </>
              )}
            </nav>
          </div>
          <nav aria-label="Workspace actions">
            <button className="dashboard-command-search" type="button" onClick={() => setPaletteOpen(true)} aria-label="Search workspace" aria-haspopup="dialog" aria-controls="command-palette" aria-expanded={paletteOpen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
              <span>Search anything...</span>
              <kbd aria-label="Command or Control plus K">⌘ K</kbd>
            </button>
            <div ref={notificationsRef} className="dashboard-notifications">
            <button type="button" className="dashboard-notification-trigger" aria-label="View notifications" aria-expanded={notificationsOpen} onClick={() => void markNotificationsRead()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {notifications.some((item) => !item.read_at) ? <span aria-label={`${notifications.filter((item) => !item.read_at).length} unread notifications`}>{Math.min(9, notifications.filter((item) => !item.read_at).length)}</span> : null}
            </button>
            {notificationsOpen ? <div className="dashboard-notification-panel"><header><strong>Notifications</strong><Link href="/settings/notifications">Settings</Link></header>{notifications.length ? <div>{notifications.slice(0, 8).map((item) => <Link key={item.id} href={item.job_id ? `/dashboard/ingest` : "/dashboard/ingest"}><strong>{item.title}</strong><span>{item.message}</span><time>{new Date(item.created_at).toLocaleString()}</time></Link>)}</div> : <p>No notifications yet.</p>}</div> : null}
            </div>
            <details ref={accountMenuRef} className="dashboard-command-account">
              <summary className="dashboard-command-profile" aria-label="Open account menu">
                <span>{profileImage ? <img src={profileImage} alt="" /> : profileInitial}</span>
                <strong>{profileName || profileInitial}</strong>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
              </summary>
              <div className="dashboard-command-menu">
                <Link href="/settings/account">Settings</Link>
                <Link href="/settings/account#help">Help &amp; Feedback</Link>
                <form action="/api/auth/sign-out" method="post"><button type="submit">Log out</button></form>
              </div>
            </details>
          </nav>
        </header>
        <main className="dashboard-stage">{children}</main>
      </div>

      <dialog
        ref={paletteRef}
        id="command-palette"
        className="command-palette"
        aria-label="Search Vivadeo"
        onClose={closePalette}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePalette();
        }}
      >
        <div className="command-palette-panel">
          <header className="command-palette-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
            <input
              ref={paletteInputRef}
              type="search"
              value={paletteQuery}
              placeholder="Type a command or search..."
              aria-label="Search commands"
              onChange={(event) => setPaletteQuery(event.target.value)}
              onKeyDown={handlePaletteKeyDown}
            />
            <button type="button" onClick={closePalette} aria-label="Close search">×</button>
          </header>
          <div className="command-palette-results">
            {commandGroups.map((group) => (
              <section key={group.label} aria-labelledby={`command-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}>
                <h2 id={`command-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}>{group.label}</h2>
                {group.commands.map((command) => {
                  const index = paletteCommands.indexOf(command);
                  return (
                    <button
                      key={`${command.group}-${command.label}`}
                      type="button"
                      className={index === activeCommand ? "is-active" : ""}
                      onMouseEnter={() => setActiveCommand(index)}
                      onClick={() => runCommand(command)}
                    >
                      <span className="command-palette-icon"><PaletteGlyph icon={command.icon} /></span>
                      <span><strong>{command.label}</strong><small>{command.description}</small></span>
                      <kbd>↵</kbd>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
          <footer><span>↑↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></footer>
        </div>
      </dialog>
    </div>
  );
}
