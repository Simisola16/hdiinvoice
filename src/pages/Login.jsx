/**
 * Login Page
 * Clean, professional login form with HCA branding.
 * Username + password only — no email, no self-signup.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background decorative circles */}
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brandSection}>
          <div style={styles.logoPlaceholder}>
            <span style={styles.logoText}>HCA</span>
          </div>
          <div>
            <h1 style={styles.brandTitle}>HALAL CERTIFICATION</h1>
            <h1 style={styles.brandTitleGold}>AUTHORITY</h1>
            <p style={styles.brandSub}>Invoice Management System</p>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.heading}>Sign In</h2>
        <p style={styles.subheading}>Enter your credentials to continue</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username <span className="required">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '8px', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                Signing in…
              </>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p style={styles.footer}>
          Halal &amp; Haram Distinction Development Initiative (HDI)
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e4620 0%, #2d6a31 50%, #1e4620 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)',
    top: '-100px',
    right: '-100px',
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(212,160,23,0.08)',
    bottom: '-80px',
    left: '-80px',
    pointerEvents: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    position: 'relative',
    zIndex: 1,
  },
  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  logoPlaceholder: {
    width: '60px',
    height: '60px',
    minWidth: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e4620, #4e7a3e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid #d4a017',
  },
  logoText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: '18px',
    fontFamily: 'Arial Black, sans-serif',
    letterSpacing: '1px',
  },
  brandTitle: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#1e4620',
    lineHeight: '1.2',
    letterSpacing: '0.5px',
  },
  brandTitleGold: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#d4a017',
    lineHeight: '1.2',
    letterSpacing: '0.5px',
  },
  brandSub: {
    fontSize: '11px',
    color: '#7a9a7a',
    marginTop: '3px',
  },
  divider: {
    height: '3px',
    background: 'linear-gradient(to right, #1e4620, #d4a017, #1e4620)',
    borderRadius: '2px',
    marginBottom: '24px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1a2e1a',
    marginBottom: '4px',
  },
  subheading: {
    fontSize: '13px',
    color: '#7a9a7a',
    marginBottom: '20px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#7a9a7a',
    marginTop: '24px',
    borderTop: '1px solid #f0f4f0',
    paddingTop: '16px',
  },
};

export default Login;
