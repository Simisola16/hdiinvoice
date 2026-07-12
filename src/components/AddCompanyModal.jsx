/**
 * AddCompanyModal
 * Modal form to add a new client company.
 * Fields: Company Name, Contact (address), Tel.
 */
import { useState } from 'react';
import { createCompany, getErrorMessage } from '../api';

const AddCompanyModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', contact: '', tel: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Company name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createCompany(form);
      onSuccess(res.data.company);
      onClose();
      setError(getErrorMessage(err, 'Failed to add company.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <span>🏢</span> Add Company
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="cname">
                Company Name <span className="required">*</span>
              </label>
              <input
                id="cname"
                name="name"
                type="text"
                className="form-input"
                placeholder="e.g. BUA FOODS PLC"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact">
                Contact / Address
              </label>
              <input
                id="contact"
                name="contact"
                type="text"
                className="form-input"
                placeholder="e.g. PC 32 Church Gate Street, Lagos Island"
                value={form.contact}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tel">
                Tel / Phone
              </label>
              <input
                id="tel"
                name="tel"
                type="text"
                className="form-input"
                placeholder="e.g. 08012345678"
                value={form.tel}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner spinner-sm" /> Saving…</> : '✓ Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;
