/**
 * GenerateInvoiceModal
 * Full invoice generation form supporting multiple line items, live calculations,
 * and a professional interactive Document Preview tab before generating.
 * On submit: POST to backend → triggers PDF download.
 */
import { useState, useEffect, useCallback } from 'react';
import { getCompanies, createInvoice, getErrorMessage } from '../api';

// Format a number with commas and 2 decimal places
const fmt = (n) => Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Format date as YYYY-MM-DD for input[type=date]
const toInputDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split('T')[0];
};

// Frontend number to words conversion for preview
const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

const convertLessThanOneThousand = (n) => {
  if (n === 0) return '';
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' HUNDRED ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 100)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + ' ';
  }
  return str.trim();
};

const numberToWords = (num) => {
  const intAmount = Math.round(num);
  if (intAmount === 0) return 'ZERO NAIRA ONLY';
  let temp = intAmount;
  let scaleIdx = 0;
  let result = '';
  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkStr = convertLessThanOneThousand(chunk);
      const scaleStr = scales[scaleIdx] ? ' ' + scales[scaleIdx] : '';
      result = chunkStr + scaleStr + (result ? ', ' + result : '');
    }
    temp = Math.floor(temp / 1000);
    scaleIdx++;
  }
  return result.trim() + ' NAIRA ONLY';
};

const GenerateInvoiceModal = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [companies, setCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [vatPercent, setVatPercent] = useState('7.5');
  const [date, setDate] = useState(toInputDate(new Date()));
  const [items, setItems] = useState([{ description: 'HALAL CERTIFICATION', rate: '', qty: '1' }]);
  const [calc, setCalc] = useState({ subTotal: 0, vatAmount: 0, grandTotal: 0 });
  const [loading, setLoading] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const [error, setError] = useState('');

  // ── Load companies ─────────────────────────────────────────────────────────
  const loadCompanies = useCallback(async (search = '') => {
    setFetchingCompanies(true);
    try {
      const res = await getCompanies(search);
      setCompanies(res.data);
    } catch {
      // non-critical
    } finally {
      setFetchingCompanies(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // ── Live calculation ───────────────────────────────────────────────────────
  useEffect(() => {
    let subTotal = 0;
    items.forEach((item) => {
      const r = parseFloat(item.rate) || 0;
      const q = parseFloat(item.qty) || 0;
      subTotal += r * q;
    });
    const vatPct = parseFloat(vatPercent) || 0;
    const vatAmount = parseFloat((subTotal * (vatPct / 100)).toFixed(2));
    const grandTotal = parseFloat((subTotal + vatAmount).toFixed(2));
    setCalc({ subTotal, vatAmount, grandTotal });
  }, [items, vatPercent]);

  // ── Multiple Items Handlers ────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
    setError('');
  };

  const handleAddItem = () => {
    setItems((prevItems) => [...prevItems, { description: '', rate: '', qty: '1' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems((prevItems) => prevItems.filter((_, i) => i !== index));
    }
  };

  // Format date to HCA standard format: "12TH/JULY/2026"
  const formatDatePreview = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    const j = day % 10, k = day % 100;
    let suffix = 'TH';
    if (j === 1 && k !== 11) suffix = 'ST';
    else if (j === 2 && k !== 12) suffix = 'ND';
    else if (j === 3 && k !== 13) suffix = 'RD';

    return `${day}${suffix}/${month}/${year}`;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) { setError('Please select a company.'); return; }

    // Validate all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description.trim()) {
        setError(`Item #${i + 1} description is required.`);
        return;
      }
      const r = parseFloat(item.rate);
      if (isNaN(r) || r <= 0) {
        setError(`Item #${i + 1} rate must be greater than 0.`);
        return;
      }
      const q = parseFloat(item.qty);
      if (isNaN(q) || q <= 0) {
        setError(`Item #${i + 1} quantity must be greater than 0.`);
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const res = await createInvoice({
        companyId,
        items: items.map(item => ({
          description: item.description.trim(),
          rate: parseFloat(item.rate),
          qty: parseFloat(item.qty)
        })),
        vatPercent: parseFloat(vatPercent),
        date,
      });

      // Trigger PDF download
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      link.href = url;
      link.download = match?.[1] || 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      onSuccess?.();
      onClose();
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          const errorMsg = typeof json.error === 'string'
            ? json.error
            : (json.error?.message || 'Failed to generate invoice.');
          setError(errorMsg);
        } catch {
          setError('Failed to generate invoice. Please try again.');
        }
      } else {
        setError(getErrorMessage(err, 'Failed to generate invoice.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <span>📄</span> Generate Invoice
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Tab Selection Header */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{ ...styles.tab, ...(activeTab === 'edit' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('edit')}
          >
            ✏️ Edit Details
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(activeTab === 'preview' ? styles.activeTab : {}) }}
            onClick={() => {
              if (!companyId) {
                setError('Please search and select a client company first.');
                return;
              }
              // Basic item validation before letting them preview
              for (let i = 0; i < items.length; i++) {
                if (!items[i].description.trim() || !items[i].rate || parseFloat(items[i].rate) <= 0) {
                  setError('Please fill in valid descriptions and rates for all items to see preview.');
                  return;
                }
              }
              setError('');
              setActiveTab('preview');
            }}
          >
            👁️ Preview Document
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', padding: activeTab === 'preview' ? '12px' : '20px' }}>
            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}><span>⚠️</span> {error}</div>}

            {/* TAB 1: EDIT FORM */}
            {activeTab === 'edit' && (
              <>
                {/* Company select */}
                <div className="form-group">
                  <label className="form-label" htmlFor="companySearch">
                    Client Company <span className="required">*</span>
                  </label>
                  <input
                    id="companySearch"
                    type="text"
                    className="form-input"
                    placeholder="Search company name…"
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      loadCompanies(e.target.value);
                      if (companyId) {
                        setCompanyId('');
                        setSelectedCompany(null);
                      }
                    }}
                    disabled={loading}
                  />
                  {companies.length > 0 && !companyId && (
                    <div style={styles.dropdown}>
                      {fetchingCompanies && <div style={styles.dropdownItem} className="text-muted">Loading…</div>}
                      {companies.map((c) => (
                        <div
                          key={c._id}
                          style={styles.dropdownItem}
                          onClick={() => {
                            setCompanyId(c._id);
                            setSelectedCompany(c);
                            setCompanySearch(c.name);
                            setCompanies([]);
                          }}
                        >
                          <strong>{c.name}</strong>
                          {c.contact && <span className="text-muted"> — {c.contact}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {companyId && (
                    <div className="alert alert-success" style={{ marginTop: '6px', padding: '8px 12px' }}>
                      ✓ Selected: <strong>{companySearch}</strong>
                      <button
                        type="button"
                        style={styles.clearBtn}
                        onClick={() => { setCompanyId(''); setSelectedCompany(null); setCompanySearch(''); loadCompanies(); }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Service Line Items */}
                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--hca-green)' }}>
                      Service Line Items
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddItem}
                      disabled={loading}
                    >
                      ➕ Add Item
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} style={styles.itemRow}>
                      <div style={{ flex: 3 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>
                          Service Description #{index + 1} <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. HALAL CERTIFICATION"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div style={{ flex: 1.5, minWidth: '100px' }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>
                          Rate (₦) <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          placeholder="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '70px' }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>
                          Qty <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-input"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          style={styles.deleteBtn}
                          onClick={() => handleRemoveItem(index)}
                          title="Remove item"
                          disabled={loading}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="vatPercent">
                      VAT %
                    </label>
                    <input
                      id="vatPercent"
                      name="vatPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="form-input"
                      placeholder="7.5"
                      value={vatPercent}
                      onChange={(e) => setVatPercent(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="date">
                      Invoice Date
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      className="form-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Live calculation preview */}
                {calc.subTotal > 0 && (
                  <div className="calc-preview">
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--hca-green)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Calculation Preview
                    </div>
                    {items.map((item, idx) => {
                      const r = parseFloat(item.rate) || 0;
                      const q = parseFloat(item.qty) || 0;
                      if (r > 0) {
                        return (
                          <div className="calc-row" key={idx} style={{ fontSize: '12px', borderBottom: '1px dashed var(--gray-100)', paddingBottom: '4px' }}>
                            <span className="text-muted">Item #{idx + 1} ({q} × ₦{fmt(r)})</span>
                            <span>₦{fmt(r * q)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    <div className="calc-row" style={{ marginTop: '8px' }}>
                      <span>Sub Total</span>
                      <span><strong>₦{fmt(calc.subTotal)}</strong></span>
                    </div>
                    <div className="calc-row">
                      <span>VAT ({vatPercent || 0}%)</span>
                      <span>₦{fmt(calc.vatAmount)}</span>
                    </div>
                    <div className="calc-row total">
                      <span>GRAND TOTAL</span>
                      <span>₦{fmt(calc.grandTotal)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: INTERACTIVE DOCUMENT PREVIEW */}
            {activeTab === 'preview' && (
              <div style={styles.sheetPaper}>
                {/* ── Header ── */}
                <div style={styles.pvHeader}>
                  <div style={styles.pvLogoBlock}>
                    <img src="/hcaLogo.png" alt="HCA Crest" style={styles.pvLogoImg} />
                  </div>
                  <div style={styles.pvHeaderText}>
                    <div style={styles.pvHeaderArabic}>هيئة ترخيص منتجات الحلال</div>
                    <div style={styles.pvHeaderTitle}>HALAL CERTIFICATION AUTHORITY (HCA)</div>
                    <div style={styles.pvHeaderSub}>A Subsidiary of</div>
                    <div style={styles.pvHeaderParent}>Halal &amp; Haram Distinction Development Initiative (HDI)</div>
                    <div style={styles.pvHeaderAddress}>
                      <strong>Corporate Secretariat:</strong> 9a, Wing 1, Abiodun Fasakin St., Anthony Village, Idi-Iroko Bus-Stop, Lagos.<br />
                      <strong>Branch Office:</strong> 67, Ladipo Street, Opposite Ladipo Police Post, Mushin, Lagos State.
                    </div>
                    <div style={styles.pvHeaderContact}>
                      <strong>Tel:</strong> 08023519433, 08023470542, 08037218855 &nbsp;|&nbsp; <strong>Website:</strong> www.halalcert.com.ng &nbsp;|&nbsp; <strong>E-mail:</strong> info@halalcert.com.ng
                    </div>
                  </div>
                </div>

                {/* Accent Strip */}
                <div style={styles.pvStrip}></div>

                {/* Title + Number Row */}
                <div style={styles.pvTitleRow}>
                  <div style={styles.pvInvoiceTitle}>INVOICE</div>
                  <div style={styles.pvInvNoBlock}>
                    <span>Invoice No:</span>
                    <span style={styles.pvUnderlineValue}>HCA/26/XXXX</span>
                  </div>
                </div>

                {/* Client Section */}
                <div style={styles.pvClientSection}>
                  <div style={styles.pvClientRow}>
                    <span style={styles.pvClientLabel}>Client:</span>
                    <span style={styles.pvClientValue}>{selectedCompany?.name || companySearch || '—'}</span>
                  </div>
                  <div style={styles.pvClientRow}>
                    <span style={styles.pvClientLabel}>Contact:</span>
                    <span style={styles.pvClientValue}>{selectedCompany?.contact || '—'}</span>
                  </div>
                  <div style={styles.pvClientRow}>
                    <div style={{ display: 'flex', flex: 1, gap: '16px', alignItems: 'baseline' }}>
                      <span style={styles.pvClientLabel}>Tel:</span>
                      <span style={{ ...styles.pvClientValue, flex: 1.5 }}>{selectedCompany?.tel || '—'}</span>
                      <span style={{ ...styles.pvClientLabel, minWidth: 'auto', marginLeft: 'auto' }}>Date:</span>
                      <span style={{ ...styles.pvClientValue, flex: 1 }}>{formatDatePreview(date)}</span>
                    </div>
                  </div>
                </div>

                {/* Services Table */}
                <div style={{ marginTop: '14px' }}>
                  <table style={styles.pvTable}>
                    <thead>
                      <tr style={{ backgroundColor: '#c8d8b0' }}>
                        <th style={styles.pvTh}>S/N</th>
                        <th style={{ ...styles.pvTh, textAlign: 'left', paddingLeft: '8px' }}>SERVICE DESCRIPTION</th>
                        <th style={styles.pvTh}>RATE</th>
                        <th style={styles.pvTh}>QTY</th>
                        <th style={styles.pvTh}>SUB TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} style={{ height: '24px' }}>
                          <td style={styles.pvTd}>{idx + 1}.</td>
                          <td style={{ ...styles.pvTd, textAlign: 'left', paddingLeft: '8px' }}>{item.description}</td>
                          <td style={{ ...styles.pvTd, textAlign: 'right', paddingRight: '8px' }}>{fmt(parseFloat(item.rate) || 0)}</td>
                          <td style={styles.pvTd}>{item.qty}</td>
                          <td style={{ ...styles.pvTd, textAlign: 'right', paddingRight: '8px' }}>
                            {fmt((parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0))}
                          </td>
                        </tr>
                      ))}
                      {/* VAT row */}
                      <tr style={{ height: '24px' }}>
                        <td style={styles.pvTd}>{items.length + 1}.</td>
                        <td style={{ ...styles.pvTd, textAlign: 'left', paddingLeft: '8px' }}>VAT OF {vatPercent || 0}%</td>
                        <td style={styles.pvTd}></td>
                        <td style={styles.pvTd}></td>
                        <td style={{ ...styles.pvTd, textAlign: 'right', paddingRight: '8px' }}>{fmt(calc.vatAmount)}</td>
                      </tr>

                      {/* Grand Total Footer */}
                      <tr>
                        <td colSpan="3" style={styles.pvBankCell}>
                          <strong>Banker:</strong>&nbsp; Jaiz Bank Plc &nbsp; Tin No: 20285799-0001<br />
                          <strong>Account Name:</strong>&nbsp; HALAL AND HARAM DISTINCTION DEVELOPEMENT INITIATIVE<br />
                          <strong>Account No:</strong>&nbsp; 0007158427 &nbsp; Sort Code: 301150303
                        </td>
                        <td style={styles.pvGrandLabelCell}>GRAND TOTAL</td>
                        <td style={styles.pvGrandAmountCell}>N{fmt(calc.grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Amount in words */}
                <div style={{ marginTop: '12px', fontSize: '11px' }}>
                  <span>Total Amount in Words: </span>
                  <strong style={{ textDecoration: 'underline' }}>{numberToWords(calc.grandTotal).toUpperCase()}</strong>
                </div>

                <hr style={styles.pvDivider} />

                {/* Terms Box */}
                <div style={styles.pvTermsBox}>
                  <div style={styles.pvTermsLabel}>TERMS:</div>
                  <div style={styles.pvTermsText}>
                    The decision of HCA in all matters of halal certification shall be final.<br />
                    Payment of appropriate fees as stated above is a sign of commitment of applicant, and all processes shall be
                    carried out with trust and integrity before the issuance of the certificate and label order.
                  </div>
                </div>

                {/* Signature Line */}
                <div style={styles.pvSigSection}>
                  <div style={{ minHeight: '36px' }}></div>
                  <div style={styles.pvSigLine}>Account Manager's Signature</div>
                </div>

                {/* Bottom Banner */}
                <div style={styles.pvBottomBanner}>Thank You For Your Patronage</div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading
                ? <><div className="spinner spinner-sm" /> Generating PDF…</>
                : '📥 Generate & Download PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  tabContainer: {
    display: 'flex',
    borderBottom: '2px solid var(--gray-200)',
    background: 'var(--gray-50)',
    padding: '0 20px',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    color: 'var(--gray-600)',
    borderBottom: '3px solid transparent',
    transition: 'all 0.15s ease',
  },
  activeTab: {
    color: 'var(--hca-green)',
    borderBottomColor: 'var(--hca-green)',
    background: '#fff',
  },
  dropdown: {
    border: '1.5px solid var(--gray-200)',
    borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
    background: '#fff',
    boxShadow: 'var(--shadow-md)',
    maxHeight: '180px',
    overflowY: 'auto',
    zIndex: 10,
    position: 'relative',
  },
  dropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '13.5px',
    borderBottom: '1px solid var(--gray-100)',
    transition: 'background 0.15s',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'var(--hca-green)',
    fontWeight: 'bold',
    marginLeft: 'auto',
    float: 'right',
    lineHeight: '1',
  },
  itemRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    background: 'var(--gray-50)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '10px',
    border: '1px solid var(--gray-200)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '16px',
  },

  // ── Document Preview Styles ──
  sheetPaper: {
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: '8px',
    padding: '24px 20px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03), 0 2px 16px rgba(0,0,0,0.05)',
    fontFamily: 'Arial, sans-serif',
    color: '#000',
  },
  pvHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  pvLogoBlock: {
    width: '90px',
    minWidth: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvLogoImg: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
  },
  pvHeaderText: {
    flex: 1,
    textAlign: 'center',
  },
  pvHeaderArabic: {
    fontSize: '17px',
    color: '#c00000',
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Georgia, serif',
  },
  pvHeaderTitle: {
    fontSize: '19px',
    fontWeight: 'bold',
    color: '#1e4620',
    lineHeight: '1.1',
    letterSpacing: '-0.3px',
    fontFamily: 'Arial Black, sans-serif',
  },
  pvHeaderSub: {
    fontSize: '8.5px',
    fontStyle: 'italic',
    marginTop: '2px',
  },
  pvHeaderParent: {
    fontSize: '9.5px',
    fontWeight: 'bold',
    color: '#000',
  },
  pvHeaderAddress: {
    fontSize: '8px',
    color: '#c00000',
    lineHeight: '1.4',
    marginTop: '3px',
  },
  pvHeaderContact: {
    fontSize: '8px',
    color: '#000',
    lineHeight: '1.4',
    marginTop: '2px',
  },
  pvStrip: {
    height: '6px',
    background: 'linear-gradient(to right, #b8860b 0%, #f5d060 30%, #c8a820 50%, #f5d060 70%, #b8860b 100%)',
    margin: '8px 0',
  },
  pvTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '8px',
  },
  pvInvoiceTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#c00000',
    fontFamily: 'Arial Black, sans-serif',
    fontStyle: 'italic',
  },
  pvInvNoBlock: {
    fontSize: '11.5px',
    fontWeight: 'bold',
  },
  pvUnderlineValue: {
    borderBottom: '1.5px solid #000',
    paddingLeft: '6px',
    minWidth: '120px',
    display: 'inline-block',
    textAlign: 'left',
  },
  pvClientSection: {
    marginTop: '8px',
  },
  pvClientRow: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '4px',
  },
  pvClientLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '60px',
  },
  pvClientValue: {
    fontSize: '11px',
    fontWeight: 'bold',
    borderBottom: '1.5px solid #000',
    flex: 1,
    paddingLeft: '6px',
    minHeight: '14px',
  },
  pvTable: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '2px solid #000',
  },
  pvTh: {
    padding: '6px',
    fontSize: '10.5px',
    fontWeight: 'bold',
    border: '1.5px solid #000',
    color: '#000',
  },
  pvTd: {
    padding: '4px 6px',
    fontSize: '10px',
    border: '1px solid #000',
    textAlign: 'center',
    color: '#000',
  },
  pvBankCell: {
    background: '#fff',
    border: '1.5px solid #000',
    padding: '6px 8px',
    fontSize: '8px',
    lineHeight: '1.6',
    textAlign: 'left',
    color: '#000',
    verticalAlign: 'top',
  },
  pvGrandLabelCell: {
    background: '#c8d8b0',
    border: '1.5px solid #000',
    textAlign: 'center',
    fontSize: '11.5px',
    fontWeight: 'bold',
    verticalAlign: 'middle',
  },
  pvGrandAmountCell: {
    background: '#c8d8b0',
    border: '1.5px solid #000',
    textAlign: 'right',
    fontSize: '11.5px',
    fontWeight: 'bold',
    paddingRight: '8px',
    verticalAlign: 'middle',
  },
  pvDivider: {
    border: 'none',
    borderTop: '1.5px solid #000',
    margin: '8px 0',
  },
  pvTermsBox: {
    border: '1.5px solid #4e7a3e',
    backgroundColor: '#c8d8b0',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginTop: '6px',
  },
  pvTermsLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e4620',
    minWidth: '55px',
  },
  pvTermsText: {
    fontSize: '8px',
    color: '#000',
    fontStyle: 'italic',
    lineHeight: '1.5',
    flex: 1,
  },
  pvSigSection: {
    textAlign: 'right',
    marginTop: '8px',
  },
  pvSigLine: {
    borderTop: '1.5px solid #000',
    width: '160px',
    marginLeft: 'auto',
    paddingTop: '3px',
    fontSize: '9px',
    textAlign: 'center',
  },
  pvBottomBanner: {
    backgroundColor: '#1e4620',
    color: '#fff',
    textAlign: 'center',
    padding: '8px 0',
    fontSize: '14px',
    fontStyle: 'italic',
    fontWeight: 'bold',
    marginTop: '12px',
    borderRadius: '4px',
  },
};

export default GenerateInvoiceModal;
