document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        console.log('Login attempt:', username);

        const btn = loginForm.querySelector('.btn-login');
        const originalText = btn.innerText;
        btn.innerText = 'Connexion...';

        // Clear previous error
        const errorDiv = document.getElementById('loginError');
        errorDiv.style.display = 'none';
        errorDiv.innerText = '';

        // Send request to backend
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    btn.innerText = 'Succès !';
                    btn.style.backgroundColor = '#00c853'; // Green

                    // Store user info
                    localStorage.setItem('username', data.user.username);

                    setTimeout(() => {
                        // Redirect based on role
                        if (data.user.role === 'admin') {
                            window.location.href = '/admin.html';
                        } else {
                            window.location.href = '/technician.html';
                        }
                    }, 500);
                } else {
                    throw new Error(data.message || 'Erreur de connexion');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                btn.innerText = originalText; // Reset button text immediately

                // Show error message below password
                errorDiv.innerText = 'Mot de passe ou identifiant erroné';
                errorDiv.style.display = 'block';
            });
    });
});
