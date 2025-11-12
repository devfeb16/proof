import { useState, useEffect } from 'react';

export default function DashboardLayout({
  user,
  navItems,
  activeNav,
  onNavSelect,
  onOpenSettings,
  onLogout,
  isLoggingOut,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const roleLabel = user?.role ? user.role.replace(/_/g, ' ') : 'User';
  const items = Array.isArray(navItems) ? navItems : [];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setSidebarOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (sidebarOpen && window.innerWidth <= 960) {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.sidebar-toggle');
        if (sidebar && toggle && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="dashboard-shell">
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand" aria-label="Application" style={{ padding: '0.8rem 0.85rem 0.6rem' }}>
            <div className="brand-mark">TS</div>
            <div className="brand-text">
              <span className="brand-title">TheServer</span>
              <span className="brand-subtitle">{roleLabel}</span>
            </div>
          </div>

          <nav className="nav" aria-label="Primary" style={{ padding: '0 0.85rem' }}>
            <ul className="nav-list">
              {items.map((item) => {
                const isActive = item.key === activeNav;
                return (
                  <li key={item.key} className="nav-list-item">
                    <button
                      type="button"
                      className={`nav-button${isActive ? ' is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        onNavSelect?.(item.key);
                        if (window.innerWidth <= 960) {
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      <span className="nav-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="sidebar-bottom" aria-label="Secondary" style={{ padding: '0.6rem 0.85rem 0.85rem' }}>
          <button
            type="button"
            className={`secondary-button secondary-button--settings${activeNav === 'settings' ? ' is-active' : ''}`}
            onClick={() => {
              onOpenSettings?.();
              if (window.innerWidth <= 960) {
                setSidebarOpen(false);
              }
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--logout"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="content-inner">{children}</div>
      </main>

      <style jsx>{`
        .dashboard-shell {
          height: 100vh;
          display: flex;
          background: var(--dashboard-surface, #f8fafc);
          color: var(--dashboard-foreground, #0f172a);
          overflow: hidden;
          position: relative;
        }

        .sidebar-toggle {
          display: none;
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
          background: var(--sidebar-surface, #0f172a);
          color: #f8fafc;
          border: none;
          border-radius: 8px;
          padding: 0.75rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
        }

        .sidebar-toggle:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .sidebar-toggle:active {
          transform: scale(0.98);
        }

        .hamburger-icon {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 24px;
          height: 18px;
        }

        .hamburger-icon span {
          display: block;
          width: 100%;
          height: 2px;
          background: #f8fafc;
          border-radius: 2px;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .sidebar {
          width: min(228px, 21vw);
          background: var(--sidebar-surface, #0f172a);
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          height: 100%;
          padding: 0;
          border-right: 1px solid rgba(148, 163, 184, 0.12);
          transition: transform 0.3s ease;
        }

        .sidebar-top {
          display: flex;
          flex-direction: column;
          padding: 0;
          gap: 1.05rem;
          min-height: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }

        .brand-mark {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 0.7rem;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          display: grid;
          place-items: center;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .brand-title {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.12em;
        }

        .brand-subtitle {
          font-size: 0.72rem;
          color: rgba(248, 250, 252, 0.7);
          text-transform: capitalize;
        }

        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 0;
          margin: 0;
        }

        .nav-button {
          width: 100%;
          text-align: left;
          padding: 0.6rem 0.75rem;
          border-radius: 0.7rem;
          border: none;
          background: rgba(148, 163, 184, 0.12);
          color: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          transition: background 0.2s ease, transform 0.2s ease;
          cursor: pointer;
        }

        .nav-button:hover,
        .nav-button:focus-visible {
          outline: none;
          background: rgba(148, 163, 184, 0.22);
          transform: translateX(3px);
        }

        .nav-button.is-active {
          background: rgba(96, 165, 250, 0.32);
          box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.45);
        }

        .sidebar-bottom {
          margin-top: auto;
          display: grid;
          gap: 0.6rem;
          padding: 0;
        }

        .secondary-button {
          width: 100%;
          text-align: left;
          padding: 0.65rem 0.9rem;
          border-radius: 0.75rem;
          border: none;
          background: rgba(15, 23, 42, 0.5);
          color: rgba(248, 250, 252, 0.92);
          font-size: 0.95rem;
          font-weight: 500;
          transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
          cursor: pointer;
        }

        .secondary-button:hover,
        .secondary-button:focus-visible {
          outline: none;
          transform: translateX(3px);
        }

        .secondary-button--settings:hover,
        .secondary-button--settings:focus-visible {
          background: rgba(148, 163, 184, 0.28);
        }

        .secondary-button--settings.is-active {
          background: rgba(96, 165, 250, 0.32);
          box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.45);
        }

        .secondary-button--logout {
          background: rgba(239, 68, 68, 0.2);
          color: rgba(254, 226, 226, 0.95);
          box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.35);
        }

        .secondary-button--logout:hover,
        .secondary-button--logout:focus-visible {
          background: rgba(248, 113, 113, 0.3);
        }

        .secondary-button--logout:disabled {
          cursor: wait;
          opacity: 0.7;
          transform: none;
        }

        .content {
          flex: 1;
          display: flex;
          min-height: 0;
        }

        .content-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 3rem 2.5rem 3rem;
          overflow-y: auto;
          gap: 2rem;
        }

        @media (max-width: 960px) {
          .sidebar-toggle {
            display: flex;
          }

          .dashboard-shell {
            flex-direction: column;
            height: 100vh;
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: min(280px, 85vw);
            height: 100vh;
            z-index: 1000;
            transform: translateX(-100%);
            box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
            overflow-y: auto;
            overflow-x: hidden;
          }

          .sidebar.is-open {
            transform: translateX(0);
          }

          .sidebar-top,
          .sidebar-bottom {
            padding: 1.25rem;
          }

          .sidebar-top {
            padding-top: 1.25rem;
          }

          .nav-list {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }

          .secondary-button {
            width: 100%;
          }

          .content-inner {
            padding: 2rem 1.5rem 3rem;
            margin-top: 0;
            padding-top: 4.5rem;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }

          .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            animation: fadeIn 0.3s ease;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .sidebar-toggle {
            top: 0.75rem;
            right: 0.75rem;
            width: 44px;
            height: 44px;
            padding: 0.65rem;
          }

          .content-inner {
            padding: 1.5rem 1rem 2rem;
            padding-top: 4rem;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }

          .sidebar {
            width: min(260px, 90vw);
          }
        }
      `}</style>
    </div>
  );
}