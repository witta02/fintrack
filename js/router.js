import { renderDashboard } from './screens/dashboard.js';
import { renderTransactions } from './screens/transactions.js';
import { renderAddTransaction } from './screens/addTransaction.js';
import { renderRecurring } from './screens/recurring.js';
import { renderSettings } from './screens/settings.js';
import { renderPlanner } from './screens/planner.js';
import { renderExport } from './screens/export.js';
import { renderSplitBill } from './screens/splitBill.js';

let currentScreen = 'dashboard';
let currentParams = null;

const screens = {
  dashboard: renderDashboard,
  transactions: renderTransactions,
  addTransaction: renderAddTransaction,
  recurring: renderRecurring,
  settings: renderSettings,
  planner: renderPlanner,
  export: renderExport,
  splitBill: renderSplitBill,
};

export const router = {
  init() {
    // Listen for bottom nav clicks
    document.querySelectorAll('[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetScreen = btn.getAttribute('data-screen');
        this.navigate(targetScreen);
      });
    });

    // Initial navigation
    this.navigate('dashboard');
  },

  navigate(screenKey, params = null) {
    if (!screens[screenKey]) {
      console.error(`Screen "${screenKey}" not found.`);
      return;
    }

    currentScreen = screenKey;
    currentParams = params;

    // Update bottom nav UI
    document.querySelectorAll('[data-screen]').forEach(btn => {
      const btnScreen = btn.getAttribute('data-screen');
      if (btnScreen === screenKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Render screen
    const container = document.getElementById('screen-container');
    if (container) {
      // Clear container and scroll to top
      container.innerHTML = '';
      window.scrollTo(0, 0);

      // Call screen render function
      screens[screenKey](container, params);
    }
  },

  getCurrentScreen() {
    return currentScreen;
  },

  getCurrentParams() {
    return currentParams;
  }
};
