import { renderDashboard } from "./screens/dashboard.js";
import { renderTransactions } from "./screens/transactions.js";
import { renderAddTransaction } from "./screens/addTransaction.js";
import { renderRecurring } from "./screens/recurring_v2.js";
import { renderSettings } from "./screens/settings.js";
import { renderPlanner } from "./screens/planner.js";
import { renderExport } from "./screens/export.js";
import { renderSplitBill } from "./screens/splitBill.js";
import { renderAuth } from "./screens/auth.js";
import { renderDownPayments } from "./screens/downPayments.js";

let currentScreen = "dashboard";
let currentParams = null;

const screens = {
  auth: renderAuth,
  downPayments: renderDownPayments,
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
    document.querySelectorAll("[data-screen]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetScreen = btn.getAttribute("data-screen");
        this.navigate(targetScreen);
      });
    });

    // Note: initial navigation is handled by onAuthStateChange in app.js
  },

  navigate(screenKey, params = null) {
    // If screen not found, do nothing
    if (!screens[screenKey]) {
      console.error(`Screen "${screenKey}" not found.`);
      return;
    }

    currentScreen = screenKey;
    currentParams = params;

    // Update bottom nav UI (hide nav elements if on auth screen)
    const bottomNav = document.getElementById("bottom-nav");
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle-btn");

    if (screenKey === 'auth') {
      if (bottomNav) bottomNav.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'none';
      
      const screenContainer = document.getElementById("screen-container");
      if (screenContainer) {
        screenContainer.style.marginLeft = '0';
        screenContainer.style.width = '100%';
      }
    } else {
      if (bottomNav && window.innerWidth < 900) bottomNav.style.display = 'flex';
      if (sidebar && window.innerWidth >= 900) sidebar.style.display = 'flex';
      if (toggleBtn && window.innerWidth < 900) toggleBtn.style.display = 'flex';

      const screenContainer = document.getElementById("screen-container");
      if (screenContainer) {
        if (window.innerWidth >= 900) {
          screenContainer.style.marginLeft = '260px';
          screenContainer.style.width = 'calc(100% - 260px)';
        } else {
          screenContainer.style.marginLeft = '0';
          screenContainer.style.width = '100%';
        }
      }
    }

    document.querySelectorAll("[data-screen]").forEach((btn) => {
      const btnScreen = btn.getAttribute("data-screen");
      if (btnScreen === screenKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Render screen
    const container = document.getElementById("screen-container");
    if (container) {
      // Clear container and scroll to top
      container.innerHTML = "";
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
  },
};
