import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import AddOrigin from '../components/dashboard/AddOrigin';
import UserOverviewTable from '../components/dashboard/UserOverviewTable';
import JobManager from '../components/dashboard/JobManager';
import TranscriptManager from '../components/dashboard/TranscriptManager';
import VendorManager from '../components/dashboard/VendorManager';
import CandidateManager from '../components/dashboard/CandidateManager';
import PerformanceDashboard from '../components/dashboard/reports/PerformanceDashboard';
import LoxoPanel from '../components/dashboard/LoxoPanel';
import CityServiceManager from '../components/dashboard/CityServiceManager';
import ApiEndpointsPanel from '../components/dashboard/ApiEndpointsPanel';
import ScraperManager from '../components/dashboard/ScraperManager';

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
    const text = await res.text();
    if (!text || !text.trim()) {
      return { redirect: { destination: '/login', permanent: false } };
    }
    try {
      const data = JSON.parse(text);
      const user = data?.user || data?.data?.user || null;
      if (!user) {
        return { redirect: { destination: '/login', permanent: false } };
      }
      return { props: { user } };
    } catch (parseError) {
      return { redirect: { destination: '/login', permanent: false } };
    }
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
}

const NAVIGATION_BY_ROLE = {
  superadmin: [
    { key: 'overview', label: 'Overview' },
    { key: 'user-management', label: 'User Management' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'candidates', label: 'Candidates' },
    { key: 'loxo', label: 'Loxo' },
    { key: 'transcripts', label: 'Transcripts' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'city-service-routes', label: 'City Service Routes' },
    { key: 'funding', label: 'Funding Opportunities' },
    { key: 'scraper', label: 'Web Scraper' },
    { key: 'add-origin', label: 'Add Origin' },
    { key: 'reports', label: 'Reports & Analytics' },
    { key: 'api-endpoints', label: 'API Endpoints' },
  ],
  admin: [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'candidates', label: 'Candidates' },
    { key: 'loxo', label: 'Loxo' },
    { key: 'transcripts', label: 'Transcripts' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'city-service-routes', label: 'City Service Routes' },
    { key: 'funding', label: 'Funding Opportunities' },
    { key: 'scraper', label: 'Web Scraper' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'team', label: 'Team Insights' },
    { key: 'add-origin', label: 'Add Origin' },
    { key: 'api-endpoints', label: 'API Endpoints' },
  ],
  hr: [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'candidates', label: 'Candidates' },
    { key: 'loxo', label: 'Loxo' },
    { key: 'transcripts', label: 'Transcripts' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'city-service-routes', label: 'City Service Routes' },
    { key: 'scraper', label: 'Web Scraper' },
    { key: 'add-origin', label: 'Add Origin' },
    { key: 'reports', label: 'Reports & Analytics' },
    { key: 'api-endpoints', label: 'API Endpoints' },
  ],
  hr_admin: [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'candidates', label: 'Candidates' },
    { key: 'loxo', label: 'Loxo' },
    { key: 'transcripts', label: 'Transcripts' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'city-service-routes', label: 'City Service Routes' },
    { key: 'scraper', label: 'Web Scraper' },
    { key: 'add-origin', label: 'Add Origin' },
    { key: 'reports', label: 'Reports & Analytics' },
    { key: 'api-endpoints', label: 'API Endpoints' },
  ],
  base_user: [
    { key: 'overview', label: 'My Applications' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'transcripts', label: 'Transcripts' },
    { key: 'vendors', label: 'Vendors' },
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
    body: (user) => {
      const normalizedRole = (user?.role || '').toLowerCase();
      if (normalizedRole === 'base_user') {
        return null;
      }
      return <UserOverviewTable currentUser={user} />;
    },
  },
  jobs: {
    subtitle: 'Review intake details and manage job assignments.',
    hideHeader: true,
    body: (user) => <JobManager user={user} />,
  },
  loxo: {
    hideHeader: true,
    body: () => <LoxoPanel />,
  },
  transcripts: {
    subtitle: 'Analyze call transcripts and AI parsing confidence.',
    hideHeader: true,
    body: (user) => <TranscriptManager user={user} />,
  },
  vendors: {
    subtitle: 'Monitor vendor compliance status and documentation.',
    hideHeader: true,
    body: (user) => <VendorManager user={user} />,
  },
  candidates: {
    subtitle: 'Manage candidate and vendor lead intake. Track onboarding status and service information.',
    hideHeader: true,
    body: (user) => <CandidateManager user={user} />,
  },
  'city-service-routes': {
    subtitle: 'Manage dynamic city + service URL routes. Test and configure location-based routing.',
    hideHeader: true,
    body: (user) => <CityServiceManager user={user} />,
  },
  applications: {
    hideHeader: true,
    body: (user) => (
      <div className="applications-overview">
        <div className="applications-hero">
          <span className="applications-hero-pill">Stay ready</span>
          <p>
            Keep an eye on the grants and submissions associated with{' '}
            <strong>{user?.name || user?.email || 'your account'}</strong>. This space highlights the
            essentials so you always know what needs attention next.
          </p>
        </div>
        <div className="applications-metrics" aria-label="Application summary">
          <div className="applications-metric">
            <span className="applications-metric-label">Active submissions</span>
            <span className="applications-metric-value">3 in progress</span>
            <span className="applications-metric-note">Awaiting review confirmations</span>
          </div>
          <div className="applications-metric">
            <span className="applications-metric-label">Next deadline</span>
            <span className="applications-metric-value">Dec 12</span>
            <span className="applications-metric-note">Draft narrative due in 5 days</span>
          </div>
          <div className="applications-metric">
            <span className="applications-metric-label">Supporting docs</span>
            <span className="applications-metric-value">2 outstanding</span>
            <span className="applications-metric-note">Upload budget + memorandums</span>
          </div>
        </div>
        <div className="applications-basic-grid">
          <article className="applications-basic-card applications-basic-card--focus">
            <span className="applications-basic-icon" aria-hidden="true" />
            <span className="applications-basic-label">Current focus</span>
            <span className="applications-basic-value">Prepare supporting documents</span>
            <p className="applications-basic-note">Double-check eligibility, budget alignment, and required signatures.</p>
          </article>
          <article className="applications-basic-card applications-basic-card--upcoming">
            <span className="applications-basic-icon" aria-hidden="true" />
            <span className="applications-basic-label">Upcoming items</span>
            <span className="applications-basic-value">Gather impact metrics</span>
            <p className="applications-basic-note">Summarize outcomes, testimonials, and reporting highlights.</p>
          </article>
          <article className="applications-basic-card applications-basic-card--support">
            <span className="applications-basic-icon" aria-hidden="true" />
            <span className="applications-basic-label">Need help?</span>
            <span className="applications-basic-value">Reach out to your program lead</span>
            <p className="applications-basic-note">Share blockers early so reviewers can support the submission.</p>
          </article>
        </div>
        <div className="applications-actions">
          <h2>Quick references</h2>
          <ul className="applications-actions-list">
            <li>
              <span>Download the latest application template</span>
            </li>
            <li>
              <span>Review your submission checklist</span>
            </li>
            <li>
              <span>Update contact details for collaborators</span>
            </li>
            <li>
              <span>Confirm compliance documents are current</span>
            </li>
          </ul>
        </div>
      </div>
    ),
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
    hideHeader: true,
    body: () => <PerformanceDashboard />,
  },
  'add-origin': {
    hideHeader: true,
    body: () => <AddOrigin />,
  },
  'api-endpoints': {
    hideHeader: true,
    body: () => <ApiEndpointsPanel />,
  },
  scraper: {
    subtitle: 'Scrape websites and extract structured data. Save important information for future reference.',
    hideHeader: true,
    body: (user) => <ScraperManager user={user} />,
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
  const initialSection = useMemo(() => {
    if (normalizedRole === 'hr') {
      const loxoNav = primaryNav.find((item) => item.key === 'loxo');
      if (loxoNav) {
        return loxoNav.key;
      }
    }
    return primaryNav[0]?.key || FALLBACK_NAV[0].key;
  }, [normalizedRole, primaryNav]);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const resolveSectionKey = useCallback(
    (key) => {
      if (!key) return null;
      const sanitized = `${key}`.trim();
      if (!sanitized) return null;
      const normalized = sanitized.toLowerCase();
      if (normalized === 'settings') {
        return 'settings';
      }
      const match = primaryNav.find((item) => item.key.toLowerCase() === normalized);
      return match?.key || null;
    },
    [primaryNav]
  );

  const updateUrlHash = useCallback((key) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('section')) {
        url.searchParams.delete('section');
      }
      url.hash = key ? key : '';
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(null, '', next);
    } catch {
      const basePath = `${window.location.pathname}${window.location.search}`;
      const hashPart = key ? `#${key}` : '';
      window.history.replaceState(null, '', `${basePath}${hashPart}`);
    }
  }, []);

  const sectionParam = router.query?.section;

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof sectionParam !== 'string') return;
    const resolvedKey = resolveSectionKey(sectionParam);
    if (!resolvedKey) return;
    setActiveSection((prev) => (prev === resolvedKey ? prev : resolvedKey));
    updateUrlHash(resolvedKey);
  }, [router.isReady, sectionParam, resolveSectionKey, updateUrlHash]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const applyHashToState = () => {
      let hashValue = window.location.hash.replace(/^#/, '');
      try {
        hashValue = decodeURIComponent(hashValue);
      } catch {
        // ignore decode errors and fall back to raw hash
      }
      const resolvedKey = resolveSectionKey(hashValue);
      if (!resolvedKey) return;
      setActiveSection((prev) => (prev === resolvedKey ? prev : resolvedKey));
      updateUrlHash(resolvedKey);
    };

    applyHashToState();
    window.addEventListener('hashchange', applyHashToState);
    return () => {
      window.removeEventListener('hashchange', applyHashToState);
    };
  }, [resolveSectionKey, updateUrlHash]);

  const isOverviewSection = activeSection === 'overview' && normalizedRole !== 'base_user';

  useEffect(() => {
    if (!primaryNav.length) return;
    const hasActive = primaryNav.some((item) => item.key === activeSection);
    const isSettings = activeSection === 'settings';
    if (!hasActive && !isSettings) {
      const fallbackKey = primaryNav[0].key;
      setActiveSection(fallbackKey);
      updateUrlHash(fallbackKey);
    }
  }, [primaryNav, activeSection, updateUrlHash]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!router.isReady) return;
    if (!activeSection) return;
    if (typeof sectionParam === 'string') return;
    if (window.location.hash) return;
    updateUrlHash(activeSection);
  }, [activeSection, router.isReady, sectionParam, updateUrlHash]);

  const handleSelectNav = useCallback(
    (key) => {
      setActiveSection(key);
      updateUrlHash(key);
    },
    [updateUrlHash]
  );

  const handleOpenSettings = useCallback(() => {
    setActiveSection('settings');
    updateUrlHash('settings');
  }, [updateUrlHash]);

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

  const resolvedSectionKey =
    normalizedRole === 'base_user' && activeSection === 'overview'
      ? 'applications'
      : activeSection;

  const activeNavItem = primaryNav.find((item) => item.key === activeSection);
  const sectionDescriptor = SECTION_DESCRIPTORS[resolvedSectionKey] || {
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
  const hideHeader = Boolean(sectionDescriptor.hideHeader);

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
        {!isOverviewSection && !hideHeader && (
          <header className="section-header">
            <h1 className="section-title">{sectionTitle}</h1>
            {sectionSubtitle && <p className="section-subtitle">{sectionSubtitle}</p>}
          </header>
        )}
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
          gap: 0;
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

        .applications-overview {
          position: relative;
          display: grid;
          gap: 1.75rem;
          padding: 2rem;
          border-radius: 1.25rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(236, 72, 153, 0.1));
          border: 1px solid rgba(148, 163, 184, 0.18);
          overflow: hidden;
        }

        .applications-overview::before {
          content: '';
          position: absolute;
          inset: -40% -20% auto -20%;
          height: 240px;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.2), transparent 70%);
          opacity: 0.65;
          pointer-events: none;
        }

        .applications-overview::after {
          content: '';
          position: absolute;
          inset: auto -25% -60% -25%;
          height: 320px;
          background: radial-gradient(circle at bottom, rgba(236, 72, 153, 0.18), transparent 70%);
          opacity: 0.6;
          pointer-events: none;
        }

        .applications-overview > * {
          position: relative;
          z-index: 1;
        }

        .applications-hero {
          display: grid;
          gap: 0.75rem;
          padding: 1.35rem 1.6rem;
          border-radius: 1.1rem;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.26);
          box-shadow: 0 16px 36px rgba(30, 41, 59, 0.16);
        }

        .applications-hero-pill {
          justify-self: flex-start;
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          font-weight: 600;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .applications-hero p {
          margin: 0;
          color: #0f172a;
          line-height: 1.65;
          font-size: 1.05rem;
        }

        .applications-hero strong {
          color: #1d4ed8;
        }

        .applications-metrics {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .applications-metric {
          display: grid;
          gap: 0.4rem;
          padding: 0.95rem 1.1rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.72);
          color: #e2e8f0;
          box-shadow: 0 20px 42px rgba(15, 23, 42, 0.28);
          border: 1px solid rgba(148, 163, 184, 0.28);
          backdrop-filter: blur(6px);
        }

        .applications-metric-label {
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          color: rgba(226, 232, 240, 0.75);
        }

        .applications-metric-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .applications-metric-note {
          font-size: 0.9rem;
          opacity: 0.76;
          margin: 0;
        }

        .applications-basic-grid {
          display: grid;
          gap: 1.1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .applications-basic-card {
          position: relative;
          display: grid;
          gap: 0.65rem;
          padding: 1.35rem 1.2rem 1.4rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(203, 213, 225, 0.7);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
          overflow: hidden;
        }

        .applications-basic-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.6;
          pointer-events: none;
        }

        .applications-basic-card--focus::before {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), transparent 70%);
        }

        .applications-basic-card--upcoming::before {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), transparent 70%);
        }

        .applications-basic-card--support::before {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), transparent 70%);
        }

        .applications-basic-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.6));
          border: 1px solid rgba(96, 165, 250, 0.6);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.25);
        }

        .applications-basic-card--upcoming .applications-basic-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.6));
          border-color: rgba(110, 231, 183, 0.6);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.24);
        }

        .applications-basic-card--support .applications-basic-icon {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(219, 39, 119, 0.6));
          border-color: rgba(251, 191, 185, 0.6);
          box-shadow: 0 12px 28px rgba(236, 72, 153, 0.25);
        }

        .applications-basic-label {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #475569;
        }

        .applications-basic-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .applications-basic-note {
          margin: 0;
          color: #475569;
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .applications-actions {
          display: grid;
          gap: 0.85rem;
          padding: 1.2rem 1.4rem 1.5rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.85);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.25);
        }

        .applications-actions h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
        }

        .applications-actions-list {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.6rem;
          list-style: none;
        }

        .applications-actions-list li {
          position: relative;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 0.85rem 1rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: #cbd5f5;
        }

        .applications-actions-list li::before {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #60a5fa, #a855f7);
          margin-top: 0.4rem;
          flex-shrink: 0;
        }

        .applications-actions-list span {
          line-height: 1.55;
        }

        @media (max-width: 720px) {
          .applications-overview {
            padding: 1.4rem;
          }
          .applications-hero {
            padding: 1.1rem 1.2rem;
          }
          .applications-metrics {
            grid-template-columns: 1fr;
          }
          .applications-basic-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .applications-overview {
            padding: 1.1rem;
            border-radius: 1rem;
          }
          .applications-basic-card {
            padding: 1rem 1rem 1.1rem;
          }
          .applications-actions {
            padding: 1rem 1.1rem 1.2rem;
          }
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
