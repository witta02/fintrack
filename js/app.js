import "../css/styles.css";
import { store } from "./store.js";
import { router } from "./router.js";
import { t } from "./i18n.js";
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("FinTrack: Initializing...");

  // Initialize the store (synchronous — loads from LocalStorage only)
  store.init();

  // Initialize the router
  router.init();
  updateStaticLabels();

  // Listen for auth state changes — this also fires on first load as INITIAL_SESSION
  supabase.auth.onAuthStateChange(async (event, session) => {
    store.user = session ? session.user : null;

    if (event === 'INITIAL_SESSION') {
      // On first load: route to dashboard if logged in, otherwise show auth screen
      if (store.user) {
        router.navigate('dashboard');
      } else {
        router.navigate('auth');
      }
    } else if (event === 'SIGNED_IN') {
      await store.handleLoginSync(session.user);
      store.notify();
      router.navigate('dashboard');
    } else if (event === 'SIGNED_OUT') {
      store.clearUserData();
      store.notify();
      router.navigate('auth');
    }
  });

  // Check URL query parameters for PWA shortcut/deep link navigation
  const urlParams = new URLSearchParams(window.location.search);
  const screenParam = urlParams.get("screen");

  const splash = document.getElementById("splash-screen");
  const app = document.getElementById("app");

  // Sidebar toggle visibility (Desktop only)
  const closeBtn = document.getElementById("sidebar-close-btn");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  if (closeBtn && toggleBtn && app) {
    const isSidebarHidden =
      localStorage.getItem("fintrack_sidebar_hidden") === "true";
    if (isSidebarHidden) {
      app.classList.add("sidebar-hidden");
    }
    closeBtn.addEventListener("click", () => {
      app.classList.add("sidebar-hidden");
      localStorage.setItem("fintrack_sidebar_hidden", "true");
    });
    toggleBtn.addEventListener("click", () => {
      app.classList.remove("sidebar-hidden");
      localStorage.setItem("fintrack_sidebar_hidden", "false");
    });
  }

  // Fast boot for better stability
  setTimeout(() => {
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => (splash.style.display = "none"), 500);
    }
    if (app) {
      app.classList.remove("hidden");
      console.log("FinTrack: App Ready");
      // Navigate to shortcut screen if specified
      if (screenParam) {
        router.navigate(screenParam);
      }
    }
  }, 500);
});

export function updateStaticLabels() {
  const labels = {
    dashboard: t("navDashboard"),
    transactions: t("navTransactions"),
    addTransaction: t("navAdd"),
    planner: "Planner",
    recurring: t("navRecurring"),
    settings: t("navSettings"),
  };

  document.querySelectorAll("[data-screen]").forEach((btn) => {
    const screen = btn.getAttribute("data-screen");
    const label = btn.querySelector("span");
    if (label && labels[screen]) label.textContent = labels[screen];
  });
}
