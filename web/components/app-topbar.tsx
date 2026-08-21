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
        <form className="nav-search-form" action="/search" method="get" role="search">
          <label className="sr-only" htmlFor="global-search">Search footage</label>
          <input id="global-search" name="q" type="search" placeholder="Search footage..." />
        </form>
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
