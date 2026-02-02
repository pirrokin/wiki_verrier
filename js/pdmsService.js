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
    // List all clients
    getClients: () => {
        return new Promise((resolve, reject) => {
            fs.readdir(PDMS_ROOT, { withFileTypes: true }, (err, entries) => {
                if (err) return reject(err);

                const clients = [];
                const directories = entries.filter(e => e.isDirectory());

                directories.forEach(dir => {
                    const clientName = dir.name;
                    const folderPath = path.join(PDMS_ROOT, clientName);

                    // Try to find the info file (assuming infos.txt or any .txt)
                    let infoFile = 'infos.txt';
                    if (!fs.existsSync(path.join(folderPath, infoFile))) {
                        // If standard file doesn't exist, look for any .txt
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
                            // Parse "Identifiant : value" and "mdp : value"
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
                            console.error(`Error reading file for ${clientName}`, e);
                        }
                    }

                    clients.push({
                        name: clientName,
                        email: email,
                        password: password,
                        path: folderPath
                    });
                });

                resolve(clients);
            });
        });
    },

    // Create a new client
    createClient: (clientName, email, password) => {
        return new Promise((resolve, reject) => {
            // Sanitize client name for folder usage
            const safeName = clientName.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
            if (!safeName) return reject(new Error('Invalid client name'));

            const folderPath = path.join(PDMS_ROOT, safeName);

            if (fs.existsSync(folderPath)) {
                return reject(new Error('Client folder already exists'));
            }

            try {
                fs.mkdirSync(folderPath);

                const fileContent = `Identifiant : ${email}\nmdp : ${password}`;
                fs.writeFileSync(path.join(folderPath, 'infos.txt'), fileContent);

                resolve({ success: true, path: folderPath });
            } catch (e) {
                reject(e);
            }
        });
    }
};

module.exports = PdmsService;
