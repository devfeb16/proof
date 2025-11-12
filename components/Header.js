import Link from 'next/link';

export default function Header({
  title = 'Funding Intelligence — Proof360 Extension',
  navItems = [
    { href: '/dashboard', label: 'Dashboard' },
  ],
}) {
  return (
    <header className="page-header">
      <div className="container header-grid">
        <div className="brand">
          <Link href="/" className="logo-link">
            <h1 className="title">{title}</h1>
          </Link>
        </div>
        <nav className="local-nav" aria-label="Primary">
          {navItems.map((item) => {
            const isDashboard = item.href === '/dashboard';
            if (isDashboard) {
              return (
                <Link key={item.href} href={item.href} className="nav-button">
                  {item.label}
                </Link>
              );
            }
            return (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <style jsx>{`
        /* Ensure header links never inherit global underlines */
        :global(.page-header a),
        :global(.page-header a:link),
        :global(.page-header a:visited),
        :global(.page-header a:hover),
        :global(.page-header a:active) {
          text-decoration: none !important;
        }
        :global(.page-header .logo-link),
        :global(.page-header .logo-link:link),
        :global(.page-header .logo-link:visited),
        :global(.page-header .logo-link:hover),
        :global(.page-header .logo-link:active) {
          color: inherit !important;
          text-decoration: none !important;
        }
        :global(.page-header .nav-button),
        :global(.page-header .nav-button:link),
        :global(.page-header .nav-button:visited),
        :global(.page-header .nav-button:hover),
        :global(.page-header .nav-button:active),
        :global(.page-header a.nav-button),
        :global(.page-header a.nav-button:link),
        :global(.page-header a.nav-button:visited),
        :global(.page-header a.nav-button:hover),
        :global(.page-header a.nav-button:active) {
          color: #fff !important;
          text-decoration: none !important;
        }
        .page-header {
          border-bottom: 1px solid #eaeaea;
          background: #ffffff;
        }
        .header-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          padding: 1.25rem 0;
          align-items: center;
        }
        .logo {
          text-decoration: none;
          color: inherit;
        }
        .logo-link {
          display: inline-block;
          text-decoration: none !important;
          color: inherit !important;
        }
        .title {
          font-size: 1.25rem;
          line-height: 1.2;
          margin: 0;
          font-weight: 600;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: text-decoration-color 120ms ease-in-out;
        }
        .logo-link:hover,
        .logo-link:focus,
        .logo-link:active,
        .logo-link:visited {
          text-decoration: none !important;
          color: inherit !important;
        }
        .local-nav {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .local-nav a { text-decoration: none !important; }
        .nav-link {
          color: #333;
          text-decoration: none;
          padding: 0.45rem 0.65rem;
          border-radius: 6px;
          transition: background 0.2s;
          font-weight: 500;
        }
        .nav-link:hover {
          background: #f5f5f5;
        }
        /* Dashboard as button - styles are in globals.css for proper Next.js Link support */
        :global(.page-header .nav-button),
        :global(.page-header a.nav-button) {
          color: #fff !important;
          background: #0070f3 !important;
          padding: 0.6rem 1rem !important;
          border-radius: 999px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.4rem !important;
          box-shadow: 0 8px 20px rgba(0,112,243,0.25) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          transition: transform 0.08s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease !important;
          cursor: pointer !important;
        }
        :global(.page-header a.nav-button:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 12px 26px rgba(0,112,243,0.35) !important;
          background: #0059c1 !important;
          border-color: rgba(0,0,0,0.08) !important;
          text-decoration: none !important;
          color: #fff !important;
        }
        :global(.page-header a.nav-button:active) {
          transform: translateY(0) !important;
          box-shadow: 0 6px 16px rgba(0,112,243,0.25) !important;
          background: #0059c1 !important;
        }
        :global(.page-header a.nav-button:focus-visible) {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        :global(.page-header a.nav-button:visited) {
          color: #fff !important;
          background: #0070f3 !important;
        }
        /* Prevent default underline in header links; rely on custom hovers above */
        .local-nav a:hover,
        .logo:hover { text-decoration: none; }
        @media (max-width: 768px) {
          .header-grid {
            grid-template-columns: 1fr;
          }
          .title {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </header>
  );
}

