import '../css/styles.css';
import { store } from './store.js';
import { router } from './router.js';
import { t } from './i18n.js';
import { syncHelper } from './utils/syncHelper.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('FinTrack: Initializing...');
  
  // Initialize the store
  store.init();

  // Initialize the router
  router.init();
  updateStaticLabels();

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

export function updateStaticLabels() {
  const labels = {
    dashboard: t('navDashboard'),
    transactions: t('navTransactions'),
    addTransaction: t('navAdd'),
    planner: 'Planner',
    recurring: t('navRecurring'),
    settings: t('navSettings')
  };

  document.querySelectorAll('[data-screen]').forEach(btn => {
    const screen = btn.getAttribute('data-screen');
    const label = btn.querySelector('span');
    if (label && labels[screen]) label.textContent = labels[screen];
  });
}
