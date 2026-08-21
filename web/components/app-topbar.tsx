import Link from "next/link";

type AppTopbarProps = {
  profileInitial?: string;
};

export function AppTopbar({ profileInitial = "V" }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-shell">
        <Link href="/" className="brand">
          Vivadeo
        </Link>
        <nav className="nav-center" aria-label="Main">
          <Link href="/" className="nav-link">
            Home
          </Link>
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link href="/search" className="nav-link">
            Search
          </Link>
          <Link href={"/dashboard/library" as any} className="nav-link">
            Library
          </Link>
          <Link href="/jobs" className="nav-link">
            Jobs
          </Link>
          <Link href="/settings" className="nav-link">
            Settings
          </Link>
        </nav>
        <div className="nav-spacer" />
        <div className="nav-actions">
          <Link href="/settings" className="nav-user" aria-label="Profile">
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
