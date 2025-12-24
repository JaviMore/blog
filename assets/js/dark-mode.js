// Dark mode toggle functionality
(function() {
  'use strict';

  // Wait for DOM to be ready
  function initDarkMode() {
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the theme on page load
    if (currentTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'theme-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle dark mode');
    toggleButton.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    
    // Add button to page
    document.body.appendChild(toggleButton);

    // Toggle theme on button click
    toggleButton.addEventListener('click', function() {
      const isDarkMode = document.body.classList.toggle('dark-mode');
      const theme = isDarkMode ? 'dark' : 'light';
      
      // Save preference
      localStorage.setItem('theme', theme);
      
      // Update button icon
      toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
})();
