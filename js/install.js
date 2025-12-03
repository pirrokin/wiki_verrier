let dbConfig = {};

document.addEventListener('DOMContentLoaded', () => {
    checkPrerequisites();
});

function goToStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    for (let i = 1; i <= step; i++) {
        document.getElementById(`stepIndicator${i}`).classList.add('active');
    }
}

function checkPrerequisites() {
    // Check if server is reachable
    fetch('/api/install/check')
        .then(res => res.json())
        .then(data => {
            const nodeCheck = document.getElementById('checkNode');
            const writeCheck = document.getElementById('checkWrite');
            const uploadsCheck = document.getElementById('checkUploads');
            const depsCheck = document.getElementById('checkDeps');
            const btn = document.getElementById('btnStep1');

            // Reset help
            document.querySelectorAll('.check-help').forEach(el => el.style.display = 'none');

            if (data.success) {
                const checks = data.checks;

                // Helper to set status
                const setStatus = (el, success, text, helpId) => {
                    if (success) {
                        el.className = 'success';
                        el.innerHTML = `<span class="material-icons">check_circle</span> ${text}`;
                    } else {
                        el.className = 'error';
                        el.innerHTML = `<span class="material-icons">error</span> ${text} <a href="#" onclick="toggleHelp('${helpId}'); return false;" style="color: #ff8a80; font-size: 12px; margin-left: 10px;">(Comment résoudre ?)</a>`;
                    }
                };

                // Node Check
                setStatus(nodeCheck, true, 'Serveur Node.js actif', 'helpNode');

                // Write Root Check
                setStatus(writeCheck, checks.writeRoot, checks.writeRoot ? 'Permissions d\'écriture (Racine)' : 'Pas de droits d\'écriture (Racine)', 'helpWrite');

                // Uploads Check
                setStatus(uploadsCheck, checks.writeUploads, checks.writeUploads ? 'Dossier Uploads (Accessible)' : 'Dossier Uploads (Inaccessible)', 'helpUploads');

                // Dependencies Check
                const depsOk = checks.nodeModules && checks.packageJson && (!checks.missingDeps || checks.missingDeps.length === 0);
                setStatus(depsCheck, depsOk, depsOk ? 'Dépendances installées' : 'Dépendances manquantes', 'helpDeps');

                if (!depsOk && checks.missingDeps && checks.missingDeps.length > 0) {
                    const list = document.getElementById('missingDepsList');
                    list.innerHTML = '<strong>Manquants :</strong> ' + checks.missingDeps.join(', ');
                    // Auto-show help for deps if missing
                    document.getElementById('helpDeps').style.display = 'block';
                }

                // Enable button only if all passed
                if (checks.writeRoot && checks.writeUploads && depsOk) {
                    btn.disabled = false;
                }

            } else {
                // If installed.lock exists, redirect
                if (data.installed) {
                    window.location.href = '/';
                    return;
                }
                nodeCheck.className = 'error';
                nodeCheck.innerHTML = '<span class="material-icons">error</span> Erreur serveur';
            }
        })
        .catch(err => {
            console.error(err);
            const nodeCheck = document.getElementById('checkNode');
            nodeCheck.className = 'error';
            nodeCheck.innerHTML = '<span class="material-icons">error</span> Serveur injoignable';
            document.getElementById('helpNode').style.display = 'block';
        });
}

function toggleHelp(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('dbForm').addEventListener('submit', (e) => {
    e.preventDefault();

    dbConfig = {}; // Reset config immediately

    const host = document.getElementById('dbHost').value || 'localhost';
    const user = document.getElementById('dbUser').value || 'root';
    const pass = document.getElementById('dbPass').value;
    const name = document.getElementById('dbName').value || 'technician_wiki';

    dbConfig = { host, user, pass, name };

    // Test connection
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Test...';
    btn.disabled = true;

    fetch('/api/install/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                goToStep(3);
            } else {
                alert('Erreur de connexion : ' + data.message);
            }
        })
        .catch(err => alert('Erreur réseau'))
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
});

function log(msg) {
    const logDiv = document.getElementById('installLog');
    logDiv.innerHTML += `> ${msg}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function startInstall() {
    const btn = document.getElementById('btnInstall');
    btn.style.display = 'none';

    log('Démarrage de l\'installation...');

    // Re-read form values with defaults just before install
    const host = document.getElementById('dbHost').value || 'localhost';
    const user = document.getElementById('dbUser').value || 'root';
    const pass = document.getElementById('dbPass').value;
    const name = document.getElementById('dbName').value || 'technician_wiki';
    dbConfig = { host, user, pass, name };

    fetch('/api/install/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                log('Installation terminée avec succès !');
                document.getElementById('btnStep3').style.display = 'inline-block';
            } else {
                log('ERREUR : ' + data.message);
                btn.style.display = 'inline-block';
                btn.innerText = 'Réessayer';
            }
        })
        .catch(err => {
            log('ERREUR CRITIQUE : ' + err.message);
        });
}
