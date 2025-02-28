// Main JavaScript file for shared functionality

// Check if user is logged in
function checkLoggedIn() {
  fetch('/api/profile')
    .then(response => {
      if (response.ok) {
        // User is logged in
        return response.json();
      } else {
        // User is not logged in
        throw new Error('Not authenticated');
      }
    })
    .then(user => {
      // Handle logged in state
      updateNavigation(true);
    })
    .catch(error => {
      // Handle not logged in state
      updateNavigation(false);
    });
}

// Update navigation based on authentication status
function updateNavigation(isLoggedIn) {
  const navMenu = document.getElementById('nav-menu');
  
  if (!navMenu) return;
  
  if (isLoggedIn) {
    navMenu.innerHTML = `
      <li><a href="/dashboard" class="${window.location.pathname === '/dashboard' ? 'active' : ''}">Dashboard</a></li>
      <li><a href="/dashboard/profile.html" class="${window.location.pathname === '/dashboard/profile.html' ? 'active' : ''}">Profile</a></li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
    
    // Add logout event listener
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    navMenu.innerHTML = `
      <li><a href="/" class="${window.location.pathname === '/' ? 'active' : ''}">Home</a></li>
      <li><a href="/login.html" class="${window.location.pathname === '/login.html' ? 'active' : ''}">Login</a></li>
      <li><a href="/register.html" class="${window.location.pathname === '/register.html' ? 'active' : ''}">Register</a></li>
    `;
  }
}

// Logout function
function logout() {
  fetch('/api/logout', {
    method: 'POST'
  })
    .then(response => {
      if (response.ok) {
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    })
    .catch(error => {
      console.error('Logout error:', error);
      alert('An error occurred during logout');
    });
}

// Show message function
function showMessage(message, type, elementId = 'message') {
  const messageDiv = document.getElementById(elementId);
  
  if (!messageDiv) return;
  
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  checkLoggedIn();
});