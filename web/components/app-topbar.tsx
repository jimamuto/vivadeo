type AppTopbarProps = {
  profileInitial?: string;
  title?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

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
        ) : <strong className="brand">Vivadeo</strong>}
        <div className="nav-spacer" />
        <div className="nav-actions" aria-hidden="true" />
      </div>
    </header>
  );
}
