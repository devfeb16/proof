import Layout from '../components/Layout';

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

export default function Dashboard({ user }) {
  return (
    <Layout>
      <div className="dash">
        <div className="container">
          <h1>Dashboard</h1>
          <p>Welcome, {user.name}!</p>
        </div>
      </div>
      <style jsx>{`
        .dash { padding: 4rem 0; }
        .container { max-width: 960px; margin: 0 auto; padding: 0 2rem; }
        h1 { margin-bottom: 1rem; }
      `}</style>
    </Layout>
  );
}


