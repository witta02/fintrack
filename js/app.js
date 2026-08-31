import "../css/styles.css";
import Swal from "sweetalert2";
import { store } from "./store.js";
import { router } from "./router.js";
import { t, getLanguage } from "./i18n.js";
import { supabase } from "./supabase.js";
import { alerts } from "./utils/alertHelper.js";
import confetti from "canvas-confetti";

document.addEventListener("DOMContentLoaded", () => {
  console.log("FinTrack: Initializing...");

  // Initialize the store (synchronous — loads from LocalStorage only)
  store.init();



  let hasInitialNavigated = false;

  // Initialize the router & navigate to starting screen
  router.init();
  updateStaticLabels();


  const urlParams = new URLSearchParams(window.location.search);
  const screenParam = urlParams.get("screen");
  const startingScreen = screenParam || "dashboard";

  router.navigate(startingScreen);
  hasInitialNavigated = true;

  // Listen for auth state changes without interrupting user navigation
  supabase.auth.onAuthStateChange(async (event, session) => {
    store.user = session ? session.user : null;

    if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        await store.handleLoginSync(session.user);
        store.notify();
      }
    } else if (event === 'SIGNED_IN') {
      await store.handleLoginSync(session.user);
      store.notify();
      // Only navigate to dashboard if user was specifically on the auth/login screen
      if (router.getCurrentScreen() === 'auth') {
        router.navigate('dashboard');
      }
    } else if (event === 'SIGNED_OUT') {
      store.user = null;
      store.notify();
      if (router.getCurrentScreen() === 'auth') {
        router.navigate('dashboard');
      }
    } else if (event === 'PASSWORD_RECOVERY') {
      setTimeout(async () => {
        const newPassword = await alerts.promptPasswordChange();
        if (newPassword) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
            alerts.error(t('updateFailed'), error.message);
          } else {
            alerts.success(t('successTitle'), t('passwordUpdated'));
            router.navigate('dashboard');
          }
        }
      }, 500);
    }
  });

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
    }
  }, 800);

  // Hard failsafe: force splash hidden after 3 seconds no matter what
  setTimeout(() => {
    if (splash) splash.style.display = "none";
    if (app) app.classList.remove("hidden");
  }, 3000);

  // Gamification Level-Up Listener
  window.addEventListener("levelup", (e) => {
    const newLevel = e.detail.level;
    
    // Confetti effect
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F5C842', '#FF9A00']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F5C842', '#FF9A00']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    // Show Modal
    Swal.fire({
      html: `
        <div class="levelup-modal">
          <div class="levelup-badge-large">${newLevel}</div>
          <h2 style="margin: 0 0 10px; font-weight: 800; font-size: 24px;">Level Up!</h2>
          <p style="color: var(--text-secondary); margin: 0;">You've reached level ${newLevel}. Keep tracking your finances!</p>
        </div>
      `,
      background: 'var(--card)',
      color: 'var(--text-primary)',
      confirmButtonText: 'Awesome!',
      confirmButtonColor: 'var(--gold)',
      customClass: {
        popup: 'custom-swal-popup'
      }
    });
  });

  // Global Clipboard Image / Slip Paste Listener (Ctrl+V anywhere)
  window.addEventListener("paste", async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          alerts.success(
            store.settings.language === "en"
              ? "Image pasted from clipboard! Scanning slip..."
              : "วางรูปสลิปจากคลิปบอร์ดแล้ว! กำลังประมวลผล..."
          );
          router.navigate("addTransaction");
          setTimeout(() => {
            const fileInput = document.getElementById("scan-receipt-file-input");
            if (fileInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }, 300);
          break;
        }
      }
    }
  });
});

export function updateStaticLabels() {
  const lang = getLanguage();
  document.documentElement.lang = lang;

  document.title = t("appTitle");
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = t("appTitle");

  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  if (toggleBtn) toggleBtn.title = t("showSidebar");

  const closeBtn2 = document.getElementById("sidebar-close-btn");
  if (closeBtn2) closeBtn2.title = t("hideSidebar");

  const labels = {
    dashboard: t("navDashboard"),
    transactions: t("navTransactions"),
    addTransaction: t("navAdd"),
    planner: "Planner",
    recurring: t("navRecurring"),
    downPayments: t("downPaymentTitle"),
    settings: t("navSettings"),
  };

  document.querySelectorAll("[data-screen]").forEach((btn) => {
    const screen = btn.getAttribute("data-screen");
    const label = btn.querySelector("span");
    if (label && labels[screen]) label.textContent = labels[screen];
  });
}
