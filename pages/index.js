import Header from '../components/Header';
import Reference from '../components/Reference';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import Overview from '../components/Overview';
import { env } from '../lib/config';

export async function getServerSideProps(context) {
  const { req } = context;
  const cookie = req.headers.cookie || '';

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = forwardedHost || req.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0] || 'http'
    : forwardedProto || 'http';

  let baseUrl;
  if (host) {
    baseUrl = `${proto}://${host}`;
  } else {
    baseUrl = env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:8000';
  }

  console.log('SSR home auth check', {
    baseUrl,
    host,
    forwardedHost,
    forwardedProto,
  });

  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const text = await res.text();
      if (text && text.trim()) {
        try {
          const data = JSON.parse(text);
          const user = data?.user || data?.data?.user || null;
          if (user) {
            // User is authenticated, redirect to dashboard
            return { redirect: { destination: '/dashboard', permanent: false } };
          }
        } catch (parseError) {
          // Invalid JSON, continue to show home page
          console.error('JSON parse error during home auth check:', parseError);
        }
      }
    }
  } catch (error) {
    // If there's an error checking auth, just continue to show home page
    console.error('Auth check error in home getServerSideProps:', {
      error,
      baseUrl,
    });
  }
  
  // No user session, show home page
  return { props: {} };
}

export default function Home() {
  return (
    <div className="home">
      <Header />
      <main>
        <Overview />
        <Reference
          stats={[
            '4.9 rated on Google',
            'Serving homeowners and businesses across Calgary year‑round',
          ]}
        />
        <CTA />
      </main>
      <Footer />
      <style jsx>{`
        .home { 
          background: #fff;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          width: 100%;
          position: relative;
        }
        .home main {
          flex: 1;
          width: 100%;
        }
        @media (max-width: 768px) {
          .home {
            overflow-x: hidden;
          }
          .home main {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}

