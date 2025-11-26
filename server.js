const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original filename
        // Sanitize filename to prevent issues (basic)
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, sanitized);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory
app.use('/uploads', express.static('uploads')); // Serve uploaded files explicitly

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
    const { username, password, role, creatorUsername } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }

    // Role Restriction: Only 'admin' can create 'admin' users
    if (role === 'admin' && creatorUsername !== 'admin') {
        return res.status(403).json({ success: false, message: 'Seul l\'administrateur principal peut créer d\'autres administrateurs.' });
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

// Reset Password Endpoint
app.put('/api/users/:id/password', (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ success: false, message: 'Nouveau mot de passe requis' });

    // Check if target is 'admin'
    const checkQuery = 'SELECT username FROM users WHERE id = ?';
    db.query(checkQuery, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        if (results[0].username === 'admin') {
            return res.status(403).json({ success: false, message: 'Impossible de modifier le mot de passe de l\'administrateur principal.' });
        }

        const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
        db.query(updateQuery, [newPassword, userId], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'DB Error' });
            res.json({ success: true, message: 'Mot de passe mis à jour' });
        });
    });
});

// Get All Users Endpoint
app.get('/api/users', (req, res) => {
    const query = 'SELECT id, username, role, created_at FROM users';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, users: results });
    });
});

// Delete User Endpoint
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;

    // First check if user is admin
    const checkQuery = 'SELECT username FROM users WHERE id = ?';
    db.query(checkQuery, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const userToDelete = results[0];
        if (userToDelete.username === 'admin') {
            return res.status(403).json({ success: false, message: 'Cannot delete the main admin account' });
        }

        // Proceed with deletion
        const deleteQuery = 'DELETE FROM users WHERE id = ?';
        db.query(deleteQuery, [userId], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'DB Error' });
            res.json({ success: true, message: 'User deleted' });
        });
    });
});



// Get Single User Details Endpoint (Admin only - includes password)
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user: results[0] });
    });
});

// API Endpoint to get user profile
app.get('/api/profile', (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }

    const query = 'SELECT id, username, role, firstname, lastname, email, phone, address, birthdate, gender FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    });
});

// API Endpoint to update user profile
app.put('/api/profile', (req, res) => {
    const { username, firstname, lastname, email, phone, address, birthdate, gender } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }

    const query = `
        UPDATE users 
        SET firstname = ?, lastname = ?, email = ?, phone = ?, address = ?, birthdate = ?, gender = ?
        WHERE username = ?
    `;

    // Handle empty strings for date/enum by converting to NULL
    const safeBirthdate = birthdate === "" ? null : birthdate;
    const safeGender = gender === "" ? null : gender;

    db.query(query, [firstname, lastname, email, phone, address, safeBirthdate, safeGender, username], (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// API Endpoint to update account credentials (username/password)
app.put('/api/account', (req, res) => {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;
    console.log('--- API ACCOUNT UPDATE REQUEST RECEIVED ---');
    console.log('Body:', req.body);

    if (!currentUsername || !currentPassword) {
        return res.status(400).json({ success: false, message: 'Identifiants actuels requis' });
    }

    // Verify current password
    const verifyQuery = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(verifyQuery, [currentUsername, currentPassword], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
        }

        const user = results[0];
        const userId = user.id;

        // Prepare update
        let updateQuery = 'UPDATE users SET ';
        const params = [];
        const updates = [];

        if (newUsername && newUsername !== currentUsername) {
            updates.push('username = ?');
            params.push(newUsername);
        }

        if (newPassword) {
            updates.push('password = ?');
            params.push(newPassword);
        }

        if (updates.length === 0) {
            return res.json({ success: true, message: 'Aucune modification demandée' });
        }

        updateQuery += updates.join(', ') + ' WHERE id = ?';
        params.push(userId);

        db.query(updateQuery, params, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: 'Cet identifiant est déjà pris' });
                }
                return res.status(500).json({ success: false, message: 'DB Error' });
            }
            res.json({ success: true, message: 'Compte mis à jour', newUsername: newUsername || currentUsername });
        });
    });
});

// API Endpoint for File Upload
app.post('/api/upload', upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({ success: true, message: 'File uploaded successfully', filename: req.file.filename });
});

// API Endpoint to List Documents (Legacy - kept for compatibility or admin view if needed)
app.get('/api/documents', (req, res) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) return res.json({ success: true, documents: [] });
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: 'Unable to scan directory' });
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
        res.json({ success: true, documents: pdfFiles });
    });
});

// --- Advanced Documentation API ---

// Get All Categories with Processes
app.get('/api/categories', (req, res) => {
    const query = `
        SELECT c.id as category_id, c.name as category_name, 
               p.id as process_id, p.title as process_title, p.file_path
        FROM categories c
        LEFT JOIN processes p ON c.id = p.category_id
        ORDER BY c.name, p.title
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'DB Error' });
        }

        // Group by category
        const categories = [];
        const categoryMap = new Map();

        results.forEach(row => {
            if (!categoryMap.has(row.category_id)) {
                categoryMap.set(row.category_id, {
                    id: row.category_id,
                    name: row.category_name,
                    processes: []
                });
                categories.push(categoryMap.get(row.category_id));
            }
            if (row.process_id) {
                categoryMap.get(row.category_id).processes.push({
                    id: row.process_id,
                    title: row.process_title,
                    file_path: row.file_path
                });
            }
        });

        res.json({ success: true, categories: categories });
    });
});

// Create Category
app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Category already exists' });
            return res.status(500).json({ success: false, message: 'DB Error' });
        }
        res.json({ success: true, id: result.insertId, name: name });
    });
});

// Create Process
app.post('/api/processes', upload.single('document'), (req, res) => {
    const { category_id, title } = req.body;
    const file_path = req.file ? req.file.filename : null;

    if (!category_id || !title) return res.status(400).json({ success: false, message: 'Category and Title required' });

    const query = 'INSERT INTO processes (category_id, title, file_path) VALUES (?, ?, ?)';
    db.query(query, [category_id, title, file_path], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, id: result.insertId, title: title, file_path: file_path });
    });
});

// Update Process File (Upload)
app.put('/api/processes/:id/file', upload.single('document'), (req, res) => {
    const processId = req.params.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const query = 'UPDATE processes SET file_path = ? WHERE id = ?';
    db.query(query, [req.file.filename, processId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, message: 'File updated', file_path: req.file.filename });
    });
});

// Delete Category
app.delete('/api/categories/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM categories WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, message: 'Category deleted' });
    });
});

// Delete Process
app.delete('/api/processes/:id', (req, res) => {
    const id = req.params.id;
    // Optional: Delete file from uploads folder if exists (not implemented here for simplicity, but good practice)
    db.query('DELETE FROM processes WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, message: 'Process deleted' });
    });
});

// Search Processes
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, results: [] });

    const query = `
        SELECT p.id, p.title, p.file_path, c.name as category_name 
        FROM processes p
        JOIN categories c ON p.category_id = c.id
        WHERE p.title LIKE ?
        LIMIT 10
    `;
    db.query(query, [`%${q}%`], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, results: results });
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
