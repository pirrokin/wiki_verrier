const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PDMS_ROOT = process.env.PDMS_ROOT || './MOCK_PDMS';

// Helper to ensure PDMS root exists
if (!fs.existsSync(PDMS_ROOT)) {
    try {
        fs.mkdirSync(PDMS_ROOT, { recursive: true });
    } catch (e) {
        console.error('Could not create PDMS root:', e);
    }
}



const PdmsService = {
    init: (database) => {
        db = database;
    },

    // Synchronize FS -> DB
    syncClients: () => {
        return new Promise((resolve, reject) => {
            if (!db) return reject(new Error('Database not initialized'));

            fs.readdir(PDMS_ROOT, { withFileTypes: true }, (err, entries) => {
                if (err) return reject(err);

                const directories = entries.filter(e => e.isDirectory());
                let processed = 0;
                let errors = 0;

                if (directories.length === 0) return resolve({ processed: 0, errors: 0 });

                const promises = directories.map(dir => {
                    return new Promise((resolveItem, rejectItem) => {
                        const clientName = dir.name;
                        const folderPath = path.join(PDMS_ROOT, clientName);

                        // Read info file
                        let infoFile = 'infos.txt';
                        if (!fs.existsSync(path.join(folderPath, infoFile))) {
                            try {
                                const files = fs.readdirSync(folderPath);
                                const txtFile = files.find(f => f.endsWith('.txt'));
                                if (txtFile) infoFile = txtFile;
                            } catch (e) { }
                        }

                        const fullPath = path.join(folderPath, infoFile);
                        let email = '';
                        let password = '';

                        if (fs.existsSync(fullPath)) {
                            try {
                                const content = fs.readFileSync(fullPath, 'utf8');
                                const lines = content.split('\n');
                                lines.forEach(line => {
                                    if (line.toLowerCase().includes('identifiant')) {
                                        email = line.split(':')[1].trim();
                                    }
                                    if (line.toLowerCase().includes('mdp')) {
                                        password = line.split(':')[1].trim();
                                    }
                                });
                            } catch (e) {
                                console.error(`Error reading ${clientName}`, e);
                            }
                        }

                        // Upsert into DB
                        const query = `
                            INSERT INTO clients (name, email, password, folder_path)
                            VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                            email = VALUES(email), password = VALUES(password), folder_path = VALUES(folder_path)
                        `;
                        db.query(query, [clientName, email, password, folderPath], (err) => {
                            if (err) {
                                console.error(`Failed to sync ${clientName}`, err);
                                errors++;
                            } else {
                                processed++;
                            }
                            resolveItem();
                        });
                    });
                });

                Promise.all(promises)
                    .then(() => resolve({ processed, errors }))
                    .catch(reject);
            });
        });
    },

    // List all clients (From DB)
    getClients: () => {
        return new Promise((resolve, reject) => {
            if (!db) {
                // Fallback to FS if DB not ready (legacy mode)
                return PdmsService.getClientsLegacy(resolve, reject);
            }

            const query = 'SELECT name, email, password, folder_path FROM clients ORDER BY name ASC';
            db.query(query, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    },

    // Legacy FS Reader (for fallback)
    getClientsLegacy: (resolve, reject) => {
        fs.readdir(PDMS_ROOT, { withFileTypes: true }, (err, entries) => {
            if (err) return reject(err);
            const clients = [];
            const directories = entries.filter(e => e.isDirectory());
            // ... (Simple implementation just names for fallback)
            directories.forEach(dir => clients.push({ name: dir.name, email: 'Sync Required', password: '***' }));
            resolve(clients);
        });
    },

    // Create a new client (Hybrid: DB + FS)
    createClient: (clientName, email, password) => {
        return new Promise((resolve, reject) => {
            // Sanitize client name
            const safeName = clientName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
            if (!safeName) return reject(new Error('Invalid client name'));

            const folderPath = path.join(PDMS_ROOT, safeName);

            // 1. Create on FS
            if (fs.existsSync(folderPath)) {
                return reject(new Error('Client folder already exists'));
            }

            try {
                fs.mkdirSync(folderPath);
                const fileContent = `Identifiant : ${email}\nmdp : ${password}`;
                fs.writeFileSync(path.join(folderPath, 'infos.txt'), fileContent);
            } catch (e) {
                return reject(e);
            }

            // 2. Insert into DB
            if (db) {
                const query = 'INSERT INTO clients (name, email, password, folder_path) VALUES (?, ?, ?, ?)';
                db.query(query, [safeName, email, password, folderPath], (err) => {
                    if (err) {
                        console.error('DB Insert failed during creation', err);
                        // We strictly don't fail the request if FS succeeded, but we should warn.
                        // Ideally, we might want to rollback FS? For now, we accept minor desync.
                    }
                    resolve({ success: true, path: folderPath });
                });
            } else {
                resolve({ success: true, path: folderPath });
            }
        });
    }
};

module.exports = PdmsService;
