document.addEventListener('DOMContentLoaded', () => {
    loadClients();

    document.getElementById('createClientForm').addEventListener('submit', handleCreateClient);
});

function loadClients() {
    const grid = document.getElementById('clientsGrid');

    fetch('/api/pdms/clients')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderClients(data.clients);
            } else {
                grid.innerHTML = `<div style="color: #ef4444;">Erreur: ${data.message}</div>`;
            }
        })
        .catch(err => {
            console.error(err);
            grid.innerHTML = `<div style="color: #ef4444;">Erreur de connexion au serveur</div>`;
        });
}

function renderClients(clients) {
    const grid = document.getElementById('clientsGrid');

    if (clients.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">Aucun client trouvé.</div>`;
        return;
    }

    grid.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="client-icon">
                <span class="material-icons">person</span>
            </div>
            <h3 class="client-name">${escapeHtml(client.name)}</h3>
            <div class="client-info">
                <span class="material-icons">email</span>
                <span>${escapeHtml(client.email || 'N/A')}</span>
            </div>
            <div class="client-info">
                <span class="material-icons">vpn_key</span>
                <span style="font-family: monospace; letter-spacing: 1px;">
                    ${escapeHtml(client.password || 'N/A')}
                </span>
            </div>
        </div>
    `).join('');
}

function handleCreateClient(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    const OriginalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons is-spinning">sync</span>';
    btn.disabled = true;

    const name = document.getElementById('clientName').value;
    const email = document.getElementById('clientEmail').value;
    const password = document.getElementById('clientPassword').value;

    fetch('/api/pdms/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeModal();
                e.target.reset();
                loadClients(); // Reload list
            } else {
                alert('Erreur: ' + data.message);
            }
        })
        .catch(err => alert('Erreur réseau'))
        .finally(() => {
            btn.innerHTML = OriginalText;
            btn.disabled = false;
        });
}

// Modal Helpers
window.openModal = function () {
    document.getElementById('createClientModal').classList.add('active');
}

window.closeModal = function () {
    document.getElementById('createClientModal').classList.remove('active');
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
