"use client";

import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

type NavIcon = "chat" | "ingest" | "library" | "jobs";
type PaletteIcon = NavIcon | "workspace" | "settings" | "shield" | "profile";
type PaletteCommand = { label: string; description: string; href: string; group: string; icon: PaletteIcon; keywords: string };

const PALETTE_COMMANDS: PaletteCommand[] = [
  { label: "Ask Vivadeo", description: "Start searching your video archive", href: "/chat", group: "Quick actions", icon: "chat", keywords: "search ask answer new chat footage" },
  { label: "Add video", description: "Upload a file or import a video URL", href: "/dashboard/ingest", group: "Quick actions", icon: "ingest", keywords: "upload import ingest source url" },
  { label: "Library", description: "Browse and manage workspace videos", href: "/dashboard/library", group: "Workspace", icon: "library", keywords: "videos sources archive collections" },
  { label: "Job history", description: "Review uploads, imports, and processing", href: "/dashboard/jobs", group: "Workspace", icon: "jobs", keywords: "history status progress failed jobs processing" },
  { label: "Workspace", description: "Manage members and workspace access", href: "/dashboard/workspace", group: "Workspace", icon: "workspace", keywords: "organization team members roles invites" },
  { label: "Profile settings", description: "Update your profile and preferences", href: "/settings#account", group: "Settings", icon: "profile", keywords: "account name avatar timezone preferences" },
  { label: "Security", description: "Manage password and active sessions", href: "/settings#security", group: "Settings", icon: "shield", keywords: "password sessions login security" },
  { label: "Data and privacy", description: "Review privacy and account controls", href: "/settings#privacy", group: "Settings", icon: "shield", keywords: "privacy data delete account" },
  { label: "Answer service", description: "Configure how Vivadeo answers questions", href: "/settings#ai", group: "Settings", icon: "settings", keywords: "answer service provider model settings" },
];

function PaletteGlyph({ icon }: { icon: PaletteIcon }) {
  const paths: Record<PaletteIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
    workspace: "M4 19v-8l8-6 8 6v8 M8 19v-5h8v5",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6 7 7 M17 17l1.4 1.4 M18.4 5.6 17 7 M7 17l-1.4 1.4",
    shield: "M12 3l7 3v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6z M9 12l2 2 4-4",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21c.8-4 3.1-6 7-6s6.2 2 7 6",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    chat: "M4 5.5h16v10H9l-4 3v-3H4z M8 9h8 M8 12h5",
    ingest: "M12 4v10 M8 10l4 4 4-4 M5 19h14",
    library: "M4 7.5h6l1.5 2H20v9H4z M4 7.5V5h6l1.5 2",
    jobs: "M7 4h10v16H7z M9 8h6 M9 12h6 M9 16h4",
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
  sidebarContent,
  children,
}: Readonly<{
  workspace: string;
  profileInitial: string;
  profileName?: string;
  profileImage?: string | null;
  sidebarContent?: ReactNode;
  children: ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeCommand, setActiveCommand] = useState(0);
  const paletteRef = useRef<HTMLDialogElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pageLabel = pathname.startsWith("/dashboard/library")
    ? "Library"
    : pathname.startsWith("/dashboard/jobs")
      ? "History"
      : pathname.startsWith("/dashboard/ingest")
        ? "Ingest"
        : pathname.startsWith("/settings")
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
        { label: `Search archive for “${paletteQuery.trim()}”`, description: "Ask Vivadeo across your workspace videos", href: `/chat?q=${encodeURIComponent(paletteQuery.trim())}`, group: "Search", icon: "chat" as PaletteIcon, keywords: "" },
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
          <Link href="/" className="dashboard-brand-mark">
            {collapsed
              ? <img className="dashboard-brand-collapsed-icon" src="/vivadeo-mark.png" alt="Vivadeo" />
              : <BrandLogo className="dashboard-brand-logo" />}
          </Link>
          {!collapsed ? <button className="dashboard-sidebar-close" type="button" onClick={toggleSidebar} aria-label="Close sidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button> : null}
        </div>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <span className="dashboard-nav-label">General</span>
          <NavItem href="/chat" label="Chat" icon="chat" />
          <NavItem href="/dashboard/library" label="Library" icon="library" />
          <NavItem href="/dashboard/jobs" activePaths={["/jobs"]} label="History" icon="jobs" />
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
              <span aria-current="page">{pageLabel}</span>
            </nav>
          </div>
          <nav aria-label="Workspace actions">
            <button className="dashboard-command-search" type="button" onClick={() => setPaletteOpen(true)} aria-label="Search workspace" aria-haspopup="dialog" aria-controls="command-palette" aria-expanded={paletteOpen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
              <span>Search anything...</span>
              <kbd aria-label="Command or Control plus K">⌘ K</kbd>
            </button>
            <Link href="/dashboard/jobs" aria-label="View activity">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            </Link>
            <details className="dashboard-command-account">
              <summary className="dashboard-command-profile" aria-label="Open account menu">
                <span>{profileImage ? <img src={profileImage} alt="" /> : profileInitial}</span>
                <strong>{profileName || profileInitial}</strong>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
              </summary>
              <div className="dashboard-command-menu">
                <Link href="/settings">Settings</Link>
                <Link href="/settings#help">Help &amp; Feedback</Link>
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
