// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (username) {
    document.getElementById('usernameDisplay').innerText = username;
} else {
    // If no user found, redirect to login
    window.location.href = 'index.html';
}
