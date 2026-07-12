/**
 * InvoiceTable
 * Displays invoice list with search/filter controls.
 * Columns: Invoice No | Company | Date | Grand Total | Created By | Actions
 */
import { useState, useEffect, useCallback } from 'react';
import { getInvoices, getInvoicePdf } from '../api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const InvoiceTable = ({ refreshKey }) => {
  const [invoices, setInvoices]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [downloading, setDownloading] = useState(null); // invoice id being downloaded
  const [filters, setFilters]       = useState({
    dateFrom: '', dateTo: '', amount: '', companyName: '',
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.dateFrom)    params.dateFrom    = filters.dateFrom;
      if (filters.dateTo)      params.dateTo      = filters.dateTo;
      if (filters.amount)      params.amount      = filters.amount;
      if (filters.companyName) params.companyName = filters.companyName;
      const res = await getInvoices(params);
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleFilterChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const clearFilters = () =>
    setFilters({ dateFrom: '', dateTo: '', amount: '', companyName: '' });

  const handleDownload = async (invoice) => {
    setDownloading(invoice._id);
    try {
      const res = await getInvoicePdf(invoice._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      <div style={styles.filterPanel}>
        <div style={styles.filterRow}>
          <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
            <label className="form-label">Company Name</label>
            <input
              name="companyName"
              type="text"
              className="form-input"
              placeholder="Search by company…"
              value={filters.companyName}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">From Date</label>
            <input
              name="dateFrom"
              type="date"
              className="form-input"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">To Date</label>
            <input
              name="dateTo"
              type="date"
              className="form-input"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Amount (₦)</label>
            <input
              name="amount"
              type="number"
              className="form-input"
              placeholder="Amount"
              value={filters.amount}
              onChange={handleFilterChange}
            />
          </div>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ alignSelf: 'flex-end', marginBottom: 0 }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results summary ────────────────────────────────────────────────── */}
      <div style={styles.resultMeta}>
        {loading ? (
          <span className="text-muted">Loading…</span>
        ) : (
          <span className="text-muted">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
            {hasActiveFilters ? ' (filtered)' : ''}
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-center" style={{ padding: '48px' }}>
          <div className="spinner" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>{hasActiveFilters ? 'No invoices match your filters.' : 'No invoices yet. Generate your first one!'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="hca-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Company</th>
                <th>Date</th>
                <th>Service</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th>Created By</th>
                <th style={{ textAlign: 'center' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <span style={styles.invoiceNo}>{inv.invoiceNumber}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.company?.name || '—'}</div>
                    {inv.company?.contact && (
                      <div className="text-muted" style={{ fontSize: '12px' }}>{inv.company.contact}</div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(inv.date)}</td>
                  <td style={{ fontSize: '13px' }}>
                    {inv.items && inv.items.length > 0
                      ? `${inv.items[0].description}${inv.items.length > 1 ? ` (+${inv.items.length - 1})` : ''}`
                      : inv.serviceDescription || '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--hca-green)', whiteSpace: 'nowrap' }}>
                    ₦{fmt(inv.grandTotal)}
                  </td>
                  <td>
                    <span className="badge badge-green">{inv.createdBy}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleDownload(inv)}
                      disabled={downloading === inv._id}
                      title="Download PDF"
                    >
                      {downloading === inv._id
                        ? <div className="spinner spinner-sm" />
                        : '⬇ PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  filterPanel: {
    background: 'var(--white)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  resultMeta: {
    marginBottom: '8px',
    padding: '0 4px',
    fontSize: '13px',
  },
  invoiceNo: {
    fontFamily: 'monospace',
    fontWeight: 700,
    color: 'var(--hca-green)',
    background: 'var(--hca-mint)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
};

export default InvoiceTable;
