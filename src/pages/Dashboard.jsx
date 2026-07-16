/**
 * Dashboard
 * Main application screen after login.
 * Features: Navbar, Stats cards, Action buttons, Invoice table.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../api';
import InvoiceTable from '../components/InvoiceTable';
import AddCompanyModal from '../components/AddCompanyModal';
import GenerateInvoiceModal from '../components/GenerateInvoiceModal';
import AddUserModal from '../components/AddUserModal';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'addCompany' | 'generateInvoice' | 'addUser'
  const [tableKey, setTableKey] = useState(0); // increment to force table refresh
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, totalAmount: 0, totalPaid: 0, totalUnpaid: 0 });
  const [toastMsg, setToastMsg] = useState('');

  // ── Load stats ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await getInvoices();
        const invoices = res.data;
        const now = new Date();
        const thisMonth = invoices.filter((inv) => {
          const d = new Date(inv.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalPaid = invoices.filter((inv) => inv.paid).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalUnpaid = invoices.filter((inv) => !inv.paid).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        setStats({
          total: invoices.length,
          thisMonth: thisMonth.length,
          totalAmount,
          totalPaid,
          totalUnpaid
        });
      } catch {}
    };
    loadStats();
  }, [tableKey]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={styles.page}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.navLogo}>
            <img src="/hcaLogo.png" alt="HCA Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={styles.navTitle}>HALAL AND HARAM DISTINCTION DEVELOPMENT INITIATIVE (HDi)</div>
            <div style={styles.navSub}>Invoice Management System</div>
          </div>
        </div>
        <div style={styles.navRight}>
          <div style={styles.navUser}>
            <div style={styles.navAvatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="nav-user-text">
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                {user?.role === 'superadmin' ? '★ Superadmin' : 'Staff'}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={styles.content}>
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <p style={styles.pageSubtitle}>
              Welcome back, <strong>{user?.name}</strong> — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Action buttons */}
          <div style={styles.actionRow}>
            {user?.role === 'superadmin' && (
              <button className="btn btn-secondary btn-action" onClick={() => setModal('addUser')}>
                👤 Add User
              </button>
            )}
            <button className="btn btn-gold btn-action" onClick={() => setModal('generateInvoice')}>
              📄 Create Invoice
            </button>
          </div>
        </div>

        {/* ── Stats cards ──────────────────────────────────────────────────── */}
        <div style={styles.statsGrid}>
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Invoices</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: 'var(--hca-gold)' }}>
            <div className="stat-value" style={{ color: 'var(--hca-gold)' }}>{stats.thisMonth}</div>
            <div className="stat-label">This Month</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#7a9a7a' }}>
            <div className="stat-value" style={{ fontSize: '20px', color: 'var(--text-primary)' }}>₦{fmt(stats.totalAmount)}</div>
            <div className="stat-label">Total Invoiced</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#1b6b2b' }}>
            <div className="stat-value" style={{ fontSize: '20px', color: '#1b6b2b' }}>₦{fmt(stats.totalPaid)}</div>
            <div className="stat-label">Total Paid</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#b7620a' }}>
            <div className="stat-value" style={{ fontSize: '20px', color: '#b7620a' }}>₦{fmt(stats.totalUnpaid)}</div>
            <div className="stat-label">Total Outstanding</div>
          </div>
        </div>

        {/* ── Invoice table ─────────────────────────────────────────────────── */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--hca-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Invoice Records
            </div>
          </div>
          <div className="card-body">
            <InvoiceTable refreshKey={tableKey} />
          </div>
        </div>
      </div>

      {/* ── Toast notification ────────────────────────────────────────────── */}
      {toastMsg && (
        <div style={styles.toast}>
          ✓ {toastMsg}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {modal === 'addCompany' && (
        <AddCompanyModal
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('Company added successfully!'); }}
        />
      )}
      {modal === 'generateInvoice' && (
        <GenerateInvoiceModal
          onClose={() => setModal(null)}
          onSuccess={() => { setTableKey((k) => k + 1); showToast('Invoice generated and downloaded!'); }}
        />
      )}
      {modal === 'addUser' && (
        <AddUserModal
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('User created successfully!'); }}
        />
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--gray-50)',
  },
  navbar: {
    background: 'linear-gradient(90deg, var(--hca-green) 0%, #2d6a31 100%)',
    padding: '0 20px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 12px rgba(30,70,32,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: '8px',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
  },
  navLogo: {
    width: '38px',
    height: '38px',
    minWidth: '38px',
    borderRadius: '50%',
    background: '#fff',
    border: '2px solid var(--hca-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  navTitle: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  navSub: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navAvatar: {
    width: '34px',
    height: '34px',
    minWidth: '34px',
    borderRadius: '50%',
    background: 'var(--hca-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    color: '#fff',
  },
  logoutBtn: {
    borderColor: 'rgba(255,255,255,0.4)',
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    padding: '6px 12px',
    fontSize: '13px',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 16px 40px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--hca-green)',
    lineHeight: '1.2',
  },
  pageSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },
  toast: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    left: '20px',
    maxWidth: '380px',
    margin: '0 auto',
    background: 'var(--hca-green)',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 8px 24px rgba(30,70,32,0.35)',
    zIndex: 2000,
    animation: 'slideUp 0.3s ease',
    textAlign: 'center',
  },
};

export default Dashboard;

