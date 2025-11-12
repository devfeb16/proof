import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

function formatErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  const detail =
    typeof payload.error === 'string'
      ? payload.error
      : Array.isArray(payload.error)
      ? payload.error.join(', ')
      : '';
  if (detail) {
    return `${payload.message || fallback}: ${detail}`;
  }
  return payload.message || fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDisabled = useMemo(() => {
    return loading || !email.trim() || password.length < 6;
  }, [email, password, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    if (isDisabled) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(formatErrorMessage(data, 'We couldn’t sign you in with those credentials.'));
      }
      await router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'We couldn’t sign you in with those credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="auth-shell">
        <div className="auth-card">
          <header className="card-header">
            <h1>Welcome back</h1>
            <p>Sign in to access your funding intelligence dashboard.</p>
          </header>

          {error && (
            <div className="alert" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="form" noValidate>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </label>
            <button type="submit" disabled={isDisabled}>
              {loading && <span className="spinner" aria-hidden="true" />}
              <span>{loading ? 'Signing you in…' : 'Sign In'}</span>
            </button>
          </form>

          <footer className="card-footer">
            <span>Need an account?</span>
            <Link href="/signup" className="cta-link">
              Create one here
            </Link>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .auth-shell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 1.5rem 4rem;
          background: radial-gradient(circle at top, rgba(0, 112, 243, 0.15), transparent 55%),
            radial-gradient(circle at bottom, rgba(35, 159, 255, 0.12), transparent 40%);
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2.5rem 2rem;
          border-radius: 1.5rem;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 24px 60px rgba(15, 35, 95, 0.12);
          backdrop-filter: blur(6px);
          animation: fadeIn 0.45s ease 0.05s both;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .card-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #102a43;
          margin-bottom: 0.35rem;
        }
        .card-header p {
          color: #4b5d73;
          line-height: 1.5;
        }
        .alert {
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(220, 38, 38, 0.24);
          font-weight: 500;
        }
        .form {
          display: grid;
          gap: 1.25rem;
        }
        .field {
          display: grid;
          gap: 0.55rem;
        }
        .field span {
          font-weight: 600;
          color: #0f1c2f;
          font-size: 0.94rem;
        }
        input {
          padding: 0.9rem 1rem;
          border-radius: 0.9rem;
          border: 1px solid rgba(15, 35, 95, 0.12);
          background: #fff;
          font-size: 1rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        input:focus {
          outline: none;
          border-color: rgba(0, 112, 243, 0.55);
          box-shadow: 0 0 0 4px rgba(0, 112, 243, 0.12);
        }
        input:disabled {
          background: #f5f7fb;
        }
        button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          padding: 0.95rem 1.25rem;
          border-radius: 0.95rem;
          border: none;
          background: linear-gradient(135deg, #0070f3, #3291ff);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(0, 112, 243, 0.25);
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.72;
          box-shadow: none;
        }
        .spinner {
          width: 1rem;
          height: 1rem;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          animation: spin 0.65s linear infinite;
        }
        .card-footer {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          color: #4b5d73;
        }
        .cta-link {
          color: #0070f3;
          font-weight: 600;
          text-decoration: none;
        }
        .cta-link:hover {
          text-decoration: underline;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 600px) {
          .auth-shell {
            padding: 4rem 1rem 3rem;
          }
          .auth-card {
            padding: 2rem 1.65rem;
            border-radius: 1.25rem;
          }
          .card-header h1 {
            font-size: 1.75rem;
          }
          .card-header p {
            font-size: 0.9rem;
          }
        }
        @media (max-width: 480px) {
          .auth-shell {
            padding: 3rem 1rem 2.5rem;
          }
          .auth-card {
            padding: 1.75rem 1.5rem;
            gap: 1.5rem;
          }
          .card-header h1 {
            font-size: 1.6rem;
          }
          .form {
            gap: 1.1rem;
          }
          input {
            padding: 0.85rem 0.95rem;
            font-size: 0.95rem;
          }
          button {
            padding: 0.9rem 1.15rem;
            font-size: 0.95rem;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-card {
            animation: none;
          }
          button,
          input {
            transition: none;
          }
          .spinner {
            animation-duration: 1s;
          }
        }
      `}</style>
    </Layout>
  );
}

