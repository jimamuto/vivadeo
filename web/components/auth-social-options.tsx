export function AuthSocialOptions() {
  return (
    <div className="auth-social-options" aria-label="Social account options coming later">
      <div className="auth-social-divider"><span>More account options coming later</span></div>
      <div className="auth-social-buttons">
        <button type="button" disabled aria-label="Google sign-in coming later" title="Coming later">
          <span aria-hidden="true">G</span>
        </button>
        <button type="button" disabled aria-label="Facebook sign-in coming later" title="Coming later">
          <span aria-hidden="true">f</span>
        </button>
        <button type="button" disabled aria-label="Apple sign-in coming later" title="Coming later">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16.8 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.9.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-2.5-1-2.5-3.6ZM14.5 6c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
