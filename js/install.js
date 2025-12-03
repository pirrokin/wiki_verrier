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
            const btn = document.getElementById('btnStep1');

            if (data.success) {
                nodeCheck.className = 'success';
                nodeCheck.innerHTML = '<span class="material-icons">check_circle</span> Serveur Node.js actif';

                writeCheck.className = 'success';
                writeCheck.innerHTML = '<span class="material-icons">check_circle</span> Droits d\'écriture OK';

                btn.disabled = false;
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
        });
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
