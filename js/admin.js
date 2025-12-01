// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (username) {
    document.getElementById('usernameDisplay').innerText = username;

    // Check role to secure page
    fetch('/api/profile?username=' + username)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.user.role !== 'admin') {
                    // Redirect guests to their own home
                    window.location.href = 'technician.html';
                }
            }
        });
} else {
    // If no user found, redirect to login
    window.location.href = 'index.html';
}
