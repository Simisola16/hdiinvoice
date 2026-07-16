/**
 * InvoiceTable
 * Displays invoice list with search/filter controls and paid/unpaid status.
 * Columns: Invoice No | Company | Date | Service | Grand Total | Created By | Status | Actions
 */
import { useState, useEffect, useCallback } from 'react';
import { getInvoices, getInvoicePdf, markInvoicePaid } from '../api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const InvoiceTable = ({ refreshKey }) => {
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(null); // invoice id being downloaded
  const [markingPaid, setMarkingPaid] = useState(null); // invoice id being toggled
  const [statusTab, setStatusTab]     = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [filters, setFilters]         = useState({
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
      if (statusTab === 'paid')   params.paid = 'true';
      if (statusTab === 'unpaid') params.paid = 'false';
      const res = await getInvoices(params);
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey, statusTab]);

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

  const handleTogglePaid = async (invoice) => {
    const action = invoice.paid ? 'Mark as Unpaid' : 'Mark as Paid';
    if (!window.confirm(`${action} invoice ${invoice.invoiceNumber}?`)) return;
    setMarkingPaid(invoice._id);
    try {
      const res = await markInvoicePaid(invoice._id);
      // Update local state immediately for snappy UX
      setInvoices((prev) =>
        prev.map((inv) =>
          inv._id === invoice._id
            ? { ...inv, paid: res.data.paid, paidAt: res.data.paidAt }
            : inv
        )
      );
    } catch (err) {
      alert('Failed to update payment status. Please try again.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* ── Status Tabs ──────────────────────────────────────────────────────── */}
      <div style={styles.tabRow}>
        {['all', 'paid', 'unpaid'].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tabBtn,
              ...(statusTab === tab ? styles.tabBtnActive : {}),
              ...(tab === 'paid' && statusTab === tab ? styles.tabBtnPaid : {}),
              ...(tab === 'unpaid' && statusTab === tab ? styles.tabBtnUnpaid : {}),
            }}
            onClick={() => setStatusTab(tab)}
          >
            {tab === 'all'    && '📋 All Invoices'}
            {tab === 'paid'   && '✅ Paid'}
            {tab === 'unpaid' && '⏳ Unpaid'}
          </button>
        ))}
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      <div style={styles.filterPanel}>
        <div className="filter-row">
          <div className="form-group filter-item filter-item-wide" style={{ marginBottom: 0 }}>
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
          <div className="form-group filter-item" style={{ marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input
              name="dateFrom"
              type="date"
              className="form-input"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group filter-item" style={{ marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input
              name="dateTo"
              type="date"
              className="form-input"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group filter-item" style={{ marginBottom: 0 }}>
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
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} style={inv.paid ? styles.paidRow : {}}>
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
                  {/* ── Status column ── */}
                  <td style={{ textAlign: 'center' }}>
                    {inv.paid ? (
                      <span style={styles.badgePaid}>✓ PAID</span>
                    ) : (
                      <span style={styles.badgeUnpaid}>⏳ UNPAID</span>
                    )}
                  </td>
                  {/* ── Actions column ── */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                      {/* PDF download */}
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleDownload(inv)}
                        disabled={downloading === inv._id}
                        title="Download PDF"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {downloading === inv._id
                          ? <div className="spinner spinner-sm" />
                          : '⬇ PDF'}
                      </button>
                      {/* Mark Paid / Unpaid */}
                      <button
                        className="btn btn-sm"
                        onClick={() => handleTogglePaid(inv)}
                        disabled={markingPaid === inv._id}
                        title={inv.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                        style={inv.paid ? styles.btnUnpaidAction : styles.btnPaidAction}
                      >
                        {markingPaid === inv._id
                          ? <div className="spinner spinner-sm" />
                          : inv.paid ? '↩ Unpaid' : '✓ Paid'}
                      </button>
                    </div>
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
  tabRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '7px 16px',
    border: '1.5px solid var(--gray-200)',
    borderRadius: '20px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    color: 'var(--gray-600)',
    transition: 'all 0.18s ease',
    letterSpacing: '0.01em',
  },
  tabBtnActive: {
    background: 'var(--hca-green)',
    color: '#fff',
    borderColor: 'var(--hca-green)',
    boxShadow: '0 2px 8px rgba(30,70,32,0.18)',
  },
  tabBtnPaid: {
    background: '#1b6b2b',
    borderColor: '#1b6b2b',
  },
  tabBtnUnpaid: {
    background: '#b7620a',
    borderColor: '#b7620a',
  },
  filterPanel: {
    background: 'var(--white)',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
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
  paidRow: {
    background: '#f0faf2',
    opacity: 0.92,
  },
  badgePaid: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    background: '#e6f9ec',
    color: '#1b6b2b',
    border: '1.5px solid #a8dfb8',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  badgeUnpaid: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    background: '#fff8ec',
    color: '#b7620a',
    border: '1.5px solid #f5c87a',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  btnPaidAction: {
    background: '#1b6b2b',
    color: '#fff',
    border: '1.5px solid #1b6b2b',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  btnUnpaidAction: {
    background: '#fff',
    color: '#b7620a',
    border: '1.5px solid #f5c87a',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
};

export default InvoiceTable;
