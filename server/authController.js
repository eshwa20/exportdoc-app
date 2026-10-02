const bcrypt = require('bcrypt');
const db = require('./db');
const requestIp = require('request-ip');
const { v4: uuidv4 } = require('uuid');

// ================= REGISTER =================
exports.register = async (req, res) => {
    const { user_name, email, password } = req.body;

    if (!user_name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // UPDATED: Added 'export.' schema prefix
        const sql = `
            INSERT INTO export.users (user_name, email, password, user_role)
            VALUES ($1, $2, $3, $4)
        `;

        await db.query(sql, [user_name, email, hashedPassword, 'user']);

        res.status(201).json({ message: "User registered successfully!" });

    } catch (err) {
        // PostgreSQL Unique Violation code
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username or Email already exists." });
        }

        console.error("Registration Error:", err.message);
        res.status(500).json({ error: "Registration failed." });
    }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    const ip = requestIp.getClientIp(req);
    const sessionId = uuidv4();
    const imei = req.headers['x-imei'] || null;

    try {
        // UPDATED: Added 'export.' prefix
        const result = await db.query(
            'SELECT * FROM export.users WHERE user_name = $1',
            [user_name]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // UPDATED: Added 'export.' prefix
        // Optimized: Get count of previous logs for this user
        const countRes = await db.query(
            'SELECT COUNT(*) FROM export.user_logs WHERE user_id = $1',
            [user.user_id]
        );

        const nextCount = parseInt(countRes.rows[0].count) + 1;

        // UPDATED: Added 'export.' prefix
        await db.query(
            `INSERT INTO export.user_logs 
            (user_id, session_id, ip_address, imei_no, login_count)
            VALUES ($1, $2, $3, $4, $5)`,
            [user.user_id, sessionId, ip, imei, nextCount]
        );

        res.status(200).json({
            message: "Login successful!",
            sessionId,
            user: {
                id: user.user_id,
                name: user.user_name
            }
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
    }

    try {
        // UPDATED: Added 'export.' prefix
        const result = await db.query(
            `UPDATE export.user_logs 
             SET logout_time = CURRENT_TIMESTAMP 
             WHERE session_id = $1`,
            [sessionId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.status(200).json({ message: "Logout successful" });

    } catch (err) {
        console.error("Logout Error:", err.message);
        res.status(500).json({ error: "Database error during logout" });
    }
};