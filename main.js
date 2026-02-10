import App from './src/core/App.js';

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('canvas');
    
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    // Create and start the application
    const app = new App(canvas);
    
    // Make app globally accessible for debugging
    window.app = app;
    
    // Hide initial loading overlay after a moment
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }, 500);
});

// Handle page visibility changes (pause/resume)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App paused');
        // Could pause animations, sounds here
    } else {
        console.log('App resumed');
        // Could resume animations, sounds here
    }
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
});