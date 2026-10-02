const express = require('express');
const router = express.Router();
const db = require('./db');

// ── GEOCODING PROXY ──────────────────────────────────────────────────────────
router.get('/geocode', async (req, res) => {
    const { port_name, country } = req.query;
    console.log('Geocoding request for:', port_name, country);

    if (!port_name && !country) {
        return res.status(400).json({ error: 'No query provided' });
    }

    // Use a proper User-Agent (REQUIRED by Nominatim)
    const headers = {
        'User-Agent': 'ExportDocApp/1.0 (contact@yourdomain.com)',
        'Accept-Language': 'en'
    };

    // Build search queries with multiple strategies
    const searchTerms = [];
    if (port_name && country) {
        searchTerms.push(`${port_name} port ${country}`);
        searchTerms.push(`${port_name}, ${country}`);
        searchTerms.push(`${port_name} ${country}`);
    }
    if (port_name) {
        searchTerms.push(`${port_name} port`);
        searchTerms.push(port_name);
    }
    if (country) {
        searchTerms.push(`${country} port`);
    }

    console.log('Search terms:', searchTerms);

    try {
        for (const term of searchTerms) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=1`;
                console.log('Fetching:', url);

                const response = await fetch(url, { headers });

                if (!response.ok) {
                    console.log(`HTTP error ${response.status} for term:`, term);
                    if (response.status === 403) {
                        console.log('Nominatim is blocking the request. Ensure a valid User-Agent is set.');
                    }
                    continue;
                }

                const data = await response.json();
                console.log('Response data:', data);

                if (data && data.length > 0) {
                    const result = {
                        success: true,
                        latitude: parseFloat(data[0].lat).toFixed(6),
                        longitude: parseFloat(data[0].lon).toFixed(6),
                        display_name: data[0].display_name
                    };
                    console.log('Found coordinates:', result);
                    return res.json(result);
                }
            } catch (err) {
                console.log(`Error searching for "${term}":`, err.message);
            }
            // Respect Nominatim's rate limit (1 request per second)
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('No results found for any search term');
        res.json({
            success: false,
            message: 'No results found. Please enter coordinates manually.'
        });
    } catch (err) {
        console.error('Geocoding error:', err);
        res.status(500).json({
            error: 'Geocoding failed',
            message: err.message
        });
    }
});

// ── GET all ports with optional search ────────────────────────────────────────
router.get('/', async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `SELECT port_id, port_name, port_code, port_type, port_size,
                          country, latitude, longitude, website, remarks
                   FROM export.port_master`;
        const params = [];

        if (search) {
            sql += ` WHERE (LOWER(port_name) LIKE $1 OR LOWER(country) LIKE $1
                            OR LOWER(port_code) LIKE $1)`;
            params.push(`%${search.toLowerCase()}%`);
        }

        sql += ' ORDER BY port_name ASC';
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in getPorts:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET single port ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM export.port_master WHERE port_id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Port not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in getPort:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── CREATE port ───────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const p = req.body;
    try {
        const sql = `INSERT INTO export.port_master
            (port_name, port_code, port_type, port_size,
             country, latitude, longitude, website, remarks, createdby)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING port_id`;

        const result = await db.query(sql, [
            p.port_name,
            p.port_code   || null,
            p.port_type   || null,
            p.port_size   || null,
            p.country,
            p.latitude    ? parseFloat(p.latitude)    : null,
            p.longitude   ? parseFloat(p.longitude)   : null,
            p.website     || null,
            p.remarks     || null,
            p.username    || 'admin'
        ]);

        res.json({
            success: true,
            message: 'Port created successfully',
            port_id: result.rows[0].port_id
        });
    } catch (err) {
        console.error('Error in createPort:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── UPDATE port ───────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const p = req.body;
    try {
        const sql = `UPDATE export.port_master SET
            port_name  = $1,
            port_code  = $2,
            port_type  = $3,
            port_size  = $4,
            country    = $5,
            latitude   = $6,
            longitude  = $7,
            website    = $8,
            remarks    = $9,
            updatedon  = NOW(),
            updatedby  = $10
            WHERE port_id = $11
            RETURNING port_id`;

        const result = await db.query(sql, [
            p.port_name,
            p.port_code   || null,
            p.port_type   || null,
            p.port_size   || null,
            p.country,
            p.latitude    ? parseFloat(p.latitude)    : null,
            p.longitude   ? parseFloat(p.longitude)   : null,
            p.website     || null,
            p.remarks     || null,
            p.username    || 'admin',
            req.params.id
        ]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Port not found' });

        res.json({ success: true, message: 'Port updated successfully', port_id: req.params.id });
    } catch (err) {
        console.error('Error in updatePort:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE port ───────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM export.port_master WHERE port_id = $1 RETURNING port_id',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Port not found' });
        res.json({ success: true, message: 'Port deleted successfully' });
    } catch (err) {
        console.error('Error in deletePort:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;