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

const upload = multer({
    storage: storage,
    limits: { fieldSize: 25 * 1024 * 1024 } // 25MB limit for rich text content (base64 images)
});

// Block install page if installed
app.get('/install.html', (req, res, next) => {
    if (fs.existsSync('installed.lock')) {
        return res.status(403).send('Installation déjà effectuée. Supprimez installed.lock pour réinstaller.');
    }
    next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.')); // Serve static files from current directory
app.use('/uploads', express.static('uploads')); // Serve uploaded files explicitly

// Database Connection (Placeholder - will need real credentials)
require('dotenv').config();

// Database Connection
// Database Connection Pool (Better stability and auto-reconnect)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'technician_wiki',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB Connection (Pool doesn't connect immediately, but we can try a query)
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err.code); // Log error code
    } else {
        console.log('Connected to MySQL database (Pool)');
        connection.release(); // Always release!
    }
});



// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Block install page if installed
app.get('/install.html', (req, res, next) => {
    if (fs.existsSync('installed.lock')) {
        return res.status(403).send('Installation déjà effectuée. Supprimez installed.lock pour réinstaller.');
    }
    next();
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
    const query = 'SELECT id, username, role, firstname, lastname, email, phone, address, birthdate, gender, created_at, profile_picture FROM users WHERE id = ?';
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

    const query = 'SELECT id, username, role, firstname, lastname, email, phone, address, birthdate, gender, profile_picture FROM users WHERE username = ?';
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
app.put('/api/profile', upload.single('profile_picture'), (req, res) => {
    const { username, firstname, lastname, email, phone, address, birthdate, gender } = req.body;
    const profile_picture = req.file ? req.file.filename : undefined;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }

    let query = `
        UPDATE users 
        SET firstname = ?, lastname = ?, email = ?, phone = ?, address = ?, birthdate = ?, gender = ?
    `;

    const params = [firstname, lastname, email, phone, address, birthdate === "" ? null : birthdate, gender === "" ? null : gender];

    if (profile_picture) {
        query += `, profile_picture = ?`;
        params.push(profile_picture);
    }

    query += ` WHERE username = ?`;
    params.push(username);

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'Profile updated successfully', profile_picture: profile_picture });
    });
});

// API Endpoint to update account credentials (username/password)
app.put('/api/account', (req, res) => {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

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
               p.id as process_id, p.title as process_title, p.file_path, p.content, p.created_at,
               u.username as author_name, u.profile_picture as author_picture
        FROM categories c
        LEFT JOIN processes p ON c.id = p.category_id
        LEFT JOIN users u ON p.author_id = u.id
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
                    file_path: row.file_path,
                    content: row.content,
                    author_name: row.author_name,
                    author_picture: row.author_picture
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
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Category exists' });
            return res.status(500).json({ success: false, message: 'DB Error' });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// Create Process
app.post('/api/processes', upload.single('document'), (req, res) => {
    const { category_id, title, content, author_username } = req.body;
    const file_path = req.file ? req.file.filename : null;

    if (!category_id || !title) {
        return res.status(400).json({ success: false, message: 'Category and Title required' });
    }

    // Find author_id from username
    const findUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(findUserQuery, [author_username], (err, users) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });

        const author_id = users.length > 0 ? users[0].id : null;

        const query = 'INSERT INTO processes (category_id, title, file_path, content, author_id) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [category_id, title, file_path, content, author_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'DB Error' });
            res.json({ success: true, id: result.insertId });
        });
    });
});

// Update Process File (Upload)
app.put('/api/processes/:id/file', upload.single('document'), (req, res) => {
    const processId = req.params.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

    const query = 'UPDATE processes SET file_path = ? WHERE id = ?';
    db.query(query, [req.file.filename, processId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, file_path: req.file.filename });
    });
});

// Update Process Details (Title, Content)
app.put('/api/processes/:id', (req, res) => {
    const { title, content, modifier_username } = req.body;
    const processId = req.params.id;

    // Build query dynamically based on what's provided
    let fields = [];
    let values = [];

    if (title) {
        fields.push('title = ?');
        values.push(title);
    }
    if (content !== undefined) { // Allow empty string content
        fields.push('content = ?');
        values.push(content);
    }

    if (fields.length === 0) return res.json({ success: true }); // Nothing to update

    values.push(processId);

    const query = `UPDATE processes SET ${fields.join(', ')} WHERE id = ?`;

    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });

        // Log history if username provided
        if (modifier_username) {
            const findUser = 'SELECT id FROM users WHERE username = ?';
            db.query(findUser, [modifier_username], (err, users) => {
                if (!err && users.length > 0) {
                    const userId = users[0].id;
                    const historyQuery = 'INSERT INTO process_history (process_id, user_id) VALUES (?, ?)';
                    db.query(historyQuery, [processId, userId], (err) => {
                        if (err) console.error('Error logging history:', err);
                    });
                }
            });
        }

        res.json({ success: true });
    });
});

// Get Process History
app.get('/api/processes/:id/history', (req, res) => {
    const processId = req.params.id;
    const query = `
        SELECT h.modified_at, u.username, u.profile_picture
        FROM process_history h
        JOIN users u ON h.user_id = u.id
        WHERE h.process_id = ?
        ORDER BY h.modified_at DESC
    `;
    db.query(query, [processId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true, history: results });
    });
});

// Delete Category
app.delete('/api/categories/:id', (req, res) => {
    db.query('DELETE FROM categories WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        res.json({ success: true });
    });
});

// Get Single Process
app.get('/api/processes/:id', (req, res) => {
    const query = 'SELECT * FROM processes WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Process not found' });
        res.json({ success: true, process: results[0] });
    });
});

// Delete Process
app.delete('/api/processes/:id', (req, res) => {
    // First get file path to delete file
    db.query('SELECT file_path FROM processes WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });

        if (results.length > 0 && results[0].file_path) {
            const filePath = path.join(__dirname, 'uploads', results[0].file_path);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        db.query('DELETE FROM processes WHERE id = ?', [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'DB Error' });
            res.json({ success: true });
        });
    });
});

// Search Processes
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, results: [] });

    const query = `
        SELECT p.id, p.title, p.content, p.file_path, c.name as category_name 
        FROM processes p
        JOIN categories c ON p.category_id = c.id
        WHERE p.title LIKE ? OR p.content LIKE ?
        LIMIT 10
    `;
    db.query(query, [`%${q}%`, `%${q}%`], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB Error' });

        // Process results to add snippets
        const processedResults = results.map(item => {
            let snippet = '';
            if (item.content) {
                // Strip HTML tags
                const plainText = item.content.replace(/<[^>]+>/g, ' ');
                const lowerText = plainText.toLowerCase();
                const lowerQ = q.toLowerCase();
                const index = lowerText.indexOf(lowerQ);

                if (index !== -1) {
                    // Extract context
                    const start = Math.max(0, index - 40);
                    const end = Math.min(plainText.length, index + q.length + 40);
                    snippet = '...' + plainText.substring(start, end) + '...';
                }
            }
            // Don't send full content to save bandwidth
            const { content, ...rest } = item;
            return { ...rest, snippet };
        });

        res.json({ success: true, results: processedResults });
    });
});

// --- Startup Migration Check ---
// Ensure 'content' column exists in processes table
const migrationQuery = `
    SELECT count(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = 'technician_wiki' 
    AND table_name = 'processes' 
    AND column_name = 'content';
`;

db.query(migrationQuery, (err, results) => {
    if (!err && results[0].count == 0) {
        console.log('Migrating DB: Adding content column to processes table...');
        db.query('ALTER TABLE processes ADD COLUMN content LONGTEXT', (err) => {
            if (err) console.error('Migration failed:', err);
            else console.log('Migration successful.');
        });
    }
});

// Ensure 'process_history' table exists
const migrationHistoryQuery = `
    SELECT count(*) as count 
    FROM information_schema.tables
    WHERE table_schema = 'technician_wiki' 
    AND table_name = 'process_history';
`;

db.query(migrationHistoryQuery, (err, results) => {
    if (!err && results[0].count == 0) {
        console.log('Migrating DB: Creating process_history table...');
        const createHistoryTable = `
            CREATE TABLE process_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                process_id INT NOT NULL,
                user_id INT NOT NULL,
                modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        db.query(createHistoryTable, (err) => {
            if (err) console.error('Migration failed:', err);
            else console.log('Migration successful.');
        });
    }
});

// Ensure 'profile_picture' column exists in users table
const migrationProfilePicQuery = `
    SELECT count(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = 'technician_wiki' 
    AND table_name = 'users' 
    AND column_name = 'profile_picture';
`;

db.query(migrationProfilePicQuery, (err, results) => {
    if (!err && results[0].count == 0) {
        console.log('Migrating DB: Adding profile_picture column to users table...');
        db.query('ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)', (err) => {
            if (err) console.error('Migration failed:', err);
            else console.log('Migration successful.');
        });
    }
});

// Ensure 'author_id' column exists in processes table
const migrationAuthorIdQuery = `
    SELECT count(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = 'technician_wiki' 
    AND table_name = 'processes' 
    AND column_name = 'author_id';
`;

db.query(migrationAuthorIdQuery, (err, results) => {
    if (!err && results[0].count == 0) {
        console.log('Migrating DB: Adding author_id column to processes table...');
        db.query('ALTER TABLE processes ADD COLUMN author_id INT', (err) => {
            if (err) console.error('Migration failed:', err);
            else console.log('Migration successful.');
        });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
});

// --- Installation API ---

// Check installation status
app.get('/api/install/check', (req, res) => {
    if (fs.existsSync('installed.lock')) {
        return res.json({ success: false, installed: true, message: 'Already installed' });
    }

    const checks = {
        node: true,
        writeRoot: false,
        writeUploads: false,
        packageJson: false,
        nodeModules: false
    };

    // Check Root Write
    try {
        fs.accessSync('.', fs.constants.W_OK);
        checks.writeRoot = true;
    } catch (e) { }

    // Check Uploads Dir
    if (!fs.existsSync('uploads')) {
        try {
            fs.mkdirSync('uploads');
        } catch (e) { }
    }
    try {
        fs.accessSync('uploads', fs.constants.W_OK);
        checks.writeUploads = true;
    } catch (e) { }

    // Check Dependencies
    checks.packageJson = fs.existsSync('package.json');
    checks.nodeModules = fs.existsSync('node_modules');
    checks.missingDeps = [];

    if (checks.packageJson) {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const dependencies = packageJson.dependencies || {};

            for (const dep in dependencies) {
                if (!fs.existsSync(path.join(__dirname, 'node_modules', dep))) {
                    checks.missingDeps.push(dep);
                }
            }
        } catch (e) {
            checks.missingDeps.push('Erreur lecture package.json');
        }
    }

    res.json({ success: true, checks });
});

// Test DB Connection
app.post('/api/install/test-db', (req, res) => {
    const { host, user, pass } = req.body;
    const connection = mysql.createConnection({ host, user, password: pass });

    connection.connect((err) => {
        if (err) return res.json({ success: false, message: err.message });
        connection.end();
        res.json({ success: true });
    });
});

// Run Installation
app.post('/api/install/run', (req, res) => {
    if (fs.existsSync('installed.lock')) {
        return res.status(403).json({ success: false, message: 'Already installed' });
    }

    const { host, user, pass, name } = req.body;

    // 1. Connect to Server
    const connection = mysql.createConnection({ host, user, password: pass });

    connection.connect((err) => {
        if (err) return res.json({ success: false, message: 'Connection failed: ' + err.message });

        // 2. Create Database
        connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``, (err) => {
            if (err) return res.json({ success: false, message: 'Create DB failed: ' + err.message });

            // 3. Select Database
            connection.changeUser({ database: name }, (err) => {
                if (err) return res.json({ success: false, message: 'Select DB failed: ' + err.message });

                // 4. Create Tables
                const tables = [
                    `CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        role ENUM('admin', 'technician') DEFAULT 'technician',
                        firstname VARCHAR(255),
                        lastname VARCHAR(255),
                        email VARCHAR(255),
                        phone VARCHAR(50),
                        address TEXT,
                        birthdate DATE,
                        gender ENUM('M', 'F', 'Other'),
                        profile_picture VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )`,
                    `CREATE TABLE IF NOT EXISTS categories (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE
                    )`,
                    `CREATE TABLE IF NOT EXISTS processes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        category_id INT,
                        title VARCHAR(255) NOT NULL,
                        content LONGTEXT,
                        file_path VARCHAR(255),
                        author_id INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
                    )`,
                    `CREATE TABLE IF NOT EXISTS process_history (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        process_id INT NOT NULL,
                        user_id INT NOT NULL,
                        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )`
                ];

                let completed = 0;
                let hasError = false;

                tables.forEach(sql => {
                    connection.query(sql, (err) => {
                        if (hasError) return;
                        if (err) {
                            hasError = true;
                            return res.json({ success: false, message: 'Table creation failed: ' + err.message });
                        }
                        completed++;
                        if (completed === tables.length) {
                            // 5. Create Admin User
                            const adminSql = `INSERT IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`;
                            connection.query(adminSql, (err) => {
                                if (err) return res.json({ success: false, message: 'Admin creation failed: ' + err.message });

                                // 6. Write .env file
                                const envContent = `DB_HOST=${host}\nDB_USER=${user}\nDB_PASSWORD=${pass}\nDB_NAME=${name}\nPORT=3000`;
                                fs.writeFileSync('.env', envContent);

                                // 7. Create Lock File
                                fs.writeFileSync('installed.lock', 'Installation completed on ' + new Date().toISOString());

                                connection.end();
                                res.json({ success: true });
                            });
                        }
                    });
                });
            });
        });
    });
});

// --- PDMS Integration ---
const PdmsService = require('./js/pdmsService');

// Get all PDMS clients
app.get('/api/pdms/clients', (req, res) => {
    PdmsService.getClients()
        .then(clients => res.json({ success: true, clients }))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Create new PDMS client
app.post('/api/pdms/clients', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    PdmsService.createClient(name, email, password)
        .then(result => res.json({ success: true, message: 'Client created' }))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});