/**
 * Axios API instance
 * All requests go through the Vite proxy to http://localhost:5000/api
 * Credentials (cookies) are sent automatically.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? '/api'
      : 'https://hdiinvoiceapi.onrender.com/api'
  ),
  withCredentials: true,   // send httpOnly cookie on every request
});

export const getErrorMessage = (err, fallback = 'An error occurred. Please try again.') => {
  const data = err.response?.data;
  if (!data) return err.message || fallback;
  if (typeof data === 'string') {
    if (data.trim().startsWith('<!DOCTYPE') || data.includes('<html')) {
      return fallback;
    }
    return data;
  }
  if (data.error) {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.error === 'object' && data.error.message) return data.error.message;
  }
  if (data.message) return data.message;
  return fallback;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);

// ─── Companies ────────────────────────────────────────────────────────────────
export const getCompanies = (search = '') =>
  api.get('/companies', { params: search ? { search } : {} });
export const createCompany = (data) => api.post('/companies', data);
/** Fetch locally-stored contact details for a company by exact name.
 *  Used to auto-fill Address/Tel/ContactPerson when a company is selected
 *  from the external HDI portal list (which doesn't carry those fields). */
export const lookupCompany = (name) =>
  api.get('/companies/lookup', { params: { name } });

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const getInvoices = (params = {}) => api.get('/invoices', { params });

/**
 * Creates an invoice and returns the PDF blob for download.
 * responseType: 'blob' is critical — the server streams binary PDF.
 */
export const createInvoice = (data) =>
  api.post('/invoices', data, { responseType: 'blob' });

/**
 * Fetches the PDF for an existing invoice (on-demand regeneration).
 */
export const getInvoicePdf = (id) =>
  api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });

/**
 * Toggles the paid status of an invoice.
 */
export const markInvoicePaid = (id) =>
  api.patch(`/invoices/${id}/paid`);


export default api;
