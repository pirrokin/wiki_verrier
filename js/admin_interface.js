// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (!username) {
    window.location.href = 'index.html';
}

// Modal Logic (Add User & Details)
const modal = document.getElementById('userModal');
const deleteModal = document.getElementById('deleteModal');
const detailsModal = document.getElementById('detailsModal');
let userToDeleteId = null;
let currentDetailUserId = null;

function openModal() {
    // Role Restriction Logic
    const roleSelect = document.getElementById('newRole');
    const adminOption = roleSelect.querySelector('option[value="admin"]');

    if (username !== 'admin') {
        if (adminOption) adminOption.remove();
    } else {
        // Restore admin option if missing and user is admin
        if (!roleSelect.querySelector('option[value="admin"]')) {
            const opt = document.createElement('option');
            opt.value = 'admin';
            opt.innerText = 'Administrateur';
            roleSelect.appendChild(opt);
        }
    }
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    // Reset form and error on close
    document.getElementById('addUserForm').reset();
    document.getElementById('passwordError').style.display = 'none';
}

function openDeleteModal(id, name) {
    userToDeleteId = id;
    document.getElementById('deleteUserName').innerText = name;
    deleteModal.classList.add('active');
}

function closeDeleteModal() {
    deleteModal.classList.remove('active');
    userToDeleteId = null;
}

function openDetailsModal(id) {
    currentDetailUserId = id;
    fetch(`/api/users/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const user = data.user;
                document.getElementById('detailUsername').value = user.username;
                document.getElementById('detailRole').value = user.role === 'admin' ? 'Administrateur' : 'Invité';

                // Password handling
                const pwdInput = document.getElementById('detailPassword');
                const pwdContainer = document.querySelector('.password-container');

                // Reset UI state
                pwdInput.type = 'password';
                pwdInput.value = '••••••';
                pwdInput.disabled = true;
                pwdInput.dataset.realPassword = user.password;

                // Clear existing buttons
                const existingToggle = pwdContainer.querySelector('.password-toggle');
                const existingEdit = pwdContainer.querySelector('.btn-edit-pwd');
                const existingSave = pwdContainer.querySelector('.btn-save-pwd');
                if (existingToggle) existingToggle.remove();
                if (existingEdit) existingEdit.remove();
                if (existingSave) existingSave.remove();

                // Add Toggle Button
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'password-toggle';
                toggleBtn.innerHTML = '<span class="material-icons">visibility</span>';
                toggleBtn.onclick = togglePasswordVisibility;
                pwdContainer.appendChild(toggleBtn);

                // Add Edit Button (if not viewing 'admin' account)
                if (user.username !== 'admin') {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-view btn-edit-pwd'; // Reuse btn-view style
                    editBtn.innerHTML = '<span class="material-icons">edit</span>';
                    editBtn.title = "Modifier le mot de passe";
                    editBtn.style.marginLeft = '10px';
                    editBtn.onclick = () => enablePasswordEdit(editBtn, toggleBtn);
                    pwdContainer.appendChild(editBtn);
                }

                document.getElementById('detailLastname').value = user.lastname || '-';
                document.getElementById('detailFirstname').value = user.firstname || '-';
                document.getElementById('detailEmail').value = user.email || '-';

                detailsModal.classList.add('active');
            } else {
                alert('Erreur : ' + data.message);
            }
        });
}

function enablePasswordEdit(editBtn, toggleBtn) {
    const pwdInput = document.getElementById('detailPassword');
    const pwdContainer = document.querySelector('.password-container');

    pwdInput.disabled = false;
    pwdInput.value = ''; // Clear for new input
    pwdInput.placeholder = "Nouveau mot de passe";
    pwdInput.focus();

    // Hide toggle and edit buttons
    toggleBtn.style.display = 'none';
    editBtn.style.display = 'none';

    // Add Save Button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary btn-save-pwd';
    saveBtn.innerHTML = '<span class="material-icons">check</span>';
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.marginLeft = '10px';
    saveBtn.onclick = saveNewPassword;
    pwdContainer.appendChild(saveBtn);
}

function saveNewPassword() {
    const pwdInput = document.getElementById('detailPassword');
    const newPassword = pwdInput.value;

    if (!newPassword) {
        alert('Veuillez entrer un mot de passe.');
        return;
    }

    fetch(`/api/users/${currentDetailUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Mot de passe mis à jour !');
                closeDetailsModal();
            } else {
                alert('Erreur : ' + data.message);
            }
        });
}

function closeDetailsModal() {
    detailsModal.classList.remove('active');
    currentDetailUserId = null;
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById('detailPassword');
    const toggleBtn = document.querySelector('.password-toggle');

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        pwdInput.value = pwdInput.dataset.realPassword;
        toggleBtn.innerHTML = '<span class="material-icons">visibility_off</span>';
    } else {
        pwdInput.type = 'password';
        pwdInput.value = '••••••';
        toggleBtn.innerHTML = '<span class="material-icons">visibility</span>';
    }
}

// Close modal if clicking outside
window.onclick = function (event) {
    if (event.target == modal) closeModal();
    if (event.target == deleteModal) closeDeleteModal();
    if (event.target == detailsModal) closeDetailsModal();
}

// Handle Add User Form
document.getElementById('addUserForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const newRole = document.getElementById('newRole').value;
    const errorMsg = document.getElementById('passwordError');

    // Validation
    if (newPassword !== confirmPassword) {
        errorMsg.style.display = 'block';
        return;
    } else {
        errorMsg.style.display = 'none';
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;

    btn.innerHTML = 'Création...';

    // Pass creatorUsername for role check
    fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: newUsername,
            password: newPassword,
            role: newRole,
            creatorUsername: username
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Utilisateur créé avec succès !');
                e.target.reset();
                closeModal(); // Close modal on success
                loadUsers(); // Refresh list
            } else {
                alert('Erreur : ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erreur technique');
        })
        .finally(() => {
            btn.innerHTML = originalText;
        });
});

// Handle Delete Confirmation
document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (userToDeleteId) {
        fetch(`/api/users/${userToDeleteId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    closeDeleteModal();
                    loadUsers();
                } else {
                    alert('Erreur : ' + data.message);
                }
            });
    }
});

// Load Users Function
function loadUsers() {
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('userTableBody');
                tbody.innerHTML = '';

                data.users.forEach(user => {
                    const tr = document.createElement('tr');
                    const date = new Date(user.created_at).toLocaleDateString('fr-FR');
                    const isMe = user.username === username; // Current user
                    const isAdmin = user.username === 'admin'; // Main admin

                    const viewBtn = `<button class="btn-view" onclick="openDetailsModal(${user.id})" title="Voir les détails">
                        <span class="material-icons">visibility</span>
                    </button>`;

                    let deleteBtn = '';
                    if (isMe) {
                        deleteBtn = `<span style="color: #555; font-size: 12px; margin-left: 8px;">Vous</span>`;
                    } else if (!isAdmin) {
                        deleteBtn = `<button class="btn-delete" onclick="openDeleteModal(${user.id}, '${user.username}')" title="Supprimer">
                            <span class="material-icons">delete</span>
                        </button>`;
                    } else {
                        deleteBtn = `<span style="color: #555; font-size: 12px; margin-left: 8px;">Protégé</span>`;
                    }

                    tr.innerHTML = `
                        <td>
                            <div style="font-weight: 500; color: white;">${user.username} ${isMe ? '(Vous)' : ''}</div>
                        </td>
                        <td>
                            <span class="role-badge role-${user.role}">${user.role === 'admin' ? 'Administrateur' : 'Invité'}</span>
                        </td>
                        <td>${date}</td>
                        <td style="text-align: right;">
                            ${viewBtn}
                            ${deleteBtn}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
}

// Initial Load
loadUsers();
