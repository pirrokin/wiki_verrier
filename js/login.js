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
                btn.innerText = 'Erreur';
                btn.style.backgroundColor = '#cf6679'; // Error red
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.opacity = '1';
                    alert('Échec de la connexion : ' + error.message);
                }, 2000);
            });
    });
});
