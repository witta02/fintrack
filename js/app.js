import "../css/styles.css";
import { store } from "./store.js";
import { router } from "./router.js";
import { t } from "./i18n.js";
import { supabase } from "./supabase.js";
import { alerts } from "./utils/alertHelper.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("FinTrack: Initializing...");

  // Initialize the store (synchronous — loads from LocalStorage only)
  store.init();

  // Initialize the router
  router.init();
  updateStaticLabels();

  // Listen for auth state changes — INITIAL_SESSION fires on every page load
  supabase.auth.onAuthStateChange(async (event, session) => {
    store.user = session ? session.user : null;

    if (event === 'INITIAL_SESSION') {
      // Always start at dashboard — login is optional via Settings
      router.navigate('dashboard');
    } else if (event === 'SIGNED_IN') {
      await store.handleLoginSync(session.user);
      store.notify();
      router.navigate('dashboard');
    } else if (event === 'SIGNED_OUT') {
      store.user = null;
      store.notify();
      router.navigate('dashboard');
    } else if (event === 'PASSWORD_RECOVERY') {
      // Prompt the user to update password immediately
      setTimeout(async () => {
        const newPassword = await alerts.promptPasswordChange();
        if (newPassword) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
            alerts.error(
              store.settings.language === 'en' ? 'Update Failed' : 'อัปเดตล้มเหลว',
              error.message
            );
          } else {
            alerts.success(
              store.settings.language === 'en' ? 'Success' : 'สำเร็จ',
              store.settings.language === 'en' ? 'Password updated successfully!' : 'เปลี่ยนรหัสผ่านเสร็จเรียบร้อยแล้ว!'
            );
            router.navigate('dashboard');
          }
        }
      }, 500);
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

  // Hide splash screen after 800ms
  setTimeout(() => {
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => (splash.style.display = "none"), 500);
    }
    if (app) {
      app.classList.remove("hidden");
      console.log("FinTrack: App Ready");
      if (screenParam) {
        router.navigate(screenParam);
      }
    }
  }, 800);

  // Hard failsafe: force splash hidden after 3 seconds no matter what
  setTimeout(() => {
    if (splash) splash.style.display = "none";
    if (app) app.classList.remove("hidden");
  }, 3000);
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
