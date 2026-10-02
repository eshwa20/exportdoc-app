import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FiPlus, FiEdit2, FiSearch, FiCheck, FiX,
  FiTrash2, FiRefreshCw, FiAlertCircle, FiAnchor, FiMapPin
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

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ title, sub, action }) => (
  <div className="empty-placeholder">
    <div className="empty-icon"><FiAnchor size={28} /></div>
    <h4>{title}</h4>
    <p>{sub}</p>
    {action && (
      <button className="cp-btn-primary-sm" onClick={action.fn}>
        <FiPlus /> {action.label}
      </button>
    )}
  </div>
);

const PORT_TYPES = ['SEA', 'RIVER', 'LAKE', 'UNKNOWN'];
const PORT_SIZES = ['VERY SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'UNKNOWN'];

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

const blank = {
  port_name: '', port_code: '', port_type: '', port_size: '',
  country: '', latitude: '', longitude: '', website: '', remarks: ''
};

// ── Uncontrolled form modal to prevent typing lag ─────────────────────────────
const PortFormModal = ({ title, initial, onClose, onSubmit, addToast }) => {
  // Use refs for text inputs to avoid re-render on every keystroke
  const refs = {
    port_name: useRef(null),
    port_code: useRef(null),
    latitude:  useRef(null),
    longitude: useRef(null),
    website:   useRef(null),
    remarks:   useRef(null),
  };

  // Controlled only for selects (no lag with selects)
  const [portType, setPortType]   = useState(initial.port_type  || '');
  const [portSize, setPortSize]   = useState(initial.port_size  || '');
  const [country,  setCountry]    = useState(initial.country    || '');
  const [geoLoading, setGeoLoading] = useState(false);

  const getValues = () => ({
    port_name: refs.port_name.current?.value.toUpperCase() || '',
    port_code: refs.port_code.current?.value.toUpperCase() || '',
    latitude:  refs.latitude.current?.value  || '',
    longitude: refs.longitude.current?.value || '',
    website:   refs.website.current?.value   || '',
    remarks:   refs.remarks.current?.value.toUpperCase() || '',
    port_type: portType,
    port_size: portSize,
    country,
  });

  const autoFillCoords = async () => {
    const portName = refs.port_name.current?.value || '';
    const currentCountry = country || '';
    
    if (!portName.trim() && !currentCountry.trim()) {
      addToast('Enter port name or select country first', 'error');
      return;
    }
    
    setGeoLoading(true);
    try {
      console.log('Auto-filling coordinates for:', portName, currentCountry);
      
      // Call backend proxy to avoid CORS issues
      const response = await axios.get(`${API_BASE_URL}/ports/geocode`, {
        params: { 
          port_name: portName.trim(), 
          country: currentCountry.trim() 
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Geocoding response:', response.data);
      
      if (response.data.success) {
        if (refs.latitude.current) {
          refs.latitude.current.value = response.data.latitude;
        }
        if (refs.longitude.current) {
          refs.longitude.current.value = response.data.longitude;
        }
        addToast(`Coordinates found: ${response.data.latitude}, ${response.data.longitude}`);
      } else {
        addToast(response.data.message || 'Could not find coordinates. Enter manually.', 'error');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Geocoding failed. Enter coordinates manually.';
      addToast(errorMsg, 'error');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSubmit = () => onSubmit(getValues());

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fm-card">
        <div className="fm-header">
          <h3>{title}</h3>
          <button className="fm-close" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div className="fm-body">
          {/* Name of Port */}
          <div className="fm-row">
            <div className="fm-field">
              <label className="fm-label"><span className="fm-required">*</span>Name of Port</label>
              <input ref={refs.port_name} className="fm-input" type="text"
                defaultValue={initial.port_name} placeholder="Name of Port"
                onInput={e => { e.target.value = e.target.value.toUpperCase(); }}
              />
            </div>
          </div>

          {/* Country */}
          <div className="fm-row">
            <div className="fm-field">
              <label className="fm-label"><span className="fm-required">*</span>Country</label>
              <select className="fm-input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select Country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Port Code */}
          <div className="fm-row">
            <div className="fm-field">
              <label className="fm-label">Port Code</label>
              <input ref={refs.port_code} className="fm-input" type="text"
                defaultValue={initial.port_code} placeholder="Port Code"
                onInput={e => { e.target.value = e.target.value.toUpperCase(); }}
              />
            </div>
          </div>

          {/* Port Type + Size */}
          <div className="fm-row">
            <div className="fm-field fm-field-half">
              <label className="fm-label">Port Type</label>
              <select className="fm-input" value={portType} onChange={e => setPortType(e.target.value)}>
                <option value="">Select type…</option>
                {PORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fm-field fm-field-half">
              <label className="fm-label">Port Size</label>
              <select className="fm-input" value={portSize} onChange={e => setPortSize(e.target.value)}>
                <option value="">Select size…</option>
                {PORT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Latitude + Longitude */}
          <div className="fm-row">
            <div className="fm-field fm-field-half">
              <label className="fm-label">Latitude</label>
              <input ref={refs.latitude} className="fm-input" type="text"
                defaultValue={initial.latitude} placeholder="e.g. 22.572646" />
            </div>
            <div className="fm-field fm-field-half">
              <label className="fm-label">Longitude</label>
              <input ref={refs.longitude} className="fm-input" type="text"
                defaultValue={initial.longitude} placeholder="e.g. 88.363895" />
            </div>
          </div>

          {/* Auto-fill button */}
          <div className="fm-row">
            <div className="fm-field">
              <button className="cp-btn-outline" type="button" onClick={autoFillCoords}
                disabled={geoLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, width: '100%', justifyContent: 'center' }}>
                <FiMapPin size={13} />
                {geoLoading ? 'Looking up coordinates…' : 'Auto-fill Lat / Lon'}
              </button>
              <span style={{ fontSize: 11, color: '#9aa0b8', marginTop: 4, display: 'block' }}>
                Click above to auto-lookup coordinates from Port Name + Country via OpenStreetMap.
              </span>
            </div>
          </div>

          {/* WWW */}
          <div className="fm-row">
            <div className="fm-field">
              <label className="fm-label">WWW</label>
              <input ref={refs.website} className="fm-input" type="text"
                defaultValue={initial.website} placeholder="Website URL" />
            </div>
          </div>

          {/* Remarks */}
          <div className="fm-row">
            <div className="fm-field">
              <label className="fm-label">Remarks</label>
              <textarea ref={refs.remarks} className="fm-textarea" rows={3}
                defaultValue={initial.remarks} placeholder="Remarks"
                onInput={e => { e.target.value = e.target.value.toUpperCase(); }}
              />
            </div>
          </div>
        </div>

        <div className="fm-footer">
          <button className="cp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cp-btn-primary" onClick={handleSubmit}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Ports = () => {
  const [list, setList]               = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const searchRef = useRef(null);
  const [selectedPort, setSelectedPort] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [toasts, setToasts]           = useState([]);
  const [confirm, setConfirm]         = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [editingPort, setEditingPort] = useState(null);

  // ── Toast ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchPorts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/ports`, {
        params: { search: searchTerm }
      });
      setList(res.data);
    } catch (error) {
      console.error('Error fetching ports:', error);
      addToast('Failed to load ports. Is the server running?', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, addToast]);

  useEffect(() => {
    const t = setTimeout(fetchPorts, 300);
    return () => clearTimeout(t);
  }, [fetchPorts]);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openModal = (port = null) => {
    setEditingPort(port);
    setShowModal(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (formValues) => {
    if (!formValues.port_name?.trim()) { 
      addToast('Name of Port is required', 'error'); 
      return; 
    }
    if (!formValues.country?.trim()) { 
      addToast('Country is required', 'error'); 
      return; 
    }
    
    setSaving(true);
    try {
      const payload = { ...formValues, username: localStorage.getItem('userName') || 'admin' };
      let res;
      if (editingPort) {
        res = await axios.put(`${API_BASE_URL}/ports/${editingPort.port_id}`, payload);
      } else {
        res = await axios.post(`${API_BASE_URL}/ports`, payload);
      }
      if (res.data.success) {
        addToast(editingPort ? 'Port updated!' : 'Port created!');
        setShowModal(false);
        await fetchPorts();
        // Refresh selected port details
        if (editingPort) {
          const updated = { ...editingPort, ...formValues };
          setSelectedPort(updated);
        }
      }
    } catch (err) {
      console.error('Error saving port:', err);
      addToast(err.response?.data?.error || 'Error saving port', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = (port) => {
    setConfirm({
      message: `Delete "${port.port_name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await axios.delete(`${API_BASE_URL}/ports/${port.port_id}`);
          addToast('Port deleted');
          setList(prev => prev.filter(p => p.port_id !== port.port_id));
          if (selectedPort?.port_id === port.port_id) setSelectedPort(null);
        } catch (err) {
          console.error('Error deleting port:', err);
          addToast(err.response?.data?.error || 'Error deleting', 'error');
        }
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="cp-root">
      <Toast toasts={toasts} />
      {confirm && (
        <ConfirmModal message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}

      {/* ── PORT FORM MODAL ───────────────────────────────────────────────── */}
      {showModal && (
        <PortFormModal
          title={editingPort ? 'Edit Port' : 'Add/Edit Ports'}
          initial={editingPort || blank}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
          addToast={addToast}
        />
      )}

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-head">
          <div className="cp-sidebar-title-row">
            <span className="cp-sidebar-title">Ports</span>
            <button className="cp-btn-new" onClick={() => openModal(null)} title="Add new">
              <FiPlus />
            </button>
          </div>
          <div className="cp-search-wrap">
            <FiSearch className="cp-search-icon" />
            <input
              ref={searchRef}
              className="cp-search"
              type="text"
              placeholder="Search by name or country…"
              defaultValue={searchTerm}
              onChange={e => {
                const val = e.target.value;
                clearTimeout(window._portSearchTimer);
                window._portSearchTimer = setTimeout(() => setSearchTerm(val), 400);
              }}
            />
            <button className="cp-search-clear" onClick={() => {
              if (searchRef.current) searchRef.current.value = '';
              setSearchTerm('');
            }}>
              <FiX size={14} />
            </button>
          </div>
        </div>

        <div className="cp-list">
          {loading ? (
            <div className="cp-list-loading">
              {[1,2,3].map(i => <div key={i} className="cp-list-skeleton" />)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState title="No ports" sub="Create your first port"
              action={{ label: 'Add Port', fn: () => openModal(null) }} />
          ) : (
            list.map(port => (
              <div key={port.port_id}
                className={`cp-list-item ${selectedPort?.port_id === port.port_id ? 'active' : ''}`}
                onClick={() => setSelectedPort(port)}>
                <div className="cp-list-avatar"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff' }}>
                  <FiAnchor size={14} />
                </div>
                <div className="cp-list-info">
                  <span className="cp-list-name">{port.port_name}</span>
                  <span className="cp-list-meta">
                    {port.port_code && <span className="cp-badge">{port.port_code}</span>}
                    {port.country && <span className="cp-list-country">· {port.country}</span>}
                  </span>
                </div>
                <button className="cp-list-del" title="Delete"
                  onClick={e => { e.stopPropagation(); confirmDelete(port); }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cp-sidebar-foot">
          <span>{list.length} record{list.length !== 1 ? 's' : ''}</span>
          <button className="cp-refresh" onClick={fetchPorts} title="Refresh">
            <FiRefreshCw size={13} />
          </button>
        </div>
      </aside>

      {/* ── MAIN PANEL ───────────────────────────────────────────────────── */}
      <main className="cp-main">
        <div className="cp-topbar">
          <div className="cp-topbar-left">
            <h2 className="cp-page-title">Ports Setup</h2>
            {selectedPort?.port_name && (
              <span className="cp-breadcrumb">/ {selectedPort.port_name}</span>
            )}
          </div>
          <div className="cp-topbar-right">
            {selectedPort && (
              <button className="cp-btn-outline" onClick={() => openModal(selectedPort)}>
                <FiEdit2 size={14} /> Edit
              </button>
            )}
            <button className="cp-btn-primary" onClick={() => openModal(null)}>
              <FiPlus size={14} /> New Port
            </button>
          </div>
        </div>

        {!selectedPort ? (
          <div className="cp-blank">
            <EmptyState title="No port selected"
              sub="Pick one from the list or create a new one"
              action={{ label: 'New Port', fn: () => openModal(null) }} />
          </div>
        ) : (
          <div className="cp-content">

            {/* Hero */}
            <div className="cp-hero"
              style={{ background: 'linear-gradient(130deg,#0c2d48 0%,#1a6896 55%,#0ea5e9 100%)' }}>
              <div className="cp-hero-avatar" style={{ fontSize: 22 }}><FiAnchor /></div>
              <div className="cp-hero-info">
                <h1 className="cp-hero-name">{selectedPort.port_name}</h1>
                <p className="cp-hero-sub">
                  {selectedPort.port_code && <span>{selectedPort.port_code}</span>}
                  {selectedPort.country && (
                    <><span className="cp-dot">·</span><span>{selectedPort.country}</span></>
                  )}
                  {selectedPort.port_type && (
                    <><span className="cp-dot">·</span><span>{selectedPort.port_type}</span></>
                  )}
                </p>
              </div>
              <div className="cp-hero-status">
                <span className="cp-status-pill"><FiCheck size={11} /> Active</span>
              </div>
            </div>

            {/* Info card */}
            <div className="cp-card">
              <div className="cp-card-head">
                <span>Port Details</span>
                <button className="cp-btn-outline-sm" onClick={() => openModal(selectedPort)}>
                  <FiEdit2 size={12} /> Edit
                </button>
              </div>
              <div className="cp-info-grid cp-info-grid-3">
                {[
                  { label: 'Port Name',  val: selectedPort.port_name  },
                  { label: 'Port Code',  val: selectedPort.port_code  },
                  { label: 'Country',    val: selectedPort.country    },
                  { label: 'Port Type',  val: selectedPort.port_type  },
                  { label: 'Port Size',  val: selectedPort.port_size  },
                  { label: 'Latitude',   val: selectedPort.latitude   },
                  { label: 'Longitude',  val: selectedPort.longitude  },
                  { label: 'Website',    val: selectedPort.website    },
                ].map(({ label, val }) => (
                  <div className="cp-info-item" key={label}>
                    <span className="cp-info-label">{label}</span>
                    <span className="cp-info-val">{val || <span className="cp-na">—</span>}</span>
                  </div>
                ))}
              </div>
              {selectedPort.remarks && (
                <div className="cp-notes-section">
                  <span className="cp-info-label">Remarks</span>
                  <p className="cp-notes-text">{selectedPort.remarks}</p>
                </div>
              )}
            </div>

            {/* Map preview */}
            {selectedPort.latitude && selectedPort.longitude && (
              <div className="cp-card">
                <div className="cp-card-head"><span>Map Preview</span></div>
                <div style={{ height: 300, overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
                  <iframe
                    title="Port Map"
                    width="100%" height="300"
                    style={{ border: 'none', display: 'block' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(selectedPort.longitude)-0.5},${parseFloat(selectedPort.latitude)-0.5},${parseFloat(selectedPort.longitude)+0.5},${parseFloat(selectedPort.latitude)+0.5}&layer=mapnik&marker=${selectedPort.latitude},${selectedPort.longitude}`}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default Ports;