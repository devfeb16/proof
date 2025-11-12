import { useEffect, useMemo, useState } from 'react';

export default function SettingsPanel({ user, onProfileUpdated }) {
  const [profileName, setProfileName] = useState(user?.name || '');
  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const disableProfileSubmit = useMemo(() => {
    const trimmed = profileName.trim();
    return profileLoading || !trimmed || trimmed === user?.name;
  }, [profileLoading, profileName, user?.name]);

  const disablePasswordSubmit = useMemo(() => {
    return (
      passwordLoading ||
      !passwords.currentPassword ||
      !passwords.newPassword ||
      passwords.newPassword.length < 6 ||
      passwords.newPassword !== passwords.confirm
    );
  }, [passwordLoading, passwords]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (disableProfileSubmit) return;
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to update profile');
      }

      setProfileMessage({ type: 'success', text: result?.message || 'Profile updated' });
      if (result?.data?.user && typeof onProfileUpdated === 'function') {
        onProfileUpdated(result.data.user);
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: error.message || 'Update failed' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (disablePasswordSubmit) return;
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const response = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to update password');
      }

      setPasswordMessage({ type: 'success', text: result?.message || 'Password updated' });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error.message || 'Update failed' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="settings-grid">
      <section className="settings-card">
        <header>
          <h2>Profile</h2>
          <p>Update how your name appears across the dashboard.</p>
        </header>
        <form onSubmit={handleProfileSubmit} className="form">
          <label className="field">
            <span className="label">Display name</span>
            <input
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Your name"
            />
          </label>

          {profileMessage && (
            <p className={`message message--${profileMessage.type}`}>{profileMessage.text}</p>
          )}

          <button type="submit" disabled={disableProfileSubmit}>
            {profileLoading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="settings-card">
        <header>
          <h2>Password</h2>
          <p>Keep your account secure by updating your password regularly.</p>
        </header>
        <form onSubmit={handlePasswordSubmit} className="form">
          <label className="field">
            <span className="label">Current password</span>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              placeholder="Enter current password"
            />
          </label>

          <label className="field">
            <span className="label">New password</span>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              placeholder="At least 6 characters"
            />
          </label>

          <label className="field">
            <span className="label">Confirm password</span>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
              }
              placeholder="Re-enter new password"
            />
          </label>

          {passwords.newPassword &&
            passwords.confirm &&
            passwords.newPassword !== passwords.confirm && (
              <p className="message message--error">New passwords do not match.</p>
            )}

          {passwordMessage && (
            <p className={`message message--${passwordMessage.type}`}>{passwordMessage.text}</p>
          )}

          <button type="submit" disabled={disablePasswordSubmit}>
            {passwordLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .settings-grid {
          display: grid;
          gap: 1.75rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .settings-card {
          background: white;
          border-radius: 1.1rem;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          padding: 1.9rem;
          display: grid;
          gap: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .settings-card header {
          display: grid;
          gap: 0.4rem;
        }

        .settings-card h2 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #0f172a;
        }

        .settings-card p {
          color: #607089;
          line-height: 1.6;
        }

        .form {
          display: grid;
          gap: 1.1rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .field {
          display: grid;
          gap: 0.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1e293b;
        }

        input {
          width: 100%;
          max-width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.4);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          background: #f8fafc;
          transition: border 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.6);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
          background: #fff;
        }

        button {
          justify-self: start;
          border: none;
          border-radius: 0.75rem;
          padding: 0.75rem 1.4rem;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        button:hover:not(:disabled),
        button:focus-visible:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
          outline: none;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .message {
          font-size: 0.9rem;
        }

        .message--success {
          color: #047857;
        }

        .message--error {
          color: #dc2626;
        }

        @media (max-width: 960px) {
          .settings-grid {
            gap: 1.25rem;
          }
          .settings-card {
            padding: 1.5rem;
            gap: 1.25rem;
          }
        }

        @media (max-width: 640px) {
          .settings-grid {
            gap: 1rem;
          }
          .settings-card {
            padding: 1.25rem;
            gap: 1rem;
            border-radius: 0.9rem;
          }
          .settings-card header {
            gap: 0.35rem;
          }
          .settings-card h2 {
            font-size: 1.1rem;
          }
          .settings-card p {
            font-size: 0.9rem;
          }
          .form {
            gap: 0.95rem;
          }
          .field {
            gap: 0.45rem;
          }
          .label {
            font-size: 0.875rem;
          }
          input {
            padding: 0.7rem 0.875rem;
            font-size: 0.9rem;
            border-radius: 0.65rem;
          }
          button {
            width: 100%;
            justify-self: stretch;
            padding: 0.7rem 1.2rem;
            font-size: 0.9rem;
          }
          .message {
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .settings-card {
            padding: 1rem;
            gap: 0.875rem;
            border-radius: 0.8rem;
          }
          .settings-card h2 {
            font-size: 1rem;
          }
          .settings-card p {
            font-size: 0.85rem;
          }
          .form {
            gap: 0.875rem;
          }
          input {
            padding: 0.65rem 0.8rem;
            font-size: 0.875rem;
          }
          button {
            padding: 0.65rem 1.1rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

