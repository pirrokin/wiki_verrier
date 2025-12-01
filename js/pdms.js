// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (!username) {
    window.location.href = 'index.html';
}

// Show Adminterface button if admin
// We need to check role. Since we don't have user object here, we might need to fetch it or store role in localStorage.
// For now, let's fetch profile to check role, or just check if username is 'admin' (simple check).
// Better: fetch /api/profile to get role.

fetch('/api/profile?username=' + username)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.user.role === 'admin') {
            document.getElementById('adminBtn').style.display = 'block';
        }
    });

// Simple fallback if fetch fails or for immediate feedback if we stored role
if (username === 'admin') {
    document.getElementById('adminBtn').style.display = 'block';
}
