/**
 * AddUserModal (superadmin only)
 * Creates a new staff user with: Name, Email, Username, Password.
 */
import { useState } from 'react';
import { createUser, getErrorMessage } from '../api';

const AddUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, username, password } = form;
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createUser(form);
      onSuccess?.(res.data.user);
      onClose();
      setError(getErrorMessage(err, 'Failed to create user.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <span>👤</span> Add Staff User
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <span>ℹ️</span> New users will be created as <strong>Staff</strong> — they can generate invoices and add companies, but cannot manage other users.
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="uname">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  id="uname"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aisha Mohammed"
                  value={form.name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="uemail">
                  Email <span className="required">*</span>
                </label>
                <input
                  id="uemail"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. aisha@hdi.ng"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="uusername">
                  Username <span className="required">*</span>
                </label>
                <input
                  id="uusername"
                  name="username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. aisha"
                  value={form.username}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="upassword">
                  Password <span className="required">*</span>
                </label>
                <input
                  id="upassword"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner spinner-sm" /> Creating…</> : '✓ Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
