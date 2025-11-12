import Header from '../components/Header';
import Hero from '../components/Hero';
import Reference from '../components/Reference';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import Overview from '../components/Overview';

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
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      const user = data?.user || data?.data?.user || null;
      if (user) {
        // User is authenticated, redirect to dashboard
        return { redirect: { destination: '/dashboard', permanent: false } };
      }
    }
  } catch (error) {
    // If there's an error checking auth, just continue to show home page
    console.error('Auth check error:', error);
  }
  
  // No user session, show home page
  return { props: {} };
}

export default function Home() {
  return (
    <div className="home">
      <Header />
      <main>
        <Hero
          intro="This platform extends PipeProof's main website by automating the discovery and structuring of grants, rebates, RFPs, RFQs, bursaries, and co-marketing funds across B2B and B2C markets. It ensures every opportunity is structured, scored, and ready for activation by the Proof360 ecosystem."
        />
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
        .home { background: #fff; }
      `}</style>
    </div>
  );
}

