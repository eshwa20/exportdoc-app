import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FiPlus, FiEdit2, FiSearch, FiCheck, FiX, FiTrash2,
  FiAlertCircle, FiFile, FiUpload, FiPackage,
  FiFileText, FiImage, FiCode, FiArchive, FiChevronDown
} from 'react-icons/fi';
import './inquiry.css';

const API_BASE_URL = 'http://localhost:5000/api';
const TODAY = new Date().toISOString().split('T')[0];

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        {t.type === 'success' ? <FiCheck size={14}/> : <FiAlertCircle size={14}/>}
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay" style={{ zIndex: 1200 }}>
    <div className="modal-card">
      <div className="modal-icon"><FiAlertCircle size={28}/></div>
      <h3>Confirm Action</h3>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="inq-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="inq-btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ lines = 3 }) => (
  <div className="skeleton-wrap">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
    ))}
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="inq-empty">
    <div className="empty-icon"><Icon size={28}/></div>
    <h3>{title}</h3>
    <p>{sub}</p>
    {action && (
      <button className="inq-btn-primary-sm" onClick={action.fn}>
        <FiPlus size={12}/> {action.label}
      </button>
    )}
  </div>
);

// ── Form field helpers ────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div className="inq-field">
    <label className="inq-label">
      {required && <span className="inq-required">*</span>}
      {label}
    </label>
    {children}
  </div>
);
// Auto-uppercase wrapper for onChange
const upper = (fn) => (e) => { e.target.value = e.target.value.toUpperCase(); fn(e); };

const TI = ({ value, onChange, placeholder, readOnly, required }) => (
  <input className={`inq-input${readOnly ? ' inq-input-ro' : ''}`}
    type="text" value={value || ''} placeholder={placeholder || ''}
    readOnly={readOnly} required={required}
    onChange={readOnly ? undefined : upper(onChange)}
    style={{ textTransform: readOnly ? undefined : 'uppercase' }}/>
);
const DI = ({ value, onChange, max }) => (
  <input className="inq-input" type="date" value={value || ''} max={max} onChange={onChange}/>
);
const SI = ({ value, onChange, options, placeholder }) => (
  <select className="inq-input" value={value || ''} onChange={onChange}>
    <option value="">{placeholder || 'Select…'}</option>
    {options.map(o => (
      <option key={typeof o === 'object' ? o.value : o}
        value={typeof o === 'object' ? o.value : o}>
        {typeof o === 'object' ? o.label : o}
      </option>
    ))}
  </select>
);
const TA = ({ value, onChange, placeholder, rows = 2 }) => (
  <textarea className="inq-textarea" value={value || ''} placeholder={placeholder}
    onChange={upper(onChange)} rows={rows}
    style={{ textTransform: 'uppercase' }}/>
);

// ── File icon ─────────────────────────────────────────────────────────────────
const fileIcon = (mime, name) => {
  if (mime?.includes('image'))   return <FiImage    size={14} style={{color:'#3b82f6'}}/>;
  if (mime?.includes('pdf'))     return <FiFileText size={14} style={{color:'#ef4444'}}/>;
  if (mime?.includes('word') || mime?.includes('document'))
                                 return <FiFileText size={14} style={{color:'#2563eb'}}/>;
  if (mime?.includes('excel') || mime?.includes('spreadsheet'))
                                 return <FiArchive  size={14} style={{color:'#16a34a'}}/>;
  if (mime?.includes('zip'))     return <FiArchive  size={14} style={{color:'#d97706'}}/>;
  if (mime?.includes('octet') || name?.endsWith('.sql'))
                                 return <FiCode     size={14} style={{color:'#7c3aed'}}/>;
  return                                <FiFile     size={14} style={{color:'#6b7494'}}/>;
};

// ─────────────────────────────────────────────────────────────────────────────
//  INLINE PRODUCT TABLE
// ─────────────────────────────────────────────────────────────────────────────
const ProductTable = ({ rows, onSaveRow, onDeleteRow, saving }) => {
  const [editRows, setEditRows] = useState({});
  const [newRow,   setNewRow]   = useState(null);

  // Clear edit state whenever the rows list is refreshed from server
  useEffect(() => { setEditRows({}); }, [rows]);

  const startEdit  = (row) => setEditRows(p => ({ ...p, [row.line_id]: { ...row } }));
  const cancelEdit = (row) => setEditRows(p => { const n = { ...p }; delete n[row.line_id]; return n; });
  const updEdit    = (k, f, v) => setEditRows(p => ({ ...p, [k]: { ...p[k], [f]: v } }));
  const saveExist  = async (k) => { await onSaveRow(editRows[k]); };

  const addNew   = () => setNewRow({ _t: Date.now(), line_id:null, prod_id:'', desc_good:'', unit:'', packtyp:'', itemperpack:'', totpkgs:'', totitm:'', color:'' });
  const cancelNew = () => setNewRow(null);
  const updNew    = (f, v) => setNewRow(p => ({ ...p, [f]: v }));
  const saveNew   = async () => { if (!newRow.prod_id) return; await onSaveRow(newRow); setNewRow(null); };

  // Inline cell input — text fields stored uppercase, numeric fields as-is
  const C = ({ field, rowKey, isNew, num }) => (
    <input className="inq-cell-input"
      style={{ textAlign: num ? 'right' : 'left', textTransform: num ? undefined : 'uppercase' }}
      value={isNew ? (newRow?.[field] ?? '') : (editRows[rowKey]?.[field] ?? '')}
      placeholder={field === 'prod_id' ? 'Product ID *' : ''}
      onChange={e => {
        const val = num ? e.target.value : e.target.value.toUpperCase();
        isNew ? updNew(field, val) : updEdit(rowKey, field, val);
      }}/>
  );

  const total = rows.reduce((s, r) => s + (parseFloat(r.totitm) || 0), 0);

  return (
    <div className="inq-section">
      <div className="inq-section-head">
        <span className="inq-section-title"><FiPackage size={14}/>&nbsp;Inquiry Products</span>
        <button className="inq-btn-outline-sm" onClick={addNew} disabled={!!newRow}>
          <FiPlus size={12}/> Add Row
        </button>
      </div>
      <div className="inq-tbl-scroll">
        <table className="inq-tbl">
          <thead>
            <tr>
              <th style={{width:32}}>#</th>
              <th style={{minWidth:110}}>Product ID *</th>
              <th style={{minWidth:160}}>Description</th>
              <th style={{width:74}}>Unit</th>
              <th style={{width:120}}>Packing Type</th>
              <th style={{width:86, textAlign:'right'}}>Item/Pack</th>
              <th style={{width:96, textAlign:'right'}}>Total Pkgs</th>
              <th style={{width:96, textAlign:'right'}}>Total Items</th>
              <th style={{width:84}}>Color</th>
              <th style={{width:72, textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !newRow && (
              <tr>
                <td colSpan={10} className="inq-tbl-empty">
                  No products yet — click <strong>Add Row</strong> to begin.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const key = row.line_id;
              const ed  = !!editRows[key];
              return (
                <tr key={key} className={ed ? 'inq-row-ed' : ''}>
                  <td className="inq-row-num">{idx + 1}</td>
                  {ed ? (
                    <>
                      <td><C field="prod_id"     rowKey={key}/></td>
                      <td><C field="desc_good"   rowKey={key}/></td>
                      <td><C field="unit"        rowKey={key}/></td>
                      <td><C field="packtyp"     rowKey={key}/></td>
                      <td><C field="itemperpack" rowKey={key} num/></td>
                      <td><C field="totpkgs"     rowKey={key} num/></td>
                      <td><C field="totitm"      rowKey={key} num/></td>
                      <td><C field="color"       rowKey={key}/></td>
                      <td>
                        <div className="inq-row-acts">
                          <button className="inq-row-btn inq-row-save" title="Save" disabled={saving} onClick={() => saveExist(key)}><FiCheck size={13}/></button>
                          <button className="inq-row-btn" title="Cancel" onClick={() => cancelEdit(row)}><FiX size={13}/></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="inq-cell-bold">{row.prod_id}</td>
                      <td className="inq-cell-trunc" title={row.desc_good}>{row.desc_good || '—'}</td>
                      <td>{row.unit || '—'}</td>
                      <td>{row.packtyp || '—'}</td>
                      <td className="inq-cell-r">{row.itemperpack != null ? Number(row.itemperpack).toLocaleString() : '—'}</td>
                      <td className="inq-cell-r">{row.totpkgs     != null ? Number(row.totpkgs).toLocaleString()     : '—'}</td>
                      <td className="inq-cell-r">{row.totitm      != null ? Number(row.totitm).toLocaleString()      : '—'}</td>
                      <td>{row.color || '—'}</td>
                      <td>
                        <div className="inq-row-acts">
                          <button className="inq-row-btn inq-row-edit" title="Edit"   onClick={() => startEdit(row)}><FiEdit2  size={13}/></button>
                          <button className="inq-row-btn inq-row-del"  title="Delete" onClick={() => onDeleteRow(row.line_id)}><FiTrash2 size={13}/></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {/* New unsaved row */}
            {newRow && (
              <tr className="inq-row-ed inq-row-new">
                <td className="inq-row-num" style={{color:'#3b82f6', fontWeight:700}}>*</td>
                <td><C field="prod_id"     isNew/></td>
                <td><C field="desc_good"   isNew/></td>
                <td><C field="unit"        isNew/></td>
                <td><C field="packtyp"     isNew/></td>
                <td><C field="itemperpack" isNew num/></td>
                <td><C field="totpkgs"     isNew num/></td>
                <td><C field="totitm"      isNew num/></td>
                <td><C field="color"       isNew/></td>
                <td>
                  <div className="inq-row-acts">
                    <button className="inq-row-btn inq-row-save" title="Save" disabled={saving || !newRow?.prod_id} onClick={saveNew}><FiCheck size={13}/></button>
                    <button className="inq-row-btn" title="Cancel" onClick={cancelNew}><FiX size={13}/></button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} className="inq-tbl-foot-label">Total Items:</td>
                <td className="inq-tbl-foot-val">{total.toLocaleString()}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  DOCUMENT SECTION  — matches reference images exactly
//  Shows: collapsible header + "Upload Document" button,
//         file-drop zone (matching Image 3), then the documents table (Image 2)
// ─────────────────────────────────────────────────────────────────────────────
const DocumentSection = ({ documents, onUpload, onDelete, uploading }) => {
  const [open,         setOpen]         = useState(true);
  const [showUpload,   setShowUpload]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType,      setDocType]      = useState('');
  const [dragOver,     setDragOver]     = useState(false);
  const fileRef = useRef();

  const fmtSize = b => b < 1048576
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / 1048576).toFixed(2)} MB`;

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelectedFile(f);
  };

  const doUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, docType);
    setSelectedFile(null); setDocType(''); setShowUpload(false);
  };

  const cancelUpload = () => { setShowUpload(false); setSelectedFile(null); setDocType(''); };

  return (
    <div className="inq-section">
      {/* ── Collapsible section header ─────────────────────────────────── */}
      <div className="inq-section-head" style={{cursor:'pointer'}}
        onClick={() => setOpen(p => !p)}>
        <span className="inq-section-title">
          <FiChevronDown size={14} className={`inq-chevron ${open ? 'inq-chevron-open' : ''}`}/>
          &nbsp;Inquiry Documents
          <span className="inq-cnt-badge">{documents.length}</span>
        </span>
        {open && (
          <button className="inq-btn-outline-sm"
            onClick={e => { e.stopPropagation(); setShowUpload(p => !p); }}>
            <FiUpload size={12}/> {showUpload ? 'Hide Upload' : 'Upload Document'}
          </button>
        )}
      </div>

      {open && (
        <>
          {/* ── Upload panel — matches Image 3 ──────────────────────────── */}
          {showUpload && (
            <div className="inq-upload-panel">
              <div className="inq-upload-title">Upload Documents</div>

              <div className="inq-upload-label">File Name</div>

              {/* Drop zone */}
              <div
                className={`inq-drop-zone${dragOver ? ' inq-dz-over' : ''}${selectedFile ? ' inq-dz-filled' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file"
                  accept=".jpeg,.jpg,.png,.tif,.tiff,.bmp,.gif,.docx,.doc,.xls,.xlsx,.pdf,.txt,.sql,.zip"
                  style={{display:'none'}}
                  onChange={e => e.target.files[0] && setSelectedFile(e.target.files[0])}/>

                {selectedFile ? (
                  <div className="inq-file-row">
                    {fileIcon(selectedFile.type, selectedFile.name)}
                    <div className="inq-file-info">
                      <div className="inq-file-name">{selectedFile.name}</div>
                      <div className="inq-file-meta">{fmtSize(selectedFile.size)} · {selectedFile.type || 'unknown'}</div>
                    </div>
                    <button className="inq-file-remove"
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); }}>
                      <FiX size={14}/>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="inq-dz-icon"><FiFile size={40} style={{color:'#9aa0b8'}}/></div>
                    <div className="inq-dz-title">Select File to attach</div>
                    <div className="inq-dz-hint">
                      Attach files. You can upload file types [.jpeg, .jpg, .png, .tif, .tiff, .bmp,
                      .gif, .docx, .doc, .xls, .xlsx, .pdf, .txt, .sql, .zip]. Each file can be max 10 MB
                    </div>
                    <button className="inq-choose-btn"
                      onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                      Choose Files
                    </button>
                  </>
                )}
              </div>

              {/* Doc type selector + action buttons */}
              <div className="inq-upload-footer">
                <div className="inq-upload-type">
                  <label className="inq-label">Document Type</label>
                  <select className="inq-input" value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="">Select type (optional)</option>
                    {['Email_Image','Invoice','PO_Copy','Shipping_Doc','Other'].map(o =>
                      <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="inq-upload-actions">
                  <button className="inq-btn-ghost" onClick={cancelUpload}>Cancel</button>
                  <button className="inq-btn-primary" onClick={doUpload}
                    disabled={uploading || !selectedFile}>
                    {uploading ? 'Uploading…' : <><FiUpload size={13}/> Upload</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Documents table — matches Image 2 ───────────────────────── */}
          {documents.length > 0 ? (
            <div className="inq-tbl-scroll">
              <table className="inq-tbl">
                <thead>
                  <tr>
                    <th style={{width:36}}></th>
                    <th>Doc Type</th>
                    <th style={{textAlign:'right'}}>Image Size Kb</th>
                    <th>Image File Name</th>
                    <th>Image Mime Type</th>
                    <th>Image Icon</th>
                    <th style={{width:54, textAlign:'center'}}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.inquiry_doc_id}>
                      <td style={{textAlign:'center', paddingLeft:8}}>
                        {fileIcon(doc.image_mime_type, doc.image_file_name)}
                      </td>
                      <td>{doc.doc_type || '—'}</td>
                      <td style={{textAlign:'right'}}>{doc.image_size_kb || '—'}</td>
                      <td className="inq-cell-trunc" title={doc.image_file_name}>{doc.image_file_name || '—'}</td>
                      <td style={{fontSize:11, color:'#6b7494'}}>{doc.image_mime_type || '—'}</td>
                      <td style={{fontSize:11, color:'#7c3aed', fontFamily:'monospace'}}>{doc.image_icon || '—'}</td>
                      <td style={{textAlign:'center'}}>
                        <button className="inq-row-btn inq-row-del" onClick={() => onDelete(doc.inquiry_doc_id)}>
                          <FiTrash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7} style={{fontSize:12, color:'#6b7494', padding:'8px 12px'}}>
                      Total {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : !showUpload ? (
            <div className="inq-doc-empty">
              No documents attached.&nbsp;
              <button className="inq-link-btn" onClick={() => setShowUpload(true)}>
                Upload one now
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  INQUIRY MODAL  (full-screen ERP-style, matches Image 1)
//  Contains: header fields → product table → documents section
// ─────────────────────────────────────────────────────────────────────────────
const InquiryModal = ({
  title, onClose, onSubmit, submitLabel,
  form, onChange,
  parties, inquiryModes, currencies,
  productRows, onSaveRow, onDeleteRow, productSaving,
  documents, onUploadDoc, onDeleteDoc, uploading,
  isNew, detailLoading
}) => {
  const f = (k, v) => onChange(k, v);

  return (
    <div className="inq-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="inq-modal-win">

        {/* Fixed header */}
        <div className="inq-modal-hdr">
          <span className="inq-modal-htitle">Inquiry</span>
          <button className="inq-modal-close" onClick={onClose}><FiX size={18}/></button>
        </div>

        {/* Scrollable body */}
        <div className="inq-modal-body">
          <div className="inq-modal-scroll-content">
            {/* ── Row 1: 4 cols ─────────────────────────────────────────── */}
            <div className="inq-grid inq-grid-4">
              <Field label="Cust Inquiry Id" required>
                <TI value={form.cust_inquiry_id} placeholder="e.g. APJL/005/23-24"
                  onChange={e => f('cust_inquiry_id', e.target.value)} required/>
              </Field>
              <Field label="Inquiry Date">
                <DI value={form.inquiry_date} max={TODAY} onChange={e => f('inquiry_date', e.target.value)}/>
              </Field>
              <Field label="Inquiry Mode">
                <SI value={form.inquiry_mode} options={inquiryModes}
                  placeholder="Select mode" onChange={e => f('inquiry_mode', e.target.value)}/>
              </Field>
              <Field label="Inquiry Valid Till">
                <DI value={form.inquiry_valid_till} onChange={e => f('inquiry_valid_till', e.target.value)}/>
              </Field>
            </div>

            {/* ── Row 2: Importer Ref No · Importer Ref Date ───────────── */}
            <div className="inq-grid inq-grid-2">
              <Field label="Importer Reference No">
                <TI value={form.cust_ref_no} placeholder="e.g. ref 1"
                  onChange={e => f('cust_ref_no', e.target.value)}/>
              </Field>
              <Field label="Importer Ref Date">
                <DI value={form.cust_ref_date} onChange={e => f('cust_ref_date', e.target.value)}/>
              </Field>
            </div>

            {/* ── Row 3: Importer · Address ─────────────────────────────── */}
            <div className="inq-grid inq-grid-2">
              <Field label="Importer">
                <SI value={form.party_id}
                  options={parties.map(p => ({ value: p.party_id, label: p.party_name }))}
                  placeholder="Select customer" onChange={e => f('party_id', e.target.value)}/>
              </Field>
              <Field label="Address">
                <TI value={form.address || ''} placeholder="Auto-filled from importer" readOnly/>
              </Field>
            </div>

            {/* ── Row 4: Agent · Agent Address ──────────────────────────── */}
            <div className="inq-grid inq-grid-2">
              <Field label="Agent">
                <TI value={form.agent || ''} placeholder="Agent" readOnly/>
              </Field>
              <Field label="Agent Address">
                <TI value={form.agent_address || ''} placeholder="Agent address" readOnly/>
              </Field>
            </div>

            {/* ── Row 5: Goods Desc · Term Packing · Term Validity · Terms Payment */}
            <div className="inq-grid inq-grid-4">
              <Field label="Goods Description">
                <TI value={form.goods_description} placeholder="Goods description"
                  onChange={e => f('goods_description', e.target.value)}/>
              </Field>
              <Field label="Term Packing">
                <TI value={form.term_packing} placeholder="e.g. CARTON"
                  onChange={e => f('term_packing', e.target.value)}/>
              </Field>
              <Field label="Term Validity">
                <TI value={form.term_validity} placeholder="Validity terms"
                  onChange={e => f('term_validity', e.target.value)}/>
              </Field>
              <Field label="Terms Payment">
                <TI value={form.terms_payment} placeholder="Payment terms"
                  onChange={e => f('terms_payment', e.target.value)}/>
              </Field>
            </div>

            {/* ── Row 6: Port of Loading · Port of Destination · Currency ── */}
            <div className="inq-grid inq-grid-3">
              <Field label="Port Of Loading">
                <TI value={form.port_of_loading} placeholder="e.g. KANDLA-IXY-INDIA"
                  onChange={e => f('port_of_loading', e.target.value)}/>
              </Field>
              <Field label="Port Of Destination">
                <TI value={form.port_of_destination} placeholder="e.g. JABEL ALI-JEA-UAE"
                  onChange={e => f('port_of_destination', e.target.value)}/>
              </Field>
              <Field label="Currency">
                <SI value={form.currency_code} options={currencies}
                  placeholder="Select currency" onChange={e => f('currency_code', e.target.value)}/>
              </Field>
            </div>

            {/* ── Row 7: Remarks ────────────────────────────────────────── */}
            <div className="inq-grid inq-grid-1">
              <Field label="Remarks">
                <TA value={form.remarks} placeholder="Additional remarks"
                  onChange={e => f('remarks', e.target.value)} rows={2}/>
              </Field>
            </div>

            {/* ── Products section ──────────────────────────────────────── */}
            {isNew ? (
              <div className="inq-hint-box">
                <FiPackage size={14}/> Save the inquiry first, then add products and documents.
              </div>
            ) : detailLoading ? (
              <div className="inq-section"><Skeleton lines={4}/></div>
            ) : (
              <>
                <ProductTable
                  rows={productRows}
                  onSaveRow={onSaveRow}
                  onDeleteRow={onDeleteRow}
                  saving={productSaving}
                />
                {/* ── Documents section ────────────────────────────────── */}
                <DocumentSection
                  documents={documents}
                  onUpload={onUploadDoc}
                  onDelete={onDeleteDoc}
                  uploading={uploading}
                />
              </>
            )}
          </div>
        </div>

        {/* Fixed footer */}
        <div className="inq-modal-ftr">
          <button className="inq-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="inq-btn-primary" onClick={onSubmit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN INQUIRY PAGE
// ─────────────────────────────────────────────────────────────────────────────
const Inquiry = () => {
  const [inquiries,     setInquiries]     = useState([]);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [loading,       setLoading]       = useState(false);
  const [toasts,        setToasts]        = useState([]);
  const [confirm,       setConfirm]       = useState(null);
  const [parties,       setParties]       = useState([]);

  const [modalOpen,     setModalOpen]     = useState(false);
  const [modalIsNew,    setModalIsNew]    = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);

  const [selectedId,    setSelectedId]    = useState(null);
  const [details,       setDetails]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const inquiryModes = ['EMAIL', 'PHONE', 'FAX', 'COURIER', 'WHATSAPP', 'PORTAL'];
  const currencies   = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CNY', 'JPY'];

  const blankForm = {
    inquiry_id:'', cust_inquiry_id:'', inquiry_date:TODAY, inquiry_valid_till:'',
    inquiry_mode:'', party_id:'', cust_ref_no:'', cust_ref_date:'', currency_code:'',
    goods_description:'', term_packing:'', term_validity:'', terms_payment:'',
    port_of_loading:'', port_of_destination:'', remarks:''
  };
  const [form, setForm] = useState(blankForm);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Fetch inquiry list ─────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/inquiries`, { params: { search: searchTerm } });
      setInquiries(r.data.rows || []);
    } catch { addToast('Failed to load inquiries', 'error'); }
    finally  { setLoading(false); }
  }, [searchTerm, addToast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch customers ────────────────────────────────────────────────────────
  const fetchParties = useCallback(async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/parties`, { params: { type: 'CUSTOMER' } });
      setParties(Array.isArray(r.data) ? r.data : (r.data.rows || []));
    } catch {}
  }, []);
  useEffect(() => { fetchParties(); }, [fetchParties]);

  // ── Load single inquiry (details + products + docs) ────────────────────────
  const loadDetails = async (id) => {
    setDetailLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/inquiries/detail`, { params: { id } });
      setDetails(r.data); setSelectedId(id);
      return r.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error loading inquiry details';
      console.error('loadDetails error:', err.response?.data || err);
      addToast(`Error: ${msg}`, 'error');
      return null;
    }
    finally  { setDetailLoading(false); }
  };

  // ── Open NEW modal ─────────────────────────────────────────────────────────
  const openNew = () => {
    const n = new Date();
    const d = String(n.getDate()).padStart(2,'0');
    const m = n.toLocaleString('en-GB',{month:'short'}).toUpperCase();
    const y = n.getFullYear();
    setForm({ ...blankForm, inquiry_id:`INQ/${d}-${m}-${y}`, inquiry_date:TODAY });
    setDetails(null); setSelectedId(null);
    setModalIsNew(true); setModalOpen(true);
  };

  // ── Open EDIT modal ────────────────────────────────────────────────────────
  const openEdit = async (id) => {
    const d = await loadDetails(id);
    if (!d) return;
    setForm({ ...blankForm, ...d.inquiry });
    setModalIsNew(false); setModalOpen(true);
  };

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Save inquiry header ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.inquiry_id)      { addToast('Inquiry ID is required', 'error'); return; }
    if (!form.cust_inquiry_id) { addToast('Cust Inquiry ID is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, username: localStorage.getItem('userName') || 'admin' };
      let r;
      if (selectedId) r = await axios.put(`${API_BASE_URL}/inquiries/update`, payload, { params: { id: selectedId } });
      else            r = await axios.post(`${API_BASE_URL}/inquiries`, payload);

      if (r.data.success) {
        addToast(selectedId ? 'Inquiry updated!' : 'Inquiry created!');
        await fetchList();
        const id = r.data.inquiry_id || selectedId;
        if (id) {
          const d = await loadDetails(id);
          if (d) { setForm({ ...blankForm, ...d.inquiry }); setModalIsNew(false); }
        }
      } else {
        addToast(r.data.error || 'Error saving', 'error');
      }
    } catch (err) { addToast(err.response?.data?.error || 'Error saving inquiry', 'error'); }
    finally       { setSaving(false); }
  };

  // ── Delete inquiry ─────────────────────────────────────────────────────────
  const confirmDel = (id, custId) => setConfirm({
    message: `Delete inquiry "${custId}"? All products and documents will also be deleted.`,
    onConfirm: async () => {
      setConfirm(null);
      try {
        await axios.delete(`${API_BASE_URL}/inquiries/remove`, { params: { id } });
        addToast('Inquiry deleted'); setModalOpen(false); await fetchList();
      } catch (err) { addToast(err.response?.data?.error || 'Error deleting', 'error'); }
    }
  });

  // ── Save product row ───────────────────────────────────────────────────────
  const saveRow = async (rowData) => {
    if (!rowData.prod_id) { addToast('Product ID is required', 'error'); return; }
    setSaving(true);
    try {
      const p = { ...rowData, username: localStorage.getItem('userName') || 'admin' };
      let r;
      if (rowData.line_id) r = await axios.put(`${API_BASE_URL}/inquiries/details/update`, p, { params: { id: selectedId, lineId: rowData.line_id } });
      else                 r = await axios.post(`${API_BASE_URL}/inquiries/details/add`, p, { params: { id: selectedId } });
      if (r.data.success) { addToast(rowData.line_id ? 'Product updated!' : 'Product added!'); await loadDetails(selectedId); }
    } catch (err) { addToast(err.response?.data?.error || 'Error saving product', 'error'); }
    finally       { setSaving(false); }
  };

  // ── Delete product row ─────────────────────────────────────────────────────
  const delRow = (lineId) => setConfirm({
    message: 'Delete this product from the inquiry?',
    onConfirm: async () => {
      setConfirm(null);
      try {
        await axios.delete(`${API_BASE_URL}/inquiries/details/remove`, { params: { id: selectedId, lineId } });
        addToast('Product deleted'); await loadDetails(selectedId);
      } catch (err) { addToast(err.response?.data?.error || 'Error deleting product', 'error'); }
    }
  });

  // ── Upload document ────────────────────────────────────────────────────────
  const uploadDoc = async (file, docType) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('document', file);
    fd.append('doc_type', docType);
    fd.append('username', localStorage.getItem('userName') || 'admin');
    try {
      const r = await axios.post(`${API_BASE_URL}/inquiries/documents/upload`, fd,
        { params: { id: selectedId }, headers: { 'Content-Type': 'multipart/form-data' } });
      if (r.data.success) { addToast('Document uploaded!'); await loadDetails(selectedId); }
    } catch (err) { addToast(err.response?.data?.error || 'Error uploading', 'error'); }
    finally       { setUploading(false); }
  };

  // ── Delete document ────────────────────────────────────────────────────────
  const delDoc = (docId) => setConfirm({
    message: 'Delete this document?',
    onConfirm: async () => {
      setConfirm(null);
      try {
        await axios.delete(`${API_BASE_URL}/inquiries/documents/remove`, { params: { id: selectedId, docId } });
        addToast('Document deleted'); await loadDetails(selectedId);
      } catch (err) { addToast(err.response?.data?.error || 'Error deleting document', 'error'); }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="inq-root">
      <Toast toasts={toasts}/>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      {/* ── Inquiry modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <InquiryModal
          title={modalIsNew ? 'New Inquiry' : 'Edit Inquiry'}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          submitLabel={saving ? 'Saving…' : (modalIsNew ? 'Save & Continue' : 'Save Changes')}
          form={form}
          onChange={handleChange}
          parties={parties}
          inquiryModes={inquiryModes}
          currencies={currencies}
          isNew={modalIsNew}
          detailLoading={detailLoading}
          productRows={details?.details || []}
          onSaveRow={saveRow}
          onDeleteRow={delRow}
          productSaving={saving}
          documents={details?.documents || []}
          onUploadDoc={uploadDoc}
          onDeleteDoc={delDoc}
          uploading={uploading}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="inq-header">
        <h1 className="inq-title">Inquiries</h1>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="inq-toolbar">
        <div className="inq-toolbar-left">
          <div className="inq-search-wrap">
            <FiSearch className="inq-search-icon" size={14}/>
            <input className="inq-search" type="text"
              placeholder="Search by Customer, Inquiry ID…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="inq-search-clear">
                <FiX size={13}/>
              </button>
            )}
          </div>
        </div>
        <div className="inq-toolbar-right">
          <button className="inq-btn-primary" onClick={openNew}>
            <FiPlus size={14}/> New Inquiry
          </button>
        </div>
      </div>

      {/* ── Inquiry list ──────────────────────────────────────────────── */}
      <div className="inq-table-wrap">
        {loading ? (
          <div className="inq-loading"><Skeleton lines={6}/></div>
        ) : inquiries.length === 0 ? (
          <EmptyState icon={FiFile} title="No inquiries found"
            sub="Create your first inquiry to get started"
            action={{ label:'New Inquiry', fn: openNew }}/>
        ) : (
          <table className="inq-table">
            <thead>
              <tr>
                <th>Cust Inquiry ID</th>
                <th>Inquiry Date</th>
                <th>Customer</th>
                <th>Cust Ref No</th>
                <th>Valid Till</th>
                <th>Currency</th>
                <th>Mode</th>
                <th style={{width:70, textAlign:'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map(item => (
                <tr key={item.inquiry_id} style={{cursor:'pointer'}}
                  onClick={() => openEdit(item.inquiry_id)}>
                  <td className="inq-cell-bold">{item.cust_inquiry_id}</td>
                  <td>{item.inquiry_date ? new Date(item.inquiry_date).toLocaleDateString() : '—'}</td>
                  <td>{item.customer_name || '—'}</td>
                  <td className="inq-cell-mono">{item.cust_ref_no || '—'}</td>
                  <td>{item.inquiry_valid_till ? new Date(item.inquiry_valid_till).toLocaleDateString() : '—'}</td>
                  <td><span className="inq-currency-badge">{item.currency_code || '—'}</span></td>
                  <td>{item.inquiry_mode || '—'}</td>
                  <td style={{textAlign:'center'}}>
                    <div className="inq-row-acts" style={{justifyContent:'center'}}>
                      <button className="inq-row-btn inq-row-edit" title="Edit"
                        onClick={e => { e.stopPropagation(); openEdit(item.inquiry_id); }}>
                        <FiEdit2 size={13}/>
                      </button>
                      <button className="inq-row-btn inq-row-del" title="Delete"
                        onClick={e => { e.stopPropagation(); confirmDel(item.inquiry_id, item.cust_inquiry_id); }}>
                        <FiTrash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inquiry;