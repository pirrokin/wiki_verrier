document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        // Redirect if not logged in (and not on login page)
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
        return;
    }

    // Highlight "Technicien" if on PDMS pages
    if (window.location.pathname.includes('pdms')) {
        const techBtn = document.getElementById('technicienBtn');
        if (techBtn) techBtn.classList.add('active');
    }

    // Fetch User Info for Navbar
    fetch(`/api/profile?username=${username}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const user = data.user;

                // Update Name
                const nameEl = document.getElementById('navUserName');
                if (nameEl) nameEl.textContent = user.username;

                // Update Avatar
                const avatarEl = document.getElementById('navUserAvatar');
                if (avatarEl) {
                    if (user.profile_picture) {
                        avatarEl.src = `/uploads/${user.profile_picture}`;
                    } else {
                        avatarEl.src = 'images/default-avatar.svg';
                    }
                }

                // Show Admin Link if Admin
                if (user.role === 'admin') {
                    const adminLink = document.getElementById('navAdminLink');
                    if (adminLink) adminLink.style.display = 'flex';
                } else {
                    // Redirect Home button for non-admins
                    // Find the button that links to admin.html
                    const homeBtns = document.querySelectorAll('.nav-btn');
                    homeBtns.forEach(btn => {
                        if (btn.textContent.trim() === 'Accueil') {
                            btn.onclick = () => window.location.href = 'technician.html';
                        }
                    });
                }
            }
        })
        .catch(err => console.error('Navbar profile fetch error:', err));

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('userDropdown');
        const btn = document.querySelector('.user-menu-btn');

        if (dropdown && dropdown.classList.contains('active')) {
            if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
                dropdown.classList.remove('active');
                btn.classList.remove('active');
            }
        }
    });
});

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    const btn = document.querySelector('.user-menu-btn');

    if (dropdown) {
        dropdown.classList.toggle('active');
        btn.classList.toggle('active');
    }
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = 'index.html';
    }
}
