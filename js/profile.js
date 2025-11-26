document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile script loaded');
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    // --- Elements ---
    const modal = document.getElementById('editProfileModal');
    const profileForm = document.getElementById('profileForm');

    // Security Elements
    const securityViewMode = document.getElementById('securityViewMode');
    const securityEditMode = document.getElementById('securityEditMode');
    const editSecurityBtn = document.getElementById('editSecurityBtn');
    const cancelSecurityBtn = document.getElementById('cancelSecurityBtn');
    const saveSecurityBtn = document.getElementById('saveSecurityBtn');

    // --- Profile Data Loading ---
    function loadProfile() {
        fetch(`/api/profile?username=${username}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const user = data.user;

                    // Role-based UI
                    if (user.role !== 'admin') {
                        const adminBtn = document.getElementById('adminInterfaceBtn');
                        if (adminBtn) adminBtn.style.display = 'none';

                        const homeBtn = document.getElementById('homeBtn');
                        if (homeBtn) homeBtn.onclick = () => window.location.href = 'technician.html';
                    }

                    // Update View
                    setText('viewLastname', user.lastname);
                    setText('viewFirstname', user.firstname);
                    setText('viewEmail', user.email);
                    setText('viewPhone', user.phone);
                    setText('viewAddress', user.address);

                    if (user.birthdate) {
                        const date = new Date(user.birthdate);
                        setText('viewBirthdate', date.toLocaleDateString('fr-FR'));
                        setValue('birthdate', date.toISOString().split('T')[0]);
                    } else {
                        setText('viewBirthdate', 'Non renseigné');
                        setValue('birthdate', '');
                    }

                    const genderMap = { 'M': 'Homme', 'F': 'Femme', 'Other': 'Autre' };
                    setText('viewGender', genderMap[user.gender] || 'Non renseigné');

                    // Pre-fill form inputs
                    setValue('lastname', user.lastname);
                    setValue('firstname', user.firstname);
                    setValue('email', user.email);
                    setValue('phone', user.phone);
                    setValue('address', user.address);
                    setValue('gender', user.gender);

                    // Security View
                    setText('viewUsername', user.username);
                }
            })
            .catch(err => console.error('Error loading profile:', err));
    }

    // Helper to safely set text
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text || 'Non renseigné';
    }

    // Helper to safely set value
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    // --- Modal Functions ---
    window.openEditModal = function () {
        modal.classList.add('active');
    }

    window.closeEditModal = function () {
        modal.classList.remove('active');
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            closeEditModal();
        }
    }

    // --- Profile Form Submit ---
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = {
                username: username,
                lastname: document.getElementById('lastname').value,
                firstname: document.getElementById('firstname').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                birthdate: document.getElementById('birthdate').value || null,
                gender: document.getElementById('gender').value || null
            };

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn ? btn.innerText : 'Enregistrer';
            if (btn) btn.innerText = 'Enregistrement...';

            fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        closeEditModal();
                        loadProfile();
                    } else {
                        alert('Erreur : ' + data.message);
                    }
                })
                .catch(err => alert('Erreur technique'))
                .finally(() => {
                    if (btn) btn.innerText = originalText;
                });
        });
    }

    // --- Security Section Logic ---
    if (securityEditMode && editSecurityBtn && cancelSecurityBtn && saveSecurityBtn) {

        editSecurityBtn.addEventListener('click', () => {
            securityViewMode.style.display = 'none';
            securityEditMode.style.display = 'grid';
            editSecurityBtn.style.display = 'none';

            // Reset fields
            const currentUsername = document.getElementById('viewUsername').textContent;
            document.getElementById('editUsername').value = currentUsername;
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        });

        cancelSecurityBtn.addEventListener('click', () => {
            securityEditMode.style.display = 'none';
            securityViewMode.style.display = 'grid';
            editSecurityBtn.style.display = 'block';
        });

        // Use the form submit event
        securityEditMode.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Security form submitted');

            const currentUsername = username;
            const newUsername = document.getElementById('editUsername').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (!currentPassword) {
                alert('Le mot de passe actuel est obligatoire.');
                return;
            }

            if (newPassword && newPassword !== confirmNewPassword) {
                alert('Les nouveaux mots de passe ne correspondent pas.');
                return;
            }

            const btn = saveSecurityBtn;
            const originalText = btn.innerText;
            btn.innerText = 'Enregistrement...';
            btn.disabled = true;

            fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentUsername,
                    currentPassword,
                    newUsername: newUsername !== currentUsername ? newUsername : null,
                    newPassword: newPassword || null
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Compte mis à jour avec succès.');
                        if ((data.newUsername && data.newUsername !== currentUsername) || newPassword) {
                            alert('Vos identifiants ont changé. Veuillez vous reconnecter.');
                            localStorage.removeItem('username');
                            window.location.href = 'index.html';
                        } else {
                            if (document.getElementById('viewUsername')) {
                                document.getElementById('viewUsername').textContent = data.newUsername || currentUsername;
                            }
                            cancelSecurityBtn.click();
                        }
                    } else {
                        alert('Erreur: ' + data.message);
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Erreur technique: ' + err.message);
                })
                .finally(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });
    }

    // Initial Load
    loadProfile();
});
