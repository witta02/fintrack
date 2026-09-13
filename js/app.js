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
      triggerPasswordRecovery();
    }
  });

  let hasPromptedRecovery = false;
  async function triggerPasswordRecovery() {
    if (hasPromptedRecovery) return;
    hasPromptedRecovery = true;
    setTimeout(async () => {
      const newPassword = await alerts.promptPasswordChange();
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          alerts.error(t('updateFailed'), error.message);
          hasPromptedRecovery = false;
        } else {
          alerts.success(t('successTitle'), t('passwordUpdated'));
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          router.navigate('dashboard');
        }
      } else {
        hasPromptedRecovery = false;
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }, 600);
  }

  // Also check if opened directly with recovery tokens in hash or query
  const initHash = window.location.hash || '';
  const initSearch = window.location.search || '';
  if (initHash.includes('type=recovery') || initSearch.includes('type=recovery')) {
    triggerPasswordRecovery();
  }

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

  // Helper: Play celebratory Web Audio fanfare without external audio files
  function playVictoryFanfare() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.10, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.20, dur: 0.14 }, // G5
        { freq: 1046.50, time: 0.34, dur: 0.65 }  // C6 (bright triumph sustain)
      ];
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } catch (err) {
      console.warn("Audio autoplay blocked or unsupported:", err);
    }
  }

  // Helper: Get milestone title by level
  function getLevelTitle(level, lang = "en") {
    const isEn = lang === "en";
    if (level >= 25) return isEn ? "Grand Financier" : "ปรมาจารย์การเงิน";
    if (level >= 20) return isEn ? "Apex Investor" : "นักลงทุนระดับตำนาน";
    if (level >= 15) return isEn ? "Wealth Builder" : "ผู้สร้างความมั่งคั่ง";
    if (level >= 10) return isEn ? "Financial Strategist" : "นักกลยุทธ์การเงิน";
    if (level >= 5)  return isEn ? "Budget Apprentice" : "นักวางแผนฝึกหัด";
    return isEn ? "Novice Tracker" : "นักบันทึกมือใหม่";
  }

  // Helper: Trigger rich multi-stage confetti celebration
  function triggerLevelUpCelebration() {
    const duration = 2800;
    const end = Date.now() + duration;

    // Immediate center burst
    confetti({
      particleCount: 65,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFE58F', '#F5C842', '#FF9A00', '#FFFFFF', '#38BDF8'],
      zIndex: 9999999
    });

    const interval = setInterval(() => {
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 22 * (timeLeft / duration);
      confetti({
        particleCount,
        angle: 60,
        spread: 65,
        origin: { x: 0.08, y: 0.7 },
        colors: ['#F5C842', '#FF9A00', '#FFE58F'],
        zIndex: 9999999
      });
      confetti({
        particleCount,
        angle: 120,
        spread: 65,
        origin: { x: 0.92, y: 0.7 },
        colors: ['#F5C842', '#FF9A00', '#38BDF8'],
        zIndex: 9999999
      });
    }, 200);
  }

  // Gamification Level-Up Listener
  window.addEventListener("levelup", (e) => {
    const newLevel = e.detail?.level || 1;
    const lang = getLanguage();
    const isEn = lang === "en";
    const title = getLevelTitle(newLevel, lang);
    const bonusCoins = Math.max(50, newLevel * 10);

    // Credit bonus coins reward
    store.settings.coins = (store.settings.coins || 0) + bonusCoins;
    store.save();
    if (store.user) store.saveSettingsToCloud();
    store.notify();

    // Haptics & Fanfare
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 90, 40, 140]);
    }
    playVictoryFanfare();

    // Visual confetti
    triggerLevelUpCelebration();

    // Show Luxury 3D Modal
    Swal.fire({
      html: `
        <div class="levelup-card">
          <div class="levelup-crest-container">
            <div class="levelup-sunburst"></div>
            <div class="levelup-stars">
              <span class="levelup-star levelup-star-1">✦</span>
              <span class="levelup-star levelup-star-2">★</span>
              <span class="levelup-star levelup-star-3">✦</span>
              <span class="levelup-star levelup-star-4">★</span>
            </div>
            <div class="levelup-badge-shield">
              <span class="levelup-lv-tag">LV</span>
              <span class="levelup-number">${newLevel}</span>
            </div>
          </div>

          <h2 class="levelup-title">${isEn ? "LEVEL UP!" : "เลเวลอัปแล้ว!"}</h2>
          <div class="levelup-rank-badge">
            <span>✦</span>
            <span>${title}</span>
            <span>✦</span>
          </div>

          <p class="levelup-desc">
            ${
              isEn
                ? `You've ascended to <strong>Level ${newLevel}</strong>! Your financial discipline keeps compounding.`
                : `คุณก้าวสู่ <strong>เลเวล ${newLevel}</strong> แล้ว! ความมีวินัยทางการเงินของคุณเติบโตขึ้นอย่างยอดเยี่ยม`
            }
          </p>

          <div class="levelup-reward-box">
            <div class="levelup-reward-label">
              <div class="levelup-reward-title">${isEn ? "Level Reward" : "รางวัลเลเวลอัป"}</div>
              <div class="levelup-reward-sub">${isEn ? "FinCoins Bonus" : "โบนัส FinCoins"}</div>
            </div>
            <div class="levelup-reward-val">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/></svg>
              <span>+${bonusCoins} Coins</span>
            </div>
          </div>

          <button id="levelup-claim-btn" class="levelup-cta-btn" onclick="Swal.close()">
            <span>${isEn ? "Claim & Continue" : "รับรางวัล & ลุยต่อ"}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      `,
      showConfirmButton: false,
      background: "transparent",
      backdrop: "rgba(3, 7, 18, 0.85)",
      customClass: {
        popup: "levelup-swal-popup"
      }
    });
  });

  // Expose helper on window for testing or debug
  window.triggerTestLevelUp = (lvl = 12) => {
    window.dispatchEvent(new CustomEvent("levelup", { detail: { level: lvl } }));
  };

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
    reports: t("navReports"),
    savings: t("navSavings"),
    wallets: t("navWallets"),
    recurring: t("navRecurring"),
    settings: t("navSettings"),
    planner: "Planner",
    downPayments: t("downPaymentTitle"),
  };

  document.querySelectorAll("[data-screen]").forEach((btn) => {
    const screen = btn.getAttribute("data-screen");
    const label = btn.querySelector("span");
    if (label && labels[screen]) label.textContent = labels[screen];
  });
}
