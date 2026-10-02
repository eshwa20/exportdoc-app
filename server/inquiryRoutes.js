const express = require('express');
const router  = express.Router({ mergeParams: true });
const db      = require('./db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'inquiries');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpeg','.jpg','.png','.tif','.tiff','.bmp','.gif',
                '.docx','.doc','.xls','.xlsx','.pdf','.txt','.sql','.zip'];
    cb(null, ok.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function iconFromMime(mime) {
  if (!mime)                                              return 'fa-file-o';
  if (mime.includes('image'))                             return 'fa-file-image-o';
  if (mime.includes('pdf'))                               return 'fa-file-pdf-o';
  if (mime.includes('word') || mime.includes('document')) return 'fa-file-word-o';
  if (mime.includes('excel')|| mime.includes('spreadsheet')) return 'fa-file-excel-o';
  if (mime.includes('zip')  || mime.includes('compressed'))  return 'fa-file-zip-o';
  if (mime.includes('text'))                              return 'fa-file-text-o';
  if (mime.includes('octet'))                             return 'fa-file-code-o';
  return 'fa-file-o';
}

// Uppercase all string fields except those in the skip list
function up(obj, skip = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = (typeof v === 'string' && !skip.includes(k)) ? v.toUpperCase() : v;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/inquiries  — list all
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  const { search } = req.query;
  try {
    let q = `
      SELECT i.inquiry_id, i.cust_inquiry_id, i.inquiry_date, i.inquiry_valid_till,
             i.inquiry_mode, i.party_id, i.cust_ref_no, i.currency_code,
             i.port_of_loading, i.port_of_destination,
             pm.party_name AS customer_name
      FROM   export.inquiry i
      LEFT   JOIN export.party_master pm ON i.party_id = pm.party_id`;
    const params = [];
    if (search && search.trim()) {
      q += ` WHERE (pm.party_name ILIKE $1 OR i.cust_inquiry_id ILIKE $1
                    OR CAST(i.inquiry_id AS TEXT) ILIKE $1)`;
      params.push(`%${search.trim()}%`);
    }
    q += ' ORDER BY i.inquiry_date DESC, i.inquiry_id DESC';
    const r = await db.query(q, params);
    res.json({ success: true, rows: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('getInquiries:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/inquiries/detail?id=INQ/28-MAY-2026  — single inquiry
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/detail', async (req, res) => {
  const id = decodeURIComponent(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id query param required' });
  console.log('Loading inquiry detail for ID:', id);
  try {
    const inqR = await db.query(
      `SELECT i.*, pm.party_name AS customer_name
       FROM   export.inquiry i
       LEFT   JOIN export.party_master pm ON i.party_id = pm.party_id
       WHERE  i.inquiry_id = $1`,
      [id]
    );
    if (!inqR.rows.length) return res.status(404).json({ error: 'Inquiry not found' });
    const inquiry = inqR.rows[0];

    const detR = await db.query(
      `SELECT * FROM export.inquiry_detail WHERE inquiry_id = $1 ORDER BY line_id`, [id]
    );
    const docR = await db.query(
      `SELECT * FROM export.inquiry_doc WHERE inquiry_id = $1 ORDER BY createdon DESC`, [id]
    );
    res.json({ inquiry, customer: { party_name: inquiry.customer_name },
               details: detR.rows, documents: docR.rows });
  } catch (err) {
    console.error('getDetail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/inquiries  — create
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const p = up(req.body, ['username','inquiry_date','inquiry_valid_till','cust_ref_date','party_id','entity_unit_id']);
  console.log('Creating inquiry:', p.inquiry_id);
  try {
    const r = await db.query(
      `INSERT INTO export.inquiry
         (entity_unit_id, inquiry_id, cust_inquiry_id, inquiry_date, inquiry_valid_till,
          inquiry_mode, party_id, cust_ref_no, cust_ref_date, currency_code,
          goods_description, term_packing, term_validity, terms_payment,
          port_of_loading, port_of_destination, remarks, createdby, updatedby)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING inquiry_id`,
      [
        p.entity_unit_id || 1,
        p.inquiry_id, p.cust_inquiry_id,
        p.inquiry_date || null, p.inquiry_valid_till || null,
        p.inquiry_mode || null, p.party_id || null,
        p.cust_ref_no || null, p.cust_ref_date || null,
        p.currency_code || null, p.goods_description || null,
        p.term_packing || null, p.term_validity || null, p.terms_payment || null,
        p.port_of_loading || null, p.port_of_destination || null,
        p.remarks || null,
        p.username || 'ADMIN', p.username || 'ADMIN'
      ]
    );
    res.json({ success: true, inquiry_id: r.rows[0].inquiry_id });
  } catch (err) {
    console.error('createInquiry:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PUT /api/inquiries/update?id=...  — update
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/update', async (req, res) => {
  const id = decodeURIComponent(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const p = up(req.body, ['username','inquiry_date','inquiry_valid_till','cust_ref_date','party_id']);
  console.log('Updating inquiry:', id);
  try {
    const r = await db.query(
      `UPDATE export.inquiry SET
         cust_inquiry_id = $1, inquiry_date = $2, inquiry_valid_till = $3,
         inquiry_mode = $4, party_id = $5, cust_ref_no = $6, cust_ref_date = $7,
         currency_code = $8, goods_description = $9, term_packing = $10,
         term_validity = $11, terms_payment = $12, port_of_loading = $13,
         port_of_destination = $14, remarks = $15, updatedby = $16, updatedon = NOW()
       WHERE inquiry_id = $17
       RETURNING inquiry_id`,
      [
        p.cust_inquiry_id,
        p.inquiry_date || null, p.inquiry_valid_till || null,
        p.inquiry_mode || null, p.party_id || null,
        p.cust_ref_no || null, p.cust_ref_date || null,
        p.currency_code || null, p.goods_description || null,
        p.term_packing || null, p.term_validity || null, p.terms_payment || null,
        p.port_of_loading || null, p.port_of_destination || null,
        p.remarks || null, p.username || 'ADMIN', id
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('updateInquiry:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/inquiries/remove?id=...  — delete
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/remove', async (req, res) => {
  const id = decodeURIComponent(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id query param required' });
  console.log('Deleting inquiry:', id);
  try {
    await db.query('DELETE FROM export.inquiry_doc    WHERE inquiry_id = $1', [id]);
    await db.query('DELETE FROM export.inquiry_detail WHERE inquiry_id = $1', [id]);
    const r = await db.query(
      'DELETE FROM export.inquiry WHERE inquiry_id = $1 RETURNING inquiry_id', [id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteInquiry:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/inquiries/details/add?id=...  — add product row
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/details/add', async (req, res) => {
  const id = decodeURIComponent(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const p = up(req.body, ['username','itemperpack','totpkgs','totitm','prod_id']);
  try {
    const inqR = await db.query(
      'SELECT entity_unit_id, cust_inquiry_id, inquiry_date, party_id FROM export.inquiry WHERE inquiry_id = $1', [id]
    );
    if (!inqR.rows.length) return res.status(404).json({ error: 'Inquiry not found' });
    const inq = inqR.rows[0];
    const lineR = await db.query(
      'SELECT COALESCE(MAX(line_id),0)+1 AS nl FROM export.inquiry_detail WHERE inquiry_id = $1', [id]
    );
    const r = await db.query(
      `INSERT INTO export.inquiry_detail
         (line_id, entity_unit_id, inquiry_id, inquiry_date, cust_inquiry_id,
          party_id, prod_id, desc_good, unit, packtyp,
          itemperpack, totpkgs, totitm, color, createdby, updatedby)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING line_id`,
      [
        lineR.rows[0].nl, inq.entity_unit_id, id,
        inq.inquiry_date, inq.cust_inquiry_id, inq.party_id || null,
        p.prod_id, p.desc_good || null, p.unit || null, p.packtyp || null,
        p.itemperpack || null, p.totpkgs || null, p.totitm || null, p.color || null,
        p.username || 'ADMIN', p.username || 'ADMIN'
      ]
    );
    res.json({ success: true, line_id: r.rows[0].line_id });
  } catch (err) {
    console.error('addDetail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PUT /api/inquiries/details/update?id=...&lineId=...  — update product row
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/details/update', async (req, res) => {
  const id     = decodeURIComponent(req.query.id || '');
  const lineId = req.query.lineId;
  if (!id || !lineId) return res.status(400).json({ error: 'id and lineId required' });
  const p = up(req.body, ['username','itemperpack','totpkgs','totitm','prod_id']);
  try {
    const r = await db.query(
      `UPDATE export.inquiry_detail SET
         prod_id=$1, desc_good=$2, unit=$3, packtyp=$4,
         itemperpack=$5, totpkgs=$6, totitm=$7, color=$8,
         updatedby=$9, updatedon=NOW()
       WHERE inquiry_id=$10 AND line_id=$11
       RETURNING line_id`,
      [
        p.prod_id, p.desc_good||null, p.unit||null, p.packtyp||null,
        p.itemperpack||null, p.totpkgs||null, p.totitm||null, p.color||null,
        p.username||'ADMIN', id, lineId
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Row not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('updateDetail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/inquiries/details/remove?id=...&lineId=...
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/details/remove', async (req, res) => {
  const id     = decodeURIComponent(req.query.id || '');
  const lineId = req.query.lineId;
  if (!id || !lineId) return res.status(400).json({ error: 'id and lineId required' });
  try {
    const r = await db.query(
      'DELETE FROM export.inquiry_detail WHERE inquiry_id=$1 AND line_id=$2 RETURNING line_id',
      [id, lineId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Row not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('removeDetail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/inquiries/documents/upload?id=...  — upload document (FIXED)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/documents/upload', upload.single('document'), async (req, res) => {
  const inquiryId = decodeURIComponent(req.query.id || '');
  if (!inquiryId) {
    return res.status(400).json({ error: 'id query param required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const docType  = (req.body.doc_type || 'OTHER').toUpperCase();
  const username = (req.body.username || 'ADMIN').toUpperCase();
  const file     = req.file;

  console.log('Uploading document for inquiry:', inquiryId);
  console.log('File:', file.originalname, 'Size:', file.size);

  try {
    // Check if inquiry exists
    const inqR = await db.query(
      'SELECT entity_unit_id FROM export.inquiry WHERE inquiry_id = $1', 
      [inquiryId]
    );
    if (!inqR.rows.length) {
      // Clean up uploaded file
      try { 
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path); 
        }
      } catch (_) {}
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    // Get the next inquiry_doc_id
    const idResult = await db.query(
      'SELECT COALESCE(MAX(inquiry_doc_id), 0) + 1 AS next_id FROM export.inquiry_doc'
    );
    const nextDocId = idResult.rows[0].next_id;

    // Calculate file size in KB
    const fileSizeKB = Math.round(file.size / 1024);

    // Insert the document with the correct inquiry_id
    const result = await db.query(
      `INSERT INTO export.inquiry_doc
         (inquiry_doc_id, entity_unit_id, inquiry_id, doc_type, image_size_kb, 
          image_file_name, image_mime_type, image_icon, createdby, updatedby)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING inquiry_doc_id`,
      [
        nextDocId,
        inqR.rows[0].entity_unit_id || 1,
        inquiryId,  // Use the actual inquiry_id here, NOT the numeric ID
        docType,
        String(fileSizeKB),
        file.originalname.toUpperCase(),
        file.mimetype, 
        iconFromMime(file.mimetype),
        username, 
        username
      ]
    );
    
    console.log('Document uploaded successfully with ID:', result.rows[0].inquiry_doc_id);
    
    res.json({ 
      success: true, 
      message: 'Document uploaded successfully',
      doc_id: result.rows[0].inquiry_doc_id 
    });
  } catch (err) {
    console.error('uploadDoc error:', err);
    // Clean up uploaded file on error
    try { 
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path); 
      }
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/inquiries/documents/remove?id=...&docId=...
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/documents/remove', async (req, res) => {
  const id    = decodeURIComponent(req.query.id || '');
  const docId = req.query.docId;
  if (!id || !docId) return res.status(400).json({ error: 'id and docId required' });
  try {
    const r = await db.query(
      'DELETE FROM export.inquiry_doc WHERE inquiry_id=$1 AND inquiry_doc_id=$2 RETURNING inquiry_doc_id',
      [id, docId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('removeDoc:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;