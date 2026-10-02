import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FiPlus, FiEdit2, FiSearch, FiCheck,
  FiX, FiSave, FiTrash2, FiUser, FiMapPin,
  FiPhone, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import '../MasterStyles.css';

const API_BASE_URL = 'http://localhost:5000/api';

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        {t.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

// ── Confirm modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-card">
      <div className="modal-icon"><FiAlertCircle /></div>
      <h3>Confirm Action</h3>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="cp-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="cp-btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ── Form Modal (generic) ──────────────────────────────────────────────────────
const FormModal = ({ title, onClose, onSubmit, submitLabel = 'Apply Changes', children }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="fm-card">
      <div className="fm-header">
        <h3>{title}</h3>
        <button className="fm-close" onClick={onClose}><FiX size={16} /></button>
      </div>
      <div className="fm-body">{children}</div>
      <div className="fm-footer">
        <button className="cp-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="cp-btn-primary" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  </div>
);

// ── Form field helpers ────────────────────────────────────────────────────────
const Field = ({ label, required, children, half }) => (
  <div className={`fm-field ${half ? 'fm-field-half' : ''}`}>
    <label className="fm-label">
      {required && <span className="fm-required">*</span>}
      {label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, required, readOnly }) => (
  <input
    className={`fm-input ${readOnly ? 'fm-input-readonly' : ''}`}
    type="text"
    value={value || ''}
    placeholder={placeholder || ''}
    readOnly={readOnly}
    required={required}
    onChange={onChange}
  />
);

const DateInput = ({ value, onChange, max }) => (
  <input
    className="fm-input"
    type="date"
    value={value || ''}
    max={max || TODAY}
    onChange={onChange}
  />
);

const SelectInput = ({ value, onChange, options, placeholder }) => (
  <select className="fm-input" value={value || ''} onChange={onChange}>
    <option value="">{placeholder || 'Select…'}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ lines = 3 }) => (
  <div className="skeleton-wrap">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="empty-placeholder">
    <div className="empty-icon"><Icon size={28} /></div>
    <h4>{title}</h4>
    <p>{sub}</p>
    {action && (
      <button className="cp-btn-primary-sm" onClick={action.fn}>
        <FiPlus /> {action.label}
      </button>
    )}
  </div>
);

const up = v => (v || '').toUpperCase();
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD, used as max date

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CustomHouseAgent = ({ partyType = 'CUSTOM HOUSE AGENT' }) => {
  const [list, setList]                   = useState([]);
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedId, setSelectedId]       = useState(null);
  const [details, setDetails]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [activeTab, setActiveTab]         = useState('info');
  const [toasts, setToasts]               = useState([]);
  const [confirm, setConfirm]             = useState(null);

  // Modal states
  const [showMasterModal, setShowMasterModal]   = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCommModal, setShowCommModal]       = useState(false);

  // Edit targets (null = new record)
  const [editingAddr, setEditingAddr]   = useState(null);
  const [editingComm, setEditingComm]   = useState(null);

  // Form data
  const blankMaster = {
    party_name: '', party_type: partyType, country: '',
    pan: '', cin: '', gstno: '', gst_date: '',
    iec: '', iec_date: '', internet: '', notes: ''
  };

  const blankAddress = {
    type_of_addr: '', addr_owner_name: '', department_name: '',
    addr_line1: '', addr_line2: '', addr_line3: '', addr_line4: '',
    city: '', state_province: '', country_name: '', postal_code: '', gst_no: ''
  };

  const blankComm = {
    comm_owner_name: '', department_name: '', comm_type: '', comm_text: ''
  };

  const [masterForm, setMasterForm]   = useState(blankMaster);
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [commForm, setCommForm]       = useState(blankComm);

  const commTypes = ['EMAIL', 'PHONE', 'MOBILE', 'FAX', 'WEBSITE', 'WHATSAPP'];
  const COUNTRIES = [
    'AFGHANISTAN','ALBANIA','ALGERIA','ANDORRA','ANGOLA','ANTIGUA AND BARBUDA',
    'ARGENTINA','ARMENIA','AUSTRALIA','AUSTRIA','AZERBAIJAN','BAHAMAS','BAHRAIN',
    'BANGLADESH','BARBADOS','BELARUS','BELGIUM','BELIZE','BENIN','BHUTAN',
    'BOLIVIA','BOSNIA AND HERZEGOVINA','BOTSWANA','BRAZIL','BRUNEI','BULGARIA',
    'BURKINA FASO','BURUNDI','CABO VERDE','CAMBODIA','CAMEROON','CANADA',
    'CENTRAL AFRICAN REPUBLIC','CHAD','CHILE','CHINA','COLOMBIA','COMOROS',
    'CONGO (BRAZZAVILLE)','CONGO (KINSHASA)','COSTA RICA','CROATIA','CUBA',
    'CYPRUS','CZECH REPUBLIC','DENMARK','DJIBOUTI','DOMINICA',
    'DOMINICAN REPUBLIC','ECUADOR','EGYPT','EL SALVADOR','EQUATORIAL GUINEA',
    'ERITREA','ESTONIA','ESWATINI','ETHIOPIA','FIJI','FINLAND','FRANCE','GABON',
    'GAMBIA','GEORGIA','GERMANY','GHANA','GREECE','GRENADA','GUATEMALA','GUINEA',
    'GUINEA-BISSAU','GUYANA','HAITI','HONDURAS','HUNGARY','ICELAND','INDIA',
    'INDONESIA','IRAN','IRAQ','IRELAND','ISRAEL','ITALY','JAMAICA','JAPAN',
    'JORDAN','KAZAKHSTAN','KENYA','KIRIBATI','KUWAIT','KYRGYZSTAN','LAOS',
    'LATVIA','LEBANON','LESOTHO','LIBERIA','LIBYA','LIECHTENSTEIN','LITHUANIA',
    'LUXEMBOURG','MADAGASCAR','MALAWI','MALAYSIA','MALDIVES','MALI','MALTA',
    'MARSHALL ISLANDS','MAURITANIA','MAURITIUS','MEXICO','MICRONESIA','MOLDOVA',
    'MONACO','MONGOLIA','MONTENEGRO','MOROCCO','MOZAMBIQUE','MYANMAR','NAMIBIA',
    'NAURU','NEPAL','NETHERLANDS','NEW ZEALAND','NICARAGUA','NIGER','NIGERIA',
    'NORTH KOREA','NORTH MACEDONIA','NORWAY','OMAN','PAKISTAN','PALAU',
    'PANAMA','PAPUA NEW GUINEA','PARAGUAY','PERU','PHILIPPINES','POLAND',
    'PORTUGAL','QATAR','ROMANIA','RUSSIA','RWANDA','SAINT KITTS AND NEVIS',
    'SAINT LUCIA','SAINT VINCENT AND THE GRENADINES','SAMOA','SAN MARINO',
    'SAO TOME AND PRINCIPE','SAUDI ARABIA','SENEGAL','SERBIA','SEYCHELLES',
    'SIERRA LEONE','SINGAPORE','SLOVAKIA','SLOVENIA','SOLOMON ISLANDS',
    'SOMALIA','SOUTH AFRICA','SOUTH KOREA','SOUTH SUDAN','SPAIN','SRI LANKA',
    'SUDAN','SURINAME','SWEDEN','SWITZERLAND','SYRIA','TAIWAN','TAJIKISTAN',
    'TANZANIA','THAILAND','TIMOR-LESTE','TOGO','TONGA','TRINIDAD AND TOBAGO',
    'TUNISIA','TURKEY','TURKMENISTAN','TUVALU','UGANDA','UKRAINE',
    'UNITED ARAB EMIRATES','UNITED KINGDOM','UNITED STATES','URUGUAY',
    'UZBEKISTAN','VANUATU','VATICAN CITY','VENEZUELA','VIETNAM','YEMEN',
    'ZAMBIA','ZIMBABWE'
  ];

  const addrTypes = [
    'REGISTERED OFFICE', 'REGIONAL OFFICE', 'RESIDENCE',
    'OFFICE', 'FACTORY', 'BILLING', 'SHIPPING',
    'WAREHOUSE', 'BILLING & SHIPPING'
  ];

  // ── Toast ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/parties`, {
        params: { type: partyType, search: searchTerm }
      });
      setList(res.data);
    } catch {
      addToast('Failed to load customers. Is the server running?', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType, searchTerm]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const loadDetails = async (id) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/parties/${id}`);
      setDetails(res.data);
      setSelectedId(id);
      setActiveTab('info');
    } catch {
      addToast('Error loading customer details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Open master modal ─────────────────────────────────────────────────────
  const openMasterModal = (isNew = false) => {
    if (isNew) {
      setMasterForm(blankMaster);
      setSelectedId(null);
      setDetails(null);
    } else {
      setMasterForm({ ...blankMaster, ...details.master });
    }
    setShowMasterModal(true);
  };

  // ── Save master ───────────────────────────────────────────────────────────
  const handleSaveMaster = async () => {
    if (!masterForm.party_name?.trim()) { addToast("'CustomHouseAgent Name is required'", 'error'); return; }
    if (!masterForm.country?.trim()) { addToast('Country is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        party_name: masterForm.party_name?.trim(),
        party_type: partyType,
        country: masterForm.country?.trim(),
        pan: masterForm.pan?.trim() || null,
        cin: masterForm.cin?.trim() || null,
        gstno: masterForm.gstno?.trim() || null,
        gst_date: masterForm.gst_date || null,
        iec: masterForm.iec?.trim() || null,
        iec_date: masterForm.iec_date || null,
        internet: masterForm.internet?.trim() || null,
        notes: masterForm.notes?.trim() || null,
        username: localStorage.getItem('userName') || 'admin'
      };
      const response = selectedId
        ? await axios.put(`${API_BASE_URL}/parties/${selectedId}`, payload)
        : await axios.post(`${API_BASE_URL}/parties`, payload);
      if (response.data.success) {
        addToast(selectedId ? 'CustomHouseAgent updated!' : 'CustomHouseAgent created!');
        setShowMasterModal(false);
        await fetchCustomers();
        const pid = response.data.party_id || selectedId;
        if (pid) await loadDetails(pid);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Error saving customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete master ─────────────────────────────────────────────────────────
  const confirmDeleteMaster = (id, name) => {
    setConfirm({
      message: `Delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await axios.delete(`${API_BASE_URL}/parties/${id}`);
          addToast('CustomHouseAgent deleted');
          setList(prev => prev.filter(i => i.party_id !== id));
          if (selectedId === id) { setSelectedId(null); setDetails(null); }
        } catch (err) {
          addToast(err.response?.data?.error || 'Error deleting', 'error');
        }
      }
    });
  };

  // ── Open address modal ────────────────────────────────────────────────────
  const openAddressModal = (addr = null) => {
    setEditingAddr(addr);
    setAddressForm(addr ? { ...blankAddress, ...addr } : blankAddress);
    setShowAddressModal(true);
  };

  // ── Save address ──────────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!addressForm.addr_line1?.trim()) { addToast('Addr Line1 is required', 'error'); return; }
    if (!addressForm.country_name?.trim()) { addToast('Country Name is required', 'error'); return; }
    try {
      if (editingAddr) {
        await axios.put(`${API_BASE_URL}/parties/${selectedId}/addresses/${editingAddr.addr_point_id}`, addressForm);
        addToast('Address updated');
      } else {
        await axios.post(`${API_BASE_URL}/parties/${selectedId}/addresses`, addressForm);
        addToast('Address added');
      }
      setShowAddressModal(false);
      await loadDetails(selectedId);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error saving address', 'error');
    }
  };

  const confirmDeleteAddress = (addrId) => {
    setConfirm({
      message: 'Delete this address? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await axios.delete(`${API_BASE_URL}/parties/${selectedId}/addresses/${addrId}`);
          addToast('Address deleted');
          await loadDetails(selectedId);
        } catch (err) {
          addToast(err.response?.data?.error || 'Error deleting address', 'error');
        }
      }
    });
  };

  // ── Open comm modal ───────────────────────────────────────────────────────
  const openCommModal = (comm = null) => {
    setEditingComm(comm);
    setCommForm(comm ? { ...blankComm, ...comm } : blankComm);
    setShowCommModal(true);
  };

  // ── Save comm ─────────────────────────────────────────────────────────────
  const handleSaveComm = async () => {
    if (!commForm.comm_owner_name?.trim()) { addToast('Comm Owner Name is required', 'error'); return; }
    if (!commForm.comm_type?.trim()) { addToast('Comm Type is required', 'error'); return; }
    try {
      if (editingComm) {
        await axios.put(`${API_BASE_URL}/parties/${selectedId}/communications/${editingComm.comm_point_id}`, commForm);
        addToast('Communication updated');
      } else {
        await axios.post(`${API_BASE_URL}/parties/${selectedId}/communications`, commForm);
        addToast('Communication added');
      }
      setShowCommModal(false);
      await loadDetails(selectedId);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error saving communication', 'error');
    }
  };

  const confirmDeleteComm = (commId) => {
    setConfirm({
      message: 'Delete this communication? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await axios.delete(`${API_BASE_URL}/parties/${selectedId}/communications/${commId}`);
          addToast('Communication deleted');
          await loadDetails(selectedId);
        } catch (err) {
          addToast(err.response?.data?.error || 'Error deleting', 'error');
        }
      }
    });
  };

  const mf = (key, val) => setMasterForm(f => ({ ...f, [key]: val }));
  const af = (key, val) => setAddressForm(f => ({ ...f, [key]: val }));
  const cf = (key, val) => setCommForm(f => ({ ...f, [key]: val }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="cp-root">
      <Toast toasts={toasts} />

      {/* ── CONFIRM MODAL ────────────────────────────────────────────────── */}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── MASTER FORM MODAL ────────────────────────────────────────────── */}
      {showMasterModal && (
        <FormModal
          title={`Add/Edit ${partyType}`}
          onClose={() => setShowMasterModal(false)}
          onSubmit={handleSaveMaster}
          submitLabel={saving ? 'Saving…' : 'Apply Changes'}
        >
          <div className="fm-row">
            <Field label="Customer Name" required half>
              <TextInput value={masterForm.party_name} placeholder="Custom House Agent Name"
                onChange={e => mf('party_name', up(e.target.value))} required />
            </Field>
            <Field label="Party Type" half>
              <TextInput value={partyType} readOnly />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="PAN" half>
              <TextInput value={masterForm.pan} placeholder="PAN"
                onChange={e => mf('pan', up(e.target.value))} />
            </Field>
            <Field label="CIN" half>
              <TextInput value={masterForm.cin} placeholder="CIN"
                onChange={e => mf('cin', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="GST No" half>
              <TextInput value={masterForm.gstno} placeholder="GST No"
                onChange={e => mf('gstno', up(e.target.value))} />
            </Field>
            <Field label="GST Date" half>
              <DateInput value={masterForm.gst_date} max={TODAY} onChange={e => mf('gst_date', e.target.value)} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="IEC" half>
              <TextInput value={masterForm.iec} placeholder="IEC"
                onChange={e => mf('iec', up(e.target.value))} />
            </Field>
            <Field label="IEC Date" half>
              <DateInput value={masterForm.iec_date} max={TODAY} onChange={e => mf('iec_date', e.target.value)} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Country" required>
              <select className="fm-input" value={masterForm.country || ''} required
                onChange={e => mf('country', e.target.value)}>
                <option value="">Select Country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="fm-row">
            <Field label="WWW">
              <TextInput value={masterForm.internet} placeholder="Website URL"
                onChange={e => mf('internet', e.target.value)} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Notes">
              <textarea
                className="fm-textarea"
                value={masterForm.notes || ''}
                placeholder="Additional notes about this customer…"
                onChange={e => mf('notes', e.target.value)}
                rows={4}
              />
            </Field>
          </div>
        </FormModal>
      )}

      {/* ── ADDRESS FORM MODAL ───────────────────────────────────────────── */}
      {showAddressModal && (
        <FormModal
          title="Party Address"
          onClose={() => setShowAddressModal(false)}
          onSubmit={handleSaveAddress}
          submitLabel={editingAddr ? 'Apply Changes' : 'Create'}
        >
          <div className="fm-row">
            <Field label="Type Of Addr" required>
              <SelectInput
                value={addressForm.type_of_addr}
                options={addrTypes}
                placeholder="Select type…"
                onChange={e => af('type_of_addr', e.target.value)}
              />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Addr Owner Name" half>
              <TextInput value={addressForm.addr_owner_name} placeholder="Addr Owner Name"
                onChange={e => af('addr_owner_name', up(e.target.value))} />
            </Field>
            <Field label="Department Name" half>
              <TextInput value={addressForm.department_name} placeholder="Department Name"
                onChange={e => af('department_name', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Addr Line1" required half>
              <TextInput value={addressForm.addr_line1} placeholder="Addr Line1"
                onChange={e => af('addr_line1', up(e.target.value))} required />
            </Field>
            <Field label="Addr Line2" half>
              <TextInput value={addressForm.addr_line2} placeholder="Addr Line2"
                onChange={e => af('addr_line2', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Addr Line3" half>
              <TextInput value={addressForm.addr_line3} placeholder="Addr Line3"
                onChange={e => af('addr_line3', up(e.target.value))} />
            </Field>
            <Field label="Addr Line4" half>
              <TextInput value={addressForm.addr_line4} placeholder="Addr Line4"
                onChange={e => af('addr_line4', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="City" half>
              <TextInput value={addressForm.city} placeholder="City"
                onChange={e => af('city', up(e.target.value))} />
            </Field>
            <Field label="State Province" half>
              <TextInput value={addressForm.state_province} placeholder="State Province"
                onChange={e => af('state_province', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Country Name" required half>
              <select className="fm-input" value={addressForm.country_name || ''} required
                onChange={e => af('country_name', e.target.value)}>
                <option value="">Select Country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Postal Code" half>
              <TextInput value={addressForm.postal_code} placeholder="Postal Code"
                onChange={e => af('postal_code', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Gst No">
              <TextInput value={addressForm.gst_no} placeholder="Gst No"
                onChange={e => af('gst_no', up(e.target.value))} />
            </Field>
          </div>
        </FormModal>
      )}

      {/* ── COMMUNICATION FORM MODAL ─────────────────────────────────────── */}
      {showCommModal && (
        <FormModal
          title="Communication Info"
          onClose={() => setShowCommModal(false)}
          onSubmit={handleSaveComm}
          submitLabel={editingComm ? 'Apply Changes' : 'Create'}
        >
          <div className="fm-row">
            <Field label="Comm Owner Name" required>
              <TextInput value={commForm.comm_owner_name} placeholder="Comm Owner Name"
                onChange={e => cf('comm_owner_name', up(e.target.value))} required />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Department Name">
              <TextInput value={commForm.department_name} placeholder="Department Name"
                onChange={e => cf('department_name', up(e.target.value))} />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Comm Type" required>
              <SelectInput
                value={commForm.comm_type}
                options={commTypes}
                placeholder="Select type…"
                onChange={e => cf('comm_type', e.target.value)}
              />
            </Field>
          </div>
          <div className="fm-row">
            <Field label="Comm Text">
              <TextInput value={commForm.comm_text} placeholder="Comm Text"
                onChange={e => cf('comm_text', up(e.target.value))} />
            </Field>
          </div>
        </FormModal>
      )}

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-head">
          <div className="cp-sidebar-title-row">
            <span className="cp-sidebar-title">Custom House Agents</span>
            <button className="cp-btn-new" onClick={() => openMasterModal(true)} title="Add new"><FiPlus /></button>
          </div>
          <div className="cp-search-wrap">
            <FiSearch className="cp-search-icon" />
            <input className="cp-search" type="text" placeholder="Search by name or country…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="cp-search-clear" onClick={() => setSearchTerm('')}><FiX size={14} /></button>
            )}
          </div>
        </div>

        <div className="cp-list">
          {loading ? (
            <div className="cp-list-loading">{[1,2,3].map(i => <div key={i} className="cp-list-skeleton" />)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon={FiUser} title="No custom house agents" sub="Create your first custom house agent"
              action={{ label: 'Add Custom House Agent', fn: () => openMasterModal(true) }} />
          ) : (
            list.map(item => (
              <div key={item.party_id}
                className={`cp-list-item ${selectedId === item.party_id ? 'active' : ''}`}
                onClick={() => loadDetails(item.party_id)}>
                <div className="cp-list-avatar">{item.party_name?.[0]?.toUpperCase() || '?'}</div>
                <div className="cp-list-info">
                  <span className="cp-list-name">{item.party_name}</span>
                  <span className="cp-list-meta">
                    <span className="cp-badge">{item.party_type}</span>
                    {item.country && <span className="cp-list-country">· {item.country}</span>}
                  </span>
                </div>
                <button className="cp-list-del" title="Delete"
                  onClick={e => { e.stopPropagation(); confirmDeleteMaster(item.party_id, item.party_name); }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cp-sidebar-foot">
          <span>{list.length} record{list.length !== 1 ? 's' : ''}</span>
          <button className="cp-refresh" onClick={fetchCustomers} title="Refresh"><FiRefreshCw size={13} /></button>
        </div>
      </aside>

      {/* ── MAIN PANEL ───────────────────────────────────────────────────── */}
      <main className="cp-main">
        <div className="cp-topbar">
          <div className="cp-topbar-left">
            <h2 className="cp-page-title">Custom House Agent Setup</h2>
            {details?.master?.party_name && <span className="cp-breadcrumb">/ {details.master.party_name}</span>}
          </div>
          <div className="cp-topbar-right">
            {details && (
              <button className="cp-btn-outline" onClick={() => openMasterModal(false)}>
                <FiEdit2 size={14} /> Edit
              </button>
            )}
            <button className="cp-btn-primary" onClick={() => openMasterModal(true)}>
              <FiPlus size={14} /> New Custom House Agent
            </button>
          </div>
        </div>

        {!details ? (
          <div className="cp-blank">
            <EmptyState icon={FiUser} title="No supplier selected"
              sub="Pick one from the list or create a new one"
              action={{ label: 'New Custom House Agent', fn: () => openMasterModal(true) }} />
          </div>
        ) : detailLoading && selectedId ? (
          <div className="cp-detail-loading"><Skeleton lines={6} /></div>
        ) : (
          <div className="cp-content">

            {/* Hero */}
            <div className="cp-hero">
              <div className="cp-hero-avatar">{details.master.party_name?.[0]?.toUpperCase() || '?'}</div>
              <div className="cp-hero-info">
                <h1 className="cp-hero-name">{details.master.party_name}</h1>
                <p className="cp-hero-sub">
                  <span>{partyType}</span>
                  {details.master.country && <><span className="cp-dot">·</span><span>{details.master.country}</span></>}
                </p>
              </div>
              <div className="cp-hero-status">
                <span className="cp-status-pill"><FiCheck size={11} /> Active</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="cp-tabs">
              {[
                { id: 'info',    label: 'Master Info',    icon: FiUser   },
                { id: 'address', label: `Addresses (${details.addresses?.length ?? 0})`, icon: FiMapPin },
                { id: 'comm',    label: `Communications (${details.communications?.length ?? 0})`, icon: FiPhone },
              ].map(tab => (
                <button key={tab.id} className={`cp-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}>
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: MASTER INFO ─────────────────────────────────────── */}
            {activeTab === 'info' && (
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>CustomHouseAgent Master</span>
                  <button className="cp-btn-outline-sm" onClick={() => openMasterModal(false)}>
                    <FiEdit2 size={12} /> Edit
                  </button>
                </div>
                <div className="cp-info-grid cp-info-grid-3">
                  {[
                    { label: 'Party Name',  val: details.master.party_name },
                    { label: 'Party Type',  val: details.master.party_type },
                    { label: 'Country',     val: details.master.country },
                    { label: 'GST No',      val: details.master.gstno },
                    { label: 'GST Date',    val: details.master.gst_date },
                    { label: 'PAN',         val: details.master.pan },
                    { label: 'CIN',         val: details.master.cin },
                    { label: 'IEC',         val: details.master.iec },
                    { label: 'IEC Date',    val: details.master.iec_date },
                    { label: 'WWW',         val: details.master.internet },
                  ].map(({ label, val }) => (
                    <div className="cp-info-item" key={label}>
                      <span className="cp-info-label">{label}</span>
                      <span className="cp-info-val">{val || <span className="cp-na">—</span>}</span>
                    </div>
                  ))}
                </div>
                {details.master.notes && (
                  <div className="cp-notes-section">
                    <span className="cp-info-label">Notes</span>
                    <p className="cp-notes-text">{details.master.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ADDRESSES ───────────────────────────────────────── */}
            {activeTab === 'address' && (
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>Address Points</span>
                  {selectedId && (
                    <button className="cp-btn-outline-sm" onClick={() => openAddressModal(null)}>
                      <FiPlus size={12} /> Add Address
                    </button>
                  )}
                </div>
                {details.addresses?.length > 0 ? (
                  <div className="cp-table-wrap">
                    <table className="cp-table">
                      <thead>
                        <tr>
                          <th>Type Of Addr</th><th>Owner Name</th><th>Department</th>
                          <th>Address</th><th>City</th><th>State</th>
                          <th>Country</th><th>Postal</th>
                          <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.addresses.map(addr => (
                          <tr key={addr.addr_point_id}>
                            <td><span className="cp-type-tag">{addr.type_of_addr || '—'}</span></td>
                            <td>{addr.addr_owner_name || '—'}</td>
                            <td>{addr.department_name || '—'}</td>
                            <td className="cp-addr-cell">
                              {[addr.addr_line1, addr.addr_line2, addr.addr_line3, addr.addr_line4].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td>{addr.city || '—'}</td>
                            <td>{addr.state_province || '—'}</td>
                            <td>{addr.country_name || '—'}</td>
                            <td>{addr.postal_code || '—'}</td>
                            <td>
                              <div className="cp-row-actions">
                                <button className="cp-row-btn cp-row-btn-edit" title="Edit"
                                  onClick={() => openAddressModal(addr)}><FiEdit2 size={13} /></button>
                                <button className="cp-row-btn cp-row-btn-del" title="Delete"
                                  onClick={() => confirmDeleteAddress(addr.addr_point_id)}><FiTrash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={FiMapPin} title="No addresses yet"
                    sub="Add an address for this customer"
                    action={selectedId ? { label: 'Add Address', fn: () => openAddressModal(null) } : null} />
                )}
              </div>
            )}

            {/* ── TAB: COMMUNICATIONS ──────────────────────────────────── */}
            {activeTab === 'comm' && (
              <div className="cp-card">
                <div className="cp-card-head">
                  <span>Communication Points</span>
                  {selectedId && (
                    <button className="cp-btn-outline-sm" onClick={() => openCommModal(null)}>
                      <FiPlus size={12} /> Add
                    </button>
                  )}
                </div>
                {details.communications?.length > 0 ? (
                  <div className="cp-table-wrap">
                    <table className="cp-table">
                      <thead>
                        <tr>
                          <th>Comm Type</th><th>Comm Text</th><th>Comm Owner Name</th><th>Department</th>
                          <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.communications.map(comm => (
                          <tr key={comm.comm_point_id}>
                            <td><span className="cp-type-tag">{comm.comm_type}</span></td>
                            <td>{comm.comm_text || '—'}</td>
                            <td>{comm.comm_owner_name || '—'}</td>
                            <td>{comm.department_name || '—'}</td>
                            <td>
                              <div className="cp-row-actions">
                                <button className="cp-row-btn cp-row-btn-edit" title="Edit"
                                  onClick={() => openCommModal(comm)}><FiEdit2 size={13} /></button>
                                <button className="cp-row-btn cp-row-btn-del" title="Delete"
                                  onClick={() => confirmDeleteComm(comm.comm_point_id)}><FiTrash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={FiPhone} title="No communications yet"
                    sub="Add email, phone, or other contact info"
                    action={selectedId ? { label: 'Add Communication', fn: () => openCommModal(null) } : null} />
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default CustomHouseAgent;