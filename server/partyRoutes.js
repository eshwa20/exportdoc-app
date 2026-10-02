const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all parties with optional search
router.get('/', async (req, res) => {
    const { type, search } = req.query;
    try {
        let sql = 'SELECT party_id, party_name, country, party_type FROM export.party_master WHERE party_type = $1';
        const params = [type];
        if (search) {
            sql += ' AND (LOWER(party_name) LIKE $2 OR LOWER(country) LIKE $2)';
            params.push(`%${search.toLowerCase()}%`);
        }
        const result = await db.query(sql + ' ORDER BY party_name ASC', params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in getParties:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get single party details
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const master = await db.query('SELECT * FROM export.party_master WHERE party_id = $1', [id]);
        if (master.rows.length === 0) return res.status(404).json({ error: 'Party not found' });
        const addr = await db.query('SELECT * FROM export.party_address WHERE party_id = $1 ORDER BY addr_point_id', [id]);
        const comm = await db.query('SELECT * FROM export.party_communication WHERE party_id = $1 ORDER BY comm_point_id', [id]);
        res.json({ master: master.rows[0], addresses: addr.rows, communications: comm.rows });
    } catch (err) {
        console.error('Error in getPartyDetail:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── CREATE party (FIXED - includes all fields) ─────────────────────────────────
router.post('/', async (req, res) => {
    const p = req.body;
    console.log('Creating party with data:', p);
    
    try {
        const sql = `INSERT INTO export.party_master 
            (entity_unit_id, party_name, party_type, country, 
             pan, cin, gstno, gst_date, iec, iec_date, internet, notes, active_ind, createdby, updatedby) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Y', $13, $14) 
            RETURNING party_id`;
        
        const result = await db.query(sql, [
            p.entity_unit_id || 1, 
            p.party_name, 
            p.party_type || 'CUSTOMER',
            p.country,
            p.pan || null, 
            p.cin || null, 
            p.gstno || null,
            p.gst_date || null,
            p.iec || null,
            p.iec_date || null,
            p.internet || null,
            p.notes || null,
            p.username || 'admin',
            p.username || 'admin'
        ]);
        
        res.json({ 
            success: true, 
            message: 'Party created successfully', 
            party_id: result.rows[0].party_id 
        });
    } catch (err) {
        console.error('Error in createParty:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── UPDATE party ──────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const p = req.body;
    console.log('Updating party:', id, p);
    
    try {
        const sql = `UPDATE export.party_master SET 
            party_name = $1, 
            pan = $2, 
            cin = $3, 
            gstno = $4, 
            gst_date = $5,
            iec = $6, 
            iec_date = $7, 
            country = $8, 
            internet = $9, 
            notes = $10,
            updatedon = NOW(), 
            updatedby = $11
            WHERE party_id = $12 
            RETURNING party_id`;
        
        const result = await db.query(sql, [
            p.party_name,
            p.pan || null, 
            p.cin || null, 
            p.gstno || null, 
            p.gst_date || null,
            p.iec || null, 
            p.iec_date || null, 
            p.country, 
            p.internet || null, 
            p.notes || null,
            p.username || 'admin', 
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Party not found' });
        }
        
        res.json({ success: true, message: 'Party updated successfully', party_id: id });
    } catch (err) {
        console.error('Error in updateParty:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete party
router.delete('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM export.party_communication WHERE party_id = $1', [req.params.id]);
        await client.query('DELETE FROM export.party_address WHERE party_id = $1', [req.params.id]);
        const result = await client.query(
            'DELETE FROM export.party_master WHERE party_id = $1 RETURNING party_id', [req.params.id]
        );
        if (result.rows.length === 0) { 
            await client.query('ROLLBACK'); 
            return res.status(404).json({ error: 'Party not found' }); 
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Party deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in deleteParty:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ── ADDRESS ROUTES ────────────────────────────────────────────────────────────

// Add address
router.post('/:partyId/addresses', async (req, res) => {
    const { partyId } = req.params;
    const addr = req.body;
    try {
        const sql = `INSERT INTO export.party_address 
            (entity_unit_id, party_id, type_of_addr, addr_owner_name, department_name, 
             addr_line1, addr_line2, addr_line3, addr_line4, city, state_province, country_name, postal_code, gst_no)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) 
            RETURNING addr_point_id`;
        const result = await db.query(sql, [
            addr.entity_unit_id || 1,
            partyId, addr.type_of_addr, addr.addr_owner_name, addr.department_name,
            addr.addr_line1, addr.addr_line2, addr.addr_line3, addr.addr_line4 || null,
            addr.city, addr.state_province, addr.country_name, addr.postal_code,
            addr.gst_no || null
        ]);
        res.json({ success: true, message: 'Address added successfully', addr_point_id: result.rows[0].addr_point_id });
    } catch (err) {
        console.error('Error in addAddress:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update address
router.put('/:partyId/addresses/:addrId', async (req, res) => {
    const { partyId, addrId } = req.params;
    const addr = req.body;
    try {
        const sql = `UPDATE export.party_address SET
            type_of_addr=$1, addr_owner_name=$2, department_name=$3,
            addr_line1=$4, addr_line2=$5, addr_line3=$6, addr_line4=$7,
            city=$8, state_province=$9, country_name=$10, postal_code=$11, gst_no=$12
            WHERE addr_point_id=$13 AND party_id=$14 RETURNING addr_point_id`;
        const result = await db.query(sql, [
            addr.type_of_addr, addr.addr_owner_name, addr.department_name,
            addr.addr_line1, addr.addr_line2, addr.addr_line3, addr.addr_line4 || null,
            addr.city, addr.state_province, addr.country_name, addr.postal_code,
            addr.gst_no || null,
            addrId, partyId
        ]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
        res.json({ success: true, message: 'Address updated successfully' });
    } catch (err) {
        console.error('Error in updateAddress:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete address
router.delete('/:partyId/addresses/:addrId', async (req, res) => {
    const { partyId, addrId } = req.params;
    try {
        const result = await db.query(
            'DELETE FROM export.party_address WHERE addr_point_id=$1 AND party_id=$2 RETURNING addr_point_id',
            [addrId, partyId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (err) {
        console.error('Error in deleteAddress:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── COMMUNICATION ROUTES ──────────────────────────────────────────────────────

// Add communication
router.post('/:partyId/communications', async (req, res) => {
    const { partyId } = req.params;
    const comm = req.body;
    try {
        const sql = `INSERT INTO export.party_communication 
            (entity_unit_id, party_id, comm_type, comm_text, comm_owner_name, department_name)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING comm_point_id`;
        const result = await db.query(sql, [
            comm.entity_unit_id || 1,
            partyId, comm.comm_type, comm.comm_text, comm.comm_owner_name || null, comm.department_name || null
        ]);
        res.json({ success: true, message: 'Communication added successfully', comm_point_id: result.rows[0].comm_point_id });
    } catch (err) {
        console.error('Error in addCommunication:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update communication
router.put('/:partyId/communications/:commId', async (req, res) => {
    const { partyId, commId } = req.params;
    const comm = req.body;
    try {
        const sql = `UPDATE export.party_communication SET
            comm_type=$1, comm_text=$2, comm_owner_name=$3, department_name=$4
            WHERE comm_point_id=$5 AND party_id=$6 RETURNING comm_point_id`;
        const result = await db.query(sql, [
            comm.comm_type, comm.comm_text, comm.comm_owner_name || null, comm.department_name || null,
            commId, partyId
        ]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Communication not found' });
        res.json({ success: true, message: 'Communication updated successfully' });
    } catch (err) {
        console.error('Error in updateCommunication:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete communication
router.delete('/:partyId/communications/:commId', async (req, res) => {
    const { partyId, commId } = req.params;
    try {
        const result = await db.query(
            'DELETE FROM export.party_communication WHERE comm_point_id=$1 AND party_id=$2 RETURNING comm_point_id',
            [commId, partyId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Communication not found' });
        res.json({ success: true, message: 'Communication deleted successfully' });
    } catch (err) {
        console.error('Error in deleteCommunication:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;