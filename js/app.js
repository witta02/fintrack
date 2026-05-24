import '../css/styles.css';
import { store } from './store.js';
import { router } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('FinTrack: Initializing...');
  
  // Initialize the store
  store.init();

  // Initialize the router
  router.init();

  const splash = document.getElementById('splash-screen');
  const app = document.getElementById('app');

  // Fast boot for better stability
  setTimeout(() => {
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.style.display = 'none', 500);
    }
    if (app) {
      app.classList.remove('hidden');
      console.log('FinTrack: App Ready');
    }
  }, 500);
});
