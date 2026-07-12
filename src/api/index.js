/**
 * Axios API instance
 * All requests go through the Vite proxy to http://localhost:5000/api
 * Credentials (cookies) are sent automatically.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,   // send httpOnly cookie on every request
});

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

export default api;
