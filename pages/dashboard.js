import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import UserOverviewTable from '../components/dashboard/UserOverviewTable';

export async function getServerSideProps(context) {
  const { req } = context;
  const cookie = req.headers.cookie || '';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const baseUrl = `${proto}://${host}`;
  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie },
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { redirect: { destination: '/login', permanent: false } };
    }
    const data = await res.json();
    const user = data?.user || data?.data?.user || null;
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }
    return { props: { user } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
}

const NAVIGATION_BY_ROLE = {
  superadmin: [
    { key: 'overview', label: 'Overview' },
    { key: 'user-management', label: 'User Management' },
    { key: 'funding', label: 'Funding Opportunities' },
    { key: 'reports', label: 'Reports & Analytics' },
  ],
  admin: [
    { key: 'overview', label: 'Overview' },
    { key: 'funding', label: 'Funding Opportunities' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'team', label: 'Team Insights' },
  ],
  base_user: [
    { key: 'overview', label: 'Overview' },
    { key: 'applications', label: 'My Applications' },
    { key: 'resources', label: 'Resources' },
    { key: 'support', label: 'Support' },
  ],
};

const FALLBACK_NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'updates', label: 'Updates' },
  { key: 'activity', label: 'Recent Activity' },
];

const SECTION_DESCRIPTORS = {
  overview: {
    body: () => <UserOverviewTable />,
  },
  applications: {
    subtitle: 'Track the status of each funding application at a glance.',
    panels: [
      {
        title: 'In Review',
        description: 'See which submissions are currently under review and who is assigned.',
        meta: '2 pending',
      },
      {
        title: 'Upcoming deadlines',
        description: 'Stay ahead of due dates with timely reminders and alerts.',
      },
    ],
    listTitle: 'Applications toolkit',
    list: [
      { title: 'Start a new application' },
      { title: 'View submission history' },
      { title: 'Download templates' },
    ],
  },
  resources: {
    subtitle: 'Centralize guidelines, FAQs, and documentation for your team.',
    panels: [
      {
        title: 'Featured guides',
        description: 'Highlight the documents your role needs most often.',
      },
      {
        title: 'Shared folders',
        description: 'Organize supporting materials for quick reference.',
      },
    ],
    listTitle: 'Resource quick links',
    list: [
      { title: 'Brand assets & templates' },
      { title: 'Policy and compliance hub' },
      { title: 'Knowledge base' },
    ],
  },
  support: {
    subtitle: 'Get help, share feedback, and keep conversations moving.',
    panels: [
      {
        title: 'Open tickets',
        description: 'Track the status of issues you or your team have raised.',
        meta: '0 open',
      },
      {
        title: 'Community channels',
        description: 'Connect with admins and peers in dedicated discussion spaces.',
      },
    ],
    listTitle: 'Need assistance?',
    list: [
      { title: 'Contact support', description: 'Reach the support team directly.' },
      { title: 'Request a walkthrough' },
      { title: 'Share product feedback' },
    ],
  },
  funding: {
    subtitle: 'Review funding opportunities, eligibility, and allocation details.',
    panels: [
      {
        title: 'Active opportunities',
        description: 'Track open calls and match them to potential applicants.',
        meta: '5 active',
      },
      {
        title: 'Allocation overview',
        description: 'Understand how resources are being distributed.',
      },
    ],
  },
  'user-management': {
    subtitle: 'Manage access, roles, and permissions across your organization.',
    panels: [
      {
        title: 'Team roster',
        description: 'View who is active, pending, or requires action.',
      },
      {
        title: 'Role controls',
        description: 'Assign, update, or revoke roles in a few clicks.',
      },
    ],
    listTitle: 'Administrative shortcuts',
    list: [
      { title: 'Invite a new teammate' },
      { title: 'Review access requests' },
      { title: 'Audit recent changes' },
    ],
  },
  reports: {
    subtitle: 'Measure performance and share insights with stakeholders.',
    panels: [
      {
        title: 'Performance dashboard',
        description: 'Monitor KPIs and trends across your organization.',
      },
      {
        title: 'Export center',
        description: 'Generate CSV and presentation-ready snapshots.',
      },
    ],
  },
  submissions: {
    subtitle: 'Oversee incoming submissions and coordinate reviews.',
    panels: [
      {
        title: 'Awaiting review',
        description: 'Assign reviewers and keep momentum on pending submissions.',
        meta: '4 pending',
      },
      {
        title: 'Completed this week',
        description: 'Celebrate wins and communicate next steps.',
      },
    ],
  },
  team: {
    subtitle: 'Understand how your team is collaborating and contributing.',
    panels: [
      {
        title: 'Engagement',
        description: 'Spot activity spikes and identify opportunities to support.',
      },
      {
        title: 'Highlights',
        description: 'Recognize key contributions and share kudos.',
      },
    ],
  },
  updates: {
    subtitle: 'Catch up on new announcements, releases, and reminders.',
    panels: [
      {
        title: 'Announcements',
        description: 'Organization-wide updates will appear here.',
      },
      {
        title: 'Changelog',
        description: 'Review what changed since you last signed in.',
      },
    ],
  },
  activity: {
    subtitle: 'Follow recent actions taken across your workspace.',
    panels: [
      {
        title: 'Team activity',
        description: 'See who updated records, approved requests, or left notes.',
      },
      {
        title: 'Audit trail',
        description: 'Keep everything compliant with full transparency.',
      },
    ],
  },
};

export default function Dashboard({ user }) {
  const [sessionUser, setSessionUser] = useState(user);
  const normalizedRole = (sessionUser?.role || '').toLowerCase();
  const navItems = NAVIGATION_BY_ROLE[normalizedRole] || FALLBACK_NAV;
  const router = useRouter();

  const primaryNav = useMemo(() => navItems, [navItems]);
  const initialSection = useMemo(() => primaryNav[0]?.key || FALLBACK_NAV[0].key, [primaryNav]);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isOverviewSection = activeSection === 'overview';

  useEffect(() => {
    if (!primaryNav.length) return;
    const hasActive = primaryNav.some((item) => item.key === activeSection);
    const isSettings = activeSection === 'settings';
    if (!hasActive && !isSettings) {
      setActiveSection(primaryNav[0].key);
    }
  }, [primaryNav, activeSection]);

  const handleSelectNav = useCallback((key) => {
    setActiveSection(key);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setActiveSection('settings');
  }, []);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) return;
    }
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      await router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  const activeNavItem = primaryNav.find((item) => item.key === activeSection);
  const sectionDescriptor = SECTION_DESCRIPTORS[activeSection] || {
    subtitle: 'This area will be available soon.',
    panels: [
      {
        title: 'In progress',
        description: 'Content for this section is being prepared.',
      },
    ],
  };

  const panels = sectionDescriptor.panels || [];
  const list = sectionDescriptor.list || [];
  const hasCustomBody = typeof sectionDescriptor.body === 'function';
  const sectionTitle = activeSection === 'settings' ? 'Settings' : activeNavItem?.label || 'Dashboard';
  const sectionSubtitle =
    activeSection === 'settings'
      ? 'Manage your personal details and keep your account secure.'
      : sectionDescriptor.subtitle;

  return (
    <DashboardLayout
      user={sessionUser}
      navItems={primaryNav}
      activeNav={activeSection}
      onNavSelect={handleSelectNav}
      onOpenSettings={handleOpenSettings}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <section className={`section ${isOverviewSection ? 'section--compact' : ''}`}>
        <header className="section-header">
          <h1 className="section-title">{sectionTitle}</h1>
          {sectionSubtitle && <p className="section-subtitle">{sectionSubtitle}</p>}
        </header>
        <div className={`section-body ${isOverviewSection ? 'section-body--compact' : ''}`}>
          {activeSection === 'settings' ? (
            <SettingsPanel
              user={sessionUser}
              onProfileUpdated={(updated) => updated && setSessionUser(updated)}
            />
          ) : (
            <>
              {panels.length > 0 && (
                <div className="section-panels">
                  {panels.map((panel) => (
                    <article className="section-card" key={panel.title}>
                      <div className="section-card-header">
                        <h2>{panel.title}</h2>
                        {panel.meta && <span className="section-meta">{panel.meta}</span>}
                      </div>
                      <p>{panel.description}</p>
                    </article>
                  ))}
                </div>
              )}

              {list.length > 0 && (
                <div className="section-list-wrap">
                  <h3 className="section-list-title">{sectionDescriptor.listTitle || 'Key actions'}</h3>
                  <ul className="section-list">
                    {list.map((item) => {
                      const id = typeof item === 'string' ? item : item.title;
                      const content = typeof item === 'string' ? { title: item } : item;
                      return (
                        <li key={id} className="section-list-item">
                          <span className="section-list-item-title">{content.title}</span>
                          {content.description && <p>{content.description}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {hasCustomBody && <div className="section-custom">{sectionDescriptor.body(sessionUser)}</div>}

              {panels.length === 0 && list.length === 0 && !hasCustomBody && (
                <div className="empty-state">
                  <h2>Stay tuned</h2>
                  <p>We’re preparing something great for this section.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <style jsx>{`
        .section {
          display: grid;
          gap: 1rem;
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

        .section-header {
          display: grid;
          gap: 0.5rem;
          margin: 0;
          padding: 0;
        }

        .section-title {
          font-size: clamp(1.9rem, 3.5vw, 2.35rem);
          font-weight: 600;
          color: #0f172a;
          margin: 0;
          padding: 0;
        }

        .section-subtitle {
          color: #475569;
          font-size: 1rem;
          line-height: 1.6;
          max-width: 60ch;
          margin: 0;
          padding: 0;
        }

        .section-body {
          display: grid;
          gap: 1.2rem;
          padding-bottom: 0.35rem;
        }

        .section--compact {
          gap: 0.3rem;
        }

        .section-body--compact {
          display: flex;
          gap: 0;
          padding-bottom: 0;
          margin-top: 0;
        }

        .section-body--compact > * {
          flex: 1 1 100%;
          min-width: 0;
        }

        .section-panels {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .section-card {
          border-radius: 1.1rem;
          background: white;
          padding: 1.6rem;
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
          display: grid;
          gap: 0.75rem;
        }

        .section-card-header {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          justify-content: space-between;
        }

        .section-card h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-card p {
          color: #607089;
          line-height: 1.65;
        }

        .section-meta {
          font-size: 0.82rem;
          font-weight: 600;
          color: #2563eb;
          background: rgba(37, 99, 235, 0.12);
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
        }

        .section-list-wrap {
          display: grid;
          gap: 0.75rem;
          background: white;
          border-radius: 1.1rem;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          padding: 1.6rem;
        }

        .section-list-title {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-list {
          list-style: none;
          display: grid;
          gap: 0.85rem;
          margin: 0;
          padding: 0;
        }

        .section-list-item {
          display: grid;
          gap: 0.3rem;
          padding-left: 0.2rem;
        }

        .section-list-item-title {
          font-weight: 500;
          color: #0f172a;
        }

        .section-list-item p {
          color: #607089;
          line-height: 1.6;
        }

        .section-custom {
          background: white;
          border-radius: 1.1rem;
          padding: 1.6rem;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        }

        .empty-state {
          display: grid;
          gap: 0.5rem;
          text-align: center;
          background: white;
          border-radius: 1.1rem;
          padding: 2rem;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
        }

        .empty-state h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-state p {
          color: #64748b;
        }

        @media (max-width: 960px) {
          .section-title {
            font-size: clamp(1.5rem, 4vw, 1.9rem);
          }
          .section-subtitle {
            font-size: 0.95rem;
            max-width: 100%;
          }
        }

        @media (max-width: 720px) {
          .section {
            gap: 1.5rem;
          }
          .section-body {
            gap: 1.25rem;
            padding-bottom: 0.75rem;
          }

          .section-panels {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .section-card {
            padding: 1.25rem;
          }

          .section-card h2 {
            font-size: 1rem;
          }

          .section-list-wrap {
            padding: 1.25rem;
          }

          .section-list-title {
            font-size: 0.95rem;
          }

          .section-custom {
            padding: 1.25rem;
          }

          .empty-state {
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .section-header {
            gap: 0.4rem;
          }
          .section-title {
            font-size: 1.5rem;
          }
          .section-subtitle {
            font-size: 0.9rem;
          }
          .section-body {
            gap: 1rem;
          }
          .section-card {
            padding: 1rem;
            border-radius: 0.9rem;
          }
          .section-list-wrap {
            padding: 1rem;
            border-radius: 0.9rem;
          }
          .section-custom {
            padding: 1rem;
            border-radius: 0.9rem;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
