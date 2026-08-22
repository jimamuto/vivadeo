import Link from "next/link";

type AppTopbarProps = {
  profileInitial?: string;
  title?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

function VivadeoAvatar() {
  return <span className="vivadeo-avatar" aria-hidden="true">W</span>;
}

export function AppTopbar({ profileInitial = "V", title, sidebarCollapsed = false, onToggleSidebar }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-shell">
        {title ? (
          <div className="topbar-title-group">
            {onToggleSidebar ? (
              <button className="sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}>
                <span className="sidebar-expander" aria-hidden="true" />
              </button>
            ) : null}
            <strong className="topbar-title">{title}</strong>
          </div>
        ) : <Link href="/" className="brand">Vivadeo</Link>}
        <form className="nav-search-form" action="/search" method="get" role="search">
          <label className="sr-only" htmlFor="global-search">Search footage</label>
          <input id="global-search" name="q" type="search" placeholder="Search footage..." />
        </form>
        <div className="nav-spacer" />
        <div className="nav-actions">
          <Link href="/settings" className="nav-user" aria-label={`Profile ${profileInitial}`}>
            <VivadeoAvatar />
          </Link>
          <form action="/api/auth/sign-out" method="post">
            <button className="nav-logout" type="submit">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
