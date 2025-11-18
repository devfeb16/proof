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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordHint = password && password.length < 6 ? 'Use at least 6 characters.' : '';

  const isDisabled = useMemo(() => {
    return (
      loading ||
      !name.trim() ||
      !email.trim() ||
      password.length < 6
    );
  }, [name, email, password, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    if (isDisabled) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      
      const text = await res.text();
      let data = {};
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          // Invalid JSON response
          throw new Error("We couldn't create your account. Please try again.");
        }
      }
      
      if (!res.ok || !data.success) {
        throw new Error(formatErrorMessage(data, "We couldn't create your account. Please try again."));
      }
      
      // Small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 150));
      // Use replace instead of push to avoid adding to browser history
      await router.replace('/dashboard');
    } catch (err) {
      setError(err.message || "We couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="auth-shell">
        <div className="auth-card">
          <header className="card-header">
            <h1>Create your account</h1>
            <p>Join Proof Response to unlock your personalized funding insights.</p>
          </header>

          {error && (
            <div className="alert" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="form" noValidate>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </label>
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
                autoComplete="new-password"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              {passwordHint && <small className="helper">{passwordHint}</small>}
            </label>
            <button type="submit" disabled={isDisabled}>
              {loading && <span className="spinner" aria-hidden="true" />}
              <span>{loading ? 'Creating your space…' : 'Create Account'}</span>
            </button>
          </form>

          <footer className="card-footer">
            <span>Already registered?</span>
            <Link href="/login" className="cta-link">
              Sign in instead
            </Link>
          </footer>

          <div className="internal-notice">
            <p>
              <strong>Internal Tool Only</strong>
            </p>
            <p>
              This dashboard and authentication system is reserved for internal team members only. 
              If you are not part of the internal team, you do not need to access these pages.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-shell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 1.5rem 4rem;
          background: radial-gradient(circle at top, rgba(0, 176, 117, 0.12), transparent 55%),
            radial-gradient(circle at bottom, rgba(0, 112, 243, 0.14), transparent 45%);
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.6rem 2.6rem 2.25rem;
          border-radius: 1.6rem;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 26px 68px rgba(12, 54, 102, 0.16);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: 1.85rem;
          animation: fadeIn 0.45s ease 0.05s both;
        }
        .card-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #0f1c2f;
          margin-bottom: 0.5rem;
        }
        .card-header p {
          color: #516276;
          line-height: 1.55;
        }
        .alert {
          border-radius: 0.8rem;
          padding: 0.8rem 1rem;
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(220, 38, 38, 0.22);
          font-weight: 500;
        }
        .form {
          display: grid;
          gap: 1.35rem;
        }
        .field {
          display: grid;
          gap: 0.6rem;
        }
        .field span {
          font-weight: 600;
          color: #0f1c2f;
          font-size: 0.94rem;
        }
        input {
          padding: 0.95rem 1rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(13, 48, 89, 0.14);
          background: #fff;
          font-size: 1rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        input:focus {
          outline: none;
          border-color: rgba(0, 176, 117, 0.55);
          box-shadow: 0 0 0 4px rgba(0, 176, 117, 0.15);
        }
        input:disabled {
          background: #f5f7fb;
        }
        .helper {
          font-size: 0.8rem;
          color: #6b7280;
        }
        button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          padding: 1rem 1.3rem;
          border-radius: 1rem;
          border: none;
          background: linear-gradient(135deg, #00a86b, #00c2a8);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(0, 176, 117, 0.28);
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
          gap: 0.55rem;
          font-size: 0.96rem;
          color: #516276;
        }
        .cta-link {
          color: #0070f3;
          font-weight: 600;
          text-decoration: none;
        }
        .cta-link:hover {
          text-decoration: underline;
        }
        .internal-notice {
          margin-top: 1.5rem;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          text-align: center;
        }
        .internal-notice p {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #78350f;
        }
        .internal-notice p:first-child {
          margin-bottom: 0.5rem;
        }
        .internal-notice strong {
          font-weight: 600;
          color: #92400e;
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
            padding: 2.1rem 1.75rem 2rem;
            border-radius: 1.35rem;
          }
          .card-header h1 {
            font-size: 1.75rem;
          }
          .card-header p {
            font-size: 0.9rem;
          }
          .internal-notice {
            padding: 0.875rem 1rem;
            margin-top: 1.25rem;
          }
          .internal-notice p {
            font-size: 0.8rem;
          }
        }
        @media (max-width: 480px) {
          .auth-shell {
            padding: 3rem 1rem 2.5rem;
          }
          .auth-card {
            padding: 1.85rem 1.5rem 1.75rem;
            gap: 1.5rem;
          }
          .card-header h1 {
            font-size: 1.6rem;
          }
          .form {
            gap: 1.15rem;
          }
          input {
            padding: 0.85rem 0.95rem;
            font-size: 0.95rem;
          }
          button {
            padding: 0.95rem 1.2rem;
            font-size: 0.95rem;
          }
          .internal-notice {
            padding: 0.75rem 0.875rem;
            margin-top: 1rem;
          }
          .internal-notice p {
            font-size: 0.75rem;
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

