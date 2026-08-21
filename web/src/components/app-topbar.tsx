import { Link } from "~/components/link";

type AppTopbarProps = {
  profileInitial?: string;
};

export function AppTopbar({ profileInitial = "V" }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-shell">
        <Link to="/" className="brand">
          Vivadeo
        </Link>
        <nav className="nav-center" aria-label="Main">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link to="/search" className="nav-link">
            Search
          </Link>
          <Link to={"/dashboard/library" as any} className="nav-link">
            Library
          </Link>
          <Link to="/jobs" className="nav-link">
            Jobs
          </Link>
          <Link to="/settings" className="nav-link">
            Settings
          </Link>
        </nav>
        <div className="nav-spacer" />
        <div className="nav-actions">
          <Link to="/settings" className="nav-user" aria-label="Profile">
            {profileInitial}
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
