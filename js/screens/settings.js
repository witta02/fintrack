import { store } from "../store.js";
import { currencies, getCurrencyDisplayName } from "../currency.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import { supabase } from "../supabase.js";
import { router } from "../router.js";

// Reusable setting row helper
function settingRow(iconSvg, iconBg, title, subtitle, rightSlot, extras = "") {
  return `
    <div class="setting-item" style="display: flex; align-items: center; gap: 14px;">
      <div class="setting-icon-badge" style="background: ${iconBg};">
        ${iconSvg}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${title}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${subtitle}</div>
        ${extras}
      </div>
      ${rightSlot}
    </div>
  `;
}

export function renderSettings(container) {
  const selectedCurrency = store.getSelectedCurrency();
  const isDarkMode = store.settings.isDarkMode;
  const language = store.settings.language === "en" ? "en" : "th";

  const currencyOptions = Object.values(currencies)
    .map(
      (curr) => `
    <option value="${curr.code}" ${selectedCurrency === curr.code ? "selected" : ""}>
      ${curr.symbol} — ${getCurrencyDisplayName(curr.code, language)}
    </option>
  `,
    )
    .join("");

  const currentTheme = store.settings.theme || (store.settings.isDarkMode ? "dark" : "light");
  const unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];
  
  const renderThemeOption = (themeId, label) => {
    const isLocked = !unlockedThemes.includes(themeId);
    const isSelected = currentTheme === themeId;
    const lockedStyle = isLocked ? "opacity: 0.5; filter: grayscale(100%); cursor: pointer;" : "cursor: pointer;";
    const borderStyle = isSelected ? "border: 2px solid var(--gold);" : "border: 1px solid var(--border);";
    
    return `
      <div class="theme-option" data-theme-id="${themeId}" data-locked="${isLocked}" style="padding: 10px; border-radius: 12px; background: var(--surface); text-align: center; transition: all var(--transition); ${lockedStyle} ${borderStyle}">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${label}</div>
        <div style="font-size: 10px; color: var(--text-secondary);">
          ${isLocked ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-bottom:-1px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 🔒` : (isSelected ? t('themeActive') : t('themeSelect'))}
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <style>
      .settings-group-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0 16px 8px;
        text-align: left;
      }
      .settings-list-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        margin-bottom: 24px;
        overflow: hidden;
      }
      .settings-list-row {
        transition: background 0.2s;
      }
      .settings-list-row:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      .settings-list-row:active {
        background: var(--surface);
      }
    </style>

    <div style="text-align: center; margin-bottom: 24px;">
      <h1 class="brand-title" style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">${t("settingsTitle")}</h1>
      <span class="premium-badge">v2.70 PRO</span>
    </div>

    <!-- 1. Account & Security Group -->
    <div class="settings-group-title">${t('accountAndSecurity')}</div>
    <div class="settings-list-card">
      ${store.user ? `
      <!-- Logged In State -->
      <div class="settings-list-row" style="display: flex; flex-direction: column; align-items: flex-start; padding: 16px;">
        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${store.user.email}</div>
        <div style="font-size: 11px; color: var(--income); display: flex; align-items: center; gap: 4px; margin-bottom: 12px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Cloud Sync Active
        </div>
        <div style="display: flex; gap: 8px; width: 100%;">
          <button id="auth-changepwd-btn" style="flex: 1; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
            ${t('changePassword')}
          </button>
          <button id="auth-signout-btn" style="flex: 1; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); color: var(--expense); padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
            ${t('signOut')}
          </button>
        </div>
      </div>
      ` : `
      <!-- Logged Out State -->
      <div class="settings-list-row" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${t('signIn')} / ${t('signUp')}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${t('loginForCloudSync')}</div>
        </div>
        <button id="auth-login-btn" class="btn-primary" style="padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer;">
          ${t('signIn')}
        </button>
      </div>
      `}
      
      <!-- Danger Zone -->
      ${store.user ? `
      <div class="settings-list-row" style="border-top: 1px solid var(--border); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="setting-icon-badge" style="background: rgba(239, 68, 68, 0.1); width: 32px; height: 32px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: var(--expense);">${t('deleteCloudBackup')}</div>
            </div>
          </div>
          <button id="delete-cloud-data-btn" style="border: 1px solid var(--expense); background: transparent; color: var(--expense); padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">Delete</button>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- 2. App Preferences Group -->
    <div class="settings-group-title">${t('personalize')}</div>
    <div class="settings-list-card">
      
      <!-- Themes (Horizontal scroll) -->
      <div class="settings-list-row" style="padding: 16px; border-bottom: 1px solid var(--border);">
        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <div class="setting-icon-badge" style="background: rgba(245,200,66,0.1); width: 28px; height: 28px; border-radius: 8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          ${t('appTheme')}
        </div>
        <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;">
          ${renderThemeOption("light", t('themeLight'))}
          ${renderThemeOption("dark", t('themeDark'))}
          ${renderThemeOption("midnight", t('themeMidnight'))}
          ${renderThemeOption("cyberpunk", t('themeCyberpunk'))}
          ${renderThemeOption("gold", t('themeGold'))}
        </div>
      </div>

      <!-- Language -->
      <div class="settings-list-row" style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(124,92,252,0.1); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" stroke-width="2"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t("language")}</div>
        </div>
        <div style="display: flex; background: var(--surface); border-radius: 8px; padding: 2px;">
          <button type="button" id="language-en-btn" style="padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: none; background: ${language === 'en' ? 'var(--card)' : 'transparent'}; color: ${language === 'en' ? 'var(--text-primary)' : 'var(--text-secondary)'}; box-shadow: ${language === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer;">EN</button>
          <button type="button" id="language-th-btn" style="padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: none; background: ${language === 'th' ? 'var(--card)' : 'transparent'}; color: ${language === 'th' ? 'var(--text-primary)' : 'var(--text-secondary)'}; box-shadow: ${language === 'th' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; cursor: pointer;">TH</button>
        </div>
      </div>

      <!-- Currency -->
      <div class="settings-list-row" style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(52,211,153,0.1); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--income)" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t("currency")}</div>
        </div>
        <select id="setting-currency-select" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); font-size: 13px; padding: 6px 10px; border-radius: 8px; outline: none; cursor: pointer;">
          ${currencyOptions}
        </select>
      </div>

      <!-- Tax -->
      <div id="tax-row-wrapper" class="settings-list-row" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(248,113,113,0.1); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t("taxSettings")}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>

    <!-- 3. System Actions Group -->
    <div class="settings-group-title">${t('systemStuff')}</div>
    <div class="settings-list-card">
      
      <!-- Install -->
      <div id="install-app-btn" class="settings-list-row" style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(245,200,66,0.1); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t("installbtn")}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      <!-- Notifications -->
      <div id="test-notify-btn" class="settings-list-row" style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(255,255,255,0.05); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t("notitestbtn")}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      <!-- Reset Data -->
      <div id="clear-notify-btn" class="settings-list-row" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="setting-icon-badge" style="background: rgba(239, 68, 68, 0.1); width: 32px; height: 32px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--expense);">${t("clearbtn")}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0 12px; display: flex; flex-direction: column; gap: 4px;">
      <div style="font-family: var(--font-heading); font-weight: 800; font-size: 14px; background: linear-gradient(135deg, var(--gold-light), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FinTrack Ecosystem</div>
      <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px;">Designed for the Future • v2.70</div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {

  // Theme options listener
  container.querySelectorAll(".theme-option").forEach(el => {
    el.addEventListener("click", () => {
      if (el.getAttribute("data-locked") === "true") {
        router.navigate("rewards");
        return;
      }
      
      const themeId = el.getAttribute("data-theme-id");
      store.settings.theme = themeId;
      store.settings.isDarkMode = themeId !== "light";
      
      document.documentElement.setAttribute("data-theme", themeId);
      store.save();
      store.saveSettingsToCloud();
      
      renderSettings(container);
    });
  });

  container
    .querySelector("#setting-currency-select")
    .addEventListener("change", (e) => {
      store.setCurrency(e.target.value);
    });

  container.querySelector("#language-th-btn").addEventListener("click", () => {
    store.setLanguage("th");
    updateNavLabels();
    renderSettings(container);
  });

  container.querySelector("#language-en-btn").addEventListener("click", () => {
    store.setLanguage("en");
    updateNavLabels();
    renderSettings(container);
  });

  container.querySelector("#install-app-btn").addEventListener("click", () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      alerts.info(t("installPwaHint"));
    }
  });

  container.querySelector("#test-notify-btn").addEventListener("click", () => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        store.triggerNotification(t("notiTestTitle"), t("notiTestBody"));
      } else {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            store.triggerNotification(
              t("notiWelcomeTitle"),
              t("notiWelcomeBody"),
            );
          } else {
            alerts.warning(t("notiDenied"));
          }
        });
      }
    } else {
      alerts.error(t("notiUnsupported"));
    }
  });

  container.querySelector("#tax-row-wrapper").addEventListener("click", () => {
    showTaxSettings(container);
  });

  container
    .querySelector("#clear-notify-btn")
    .addEventListener("click", async () => {
      const isConfirmed = await alerts.confirmReset(
        t('resetAppDataTitle'),
        t("resetAppConfirm"),
      );
      if (isConfirmed) {
        localStorage.clear();
        window.location.reload();
      }
    });

  const signOutBtn = container.querySelector("#auth-signout-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error);
      store.clearUserData();
      store.notify();
      router.navigate('dashboard');
    });
  }

  const changePwdBtn = container.querySelector("#auth-changepwd-btn");
  if (changePwdBtn) {
    changePwdBtn.addEventListener("click", async () => {
      const newPassword = await alerts.promptPasswordChange();
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          alerts.error(
            t('updateFailed'),
            error.message
          );
        } else {
          alerts.success(
            t('successTitle'),
            t('passwordUpdated')
          );
        }
      }
    });
  }

  const deleteCloudBtn = container.querySelector("#delete-cloud-data-btn");
  if (deleteCloudBtn) {
    deleteCloudBtn.addEventListener("click", async () => {
      const isConfirmed = await alerts.confirmReset(
        t('deleteCloudTitle'),
        t('deleteCloudBody')
      );
      if (isConfirmed) {
        try {
          await store.deleteCloudData();
          alerts.success(
            t('deleteCloudSuccess'),
            t('deleteCloudSuccessBody')
          );
        } catch (err) {
          alerts.error(
            t('deleteCloudFailed'),
            err.message
          );
        }
      }
    });
  }

  const loginBtn = container.querySelector("#auth-login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      router.navigate('auth');
    });
  }
}

function showTaxSettings(container) {
  const lang = store.settings.language;
  const s = store.settings;
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  const getVal = (v, def) => (v !== undefined ? v : def);
  const personal = getVal(s.taxPersonalDeduction, s.taxDeduction || 60000);
  const ssf = getVal(s.taxSocialSecurity, 9000);
  const pvd = getVal(s.taxProvidentFund, 0);
  const mf = getVal(s.taxMutualFunds, 0);
  const other = getVal(s.taxOtherDeductions, 0);

  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 460px; padding: 22px; text-align: left;">
      <div class="modal-header">
        <h3 class="modal-title">${t("taxSettingsTitle")}</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div style="padding-top: 6px; max-height: 420px; overflow-y: auto; padding-right: 4px;">
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; text-align: left;">
          ${t("taxSettingsContext")}
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${t('taxPersonalLabel')}</label>
            <input type="number" id="tax-personal" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${personal}" placeholder="60000" />
            <small style="color: var(--text-secondary); font-size: 9.5px; display: block; margin-top: 3px;">${t("taxPersonalDeductionHint")}</small>
          </div>
          
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${t('taxSocialSecurityLabel')}</label>
            <input type="number" id="tax-ssf" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${ssf}" placeholder="9000" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${t('taxProvidentFundLabel')}</label>
            <input type="number" id="tax-pvd" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${pvd}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${t('taxMutualFundsLabel')}</label>
            <input type="number" id="tax-mf" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${mf}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${t('taxOtherDeductionsLabel')}</label>
            <input type="number" id="tax-other" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${other}" placeholder="0" />
          </div>
        </div>

        <div style="background: rgba(255, 184, 0, 0.05); padding: 12px 14px; border-radius: 12px; border: 1.5px dashed rgba(255, 184, 0, 0.25); margin-top: 16px; display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 12px; color: var(--gold);">${t('taxTotalDeductions')}</strong>
          <strong style="font-size: 15px; color: var(--gold);" id="tax-total-deduction-display">฿0.00</strong>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="modal-cancel-btn" style="flex:1; border:1px solid var(--border); padding:12px; border-radius:12px; color: var(--text-secondary); background: transparent; font-weight: 600; cursor: pointer;">${t("cancel")}</button>
        <button class="btn-primary modal-save-btn" style="flex:1; padding:12px; border-radius:12px; font-weight: 700; cursor: pointer;">${t("save")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const calculateTotal = () => {
    const personalVal =
      parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;
    const total = personalVal + ssfVal + pvdVal + mfVal + otherVal;

    const totalDisplay = store.toDisplay(total);
    modal.querySelector("#tax-total-deduction-display").textContent =
      `${store.getCurrencySymbol()}${totalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Bind real-time inputs calculation
  modal.querySelectorAll(".tax-calc-input").forEach((inp) => {
    inp.addEventListener("input", calculateTotal);
  });
  calculateTotal();

  const close = () => document.body.removeChild(modal);
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  modal.querySelector(".modal-save-btn").onclick = () => {
    const personalVal =
      parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;

    store.updateTaxDeduction(personalVal, ssfVal, pvdVal, mfVal, otherVal);
    close();
    alerts.success(t("taxSaveSuccess"));
    // Reload dashboard to update tax calculation if screen is open
    const currentScreen = document.querySelector(".nav-item.active");
    if (
      currentScreen &&
      currentScreen.getAttribute("data-screen") === "dashboard"
    ) {
      window.location.reload();
    }
  };
}

function updateNavLabels() {
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
