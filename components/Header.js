import Link from 'next/link';

export default function Header({
  title = 'Proof360',
  navItems = [
    { href: '/dashboard', label: 'Dashboard' },
  ],
}) {
  return (
    <header className="page-header">
      <div className="container">
        <div className="header-grid">
          <div className="brand">
            <Link href="/" className="logo-link">
              <img 
                src="/logo.svg" 
                alt="Proof360 Logo" 
                className="logo-img"
              />
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
          position: -webkit-sticky;
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 1000;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin: 0;
          padding: 0;
        }
        .page-header :global(.container) {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          width: 100%;
          box-sizing: border-box;
        }
        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .logo-img {
          height: auto;
          width: auto;
          max-height: 32px;
          display: block;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .logo-link:hover .logo-img {
          transform: scale(1.03);
          opacity: 0.85;
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
        .brand-name {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .logo-link:hover,
        .logo-link:focus,
        .logo-link:active,
        .logo-link:visited {
          text-decoration: none !important;
          color: inherit !important;
        }
        .brand {
          flex-shrink: 0;
        }
        .local-nav {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: nowrap;
          flex-shrink: 0;
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
          padding: 0.5rem 1rem !important;
          border-radius: 8px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
          font-size: 0.9rem !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.4rem !important;
          box-shadow: 0 2px 8px rgba(0,112,243,0.2) !important;
          border: none !important;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease !important;
          cursor: pointer !important;
        }
        :global(.page-header a.nav-button:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0,112,243,0.3) !important;
          background: #0059c1 !important;
          text-decoration: none !important;
          color: #fff !important;
        }
        :global(.page-header a.nav-button:active) {
          transform: translateY(0) !important;
          box-shadow: 0 2px 6px rgba(0,112,243,0.25) !important;
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
          .page-header :global(.container) {
            padding: 0 1rem;
            max-width: 100%;
          }
          .header-grid {
            padding: 0.65rem 0;
            gap: 0.75rem;
          }
          .logo-img {
            max-height: 28px;
          }
          .local-nav {
            gap: 0.5rem;
          }
          .nav-link {
            font-size: 0.85rem;
            padding: 0.35rem 0.55rem;
          }
          :global(.page-header a.nav-button) {
            padding: 0.45rem 0.85rem !important;
            font-size: 0.85rem !important;
          }
        }
        @media (max-width: 480px) {
          .page-header :global(.container) {
            padding: 0 0.75rem;
            max-width: 100%;
          }
          .header-grid {
            padding: 0.6rem 0;
            gap: 0.5rem;
          }
          .logo-img {
            max-height: 26px;
          }
          :global(.page-header a.nav-button) {
            padding: 0.4rem 0.75rem !important;
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </header>
  );
}

