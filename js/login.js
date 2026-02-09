document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');

    // Health Check: Verify DB connection on load
    fetch('/api/health')
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showError('⚠️ Erreur système : Impossible de contacter la base de données.');
                // Disable login form
                const btn = loginForm.querySelector('.btn-login');
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                loginForm.querySelector('#username').disabled = true;
                loginForm.querySelector('#password').disabled = true;
            }
        })
        .catch(() => {
            showError('⚠️ Erreur réseau : Serveur injoignable.');
        });

    function showError(msg) {
        errorDiv.innerText = msg;
        errorDiv.style.display = 'block';
        // Shake animation
        const card = document.querySelector('.login-card');
        card.style.animation = 'none';
        card.offsetHeight; // Trigger reflow
        card.style.animation = 'shake 0.5s';
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const btn = loginForm.querySelector('.btn-login');
        const originalText = btn.innerText;
        btn.innerText = 'Connexion...';
        btn.disabled = true;

        // Clear previous error
        errorDiv.style.display = 'none';
        errorDiv.innerText = '';

        // Send request to backend
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    btn.innerText = 'Succès !';
                    btn.style.backgroundColor = '#00c853'; // Green

                    // Store user info (display only)
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('role', data.user.role);

                    setTimeout(() => {
                        // Redirect based on role
                        if (data.user.role === 'admin') {
                            window.location.href = 'admin_interface.html';
                        } else {
                            window.location.href = 'pdms_individuals.html'; // Default tech page
                        }
                    }, 500);
                } else {
                    throw new Error(data.message || 'Erreur de connexion');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                btn.innerText = originalText;
                btn.disabled = false;
                showError(error.message);
            });
    });
});
