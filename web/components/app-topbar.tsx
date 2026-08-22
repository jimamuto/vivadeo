import Link from "next/link";

type AppTopbarProps = {
  profileInitial?: string;
  title?: string;
};

function VivadeoAvatar() {
  return <span className="vivadeo-avatar" aria-hidden="true">W</span>;
}

export function AppTopbar({ profileInitial = "V", title }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-shell">
        {title ? <strong className="topbar-title">{title}</strong> : <Link href="/" className="brand">Vivadeo</Link>}
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
