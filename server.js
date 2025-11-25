const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files (HTML, CSS, JS)

// Database Connection (Placeholder - will need real credentials)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Default MySQL user
    password: '',      // Default is often empty, or 'root'
    database: 'technician_wiki'
});

// Test DB Connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length > 0) {
            res.json({ success: true, message: 'Login successful', user: { username: results[0].username, role: results[0].role } });
        } else {
            res.status(401).json({ success: false, message: 'Identifiant ou mot de passe incorrect' });
        }
    });
});

// Create User Endpoint
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }

    const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    db.query(query, [username, password, role], (err, result) => {
        if (err) {
            console.error(err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Cet identifiant existe déjà' });
            }
            return res.status(500).json({ success: false, message: 'Erreur base de données' });
        }
        res.json({ success: true, message: 'Utilisateur créé avec succès' });
    });
});

// Get Profile Endpoint
app.get('/api/profile', (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const query = 'SELECT username, role, firstname, lastname, email, phone, address, birthdate, gender FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
});

// Update Profile Endpoint
app.put('/api/profile', (req, res) => {
    const { username, firstname, lastname, email, phone, address, birthdate, gender } = req.body;

    const query = `
        UPDATE users 
        SET firstname=?, lastname=?, email=?, phone=?, address=?, birthdate=?, gender=?
        WHERE username=?
    `;

    db.query(query, [firstname, lastname, email, phone, address, birthdate, gender, username], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'DB Error' });
        }
        res.json({ success: true, message: 'Profile updated' });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
