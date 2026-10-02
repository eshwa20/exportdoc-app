const express = require('express');
const cors = require('cors');
const db = require('./db');
const partyRoutes = require('./partyRoutes');
const { register, login, logout } = require('./authController');
const portRoutes = require('./portRoutes');
const path = require('path');

const app = express();

// Middleware — must be registered BEFORE routes
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Your React app URLs
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const inquiryRoutes = require('./inquiryRoutes');
app.use('/api/inquiries', inquiryRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth Routes
app.post('/api/register', register);
app.post('/api/login', login);
app.post('/api/logout', logout);

// Party Routes - IMPORTANT: Use /api/parties as base path
app.use('/api/parties', partyRoutes);

// Port Routes
app.use('/api/ports', portRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something broke!' });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test API: http://localhost:${PORT}/api/test`);
    console.log(`Inquiry API: http://localhost:${PORT}/api/inquiries`);
});