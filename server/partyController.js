const db = require('./db');

// List parties by type and search
exports.getParties = async (req, res) => {
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
};

// Get Full Detail
exports.getPartyDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const master = await db.query('SELECT * FROM export.party_master WHERE party_id = $1', [id]);
        const addr = await db.query('SELECT * FROM export.party_address WHERE party_id = $1 ORDER BY addr_point_id', [id]);
        const comm = await db.query('SELECT * FROM export.party_communication WHERE party_id = $1 ORDER BY comm_point_id', [id]);
        
        if (master.rows.length === 0) {
            return res.status(404).json({ error: 'Party not found' });
        }

        res.json({
            master: master.rows[0],
            addresses: addr.rows,
            communications: comm.rows
        });
    } catch (err) {
        console.error('Error in getPartyDetail:', err);
        res.status(500).json({ error: err.message });
    }
};

// Save (Add/Update)
exports.saveParty = async (req, res) => {
    const p = req.body;
    try {
        if (p.party_id) {
            // Update existing party
            const sql = `UPDATE export.party_master SET 
                party_name=$1, 
                pan=$2, 
                cin=$3, 
                gstno=$4, 
                gst_date=$5, 
                iec=$6, 
                iec_date=$7, 
                country=$8, 
                internet=$9, 
                notes=$10, 
                updatedon=NOW(), 
                updatedby=$11 
                WHERE party_id=$12`;
            await db.query(sql, [
                p.party_name, 
                p.pan, 
                p.cin, 
                p.gstno, 
                p.gst_date, 
                p.iec, 
                p.iec_date, 
                p.country, 
                p.internet, 
                p.notes, 
                p.username, 
                p.party_id
            ]);
            res.json({ success: true, message: 'Party updated successfully', party_id: p.party_id });
        } else {
            // Insert new party
            const sql = `INSERT INTO export.party_master 
                (entity_unit_id, party_name, party_type, country, pan, cin, gstno, active_ind, createdby) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'Y', $8) 
                RETURNING party_id`;
            const result = await db.query(sql, [
                p.entity_unit_id || 1, 
                p.party_name, 
                p.party_type, 
                p.country, 
                p.pan, 
                p.cin, 
                p.gstno, 
                p.username
            ]);
            res.json({ success: true, message: 'Party created successfully', party_id: result.rows[0].party_id });
        }
    } catch (err) {
        console.error('Error in saveParty:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete
exports.deleteParty = async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // First delete related communications
        await client.query('DELETE FROM export.party_communication WHERE party_id = $1', [req.params.id]);
        
        // Then delete related addresses
        await client.query('DELETE FROM export.party_address WHERE party_id = $1', [req.params.id]);
        
        // Finally delete the party master
        const result = await client.query('DELETE FROM export.party_master WHERE party_id = $1 RETURNING party_id', [req.params.id]);
        
        if (result.rowCount === 0) {
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
};